import type {BasketLeg} from './basket';
import type {Equity} from './model';
export type BridgeLeg={ticker:string;platform:'bstock';address:string;symbol:string;amountUsd:number};
export type BridgePlan={legs:BridgeLeg[]};
export function buildBridgePlan(
 basket:BasketLeg[],tokens:Equity[],budget:number
):{ok:true;value:BridgePlan}|{ok:false;reason:string}{
 if(!Number.isInteger(budget*100)||budget<1||budget>25)return {ok:false,reason:'Live basket budget must be $1–$25, in cents.'};
 if(!basket.length||basket.length>4||basket.reduce((sum,x)=>sum+x.weight,0)!==100)
  return {ok:false,reason:'Select one to four basket contracts with weights totaling 100%.'};
 if(basket.some(x=>x.platform!=='bstock'))
  return {ok:false,reason:'The Agentic Wallet route supports bStocks only. Switch this wrapper in Build, or use browser-wallet signing for the Ondo leg.'};
 const cents=Math.round(budget*100);
 const weighted=basket.map((leg,index)=>({leg,index,raw:leg.weight*cents/100,allocated:Math.floor(leg.weight*cents/100)}));
 let remaining=cents-weighted.reduce((sum,x)=>sum+x.allocated,0);
 const byFraction=[...weighted].sort((a,b)=>(b.raw-b.allocated)-(a.raw-a.allocated)||a.index-b.index);
 for(const item of byFraction){if(remaining-->0)item.allocated++;}
 const legs:BridgeLeg[]=[];
 for(const row of weighted){
  const token=tokens.find(x=>x.ticker===row.leg.ticker&&x.platform==='bstock');
  if(!token||token.tradingAvailable!==true||!/^0x[0-9a-f]{40}$/i.test(token.address))
   return {ok:false,reason:'Issuer not currently executable: '+row.leg.ticker};
  if(row.allocated<100)return {ok:false,reason:row.leg.ticker+' allocation is below the $1 minimum. Increase the basket budget or its weight.'};
  legs.push({ticker:token.ticker,platform:'bstock',address:token.address,symbol:token.symbol,amountUsd:row.allocated/100});
 }
 return {ok:true,value:{legs}};
}
