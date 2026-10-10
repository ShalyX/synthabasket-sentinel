# M16 — Production purchase proof

**Verified October 10, 2026.** The owner supplied the two public BSC transaction hashes produced by the production smoke tests. Independent reads from `bsc-dataseed.bnbchain.org` and `bnb-mainnet.g.alchemy.com/public` agreed on chain ID 56, successful receipt status, block hash and the relevant ERC-20 transfer logs for both transactions.

This evidence upgrades the earlier owner-confirmed terminal states in M13/M15 with independently checked public settlement facts. It does not expose or prove possession of either wallet, reproduce the private wallet sessions, independently decode every nested route instruction, or establish issuer/jurisdiction eligibility.

## Browser-wallet purchase

- Transaction: [`0x5eb940dc5ec79ccc9a50239dcf455253310e4f383111b155f65e7ec6f4f4237f`](https://bscscan.com/tx/0x5eb940dc5ec79ccc9a50239dcf455253310e4f383111b155f65e7ec6f4f4237f)
- Block: `126893207` at `2026-10-10T20:39:17Z`
- Receipt: BSC mainnet status `1`; zero native BNB value
- Outer route: `0xb44446b0c8e56988c34f7ff73ae904982b5fdda5`
- Selector: `0xad43f73d`, matching the reviewed production browser allowlist
- BSC USDT debit: `1000000000000000000` raw units = `1.000000000000000000 USDT`
- NVDAB delivery: `4333913446012409` raw units = `0.004333913446012409 NVDAB`
- Historical owner balance deltas at the transaction block independently matched the transfer logs: exactly `-1 USDT` and `+0.004333913446012409 NVDAB`.

## Agentic Wallet bridge purchase

- Transaction: [`0xbf810bc3f78edee4af2a675853425837e5e2f1866fc9ddc6794ecb5a0ce05c2c`](https://bscscan.com/tx/0xbf810bc3f78edee4af2a675853425837e5e2f1866fc9ddc6794ecb5a0ce05c2c)
- Block: `126898539` at `2026-10-10T21:19:17Z`
- Receipt: BSC mainnet status `1`; zero native BNB value
- Agentic outer route: `0xb300000b72deaeb607a12d5f54773d1c19c7028d`
- Selector: `0x810c705b`
- BSC USDT debit: `1000000000000000000` raw units = `1.000000000000000000 USDT`
- NVDAB delivery: `4333925884963029` raw units = `0.004333925884963029 NVDAB`
- Historical owner balance deltas at the transaction block independently matched the transfer logs: exactly `-1 USDT` and `+0.004333925884963029 NVDAB`.

## Verification notes

- BSC USDT `0x55d398326f99059ff775485246999027b3197955` and NVDAB `0x02fca66c1d1afb4e2a7884261eb00f63598a7436` both reported 18 decimals.
- Both RPC providers independently returned the same successful receipt, block hash, sender/target and token transfer amounts. Confirmation counts differed only because their latest observed block heights advanced during the checks.
- The public BSC dataseed had already pruned the historical balance trie. The Alchemy public endpoint supplied the before/after archival balance reads; these exactly matched the transfer-log deltas from both providers.
- The browser transaction maps to the direct lane through its pinned `0xb444…` target and `0xad43f73d` selector. The second transaction maps to the Agentic run through the bridge-preview account and the separate Binance Agentic route.
- NVDAB token units are not automatically identical to underlying NVDA shares. Displaying the raw received quantity does not remove the wrapper conversion-ratio caveat.

## Verdict

Both production purchase lanes have independently verified public BSC settlement for separate owner-authorized $1 NVDAB smoke tests. This is evidence for two single-leg purchases, not proof of a live multi-leg basket or unattended execution.
