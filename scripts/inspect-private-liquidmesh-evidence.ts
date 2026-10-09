/**
 * Offline structural check for locally held, expired Binance unsigned calldata.
 * Usage: npx tsx scripts/inspect-private-liquidmesh-evidence.ts <local-json-path>
 * Never copies calldata to stdout, source control or a signer.
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectObservedLiquidMeshCalldata,verifyKnownRouterSemantics} from '../src/lib/sentinel/route-audit';

const filename=process.argv[2];
if(!filename)throw new Error('Specify path to PRIVATE unsigned build evidence.');
const evidence:unknown=JSON.parse(readFileSync(filename,'utf8').replace(/^\uFEFF/,''));
if(!evidence||typeof evidence!=='object')throw Error('Invalid evidence');
const {built,quote}=evidence as {built?:Record<string,unknown>;quote?:Record<string,unknown>};
if(!built||!quote)throw Error('Missing authenticated fields');
for(const field of ['from','to','calldata','minReceiveAmount']){
 if(typeof built[field]!=='string')throw Error('Missing build '+field);
}
for(const field of ['fromTokenAddress','toTokenAddress','fromAmountRaw']){
 if(typeof quote[field]!=='string')throw Error('Missing quote '+field);
}
const tx={from:String(built.from),to:String(built.to),data:String(built.calldata),value:'0' as const,gas:String(built.gas)};
const expected={sender:tx.from,recipient:tx.from,inputToken:String(quote.fromTokenAddress),
 outputToken:String(quote.toTokenAddress),inputAmountRaw:String(quote.fromAmountRaw),
 minOutputRaw:String(built.minReceiveAmount),deadline:null};
const checked=inspectObservedLiquidMeshCalldata(tx,expected);
const stillBlocked=verifyKnownRouterSemantics(tx,expected);
const observedHash=createHash('sha256').update(Buffer.from(tx.data.slice(2),'hex')).digest('hex');
console.log(JSON.stringify({kind:'sentinel.bsc.offline-calldata-inspection',
 selector:tx.data.slice(0,10),sha256MatchesRecorded:observedHash===built.dataSha256,
 structural:checked.ok?{state:'MATCHED_OBSERVED_ENVELOPE',input:checked.value.inputToken,
 output:checked.value.outputToken,amountRaw:checked.value.inputAmountRaw,
 minimumRaw:checked.value.minimumOutputRaw,quotedOutputRaw:checked.value.quotedOutputRaw,
 opaqueBytes:checked.value.opaquePayloadBytes,
 innerRouterAddress:checked.value.innerRouterAddress,
 recipientProven:checked.value.recipientProven,opaqueCallsVerified:checked.value.opaqueCallsVerified
 }:{state:'INVALID',reason:checked.message},
 executable:stillBlocked.ok,releaseGate:'DENY'},null,2));
if(!checked.ok||stillBlocked.ok)process.exitCode=2;
