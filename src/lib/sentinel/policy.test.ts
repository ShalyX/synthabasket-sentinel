import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEquity} from './model';
import {assessPreview,previewIsFresh} from './policy';
const sample=normalizeEquity({binanceChainId:'56',platformId:'ondo',underlyingTicker:'NVDA',tokenSymbol:'NVDAon',underlyingName:'Nvidia Corp',
 tokenContractAddress:'0xa9ee28c80f960b889dfbd1902055218cba016f75',decimals:'18',tokenPrice:'100',referencePrice:'100',
 tokenToShareRatio:'1',statusInfo:{openState:true}})!;
test('review flag is not execution authorization',()=>{
 const check=assessPreview(sample,10,0.5,new Date().toISOString());
 assert.equal(check.status,'review');
 assert.deepEqual(check.reasons,[]);
});
test('fails closed when status, basis or liquidity is unavailable',()=>{
 const t={...sample,tradingAvailable:null,basisPct:null};
 const check=assessPreview(t,10,null,new Date().toISOString());
 assert.equal(check.status,'blocked');
 assert.equal(check.reasons.length,3);
});
test('blocks excessive divergence and high price impact',()=>{
 const check=assessPreview({...sample,basisPct:3},10,3,new Date().toISOString());
 assert.equal(check.status,'blocked');
 assert.equal(check.reasons.length,2);
});
test('never treats expired quote as current',()=>{
 const checkedAt=new Date(Date.now()-40000).toISOString();
 const check=assessPreview(sample,10,0.1,checkedAt);
 assert.equal(check.status,'blocked');
 const q={ticker:'NVDA',platform:'ondo' as const,address:sample.address,amountUsd:10,tokenAmount:0.1,vendor:'LiquidMesh',mode:'SWAP' as const,
 priceImpactPct:0.1,reportedFee:null,checkedAt,review:check};
 assert.equal(previewIsFresh(q,Date.now()),false);
});
