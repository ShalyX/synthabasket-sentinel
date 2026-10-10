import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePlan,matchInventory,parseQuote,resolveOrder,parseTransferReceipt,units} from './sentinel-baw-bridge-core.mjs';
const USDT='0x55d398326f99059ff775485246999027b3197955';
const NVDA='0x02fca66c1d1afb4e2a7884261eb00f63598a7436';
const OWNER='0xeffde5fe22815def3125ef8494392bc83a906021';
const ROUTER='0xb300000b72deaeb607a12d5f54773d1c19c7028d';
const HASH='0x'+'a'.repeat(64);
const padded=(x)=>'0x'+'0'.repeat(24)+x.slice(2);
const hex=(n)=>'0x'+n.toString(16).padStart(64,'0');
const transfer=(address,from,to,value)=>({address,topics:[
 '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',padded(from),padded(to)],data:hex(value)});
const row={ticker:'NVDA',platform:'bstock',address:NVDA,symbol:'NVDAB',amountUsd:1};

test('accepts only bounded, exact-cent BSC basket plans',()=>{
 const plan=parsePlan({legs:[row]});assert.equal(plan.totalUsd,1);
 assert.throws(()=>parsePlan({legs:[{...row,amountUsd:25.01}]}));
 assert.throws(()=>parsePlan({legs:[{...row,amountUsd:1.001}]}));
 assert.throws(()=>parsePlan({legs:[row,row]}));
 assert.throws(()=>parsePlan({legs:[{...row,amountUsd:1,extra:true}]}));
 assert.throws(()=>parsePlan({legs:[]}));
 assert.throws(()=>parsePlan({legs:[row],allowTrade:true}));
 assert.throws(()=>parsePlan({legs:[row,{...row,address:'0x'+'b'.repeat(40),amountUsd:25}]}));
});
test('market identity must exactly match a live trading-indicated contract',()=>{
 const plan=parsePlan({legs:[row]});
 matchInventory(plan,[{...row,tradingAvailable:true}]);
 assert.throws(()=>matchInventory(plan,[{...row,tradingAvailable:false}]));
 assert.throws(()=>matchInventory(plan,[{...row,address:'0x'+'a'.repeat(40),tradingAvailable:true}]));
});
test('official quote validation rejects mismatches and errors',()=>{
 const reply={success:true,data:{fromCoinSymbol:'USDT',fromCoinAmount:'1',toCoinSymbol:'NVDAB',toCoinAmount:'0.0043'}};
 assert.equal(parseQuote(reply,row).estimatedTokens,'0.0043');
 assert.throws(()=>parseQuote({success:false,error:{message:'not available'}},row));
 assert.throws(()=>parseQuote({...reply,data:{...reply.data,toCoinSymbol:'FRAUD'}},row));
 assert.throws(()=>parseQuote({...reply,data:{...reply.data,fromCoinAmount:'2'}},row));
});
test('distinct submitted and recorded IDs require a unique new matching order',()=>{
 const rowIn={orderId:'123',chain:'56',fromToken:USDT,toToken:NVDA,fromTokenQty:'1',
  bookTime:new Date(Date.now()).toISOString(),status:'FINISHED',txHash:HASH};
 const result=resolveOrder('999',{list:[rowIn]},['111'],row,Date.now());
 assert.equal(result.matchedBy,'UNIQUE_NEW_ORDER');
 assert.equal(result.order.orderId,'123');
 assert.equal(resolveOrder('999',{list:[rowIn]},['123'],row,Date.now()).matchedBy,'ORDER_NOT_INDEXED');
 assert.equal(resolveOrder('999',{list:[rowIn,{...rowIn,orderId:'124'}]},[],row,Date.now()).matchedBy,'AMBIGUOUS_ORDER');
 assert.equal(resolveOrder('123',{list:[rowIn]},[],row,Date.now()).matchedBy,'EXACT_ID');
});
test('settlement needs successful receipt, exact USDT debit and owner delivery',()=>{
 const receipt={transactionHash:HASH,status:'0x1',from:OWNER,to:ROUTER,blockHash:'0x'+'b'.repeat(64),
  blockNumber:'0x10',gasUsed:'0x5208',effectiveGasPrice:'0x5',
  logs:[transfer(USDT,OWNER,ROUTER,10n**18n),transfer(NVDA,ROUTER,OWNER,4339591655516555n)]};
 const tx={hash:HASH,from:OWNER,to:ROUTER};
 const parsed=parseTransferReceipt(receipt,tx,OWNER,row);
 assert.equal(parsed.status,'VERIFIED');
 assert.equal(parsed.receivedTokenUnits,'0.004339591655516555');
 assert.equal(parsed.gasWei,'105000');
 assert.throws(()=>parseTransferReceipt({...receipt,status:'0x0'},tx,OWNER,row));
 assert.throws(()=>parseTransferReceipt({...receipt,logs:[transfer(USDT,OWNER,ROUTER,10n**18n),transfer(NVDA,ROUTER,ROUTER,4339591655516555n)]},tx,OWNER,row));
 assert.throws(()=>parseTransferReceipt({...receipt,logs:[transfer(USDT,OWNER,ROUTER,2n*10n**18n),transfer(NVDA,ROUTER,OWNER,4339591655516555n)]},tx,OWNER,row));
 assert.throws(()=>parseTransferReceipt(receipt,{...tx,from:ROUTER},OWNER,row));
});
test('BigInt formatting keeps all token decimals',()=>{
 assert.equal(units(1n),'0.000000000000000001');
 assert.equal(units(1000000000000000000n),'1.0');
});
