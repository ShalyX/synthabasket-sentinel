import {type CheckedEvmTransaction,validAddress, type Validation} from './execution-preflight';

/**
 * The Binance-aggregated tx.to is a Diamond-style outer router, NOT the
 * independently published LiquidMesh EVM router (which is an inner proxy).
 * The Binance outer swap facet, the inner implementation and opaque nested
 * route instructions lack trustworthy full ABI/source verification.
 * Auditors must add an ABI-specific decoder; never weaken this to matching
 * a four-byte selector or searching calldata for addresses.
 */
export interface BoundSwapFacts{
 inputToken:string;outputToken:string;sender:string;recipient:string;
 inputAmountRaw:string;minOutputRaw:string;deadline:number|null;
}
export const OBSERVED_BSC_LIQUIDMESH_ROUTER='0xb44446b0c8e56988c34f7ff73ae904982b5fdda5';
export const OBSERVED_BSC_SWAP_SELECTOR='0xad43f73d';
// Vendor-owned contract path, independently published at docs.liquidmesh.io/docs/smart-contracts.
// This is NOT the Binance aggregator tx.to; the first address is inside the
// Binance-built calldata and LiquidMesh's proxy dispatches to its own implementation.
export const OFFICIAL_LIQUIDMESH_BSC_ROUTER='0x3d90f66b534dd8482b181e24655a9e8265316be9';
export const OFFICIAL_LIQUIDMESH_DEFAULT_SPENDER='0x8157a9d65807521fbb8db8f37eeecefdd247e9b1';
/** This is an observed ABI-shaped envelope, NOT a verified contract ABI. */
export interface StructuralSwapEvidence{
 selector:string;inputToken:string;outputToken:string;inputAmountRaw:string;
 minimumOutputRaw:string;quotedOutputRaw:string;opaquePayloadBytes:number;
 innerRouterAddress:string;otherControlAddress:string;
 recipientProven:false;opaqueCallsVerified:false;permissionToSpend:false;
}
const decimal=(x:string)=>/^(0|[1-9][0-9]{0,77})$/.test(x);
const wordAddress=(w:string)=>/^0{24}[0-9a-f]{40}$/.test(w)?'0x'+w.slice(24):null;
/**
 * Enforces the ABI-shaped, 10-word envelope observed on the authenticated
 * 2026-10-09 Binance LiquidMesh route. We cannot call these observed offsets
 * an ABI certification or assume the nested 4,580-byte payload is safe.
 */
