import type { Equity,QuotePreview } from './model';
/** Informational fail-closed guard. This does not authorize or execute trades. */
export function assessPreview(token:Equity,amount:number,impact:number|null,checkedAt:string){
 const reasons:string[]=[];
 if(!Number.isFinite(amount)||amount<1||amount>250)reasons.push('Leg must be between $1 and $250.');
 if(token.tradingAvailable!==true)reasons.push(token.tradingAvailable===false?'Issuer marks this token unavailable.':'Trading status is unverified.');
 if(token.basisPct===null)reasons.push('Adjusted basis is unavailable.');
 else if(Math.abs(token.basisPct)>2.5)reasons.push('Reference-adjusted basis exceeds 2.5% review threshold.');
 if(impact===null)reasons.push('Quote does not include price impact.');
 else if(Math.abs(impact)>2)reasons.push('Price impact exceeds 2%.');
 if(Date.now()-Date.parse(checkedAt)>30000)reasons.push('Quote has expired.');
 return {status:reasons.length?'blocked' as const:'review' as const,reasons};
}
export function previewIsFresh(quote:QuotePreview|null|undefined,now:number){
 if(!quote)return false;const age=now-Date.parse(quote.checkedAt);
 return Number.isFinite(age)&&age>=0&&age<=30000;
}
