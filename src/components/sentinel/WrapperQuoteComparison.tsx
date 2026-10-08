'use client';
import {ArrowRightLeft,Clock3,Info,RefreshCw,Scale} from 'lucide-react';
import type {Equity,Platform,QuotePreview} from '@/lib/sentinel/model';
import {compareWrapperQuotes} from '@/lib/sentinel/wrapper-comparison';

type QuoteState={loading:boolean;quote?:QuotePreview;error?:string};

interface Props {
 ticker:string;
 tokens:Equity[];
 quotes:Partial<Record<Platform,QuoteState>>;
 now:number;
 refreshBoth:()=>void;
 cannotRefreshReason:string|null;
 refreshing:boolean;
}

const formatAmount=(value:number):string=>
 value>0&&value<0.00000001?value.toExponential(2):
 value.toLocaleString('en-US',{maximumFractionDigits:8,minimumFractionDigits:8});
const issuerName=(platform:Platform)=>platform==='bstock'?'bStocks':'Ondo';

export function WrapperQuoteComparison({
 ticker,tokens,quotes,now,refreshBoth,cannotRefreshReason,refreshing
}:Props){
 const result=compareWrapperQuotes(tokens,{
  bstock:quotes.bstock?.quote,
  ondo:quotes.ondo?.quote
 },now);
 const active=result.status==='ready';
 const leaderName=result.leader?issuerName(result.leader):null;
 const percent=result.leadPct===null?'—':result.leadPct<0.00005&&result.leadPct>0?'<0.0001%':result.leadPct.toFixed(4)+'%';
 const message={
  'awaiting-quotes':'Request a current $10 quote from each issuer to compare like-for-like share exposure.',
  'expired':'At least one quote is older than 30 seconds. Old prices are hidden; refresh both to compare.',
  'mismatch':'These quotes do not match the same stock, contract or USDT budget. Request a matching pair.',
  'ratio-unavailable':'An issuer conversion ratio is unavailable or invalid, so share exposure cannot be calculated.',
  'ready':''
 }[result.status];
 return <section className="desk-wrapper-compare" aria-labelledby="desk-wrapper-title" data-comparison-status={result.status}>
  <div className="desk-wrapper-compare-strap">
   <span><Scale size={16} strokeWidth={1.65}/> THE WRAPPER TEST <i>/</i> {ticker}</span>
   <span className={active?'live':'pending'}><Clock3 size={13}/>{active?'LIVE PAIR · '+result.expiresInSeconds+'s LEFT':'$10 USDT / PER ISSUER'}</span>
  </div>
  <div className="desk-wrapper-intro">
   <div>
    <div className="desk-wrapper-eyebrow">QUOTE-ADJUSTED UNDERLYING EXPOSURE</div>
    <h2 id="desk-wrapper-title">Same ten dollars.<br/><em>Different wrapper.</em></h2>
    <p>The token with the larger quote output does not always represent more of the underlying. We normalize each issuer's quoted token amount using its published token-to-share ratio.</p>
   </div>
   <button type="button" className="desk-wrapper-refresh" onClick={refreshBoth}
     disabled={!!cannotRefreshReason||refreshing} aria-label="Request a new ten USDT quote from both issuers">
    <RefreshCw size={16} className={refreshing?'desk-spin':''}/>
    {refreshing?'Checking both venues…':active?'Refresh both quotes':'Inspect both $10 quotes'}
   </button>
  </div>
  {cannotRefreshReason&&<p className="desk-wrapper-action-note" role="status">{cannotRefreshReason}</p>}
  <div className="desk-wrapper-ledger" aria-label="Issuer quote normalization breakdown">
   {result.rows.map((row,i)=><div className={'desk-wrapper-leg '+(result.leader===row.platform?'ahead':'')} key={row.platform} data-normalized-issuer={row.platform}>
    <div className="desk-wrapper-leg-top"><span>ISSUER 0{i+1} / {issuerName(row.platform).toUpperCase()}</span><b>{row.symbol}</b></div>
    <div className="desk-wrapper-leg-input">
     <span>01 <i>Quoted tokens · $10 USDT</i></span>
     <strong>{row.status==='ready'?formatAmount(row.quote!.tokenAmount):'—'}</strong>
     <small>{row.symbol} token units</small>
    </div>
    <div className="desk-wrapper-leg-multiplier">
     <span>02 <i>Wrapper conversion</i></span>
     <strong>{row.ratio!==null?'× '+row.ratio.toLocaleString('en-US',{maximumFractionDigits:9}):'—'}</strong>
     <small>share equivalents per token</small>
    </div>
    <div className="desk-wrapper-leg-output">
     <span>03 <i>Normalized exposure</i></span>
     <strong data-testid={'normalized-'+row.platform}>{row.shareEquivalent===null?'—':formatAmount(row.shareEquivalent)}</strong>
     <small>underlying-share equivalent units</small>
    </div>
    <div className="desk-wrapper-leg-foot"><span className={row.status==='ready'?'ready':''}>{row.status==='ready'?
     'QUOTE LIVE · '+row.secondsLeft+'s':
     row.status==='expired'?'QUOTE EXPIRED':
     row.status==='mismatch'?'QUOTE MISMATCH':
     row.status==='ratio-unavailable'?'CONVERSION UNAVAILABLE':'AWAITING QUOTE'}</span>
     <span>{row.status==='ready'?row.quote?.mode+' · '+(row.quote?.vendor||'Unknown venue'):'NOT COMPARABLE'}</span></div>
   </div>)}
  </div>
  {active?<div className="desk-wrapper-verdict" role="status">
   <div className="desk-wrapper-verdict-main">
    <span>THE INDICATIVE EXPOSURE DIFFERENCE</span>
    <h3 data-testid="wrapper-result">{leaderName? <>{leaderName} <em>+{percent}</em></>:<>Equivalent <em>exposure</em></>}</h3>
    <p>{leaderName?leaderName+' indicates '+percent+' more underlying-share equivalent units for the same $'+result.budgetUsd+' USDT quote than the other wrapper.':'Within calculation precision, both quotes indicate the same underlying-share-equivalent exposure.'} Not a best-execution ranking.</p>
   </div>
   <div className="desk-wrapper-verdict-side">
    <span>ABSOLUTE DIFFERENCE</span>
    <strong>{result.gapInShareUnits===null?'—':formatAmount(result.gapInShareUnits)}</strong>
    <small>share-equivalent units</small>
    <span className="desk-wrapper-expiry"><Clock3 size={13}/> Shortest quote expires in {result.expiresInSeconds}s</span>
   </div>
  </div>:<div className="desk-wrapper-unready" role="status">
   <div className="desk-wrapper-pending-mark"><ArrowRightLeft size={22}/></div>
   <div><strong>No valid side-by-side comparison yet.</strong><p>{message}</p></div>
   <span>{result.rows.filter(r=>r.status==='ready').length} / 2 CURRENT</span>
  </div>}
  {active&&result.policyFlagged&&<p className="desk-wrapper-policy-warning">At least one venue quote has a policy warning. The mathematical comparison remains informational and does not clear the warning.</p>}
  <footer className="desk-wrapper-footnote"><Info size={15}/><p><b>How to read this.</b> Normalized units = quote token output × issuer token-to-share ratio. Quote windows last 30 seconds; results are observations from separate requests and can change between them. Conversion exposure does not mean legal share ownership. Pricing, fees, liquidity, slippage and user eligibility still matter. No trade or wallet authorization is performed.</p></footer>
 </section>;
}
