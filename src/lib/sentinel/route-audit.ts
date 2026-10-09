import {type CheckedEvmTransaction,validAddress, type Validation} from './execution-preflight';

/**
 * Until a real Binance LiquidMesh tx.to is verified on BSC and its ABI is
 * independently decoded, no generic selector/address allowlist can certify a trade.
 * Auditors must add an ABI-specific decoder; never weaken this to matching
 * a four-byte selector or searching calldata for addresses.
 */
export interface BoundSwapFacts{
 inputToken:string;outputToken:string;sender:string;recipient:string;
 inputAmountRaw:string;minOutputRaw:string;deadline:number|null;
}
export function verifyKnownRouterSemantics(_tx:CheckedEvmTransaction,_expected:BoundSwapFacts):Validation<true>{
 return {ok:false,message:'No independently decoded and audited LiquidMesh BSC router ABI is installed. Live swap and token approval are locked.'};
}

export function inspectBuildMinimum(
 raw:unknown,quotedOutputRaw:string,slippageBps=50
):Validation<{minReceiveRaw:string}>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {ok:false,message:'Missing swap builder metadata.'};
 const tx=(raw as {tx?:unknown}).tx;
 if(!tx||typeof tx!=='object'||Array.isArray(tx))return {ok:false,message:'Missing swap transaction.'};
 const fields=tx as Record<string,unknown>;
 if(!/^(0|[1-9]\d{0,78})$/.test(String(fields.minReceiveAmount??''))||
    !/^[1-9]\d{0,78}$/.test(quotedOutputRaw))
  return {ok:false,message:'Swap minimum-receive amount or quote is absent or malformed.'};
 const received=BigInt(String(fields.minReceiveAmount)),quoted=BigInt(quotedOutputRaw);
 if(received===0n||received>quoted||
    received<(quoted*BigInt(10000-slippageBps)/10000n))
  return {ok:false,message:'Builder minimum received is outside the quoted 0.5% slippage window.'};
 if(Number(fields.slippagePercent)!==slippageBps/100||
    typeof fields.slippagePercent!=='string')
  return {ok:false,message:'Builder returned different or unverified slippage tolerance.'};
 return {ok:true,value:{minReceiveRaw:received.toString()}};
}

export function verifyReceiptTransferLog(input:{
 tokenContract:string;account:string;logs:unknown;blockHash:string;
}):Validation<{receivedRaw:string;sentRaw:string}>{
 if(!validAddress(input.tokenContract)||!validAddress(input.account)||!/^0x[0-9a-f]{64}$/i.test(input.blockHash))
  return {ok:false,message:'Receipt token, owner or block hash invalid.'};
 if(!Array.isArray(input.logs)||input.logs.length>500)
  return {ok:false,message:'Receipt logs missing or unbounded.'};
 const topic='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
 const padded='0x'+input.account.slice(2).toLowerCase().padStart(64,'0');
 let received=0n,sent=0n;
 for(const entry of input.logs){
  if(!entry||typeof entry!=='object'||Array.isArray(entry))continue;
  const x=entry as Record<string,unknown>;
  if(typeof x.address!=='string'||x.address.toLowerCase()!==input.tokenContract.toLowerCase()||
     !Array.isArray(x.topics)||x.topics.length!==3||String(x.topics[0]).toLowerCase()!==topic||
     x.blockHash!==input.blockHash||
     typeof x.data!=='string'||!/^0x[0-9a-f]{64}$/i.test(x.data))continue;
  const value=BigInt(x.data);
  if(String(x.topics[2]).toLowerCase()===padded)received+=value;
  if(String(x.topics[1]).toLowerCase()===padded)sent+=value;
 }
 return {ok:true,value:{receivedRaw:received.toString(),sentRaw:sent.toString()}};
}
