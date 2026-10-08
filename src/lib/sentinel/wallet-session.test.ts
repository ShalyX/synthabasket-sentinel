import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseAccount,parseChainId,safeWalletLabel,shortAddress,walletKey} from './wallet-session';

const a='0x'+'a'.repeat(40);
test('wallet connection requires a valid nonzero account and properly encoded chain',()=>{
 assert.equal(parseAccount([a]),a);
 for(const bad of [[],['0x'+'0'.repeat(40)],['bad'],[123],null,{}])
  assert.equal(parseAccount(bad),null);
 assert.equal(parseChainId('0x38'),56);
 assert.equal(parseChainId('0X38'),56);
 assert.equal(parseChainId('0x1'),1);
 for(const bad of ['56','0x0','0xzz',undefined,'0x11111111111'])
  assert.equal(parseChainId(bad),null);
});
test('session identity binds account, chain and revision without keys',()=>{
 assert.notEqual(walletKey(a,56,1),walletKey(a,1,1));
 assert.notEqual(walletKey(a,56,1),walletKey(a,56,2));
 assert.notEqual(walletKey(a,56,1),walletKey('0x'+'b'.repeat(40),56,1));
 assert.equal(shortAddress(a),'0xaaaa…aaaa');
 assert.ok(safeWalletLabel('a'.repeat(500)).length<=44);
});
