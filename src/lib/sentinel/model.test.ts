import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEquity,tokenUnits} from './model';
const fixture={binanceChainId:'56',platformId:'bstock',tokenContractAddress:'0x02fca66c1d1afb4e2a7884261eb00f63598a7436',
 underlyingTicker:'NVDA',underlyingName:'NVIDIA',tokenSymbol:'NVDAB',decimals:'18',
 tokenPrice:'238.18521725316827187',referencePrice:'238',tokenToShareRatio:'1.000778223752807865',
 statusInfo:{openState:true,marketStatus:null}};
test('normalizes observed BSC token and adjusts basis for share conversion',()=>{
 const t=normalizeEquity(fixture);
 assert.ok(t);
 assert.equal(t.platform,'bstock');
 assert.equal(t.tradingAvailable,true);
 assert.ok(Math.abs(t.basisPct??99)<0.002);
});
test('does not manufacture basis when source ratio or reference is missing',()=>{
 const t=normalizeEquity({...fixture,tokenToShareRatio:null});
 assert.ok(t);
 assert.equal(t.basisPct,null);
});
test('rejects other chains and malformed contract addresses',()=>{
 assert.equal(normalizeEquity({...fixture,binanceChainId:'1'}),null);
 assert.equal(normalizeEquity({...fixture,tokenContractAddress:'0xbad'}),null);
});
test('preserves ERC20 18 decimal precision',()=>{
 assert.equal(tokenUnits('42018388324103816',18),0.042018388324103816);
 assert.equal(tokenUnits('garbage',18),null);
});
