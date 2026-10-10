#!/usr/bin/env node
/**
 * SynthaBasket Sentinel local Binance Agentic Wallet execution bridge.
 * Loopback only; no wallet keys/session ever leave this process.
 * Trading is OFF unless the operator sets SENTINEL_BAW_ENABLE_TRADING=1.
 * A browser quote is never a swap. A failed/unknown leg never advances the basket.
 */
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {USDT,ADDRESS,parsePlan,matchInventory,parseQuote,resolveOrder,parseTransferReceipt,
 newSecret,hash,equal,terminal} from './sentinel-baw-bridge-core.mjs';

const PORT=Number(process.env.SENTINEL_BRIDGE_PORT||8787);
const ORIGIN=process.env.SENTINEL_BRIDGE_ORIGIN||'https://synthabasket-sentinel.vercel.app';
const CORS=new Set([ORIGIN,...(process.env.SENTINEL_BRIDGE_DEV_ORIGIN==='1'?['http://localhost:3000','http://127.0.0.1:3000']:[])]);
const CAP='$25 maximum, $1 minimum per leg, BSC only, 0.5% slippage';
const ENABLED=process.env.SENTINEL_BAW_ENABLE_TRADING==='1';
const SECRET=newSecret();
const DATA=process.env.SENTINEL_BAW_JOURNAL||path.join(os.homedir(),'.sentinel-baw-bridge','journal.json');
const BINANCE_CLI=process.env.SENTINEL_BAW_CLI_PATH||
 (process.platform==='win32'?path.join(process.env.APPDATA||'', 'npm','node_modules','@binance','agentic-wallet','dist','index.js'):
  '/usr/local/lib/node_modules/@binance/agentic-wallet/dist/index.js');
