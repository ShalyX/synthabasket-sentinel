import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';

export const USDT='0x55d398326f99059ff775485246999027b3197955';
export const BSC=56;
export const TRANSFER='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export const ADDRESS=/^0x[0-9a-f]{40}$/i;
const SYMBOL=/^[a-z0-9._-]{1,30}$/i;
const TICKER=/^[A-Z0-9.-]{1,16}$/;
export const terminal=new Set(['FINISHED','FAILED','BLOCKED','RECOVERY_REQUIRED','PARTIAL','RECONCILIATION_INCOMPLETE']);
export const hash=(value)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function parsePlan(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='legs')throw Error('Invalid basket request.');
 const rows=value.legs;
 if(!Array.isArray(rows)||rows.length<1||rows.length>4)throw Error('Choose 1–4 contracts.');
 const seen=new Set(),legs=[];
 for(const leg of rows){
  if(!leg||typeof leg!=='object'||Array.isArray(leg)||Object.keys(leg).sort().join(',')!=='address,amountUsd,platform,symbol,ticker')throw Error('Unexpected basket fields.');
  if(!ADDRESS.test(leg.address)||!TICKER.test(leg.ticker)||!SYMBOL.test(leg.symbol)||leg.platform!=='bstock'||
   typeof leg.amountUsd!=='number'||!Number.isSafeInteger(Math.round(leg.amountUsd*100))||
   Math.abs(Math.round(leg.amountUsd*100)-leg.amountUsd*100)>0.00000001||
   leg.amountUsd<1||leg.amountUsd>25)throw Error('Each leg requires a live BSC contract and $1–$25 exact cents.');
  const id=leg.platform+':'+leg.address.toLowerCase();
  if(seen.has(id))throw Error('Duplicate contract in basket.');
  seen.add(id);
  legs.push({ticker:leg.ticker,platform:leg.platform,address:leg.address.toLowerCase(),symbol:leg.symbol,amountUsd:leg.amountUsd});
 }
 const totalCents=legs.reduce((sum,x)=>sum+Math.round(x.amountUsd*100),0);
 if(totalCents>2500)throw Error('Local execution is capped at $25 per basket.');
 return {legs,totalUsd:totalCents/100};
}
export function matchInventory(plan,tokens){
 if(!Array.isArray(tokens))throw Error('Trusted market inventory unavailable.');
 for(const leg of plan.legs){
  const token=tokens.find(x=>x.ticker===leg.ticker&&x.platform===leg.platform&&x.address?.toLowerCase()===leg.address&&x.symbol===leg.symbol);
  if(!token||token.tradingAvailable!==true)throw Error('Basket issuer no longer trading-available: '+leg.ticker+'.');
 }
}
export function parseQuote(quote,leg){
 if(quote?.success!==true)throw Error('Official wallet quote failed for '+leg.ticker+': '+String(quote?.error?.message||'unknown'));
 const data=quote.data;
 if(data?.fromCoinSymbol?.toUpperCase()!=='USDT'||data.toCoinSymbol?.toUpperCase()!==leg.symbol.toUpperCase()||
  Number(data.fromCoinAmount)!==leg.amountUsd||!Number.isFinite(Number(data.toCoinAmount))||Number(data.toCoinAmount)<=0)
  throw Error('Wallet returned a mismatched quote for '+leg.ticker+'.');
 return {ticker:leg.ticker,address:leg.address,symbol:leg.symbol,amountUsd:leg.amountUsd,estimatedTokens:String(data.toCoinAmount),slippage:0.5};
}
export function resolveOrder(submittedId,list,baseline,leg,submittedAt){
 const rows=Array.isArray(list?.list)?list.list:[];
 const isLeg=(x)=>x&&String(x.chain)==='56'&&String(x.fromToken).toLowerCase()===USDT&&
  String(x.toToken).toLowerCase()===leg.address&&Math.abs(Number(x.fromTokenQty)-leg.amountUsd)<0.0000001;
 const exact=rows.filter(x=>x.orderId===submittedId&&isLeg(x));
 if(exact.length===1)return {order:exact[0],matchedBy:'EXACT_ID'};
 const matches=rows.filter(x=>isLeg(x)&&!baseline.includes(String(x.orderId))&&
  Date.parse(x.bookTime)>=submittedAt-15000);
 if(matches.length!==1)return {order:null,matchedBy:matches.length?'AMBIGUOUS_ORDER':'ORDER_NOT_INDEXED'};
 return {order:matches[0],matchedBy:'UNIQUE_NEW_ORDER',requestedOrderId:submittedId};
}
export function parseTransferReceipt(receipt,transaction,owner,leg){
 if(!receipt||!transaction)return {status:'PENDING'};
 if(receipt.status!=='0x1'||receipt.transactionHash?.toLowerCase()!==transaction.hash?.toLowerCase()||
  transaction.from?.toLowerCase()!==owner.toLowerCase()||receipt.from?.toLowerCase()!==owner.toLowerCase()||
  receipt.to?.toLowerCase()!==transaction.to?.toLowerCase())throw Error('Transaction identity or receipt failed.');
 let spent=0n,received=0n;
 for(const log of receipt.logs||[]){
  if(log.topics?.length<3||log.topics[0]?.toLowerCase()!==TRANSFER||!/^0x[0-9a-f]{64}$/i.test(log.data||''))continue;
  const from='0x'+log.topics[1].slice(-40).toLowerCase(),to='0x'+log.topics[2].slice(-40).toLowerCase();
  if(log.address.toLowerCase()===USDT&&from===owner.toLowerCase())spent+=BigInt(log.data);
  if(log.address.toLowerCase()===leg.address&&to===owner.toLowerCase())received+=BigInt(log.data);
 }
 if(spent!==BigInt(Math.round(leg.amountUsd*100))*10n**16n||received<=0n)throw Error('Unexpected USDT debit or issuer delivery amount.');
 return {status:'VERIFIED',txHash:transaction.hash,blockHash:receipt.blockHash,blockNumber:receipt.blockNumber,
  spentUsdtRaw:spent.toString(),receivedTokenRaw:received.toString(),receivedTokenUnits:units(received),gasWei:(BigInt(receipt.gasUsed)*BigInt(receipt.effectiveGasPrice)).toString()};
}
export function units(n){let s=n.toString().padStart(19,'0');return s.slice(0,-18)+'.'+s.slice(-18).replace(/0+$/,'').padEnd(1,'0');}
export function newSecret(){return randomBytes(32).toString('hex');}
