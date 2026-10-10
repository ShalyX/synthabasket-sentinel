'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,CheckCircle2,LoaderCircle,RefreshCw,ShieldAlert} from 'lucide-react';
import {useWallet,type WalletUnsignedTx} from './WalletContext';
import {reconcileTransaction,type Reconciliation} from '@/lib/sentinel/transaction-reconciler';

type Leg={ticker:string;platform:'bstock'|'ondo';amountUsd:number};
type Reviewed={
 kind:'sentinel.bsc.execution-review';phase:'APPROVAL_REQUIRED'|'SWAP_READY'|'BLOCKED';
 chainId:56;sender:string;to:string;spender:string;tokenContract:string;
 ticker:string;symbol:string;issuer:string;amountUsd:number;amountRaw:string;
 slippagePercent:number;priceImpactPercent:number;reason:string;expiresAt:string;simulatorPassed:boolean;
 approval?:{to:string;data:string;value:'0x0'};
 swap?:{to:string;data:string;value:'0x0';gas:string};
 routeTrust:'AUTHENTICATED_BINANCE_BUILD';independentlyDecoded:false;
 eligibility:{state:'USER_ATTESTED';reason:string};
};
type Submitted={hash:string;target:string;sender:string;input:string;type:'approval'|'swap';status:string;block?:string;
 ticker:string;platform:'bstock'|'ondo';tokenContract:string};
type Settlement={status:string;confirmations?:string;stateBalances?:{status:string;usdtNetDecrease?:string;issuerNetIncrease?:string};
 transferLogs?:{usdtSentRaw:string;issuerReceivedRaw:string}};
const waiting=(status:Reconciliation['status']|undefined)=>!status||['PENDING','UNAVAILABLE','RECEIPT_ONLY','SETTLEMENT_INCOMPLETE'].includes(status);

