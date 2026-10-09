'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {useWallet} from '@/components/sentinel/WalletContext';
import {WalletControls} from '@/components/sentinel/WalletControls';
import {ExecutionAuthorization} from '@/components/sentinel/ExecutionAuthorization';
import {ArrowLeft,ArrowRight,CheckCircle2,Clock3,LockKeyhole,RefreshCw,ShieldAlert,ShieldCheck,TriangleAlert,XCircle} from 'lucide-react';
import {useDesk} from '@/components/sentinel/DeskContext';
import {Eyebrow,TokenMark,BlankState} from '@/components/sentinel/DeskBits';
import {amountFor} from '@/lib/sentinel/basket';
import {basketEvidenceKey} from '@/lib/sentinel/journey-evidence';
import {planRehearsal,rehearse,expireRehearsal,recoveryDecision,type Rehearsal} from '@/lib/sentinel/execution-orchestrator';
import {formatUsd} from '@/lib/sentinel/model';
import {preflightHeadline,requiresFundingReadout} from '@/lib/sentinel/preflight-presentation';
import {
 SIMULATION_MAX_LEG_USDT,SIMULATION_MAX_BASKET_USDT,validAddress
} from '@/lib/sentinel/execution-preflight';

interface SimulatedLeg {
 kind:'sentinel.bsc.sandbox-preflight';
 ticker:string;
 platform:'bstock'|'ondo';
 symbol:string;
 amountUsd:number;
 quotedTokenAmount:number;
 normalizedShareUnits:number|null;
 routeMode:'SWAP';
 routeVendor:string;
 priceImpactPct:number;
 maxSlippagePercent:number;
 gasLimit:string|null;
 approvalTarget:string|null;
 builtTransaction:{present:boolean;dataBytes:number;nonzeroNativeValue:boolean};
 simulation:{
  status:'PASS'|'BLOCKED'|'UNKNOWN'|'EXPIRED';
  reportedStatus:string;
  reason:string|null;
  balanceChangeCount:number;
  allowanceChangeCount:number;
  unexpectedApprovalIncrease:boolean;
 };
 state:'SIMULATION_PASSED'|'NOT_READY';
 inspectedAt:string;
 expiresAt:string;
 executed:false;
 tradeAuthorized:false;
 signatureRequested:false;
 approvalsRequested:false;
 broadcastRequested:false;
}
type Observation={ticker:string;status:'running'|'pass'|'blocked';receipt?:SimulatedLeg;reason?:string};
interface WalletBalances {
 kind:'sentinel.bsc.readonly-wallet-balances';
 chainId:56;
 bnbBalance:string;
 usdtBalance:string;
 bnbPresent:boolean;
 usdtCoversAmount:boolean;
 checkedAmountUsd:number;
 checkedAt:string;
 allowanceChecked:boolean;
 allowanceState:'NOT_REQUESTED'|'VERIFIED'|'UNAVAILABLE';
 allowanceSnapshots:{spender:string;requiredUsdt:string;approvedUsdt:string;coversRequired:boolean}[];
 gasAdequacyChecked:false;
 gasPriceGwei:string|null;
 estimatedSwapGasBnb:string|null;
 bnbCoversBufferedSwapEstimate:boolean|null;
 gasEstimateAvailable:boolean;
 estimateScope:'LAST_BUILT_SWAP_LEG'|'UNAVAILABLE';
 stressScenarioGasLimit:3000000;
 stressScenarioBnb:string|null;
 bnbCoversStressScenario:boolean|null;
 noTransactions:true;
}
type AllowanceInput={spender:string;amountUsd:number};
type BalanceCheck={sessionKey:string;walletAddress:string;amountUsd:number;gasLimit:string|null;allowanceKey:string;data:WalletBalances};

const fmt=(n:number|null,d=8)=>n==null?'—':n.toLocaleString('en-US',{maximumFractionDigits:d});
const expiry=(raw:string)=>new Date(raw).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'});

