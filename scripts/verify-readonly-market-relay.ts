/**
 * Public-market-only QA. No wallet data, keys, transaction payloads,
 * approvals, signatures or user-specific RPC requests.
 */
import {TRUSTED_PREVIEW_MARKET_URL,validateFirstPartyInventory} from '../src/lib/sentinel/read-only-inventory-relay';

async function main(){
 const res=await fetch(TRUSTED_PREVIEW_MARKET_URL,{signal:AbortSignal.timeout(14_000),redirect:'error',cache:'no-store'});
 if(!res.ok)throw Error('Canonical market endpoint HTTP '+res.status);
 const raw:unknown=await res.json();
 const result=validateFirstPartyInventory(raw,Date.now());
 if(!result.ok)throw Error(result.message);
 console.log(JSON.stringify({
  verifiedBy:'first-party-source-and-schema-not-a-binance-cryptographic-signature',
  sourceUrl:TRUSTED_PREVIEW_MARKET_URL,
  asOf:result.value.asOf,
  contracts:result.value.count,
  uniqueTickers:result.value.tickers,
  declaredSource:result.value.source,
  tradesSigned:0,
  executionAuthorized:false
 },null,2));
}
main().catch(e=>{console.error('RELAY_SMOKE_FAILED '+e.message);process.exitCode=1});
