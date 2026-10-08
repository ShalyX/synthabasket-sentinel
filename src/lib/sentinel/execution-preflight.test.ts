import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
 parseSimulationIntent,rawUsdtAmount,selectRouteForSimulation,checkSwapBuild,
 assessSimulation,eligibleToSimulate
} from './execution-preflight';
import type {Equity} from './model';
const WALLET='0x'+'1'.repeat(40);
const TO='0x'+'2'.repeat(40);
const USDT='0x55d398326f99059ff775485246999027b3197955';
const ROUTER='0x'+'3'.repeat(40);
const intent={ticker:'NVDA',platform:'bstock' as const,amountUsd:10,walletAddress:WALLET};
const validQuote={quoteId:'quote-hash-no-key',vendorName:'LiquidMesh',executionMode:'SWAP',
 fromTokenAmount:'10000000000000000000',toTokenAmount:'42601000000000000',priceImpactPercent:'0.01'};
const RAW_OUTPUT='42601000000000000';
const built={executionMode:'SWAP',tx:{from:WALLET,to:ROUTER,value:'0',
 data:'0x12345678000000000000',gas:'230000'},
 routerResult:{binanceChainId:'56',vendorName:'LiquidMesh',fromTokenAmount:'10000000000000000000',toTokenAmount:RAW_OUTPUT,
 fromToken:{tokenContractAddress:USDT},toToken:{tokenContractAddress:TO}}};
const token:Equity={ticker:'NVDA',platform:'bstock',symbol:'NVDAB',address:TO,company:'NVIDIA',
 decimals:18,logoUrl:null,tokenPrice:237,referencePrice:236,tokenToShareRatio:1.0007,
 basisPct:0.35,tradingAvailable:true,marketSession:'regular'};

test('strict public wallet, fixed ticker/issuer and capped BSC USDT inputs',()=>{
 assert.equal(parseSimulationIntent(intent).ok,true);
 for(const invalid of [
  {...intent,walletAddress:'private'},
  {...intent,walletAddress:USDT,privateKey:'secret'},
  {...intent,walletAddress:'0x'+'0'.repeat(40)},
  {...intent,platform:'presale'},
  {...intent,ticker:'nvda'},
  {...intent,amountUsd:100},
  {...intent,amountUsd:10.001},
  {...intent,amountUsd:0},
  {...intent,amountUsd:-10},
  {...intent,amountUsd:Infinity},
  {...intent,amountUsd:'10'},
  {...intent,binanceChainId:'1'},
  {}
 ])assert.equal(parseSimulationIntent(invalid).ok,false,JSON.stringify(invalid));
 assert.equal(rawUsdtAmount(10),'10000000000000000000');
 assert.equal(rawUsdtAmount(1.01),'1010000000000000000');
 assert.throws(()=>rawUsdtAmount(25.01));
});

test('route selection allows only quote-bound LiquidMesh SWAP, never RFQ or unexpected spend',()=>{
 const selected=selectRouteForSimulation([validQuote],'10000000000000000000');
 assert.equal(selected.ok,true);
 if(selected.ok)assert.equal(selected.value.executionMode,'SWAP');
 for(const invalid of [
  [{...validQuote,executionMode:'RFQ'}],
  [{...validQuote,vendorName:'UnknownRouter'}],
  [{...validQuote,fromTokenAmount:'999'}],
  [{...validQuote,priceImpactPercent:3}],
  [{...validQuote,priceImpactPercent:null}],
  [{...validQuote,toTokenAmount:'0'}],
  [{...validQuote,quoteId:''}],
  []
 ]) assert.equal(selectRouteForSimulation(invalid,'10000000000000000000').ok,false);
 assert.equal(selectRouteForSimulation({},'10000000000000000000').ok,false);
});

test('validates sender and canonical token contract before accepting unsigned swap calldata',()=>{
 const result=checkSwapBuild(built,intent,'10000000000000000000',RAW_OUTPUT,TO,USDT);
 assert.equal(result.ok,true);
 if(result.ok){
  assert.equal(result.value.from,WALLET);
  assert.equal(result.value.to,ROUTER);
  assert.equal(result.value.value,'0');
 }
});

