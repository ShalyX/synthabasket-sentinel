import {validAddress} from './execution-preflight';
import {formatAtomic} from './wallet-funding';

export interface AllowanceLeg {spender:string; amountUsd:number}
export interface AllowanceSnapshot {spender:string; requiredUsdt:string; approvedUsdt:string; coversRequired:boolean}
export type AllowanceLegParse={ok:true;legs:AllowanceLeg[]}|{ok:false;message:string};

export function parseAllowanceLegs(raw:unknown, basketAmountUsd:number):AllowanceLegParse {
 if(raw===undefined)return {ok:true,legs:[]};
 if(!Array.isArray(raw)||raw.length>4)return {ok:false,message:'Provide at most four read-only allowance legs.'};
 let totalCents=0;
 const legs:AllowanceLeg[]=[];
 for(const entry of raw){
  if(!entry||typeof entry!=='object'||Array.isArray(entry))return {ok:false,message:'Invalid allowance leg.'};
  const item=entry as Record<string,unknown>;
  if(Object.keys(item).sort().join(',')!=='amountUsd,spender'||!validAddress(item.spender)||
   typeof item.amountUsd!=='number'||!Number.isFinite(item.amountUsd)||item.amountUsd<1||item.amountUsd>25||
   Math.abs(item.amountUsd*100-Math.round(item.amountUsd*100))>1e-6)
   return {ok:false,message:'Allowance legs require a public spender and $1–$25 USDT each.'};
  totalCents+=Math.round(item.amountUsd*100);
  legs.push({spender:(item.spender as string).toLowerCase(),amountUsd:item.amountUsd});
 }
 if(totalCents>Math.round(basketAmountUsd*100))return {ok:false,message:'Allowance legs exceed the basket simulation amount.'};
 return {ok:true,legs};
}

export function requiredBySpender(legs:AllowanceLeg[]):Map<string,bigint>{
 const required=new Map<string,bigint>();
 for(const leg of legs){
  const amount=BigInt(Math.round(leg.amountUsd*100))*10n**16n;
  const key=leg.spender.toLowerCase();
  required.set(key,(required.get(key)??0n)+amount);
 }
 return required;
}

export function summarizeAllowances(needed:Map<string,bigint>,read:Map<string,bigint>):AllowanceSnapshot[]{
 return [...needed].map(([spender,amount])=>{
  const approved=read.get(spender);
  if(approved===undefined||approved<0n)throw Error('Missing onchain allowance');
  return {spender,requiredUsdt:formatAtomic(amount,18,6),approvedUsdt:formatAtomic(approved,18,6),
   coversRequired:approved>=amount};
 });
}