export function inspectObservedLiquidMeshCalldata(
 tx:CheckedEvmTransaction,expected:BoundSwapFacts
):Validation<StructuralSwapEvidence>{
 if(!validAddress(tx.to)||tx.to.toLowerCase()!==OBSERVED_BSC_LIQUIDMESH_ROUTER)
  return {ok:false,message:'Swap targets an unreviewed router address.'};
 if(!validAddress(tx.from)||tx.from.toLowerCase()!==expected.sender.toLowerCase()||tx.value!=='0')
  return {ok:false,message:'Swap sender or native spend is unexpected.'};
 const data=tx.data.toLowerCase();
 if(!/^0x[0-9a-f]+$/.test(data)||data.slice(0,10)!==OBSERVED_BSC_SWAP_SELECTOR||
   (data.length-10)%64!==0||data.length>40002)
  return {ok:false,message:'Invalid LiquidMesh selector or ABI alignment.'};
 const content=data.slice(10);
 if(content.length<64*11)return {ok:false,message:'LiquidMesh envelope is truncated.'};
 const words=Array.from({length:10},(_,i)=>content.slice(i*64,(i+1)*64));
 const inToken=wordAddress(words[3]),outToken=wordAddress(words[5]);
 if(inToken?.toLowerCase()!==expected.inputToken.toLowerCase()||
    outToken?.toLowerCase()!==expected.outputToken.toLowerCase())
  return {ok:false,message:'Swap input/output token bytes differ from the intent.'};
 if(!decimal(expected.inputAmountRaw)||!decimal(expected.minOutputRaw))
  return {ok:false,message:'Expected amounts must be canonical decimal integers.'};
 const amount=BigInt('0x'+words[4]),minOutput=BigInt('0x'+words[6]);
 const quoted=BigInt('0x'+words[8]);
 if(amount!==BigInt(expected.inputAmountRaw)||minOutput!==BigInt(expected.minOutputRaw)||
    !minOutput||quoted<minOutput)
  return {ok:false,message:'Swap input or minimum output amount changed inside calldata.'};
 if(BigInt('0x'+words[9])!==320n)
  return {ok:false,message:'Unexpected dynamic payload offset.'};
 const byteLength=BigInt('0x'+content.slice(640,704));
 if(byteLength===0n||byteLength>15000n)return {ok:false,message:'Opaque routing payload length is invalid.'};
 const dataStart=704;
 const padded=Number((byteLength+31n)/32n)*64;
 if(content.length!==dataStart+padded)
  return {ok:false,message:'Calldata length does not match its declared opaque payload.'};
 const controlA=wordAddress(words[2]),controlB=wordAddress(words[7]);
 if(!controlA||!controlB)return {ok:false,message:'Envelope contains malformed control addresses.'};
 if(controlA!==OFFICIAL_LIQUIDMESH_BSC_ROUTER)
  return {ok:false,message:'Binance-built calldata does not reference the official published LiquidMesh BSC router.'};
 return {ok:true,value:{
  selector:OBSERVED_BSC_SWAP_SELECTOR,inputToken:inToken,outputToken:outToken,
  inputAmountRaw:amount.toString(),minimumOutputRaw:minOutput.toString(),
  quotedOutputRaw:quoted.toString(),opaquePayloadBytes:Number(byteLength),
  innerRouterAddress:controlA,otherControlAddress:controlB,
  recipientProven:false,opaqueCallsVerified:false,permissionToSpend:false
 }};
}
export function verifyKnownRouterSemantics(tx:CheckedEvmTransaction,expected:BoundSwapFacts):Validation<true>{
 const envelope=inspectObservedLiquidMeshCalldata(tx,expected);
 if(!envelope.ok)return envelope;
 return {ok:false,message:'Observed LiquidMesh envelope matches, but recipient, delegated facet controls and nested routing targets lack verified ABI/source. Live approvals and swap signing remain locked.'};
}

export interface ProviderBuiltRouteAcceptance{
 trustModel:'AUTHENTICATED_BINANCE_BUILD';
 structuralEvidence:StructuralSwapEvidence;
 independentlyDecoded:false;
 userAcceptedProviderTrust:true;
}
/**
 * Explicit provider-trust boundary for live browser signing. This does not
 * pretend the opaque LiquidMesh payload has been independently decoded. The
 * caller must have obtained `tx` directly from the authenticated Binance swap
 * builder and must require a fresh user acknowledgement of that trust model.
 */
export function acceptAuthenticatedProviderBuild(
 tx:CheckedEvmTransaction,expected:BoundSwapFacts,
 controls:{authenticatedBinanceResponse:boolean;userAcceptedProviderTrust:boolean}
):Validation<ProviderBuiltRouteAcceptance>{
 if(!controls.authenticatedBinanceResponse)
  return {ok:false,message:'The swap was not obtained directly from the authenticated Binance transaction builder.'};
 if(!controls.userAcceptedProviderTrust)
  return {ok:false,message:'Explicit acceptance of the provider-built opaque route is required.'};
 const structural=inspectObservedLiquidMeshCalldata(tx,expected);
 if(!structural.ok)return structural;
 return {ok:true,value:{trustModel:'AUTHENTICATED_BINANCE_BUILD',structuralEvidence:structural.value,
  independentlyDecoded:false,userAcceptedProviderTrust:true}};
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