const RPCS=['https://bsc-dataseed.bnbchain.org','https://bnb-mainnet.g.alchemy.com/public'];
const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
let state={phase:'IDLE',legs:[]},working=false;
let requestCount=0;
const ok=(response,status,body,origin)=>{
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
 'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'Authorization, Content-Type',
 'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Private-Network':'true'};
 response.writeHead(status,headers);
 response.end(JSON.stringify(body));
};
async function persist(){
 await mkdir(path.dirname(DATA),{recursive:true,mode:0o700});
 const tmp=DATA+'.tmp';
 await writeFile(tmp,JSON.stringify(state,null,2)+'\n',{encoding:'utf8',mode:0o600});
 await rename(tmp,DATA);
}
const cli=async(args,timeoutMs=15000)=>{
 if(!Array.isArray(args)||args.some(x=>typeof x!=='string'||x.length>500))throw Error('CLI command rejected.');
 return await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[BINANCE_CLI,...args],{
   windowsHide:true,stdio:['ignore','pipe','pipe'],shell:false,env:process.env
  });
  let output='',errors='',exceeded=false;
  const timer=setTimeout(()=>{exceeded=true;child.kill();},timeoutMs);
  child.stdout.on('data',chunk=>{output+=chunk.toString();if(output.length>65536){exceeded=true;child.kill();}});
  child.stderr.on('data',chunk=>{errors+=chunk.toString().slice(0,1024);});
  child.on('error',e=>{clearTimeout(timer);reject(new Error('Binance Wallet CLI could not launch: '+e.code));});
  child.on('close',code=>{
   clearTimeout(timer);
   if(exceeded)return reject(Error('Wallet response timed out; submission outcome may be UNKNOWN.'));
   let parsed;
   try{parsed=JSON.parse(output);}catch{return reject(Error('Wallet did not return valid JSON (exit '+code+').'));}
   if(code!==0||parsed.success!==true)return reject(Error('Binance Wallet: '+String(parsed.error?.name||'ERROR')+' — '+String(parsed.error?.message||'Unable to complete command').slice(0,250)));
   resolve(parsed.data);
  });
 });
};
async function wallet(){
 const status=await cli(['wallet','status','--json']);
 if(status.status!=='CONNECTED')throw Error('Connect Binance Agentic Wallet on this PC first.');
 const addresses=await cli(['wallet','address','--json']);
 const account=addresses.addresses?.find(x=>String(x.binanceChainId)==='56')?.address;
 if(!ADDRESS.test(account||''))throw Error('Binance Agentic Wallet BSC address unavailable.');
 const lock=await cli(['wallet','tx-lock','--binanceChainId','56','--json']);
 if(lock.status!=='UNLOCKED')throw Error('Binance Wallet has a pending transaction/confirmation; no new trades.');
 return account;
}
async function inventory(){
 const response=await fetch('https://synthabasket-sentinel.vercel.app/api/sentinel/markets',
  {cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('Live issuer inventory unavailable.');
 const data=await response.json();
 if(!Array.isArray(data.tokens)||data.tokens.length<1)throw Error('Invalid live market inventory.');
 return data.tokens;
}
async function funds(required,legs){
 const entries=await cli(['wallet','balance','--binanceChainId','56','--json']);
 const usdt=entries.find(x=>x.symbol==='USDT'&&x.address?.toLowerCase()===USDT)?.balance;
 const bnb=entries.find(x=>x.symbol==='BNB')?.balance;
 if(!usdt||Number(usdt)<required)throw Error('Binance Agentic Wallet has insufficient USDT for the reviewed basket.');
 // Explicit conservative gas buffer; not a guarantee of actual network fees.
 if(!bnb||Number(bnb)<0.00015*legs)throw Error('Insufficient BNB against bridge gas buffer (0.00015 BNB per leg).');
 return {usdt,bnb};
}
const usd=(x)=>String(x.amountUsd);
async function quote(leg){
 const q=await cli(['market-order','quote','--fromTokenQty',usd(leg),'--fromToken',USDT,
  '--toToken',leg.address,'--binanceChainId','56','--slippage','0.5','--json'],20000);
 return parseQuote({success:true,data:q},leg);
}
async function rpc(url,method,params){
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',method,params,id:1}),signal:AbortSignal.timeout(9000),cache:'no-store'});
 if(!response.ok)throw Error('RPC HTTP '+response.status);
 const json=await response.json();
 if(json.error||json.result===undefined)throw Error('RPC unavailable');
 return json.result;
}
async function settle(txHash,owner,leg){
 if(!/^0x[0-9a-f]{64}$/i.test(txHash||''))throw Error('No valid transaction hash for reconciliation.');
 const proofs=[];
 for(const url of RPCS){
  const [receipt,transaction,block,chain]=await Promise.all([
   rpc(url,'eth_getTransactionReceipt',[txHash]),rpc(url,'eth_getTransactionByHash',[txHash]),
   rpc(url,'eth_blockNumber',[]),rpc(url,'eth_chainId',[])
  ]);
  if(chain!=='0x38')throw Error('Unexpected chain from settlement RPC.');
  const proof=parseTransferReceipt(receipt,transaction,owner,leg);
  if(proof.status!=='VERIFIED')throw Error('Transaction receipt is not finalized.');
  if(BigInt(block)-BigInt(receipt.blockNumber)+1n<3n)throw Error('Waiting for three BSC confirmations.');
  proofs.push(proof);
 }
 const [a,b]=proofs;
 if(a.blockHash!==b.blockHash||a.txHash?.toLowerCase()!==b.txHash?.toLowerCase()||
  a.spentUsdtRaw!==b.spentUsdtRaw||a.receivedTokenRaw!==b.receivedTokenRaw)
  throw Error('Independent BSC providers disagree on settlement.');
 return {...a,confirmations:'3+',verification:'TWO_INDEPENDENT_RPC_PROVIDERS',tokenContract:leg.address};
}
async function orders(){
 return await cli(['market-order','list','--binanceChainId','56','--pageSize','30','--json'],16000);
}
async function locate(leg,submittedId,baseline,since){
 let found=null;
 for(let attempt=0;attempt<7;attempt++){
  const result=await orders();
  const match=resolveOrder(submittedId,result,baseline,leg,since);
  if(match.order){
   found=match;
   if(['FINISHED','FAILED'].includes(match.order.status))return found;
  }else if(match.matchedBy==='AMBIGUOUS_ORDER')throw Error('Multiple plausible orders found; manual reconciliation required.');
  if(attempt<6)await sleep(3500);
 }
 return found;
}
async function preview(raw){
 if(state.phase==='RUNNING'||state.phase==='SUBMISSION_UNCERTAIN')throw Error('Another execution requires resolution.');
 if(['RECOVERY_REQUIRED','RECONCILIATION_INCOMPLETE'].includes(state.phase))
  throw Error('Previous execution has unresolved state. Reconcile it before a new preview.');
 const plan=parsePlan(raw);
 const tokens=await inventory();
 matchInventory(plan,tokens);
 const address=await wallet();
 let funding={ready:false,reason:'Wallet funding was not checked.'};
 try{const observed=await funds(plan.totalUsd,plan.legs.length);funding={ready:true,reason:'Spendable USDT and buffered BNB gas observed.',balances:observed};}
 catch(e){funding={ready:false,reason:String(e.message).slice(0,220)};}
 const quoted=[];
 for(const leg of plan.legs)quoted.push(await quote(leg));
 const now=Date.now();
 const digest=hash({plan,address,quoted,now,nonce:newSecret()});
 state={phase:'PREVIEW_READY',createdAt:new Date(now).toISOString(),expiresAt:new Date(now+60000).toISOString(),
  digest,account:address,totalUsd:plan.totalUsd,funding,legs:plan.legs.map((x,i)=>({...x,quote:quoted[i],phase:'READY'})),
  nextLeg:0,bridgeMode:ENABLED?'LIVE_ENABLED':'READ_ONLY',executedOrders:0};
 await persist();
 return state;
}
async function execute(raw){
 if(!ENABLED)throw Error('Trading disabled. Restart local bridge with SENTINEL_BAW_ENABLE_TRADING=1 after reviewing risks.');
 if(working||state.phase!=='PREVIEW_READY')throw Error('No unspent basket preview is available.');
 if(!raw||Object.keys(raw).sort().join(',')!=='confirmation,digest'||
  raw.confirmation!=='EXECUTE BASKET'||!equal(raw.digest,state.digest))throw Error('Basket confirmation or fingerprint does not match.');
 if(Date.now()>Date.parse(state.expiresAt))throw Error('Quote review expired. Prepare a new basket preview.');
 if(!state.funding?.ready)throw Error('Preview was not funded. Refresh the preview after funding your local wallet.');
 if((await wallet()).toLowerCase()!==state.account.toLowerCase())throw Error('Binance wallet changed since preview.');
 matchInventory({legs:state.legs},await inventory());
 await funds(state.totalUsd,state.legs.length);
 state.phase='RUNNING';state.startedAt=new Date().toISOString();
 await persist();
 working=true;
 void run().finally(()=>{working=false;}).catch(()=>{working=false;});
 return {phase:state.phase,digest:state.digest,account:state.account};
}
async function run(){
 try{
  for(let i=state.nextLeg;i<state.legs.length;i++){
   const leg=state.legs[i];
   state.nextLeg=i;
   await persist();
   const owner=await wallet();
   if(owner.toLowerCase()!==state.account.toLowerCase())throw Error('Wallet address changed. Halt.');
   matchInventory({legs:[leg]},await inventory());
   await funds(leg.amountUsd,1);
   const fresh=await quote(leg);
   const original=Number(leg.quote.estimatedTokens),current=Number(fresh.estimatedTokens);
   if(current<original*0.995)throw Error('Quote deteriorated by more than 0.5% since authorization. Halt and re-review.');
   const previous=await orders();
   const baseline=(previous.list||[]).map(x=>String(x.orderId));
   const started=Date.now();
   leg.phase='SUBMISSION_UNCERTAIN';leg.submissionStartedAt=new Date(started).toISOString();
   leg.baselineOrderIds=baseline;
   leg.executionQuote=fresh;
   state.phase='SUBMISSION_UNCERTAIN';
   await persist(); // Crash immediately after this point must never automatically retry.
   let submitted;
   try{
    submitted=await cli(['market-order','swap','--fromTokenQty',usd(leg),'--fromToken',USDT,
     '--toToken',leg.address,'--binanceChainId','56','--slippage','0.5','--mev','true','--gasLevel','MEDIUM','--json'],45000);
   }catch(e){throw Error('Order submission uncertain: '+String(e.message)+'. No automatic retry.');}
   if(!/^[0-9]{8,30}$/.test(String(submitted.orderId||'')))
    throw Error('Submission did not return a valid order ID; manually reconcile without retry.');
   leg.submittedOrderId=String(submitted.orderId);
   leg.phase='SUBMITTED';state.phase='RUNNING';
   await persist();
   const found=await locate(leg,leg.submittedOrderId,baseline,started);
   if(!found||found.order?.status!=='FINISHED'){
    leg.phase=found?.order?.status||'ORDER_UNRESOLVED';leg.matchedOrderId=found?.order?.orderId||null;
    throw Error('No verified FINISHED order yet. Basket halted; no next leg or automatic retry.');
   }
   leg.matchedOrderId=found.order.orderId;
   leg.orderIdMatchedBy=found.matchedBy;
   leg.txHash=found.order.txHash;
   leg.phase='ORDER_FINISHED_UNVERIFIED';
   state.phase='RECONCILIATION_INCOMPLETE';
   await persist();
   if(!leg.txHash)throw Error('Finished order has no transaction hash.');
   let proof;
   for(let tries=0;tries<5;tries++){
    try{proof=await settle(leg.txHash,state.account,leg);break;}
    catch(e){if(tries===4)throw e;await sleep(3500);}
   }
   leg.proof=proof;
   leg.phase='SETTLED_VERIFIED';state.phase='RUNNING';state.nextLeg=i+1;state.executedOrders++;
   delete leg.baselineOrderIds;
   await persist();
  }
  state.phase='FINISHED';state.finishedAt=new Date().toISOString();await persist();
 }catch(error){
  state.lastError=String(error instanceof Error?error.message:error).slice(0,380);
  const completed=state.legs.filter(x=>x.phase==='SETTLED_VERIFIED').length;
  const mayHaveSubmitted=state.legs.some(x=>!!x.submissionStartedAt);
  state.phase=completed?'PARTIAL':mayHaveSubmitted?'RECOVERY_REQUIRED':'BLOCKED';
  state.finishedAt=new Date().toISOString();
  await persist();
 }
}
async function reconcile(){
 if(working)throw Error('An execution is already running.');
 if(!['RECOVERY_REQUIRED','PARTIAL','RECONCILIATION_INCOMPLETE'].includes(state.phase))
  throw Error('No unresolved transaction to reconcile.');
 working=true;
 try{
  for(const leg of state.legs){
   if(leg.phase==='SETTLED_VERIFIED'||!leg.submissionStartedAt)continue;
   const found=await locate(leg,leg.submittedOrderId||'',leg.baselineOrderIds||[],Date.parse(leg.submissionStartedAt));
   if(!found?.order||found.order.status!=='FINISHED'||!found.order.txHash)
    throw Error('No uniquely matched finished order. Manual investigation required.');
   leg.matchedOrderId=found.order.orderId;
   leg.orderIdMatchedBy=found.matchedBy;
   leg.txHash=found.order.txHash;
   leg.proof=await settle(leg.txHash,state.account,leg);
   leg.phase='SETTLED_VERIFIED';
   state.executedOrders=state.legs.filter(x=>x.phase==='SETTLED_VERIFIED').length;
   await persist();
  }
  state.phase=state.nextLeg>=state.legs.length-1&&state.legs.every(x=>x.phase==='SETTLED_VERIFIED')?'FINISHED':'PARTIAL';
  state.lastError=state.phase==='PARTIAL'?'Verified settled legs only; remaining unsubmitted legs will NOT run automatically.':null;
  await persist();
 }catch(e){state.phase='RECOVERY_REQUIRED';state.lastError=String(e.message).slice(0,380);await persist();}
 finally{working=false;}
 return state;
}
async function load(){
 try{
  const previous=JSON.parse(await readFile(DATA,'utf8'));
  if(previous&&typeof previous==='object'&&Array.isArray(previous.legs)){
   state=previous;
   if(['RUNNING','SUBMISSION_UNCERTAIN','PREVIEW_READY'].includes(state.phase)){
    state.phase=state.phase==='PREVIEW_READY'?'IDLE':'RECOVERY_REQUIRED';
    state.lastError='Local process restarted. No automatic resubmission; inspect order history before any new execution.';
    await persist();
   }
  }
 }catch(e){if(e.code!=='ENOENT')throw e;}
}
const readBody=async(req)=>{
 let raw='';
 for await(const chunk of req){raw+=chunk.toString();if(raw.length>8000)throw Error('Request too large.');}
 return JSON.parse(raw||'{}');
};
async function start(){
 if(!Number.isInteger(PORT)||PORT<1024||PORT>65535)throw Error('Invalid bridge port.');
 if(!/^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/.test(ORIGIN))throw Error('Bridge origin must be a specific HTTPS origin.');
 await load();
 const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  if(!origin||!CORS.has(origin)||!['127.0.0.1:'+PORT,'localhost:'+PORT].includes(String(req.headers.host))){
   res.writeHead(403,{'Cache-Control':'no-store'});res.end();return;
  }
  if(req.method==='OPTIONS'){ok(res,204,{},origin);return;}
  if(req.url==='/health'&&req.method==='GET'){
   ok(res,200,{kind:'sentinel.baw.local-bridge',bridgeVersion:1,tradingEnabled:ENABLED,scope:CAP},origin);return;
  }
  if(!equal(String(req.headers.authorization||'').replace(/^Bearer /,''),SECRET)){
   ok(res,401,{error:'Local bridge pairing secret required.'},origin);return;
  }
  if(++requestCount>30000){ok(res,429,{error:'Bridge request budget exhausted; restart locally.'},origin);return;}
  try{
   if(req.url==='/state'&&req.method==='GET'){ok(res,200,state,origin);return;}
   if(req.url==='/preview'&&req.method==='POST'){
    if(working){ok(res,409,{error:'Wallet operation in progress.'},origin);return;}
    working=true;
    try{const value=await preview(await readBody(req));ok(res,200,value,origin);}
    finally{working=false;}
    return;
   }
   if(req.url==='/execute'&&req.method==='POST'){ok(res,202,await execute(await readBody(req)),origin);return;}
   if(req.url==='/reconcile'&&req.method==='POST'){ok(res,200,await reconcile(),origin);return;}
   ok(res,404,{error:'Unknown local endpoint.'},origin);
  }catch(e){ok(res,409,{error:String(e.message||'Local wallet operation refused.').slice(0,400),phase:state.phase},origin);}
 });
 server.listen(PORT,'127.0.0.1',()=>{
  console.log('SENTINEL LOCAL BRIDGE / http://127.0.0.1:'+PORT);
  console.log('Origin allowlist: '+[...CORS].join(', '));
  console.log('Trading: '+(ENABLED?'ENABLED — REAL BSC MAINNET PURCHASES':'OFF — QUOTES AND READONLY RECONCILIATION ONLY'));
  console.log('Journal: '+DATA);
  console.log('ONE-TIME LOCAL PAIRING SECRET (paste in Sentinel only; do not share): '+SECRET);
  console.log('Use /sentinel/agent. Never add this secret to Vercel or source control.');
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 start().catch(e=>{console.error('Bridge could not start: '+e.message);process.exitCode=1;});
}
