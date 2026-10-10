# M12 — Official Binance Agentic Wallet stock-trading path: live read-only verification
**2026-10-10. Source: owner-operated Windows PC, Binance Agentic Wallet CLI 1.10.0, skill 1.12.0. NO swap submitted.**

## Why this matters

The hackathon provides Binance Agentic Wallet / Wallet Skills as a supported AI execution layer, separate from the Binance Web3 aggregator's opaque LiquidMesh SWAP. This is a distinct integration path; do not interpret the official wallet as proof that its underlying contracts are audited or that the buyer has issuer-specific rights. Keep Sentinel's separate custom LiquidMesh direct-signing gate LOCKED.

Official references:
- https://www.bnbchain.org/en/hackathons/tokenized-stocks
- https://developers.binance.com/en/docs/products/agentic-wallet/use-cases/trading/stock-trading
- https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/market-order.md

## Authentic runtime evidence

- CLI: baw 1.10.0; official skill-preflight checks report skill 1.12.0 current and CLI version sufficient.
- Original Windows Node 24.14.0: `baw wallet status --json` returned `SERVICE_ERROR` code 2 with `illegal parameter` and then Node/libuv assertion `!(handle->flags & UV_HANDLE_CLOSING)`; another read-only CLI action returned `SESSION_EXPIRED / Please log in first.`
- `baw auth signin --json` generated a fresh official Binance App login link; the owner approved login in the Binance App; `baw auth verify --qrCodeId <REDACTED> --json` returned `SUCCESS`.
- CLI on portable Node 22.23.3: `wallet status --json` returned `CONNECTED` cleanly. Crucially, retesting on the original **Node 24.14.0 after successful sign-in** also returned `CONNECTED` with exit code 0. Therefore the original status failure does **not** establish that Node 24 is incompatible; the observed expired/not-connected session and Windows assertion require separate diagnosis. Session credentials and login QR data NOT committed.
- `wallet settings --json`: dailyLimit **$50,000**, quotaLeft **$50,000**, tradeAllTokens **false**, abnormalTxnHandling **AutoReject**, devMode.enabled **false**. A $50,000 limit is too high for a micro-test; Binance App settings must be reduced before any funded demonstration.
- `wallet balance --binanceChainId 56 --json`: returned an empty array. Per official docs the CLI omits token balances worth less than $0.01; therefore interpret as **no reported balances**, not proof of cryptographic zero.
- `wallet tx-lock --binanceChainId 56 --json`: `UNLOCKED`. `market-order list --binanceChainId 56 --pageSize 5 --json`: success with **total=0**. This demonstrates a readable order query but CANNOT prove a real order's progression to FINISHED/FAILED.
- Fresh `/api/sentinel/markets` provided exact trading-indicated bStocks contracts. The signed-in official `baw market-order quote` returned success on BSC 56 with 1 USDT input, 0.5% slippage for **all three**:

| Issuer | BSC contract | Quote receive for 1 USDT |
| --- | --- | ---: |
| NVDAB | 0x02fca66c1d1afb4e2a7884261eb00f63598a7436 | 0.004345739322654309 |
| MSFTB | 0x80106cb3ead06659a5ad19df39d9b4733863b9b0 | 0.001865572322007655 |
| AMDB | 0x75fd4cf6f8392e41e70391d60c90c0d5211603a1 | 0.001637276493452611 |

These are three independent quote-only CLI calls; NOT a batch order, transaction simulation, liquidity guarantee, or settled purchase. Quotes are time-sensitive and expired for future action.

- Finally, generated an additional **10 USDT → NVDAB** CLI quote via the existing local sanitizer `scripts/agentic-wallet-quote-handoff.mjs`. It produced the sanitized observation in the OS TEMP folder, with `outputTokenAmount=0.043443656640335969`, contract, ticker and timestamp. The report's permission fields explicitly specify `mayTrade:false, maySign:false, mayApprove:false`. It contains no session credentials, wallet address, raw CLI quote, signature, quote ID or spending authorization.
- The Sentinel dossier already offered this safe local-quote import before M12. The repository recorded a successful local Agentic Wallet quote on **October 8**, so M12 is a **fresh independent three-leg re-verification, not the first quote integration ever built**.

## Live execution decision

The Binance Agentic Wallet is distinct from the user's browser Rabby wallet. The wallet is authenticated and quoting, but the observed Agentic Wallet has no reported BSC funds, a very broad $50,000 daily ceiling, and **no independently verified user/product/jurisdiction/wallet bStocks entitlement**. Token scope restriction does not prove issuer eligibility. No onchain transaction, approval, order ID, wallet signature, broadcast or fill was observed or claimed. **DO NOT** call `baw market-order swap` yet.

An authorized future trial requires:
1. User confirms issuer and relevant exchange/bStock jurisdiction eligibility through the official provider, without uploading sensitive KYC into project source.
2. User lowers the Binance Agentic Wallet daily spend ceiling appropriately and explicitly approves the particular stock contract, amount, slippage and live trade after a fresh quote.
3. Sufficient funds and BNB gas are independently observed; do not request funding before restrictions clear.
4. After an explicitly authorized `baw market-order swap`, treat `orderId` as SUBMITTED only; poll `baw market-order list --orderId <id> --json` until `FINISHED` or `FAILED` (or honestly label pending). Reconcile real BSC txHash and issuer balance deltas independently. No automatic retry.
5. Keep Sentinel custom LiquidMesh signing path independently locked unless its own ABI/security release gates pass.

## Reproduction and privacy

Use the official `baw market-order quote --fromTokenQty 1 --fromToken <BSC_USDT> --toToken <LIVE_VERIFIED_BSTOCK> --binanceChainId 56 --slippage 0.5 --json` after authenticating. On Windows, the operator used Node 22.23.3 to obtain quotes; the original Node 24 later also returned a clean authenticated wallet status. Do not prescribe a Node upgrade as an established root-cause fix. Never commit the CLI session, login QR code, raw response or private identity material. Read-only local quote files can be imported into Sentinel, but **cannot be trusted as signed trade evidence**.

**M12 verdict: OFFICIAL WALLET QUOTE VERIFIED x3; READ-ONLY ORDER QUERY VERIFIED; LIVE TRADING AND TERMINAL ORDER LIFECYCLE UNVERIFIED.**
