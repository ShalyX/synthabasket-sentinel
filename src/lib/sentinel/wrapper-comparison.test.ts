import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compareWrapperQuotes} from './wrapper-comparison';
import type {Equity,QuotePreview,Platform} from './model';

const now=Date.parse('2026-10-08T14:30:00.000Z');
const bstock:Equity={
 platform:'bstock',ticker:'NVDA',symbol:'NVDAB',company:'NVIDIA',address:'0x'+'a'.repeat(40),
 decimals:18,logoUrl:null,tokenPrice:236.8442,referencePrice:236.66,
 tokenToShareRatio:1.000778,basisPct:0,tradingAvailable:true,marketSession:null
};
const ondo:Equity={...bstock,platform:'ondo',symbol:'NVDAon',address:'0x'+'b'.repeat(40),
 tokenPrice:237.3572,referencePrice:236.9507,tokenToShareRatio:1.001715};
const quote=(platform:Platform,amount:number,checkedAt=new Date(now-11000).toISOString()):QuotePreview=>({
 ticker:'NVDA',platform,address:platform==='ondo'?ondo.address:bstock.address,amountUsd:10,
 tokenAmount:amount,mode:'SWAP',vendor:'LiquidMesh',priceImpactPct:0,reportedFee:null,checkedAt,
 review:{status:'review',reasons:[]}
});
const pair={bstock:quote('bstock',0.04223466),ondo:quote('ondo',0.04220982)};
const near=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-10,
 String(actual)+' should be close to '+String(expected));

test('live observed $10 NVDA issuer quotes normalize to share-equivalent exposure',()=>{
 const result=compareWrapperQuotes([ondo,bstock],pair,now);
 assert.equal(result.status,'ready');
 assert.equal(result.budgetUsd,10);
 assert.equal(result.leader,'ondo');
 near(result.rows[0].shareEquivalent!,0.04226751856548);
 near(result.rows[1].shareEquivalent!,0.0422822098413);
 near(result.gapInShareUnits!,0.00001469127582);
 assert.ok(Math.abs(result.leadPct!-0.03475783845)<1e-6);
 assert.equal(result.expiresInSeconds,19);
 assert.equal(result.policyFlagged,false);
 assert.deepEqual(result.rows.map(r=>r.symbol),['NVDAB','NVDAon']);
});

test('raw token quantity leader can differ from share exposure leader',()=>{
 const normalized=compareWrapperQuotes([bstock,ondo],pair,now);
 assert.ok(normalized.rows[0].quote!.tokenAmount>normalized.rows[1].quote!.tokenAmount);
 assert.ok(normalized.rows[0].shareEquivalent!<normalized.rows[1].shareEquivalent!);
});

test('cannot compare quotes with different sizes, tickers, contracts or provider',()=>{
 assert.equal(compareWrapperQuotes([bstock,ondo],{...pair,ondo:{...pair.ondo,amountUsd:20}},now).status,'mismatch');
 assert.equal(compareWrapperQuotes([bstock,ondo],{...pair,bstock:{...pair.bstock,ticker:'TSLA'}},now).status,'mismatch');
 assert.equal(compareWrapperQuotes([bstock,ondo],{...pair,bstock:{...pair.bstock,address:'0x'+'c'.repeat(40)}},now).status,'mismatch');
 assert.equal(compareWrapperQuotes([bstock,ondo],{...pair,ondo:{...pair.ondo,platform:'bstock'}},now).status,'mismatch');
 assert.equal(compareWrapperQuotes([bstock,{...ondo,ticker:'TSLA'}],pair,now).status,'mismatch');
 assert.equal(compareWrapperQuotes([bstock],pair,now).status,'mismatch');
});

test('no fake comparison is made when one quote is missing or either has expired',()=>{
 const one=compareWrapperQuotes([bstock,ondo],{bstock:pair.bstock},now);
 assert.equal(one.status,'awaiting-quotes');
 near(one.rows[0].shareEquivalent!,0.04226751856548);
 assert.equal(one.rows[1].shareEquivalent,null);
 assert.equal(one.leader,null);
 const old=compareWrapperQuotes([bstock,ondo],pair,now+30001);
 assert.equal(old.status,'expired');
 assert.equal(old.leader,null);
 assert.equal(old.gapInShareUnits,null);
 assert.ok(old.rows.every(row=>row.shareEquivalent===null));
 assert.equal(compareWrapperQuotes([bstock,ondo],pair,now-12000).status,'expired');
});

test('missing, zero or invalid conversion ratios never produce exposure values',()=>{
 for(const missing of [null,0,-1,Number.POSITIVE_INFINITY,Number.NaN]){
  const comparison=compareWrapperQuotes([bstock,{...ondo,tokenToShareRatio:missing}],pair,now);
  assert.equal(comparison.status,'ratio-unavailable');
  assert.equal(comparison.rows[1].shareEquivalent,null);
  assert.equal(comparison.leadPct,null);
 }
 assert.equal(compareWrapperQuotes([bstock,ondo],{...pair,ondo:{...pair.ondo,tokenAmount:0}},now).status,'mismatch');
 assert.equal(compareWrapperQuotes([bstock,ondo],{...pair,ondo:{...pair.ondo,tokenAmount:Number.NaN}},now).status,'mismatch');
});

test('equivalent share exposure yields no artificial winner',()=>{
 const b=quote('bstock',0.05);
 const o=quote('ondo',0.05*bstock.tokenToShareRatio!/ondo.tokenToShareRatio!);
 const result=compareWrapperQuotes([bstock,ondo],{bstock:b,ondo:o},now);
 assert.equal(result.status,'ready');
 assert.equal(result.leader,null);
 assert.equal(result.leadPct,0);
});

test('policy-blocked quotes do not become an execution endorsement',()=>{
 const blocked={...pair,ondo:{...pair.ondo,review:{status:'blocked' as const,reasons:['Reference-adjusted basis exceeds threshold.']}}};
 const result=compareWrapperQuotes([bstock,ondo],blocked,now);
 assert.equal(result.status,'ready');
 assert.equal(result.policyFlagged,true);
});
