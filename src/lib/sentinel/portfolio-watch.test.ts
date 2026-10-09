import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessPortfolioDrift,parseWatchRequest,type PortfolioObservation} from './portfolio-watch';
import type {BasketLeg} from './basket';

const wallet='0x1111111111111111111111111111111111111111';
const tokenA='0x2222222222222222222222222222222222222222';
const tokenB='0x3333333333333333333333333333333333333333';
const now=Date.parse('2026-10-09T09:00:00Z');
const basket:BasketLeg[]=[{ticker:'NVDA',platform:'bstock',weight:60},{ticker:'AMD',platform:'ondo',weight:40}];
const observed=(a:string,b:string):PortfolioObservation=>({
 kind:'sentinel.bsc.portfolio-observation',chainId:56,walletAddress:wallet,
 blockNumber:'50000000',observedAt:new Date(now-2500).toISOString(),
 marketAsOf:new Date(now-18000).toISOString(),readOnly:true,
 signaturesRequested:false,ordersSubmitted:false,hasMissingBalances:false,
 legs:[
  {ticker:'NVDA',platform:'bstock',symbol:'NVDAB',contract:tokenA,decimals:18,
   balanceRaw:a,tokenPriceUsd:100,status:'OBSERVED'},
  {ticker:'AMD',platform:'ondo',symbol:'AMDon',contract:tokenB,decimals:18,
   balanceRaw:b,tokenPriceUsd:100,status:'OBSERVED'}
 ]
});
test('watch API accepts only bounded, unique BSC issuer selections',()=>{
 const payload={walletAddress:wallet,legs:[{ticker:'NVDA',platform:'bstock'},{ticker:'AMD',platform:'ondo'}]};
 assert.equal(parseWatchRequest(payload).ok,true);
 for(const malformed of [
  {...payload,legs:[payload.legs[0],payload.legs[0]]},
  {...payload,legs:[]},
  {...payload,legs:Array(5).fill(payload.legs[0])},
  {...payload,legs:[{ticker:'NVDA',platform:'random'}]},
  {...payload,hiddenSignature:'steal'},
  {...payload,walletAddress:'0x0'},
  {...payload,legs:[{ticker:'NVDA',platform:'bstock',contract:tokenA}]}
 ]) assert.equal(parseWatchRequest(malformed).ok,false);
});
test('computes actual allocation from observed token balances and price marks, not target weight',()=>{
 const o=observed('9000000000000000000','1000000000000000000');
 const result=assessPortfolioDrift(basket,o,5,now);
 assert.equal(result.status,'DRIFT_DETECTED');
 assert.equal(result.totalValueUsd,1000);
 assert.equal(result.legs[0].actualPct,90);
 assert.equal(result.legs[0].deltaPct,30);
 assert.equal(result.legs[0].suggestedDirection,'REDUCE');
 assert.equal(result.legs[0].indicativeValueUsd,300);
 assert.equal(result.legs[1].suggestedDirection,'INCREASE');
 assert.equal(result.legs[1].indicativeValueUsd,300);
 assert.equal(result.noExecution,true);
});
test('band boundary is strict and does not fabricate a trade inside threshold',()=>{
 const o=observed('6500000000000000000','3500000000000000000');
 assert.equal(assessPortfolioDrift(basket,o,5,now).status,'WITHIN_BAND');
 assert.equal(assessPortfolioDrift(basket,o,2,now).status,'DRIFT_DETECTED');
});
test('zero holdings never trigger a fake allocation, buys or historical execution',()=>{
 const result=assessPortfolioDrift(basket,observed('0','0'),5,now);
 assert.equal(result.status,'EMPTY');
 assert.equal(result.totalValueUsd,0);
 assert.deepEqual(result.legs,[]);
});
test('no price or failed RPC must produce unknown, not an invented zero balance',()=>{
 const price=observed('1000000000000000000','1000000000000000000');
 price.legs[1].tokenPriceUsd=null;
 assert.equal(assessPortfolioDrift(basket,price,5,now).status,'UNPRICED');
 const failed=observed('1000000000000000000','1000000000000000000');
 failed.legs[0].balanceRaw=null;failed.legs[0].status='UNAVAILABLE';
 assert.equal(assessPortfolioDrift(basket,failed,5,now).status,'UNPRICED');
 const missing=observed('1000000000000000000','1000000000000000000');
 missing.legs.pop();
 assert.equal(assessPortfolioDrift(basket,missing,5,now).status,'UNPRICED');
});
test('historical chain or market data cannot be advertised as live drift',()=>{
 const stale=observed('9000000000000000000','1000000000000000000');
 stale.observedAt=new Date(now-120_000).toISOString();
 assert.equal(assessPortfolioDrift(basket,stale,5,now).status,'STALE');
 const staleMark=observed('9000000000000000000','1000000000000000000');
 staleMark.marketAsOf=new Date(now-120_000).toISOString();
 assert.equal(assessPortfolioDrift(basket,staleMark,5,now).status,'STALE');
 assert.equal(assessPortfolioDrift(basket,observed('0','0'),5,now+120_000).status,'STALE');
});
test('cannot evaluate a different selected basket or broken threshold',()=>{
 const o=observed('9000000000000000000','1000000000000000000');
 assert.equal(assessPortfolioDrift([{...basket[0],weight:60}],o,5,now).status,'UNPRICED');
 assert.equal(assessPortfolioDrift(basket,o,100,now).status,'UNPRICED');
 assert.equal(assessPortfolioDrift(basket,null,5,now).status,'NEEDS_WALLET');
});
