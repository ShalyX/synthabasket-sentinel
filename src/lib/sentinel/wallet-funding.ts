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
