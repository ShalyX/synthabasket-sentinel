'use strict';
// Read-only bytecode capability scan. CALL-family opcode presence is NOT proof
// of reachable execution, intent, recipient, route safety or a verified ABI.
const {createHash}=require('node:crypto');
const RPC='https://bsc-dataseed.bnbchain.org';
const addresses={
 binanceSwapFacet:'0xa9fa1b56f4d7bd25375c2d40b4c8e36a9509e603',
 liquidMeshImplementation:'0xc3460c075f5d8effae3a587aa83d633c7be86b46'
};
const pins={
 binanceSwapFacet:'924e9da536e78a9ce92f633058a62907ee5834738947432d186e02b212a0d574',
 liquidMeshImplementation:'1230b64b1cef2318540f980033c4ae8d7c0b636328720ba6c3cc23503e85755c'
};
const opcodes={0xf0:'CREATE',0xf1:'CALL',0xf2:'CALLCODE',0xf4:'DELEGATECALL',0xf5:'CREATE2',0xfa:'STATICCALL',0xff:'SELFDESTRUCT'};
async function getCode(address){
 const r=await fetch(RPC,{method:'POST',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_getCode',params:[address,'latest']}),
 redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('RPC_HTTP'); const j=await r.json();
 if(j.error||typeof j.result!=='string'||!/^0x[0-9a-f]+$/i.test(j.result))throw Error('RPC_RESPONSE');
 return Buffer.from(j.result.slice(2),'hex');
}
function scan(buf){
 const sites=[];for(let pc=0;pc<buf.length;pc++){
  const op=buf[pc];
  if(op>=0x60&&op<=0x7f){pc+=op-0x5f;continue;} // skip PUSH1-PUSH32 data
  if(opcodes[op])sites.push({pc,opcode:opcodes[op]});
 }
 const counts=Object.fromEntries(Object.values(opcodes).map(name=>[name,sites.filter(x=>x.opcode===name).length]));
 return {counts,siteCountsAreStaticOnly:true};
}
(async()=>{
 const result={};
 for(const [label,address] of Object.entries(addresses)){
  const code=await getCode(address),sha256=createHash('sha256').update(code).digest('hex');
  result[label]={address,bytes:code.length,sha256,pinMatches:sha256===pins[label],...scan(code)};
 }
 console.log(JSON.stringify({kind:'sentinel.liquidmesh.static-opcode-capability-inspection',
  observedAt:new Date().toISOString(),chainId:56,provider:new URL(RPC).host,results:result,
  verifiedABI:false,verifiedControlFlow:false,verifiedCallTargets:false,permissionToSpend:false},null,2));
 if(Object.values(result).some(x=>!x.pinMatches))process.exitCode=2;
})().catch(e=>{console.error('STATIC_SCAN_UNAVAILABLE '+String(e.message));process.exitCode=2});
