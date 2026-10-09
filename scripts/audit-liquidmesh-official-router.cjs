'use strict';
/**
 * Independent public read-only contract provenance probe.
 * The Binance outer swap target and LiquidMesh's published router are
 * DIFFERENT contracts. This script never signs, approves or broadcasts.
 */
const {createHash}=require('node:crypto');
const addresses={
 binanceOuter:'0xb44446b0c8e56988c34f7ff73ae904982b5fdda5',
 liquidMeshOfficialRouter:'0x3d90f66b534dd8482b181e24655a9e8265316be9',
 liquidMeshOfficialDefaultSpender:'0x8157a9d65807521fbb8db8f37eeecefdd247e9b1'
};
const slot='0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const RPCS=['https://bsc-dataseed.bnbchain.org','https://bsc.publicnode.com'];
async function rpc(url,method,params,id){
 const res=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',id,method,params}),
  redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!res.ok)throw Error('HTTP '+res.status);
 const raw=await res.json();
 if(raw.error||typeof raw.result!=='string'||!/^0x[0-9a-f]*$/i.test(raw.result))throw Error('RPC response invalid');
 return raw.result;
}
const sha=x=>createHash('sha256').update(Buffer.from(x.slice(2),'hex')).digest('hex');
async function inspect(url){
 const [chain,outer,official,spender,implSlot]=await Promise.all([
  rpc(url,'eth_chainId',[],1),rpc(url,'eth_getCode',[addresses.binanceOuter,'latest'],2),
  rpc(url,'eth_getCode',[addresses.liquidMeshOfficialRouter,'latest'],3),
  rpc(url,'eth_getCode',[addresses.liquidMeshOfficialDefaultSpender,'latest'],4),
  rpc(url,'eth_getStorageAt',[addresses.liquidMeshOfficialRouter,slot,'latest'],5)
 ]);
 if(BigInt(chain)!==56n||!/^0x[0-9a-f]{64}$/i.test(implSlot))throw Error('Wrong chain or proxy slot');
 const implementation='0x'+implSlot.slice(-40).toLowerCase();
 const code=await rpc(url,'eth_getCode',[implementation,'latest'],6);
 return {
  provider:new URL(url).host,
  chain:56,
  binanceOuter:{address:addresses.binanceOuter,bytes:(outer.length-2)/2,sha256:sha(outer)},
  officialRouter:{address:addresses.liquidMeshOfficialRouter,bytes:(official.length-2)/2,sha256:sha(official),eip1967Implementation:implementation},
  officialRouterImplementation:{bytes:(code.length-2)/2,sha256:sha(code)},
  officialDefaultSpender:{address:addresses.liquidMeshOfficialDefaultSpender,bytes:(spender.length-2)/2,sha256:sha(spender)}
 };
}
(async()=>{
 const results=await Promise.all(RPCS.map(async url=>{try{return await inspect(url);}catch(e){return {provider:new URL(url).host,error:e.message};}}));
 const both=results.length===2&&!results.some(x=>x.error);
 const keys=['binanceOuter','officialRouter','officialRouterImplementation','officialDefaultSpender'];
 const match=both&&keys.every(k=>JSON.stringify(results[0][k])===JSON.stringify(results[1][k]));
 console.log(JSON.stringify({kind:'sentinel.liquidmesh.public-contract-provenance',observedAt:new Date().toISOString(),
  sources:['https://docs.liquidmesh.io/docs/smart-contracts','https://sourcify.dev/server/v2/contract/56/'+addresses.liquidMeshOfficialRouter],
  results,independentRpcAgreement:match,officialProxySourceVerifiedOnSourcify:true,
  implementationSourceVerified:false,fullCalldataVerified:false,
  singleApprovalSpenderAssumptionAllowed:false,liveTradingAuthorized:false},null,2));
 if(!match)process.exitCode=2;
})().catch(e=>{console.error(e.message);process.exitCode=2});
