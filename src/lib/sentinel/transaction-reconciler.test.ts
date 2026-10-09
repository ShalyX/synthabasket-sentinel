import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reconcileTransaction,reconcileBasketTransactions,type ExpectedChainTransaction} from './transaction-reconciler';
const wallet='0x1111111111111111111111111111111111111111';
const router='0x2222222222222222222222222222222222222222';
const token='0x3333333333333333333333333333333333333333';
const hash='0x'+'a'.repeat(64);
const expected:ExpectedChainTransaction={hash,sender:wallet,target:router,kind:'swap',ticker:'NVDA',platform:'bstock',tokenContract:token};
const receipt=(status='MINED_SUCCESS')=>({kind:'sentinel.bsc.tx-receipt',chainId:56,hash,
 status,blockNumber:'0x1dcd650'});
const settlement=()=>({kind:'sentinel.bsc.settlement',chainId:56,hash,
 status:'TRANSFER_EVIDENCE_VERIFIED',confirmations:'4',issuerToken:token,
 stateBalances:{status:'VERIFIED',usdtNetDecrease:'1000000000000000000',issuerNetIncrease:'100000000000000'},
 transferLogs:{usdtSentRaw:'1000000000000000000',issuerReceivedRaw:'100000000000000'}});
test('pending does not create a mined/fill claim',()=>{
 const value=reconcileTransaction(expected,{kind:'sentinel.bsc.tx-receipt',status:'PENDING',chainId:56,hash});
 assert.equal(value.status,'PENDING');assert.equal(value.receiptVerified,false);
 assert.equal(value.filledPurchaseConfirmed,false);
});
test('reverts and approvals cannot be counted as an acquired issuer asset',()=>{
 const reverted=reconcileTransaction(expected,receipt('MINED_REVERTED'));
 assert.equal(reverted.status,'REVERTED');assert.equal(reverted.transferEvidenceVerified,false);
 const approved=reconcileTransaction({...expected,kind:'approval'},receipt());
 assert.equal(approved.status,'APPROVAL_MINED');assert.equal(approved.filledPurchaseConfirmed,false);
 assert.equal(approved.canProceedToNextSpend,false);
});
test('missing or wrong chain/hash, unexpected token, insufficient finality and fake transfer amounts fail closed',()=>{
 for(const changed of [
  {...receipt(),hash:'0x'+'b'.repeat(64)},{...receipt(),chainId:1},{...receipt(),status:'BROKEN'}
 ])assert.equal(reconcileTransaction(expected,changed).filledPurchaseConfirmed,false);
 assert.equal(reconcileTransaction(expected,{...receipt(),chainId:1}).status,'MISMATCH');
 assert.equal(reconcileTransaction(expected,receipt()).status,'RECEIPT_ONLY');
 const base=settlement();
 for(const altered of [
  {...base,chainId:1},{...base,hash:'0x'+'b'.repeat(64)},
  {...base,issuerToken:router},{...base,confirmations:'2'},
  {...base,stateBalances:{...base.stateBalances,status:'UNAVAILABLE'}},
  {...base,stateBalances:{...base.stateBalances,issuerNetIncrease:'0'}},
  {...base,transferLogs:{...base.transferLogs,usdtSentRaw:'0'}},
  {...base,status:'INCOMPLETE'}
 ]){
  const verdict=reconcileTransaction(expected,receipt(),altered);
  assert.equal(verdict.transferEvidenceVerified,false,JSON.stringify(altered));
  assert.equal(verdict.filledPurchaseConfirmed,false);
 }
});
test('valid receipt AND issuer logs AND historical state remain transfer evidence only, not authenticated fill',()=>{
 const result=reconcileTransaction(expected,receipt(),settlement());
 assert.equal(result.status,'TRANSFER_EVIDENCE_ONLY');
 assert.equal(result.receiptVerified,true);
 assert.equal(result.transferEvidenceVerified,true);
 assert.equal(result.filledPurchaseConfirmed,false);
 assert.equal(result.canProceedToNextSpend,false);
});
test('basket cannot advance over missing legs, duplicate receipts or partially observed positions',()=>{
 const second={...expected,hash:'0x'+'c'.repeat(64),ticker:'AMD',platform:'ondo' as const};
 const result=reconcileTransaction(expected,receipt(),settlement());
 const missing=reconcileBasketTransactions([expected,second],[result]);
 assert.equal(missing.state,'AWAITING_EVIDENCE');
 const duplicate=reconcileBasketTransactions([expected,expected],[result,result]);
 assert.equal(duplicate.state,'AWAITING_EVIDENCE');
 const partial=reconcileBasketTransactions([expected,second],[result,{...result,hash:second.hash,status:'PENDING',transferEvidenceVerified:false}]);
 assert.equal(partial.state,'PARTIAL_OBSERVATION');assert.equal(partial.safeToAdvanceAutomatically,false);
 const full=reconcileBasketTransactions([expected,second],[result,{...result,hash:second.hash}]);
 assert.equal(full.state,'TRANSFERS_OBSERVED_ONLY');
 assert.equal(full.filledPurchaseConfirmed,false);
});
