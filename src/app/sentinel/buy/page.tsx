'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useMemo,useState} from 'react';
import {ArrowRight,ArrowUpRight,ChevronDown,Plus,Search,ShieldCheck,Trash2} from 'lucide-react';
import {useDesk} from '@/components/sentinel/DeskContext';
import {TokenMark} from '@/components/sentinel/DeskBits';
import {formatUsd,type Equity} from '@/lib/sentinel/model';
import {checkoutPlan,LIVE_BASKET_MAX_USD} from '@/lib/sentinel/product-journey';
const starters=[
 {label:'THE COMPUTE STACK',stocks:['NVDA','MSFT','AMD'],description:'Chips, software and cloud infrastructure'},
 {label:'THE PLATFORMS',stocks:['AAPL','AMZN','GOOGL'],description:'Large consumer and cloud platforms'},
 {label:'THE INDEPENDENT PICK',stocks:[],description:'Choose individual assets yourself'}
];
function preferred(tokens:Equity[],ticker:string):Equity|undefined{
 return tokens.filter(t=>t.ticker===ticker).sort((a,b)=>Number(b.tradingAvailable===true)-Number(a.tradingAvailable===true)||
  Number(b.platform==='bstock')-Number(a.platform==='bstock'))[0];
}
export default function BuyStocks(){
 const {basket,snapshot,feed,addToken,removeToken,weight,reset}=useDesk();
 const router=useRouter();
 const [budget,setBudget]=useState(10);
 const [search,setSearch]=useState('');
 const [catalogue,setCatalogue]=useState(false);
 useEffect(()=>{try{const n=Number(sessionStorage.getItem('sentinel-budget-v1'));if(Number.isFinite(n)&&n>=1&&n<=LIVE_BASKET_MAX_USD)setBudget(n);}catch{/* storage optional */}},[]);
 useEffect(()=>{try{sessionStorage.setItem('sentinel-budget-v1',String(budget));}catch{/* storage optional */}},[budget]);
 const tokens=snapshot?.tokens??[];
 const plan=useMemo(()=>checkoutPlan(basket,tokens,budget),[basket,tokens,budget]);
 const candidates=useMemo(()=>{
  const map=new Map<string,Equity>();
  for(const token of tokens){if(token.tradingAvailable!==true||map.has(token.ticker))continue;map.set(token.ticker,preferred(tokens,token.ticker)??token);}
  return [...map.values()].filter(t=>!basket.some(b=>b.ticker===t.ticker))
   .filter(t=>!search||[t.ticker,t.company,t.symbol].join(' ').toLowerCase().includes(search.toLowerCase()))
   .sort((a,b)=>a.ticker.localeCompare(b.ticker)).slice(0,24);
 },[tokens,basket,search]);
 const positions=basket.map(leg=>({...leg,token:tokens.find(t=>t.ticker===leg.ticker&&t.platform===leg.platform),
  wrappers:tokens.filter(t=>t.ticker===leg.ticker&&t.tradingAvailable===true).sort((a,b)=>a.platform.localeCompare(b.platform)),
  amount:plan.legs.find(p=>p.ticker===leg.ticker)?.amountUsd??0}));
 const applyTemplate=(tickers:string[])=>{
  reset();
  if(!tickers.length){setCatalogue(true);return;}
  for(const ticker of tickers){const asset=preferred(tokens,ticker);if(asset)addToken(asset);}
 };
 return <div className="desk-wrap product-home">
  <div className="product-breadcrumb"><Link href="/sentinel">The Brief <ArrowRight size={15}/></Link><span>BUY STOCKS</span></div>
  <section className="product-home-hero">
   <div className="product-home-copy">
    <div className="product-kicker"><span/> SYNTHABASKET SENTINEL <i>/</i> BSC MAINNET</div>
    <h1>Your conviction.<br/><em>One basket.</em></h1>
    <p>Choose the stocks and amount. Sentinel automatically handles issuer selection, allocation, live quotes, safety checks and settlement verification.</p>
    <div className="product-home-steps"><span><b>01</b> Choose</span><ArrowRight size={15}/><span><b>02</b> Review</span><ArrowRight size={15}/><span><b>03</b> Buy</span></div>
    <p className="product-hero-trust"><ShieldCheck size={17}/> Automatic checks · Real contracts · You approve every wallet action</p>
   </div>
   <div className="product-hero-feature">
    <span className="product-topline">YOUR CURRENT BASKET</span>
    <div className="product-hero-number"><strong>{basket.length.toString().padStart(2,'0')}</strong><span>STOCKS SELECTED<br/>UP TO FOUR</span></div>
    <div className="product-hero-bar"><i style={{width:Math.min(100,basket.reduce((n,x)=>n+x.weight,0))+'%'}}/></div>
    <div className="product-hero-feature-bottom"><span>{formatUsd(budget)} TARGET SPEND</span><span>{basket.reduce((n,x)=>n+x.weight,0)}% WEIGHTED</span></div>
    <small>{feed==='live'?snapshot?.count+' live BSC issuer contracts available':'Live inventory unavailable'} · Selections are not purchased yet.</small>
   </div>
  </section>
  <section className="product-builder" id="build">
   <div className="product-builder-head">
    <div><span className="product-section-label">CHOOSE YOUR STOCKS</span><h2>What do you believe in?</h2><p>Start with a theme or pick your own. Sentinel evenly allocates the basket and selects a supported issuer automatically.</p></div>
    <Link href="/sentinel/markets" className="product-quiet-link">Explore the market <ArrowUpRight size={17}/></Link>
   </div>
   <div className="product-themes">{starters.map((theme,i)=><button key={theme.label} className="product-theme"
    disabled={feed!=='live'||!theme.stocks.every(t=>!!preferred(tokens,t))} onClick={()=>applyTemplate(theme.stocks)} type="button">
     <span>{String(i+1).padStart(2,'0')} / STARTER</span><strong>{theme.label}</strong><small>{theme.description}</small><span className="product-theme-tickers">{theme.stocks.length?theme.stocks.join(' · '):'YOU DECIDE'} <ArrowUpRight size={15}/></span>
    </button>)}</div>
   <div className="product-workspace">
    <div className="product-workspace-main">
     <div className="product-workspace-title"><div><span className="product-section-label">YOUR SELECTION</span><h3>{basket.length?'Make it yours.':'Start with a stock.'}</h3></div><span>{basket.length}/4 STOCKS</span></div>
     {!basket.length&&<p className="product-empty-message">Pick a theme or browse available assets. Nothing will be bought until execution is independently cleared and authorized.</p>}
     {positions.map((leg,i)=><div className="product-asset-row" key={leg.ticker}>
      <span className="product-asset-index">{String(i+1).padStart(2,'0')}</span><TokenMark token={leg.token}/>
      <div className="product-asset-name"><strong>{leg.ticker}</strong><small>{leg.token?.company||'Issuer unavailable'} · {leg.token?.symbol} · {leg.token?.platform==='bstock'?'bStocks':'Ondo'}</small>
       <details className="product-asset-options"><summary>Customize issuer or allocation</summary>
        <div className="product-wrapper-picker" aria-label={'Issuer wrapper for '+leg.ticker}>{leg.wrappers.map(option=><button
         key={option.platform} type="button" className={option.platform===leg.platform?'selected':''}
         aria-pressed={option.platform===leg.platform} onClick={()=>addToken(option)}>
         {option.platform==='bstock'?'bStocks':'Ondo'} <span>{option.tokenToShareRatio?option.tokenToShareRatio.toLocaleString('en-US',{maximumFractionDigits:6})+':1':'ratio n/a'}</span>
        </button>)}</div>
        <div className="product-asset-weight"><input aria-label={'Allocation for '+leg.ticker} type="range"
         min={basket.length===1?100:5} max={basket.length===1?100:100-5*(basket.length-1)} step={1}
         value={leg.weight} disabled={basket.length===1} onChange={e=>weight(leg.ticker,Number(e.target.value))}/></div>
       </details>
      </div>
      <div className="product-asset-amount"><b>{leg.weight}%</b><small>{formatUsd(leg.amount)} target</small></div>
      <button className="product-remove" type="button" title={'Remove '+leg.ticker} aria-label={'Remove '+leg.ticker} onClick={()=>removeToken(leg.ticker)}><Trash2 size={17}/></button>
     </div>)}
     <div className="product-add-line"><button disabled={basket.length>=4||feed!=='live'} type="button" onClick={()=>setCatalogue(n=>!n)}>
       <Plus size={18}/>{catalogue?'Hide stock picker':'Add a stock'} <ChevronDown size={15}/></button>
      {basket.length>0&&<button type="button" onClick={reset}>Clear basket</button>}</div>
     {catalogue&&<div className="product-catalogue">
      <label><Search size={17}/><input placeholder="Search available stocks…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
      <div>{candidates.length?candidates.map(t=><button key={t.ticker} type="button" onClick={()=>{addToken(t);if(basket.length>=3)setCatalogue(false);}}>
       <TokenMark token={t} size="small"/><span><strong>{t.ticker}</strong><small>{t.company} · {t.platform==='bstock'?'bStocks':'Ondo'}</small></span><Plus size={16}/>
      </button>):<span className="product-catalogue-empty">No additional live assets match.</span>}</div>
     </div>}
     {basket.length>0&&<p className="product-selection-note"><ShieldCheck size={16}/> Allocation and supported issuer defaults are automatic. You can customize either above; contracts and execution conditions are rechecked before purchase.</p>}
    </div>
    <aside className="product-workspace-checkout">
     <span className="product-section-label">TOTAL AMOUNT</span><h3>How much?</h3>
     <label htmlFor="product-budget">TOTAL INVESTMENT / BSC USDT</label>
     <div className="product-input-amount"><span>$</span><input id="product-budget" type="number" min={1} max={LIVE_BASKET_MAX_USD} step=".01" value={budget}
      onChange={e=>setBudget(Math.max(1,Math.min(LIVE_BASKET_MAX_USD,Math.round((Number(e.target.value)||1)*100)/100)))}/></div>
     <div className="product-budget-shortcuts">{[5,10,15,25].map(n=><button type="button" className={budget===n?'chosen':''} onClick={()=>setBudget(n)} key={n}>{'$'+n}</button>)}</div>
     <div className="product-order-stat"><span>Basket assets</span><b>{basket.length}</b></div>
     <div className="product-order-stat"><span>Allocated</span><b>{basket.reduce((n,x)=>n+x.weight,0)}%</b></div>
     <div className="product-order-stat"><span>Proposed input</span><b>{formatUsd(plan.totalUsd)} USDT</b></div>
     {plan.issues.length>0&&basket.length>0&&<div className="product-issue">{plan.issues[0]}</div>}
     <button type="button" className="product-main-cta" disabled={feed!=='live'||plan.issues.length>0||plan.legs.length===0} onClick={()=>router.push('/sentinel/invest')}>
      Review and buy <ArrowRight size={19}/></button>
     <small className="product-checkout-note">Prices and safety checks start automatically on the next screen. Only your wallet can approve a transaction.</small>
    </aside>
   </div>
  </section>
  <section className="product-discovery-foot"><div><span className="product-section-label">BEYOND A QUOTE</span><h2>Know what you're actually buying.</h2></div>
   <p>Issuer terms, token-to-share conversion and on-chain delivery can change what a quote means. Sentinel keeps these checks attached to your basket—not buried across separate research dashboards.</p>
   <Link href="/sentinel/markets">Browse market details <ArrowUpRight size={17}/></Link></section>
 </div>;
}
