import {test} from 'node:test';
import assert from 'node:assert/strict';
import {acceptAuthenticatedProviderBuild,inspectBuildMinimum,verifyKnownRouterSemantics,verifyReceiptTransferLog} from './route-audit';
const wallet='0x3333333333333333333333333333333333333333';
const token='0x2222222222222222222222222222222222222222';
const blockHash='0x'+'ab'.repeat(32);
test('do not claim router calldata verified from selector or an allowlisted address',()=>{
 const result=verifyKnownRouterSemantics({from:wallet,to:token,data:'0x12345678',value:'0',gas:'500000'},{
  inputToken:token,outputToken:token,sender:wallet,recipient:wallet,inputAmountRaw:'25000000000000000000',
  minOutputRaw:'10000000',deadline:Date.now()+20000
 });
 assert.equal(result.ok,false);
});
test('builder minimum-output and actual slippage are checked, not merely displayed',()=>{
 const raw=(minReceiveAmount:unknown,slippagePercent:unknown)=>({tx:{minReceiveAmount,slippagePercent}});
 assert.equal(inspectBuildMinimum(raw('995','0.5'),'1000').ok,true);
 for(const x of [raw('990','0.5'),raw('1001','0.5'),raw(null,'0.5'),raw('995','2'),raw('995',0.5)])
  assert.equal(inspectBuildMinimum(x,'1000').ok,false);
});
test('receipt Transfer proof requires exact contract, indexed owner and anchored block',()=>{
 const topic='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
 const addr=(x:string)=>'0x'+x.slice(2).toLowerCase().padStart(64,'0');
 const valid={address:token,topics:[topic,addr('0x'+'1'.repeat(40)),addr(wallet)],data:'0x'+(15n).toString(16).padStart(64,'0'),blockHash};
 const received=verifyReceiptTransferLog({tokenContract:token,account:wallet,blockHash,logs:[valid]});
 assert.equal(received.ok,true);
 if(received.ok)assert.deepEqual(received.value,{receivedRaw:'15',sentRaw:'0'});
 const notReceived=verifyReceiptTransferLog({tokenContract:token,account:wallet,blockHash,logs:[{...valid,blockHash:'0x'+'cc'.repeat(32)}]});
 assert.equal(notReceived.ok,true);
 if(notReceived.ok)assert.equal(notReceived.value.receivedRaw,'0');
 assert.equal(verifyReceiptTransferLog({tokenContract:token,account:wallet,blockHash:'invalid',logs:[valid]}).ok,false);
});

test('observed envelope needs an authenticated provider response and explicit trust acceptance',async()=>{
 const {inspectObservedLiquidMeshCalldata,OBSERVED_BSC_LIQUIDMESH_ROUTER,OFFICIAL_LIQUIDMESH_BSC_ROUTER}=await import('./route-audit');
 const w=(x:bigint)=>x.toString(16).padStart(64,'0');
 const addr=(x:string)=>x.slice(2).toLowerCase().padStart(64,'0');
 const usdt='0x55d398326f99059ff775485246999027b3197955';
 const nvdab='0x02fca66c1d1afb4e2a7884261eb00f63598a7436';
 const head=[w(123n),w(0n),addr(OFFICIAL_LIQUIDMESH_BSC_ROUTER),addr(usdt),w(1000000000000000000n),
  addr(nvdab),w(995n),addr(wallet),w(1000n),w(320n)].join('');
 const data='0xad43f73d'+head+w(64n)+'11'.repeat(64);
 const tx={from:wallet,to:OBSERVED_BSC_LIQUIDMESH_ROUTER,data,value:'0' as const,gas:'250000'};
 const expected={inputToken:usdt,outputToken:nvdab,sender:wallet,recipient:wallet,
  inputAmountRaw:'1000000000000000000',minOutputRaw:'995',deadline:Date.now()+20000};
 const parsed=inspectObservedLiquidMeshCalldata(tx,expected);
 assert.equal(parsed.ok,true);
 if(parsed.ok){assert.equal(parsed.value.opaquePayloadBytes,64);
  assert.equal(parsed.value.innerRouterAddress,OFFICIAL_LIQUIDMESH_BSC_ROUTER);
  assert.equal(parsed.value.recipientProven,false);
  assert.equal(parsed.value.permissionToSpend,false);}
 assert.equal(verifyKnownRouterSemantics(tx,expected).ok,false);
 assert.equal(acceptAuthenticatedProviderBuild(tx,expected,{authenticatedBinanceResponse:false,userAcceptedProviderTrust:true}).ok,false);
 assert.equal(acceptAuthenticatedProviderBuild(tx,expected,{authenticatedBinanceResponse:true,userAcceptedProviderTrust:false}).ok,false);
 const accepted=acceptAuthenticatedProviderBuild(tx,expected,{authenticatedBinanceResponse:true,userAcceptedProviderTrust:true});
 assert.equal(accepted.ok,true);
 if(accepted.ok)assert.equal(accepted.value.independentlyDecoded,false);
 // A mutated opaque nested instruction can still pass OUTER structure, proving
 // why structural matching alone is never independent semantic verification.
 const changedOpaque=data.slice(0,-2)+'22';
 assert.equal(inspectObservedLiquidMeshCalldata({...tx,data:changedOpaque},expected).ok,true);
 assert.equal(verifyKnownRouterSemantics({...tx,data:changedOpaque},expected).ok,false);
 // A different recipient or opaque control address still passes the 10-word
 // shape; the live policy is therefore explicitly provider-trusting, not audited.
 assert.equal(inspectObservedLiquidMeshCalldata(tx,{...expected,recipient:token}).ok,true);
 assert.equal(verifyKnownRouterSemantics(tx,{...expected,recipient:token}).ok,false);
 const otherControlChanged='0xad43f73d'+data.slice(10,10+64*7)+addr(token)+data.slice(10+64*8);
 assert.equal(inspectObservedLiquidMeshCalldata({...tx,data:otherControlChanged},expected).ok,true);
 assert.equal(verifyKnownRouterSemantics({...tx,data:otherControlChanged},expected).ok,false);
 assert.equal(inspectObservedLiquidMeshCalldata(tx,{...expected,inputAmountRaw:'2'}).ok,false);
 assert.equal(inspectObservedLiquidMeshCalldata(tx,{...expected,outputToken:wallet}).ok,false);
 assert.equal(inspectObservedLiquidMeshCalldata(tx,{...expected,minOutputRaw:'900'}).ok,false);
 assert.equal(inspectObservedLiquidMeshCalldata({...tx,data:data.slice(0,-2)},expected).ok,false);
 assert.equal(inspectObservedLiquidMeshCalldata({...tx,data:data.slice(0,-64)},expected).ok,false);
 assert.equal(inspectObservedLiquidMeshCalldata({...tx,data:'0x095ea7b3'+data.slice(10)},expected).ok,false);
 assert.equal(inspectObservedLiquidMeshCalldata({...tx,to:wallet},expected).ok,false);
 const changedInnerRouter='0xad43f73d'+data.slice(10,10+64*2)+addr(wallet)+data.slice(10+64*3);
 assert.equal(inspectObservedLiquidMeshCalldata({...tx,data:changedInnerRouter},expected).ok,false);
});
