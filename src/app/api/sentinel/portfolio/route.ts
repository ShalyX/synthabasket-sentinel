import {NextRequest,NextResponse} from 'next/server';
import {getSentinelMarkets} from '@/lib/sentinel/server';
import {parseWatchRequest,type PortfolioObservationLeg} from '@/lib/sentinel/portfolio-watch';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=25;

// Read-only ERC20 balanceOf. All legs use ONE observed chain head/block.
const RPC='https://bsc-dataseed.bnbchain.org';
const RATE=new Map<string,{hits:number;until:number}>();
function reply(body:Record<string,unknown>,status=200){
 return NextResponse.json(body,{status,headers:{
  'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'
 }});
}
async function rpc(method:string,params:unknown[],id:number):Promise<string>{
 const res=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',method,params,id}),cache:'no-store',
  redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!res.ok)throw Error('BSC_RPC_HTTP');
 const body:unknown=await res.json();
 if(!body||typeof body!=='object'||Array.isArray(body)||'error' in body||
    !('result' in body))throw Error('BSC_RPC_INVALID');
 const value=(body as {result:unknown}).result;
 if(typeof value!=='string'||!/^0x[0-9a-f]{1,64}$/i.test(value))throw Error('BSC_RPC_HEX');
 return value;
}
export async function POST(request:NextRequest){
 const ip=(request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown').slice(0,80);
 const now=Date.now(),prior=RATE.get(ip);
 if(prior&&prior.until>now&&prior.hits>=6)return reply({error:'Portfolio watch read-only checks are temporarily rate limited.'},429);
 RATE.set(ip,prior&&prior.until>now?{hits:prior.hits+1,until:prior.until}:{hits:1,until:now+60_000});
 if(RATE.size>400)RATE.clear();
 let input:unknown;
 try{
  if(Number(request.headers.get('content-length')||0)>900)throw Error();
  const body=await request.text();if(body.length>900)throw Error();
  input=JSON.parse(body);
 }catch{return reply({error:'Invalid wallet-bound observation request.'},400);}
 const parsed=parseWatchRequest(input);
 if(!parsed.ok)return reply({error:parsed.reason},400);
 const {walletAddress,legs}=parsed;
 try{
  const snapshot=await getSentinelMarkets();
  const contracts=legs.map(leg=>snapshot.tokens.find(token=>
   token.ticker===leg.ticker&&token.platform===leg.platform));
  if(contracts.some(x=>!x))return reply({error:'One or more selected issuer contracts are missing from the current BSC inventory.'},409);
  const [chain,block]=await Promise.all([
   rpc('eth_chainId',[],1),rpc('eth_blockNumber',[],2)
  ]);
  if(BigInt(chain)!==56n||BigInt(block)===0n)throw Error('WRONG_CHAIN');
  const observations:PortfolioObservationLeg[]=await Promise.all(contracts.map(async (asset,i)=>{
   const token=asset!;
   const base={ticker:token.ticker,platform:token.platform,symbol:token.symbol,
    contract:token.address,decimals:token.decimals,
    tokenPriceUsd:token.tokenPrice};
   try{
    const data='0x70a08231'+walletAddress.slice(2).toLowerCase().padStart(64,'0');
    const raw=await rpc('eth_call',[{to:token.address,data},block],10+i);
    return {...base,balanceRaw:BigInt(raw).toString(),status:'OBSERVED' as const};
   }catch{
    return {...base,balanceRaw:null,status:'UNAVAILABLE' as const};
   }
  }));
  return reply({kind:'sentinel.bsc.portfolio-observation',chainId:56,
   walletAddress,blockNumber:BigInt(block).toString(),observedAt:new Date().toISOString(),
   marketAsOf:snapshot.asOf,legs:observations,
   hasMissingBalances:observations.some(x=>x.status!=='OBSERVED'),
   readOnly:true,signaturesRequested:false,ordersSubmitted:false});
 }catch{
  return reply({error:'Live BSC issuer balance observations unavailable. No balances or portfolio values were inferred.'},503);
 }
}
