import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseWalletDiagnostic,diagnosticFreshness,WALLET_DIAGNOSTIC_KIND} from './wallet-diagnostic';
const sample=()=>({
 kind:WALLET_DIAGNOSTIC_KIND,version:1,
 observedAt:'2026-10-08T10:00:00.000Z',scope:'local-read-only-observation',
 observations:{walletConnected:true,bscSupported:true,tokenScopeRestricted:true,highRiskHandling:'AUTO_REJECT',dailyLimitConfigured:true},
 permissions:{mayTrade:false,maySign:false,mayApprove:false}
});
test('parses legitimate sanitized local wallet snapshot',()=>{
 const r=parseWalletDiagnostic(sample());
 assert.equal(r.ok,true);
 if(r.ok){assert.equal(r.value.permissions.mayTrade,false);assert.equal(r.value.observations.walletConnected,true);}
});
test('rejects forged trade permission or unknown schema',()=>{
 assert.equal(parseWalletDiagnostic({...sample(),permissions:{mayTrade:true,maySign:false,mayApprove:false}}).ok,false);
 assert.equal(parseWalletDiagnostic({...sample(),version:2}).ok,false);
 assert.equal(parseWalletDiagnostic({...sample(),observations:{walletConnected:true}}).ok,false);
 assert.equal(parseWalletDiagnostic({...sample(),observedAt:'tomorrow'}).ok,false);
});
test('does not retain extra user-supplied fields',()=>{
 const result=parseWalletDiagnostic({...sample(),privateKey:'do-not-retain'});
 assert.equal(result.ok,true);
 if(result.ok)assert.ok(!JSON.stringify(result.value).includes('do-not-retain'));
});
test('freshness is time-bound and never treats a future report as current',()=>{
 const r=parseWalletDiagnostic(sample());
 assert.equal(r.ok,true);
 if(!r.ok)return;
 assert.equal(diagnosticFreshness(r.value,Date.parse('2026-10-08T10:09:00Z')),'recent');
 assert.equal(diagnosticFreshness(r.value,Date.parse('2026-10-08T10:11:00Z')),'stale');
 assert.equal(diagnosticFreshness(r.value,Date.parse('2026-10-08T09:59:00Z')),'stale');
});
