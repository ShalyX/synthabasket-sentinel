import {NextRequest,NextResponse} from 'next/server';
import {validAddress} from '@/lib/sentinel/execution-preflight';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const RPC='https://bsc-dataseed.bnbchain.org';
const limits=new Map<string,{count:number;until:number}>();
const reply=(body:Record<string,unknown>,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store, max-age=0'}});
export async function POST(req:NextRequest){
 const ip=(req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown').slice(0,80);
 const now=Date.now(),old=limits.get(ip);
 if(old&&old.until>now&&old.count>=20)return reply({error:'Receipt checks are rate limited.'},429);
 limits.set(ip,old&&old.until>now?{count:old.count+1,until:old.until}:{count:1,until:now+60000});
 if(limits.size>500)limits.clear();
 let json:unknown;
 try{const body=await req.text();if(body.length>45000)throw Error();json=JSON.parse(body);}catch{return reply({error:'Malformed receipt lookup.'},400);}
 if(!json||typeof json!=='object')return reply({error:'Malformed receipt lookup.'},400);
 const fields=json as Record<string,unknown>;
 if(Object.keys(fields).some(k=>!['hash','sender','target','data'].includes(k))||
  typeof fields.hash!=='string'||!/^0x[0-9a-f]{64}$/i.test(fields.hash)||
  !validAddress(fields.sender)||!validAddress(fields.target)||typeof fields.data!=='string'||
  !/^0x(?:[0-9a-f]{2}){4,20000}$/i.test(fields.data))
  return reply({error:'Provide the wallet hash and exact reviewed sender, target and calldata.'},400);
 try{
  const call=async(method:string,params:unknown[],id:number)=>{
   const res=await fetch(RPC,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id,method,params}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6500)});
   if(!res.ok)throw Error();
   const data:unknown=await res.json();if(!data||typeof data!=='object'||!('result' in data))throw Error();
   return (data as {result:unknown}).result;
  };
  const [chain,receipt,transaction]=await Promise.all([call('eth_chainId',[],1),call('eth_getTransactionReceipt',[fields.hash],2),call('eth_getTransactionByHash',[fields.hash],3)]);
  if(chain!=='0x38')return reply({error:'RPC returned wrong chain.'},503);
  if(transaction===null)return reply({kind:'sentinel.bsc.tx-receipt',status:'PENDING',hash:fields.hash,chainId:56,calldataMatched:false});
  if(!transaction||typeof transaction!=='object')throw Error();
  const t=transaction as Record<string,unknown>;
  if(String(t.from).toLowerCase()!==String(fields.sender).toLowerCase()||String(t.to).toLowerCase()!==String(fields.target).toLowerCase()||
    String(t.input).toLowerCase()!==fields.data.toLowerCase()||!['0x0','0x'].includes(String(t.value).toLowerCase()))
   return reply({kind:'sentinel.bsc.tx-receipt',status:'MISMATCH',error:'Wallet transaction did not match the exact reviewed sender, target, zero value and calldata.',calldataMatched:false},409);
  if(receipt===null)return reply({kind:'sentinel.bsc.tx-receipt',status:'PENDING',hash:fields.hash,chainId:56,calldataMatched:true});
  if(typeof receipt!=='object')throw Error();
  const r=receipt as Record<string,unknown>;
  if(typeof r.from!=='string'||r.from.toLowerCase()!==String(fields.sender).toLowerCase()||
     typeof r.to!=='string'||r.to.toLowerCase()!==String(fields.target).toLowerCase()||
     typeof r.transactionHash!=='string'||r.transactionHash.toLowerCase()!==fields.hash.toLowerCase())
   return reply({kind:'sentinel.bsc.tx-receipt',status:'MISMATCH',error:'Mined transaction did not match the reviewed sender/target.'},409);
  if(r.status!=='0x1'&&r.status!=='0x0')throw Error();
  return reply({kind:'sentinel.bsc.tx-receipt',chainId:56,hash:fields.hash,
   status:r.status==='0x1'?'MINED_SUCCESS':'MINED_REVERTED',blockNumber:r.blockNumber,
   calldataMatched:true,scope:'Exact reviewed transaction input plus EVM receipt; issuer-token balance changes and finality remain separately verified.'});
 }catch{return reply({error:'BSC receipt could not be verified. Do not infer success.'},503);}
}
