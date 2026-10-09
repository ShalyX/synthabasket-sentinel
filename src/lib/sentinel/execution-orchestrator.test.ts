import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planRehearsal,rehearse,expireRehearsal,recoveryDecision,validatePreflight} from './execution-orchestrator';
import type {BasketLeg} from './basket';
import type {Equity} from './model';
const address='0x1111111111111111111111111111111111111111';
const a='0x2222222222222222222222222222222222222222';
const b='0x3333333333333333333333333333333333333333';
const now=Date.parse('2026-10-09T12:00:00Z');
const basket:BasketLeg[]=[{ticker:'NVDA',platform:'bstock',weight:60},{ticker:'AMD',platform:'ondo',weight:40}];
const token=(ticker:string,platform:'bstock'|'ondo',contract:string):Equity=>({
 ticker,platform,address:contract,company:ticker,symbol:ticker,decimals:18,logoUrl:null,
 tokenPrice:100,referencePrice:100,tokenToShareRatio:1,basisPct:0,tradingAvailable:true,marketSession:null
});
const inventory=[token('NVDA','bstock',a),token('AMD','ondo',b)];
const make=(previous?:ReturnType<typeof planRehearsal>)=>{
 const p=planRehearsal(basket,inventory,address,25,now,previous?.ok?previous.value:undefined);
 assert.equal(p.ok,true);
 if(!p.ok)throw Error(p.reason);
 return p.value;
};
const proof=(leg:ReturnType<typeof make>['legs'][number]['leg'],status:'PASS'|'BLOCKED'|'UNKNOWN'='PASS')=>({
 kind:'sentinel.bsc.sandbox-preflight',chainId:56,ticker:leg.ticker,platform:leg.platform,
 tokenContract:leg.tokenContract,amountUsd:leg.amountUsd,
 symbol:leg.ticker,quotedTokenAmount:0.25,normalizedShareUnits:0.25,routeMode:'SWAP',
 routeVendor:'LiquidMesh',priceImpactPct:0,maxSlippagePercent:0.5,gasLimit:'200000',
 approvalTarget:a,builtTransaction:{present:true,dataBytes:200,nonzeroNativeValue:false},
 inspectedAt:new Date(now+1_000).toISOString(),expiresAt:new Date(now+20_000).toISOString(),
 state:status==='PASS'?'SIMULATION_PASSED':'NOT_READY',
 simulation:{status,reportedStatus:status==='PASS'?'SUCCESS':'FAILED',reason:status==='PASS'?null:'Insufficient USDT balance',balanceChangeCount:0,allowanceChangeCount:0,unexpectedApprovalIncrease:false},
 executed:false,tradeAuthorized:false,signatureRequested:false,approvalsRequested:false,broadcastRequested:false
});
test('exact basket weights, contracts, budget and wallet are frozen in each plan',()=>{
 const p=make();assert.equal(p.legs.length,2);assert.equal(p.legs[0].leg.amountUsd,15);
 assert.equal(p.legs[1].leg.amountUsd,10);assert.equal(p.phase,'PLANNED');assert.equal(p.noSigning,true);
 for(const invalid of [
  planRehearsal(basket,inventory,'garbage',25,now),
  planRehearsal(basket,inventory,address,100,now),
  planRehearsal(basket,inventory,address,1,now),
  planRehearsal([{...basket[0],weight:55},basket[1]],inventory,address,25,now),
  planRehearsal([basket[0],basket[0]],inventory,address,25,now),
  planRehearsal(basket,[inventory[0]],address,25,now)
 ])assert.equal(invalid.ok,false);
});
test('honest batch: stops on first failing simulation and leaves later legs NOT_ATTEMPTED',async()=>{
 const plan=make();let calls=0,seen=0;
 const result=await rehearse(plan,async leg=>{calls++;return {ok:true,status:200,body:proof(leg,'BLOCKED')};},
  new AbortController().signal,()=>{seen++;},()=>now+3_000);
 assert.equal(result.phase,'BLOCKED');assert.equal(calls,1);assert.ok(seen>=3);
 assert.equal(result.legs[0].phase,'BLOCKED');assert.equal(result.legs[1].phase,'NOT_ATTEMPTED');
 assert.equal(result.legs[0].receipt?.executed,false);
 assert.equal(recoveryDecision(result,now+4_000).action,'REHEARSE_ALL_FRESH');
});
test('successful rehearsal is only a prediction and expires on the quote boundary',async()=>{
 const plan=make();let calls=0;
 const result=await rehearse(plan,async leg=>{calls++;return {ok:true,status:200,body:proof(leg)};},
  new AbortController().signal,()=>{},()=>now+3_000);
 assert.equal(calls,2);assert.equal(result.phase,'PREDICTED_PASS');
 assert.equal(expireRehearsal(result,now+21_000).phase,'EXPIRED');
 assert.equal(recoveryDecision(result,now+21_000).autoRetry,false);
 assert.equal(recoveryDecision(result,now+21_000).canBroadcast,false);
});
test('unavailable and timeout do not silently retry, skip, or become an assumed PASS',async()=>{
 const plan=make();
 const unavailable=await rehearse(plan,async()=>({ok:false,status:503,body:{error:'Gateway offline'}}),
  new AbortController().signal,()=>{},()=>now+2_000);
 assert.equal(unavailable.phase,'UNAVAILABLE');
 assert.equal(unavailable.legs[1].phase,'NOT_ATTEMPTED');
 let count=0;
 const timeout=await rehearse(plan,async()=>{count++;throw Error('network');},
  new AbortController().signal,()=>{},()=>now+2_000);
 assert.equal(count,1);assert.equal(timeout.phase,'UNAVAILABLE');
});
test('never accept mismatched, forged or executable upstream responses',()=>{
 const leg=make().legs[0].leg;
 for(const altered of [
  {ticker:'AMD'},{platform:'ondo'},{tokenContract:b},{amountUsd:10},
  {chainId:1},{executed:true},{signatureRequested:true},{tradeAuthorized:true},
  {approvalsRequested:true},{broadcastRequested:true},
  {simulation:{status:'PASS',reason:null},state:'NOT_READY'}
 ]){
  const malformed={...proof(leg),...altered};
  assert.equal(validatePreflight(malformed,leg,now+2_000).ok,false,JSON.stringify(altered));
 }
});
test('aborting or changing wallet session interrupts the run without advancing later legs',async()=>{
 const plan=make();const ctrl=new AbortController();let calls=0;
 const run=await rehearse(plan,async leg=>{calls++;ctrl.abort();return {ok:true,status:200,body:proof(leg)};},
  ctrl.signal,()=>{},()=>now+2_000);
 assert.equal(run.phase,'INTERRUPTED');assert.equal(calls,1);
 assert.equal(run.legs[1].phase,'NOT_ATTEMPTED');
 const run2=await rehearse(make(),async leg=>({ok:true,status:200,body:proof(leg)}),
  new AbortController().signal,()=>{},()=>now+2_000,()=>false);
 assert.equal(run2.phase,'INTERRUPTED');
});
test('manual full-basket re-quote is bounded; no automatic retries or plan mutations',()=>{
 const first=make();
 const second=planRehearsal(basket,inventory,address,25,now+1_000,first);
 assert.equal(second.ok,true);if(!second.ok)return;
 assert.equal(second.value.attempt,2);
 const changed=planRehearsal(basket,inventory,'0x4444444444444444444444444444444444444444',25,now+1_000,first);
 assert.equal(changed.ok,false);
 const third=planRehearsal(basket,inventory,address,25,now+2_000,second.value);
 assert.equal(third.ok,true);if(!third.ok)return;
 assert.equal(third.value.attempt,3);
 const fourth=planRehearsal(basket,inventory,address,25,now+3_000,third.value);
 assert.equal(fourth.ok,false);
});
