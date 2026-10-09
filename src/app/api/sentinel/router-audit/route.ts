import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {getSentinelMarkets,BSC_USDT,binanceGet,UpstreamError} from '@/lib/sentinel/server';
import {eligibleToSimulate,selectRouteForSimulation,checkSwapBuild,rawUsdtAmount,validAddress,
 SIMULATION_MAX_IMPACT_PERCENT,SIMULATION_SLIPPAGE_PERCENT} from '@/lib/sentinel/execution-preflight';
import {assessPreview} from '@/lib/sentinel/policy';

/**
 * TEMPORARY evidence probe on the review branch only. No execution, token approval or simulation.
 * Delete this route once the quote-derived contracts and calldata have been independently audited.
 * It deliberately does not return quote ID, raw calldata, private credentials or signatures.
 */
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const limits=new Map<string,number>();
const reply=(body:Record<string,unknown>,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
const RPC='https://bsc-dataseed.bnbchain.org';
async function rpc(method:string,params:unknown[],id:number):Promise<string>{
 const response=await fetch(RPC,{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',method,params,id}),cache:'no-store',
  signal:AbortSignal.timeout(6500),redirect:'error'});
 if(!response.ok)throw Error('RPC_HTTP');
 const result:unknown=await response.json();
 if(!result||typeof result!=='object'||!('result' in result))throw Error('RPC_RESPONSE');
 const value=(result as {result:unknown}).result;
 if(typeof value!=='string'||!/^0x[0-9a-f]*$/i.test(value)||value.length>100000)throw Error('RPC_HEX');
 return value;
}
export async function GET(req:NextRequest){
 const ip=(req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown').slice(0,70);
 const now=Date.now();
 if(limits.get(ip)&&now-(limits.get(ip)??0)<90000)return reply({error:'Audit probe limited to one request per 90 seconds.'},429);
 limits.set(ip,now);if(limits.size>100)limits.clear();
 const account=req.nextUrl.searchParams.get('wallet');
 if(!validAddress(account)||[...req.nextUrl.searchParams.keys()].some(x=>x!=='wallet'))
  return reply({error:'Provide one public BSC wallet address only.'},400);
 try{
  const inventory=await getSentinelMarkets();
  const token=inventory.tokens.find(x=>x.ticker==='NVDA'&&x.platform==='bstock');
  if(!token)return reply({error:'Live NVDA bStocks token not found.'},404);
  const policy=eligibleToSimulate(token);
  if(!policy.ok)return reply({error:policy.message},409);
  const amountUsd=5,amount=rawUsdtAmount(amountUsd);
  const q={binanceChainId:'56',amount,fromTokenAddress:BSC_USDT,toTokenAddress:token.address,userWalletAddress:account};
  const start=Date.now();
  const rows=await binanceGet('/api/v1/dex/aggregator/quote',q);
  const selected=selectRouteForSimulation(rows,amount);
  if(!selected.ok)return reply({error:selected.message},409);
  const route=selected.value;
  if(assessPreview(token,amountUsd,route.priceImpactPercent,new Date().toISOString()).status==='blocked')
   return reply({error:'Route failed reference/impact policy.'},409);
  const built=await binanceGet('/api/v1/dex/aggregator/swap',{...q,quoteId:route.quoteId,
   slippagePercent:SIMULATION_SLIPPAGE_PERCENT,priceImpactProtectionPercent:String(SIMULATION_MAX_IMPACT_PERCENT),
   approveTransaction:'false',autoSlippage:'false'});
  const checked=checkSwapBuild(built,{ticker:'NVDA',platform:'bstock',amountUsd,walletAddress:account},
   amount,route.toTokenAmount,token.address,BSC_USDT);
  if(!checked.ok)return reply({error:checked.message,stage:'built-route'},409);
  const tx=checked.value;
  if(!route.approveTarget)return reply({error:'LiquidMesh quote omitted the documented approval spender.'},409);
  const [chain,routerCode,spenderCode,usdtCode,tokenCode]=await Promise.all([
   rpc('eth_chainId',[],1),rpc('eth_getCode',[tx.to,'latest'],2),
   rpc('eth_getCode',[route.approveTarget,'latest'],3),
   rpc('eth_getCode',[BSC_USDT,'latest'],4),rpc('eth_getCode',[token.address,'latest'],5)]);
  if(chain!=='0x38')return reply({error:'RPC chain mismatch; cannot audit.'},503);
  const fingerprint=(code:string)=>({deployed:code.length>2,bytes:(code.length-2)/2,
   sha256:createHash('sha256').update(Buffer.from(code.slice(2),'hex')).digest('hex')});
  const details=built&&typeof built==='object'&&!Array.isArray(built)?built as Record<string,unknown>:{};
  const buildTx=details.tx&&typeof details.tx==='object'?details.tx as Record<string,unknown>:{};
  const words:string[]=[];
  for(let i=10;i+64<=tx.data.length&&words.length<16;i+=64)words.push(tx.data.slice(i,i+64));
  const addresses=[account.toLowerCase(),BSC_USDT.toLowerCase(),token.address.toLowerCase(),tx.to.toLowerCase(),route.approveTarget.toLowerCase()];
  const occurrences=addresses.map(x=>({address:x,count:tx.data.toLowerCase().split(x.slice(2)).length-1}));
  return reply({kind:'sentinel.bsc.raw-route-audit-preview',checkedAt:new Date().toISOString(),
   chainId:56,ticker:'NVDA',issuer:'bstock',inputToken:BSC_USDT,outputToken:token.address,amountUsd,
   quote:{vendor:route.vendorName,mode:route.executionMode,inputRaw:route.fromTokenAmount,
    outputRaw:route.toTokenAmount,impact:route.priceImpactPercent,approveTarget:route.approveTarget},
   transaction:{from:tx.from,to:tx.to,selector:tx.data.slice(0,10),byteLength:(tx.data.length-2)/2,
    dataSha256:createHash('sha256').update(Buffer.from(tx.data.slice(2),'hex')).digest('hex'),gas:tx.gas,
    minReceiveAmount:buildTx.minReceiveAmount??null,slippagePercent:buildTx.slippagePercent??null,
    detectedAddressOccurrences:occurrences,first16WordsHex:words},
   deployment:{router:fingerprint(routerCode),spender:fingerprint(spenderCode),
    usdt:fingerprint(usdtCode),issuerToken:fingerprint(tokenCode)},
   note:'Evidence for manual ABI/bytecode review only. Words may represent offsets or packed data, not necessarily addresses. Never treat this result as an authorized trade.',
   elapsedMs:Date.now()-start,signatureRequested:false,executed:false});
 }catch(e){return reply({error:e instanceof UpstreamError?e.message:'Audit evidence probe unavailable. No authorization granted.'},503);}
}
