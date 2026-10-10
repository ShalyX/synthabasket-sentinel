'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {ArrowRight,CheckCircle2,ExternalLink,ShieldAlert,LockKeyhole,RefreshCw} from 'lucide-react';
import {useDesk} from '@/components/sentinel/DeskContext';
import {Eyebrow,TokenMark} from '@/components/sentinel/DeskBits';
import {buildBridgePlan} from '@/lib/sentinel/bridge-plan';
import {formatUsd} from '@/lib/sentinel/model';
import './agent.css';

type Leg={ticker:string;platform:'bstock';address:string;symbol:string;amountUsd:number;
 quote?:{estimatedTokens:string};phase:string;submittedOrderId?:string;matchedOrderId?:string;
 txHash?:string;proof?:{receivedTokenUnits:string;receivedTokenRaw:string;spentUsdtRaw:string;gasWei:string}};
type Run={phase:string;digest?:string;account?:string;totalUsd?:number;expiresAt?:string;
 legs:Leg[];executedOrders?:number;lastError?:string;funding?:{ready:boolean;reason:string}};
type Health={tradingEnabled:boolean;scope:string};
const ENDPOINT='http://127.0.0.1:8787';
const active=(phase:string)=>['RUNNING','SUBMISSION_UNCERTAIN'].includes(phase);

