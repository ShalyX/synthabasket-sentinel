import {NextRequest,NextResponse} from 'next/server';
import {assessPreview} from '@/lib/sentinel/policy';
import {tokenUnits} from '@/lib/sentinel/model';
import {
 checkSwapBuild,assessSimulation,eligibleToSimulate,parseSimulationIntent,rawUsdtAmount,selectRouteForSimulation,
 SIMULATION_SLIPPAGE_PERCENT,SIMULATION_MAX_IMPACT_PERCENT
} from '@/lib/sentinel/execution-preflight';
import {BSC_USDT,binanceGet,binanceSimulateEvmTx,getSentinelMarkets,UpstreamError} from '@/lib/sentinel/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;

// Process-local best-effort throttle; edge-wide abuse prevention also belongs at WAF.
const limits=new Map<string,{count:number;until:number}>();
function response(body:Record<string,unknown>,status=200){
 return NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store, max-age=0'}});
}

export async function POST(req:NextRequest){
 const ip=(req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown').slice(0,80);
 const now=Date.now(),old=limits.get(ip);
 if(old&&old.until>now&&old.count>=6)
  return response({error:'Simulation rate limit reached. Retry after one minute.'},429);
 limits.set(ip,old&&old.until>now?{count:old.count+1,until:old.until}:{count:1,until:now+60000});
 if(limits.size>500)limits.clear();
 let raw:unknown;
 try{
  if(Number(req.headers.get('content-length')||'0')>2048)throw Error('Too large');
  const content=await req.text();
  if(content.length>2048)throw Error('Too large');
  raw=JSON.parse(content);
 }catch{return response({error:'Invalid simulation request JSON or oversized body.'},400);}
 const parsed=parseSimulationIntent(raw);
 if(!parsed.ok)return response({error:parsed.message},400);
 const intent=parsed.value;
 try{
  const inventory=await getSentinelMarkets();
  const token=inventory.tokens.find(t=>t.ticker===intent.ticker&&t.platform===intent.platform);
  if(!token)return response({error:'No issuer/token contract in signed BSC inventory.'},404);
  const eligible=eligibleToSimulate(token);
  if(!eligible.ok)return response({error:eligible.message},409);
  const rawAmount=rawUsdtAmount(intent.amountUsd);
  // M2: every call generates a new quote bound to the provided PUBLIC owner
  // address, exact BSC USDT amount, verified token and chain 56.
  const quoteRequest={
   binanceChainId:'56',amount:rawAmount,fromTokenAddress:BSC_USDT,
   toTokenAddress:token.address,userWalletAddress:intent.walletAddress
  };
  const quoteReceived=Date.now();
  const routes=await binanceGet('/api/v1/dex/aggregator/quote',quoteRequest);
  const selected=selectRouteForSimulation(routes,rawAmount);
  if(!selected.ok)return response({error:selected.message,stage:'quote',executed:false},409);
  const route=selected.value;
  const quoteTime=new Date().toISOString();
  const evaluated=assessPreview(token,intent.amountUsd,route.priceImpactPercent,quoteTime);
  if(evaluated.status==='blocked')
   return response({error:'Policy blocked the proposed leg.',stage:'policy',reasons:evaluated.reasons,executed:false},409);
  if(Date.now()-quoteReceived>20000)
   return response({error:'Quote lost its freshness before transaction build.',stage:'quote',executed:false},409);
  const built=await binanceGet('/api/v1/dex/aggregator/swap',{
   ...quoteRequest,quoteId:route.quoteId,
   slippagePercent:SIMULATION_SLIPPAGE_PERCENT,
   priceImpactProtectionPercent:String(SIMULATION_MAX_IMPACT_PERCENT),
   approveTransaction:'false',
   autoSlippage:'false'
  });
  const checked=checkSwapBuild(built,intent,rawAmount,route.toTokenAmount,token.address,BSC_USDT);
  if(!checked.ok)
   return response({error:checked.message,stage:'build',executed:false},409);
  const evmTx=checked.value;
  // A stale quote can still produce calldata. Never call it executable if
  // the original quote has aged out, and never broadcast it.
  if(Date.now()-quoteReceived>29000)
   return response({error:'Quote expired before simulation; request another.',stage:'build',executed:false},409);
  const rawSimulation=await binanceSimulateEvmTx({
   from:evmTx.from,to:evmTx.to,value:'0',data:evmTx.data
  });
  const simulation=assessSimulation(rawSimulation);
  const elapsedMs=Date.now()-quoteReceived;
  const tokenAmount=tokenUnits(route.toTokenAmount,token.decimals);
  if(tokenAmount===null||tokenAmount<=0)
   return response({error:'Quoted output quantity is invalid.',stage:'build',executed:false},409);
  const expired=elapsedMs>=30000;
  const safeStatus=expired?'EXPIRED':simulation.status;
  return response({
   kind:'sentinel.bsc.sandbox-preflight',version:1,chainId:56,
   ticker:intent.ticker,platform:token.platform,symbol:token.symbol,
   tokenContract:token.address,amountUsd:intent.amountUsd,
   quotedTokenAmount:tokenAmount,
   normalizedShareUnits:token.tokenToShareRatio===null?null:tokenAmount*token.tokenToShareRatio,
   routeMode:'SWAP',routeVendor:'LiquidMesh',priceImpactPct:route.priceImpactPercent,
   maxSlippagePercent:Number(SIMULATION_SLIPPAGE_PERCENT),
   gasLimit:evmTx.gas,
   builtTransaction:{present:true,dataBytes:(evmTx.data.length-2)/2,nonzeroNativeValue:false},
   simulation:{...simulation,status:safeStatus,
    reason:expired?'Quote validity elapsed during pretrade simulation; request new quotes.':simulation.reason},
   state:safeStatus==='PASS'?'SIMULATION_PASSED':'NOT_READY',
   inspectedAt:new Date().toISOString(),
   expiresAt:new Date(quoteReceived+30000).toISOString(),
   executed:false,tradeAuthorized:false,signatureRequested:false,approvalsRequested:false,
   broadcastRequested:false
  });
 }catch(e){
  const err=e instanceof UpstreamError?e:new UpstreamError('Could not build or simulate this quote.',0);
  return response({error:err.message,code:err.code,stage:'upstream',executed:false},err.httpStatus);
 }
}
