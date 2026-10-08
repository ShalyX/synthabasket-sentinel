import 'server-only';
import { createHmac } from 'node:crypto';
import {type MarketSnapshot,normalizeEquity} from './model';
const origin='https://web3.binance.com';
export const BSC_USDT='0x55d398326f99059ff775485246999027b3197955';
export class UpstreamError extends Error { constructor(message:string,public code:number,public httpStatus=502){super(message);} }
export async function binanceGet(path:string,query:Record<string,string>):Promise<unknown>{
 const apiKey=process.env.OC_API_KEY,secret=process.env.OC_SECRET_KEY;
 if(!apiKey||!secret)throw new UpstreamError('Binance credentials are not configured on this server.',0,503);
 if(!/^\/api\/v1\/dex\/[a-z0-9/-]+$/.test(path))throw new UpstreamError('Unsupported Binance API route.',0,400);
 const qs=new URLSearchParams(query).toString();
 const requestPath='/build'+path+(qs?'?'+qs:'');
 const timestamp=new Date().toISOString();
 const sig=createHmac('sha256',secret).update(timestamp+'GET'+requestPath).digest('base64');
 let response:Response;
 try{response=await fetch(origin+requestPath,{
  method:'GET',headers:{'X-OC-APIKEY':apiKey,'X-OC-TIMESTAMP':timestamp,'X-OC-SIGN':sig,Accept:'application/json'},
  signal:AbortSignal.timeout(10000),cache:'no-store',redirect:'error'
 });}catch{throw new UpstreamError('Cannot reach Binance from this server. Check environment/network access.',0,502);}
 let body:{code?:number|string;success?:boolean;msg?:string;data?:unknown};
 try{body=await response.json();}catch{throw new UpstreamError('Binance returned unreadable data.',0);}
 const code=Number(body.code??0);
 if(!response.ok||body.success===false||code!==0) {
  const restricted=code===40304;
  throw new UpstreamError(restricted?'Binance restricts RWA data access from this server environment.':
    'Binance API request failed (code '+(Number.isFinite(code)?code:'unknown')+').',
    Number.isFinite(code)?code:0,restricted?451:502);
 }
 return body.data;
}
let cached:{expires:number;value:MarketSnapshot}|null=null;
let inFlight:Promise<MarketSnapshot>|null=null;
export async function getSentinelMarkets():Promise<MarketSnapshot>{
 if(cached&&cached.expires>Date.now())return cached.value;
 if(inFlight)return inFlight;
 inFlight=(async()=>{
  const response=await binanceGet('/api/v1/dex/market/rwa/tokens',{binanceChainId:'56'});
  if(!Array.isArray(response))throw new UpstreamError('Unexpected Binance stock inventory response.',0);
  const tokens=response.map(normalizeEquity).filter((v):v is NonNullable<typeof v>=>v!==null);
  if(!tokens.length)throw new UpstreamError('Binance returned no supported BSC equities.',0);
  const value={asOf:new Date().toISOString(),tokens,count:tokens.length,tickers:new Set(tokens.map(x=>x.ticker)).size};
  cached={expires:Date.now()+30000,value};return value;
 })().finally(()=>{inFlight=null;});
 return inFlight;
}
