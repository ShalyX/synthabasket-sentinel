'use client';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight,CornerDownRight} from 'lucide-react';
import {useDesk} from '@/components/sentinel/DeskContext';
import {BlankState,Eyebrow,SourceStamp,TickerLine} from '@/components/sentinel/DeskBits';
import {selectPreferred} from '@/lib/sentinel/basket';
import {formatBasis,formatUsd} from '@/lib/sentinel/model';

export default function TheBrief(){
 const {snapshot,feed}=useDesk();
 const sample=snapshot?selectPreferred(snapshot.tokens,'NVDA')||snapshot.tokens[0]:undefined;
 const watch=['NVDA','MSFT','AAPL','AMD'].map(ticker=>snapshot?selectPreferred(snapshot.tokens,ticker):undefined)
  .filter((x):x is NonNullable<typeof x>=>!!x);

 return <div className="desk-wrap">
  <div className="desk-page-marker"><span>THE BRIEF / ISSUE Nº 001</span><span>RESEARCH BEFORE EXECUTION</span><span>BNB CHAIN / 56</span></div>
  <section className="desk-home-hero">
   <div className="desk-home-copy">
    <div className="desk-signifier"><i/>THE RESEARCH DESK FOR TOKENIZED STOCKS</div>
    <h1>A share closes.<br/><em>Its token doesn’t.</em></h1>
    <p>The stock you recognize and the instrument you can buy onchain are not the same thing. The Brief makes the issuer, conversion and execution difference legible before you spend.</p>
    <div className="desk-home-actions"><Link className="desk-button-ink" href="/sentinel/markets">Open the Market Index <ArrowUpRight size={17}/></Link><Link href="/sentinel/buy" className="desk-text-link">Buy stocks <ArrowRight size={16}/></Link></div>
    <p className="desk-trust-note"><span/> Live issuer contracts. Automatic safety checks. Every wallet signature stays yours.</p>
   </div>
   <div className="desk-home-specimen">
    <div className="desk-specimen-strap"><span>FIG. 01</span><span>WHAT A PRICE DOESN&apos;T TELL YOU</span><span>↗</span></div>
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
   <div><span>ACTIVE NETWORK</span><strong className="desk-small-figure">BNB / 56</strong><small>BSC mainnet only</small></div>
   <div className="desk-snapshot-cell"><SourceStamp/></div>
  </section>

  <section className="desk-home-flow">
   <div className="desk-rail-label"><span className="desk-rail-no">02 / THE PRODUCT</span><span>THREE ROOMS. ONE CLEAR JOURNEY.</span></div>
   <div className="desk-flow-content">
    <div className="desk-flow-heading"><h2>From research<br/>to <em>ownership.</em></h2><p>Market research, purchase and verified holdings each get a focused place. The safety engine works underneath instead of becoming your homework.</p></div>
    <div className="desk-flow-links">
     <Link href="/sentinel/markets"><span>01 / DISCOVER</span><b>Market Index</b><small>Browse the supported stock universe and inspect the actual issuer instruments behind each ticker.</small><ArrowUpRight size={22}/></Link>
     <Link href="/sentinel/buy"><span>02 / BUY</span><b>Automatic Checkout</b><small>Choose stocks and an amount. Sentinel handles allocation, quotes, simulation and settlement checks.</small><ArrowUpRight size={22}/></Link>
     <Link href="/sentinel/portfolio"><span>03 / VERIFY</span><b>Portfolio</b><small>Read issuer-token balances from BSC and show positions only when the chain supports the claim.</small><ArrowUpRight size={22}/></Link>
    </div>
   </div>
  </section>

  <section className="desk-home-watch">
   <div className="desk-watch-intro"><Eyebrow>MARKET OBSERVATIONS / LIVE</Eyebrow><h2>On the <em>watchlist.</em></h2><p>Current reference marks, not a chart of invented history.</p><Link href="/sentinel/markets">Open the full Market Index <ArrowUpRight size={16}/></Link></div>
   <div className="desk-watch-lines">{watch.length?watch.map(t=><TickerLine key={t.ticker} token={t}/>):<BlankState title="Waiting for the tape." description="Supported BSC stocks will appear here when the authenticated market feed is available."/>}</div>
  </section>

  <section className="desk-home-last">
   <span>THE LAST WORD / 001</span><h2>Know the instrument.<br/><i>Then make it simple.</i></h2><Link href="/sentinel/buy" className="desk-last-cta">Build your basket <CornerDownRight size={22}/></Link>
  </section>
 </div>;
}
