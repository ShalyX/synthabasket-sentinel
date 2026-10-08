import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { signPost, simulateEvmTx } from './bnb-transaction-sim.mjs';

const key='fake-api-key',secret='fake-secret',ts='2026-10-08T00:00:00.000Z';
const evmTx={from:'0x000000000000000000000000000000000000dEaD',to:'0x1111111111111111111111111111111111111111',value:'0',data:'0x1234'};
test('signs the byte-identical JSON POST body and /build prefix',()=>{
 const p={binanceChainId:'56',evmTx};
 const signed=signPost('/api/v1/dex/pre-transaction/simulate',p,key,secret,ts);
 const expected=createHmac('sha256',secret).update(ts+'POST/build/api/v1/dex/pre-transaction/simulate'+JSON.stringify(p)).digest('base64');
 assert.equal(signed.headers['X-OC-SIGN'],expected);
 assert.equal(signed.body,JSON.stringify(p));
 assert.equal(signed.url,'https://web3.binance.com/build/api/v1/dex/pre-transaction/simulate');
});
test('rejects sensitive send endpoint and invalid tx structures',async()=>{
 assert.throws(()=>signPost('/api/v1/dex/aggregator/order/submit',{},key,secret),/Only offline simulation/);
 await assert.rejects(simulateEvmTx({...evmTx,data:'nothex'}),/Invalid transaction data/);
 await assert.rejects(simulateEvmTx({...evmTx,from:'bad'}),/Invalid transaction from/);
});
test('surfaces a simulated execution failure without treating it as success',async()=>{
 const previous=[process.env.OC_API_KEY,process.env.OC_SECRET_KEY];
 process.env.OC_API_KEY=key;process.env.OC_SECRET_KEY=secret;
 const fetchFn=async (_url,opts)=>{
  assert.equal(opts.method,'POST');
  assert.deepEqual(JSON.parse(opts.body),{binanceChainId:'56',evmTx});
  return {ok:true,status:200,json:async()=>({code:0,success:true,data:{status:'FAILED',failReason:'execution reverted: BEP20: transfer amount exceeds allowance',balanceChanges:[],allowanceChanges:[]}})};
 };
 try{
  const simulation=await simulateEvmTx(evmTx,fetchFn);
  assert.equal(simulation.data.status,'FAILED');
  assert.match(simulation.data.failReason,/allowance/);
 }finally{
  if(previous[0]===undefined)delete process.env.OC_API_KEY;else process.env.OC_API_KEY=previous[0];
  if(previous[1]===undefined)delete process.env.OC_SECRET_KEY;else process.env.OC_SECRET_KEY=previous[1];
 }
});
