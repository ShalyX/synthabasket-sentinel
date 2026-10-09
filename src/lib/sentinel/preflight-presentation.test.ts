import {test} from 'node:test';
import assert from 'node:assert/strict';
import {preflightHeadline,requiresFundingReadout} from './preflight-presentation';

test('simulation failure remains primary even after its quote expires',()=>{
 assert.equal(preflightHeadline({complete:false,blocked:true,expired:true}),'SIMULATION BLOCKED · NO TRADE SENT');
 assert.equal(preflightHeadline({complete:false,blocked:false,expired:true}),'QUOTE EXPIRED · NEW SIMULATION REQUIRED');
 assert.equal(preflightHeadline({complete:true,blocked:false,expired:false}),'ALL SELECTED LEGS SIMULATED · ZERO TRADES');
 assert.equal(preflightHeadline({complete:false,blocked:false,expired:false}),'AWAITING AN EXPLICIT SIMULATION');
});
test('wallet diagnostic follows explicit balance, gas or allowance problems, never success',()=>{
 assert.equal(requiresFundingReadout(false,'Insufficient ERC-20 token balance for this swap.'),true);
 assert.equal(requiresFundingReadout(false,'Insufficient BNB for gas.'),true);
 assert.equal(requiresFundingReadout(false,'Insufficient funds reported.'),true);
 assert.equal(requiresFundingReadout(false,'Unknown venue.'),false);
 assert.equal(requiresFundingReadout(false,'Token allowance missing.'),true);
 assert.equal(requiresFundingReadout(false,'Insufficient token allowance for the proposed swap.'),true);
 assert.equal(requiresFundingReadout(true,'Insufficient token allowance.'),false);
 assert.equal(requiresFundingReadout(true,'Insufficient token balance.'),false);
 assert.equal(requiresFundingReadout(false,null),false);
});
