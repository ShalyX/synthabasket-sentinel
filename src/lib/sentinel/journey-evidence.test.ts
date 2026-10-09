import {test} from 'node:test';
import assert from 'node:assert/strict';
import {basketEvidenceKey,journeyProofLabel,trustedJourneyProof,type JourneyProof} from './journey-evidence';
import type {BasketLeg} from './basket';

const wallet='0x1111111111111111111111111111111111111111';
const otherWallet='0x2222222222222222222222222222222222222222';
const basket:BasketLeg[]=[{ticker:'NVDA',platform:'bstock',weight:60},{ticker:'AMD',platform:'ondo',weight:40}];
const now=Date.parse('2026-10-09T13:00:00Z');
const evidence:JourneyProof={
 kind:'SIMULATION',state:'SIMULATOR_BLOCKED',walletAddress:wallet,
 basketKey:basketEvidenceKey(basket),recordedAt:new Date(now-4_000).toISOString(),
 summary:'NVDAB: FAILED / balance short',source:'Binance Web3 simulator',
 observedLegs:1,totalLegs:2
};
test('session evidence binds the wallet, exact issuers and allocation',()=>{
 assert.equal(trustedJourneyProof(evidence,wallet,basket,now),true);
 assert.equal(trustedJourneyProof(evidence,otherWallet,basket,now),false);
 assert.equal(trustedJourneyProof(evidence,null,basket,now),false);
 assert.equal(trustedJourneyProof(evidence,wallet,[{...basket[0],weight:50},{...basket[1],weight:50}],now),false);
 assert.equal(trustedJourneyProof(evidence,wallet,[{...basket[0],platform:'ondo'},basket[1]],now),false);
});
test('old, future and malformed evidence cannot be displayed as an active session proof',()=>{
 assert.equal(trustedJourneyProof({...evidence,recordedAt:new Date(now-15*60_000).toISOString()},wallet,basket,now),false);
 assert.equal(trustedJourneyProof({...evidence,recordedAt:new Date(now+80_000).toISOString()},wallet,basket,now),false);
 assert.equal(trustedJourneyProof({...evidence,observedLegs:3},wallet,basket,now),false);
 assert.equal(trustedJourneyProof({...evidence,summary:'x'.repeat(300)},wallet,basket,now),false);
 assert.equal(trustedJourneyProof({...evidence,kind:'SIMULATION',state:'PORTFOLIO_EMPTY'},wallet,basket,now),false);
});
test('a simulator prediction is never described as a confirmed purchase',()=>{
 assert.match(journeyProofLabel(evidence,now).title,/Simulator blocked/);
 assert.match(journeyProofLabel({...evidence,state:'SIMULATOR_PASSED'},now).caveat,/not a real transaction/);
});
