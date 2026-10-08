import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatAtomic,summarizeFunding} from './wallet-funding';

test('BSC USDT thresholds compare exact 18-decimal quantities, without rounding up',()=>{
 const threshold=25n*10n**18n;
 const sufficient=summarizeFunding(1n,threshold,threshold);
 assert.equal(sufficient.usdtBalance,'25.000000');
 assert.equal(sufficient.usdtCoversAmount,true);
 assert.equal(sufficient.bnbPresent,true);
 assert.equal(sufficient.gasAdequacyChecked,false);
 assert.equal(sufficient.allowanceChecked,false);
 assert.equal(sufficient.noTransactions,true);
 assert.equal(summarizeFunding(0n,threshold-1n,threshold).usdtCoversAmount,false);
 assert.equal(summarizeFunding(0n,threshold,threshold).bnbPresent,false);
});

test('unavailable gas sufficiency cannot be inferred from a nonzero dust balance',()=>{
 const dust=summarizeFunding(1n,10n**18n,10n**18n);
 assert.equal(dust.bnbBalance,'<0.00000001');
 assert.equal(dust.bnbPresent,true);
 assert.equal(dust.gasAdequacyChecked,false);
 assert.equal(formatAtomic(10n**18n+123456789000000n,18,6),'1.000123');
 assert.throws(()=>summarizeFunding(0n,0n,0n));
});
