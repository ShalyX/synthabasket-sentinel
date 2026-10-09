import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessIssuerTradingEligibility} from './issuer-eligibility';

test('bStocks never infers legal availability from market trading state, wallet or deployment region',()=>{
 const result=assessIssuerTradingEligibility('bstock');
 assert.equal(result.canTrade,false);
 assert.equal(result.state,'NOT_VERIFIED');
 assert.equal(result.source,'NO_VERIFIED_ISSUER_ENTITLEMENT');
});
test('Ondo tokenized securities are not implicitly cleared just because bStocks is gated',()=>{
 assert.equal(assessIssuerTradingEligibility('ondo').canTrade,false);
});
