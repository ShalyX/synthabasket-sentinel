export type Platform = 'ondo' | 'bstock';
export interface Equity {
 ticker:string; company:string; symbol:string; platform:Platform; address:string; logoUrl:string|null; decimals:number;
 tokenPrice:number|null; referencePrice:number|null; tokenToShareRatio:number|null; basisPct:number|null;
 tradingAvailable:boolean|null; marketSession:string|null;
}
export interface MarketSnapshot {asOf:string;tokens:Equity[];count:number;tickers:number;source?:'first-party-production-readonly';}
export interface QuotePreview {
 ticker:string;platform:Platform;address:string;amountUsd:number;tokenAmount:number;
 vendor:string|null;mode:'SWAP'|'RFQ';priceImpactPct:number|null;reportedFee:string|null;checkedAt:string;
 review:{status:'review'|'blocked';reasons:string[]};
}
const positive=(x:unknown):number|null=>{
 if(typeof x!=='string'&&typeof x!=='number') return null;
 const n=Number(x);return Number.isFinite(n)&&n>0&&n<1e18?n:null;
};
export function normalizeEquity(value:unknown):Equity|null {
 if(!value||typeof value!=='object')return null;
 const t=value as Record<string,any>;
 if(String(t.binanceChainId)!=='56'||!['ondo','bstock'].includes(t.platformId))return null;
 if(!/^0x[a-f\d]{40}$/i.test(t.tokenContractAddress||'')||!/^[A-Z0-9.-]{1,16}$/.test(t.underlyingTicker||''))return null;
 const tokenPrice=positive(t.tokenPrice),referencePrice=positive(t.referencePrice),ratio=positive(t.tokenToShareRatio);
 const rawDecimals=Number(t.decimals),decimals=Number.isInteger(rawDecimals)&&rawDecimals>=0&&rawDecimals<=30?rawDecimals:18;
 const basisPct=tokenPrice!==null&&referencePrice!==null&&ratio!==null?(tokenPrice/(referencePrice*ratio)-1)*100:null;
 return {ticker:t.underlyingTicker,company:String(t.underlyingName||t.underlyingTicker).slice(0,100),
  symbol:String(t.tokenSymbol||t.underlyingTicker).slice(0,30),platform:t.platformId,
  address:t.tokenContractAddress.toLowerCase(),decimals,
  logoUrl:typeof t.tokenLogoUrl==='string'&&/^https:\/\//.test(t.tokenLogoUrl)?t.tokenLogoUrl:null,
  tokenPrice,referencePrice,tokenToShareRatio:ratio,
  basisPct:basisPct!==null&&Number.isFinite(basisPct)?basisPct:null,
  tradingAvailable:typeof t.statusInfo?.openState==='boolean'?t.statusInfo.openState:null,
  marketSession:typeof t.statusInfo?.marketStatus==='string'?t.statusInfo.marketStatus.slice(0,48):null};
}
export const formatUsd=(x:number|null,d=2):string=>x===null||!Number.isFinite(x)?'—':
 new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:d}).format(x);
export const formatBasis=(x:number|null)=>x===null?'—':(x>0?'+':'')+x.toFixed(2)+'%';
export function tokenUnits(raw:string,decimals:number):number|null {
 try{
  if(!/^\d+$/.test(raw)||!Number.isInteger(decimals)||decimals<0||decimals>30)return null;
  const n=BigInt(raw),div=10n**BigInt(decimals),v=Number(n/div)+Number(n%div)/Number(div);
  return Number.isFinite(v)&&v>=0?v:null;
 }catch{return null;}
}
export const equityKey=(x:Pick<Equity,'platform'|'address'>)=>x.platform+':'+x.address;
