'use strict';
const endpoints=['https://bsc-dataseed.bnbchain.org','https://bsc.publicnode.com'];
const router='0xb44446b0c8e56988c34f7ff73ae904982b5fdda5';
async function rpc(url,method,params,id){
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'SentinelReadonlyAudit/1.0'},
  body:JSON.stringify({jsonrpc:'2.0',id,method,params}),signal:AbortSignal.timeout(9000)});
 if(!r.ok)throw Error('RPC HTTP '+r.status);
 const j=await r.json();if(j.error||typeof j.result!=='string')throw Error('RPC_ERROR');return j.result;
}
async function lookup(endpoint){
 const [chain,ownerRaw]=await Promise.all([
  rpc(endpoint,'eth_chainId',[],1),
  rpc(endpoint,'eth_call',[{to:router,data:'0x8da5cb5b'},'latest'],2)
 ]);
 if(chain!=='0x38'||!/0x[0-9a-f]{64}/i.test(ownerRaw))throw Error('Invalid chain or owner() response');
 const owner='0x'+ownerRaw.slice(-40).toLowerCase();
 const code=await rpc(endpoint,'eth_getCode',[owner,'latest'],3);
 return {rpc:endpoint,chainId:56,owner,ownerType:code.length>2?'CONTRACT':'EOA',
  ownerCodeBytes:(code.length-2)/2};
}
(async()=>{
 const result=await Promise.all(endpoints.map(async endpoint=>{try{return await lookup(endpoint);}catch(e){return {rpc:endpoint,error:e.message};}}));
 const consistent=result.length===2&&result.every(x=>x.owner&&x.owner===result[0].owner&&x.ownerType===result[0].ownerType);
 console.log(JSON.stringify({kind:'liquidmesh.diamond.owner-read-only',consistency:consistent,results:result,
   ownerAuthorityAndUpgradePolicyAudited:false,executionAuthorized:false},null,2));
 if(!consistent)process.exitCode=2;
})().catch(e=>{console.error(e.message);process.exitCode=2});
