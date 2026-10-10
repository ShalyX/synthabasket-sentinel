'use client';
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,Check,Clock3,RefreshCw,ShieldAlert,XCircle} from 'lucide-react';
import {useDesk} from '@/components/sentinel/DeskContext';
import {useWallet} from '@/components/sentinel/WalletContext';
import {WalletControls} from '@/components/sentinel/WalletControls';
import {TokenMark} from '@/components/sentinel/DeskBits';
import {ExecutionAuthorization} from '@/components/sentinel/ExecutionAuthorization';
import {checkoutGate,checkoutPlan,LIVE_BASKET_MAX_USD,planKey,quoteState} from '@/lib/sentinel/product-journey';
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
 const [purchaseLane,setPurchaseLane]=useState<'agentic'|'browser'>('agentic');
 const controller=useRef<AbortController|null>(null);
 useEffect(()=>{try{const n=Number(sessionStorage.getItem('sentinel-budget-v1'));if(Number.isFinite(n)&&n>=1&&n<=LIVE_BASKET_MAX_USD)setBudget(n);}catch{/* optional */}},[]);
 useEffect(()=>{setNow(Date.now());const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const tokens=snapshot?.tokens??[];
 const plan=useMemo(()=>checkoutPlan(basket,tokens,budget),[basket,tokens,budget]);
 const key=planKey(plan,wallet.address);
 const scoped=Object.fromEntries(Object.entries(quotes).map(([ticker,x])=>[ticker,x.quote])) as Record<string,QuotePreview|undefined>;
 const gate=checkoutGate(plan,wallet.ready,feed==='live',scoped,now);
 const hasBlock=Object.values(quotes).some(x=>x.state==='blocked')||Object.values(sims).some(x=>x.state==='blocked');
 const quoteBlocked=Object.values(quotes).some(x=>x.state==='blocked');
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
 const keyRef=useRef(key);keyRef.current=key;
 const statuses=[
  {label:'Your basket',status:!plan.issues.length&&feed==='live'?'pass':'fail',
   detail:plan.issues[0]||'Live issuer contracts and exact USDT allocations.'},
  {label:'Wallet connection',status:wallet.ready?'pass':'pending',
   detail:wallet.ready?'BSC account '+wallet.address?.slice(0,9)+'…'+wallet.address?.slice(-5):'Connect a compatible BSC wallet to check this account.'},
  {label:'Funds & network fees',status:funds?.usdtCoversAmount?'pass':funds?'fail':'pending',
   detail:funds?('USDT '+(funds.usdtBalance||'—')+' · BNB '+(funds.bnbBalance||'—')+' · gas estimation '+(funds.bnbCoversBufferedSwapEstimate===true?'sufficient':funds.bnbCoversBufferedSwapEstimate===false?'not sufficient':'not verified')):fundsError||'No current wallet balance check.'},
  {label:'Venue prices',status:gate.quotes?'pass':hasBlock?'fail':'pending',
   detail:gate.quotes?'All live indications passed the price policy. Quotes expire after 30 seconds.':'Each issuer needs a fresh, size-specific quote.'},
  {label:'Issuer eligibility',status:'pending',detail:'You must explicitly attest eligibility for the selected issuer before every live authorization.'},
  {label:'Execution route',status:allSimsPass?'pass':'pending',detail:allSimsPass?'Unsigned provider-built routes predicted success. A fresh route is rebuilt before signing.':approvalNeeded?'The route reached simulation but needs an exact-size USDT approval. Prepare it in the browser-wallet lane below.':'Connect a wallet and run simulation, or use the local Agentic Wallet route.'}
 ] as const;
 return <div className="desk-wrap product-invest">
  <div className="product-breadcrumb"><Link href="/sentinel"><ArrowLeft size={16}/> Edit basket</Link><span>02 / REVIEW & INVEST</span></div>
  <header className="product-invest-head"><div><span className="product-section-label">THE CHECKOUT / NO SURPRISES</span>
   <h1>Review what<br/><em>you'd own.</em></h1>
   <p>One place for your chosen stocks, live venue indications, wallet readiness and the exact reasons a purchase can—or cannot—proceed.</p></div>
   <div className="product-invest-summary"><span>PROPOSED INPUT</span><strong>{$(plan.totalUsd)}</strong><small>{basket.length} issuer contracts · BSC USDT</small></div>
  </header>
  <div className="product-invest-layout">
   <section className="product-invest-main">
    <div className="product-paper">
     <div className="product-paper-top"><span>01 / YOUR PROPOSED ORDER</span><span>NOT AN EXECUTED TRADE</span></div>
     {plan.legs.length?plan.legs.map((leg,i)=>{
      const status=quotes[leg.ticker];const sim=sims[leg.ticker];
      const fresh=status?.quote&&quoteState(leg,status.quote,now)==='REVIEWED';
      return <article className="product-order-leg" key={leg.ticker}>
       <div className="product-order-heading"><span className="product-order-index">{String(i+1).padStart(2,'0')}</span>
        <TokenMark token={leg.token}/><div><strong>{leg.ticker}</strong><small>{leg.token.company} · {leg.platform==='bstock'?'bStocks':'Ondo'}</small></div>
        <div className="product-order-exposure"><b>{$(leg.amountUsd)}</b><small>{leg.weight}% target</small></div></div>
       <div className="product-order-quote"><div><span>LIVE INDICATION</span><strong>{status?.state==='pending'?'Checking…':fresh?status.quote!.tokenAmount.toLocaleString('en-US',{maximumFractionDigits:9})+' '+leg.symbol:'—'}</strong></div>
        <div><span>VENUE / POLICY</span><strong>{fresh?status.quote!.vendor||'Unnamed venue':status?.error||'Awaiting price review'}</strong></div>
        <div><span>ROUTE SIMULATION</span><strong>{sim?.state==='pass'?'Predicted pass':sim?.state==='pending'?'Checking…':sim?.reason||'Not tested'}</strong></div></div>
       {status?.quote&&<p className="product-leg-foot">Quote checked {new Date(status.quote.checkedAt).toLocaleTimeString()} · {fresh?'fresh':'expired or flagged'} · {status.quote.priceImpactPct===null?'impact unavailable':status.quote.priceImpactPct.toFixed(4)+'% indicated impact'}</p>}
       {status?.error&&<p className="product-leg-error"><XCircle size={14}/>{status.error}</p>}
       <details className="product-advanced-details"><summary>Issuer and route details</summary><p>Token contract: <code>{leg.contract}</code></p><p>Token/share conversion: {leg.token.tokenToShareRatio?.toFixed(9)??'unavailable'}. Provider mark: {formatUsd(leg.token.tokenPrice)} per token. Neither a quote nor an indicated share equivalent is a settled token amount.</p></details>
      </article>;
     }):<div className="product-review-empty"><p>There isn't a basket ready to review.</p><Link href="/sentinel">Build a basket <ArrowRight size={16}/></Link></div>}
     <div className="product-paper-total"><span>TOTAL PROPOSED SPEND</span><b>{$(plan.totalUsd)} USDT</b></div>
     <p className="product-paper-disclaimer">Transaction fees, final received tokens and issuer restrictions may differ. No live order has been submitted by this screen.</p>
    </div>
    <section className="product-preflight" id="preflight">
     <div className="product-preflight-title"><div><span className="product-section-label">02 / SENTINEL'S SAFETY CHECKS</span><h2>Let the agent do the checking.</h2></div><span>READ-ONLY</span></div>
     {statuses.map((s,i)=><div className="product-check" key={s.label}>
      <span className={'product-check-icon '+s.status}>{s.status==='pass'?<Check size={17}/>:s.status==='fail'?<ShieldAlert size={17}/>:<Clock3 size={17}/>}</span>
      <div><strong>{s.label}</strong><small>{s.detail}</small></div><span>{s.status==='pass'?'CHECKED':s.status==='fail'?'NOT CLEARED':'PENDING'}</span>
     </div>)}
     {plan.issues.length>0&&<div className="product-issue">{plan.issues.join(' · ')}</div>}
     <button type="button" className="product-preflight-run" disabled={busy||plan.issues.length>0||feed!=='live'} onClick={()=>void analyze()}>
      <RefreshCw size={17} className={busy?'desk-spin':''}/> {busy?step:ran?'Refresh all prices & checks':'Check prices, funding & execution safety'} <ArrowRight size={16}/></button>
     {error&&<p className="product-leg-error" role="alert">{error}</p>}
     <p className="product-preflight-note">Quotes, funding checks and unsigned simulation never sign or send transactions. Quotes expire and simulation outcomes are predictions, not proof of a fill.</p>
    </section>
    <section className="product-purchase" id="purchase">
     <div className="product-preflight-title"><div><span className="product-section-label">05 / AUTHORIZE &amp; PURCHASE</span><h2>One plan. Two signer routes.</h2></div><span>USER AUTHORIZED</span></div>
     <p className="product-purchase-intro">Both routes rebuild fresh quotes before spending. Neither route stores a seed phrase or treats simulation as settlement.</p>
     <div className="product-lane-tabs" role="tablist" aria-label="Purchase route">
      <button type="button" role="tab" aria-selected={purchaseLane==='agentic'} className={purchaseLane==='agentic'?'selected':''} onClick={()=>setPurchaseLane('agentic')}><b>Agentic Wallet</b><span>Whole basket · bStocks · local bridge</span></button>
      <button type="button" role="tab" aria-selected={purchaseLane==='browser'} className={purchaseLane==='browser'?'selected':''} onClick={()=>setPurchaseLane('browser')}><b>Browser wallet</b><span>Per-leg signing · bStocks or Ondo</span></button>
     </div>
     {purchaseLane==='agentic'?<div className="product-agentic-lane">
      <span className="product-route-badge">RECOMMENDED FOR BASKET EXECUTION</span><h3>Purchase sequentially with Binance Agentic Wallet.</h3>
      <p>The origin-restricted bridge runs on your computer, previews every bStocks leg, requires the phrase <code>EXECUTE BASKET</code>, journals before submission, stops on ambiguity, and independently reconciles BSC delivery.</p>
      {basket.some(x=>x.platform!=='bstock')&&<p className="product-lane-warning">This basket contains an Ondo wrapper. Switch it to bStocks in Build, or use browser-wallet signing for that leg.</p>}
      <Link className="product-route-cta" href="/sentinel/agent">Open Agentic Wallet purchase <ArrowRight size={17}/></Link>
     </div>:<ExecutionAuthorization legs={plan.legs.map(x=>({ticker:x.ticker,platform:x.platform,amountUsd:x.amountUsd}))}
       enabled={wallet.ready&&feed==='live'&&plan.issues.length===0&&ran&&!quoteBlocked&&!busy} operationKey={key}/>}
    </section>
   </section>
   <aside className="product-invest-side">
    <span className="product-section-label">03 / YOUR WALLET</span><h2>Only you<br/><em>authorize funds.</em></h2>
    <p>Connect a supported wallet on BNB Smart Chain. Your wallet address is used to inspect balances and issuer holdings. No seed phrase or developer installation is required.</p>
    <div className="product-connect-wallet"><WalletControls/><small>{wallet.ready?wallet.address:'Connect a BSC wallet to check available USDT and network fees.'}</small></div>
    <div className="product-route-summary"><strong>Two purchase routes available</strong><p>Agentic Wallet executes an approved bStocks basket locally. Browser wallet prepares one exact-size approval or swap at a time.</p></div>
    <a href="#purchase" className="product-buy-ready">Choose purchase route <ArrowRight size={17}/></a>
    <p className="product-side-note">A quote or simulated success never spends funds. Each route requires a fresh review, explicit eligibility confirmation and a wallet-owned authorization.</p>
    <Link href="/sentinel/portfolio" className="product-invest-portfolio">View your on-chain portfolio <ArrowUpRight size={16}/></Link>
    <details className="product-advanced-details product-advanced-rail"><summary>Advanced diagnostics</summary><Link href="/sentinel/review">Detailed venue research →</Link><Link href="/sentinel/execute">Simulation Lab →</Link><Link href="/sentinel/agent">Agentic Wallet execution room →</Link></details>
   </aside>
  </div>
 </div>;
}
