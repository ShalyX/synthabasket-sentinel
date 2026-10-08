/**
 * Binance Web3 API business code 40001 means an invalid/missing request parameter.
 * RFQ quotes require a public receiving wallet; the observed Ondo quote also
 * required one, despite returning SWAP. No signing or approval is requested.
 */
export const ONDO_PUBLIC_ADDRESS_REQUIRED =
 'Ondo quotes in Sentinel require a public BSC receiving address. The previously rejected request returned a valid SWAP quote after the address was provided. Enter your public 0x address above. No transaction, wallet connection, signature, or trade is requested.';

export function needsOndoAddress(platform:'ondo'|'bstock', walletAddress:string):boolean {
 return platform==='ondo'&&!walletAddress.trim();
}

export function publicWalletAddressValid(value:string):boolean {
 return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function quoteBusinessError(code:number,platform:'ondo'|'bstock',walletProvided:boolean):string|null {
 if(code!==40001)return null;
 if(!walletProvided)return platform==='ondo' ? ONDO_PUBLIC_ADDRESS_REQUIRED : 'Binance rejected this quote (40001: parameter validation). RWA RFQ venues may require a public BSC receiving wallet address. Enter your public 0x address above and retry; no signing or trade is requested.';
 return 'Binance rejected one or more quote parameters (40001). This issuer/venue may have additional RFQ requirements or route restrictions. No usable quote was returned; try a different issuer or check Binance requirements.';
}
