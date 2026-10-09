# SynthaBasket Sentinel — authenticated LiquidMesh route evidence
Date: 2026-10-09. **Read-only evidence collected. M4 live execution remains NO GO.**

## Authenticated acquisition
Used the existing authorized Binance Web3 API configuration of Sentinel's Singapore (sin1) Vercel project in a **staged production-environment build with `--skip-domain`**. The main production alias was independently checked and not switched. A temporary audit-only API route was protected by a fresh random 256-bit header secret; only the digest, never the token or Binance credentials, appeared in its temporary source. It accepted a fixed public wallet and exactly **1 USDT → NVDA/bStocks**. Signed server-side GET calls to Binance `/aggregator/quote`, `/aggregator/swap`, and `/aggregator/approve-transaction` returned the observations below. No wallet signature, token approval or transaction broadcast occurred.

Capture: **2026-10-09T01:31:31.683Z**. Quote IDs intentionally omitted from evidence. Raw calldata is preserved privately in the operator's OS temporary directory and never checked into Git.

| Property | Authenticated observation |
|---|---|
| Chain | BNB Smart Chain, chain ID 56 |
| Vendor / mode | LiquidMesh / SWAP |
| Input | BSC USDT `0x55d398326f99059ff775485246999027b3197955` |
| Output | NVDAB `0x02fca66c1d1afb4e2a7884261eb00f63598a7436` |
| Input smallest units | `1000000000000000000` (1 USDT) |
| Quoted output | `4314214963304424` token units |
| Builder minimum received | `4292643888487901` token units |
| Slippage tolerance | `0.5` percent; builder minimum equals floor(quoted × 0.995) |
| Quote impact | `0.0007016075` percent as reported by provider |
| Actual `tx.to` | `0xb44446b0c8e56988c34f7ff73ae904982b5fdda5` |
| Actual quote `approveTarget` | `0xb44446b0c8e56988c34f7ff73ae904982b5fdda5` (**same as tx.to**) |
| Independently requested Binance ERC-20 approval instruction | spender `0xb44446b0c8e56988c34f7ff73ae904982b5fdda5`, ERC-20 selector `0x095ea7b3`, exact amount `1000000000000000000`; **not submitted** |
| Built swap selector | `0xad43f73d` |
| Built swap data length | `4964` bytes |
| Built gas limit | `250000` |
| SHA-256 of entire unsigned calldata | `1d56f4a9416fd0476580ed290a474296f2000f8e8d311bae311770629bb177a2` |
| Builder `signatureData` | `null` |
| Execution | **None** |

The route's provider metadata lists multiple intermediary tokens (USDT → WBNB → other intermediates → NVDAB); this is **NOT** a proof of safe execution or an endorsed venue. A separate earlier production simulation returned `approvalTarget=null` for a similarly small quote, demonstrating that the spender must be verified afresh on every route and must never be guessed.

## Independent BSC onchain verification

Public BSC RPC providers `https://bsc-dataseed.bnbchain.org` and `https://bsc.publicnode.com` agreed on:

- Router code size **180 bytes**, SHA-256 **`678b647bfc7b65b4036969469d160aa275ee2b9bef20c30e124ae1c2519648f1`**.
- Router EIP-1967 implementation and beacon storage slots both zero. This is **not** evidence of immutability: the runtime uses its own selector-to-implementation storage lookup.
- Runtime dispatch key for selector `0xad43f73d` is stored at **`0x7ddc1c45a5ae31800e181de98e8cb97525e9b89f99e5829d49f25a8ca4bac1d7`**, derived from `keccak256(bytes4(0xad43f73d) padded right to 32 bytes ++ 0x5e12654f390e4153c4f63b3dfcc122cf7876a5cdfb496dccf7284c10517a35c5)`.
- Onchain lookup yields current facet **`0xa9fa1b56f4d7bd25375c2d40b4c8e36a9509e603`** (its packed storage word contains additional non-address data). Facet runtime is **8,622 bytes**, SHA-256 **`924e9da536e78a9ce92f633058a62907ee5834738947432d186e02b212a0d574`**, and contains the selector.
- The router/facet are not verified through Sourcify at the time of this check, and public 4byte.directory returned **no identified function signature** for `0xad43f73d`. This does **not** establish that the contracts are malicious; it means we have not verified exact source-level semantics or upgrade authority.

These are SHA-256 of raw code bytes, **not Ethereum Keccak/EVM EXTCODEHASH**. Facet pointer and code hashes must be rechecked immediately before any future execution, because the selector mapping may change.

## Structural calldata inspection — NOT an ABI security certification

For the captured `0xad43f73d` data, the following 32-byte top-level words appeared where expected:

- Word 3: input token USDT.
- Word 4: exact `1000000000000000000` input amount.
- Word 5: NVDAB contract.
- Word 6: `4292643888487901` minimum received.
- Word 8: `4314214963304424` quoted output.
- Word 9: dynamic payload offset `0x140` (320 bytes).
- Word 10: dynamic payload length `0x11e4` (4,580 bytes).

The full calldata is 4,964 bytes and contains opaque nested routing payloads. **The owner's wallet address does not appear literally in the calldata; recipient semantics could be based on `msg.sender` or nested arguments and are not established.** Other top-level addresses and control words remain uninterpreted. It would be dangerous to reclassify these apparent fields as verified ABI arguments without source or trustworthy ABI provenance.

## Engineering consequences

1. The M4 assumption `tx.to !== approveTarget` was **invalidated**. The same address is acceptable only when independently verified as **both** a trusted router and a separately trusted spender. Both allowlists remain mandatory, and the independent ABI semantic guard remains **hard default-deny**.
2. No approval or live swap may be enabled based on this one route fingerprint. A static selector or router address is insufficient because execution can delegate through a mutable facet map.
3. Before live trading, obtain vendor-published verified source/ABI and an authenticated description of the `0xad43f73d` function and 4,580-byte nested payload, establish who can change the selector/facet, and independently validate exact recipient, amount, output, min received, deadline, arbitrary external targets/callbacks, and fee path.
4. Enforce issuer geographic eligibility independently of Binance inventory and wallet funding. The earlier public wallet lacked spendable BSC USDT.
5. When eligibility and contract audit are satisfied, rerun a fresh simulation and request individual, wallet-owned confirmations; onchain receipts and both USDT/NVDAB balance deltas are the actual execution evidence, not the quote.

**Acceptance state: authenticated evidence OBTAINED; selector implementation IDENTIFIED; complete ABI audit NOT complete; no funded trade; live switch OFF.**
