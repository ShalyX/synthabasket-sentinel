import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeArgs,safeSummary} from './agentic-wallet-readonly.mjs';
test('strict allowlist prevents signing and trading',()=>{
 assert.deepEqual(safeArgs('status'),['wallet','status','--json']);
 for(const mode of ['swap','send','approve','execute','sign','auth','signout'])
  assert.throws(()=>safeArgs(mode),/Unsupported/);
});
test('quote cannot contain shell injections or over-large amounts',()=>{
 const to='0x02fca66c1d1afb4e2a7884261eb00f63598a7436';
 const cmd=safeArgs('quote',{tokenAddress:to,amount:'5.00'});
 assert.deepEqual(cmd.slice(0,2),['market-order','quote']);
 assert.ok(!cmd.includes('swap'));
 assert.throws(()=>safeArgs('quote',{tokenAddress:to+' & calc',amount:'5'}),/address/);
 assert.throws(()=>safeArgs('quote',{tokenAddress:to,amount:'1 & calc'}),/amount/);
 assert.throws(()=>safeArgs('quote',{tokenAddress:to,amount:'70'}),/amount/);
});
test('redacted wallet status and policy do not leak details',()=>{
 const status=safeSummary('status',{success:true,data:{status:'CONNECTED',secret:'do-not-print'}});
 assert.deepEqual(status,{ok:true,mode:'status',connected:true,status:'CONNECTED'});
 const policy=safeSummary('settings',{success:true,data:{tradeAllTokens:false,abnormalTxnHandling:'NeedConfirmation',dailyLimit:50,address:'private-wallet'}});
 assert.equal(policy.highRiskHandling,'APP_CONFIRMATION');
 assert.ok(!JSON.stringify(policy).includes('private-wallet'));
});
test('quote report is non-executable and strips quote identifiers',()=>{
 const output=safeSummary('quote',{success:true,data:{toCoinSymbol:'NVDAB',toCoinAmount:'0.1',quoteId:'secret'}});
 assert.equal(output.execution,'DISABLED');
 assert.ok(!JSON.stringify(output).includes('secret'));
});
