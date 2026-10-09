import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TRUSTED_PREVIEW_MARKET_URL,validateFirstPartyInventory} from './read-only-inventory-relay';

const now=Date.parse('2026-10-09T12:00:00Z');
const stock={
 ticker:'NVDA',company:'Nvidia Corp',symbol:'NVDAB',platform:'bstock',
 address:'0x02fca66c1d1afb4e2a7884261eb00f63598a7436',
 decimals:18,logoUrl:null,tokenPrice:234.31,referencePrice:234.13,
 tokenToShareRatio:1.00077822375,basisPct:0,tradingAvailable:true,marketSession:null
};
const valid={asOf:new Date(now-2_000).toISOString(),tokens:[stock],count:1,tickers:1};
test('trusts only a compile-time owned production inventory URL with no dynamic target',()=>{
 assert.equal(TRUSTED_PREVIEW_MARKET_URL,'https://synthabasket-sentinel.vercel.app/api/sentinel/markets');
});
test('first-party read-only relay preserves source clock and issuer contracts',()=>{
 const r=validateFirstPartyInventory(valid,now);
 assert.equal(r.ok,true);
 if(r.ok){
  assert.equal(r.value.source,'first-party-production-readonly');
  assert.equal(r.value.asOf,valid.asOf);
  assert.equal(r.value.tokens[0].address,stock.address);
 }
});
test('rejects forged, stale, future, malformed and unsupported market inventories',()=>{
 const bad=[
  null,{}, {...valid,asOf:'nonsense'},
  {...valid,asOf:new Date(now-120_000).toISOString()},
  {...valid,asOf:new Date(now+60_000).toISOString()},
  {...valid,count:2},
  {...valid,tickers:3},
  {...valid,tokens:[]},
  {...valid,tokens:[{...stock,platform:'fake'}]},
  {...valid,tokens:[{...stock,address:'not a contract'}]},
  {...valid,tokens:[{...stock,tokenPrice:Infinity}]},
  {...valid,tokens:[{...stock,tokenPrice:'999'}]},
  {...valid,tokens:[{...stock,decimals:100}]}
 ];
 for(const data of bad){
  const result=validateFirstPartyInventory(data,now);
  assert.equal(result.ok,false,JSON.stringify(data));
 }
});
