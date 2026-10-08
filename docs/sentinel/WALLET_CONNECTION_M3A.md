# M3A — Connected wallet-bound simulation, with guest research preserved

## Implemented
- EIP-6963 wallet discovery with legacy injected EIP-1193 fallback. Selecting an extension asks only for account connection (eth_requestAccounts).
- A shared connection indicator in Sentinel's header and a second connection control in Simulation Lab. Connection is optional across markets, baskets and research.
- Simulator and funding diagnostic use **only the current connected wallet account**, never an arbitrary typed public address. Chain must be BSC mainnet (56). Changing network is an explicitly clicked switch request.
- Account/network changes, local disconnect, and changes to basket weights/legs/issuers or simulation budget invalidate stored results immediately. In-flight requests are aborted and their responses discarded. Results are scoped to the wallet session, never reused for a different account.
- All simulation quotes retain their short-lived expiry; expiration leaves archived evidence but no valid pass state.
- Connection state and public address are in memory only. No private key, seed phrase, wallet session token, signature, or stored automatic spending permission.
- Local disconnect removes Sentinel's access to the current provider *within this tab*. It does not revoke wallet site permissions; users revoke those separately inside the wallet.

## Test in an actual wallet-enabled browser
1. Navigate as a guest through Market Index and Basket Studio. They must work without a wallet.
2. Open Simulation Lab. The build/simulate action must be disabled with a clear connected-wallet requirement.
3. Click Connect wallet (header or lab), choose the intended EIP-6963 wallet if multiple are installed, and explicitly authorize account access in the extension.
4. On chain 1 or another wrong network, both simulator and funding check remain disabled. Click Switch to BSC mainnet (chain 56) and approve the network switch in the wallet.
5. Confirm active public address is shown in the page, run read-only funding and simulation. Quote-build-simulate requests must be tied to that address, not a manually entered address.
6. While a simulation is in flight, switch accounts or chain in the extension. Old results must disappear, pending requests must be cancelled, and the action stays disabled when on another network.
7. After a quote expires, old predicted pass must not remain an eligible PASS.
8. Disconnect locally and confirm results disappear; guest pages remain accessible. No wallet transaction approval, signature or broadcast should appear.

## Out of scope / separate safety gates
- The account balance will not change from connecting. Simulation may return FAILED for insufficient BSC USDT, insufficient BNB, or unapproved ERC-20 spending.
- This milestone does not verify any provider-specific swap spender, send ERC-20 approvals, execute trades, sign messages, or authorize delegated execution.
- Future live execution requires fresh quote, spender verification, chain/account invariants, explicit per-transaction wallet approvals, receipts and partial-basket handling.

## References
- https://eips.ethereum.org/EIPS/eip-1193
- https://eips.ethereum.org/EIPS/eip-6963
