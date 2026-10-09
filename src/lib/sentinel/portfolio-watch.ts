import type {BasketLeg} from './basket';
import type {Platform} from './model';
import {tokenUnits} from './model';
import {validAddress} from './execution-preflight';

export const WATCH_MAX_LEGS=4;
export const WATCH_REFRESH_MS=30_000;
export const WATCH_MAX_AGE_MS=65_000;

export type WatchedContract={ticker:string;platform:Platform};
export type PortfolioObservationLeg={
 ticker:string;platform:Platform;symbol:string;contract:string;decimals:number;
 balanceRaw:string|null;tokenPriceUsd:number|null;status:'OBSERVED'|'UNAVAILABLE';
};
export type PortfolioObservation={
 kind:'sentinel.bsc.portfolio-observation';
 chainId:56;walletAddress:string;blockNumber:string;observedAt:string;
 marketAsOf:string;legs:PortfolioObservationLeg[];hasMissingBalances:boolean;
 readOnly:true;signaturesRequested:false;ordersSubmitted:false;
};
export type DriftStatus='NEEDS_WALLET'|'STALE'|'UNPRICED'|'EMPTY'|'WITHIN_BAND'|'DRIFT_DETECTED';
export type DriftLeg={
 ticker:string;platform:Platform;targetPct:number;actualPct:number;
 deltaPct:number;valueUsd:number;units:number;markUsd:number;
 suggestedDirection:'INCREASE'|'REDUCE'|'HOLD';indicativeValueUsd:number;
};
export type DriftAssessment={
 status:DriftStatus;totalValueUsd:number|null;maxAbsDriftPct:number|null;
 legs:DriftLeg[];reason:string;reviewOnly:true;noExecution:true;
};
const empty=(status:DriftStatus,reason:string):DriftAssessment=>({
 status,totalValueUsd:null,maxAbsDriftPct:null,legs:[],reason,reviewOnly:true,noExecution:true
});
/**
 * Display a confirmed $0.00 for an observed zero token balance, rather than
 * an unavailable valuation. Do not infer $0.00 from a missing RPC response,
 * absent mark, stale snapshot, or unobserved contract.
 */
