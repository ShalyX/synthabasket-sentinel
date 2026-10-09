import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exactApprovalCalldata,parseTrustedTargets,parseTrustedSelectors,isTrustedExecutionTarget,evaluateLiveSpend} from './execution-authorization';
const router='0x1111111111111111111111111111111111111111',spender='0x2222222222222222222222222222222222222222';
const sender='0x3333333333333333333333333333333333333333';
const routers=parseTrustedTargets(router),spenders=parseTrustedTargets(spender);
const tx={from:sender,to:router,data:'0x12345678',value:'0' as const,gas:'250000'};
const funding={chainId:56n,usdtBalance:25n*10n**18n,bnbBalance:10n**18n,gasPrice:1000000000n,allowance:25n*10n**18n};
const args={amountUsd:25,spender,tx,funding,expectedAddress:sender,routers,spenders,simulatedPass:true,quoteExpiresAt:20000,now:10000};
test('exact approval encodes USDT 18 decimals and never unlimited',()=>{
 const data=exactApprovalCalldata(spender,25);
 assert.equal(data.slice(0,10),'0x095ea7b3');
 assert.equal(data.length,138);
 assert.equal(BigInt('0x'+data.slice(-64)),25n*10n**18n);
 assert.throws(()=>exactApprovalCalldata('0x0',25));
 assert.throws(()=>exactApprovalCalldata(spender,26));
});
test('swap selectors require operator review, ERC20 approve is never a swap selector',()=>{
 assert.deepEqual([...parseTrustedSelectors('0x12345678,0x095ea7b3,wrong')],['0x12345678']);
 assert.equal(parseTrustedSelectors(undefined).size,0);
});
test('router and spender must be independently configured, no guessed addresses',()=>{
 assert.equal(isTrustedExecutionTarget(router,spender,routers,spenders),true);
 assert.equal(isTrustedExecutionTarget(router,router,routers,spenders),false);
 assert.equal(isTrustedExecutionTarget(router,router,routers,parseTrustedTargets(router)),true);
 assert.equal(isTrustedExecutionTarget(router,spender,new Set(),spenders),false);
 assert.equal(isTrustedExecutionTarget(router,spender,routers,new Set()),false);
 assert.equal(parseTrustedTargets('nonsense,0x0000000000000000000000000000000000000000').size,0);
});
test('only fresh simulator PASS and complete funding is signable',()=>{
 assert.equal(evaluateLiveSpend(args).phase,'SWAP_READY');
 assert.equal(evaluateLiveSpend({...args,simulatedPass:false}).phase,'BLOCKED');
 assert.equal(evaluateLiveSpend({...args,now:20000}).phase,'BLOCKED');
 assert.equal(evaluateLiveSpend({...args,expectedAddress:router}).phase,'BLOCKED');
 assert.equal(evaluateLiveSpend({...args,routers:new Set()}).phase,'BLOCKED');
 assert.equal(evaluateLiveSpend({...args,funding:{...funding,chainId:1n}}).phase,'BLOCKED');
 assert.equal(evaluateLiveSpend({...args,funding:{...funding,usdtBalance:0n}}).phase,'BLOCKED');
 assert.equal(evaluateLiveSpend({...args,funding:{...funding,bnbBalance:0n}}).phase,'BLOCKED');
 assert.equal(evaluateLiveSpend({...args,tx:{...tx,gas:null}}).phase,'BLOCKED');
 assert.equal(evaluateLiveSpend({...args,funding:{...funding,allowance:0n}}).phase,'APPROVAL_REQUIRED');
 assert.equal(evaluateLiveSpend({...args,funding:{...funding,allowance:1n}}).phase,'BLOCKED');
});
