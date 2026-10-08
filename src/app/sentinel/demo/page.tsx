'use client';
import Link from 'next/link';
import {ArrowDownRight,ArrowUpRight,BookOpen,Clock3,LockKeyhole,Route,Scale,ShieldCheck} from 'lucide-react';
import {useDesk} from '@/components/sentinel/DeskContext';
import {Eyebrow} from '@/components/sentinel/DeskBits';
import {formatUsd,type Equity} from '@/lib/sentinel/model';

const issuerName=(p:string)=>p==='bstock'?'bStocks':'Ondo Finance';
const formatRatio=(value:number|null)=>value===null?'—':value.toLocaleString('en-US',{maximumFractionDigits:9,minimumFractionDigits:6});

export default function GuidedDemo(){
 const {snapshot,feed}=useDesk();
 const candidates=snapshot?.tokens.filter(t=>t.ticker==='NVDA')||[];
 const bst=candidates.find(t=>t.platform==='bstock');
 const ond=candidates.find(t=>t.platform==='ondo');
 const live=feed==='live';
 return <div className="desk-wrap desk-guide">
  <div className="desk-breadcrumb"><Link href="/sentinel">THE BRIEF</Link><span>→</span><b>GUIDED DEMO</b></div>
  <div className="desk-guide-flag"><span>THE PRODUCT, NOT A SLIDE DECK</span><span>BNB / CHAIN 56</span><span>RESEARCH ONLY</span></div>
  <section className="desk-guide-hero">
   <div className="desk-guide-hero-copy">
    <Eyebrow>START HERE / SENTINEL IN THREE MOVES</Eyebrow>
    <h1>One stock.<br/>Two tokens.<br/><em>Which one?</em></h1>
    <p className="desk-guide-sub">NVIDIA can appear as two different token contracts on BNB Chain. Different issuers, different token-to-share ratios, and different live venue indications. A raw token count can mislead you.</p>
    <div className="desk-guide-primary">
     <Link className="desk-button-accent" href="/sentinel/markets/NVDA">Examine NVIDIA <ArrowUpRight size={18}/></Link>
     <a className="desk-guide-text-cta" href="#walkthrough">Follow the walkthrough <ArrowDownRight size={16}/></a>
    </div>
    <div className={'desk-guide-source '+(live?'is-live':'is-offline')}>
     <span className="desk-guide-source-led"/>
     <div><strong>{live?'Signed market inventory connected':feed==='connecting'?'Connecting to the actual market inventory…':'Market inventory not currently live'}</strong>
     <small>{live?(snapshot?.count??'—')+' real token contracts · '+(snapshot?.tickers??'—')+' underlying tickers':'No substitute data is shown. You can still follow the walkthrough.'}</small></div>
    </div>
   </div>
   <div className="desk-guide-proof" aria-label="NVIDIA issuer records from Binance Web3 market inventory">
    <div className="desk-guide-proof-head"><span>ISSUER RECORD / {live&&bst&&ond?'02 CONTRACTS':'AWAITING DATA'}</span><span>FIG. A</span></div>
    <div className="desk-guide-proof-title">The same underlying.<br/><i>Different math.</i></div>
    <div className="desk-guide-duo">
     {(['bstock','ondo'] as const).map((p,i)=>{
      const token=p==='bstock'?bst:ond;
      return <div className="desk-guide-duo-row" key={p}>
       <div className="desk-guide-duo-index">0{i+1}</div>
       <div className="desk-guide-duo-name"><strong>{live?token?.symbol||'—':'—'}</strong><small>{issuerName(p)}</small></div>
       <div className="desk-guide-duo-data"><small>WRAPPER RATIO</small><strong>{live&&token?formatRatio(token.tokenToShareRatio):'—'}</strong></div>
      </div>;
     })}
    </div>
    <div className="desk-guide-proof-bottom">
     <div><span>REFERENCE SHARE</span><b>{live?formatUsd(bst?.referencePrice??ond?.referencePrice??null,2):'—'}</b></div>
     <div><span>QUOTE MODE</span><b>REQUEST TO SEE</b></div>
    </div>
    <p>Real inventory metadata only. No fabricated quote, stock ownership or filled trade.</p>
   </div>
  </section>
  <section id="walkthrough" className="desk-guide-roadmap" aria-labelledby="desk-guide-roadmap-title">
   <div className="desk-guide-roadmap-intro"><div><Eyebrow>THREE MOVES / THE USER JOURNEY</Eyebrow><h2 id="desk-guide-roadmap-title">Don't start with a trade.<br/><em>Start with a question.</em></h2></div>
    <p>Each stop opens the real product. No demo-only prices or trades. The screens use Binance Web3 data when the signed market feed is connected.</p></div>
   <div className="desk-guide-steps">
    <article className="desk-guide-step">
     <div className="desk-guide-step-heading"><span>01 / DISCOVER + COMPARE</span><Scale size={22}/></div>
     <h3>Which wrapper<br/>means <em>more exposure?</em></h3>
     <p>Inspect NVIDIA's bStocks and Ondo contracts, their different conversion ratios, then request two real $10 quotes to compare share-equivalent exposure.</p>
     <div className="desk-guide-step-observe"><strong>WHAT TO LOOK FOR</strong><span>Token output × conversion ratio = indicative underlying-share equivalent</span></div>
     <Link href="/sentinel/markets/NVDA" className="desk-guide-step-link">Open NVIDIA dossier <ArrowUpRight size={17}/></Link>
     <div className="desk-guide-step-no">01</div>
    </article>
    <article className="desk-guide-step">
     <div className="desk-guide-step-heading"><span>02 / CONSTRUCT</span><Route size={22}/></div>
     <h3>Turn a thesis<br/>into <em>an allocation.</em></h3>
     <p>Choose the Compute Stack research theme in Basket Studio, inspect the issuer contracts, adjust weights and enter a BSC USDT research budget.</p>
     <div className="desk-guide-step-observe"><strong>WHAT TO LOOK FOR</strong><span>Exact 100% allocation · explicit issuers · no shares minted</span></div>
     <Link href="/sentinel/baskets" className="desk-guide-step-link">Open Basket Studio <ArrowUpRight size={17}/></Link>
     <div className="desk-guide-step-no">02</div>
    </article>
    <article className="desk-guide-step">
     <div className="desk-guide-step-heading"><span>03 / INSPECT THE ROUTE</span><ShieldCheck size={22}/></div>
     <h3>Can the thesis<br/><em>survive scrutiny?</em></h3>
     <p>With a basket selected, open Execution Review. Request venue indications and check issuer availability, reference-adjusted basis, quoted impact and quote freshness.</p>
     <div className="desk-guide-step-observe"><strong>WHAT TO LOOK FOR</strong><span>A read-only pretrade review · no signatures, approvals or swaps</span></div>
     <Link href="/sentinel/review" className="desk-guide-step-link">Open Execution Review <ArrowUpRight size={17}/></Link>
     <div className="desk-guide-step-no">03</div>
    </article>
   </div>
  </section>
  <section className="desk-guide-operator" aria-label="Notes for reproducing the product demo">
   <div className="desk-guide-operator-lead"><span>OPERATOR'S NOTE / A</span><h2>Wallet optional.<br/><em>Truth mandatory.</em></h2></div>
   <div className="desk-guide-operator-details">
    <div><LockKeyhole size={19}/><p><b>A public address is not wallet access.</b> The observed Ondo SWAP quote required a public BSC receiving address. Never enter a seed phrase or private key; this flow never signs.</p></div>
    <div><Clock3 size={19}/><p><b>Quotes are momentary.</b> Both issuer quotes must be fresh within 30 seconds. Sentinel expires the live verdict and labels any earlier comparison as reference-only.</p></div>
    <div><BookOpen size={19}/><p><b>Optional Agentic Wallet handoff.</b> An owner-operated Binance CLI quote succeeded locally. Sentinel can import a sanitized quote observation—not the wallet session. No trade was executed.</p></div>
   </div>
  </section>
  <section className="desk-guide-closing">
   <div><span>THE POINT / NOT JUST A DASHBOARD</span><h2>Better questions.<br/><em>Before better trades.</em></h2></div>
   <div><p>A pretrade research desk, not a broker or automated trader. Assess the real API integration, contract-level issuer data, quote freshness and transparent failure states—not invented performance.</p>
    <Link href="/sentinel/markets/NVDA">Start with NVIDIA <ArrowUpRight size={18}/></Link></div>
  </section>
 </div>;
}
