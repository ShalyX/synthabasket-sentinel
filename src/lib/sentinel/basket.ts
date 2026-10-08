import type { Equity, Platform } from './model';

export type BasketLeg={ticker:string;platform:Platform;weight:number};
export const STORAGE_KEY='synthabasket-sentinel-allocations-v2';
export const MAX_LEGS=4;
const validLeg=(leg:unknown):leg is BasketLeg=>{
 if(!leg||typeof leg!=='object')return false;
 const x=leg as Record<string,unknown>;
 return typeof x.ticker==='string'&&/^[A-Z0-9.-]{1,16}$/.test(x.ticker)
  &&(x.platform==='ondo'||x.platform==='bstock')
  &&typeof x.weight==='number'&&Number.isInteger(x.weight)&&x.weight>=0&&x.weight<=100;
};
export function normalizeBasket(input:unknown):BasketLeg[]{
 if(!Array.isArray(input)||input.length>MAX_LEGS||!input.every(validLeg))return [];
 const distinct=new Set(input.map(x=>x.ticker));
 if(distinct.size!==input.length)return [];
 const total=input.reduce((sum:number,x:BasketLeg)=>sum+x.weight,0);
 if(total===100&&input.every(x=>x.weight>=5))return input.map(x=>({...x}));
 return evenly(input.map(x=>({ticker:x.ticker,platform:x.platform})));
}
export function evenly(items:Pick<BasketLeg,'ticker'|'platform'>[]):BasketLeg[]{
 if(items.length===0)return [];
 const base=Math.floor(100/items.length);
 const remainder=100-base*items.length;
 return items.map((x,i)=>({...x,weight:base+(i<remainder?1:0)}));
}
export function changeWeight(legs:BasketLeg[],index:number,weight:number):BasketLeg[]{
 if(index<0||index>=legs.length)return legs;
 if(legs.length===1)return [{...legs[0],weight:100}];
 const next=Math.max(5,Math.min(100-5*(legs.length-1),Math.round(weight)));
 const others=legs.map((x,i)=>({...x,i})).filter(x=>x.i!==index);
 const total=others.reduce((sum,x)=>sum+x.weight,0);
 const free=100-next-5*others.length;
 const allocated=others.map(x=>({...x,weighted:free*(total>0?x.weight/total:1/others.length)}));
 const entries=allocated.map(x=>({...x,floor:5+Math.floor(x.weighted),fraction:x.weighted%1}));
 let left=100-next-entries.reduce((sum,x)=>sum+x.floor,0);
 for(const x of [...entries].sort((a,b)=>b.fraction-a.fraction)){
  if(left<=0)break;x.floor++;left--;
 }
 const map=new Map(entries.map(x=>[x.i,x.floor]));
 return legs.map((x,i)=>({...x,weight:i===index?next:map.get(i)??5}));
}
export function upsert(legs:BasketLeg[],token:Equity):BasketLeg[]{
 const i=legs.findIndex(x=>x.ticker===token.ticker);
 if(i>=0)return legs.map((x,k)=>k===i?{...x,platform:token.platform}:x);
 if(legs.length>=MAX_LEGS)return legs;
 return evenly([...legs,{ticker:token.ticker,platform:token.platform}]);
}
export function removeLeg(legs:BasketLeg[],ticker:string):BasketLeg[]{
 return evenly(legs.filter(x=>x.ticker!==ticker));
}
export function amountFor(budget:number,leg:BasketLeg){return Math.round(budget*leg.weight)/100;}
export function selectPreferred(tokens:Equity[],ticker:string):Equity|undefined{
 const matches=tokens.filter(x=>x.ticker===ticker);
 return matches.sort((a,b)=>Number(b.tradingAvailable===true)-Number(a.tradingAvailable===true)||Math.abs(a.basisPct??999)-Math.abs(b.basisPct??999))[0];
}
