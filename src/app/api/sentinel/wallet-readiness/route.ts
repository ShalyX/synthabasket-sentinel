import {NextRequest,NextResponse} from 'next/server';
import {SIMULATION_MAX_BASKET_USDT,validAddress} from '@/lib/sentinel/execution-preflight';
import {BSC_USDT} from '@/lib/sentinel/server';
import {summarizeFunding,estimateSwapGas} from '@/lib/sentinel/wallet-funding';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=15;

const RPC='https://bsc-dataseed.bnbchain.org';
const limits=new Map<string,{count:number;expires:number}>();
const reply=(body:Record<string,unknown>,status=200)=>NextResponse.json(body,{
 status,headers:{'Cache-Control':'private, no-store, max-age=0'}
});
function boundedHex(value:unknown):value is string{
 return typeof value==='string'&&/^0x[0-9a-f]+$/i.test(value)&&value.length<=66;
}
async function rpc(method:string,params:unknown[],id:number):Promise<bigint>{
 const response=await fetch(RPC,{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',id,method,params}),
  cache:'no-store',redirect:'error',signal:AbortSignal.timeout(6500)
 });
 if(!response.ok)throw new Error('RPC_HTTP');
 const result:unknown=await response.json();
 if(!result||typeof result!=='object'||!('result' in result))throw new Error('RPC_RESPONSE');
 const value=(result as {result:unknown}).result;
 if(!boundedHex(value))throw new Error('RPC_HEX');
 return BigInt(value);
}
export async function POST(request:NextRequest){
 const ip=(request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown').slice(0,80);
 const now=Date.now(),old=limits.get(ip);
 if(old&&old.expires>now&&old.count>=10)return reply({error:'Balance checks are temporarily rate limited.'},429);
 limits.set(ip,old&&old.expires>now?{count:old.count+1,expires:old.expires}:{count:1,expires:now+60000});
 if(limits.size>500)limits.clear();
 let raw:unknown;
 try{
  if(Number(request.headers.get('content-length')||0)>400)throw Error();
  const input=await request.text();
  if(input.length>400)throw Error();
  raw=JSON.parse(input);
 }catch{return reply({error:'Invalid balance check request.'},400);}
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return reply({error:'Invalid balance check request.'},400);
 const fields=raw as Record<string,unknown>;
 if(Object.keys(fields).some(key=>!['walletAddress','amountUsd','gasLimit'].includes(key))||
  !validAddress(fields.walletAddress)||typeof fields.amountUsd!=='number')
  return reply({error:'Provide only a public BSC address and a simulation amount.'},400);
 const amount=fields.amountUsd;
 if(!Number.isFinite(amount)||amount<1||amount>SIMULATION_MAX_BASKET_USDT||
  Math.abs(Math.round(amount*100)-amount*100)>1e-6)
  return reply({error:'Simulation basket amount must be $1–$50 USDT with at most two decimals.'},400);
 const minimum=BigInt(Math.round(amount*100))*10n**16n;
 const suppliedGas=fields.gasLimit;
 if(suppliedGas!==undefined&&suppliedGas!==null&&
  (typeof suppliedGas!=='string'||!/^\d{5,7}$/.test(suppliedGas)||
   BigInt(suppliedGas)<21000n||BigInt(suppliedGas)>3000000n))
  return reply({error:'Invalid built-transaction gas limit.'},400);
 const gasLimit=typeof suppliedGas==='string'?BigInt(suppliedGas):null;
 const address=fields.walletAddress as string;
 try{
  const [chain,bnb,usdt,gasPrice]=await Promise.all([
   rpc('eth_chainId',[],1),
   rpc('eth_getBalance',[address,'latest'],2),
   rpc('eth_call',[{to:BSC_USDT,data:'0x70a08231'+address.slice(2).toLowerCase().padStart(64,'0')},'latest'],3),
   rpc('eth_gasPrice',[],4).catch(()=>null)
  ]);
  if(chain!==56n)throw new Error('RPC_CHAIN');
  return reply({
   kind:'sentinel.bsc.readonly-wallet-balances',chainId:56,
   ...summarizeFunding(bnb,usdt,minimum),
   ...estimateSwapGas(bnb,gasPrice,gasLimit),
   estimateScope:gasLimit?'LAST_BUILT_SWAP_LEG':'UNAVAILABLE',
   stressScenarioGasLimit:3000000,
   stressScenarioBnb:gasPrice===null?null:estimateSwapGas(bnb,gasPrice,3000000n).estimatedSwapGasBnb,
   bnbCoversStressScenario:gasPrice===null?null:estimateSwapGas(bnb,gasPrice,3000000n).bnbCoversBufferedSwapEstimate,
   checkedAmountUsd:fields.amountUsd,checkedAt:new Date().toISOString(),
   walletAddressReturned:false
  });
 }catch{return reply({error:'The public BSC balance service is unavailable. No balance was inferred; try again later.'},503);}
}
