'use strict';
// Public, read-only BSC contract provenance probe; no wallet, API keys or signatures.
const RPC=process.env.BSC_RPC_URL||'https://bsc-dataseed.bnbchain.org';
const USDT='0x55d398326f99059ff775485246999027b3197955';
const NVDAB='0x02fca66c1d1afb4e2a7884261eb00f63598a7436';
const BEACON='0x156d6dce9a4f6139a3406f1f021f1a4880de93a3'; // Extracted from BscScan published NVDAB BeaconProxy bytecode; must verify against eth_getCode.
const BEACON_SLOT='0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaef8d3f3e44fcea6e24ca1';
const sha=async code=>{
 const hash=require('node:crypto').createHash('sha256').update(Buffer.from(code.slice(2),'hex')).digest('hex');
 return {bytes:(code.length-2)/2,sha256:hash};
};
async function call(method,params,id){
 const response=await fetch(RPC,{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',method,params,id}),signal:AbortSignal.timeout(9000)});
 if(!response.ok)throw Error('RPC_HTTP_'+response.status);
 const value=await response.json();
 if(value.error||value.result===undefined)throw Error('RPC_NO_RESULT');
 return value.result;
}
(async()=>{
 const chain=await call('eth_chainId',[],1);
 if(BigInt(chain)!==56n)throw Error('Wrong network; refusing evidence.');
 const [usdt,token,beacon]=await Promise.all([
  call('eth_getCode',[USDT,'latest'],2),
  call('eth_getCode',[NVDAB,'latest'],3),
  call('eth_getCode',[BEACON,'latest'],4)
 ]);
 const [storage,implementation]=await Promise.all([
  call('eth_getStorageAt',[NVDAB,BEACON_SLOT,'latest'],5),
  call('eth_call',[{to:BEACON,data:'0x5c60da1b'},'latest'],6)
 ]);
 if(!/^0x[0-9a-f]{64}$/i.test(implementation))throw Error('Unverified implementation encoding');
 const impl='0x'+implementation.slice(-40).toLowerCase();
 const implCode=await call('eth_getCode',[impl,'latest'],7);
 const codes={usdt:await sha(usdt),nvdabProxy:await sha(token),beacon:await sha(beacon),implementation:await sha(implCode)};
 if(Object.values(codes).some(c=>c.bytes<=0))throw Error('One or more contracts are missing code');
 console.log(JSON.stringify({checkedAt:new Date().toISOString(),chain:56,
  addresses:{usdt:USDT,nvdab:NVDAB,beacon:BEACON,implementation:impl},
  codes,beaconSlotValue:storage,senderOrWalletRead:false,executed:false},null,2));
})().catch(e=>{console.error('AUDIT_FAILED:',e.message);process.exitCode=1});
