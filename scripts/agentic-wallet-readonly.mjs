#!/usr/bin/env node
// Local-only safe Binance Agentic Wallet CLI interface. No order, approval or signature commands.
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const USDT='0x55d398326f99059ff775485246999027b3197955';
export function safeArgs(mode, {tokenAddress,amount}={}) {
 if (['status','chains','settings'].includes(mode)) return ['wallet',mode,'--json'];
 if (mode!=='quote') throw new Error('Unsupported read-only operation.');
 if (typeof tokenAddress!=='string'||!/^0x[0-9a-fA-F]{40}$/.test(tokenAddress))
  throw new Error('Invalid EVM token address');
 if(typeof amount!=='string'||!/^(?:[1-9]\d?)(?:\.\d{1,2})?$/.test(amount)||Number(amount)>50)
  throw new Error('Quote amount must be 1–50 USDT.');
 return ['market-order','quote','--fromTokenQty',amount,'--fromToken',USDT,
  '--toToken',tokenAddress,'--binanceChainId','56','--json'];
}
export function safeSummary(mode,response){
 if(!response||response.success!==true)return {ok:false,mode,error:'CLI request failed'};
 const data=response.data;
 if(mode==='status')return {ok:true,mode,connected:data?.status==='CONNECTED',status:String(data?.status||'UNKNOWN')};
 if(mode==='chains')return {ok:true,mode,bscSupported:Array.isArray(data)&&data.some(x=>String(x.binanceChainId)==='56')};
 if(mode==='settings')return {ok:true,mode,
  limitedTokenScope:data?.tradeAllTokens===false,
  highRiskHandling:data?.abnormalTxnHandling==='AutoReject'?'AUTO_REJECT':data?.abnormalTxnHandling==='NeedConfirmation'?'APP_CONFIRMATION':'UNKNOWN',
  dailyLimitConfigured:Number.isFinite(Number(data?.dailyLimit))&&Number(data?.dailyLimit)>0};
 if(mode==='quote')return {ok:true,mode,
  outputSymbol:typeof data?.toCoinSymbol==='string'?data.toCoinSymbol.slice(0,12):null,
  outputQty:typeof data?.toCoinAmount==='string'?data.toCoinAmount.slice(0,45):null,
  execution:'DISABLED'};
 throw new Error('Invalid result mode');
}
export function runSafe(mode,options={}){
 const args=safeArgs(mode,options);
 const win=process.platform==='win32';
 // Windows npm CLI shim requires cmd.exe; all tokens here are from a strict allowlist/validated inputs.
 const result=spawnSync(win?'cmd.exe':'baw',win?['/d','/s','/c','baw '+args.join(' ')]:args,
  {encoding:'utf8',timeout:20000,maxBuffer:1024*1024,windowsHide:true,shell:false});
 if(result.error||result.status!==0)throw new Error('Agentic Wallet CLI unavailable or request timed out');
 let payload;try{payload=JSON.parse(result.stdout)}catch{throw new Error('Malformed Agentic Wallet JSON')}
 return safeSummary(mode,payload);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const mode=process.argv[2]||'status';
 try{
  const result=runSafe(mode,{tokenAddress:process.argv[3],amount:process.argv[4]});
  console.log(JSON.stringify({...result,tradesExecuted:0,signaturesRequested:0}));
  if(!result.ok)process.exitCode=1;
 }catch(e){console.error(JSON.stringify({ok:false,error:e.message}));process.exitCode=1}
}
