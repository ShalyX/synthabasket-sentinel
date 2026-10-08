import type {Equity,Platform} from './model';

/**
 * M2: the server can BUILD and SIMULATE a genuine BSC spot swap.
 * It NEVER signs, approves, broadcasts, holds a session or authorizes spending.
 */
export const SIMULATION_MAX_LEG_USDT=25;
export const SIMULATION_MAX_BASKET_USDT=50;
export const SIMULATION_SLIPPAGE_PERCENT='0.5';
export const SIMULATION_MAX_IMPACT_PERCENT=2;
export const SIMULATION_CHAIN='56';
export const ZERO_ADDRESS='0x0000000000000000000000000000000000000000';
export const validAddress=(x:unknown):x is string=>typeof x==='string'&&/^0x[a-f\d]{40}$/i.test(x)&&x.toLowerCase()!==ZERO_ADDRESS;
const integer=(x:unknown):x is string=>typeof x==='string'&&/^[1-9]\d{0,78}$/.test(x);
const bigintText=(x:unknown)=>typeof x==='string'&&/^(0|[1-9]\d{0,78})$/.test(x);
const plain=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);

export interface SimulationIntent{
 ticker:string;
 platform:Platform;
 amountUsd:number;
 walletAddress:string;
}
export type Validation<T>={ok:true;value:T}|{ok:false;message:string};

export function parseSimulationIntent(raw:unknown):Validation<SimulationIntent>{
 if(!plain(raw)||Object.keys(raw).some(k=>!['ticker','platform','amountUsd','walletAddress'].includes(k)))
  return {ok:false,message:'Unexpected or missing simulation parameters.'};
 const {ticker,platform,amountUsd,walletAddress}=raw;
 if(typeof ticker!=='string'||!/^[A-Z0-9.-]{1,16}$/.test(ticker)||!['bstock','ondo'].includes(String(platform)))
  return {ok:false,message:'Select a supported issuer contract from the live BSC inventory.'};
 if(typeof amountUsd!=='number'||!Number.isFinite(amountUsd)||amountUsd<1||amountUsd>SIMULATION_MAX_LEG_USDT||
    Math.abs(Math.round(amountUsd*100)-amountUsd*100)>1e-6)
  return {ok:false,message:'Simulation leg must spend $1–$25 BSC USDT, with at most two decimals.'};
 if(!validAddress(walletAddress))
  return {ok:false,message:'A valid public BSC wallet address is needed for simulation. Never enter private keys.'};
 return {ok:true,value:{ticker,platform:platform as Platform,amountUsd,walletAddress}};
}

export function rawUsdtAmount(amountUsd:number):string{
 if(!Number.isFinite(amountUsd)||amountUsd<1||amountUsd>SIMULATION_MAX_LEG_USDT||
    Math.abs(Math.round(amountUsd*100)-amountUsd*100)>1e-6)
  throw Error('Simulation budget is outside the $1–$25 limit.');
 return (BigInt(Math.round(amountUsd*100))*10n**16n).toString();
}

export interface RouteCandidate{
 quoteId:string;
 vendorName:string;
 fromTokenAmount:string;
 toTokenAmount:string;
 executionMode:'SWAP';
 priceImpactPercent:number;
}
export function selectRouteForSimulation(rows:unknown,expectedRawAmount:string):Validation<RouteCandidate>{
 if(!Array.isArray(rows))return {ok:false,message:'Binance did not return an array of venue routes.'};
 // First proof is LiquidMesh SWAP only. RFQ/EIP-712 is not accepted as a SWAP transaction.
 const route=rows.find(x=>x?.executionMode==='SWAP'&&x.vendorName==='LiquidMesh'&&
  x.fromTokenAmount===expectedRawAmount&&typeof x.quoteId==='string'&&x.quoteId.length>0);
 if(!route)return {ok:false,message:'No supported LiquidMesh SWAP quote for this exact BSC USDT amount. RFQ and other routes are not simulated here.'};
 if(route.quoteId.length>256||!integer(route.toTokenAmount))
  return {ok:false,message:'Swap quote ID or received amount is malformed.'};
 const impact=route.priceImpactPercent==null?NaN:Number(route.priceImpactPercent);
 if(!Number.isFinite(impact)||Math.abs(impact)>SIMULATION_MAX_IMPACT_PERCENT)
  return {ok:false,message:'Quote impact is missing or exceeds the strict 2% simulation guard.'};
 return {ok:true,value:{quoteId:route.quoteId,vendorName:'LiquidMesh',executionMode:'SWAP',fromTokenAmount:expectedRawAmount,
  toTokenAmount:route.toTokenAmount,priceImpactPercent:impact}};
}

