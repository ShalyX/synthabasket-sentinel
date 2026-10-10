'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronDown,Link2Off,ShieldCheck,Wallet,AlertCircle} from 'lucide-react';
import {shortAddress} from '@/lib/sentinel/wallet-session';
import {useWallet} from './WalletContext';

export function WalletControls(){
 const wallet=useWallet();
 const [open,setOpen]=useState(false);
 const element=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const outside=(event:MouseEvent)=>{
   if(element.current&&!element.current.contains(event.target as Node))setOpen(false);
  };
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
  window.addEventListener('mousedown',outside);window.addEventListener('keydown',escape);
  return()=>{window.removeEventListener('mousedown',outside);window.removeEventListener('keydown',escape);};
 },[]);
 return <div className="desk-wallet-control" ref={element}>
  <button type="button" className={'desk-wallet-trigger '+(wallet.ready?'connected':wallet.address?'wrong-chain':'')}
   onClick={()=>{wallet.discover();setOpen(value=>!value);}} aria-expanded={open} aria-haspopup="true">
   <Wallet size={15}/>
   <span>{wallet.address?shortAddress(wallet.address):'Connect wallet'}</span>
   <ChevronDown size={13}/>
  </button>
  {open&&<section className="desk-wallet-menu" aria-label="Wallet connection controls">
   <div className="desk-wallet-menu-title"><strong>WALLET / BSC MAINNET</strong>
    <small>Connect to check funds and buy. Every transaction still requires your approval.</small></div>
   {wallet.address?<div className="desk-wallet-current">
    <div className="desk-wallet-current-top"><ShieldCheck size={17}/>
     <div><strong>{wallet.label||'Connected wallet'}</strong><small>{shortAddress(wallet.address)}</small></div>
    </div>
    <span className={wallet.ready?'ok':'wrong'}>{wallet.ready?'BSC MAINNET · 56':
     'WRONG NETWORK · '+(wallet.chainId??'UNKNOWN')}</span>
    {!wallet.ready&&<button type="button" className="desk-wallet-switch"
     onClick={()=>void wallet.switchToBsc()} disabled={wallet.busy}>Switch to BSC mainnet</button>}
    <button type="button" className="desk-wallet-disconnect" onClick={()=>{wallet.disconnect();setOpen(false);}}>
     <Link2Off size={14}/> Disconnect from Sentinel
    </button>
   </div>:<div className="desk-wallet-choices">
    {wallet.choices.length===0?<p>No injected browser wallet detected. Install or enable a compatible EVM wallet in this browser, then reopen this menu.</p>:
     wallet.choices.map(choice=><button type="button" key={choice.id} disabled={wallet.busy}
      onClick={()=>void wallet.connect(choice.id).then(()=>setOpen(false))}>
      <Wallet size={17}/><span>{choice.name}</span><span>{wallet.busy?'…':'Connect →'}</span>
     </button>)}
   </div>}
   {wallet.error&&<p className="desk-wallet-error" role="alert"><AlertCircle size={14}/>{wallet.error}</p>}
   <p className="desk-wallet-disclaimer">Sentinel automates read-only checks, never signatures. You approve every on-chain action in your wallet.</p>
  </section>}
 </div>;
}
