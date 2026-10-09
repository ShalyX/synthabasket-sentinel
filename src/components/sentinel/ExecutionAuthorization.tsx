'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,LockKeyhole,RefreshCw,ShieldAlert} from 'lucide-react';
import {useWallet,type WalletUnsignedTx} from './WalletContext';

type Leg={ticker:string;platform:'bstock'|'ondo';amountUsd:number};
type Reviewed={
 kind:'sentinel.bsc.execution-review';phase:'APPROVAL_REQUIRED'|'SWAP_READY'|'BLOCKED';
 chainId:56;sender:string;to:string;spender:string;tokenContract:string;
 ticker:string;symbol:string;issuer:string;amountUsd:number;amountRaw:string;
 slippagePercent:number;priceImpactPercent:number;reason:string;expiresAt:string;simulatorPassed:boolean;
 approval?:{to:string;data:string;value:'0x0'};
 swap?:{to:string;data:string;value:'0x0';gas:string};
};
type Submitted={hash:string;target:string;sender:string;type:'approval'|'swap';status:string;block?:string};
export function ExecutionAuthorization({legs,enabled,operationKey}:{legs:Leg[];enabled:boolean;operationKey:string}){
 const wallet=useWallet();
 const [index,setIndex]=useState(0);
 const [review,setReview]=useState<Reviewed|null>(null);
 const [busy,setBusy]=useState(false);
 const [ack,setAck]=useState(false);
 const [err,setErr]=useState<string|null>(null);
 const [submitted,setSubmitted]=useState<Submitted|null>(null);
 const [now,setNow]=useState(0);
 const operation=useRef(operationKey);operation.current=operationKey;
 const abort=useRef<AbortController|null>(null);
 const leg=legs[index];
 useEffect(()=>{abort.current?.abort();setReview(null);setErr(null);setAck(false);setSubmitted(null);},[operationKey,index]);
 useEffect(()=>{setNow(Date.now());const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id);},[]);
 const scoped=review&&leg&&wallet.address&&wallet.ready&&review.sender.toLowerCase()===wallet.address.toLowerCase()&&
  review.ticker===leg.ticker&&review.issuer===leg.platform&&review.amountUsd===leg.amountUsd?review:null;
 const live=!!scoped&&Date.parse(scoped.expiresAt)>now+2000;
 const signable=enabled&&!busy&&!!scoped&&live&&ack&&!submitted&&
  (scoped.phase==='APPROVAL_REQUIRED'&&!!scoped.approval||scoped.phase==='SWAP_READY'&&!!scoped.swap);
 async function prepare(){
  if(!enabled||!leg||busy)return;
  const key=operationKey,controller=new AbortController();
  abort.current?.abort();abort.current=controller;
  setBusy(true);setErr(null);setReview(null);setAck(false);setSubmitted(null);
  try{
   const response=await fetch('/api/sentinel/authorize',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ticker:leg.ticker,platform:leg.platform,amountUsd:leg.amountUsd,walletAddress:wallet.address}),
    cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(55000)])});
   const value=await response.json();
   if(controller.signal.aborted||operation.current!==key)return;
   if(!response.ok||value.kind!=='sentinel.bsc.execution-review')throw Error(value.error||value.reason||'Unable to prepare authorization.');
   setReview(value as Reviewed);
  }catch(e){if(!controller.signal.aborted&&operation.current===key)
   setErr(e instanceof Error?e.message:'Execution authorization failed.');}
  finally{if(abort.current===controller){abort.current=null;setBusy(false);}}
 }
 async function sign(){
  if(!signable||!scoped)return;
  const key=operationKey,phase=scoped.phase,tx=phase==='APPROVAL_REQUIRED'?scoped.approval:scoped.swap;
  if(!tx)return;
  setBusy(true);setErr(null);
  try{
   // Only click-to-request. No automatic sequence, no auto-approval after a mined swap.
   const transaction:WalletUnsignedTx={to:tx.to,data:tx.data,value:'0x0',
    ...(phase==='SWAP_READY'?{gas:'0x'+BigInt((tx as NonNullable<Reviewed['swap']>).gas).toString(16)}:{})};
   const hash=await wallet.submitReviewedTransaction(transaction,Date.parse(scoped.expiresAt));
   if(operation.current!==key)return;
   setSubmitted({hash,target:tx.to,sender:scoped.sender,type:phase==='SWAP_READY'?'swap':'approval',status:'PENDING'});
   setReview(null);setAck(false);
  }catch(e){if(operation.current===key)setErr(e instanceof Error?e.message:'Wallet request failed or was rejected.');}
  finally{setBusy(false);}
 }
 async function verify(){
  if(!submitted||busy)return;
  const key=operationKey,set=submitted;setBusy(true);setErr(null);
  try{
   const response=await fetch('/api/sentinel/receipt',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({hash:set.hash,sender:set.sender,target:set.target}),cache:'no-store'});
   const value=await response.json();
   if(operation.current!==key)return;
   if(!response.ok)throw Error(value.error||'Receipt verification unavailable.');
   setSubmitted({...set,status:String(value.status),block:typeof value.blockNumber==='string'?value.blockNumber:undefined});
  }catch(e){if(operation.current===key)setErr(e instanceof Error?e.message:'Receipt lookup failed.');}
  finally{setBusy(false);}
 }
 return <section className="desk-auth-panel" aria-label="Human-authorized execution">
  <div className="desk-auth-header"><span>04 / WALLET-OWNED AUTHORIZATION</span><h2>Only you can <em>authorize the spend.</em></h2>
   <p>Each leg requires its own fresh quote, independently allowed router and spender, public funding checks and a separate wallet confirmation. No automatic order chain.</p></div>
  <label className="desk-auth-leg">EXECUTION LEG
   <select value={index} disabled={busy} onChange={e=>setIndex(Number(e.target.value))}>
    {legs.map((x,i)=><option key={x.ticker+':'+x.platform} value={i}>{x.ticker} · {x.platform==='bstock'?'bStocks':'Ondo'} · ${x.amountUsd.toFixed(2)} USDT</option>)}
   </select>
  </label>
  <button type="button" className="desk-auth-button" disabled={!enabled||busy||!leg} onClick={()=>void prepare()}>
   {busy?<RefreshCw size={17}/>:<LockKeyhole size={17}/>} Review fresh wallet action <ArrowRight size={16}/>
  </button>
  {!enabled&&<p className="desk-auth-warning">Connect on BSC, select a valid basket and stop any active simulation before reviewing a live action.</p>}
  {scoped&&<div className="desk-auth-review">
   <div className="desk-auth-state"><ShieldAlert size={18}/><strong>{scoped.phase.replace('_',' ')}</strong></div>
   <p>{scoped.reason}</p>
   <dl>
    <div><dt>AMOUNT</dt><dd>${scoped.amountUsd.toFixed(2)} USDT</dd></div>
    <div><dt>ISSUER TOKEN</dt><dd>{scoped.symbol} · {scoped.tokenContract}</dd></div>
    <div><dt>SWAP ROUTER</dt><dd>{scoped.to}</dd></div>
    <div><dt>APPROVAL SPENDER</dt><dd>{scoped.spender}</dd></div>
    <div><dt>SIMULATION</dt><dd>{scoped.simulatorPassed?'PASSED':'NOT PASSED — approval only'}</dd></div>
    <div><dt>FRESH UNTIL</dt><dd>{new Date(scoped.expiresAt).toLocaleTimeString()} {live?'':'· EXPIRED'}</dd></div>
   </dl>
   {scoped.phase==='APPROVAL_REQUIRED'&&<p className="desk-auth-warning">An exact-size USDT approval is NOT a purchase. Permission may persist if the swap is not submitted. Revoke it independently if unused; refresh this review after mining.</p>}
   {scoped.phase==='SWAP_READY'&&<p className="desk-auth-warning">The wallet will be asked to submit a real BSC mainnet swap. The quote is short-lived. The simulator cannot guarantee the final execution price or token delivery.</p>}
   <label className="desk-auth-ack"><input type="checkbox" checked={ack} disabled={!live||busy} onChange={e=>setAck(e.target.checked)}/>
    I understand this is a real BSC mainnet {scoped.phase==='APPROVAL_REQUIRED'?'USDT allowance approval':'USDT purchase'}, not a simulation.</label>
   <button type="button" className="desk-auth-button" disabled={!signable} onClick={()=>void sign()}>
    {scoped.phase==='APPROVAL_REQUIRED'?'Ask wallet to approve exactly ':'Ask wallet to spend '}${scoped.amountUsd.toFixed(2)} USDT
   </button>
  </div>}
  {submitted&&<div className="desk-auth-receipt">
   <ShieldAlert size={19}/><div><b>Wallet returned a transaction hash · {submitted.status}</b>
    <p>{submitted.type==='approval'?'Allowance transaction':'Swap transaction'} · mined success is not issuer-token delivery verification.</p>
    <a href={'https://bscscan.com/tx/'+submitted.hash} target="_blank" rel="noreferrer">{submitted.hash.slice(0,18)}…{submitted.hash.slice(-8)} ↗</a>
    <button type="button" onClick={()=>void verify()} disabled={busy}>Verify receipt on BSC</button>
   </div>
  </div>}
  {err&&<p className="desk-auth-error" role="alert">{err}</p>}
  <p className="desk-auth-footnote">Execution is disabled until the operator explicitly enables live spending and independently verifies router, spender and swap-function selector. No auto-approval, infinite allowance, custody or unattended signatures. Onchain trade receipts and position accounting remain separate evidence.</p>
 </section>;
}
