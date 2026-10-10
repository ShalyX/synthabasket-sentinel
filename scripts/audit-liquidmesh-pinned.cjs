'use strict';
/**
 * Sentinel: independent, block-pinned BSC code/upgrade-target attestation.
 * Read-only: no credentials, wallet, signing, spending or Binance calls.
 * This is provenance/change-detection, NOT an ABI audit or an execution permit.
 * Exit 0: known bytecode and pointers observed on TWO RPCs at SAME block.
 * Exit 2: unknown / mismatched / missing result; never fail open.
 */
const {createHash}=require('node:crypto');
const RPCS=['https://bsc-dataseed.bnbchain.org','https://bnb-mainnet.g.alchemy.com/public','https://bsc.publicnode.com'];
const ADDRESS={
 outer:'0xb44446b0c8e56988c34f7ff73ae904982b5fdda5',
 facet:'0xa9fa1b56f4d7bd25375c2d40b4c8e36a9509e603',
 official:'0x3d90f66b534dd8482b181e24655a9e8265316be9',
 implementation:'0xc3460c075f5d8effae3a587aa83d633c7be86b46',
 directSpender:'0x8157a9d65807521fbb8db8f37eeecefdd247e9b1',
 outerOwner:'0x1c6f8a6d1011ca0334f6f8f5e2f9222ef1b68fa9'
};
const EXPECTED={
 outer:'678b647bfc7b65b4036969469d160aa275ee2b9bef20c30e124ae1c2519648f1',
 facet:'924e9da536e78a9ce92f633058a62907ee5834738947432d186e02b212a0d574',
 official:'d2486a9dd6c98f480c1357bb5cbe66658910c8f5f84b14c277cf859ea848cc63',
 implementation:'1230b64b1cef2318540f980033c4ae8d7c0b636328720ba6c3cc23503e85755c',
 directSpender:'5607ab77a09664e662f63a66392dc1bbaee5a1b8d00e7a20f25cb120e03697a6'
};
const SLOTS={
 outerSwapFacet:'0x7ddc1c45a5ae31800e181de98e8cb97525e9b89f99e5829d49f25a8ca4bac1d7',
 erc1967Implementation:'0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
 erc1967Admin:'0xb53127684a568b3173ae13b9f8a6016e019243e63b6e8ee1178d6a717850b5d6103'
};
const zero='0x'+'0'.repeat(40);
const addressWord=x=>typeof x==='string'&&/^0x[0-9a-f]{64}$/i.test(x)?'0x'+x.slice(-40).toLowerCase():null;
const hash=x=>createHash('sha256').update(Buffer.from(x.slice(2),'hex')).digest('hex');
async function rpcRaw(endpoint,method,params){
 const res=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(14000)});
 if(!res.ok)throw Error(method+' HTTP '+res.status);
 const body=await res.json();
 if(body.error)throw Error(method+' RPC '+String(body.error.code??'error')+' '+String(body.error.message??'').slice(0,120));
 if(body.result==null)throw Error(method+' result unavailable');
 return body.result;
}
async function rpc(endpoint,method,params){
 const result=await rpcRaw(endpoint,method,params);
 if(typeof result!=='string'||!/^0x[0-9a-f]*$/i.test(result))throw Error(method+' invalid hex result');
 return result;
}
async function heights(){
 const states=await Promise.all(RPCS.map(async url=>({
  rpc:new URL(url).host,chain:await rpc(url,'eth_chainId',[]),
  height:await rpc(url,'eth_blockNumber',[])
 })));
 if(states.some(x=>x.chain!=='0x38'))throw Error('Wrong chain');
 return Math.min(...states.map(x=>Number(BigInt(x.height))))-3;
}
async function inspect(url,block){
 const results=await Promise.all([
  rpcRaw(url,'eth_getBlockByNumber',[block,false]),
  ...Object.keys(EXPECTED).map(async key=>{
   const value=await rpc(url,'eth_getCode',[ADDRESS[key],block]);
   return {key,bytes:(value.length-2)/2,sha256:hash(value),matches:value!=='0x'&&hash(value)===EXPECTED[key]};
  }),
  rpc(url,'eth_getStorageAt',[ADDRESS.outer,SLOTS.outerSwapFacet,block]),
  rpc(url,'eth_getStorageAt',[ADDRESS.official,SLOTS.erc1967Implementation,block]),
  rpc(url,'eth_getStorageAt',[ADDRESS.official,SLOTS.erc1967Admin,block]),
  rpc(url,'eth_call',[{to:ADDRESS.outer,data:'0x8da5cb5b'},block])
 ]);
 const [header,...rest]=results;
 if(!header||header.number!==block||!/^0x[0-9a-f]{64}$/i.test(header.hash))throw Error('Missing or mismatched canonical block');
 const code=rest.slice(0,Object.keys(EXPECTED).length);
 const [outerFacet,innerImpl,innerAdmin,owner]=rest.slice(Object.keys(EXPECTED).length);
 const ownerAddr=addressWord(owner);
 const ownerCode=ownerAddr&&ownerAddr!==zero?await rpc(url,'eth_getCode',[ownerAddr,block]):'0x';
 const info={rpc:new URL(url).host,block,blockHash:header.hash,code:Object.fromEntries(code.map(x=>[x.key,{bytes:x.bytes,sha256:x.sha256,matches:x.matches}])),
  outerFacet:addressWord(outerFacet),innerImplementation:addressWord(innerImpl),
  innerProxyAdmin:addressWord(innerAdmin),outerOwner:ownerAddr,outerOwnerHasCode:ownerCode!=='0x'};
 info.pinsMatched=code.every(x=>x.matches)&&info.outerFacet===ADDRESS.facet&&
   info.innerImplementation===ADDRESS.implementation&&info.outerOwner===ADDRESS.outerOwner;
 return info;
}
(async()=>{
 const height=await heights();if(!Number.isSafeInteger(height)||height<=0)throw Error('Invalid shared block');
 const block='0x'+height.toString(16);
 const receipts=await Promise.all(RPCS.map(async url=>{
  try{return await inspect(url,block);}catch(e){return {rpc:new URL(url).host,error:e.message};}
 }));
 const normalized=x=>JSON.stringify({...x,rpc:null});
 const successful=receipts.filter(x=>!x.error);
 const equivalent=successful.length>=2&&successful.every(x=>normalized(x)===normalized(successful[0]));
 const known=equivalent&&successful.every(x=>x.pinsMatched);
 const degradedProviders=receipts.filter(x=>x.error).map(x=>({rpc:x.rpc,error:x.error}));
 console.log(JSON.stringify({kind:'sentinel.bsc.block-pinned-liquidmesh-code-attestation',observedAt:new Date().toISOString(),
  chainId:56,requestedBlock:height,providers:receipts,twoRpcAgreement:equivalent,degradedProviders,
  historicalFingerprintsUnchanged:known,verifiedExecutableSemantics:false,
  arbitraryNestedCallsRuledOut:false,governanceAudited:false,permissionToSpend:false,
  verdict:known?'CODE_IDENTITIES_STABLE_SEMANTICS_UNVERIFIED':'FAIL_CLOSED_CHANGED_OR_UNAVAILABLE'},null,2));
 if(!known)process.exitCode=2;
})().catch(e=>{console.error('PINNED_READ_FAILED '+String(e.message));process.exitCode=2});