export interface CheckedEvmTransaction{
 from:string;to:string;data:string;value:'0';gas:string|null;
}
export function checkSwapBuild(
 raw:unknown,
 intent:SimulationIntent,
 expectedRawAmount:string,
 expectedRawOutputAmount:string,
 expectedToTokenAddress:string,
 expectedUSDT:string
):Validation<CheckedEvmTransaction>{
 if(!plain(raw)||raw.executionMode!=='SWAP'||!plain(raw.tx))
  return {ok:false,message:'Swap builder returned no approved SWAP transaction; RFQ and signatures cannot be simulated by this path.'};
 // Do not accept a swap transaction containing RFQ/EIP-712 signing material.
 if(plain(raw.rfq)&&raw.rfq.typedDataToSign)
  return {ok:false,message:'Swap response unexpectedly requires RFQ typed-data signing.'};
 const tx=raw.tx as Record<string,unknown>;
 if(!validAddress(tx.from)||tx.from.toLowerCase()!==intent.walletAddress.toLowerCase())
  return {ok:false,message:'Swap transaction sender does not match the requested public wallet.'};
 if(!validAddress(tx.to)||tx.to.toLowerCase()===intent.walletAddress.toLowerCase())
  return {ok:false,message:'Swap transaction target is missing or invalid.'};
 if(typeof tx.data!=='string'||!/^0x(?:[0-9a-fA-F]{2}){4,20000}$/.test(tx.data)||
  tx.data.slice(0,10).toLowerCase()==='0x095ea7b3')
  return {ok:false,message:'Swap returned invalid calldata or an ERC-20 approval instead of a swap.'};
 if(tx.value!==0&&tx.value!=='0')
  return {ok:false,message:'A token-funded USDT swap must not include native BNB value.'};
 if(tx.gas!==undefined&&tx.gas!==null&&(!bigintText(String(tx.gas))||BigInt(String(tx.gas))>3000000n))
  return {ok:false,message:'Unreasonable swap gas limit.'};
 const rr=raw.routerResult;
 if(!plain(rr)||String(rr.binanceChainId)!==SIMULATION_CHAIN||rr.vendorName!=='LiquidMesh'||
    rr.fromTokenAmount!==expectedRawAmount||rr.toTokenAmount!==expectedRawOutputAmount||!plain(rr.fromToken)||!plain(rr.toToken)||
    String((rr.fromToken as Record<string,unknown>).tokenContractAddress).toLowerCase()!==expectedUSDT.toLowerCase()||
    String((rr.toToken as Record<string,unknown>).tokenContractAddress).toLowerCase()!==expectedToTokenAddress.toLowerCase())
  return {ok:false,message:'Built route differs from the approved chain, input amount or issuer contract.'};
 return {ok:true,value:{from:tx.from,to:tx.to,data:tx.data,value:'0',gas:tx.gas==null?null:String(tx.gas)}};
}

export interface SimulationAssessment{
 status:'PASS'|'BLOCKED'|'UNKNOWN';
 reportedStatus:string;
 reason:string|null;
 balanceChangeCount:number;
 allowanceChangeCount:number;
 unexpectedApprovalIncrease:boolean;
}
export function assessSimulation(raw:unknown):SimulationAssessment{
 const unknown:SimulationAssessment={status:'UNKNOWN',reportedStatus:'UNKNOWN',reason:'No usable simulation result.',balanceChangeCount:0,allowanceChangeCount:0,unexpectedApprovalIncrease:false};
 if(!plain(raw))return unknown;
 const reported=typeof raw.status==='string'?raw.status.toUpperCase().slice(0,30):'UNKNOWN';
 const failReason=typeof raw.failReason==='string'?raw.failReason.trim():null;
 const balances=Array.isArray(raw.balanceChanges)?raw.balanceChanges:[];
 const allowances=Array.isArray(raw.allowanceChanges)?raw.allowanceChanges:[];
 if(balances.length>100||allowances.length>100)return {...unknown,reason:'Simulation returned excessive state-change entries.'};
 let unexpected=false;
 for(const item of allowances){
  if(!plain(item)||!bigintText(item.preAmount)||!bigintText(item.postAmount)){
   return {...unknown,reason:'Simulation allowance results are incomplete.'};
  }
  // M2 must never mask an allowance increase as a simple trade simulation.
  if(BigInt(String(item.postAmount))>BigInt(String(item.preAmount)))unexpected=true;
 }
 const reason=failReason?
  (/allowance/i.test(failReason)?'Insufficient token allowance.' :
   /balance|insufficient funds/i.test(failReason)?'Insufficient token balance or BNB gas funds.' :
   /revert|failed/i.test(failReason)?'The simulated transaction reverted.' :
   'Simulator reported a failure (details withheld for wallet privacy).'):null;
 if(reported==='SUCCESS'&&!reason&&!unexpected)
  return {status:'PASS',reportedStatus:reported,reason:null,balanceChangeCount:balances.length,
   allowanceChangeCount:allowances.length,unexpectedApprovalIncrease:false};
 return {status:reported==='UNKNOWN'&&!reason&&!unexpected?'UNKNOWN':'BLOCKED',reportedStatus:reported,
  reason:unexpected?'Simulation unexpectedly increases ERC-20 allowance.':reason||'Simulator did not confirm successful execution.',
  balanceChangeCount:balances.length,allowanceChangeCount:allowances.length,unexpectedApprovalIncrease:unexpected};
}

export function eligibleToSimulate(equity:Equity):Validation<Equity>{
 if(equity.tradingAvailable!==true)return {ok:false,message:'Issuer has not verified this token as open for trading.'};
 if(equity.basisPct===null||!Number.isFinite(equity.basisPct)||Math.abs(equity.basisPct)>2.5)
  return {ok:false,message:'Reference-adjusted token basis is missing or outside the ±2.5% execution guard.'};
 if(!validAddress(equity.address))return {ok:false,message:'Token contract is invalid.'};
 return {ok:true,value:equity};
}
