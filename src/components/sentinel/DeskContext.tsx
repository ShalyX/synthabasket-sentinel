'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import type {Equity,MarketSnapshot} from '@/lib/sentinel/model';
import {STORAGE_KEY,changeWeight,evenly,normalizeBasket,removeLeg,selectPreferred,upsert,type BasketLeg} from '@/lib/sentinel/basket';
import type {JourneyProof} from '@/lib/sentinel/journey-evidence';
export type FeedState='connecting'|'live'|'stale'|'offline';
type DeskContextType={
 snapshot:MarketSnapshot|null;feed:FeedState;error:string;refresh:()=>Promise<void>;
 basket:BasketLeg[];setFromTickers:(tickers:string[])=>void;addToken:(token:Equity)=>void;
 removeToken:(ticker:string)=>void;weight:(ticker:string,n:number)=>void;reset:()=>void;
 journeyProofs:JourneyProof[];recordJourneyProof:(proof:JourneyProof)=>void;
};
const Context=createContext<DeskContextType|null>(null);
export function DeskProvider({children}:{children:ReactNode}){
 const [snapshot,setSnapshot]=useState<MarketSnapshot|null>(null);
 const [feed,setFeed]=useState<FeedState>('connecting');
 const [error,setError]=useState('');
 const [basket,setBasket]=useState<BasketLeg[]>([]);
 // Only actual returned observations. In-memory per page session; no synthetic
 // fills or persistent/forged trade history across reloads or wallet changes.
 const [journeyProofs,setJourneyProofs]=useState<JourneyProof[]>([]);
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{try{const saved=localStorage.getItem(STORAGE_KEY);if(saved){setBasket(normalizeBasket(JSON.parse(saved)));}}catch{/* Storage unavailable */}setLoaded(true);},[]);
 useEffect(()=>{if(!loaded)return;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(basket));}catch{/* Storage unavailable */}},[basket,loaded]);
 const recordJourneyProof=useCallback((proof:JourneyProof)=>{
  if(!/^0x[0-9a-f]{40}$/i.test(proof.walletAddress)||!Number.isFinite(Date.parse(proof.recordedAt)))return;
  setJourneyProofs(before=>[proof,...before].slice(0,8));
 },[]);
 const refresh=useCallback(async()=>{
  try{
   const response=await fetch('/api/sentinel/markets',{cache:'no-store',signal:AbortSignal.timeout(12000)});
   const body=await response.json();
   if(!response.ok||!Array.isArray(body.tokens))throw new Error(body.error||'Market feed unavailable');
   setSnapshot(body);setFeed('live');setError('');
  }catch(e){setFeed(prev=>prev==='live'||prev==='stale'?'stale':'offline');setError(e instanceof Error?e.message:'The upstream feed cannot be reached.');}
 },[]);
 useEffect(()=>{void refresh();
  const poll=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},30000);
  const focus=()=>void refresh();window.addEventListener('focus',focus);
  return()=>{clearInterval(poll);window.removeEventListener('focus',focus);}
 },[refresh]);
 const setFromTickers=useCallback((tickers:string[])=>{
  if(!snapshot)return;
  const choices=tickers.map(ticker=>selectPreferred(snapshot.tokens,ticker)).filter((x):x is Equity=>!!x);
  setBasket(evenly(choices.slice(0,4).map(x=>({ticker:x.ticker,platform:x.platform}))));
 },[snapshot]);
 const value=useMemo<DeskContextType>(()=>({
  snapshot,feed,error,refresh,basket,setFromTickers,journeyProofs,recordJourneyProof,
  addToken:(token)=>setBasket(before=>upsert(before,token)),
  removeToken:(ticker)=>setBasket(before=>removeLeg(before,ticker)),
  weight:(ticker,n)=>setBasket(before=>changeWeight(before,before.findIndex(x=>x.ticker===ticker),n)),
  reset:()=>setBasket([]),
 }),[snapshot,feed,error,refresh,basket,setFromTickers,journeyProofs,recordJourneyProof]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useDesk(){const ctx=useContext(Context);if(!ctx)throw Error('DeskProvider missing');return ctx;}
export function useStock(ticker:string){const {snapshot}=useDesk();return useMemo(()=>snapshot?.tokens.filter(t=>t.ticker===ticker)||[],[snapshot,ticker]);}
export function useGroup(){const {snapshot}=useDesk();return useMemo(()=>{
  const groups=new Map<string,Equity[]>();
  for(const t of snapshot?.tokens||[]){const arr=groups.get(t.ticker)||[];arr.push(t);groups.set(t.ticker,arr);}
  return groups;
 },[snapshot]);}
