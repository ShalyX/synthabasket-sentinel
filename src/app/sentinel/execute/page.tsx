'use client';
import Link from 'next/link';
import {useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,CheckCircle2,Clock3,LockKeyhole,RefreshCw,ShieldAlert,ShieldCheck,TriangleAlert,XCircle} from 'lucide-react';
import {useDesk} from '@/components/sentinel/DeskContext';
import {Eyebrow,TokenMark,BlankState} from '@/components/sentinel/DeskBits';
import {amountFor} from '@/lib/sentinel/basket';
import {formatUsd} from '@/lib/sentinel/model';
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
 allowanceChecked:false;
 gasAdequacyChecked:false;
 gasPriceGwei:string|null;
 estimatedSwapGasBnb:string|null;
 bnbCoversBufferedSwapEstimate:boolean|null;
 gasEstimateAvailable:boolean;
 estimateScope:'LAST_BUILT_SWAP_LEG'|'UNAVAILABLE';
 noTransactions:true;
}
type BalanceCheck={walletAddress:string;amountUsd:number;gasLimit:string|null;data:WalletBalances};

const fmt=(n:number|null,d=8)=>n==null?'—':n.toLocaleString('en-US',{maximumFractionDigits:d});
const expiry=(raw:string)=>new Date(raw).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'});

