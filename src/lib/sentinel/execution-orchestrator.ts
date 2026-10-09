import type {BasketLeg} from './basket';
import {amountFor,MAX_LEGS} from './basket';
import type {Equity,Platform} from './model';
import {validAddress,SIMULATION_MAX_BASKET_USDT,SIMULATION_MAX_LEG_USDT} from './execution-preflight';

export type OrchestratorPhase='PLANNED'|'RUNNING'|'PREDICTED_PASS'|'BLOCKED'|'UNAVAILABLE'|'EXPIRED'|'INTERRUPTED';
export type LegPhase='NOT_ATTEMPTED'|'RUNNING'|'PASS'|'BLOCKED'|'UNAVAILABLE'|'EXPIRED';
export interface ExecutionLeg {
 ticker:string;platform:Platform;weight:number;amountUsd:number;tokenContract:string;
}
export interface PreflightReceipt {
 kind:'sentinel.bsc.sandbox-preflight';chainId:56;
 ticker:string;platform:Platform;tokenContract:string;amountUsd:number;
 symbol:string;quotedTokenAmount:number;normalizedShareUnits:number|null;routeMode:'SWAP';routeVendor:string;
 priceImpactPct:number;maxSlippagePercent:number;gasLimit:string|null;approvalTarget:string|null;
 builtTransaction:{present:true;dataBytes:number;nonzeroNativeValue:false};
 inspectedAt:string;expiresAt:string;
 state:'SIMULATION_PASSED'|'NOT_READY';
 simulation:{status:'PASS'|'BLOCKED'|'UNKNOWN'|'EXPIRED';reason:string|null;reportedStatus:string;balanceChangeCount:number;allowanceChangeCount:number;unexpectedApprovalIncrease:boolean};
 executed:false;tradeAuthorized:false;signatureRequested:false;approvalsRequested:false;broadcastRequested:false;
}
export interface OrchestratorLeg {
 leg:ExecutionLeg;phase:LegPhase;reason:string|null;receipt:PreflightReceipt|null;
}
export interface Rehearsal {
 key:string;walletAddress:string;startedAt:number;finishedAt:number|null;
 phase:OrchestratorPhase;attempt:number;legs:OrchestratorLeg[];
 noOrders:true;noSigning:true;rehearsalOnly:true;
}
export type PlanningResult={ok:true;value:Rehearsal}|{ok:false;reason:string};
export const MAX_MANUAL_ATTEMPTS=3;
const cents=(n:number)=>Number.isFinite(n)&&n>=1&&n<=SIMULATION_MAX_LEG_USDT&&Math.abs(n*100-Math.round(n*100))<1e-6;
const identity=(legs:ExecutionLeg[],wallet:string)=>wallet.toLowerCase()+'|'+legs.map(l=>
 l.ticker+':'+l.platform+':'+l.tokenContract.toLowerCase()+':'+l.weight+':'+l.amountUsd.toFixed(2)).join('|');
