'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {ArrowDownRight,ArrowRight,ArrowUpRight,Database,Eye,GitBranch,LockKeyhole,Route,Scale,ShieldAlert} from 'lucide-react';
import {useDesk} from '@/components/sentinel/DeskContext';
import {useWallet} from '@/components/sentinel/WalletContext';
import {Eyebrow} from '@/components/sentinel/DeskBits';
import {trustedJourneyProof,journeyProofLabel} from '@/lib/sentinel/journey-evidence';

export default function GuidedDemo(){
 const {snapshot,feed,basket,setFromTickers,journeyProofs}=useDesk();
 const wallet=useWallet();
 const [now,setNow]=useState(0);
 useEffect(()=>{setNow(Date.now());const id=window.setInterval(()=>setNow(Date.now()),10000);return()=>window.clearInterval(id);},[]);
 const live=feed==='live'&&!!snapshot;
 const nvidia=live?snapshot.tokens.filter(t=>t.ticker==='NVDA'):[];
 const bst=nvidia.find(x=>x.platform==='bstock'),ond=nvidia.find(x=>x.platform==='ondo');
 const sampleReady=live&&snapshot.tokens.some(t=>t.ticker==='AMD')&&nvidia.length>0;
 const basketReady=basket.length>0&&basket.reduce((sum,item)=>sum+item.weight,0)===100&&basket.every(leg=>snapshot?.tokens.some(t=>t.ticker===leg.ticker&&t.platform===leg.platform));
 const proofs=useMemo(()=>journeyProofs.filter(p=>trustedJourneyProof(p,wallet.address,basket,now)),[journeyProofs,wallet.address,basket,now]);
 const simulation=proofs.find(p=>p.kind==='SIMULATION');
 const portfolio=proofs.find(p=>p.kind==='PORTFOLIO');
 const steps=[
  {number:'01',phase:'DISCOVER',name:'Know the issuer, not just the ticker.',status:live?'SOURCE LIVE':'SOURCE UNAVAILABLE',tone:live?'ready':'wait',
   copy:'Read actual BSC token contracts, wrapper conversion ratios and provider marks. A displayed mark is not an executable quote.',
   evidence:live?String(snapshot.count)+' contracts / '+snapshot.tickers+' tickers · '+(snapshot.source==='first-party-production-readonly'?'first-party read-only relay':'server-authenticated Binance inventory'):'The app never supplies substitute market data.',
   href:'/sentinel/markets/NVDA',cta:'Inspect two NVIDIA wrappers'},
  {number:'02',phase:'CONSTRUCT',name:'Give the thesis an exact weight.',status:basketReady?'TARGET DEFINED':'NEEDS BASKET',tone:basketReady?'ready':'wait',
   copy:'Choose issuer contracts and allocation weights that total 100%. This is a local target, not a token purchase or deposit.',
   evidence:basketReady?basket.map(x=>x.ticker+' '+x.weight+'% / '+(x.platform==='bstock'?'bStocks':'Ondo')).join(' · '):'No allocation has been confirmed in this browser.',
   href:'/sentinel/baskets',cta:'Open Basket Studio'},
  {number:'03',phase:'PRICE & REVIEW',name:'Question every proposed leg.',status:'REQUEST FRESH QUOTES',tone:'wait',
   copy:'User-triggered calls check the venue, impact, basis and quote freshness. Pretrade review is not a filled order or legal eligibility determination.',
   evidence:'Live quote proof appears on Execution Review only after a fresh request. We do not replay historical prices as live.',
   href:'/sentinel/review',cta:'Request live venue quotes'},
  {number:'04',phase:'QUOTE → BUILD → SIMULATE',name:'Rehearse the actual calldata.',status:simulation?simulation.state.replaceAll('_',' '):'NOT RUN THIS SESSION',tone:simulation?.state==='SIMULATOR_PASSED'?'ready':simulation?'blocked':'wait',
   copy:'Each leg gets a real unsigned BSC swap build and Transaction API simulation. The first blocked leg stops the sequence.',
   evidence:simulation?simulation.observedLegs+'/'+simulation.totalLegs+' legs · '+simulation.summary:'No simulation result has been collected for this wallet and basket in this browser session.',
   href:'/sentinel/execute',cta:'Build and simulate basket'},
  {number:'05',phase:'PERMISSION TO SPEND',name:'The agent must be able to stop.',status:'EXECUTION LOCKED',tone:'blocked',
   copy:'Vendor swap internals, upgrade controls, and issuer-specific user eligibility remain unverified. Wallet approvals and live spending are disabled.',
   evidence:'Neither an issuer quote nor a PASS simulation is a purchase. There is no authorized trade or mined delivery receipt.',
   href:'/sentinel/execute',cta:'Inspect the safety gates'},
  {number:'06',phase:'PORTFOLIO WATCH',name:'Observe what the wallet actually holds.',status:portfolio?portfolio.state.replaceAll('_',' '):'NOT OBSERVED IN SESSION',tone:portfolio?.state==='PORTFOLIO_DRIFT'?'blocked':portfolio?'ready':'wait',
   copy:'Read issuer-token balances at a pinned BSC block and compare marked exposure with target weights. Empty holdings never trigger an invented rebalance.',
   evidence:portfolio?portfolio.summary:'The monitoring step can be inspected independently; a watchlist is not evidence of a purchase.',
   href:'/sentinel/watch',cta:'Read real portfolio balances'}
 ] as const;
 return <div className="desk-wrap desk-journey">
  <div className="desk-breadcrumb"><Link href="/sentinel">THE BRIEF</Link><span>→</span><b>EXECUTION WALKTHROUGH</b></div>
  <div className="desk-journey-stripe"><span>WORKING PRODUCT / LIVE DATA WHERE AUTHORIZED</span><span>BNB SMART CHAIN · 56</span><span>NO PURCHASE CLAIMED</span></div>
  <section className="desk-journey-hero">
   <div className="desk-journey-hero-copy">
    <Eyebrow>THE WHOLE AGENT LOOP / NOT JUST WRAPPER COMPARISON</Eyebrow>
    <h1>A basket<br/>is a plan.<br/><em>Can it execute?</em></h1>
    <p>Sentinel translates tokenized equities into a weighted BSC basket, checks each proposed spot transaction, and explains why it can—or cannot—proceed. The agent plans and verifies. The human owns every spending decision.</p>
    <div className="desk-journey-primary"><a href="#decision-sequence" className="desk-button-accent">Follow six decisions <ArrowDownRight size={17}/></a><Link href="/sentinel/baskets" className="desk-journey-inline">Build a basket <ArrowUpRight size={16}/></Link></div>
    <div className="desk-journey-trust"><LockKeyhole size={16}/> MAINNET EXECUTION LOCKED / NO STOCK TOKENS PURCHASED</div>
   </div>
   <aside className="desk-journey-proof">
    <div className="desk-journey-proof-top"><span>CONTROL ROOM / LIVE CONTEXT</span><span>FIG. 01</span></div>
    <div className="desk-journey-proof-row"><span>01 / ISSUER INVENTORY</span><strong>{live?String(snapshot.count):'—'}</strong><small>{live?'Real observed contracts':'Unavailable'}</small></div>
    <div className="desk-journey-proof-row"><span>02 / BASKET TARGET</span><strong>{basketReady?basket.length+' LEGS':'—'}</strong><small>{basketReady?'Weights total 100%':'Select constituent issuers'}</small></div>
    <div className="desk-journey-proof-row"><span>03 / BSC WALLET</span><strong>{wallet.ready?'CHAIN 56':'—'}</strong><small>{wallet.ready?'Connected browser wallet':'Connect before simulation'}</small></div>
    <div className="desk-journey-proof-row"><span>04 / SWAP RELEASE</span><strong className="stop">NO GO</strong><small>Contract semantics + eligibility unverified</small></div>
    <p>Evidence from this browser, not a staged fill or synthetic basket position.</p>
   </aside>
  </section>
  <section className="desk-journey-themes">
   <div><Scale size={20}/><b>TWO WRAPPERS</b><p>{live&&bst&&ond?bst.symbol+' vs '+ond.symbol+' · separate NVIDIA issuer contracts':'Wrapper differences require real source records.'}</p></div>
   <div><GitBranch size={20}/><b>ONE WEIGHTED BASKET</b><p>{basketReady?basket.map(x=>x.ticker+' '+x.weight+'%').join(' · '):'A locally defined thesis, not an issued token.'}</p></div>
   <div><ShieldAlert size={20}/><b>A LEGITIMATE STOP</b><p>Funding, simulator status, protocol semantics and jurisdiction all matter.</p></div>
  </section>
  <section id="decision-sequence" className="desk-journey-section">
   <div className="desk-journey-section-title"><div><Eyebrow>THE SIX DECISIONS / READ IN ORDER</Eyebrow><h2>Not just the route.<br/><em>The reasoning.</em></h2></div><p>Each step opens the real application screen. A step is never marked as completed merely because another step succeeded.</p></div>
   <div className="desk-journey-sequence">{steps.map(step=><article className="desk-journey-decision" key={step.number}>
    <div className="desk-journey-index"><span>{step.number}</span><small>{step.phase}</small></div>
    <div className="desk-journey-decision-copy"><h3>{step.name}</h3><p>{step.copy}</p><div className="desk-journey-evidence"><b>DECISION EVIDENCE</b><span>{step.evidence}</span></div></div>
    <div className="desk-journey-decision-action"><strong className={'desk-journey-state '+step.tone}>{step.status}</strong><Link href={step.href}>{step.cta}<ArrowUpRight size={15}/></Link></div>
   </article>)}</div>
  </section>
  <section className="desk-journey-control">
   <div><Eyebrow>OPERATOR / NO SPEND</Eyebrow><h2>Try the complete<br/><em>journey yourself.</em></h2><p>Optionally populate a two-stock target from real issuer records. The action only edits the local composition; no funds, signatures, approvals or transactions are involved.</p></div>
   <div className="desk-journey-control-action"><span>LOCAL RESEARCH TARGET</span><strong>{basketReady?basket.length.toString().padStart(2,'0'):'00'}<small> / 04</small></strong><button type="button" disabled={!sampleReady} onClick={()=>setFromTickers(['NVDA','AMD'])}>Set NVDA + AMD research basket <ArrowRight size={16}/></button><small>{sampleReady?'Evenly weighted; editable in Basket Studio.':'Requires live NVDA and AMD issuer records.'}</small></div>
  </section>
  <section className="desk-journey-session">
   <div className="desk-journey-section-title"><div><Eyebrow>UPSTREAM PROOF / IN THIS BROWSER SESSION</Eyebrow><h2>No receipts<br/><em>invented.</em></h2></div><p>Only actual returned simulator responses and public BSC balance observations are recorded. These are historical observations—not current executable quotes or proof of share ownership.</p></div>
   <div className="desk-journey-log">{proofs.length?proofs.map((proof,i)=>{
    const label=journeyProofLabel(proof,now);
    return <div className="desk-journey-log-row" key={proof.kind+proof.recordedAt+i}><span>{proof.kind==='SIMULATION'?<Route size={21}/>:<Eye size={21}/>}</span><div><b>{label.title}</b><p>{proof.summary}</p><small>{label.caveat} · {new Date(proof.recordedAt).toLocaleTimeString()} · {proof.observedLegs}/{proof.totalLegs} legs</small></div></div>;
   }):<div className="desk-journey-no-proof"><Database size={26}/><div><b>No simulation or wallet-balance proof has been recorded in this session.</b><p>That's an honest starting state. Trigger a real simulation or public BSC balance read to populate the journal.</p></div></div>}</div>
  </section>
  <section className="desk-journey-end"><div><span>THE SUBMISSION TRUTH</span><h2>A useful agent<br/>must be able to <em>say no.</em></h2></div><div><p>Live issuer inventory and unsigned route/simulation calls have been verified. A genuine BSC simulation was blocked by insufficient USDT. The nested router implementation and personal issuer trading eligibility are not independently verified; therefore no approval, swap or purchase was submitted. A portfolio target is not a filled basket.</p><Link href="/sentinel/execute">Inspect live preflight <ArrowUpRight size={18}/></Link></div></section>
 </div>;
}
