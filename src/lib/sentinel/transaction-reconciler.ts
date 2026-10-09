import type {Platform} from './model';
import {validAddress} from './execution-preflight';

export type TransactionKind='approval'|'swap';
export type ReconciliationPhase=
 'PENDING'|'REVERTED'|'MISMATCH'|'UNAVAILABLE'|
 'RECEIPT_ONLY'|'APPROVAL_MINED'|'SETTLEMENT_INCOMPLETE'|'TRANSFER_EVIDENCE_ONLY';
export interface ExpectedChainTransaction {
 hash:string;sender:string;target:string;kind:TransactionKind;
 ticker:string;platform:Platform;tokenContract:string;
}
export interface Reconciliation {
 status:ReconciliationPhase;reason:string;hash:string;
 receiptVerified:boolean;transferEvidenceVerified:boolean;
 filledPurchaseConfirmed:false;canProceedToNextSpend:false;
}
const hash=(x:unknown):x is string=>typeof x==='string'&&/^0x[0-9a-f]{64}$/i.test(x);
const decimal=(x:unknown):x is string=>typeof x==='string'&&/^(0|[1-9][0-9]{0,77})$/.test(x);
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
function out(expected:ExpectedChainTransaction,status:ReconciliationPhase,reason:string,receipt=false,transfer=false):Reconciliation{
 return {status,reason,hash:expected.hash,receiptVerified:receipt,transferEvidenceVerified:transfer,
  filledPurchaseConfirmed:false,canProceedToNextSpend:false};
}
/** The input must have been returned by the explicitly connected wallet, not sourced from user-editable text. */
export function reconcileTransaction(
 expected:ExpectedChainTransaction,receipt:unknown,settlement?:unknown
):Reconciliation{
 if(!hash(expected.hash)||!validAddress(expected.sender)||!validAddress(expected.target)||
    !validAddress(expected.tokenContract)||!['bstock','ondo'].includes(expected.platform)||
    !/^[A-Z0-9.-]{1,16}$/.test(expected.ticker)||!['approval','swap'].includes(expected.kind))
  return out(expected,'MISMATCH','Transaction intent is malformed or unbound.');
 if(!obj(receipt))return out(expected,'UNAVAILABLE','Read-only receipt evidence is unavailable; no fill inferred.');
 if(receipt.kind!=='sentinel.bsc.tx-receipt'||receipt.chainId!==56||
    typeof receipt.hash!=='string'||receipt.hash.toLowerCase()!==expected.hash.toLowerCase())
  return out(expected,'MISMATCH','Receipt hash or chain does not match the wallet-submitted transaction.');
 if(receipt.status==='PENDING')
  return out(expected,'PENDING','Transaction has not produced a chain receipt; poll only on user action.');
 if(receipt.status==='MINED_REVERTED')
  return out(expected,'REVERTED','EVM receipt reverted. This is not a settlement or successful token purchase.',true);
 if(receipt.status!=='MINED_SUCCESS'||typeof receipt.blockNumber!=='string'||
    !/^0x[0-9a-f]{1,64}$/i.test(receipt.blockNumber))
  return out(expected,'MISMATCH','Receipt did not verify a successful matching transaction.');
 if(expected.kind==='approval')
  return out(expected,'APPROVAL_MINED','Approval receipt mined. An allowance is not a swap or issuer-token delivery; recheck allowance onchain.',true);
 if(!obj(settlement))
  return out(expected,'RECEIPT_ONLY','EVM receipt mined, but no verified issuer token movement is available.',true);
 if(settlement.kind!=='sentinel.bsc.settlement'||settlement.chainId!==56||
    typeof settlement.hash!=='string'||settlement.hash.toLowerCase()!==expected.hash.toLowerCase())
  return out(expected,'MISMATCH','Settlement evidence belongs to another transaction or chain.',true);
 if(settlement.status==='PENDING')
  return out(expected,'RECEIPT_ONLY','Settlement evidence has not been produced yet. No token delivery inferred.',true);
 if(settlement.status!=='TRANSFER_EVIDENCE_VERIFIED')
  return out(expected,'SETTLEMENT_INCOMPLETE','Receipt mined, but transfer logs or historical state are incomplete or unavailable.',true);
 if(typeof settlement.issuerToken!=='string'||settlement.issuerToken.toLowerCase()!==expected.tokenContract.toLowerCase()||
    !decimal(settlement.confirmations)||BigInt(settlement.confirmations)<3n||
    !obj(settlement.stateBalances)||settlement.stateBalances.status!=='VERIFIED'||
    !decimal(settlement.stateBalances.usdtNetDecrease)||!decimal(settlement.stateBalances.issuerNetIncrease)||
    BigInt(settlement.stateBalances.usdtNetDecrease)<=0n||BigInt(settlement.stateBalances.issuerNetIncrease)<=0n||
    !obj(settlement.transferLogs)||!decimal(settlement.transferLogs.usdtSentRaw)||
    !decimal(settlement.transferLogs.issuerReceivedRaw)||BigInt(settlement.transferLogs.usdtSentRaw)<=0n||
    BigInt(settlement.transferLogs.issuerReceivedRaw)<=0n)
  return out(expected,'SETTLEMENT_INCOMPLETE','Transfer evidence is inconsistent with expected issuer or positive token deltas.',true);
 // Even valid transfer logs do not match transaction calldata, minOut or the user's
 // authorized pretrade fingerprint. Do NOT equate them with a confirmed basket fill.
 return out(expected,'TRANSFER_EVIDENCE_ONLY',
  'Matching EVM receipt plus issuer-transfer and historical balance observations verified. A specific authorized swap-calldata fingerprint and legal entitlement are still unverified; no purchase claim.',true,true);
}
export interface BasketReconciliation{
 state:'NO_TRANSACTIONS'|'AWAITING_EVIDENCE'|'PARTIAL_OBSERVATION'|'TRANSFERS_OBSERVED_ONLY';
 entries:Reconciliation[];
 filledPurchaseConfirmed:false;safeToAdvanceAutomatically:false;
}
export function reconcileBasketTransactions(
 expected:ExpectedChainTransaction[],verdicts:Reconciliation[]
):BasketReconciliation{
 if(expected.length===0)return {state:'NO_TRANSACTIONS',entries:[],filledPurchaseConfirmed:false,safeToAdvanceAutomatically:false};
 // Exactly one matched receipt outcome per wallet-returned hash; any missing,
 // duplicate or unrelated result is unresolved, never a fill.
 const unique=new Set(expected.map(x=>x.hash.toLowerCase()));
 if(unique.size!==expected.length||expected.some(e=>verdicts.filter(v=>v.hash.toLowerCase()===e.hash.toLowerCase()).length!==1)||
    verdicts.length!==expected.length)
  return {state:'AWAITING_EVIDENCE',entries:verdicts,filledPurchaseConfirmed:false,safeToAdvanceAutomatically:false};
 const transfers=verdicts.filter(v=>v.status==='TRANSFER_EVIDENCE_ONLY').length;
 return {state:transfers===expected.length?'TRANSFERS_OBSERVED_ONLY':transfers>0?'PARTIAL_OBSERVATION':'AWAITING_EVIDENCE',
  entries:verdicts,filledPurchaseConfirmed:false,safeToAdvanceAutomatically:false};
}
