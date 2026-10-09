import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectBuildMinimum,verifyKnownRouterSemantics,verifyReceiptTransferLog} from './route-audit';
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
