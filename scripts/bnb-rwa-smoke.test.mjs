import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { signGet, readBinance } from './binance-web3-sign.mjs';
const apiKey='fake-key', secret='fake-secret', timestamp='2026-10-08T00:00:00.000Z';

test('signs the exact wire URL including /build and encoded query', () => {
  const q=signGet('/api/v1/dex/market/rwa/search',{keyword:'NVDA Inc'},apiKey,secret,timestamp);
  const path='/build/api/v1/dex/market/rwa/search?keyword=NVDA%20Inc';
  assert.equal(q.url,'https://web3.binance.com'+path);
  assert.equal(q.headers['X-OC-SIGN'],createHmac('sha256',secret).update(timestamp+'GET'+path).digest('base64'));
});
test('fails closed with absent credentials or invalid path', () => {
  assert.throws(()=>signGet('/api/v1/a',{},'',secret),/Missing/);
  assert.throws(()=>signGet('/evil',{},apiKey,secret),/Invalid/);
});
test('handles nonzero API business status without treating HTTP 200 as success', async () => {
  const fn=async()=>({ok:true,status:200,json:async()=>({code:40102,success:false,msg:'Invalid signature'})});
  const oldKey=process.env.OC_API_KEY, oldSecret=process.env.OC_SECRET_KEY;
  process.env.OC_API_KEY=apiKey; process.env.OC_SECRET_KEY=secret;
  try {
    await assert.rejects(readBinance('/api/v1/dex/market/rwa/tokens',{},fn),/40102/);
  } finally {
    if (oldKey === undefined) delete process.env.OC_API_KEY; else process.env.OC_API_KEY=oldKey;
    if (oldSecret === undefined) delete process.env.OC_SECRET_KEY; else process.env.OC_SECRET_KEY=oldSecret;
  }
});
