'use strict';
/**
 * Read-only, non-authorizing verification of the LiquidMesh BSC router/facet.
 * No API keys, signer requests, approvals or broadcasts. Existing hashes are
 * observations, not permission to execute.
 */
const {createHash}=require('node:crypto');
const router='0xb44446b0c8e56988c34f7ff73ae904982b5fdda5';
const facet='0xa9fa1b56f4d7bd25375c2d40b4c8e36a9509e603';
const mappingSlot='0x7ddc1c45a5ae31800e181de98e8cb97525e9b89f99e5829d49f25a8ca4bac1d7';
const expectedRouterHash='678b647bfc7b65b4036969469d160aa275ee2b9bef20c30e124ae1c2519648f1';
const expectedFacetHash='924e9da536e78a9ce92f633058a62907ee5834738947432d186e02b212a0d574';
const endpoints=['https://bsc-dataseed.bnbchain.org','https://bsc.publicnode.com'];
async function rpc(url,method,params,id){
 const res=await fetch(url,{method:'POST',headers:{'content-type':'application/json','User-Agent':'SentinelReadOnlyAuditor/1.0'},
  body:JSON.stringify({jsonrpc:'2.0',id,method,params}),redirect:'error',
  signal:AbortSignal.timeout(10000)});
 if(!res.ok)throw Error('RPC HTTP '+res.status);
 const raw=await res.json();
 if(raw.error||typeof raw.result!=='string'||!/^0x[0-9a-f]*$/i.test(raw.result))
  throw Error('RPC result missing/invalid');
 return raw.result;
}
const sha=(x)=>createHash('sha256').update(Buffer.from(x.slice(2),'hex')).digest('hex');
async function inspect(url){
 const [chain,routerCode,mapValue,facetCode]=await Promise.all([
  rpc(url,'eth_chainId',[],1),
  rpc(url,'eth_getCode',[router,'latest'],2),
  rpc(url,'eth_getStorageAt',[router,mappingSlot,'latest'],3),
  rpc(url,'eth_getCode',[facet,'latest'],4)
 ]);
 const pointedTo='0x'+mapValue.slice(-40).toLowerCase();
 return {provider:new URL(url).hostname,chain:Number(BigInt(chain)),routerCodeBytes:(routerCode.length-2)/2,
  facetCodeBytes:(facetCode.length-2)/2,routerCodeSha256:sha(routerCode),
  facetCodeSha256:sha(facetCode),mappedFacet:pointedTo,
  fingerprintMatches:sha(routerCode)===expectedRouterHash&&sha(facetCode)===expectedFacetHash,
  pointerMatches:pointedTo===facet,verifiedSemantics:false};
}
(async()=>{
 const results=await Promise.all(endpoints.map(async url=>{
  try{return await inspect(url);}catch(e){return {provider:new URL(url).hostname,error:String(e.message).slice(0,130)};}
 }));
 const observations=results.filter(x=>!x.error);
 const bothAgree=observations.length===2&&observations.every(x=>x.chain===56&&x.fingerprintMatches&&x.pointerMatches);
 console.log(JSON.stringify({kind:'sentinel.bsc.liquidmesh-bytecode-observations',
  observedAt:new Date().toISOString(),results,
  twoIndependentProvidersAgree:bothAgree,
  selector:'0xad43f73d',router,facet,
  governanceVerified:false,nestedCalldataVerified:false,executionAuthorized:false},null,2));
 if(!bothAgree)process.exitCode=2;
})().catch(e=>{console.error('AUDIT_FAILED '+e.message);process.exitCode=2});
