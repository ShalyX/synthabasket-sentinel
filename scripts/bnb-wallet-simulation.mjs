#!/usr/bin/env node
/**
 * Wallet-bound read-only quote -> build -> simulated EVM execution.
 * Never requests permissions, approves a token, signs, submits or broadcasts a trade.
 * Public wallet address is loaded locally and never printed or committed.
 */
import { readBinance } from './binance-web3-sign.mjs';
import { simulateEvmTx } from './bnb-transaction-sim.mjs';
const CHAIN='56';
const USDT='0x55d398326f99059fF775485246999027B3197955';
const INPUT_AMOUNT='10000000000000000000'; // 10 BSC USDT raw, 18 decimals
const wallet=process.env.BNB_WALLET_ADDRESS;
const addressOK=a=>/^0x[0-9a-fA-F]{40}$/.test(a||'');
if(!addressOK(wallet)){console.error('Missing or invalid BNB_WALLET_ADDRESS (public address only).');process.exit(2);}
const clean = x => (typeof x === 'string' ? x.replaceAll(wallet,'[WALLET_REDACTED]') : x);
function output(s){console.log(JSON.stringify(s));}
const tickerResp=await readBinance('/api/v1/dex/market/rwa/tokens',{binanceChainId:CHAIN});
const tokens=Array.isArray(tickerResp.data)?tickerResp.data:[];
const selected=['bstock','ondo'].map(platform=>tokens.find(x=>x.platformId===platform && x.underlyingTicker==='NVDA' && x.binanceChainId===CHAIN && addressOK(x.tokenContractAddress))).filter(Boolean);
if(selected.length!==2){console.error('Abort: required NVDA contracts were not returned live for both supported providers.');process.exit(1);}
output({mode:'wallet_bound_simulation_only',chain:CHAIN,ticker:'NVDA',input:'10 BSC USDT',walletAddressSupplied:true,noSignatures:true});
let numSuccessful=0;
for(const token of selected) {
 const name=token.platformId+' / '+token.tokenSymbol;
 try {
  const request={binanceChainId:CHAIN,amount:INPUT_AMOUNT,fromTokenAddress:USDT,toTokenAddress:token.tokenContractAddress,userWalletAddress:wallet};
  const quoteResponse=await readBinance('/api/v1/dex/aggregator/quote',request);
  const route=quoteResponse.data?.find(q=>q.executionMode==='SWAP' && typeof q.quoteId==='string' && q.quoteId.length>0);
  if(!route){
   output({provider:name,stage:'quote',status:'NO_SWAP_ROUTE',modes:quoteResponse.data?.map(x=>x.executionMode)??[]});
   continue;
  }
  output({provider:name,stage:'quote',status:'SUCCESS',mode:route.executionMode,vendor:route.vendorName,fromAmountRaw:route.fromTokenAmount,toAmountRaw:route.toTokenAmount,priceImpactPercent:route.priceImpactPercent,tradeFee:route.tradeFee,elapsedMs:quoteResponse.elapsedMs});
  const swap=await readBinance('/api/v1/dex/aggregator/swap',{
   ...request,quoteId:route.quoteId,slippagePercent:'0.5',approveTransaction:'false'
  });
  const built=swap.data;
  if(built?.executionMode !== 'SWAP' || !built?.tx) throw new Error('Swap build missing SWAP transaction.');
  const tx=built.tx;
  if(!addressOK(tx.from)||tx.from.toLowerCase()!==wallet.toLowerCase())throw new Error('Transaction sender mismatch.');
  if(!addressOK(tx.to)||!/^0x(?:[0-9a-fA-F]{2})+$/.test(tx.data||''))throw new Error('Invalid contract address or calldata.');
  output({provider:name,stage:'build',status:'SUCCESS',executionMode:built.executionMode,transactionTarget:tx.to,calldataBytes:(tx.data.length-2)/2,gasLimit:tx.gas??null,approvalIncluded:false,elapsedMs:swap.elapsedMs});
  const result=await simulateEvmTx({from:tx.from,to:tx.to,value:String(tx.value??'0'),data:tx.data});
  const simulated=result.data;
  const passes=simulated?.status==='SUCCESS' && !simulated.failReason;
  output({provider:name,stage:'simulation',status:simulated?.status??'UNKNOWN',passed:passes,failReason:clean(simulated?.failReason??null),elapsedMs:result.elapsedMs,changes:{balances:simulated?.balanceChanges?.length??null,allowances:simulated?.allowanceChanges?.length??null}});
  if(passes)numSuccessful++;
 } catch(error) {
  output({provider:name,stage:'error',error:clean(String(error.message||error).slice(0,230))});
 }
}
output({summary:'READ_ONLY_COMPLETED',simulationsPassed:numSuccessful,simulationsAttempted:selected.length,tradesExecuted:0,signaturesRequested:0,approvalsGranted:0});
