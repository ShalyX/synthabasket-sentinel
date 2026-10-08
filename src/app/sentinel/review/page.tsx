'use client';
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,Check,ChevronRight,Clock3,Info,LockKeyhole,RefreshCw,ShieldAlert,X} from 'lucide-react';
import {useDesk} from '@/components/sentinel/DeskContext';
import {WalletReadiness} from '@/components/sentinel/WalletReadiness';
import {BlankState,ClearBanner,Eyebrow,TokenMark} from '@/components/sentinel/DeskBits';
import {amountFor} from '@/lib/sentinel/basket';
import {formatBasis,formatUsd,type QuotePreview} from '@/lib/sentinel/model';
import {previewIsFresh} from '@/lib/sentinel/policy';
import {publicWalletAddressValid} from '@/lib/sentinel/quote-issues';
type QuoteStatus={loading:boolean;quote?:QuotePreview;error?:string};
const criteria=[
 {no:'01',name:'Issuer availability',explain:'Is this particular token open for trading according to the data provider?'},
 {no:'02',name:'Reference-adjusted basis',explain:'Does the live token mark remain within ±2.5% of ratio-adjusted share parity?'},
 {no:'03',name:'Quoted price impact',explain:'Does the returned execution route report an impact at or below 2%?'},
 {no:'04',name:'Quote freshness',explain:'Has the venue indication been obtained within the last 30 seconds?'},
];
export default function ExecutionReview(){
 const {basket,snapshot,feed}=useDesk();
 const [budget,setBudget]=useState(50),[wallet,setWallet]=useState(''),[quotes,setQuotes]=useState<Record<string,QuoteStatus>>({}),[running,setRunning]=useState(false),[now,setNow]=useState(Date.now()),[everRan,setEverRan]=useState(false);
 const runRef=useRef(false);
 useEffect(()=>{try{const x=Number(sessionStorage.getItem('sentinel-budget-v1'));if(Number.isInteger(x)&&x>=10&&x<=250)setBudget(x);}catch{/* optional */}},[]);
 useEffect(()=>{const i=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(i);},[]);
 const assets=basket.map(leg=>({...leg,token:snapshot?.tokens.find(t=>t.ticker===leg.ticker&&t.platform===leg.platform)}));
 const rows=assets.map(asset=>({...asset,state:quotes[asset.ticker],fresh:previewIsFresh(quotes[asset.ticker]?.quote,now)}));
 const succeeded=rows.filter(r=>r.fresh&&r.state?.quote?.review.status==='review').length;
 const failed=rows.filter(r=>!!r.state?.error||(r.state?.quote&&!r.fresh)||r.state?.quote?.review.status==='blocked').length;
 const verdict=rows.length>0&&rows.length===succeeded?'CHECKS PASSED / NO EXECUTION':'REVIEW INCOMPLETE';
 const readyToCheck=feed==='live'&&assets.length>0&&assets.every(x=>x.token&&amountFor(budget,x)>=1);
 const hasOndoRFQ=assets.some(x=>x.platform==='ondo');
 async function inspect(){
  if(runRef.current||!readyToCheck)return;
  runRef.current=true;setRunning(true);setEverRan(true);setQuotes({});
  const next:Record<string,QuoteStatus>={};
  for(const leg of assets){
   const entry=leg.ticker;next[entry]={loading:true};setQuotes({...next});
   const payload:Record<string,unknown>={ticker:leg.ticker,platform:leg.platform,amountUsd:amountFor(budget,leg)};
   if(wallet.trim())payload.walletAddress=wallet.trim();
   try{
    const response=await fetch('/api/sentinel/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(13000)});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'Could not obtain a venue indication.');
    next[entry]={loading:false,quote:data};
   }catch(e){next[entry]={loading:false,error:e instanceof Error?e.message:'Quote request failed.'};}
   setQuotes({...next});
  }
  runRef.current=false;setRunning(false);
 }
 return <div className="desk-wrap desk-internal-page">
  <div className="desk-breadcrumb"><Link href="/sentinel">THE BRIEF</Link><span>→</span><Link href="/sentinel/baskets">BASKET STUDIO</Link><span>→</span><b>EXECUTION REVIEW</b></div>
  <section className="desk-page-head desk-review-head"><div><Eyebrow>ROOM 04 / BEFORE THE TRANSACTION</Eyebrow><h1>The trade can wait.<br/><em>The questions can't.</em></h1><p>Ask the venue about every leg. Then read the receipt like you mean it. No wallet signatures, token approvals, or live orders are ever requested here.</p></div>
   <div className="desk-review-lock"><LockKeyhole size={30}/><strong>EXECUTION<br/>DISABLED</strong><span>RESEARCH MODE ONLY</span></div>
  </section>
  <div className="desk-review-layout">
   <section className="desk-review-main">
    <div className="desk-review-receipt-header"><span>THE PRE-FLIGHT DOCUMENT</span><span>DOCUMENT ID / LIVE-ONLY</span></div>
    <div className="desk-receipt-paper">
     <div className="desk-receipt-top"><div><Eyebrow>CONTROL SHEET Nº 001</Eyebrow><h2>Execution<br/><em>pre-flight.</em></h2></div><div><b>{verdict}</b><span>NOT A TRADE CONFIRMATION</span></div></div>
     <div className="desk-receipt-stats"><div><span>PROPOSED INPUT</span><strong>{formatUsd(budget)}</strong><small>BSC USDT</small></div><div><span>BASKET LEGS</span><strong>{basket.length.toString().padStart(2,'0')}</strong><small>Provider contracts</small></div><div><span>FRESH GUARD CHECKS</span><strong>{succeeded.toString().padStart(2,'0')}<i>/{basket.length.toString().padStart(2,'0')}</i></strong><small>{failed>0?failed+' flagged / expired':'Quote validity 30 seconds'}</small></div></div>
     <div className="desk-receipt-columns"><span>LEG / PROPOSED ORDER</span><span>VENUE / POLICY</span></div>
     {rows.length===0&&<BlankState title="Nothing to review yet." description="Start in Basket Studio to choose your issuer contracts and weights." action={<Link href="/sentinel/baskets" className="desk-button-ink">Construct basket <ArrowRight size={16}/></Link>}/>}
     {rows.map((row,i)=>{
      const q=row.state?.quote;
      const seconds=q?Math.max(0,30-Math.floor((now-Date.parse(q.checkedAt))/1000)):0;
      const reasons=q?.review?.reasons||[];
      const checked=row.fresh&&q?.review.status==='review';
      return <article className="desk-receipt-leg" key={row.ticker}>
       <div className="desk-receipt-left"><span className="desk-receipt-number">{String(i+1).padStart(2,'0')}</span><TokenMark token={row.token}/>
        <div><b>{row.ticker}</b><small>{row.platform==='bstock'?'bStocks':'Ondo'} · {row.weight}%</small><span>Spend {formatUsd(amountFor(budget,row))} USDT</span></div></div>
       <div className="desk-receipt-right">{row.state?.loading?<span className="desk-pending"><RefreshCw size={15} className="desk-spin"/> Querying vendor…</span>:
        row.state?.error?<div className="desk-review-failure"><X size={17}/><span><b>Quote unavailable</b><small>{row.state.error}</small></span></div>:
        q?<div><div className="desk-quote-details"><strong className={checked?'pass':'fail'}>{checked?'GUARD REVIEW PASSED':row.fresh?'GUARD FLAGGED':'QUOTE EXPIRED'}</strong><span>{row.fresh?seconds+'s remaining':'Refresh required'}</span></div>
          <p>{q.mode} / {q.vendor||'Venue not identified'} · {q.priceImpactPct===null?'Impact unavailable':q.priceImpactPct.toFixed(4)+'% impact'}</p>
          <small>{q.tokenAmount.toLocaleString('en-US',{maximumFractionDigits:8})} {row.token?.symbol||row.ticker} indicated</small>
          {reasons.length>0?<ul>{reasons.map(r=><li key={r}>{r}</li>)}</ul>:null}
         </div>:<span className="desk-unchecked">No quote requested</span>}</div>
      </article>;
     })}
     <div className="desk-receipt-footer"><span>SIMULATION IS NOT EXECUTION</span><span>0 ORDERS SENT / 0 APPROVALS / 0 SIGNATURES</span></div>
    </div>
    <div className="desk-review-after"><LockKeyhole size={21}/><p><strong>Where is the buy button?</strong> There isn't one in this milestone. A quote review isn't permission to trade. Live execution requires eligible access, funded balances, token approvals, a wallet signature and a fresh, separately simulated transaction.</p></div>
   </section>
   <aside className="desk-review-rail">
    <div className="desk-review-rail-heading"><span>POLICY ENGINE / V1</span><h2>Four reasons<br/>to say no.</h2><p>Deterministic checks. Not a deployed Agentic Wallet or autonomous Agent Studio agent.</p></div>
    <div className="desk-rule-list">{criteria.map(x=><div key={x.no}><span>{x.no}</span><div><b>{x.name}</b><p>{x.explain}</p></div></div>)}</div>
    <div className="desk-review-wallet"><label htmlFor="desk-review-wallet">PUBLIC BSC ADDRESS / {hasOndoRFQ?'ONDO RFQ RECEIVER':'OPTIONAL FOR SWAP'}</label><input id="desk-review-wallet" placeholder="0x… (public address only)" value={wallet} onChange={e=>{setWallet(e.target.value);setQuotes({});setEverRan(false);}} autoComplete="off" spellCheck={false}/><p>{hasOndoRFQ&&!wallet.trim()?'This basket contains an Ondo instrument. Its RFQ venue may require a public BSC receiving address before a quote can be reviewed.':wallet.trim()&&!publicWalletAddressValid(wallet)?'That is not a valid public EVM address. Enter 0x followed by 40 hexadecimal characters.':'Used only with your explicit quote request. No wallet connection, approval or signature.'} Never enter a seed phrase or private key.</p></div>
    <button className="desk-button-accent desk-run" type="button" onClick={()=>void inspect()} disabled={running||!readyToCheck}>{running?<><RefreshCw className="desk-spin" size={18}/> Checking venues…</>:<><ShieldAlert size={18}/> Request fresh quotes <ArrowRight size={18}/></>}</button>
    <p className="desk-review-run-note">{!readyToCheck?(feed!=='live'?'Requires an authorized, live Binance market connection.':'Return to Basket Studio to construct a valid proposal.'):'Quotes expire quickly. Review results immediately after the request finishes.'}</p>
    <WalletReadiness now={now}/>
    <div className="desk-review-next"><Link href="/sentinel/baskets"><ArrowLeft size={16}/> Edit the composition</Link><Link href="/sentinel/markets">Return to markets <ArrowUpRight size={16}/></Link></div>
   </aside>
  </div>
 </div>;
}
