import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeCliQuote,KIND} from './agentic-wallet-quote-handoff.mjs';

const token='0x02fca66c1d1afb4e2a7884261eb00f63598a7436';
const options={ticker:'NVDA',platform:'bstock',token,symbol:'NVDAB',amount:'10'};
const raw={success:true,data:{
 fromCoinSymbol:'USDT',fromCoinAmount:'10',toCoinSymbol:'NVDAB',
 toCoinAmount:'0.042415280000000003',
 quoteId:'secret-quote-id',walletAddress:'secret-wallet',
 sessionToken:'secret-session',transaction:'secret-transaction'
}};
test('CLI output sanitizer is schema-restrictive and strips all private fields',()=>{
 const result=sanitizeCliQuote(raw,options,new Date('2026-10-08T13:00:00.000Z'));
 assert.equal(result.kind,KIND);
 assert.equal(result.outputTokenAmount,'0.042415280000000003');
 assert.equal(result.targetToken,token);
 assert.deepEqual(result.permissions,{mayTrade:false,maySign:false,mayApprove:false});
 for(const secret of ['secret-quote-id','secret-wallet','secret-session','secret-transaction'])
  assert.ok(!JSON.stringify(result).includes(secret));
});
test('no failed or mismatched CLI response can be presented as valid local evidence',()=>{
 for(const response of [
  {success:false,data:raw.data},
  {success:true,data:{...raw.data,toCoinSymbol:'TSLAB'}},
  {success:true,data:{...raw.data,fromCoinSymbol:'ETH'}},
  {success:true,data:{...raw.data,fromCoinAmount:'9'}},
  {success:true,data:{...raw.data,toCoinAmount:'0'}},
  {success:true,data:{...raw.data,toCoinAmount:'Infinity'}}
 ])assert.throws(()=>sanitizeCliQuote(response,options),/Quote|quote|Invalid|match/);
 for(const bad of [
  {...options,token:token+' & calc'},
  {...options,amount:'100'},
  {...options,platform:'unknown'},
  {...options,symbol:'NVDAB;rm'}
 ])assert.throws(()=>sanitizeCliQuote(raw,bad));
});
