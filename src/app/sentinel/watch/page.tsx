'use client';
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,ArrowUpRight,Clock3,Eye,LockKeyhole,RefreshCw,ShieldCheck,SlidersHorizontal,TriangleAlert} from 'lucide-react';
import {useDesk} from '@/components/sentinel/DeskContext';
import {useWallet} from '@/components/sentinel/WalletContext';
import {WalletControls} from '@/components/sentinel/WalletControls';
import {Eyebrow,TokenMark,BlankState} from '@/components/sentinel/DeskBits';
import {formatUsd,tokenUnits} from '@/lib/sentinel/model';
import {assessPortfolioDrift,markedValueForDisplay,WATCH_REFRESH_MS,type PortfolioObservation,type DriftStatus} from '@/lib/sentinel/portfolio-watch';

type JournalRow={observedAt:string;blockNumber:string;status:DriftStatus;largestDrift:number|null;details:string};
const percent=(n:number)=>n.toFixed(2)+'%';
const date=(value:string)=>new Date(value).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});
const THRESHOLDS=[2,5,10] as const;

export default function PortfolioWatch(){
 const {basket,snapshot,feed}=useDesk();
 const wallet=useWallet();
 const [threshold,setThreshold]=useState<number>(5);
 const [observation,setObservation]=useState<PortfolioObservation|null>(null);
 const [viewKey,setViewKey]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [manualRun,setManualRun]=useState(0);
 const [journal,setJournal]=useState<JournalRow[]>([]);
 const scopeRef=useRef('');
 const [clock,setClock]=useState(0);
 const basketKey=basket.map(x=>[x.ticker,x.platform,x.weight].join(':')).join('|');
 const observationKey=[wallet.sessionKey,basketKey,feed].join('|');
 const ready=wallet.ready&&basket.length>0&&feed==='live';
 const scoped=viewKey===observationKey?observation:null;
 const isBound=scoped?.walletAddress.toLowerCase()===wallet.address?.toLowerCase();
 const view=isBound?scoped:null;
 const assessment=useMemo(()=>assessPortfolioDrift(basket,view,threshold,clock||Date.now()),
  [basket,view,threshold,clock]);
 const evaluable=assessment.status==='WITHIN_BAND'||assessment.status==='DRIFT_DETECTED';
 const journalCurrent=viewKey===observationKey?journal:[];
 const asOf=view?.observedAt;
 useEffect(()=>{
  setClock(Date.now());
  const ticker=window.setInterval(()=>setClock(Date.now()),1000);
  return()=>window.clearInterval(ticker);
 },[]);
 useEffect(()=>{
  const abort=new AbortController();
  if(scopeRef.current!==observationKey){
   scopeRef.current=observationKey;
   setObservation(null);setViewKey(observationKey);setJournal([]);
  }
  setError('');
  if(!ready||!wallet.address)return()=>abort.abort();
  let inflight=false;
  const address=wallet.address;
  const selected=basket.map(x=>({ticker:x.ticker,platform:x.platform}));
  async function load(){
   if(inflight||abort.signal.aborted||document.visibilityState!=='visible')return;
   inflight=true;setBusy(true);
   try{
    const response=await fetch('/api/sentinel/portfolio',{
     method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({walletAddress:address,legs:selected}),
     cache:'no-store',signal:AbortSignal.any([abort.signal,AbortSignal.timeout(14000)])
    });
    const body=await response.json();
    if(!response.ok||body.kind!=='sentinel.bsc.portfolio-observation')
     throw Error(typeof body.error==='string'?body.error:'No valid BSC observation returned.');
    if(abort.signal.aborted)return;
    const data=body as PortfolioObservation;
    if(data.chainId!==56||data.walletAddress.toLowerCase()!==address.toLowerCase()||
       !data.readOnly||data.legs.length!==selected.length)
     throw Error('The observation did not match this wallet and basket.');
    setObservation(data);setError('');
    const outcome=assessPortfolioDrift(basket,data,threshold,Date.now());
    const item:JournalRow={observedAt:data.observedAt,blockNumber:data.blockNumber,status:outcome.status,
     largestDrift:outcome.maxAbsDriftPct,details:outcome.reason};
    setJournal(prev=>{
     if(prev[0]&&prev[0].status===item.status&&
        (prev[0].largestDrift===null?item.largestDrift===null:
          item.largestDrift!==null&&Math.abs(prev[0].largestDrift-item.largestDrift)<0.5))return prev;
     return [item,...prev].slice(0,8);
    });
   }catch(e){
    if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Portfolio observation unavailable.');
   }finally{inflight=false;if(!abort.signal.aborted)setBusy(false);}
  }
  void load();
  const interval=window.setInterval(()=>void load(),WATCH_REFRESH_MS);
  const focus=()=>void load();
  window.addEventListener('focus',focus);
  return()=>{abort.abort();window.clearInterval(interval);window.removeEventListener('focus',focus);};
 // manualRun deliberately reruns this effect; threshold is captured for journal only.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[observationKey,manualRun]);
 const summaryLabel=assessment.status==='DRIFT_DETECTED'?'ALLOCATION DRIFT FOUND':
  assessment.status==='WITHIN_BAND'?'WITHIN YOUR BAND':
  assessment.status==='EMPTY'?'NO OBSERVED POSITIONS':
  assessment.status==='UNPRICED'?'EVIDENCE INCOMPLETE':
  assessment.status==='STALE'?'SNAPSHOT STALE':'WALLET REQUIRED';
 const rows=basket.map((leg,i)=>{
  const token=snapshot?.tokens.find(t=>t.ticker===leg.ticker&&t.platform===leg.platform);
  const checked=view?.legs.find(x=>x.ticker===leg.ticker&&x.platform===leg.platform);
  const drift=assessment.legs.find(x=>x.ticker===leg.ticker&&x.platform===leg.platform);
  const quantity=checked?.balanceRaw!==undefined&&checked?.balanceRaw!==null?
   tokenUnits(checked.balanceRaw,checked.decimals):null;
  return {leg,token,checked,drift,quantity,index:i};
 });
 return <div className="desk-wrap desk-internal-page desk-watchroom">
  <div className="desk-breadcrumb"><Link href="/sentinel">THE BRIEF</Link><span>→</span><Link href="/sentinel/baskets">BASKET STUDIO</Link><span>→</span><b>PORTFOLIO WATCH</b></div>
  <section className="desk-watch-hero">
   <div><Eyebrow>ROOM 07 / STRATEGY MONITOR</Eyebrow><h1>A basket has<br/><em>a pulse.</em></h1>
    <p>Read your selected issuer balances directly from BSC. Measure how your portfolio has drifted from the thesis—and rehearse the changes before making any move.</p>
    <div className="desk-watch-trust"><ShieldCheck size={15}/> Read-only chain observations · no orders, approvals or signatures</div>
   </div>
   <div className="desk-watch-signal">
    <div className="desk-watch-signal-head"><span>MONITOR / BSC 56</span><Eye size={21}/></div>
    <strong>{view?.blockNumber??'—'}</strong><small>OBSERVED BLOCK</small>
    <div className="desk-watch-signal-foot"><span className={ready&&view&&!error?'active':''}/>{ready&&view&&!error?'WALLET OBSERVED':'AWAITING VERIFIED OBSERVATION'}</div>
   </div>
  </section>
  <div className="desk-watch-layout">
   <section className="desk-watch-main">
    <div className="desk-watch-section-head"><span>01 / LIVE HOLDINGS</span><span>{basket.length} SELECTED ISSUER CONTRACT{basket.length===1?'':'S'}</span></div>
    <section className="desk-watch-status">
     <div><span>ALLOCATION STATUS</span><h2>{summaryLabel}</h2>
      <p>{assessment.reason}</p>
     </div>
     <div><span>OBSERVED MARKED VALUE</span><strong>{formatUsd(assessment.totalValueUsd)}</strong><small>{assessment.status==='EMPTY'?'Confirmed zero holdings · selected contracts only':evaluable?'Selected contracts only · provider token marks':'Valuation not available'}</small></div>
    </section>
    {assessment.status==='EMPTY'&&<div className="desk-watch-zero-guidance"><div><b>Your selection is a target, not a holding.</b><p>This wallet has zero tokens across the issuer contracts in this basket. If you hold a different supported token, choose its exact issuer in Basket Studio. No buy or rebalance is implied.</p></div><Link href="/sentinel/baskets">Review selected contracts <ArrowRight size={15}/></Link></div>}
    {!basket.length?<BlankState title="No basket to watch." description="Start with a weighted issuer-backed basket. Sentinel only monitors assets you selected." action={<Link className="desk-button-ink" href="/sentinel/baskets">Build a basket <ArrowRight size={16}/></Link>}/>:
     <div className="desk-watch-rows">
      <div className="desk-watch-table-head"><span>ISSUER / TOKEN</span><span>ONCHAIN UNITS</span><span>MARKED VALUE</span><span>ACTUAL / TARGET</span></div>
      {rows.map(({leg,token,checked,drift,quantity,index})=><div className="desk-watch-position" key={leg.ticker}>
       <div className="desk-watch-issuer"><span className="desk-watch-index">{String(index+1).padStart(2,'0')}</span><TokenMark token={token} size="small"/><div><b>{leg.ticker}</b><small>{token?.symbol||leg.ticker} · {leg.platform==='bstock'?'bStocks':'Ondo'}</small></div></div>
       <div className="desk-watch-cell"><strong>{quantity===null?'—':quantity.toLocaleString('en-US',{maximumFractionDigits:8})}</strong><small>{checked?.status==='UNAVAILABLE'?'RPC balance unavailable':checked?'From BSC block '+view?.blockNumber:'Balance not read'}</small></div>
       <div className="desk-watch-cell"><strong>{formatUsd(markedValueForDisplay(assessment,leg,checked))}</strong><small>{checked?.tokenPriceUsd!=null?'Mark '+formatUsd(checked.tokenPriceUsd,4):'No authenticated mark'}</small></div>
       <div className="desk-watch-allocation"><strong>{drift?percent(drift.actualPct):'—'} <small>/ {leg.weight}%</small></strong><div className="desk-watch-meter"><i style={{width:drift?Math.min(100,drift.actualPct)+'%':'0%'}}/><em style={{left:leg.weight+'%'}}/></div><small className={drift?.suggestedDirection==='HOLD'?'':'flagged'}>{drift?((drift.deltaPct>0?'+':'')+percent(drift.deltaPct)+' vs target'):'Not evaluable'}</small></div>
      </div>)}
     </div>}
    <div className="desk-watch-source"><Clock3 size={16}/><p>{asOf?'Read '+date(asOf)+' · issuer marks dated '+date(view!.marketAsOf)+'. ':'No live wallet observation yet. '}Balances come from BSC ERC-20 <code>balanceOf</code> at one block. Marks are Binance inventory prices, <b>not executable sell quotes</b>. Holdings outside this basket and your BNB/USDT are not included.</p></div>
    <div className="desk-watch-section-head desk-watch-section-gap"><span>02 / REBALANCE DESK</span><span>REVIEW ONLY / NO EXECUTION</span></div>
    <section className="desk-watch-proposal">
     <div className="desk-watch-proposal-top"><div><h2>What changed?</h2><p>Absolute deviation from your chosen weights. Proposals are indicative USDT value differences at observed provider marks.</p></div><label><SlidersHorizontal size={14}/> DRIFT BAND<select aria-label="Rebalance drift band" value={threshold} onChange={e=>setThreshold(Number(e.target.value))}>{THRESHOLDS.map(x=><option key={x} value={x}>{x}%</option>)}</select></label></div>
     {evaluable?<>
      <div className="desk-watch-proposal-list">{assessment.legs.filter(x=>x.suggestedDirection!=='HOLD').length===0?
       <p className="desk-watch-no-trade"><ShieldCheck size={20}/> Within the {threshold}% drift band. No adjustment proposed.</p>:
       assessment.legs.filter(x=>x.suggestedDirection!=='HOLD').sort((a,b)=>Math.abs(b.deltaPct)-Math.abs(a.deltaPct)).map(x=><div className="desk-watch-action" key={x.ticker}><div><b>{x.suggestedDirection==='INCREASE'?'UNDERWEIGHT':'OVERWEIGHT'}</b><h3>{x.ticker} <span>{x.platform==='bstock'?'bStocks':'Ondo'}</span></h3></div><div><strong>{x.suggestedDirection==='INCREASE'?'+':'−'}{formatUsd(x.indicativeValueUsd)}</strong><small>{percent(x.actualPct)} observed → {x.targetPct}% thesis</small></div></div>)}
      </div>
      <p className="desk-watch-proposal-note"><LockKeyhole size={16}/> No order was generated. Rebalancing can require sales, fresh buy quotes, approvals, USDT reserves, fees and issuer eligibility. All execution remains locked pending independent verification.</p>
     </>:<div className="desk-watch-empty-proposal"><TriangleAlert size={20}/><p>No trading proposal: real balances, fresh issuer marks, and a nonempty selected portfolio are required.</p></div>}
    </section>
    <section className="desk-watch-journal">
     <div className="desk-watch-section-head"><span>03 / OBSERVATION JOURNAL</span><span>THIS PAGE SESSION ONLY</span></div>
     {journalCurrent.length?journalCurrent.map((item,i)=><div key={item.observedAt+'-'+i} className="desk-watch-journal-row"><span>{date(item.observedAt)}</span><b>{item.status.replaceAll('_',' ')}</b><small>{item.largestDrift===null?'No evaluable drift':percent(item.largestDrift)+' max drift'} · BSC {item.blockNumber}</small></div>):
      <p className="desk-watch-journal-empty">Observations and decision changes appear here while this page is open. Nothing is manufactured, persisted, or submitted.</p>}
    </section>
   </section>
   <aside className="desk-watch-rail">
    <div className="desk-watch-rail-head"><span>WATCH CONTROL / 01</span><h2>The wallet<br/><em>is the witness.</em></h2><p>Sentinel reads your connected BSC wallet's token balances. Connecting doesn't grant trading authorization.</p></div>
    <div className="desk-watch-wallet">
     <span>CONNECTED ACCOUNT</span><WalletControls/>
     <small>{wallet.ready?wallet.address:'Connect a BSC mainnet wallet to observe its selected issuer contracts.'}</small>
    </div>
    <div className="desk-watch-checklist"><div><span>01 / BSC ACCOUNT</span><b>{wallet.ready?'CONNECTED':wallet.address?'WRONG NETWORK':'WAITING'}</b></div><div><span>02 / SELECTED BASKET</span><b>{basket.length===0?'NOT SET':basket.length+' LEGS'}</b></div><div><span>03 / ISSUER MARKS</span><b>{feed==='live'?(snapshot?.source==='first-party-production-readonly'?'RELAYED LIVE':'LIVE SOURCE'):feed.toUpperCase()}</b></div><div><span>04 / EXECUTION</span><b>LOCKED</b></div></div>
    <button className="desk-watch-refresh" type="button" disabled={!ready||busy} onClick={()=>setManualRun(n=>n+1)}><RefreshCw size={16} className={busy?'desk-spin':''}/>{busy?'Reading chain…':'Refresh BSC snapshot'}<ArrowRight size={16}/></button>
    {error&&<p className="desk-watch-error" role="alert">{error} The prior snapshot, if present, will expire rather than being treated as live.</p>}
    <p className="desk-watch-rail-note">Silent refresh every 30 seconds only while this page is visible, plus refresh on focus. If the feed, wallet, RPC or contract read fails, no allocation or rebalance is certified.</p>
    <div className="desk-watch-rail-links"><Link href="/sentinel/baskets">Edit basket weights <ArrowUpRight size={15}/></Link><Link href="/sentinel/review">Inspect execution assumptions <ArrowUpRight size={15}/></Link><Link href="/sentinel/execute">Open Simulation Lab <ArrowUpRight size={15}/></Link></div>
   </aside>
  </div>
 </div>;
}
