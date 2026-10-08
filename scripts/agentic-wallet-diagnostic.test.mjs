import {test} from 'node:test';
import assert from 'node:assert/strict';
import {composeDiagnostic,DIAGNOSTIC_KIND} from './agentic-wallet-diagnostic.mjs';

const results = () => ({
 status: {ok:true,connected:true,status:'CONNECTED',secrets:'should-not-leak'},
 chains: {ok:true,bscSupported:true,rawWalletAddress:'should-not-leak'},
 settings: {ok:true,limitedTokenScope:true,highRiskHandling:'AUTO_REJECT',dailyLimitConfigured:true,quota:999,secret:'should-not-leak'}
});
test('only allowlisted readiness data is emitted and there are no trade permissions',()=>{
 const report=composeDiagnostic(results(),new Date('2026-10-08T12:00:00Z'));
 assert.equal(report.kind,DIAGNOSTIC_KIND);
 assert.equal(report.observedAt,'2026-10-08T12:00:00.000Z');
 assert.deepEqual(report.permissions,{mayTrade:false,maySign:false,mayApprove:false});
 assert.equal(report.observations.walletConnected,true);
 assert.equal(report.observations.bscSupported,true);
 const serialized=JSON.stringify(report);
 assert.ok(!serialized.includes('should-not-leak'));
 assert.ok(!serialized.includes('quota'));
 assert.ok(!serialized.includes('address'));
});
test('fail closed on missing status, chains or settings',()=>{
 assert.throws(()=>composeDiagnostic({...results(),chains:{ok:false}}),/incomplete/);
 assert.throws(()=>composeDiagnostic({...results(),status:undefined}),/incomplete/);
});
test('unknown policy stays unknown instead of becoming a trading approval',()=>{
 const altered=results();altered.settings.highRiskHandling='Nothing';
 const report=composeDiagnostic(altered);
 assert.equal(report.observations.highRiskHandling,'UNKNOWN');
 assert.equal(report.permissions.mayTrade,false);
});
