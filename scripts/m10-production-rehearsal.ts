/**
 * Read-only production smoke test for Sentinel M9's REAL basket orchestrator.
 * Uses a deliberately unowned/unfunded BSC address by default. Never signs or broadcasts.
 * Prints concise provider evidence only (no calldata or credentials).
 * Run: npx tsx scripts/m10-production-rehearsal.ts
 */
import {planRehearsal,rehearse,recoveryDecision} from '../src/lib/sentinel/execution-orchestrator';
import type {Equity} from '../src/lib/sentinel/model';

async function main() {
 const origin=(process.env.SENTINEL_READONLY_BASE_URL||'https://synthabasket-sentinel.vercel.app').replace(/\/$/,'');
 const walletAddress='0x000000000000000000000000000000000000dEaD';
 const basket=[{ticker:'NVDA',platform:'bstock' as const,weight:60},{ticker:'AMD',platform:'bstock' as const,weight:40}];
 const marketResponse=await fetch(origin+'/api/sentinel/markets',{cache:'no-store'});
 if(!marketResponse.ok) throw Error('Inventory HTTP '+marketResponse.status);
 const inventory=(await marketResponse.json()) as {tokens:Equity[]};
 const planned=planRehearsal(basket,inventory.tokens,walletAddress,25,Date.now());
 if(!planned.ok)throw Error('Plan denied: '+planned.reason);
 const requests:string[]=[];
 const state=await rehearse(planned.value,async(leg,address,signal)=>{
  requests.push(leg.ticker);
  const timeout=AbortSignal.timeout(55000);
  const response=await fetch(origin+'/api/sentinel/simulate',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({ticker:leg.ticker,platform:leg.platform,amountUsd:leg.amountUsd,walletAddress:address}),
   cache:'no-store',signal:AbortSignal.any([signal,timeout])});
  return {ok:response.ok,status:response.status,body:await response.json()};
 },new AbortController().signal,()=>{});
 const rec=recoveryDecision(state,Date.now());
 const newPlan=planRehearsal(basket,inventory.tokens,walletAddress,25,Date.now(),state);
 console.log(JSON.stringify({source:origin,observedAt:new Date().toISOString(),
  walletCategory:'deliberately unfunded, unowned test address',
  inventoryContracts:inventory.tokens.length,basket:'NVDA bStocks 60% + AMD bStocks 40%',budgetUsd:25,
  requests,phase:state.phase,legs:state.legs.map(x=>({ticker:x.leg.ticker,platform:x.leg.platform,
   amountUsd:x.leg.amountUsd,phase:x.phase,reason:x.reason,simulator:x.receipt?.simulation.reportedStatus??null,
   quoteAmount:x.receipt?.quotedTokenAmount??null,route:x.receipt?.routeVendor??null,
   executed:x.receipt?.executed??false})),
  noSigning:state.noSigning,noOrders:state.noOrders,
  recoveryAction:rec.action,automaticRetry:rec.autoRetry,recoveryPlanAvailable:newPlan.ok,
  filledPurchaseConfirmed:false},null,2));
 if(state.phase==='PREDICTED_PASS')throw Error('Unexpected pass for default unfunded QA address; investigate provider evidence');
 if(requests.length!==1||state.legs[1]?.phase!=='NOT_ATTEMPTED')throw Error('STOP INVARIANT FAILED: subsequent leg attempted after first failure');
}
main().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});