export default function ExecutionLab(){
 const {basket,snapshot,feed,error,refresh,recordJourneyProof}=useDesk();
 const wallet=useWallet();
 // Simulation-only spend: intentionally independent of the investor's larger Basket Studio budget.
 const [budget,setBudget]=useState(25);
 const receiver=wallet.address??'';
 const [running,setRunning]=useState(false),[observations,setObservations]=useState<Observation[]>([]);
 const [runId,setRunId]=useState(0);
 const [orchestration,setOrchestration]=useState<Rehearsal|null>(null);
 const [recoveryError,setRecoveryError]=useState<string|null>(null);
 const [evidenceKey,setEvidenceKey]=useState<string|null>(null);
 const [checkingBalances,setCheckingBalances]=useState(false);
 const [balanceCheck,setBalanceCheck]=useState<BalanceCheck|null>(null);
 const [balanceError,setBalanceError]=useState<string|null>(null);
 const runRef=useRef(false);
 const runAbort=useRef<AbortController|null>(null);
 const fundingAbort=useRef<AbortController|null>(null);
 const [nowMs,setNowMs]=useState(0);
 const legs=basket.map(b=>({...b,amountUsd:amountFor(budget,b),
  token:snapshot?.tokens.find(x=>x.ticker===b.ticker&&x.platform===b.platform)}));
 const total=legs.reduce((a,b)=>a+b.amountUsd,0);
 const outOfBounds=legs.some(x=>x.amountUsd<1||x.amountUsd>SIMULATION_MAX_LEG_USDT);
 const missing=legs.some(x=>!x.token||x.token.tradingAvailable!==true);
 const addressOK=wallet.ready&&validAddress(receiver);
 const basketOK=legs.length>0&&!missing;
 const budgetOK=basketOK&&!outOfBounds&&total<=SIMULATION_MAX_BASKET_USDT;
 const issue=feed!=='live'?'Live BSC market inventory must be available.':
  legs.length===0?'Select an issuer-backed basket first.':
  missing?'An issuer contract is missing or not marked open.':
  total>SIMULATION_MAX_BASKET_USDT?'The simulation basket limit is $50 USDT. Reduce the basket budget.':
  outOfBounds?'Each simulation leg must be between $1 and $25 USDT.':
  !wallet.address?'Connect a wallet to bind simulation to your actual account.':
  !wallet.ready?'Switch your connected wallet to BSC mainnet (chain 56).':
  !addressOK?'The connected wallet address is invalid. Reconnect.':null;
 const operationKey=wallet.sessionKey+'|'+feed+'|'+budget+'|'+legs.map(x=>
  x.ticker+':'+x.platform+':'+x.amountUsd+':'+(x.token?.address??'?')+':'+String(x.token?.tradingAvailable)).join(';');
 const scopedObservations=evidenceKey===operationKey?observations:[];
 const complete=scopedObservations.length===legs.length&&scopedObservations.length>0&&scopedObservations.every(x=>
  x.status==='pass'&&!!x.receipt&&Date.parse(x.receipt.expiresAt)>nowMs);
 const blocked=scopedObservations.some(x=>x.status==='blocked');
 const currentRun=orchestration?expireRehearsal(orchestration,nowMs||Date.now()):null;
 const recovery=currentRun?recoveryDecision(currentRun,nowMs||Date.now()):null;
 const canRehearse=!currentRun||recovery?.action==='REHEARSE_ALL_FRESH';
 const expired=scopedObservations.some(x=>x.receipt&&Date.parse(x.receipt.expiresAt)<=nowMs);
 const latestBuiltGas=[...scopedObservations].reverse().find(x=>x.receipt?.gasLimit)?.receipt?.gasLimit??null;
 const allowanceLegs:AllowanceInput[]=scopedObservations.filter(x=>!!x.receipt?.approvalTarget).map(x=>({
  spender:x.receipt!.approvalTarget!,amountUsd:x.receipt!.amountUsd
 }));
 const allowanceKey=allowanceLegs.map(x=>x.spender+':'+x.amountUsd).join('|');
 const currentBalanceCheck=balanceCheck&&balanceCheck.sessionKey===wallet.sessionKey&&
  balanceCheck.walletAddress===receiver&&balanceCheck.amountUsd===total&&balanceCheck.gasLimit===latestBuiltGas&&
  balanceCheck.allowanceKey===allowanceKey?
  balanceCheck.data:null;
 const currentOperation=useRef(operationKey);
 currentOperation.current=operationKey;
 useEffect(()=>{
  runAbort.current?.abort();
  fundingAbort.current?.abort();
  setObservations([]);setBalanceCheck(null);setBalanceError(null);setOrchestration(null);setRecoveryError(null);
 },[operationKey]);
 useEffect(()=>{
  setNowMs(Date.now());
  const id=window.setInterval(()=>setNowMs(Date.now()),1000);
  return()=>window.clearInterval(id);
 },[]);
 async function checkBalances(gasOverride?:string|null,allowanceOverride?:AllowanceInput[]){
  if(!addressOK||!budgetOK)return;
  const key=operationKey;
  fundingAbort.current?.abort();
  const controller=new AbortController();
  fundingAbort.current=controller;
  setCheckingBalances(true);setBalanceError(null);setBalanceCheck(null);
  try{
   const walletAddress=receiver.trim();
   const gasLimit=gasOverride===undefined?latestBuiltGas:gasOverride;
   const allowanceInputs=allowanceOverride??allowanceLegs;
   const checkedAllowanceKey=allowanceInputs.map(x=>x.spender+':'+x.amountUsd).join('|');
   const response=await fetch('/api/sentinel/wallet-readiness',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({walletAddress,amountUsd:total,gasLimit,allowanceLegs:allowanceInputs}),
    cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(11000)])
   });
   const data=await response.json();
   if(controller.signal.aborted||currentOperation.current!==key)return;
   if(!response.ok||data.kind!=='sentinel.bsc.readonly-wallet-balances')
    throw new Error(typeof data.error==='string'?data.error:'Could not verify balances on BSC mainnet.');
   setBalanceCheck({sessionKey:wallet.sessionKey,walletAddress,amountUsd:total,gasLimit,
    allowanceKey:checkedAllowanceKey,data:data as WalletBalances});
  }catch(error){
   if(!controller.signal.aborted&&currentOperation.current===key)setBalanceError(error instanceof Error&&error.name!=='TimeoutError'?
    error.message:'BSC balance check timed out; balances remain unknown.');
  }finally{if(fundingAbort.current===controller){fundingAbort.current=null;setCheckingBalances(false);}}
 }
 async function runSimulation(){
  if(runRef.current||issue||!wallet.ready||!snapshot||!canRehearse)return;
  const key=operationKey;
  const planned=planRehearsal(basket,snapshot.tokens,receiver.trim(),budget,Date.now(),currentRun??undefined);
  if(!planned.ok){setRecoveryError(planned.reason);return;}
  const controller=new AbortController();
  runAbort.current=controller;runRef.current=true;
  setRunning(true);setEvidenceKey(key);setObservations([]);setRecoveryError(null);
  setRunId(n=>n+1);
  try{
   const result=await rehearse(planned.value,async(leg,address,signal)=>{
    const response=await fetch('/api/sentinel/simulate',{
     method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({ticker:leg.ticker,platform:leg.platform,amountUsd:leg.amountUsd,walletAddress:address}),
     cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(55000)])
    });
    const result:unknown=await response.json();
    return {ok:response.ok,status:response.status,body:result};
   },controller.signal,state=>{
    if(controller.signal.aborted||currentOperation.current!==key)return;
    setOrchestration(state);
    setObservations(state.legs.filter(x=>x.phase!=='NOT_ATTEMPTED').map(x=>({
     ticker:x.leg.ticker,status:x.phase==='RUNNING'?'running':x.phase==='PASS'?'pass':'blocked',
     reason:x.reason??undefined,receipt:x.receipt??undefined
    })));
   },Date.now,()=>currentOperation.current===key);
   if(controller.signal.aborted||currentOperation.current!==key)return;
   const findings=result.legs.filter(x=>!!x.receipt);
   if(findings.length){
    recordJourneyProof({kind:'SIMULATION',walletAddress:receiver.trim(),basketKey:basketEvidenceKey(basket),
     recordedAt:new Date().toISOString(),observedLegs:findings.length,totalLegs:legs.length,
     state:result.phase==='PREDICTED_PASS'?'SIMULATOR_PASSED':
      result.phase==='BLOCKED'?'SIMULATOR_BLOCKED':'PARTIAL_REHEARSAL',
     source:'Binance Web3 unsigned build + simulator',
     summary:findings.map(x=>x.leg.ticker+': '+x.receipt!.simulation.reportedStatus).join(' · ').slice(0,260)});
   }
   const firstFailure=result.legs.find(x=>x.receipt&&x.phase!=='PASS');
   if(firstFailure&&requiresFundingReadout(false,firstFailure.receipt?.simulation.reason??null)){
    void checkBalances(firstFailure.receipt?.gasLimit??null,result.legs.filter(x=>x.receipt?.approvalTarget).map(x=>({
     spender:x.receipt!.approvalTarget!,amountUsd:x.leg.amountUsd
    })));
   }
  }catch(e){
   if(!controller.signal.aborted&&currentOperation.current===key)
    setRecoveryError(e instanceof Error?'Orchestrator could not complete its read-only rehearsal.':'Rehearsal unavailable.');
  }finally{
   if(runAbort.current===controller)runAbort.current=null;
   runRef.current=false;setRunning(false);
  }
 }

 return <div className="desk-wrap desk-internal-page desk-sim-lab">
  <div className="desk-breadcrumb"><Link href="/sentinel">THE BRIEF</Link><span>→</span><Link href="/sentinel/baskets">BASKET STUDIO</Link><span>→</span><Link href="/sentinel/review">EXECUTION REVIEW</Link><span>→</span><b>SIMULATION LAB</b></div>
  <header className="desk-page-head desk-sim-hero">
   <div><Eyebrow>ROOM 05 / REAL TRANSACTION PREFLIGHT</Eyebrow>
    <h1>Build the trade.<br/><em>Test before spending.</em></h1>
    <p>For every basket leg, Sentinel obtains a current venue quote, asks Binance Web3 to construct the actual BSC spot transaction, then runs it through the official Transaction API simulator. No swap is signed or sent.</p></div>
   <div className="desk-sim-lock"><LockKeyhole size={28}/><strong>SIMULATION ONLY</strong><span>QUOTE → BUILD → SIMULATE</span><small>SEPARATE USER-AUTHORIZED EXECUTION BELOW</small></div>
  </header>
  <div className="desk-sim-band"><span>BNB SMART CHAIN · MAINNET 56</span><span>USDT → VERIFIED ISSUER TOKEN</span><span>EXPLICIT WALLET ACTIONS ONLY</span></div>
  <div className="desk-sim-layout">
   <section className="desk-sim-primary" aria-label="Execution simulation evidence">
    <div className="desk-sim-heading"><div><span>01 / SELECTED BASKET</span><h2>Every leg gets<br/><em>its own rehearsal.</em></h2></div><div className="desk-sim-budget"><span>PROPOSED TOTAL</span><strong>{formatUsd(total)}</strong><small>{legs.length} issuer-backed {legs.length===1?'leg':'legs'}</small></div></div>
    {legs.length===0&&<BlankState title="No basket instruction yet." description="The simulator does not invent a basket. Select actual BSC stock tokens first." action={<Link href="/sentinel/baskets" className="desk-button-ink">Build a basket <ArrowRight size={16}/></Link>}/>}
    <div className="desk-sim-list">
     {legs.map((leg,i)=>{
      const observation=scopedObservations.find(x=>x.ticker===leg.ticker);
      const data=observation?.receipt;
      return <article className={'desk-sim-leg '+(observation?.status||'waiting')} key={leg.ticker}>
       <div className="desk-sim-leg-top">
        <span className="desk-sim-number">{String(i+1).padStart(2,'0')}</span>
        <TokenMark token={leg.token}/>
        <div className="desk-sim-leg-identity"><strong>{leg.ticker}</strong><small>{leg.token?.symbol||'—'} · {leg.platform==='bstock'?'bStocks':'Ondo'} · {leg.weight}% allocation</small></div>
        <strong className="desk-sim-leg-spend">{formatUsd(leg.amountUsd)}</strong>
       </div>
       <div className="desk-sim-leg-stage">
        <span>QUOTE</span><ArrowRight size={14}/><span>BUILD SWAP TX</span><ArrowRight size={14}/><span>SIMULATE</span>
        <span className={'desk-sim-chip '+(observation?.status||'waiting')}>{observation?.status==='running'?'PROCESSING':
         observation?.status==='pass'&&data&&Date.parse(data.expiresAt)<=nowMs?'EXPIRED · RE-RUN':
         observation?.status==='pass'?'SIMULATION PASSED':observation?.status==='blocked'?'BLOCKED':'NOT REQUESTED'}</span>
       </div>
       {data&&<div className="desk-sim-result">
        <div><span>ROUTE / VENUE</span><strong>{data.routeMode} · {data.routeVendor}</strong></div>
        <div><span>QUOTED OUTPUT</span><strong>{fmt(data.quotedTokenAmount)} {data.symbol}</strong></div>
        <div><span>PRICE IMPACT</span><strong>{Number(data.priceImpactPct).toFixed(4)}%</strong></div>
        <div><span>BUILT CALL DATA</span><strong>{data.builtTransaction.dataBytes} bytes · no native value</strong></div>
        <div><span>MAX SLIPPAGE</span><strong>{data.maxSlippagePercent}%</strong></div>
        <div><span>QUOTED SPENDER</span><strong>{data.approvalTarget?data.approvalTarget.slice(0,10)+'…'+data.approvalTarget.slice(-6):'Not identified'}</strong></div>
        <div><span>SIMULATOR REPORTED</span><strong>{data.simulation.reportedStatus}</strong></div>
        <div><span>BALANCE CHANGES</span><strong>{data.simulation.balanceChangeCount}</strong></div>
        <div><span>ALLOWANCE CHANGES</span><strong>{data.simulation.allowanceChangeCount}</strong></div>
        <div><span>QUOTE VALID UNTIL</span><strong>{expiry(data.expiresAt)} · result is a time-bound simulation</strong></div>
       </div>}
       {observation?.status==='blocked'&&<p className="desk-sim-failure" role="alert"><XCircle size={16}/>{observation.reason||'Simulation blocked. No trade was submitted.'}{data&&Date.parse(data.expiresAt)<=nowMs?' · Quote expired after the failed preflight.':''}</p>}
       {observation?.status==='pass'&&<p className="desk-sim-okay"><CheckCircle2 size={17}/> {data&&Date.parse(data.expiresAt)<=nowMs?
        'This simulation has expired and cannot be reused. Run it again with a fresh quote.':
        'Transaction API predicted success. No wallet permission or real execution occurred.'}</p>}
      </article>;
     })}
    </div>
    <div className={'desk-sim-final '+(complete?'complete':blocked?'blocked':'pending')}>
     {complete?<ShieldCheck size={28}/>:blocked?<TriangleAlert size={28}/>:<Clock3 size={28}/>}
     <div><strong>{preflightHeadline({complete,blocked,expired})}</strong>
      <p>{complete?'Each issuer-specific transaction was built and simulated from a live quote. This is predicted execution only, not a wallet approval, a position or an onchain receipt.':
       blocked?'The simulator reported a failed transaction. Review the specific reason above; a balance, gas or allowance failure triggers a separate read-only wallet diagnostic below. '+(expired?'The quote has also expired, so a future attempt requires a new quote.':'No transaction was signed or sent.'):
       expired?'One or more quote windows have elapsed. Archived results are reference-only; simulate again with fresh quotes and the active connected wallet.':
       'The official simulation endpoint receives genuine unsigned BSC transaction calldata only when you initiate this read-only test.'}</p>
     </div>
    </div>
    <section className="desk-execution-decision" aria-label="Execution decision record">
     <div className="desk-execution-decision-head"><span>THE AGENT'S DECISION RECORD</span><b>PLANNING IS NOT SPENDING</b></div>
     <p>Sentinel works through the evidence in order. A passed check cannot override a later failure or missing permission.</p>
     {([
      ['01 / INVENTORY',feed==='live'?'OBSERVED':'UNAVAILABLE','Issuer inventory is not permission to trade.'],
      ['02 / ALLOCATION',budgetOK?'BOUNDED':'NOT READY',budgetOK?legs.length+' issuer legs · '+formatUsd(total)+' simulation-only.':'Select a valid basket and bounded simulation size.'],
      ['03 / WALLET SESSION',addressOK?'CONNECTED BSC':'NOT READY',addressOK?'Connected sender on chain 56; no signing requested.':'Connect the intended BSC wallet to simulate.'],
      ['04 / ROUTE & SIMULATOR',complete?'PREDICTED PASS':blocked?'BLOCKED':expired?'EXPIRED':'NOT VERIFIED',blocked?scopedObservations.find(x=>x.status==='blocked')?.reason||'The simulator rejected a leg.':complete?'All legs returned predicted success, but no onchain execution occurred.':'Trigger quote, unsigned build and simulation on each leg.'],
      ['05 / FUNDS & ALLOWANCES',!currentBalanceCheck?'NOT VERIFIED':currentBalanceCheck.usdtCoversAmount&&currentBalanceCheck.bnbCoversBufferedSwapEstimate===true?'OBSERVED SUFFICIENT':'NOT CLEARED',!currentBalanceCheck?'No onchain funding diagnostic has been completed.':currentBalanceCheck.usdtCoversAmount?'Observed public balances are not approval or eligibility.':'USDT is below the proposed basket amount.'],
      ['06 / ISSUER ELIGIBILITY','UNVERIFIED','No authoritative end-user, product, jurisdiction and wallet trading clearance.'],
      ['07 / SWAP IMPLEMENTATION','UNVERIFIED','Nested LiquidMesh calldata and upgrade authorization remain unaudited.'],
      ['08 / FINAL RELEASE','LOCKED','No wallet approvals, live swaps, filled orders or receipts may be claimed.']
     ] as const).map(check=><div className="desk-execution-check" key={check[0]}>
      <span>{check[0]}</span><div><b>{check[1]}</b><small>{check[2]}</small></div>
     </div>)}
    </section>
   </section>
   <aside className="desk-sim-rail">
    <div className="desk-sim-rail-head"><span>02 / WALLET-BOUND PREFLIGHT</span><h2>Connect once.<br/><em>Simulate the right account.</em></h2><p>The connected BSC account is the sole sender for quotes, transaction builds, and simulation. Switch accounts or networks and the old results are invalidated automatically.</p></div>
    <section className="desk-sim-wallet-connected" aria-label="Wallet for simulation">
     <span>ACTIVE BSC TRANSACTION SENDER</span>
     {wallet.address?<strong>{receiver}</strong>:<strong>NOT CONNECTED</strong>}
     <small>{wallet.ready?'Verified wallet connection · chain 56 · no signature requested':
      wallet.address?'Connected on another network. Switch to BSC mainnet to simulate.':
      'Connect a browser wallet here or in the header. Guest market research remains open.'}</small>
     <WalletControls/>
     {wallet.error&&<p role="alert">{wallet.error}</p>}
    </section>
    <div className="desk-sim-preflight" aria-live="polite">
     <div className="desk-sim-preflight-top"><strong>BEFORE SIMULATION</strong><span>{issue?'ACTION REQUIRED':'READY TO SIMULATE'}</span></div>
     <div className="desk-sim-preflight-item"><span className={feed==='live'?'ready':'pending'}>{feed==='live'?'✓':'!'}</span>
      <div><strong>Live BSC market feed</strong><small>{feed==='live'?'Issuer inventory connected':feed==='connecting'?'Connecting to Binance market data…':error||'Market feed unavailable'}</small></div>
      {feed!=='live'&&<button type="button" onClick={()=>void refresh()} disabled={running}>Retry feed</button>}
     </div>
     <div className="desk-sim-preflight-item"><span className={basketOK?'ready':'pending'}>{basketOK?'✓':'!'}</span>
      <div><strong>Selected issuer-backed basket</strong><small>{legs.length===0?'No basket selected':missing?'An issuer is unavailable for trading':`${legs.length} issuer-backed leg${legs.length===1?'':'s'} selected`}</small></div>
      {!basketOK&&<Link href="/sentinel/baskets">Choose basket</Link>}
     </div>
     <label className="desk-sim-budget-control" htmlFor="desk-sim-budget-select">
      <span className={budgetOK?'ready':'pending'}>{budgetOK?'✓':'!'}</span>
      <div><strong>Simulation-only total</strong><small>Does not change your Basket Studio investment budget. $1–$25 per leg, $50 total max.</small></div>
      <select id="desk-sim-budget-select" value={budget} disabled={running} onChange={e=>{setBudget(Number(e.target.value));setObservations([]);}}>
       {[10,20,25,35,50].map(value=><option key={value} value={value}>${value} USDT</option>)}
      </select>
     </label>
     {!budgetOK&&basketOK&&<div className="desk-sim-preflight-remedy">
      <span>{total>SIMULATION_MAX_BASKET_USDT?'This exceeds the $50 basket cap.':'One or more allocations fall outside the $1–$25 per-leg limit.'}</span>
      {budget!==25&&<button type="button" disabled={running} onClick={()=>{setBudget(25);setObservations([]);}}>Use safe $25 test</button>}
     </div>}
     <div className="desk-sim-preflight-item"><span className={addressOK?'ready':'pending'}>{addressOK?'✓':'!'}</span>
      <div><strong>Connected BSC sender</strong><small>{addressOK?'Wallet account and chain 56 selected · simulation only':
       wallet.address?'Wrong network · switch wallet to BSC mainnet':'Connect a wallet above to continue'}</small></div>
     </div>
    </div>
    <section className="desk-sim-funding" aria-label="Read-only wallet funding check">
     <div className="desk-sim-funding-head">
      <div><strong>03 / ONCHAIN WALLET DIAGNOSTIC</strong><p>Read public USDT, BNB and exact quoted-spender allowances for the connected BSC account. No signatures required.</p></div>
      <button type="button" onClick={()=>void checkBalances()}
       disabled={checkingBalances||running||!addressOK||!budgetOK}>
       {checkingBalances?'CHECKING…':currentBalanceCheck?'Refresh wallet check':'Check balances & allowances'}
       <RefreshCw size={14} className={checkingBalances?'desk-spin':undefined}/>
      </button>
     </div>
     {balanceError&&<p className="desk-sim-funding-error" role="status">{balanceError} No balances were assumed.</p>}
     {currentBalanceCheck&&<div className="desk-sim-funding-results" aria-live="polite">
      <div><span>USDT / BSC</span><strong>{currentBalanceCheck.usdtBalance}</strong>
       <small className={currentBalanceCheck.usdtCoversAmount?'sufficient':'missing'}>{currentBalanceCheck.usdtCoversAmount?
        'Covers the proposed basket amount':'Below the proposed basket amount'}</small></div>
      <div><span>BNB / GAS TOKEN</span><strong>{currentBalanceCheck.bnbBalance}</strong>
       <small className={currentBalanceCheck.bnbPresent?'sufficient':'missing'}>{currentBalanceCheck.bnbPresent?
        'Present · gas sufficiency not verified':'Zero balance · no BNB available for gas'}</small></div>
      <div><span>GAS PRICE / BSC</span><strong>{currentBalanceCheck.gasPriceGwei===null?'—':currentBalanceCheck.gasPriceGwei+' gwei'}</strong>
       <small>Observed public RPC gas price · not a guaranteed quote</small></div>
      <div><span>LAST BUILT SWAP / GAS BUDGET</span><strong>{currentBalanceCheck.estimatedSwapGasBnb===null?'—':currentBalanceCheck.estimatedSwapGasBnb+' BNB'}</strong>
       <small className={currentBalanceCheck.bnbCoversBufferedSwapEstimate===false?'missing':'sufficient'}>{currentBalanceCheck.bnbCoversBufferedSwapEstimate===null?
        'Unavailable · build & simulate first':currentBalanceCheck.bnbCoversBufferedSwapEstimate?
        'Covers a buffered estimate · not guaranteed':'BNB below this buffered estimate'}</small></div>
      <div><span>3M GAS CAP / STRESS SCENARIO</span><strong>{currentBalanceCheck.stressScenarioBnb===null?'—':currentBalanceCheck.stressScenarioBnb+' BNB'}</strong>
       <small className={currentBalanceCheck.bnbCoversStressScenario===false?'missing':'sufficient'}>{currentBalanceCheck.bnbCoversStressScenario===null?'Unavailable · network gas price missing':
        currentBalanceCheck.bnbCoversStressScenario?'BNB covers this conservative cap scenario':'BNB below the conservative cap scenario'}</small></div>
      <div><span>USDT ALLOWANCE / QUOTED SPENDER</span><strong>{currentBalanceCheck.allowanceState==='VERIFIED'?
       currentBalanceCheck.allowanceSnapshots.every(x=>x.coversRequired)?'CHECKED SPENDERS COVERED':'CHECKED SPENDERS SHORT':
       currentBalanceCheck.allowanceState==='UNAVAILABLE'?'READ FAILED':'NOT VERIFIED'}</strong>
       <small className={currentBalanceCheck.allowanceState==='VERIFIED'&&currentBalanceCheck.allowanceSnapshots.every(x=>x.coversRequired)?'sufficient':'missing'}>{currentBalanceCheck.allowanceState==='VERIFIED'?
        'Public ERC-20 allowance, read for identified quote spenders only':
        currentBalanceCheck.allowanceState==='UNAVAILABLE'?'Unable to read allowances; no value inferred':
        'No valid spender identified from a simulated quote'}</small></div>
      {currentBalanceCheck.allowanceSnapshots.map(x=><div key={x.spender}>
       <span>SPENDER {x.spender.slice(0,8)}…{x.spender.slice(-6)}</span>
       <strong>{x.approvedUsdt} / {x.requiredUsdt} USDT</strong>
       <small className={x.coversRequired?'sufficient':'missing'}>{x.coversRequired?'Allowance meets tested amount':'Allowance below tested amount'} · read-only, no authorization</small>
      </div>)}
      <p>Read-only BSC mainnet snapshot checked at {new Date(currentBalanceCheck.checkedAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}. The built-swap gas estimate and separate 3,000,000-gas stress scenario each use a 50% buffer; neither guarantees the fee. These exclude separate token approvals and other basket legs. Allowance checks cover only the quote-identified spenders above; an unknown spender is NOT proof that approval is unnecessary. No trade or wallet authorization.</p>
     </div>}
    </section>
    <div className="desk-sim-rails"><div><span>CHAIN</span><strong>BSC / 56</strong></div><div><span>INPUT TOKEN</span><strong>USDT / 18 DECIMALS</strong></div><div><span>MAX PER LEG</span><strong>$25 USDT</strong></div><div><span>MAX BASKET</span><strong>$50 USDT</strong></div><div><span>SLIPPAGE LIMIT</span><strong>0.50%</strong></div><div><span>PRICE IMPACT LIMIT</span><strong>2.00%</strong></div><div><span>SUPPORTED PATH</span><strong>LIQUIDMESH SWAP</strong></div></div>
    <button type="button" className="desk-sim-run" onClick={()=>void runSimulation()} disabled={running||!!issue||!canRehearse}>
     {running?<RefreshCw size={17} className="desk-spin"/>:<ShieldAlert size={18}/>}
     {running?'Planning & rehearsing actual swaps…':runId>0?'Rehearse all legs with fresh quotes':'Build & simulate basket'}
     <ArrowRight size={17}/>
    </button>
    {issue&&<p className="desk-sim-note" role="status">{issue}</p>}
    {recoveryError&&<p className="desk-sim-note" role="alert">{recoveryError}</p>}
    {currentRun&&<p className="desk-sim-note" role="status">Orchestrator: {currentRun.phase.replaceAll('_',' ')} · explicit attempt {currentRun.attempt}/3. {recovery?.reason} Never auto-resubmits a failed leg.</p>}
    {!issue&&<p className="desk-sim-note">Separate quote/build/simulate calls per leg. Nothing signs, approves or broadcasts. A blocked leg halts the batch.</p>}
    <ExecutionAuthorization legs={legs.map(x=>({ticker:x.ticker,platform:x.platform,amountUsd:x.amountUsd}))}
     enabled={!running&&addressOK&&budgetOK&&feed==='live'} operationKey={operationKey}/>
    <div className="desk-sim-security"><LockKeyhole size={20}/><div><b>Actual spending is gated.</b><p>Simulations do not prove you hold the tokens, that allowances exist, or that the issuer permits you to trade. Mainnet spending remains hard-blocked until the nested router ABI and issuer-specific end-user eligibility are independently verified. A passing simulation, funded wallet, or configured allowlist cannot bypass either blocker.</p></div></div>
    <Link href="/sentinel/review" className="desk-sim-back"><ArrowLeft size={14}/> Return to quote review</Link>
   </aside>
  </div>
 </div>;
}
