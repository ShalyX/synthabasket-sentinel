import type {Equity,Platform,QuotePreview} from './model';
import {previewIsFresh} from './policy';

export type WrapperQuoteRow={
 platform:Platform;
 symbol:string;
 ratio:number|null;
 quote:QuotePreview|null;
 shareEquivalent:number|null;
 secondsLeft:number;
 status:'ready'|'missing'|'expired'|'mismatch'|'ratio-unavailable';
};

export type WrapperQuoteComparison={
 status:'ready'|'awaiting-quotes'|'expired'|'mismatch'|'ratio-unavailable';
 rows:WrapperQuoteRow[];
 budgetUsd:number|null;
 leader:Platform|null;
 leadPct:number|null;
 gapInShareUnits:number|null;
 expiresInSeconds:number|null;
 policyFlagged:boolean;
};

const platforms:Platform[]=['bstock','ondo'];
const isPositiveFinite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>0;

function quoteRow(token:Equity,quote:QuotePreview|undefined,now:number):WrapperQuoteRow {
 const ratio=isPositiveFinite(token.tokenToShareRatio)?token.tokenToShareRatio:null;
 const base={platform:token.platform,symbol:token.symbol,ratio,quote:quote??null,shareEquivalent:null,secondsLeft:0};
 if(!quote)return {...base,status:ratio===null?'ratio-unavailable':'missing'};
 if(quote.ticker!==token.ticker||quote.platform!==token.platform||
   quote.address.toLowerCase()!==token.address.toLowerCase()||!isPositiveFinite(quote.tokenAmount)||
   !isPositiveFinite(quote.amountUsd))
  return {...base,status:'mismatch'};
 if(!previewIsFresh(quote,now)||Date.parse(quote.checkedAt)+30000<=now)
  return {...base,status:'expired'};
 const secondsLeft=Math.max(0,Math.ceil((Date.parse(quote.checkedAt)+30000-now)/1000));
 if(ratio===null)return {...base,secondsLeft,status:'ratio-unavailable'};
 const equivalent=quote.tokenAmount*ratio;
 if(!isPositiveFinite(equivalent))return {...base,secondsLeft,status:'ratio-unavailable'};
 return {...base,shareEquivalent:equivalent,secondsLeft,status:'ready'};
}

/**
 * Convert quotes for two wrappers of the SAME stock and SAME USDT budget.
 * tokenToShareRatio expresses share-equivalent exposure per token, not a legal
 * entitlement to shares or an actual executed trade.
 */
export function compareWrapperQuotes(
 tokens:Equity[],
 quotes:Partial<Record<Platform,QuotePreview|undefined>>,
 now:number
):WrapperQuoteComparison {
 const chosen=platforms.map(platform=>tokens.find(t=>t.platform===platform));
 if(chosen.some(t=>!t)||chosen[0]?.ticker!==chosen[1]?.ticker)
  return {status:'mismatch',rows:[],budgetUsd:null,leader:null,leadPct:null,gapInShareUnits:null,expiresInSeconds:null,policyFlagged:false};
 const rows=chosen.map(t=>quoteRow(t!,quotes[t!.platform],now));
 const base={rows,budgetUsd:null,leader:null,leadPct:null,gapInShareUnits:null,expiresInSeconds:null,
  policyFlagged:rows.some(r=>r.quote?.review.status==='blocked')};
 if(rows.some(r=>r.status==='mismatch'))return {...base,status:'mismatch'};
 if(rows.some(r=>r.status==='ratio-unavailable'))return {...base,status:'ratio-unavailable'};
 if(rows.some(r=>r.status==='expired'))return {...base,status:'expired'};
 if(rows.some(r=>r.status!=='ready'))return {...base,status:'awaiting-quotes'};
 const [bstock,ondo]=rows;
 const a=bstock.shareEquivalent!,b=ondo.shareEquivalent!;
 const qa=bstock.quote!,qb=ondo.quote!;
 if(Math.abs(qa.amountUsd-qb.amountUsd)>0.000001)
  return {...base,status:'mismatch'};
 const same=Math.abs(a-b)<=Number.EPSILON*Math.max(a,b)*4;
 const leader=same?null:a>b?'bstock':'ondo';
 const gap=Math.abs(a-b),leadPct=same?0:gap/Math.min(a,b)*100;
 if(!Number.isFinite(leadPct))return {...base,status:'mismatch'};
 return {status:'ready',rows,budgetUsd:qa.amountUsd,leader,leadPct,
  gapInShareUnits:gap,expiresInSeconds:Math.min(bstock.secondsLeft,ondo.secondsLeft),
  policyFlagged:base.policyFlagged};
}

/**
 * Shows the last quote pair as EXPIRED REFERENCE DATA only.
 * We reconstruct at the moment the more recent quote arrived, and only when
 * the two authenticated venue responses had an overlapping 30-second window.
 * Reuses all the existing instrument / ratio / budget validation; never
 * promotes an expired sample to a new live recommendation.
 */
export function expiredWrapperSnapshot(
 tokens:Equity[],
 quotes:Partial<Record<Platform,QuotePreview|undefined>>,
 now:number
):{comparison:WrapperQuoteComparison;observedAt:number;ageSeconds:number}|null {
 if(compareWrapperQuotes(tokens,quotes,now).status!=='expired')return null;
 const qa=quotes.bstock,qb=quotes.ondo;
 if(!qa||!qb)return null;
 const ta=Date.parse(qa.checkedAt),tb=Date.parse(qb.checkedAt);
 if(!Number.isFinite(ta)||!Number.isFinite(tb)||Math.abs(ta-tb)>=30000)return null;
 const observedAt=Math.max(ta,tb);
 if(observedAt>now)return null;
 const past=compareWrapperQuotes(tokens,quotes,observedAt);
 if(past.status!=='ready')return null;
 return {comparison:past,observedAt,ageSeconds:Math.max(0,Math.floor((now-observedAt)/1000))};
}

/** A single bounded clock source drives color, label and the TTL track. */
export function wrapperCountdown(
 expiresInSeconds:number|null,
 refreshing:boolean
):{phase:'checking'|'waiting'|'fresh'|'closing';label:string;remaining:number;progressPct:number}{
 if(refreshing)return {phase:'checking',label:'CHECKING BOTH ROUTES',remaining:0,progressPct:0};
 if(expiresInSeconds===null)return {phase:'waiting',label:'AWAITING TWO QUOTES',remaining:0,progressPct:0};
 const seconds=Math.min(30,Math.max(0,Math.floor(expiresInSeconds)));
 return {phase:seconds<=8?'closing':'fresh',
  label:seconds<=8?'CLOSING SOON · '+seconds+'s':'LIVE · '+seconds+'s',
  remaining:seconds,progressPct:seconds/30*100};
}
