import {test} from 'node:test';
import assert from 'node:assert/strict';
import {amountFor,changeWeight,evenly,normalizeBasket,removeLeg,upsert} from './basket';
import type {Equity} from './model';
const asset=(ticker:string,platform:'ondo'|'bstock'='ondo'):Equity=>({
 ticker,platform,address:'0x1111111111111111111111111111111111111111',
 company:ticker,symbol:ticker,logoUrl:null,decimals:18,tokenPrice:1,
 referencePrice:1,tokenToShareRatio:1,basisPct:0,tradingAvailable:true,marketSession:null
});
test('allocations always total 100 and preserve exact edited percentages',()=>{
 const initial=evenly(['NVDA','MSFT','AAPL','AMD'].map(t=>({ticker:t,platform:'ondo' as const})));
 assert.equal(initial.reduce((x,y)=>x+y.weight,0),100);
 const moved=changeWeight(initial,0,65);
 assert.equal(moved.reduce((x,y)=>x+y.weight,0),100);
 assert.equal(moved[0].weight,65);
 assert.ok(moved.slice(1).every(x=>x.weight>=5));
 const persisted=normalizeBasket(moved);
 assert.deepEqual(persisted,moved);
});
test('removing a leg rebalances without changing the tickers of remaining assets',()=>{
 const initial=evenly(['NVDA','MSFT','AAPL'].map(t=>({ticker:t,platform:'ondo' as const})));
 const remaining=removeLeg(initial,'MSFT');
 assert.deepEqual(remaining.map(x=>x.ticker),['NVDA','AAPL']);
 assert.equal(remaining.reduce((sum,x)=>sum+x.weight,0),100);
});
test('issuer switch changes one ticker instead of adding a duplicate stock',()=>{
 const x=upsert([],asset('NVDA'));
 const y=upsert(x,asset('NVDA','bstock'));
 assert.equal(y.length,1);
 assert.equal(y[0].platform,'bstock');
});
test('never saves invalid or duplicated basket weights',()=>{
 assert.deepEqual(normalizeBasket([{ticker:'NVDA',platform:'ondo',weight:80},{ticker:'NVDA',platform:'bstock',weight:20}]),[]);
 assert.deepEqual(normalizeBasket([{ticker:'NVDA',platform:'ondo',weight:NaN}]),[]);
 assert.equal(normalizeBasket([{ticker:'NVDA',platform:'ondo',weight:88}])[0].weight,100);
});
test('budget is split in exact currency cents',()=>{
 const legs=evenly([{ticker:'NVDA',platform:'ondo'},{ticker:'MSFT',platform:'bstock'},{ticker:'AMD',platform:'bstock'}]);
 assert.equal(legs.reduce((a,l)=>a+amountFor(50,l),0),50);
});
