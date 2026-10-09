import 'server-only';
import { createHmac } from 'node:crypto';
import {type MarketSnapshot,normalizeEquity} from './model';
import {TRUSTED_PREVIEW_MARKET_URL,validateFirstPartyInventory} from './read-only-inventory-relay';
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
  // Preview deployments never receive the signed Binance API credentials. For
  // read-only inventory ONLY, trust our fixed production API, which itself
  // obtains the authenticated feed. No dynamic origin, private keys, routes,
  // wallet data, approvals or quotes can be forwarded through this fallback.
  if(process.env.VERCEL_ENV==='preview'&&(!process.env.OC_API_KEY||!process.env.OC_SECRET_KEY)){
   let read:Response;
   try{read=await fetch(TRUSTED_PREVIEW_MARKET_URL,{cache:'no-store',redirect:'error',
     signal:AbortSignal.timeout(11_000),headers:{Accept:'application/json'}});}
   catch{throw new UpstreamError('The canonical read-only market relay cannot be reached.',0,503);}
   if(!read.ok)throw new UpstreamError('The canonical read-only market relay is unavailable.',0,503);
   let raw:unknown;
   try{raw=await read.json();}catch{throw new UpstreamError('The canonical read-only feed was unreadable.',0,503);}
   const checked=validateFirstPartyInventory(raw,Date.now());
   if(!checked.ok)throw new UpstreamError(checked.message,0,503);
   cached={expires:Math.min(Date.now()+15_000,Date.parse(checked.value.asOf)+60_000),value:checked.value};
   return checked.value;
  }
  const response=await binanceGet('/api/v1/dex/market/rwa/tokens',{binanceChainId:'56'});
  if(!Array.isArray(response))throw new UpstreamError('Unexpected Binance stock inventory response.',0);
  const tokens=response.map(normalizeEquity).filter((v):v is NonNullable<typeof v>=>v!==null);
  if(!tokens.length)throw new UpstreamError('Binance returned no supported BSC equities.',0);
  const value={asOf:new Date().toISOString(),tokens,count:tokens.length,tickers:new Set(tokens.map(x=>x.ticker)).size};
  cached={expires:Date.now()+30000,value};return value;
 })().finally(()=>{inFlight=null;});
 return inFlight;
}


/**
 * Only the Binance pre-transaction SIMULATION endpoint can be called via POST.
 * The endpoint is read-only: do NOT add broadcast, RFQ orders, sign or approve.
 * Never leak raw transaction payloads or developer credentials in UI responses.
 */
export async function binanceSimulateEvmTx(evmTx:{
 from:string;to:string;value:'0';data:string;
}):Promise<unknown>{
 const apiKey=process.env.OC_API_KEY,secret=process.env.OC_SECRET_KEY;
 if(!apiKey||!secret)throw new UpstreamError('Binance credentials are not configured on this server.',0,503);
 const path='/api/v1/dex/pre-transaction/simulate';
 const urlPath='/build'+path;
 const body=JSON.stringify({binanceChainId:'56',evmTx});
 const timestamp=new Date().toISOString();
 const signature=createHmac('sha256',secret).update(timestamp+'POST'+urlPath+body).digest('base64');
 let response:Response;
 try{
  response=await fetch(origin+urlPath,{
   method:'POST',
   headers:{'Content-Type':'application/json',Accept:'application/json','X-OC-APIKEY':apiKey,'X-OC-TIMESTAMP':timestamp,'X-OC-SIGN':signature},
   body,signal:AbortSignal.timeout(12000),cache:'no-store',redirect:'error'
  });
 }catch{throw new UpstreamError('Could not reach Binance Transaction API to simulate the swap.',0,502);}
 let result:{code?:number|string;success?:boolean;msg?:string;data?:unknown};
 try{result=await response.json();}catch{throw new UpstreamError('Transaction API returned unreadable data.',0);}
 const code=Number(result.code??0);
 if(!response.ok||result.success===false||code!==0)
  throw new UpstreamError(code===40304?'Binance restricts simulation access from this environment.':
   'Binance simulation request failed (code '+(Number.isFinite(code)?code:'unknown')+').',
   Number.isFinite(code)?code:0,code===40304?451:502);
 return result.data;
}