export default function ExecutionLab(){
 const {basket,snapshot,feed,error,refresh}=useDesk();
 // Simulation-only spend: intentionally independent of the investor's larger Basket Studio budget.
 const [budget,setBudget]=useState(25),[receiver,setReceiver]=useState('');
 const [running,setRunning]=useState(false),[observations,setObservations]=useState<Observation[]>([]);
 const [runId,setRunId]=useState(0);
 const [checkingBalances,setCheckingBalances]=useState(false);
 const [balanceCheck,setBalanceCheck]=useState<BalanceCheck|null>(null);
 const [balanceError,setBalanceError]=useState<string|null>(null);
 const runRef=useRef(false);
 const legs=basket.map(b=>({...b,amountUsd:amountFor(budget,b),
  token:snapshot?.tokens.find(x=>x.ticker===b.ticker&&x.platform===b.platform)}));
 const total=legs.reduce((a,b)=>a+b.amountUsd,0);
 const outOfBounds=legs.some(x=>x.amountUsd<1||x.amountUsd>SIMULATION_MAX_LEG_USDT);
 const missing=legs.some(x=>!x.token||x.token.tradingAvailable!==true);
 const addressOK=validAddress(receiver.trim());
 const basketOK=legs.length>0&&!missing;
 const budgetOK=basketOK&&!outOfBounds&&total<=SIMULATION_MAX_BASKET_USDT;
 const issue=feed!=='live'?'Live BSC market inventory must be available.':
  legs.length===0?'Select an issuer-backed basket first.':
  missing?'An issuer contract is missing or not marked open.':
  total>SIMULATION_MAX_BASKET_USDT?'The simulation basket limit is $50 USDT. Reduce the basket budget.':
  outOfBounds?'Each simulation leg must be between $1 and $25 USDT.':
  !addressOK?'Enter a valid public BSC sender address (0x followed by 40 hex characters).':null;
 const complete=observations.length===legs.length&&observations.length>0&&observations.every(x=>x.status==='pass');
 const blocked=observations.some(x=>x.status==='blocked');
 const latestBuiltGas=[...observations].reverse().find(x=>x.receipt?.gasLimit)?.receipt?.gasLimit??null;
 const currentBalanceCheck=balanceCheck&&balanceCheck.walletAddress===receiver.trim()&&balanceCheck.amountUsd===total&&balanceCheck.gasLimit===latestBuiltGas?
  balanceCheck.data:null;
 async function checkBalances(){
  if(checkingBalances||!addressOK||!budgetOK)return;
  setCheckingBalances(true);setBalanceError(null);setBalanceCheck(null);
  try{
   const walletAddress=receiver.trim();
   const gasLimit=latestBuiltGas;
   const response=await fetch('/api/sentinel/wallet-readiness',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({walletAddress,amountUsd:total,gasLimit}),
    cache:'no-store',signal:AbortSignal.timeout(11000)
   });
   const data=await response.json();
   if(!response.ok||data.kind!=='sentinel.bsc.readonly-wallet-balances')
    throw new Error(typeof data.error==='string'?data.error:'Could not verify balances on BSC mainnet.');
   setBalanceCheck({walletAddress,amountUsd:total,gasLimit,data:data as WalletBalances});
  }catch(error){
   setBalanceError(error instanceof Error&&error.name!=='TimeoutError'?
    error.message:'BSC balance check timed out; balances remain unknown.');
  }finally{setCheckingBalances(false);}
 }
 async function runSimulation(){
  if(runRef.current||issue)return;
  runRef.current=true;setRunning(true);setObservations([]);setRunId(n=>n+1);
  const history:Observation[]=[];
  try{
   for(const leg of legs){
    history.push({ticker:leg.ticker,status:'running'});setObservations([...history]);
    try{
     const body=JSON.stringify({ticker:leg.ticker,platform:leg.platform,amountUsd:leg.amountUsd,walletAddress:receiver.trim()});
     const response=await fetch('/api/sentinel/simulate',{
      method:'POST',headers:{'Content-Type':'application/json'},body,
      cache:'no-store',signal:AbortSignal.timeout(55000)
     });
     const data=await response.json();
     if(!response.ok||data.kind!=='sentinel.bsc.sandbox-preflight'){
      history[history.length-1]={ticker:leg.ticker,status:'blocked',
       reason:typeof data.error==='string'?data.error:'Transaction build or simulation was unavailable.'};
      setObservations([...history]);break;
     }
     const receipt=data as SimulatedLeg;
     const passed=receipt.simulation.status==='PASS'&&receipt.state==='SIMULATION_PASSED'&&
      receipt.executed===false&&receipt.tradeAuthorized===false&&receipt.signatureRequested===false;
     history[history.length-1]={ticker:leg.ticker,status:passed?'pass':'blocked',receipt,
      reason:passed?undefined:receipt.simulation.reason||'The simulation did not pass.'};
     setObservations([...history]);
     if(!passed)break; // fail closed; no later leg is attempted after a blocked one.
    }catch(e){
     history[history.length-1]={ticker:leg.ticker,status:'blocked',
      reason:e instanceof Error&&e.name==='TimeoutError'?'Simulation timed out. No transaction was sent.':
       'Simulation request could not complete. No transaction was sent.'};
     setObservations([...history]);break;
    }
   }
  }finally{runRef.current=false;setRunning(false);}
 }
 return <div className="desk-wrap desk-internal-page desk-sim-lab">
  <div className="desk-breadcrumb"><Link href="/sentinel">THE BRIEF</Link><span>→</span><Link href="/sentinel/baskets">BASKET STUDIO</Link><span>→</span><Link href="/sentinel/review">EXECUTION REVIEW</Link><span>→</span><b>SIMULATION LAB</b></div>
  <header className="desk-page-head desk-sim-hero">
   <div><Eyebrow>ROOM 05 / REAL TRANSACTION PREFLIGHT</Eyebrow>
    <h1>Build the trade.<br/><em>Test before spending.</em></h1>
    <p>For every basket leg, Sentinel obtains a current venue quote, asks Binance Web3 to construct the actual BSC spot transaction, then runs it through the official Transaction API simulator. No swap is signed or sent.</p></div>
   <div className="desk-sim-lock"><LockKeyhole size={28}/><strong>0 ACTUAL ORDERS</strong><span>QUOTE → BUILD → SIMULATE</span><small>USER APPROVAL REQUIRED FOR ANY FUTURE SPEND</small></div>
  </header>
  <div className="desk-sim-band"><span>BNB SMART CHAIN · MAINNET 56</span><span>USDT → VERIFIED ISSUER TOKEN</span><span>NO EXECUTION</span></div>
  <div className="desk-sim-layout">
   <section className="desk-sim-primary" aria-label="Execution simulation evidence">
    <div className="desk-sim-heading"><div><span>01 / SELECTED BASKET</span><h2>Every leg gets<br/><em>its own rehearsal.</em></h2></div><div className="desk-sim-budget"><span>PROPOSED TOTAL</span><strong>{formatUsd(total)}</strong><small>{legs.length} issuer-backed legs</small></div></div>
    {legs.length===0&&<BlankState title="No basket instruction yet." description="The simulator does not invent a basket. Select actual BSC stock tokens first." action={<Link href="/sentinel/baskets" className="desk-button-ink">Build a basket <ArrowRight size={16}/></Link>}/>}
    <div className="desk-sim-list">
     {legs.map((leg,i)=>{
      const observation=observations.find(x=>x.ticker===leg.ticker);
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
         observation?.status==='pass'?'SIMULATION PASSED':observation?.status==='blocked'?'BLOCKED':'NOT REQUESTED'}</span>
       </div>
       {data&&<div className="desk-sim-result">
        <div><span>ROUTE / VENUE</span><strong>{data.routeMode} · {data.routeVendor}</strong></div>
        <div><span>QUOTED OUTPUT</span><strong>{fmt(data.quotedTokenAmount)} {data.symbol}</strong></div>
        <div><span>PRICE IMPACT</span><strong>{Number(data.priceImpactPct).toFixed(4)}%</strong></div>
        <div><span>BUILT CALL DATA</span><strong>{data.builtTransaction.dataBytes} bytes · no native value</strong></div>
        <div><span>MAX SLIPPAGE</span><strong>{data.maxSlippagePercent}%</strong></div>
        <div><span>SIMULATOR REPORTED</span><strong>{data.simulation.reportedStatus}</strong></div>
        <div><span>BALANCE CHANGES</span><strong>{data.simulation.balanceChangeCount}</strong></div>
        <div><span>ALLOWANCE CHANGES</span><strong>{data.simulation.allowanceChangeCount}</strong></div>
        <div><span>QUOTE VALID UNTIL</span><strong>{expiry(data.expiresAt)} · result is a time-bound simulation</strong></div>
       </div>}
       {observation?.status==='blocked'&&<p className="desk-sim-failure" role="alert"><XCircle size={16}/>{observation.reason||'Simulation blocked. No trade was submitted.'}</p>}
       {observation?.status==='pass'&&<p className="desk-sim-okay"><CheckCircle2 size={17}/> Transaction API predicted success. No wallet permission or real execution occurred.</p>}
      </article>;
     })}
    </div>
    <div className={'desk-sim-final '+(complete?'complete':blocked?'blocked':'pending')}>
     {complete?<ShieldCheck size={28}/>:blocked?<TriangleAlert size={28}/>:<Clock3 size={28}/>}
     <div><strong>{complete?'ALL SELECTED LEGS SIMULATED · ZERO TRADES':blocked?'PREFLIGHT STOPPED · NO TRADE SENT':'AWAITING AN EXPLICIT SIMULATION'}</strong>
      <p>{complete?'Each issuer-specific transaction was built and simulated from a live quote. This is predicted execution only, not a wallet approval, a position or an onchain receipt.':
       blocked?'The pipeline stopped at the first blocked leg. Check funding, allowance, gas, route constraints or expiry and re-run after making a user-approved change.':
       'The official simulation endpoint receives genuine unsigned BSC transaction calldata only when you initiate this read-only test.'}</p>
     </div>
    </div>
   </section>
   <aside className="desk-sim-rail">
    <div className="desk-sim-rail-head"><span>02 / RUN AUTHORIZATION</span><h2>A wallet address<br/>is <em>not a wallet key.</em></h2><p>Simulate against the public address you intend to use for the eventual trade. This stage never requests a signature, approval, trade or transaction broadcast.</p></div>
    <label className="desk-sim-wallet" htmlFor="desk-sim-address"><span>PUBLIC BSC ADDRESS / TRANSACTION SENDER</span>
     <input id="desk-sim-address" type="text" inputMode="text" value={receiver} disabled={running}
      onChange={e=>{setReceiver(e.target.value.trim());setObservations([]);}}
      autoComplete="off" spellCheck={false} placeholder="0x… public address only"/>
     <small>Sent only to Binance's read-only quote/build/simulate endpoints after clicking the button. Never paste a seed phrase or private key. Nothing is saved to browser storage.</small>
    </label>
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
      <div><strong>Public BSC sender address</strong><small>{addressOK?'Format verified · no wallet connection or signature required':'Enter a valid 0x address in the field above'}</small></div>
     </div>
    </div>
    <section className="desk-sim-funding" aria-label="Read-only wallet funding check">
     <div className="desk-sim-funding-head">
      <div><strong>03 / ONCHAIN FUNDING DIAGNOSTIC</strong><p>Check public BSC balances without connecting or unlocking a wallet.</p></div>
      <button type="button" onClick={()=>void checkBalances()}
       disabled={checkingBalances||running||!addressOK||!budgetOK}>
       {checkingBalances?'CHECKING…':currentBalanceCheck?'Refresh funding check':'Check BSC balances & gas'}
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
      <p>Read-only BSC mainnet snapshot checked at {new Date(currentBalanceCheck.checkedAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}. The gas estimate uses only the most recently built swap leg, its reported limit, and the observed gas price plus a 50% buffer. It is <b>not</b> an exact gas quote and excludes any approval transaction or other basket legs. Allowance remains unverified. No trade or wallet authorization.</p>
     </div>}
    </section>
    <div className="desk-sim-rails"><div><span>CHAIN</span><strong>BSC / 56</strong></div><div><span>INPUT TOKEN</span><strong>USDT / 18 DECIMALS</strong></div><div><span>MAX PER LEG</span><strong>$25 USDT</strong></div><div><span>MAX BASKET</span><strong>$50 USDT</strong></div><div><span>SLIPPAGE LIMIT</span><strong>0.50%</strong></div><div><span>PRICE IMPACT LIMIT</span><strong>2.00%</strong></div><div><span>SUPPORTED PATH</span><strong>LIQUIDMESH SWAP</strong></div></div>
    <button type="button" className="desk-sim-run" onClick={()=>void runSimulation()} disabled={running||!!issue}>
     {running?<RefreshCw size={17} className="desk-spin"/>:<ShieldAlert size={18}/>}
     {running?'Running real preflight…':runId>0?'Re-run fresh simulations':'Build & simulate basket'}
     <ArrowRight size={17}/>
    </button>
    {issue&&<p className="desk-sim-note" role="status">{issue}</p>}
    {!issue&&<p className="desk-sim-note">Separate quote/build/simulate calls per leg. Nothing signs, approves or broadcasts. A blocked leg halts the batch.</p>}
    <div className="desk-sim-security"><LockKeyhole size={20}/><div><b>Actual spending is gated.</b><p>Simulations do not prove you hold the tokens, that allowances exist, or that the issuer permits you to trade. Wallet-connected confirmation and verified onchain receipts are separate milestones. A passing simulation does not give the app authority to move funds.</p></div></div>
    <Link href="/sentinel/review" className="desk-sim-back"><ArrowLeft size={14}/> Return to quote review</Link>
   </aside>
  </div>
 </div>;
}
