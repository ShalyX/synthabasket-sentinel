# M5 — Wallet-bound Portfolio Watch + Drift Engine

**Status:** implemented as **read-only, foreground portfolio observation**. Not an autonomous trading bot, non-custodial basket vault, account portfolio indexer, history database, or approved securities execution system.

## End-user flow

1. Build a weighted basket in **Basket Studio** (up to four ticker-unique, issuer-specific BSC contracts). Basket choices remain locally stored in the browser.
2. Connect a real injected wallet, switch to **BNB Smart Chain mainnet / chain ID 56**, and open **Portfolio Watch**.
3. Every ~30 seconds while the page is visible, and on focus, Sentinel checks the **exact selected token contracts** against fresh Binance-signed inventory and calls each token's ERC-20 `balanceOf(public_wallet)` at the **same observed BSC block**. RPC errors are **UNAVAILABLE**, never fabricated 0. A user-triggered refresh runs the same read-only flow.
4. Where **every** selected contract has a verified balance and a finite positive current Binance token mark, compute `value = observed token units × token mark`, then `actual allocation = value / total observed basket value`. Missing prices/RPC results, wrong basket, or snapshots older than ~65s produce **UNPRICED** or **STALE** rather than calculations. The provider mark is **not an executable sell quote** or proof of liquidity.
5. For nonempty portfolios, compare actual against target; when the **absolute deviation exceeds** the selected 2%, 5%, or 10% threshold, propose an **indicative, balance-neutral** exposure adjustment in **USD marked value**. These are *not trade instructions*, not token quantities, and not guaranteed USDT received/spent. With zero total observed positions, return **EMPTY**, not a proposed purchase.
6. Display a **session-only** journal of observed decision changes. It is intentionally not represented as a durable audit log: no invented backfill, execution history, portfolio P&L, or server storage.
7. For future execution, user must separately request a route/build/simulation with live issuer validation, permissions, explicit wallet approval, and actual mined delivery. **M4 remains default OFF and hard-denied until the router ABI + issuer eligibility approvals are established.**

## Endpoints

- `POST /api/sentinel/portfolio` expects `{walletAddress:"0x…",legs:[{ticker:"NVDA",platform:"bstock"}]}`.
- Input is a **public address**, not cryptographic proof the caller controls the account. The UI binds reads to the currently connected EIP-1193 wallet session. Anyone can independently inspect public BSC account balances.
- The endpoint accepts at most four unique tickers and rejects unknown fields/unsupported platforms. Contract addresses are **resolved server-side from the signed inventory**; users cannot substitute arbitrary RPC contract addresses. It always uses chain ID 56, a fixed approved BSC RPC endpoint, one pinned block height, bounded API payloads, request timeouts, no cookies/cache, and best-effort per-instance rate limits.
- Result contains read-only `balanceRaw`, `tokenPriceUsd`, issuer `contract`, `marketAsOf`, `observedAt`, `blockNumber`, with `signaturesRequested:false` and `ordersSubmitted:false`. It never makes a transaction, approval or signing request.
- Serverless rate limiting is per-instance/best effort (not durable or DDoS-proof). There is no background daemon; switching tabs stops scheduled reads. Prices and balances may change after the observed block.

## Verification

```sh
npx tsc --noEmit
npx tsx --test src/lib/sentinel/*.test.ts
npm run build
```

New deterministic unit cases verify: unique typed contract selection, target-versus-observed weights, band boundary, missing RPC balance, missing marks, empty wallet, stale records, mismatched basket, malformed thresholds, and non-executable proposal state. **No simulated or fake onchain balance is used in production.**

## Limitations and release gates

- The selected basket is a watchlist across issuer wallets, not an issued basket share or a complete account/transaction index. Assets outside the selected set are excluded.
- No positions appear without real ERC-20 holdings. Preview deployments without Binance credentials use a **hardcoded, strictly schema-validated and timestamp-bound, read-only HTTPS relay** to Sentinel's canonical production `/api/sentinel/markets`, whose server obtains the authenticated Binance inventory. The preview identifies the feed as **First-party relay** rather than claiming a cryptographic Binance signature. The relay never forwards transactions, approvals, wallet details, arbitrary URLs or signing requests. If canonical production is unavailable, too old (over 70 seconds), malformed or inaccessible, the preview fails closed instead of making up balances or prices. On production itself this fallback is disabled to avoid recursion.
- Mark-to-market estimates omit gas, fees, spreads, pending transactions, sell restrictions, token-to-share legal rights, taxes and withdrawal mechanics. Direct ERC-20 balances do not imply economic entitlement or jurisdictional eligibility.
- A true **rebalance rehearsal** for buy *and sell* legs (including executable USDT proceeds, target deliverables, allowances and fees) is pending verified M4 routing/issuer eligibility. The M5 journal is not a trading decision log stored on-chain or persisted in Redis.
- Never wire this screen to an unattended wallet, auto-signature or auto-order feature. UI proposals remain strictly educational/review-only.
