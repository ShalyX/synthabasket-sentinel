/** Connection rules are deliberately read-only; wallet signing is a separate milestone. */
export const BSC_CHAIN_HEX='0x38';
export function parseChainId(value:unknown):number|null{
 if(typeof value!=='string'||!/^0x[0-9a-f]{1,8}$/i.test(value))return null;
 const id=Number.parseInt(value,16);
 return Number.isSafeInteger(id)&&id>0?id:null;
}
export function parseAccount(value:unknown):string|null{
 if(!Array.isArray(value)||value.length===0)return null;
 const first=value[0];
 return typeof first==='string'&&/^0x[0-9a-f]{40}$/i.test(first)&&!/^0x0{40}$/i.test(first)?first:null;
}
export function safeWalletLabel(value:unknown):string{
 return typeof value==='string'&&value.trim().length>0?value.trim().slice(0,44):'Browser wallet';
}
export function shortAddress(value:string):string{
 return value.slice(0,6)+'…'+value.slice(-4);
}
export function walletKey(address:string|null,chainId:number|null,revision:number):string{
 return [address?.toLowerCase()??'disconnected',chainId??'unknown',revision].join(':');
}
