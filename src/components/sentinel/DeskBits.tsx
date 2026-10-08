'use client';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight,AlertTriangle,Check,Info,RefreshCw} from 'lucide-react';
import {useState,useEffect,type ReactNode} from 'react';
import {useDesk} from './DeskContext';
import type {Equity} from '@/lib/sentinel/model';
import {formatBasis,formatUsd} from '@/lib/sentinel/model';
export function SectionNumber({value}:{value:string}){return <span className="desk-section-number">{value}</span>;}
export function Eyebrow({children}:{children:ReactNode}){return <p className="desk-eyebrow">{children}</p>;}
export function TokenMark({token,size='normal'}:{token?:Equity;size?:'normal'|'small'|'large'}){
 const [broken,setBroken]=useState(false);
 useEffect(()=>setBroken(false),[token?.logoUrl]);
 return <span className={'desk-tokenmark '+size}>{token?.logoUrl&&!broken?
  // eslint-disable-next-line @next/next/no-img-element
  <img src={token.logoUrl} alt="" loading="lazy" onError={()=>setBroken(true)}/>:
  <b>{(token?.ticker||'ST').slice(0,2)}</b>}</span>;
}
export function SourceStamp(){
 const {snapshot,feed}=useDesk();
 return <div className="desk-source-stamp"><span className={'desk-source-indicator '+feed}/>
  <div><b>{feed==='live'?'Observed on BSC':'Data not current'}</b><small>{snapshot?new Date(snapshot.asOf).toLocaleString('en-US',{hour:'2-digit',minute:'2-digit',month:'short',day:'numeric'}):'No successful market response yet'} · Binance Web3 RWA</small></div>
 </div>;
}
export function TickerLine({token}:{token:Equity}){
 return <Link className="desk-ticker-line" href={'/sentinel/markets/'+encodeURIComponent(token.ticker)}><TokenMark token={token}/>
  <span><b>{token.ticker}</b><small>{token.company}</small></span><span className="desk-ticker-price">{formatUsd(token.referencePrice)}<small>Underlying reference</small></span><strong className={(token.basisPct!==null&&Math.abs(token.basisPct)>2.5)?'risk':''}>{formatBasis(token.basisPct)}</strong><ArrowUpRight size={17}/></Link>;
}
export function ClearBanner({children,type='info'}:{children:ReactNode;type?:'info'|'warning'|'good'}){
 const Icon=type==='warning'?AlertTriangle:type==='good'?Check:Info;
 return <div role="status" className={'desk-message '+type}><Icon size={19}/><div>{children}</div></div>;
}
export function BlankState({title,description,action}:{title:string;description:string;action?:ReactNode}){
 return <div className="desk-blank"><span className="desk-blank-grid" aria-hidden="true"/><p>NO RESULT / 000</p><h3>{title}</h3><span>{description}</span>{action}</div>;
}
