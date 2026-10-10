'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {ArrowRight,ArrowUpRight,CheckCircle2,Clock3,ExternalLink,RefreshCw,ShieldAlert,Wallet} from 'lucide-react';
import {useDesk} from '@/components/sentinel/DeskContext';
import {useWallet} from '@/components/sentinel/WalletContext';
import {WalletControls} from '@/components/sentinel/WalletControls';
import {TokenMark} from '@/components/sentinel/DeskBits';
import {formatUsd,tokenUnits} from '@/lib/sentinel/model';
import {assessPortfolioDrift,markedValueForDisplay,type PortfolioObservation} from '@/lib/sentinel/portfolio-watch';
export default function ProductPortfolio(){
 const {basket,feed,snapshot}=useDesk();
 const wallet=useWallet();
 const [observation,setObservation]=useState<PortfolioObservation|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [clock,setClock]=useState(0);
 const [lastScope,setLastScope]=useState('');
 const [counter,setCounter]=useState(0);
 const selected=basket.map(x=>({ticker:x.ticker,platform:x.platform}));
 const basketKey=basket.map(x=>[x.ticker,x.platform,x.weight].join(':')).join('|');
 const scope=(wallet.address||'')+'|'+wallet.chainId+'|'+basketKey+'|'+feed;
 const synced=lastScope===scope&&observation?.walletAddress.toLowerCase()===wallet.address?.toLowerCase();
 const current=synced?observation:null;
 const result=useMemo(()=>assessPortfolioDrift(basket,current,5,clock||Date.now()),[basket,current,clock]);
 const canRead=wallet.ready&&basket.length>0&&feed==='live';
 const refresh=useCallback(()=>setCounter(n=>n+1),[]);
 useEffect(()=>{setClock(Date.now());const id=window.setInterval(()=>setClock(Date.now()),3000);return()=>window.clearInterval(id);},[]);
 useEffect(()=>{
  const abort=new AbortController();
  setLastScope(scope);setObservation(null);setError('');
  if(!canRead||!wallet.address)return()=>abort.abort();
  let inFlight=false;
  const account=wallet.address;
  async function read(){
   if(inFlight||abort.signal.aborted||document.visibilityState!=='visible')return;
   inFlight=true;setLoading(true);
   try{
    const response=await fetch('/api/sentinel/portfolio',{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({walletAddress:account,legs:selected}),cache:'no-store',
     signal:AbortSignal.any([abort.signal,AbortSignal.timeout(16000)])});
    const body:unknown=await response.json();
    if(!response.ok||!body||typeof body!=='object'||(body as {kind?:string}).kind!=='sentinel.bsc.portfolio-observation')
     throw Error((body as {error?:string})?.error||'Portfolio observation unavailable.');
    const data=body as PortfolioObservation;
    if(data.walletAddress.toLowerCase()!==account.toLowerCase()||data.chainId!==56||!data.readOnly||data.legs.length!==selected.length)
     throw Error('Wallet or issuer position record did not match this session.');
    if(!abort.signal.aborted){setObservation(data);setError('');}
   }catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Failed to observe chain balances.');}
   finally{inFlight=false;if(!abort.signal.aborted)setLoading(false);}
  }
  void read();
  const id=window.setInterval(()=>void read(),30000);
  window.addEventListener('focus',read);
  return()=>{abort.abort();window.clearInterval(id);window.removeEventListener('focus',read);};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[scope,counter]);
 const valued=['WITHIN_BAND','DRIFT_DETECTED','EMPTY'].includes(result.status);
 const rows=basket.map(x=>{
  const token=snapshot?.tokens.find(t=>t.ticker===x.ticker&&t.platform===x.platform);
  const observed=current?.legs.find(p=>p.ticker===x.ticker&&p.platform===x.platform);
  const value=markedValueForDisplay(result,x,observed);
  const quantity=observed?.status==='OBSERVED'&&observed.balanceRaw!==null?tokenUnits(observed.balanceRaw,observed.decimals):null;
  const actual=result.legs.find(p=>p.ticker===x.ticker&&p.platform===x.platform)?.actualPct??null;
  return {x,token,observed,value,quantity,actual};
 });
 return <div className="desk-wrap product-portfolio">
  <div className="product-breadcrumb"><Link href="/sentinel/buy">Build a basket <ArrowRight size={15}/></Link><span>03 / YOUR PORTFOLIO</span></div>
  <header className="product-portfolio-hero"><div>
   <span className="product-section-label">ON-CHAIN / BSC 56</span><h1>Your positions.<br/><em>Not promises.</em></h1>
   <p>See what your connected wallet actually holds in the issuer contracts you selected. The balance comes from BSC—not from an assumed order or a simulated fill.</p>
  </div><div className="product-balance-box"><span>OBSERVED TOKEN VALUE</span><strong>{valued?formatUsd(result.totalValueUsd):'—'}</strong>
   <small>{valued?'Marked at live issuer prices · not a sell quote':result.status==='NEEDS_WALLET'?'Connect wallet to observe':'Awaiting complete, fresh chain evidence'}</small></div></header>
  <div className="product-portfolio-layout">
   <section className="product-portfolio-main">
    <div className="product-portfolio-top"><div><span className="product-section-label">01 / YOUR SELECTED STOCKS</span><h2>Holdings in this basket</h2></div>
     <button type="button" onClick={refresh} disabled={!canRead||loading}><RefreshCw size={17} className={loading?'desk-spin':''}/>{loading?'Reading BSC…':'Refresh positions'}</button></div>
    {!basket.length&&<div className="product-portfolio-empty"><h3>No stocks selected yet.</h3><p>Choose assets in Build. We only inspect the specific issuer contracts you selected and never invent holdings.</p>
     <Link href="/sentinel/markets">Explore stocks <ArrowRight size={16}/></Link></div>}
    {basket.length>0&&!wallet.ready&&<div className="product-portfolio-empty"><Wallet size={25}/><h3>Connect your investment wallet.</h3>
     <p>The same wallet you connect in Invest is used here automatically. We won't ask for keys or a separate developer login.</p><WalletControls/></div>}
    {basket.length>0&&wallet.ready&&<div className="product-holdings">
     <div className="product-holdings-head"><span>STOCK TOKEN</span><span>ACTUAL UNITS</span><span>MARKED VALUE</span><span>WEIGHT</span></div>
     {rows.map((row,i)=><div className="product-holding" key={row.x.ticker}>
      <div className="product-holding-asset"><span>{String(i+1).padStart(2,'0')}</span><TokenMark token={row.token}/><div><strong>{row.x.ticker}</strong><small>{row.token?.symbol||'—'} · {row.x.platform==='bstock'?'bStocks':'Ondo'}</small></div></div>
      <div className="product-holding-data"><strong>{row.quantity===null?'—':row.quantity.toLocaleString('en-US',{maximumFractionDigits:12})}</strong><small>{row.quantity===null?'Unverified':row.quantity===0?'Zero on chain':'Actual ERC-20 balance'}</small></div>
      <div className="product-holding-data"><strong>{formatUsd(row.value)}</strong><small>{row.observed?.tokenPriceUsd?formatUsd(row.observed.tokenPriceUsd,4)+' / token':'Mark unavailable'}</small></div>
      <div className="product-holding-data"><strong>{row.actual===null?'—':row.actual.toFixed(1)+'%'}</strong><small>{row.x.weight}% target</small></div>
     </div>)}
    </div>}
    {error&&<p className="product-portfolio-error" role="alert"><ShieldAlert size={16}/>{error} No missing balance has been treated as zero.</p>}
    {current&&<div className="product-portfolio-evidence"><CheckCircle2 size={17}/><p>Observed block <b>{current.blockNumber}</b> · {new Date(current.observedAt).toLocaleString()} · {result.status==='STALE'?'snapshot stale — refresh required':'read-only ERC-20 balanceOf'}. Portfolio status: <b>{result.status.replaceAll('_',' ')}</b>.</p></div>}
    {valued&&result.status==='DRIFT_DETECTED'&&<div className="product-portfolio-drift"><strong>Allocation moved from your target.</strong>
     <p>{result.maxAbsDriftPct?.toFixed(2)}% maximum weight difference in these selected contracts. No rebalance is submitted; any adjustment requires a new approved trade.</p></div>}
    <section className="product-activity"><span className="product-section-label">02 / ACTIVITY & EXECUTION HISTORY</span><h2>Evidence, not invented orders.</h2>
     <p>Browser-wallet order history is not authenticated by this read-only connection yet. Positions above are independently observed balances, not proof that a particular transaction originated in Sentinel.</p>
     {wallet.address&&<a href={'https://bscscan.com/address/'+wallet.address} target="_blank" rel="noreferrer">View real BSC transactions for this wallet <ExternalLink size={16}/></a>}
     <details className="product-advanced-details"><summary>Advanced chain and transaction diagnostics</summary><Link href="/sentinel/watch">Allocation drift laboratory →</Link><Link href="/sentinel/agent">Local Agentic Wallet testing evidence →</Link></details>
    </section>
   </section>
   <aside className="product-portfolio-side"><span className="product-section-label">THE WALLET WE OBSERVE</span><h2>Same account.<br/><em>Real evidence.</em></h2>
    <WalletControls/><p className="product-portfolio-address">{wallet.address||'No connected wallet'}</p>
    <div className="product-portfolio-side-detail"><strong>Scope of this view</strong><p>Only the {basket.length} currently selected contracts. Other wallets, USDT and assets outside the basket are not included in the displayed value.</p></div>
    <div className="product-portfolio-side-detail"><strong>What a price means</strong><p>Issuer marks are not executable selling prices. Token units are not the same as share-equivalent exposure.</p></div>
    <Link href="/sentinel/buy">Edit basket <ArrowRight size={16}/></Link>
    <Link href="/sentinel/invest">Review investment <ArrowUpRight size={16}/></Link>
   </aside>
  </div>
 </div>;
}