test('rejects native BNB, ERC20 approvals, arbitrary targets or mismatched route contracts',()=>{
 for(const item of [
  {...built,executionMode:'RFQ'},
  {...built,rfq:{typedDataToSign:'0x1901'}},
  {...built,tx:{...built.tx,from:TO}},
  {...built,tx:{...built.tx,to:WALLET}},
  {...built,tx:{...built.tx,to:'0x'+'0'.repeat(40)}},
  {...built,tx:{...built.tx,data:'0x095ea7b3'+('00'.repeat(64))}},
  {...built,tx:{...built.tx,data:'0xnothex'}},
  {...built,tx:{...built.tx,value:'1'}},
  {...built,tx:{...built.tx,gas:'3000001'}},
  {...built,routerResult:{...built.routerResult,toToken:{tokenContractAddress:ROUTER}}},
  {...built,routerResult:{...built.routerResult,fromTokenAmount:'999'}},
  {...built,routerResult:{...built.routerResult,toTokenAmount:'999'}},
  {...built,routerResult:{...built.routerResult,binanceChainId:'1'}},
  {...built,routerResult:{...built.routerResult,vendorName:'Other'}}
 ])assert.equal(checkSwapBuild(item,intent,'10000000000000000000',RAW_OUTPUT,TO,USDT).ok,false);
});

test('simulation PASS only for actual SUCCESS without revert or allowance increase',()=>{
 const sample={status:'SUCCESS',balanceChanges:[
  {owner:WALLET,contractAddress:USDT,change:'-10000000000000000000'},
  {owner:WALLET,contractAddress:TO,change:'40000000000000000'}
 ],allowanceChanges:[{preAmount:'20000000000000000000',postAmount:'10000000000000000000'}]};
 const good=assessSimulation(sample);
 assert.equal(good.status,'PASS');
 assert.equal(good.balanceChangeCount,2);
 assert.equal(good.allowanceChangeCount,1);
 assert.equal(good.reason,null);
 const insufficient=assessSimulation({...sample,status:'FAILED',failReason:'ERC20InsufficientAllowance'});
 assert.equal(insufficient.status,'BLOCKED');
 assert.equal(insufficient.reason,'Insufficient token allowance for the proposed swap.');
 const badBalance=assessSimulation({...sample,status:'FAILED',failReason:'ERC20InsufficientBalance'});
 assert.equal(badBalance.status,'BLOCKED');
 assert.equal(badBalance.reason,'Insufficient ERC-20 token balance for this swap. Check the BSC USDT balance.');
 const missingGas=assessSimulation({...sample,status:'FAILED',failReason:'insufficient funds for gas * price + value'});
 assert.match(missingGas.reason||'',/BNB for gas/);
 const ambiguous=assessSimulation({...sample,status:'FAILED',failReason:'insufficient balance'});
 assert.match(ambiguous.reason||'',/check BSC USDT and BNB/);
 const weird=assessSimulation({...sample,status:'SUCCESS',failReason:'execution reverted: undocumented'});
 assert.equal(weird.status,'BLOCKED');
 const approval=assessSimulation({...sample,allowanceChanges:[{preAmount:'0',postAmount:'10000000'}]});
 assert.equal(approval.status,'BLOCKED');
 assert.equal(approval.unexpectedApprovalIncrease,true);
 assert.equal(assessSimulation({...sample,allowanceChanges:[{preAmount:'missing',postAmount:'500'}]}).status,'UNKNOWN');
 assert.equal(assessSimulation(null).status,'UNKNOWN');
});

test('issuer availability, ratio-adjusted basis and strict contract address gate simulation',()=>{
 assert.equal(eligibleToSimulate(token).ok,true);
 assert.equal(eligibleToSimulate({...token,tradingAvailable:null}).ok,false);
 assert.equal(eligibleToSimulate({...token,basisPct:null}).ok,false);
 assert.equal(eligibleToSimulate({...token,basisPct:2.6}).ok,false);
 assert.equal(eligibleToSimulate({...token,address:'bad'}).ok,false);
});
