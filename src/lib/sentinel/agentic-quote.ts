import type {Equity,QuotePreview,Platform} from './model';

export const AGENTIC_QUOTE_KIND='synthabasket.sentinel.agentic-quote-observation' as const;
export const BSC_USDT_ADDRESS='0x55d398326f99059ff775485246999027b3197955' as const;
export interface AgenticQuoteObservation {
 kind:typeof AGENTIC_QUOTE_KIND;
 version:1;
 scope:'local-user-supplied-quote';
 observedAt:string;
 chainId:'56';
 fromToken:typeof BSC_USDT_ADDRESS;
 targetToken:string;
 ticker:string;
 platform:Platform;
 tokenSymbol:string;
 amountUsd:number;
 outputTokenAmount:string;
 permissions:{mayTrade:false;maySign:false;mayApprove:false};
}
export type AgenticQuoteParse={ok:true;value:AgenticQuoteObservation}|{ok:false;error:string};
const exactKeys=(value:Record<string,unknown>,keys:string[]):boolean=>
 Object.keys(value).length===keys.length&&Object.keys(value).every(k=>keys.includes(k));
const address=(v:unknown):v is string=>typeof v==='string'&&/^0x[a-f0-9]{40}$/.test(v);
const amount=(v:unknown):v is number=>typeof v==='number'&&Number.isInteger(v*100)&&v>=1&&v<=50;
const decimal=(v:unknown):v is string=>
 typeof v==='string'&&/^(?:0|[1-9]\d{0,17})(?:\.\d{1,18})?$/.test(v)&&Number(v)>0&&Number.isFinite(Number(v));
const tickerFormat=(v:unknown):v is string=>typeof v==='string'&&/^[A-Z0-9.-]{1,16}$/.test(v);
const symbolFormat=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9._-]{1,30}$/.test(v);

/** User supplied, never authenticated: strips extra metadata and can never authorize trading. */
export function parseAgenticQuote(value:unknown):AgenticQuoteParse {
 if(!value||typeof value!=='object'||Array.isArray(value))return {ok:false,error:'Not a quote observation file.'};
 const r=value as Record<string,unknown>;
 if(!exactKeys(r,['kind','version','scope','observedAt','chainId','fromToken','targetToken','ticker','platform','tokenSymbol','amountUsd','outputTokenAmount','permissions']))
  return {ok:false,error:'Unexpected fields in local quote file. Raw CLI output is not accepted.'};
 if(r.kind!==AGENTIC_QUOTE_KIND||r.version!==1||r.scope!=='local-user-supplied-quote')
  return {ok:false,error:'Unknown local quote format.'};
 if(typeof r.observedAt!=='string'||!Number.isFinite(Date.parse(r.observedAt))||new Date(Date.parse(r.observedAt)).toISOString()!==r.observedAt)
  return {ok:false,error:'Invalid quote observation time.'};
 if(r.chainId!=='56'||r.fromToken!==BSC_USDT_ADDRESS||!address(r.targetToken))
  return {ok:false,error:'Local quote is not a BSC USDT token observation.'};
 if(!tickerFormat(r.ticker)||!['ondo','bstock'].includes(String(r.platform))||!symbolFormat(r.tokenSymbol))
  return {ok:false,error:'Invalid instrument identity.'};
 if(!amount(r.amountUsd)||!decimal(r.outputTokenAmount))
  return {ok:false,error:'Invalid input or quoted token quantity.'};
 if(!r.permissions||typeof r.permissions!=='object'||Array.isArray(r.permissions))
  return {ok:false,error:'Missing read-only limits.'};
 const p=r.permissions as Record<string,unknown>;
 if(!exactKeys(p,['mayTrade','maySign','mayApprove'])||p.mayTrade!==false||p.maySign!==false||p.mayApprove!==false)
  return {ok:false,error:'Local quote must explicitly prohibit trade permissions.'};
 return {ok:true,value:{
  kind:AGENTIC_QUOTE_KIND,version:1,scope:'local-user-supplied-quote',observedAt:r.observedAt,chainId:'56',
  fromToken:BSC_USDT_ADDRESS,targetToken:r.targetToken,ticker:r.ticker,
  platform:r.platform as Platform,tokenSymbol:r.tokenSymbol,amountUsd:r.amountUsd,outputTokenAmount:r.outputTokenAmount,
  permissions:{mayTrade:false,maySign:false,mayApprove:false}
 }};
}
export type QuoteComparison={
 state:'invalid-instrument'|'stale-local'|'venue-missing'|'venue-expired'|'ready';
 deltaPct:number|null;
 localAmount:number;
 venueAmount:number|null;
};
export function compareAgenticQuote(
 local:AgenticQuoteObservation,token:Equity|undefined,venue:QuotePreview|undefined,now:number
):QuoteComparison {
 const localAmount=Number(local.outputTokenAmount);
 const base={localAmount,venueAmount:null,deltaPct:null};
 if(!token||token.ticker!==local.ticker||token.platform!==local.platform||
  token.address.toLowerCase()!==local.targetToken||token.symbol.toLowerCase()!==local.tokenSymbol.toLowerCase())
  return {...base,state:'invalid-instrument'};
 const age=now-Date.parse(local.observedAt);
 // Allow one UI refresh tick of clock skew when a file is generated after the page mounted.
 if(!Number.isFinite(age)||age<= -1000||age>120000)return {...base,state:'stale-local'};
 if(!venue)return {...base,state:'venue-missing'};
 if(venue.ticker!==local.ticker||venue.platform!==local.platform||
   venue.address.toLowerCase()!==local.targetToken||
   Math.abs(venue.amountUsd-local.amountUsd)>0.000001)
  return {...base,state:'invalid-instrument'};
 const webAge=now-Date.parse(venue.checkedAt);
 if(!Number.isFinite(webAge)||webAge<= -1000||webAge>30000)return {...base,state:'venue-expired'};
 const venueAmount=venue.tokenAmount;
 if(!Number.isFinite(venueAmount)||venueAmount<=0)return {...base,state:'venue-missing'};
 return {state:'ready',localAmount,venueAmount,
  deltaPct:(localAmount/venueAmount-1)*100};
}
