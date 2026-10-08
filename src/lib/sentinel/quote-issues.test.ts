import {test} from 'node:test';
import assert from 'node:assert/strict';
import {needsOndoAddress,ONDO_PUBLIC_ADDRESS_REQUIRED,publicWalletAddressValid,quoteBusinessError} from './quote-issues';

test('Ondo RFQ request is blocked locally when public receiver is missing',()=>{
 assert.equal(needsOndoAddress('ondo',''),true);
 assert.equal(needsOndoAddress('ondo','   '),true);
 assert.equal(needsOndoAddress('bstock',''),false); // SWAP routes can quote wallet-free
 assert.equal(needsOndoAddress('ondo','0x'+'a'.repeat(40)),false);
 assert.match(ONDO_PUBLIC_ADDRESS_REQUIRED,/public BSC/);
 assert.match(ONDO_PUBLIC_ADDRESS_REQUIRED,/No transaction/);
});
test('only a syntactically valid public EVM wallet address is accepted',()=>{
 assert.equal(publicWalletAddressValid('0x'+'a'.repeat(40)),true);
 assert.equal(publicWalletAddressValid(' 0x'+'a'.repeat(40)+' '),true);
 assert.equal(publicWalletAddressValid('0x'+'g'.repeat(40)),false);
 assert.equal(publicWalletAddressValid('wallet'),false);
 assert.equal(publicWalletAddressValid(''),false);
 assert.equal(publicWalletAddressValid('0x'+'a'.repeat(40)+';approve'),false);
});
test('Binance 40001 is explained as parameter error without claiming a trading failure',()=>{
 assert.equal(quoteBusinessError(0,'ondo',false),null);
 assert.equal(quoteBusinessError(40304,'bstock',false),null);
 assert.match(quoteBusinessError(40001,'ondo',false)!,/public BSC/);
 assert.match(quoteBusinessError(40001,'bstock',false)!,/may require a public/);
 const withWallet=quoteBusinessError(40001,'ondo',true)!;
 assert.match(withWallet,/40001/);
 assert.match(withWallet,/route restrictions/);
 assert.doesNotMatch(withWallet,/trade executed|wallet authorized/);
});
