import { createHmac } from 'node:crypto';

export function signGet(path, query = {}, apiKey = process.env.OC_API_KEY, secretKey = process.env.OC_SECRET_KEY, timestamp = new Date().toISOString()) {
  if (!apiKey || !secretKey) throw new Error('Missing OC_API_KEY or OC_SECRET_KEY in .env.local');
  if (!/^\/api\/v1\/[a-z0-9/-]+$/i.test(path)) throw new Error('Invalid API pathname');
  const params = Object.entries(query).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
  const requestPath = `/build${path}${params ? '?' + params : ''}`;
  const signature = createHmac('sha256', secretKey).update(`${timestamp}GET${requestPath}`).digest('base64');
  return {
    url: `https://web3.binance.com${requestPath}`,
    headers: { 'X-OC-APIKEY': apiKey, 'X-OC-TIMESTAMP': timestamp, 'X-OC-SIGN': signature, Accept: 'application/json' },
  };
}

export async function readBinance(path, query = {}, fetchFn = fetch) {
  const { url, headers } = signGet(path, query);
  const started = performance.now();
  const response = await fetchFn(url, { method: 'GET', headers, redirect: 'error', signal: AbortSignal.timeout(12000) });
  const elapsedMs = Math.round(performance.now() - started);
  let json;
  try { json = await response.json(); } catch { throw new Error(`${path}: HTTP ${response.status}, non-JSON response (${elapsedMs}ms)`); }
  if (!response.ok || json?.success === false || (json?.code !== undefined && json.code !== 0)) {
    throw new Error(`${path}: HTTP ${response.status}, API code ${json?.code ?? 'n/a'}, ${String(json?.msg ?? 'unknown').slice(0,120)} (${elapsedMs}ms)`);
  }
  return { data: json?.data, elapsedMs };
}