export function markedValueForDisplay(
 assessment:DriftAssessment,
 selected:Pick<WatchedContract,'ticker'|'platform'>,
 observed:PortfolioObservationLeg|undefined
):number|null{
 const priced=assessment.legs.find(row=>row.ticker===selected.ticker&&row.platform===selected.platform);
 if(priced)return priced.valueUsd;
 if(assessment.status==='EMPTY'&&observed?.ticker===selected.ticker&&
   observed.platform===selected.platform&&observed.status==='OBSERVED'&&
   observed.balanceRaw==='0'&&observed.tokenPriceUsd!==null&&
   Number.isFinite(observed.tokenPriceUsd)&&observed.tokenPriceUsd>0)
  return 0;
 return null;
}
export function parseWatchRequest(raw:unknown):{ok:true;walletAddress:string;legs:WatchedContract[]}|{ok:false;reason:string}{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {ok:false,reason:'Missing public wallet and selected issuer contracts.'};
 const x=raw as Record<string,unknown>;
 if(Object.keys(x).some(k=>!['walletAddress','legs'].includes(k))||!validAddress(x.walletAddress)||
    !Array.isArray(x.legs)||x.legs.length<1||x.legs.length>WATCH_MAX_LEGS)
  return {ok:false,reason:'Read-only watch accepts a public BSC address and one to four selected contracts.'};
 const keys=new Set<string>();
 const legs:WatchedContract[]=[];
 for(const item of x.legs){
  if(!item||typeof item!=='object'||Array.isArray(item))return {ok:false,reason:'Malformed watch leg.'};
  const v=item as Record<string,unknown>;
  if(Object.keys(v).some(k=>!['ticker','platform'].includes(k))||
     typeof v.ticker!=='string'||!/^[A-Z0-9.-]{1,16}$/.test(v.ticker)||
     (v.platform!=='bstock'&&v.platform!=='ondo')||keys.has(v.ticker))
   return {ok:false,reason:'Duplicate or unsupported selected issuer contract.'};
  keys.add(v.ticker);
  legs.push({ticker:v.ticker,platform:v.platform});
 }
 return {ok:true,walletAddress:x.walletAddress as string,legs};
}
export function assessPortfolioDrift(
 target:BasketLeg[],observation:PortfolioObservation|null,
 thresholdPct:number,nowMs:number
):DriftAssessment{
 if(!observation)return empty('NEEDS_WALLET','Connect a BSC wallet to read its issuer-contract balances.');
 if(!Number.isFinite(thresholdPct)||thresholdPct<1||thresholdPct>25)
  return empty('UNPRICED','Choose a valid portfolio drift threshold.');
 if(observation.kind!=='sentinel.bsc.portfolio-observation'||observation.chainId!==56||
   !validAddress(observation.walletAddress)||observation.readOnly!==true||
   !Number.isFinite(nowMs)||!Number.isFinite(Date.parse(observation.observedAt))||
   nowMs<Date.parse(observation.observedAt)-5_000||
   nowMs-Date.parse(observation.observedAt)>WATCH_MAX_AGE_MS||
   !Number.isFinite(Date.parse(observation.marketAsOf))||
   nowMs<Date.parse(observation.marketAsOf)-5_000||
   nowMs-Date.parse(observation.marketAsOf)>WATCH_MAX_AGE_MS)
  return empty('STALE','Wallet snapshot or issuer marks are stale; refresh before evaluating drift.');
 if(target.length===0||target.length>WATCH_MAX_LEGS||observation.legs.length!==target.length||
    target.reduce((s,l)=>s+l.weight,0)!==100)
  return empty('UNPRICED','The current basket does not match the observed issuer positions.');
 const observed=target.map(x=>observation.legs.find(y=>y.ticker===x.ticker&&y.platform===x.platform));
 if(observed.some(x=>!x))return empty('UNPRICED','A selected issuer contract is missing from the BSC observation.');
 const valued=target.map((leg,i)=>{
  const x=observed[i]!;
  if(x.status!=='OBSERVED'||x.balanceRaw===null||!/^(0|[1-9][0-9]*)$/.test(x.balanceRaw)||
     !validAddress(x.contract)||!Number.isInteger(x.decimals)||x.decimals<0||x.decimals>30||
     x.tokenPriceUsd===null||!Number.isFinite(x.tokenPriceUsd)||x.tokenPriceUsd<=0)
   return null;
  const units=tokenUnits(x.balanceRaw,x.decimals);
  if(units===null)return null;
  const value=units*x.tokenPriceUsd;
  if(!Number.isFinite(value)||value<0||value>1e15)return null;
  return {leg,x,units,value};
 });
 if(valued.some(x=>x===null))return empty('UNPRICED',
  'A BSC balance or live issuer token mark is missing. No zero balance or valuation is inferred.');
 const positions=valued as NonNullable<typeof valued[number]>[];
 const total=positions.reduce((s,x)=>s+x.value,0);
 if(!Number.isFinite(total)||total<=0)return {
  ...empty('EMPTY','No observed value in these selected issuer contracts. No purchase or rebalance is inferred from an empty basket.'),
  totalValueUsd:0
 };
 const rows:DriftLeg[]=positions.map(({leg,x,value,units})=>{
  const actualPct=value/total*100,deltaPct=actualPct-leg.weight;
  const suggestedDirection=Math.abs(deltaPct)>thresholdPct?(deltaPct>0?'REDUCE':'INCREASE'):'HOLD';
  return {ticker:leg.ticker,platform:leg.platform,targetPct:leg.weight,actualPct,deltaPct,
   valueUsd:value,units,markUsd:x.tokenPriceUsd!,suggestedDirection,
   indicativeValueUsd:suggestedDirection==='HOLD'?0:Math.abs(deltaPct)/100*total};
 });
 const maxAbsDriftPct=Math.max(...rows.map(x=>Math.abs(x.deltaPct)));
 const exceeded=rows.some(x=>x.suggestedDirection!=='HOLD');
 return {status:exceeded?'DRIFT_DETECTED':'WITHIN_BAND',totalValueUsd:total,maxAbsDriftPct,
  legs:rows,reason:exceeded?
   'Observed allocation has crossed the selected band. Adjustments are indicative and require separate, eligible quote and execution review.':
   'Observed allocation is within the selected band. No adjustment proposed.',
  reviewOnly:true,noExecution:true};
}
