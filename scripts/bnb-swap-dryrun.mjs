#!/usr/bin/env node
// Strictly non-executing technical spike. Does not sign, approve, send or submit an order.
import { readBinance } from './binance-web3-sign.mjs';
import { simulateEvmTx } from './bnb-transaction-sim.mjs';

const CHAIN='56';
const USDT='0x55d398326f99059fF775485246999027B3197955';
const AMOUNT='10000000000000000000'; // 10 BSC USDT (18 decimals).
const SYNTHETIC='0x000000000000000000000000000000000000dEaD'; // Not a controlled wallet: expected to fail funding/allowance!
const validAddr = v=>/^0x[0-9a-f]{40}$/i.test(v||'');
function log(record){console.log(JSON.stringify(record));}
try {
 const result=await readBinance('/api/v1/dex/market/rwa/search',{keyword:'NVDA'});
 const n=result.data?.find(x=>x.ticker==='NVDA')?.assets?.find(x=>x.platformId==='bstock'&&x.binanceChainId===CHAIN);
 if(!n || !validAddr(n.tokenContractAddress)) throw new Error('No verified BSC NVIDIA bStock returned from live ticker search.');
 log({stage:'discover',ticker:'NVDA',platform:n.platformId,address:n.tokenContractAddress});
 const q=await readBinance('/api/v1/dex/aggregator/quote',{binanceChainId:CHAIN,amount:AMOUNT,fromTokenAddress:USDT,toTokenAddress:n.tokenContractAddress,userWalletAddress:SYNTHETIC});
 const route=q.data?.find(x=>x.executionMode==='SWAP'&&x.quoteId);
 if(!route) throw new Error('No SWAP quote returned. RFQ requires real user wallet; no fallback allowed.');
 log({stage:'quote',mode:route.executionMode,vendor:route.vendorName,fromAmount:route.fromTokenAmount,toAmount:route.toTokenAmount,quoteIdPresent:!!route.quoteId,elapsedMs:q.elapsedMs});
 const built=await readBinance('/api/v1/dex/aggregator/swap',{
   binanceChainId:CHAIN, amount:AMOUNT,fromTokenAddress:USDT,toTokenAddress:n.tokenContractAddress,
   userWalletAddress:SYNTHETIC,quoteId:route.quoteId,slippagePercent:'0.5',approveTransaction:'false'
 });
 if (built.data?.executionMode!=='SWAP' || !built.data?.tx) throw new Error('Build returned missing tx or a non-SWAP execution mode.');
 const tx=built.data.tx;
 if(tx.from?.toLowerCase()!==SYNTHETIC.toLowerCase()) throw new Error('Built sender does not match the synthetic sender.');
 if(!validAddr(tx.to)||!/^0x(?:[0-9a-f]{2})+$/i.test(tx.data||'')) throw new Error('Build returned invalid EVM transaction target/data.');
 log({stage:'build',mode:built.data.executionMode,to:tx.to,calldataBytes:(tx.data.length-2)/2,gas:tx.gas||null,elapsedMs:built.elapsedMs,syntheticSender:true});
 const sim=await simulateEvmTx({from:tx.from,to:tx.to,value:String(tx.value||'0'),data:tx.data});
 const data=sim.data||{};
 log({stage:'simulate',simulatorStatus:data.status||null,failReason:data.failReason||null,
  balanceChangeCount:data.balanceChanges?.length??null,allowanceChangeCount:data.allowanceChanges?.length??null,
  elapsedMs:sim.elapsedMs,syntheticUnfundedSender:true});
 console.log('IMPORTANT: Synthetic, non-signable sender. A SUCCESS simulation is not proof of executable user trading.');
} catch(e) {
 log({stage:'error',reason:e.message});
 process.exitCode=1;
} finally {
 console.log('GUARD: No wallet signature, approval, order submission, or blockchain broadcast.');
}
