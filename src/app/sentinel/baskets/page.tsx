'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,Check,Info,Plus,Search,SlidersHorizontal,Trash2} from 'lucide-react';
import {useDesk,useGroup} from '@/components/sentinel/DeskContext';
import {BlankState,Eyebrow,TokenMark} from '@/components/sentinel/DeskBits';
import {amountFor,selectPreferred} from '@/lib/sentinel/basket';
import {formatBasis,formatUsd,type Equity} from '@/lib/sentinel/model';
const themes=[
 {name:'THE COMPUTE STACK',note:'Compute, chips and infrastructure',stocks:['NVDA','MSFT','AMD']},
 {name:'THE GLOBAL PLATFORMS',note:'Consumer distribution and cloud',stocks:['AAPL','GOOGL','AMZN','META']},
 {name:'THE MARKET MAKERS',note:'Exchanges, platforms and brokerage',stocks:['COIN','HOOD','SPOT']},
];
export default function BasketStudio(){
 const router=useRouter(),{snapshot,feed,basket,setFromTickers,addToken,removeToken,weight,reset}=useDesk(),groups=useGroup();
 const [budget,setBudget]=useState(50),[search,setSearch]=useState(''),[openChooser,setOpenChooser]=useState(false);
 useEffect(()=>{
  try{const saved=sessionStorage.getItem('sentinel-budget-v1');if(saved){const n=Number(saved);if(Number.isInteger(n)&&n>=10&&n<=250)setBudget(n);}}catch{/* session storage optional */}
 },[]);
 useEffect(()=>{try{sessionStorage.setItem('sentinel-budget-v1',String(budget));}catch{/* optional */}},[budget]);
 const tokenFor=(ticker:string,platform:string)=>snapshot?.tokens.find(t=>t.ticker===ticker&&t.platform===platform);
 const suggestions=useMemo(()=>[...groups.keys()].filter(t=>!basket.some(l=>l.ticker===t))
  .map(t=>selectPreferred(snapshot?.tokens||[],t)).filter((x):x is Equity=>!!x)
  .filter(x=>!search||(`${x.ticker} ${x.company}`).toLowerCase().includes(search.toLowerCase()))
  .sort((a,b)=>a.ticker.localeCompare(b.ticker)).slice(0,24),[basket,groups,snapshot,search]);
 const canReview=feed==='live'&&basket.length>0&&basket.every(l=>!!tokenFor(l.ticker,l.platform)&&amountFor(budget,l)>=1);
 const sections=basket.map((x,i)=>({...x,token:tokenFor(x.ticker,x.platform),color:['#d75c39','#283d35','#a5ac9c','#778f9d'][i]}));
 const blend=sections.length?'linear-gradient(to right,'+sections.map((x,i)=>{
  const start=sections.slice(0,i).reduce((s,l)=>s+l.weight,0);
  return x.color+' '+start+'% '+(start+x.weight)+'%';
 }).join(',')+')':'#d3d0c6';
 return <div className="desk-wrap desk-internal-page">
  <div className="desk-breadcrumb"><Link href="/sentinel">THE BRIEF</Link><span>→</span><b>BASKET STUDIO</b></div>
  <section className="desk-page-head desk-builder-head">
   <div><Eyebrow>ROOM 03 / ALLOCATION STUDIO</Eyebrow><h1>Every opinion<br/><em>needs a weight.</em></h1><p>Build a portfolio thesis from real token contracts, not a collage of ticker symbols. No synthetic shares are issued here.</p></div>
   <div className="desk-studio-serial"><span>WORKING COPY / LOCAL</span><strong>{basket.length.toString().padStart(2,'0')}<small> / 04</small></strong><p>Constituents selected</p></div>
  </section>
  <div className="desk-studio-layout">
   <section className="desk-studio-work">
    <div className="desk-studio-band"><span>01 / SET THE COMPOSITION</span><span>{basket.reduce((a,b)=>a+b.weight,0)}% ALLOCATED</span></div>
    <div className="desk-studio-intro"><h2>Your <em>convictions.</em></h2><p>Weights redistribute to exactly 100%. Each position is an actual issuer contract you can inspect.</p></div>
    <div className="desk-composition"><div className="desk-composition-track" style={{background:blend}} aria-label={'Allocation: '+sections.map(l=>l.ticker+' '+l.weight+' percent').join(', ')}/><div className="desk-composition-labels">{sections.map(s=><span key={s.ticker} style={{width:s.weight+'%',minWidth:0}} title={s.ticker+' '+s.weight+'%'}>{s.weight>=17?s.ticker:''}</span>)}</div></div>
    {sections.map((leg,i)=>{
     const variants=groups.get(leg.ticker)||[];
     return <div className="desk-studio-leg" key={leg.ticker}>
      <div className="desk-leg-no">{String(i+1).padStart(2,'0')}</div><TokenMark token={leg.token} size="large"/>
      <div className="desk-leg-body"><div className="desk-leg-first"><div><h3>{leg.ticker}</h3><p>{leg.token?.company||'Unverified asset'}</p></div><strong>{leg.weight}%</strong></div>
       <div className="desk-leg-slider"><input aria-label={'Weight '+leg.ticker} type="range" min={basket.length===1?100:5} max={basket.length===1?100:100-5*(basket.length-1)} disabled={basket.length===1} value={leg.weight} onChange={e=>weight(leg.ticker,Number(e.target.value))} step="1" style={{'--progress':leg.weight+'%'} as React.CSSProperties}/><div><span>5%</span><span>MAX</span></div></div>
       <div className="desk-leg-bottom"><label>ISSUER <select aria-label={'Issuer for '+leg.ticker} value={leg.platform} onChange={e=>{const t=variants.find(t=>t.platform===e.target.value);if(t)addToken(t);}}>{variants.map(t=><option key={t.platform} value={t.platform}>{t.platform==='ondo'?'Ondo':'bStocks'}</option>)}</select></label><span className="desk-leg-amount">{formatUsd(amountFor(budget,leg))} <small>of budget</small></span><button title={'Remove '+leg.ticker} aria-label={'Remove '+leg.ticker} type="button" onClick={()=>removeToken(leg.ticker)}><Trash2 size={15}/></button></div>
      </div>
     </div>;
    })}
    {basket.length===0&&<BlankState title="An empty thesis." description="Choose a research theme below or add a contract from the market index."/>}
    <div className="desk-add-bar"><button disabled={!snapshot||basket.length>=4} type="button" onClick={()=>setOpenChooser(x=>!x)}><Plus size={20}/> {openChooser?'Close stock picker':'Add a stock'} <span>{basket.length}/4</span></button><button className="desk-reset" type="button" onClick={reset} disabled={basket.length===0}>Clear selection</button></div>
    {openChooser&&<div className="desk-chooser"><label><Search size={18}/><input placeholder="Filter available underlying stocks…" value={search} onChange={e=>setSearch(e.target.value)}/></label><div>{suggestions.length?suggestions.map(token=><button key={token.ticker} type="button" onClick={()=>{addToken(token);if(basket.length>=3)setOpenChooser(false);}}><TokenMark token={token} size="small"/><span><b>{token.ticker}</b><small>{token.company}</small></span><Plus size={16}/></button>):<span className="desk-chooser-empty">No additional contracts match your search.</span>}</div></div>}
    <div className="desk-templates"><div className="desk-templates-title"><span>02 / QUICK RESEARCH THEMES</span><small>Suggestions, not investment advice</small></div>
     <div className="desk-theme-list">{themes.map((t,i)=>{
      const missing=t.stocks.filter(ticker=>!groups.has(ticker));
      return <button type="button" key={t.name} disabled={!snapshot||missing.length>0} onClick={()=>setFromTickers(t.stocks)}><span>{String(i+1).padStart(2,'0')}</span><span><b>{t.name}</b><small>{t.note} · {t.stocks.join(' / ')}</small></span><ArrowUpRight size={18}/></button>;
     })}</div>
    </div>
   </section>
   <aside className="desk-studio-rail">
    <div className="desk-rail-top"><span>03 / HOW MUCH?</span><span>SPENDING HYPOTHESIS</span></div>
    <div className="desk-rail-paper"><p>INDICATIVE INPUT</p><label className="desk-budget-large" htmlFor="desk-budget"><span>$</span><input type="number" id="desk-budget" step="1" min="10" max="250" value={budget} onChange={e=>setBudget(Math.min(250,Math.max(10,Math.round(Number(e.target.value)||10))))}/></label><span className="desk-budget-unit">USDT <i>/ BSC</i></span><p className="desk-budget-help">Available preview range $10–$250. This is not a reservation, deposit or trade instruction.</p>
     <div className="desk-rail-stat"><span>CONSTITUENTS</span><strong>{basket.length}</strong></div><div className="desk-rail-stat"><span>TOTAL WEIGHT</span><strong>{basket.reduce((sum,x)=>sum+x.weight,0)}%</strong></div><div className="desk-rail-stat"><span>ESTIMATED UPFRONT SPEND</span><strong>{formatUsd(budget)}</strong></div>
    </div>
    <div className="desk-rail-assessment"><span>DESK NOTE / 03</span><h3>Allocation is not execution.</h3><p>Each leg still needs a fresh venue quote, issuer availability, reasonable price impact, and an explicit user-authorized transaction. That's the next room.</p><div className="desk-rail-rules"><p><Check size={15}/> Fixed allocation totaling 100%</p><p><Check size={15}/> Issuer contract selection is explicit</p><p><Info size={15}/> Liquidity and fee verification pending</p></div></div>
    <button type="button" className="desk-button-accent desk-big-next" disabled={!canReview} onClick={()=>router.push('/sentinel/review')}>Continue to execution review <ArrowRight size={18}/></button>
    {!canReview&&<p className="desk-next-note">{feed!=='live'?'A live Binance market feed is required to verify current routes.':basket.length===0?'Select at least one stock.':'Each selected asset needs a verified contract and a $1 minimum leg.'}</p>}
    <Link href="/sentinel/markets" className="desk-rail-back"><ArrowLeft size={14}/> Return to market index</Link>
   </aside>
  </div>
 </div>;
}