export function ExecutionAuthorization({legs,enabled,operationKey}:{legs:Leg[];enabled:boolean;operationKey:string}){
 const wallet=useWallet();
 const [index,setIndex]=useState(0);
 const [review,setReview]=useState<Reviewed|null>(null);
 const [busy,setBusy]=useState(false);
 const [riskAck,setRiskAck]=useState(false);
 const [err,setErr]=useState<string|null>(null);
 const [submitted,setSubmitted]=useState<Submitted|null>(null);
 const [settlement,setSettlement]=useState<Settlement|null>(null);
 const [reconciled,setReconciled]=useState<Reconciliation|null>(null);
 const [now,setNow]=useState(0);
 const [pollAttempt,setPollAttempt]=useState(0);
 const operation=useRef(operationKey);operation.current=operationKey;
 const abort=useRef<AbortController|null>(null);
 const leg=legs[index];

 useEffect(()=>{
  abort.current?.abort();setIndex(0);setReview(null);setErr(null);setRiskAck(false);setSubmitted(null);
  setSettlement(null);setReconciled(null);setPollAttempt(0);
 },[operationKey]);
 useEffect(()=>{setReview(null);setErr(null);setSubmitted(null);setSettlement(null);setReconciled(null);setPollAttempt(0);},[index]);
 useEffect(()=>{setNow(Date.now());const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id);},[]);

 const scoped=review&&leg&&wallet.address&&wallet.ready&&review.sender.toLowerCase()===wallet.address.toLowerCase()&&
  review.ticker===leg.ticker&&review.issuer===leg.platform&&review.amountUsd===leg.amountUsd?review:null;
 const live=!!scoped&&Date.parse(scoped.expiresAt)>now+2000;
 const signable=enabled&&!busy&&!!scoped&&live&&!submitted&&
  (scoped.phase==='APPROVAL_REQUIRED'&&!!scoped.approval||scoped.phase==='SWAP_READY'&&!!scoped.swap);
 const finished=reconciled?.status==='PURCHASE_VERIFIED'&&index===legs.length-1;

 async function prepare(){
  if(!enabled||!riskAck||!leg||busy)return;
  const key=operationKey,controller=new AbortController();
  abort.current?.abort();abort.current=controller;
  setBusy(true);setErr(null);setReview(null);setSubmitted(null);setSettlement(null);setReconciled(null);setPollAttempt(0);
  try{
   const response=await fetch('/api/sentinel/authorize',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ticker:leg.ticker,platform:leg.platform,amountUsd:leg.amountUsd,walletAddress:wallet.address,
     attestations:{issuerEligibility:true,providerRouteTrust:true}}),
    cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(55000)])});
   const value=await response.json();
   if(controller.signal.aborted||operation.current!==key)return;
   if(!response.ok||value.kind!=='sentinel.bsc.execution-review')throw Error(value.error||value.reason||'Unable to prepare this purchase.');
   setReview(value as Reviewed);
  }catch(e){if(!controller.signal.aborted&&operation.current===key)
   setErr(e instanceof Error?e.message:'Purchase preparation failed.');}
  finally{if(abort.current===controller){abort.current=null;setBusy(false);}}
 }

 async function sign(){
  if(!signable||!scoped)return;
  const key=operationKey,phase=scoped.phase,tx=phase==='APPROVAL_REQUIRED'?scoped.approval:scoped.swap;
  if(!tx)return;
  setBusy(true);setErr(null);
  try{
   // This click is the authorization boundary. Read-only checks and receipt monitoring may be automatic; signatures never are.
   const transaction:WalletUnsignedTx={to:tx.to,data:tx.data,value:'0x0',
    ...(phase==='SWAP_READY'?{gas:'0x'+BigInt((tx as NonNullable<Reviewed['swap']>).gas).toString(16)}:{})};
   const hash=await wallet.submitReviewedTransaction(transaction,Date.parse(scoped.expiresAt));
   if(operation.current!==key)return;
   setSubmitted({hash,target:tx.to,sender:scoped.sender,input:tx.data,type:phase==='SWAP_READY'?'swap':'approval',
    status:'PENDING',ticker:scoped.ticker,platform:scoped.issuer as 'bstock'|'ondo',tokenContract:scoped.tokenContract});
   setReview(null);setPollAttempt(0);
  }catch(e){if(operation.current===key)setErr(e instanceof Error?e.message:'Wallet request failed or was rejected.');}
  finally{setBusy(false);}
 }

 async function verify(){
  if(!submitted||busy)return;
  const key=operationKey,set=submitted;setBusy(true);setErr(null);
  try{
   const response=await fetch('/api/sentinel/receipt',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({hash:set.hash,sender:set.sender,target:set.target,data:set.input}),cache:'no-store'});
   const value=await response.json();
   if(operation.current!==key)return;
   if(!response.ok)throw Error(value.error||'Receipt verification unavailable.');
   setSubmitted({...set,status:String(value.status),block:typeof value.blockNumber==='string'?value.blockNumber:undefined});
   let settlementEvidence:unknown;
   if(set.type==='swap'&&value.status==='MINED_SUCCESS'){
    const settlementResponse=await fetch('/api/sentinel/settlement',{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({hash:set.hash,sender:set.sender,target:set.target,ticker:set.ticker,platform:set.platform}),cache:'no-store'});
    settlementEvidence=await settlementResponse.json();
    if(operation.current!==key)return;
    const evidence=settlementEvidence as Record<string,unknown>;
    setSettlement({status:String(evidence.status||'UNAVAILABLE'),
     confirmations:typeof evidence.confirmations==='string'?evidence.confirmations:undefined,
     stateBalances:evidence.stateBalances as Settlement['stateBalances'],
     transferLogs:evidence.transferLogs as Settlement['transferLogs']});
   }
   const proof=reconcileTransaction({hash:set.hash,sender:set.sender,target:set.target,kind:set.type,
    ticker:set.ticker,platform:set.platform,tokenContract:set.tokenContract},value,settlementEvidence);
   setReconciled(proof);
   if(waiting(proof.status)&&pollAttempt<36)setPollAttempt(n=>n+1);
  }catch(e){
   if(operation.current===key){setErr(e instanceof Error?e.message:'Receipt lookup failed.');if(pollAttempt<12)setPollAttempt(n=>n+1);}
  }finally{setBusy(false);}
 }

 // All non-signing work is automatic after the single basket acknowledgement.
 useEffect(()=>{
  if(enabled&&riskAck&&leg&&!busy&&!review&&!submitted&&!reconciled&&!err)void prepare();
 },[enabled,riskAck,index,busy,review,submitted,reconciled,err]);
 useEffect(()=>{
  if(scoped&&!live&&!busy&&!submitted){setReview(null);setErr(null);}
 },[live,scoped,busy,submitted]);
 useEffect(()=>{
  if(!submitted||busy||!waiting(reconciled?.status)||pollAttempt>=36)return;
  const delay=submitted.status==='PENDING'?4000:8000;
  const id=window.setTimeout(()=>void verify(),delay);return()=>window.clearTimeout(id);
 },[submitted?.hash,submitted?.status,busy,reconciled?.status,pollAttempt]);
 useEffect(()=>{
  if(reconciled?.status!=='APPROVAL_MINED')return;
  const id=window.setTimeout(()=>{setSubmitted(null);setSettlement(null);setReconciled(null);setPollAttempt(0);},900);
  return()=>window.clearTimeout(id);
 },[reconciled?.status]);
 useEffect(()=>{
  if(reconciled?.status!=='PURCHASE_VERIFIED'||index>=legs.length-1)return;
  const id=window.setTimeout(()=>setIndex(i=>i+1),1200);return()=>window.clearTimeout(id);
 },[reconciled?.status,index,legs.length]);

 return <section className="desk-auth-panel product-auto-buy" aria-label="Automatic checkout with wallet authorization">
  <div className="desk-auth-header"><span>BUY WITH BROWSER WALLET</span><h2>We prepare it. <em>You approve it.</em></h2>
   <p>Sentinel automatically checks the current route, allowance, simulation and settlement. Your wallet still asks you before every on-chain approval or purchase.</p></div>

  {!riskAck&&<label className="desk-auth-ack product-consent"><input type="checkbox" checked={riskAck} disabled={!enabled}
   onChange={e=>{setRiskAck(e.target.checked);setErr(null);}}/>
   I confirm I am eligible to trade every selected issuer product and accept the authenticated Binance-built route. Route details remain available below.</label>}

  {!enabled&&<p className="desk-auth-warning">Connect a funded wallet on BSC. Sentinel will then finish the read-only checks automatically.</p>}
  {enabled&&riskAck&&busy&&!submitted&&<div className="product-auto-state"><LoaderCircle className="desk-spin" size={18}/><span>Preparing {leg?.ticker||'your purchase'} automatically…</span></div>}

  {scoped&&<div className="desk-auth-review">
   <div className="desk-auth-state"><ShieldAlert size={18}/><strong>{scoped.phase==='APPROVAL_REQUIRED'?'ONE-TIME TOKEN APPROVAL':'READY TO BUY'}</strong></div>
   <p>{scoped.phase==='APPROVAL_REQUIRED'?
    `Your wallet must first allow exactly $${scoped.amountUsd.toFixed(2)} USDT. Sentinel will detect confirmation and prepare the purchase automatically.`:
    `The live route is ready. Your wallet will be asked to buy $${scoped.amountUsd.toFixed(2)} of ${scoped.symbol}.`}</p>
   <div className="product-action-summary"><span>{scoped.ticker} · {scoped.issuer==='bstock'?'bStocks':'Ondo'}</span><b>${scoped.amountUsd.toFixed(2)}</b></div>
   <button type="button" className="desk-auth-button" disabled={!signable} onClick={()=>void sign()}>
    {scoped.phase==='APPROVAL_REQUIRED'?`Approve exactly $${scoped.amountUsd.toFixed(2)} USDT in wallet`:`Buy $${scoped.amountUsd.toFixed(2)} of ${scoped.symbol}`} <ArrowRight size={16}/>
   </button>
   <details className="product-advanced-details"><summary>Route and issuer details</summary><dl>
    <div><dt>ISSUER TOKEN</dt><dd>{scoped.symbol} · {scoped.tokenContract}</dd></div>
    <div><dt>ROUTER / SPENDER</dt><dd>{scoped.to} / {scoped.spender}</dd></div>
    <div><dt>SIMULATION</dt><dd>{scoped.simulatorPassed?'PASSED':'APPROVAL REQUIRED FIRST'}</dd></div>
    <div><dt>TRUST MODEL</dt><dd>Authenticated Binance build; nested calls not independently decoded</dd></div>
    <div><dt>FRESH UNTIL</dt><dd>{new Date(scoped.expiresAt).toLocaleTimeString()}</dd></div>
   </dl></details>
  </div>}

  {submitted&&<div className="desk-auth-receipt">
   {reconciled?.status==='PURCHASE_VERIFIED'?<CheckCircle2 size={20}/>:<LoaderCircle className={busy?'desk-spin':''} size={20}/>}<div>
    <b>{reconciled?.status==='PURCHASE_VERIFIED'?'Purchase verified':submitted.type==='approval'?'Approval submitted':'Purchase submitted'}</b>
    <p>{reconciled?.status==='PURCHASE_VERIFIED'?'Issuer-token delivery and USDT debit were verified on BSC.':
     'Sentinel is monitoring BSC automatically. Do not resubmit while this transaction is pending.'}</p>
    <a href={'https://bscscan.com/tx/'+submitted.hash} target="_blank" rel="noreferrer">View transaction on BscScan ↗</a>
    {reconciled&&reconciled.status!=='PENDING'&&reconciled.status!=='PURCHASE_VERIFIED'&&<p>{reconciled.reason}</p>}
    {settlement&&<small>{settlement.confirmations||'0'} confirmations · settlement {settlement.status.toLowerCase().replaceAll('_',' ')}</small>}
    {err&&<button type="button" onClick={()=>{setErr(null);setPollAttempt(n=>n+1);}} disabled={busy}><RefreshCw size={13}/> Retry automatic verification</button>}
   </div>
  </div>}

  {finished&&<div className="product-purchase-complete"><CheckCircle2 size={24}/><div><strong>Basket purchase complete.</strong><p>Every selected leg has verified on-chain delivery.</p></div>
   <Link href="/sentinel/portfolio">View portfolio <ArrowRight size={15}/></Link></div>}
  {err&&!submitted&&<p className="desk-auth-error" role="alert">{err} <button type="button" onClick={()=>setErr(null)}>Try again</button></p>}
  <details className="product-advanced-details product-auto-disclosure"><summary>What Sentinel automates—and what it cannot</summary>
   <p>Automatic: live route construction, contract and amount checks, allowance detection, simulation, receipt polling, token-delivery verification and advancing to the next leg. Manual: issuer eligibility acknowledgement and every wallet signature. Eligibility is user-attested, and nested LiquidMesh instructions are provider-trusted rather than independently decoded.</p></details>
 </section>;
}
