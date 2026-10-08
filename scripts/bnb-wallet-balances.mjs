#!/usr/bin/env node
// Read-only BSC mainnet balance check. Does not display wallet address or contact trading/order endpoints.
const wallet=process.env.BNB_WALLET_ADDRESS;
if(!/^0x[0-9a-f]{40}$/i.test(wallet||'')) throw new Error('Missing valid public BNB_WALLET_ADDRESS');
const endpoint='https://bsc-dataseed.bnbchain.org';
const usdt='0x55d398326f99059fF775485246999027B3197955';
let seq=0;
async function rpc(method,params){
 const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:++seq,method,params}),signal:AbortSignal.timeout(12000)});
 const value=await response.json();
 if(value.error) throw new Error(method+' RPC '+value.error.code+': '+value.error.message);
 if(typeof value.result!=='string') throw new Error(method+' returned no result');
 return value.result;
}
function units(x,dp){const v=BigInt(x);const base=10n**BigInt(dp);return (v/base).toString()+'.'+(v%base).toString().padStart(dp,'0').slice(0,6);}
try{
 const [bnb,raw,dec]=await Promise.all([
  rpc('eth_getBalance',[wallet,'latest']),
  rpc('eth_call',[{to:usdt,data:'0x70a08231'+wallet.slice(2).toLowerCase().padStart(64,'0')},'latest']),
  rpc('eth_call',[{to:usdt,data:'0x313ce567'},'latest'])
 ]);
 const decimals=Number(BigInt(dec));
 if(decimals>30||decimals<0)throw new Error('Invalid token decimals');
 console.log(JSON.stringify({rpcReachable:true,chain:'BSC mainnet',walletAddressRedacted:true,bnbBalance:units(bnb,18),usdtDecimals:decimals,usdtBalance:units(raw,decimals),enoughFor10USDT:BigInt(raw)>=10n*(10n**BigInt(decimals)),noTransactions:true}));
}catch(e){console.log(JSON.stringify({rpcReachable:false,error:String(e.cause?.code||e.message).slice(0,200)}));process.exitCode=1;}
