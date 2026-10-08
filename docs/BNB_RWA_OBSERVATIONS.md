# BNB Tokenized Stocks — Raw Integration Observations

These are technical observations recorded from actual tests on October 8, 2026. They are **not** a substitute for the developer-authored DX report the hackathon requires. No credentials, wallet keys, or live transaction signatures are included.

## Environment comparison
- GitHub Actions run https://github.com/ShalyX/synthabasket/actions/runs/37711321456 responded with HTTP 200 and Binance business code `40304`, message `Service not available due to compliance restriction`, for RWA platforms, BSC tokens and ticker search. Both Action secrets detected; signing unit tests passed.
- User's Windows PC without VPN: DNS lookup for `web3.binance.com` returned `ENOTFOUND`; GitHub and Google resolved.
- Same PC with VPN connected: DNS resolved and Binance read-only API returned data. This does not prove account/trading eligibility in the user's jurisdiction. Respect geographic and service restrictions.

## RWA Data API — real run (2026-10-08T01:22Z UTC)
- Supported issuance platforms: `ondo` and `bstock`.
- RWA tokens filtered to BSC (`binanceChainId=56`): 488.
- NVDA ticker search: returned `NVDA`.
- BSC equity `rwa/price` sample returned on-chain and reference prices.
- API latencies in that run: platforms 1659ms, tokens 907ms, search 805ms, price 418ms.
- No claim that the 488 listed stocks all have real executable liquidity.

## Trading API — real run (2026-10-08T01:25Z UTC)
- BSC aggregator supported chain: success (1506ms).
- `/quote` for $10 nominal BSC USDT (10e18 base units, `0x55d398326f99059fF775485246999027B3197955`) to NVDA bStock (`NVDAB`, `0x02fca66c1d1afb4e2a7884261eb00f63598a7436`): success (545ms).
- Quote: `executionMode=SWAP`, `vendorName=LiquidMesh`, `fromTokenAmount=10000000000000000000`, `toTokenAmount=42018388324103816` raw units; `priceImpactPercent=0.0005068954`, `tradeFee=0.02072315`. Do not assume decimals beyond token metadata.
- `/quote` for the Ondo NVDA token (`NVDAon`): Binance business code `40001`, `userWalletAddress is required for RFQ (Ondo) quote`. No real wallet address was supplied.
- Quotes expire in ~30 seconds; results above are historical diagnostics, **not current prices or executable order intents**.

## Swap build and Transaction API — real run (October 8, 2026 UTC)
- Quote for NVDAB was refreshed using the explicit synthetic sender `0x000000000000000000000000000000000000dEaD`. It is NOT an actual signing wallet, and no one claimed it held funds.
- Fresh SWAP quote: `toTokenAmount=42016672214922095` raw; response 2273ms.
- `GET /api/v1/dex/aggregator/swap` succeeded, returning BSC SWAP calldata of 4,996 bytes, destination `0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5`, gas field `450000`; response 471ms. No approval was requested in the build (`approveTransaction=false`).
- `POST /api/v1/dex/pre-transaction/simulate` returned successful HTTP/business transport but transaction execution status `FAILED`. Reason: `execution reverted: BEP20: transfer amount exceeds allowance` (521ms). This is expected with a synthetic sender and does **not** prove a funded trade would work.
- The probe did not connect any wallet, sign any order, grant allowance, broadcast a transaction, or spend tokens.
- Local unit tests passed 6/6, covering GET signing, POST signing, endpoint allowlist, invalid transaction checks, and simulated error handling.

## Notes for developer to consider writing in their own DX report
- Binance treats HTTP status and business status separately: a 200 can contain an error code and a trade can fail at simulation even when API code=0.
- RWA count is inventory, not liquidity; quote availability differs by issuer/route.
- RFQ routes require a real wallet address before quote, while the observed bStock SWAP route returned without a wallet. The swap build still needs a sender.
- The documentation's simulation example pairs a `SUCCESS` status with a non-empty revert reason; should be clarified in official examples.
- Region-dependent `40304` and DNS `ENOTFOUND` are different failure classes.
- Provider token/share multipliers and token decimals need independent handling, not automatic one-token-one-share assumptions.

## Next hard gates
- Ask Binance to confirm lawful account/jurisdiction eligibility, especially before any funded trading.
- Get an actual *public BSC EVM wallet address* to request real receiver-bound quotes and simulate with accurate allowances/balances (never collect a private key).
- For RFQ, support EIP-712 wallet signing and *separately* user-authorized order submission.
- Verify real BSC token transfers only after explicit spending approval.

## Wallet-bound BSC quote and simulation observations (Oct 8, 2026 UTC)

- The user's public EVM wallet address was supplied locally through the gitignored `BNB_WALLET_ADDRESS` environment variable; **no address, API key or secret was written to GitHub**.
- For nominal 10 BSC USDT input, Binance returned fresh `LiquidMesh SWAP` quotes for both `bstock/NVDAB` and `ondo/NVDAon`. This is a route-specific observation; Ondo had previously returned RFQ validation error 40001 without a wallet address.
- Binance's swap builder produced transaction calldata for both providers, with `approveTransaction=false`. Transaction targets and calldata were validated. All calls remained read-only or transaction simulation only.
- Transaction API simulations for both providers returned `FAILED`, reason `execution reverted: BEP20: transfer amount exceeds balance`.
- A separate BSC mainnet `eth_call` balance read confirmed the public wallet lacked enough BSC USDT for the nominal 10 USDT input. No private balance or identifiable wallet details are stored in these notes.
- **No user signature, token approval, token transfer, order submission, or on-chain broadcast took place.**
- Do not interpret a successful quote/build as proof of a successful funded swap. Trading account / jurisdiction eligibility also remains unverified.

Local commands (with `.env.local` containing `OC_API_KEY`, `OC_SECRET_KEY`, and public `BNB_WALLET_ADDRESS`):

```sh
node --env-file=.env.local scripts/bnb-trading-quote-probe.mjs
node --env-file=.env.local scripts/bnb-wallet-simulation.mjs
node --env-file=.env.local scripts/bnb-wallet-balances.mjs
```
