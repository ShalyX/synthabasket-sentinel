import {SIMULATION_MAX_LEG_USDT,validAddress,rawUsdtAmount, type CheckedEvmTransaction} from './execution-preflight';

export const APPROVAL_SELECTOR='0x095ea7b3';
export function parseTrustedSelectors(raw:string|undefined):Set<string>{
 return new Set((raw||'').split(',').map(x=>x.trim().toLowerCase()).filter(x=>/^0x[0-9a-f]{8}$/.test(x)&&x!==APPROVAL_SELECTOR));
}
export type AuthorizePhase='APPROVAL_REQUIRED'|'SWAP_READY'|'BLOCKED';
export type PublicFunding={
 chainId:bigint;usdtBalance:bigint;bnbBalance:bigint;gasPrice:bigint;allowance:bigint;
};
export function parseTrustedTargets(raw:string|undefined):Set<string>{
 return new Set((raw||'').split(',').map(x=>x.trim().toLowerCase()).filter(validAddress));
}
export function isTrustedExecutionTarget(to:string,spender:string,routers:Set<string>,spenders:Set<string>):boolean{
 // On authenticated LiquidMesh BSC builds, the router may itself be the token spender.
 // Both roles need independent allowlist checks; equality is NOT intrinsically unsafe.
 // ABI-specific semantic verification remains a separate, mandatory hard blocker.
 return validAddress(to)&&validAddress(spender)&&routers.has(to.toLowerCase())&&spenders.has(spender.toLowerCase());
}
export function exactApprovalCalldata(spender:string,amountUsd:number):string{
 if(!validAddress(spender))throw Error('Unverified approval spender');
 const amount=BigInt(rawUsdtAmount(amountUsd));
 return APPROVAL_SELECTOR+spender.slice(2).toLowerCase().padStart(64,'0')+amount.toString(16).padStart(64,'0');
}
export function evaluateLiveSpend(input:{
 amountUsd:number;spender:string|null;tx:CheckedEvmTransaction;funding:PublicFunding;
 expectedAddress:string;routers:Set<string>;spenders:Set<string>;
 simulatedPass:boolean;quoteExpiresAt:number;now:number;
}):{phase:AuthorizePhase;reason:string;amountRaw:string}{
 const amountRaw=rawUsdtAmount(input.amountUsd);
 if(input.funding.chainId!==56n)return {phase:'BLOCKED',reason:'Public funding RPC did not confirm chain 56.',amountRaw};
 if(!input.spender||!isTrustedExecutionTarget(input.tx.to,input.spender,input.routers,input.spenders))
  return {phase:'BLOCKED',reason:'Swap router or quoted spender is not on the separately reviewed allowlist.',amountRaw};
 if(input.tx.from.toLowerCase()!==input.expectedAddress.toLowerCase()||input.tx.value!=='0')
  return {phase:'BLOCKED',reason:'Built swap sender or native value does not match the reviewed instruction.',amountRaw};
 if(input.now>=input.quoteExpiresAt||input.quoteExpiresAt-input.now>30000)
  return {phase:'BLOCKED',reason:'Quote is expired or not bound to a valid 30-second window.',amountRaw};
 const required=BigInt(amountRaw);
 if(input.funding.usdtBalance<required)
  return {phase:'BLOCKED',reason:'Insufficient BSC USDT; no wallet signing request may be issued.',amountRaw};
 if(!input.tx.gas||!/^\d{5,7}$/.test(input.tx.gas)||BigInt(input.tx.gas)>3000000n)
  return {phase:'BLOCKED',reason:'A bounded gas limit must be verified from the swap builder.',amountRaw};
 // 50% fee buffer. Approval is a separate transaction; reserve an additional 100k gas.
 const reserveGas=BigInt(input.tx.gas)+100000n;
 if(input.funding.gasPrice<=0n||input.funding.bnbBalance<reserveGas*input.funding.gasPrice*3n/2n)
  return {phase:'BLOCKED',reason:'Insufficient BNB for buffered swap and potential approval gas.',amountRaw};
 if(input.funding.allowance<required){
  // Do not attempt to overwrite a nonzero insufficient USDT allowance in one step.
  if(input.funding.allowance!==0n)return {phase:'BLOCKED',reason:'USDT allowance is nonzero but insufficient. Revoke/reset it in your wallet before a new exact approval.',amountRaw};
  return {phase:'APPROVAL_REQUIRED',reason:'Exact-size USDT approval needs a distinct wallet confirmation. It persists onchain until spent or revoked.',amountRaw};
 }
 if(!input.simulatedPass)
  return {phase:'BLOCKED',reason:'Fresh simulator did not predict a successful transaction. Nothing can be signed.',amountRaw};
 return {phase:'SWAP_READY',reason:'Fresh simulation and public funding checks passed. User must separately confirm the exact wallet transaction.',amountRaw};
}