export function planRehearsal(
 basket:BasketLeg[],inventory:Equity[],walletAddress:string,budgetUsd:number,now:number,
 previous?:Rehearsal
):PlanningResult{
 if(!validAddress(walletAddress)||!Number.isFinite(now))
  return {ok:false,reason:'Connect a valid BSC mainnet wallet before planning.'};
 if(!Number.isFinite(budgetUsd)||budgetUsd<1||budgetUsd>SIMULATION_MAX_BASKET_USDT||
    Math.abs(budgetUsd*100-Math.round(budgetUsd*100))>1e-6)
  return {ok:false,reason:'Basket amount must be a valid USDT-cent amount within $50.'};
 if(basket.length<1||basket.length>MAX_LEGS||basket.some(l=>l.weight<5||!Number.isInteger(l.weight))||
    basket.reduce((s,l)=>s+l.weight,0)!==100||
    new Set(basket.map(l=>l.ticker)).size!==basket.length)
  return {ok:false,reason:'Select one to four unique, weighted issuer legs totaling exactly 100%.'};
 const legs:ExecutionLeg[]=[];
 for(const leg of basket){
  const token=inventory.find(x=>x.ticker===leg.ticker&&x.platform===leg.platform);
  const amt=amountFor(budgetUsd,leg);
  if(!token||token.tradingAvailable!==true||!validAddress(token.address))
   return {ok:false,reason:leg.ticker+' issuer contract is missing, closed or invalid.'};
  if(!cents(amt))return {ok:false,reason:leg.ticker+' allocation is outside the $1–$25 simulation leg limit.'};
  legs.push({ticker:leg.ticker,platform:leg.platform,weight:leg.weight,amountUsd:amt,tokenContract:token.address.toLowerCase()});
 }
 if(legs.reduce((s,l)=>s+Math.round(l.amountUsd*100),0)>SIMULATION_MAX_BASKET_USDT*100)
  return {ok:false,reason:'Total requested spend exceeds $50 USDT.'};
 const key=identity(legs,walletAddress);
 if(previous&&previous.key!==key)return {ok:false,reason:'Wallet, issuer contract or basket changed. Create a new plan.'};
 if(previous&&previous.attempt>=MAX_MANUAL_ATTEMPTS)
  return {ok:false,reason:'Manual recovery limit reached. Inspect the failure or change the plan.'};
 return {ok:true,value:{key,walletAddress,startedAt:now,finishedAt:null,phase:'PLANNED',
  attempt:(previous?.attempt??0)+1,legs:legs.map(leg=>({leg,phase:'NOT_ATTEMPTED',reason:null,receipt:null})),
  noOrders:true,noSigning:true,rehearsalOnly:true}};
}
function reason(value:unknown,fallback:string){
 return typeof value==='string'&&value.trim().length>0?value.trim().slice(0,250):fallback;
}
export function validatePreflight(
 raw:unknown,leg:ExecutionLeg,now:number
):{ok:true;receipt:PreflightReceipt;passed:boolean}|{ok:false;reason:string}{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {ok:false,reason:'No usable simulator evidence.'};
 const x=raw as Record<string,unknown>;
 if(x.kind!=='sentinel.bsc.sandbox-preflight'||x.chainId!==56||
   x.ticker!==leg.ticker||x.platform!==leg.platform||
   typeof x.tokenContract!=='string'||x.tokenContract.toLowerCase()!==leg.tokenContract.toLowerCase()||
   x.amountUsd!==leg.amountUsd||x.executed!==false||x.tradeAuthorized!==false||
   x.signatureRequested!==false||x.approvalsRequested!==false||x.broadcastRequested!==false)
  return {ok:false,reason:'Simulator evidence did not match the issuer, wallet-bound plan or read-only guarantees.'};
 if(typeof x.symbol!=='string'||x.symbol.length<1||x.symbol.length>30||
   x.routeMode!=='SWAP'||typeof x.routeVendor!=='string'||x.routeVendor.length<1||
   typeof x.quotedTokenAmount!=='number'||!Number.isFinite(x.quotedTokenAmount)||x.quotedTokenAmount<=0||
   !(x.normalizedShareUnits===null||(typeof x.normalizedShareUnits==='number'&&Number.isFinite(x.normalizedShareUnits)))||
   typeof x.priceImpactPct!=='number'||!Number.isFinite(x.priceImpactPct)||
   typeof x.maxSlippagePercent!=='number'||x.maxSlippagePercent<0||x.maxSlippagePercent>0.5||
   !(x.gasLimit===null||(typeof x.gasLimit==='string'&&/^[0-9]{1,7}$/.test(x.gasLimit)))||
   !(x.approvalTarget===null||validAddress(x.approvalTarget))||
   !x.builtTransaction||typeof x.builtTransaction!=='object'||
   (x.builtTransaction as Record<string,unknown>).present!==true||
   typeof (x.builtTransaction as Record<string,unknown>).dataBytes!=='number'||
   (x.builtTransaction as Record<string,unknown>).nonzeroNativeValue!==false)
  return {ok:false,reason:'Incomplete or unrecognized unsigned transaction evidence.'};
 if(typeof x.expiresAt!=='string'||typeof x.inspectedAt!=='string'||
   !Number.isFinite(Date.parse(x.expiresAt))||!Number.isFinite(Date.parse(x.inspectedAt))||
   Date.parse(x.inspectedAt)>now+5_000||Date.parse(x.expiresAt)<Date.parse(x.inspectedAt)-30_000)
  return {ok:false,reason:'Simulator evidence has invalid timestamps.'};
 const sim=x.simulation;
 if(!sim||typeof sim!=='object'||Array.isArray(sim))return {ok:false,reason:'Simulation status missing.'};
 const fields=sim as Record<string,unknown>;
 if(typeof fields.reportedStatus!=='string'||fields.reportedStatus.length>60||
    !(fields.reason===null||typeof fields.reason==='string')||
    !Number.isInteger(fields.balanceChangeCount)||!Number.isInteger(fields.allowanceChangeCount)||
    typeof fields.unexpectedApprovalIncrease!=='boolean')
  return {ok:false,reason:'Simulator balance or allowance diagnostics are missing.'};
 const status=fields.status;
 if(!['PASS','BLOCKED','UNKNOWN','EXPIRED'].includes(String(status)))
  return {ok:false,reason:'Simulation status is unsupported.'};
 const passed=status==='PASS'&&x.state==='SIMULATION_PASSED'&&Date.parse(x.expiresAt)>now+2_000;
 if(status==='PASS'&&x.state!=='SIMULATION_PASSED')return {ok:false,reason:'Simulator success conflicts with policy state.'};
 return {ok:true,receipt:raw as PreflightReceipt,passed};
}
export type RehearsalUpdate=(state:Rehearsal)=>void;
export type PreflightTransport=(leg:ExecutionLeg,walletAddress:string,signal:AbortSignal)=>
 Promise<{ok:boolean;status:number;body:unknown}>;
