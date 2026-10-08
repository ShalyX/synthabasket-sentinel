/** Pure, read-only BSC wallet funding summary. This never authorizes execution. */
export function formatAtomic(raw:bigint,decimals:number,digits:number):string{
 if(raw<0n||decimals<0||digits<0||digits>decimals)throw Error('Invalid balance units.');
 const base=10n**BigInt(decimals);
 const whole=raw/base;
 const fraction=(raw%base).toString().padStart(decimals,'0').slice(0,digits);
 return whole.toString()+(digits?'.'+fraction:'');
}
export function summarizeFunding(bnb:bigint,usdt:bigint,requiredUsdt:bigint){
 if(requiredUsdt<=0n)throw Error('A positive quote budget is required.');
 return {
  bnbBalance:bnb>0n&&bnb<10n**10n?'<0.00000001':formatAtomic(bnb,18,8),
  usdtBalance:formatAtomic(usdt,18,6),
  bnbPresent:bnb>0n,
  usdtCoversAmount:usdt>=requiredUsdt,
  allowanceChecked:false as const,
  gasAdequacyChecked:false as const,
  noTransactions:true as const
 };
}

/** Informational, read-only estimate for a *built* BSC transaction.
 * Includes a 50% buffer above current gasPrice x transaction gasLimit;
 * doesn't cover additional approval transactions, gas repricing or other basket legs.
 */
export function estimateSwapGas(bnb:bigint,gasPrice:bigint|null,gasLimit:bigint|null){
 if(gasPrice===null||gasPrice<=0n||gasLimit===null)
  return {gasPriceGwei:gasPrice!==null&&gasPrice>0n?formatAtomic(gasPrice,9,4):null,
   estimatedSwapGasBnb:null,bnbCoversBufferedSwapEstimate:null,gasEstimateAvailable:false} as const;
 if(gasLimit<21000n||gasLimit>3000000n)throw Error('Swap gas limit outside review range.');
 const estimatedWei=(gasPrice*gasLimit*3n+1n)/2n;
 return {
  gasPriceGwei:formatAtomic(gasPrice,9,4),
  estimatedSwapGasBnb:formatAtomic(estimatedWei,18,8),
  bnbCoversBufferedSwapEstimate:bnb>=estimatedWei,
  gasEstimateAvailable:true as const
 };
}
