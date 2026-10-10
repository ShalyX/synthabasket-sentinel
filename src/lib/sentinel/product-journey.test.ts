import test from 'node:test';
import assert from 'node:assert/strict';
import {checkoutPlan,checkoutGate,quoteState,EXECUTION_HOLD_REASON} from './product-journey';
import type {Equity,QuotePreview} from './model';
const issuer=(ticker:string,platform:'bstock'|'ondo'='bstock',available=true):Equity=>({
 ticker,platform,symbol:ticker+'B',address:'0x'+ticker.charCodeAt(0).toString(16).padStart(40,'0'),
 company:ticker,logoUrl:null,tokenPrice:100,referencePrice:100,tokenToShareRatio:1,
 basisPct:0,decimals:18,tradingAvailable:available,marketSession:null
});
test('checkout preserves cents and matches selected issuers',()=>{
 const tokens=[issuer('NVDA'),issuer('MSFT'),issuer('AMD')];
 const basket=[{ticker:'NVDA',platform:'bstock' as const,weight:34},
 {ticker:'MSFT',platform:'bstock' as const,weight:33},{ticker:'AMD',platform:'bstock' as const,weight:33}];
 const plan=checkoutPlan(basket,tokens,10.01);
 assert.deepEqual(plan.issues,[]);
 assert.equal(plan.legs.reduce((sum,x)=>sum+Math.round(x.amountUsd*100),0),1001);
 assert.equal(plan.legs.length,3);
});
test('unavailable token and undersized legs block before checkout',()=>{
 const basket=[{ticker:'NVDA',platform:'bstock' as const,weight:5},
 {ticker:'MSFT',platform:'bstock' as const,weight:95}];
 assert.ok(checkoutPlan(basket,[issuer('NVDA'),issuer('MSFT')],10).issues.some(x=>x.includes('minimum')));
 assert.ok(checkoutPlan([{ticker:'AMD',platform:'ondo',weight:100}],[issuer('AMD','ondo',false)],10).issues.some(x=>x.includes('not currently')));
 assert.ok(checkoutPlan(basket,[issuer('NVDA')],10).issues.some(x=>x.includes('MSFT contract')));
});
test('fresh quote identity and price policy must match exact leg',()=>{
 const token=issuer('NVDA');
 const plan=checkoutPlan([{ticker:'NVDA',platform:'bstock',weight:100}],[token],10);
 const leg=plan.legs[0];
 const now=Date.now();
 const q:QuotePreview={ticker:'NVDA',platform:'bstock',address:token.address,amountUsd:10,tokenAmount:0.02,
 mode:'SWAP',vendor:'LiquidMesh',priceImpactPct:0.1,reportedFee:null,checkedAt:new Date(now).toISOString(),
 review:{status:'review',reasons:[]}};
 assert.equal(quoteState(leg,q,now),'REVIEWED');
 assert.equal(quoteState(leg,{...q,amountUsd:11},now),'MISMATCH');
 assert.equal(quoteState(leg,{...q,checkedAt:new Date(now-31000).toISOString()},now),'EXPIRED');
 assert.equal(quoteState(leg,{...q,review:{status:'blocked',reasons:['Impact']}},now),'FLAGGED');
});
test('no combination of wallet connection and quotes unlocks a browser signature',()=>{
 const asset=issuer('NVDA');
 const p=checkoutPlan([{ticker:'NVDA',platform:'bstock',weight:100}],[asset],10);
 const gate=checkoutGate(p,true,true,{},Date.now());
 assert.equal(gate.wallet,true);assert.equal(gate.canSubmit,false);
 assert.equal(gate.executionSafety,false);
 assert.match(gate.reason,/route/i);
 assert.match(EXECUTION_HOLD_REASON,/verification/i);
});
