#!/usr/bin/env node
// Read-only Binance Web3 RWA API smoke test. No quotes, signatures of transactions, orders, or broadcasts.
import { readBinance } from './binance-web3-sign.mjs';

const results = [];
async function probe(label, path, query = {}) {
  try {
    const response = await readBinance(path, query);
    results.push({ label, ok: true, elapsedMs: response.elapsedMs });
    console.log(`PASS ${label}: ${response.elapsedMs}ms`);
    return response.data;
  } catch (error) {
    results.push({ label, ok: false, error: error.message });
    console.error(`FAIL ${label}: ${error.message}`);
    return null;
  }
}

if (!process.env.OC_API_KEY || !process.env.OC_SECRET_KEY) {
  console.error('Add OC_API_KEY and OC_SECRET_KEY to your untracked .env.local. Never paste credentials into chat.');
  process.exitCode = 2;
} else {
  console.log('BSC RWA read-only probe', new Date().toISOString());
  const platforms = await probe('RWA platforms', '/api/v1/dex/market/rwa/platforms');
  if (Array.isArray(platforms)) console.log('Platforms:', platforms.map(p => p.platformId));
  const data = await probe('BSC equities', '/api/v1/dex/market/rwa/tokens', { binanceChainId: '56' });
  const tokens = Array.isArray(data) ? data.filter(t => String(t.binanceChainId) === '56') : [];
  console.log('BSC assets found:', tokens.length);
  console.log('Sample live assets:', tokens.slice(0,5).map(t => ({ symbol:t.tokenSymbol, ticker:t.underlyingTicker, platform:t.platformId, contract:t.tokenContractAddress, onChainPrice:t.tokenPrice, referencePrice:t.referencePrice, marketStatus:t.statusInfo?.marketStatus })));
  const search = await probe('NVDA search', '/api/v1/dex/market/rwa/search', { keyword: 'NVDA' });
  console.log('Search results:', Array.isArray(search) ? search.map(t => t.ticker) : []);
  const first = tokens.find(t => typeof t.tokenContractAddress === 'string');
  if (first) {
    const p = await probe('On-chain versus reference price', '/api/v1/dex/market/rwa/price', { binanceChainId: '56', tokenContractAddresses: first.tokenContractAddress });
    if (Array.isArray(p)) console.log('Price response:', p.slice(0,1));
  } else console.log('Price comparison skipped: no verified BSC contract from API.');
  console.log('Evidence summary:', JSON.stringify({ timestamp:new Date().toISOString(), checks:results }, null, 2));
  console.log('READ ONLY: no BSC transaction or executable quote has been attempted.');
  if (!tokens.length || results.some(x => !x.ok)) process.exitCode = 1;
}
