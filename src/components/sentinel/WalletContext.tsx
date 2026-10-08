'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {BSC_CHAIN_HEX,parseAccount,parseChainId,safeWalletLabel,walletKey} from '@/lib/sentinel/wallet-session';

type RpcProvider={
 request:(args:{method:string;params?:unknown[]})=>Promise<unknown>;
 on?:(event:string,callback:(value:unknown)=>void)=>void;
 removeListener?:(event:string,callback:(value:unknown)=>void)=>void;
};
type WalletChoice={id:string;name:string;provider:RpcProvider};
type WalletState={
 choices:WalletChoice[];
 address:string|null;chainId:number|null;label:string|null;
 ready:boolean;busy:boolean;error:string|null;sessionKey:string;
 connect:(id:string)=>Promise<void>;disconnect:()=>void;switchToBsc:()=>Promise<void>;
 discover:()=>void;
};
const Context=createContext<WalletState|null>(null);
type Announced={info?:{uuid?:unknown;name?:unknown};provider?:RpcProvider};
function validProvider(value:unknown):value is RpcProvider{
 return !!value&&typeof value==='object'&&typeof (value as RpcProvider).request==='function';
}
function injection():RpcProvider|null{
 const candidate=(window as Window&{ethereum?:unknown}).ethereum;
 return validProvider(candidate)?candidate:null;
}
const message=(error:unknown):string=>{
 if(error&&typeof error==='object'){
  const code=(error as {code?:unknown}).code;
  if(code===4001)return 'Wallet connection rejected. You can try again.';
  if(code===-32002)return 'A wallet request is already pending. Open your extension to review it.';
  if(code===4902)return 'BSC mainnet is not configured in this wallet. Add it through your wallet settings.';
 }
 return 'Wallet request was not completed. Check your browser wallet and try again.';
};
export function WalletProvider({children}:{children:ReactNode}){
 const [choices,setChoices]=useState<WalletChoice[]>([]);
 const [address,setAddress]=useState<string|null>(null);
 const [chainId,setChainId]=useState<number|null>(null);
 const [label,setLabel]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [revision,setRevision]=useState(0);
 const active=useRef<RpcProvider|null>(null);
 const unsub=useRef<(()=>void)|null>(null);
 const attempt=useRef(0);
 const isMounted=useRef(true);
 const discover=useCallback(()=>{
  if(typeof window==='undefined')return;
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  const fallback=injection();
  if(fallback)setChoices(prev=>prev.some(x=>x.provider===fallback)?prev:
   [...prev,{id:'legacy',name:'Browser wallet',provider:fallback}]);
 },[]);
 useEffect(()=>{
  isMounted.current=true;
  const announced=(event:Event)=>{
   const detail=(event as CustomEvent<Announced>).detail;
   if(!detail||!validProvider(detail.provider))return;
   const provider=detail.provider;
   const uuid=typeof detail.info?.uuid==='string'&&/^[0-9a-f-]{20,42}$/i.test(detail.info.uuid)?
    detail.info.uuid:'announced-wallet';
   const name=safeWalletLabel(detail.info?.name);
   setChoices(prev=>{
    if(prev.some(x=>x.provider===provider))return prev;
    const id=prev.some(x=>x.id===uuid)?uuid+'-'+prev.length:uuid;
    return [...prev,{id,name,provider}];
   });
  };
  window.addEventListener('eip6963:announceProvider',announced);
  discover();
  return()=>{isMounted.current=false;attempt.current++;unsub.current?.();unsub.current=null;
   window.removeEventListener('eip6963:announceProvider',announced);};
 },[discover]);
 const disconnect=useCallback(()=>{
  attempt.current++;unsub.current?.();unsub.current=null;active.current=null;
  setAddress(null);setChainId(null);setLabel(null);setBusy(false);setError(null);
  setRevision(n=>n+1);
 },[]);
 const connect=useCallback(async(id:string)=>{
  const wallet=choices.find(x=>x.id===id);
  if(!wallet||busy)return;
  const sequence=++attempt.current;
  unsub.current?.();unsub.current=null;active.current=null;
  setAddress(null);setChainId(null);setLabel(null);setBusy(true);setError(null);
  setRevision(n=>n+1);
  try{
   const accounts=await wallet.provider.request({method:'eth_requestAccounts'});
   const account=parseAccount(accounts);
   if(!account)throw Error('No authorized account');
   const network=parseChainId(await wallet.provider.request({method:'eth_chainId'}));
   if(sequence!==attempt.current||!isMounted.current)return;
   if(network===null)throw Error('Unrecognized chain');
   active.current=wallet.provider;
   const accountsChanged=(value:unknown)=>{
    setAddress(parseAccount(value));setRevision(n=>n+1);setError(null);
   };
   const chainChanged=(value:unknown)=>{
    setChainId(parseChainId(value));setRevision(n=>n+1);setError(null);
   };
   const disconnected=()=>{
    active.current=null;setAddress(null);setChainId(null);
    setRevision(n=>n+1);setError('Wallet disconnected from its network.');
   };
   wallet.provider.on?.('accountsChanged',accountsChanged);
   wallet.provider.on?.('chainChanged',chainChanged);
   wallet.provider.on?.('disconnect',disconnected);
   unsub.current=()=>{
    wallet.provider.removeListener?.('accountsChanged',accountsChanged);
    wallet.provider.removeListener?.('chainChanged',chainChanged);
    wallet.provider.removeListener?.('disconnect',disconnected);
   };
   setAddress(account);setChainId(network);setLabel(wallet.name);setRevision(n=>n+1);
  }catch(e){
   if(sequence===attempt.current&&isMounted.current){
    setError(message(e));setAddress(null);setChainId(null);setLabel(null);
   }
  }finally{if(sequence===attempt.current&&isMounted.current)setBusy(false);}
 },[choices,busy]);
 const switchToBsc=useCallback(async()=>{
  if(!active.current||!address||busy)return;
  setBusy(true);setError(null);
  const version=attempt.current;
  try{
   await active.current.request({method:'wallet_switchEthereumChain',params:[{chainId:BSC_CHAIN_HEX}]});
   const result=parseChainId(await active.current.request({method:'eth_chainId'}));
   if(attempt.current!==version||!isMounted.current)return;
   setChainId(result);setRevision(n=>n+1);
  }catch(e){if(attempt.current===version&&isMounted.current)setError(message(e));}
  finally{if(attempt.current===version&&isMounted.current)setBusy(false);}
 },[address,busy]);
 useEffect(()=>{
  const focus=async()=>{
   const provider=active.current;if(!provider)return;
   const version=attempt.current;
   try{
    const [accounts,network]=await Promise.all([
     provider.request({method:'eth_accounts'}),provider.request({method:'eth_chainId'})
    ]);
    if(version!==attempt.current||!isMounted.current||provider!==active.current)return;
    const nextAddress=parseAccount(accounts),nextChain=parseChainId(network);
    setAddress(previous=>previous?.toLowerCase()===nextAddress?.toLowerCase()?previous:nextAddress);
    setChainId(previous=>previous===nextChain?previous:nextChain);
   }catch{/* No forged session state when extension is unresponsive; interaction will fail closed. */}
  };
  window.addEventListener('focus',focus);
  return()=>window.removeEventListener('focus',focus);
 },[]);
 const value=useMemo<WalletState>(()=>({
  choices,address,chainId,label,ready:!!address&&chainId===56,busy,error,
  sessionKey:walletKey(address,chainId,revision),connect,disconnect,switchToBsc,discover
 }),[choices,address,chainId,label,busy,error,revision,connect,disconnect,switchToBsc,discover]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWallet(){
 const wallet=useContext(Context);
 if(!wallet)throw Error('WalletProvider missing');
 return wallet;
}
