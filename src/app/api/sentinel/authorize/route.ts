import {NextRequest,NextResponse} from 'next/server';
import {assessPreview} from '@/lib/sentinel/policy';
import {parseSimulationIntent,eligibleToSimulate,rawUsdtAmount,selectRouteForSimulation,checkSwapBuild,assessSimulation,SIMULATION_MAX_IMPACT_PERCENT,SIMULATION_SLIPPAGE_PERCENT} from '@/lib/sentinel/execution-preflight';
import {evaluateLiveSpend,exactApprovalCalldata,parseTrustedTargets,parseTrustedSelectors} from '@/lib/sentinel/execution-authorization';
import {getSentinelMarkets,binanceGet,binanceSimulateEvmTx,BSC_USDT,UpstreamError} from '@/lib/sentinel/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const RPC='https://bsc-dataseed.bnbchain.org';
const limits=new Map<string,{count:number;until:number}>();
const reply=(body:Record<string,unknown>,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store, max-age=0'}});
async function rpc(method:string,params:unknown[],id:number):Promise<bigint>{
 const response=await fetch(RPC,{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',id,method,params}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(6500)});
 if(!response.ok)throw Error('RPC_HTTP');
 const json:unknown=await response.json();
 if(!json||typeof json!=='object'||!('result' in json))throw Error('RPC_RESULT');
 const hex=(json as {result:unknown}).result;
 if(typeof hex!=='string'||!/^0x[0-9a-f]{1,64}$/i.test(hex))throw Error('RPC_HEX');
 return BigInt(hex);
}
export async function POST(req:NextRequest){
 const ip=(req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown').slice(0,80);
 const now=Date.now(),old=limits.get(ip);
 if(old&&old.until>now&&old.count>=4)return reply({error:'Authorization previews are rate limited; try again shortly.'},429);
 limits.set(ip,old&&old.until>now?{count:old.count+1,until:old.until}:{count:1,until:now+60000});
 if(limits.size>500)limits.clear();
 let raw:unknown;
 try{
  const body=await req.text();if(body.length>1000)throw Error();raw=JSON.parse(body);
 }catch{return reply({error:'Invalid execution preview request.'},400);}
 const parsed=parseSimulationIntent(raw);
 if(!parsed.ok)return reply({error:parsed.message},400);
 // Operator-reviewed router AND spender. Missing configuration prevents signatures.
 const routers=parseTrustedTargets(process.env.SENTINEL_ALLOWED_SWAP_TARGETS);
 const spenders=parseTrustedTargets(process.env.SENTINEL_ALLOWED_APPROVAL_SPENDERS);
 const selectors=parseTrustedSelectors(process.env.SENTINEL_ALLOWED_SWAP_SELECTORS);
 if(process.env.SENTINEL_LIVE_EXECUTION_ENABLED!=='true'||!routers.size||!spenders.size||!selectors.size)
  return reply({error:'Live authorization remains locked: explicit operator enablement and independently reviewed router, spender and calldata-selector allowlists are all required.',phase:'BLOCKED'},503);
 const intent=parsed.value,openedAt=Date.now();
 try{
  const inventory=await getSentinelMarkets();
  const token=inventory.tokens.find(t=>t.ticker===intent.ticker&&t.platform===intent.platform);
  if(!token)return reply({error:'No issuer contract in signed BSC inventory.',phase:'BLOCKED'},404);
  const eligible=eligibleToSimulate(token);
  if(!eligible.ok)return reply({error:eligible.message,phase:'BLOCKED'},409);
  const amount=rawUsdtAmount(intent.amountUsd);
  const q={binanceChainId:'56',amount,fromTokenAddress:BSC_USDT,toTokenAddress:token.address,userWalletAddress:intent.walletAddress};
  const quoted=await binanceGet('/api/v1/dex/aggregator/quote',q);
  const selected=selectRouteForSimulation(quoted,amount);
  if(!selected.ok)return reply({error:selected.message,phase:'BLOCKED'},409);
  const route=selected.value;
  const policy=assessPreview(token,intent.amountUsd,route.priceImpactPercent,new Date().toISOString());
  if(policy.status==='blocked')return reply({error:'Issuer or price-impact policy blocked this trade.',phase:'BLOCKED'},409);
  if(Date.now()-openedAt>=20000)return reply({error:'Quote expired before build.',phase:'BLOCKED'},409);
  const built=await binanceGet('/api/v1/dex/aggregator/swap',{...q,quoteId:route.quoteId,
   slippagePercent:SIMULATION_SLIPPAGE_PERCENT,priceImpactProtectionPercent:String(SIMULATION_MAX_IMPACT_PERCENT),
   approveTransaction:'false',autoSlippage:'false'});
  const checked=checkSwapBuild(built,intent,amount,route.toTokenAmount,token.address,BSC_USDT);
  if(!checked.ok)return reply({error:checked.message,phase:'BLOCKED'},409);
  const tx=checked.value;
  if(!route.approveTarget||!routers.has(tx.to.toLowerCase())||!spenders.has(route.approveTarget.toLowerCase())||
     !selectors.has(tx.data.slice(0,10).toLowerCase())||
     tx.to.toLowerCase()===route.approveTarget.toLowerCase())
   return reply({error:'Router and quote-defined spender have not both been independently approved for execution.',phase:'BLOCKED'},409);
  const [chainId,usdtBalance,bnbBalance,gasPrice,allowance]=await Promise.all([
   rpc('eth_chainId',[],1),rpc('eth_call',[{to:BSC_USDT,data:'0x70a08231'+intent.walletAddress.slice(2).toLowerCase().padStart(64,'0')},'latest'],2),
   rpc('eth_getBalance',[intent.walletAddress,'latest'],3),rpc('eth_gasPrice',[],4),
   rpc('eth_call',[{to:BSC_USDT,data:'0xdd62ed3e'+intent.walletAddress.slice(2).toLowerCase().padStart(64,'0')+
    route.approveTarget.slice(2).toLowerCase().padStart(64,'0')},'latest'],5)
  ]);
  const expiresAt=openedAt+30000;
  const funding={chainId,usdtBalance,bnbBalance,gasPrice,allowance};
  let simulatedPass=false;
  if(allowance>=BigInt(amount)&&Date.now()<expiresAt-3000){
   const simulation=assessSimulation(await binanceSimulateEvmTx({from:tx.from,to:tx.to,value:'0',data:tx.data}));
   simulatedPass=simulation.status==='PASS';
  }
  const decision=evaluateLiveSpend({amountUsd:intent.amountUsd,spender:route.approveTarget,tx,funding,
   expectedAddress:intent.walletAddress,routers,spenders,simulatedPass,quoteExpiresAt:expiresAt,now:Date.now()});
  const common={kind:'sentinel.bsc.execution-review',chainId:56,phase:decision.phase,
   reason:decision.reason,issuer:token.platform,symbol:token.symbol,ticker:intent.ticker,
   tokenContract:token.address,amountUsd:intent.amountUsd,amountRaw:decision.amountRaw,
   sender:intent.walletAddress,to:tx.to,spender:route.approveTarget,
   slippagePercent:Number(SIMULATION_SLIPPAGE_PERCENT),priceImpactPercent:route.priceImpactPercent,
   expiresAt:new Date(expiresAt).toISOString(),simulatorPassed:simulatedPass,noAutomaticOrders:true};
  if(decision.phase==='APPROVAL_REQUIRED')
   return reply({...common,approval:{to:BSC_USDT,data:exactApprovalCalldata(route.approveTarget,intent.amountUsd),value:'0x0'}});
  if(decision.phase==='SWAP_READY')
   return reply({...common,swap:{to:tx.to,data:tx.data,value:'0x0',gas:tx.gas}});
  return reply(common,409);
 }catch(e){
  const error=e instanceof UpstreamError?e:null;
  return reply({phase:'BLOCKED',error:error?error.message:'Fresh execution review or BSC RPC unavailable. No signer request was prepared.'},error?error.httpStatus:503);
 }
}
