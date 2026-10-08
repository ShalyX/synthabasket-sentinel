'use client';
import Link from 'next/link';
import {ArrowDownRight,ArrowRight,ArrowUpRight,CornerDownRight,Info} from 'lucide-react';
import {useDesk} from '@/components/sentinel/DeskContext';
import {Eyebrow,SourceStamp,TickerLine,BlankState} from '@/components/sentinel/DeskBits';
import {selectPreferred} from '@/lib/sentinel/basket';
import {formatBasis,formatUsd} from '@/lib/sentinel/model';
export default function TheBrief(){
 const {snapshot,feed}=useDesk();
 const sample=snapshot?selectPreferred(snapshot.tokens,'NVDA')||snapshot.tokens[0]:undefined;
 const watch=['NVDA','MSFT','AAPL','AMD'].map(ticker=>snapshot?selectPreferred(snapshot.tokens,ticker):undefined)
  .filter((x):x is NonNullable<typeof x>=>!!x);
 return <div className="desk-wrap">
  <div className="desk-page-marker"><span>ISSUE Nº 001</span><span>RESEARCH BEFORE EXECUTION</span><span>BNB CHAIN / 56</span></div>
  <section className="desk-home-hero">
   <div className="desk-home-copy">
    <div className="desk-signifier"><i/>THE RESEARCH DESK FOR TOKENIZED STOCKS</div>
    <h1>A share closes.<br/><em>Its token doesn’t.</em></h1>
    <p>The market you follow and the instrument you buy are not the same thing. Sentinel makes the difference legible — before you put a basket together.</p>
    <div className="desk-home-actions"><Link className="desk-button-accent" href="/sentinel/demo">See the product in three moves <ArrowUpRight size={17}/></Link><Link href="/sentinel/markets" className="desk-text-link">Explore the market <ArrowRight size={16}/></Link></div>
    <p className="desk-trust-note"><span/> Onchain observations, issuer terms, execution checks. Never hypothetical fills.</p>
   </div>
   <div className="desk-home-specimen">
    <div className="desk-specimen-strap"><span>FIG. 01</span><span>WHAT A PRICE DOESN'T TELL YOU</span><span>↗</span></div>
    <div className="desk-specimen-title"><span>PRICE ANATOMY</span><strong>{sample?.ticker||'—'}</strong></div>
    <div className="desk-anatomy-sheet">
     <div className="desk-anatomy-line"><span>01 / UNDERLYING REFERENCE</span><strong>{formatUsd(sample?.referencePrice??null,4)}</strong></div>
     <div className="desk-anatomy-symbol">×</div>
     <div className="desk-anatomy-line"><span>02 / TOKEN-TO-SHARE RATIO</span><strong>{sample?.tokenToShareRatio?.toFixed(6)??'—'}</strong></div>
     <div className="desk-anatomy-equals">=</div>
     <div className="desk-anatomy-line subtotal"><span>CONVERSION-ADJUSTED REFERENCE</span><strong>{sample?.referencePrice&&sample.tokenToShareRatio?formatUsd(sample.referencePrice*sample.tokenToShareRatio,4):'—'}</strong></div>
     <div className="desk-anatomy-line final"><span>OBSERVED TOKEN MARK</span><strong>{formatUsd(sample?.tokenPrice??null,4)}</strong></div>
    </div>
    <div className="desk-anatomy-basis"><span>ADJUSTED BASIS</span><strong>{formatBasis(sample?.basisPct??null)}</strong><span className="desk-mono">vs. converted reference</span></div>
    <p className="desk-specimen-foot">{feed==='live'?'Observed data, not an executable trade.':'Live pricing unavailable — no substitute figures.'} Conversion ratio matters. The difference is the thesis.</p>
   </div>
  </section>
  <section className="desk-home-numbers" aria-label="Market inventory">
   <div><span>STOCK TOKENS TRACKED</span><strong>{snapshot?.count??'—'}</strong><small>Live Binance Web3 inventory</small></div>
   <div><span>UNDERLYING TICKERS</span><strong>{snapshot?.tickers??'—'}</strong><small>Grouped across issuers</small></div>
   <div><span>ACTIVE SOURCE</span><strong className="desk-small-figure">BNB / 56</strong><small>BSC mainnet only</small></div>
   <div className="desk-snapshot-cell"><SourceStamp/></div>
  </section>
  <section className="desk-home-flow">
   <div className="desk-rail-label"><span className="desk-rail-no">02 / A METHOD</span><span>THREE ROOMS. ONE DECISION.</span></div>
   <div className="desk-flow-content">
    <div className="desk-flow-heading"><h2>From curiosity<br/>to <em>conviction.</em></h2><p>We separated the work into actual decisions. No more dashboard trying to do four jobs at once.</p></div>
    <div className="desk-flow-links">
     <Link href="/sentinel/markets"><span>01 / DISCOVER</span><b>The Market Index</b><small>Every issuer, its conversion ratio, and the context around the mark.</small><ArrowUpRight size={22}/></Link>
     <Link href="/sentinel/baskets"><span>02 / CONSTRUCT</span><b>Basket Studio</b><small>Combine exposures with explicit weights and a realistic spending budget.</small><ArrowUpRight size={22}/></Link>
     <Link href="/sentinel/review"><span>03 / INTERROGATE</span><b>Execution Review</b><small>Ask the venues for real quotes; let the policy expose what's missing.</small><ArrowUpRight size={22}/></Link>
    </div>
   </div>
  </section>
  <section className="desk-home-watch">
   <div className="desk-watch-intro"><Eyebrow>MARKET OBSERVATIONS / LIVE</Eyebrow><h2>On the <em>watchlist.</em></h2><p>Current reference marks, not a chart of invented history.</p><Link href="/sentinel/markets">Open the full index <ArrowUpRight size={16}/></Link></div>
   <div className="desk-watch-lines">{watch.length?watch.map(t=><TickerLine key={t.ticker} token={t}/>):<BlankState title="Waiting for the tape." description="Supported BSC stocks will appear here when the authenticated market feed is available."/>}</div>
  </section>
  <section className="desk-home-last">
   <span>THE LAST WORD / 001</span><h2>More information.<br/><i>Less assumption.</i></h2><Link href="/sentinel/markets" className="desk-last-cta">Step inside <CornerDownRight size={22}/></Link>
  </section>
 </div>;
}
