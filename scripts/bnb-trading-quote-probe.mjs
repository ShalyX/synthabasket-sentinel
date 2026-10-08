// Binance RWA + Trading API quote-only feasibility probe. NO swaps, approvals, signatures, submissions or broadcasts.
import { readBinance } from './binance-web3-sign.mjs';
const chain = '56';
const usdt = '0x55d398326f99059fF775485246999027B3197955'; // Binance-Peg BSC USDT, 18 decimals
const amount = '10000000000000000000'; // 10 USDT
const wallet = process.env.BNB_WALLET_ADDRESS || null;
const walletValid = wallet && /^0x[a-fA-F0-9]{40}$/.test(wallet);
if (wallet && !walletValid) throw new Error('BNB_WALLET_ADDRESS must be an EVM address (0x + 40 hex).');
async function call(label,path,query) {
 try {const r=await readBinance(path,query); console.log(JSON.stringify({label,ok:true,latencyMs:r.elapsedMs,resultCount:Array.isArray(r.data)?r.data.length:null}));return r.data;}
 catch(e){console.log(JSON.stringify({label,ok:false,error:e.message}));return null;}
}
console.log('PROBE:',JSON.stringify({timestamp:new Date().toISOString(),chain,source:'BSC USDT',spend:'10 USDT',walletProvided:!!walletValid,mode:'QUOTE_ONLY'}));
await call('aggregator_supported_chain','/api/v1/dex/aggregator/supported/chain',{binanceChainId:chain});
const tokens=await call('rwa_tokens','/api/v1/dex/market/rwa/tokens',{binanceChainId:chain});
if(!Array.isArray(tokens)) process.exit(1);
const preferred=['NVDA','AAPL','TSLA','MSFT','AMZN'];
const candidates=[];
for(const platformId of ['bstock','ondo']){
  const assets=tokens.filter(t=>t.platformId===platformId && t.binanceChainId===chain && typeof t.tokenContractAddress==='string' && t.statusInfo?.openState!==false);
  const choice=assets.sort((a,b)=>{let ai=preferred.indexOf(a.underlyingTicker);let bi=preferred.indexOf(b.underlyingTicker);return (ai<0?99:ai)-(bi<0?99:bi)})[0];
  if(choice) candidates.push(choice);
}
console.log('SELECTED_STOCKS:',JSON.stringify(candidates.map(x=>({ticker:x.underlyingTicker,platform:x.platformId,token:x.tokenSymbol,address:x.tokenContractAddress,openState:x.statusInfo?.openState??null,marketStatus:x.statusInfo?.marketStatus??null}))));
for(const token of candidates) {
  const opts={binanceChainId:chain,amount,fromTokenAddress:usdt,toTokenAddress:token.tokenContractAddress};
  if(walletValid) opts.userWalletAddress=wallet;
  const routes=await call('quote_'+token.platformId+'_'+token.underlyingTicker,'/api/v1/dex/aggregator/quote',opts);
  if(Array.isArray(routes))console.log('ROUTES:',JSON.stringify(routes.map(x=>({ticker:token.underlyingTicker,platform:token.platformId,executionMode:x.executionMode||null,vendor:x.vendorName||null,fromTokenAmount:x.fromTokenAmount||null,toTokenAmount:x.toTokenAmount||null,priceImpactPercent:x.priceImpactPercent||null,tradeFee:x.tradeFee||null,quoteIdPresent:!!x.quoteId,quoteExpirySeconds:'~30',chain:x.binanceChainId||null}))));
}
console.log('FINISHED: Read-only quote discovery. No transaction created, simulated, signed or transmitted.');
