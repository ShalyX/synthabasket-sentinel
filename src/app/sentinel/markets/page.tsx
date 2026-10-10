'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {ArrowDown,ArrowRight,ArrowUpRight,Check,Filter,Search,SlidersHorizontal} from 'lucide-react';
import {useDesk,useGroup} from '@/components/sentinel/DeskContext';
import {BlankState,Eyebrow,SourceStamp,TokenMark} from '@/components/sentinel/DeskBits';
import {selectPreferred} from '@/lib/sentinel/basket';
import {formatBasis,formatUsd,type Equity,type Platform} from '@/lib/sentinel/model';
type FilterProvider='all'|Platform;
type Sort='ticker'|'divergence'|'status';
function VenueStamps({tokens}:{tokens:Equity[]}){return <span className="desk-venue-set">
 {tokens.map(t=><span key={t.platform} className={'desk-venue-mark '+t.platform} title={t.platform==='ondo'?'Ondo':'bStocks'}>{t.platform==='ondo'?'O':'B'}</span>)}
 </span>;}
export default function MarketIndex(){
 const {snapshot,feed}=useDesk(),groups=useGroup();
 const [query,setQuery]=useState(''),[platform,setPlatform]=useState<FilterProvider>('all'),[sort,setSort]=useState<Sort>('ticker'),[count,setCount]=useState(24);
 const rows=useMemo(()=>{
  return [...groups.entries()].map(([ticker,tokens])=>{
   const shown=platform==='all'?tokens:tokens.filter(t=>t.platform===platform);
   const token=selectPreferred(shown,ticker);
   return {ticker,tokens,shown,token};
  }).filter((x):x is typeof x & {token:Equity}=>!!x.token)
  .filter(x=>!query||`${x.ticker} ${x.token.company} ${x.token.symbol}`.toLowerCase().includes(query.trim().toLowerCase()))
  .sort((a,b)=>sort==='ticker'?a.ticker.localeCompare(b.ticker):
   sort==='divergence'?Math.abs(b.token.basisPct??-1)-Math.abs(a.token.basisPct??-1):
   Number(b.token.tradingAvailable===true)-Number(a.token.tradingAvailable===true)||a.ticker.localeCompare(b.ticker));
 },[groups,platform,query,sort]);
 const issuerCounts={ondo:snapshot?.tokens.filter(x=>x.platform==='ondo').length??0,bstock:snapshot?.tokens.filter(x=>x.platform==='bstock').length??0};
 return <div className="desk-wrap desk-internal-page">
  <div className="desk-breadcrumb"><Link href="/sentinel">THE BRIEF</Link><span>→</span><b>MARKET INDEX</b></div>
  <section className="desk-page-head desk-index-head">
   <div><Eyebrow>MARKET INDEX / STOCK INVENTORY</Eyebrow><h1>Under one ticker,<br/><em>different instruments.</em></h1><p>Same company. Different issuance contracts, conversion ratios and trading conditions. Start with the instrument, not the logo.</p></div>
   <aside className="desk-index-aside"><span className="desk-side-title">WHAT YOU'RE LOOKING AT</span><strong>{snapshot?.count??'—'}</strong><span>issuer-specific token contracts</span><div className="desk-aside-line"><span>ONDO</span><b>{snapshot?issuerCounts.ondo:'—'}</b></div><div className="desk-aside-line"><span>BSTOCKS</span><b>{snapshot?issuerCounts.bstock:'—'}</b></div></aside>
  </section>
  <section className="desk-directory">
   <div className="desk-directory-strap"><div><span>LIVE DIRECTORY / {String(rows.length).padStart(3,'0')} TICKERS</span><SourceStamp/></div><span>RESEARCH FOCUS: BSC / 56</span></div>
   <div className="desk-directory-tools">
    <label className="desk-field-search"><Search size={19}/><input value={query} onChange={e=>{setQuery(e.target.value);setCount(24);}} placeholder="Ticker, company, token…" aria-label="Search stocks"/><kbd>/</kbd></label>
    <div className="desk-provider-tabs" role="group" aria-label="Filter issuers">{(['all','ondo','bstock'] as FilterProvider[]).map(x=><button type="button" key={x} aria-pressed={platform===x} className={platform===x?'chosen':''} onClick={()=>{setPlatform(x);setCount(24);}}>{x==='all'?'All issuers':x==='ondo'?'Ondo':'bStocks'}</button>)}</div>
    <label className="desk-sort"><SlidersHorizontal size={15}/><span>Sort:</span><select aria-label="Sort stocks" value={sort} onChange={e=>setSort(e.target.value as Sort)}><option value="ticker">Alphabetical</option><option value="divergence">Largest observed basis</option><option value="status">Trading availability</option></select></label>
   </div>
   <div className="desk-table-scroll"><table className="desk-directory-table">
    <thead><tr><th>UNDERLYING / COMPANY</th><th>ISSUER CONTRACTS</th><th>DISPLAYED ISSUER</th><th>REFERENCE / SHARE*</th><th>ADJUSTED BASIS</th><th>STATUS</th><th aria-label="Open details"/></tr></thead>
    <tbody>{rows.slice(0,count).map(row=><tr key={row.ticker}>
     <td><Link href={'/sentinel/markets/'+encodeURIComponent(row.ticker)} className="desk-table-company"><TokenMark token={row.token}/><span><b>{row.ticker}</b><small>{row.token.company}</small></span></Link></td>
     <td><VenueStamps tokens={row.shown}/></td>
     <td><span className="desk-table-issuer">{row.token.platform==='ondo'?'Ondo Finance':'bStocks'}<small>{row.token.symbol}</small></span></td>
     <td className="desk-figure">{formatUsd(row.token.referencePrice,2)}</td>
     <td className={'desk-figure '+(Math.abs(row.token.basisPct??0)>2.5?'desk-risk':'')}>{formatBasis(row.token.basisPct)}</td>
     <td><span className={'desk-availability '+(row.token.tradingAvailable===true?'good':row.token.tradingAvailable===false?'bad':'unknown')}><i/>{row.token.tradingAvailable===true?'Trading':row.token.tradingAvailable===false?'Closed':'Unknown'}</span></td>
     <td><Link href={'/sentinel/markets/'+encodeURIComponent(row.ticker)} aria-label={'Inspect '+row.ticker} className="desk-arrow-action"><ArrowUpRight size={19}/></Link></td>
    </tr>)}</tbody></table></div>
   {!snapshot&&<BlankState title="The tape is unavailable." description="No substitute values are generated. Inspect the feed status above, then retry when access is restored."/>}
   {snapshot&&rows.length===0&&<BlankState title="Nothing under that symbol." description="Try another issuer or broaden the search."/>}
   {rows.length>count&&<button className="desk-table-more" type="button" onClick={()=>setCount(x=>x+24)}>Show 24 more stocks <ArrowDown size={17}/></button>}
   <div className="desk-directory-foot"><span>*Reference is a share quote, not a token trade. The adjusted basis accounts for the issuer's token-to-share ratio.</span><span>{feed==='live'?'LIVE FEED · 30 SEC REFRESH':'NOT LIVE / VERIFY SOURCE'}</span></div>
  </section>
  <section className="desk-index-end"><div><span>LOOK CLOSER</span><h2>Don't average away<br/><em>the differences.</em></h2></div><p>Choose an underlying ticker to compare its issuer contracts side-by-side. Spot the price conversion, trading state, and availability of execution routes.</p><ArrowRight size={28}/></section>
 </div>;
}
