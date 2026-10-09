import type {Equity,MarketSnapshot} from './model';

/**
 * Trust a single hardcoded first-party *read-only* production market endpoint
 * when the preview lacks its own Binance API credentials. This is NOT a
 * Binance-signed payload verifiable by the browser and does not confer
 * issuer eligibility or live-trading access. Never relay swaps, approvals,
 * wallet addresses, accounts or user-controlled URLs.
 */
export const TRUSTED_PREVIEW_MARKET_URL=
 'https://synthabasket-sentinel.vercel.app/api/sentinel/markets';
const validAddress=(x:unknown)=>typeof x==='string'&&/^0x[0-9a-f]{40}$/.test(x);
const nullableNumber=(x:unknown)=>x===null||(typeof x==='number'&&Number.isFinite(x));
function isEquity(value:unknown):value is Equity{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const t=value as Record<string,unknown>;
 return typeof t.ticker==='string'&&/^[A-Z0-9.-]{1,16}$/.test(t.ticker)&&
  typeof t.company==='string'&&t.company.length>0&&t.company.length<=100&&
  typeof t.symbol==='string'&&t.symbol.length>0&&t.symbol.length<=30&&
  (t.platform==='bstock'||t.platform==='ondo')&&validAddress(t.address)&&
  typeof t.decimals==='number'&&Number.isInteger(t.decimals)&&t.decimals>=0&&t.decimals<=30&&
  (t.logoUrl===null||(typeof t.logoUrl==='string'&&/^https:\/\//.test(t.logoUrl)&&t.logoUrl.length<900))&&
  nullableNumber(t.tokenPrice)&&nullableNumber(t.referencePrice)&&
  nullableNumber(t.tokenToShareRatio)&&nullableNumber(t.basisPct)&&
  (t.tradingAvailable===null||typeof t.tradingAvailable==='boolean')&&
  (t.marketSession===null||(typeof t.marketSession==='string'&&t.marketSession.length<=48));
}
export function validateFirstPartyInventory(
 raw:unknown,nowMs:number
):{ok:true;value:MarketSnapshot}|{ok:false;message:string}{
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Number.isFinite(nowMs))
  return {ok:false,message:'Invalid first-party inventory payload.'};
 const v=raw as Record<string,unknown>;
 if(typeof v.asOf!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(v.asOf)||
  !Number.isFinite(Date.parse(v.asOf))||Date.parse(v.asOf)>nowMs+5_000||
  nowMs-Date.parse(v.asOf)>70_000)
  return {ok:false,message:'First-party market inventory is stale or undated.'};
 if(!Array.isArray(v.tokens)||v.tokens.length===0||v.tokens.length>1200||
    !v.tokens.every(isEquity)||v.count!==v.tokens.length||
    typeof v.tickers!=='number'||v.tickers!==new Set(v.tokens.map(x=>x.ticker)).size)
  return {ok:false,message:'First-party market inventory schema failed validation.'};
 // All objects are cloned from a single canonical first-party HTTPS endpoint.
 return {ok:true,value:{asOf:v.asOf,tokens:v.tokens,count:v.count as number,
  tickers:v.tickers,source:'first-party-production-readonly'}};
}
