import {NextRequest,NextResponse} from 'next/server';
import {validAddress} from '@/lib/sentinel/execution-preflight';
import {getSentinelMarkets,BSC_USDT} from '@/lib/sentinel/server';
import {verifyReceiptTransferLog} from '@/lib/sentinel/route-audit';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=20;
const RPC='https://bsc-dataseed.bnbchain.org';
const limits=new Map<string,{count:number;until:number}>();
const reply=(body:Record<string,unknown>,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store, max-age=0'}});
async function rpc(method:string,params:unknown[],id:number):Promise<unknown>{
 const response=await fetch(RPC,{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',id,method,params}),cache:'no-store',
  redirect:'error',signal:AbortSignal.timeout(6500)});
 if(!response.ok)throw Error('RPC_HTTP');
 const result:unknown=await response.json();
 if(!result||typeof result!=='object'||!('result' in result)||'error' in result)throw Error('RPC_RESPONSE');
 return (result as {result:unknown}).result;
}
function hex(x:unknown):x is string{return typeof x==='string'&&/^0x[0-9a-f]{1,64}$/i.test(x);}
function amount(x:unknown):bigint{if(!hex(x))throw Error('HEX');return BigInt(x);}
async function balance(token:string,owner:string,block:string,id:number){
 const ret=await rpc('eth_call',[{to:token,data:'0x70a08231'+owner.slice(2).toLowerCase().padStart(64,'0')},block],id);
 return amount(ret);
}
export async function POST(req:NextRequest){
 const ip=(req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown').slice(0,80);
 const now=Date.now(),old=limits.get(ip);
 if(old&&old.until>now&&old.count>=8)return reply({error:'Settlement checks rate limited.'},429);
 limits.set(ip,old&&old.until>now?{count:old.count+1,until:old.until}:{count:1,until:now+60000});
 if(limits.size>500)limits.clear();
 let raw:unknown;
 try{const body=await req.text();if(body.length>600)throw Error();raw=JSON.parse(body);}catch{return reply({error:'Invalid settlement request.'},400);}
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return reply({error:'Invalid settlement request.'},400);
 const data=raw as Record<string,unknown>;
 if(Object.keys(data).some(k=>!['hash','sender','target','ticker','platform'].includes(k))||
  typeof data.hash!=='string'||!/^0x[0-9a-f]{64}$/i.test(data.hash)||
  !validAddress(data.sender)||!validAddress(data.target)||
  typeof data.ticker!=='string'||!/^[A-Z0-9.-]{1,16}$/.test(data.ticker)||
  !['bstock','ondo'].includes(String(data.platform)))
  return reply({error:'Malformed public transaction or issuer identity.'},400);
 try{
  const inventory=await getSentinelMarkets();
  const token=inventory.tokens.find(x=>x.ticker===data.ticker&&x.platform===data.platform);
  if(!token||!validAddress(token.address))return reply({error:'Issuer contract not in signed BSC inventory.'},404);
  const [chain,receipt,tx,latest]=await Promise.all([
   rpc('eth_chainId',[],1),rpc('eth_getTransactionReceipt',[data.hash],2),
   rpc('eth_getTransactionByHash',[data.hash],3),rpc('eth_blockNumber',[],4)
  ]);
  if(chain!=='0x38')throw Error('WRONG_CHAIN');
  if(!receipt||!tx)return reply({kind:'sentinel.bsc.settlement',status:'PENDING',hash:data.hash,chainId:56});
  if(typeof receipt!=='object'||typeof tx!=='object')throw Error('INVALID_RECORD');
  const r=receipt as Record<string,unknown>,t=tx as Record<string,unknown>;
  if(String(r.transactionHash).toLowerCase()!==data.hash.toLowerCase()||
   String(t.hash).toLowerCase()!==data.hash.toLowerCase()||
   String(r.from).toLowerCase()!==String(data.sender).toLowerCase()||
   String(r.to).toLowerCase()!==String(data.target).toLowerCase()||
   String(t.from).toLowerCase()!==String(data.sender).toLowerCase()||
   String(t.to).toLowerCase()!==String(data.target).toLowerCase()||
   r.status!=='0x1')
   return reply({kind:'sentinel.bsc.settlement',status:'BLOCKED',reason:'Transaction failed or hash/sender/target did not match.',receiptVerified:false},409);
  if(!hex(r.blockNumber)||!hex(r.blockHash)||r.blockHash.length!==66)throw Error('INVALID_BLOCK');
  const block=amount(r.blockNumber),current=amount(latest);
  if(current<block)throw Error('BLOCK_ORDER');
  const confirmations=current-block+1n;
  const outputLog=verifyReceiptTransferLog({tokenContract:token.address,account:String(data.sender),logs:r.logs,blockHash:r.blockHash});
  const usdtLog=verifyReceiptTransferLog({tokenContract:BSC_USDT,account:String(data.sender),logs:r.logs,blockHash:r.blockHash});
  if(!outputLog.ok||!usdtLog.ok)throw Error('BAD_LOGS');
  // Historical state may be unavailable on ordinary BSC RPCs. Never invent the deltas.
  let deltas:{status:'VERIFIED'|'UNAVAILABLE';usdtBefore?:string;usdtAfter?:string;outputBefore?:string;outputAfter?:string;
   usdtNetDecrease?:string;issuerNetIncrease?:string}={status:'UNAVAILABLE'};
  if(block>0n){
   try{
    const before='0x'+(block-1n).toString(16),after='0x'+block.toString(16);
    const [usdtBefore,usdtAfter,outputBefore,outputAfter]=await Promise.all([
     balance(BSC_USDT,String(data.sender),before,5),balance(BSC_USDT,String(data.sender),after,6),
     balance(token.address,String(data.sender),before,7),balance(token.address,String(data.sender),after,8)
    ]);
    deltas={status:'VERIFIED',usdtBefore:usdtBefore.toString(),usdtAfter:usdtAfter.toString(),
     outputBefore:outputBefore.toString(),outputAfter:outputAfter.toString(),
     usdtNetDecrease:(usdtBefore-usdtAfter).toString(),
     issuerNetIncrease:(outputAfter-outputBefore).toString()};
   }catch{/* Historical state is unavailable; retain INCOMPLETE rather than claiming delivery. */}
  }
  const out=BigInt(outputLog.value.receivedRaw)-BigInt(outputLog.value.sentRaw);
  const spent=BigInt(usdtLog.value.sentRaw)-BigInt(usdtLog.value.receivedRaw);
  const verified=confirmations>=3n&&deltas.status==='VERIFIED'&&
   BigInt(deltas.issuerNetIncrease??'0')>0n&&BigInt(deltas.usdtNetDecrease??'0')>0n&&out>0n&&spent>0n;
  return reply({kind:'sentinel.bsc.settlement',status:verified?'TRANSFER_EVIDENCE_VERIFIED':'INCOMPLETE',
   chainId:56,hash:data.hash,confirmations:confirmations.toString(),issuerToken:token.address,
   transferLogs:{usdtSentRaw:usdtLog.value.sentRaw,usdtReceivedRaw:usdtLog.value.receivedRaw,
    issuerReceivedRaw:outputLog.value.receivedRaw,issuerSentRaw:outputLog.value.sentRaw},
   stateBalances:deltas,
   limitation:'Only ERC-20 transfer and historical public balances checked. This is not proof that price, economic entitlement, transfer restrictions or finality are guaranteed. A matching authorized pretrade calldata fingerprint must be verified separately.'});
 }catch{return reply({kind:'sentinel.bsc.settlement',status:'UNAVAILABLE',error:'Public BSC settlement proof unavailable. No success inferred.'},503);}
}
