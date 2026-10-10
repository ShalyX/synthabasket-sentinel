import type {BasketLeg} from './basket';
import type {Equity,Platform,QuotePreview} from './model';

export type CheckoutLeg={ticker:string;platform:Platform;symbol:string;contract:string;weight:number;amountUsd:number;token:Equity};
export type CheckoutPlan={totalUsd:number;legs:CheckoutLeg[];issues:string[]};
export const BROWSER_EXECUTION_RELEASED=false as const;
export const EXECUTION_HOLD_REASON='Direct browser-wallet spending is not yet released: the swap route and issuer eligibility require independent verification. This is an actual safety stop, not a wallet connection failure.';

export function checkoutPlan(basket:BasketLeg[],tokens:Equity[],budget:number):CheckoutPlan{
 const issues:string[]=[];
 if(!Number.isFinite(budget)||budget<1||budget>250||Math.abs(Math.round(budget*100)-budget*100)>1e-5)
  issues.push('Choose a total between $1 and $250 in exact cents.');
 if(basket.length===0)issues.push('Choose at least one stock.');
 if(basket.length>4)issues.push('A basket can hold at most four stocks.');
 if(basket.reduce((sum,x)=>sum+x.weight,0)!==100&&basket.length>0)issues.push('Basket allocations must total 100%.');
 const totalCents=Number.isFinite(budget)?Math.round(budget*100):0;
 const cents=basket.map((leg,i)=>({leg,i,raw:leg.weight*totalCents/100,whole:Math.floor(leg.weight*totalCents/100)}));
 let remainder=totalCents-cents.reduce((n,x)=>n+x.whole,0);
 for(const x of [...cents].sort((a,b)=>(b.raw-b.whole)-(a.raw-a.whole)||a.i-b.i)){
  if(remainder<=0)break;
  x.whole++;remainder--;
 }
 const legs:CheckoutLeg[]=[];
 for(const x of cents){
  const asset=tokens.find(t=>t.ticker===x.leg.ticker&&t.platform===x.leg.platform);
  if(!asset){issues.push(x.leg.ticker+' contract is not in the current live inventory.');continue;}
  if(asset.tradingAvailable!==true)issues.push(x.leg.ticker+' trading is not currently confirmed open.');
  if(x.whole<100)issues.push(x.leg.ticker+' is under the $1 minimum. Increase the amount or change its weight.');
  legs.push({ticker:asset.ticker,platform:asset.platform,symbol:asset.symbol,contract:asset.address,weight:x.leg.weight,
   amountUsd:x.whole/100,token:asset});
 }
 return {totalUsd:totalCents/100,legs,issues:[...new Set(issues)]};
}
export function quoteState(leg:CheckoutLeg,quote:QuotePreview|undefined,now:number):'MISSING'|'MISMATCH'|'EXPIRED'|'FLAGGED'|'REVIEWED'{
 if(!quote)return 'MISSING';
 if(quote.ticker!==leg.ticker||quote.platform!==leg.platform||quote.address.toLowerCase()!==leg.contract.toLowerCase()||
  Math.abs(quote.amountUsd-leg.amountUsd)>.001)return 'MISMATCH';
 if(!Number.isFinite(Date.parse(quote.checkedAt))||Date.parse(quote.checkedAt)>now+3000||
  now-Date.parse(quote.checkedAt)>30000)return 'EXPIRED';
 return quote.review.status==='review'?'REVIEWED':'FLAGGED';
}
export type CheckoutGate={inventory:boolean;wallet:boolean;quotes:boolean;issuerEligibility:false;executionSafety:false;canSubmit:false;
 reason:string};
export function checkoutGate(plan:CheckoutPlan,walletReady:boolean,feedLive:boolean,
 quotes:Record<string,QuotePreview|undefined>,now:number):CheckoutGate{
 const inventory=plan.legs.length>0&&plan.issues.length===0&&feedLive;
 const quoteReady=inventory&&plan.legs.every(x=>quoteState(x,quotes[x.ticker],now)==='REVIEWED');
 return {inventory,wallet:walletReady,quotes:quoteReady,issuerEligibility:false,executionSafety:false,canSubmit:false,
 reason:EXECUTION_HOLD_REASON};
}
export const planKey=(plan:CheckoutPlan,account:string|null)=>[
 account?.toLowerCase()??'',plan.totalUsd.toFixed(2),...plan.legs.map(x=>x.ticker+':'+x.platform+':'+x.contract+':'+x.amountUsd.toFixed(2))
].join('|');
