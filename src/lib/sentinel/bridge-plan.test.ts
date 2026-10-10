import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBridgePlan} from './bridge-plan';
import type {Equity} from './model';
const t=(ticker:string,address:string,platform:'bstock'|'ondo'='bstock'):Equity=>({
 ticker,platform,address,symbol:ticker+'B',company:ticker,decimals:18,logoUrl:null,
 tokenPrice:100,referencePrice:100,tokenToShareRatio:1,basisPct:0,tradingAvailable:true,marketSession:null
});
const nvda=t('NVDA','0x'+'a'.repeat(40));
const amd=t('AMD','0x'+'b'.repeat(40));
const msft=t('MSFT','0x'+'c'.repeat(40));
test('execution plan binds issuer contracts and exactly conserves cents',()=>{
 const basket=[{ticker:'NVDA',platform:'bstock' as const,weight:34},
  {ticker:'AMD',platform:'bstock' as const,weight:33},
  {ticker:'MSFT',platform:'bstock' as const,weight:33}];
 const result=buildBridgePlan(basket,[nvda,amd,msft],10.01);
 assert.equal(result.ok,true);
 if(!result.ok)return;
 assert.equal(result.value.legs.length,3);
 assert.equal(result.value.legs.reduce((a,x)=>a+Math.round(x.amountUsd*100),0),1001);
 assert.equal(result.value.legs[0].address,nvda.address);
});
test('rejects issuer provider other than bStocks, too small leg, oversized total and closed issuer',()=>{
 assert.equal(buildBridgePlan([{ticker:'NVDA',platform:'ondo',weight:100}],[t('NVDA',nvda.address,'ondo')],10).ok,false);
 assert.equal(buildBridgePlan([{ticker:'NVDA',platform:'bstock',weight:5},{ticker:'AMD',platform:'bstock',weight:95}],[nvda,amd],10).ok,false);
 assert.equal(buildBridgePlan([{ticker:'NVDA',platform:'bstock',weight:100}],[nvda],25.01).ok,false);
 assert.equal(buildBridgePlan([{ticker:'NVDA',platform:'bstock',weight:100}],[{...nvda,tradingAvailable:false}],10).ok,false);
});
