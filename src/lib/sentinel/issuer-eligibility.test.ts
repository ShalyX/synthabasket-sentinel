import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessIssuerTradingEligibility} from './issuer-eligibility';

test('bStocks never infers legal availability from market trading state, wallet or deployment region',()=>{
 const result=assessIssuerTradingEligibility('bstock');
 assert.equal(result.canTrade,false);
 assert.equal(result.state,'NOT_ATTESTED');
 assert.equal(result.source,'NO_USER_ATTESTATION');
});
test('Ondo tokenized securities are not implicitly cleared just because bStocks is gated',()=>{
 assert.equal(assessIssuerTradingEligibility('ondo').canTrade,false);
});
test('explicit user eligibility remains labelled as attestation, not provider verification',()=>{
 const result=assessIssuerTradingEligibility('bstock',true);
 assert.equal(result.canTrade,true);
 assert.equal(result.state,'USER_ATTESTED');
 assert.equal(result.source,'EXPLICIT_USER_ATTESTATION');
 assert.match(result.reason,/not independently verified/i);
});
