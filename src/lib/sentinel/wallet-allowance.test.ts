import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseAllowanceLegs,requiredBySpender,summarizeAllowances} from './wallet-allowance';

const A='0x'+'a'.repeat(40), B='0x'+'b'.repeat(40);
test('only four properly sized quoted spender legs may be read and combined',()=>{
 const result=parseAllowanceLegs([{spender:A,amountUsd:12.5},{spender:A,amountUsd:10},{spender:B,amountUsd:2.5}],25);
 assert.equal(result.ok,true);
 if(!result.ok)return;
 const required=requiredBySpender(result.legs);
 assert.equal(required.get(A),22500000000000000000n);
 assert.equal(required.get(B),2500000000000000000n);
 const summary=summarizeAllowances(required,new Map([[A,22500000000000000000n],[B,1n]]));
 assert.equal(summary[0].coversRequired,true);
 assert.equal(summary[1].coversRequired,false);
 assert.equal(summary[0].requiredUsdt,'22.500000');
 assert.equal(summary[1].approvedUsdt,'0.000000');
});
test('malformed, excess, unexpected or missing spenders fail closed',()=>{
 for(const bad of [
  null,{},[{spender:'x',amountUsd:2}], [{spender:A,amountUsd:25.01}],
  [{spender:A,amountUsd:1.001}], [{spender:A,amountUsd:1,approval:true}],
  [{spender:A,amountUsd:26}], Array.from({length:5},()=>({spender:A,amountUsd:1})),
  [{spender:A,amountUsd:20},{spender:B,amountUsd:10}]
 ])assert.equal(parseAllowanceLegs(bad,25).ok,false);
 assert.deepEqual(parseAllowanceLegs(undefined,25),{ok:true,legs:[]});
 assert.throws(()=>summarizeAllowances(new Map([[A,1n]]),new Map()));
});
