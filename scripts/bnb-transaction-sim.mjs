import { createHmac } from 'node:crypto';

// Exact RFC-8259 JSON serialization is used for both signing and the transmitted body.
export function signPost(path, payload, apiKey=process.env.OC_API_KEY, secretKey=process.env.OC_SECRET_KEY, timestamp=new Date().toISOString()) {
 if (!apiKey || !secretKey) throw new Error('Missing API credentials.');
 if (path !== '/api/v1/dex/pre-transaction/simulate') throw new Error('Only offline simulation endpoint is allowed.');
 const body=JSON.stringify(payload);
 const requestPath='/build'+path;
 const signature=createHmac('sha256',secretKey).update(timestamp+'POST'+requestPath+body).digest('base64');
 return {url:'https://web3.binance.com'+requestPath,body,headers:{'X-OC-APIKEY':apiKey,'X-OC-TIMESTAMP':timestamp,'X-OC-SIGN':signature,'Content-Type':'application/json',Accept:'application/json'}};
}

export async function simulateEvmTx(evmTx, fetchFn=fetch) {
 const checked=['from','to'];
 for(const name of checked) if(!/^0x[0-9a-f]{40}$/i.test(evmTx?.[name]||'')) throw new Error('Invalid transaction '+name);
 if(!/^0x(?:[0-9a-f]{2})*$/i.test(evmTx?.data||'')) throw new Error('Invalid transaction data');
 if(!/^(0|[1-9][0-9]*)$/.test(String(evmTx?.value))) throw new Error('Invalid transaction value');
 const request=signPost('/api/v1/dex/pre-transaction/simulate',{binanceChainId:'56',evmTx:{from:evmTx.from,to:evmTx.to,value:String(evmTx.value),data:evmTx.data}});
 const start=performance.now();
 const res=await fetchFn(request.url,{method:'POST',body:request.body,headers:request.headers,redirect:'error',signal:AbortSignal.timeout(12000)});
 const response=await res.json();
 if(!res.ok || response.code!==0 || response.success===false)throw new Error('Simulation API: HTTP '+res.status+', code '+(response.code??'n/a')+', '+String(response.msg||'unknown').slice(0,120));
 return {elapsedMs:Math.round(performance.now()-start),data:response.data};
}
