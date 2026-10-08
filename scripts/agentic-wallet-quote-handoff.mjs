#!/usr/bin/env node
/**
 * USER-OPERATED, OFFLINE SANITIZER for Binance Agentic Wallet's quote-only CLI.
 * Reads the official CLI JSON from stdin. Never launches baw, connects to a wallet,
 * imports session material, signs or broadcasts. Does not log raw JSON.
 */
import {writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export const KIND='synthabasket.sentinel.agentic-quote-observation';
const USDT='0x55d398326f99059ff775485246999027b3197955';
const addr=/^0x[0-9a-f]{40}$/i;
const qty=/^(?:0|[1-9]\d{0,17})(?:\.\d{1,18})?$/;
export function sanitizeCliQuote(cli,options,now=new Date()){
 const {ticker,platform,token,symbol,amount}=options||{};
 if(typeof ticker!=='string'||!/^[A-Z0-9.-]{1,16}$/.test(ticker)
 ||!['ondo','bstock'].includes(platform)||typeof token!=='string'||!addr.test(token)
 ||typeof symbol!=='string'||!/^[A-Za-z0-9._-]{1,30}$/.test(symbol))
  throw new Error('Invalid ticker, provider, symbol, or BSC token contract.');
 if(typeof amount!=='string'||!/^(?:[1-9]\d?)(?:\.\d{1,2})?$/.test(amount)
 ||Number(amount)<1||Number(amount)>50)
  throw new Error('Quote input amount must be 1–50 USDT.');
 if(!(now instanceof Date)||!Number.isFinite(now.valueOf()))throw new Error('Invalid observation time.');
 const data=cli?.data;
 if(cli?.success!==true||!data||typeof data!=='object')
  throw new Error('Official Binance Agentic Wallet quote did not succeed.');
 if(String(data.fromCoinSymbol).toUpperCase()!=='USDT'||
  String(data.toCoinSymbol).toUpperCase()!==symbol.toUpperCase())
  throw new Error('Quote input/output symbols do not match this instrument.');
 if(typeof data.fromCoinAmount!=='string'||!qty.test(data.fromCoinAmount)
 ||Number(data.fromCoinAmount)!==Number(amount))
  throw new Error('Quoted source amount does not match the requested USDT amount.');
 if(typeof data.toCoinAmount!=='string'||!qty.test(data.toCoinAmount)
 ||Number(data.toCoinAmount)<=0||!Number.isFinite(Number(data.toCoinAmount)))
  throw new Error('Invalid quoted output quantity.');
 // The official quote response documents symbols/amounts, but does not attest
 // target contract address. That address comes from manually supplied command args.
 return {
  kind:KIND,version:1,scope:'local-user-supplied-quote',
  observedAt:now.toISOString(),chainId:'56',fromToken:USDT,
  targetToken:token.toLowerCase(),ticker,platform,tokenSymbol:symbol,
  amountUsd:Number(amount),outputTokenAmount:data.toCoinAmount,
  permissions:{mayTrade:false,maySign:false,mayApprove:false}
 };
}
function parseOptions(argv){
 const out={};
 for(let i=0;i<argv.length;i+=2){
  if(!argv[i]?.startsWith('--')||i+1>=argv.length)throw new Error('Expected --ticker --platform --token --symbol --amount.');
  const key=argv[i].slice(2);
  if(!['ticker','platform','token','symbol','amount'].includes(key)||key in out)
   throw new Error('Unexpected argument.');
  out[key]=argv[i+1];
 }
 if(Object.keys(out).length!==5)throw new Error('Five instrument/quote arguments are required.');
 return out;
}
async function readBoundedJson(){
 let size=0;const chunks=[];
 for await(const chunk of process.stdin){
  size+=chunk.length;if(size>32768)throw new Error('Raw CLI response too large.');
  chunks.push(chunk);
 }
 let value;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'))}
 catch{throw new Error('CLI output was not one valid JSON object.');}
 return value;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const options=parseOptions(process.argv.slice(2));
  const payload=await readBoundedJson();
  const report=sanitizeCliQuote(payload,options);
  const destination=path.join(os.tmpdir(),'sentinel-agentic-quote-observation.json');
  await writeFile(destination,JSON.stringify(report,null,2)+'\n',{encoding:'utf8',flag:'w',mode:0o600});
  console.log('Sanitized local quote observation: '+destination);
  console.log('This file does not contain wallet addresses, session details, IDs, signatures or transaction permissions.');
  console.log('Import it in Sentinel. It is untrusted, indicative quote evidence only; never trade authorization.');
 }catch(e){
  console.error('Local quote sanitization failed: '+(e instanceof Error?e.message:'Unknown error'));
  process.exitCode=1;
 }
}