const clone=(state:Rehearsal)=>({...state,legs:state.legs.map(l=>({...l}))});
/** One explicit run. One fresh quote/build/simulation per leg. Never retries or signs on its own. */
export async function rehearse(
 initial:Rehearsal,transport:PreflightTransport,signal:AbortSignal,
 onUpdate:RehearsalUpdate,now:()=>number=Date.now,
 isCurrent:()=>boolean=()=>true
):Promise<Rehearsal>{
 if(initial.phase!=='PLANNED')throw Error('A rehearsed plan must be recreated for recovery.');
 let state=clone(initial);state.phase='RUNNING';onUpdate(clone(state));
 for(let i=0;i<state.legs.length;i++){
  if(signal.aborted||!isCurrent()){state.phase='INTERRUPTED';break;}
  state.legs[i]={...state.legs[i],phase:'RUNNING'};onUpdate(clone(state));
  try{
   const response=await transport(state.legs[i].leg,state.walletAddress,signal);
   if(signal.aborted||!isCurrent()){state.phase='INTERRUPTED';break;}
   if(!response.ok){
    const body=response.body&&typeof response.body==='object'?response.body as Record<string,unknown>:{};
    const unavailable=response.status>=500||response.status===429||response.status===0;
    const phase:LegPhase=unavailable?'UNAVAILABLE':'BLOCKED';
    state.legs[i]={...state.legs[i],phase,reason:reason(body.error,'Upstream quote/build/simulator unavailable.'),receipt:null};
    state.phase=unavailable?'UNAVAILABLE':'BLOCKED';onUpdate(clone(state));break;
   }
   const check=validatePreflight(response.body,state.legs[i].leg,now());
   if(!check.ok){
    state.legs[i]={...state.legs[i],phase:'UNAVAILABLE',reason:check.reason,receipt:null};
    state.phase='UNAVAILABLE';onUpdate(clone(state));break;
   }
   const phase:LegPhase=check.passed?'PASS':
    Date.parse(check.receipt.expiresAt)<=now()+2_000?'EXPIRED':
    check.receipt.simulation.status==='UNKNOWN'?'UNAVAILABLE':'BLOCKED';
   state.legs[i]={...state.legs[i],phase,reason:check.passed?null:
    reason(check.receipt.simulation.reason,phase==='EXPIRED'?'Quote expired; request a new entire-basket rehearsal.':'The simulator did not confirm execution.'),receipt:check.receipt};
   onUpdate(clone(state));
   if(!check.passed){state.phase=phase==='EXPIRED'?'EXPIRED':phase==='UNAVAILABLE'?'UNAVAILABLE':'BLOCKED';break;}
  }catch(e){
   if(signal.aborted||!isCurrent()){state.phase='INTERRUPTED';break;}
   state.legs[i]={...state.legs[i],phase:'UNAVAILABLE',reason:'Request did not complete; do not infer success.',receipt:null};
   state.phase='UNAVAILABLE';onUpdate(clone(state));break;
  }
 }
 if(state.phase==='RUNNING')state.phase='PREDICTED_PASS';
 state.finishedAt=now();onUpdate(clone(state));return clone(state);
}
/** Quotes are short lived; an old PASS becomes expired, never evergreen execution permission. */
export function expireRehearsal(state:Rehearsal,now:number):Rehearsal{
 if(!Number.isFinite(now))return state;
 const s=clone(state);
 let expired=false;
 for(const item of s.legs){
  if(item.phase==='PASS'&&item.receipt&&Date.parse(item.receipt.expiresAt)<=now+2_000){
   item.phase='EXPIRED';item.reason='Old simulation is reference-only; explicitly run a fresh full-basket rehearsal.';
   expired=true;
  }
 }
 if(expired&&s.phase==='PREDICTED_PASS')s.phase='EXPIRED';
 return s;
}
export function recoveryDecision(state:Rehearsal,now:number){
 const current=expireRehearsal(state,now);
 const retryable=['BLOCKED','UNAVAILABLE','EXPIRED','INTERRUPTED'].includes(current.phase);
 return {action:retryable&&current.attempt<MAX_MANUAL_ATTEMPTS?'REHEARSE_ALL_FRESH':'NO_AUTOMATIC_RECOVERY',
  reason:retryable?'Prior quotes and builds are not reusable. A user may explicitly rehearse every leg from a new quote; no transactions are sent.':
    'No recovery action is available. Simulation does not authorize purchases.',
  resetAllLegs:true as const,autoRetry:false as const,canBroadcast:false as const};
}
