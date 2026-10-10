'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {ArrowUpRight,Check,Menu,RefreshCw,X} from 'lucide-react';
import {useState} from 'react';
import {DeskProvider,useDesk} from './DeskContext';
import {WalletProvider} from './WalletContext';
import {WalletControls} from './WalletControls';
const LINKS=[
 {href:'/sentinel',name:'The Brief',no:'01'},
 {href:'/sentinel/markets',name:'Market Index',no:'02'},
 {href:'/sentinel/buy',name:'Buy stocks',no:'03'},
 {href:'/sentinel/portfolio',name:'Portfolio',no:'04'}
];
function Shell({children}:{children:React.ReactNode}){
 const path=usePathname();
 const {feed,error,refresh,snapshot,basket}=useDesk();
 const [mobile,setMobile]=useState(false);
 return <div className="desk-root">
  <div className="desk-utility"><div className="desk-wrap desk-utility-inner">
   <span>SYNTHABASKET <i>/</i> TOKENIZED EQUITIES</span>
   <span className="desk-utility-right"><span className="desk-utility-stripe"/> BSC MAINNET <b>•</b> DISCOVER → CHOOSE → BUY</span>
  </div></div>
  <header className="desk-header">
   <div className="desk-wrap desk-header-inner">
    <Link href="/sentinel" className="desk-logo" onClick={()=>setMobile(false)}>
     <span className="desk-logo-symbol" aria-hidden="true"><span/><span/><span/></span>
     <span className="desk-logo-type">syntha<b>basket</b><small>SENTINEL / 01</small></span>
    </Link>
    <nav className={'desk-nav '+(mobile?'is-open':'')} aria-label="Sentinel sections">
     {LINKS.map(link=>{
      const selected=link.href==='/sentinel'?path===link.href:
       link.href==='/sentinel/buy'?(path.startsWith(link.href)||path.startsWith('/sentinel/invest')):path.startsWith(link.href);
      return <Link key={link.href} href={link.href} onClick={()=>setMobile(false)} className={selected?'selected':''}>
       <span>{link.no}</span>{link.name}
       {link.href==='/sentinel/buy'&&basket.length>0?<em>{basket.length}</em>:null}
      </Link>;
     })}
    </nav>
    <div className="desk-header-actions">
     <WalletControls/>
     <span className={'desk-feed '+feed}><span className="desk-feed-dot"/>{feed==='live'?(snapshot?.source==='first-party-production-readonly'?'First-party relay':'Feed connected'):feed==='connecting'?'Connecting…':feed==='stale'?'Stale feed':'Feed unavailable'}</span>
     <button className="desk-mobile-toggle" type="button" aria-label={mobile?'Close menu':'Open menu'} aria-expanded={mobile} onClick={()=>setMobile(x=>!x)}>{mobile?<X size={20}/>:<Menu size={20}/>}</button>
    </div>
   </div>
  </header>
  {feed!=='live'&&<div className="desk-feed-alert"><div className="desk-wrap desk-alert-inner"><span><b>{feed==='stale'?'Last-known data, not live.':'Upstream unavailable.'}</b> {error||'Live records have not been loaded.'} No invented prices are shown.</span><button type="button" onClick={()=>void refresh()}><RefreshCw size={14}/> Retry feed</button></div></div>}
  <main>{children}</main>
  <footer className="desk-footer"><div className="desk-wrap desk-footer-inner">
   <div><span className="desk-footer-logo">S / SENTINEL</span><p>Choose a basket and amount. Sentinel automatically checks live routes and settlement; you approve every wallet action.</p></div>
   <div className="desk-footer-links"><span>{snapshot?.count??'—'} verified BSC contracts {snapshot&&feed==='live'?'· LIVE':'· NOT LIVE'}</span><a href="https://github.com/ShalyX/synthabasket-sentinel" target="_blank" rel="noreferrer">Source code <ArrowUpRight size={13}/></a><Link href="/sentinel">The Brief <ArrowUpRight size={13}/></Link><Link href="/sentinel/markets">Market Index <ArrowUpRight size={13}/></Link><Link href="/sentinel/buy">Buy stocks <ArrowUpRight size={13}/></Link><Link href="/sentinel/portfolio">Portfolio <ArrowUpRight size={13}/></Link></div>
  </div></footer>
 </div>;
}
export function DeskApp({children}:{children:React.ReactNode}){return <DeskProvider><WalletProvider><Shell>{children}</Shell></WalletProvider></DeskProvider>;}
