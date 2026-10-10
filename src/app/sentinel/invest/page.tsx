'use client';
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,Check,Clock3,RefreshCw,ShieldAlert,XCircle} from 'lucide-react';
import {useDesk} from '@/components/sentinel/DeskContext';
import {useWallet} from '@/components/sentinel/WalletContext';
import {WalletControls} from '@/components/sentinel/WalletControls';
import {TokenMark} from '@/components/sentinel/DeskBits';
import {ExecutionAuthorization} from '@/components/sentinel/ExecutionAuthorization';
import {checkoutPlan,LIVE_BASKET_MAX_USD,planKey,quoteState} from '@/lib/sentinel/product-journey';
import type {QuotePreview} from '@/lib/sentinel/model';
import {formatUsd} from '@/lib/sentinel/model';

type QuoteResult={state:'pending'|'reviewed'|'blocked';quote?:QuotePreview;error?:string};
type PreflightResult={state:'pending'|'pass'|'blocked'|'unavailable';reason:string;reported?:string};
type Readiness={usdtBalance?:string;bnbBalance?:string;usdtCoversAmount?:boolean;bnbCoversBufferedSwapEstimate?:boolean|null};
const $=(n:number)=>formatUsd(n);
export default function InvestmentCheckout(){
 const {basket,snapshot,feed}=useDesk();
 const wallet=useWallet();
 const [budget,setBudget]=useState(10);
 const [now,setNow]=useState(0);
 const [busy,setBusy]=useState(false);
 const [step,setStep]=useState('');
 const [quotes,setQuotes]=useState<Record<string,QuoteResult>>({});
 const [sims,setSims]=useState<Record<string,PreflightResult>>({});
 const [funds,setFunds]=useState<Readiness|null>(null);
 const [fundsError,setFundsError]=useState('');
 const [ran,setRan]=useState(false);
 const [error,setError]=useState('');
 const controller=useRef<AbortController|null>(null);
 useEffect(()=>{try{const n=Number(sessionStorage.getItem('sentinel-budget-v1'));if(Number.isFinite(n)&&n>=1&&n<=LIVE_BASKET_MAX_USD)setBudget(n);}catch{/* optional */}},[]);
 useEffect(()=>{setNow(Date.now());const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const tokens=snapshot?.tokens??[];
 const plan=useMemo(()=>checkoutPlan(basket,tokens,budget),[basket,tokens,budget]);
 const key=planKey(plan,wallet.address);
 const hasBlock=Object.values(quotes).some(x=>x.state==='blocked')||Object.values(sims).some(x=>x.state==='blocked');
 const quoteBlocked=Object.values(quotes).some(x=>x.state==='blocked');
 const pricesObserved=plan.legs.length>0&&plan.legs.every(x=>quotes[x.ticker]?.state==='reviewed');
 const allSimsPass=wallet.ready&&plan.legs.length>0&&plan.legs.every(x=>sims[x.ticker]?.state==='pass');
 const approvalNeeded=wallet.ready&&plan.legs.some(x=>sims[x.ticker]?.state==='blocked'&&/allowance/i.test(sims[x.ticker]?.reason||''));
 useEffect(()=>{
  controller.current?.abort();
  setQuotes({});setSims({});setFunds(null);setFundsError('');setError('');setRan(false);setBusy(false);setStep('');
  return()=>{controller.current?.abort();};
 },[key]);
 async function analyze(){
  if(busy||plan.issues.length||feed!=='live'||!plan.legs.length)return;
  controller.current?.abort();
  const abort=new AbortController();controller.current=abort;
  const thisKey=key;
  const alive=()=>!abort.signal.aborted&&keyRef.current===thisKey;
  setBusy(true);setError('');setFundsError('');setFunds(null);setQuotes({});setSims({});setRan(true);
  let failures=0;
  try{
   if(wallet.ready&&wallet.address){
    setStep('Checking wallet balances and gas');
    try{
     const result=await fetch('/api/sentinel/wallet-readiness',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({walletAddress:wallet.address,amountUsd:plan.totalUsd,gasLimit:null,allowanceLegs:[]}),
      cache:'no-store',signal:AbortSignal.any([abort.signal,AbortSignal.timeout(13000)])});
     const json=await result.json();
     if(!result.ok)throw Error(json.error||'Wallet funding status not available.');
     if(alive())setFunds(json as Readiness);
    }catch(e){if(alive())setFundsError(e instanceof Error?e.message:'Funding status unavailable');}
   }
   for(const leg of plan.legs){
    if(!alive())return;
    setStep('Inspecting '+leg.ticker+' venue quote');
    if(alive())setQuotes(prev=>({...prev,[leg.ticker]:{state:'pending'}}));
    try{
     const result=await fetch('/api/sentinel/quote',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ticker:leg.ticker,platform:leg.platform,amountUsd:leg.amountUsd,
       ...(wallet.ready&&wallet.address?{walletAddress:wallet.address}:{})}),
      cache:'no-store',signal:AbortSignal.any([abort.signal,AbortSignal.timeout(18000)])});
     const body=await result.json();
     if(!result.ok)throw Error(body.error||'Live quote unavailable.');
     const quote=body as QuotePreview;
     if(quoteState(leg,quote,Date.now())!=='REVIEWED')throw Error('Quote failed freshness, contract identity or price policy checks.');
     if(alive())setQuotes(prev=>({...prev,[leg.ticker]:{state:'reviewed',quote}}));
    }catch(e){
     failures++;
     if(alive())setQuotes(prev=>({...prev,[leg.ticker]:{state:'blocked',error:e instanceof Error?e.message:'No quote.'}}));
    }
   }
   if(wallet.ready&&wallet.address){
    for(const leg of plan.legs){
     if(!alive())return;
     setStep('Checking '+leg.ticker+' transaction simulation');
     if(alive())setSims(prev=>({...prev,[leg.ticker]:{state:'pending',reason:'Checking latest unsigned transaction…'}}));
     try{
      const response=await fetch('/api/sentinel/simulate',{method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({ticker:leg.ticker,platform:leg.platform,amountUsd:leg.amountUsd,walletAddress:wallet.address}),
       cache:'no-store',signal:AbortSignal.any([abort.signal,AbortSignal.timeout(55000)])});
      const data=await response.json();
      if(!response.ok)throw Error(data.error||'Route simulator returned no usable result.');
      const passed=data.simulation?.status==='PASS'&&data.state==='SIMULATION_PASSED'&&Date.parse(data.expiresAt)>Date.now();
      if(alive())setSims(prev=>({...prev,[leg.ticker]:{state:passed?'pass':'blocked',
       reason:passed?'Unsigned route predicted success. This is not settlement.':data.simulation?.reason||'Unsigned route did not pass simulation.',
       reported:String(data.simulation?.reportedStatus||data.simulation?.status||'UNKNOWN')}}));
     }catch(e){if(alive())setSims(prev=>({...prev,[leg.ticker]:{state:'unavailable',
      reason:e instanceof Error?e.message:'Simulation unavailable.'}}));}
    }
   }
   if(alive())setStep(failures?'Some prices could not be reviewed':'Review completed. Choose a purchase route below.');
  }catch(e){if(alive())setError(e instanceof Error?e.message:'Review interrupted.');}
  finally{if(controller.current===abort){setBusy(false);controller.current=null;}}
 }
 useEffect(()=>{
  if(feed!=='live'||plan.issues.length||!plan.legs.length||busy||ran)return;
  void analyze();
 },[key,feed,plan.issues.length,plan.legs.length,busy,ran]);
 const keyRef=useRef(key);keyRef.current=key;
 const statuses=[
  {label:'Your basket',status:!plan.issues.length&&feed==='live'?'pass':'fail',
   detail:plan.issues[0]||'Live issuer contracts and exact USDT allocations.'},
  {label:'Wallet connection',status:wallet.ready?'pass':'pending',
   detail:wallet.ready?'BSC account '+wallet.address?.slice(0,9)+'…'+wallet.address?.slice(-5):'Connect a compatible BSC wallet to check this account.'},
  {label:'Funds & network fees',status:funds?.usdtCoversAmount?'pass':funds?'fail':'pending',
   detail:funds?('USDT '+(funds.usdtBalance||'—')+' · BNB '+(funds.bnbBalance||'—')+' · gas estimation '+(funds.bnbCoversBufferedSwapEstimate===true?'sufficient':funds.bnbCoversBufferedSwapEstimate===false?'not sufficient':'not verified')):fundsError||'No current wallet balance check.'},
  {label:'Venue prices',status:pricesObserved?'pass':hasBlock?'fail':'pending',
   detail:pricesObserved?'Every issuer returned a policy-cleared indication. A fresh executable route is rebuilt automatically before signing.':'Each issuer needs a size-specific price indication.'},
  {label:'Issuer eligibility',status:'pending',detail:'You must explicitly attest eligibility for the selected issuer before every live authorization.'},
  {label:'Execution route',status:allSimsPass?'pass':'pending',detail:allSimsPass?'Unsigned provider-built routes predicted success. A fresh route is rebuilt before signing.':approvalNeeded?'The route reached simulation but needs an exact-size USDT approval. Prepare it in the browser-wallet lane below.':'Connect a wallet and run simulation, or use the local Agentic Wallet route.'}
 ] as const;
 return <div className="desk-wrap product-invest">
  <div className="product-breadcrumb"><Link href="/sentinel/buy"><ArrowLeft size={16}/> Change basket</Link><span>REVIEW → BUY</span></div>
  <header className="product-invest-head"><div><span className="product-section-label">CHECKOUT</span>
   <h1>Review.<br/><em>Then buy.</em></h1>
   <p>Sentinel is checking live prices, wallet readiness and transaction safety automatically. You only approve the actions your wallet must sign.</p></div>
   <div className="product-invest-summary"><span>PROPOSED INPUT</span><strong>{$(plan.totalUsd)}</strong><small>{basket.length} issuer contracts · BSC USDT</small></div>
  </header>
  <div className="product-invest-layout">
   <section className="product-invest-main">
    <div className="product-paper">
     <div className="product-paper-top"><span>YOUR ORDER</span><span>{busy?'CHECKING AUTOMATICALLY':'LIVE REVIEW'}</span></div>
     {plan.legs.length?plan.legs.map((leg,i)=>{
      const status=quotes[leg.ticker];const sim=sims[leg.ticker];
      const fresh=status?.quote&&quoteState(leg,status.quote,now)==='REVIEWED';
      return <article className="product-order-leg" key={leg.ticker}>
       <div className="product-order-heading"><span className="product-order-index">{String(i+1).padStart(2,'0')}</span>
        <TokenMark token={leg.token}/><div><strong>{leg.ticker}</strong><small>{leg.token.company} · {leg.platform==='bstock'?'bStocks':'Ondo'}</small></div>
        <div className="product-order-exposure"><b>{$(leg.amountUsd)}</b><small>{leg.weight}% target</small></div></div>
       <div className="product-order-quote"><div><span>EXPECTED TOKENS</span><strong>{status?.state==='pending'?'Checking…':status?.quote?status.quote.tokenAmount.toLocaleString('en-US',{maximumFractionDigits:9})+' '+leg.symbol:'—'}</strong></div>
        <div><span>AUTOMATIC CHECK</span><strong>{sim?.state==='pass'?'Ready':sim?.state==='pending'?'Checking…':approvalNeeded?'Wallet approval needed':status?.error||'Waiting for wallet'}</strong></div></div>
       {status?.quote&&<p className="product-leg-foot">Indication checked {new Date(status.quote.checkedAt).toLocaleTimeString()} · {fresh?'live now':'fresh route rebuilt before wallet request'} · {status.quote.priceImpactPct===null?'impact unavailable':status.quote.priceImpactPct.toFixed(4)+'% indicated impact'}</p>}
       {status?.error&&<p className="product-leg-error"><XCircle size={14}/>{status.error}</p>}
       <details className="product-advanced-details"><summary>Issuer and route details</summary><p>Token contract: <code>{leg.contract}</code></p><p>Token/share conversion: {leg.token.tokenToShareRatio?.toFixed(9)??'unavailable'}. Provider mark: {formatUsd(leg.token.tokenPrice)} per token. Neither a quote nor an indicated share equivalent is a settled token amount.</p></details>
      </article>;
     }):<div className="product-review-empty"><p>There isn't a basket ready to review.</p><Link href="/sentinel/buy">Build a basket <ArrowRight size={16}/></Link></div>}
     <div className="product-paper-total"><span>TOTAL PROPOSED SPEND</span><b>{$(plan.totalUsd)} USDT</b></div>
     <p className="product-paper-disclaimer">Transaction fees, final received tokens and issuer restrictions may differ. No live order has been submitted by this screen.</p>
    </div>
    <section className="product-preflight product-auto-preflight" id="preflight">
     <div className="product-preflight-title"><div><span className="product-section-label">AUTOMATIC SAFETY CHECK</span><h2>{busy?step:quoteBlocked?'Something needs attention':wallet.ready?'Ready for wallet authorization':'Connect your wallet to finish'}</h2></div>
      <span>{busy?'RUNNING':quoteBlocked?'BLOCKED':ran?'UP TO DATE':'STARTING'}</span></div>
     <div className="product-auto-progress"><span className={feed==='live'?'done':''}>Live inventory</span><span className={pricesObserved?'done':''}>Price source</span><span className={wallet.ready?'done':''}>Wallet</span><span className={allSimsPass||approvalNeeded?'done':''}>Route check</span></div>
     <details className="product-advanced-details"><summary>See all automatic checks</summary>{statuses.map(s=><div className="product-check" key={s.label}>
      <span className={'product-check-icon '+s.status}>{s.status==='pass'?<Check size={17}/>:s.status==='fail'?<ShieldAlert size={17}/>:<Clock3 size={17}/>}</span>
      <div><strong>{s.label}</strong><small>{s.detail}</small></div><span>{s.status==='pass'?'CHECKED':s.status==='fail'?'NOT CLEARED':'PENDING'}</span>
     </div>)}</details>
     {(error||quoteBlocked)&&<button type="button" className="product-preflight-run" disabled={busy} onClick={()=>void analyze()}><RefreshCw size={17}/> Retry automatic checks</button>}
     {error&&<p className="product-leg-error" role="alert">{error}</p>}
    </section>
    <section className="product-purchase" id="purchase">
     <div className="product-preflight-title"><div><span className="product-section-label">BUY</span><h2>Approve only in your wallet.</h2></div><span>USER AUTHORIZED</span></div>
     <ExecutionAuthorization legs={plan.legs.map(x=>({ticker:x.ticker,platform:x.platform,amountUsd:x.amountUsd}))}
      enabled={wallet.ready&&feed==='live'&&plan.issues.length===0&&ran&&!quoteBlocked&&!busy} operationKey={key}/>
     <details className="product-advanced-details product-agentic-option"><summary>Advanced: use Binance Agentic Wallet instead</summary>
      <p>The local bridge can execute a bStocks basket, but it requires local setup and is intended for advanced users.</p>
      {basket.some(x=>x.platform!=='bstock')&&<p className="product-lane-warning">This basket contains an Ondo wrapper; the Agentic route supports bStocks only.</p>}
      <Link href="/sentinel/agent">Open advanced Agentic checkout <ArrowRight size={15}/></Link></details>
    </section>
   </section>
   <aside className="product-invest-side">
    <span className="product-section-label">YOUR WALLET</span><h2>Connect.<br/><em>We check the rest.</em></h2>
    <p>Connect on BNB Smart Chain. Sentinel automatically checks balances, allowance, the live route and settlement. No seed phrase or developer installation is required.</p>
    <div className="product-connect-wallet"><WalletControls/><small>{wallet.ready?wallet.address:'Connect a BSC wallet to check available USDT and network fees.'}</small></div>
    <div className="product-route-summary"><strong>{busy?'Running automatic checks…':wallet.ready?'Wallet connected':'One connection required'}</strong><p>{wallet.ready?'You will only be interrupted when your wallet must approve an on-chain action.':'Connect once; read-only checks continue automatically.'}</p></div>
    <a href="#purchase" className="product-buy-ready">Continue to buy <ArrowRight size={17}/></a>
    <p className="product-side-note">Sentinel never signs automatically. Every on-chain approval or purchase still requires your wallet confirmation.</p>
    <Link href="/sentinel/portfolio" className="product-invest-portfolio">View your on-chain portfolio <ArrowUpRight size={16}/></Link>
    <details className="product-advanced-details product-advanced-rail"><summary>Advanced tools</summary><Link href="/sentinel/review">Venue research →</Link><Link href="/sentinel/execute">Simulation diagnostics →</Link><Link href="/sentinel/agent">Agentic Wallet bridge →</Link></details>
   </aside>
  </div>
 </div>;
}