export default function AgenticExecution(){
 const {basket,snapshot,feed}=useDesk();
 const [budget,setBudget]=useState(10);
 const [secret,setSecret]=useState('');
 const [health,setHealth]=useState<Health|null>(null);
 const [bridgeMessage,setBridgeMessage]=useState('');
 const [paired,setPaired]=useState(false);
 const [run,setRun]=useState<Run|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [ack,setAck]=useState(false);
 const [phrase,setPhrase]=useState('');
 const plan=useMemo(()=>buildBridgePlan(basket,snapshot?.tokens??[],budget),[basket,snapshot,budget]);
 const planKey=basket.map(x=>x.ticker+':'+x.platform+':'+x.weight).join('|')+'|'+budget;
 const [reviewedKey,setReviewedKey]=useState('');
 const ask=async(route:string,method:'GET'|'POST'='GET',body?:unknown,timeout=115000):Promise<Run>=>{
  if(!/^[a-f0-9]{64}$/i.test(secret))throw Error('Enter the 64-character secret printed in your local bridge terminal.');
  const response=await fetch(ENDPOINT+route,{method,headers:{
   Authorization:'Bearer '+secret,...(body?{'Content-Type':'application/json'}:{})},
   ...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(timeout),
   targetAddressSpace:'loopback'} as RequestInit);
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'Local Binance wallet operation failed.');
  return result as Run;
 };
 const discover=()=>{
  // Chrome 142+ requires site permission to reach apps on the same computer.
  // Trigger this from the explicit retry button to allow the browser's native prompt.
  setBridgeMessage('');
  fetch(ENDPOINT+'/health',{cache:'no-store',signal:AbortSignal.timeout(7000),
   targetAddressSpace:'loopback'} as RequestInit)
   .then(async r=>{if(!r.ok)throw Error();setHealth(await r.json());setBridgeMessage('');})
   .catch(()=>{setHealth(null);setBridgeMessage('Chrome requires permission to reach services on your own PC. In Chrome, open site settings for this page, set Apps on device (Loopback network) to Allow, then retry.');});
 };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{discover();},[]);
 useEffect(()=>{
  if(!paired||!run||!active(run.phase))return;
  const id=window.setInterval(()=>{
   void ask('/state','GET',undefined,15000).then(setRun).catch(e=>setError(e instanceof Error?e.message:'Bridge disconnected.'));
  },2800);
  return()=>window.clearInterval(id);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[paired,run?.phase,secret]);
 const task=async(fn:()=>Promise<void>)=>{
  setBusy(true);setError('');
  try{await fn();}catch(e){setError(e instanceof Error?e.message:'Bridge unavailable.');}
  finally{setBusy(false);}
 };
 const connect=()=>void task(async()=>{
  setRun(await ask('/state'));setPaired(true);
 });
 const preview=()=>void task(async()=>{
  if(!plan.ok)throw Error(plan.reason);
  if(feed!=='live')throw Error('Signed live BSC inventory required.');
  const r=await ask('/preview','POST',plan.value);
  setRun(r);setReviewedKey(planKey);setAck(false);setPhrase('');
 });
 const execute=()=>void task(async()=>{
  if(!run?.digest||run.phase!=='PREVIEW_READY'||reviewedKey!==planKey||!ack||phrase!=='EXECUTE BASKET')
   throw Error('Basket changed, expired or was not explicitly confirmed.');
  const accepted=await ask('/execute','POST',{confirmation:phrase,digest:run.digest},20000);
  setRun(previous=>previous?{...previous,...accepted}:accepted);
  setAck(false);setPhrase('');
 });
 const reconcile=()=>void task(async()=>setRun(await ask('/reconcile','POST',{})));
 const unknown=run&&['RECOVERY_REQUIRED','RECONCILIATION_INCOMPLETE','PARTIAL'].includes(run.phase);
 const quoteReady=run?.phase==='PREVIEW_READY'&&reviewedKey===planKey&&Date.now()<Date.parse(run.expiresAt||'');
 return <div className="desk-wrap desk-internal-page desk-baw">
  <div className="desk-breadcrumb"><Link href="/sentinel/baskets">BASKET STUDIO</Link><span>→</span><Link href="/sentinel/review">EXECUTION REVIEW</Link><span>→</span><b>AGENTIC EXECUTION</b></div>
  <header className="desk-page-head desk-baw-hero"><div>
   <Eyebrow>ROOM 07 / BINANCE AGENTIC WALLET</Eyebrow>
   <h1>One basket.<br/><em>Actual delivery.</em></h1>
   <p>Sentinel plans every leg. Binance Agentic Wallet runs locally on your PC and submits only the basket you explicitly approve. Sentinel verifies each settled transfer before advancing.</p>
  </div><div className="desk-baw-lock"><LockKeyhole size={25}/><b>LOCAL WALLET</b><small>NO CLOUD KEYS · BSC MAINNET</small></div></header>
  <div className="desk-baw-ribbon"><span>BINANCE WALLET ADAPTER</span><span>0.5% SLIPPAGE</span><span>$25 MAX BASKET · BSTOCKS ONLY</span></div>
  <div className="desk-baw-layout"><div>
   <section className="desk-baw-panel">
    <span className="desk-baw-step">01 / PAIR YOUR LOCAL WALLET</span><h2>Connect the bridge.</h2>
    <p>Run <code>npm run bridge:baw</code> on this PC. Enter the secret printed by that process. It is sent only to <code>127.0.0.1</code>—never to Vercel. The separate local bridge must be explicitly enabled for real spending.</p>
    <p className="desk-baw-state">{health?'LOCAL BRIDGE DETECTED · '+(health.tradingEnabled?'LIVE TRADING ENABLED':'QUOTE-ONLY MODE'):'LOCAL BRIDGE NOT ACCESSIBLE YET'}</p>
    {!health&&<p className="desk-baw-note">{bridgeMessage||'Start the local process. Chrome may show an Apps on device permission prompt.'} <button type="button" className="desk-baw-retry" onClick={discover}>Check local bridge / request browser access <RefreshCw size={14}/></button></p>}
    <div className="desk-baw-pair"><input type="password" aria-label="Local bridge secret" spellCheck={false} autoComplete="off" placeholder="64-character local pairing secret" value={secret} onChange={e=>{setSecret(e.target.value.trim());setPaired(false);setRun(null);}}/>
     <button type="button" disabled={busy||!health} onClick={connect}>{paired?'Refresh':'Pair bridge'} <ArrowRight size={15}/></button></div>
    {paired&&<p className="desk-baw-valid"><CheckCircle2 size={16}/> Authenticated locally. No wallet credentials were sent to the hosted app.</p>}
   </section>
   <section className="desk-baw-panel">
    <span className="desk-baw-step">02 / INSTRUCT THE AGENT</span><h2>Exactly what will be bought.</h2>
    <label className="desk-baw-label">BASKET SPENDING CAP</label>
    <div className="desk-baw-budget"><span>$</span><input type="number" min={1} max={25} step="0.01" value={budget} onChange={e=>setBudget(Math.max(1,Math.min(25,Math.round((Number(e.target.value)||1)*100)/100)))}/><small>USDT · BSC 56</small></div>
    {plan.ok?plan.value.legs.map((leg,i)=>{
     const token=snapshot?.tokens.find(x=>x.ticker===leg.ticker&&x.platform===leg.platform);
     return <div className="desk-baw-leg" key={leg.address}><span>{String(i+1).padStart(2,'0')}</span><TokenMark token={token}/>
       <div><strong>{leg.ticker}</strong><small>{leg.symbol} · bStocks</small><code>{leg.address}</code></div><b>{formatUsd(leg.amountUsd)}</b></div>;
    }):<p className="desk-baw-error"><ShieldAlert size={16}/>{plan.reason} <Link href="/sentinel/baskets">Edit basket →</Link></p>}
    <button className="desk-baw-preview" type="button" disabled={!paired||busy||!plan.ok||feed!=='live'||!!run&&active(run.phase)||!!unknown} onClick={preview}><RefreshCw size={16}/> Request wallet preflight and fresh quotes</button>
    <p className="desk-baw-note">Read-only preview checks issuer inventory, wallet status, balances and each official quote. No trades or approvals occur at this stage.</p>
   </section>
   {run&&run.legs?.length>0&&<section className="desk-baw-panel">
    <div className="desk-baw-run-header"><span className="desk-baw-step">03 / SIGNED EXECUTION WORKFLOW</span><b>{run.phase.replaceAll('_',' ')}</b></div>
    <h2>One leg at a time.</h2>
    <p>Signer: <code>{run.account}</code>. Total instruction: <strong>{formatUsd(run.totalUsd??0)}</strong>. {run.account&&<Link href={'/sentinel/watch?address='+run.account} className="desk-baw-watch-link">Watch this Agentic Wallet's on-chain basket ↗</Link>}</p>
    {run.legs.map((leg,i)=><div className="desk-baw-proof" key={leg.address}>
     <div><strong>{String(i+1).padStart(2,'0')} / {leg.ticker}</strong><b>{leg.phase.replaceAll('_',' ')}</b></div>
     <p>{formatUsd(leg.amountUsd)} USDT → Binance quoted {leg.quote?.estimatedTokens||'—'} {leg.symbol} indication (may be normalized share equivalents, not raw tokens)</p>
     {leg.submittedOrderId&&<small>Submitted ID: <code>{leg.submittedOrderId}</code> {leg.matchedOrderId&&leg.matchedOrderId!==leg.submittedOrderId?'· matched Binance ID: '+leg.matchedOrderId:''}</small>}
     {leg.txHash&&<a href={'https://bscscan.com/tx/'+leg.txHash} target="_blank" rel="noreferrer">View BSC transaction <ExternalLink size={13}/></a>}
     {leg.proof&&<p className="desk-baw-valid"><CheckCircle2 size={16}/><b>{leg.proof.receivedTokenUnits} actual {leg.symbol} tokens received · independently verified</b></p>}
    </div>)}
    {quoteReady&&<div className="desk-baw-approval">
     <strong>Approve actual mainnet spending</strong>
     <p className={run.funding?.ready?'desk-baw-valid':'desk-baw-error'}>{run.funding?.ready?'FUNDS OBSERVED: ':'FUNDING NOT CLEARED: '}{run.funding?.reason||'No wallet funding verification.'}</p>
     <p>This authorizes up to {formatUsd(run.totalUsd??0)} USDT across the displayed contracts, plus BNB gas. A Binance swap may create an unlimited token allowance. A partially filled basket is possible; ambiguous or failed legs stop the remaining orders. Quotes don't establish issuer eligibility.</p>
     <p>Review expires: {run.expiresAt?new Date(run.expiresAt).toLocaleTimeString():'—'}</p>
     <label><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/> I approve this exact basket and confirm I am eligible to trade these tokens.</label>
     <label className="desk-baw-label" htmlFor="baw-phrase">TYPE EXECUTE BASKET</label>
     <input id="baw-phrase" value={phrase} onChange={e=>setPhrase(e.target.value)} placeholder="EXECUTE BASKET"/>
     <button className="desk-baw-live" type="button" disabled={busy||!health?.tradingEnabled||!run.funding?.ready||!ack||phrase!=='EXECUTE BASKET'} onClick={execute}>Execute approved basket <ArrowRight size={16}/></button>
     {!health?.tradingEnabled&&<p className="desk-baw-note">Live mode is disabled on your PC; the preview cannot execute until you deliberately restart the bridge in live mode and obtain a new preview.</p>}
    </div>}
    {run.phase==='FINISHED'&&<p className="desk-baw-valid"><CheckCircle2 size={18}/> All {run.executedOrders} legs have verified Binance settlement and independent BSC transfer evidence.</p>}
    {unknown&&<div className="desk-baw-error"><ShieldAlert size={18}/><div><strong>Execution stopped. No automatic retries.</strong><p>{run.lastError}</p><button type="button" disabled={busy} onClick={reconcile}>Retry read-only reconciliation</button></div></div>}
    {active(run.phase)&&<p className="desk-baw-note">Local agent running. It continues independently if the browser closes; reconnect to check progress. Do not submit a duplicate trade.</p>}
   </section>}
   {error&&<p className="desk-baw-error" role="alert"><ShieldAlert size={18}/>{error}</p>}
  </div><aside className="desk-baw-side"><span className="desk-baw-step">THE EXECUTION CONTRACT</span>
   <h2>Plans are not purchases.<br/><em>Receipts are.</em></h2>
   <p>The deployed website never possesses the wallet session. The local bridge independently checks the plan against live issuer inventory and the connected Agentic Wallet.</p>
   <div><b>01 / AUTHORIZE</b><p>Origin-restricted loopback bridge, private pairing secret and explicit basket-level spend confirmation.</p></div>
   <div><b>02 / TRANSACT</b><p>One BSC stock leg at a time, with fresh wallet quotes and a durable journal before every submission.</p></div>
   <div><b>03 / RECOVER</b><p>No retries when Binance order IDs differ, submissions time out or transaction status remains uncertain.</p></div>
   <div><b>04 / VERIFY</b><p>Only Binance FINISHED orders and two independently agreeing BSC transaction receipts advance the agent.</p></div>
   <Link href="/sentinel/baskets">Adjust basket <ArrowRight size={14}/></Link>
   <Link href="/sentinel/watch">Portfolio Watch <ArrowRight size={14}/></Link>
  </aside></div>
 </div>;
}