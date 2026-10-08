import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatAtomic,summarizeFunding,estimateSwapGas} from './wallet-funding';

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

test('buffered built-swap estimate distinguishes gas present from gas sufficient',()=>{
 const gasPrice=100_000_000n; // 0.1 gwei; fixed test data, not claimed live
 const limit=300_000n;
 const actual=gasPrice*limit*3n/2n;
 const low=estimateSwapGas(actual-1n,gasPrice,limit);
 assert.equal(low.gasEstimateAvailable,true);
 assert.equal(low.estimatedSwapGasBnb,'0.00004500');
 assert.equal(low.bnbCoversBufferedSwapEstimate,false);
 assert.equal(estimateSwapGas(actual,gasPrice,limit).bnbCoversBufferedSwapEstimate,true);
 assert.equal(estimateSwapGas(1n,null,limit).gasEstimateAvailable,false);
 assert.equal(estimateSwapGas(1n,gasPrice,null).bnbCoversBufferedSwapEstimate,null);
 assert.throws(()=>estimateSwapGas(1n,gasPrice,100n));
});
