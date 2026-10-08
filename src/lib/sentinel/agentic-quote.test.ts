import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseAgenticQuote,compareAgenticQuote,BSC_USDT_ADDRESS,AGENTIC_QUOTE_KIND} from './agentic-quote';
import type {Equity,QuotePreview} from './model';

const now=Date.parse('2026-10-08T14:00:00.000Z');
const target='0x02fca66c1d1afb4e2a7884261eb00f63598a7436';
const report={
 kind:AGENTIC_QUOTE_KIND,version:1 as const,scope:'local-user-supplied-quote' as const,
 observedAt:new Date(now-10000).toISOString(),chainId:'56' as const,
 fromToken:BSC_USDT_ADDRESS,targetToken:target,ticker:'NVDA',platform:'bstock' as const,
 tokenSymbol:'NVDAB',amountUsd:10,outputTokenAmount:'0.042400000000000001',
 permissions:{mayTrade:false as const,maySign:false as const,mayApprove:false as const}
};
const token:Equity={
 ticker:'NVDA',platform:'bstock',symbol:'NVDAB',address:target,company:'NVIDIA',
 logoUrl:null,decimals:18,tokenPrice:null,referencePrice:null,tokenToShareRatio:1,basisPct:null,
 tradingAvailable:true,marketSession:null
};
const venue:QuotePreview={
 ticker:'NVDA',platform:'bstock',address:target,amountUsd:10,tokenAmount:0.0425,
 mode:'SWAP',vendor:'LiquidMesh',priceImpactPct:0,reportedFee:null,
 checkedAt:new Date(now-4000).toISOString(),review:{status:'review',reasons:[]}
};
test('sanitized handoff permits only exact read-only fields',()=>{
 const parsed=parseAgenticQuote(report);
 assert.equal(parsed.ok,true);
 if(!parsed.ok)return;
 assert.deepEqual(parsed.value,report);
 for(const malicious of [
  {...report,quoteId:'a-should-not-appear'},
  {...report,walletAddress:'0xprivate'},
  {...report,permissions:{...report.permissions,mayTrade:true}},
  {...report,permissions:{...report.permissions,signature:'hello'}},
  {...report,outputTokenAmount:'NaN'},
  {...report,outputTokenAmount:'1e+20'},
  {...report,chainId:'1'},
  {...report,fromToken:target},
  {...report,targetToken:target.toUpperCase()},
  {...report,amountUsd:100},
  {...report,scope:'wallet-authorized'},
  {...report,observedAt:'not-a-date'}
 ])assert.equal(parseAgenticQuote(malicious).ok,false);
});
test('a local observation compares only the exact live issuer contract and amount',()=>{
 const parsed=parseAgenticQuote(report);
 assert.equal(parsed.ok,true);if(!parsed.ok)return;
 const c=compareAgenticQuote(parsed.value,token,venue,now);
 assert.equal(c.state,'ready');
 assert.ok(c.deltaPct!==null && c.deltaPct<0);
 assert.equal(compareAgenticQuote(parsed.value,{...token,address:'0x'+'a'.repeat(40)},venue,now).state,'invalid-instrument');
 assert.equal(compareAgenticQuote(parsed.value,token,{...venue,amountUsd:9},now).state,'invalid-instrument');
 assert.equal(compareAgenticQuote(parsed.value,token,undefined,now).state,'venue-missing');
});
test('expired or future observations never count as matching live quotes',()=>{
 const parsed=parseAgenticQuote(report);
 assert.equal(parsed.ok,true);if(!parsed.ok)return;
 assert.equal(compareAgenticQuote(parsed.value,token,venue,now+121000).state,'stale-local');
 assert.equal(compareAgenticQuote(parsed.value,token,venue,now-11000).state,'stale-local');
 assert.equal(compareAgenticQuote(parsed.value,token,{...venue,checkedAt:new Date(now-40000).toISOString()},now).state,'venue-expired');
});
