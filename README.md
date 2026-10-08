# SynthaBasket Sentinel

**Tokenized-stock research and pre-execution intelligence for BNB Smart Chain.**

[Sentinel live deployment](https://synthabasket-sentinel.vercel.app/sentinel) · [Market Index](https://synthabasket-sentinel.vercel.app/sentinel/markets) · [Execution Review](https://synthabasket-sentinel.vercel.app/sentinel/review)

Sentinel is an independent BNB Chain hackathon project, **not** the Solana STOCKLANA SynthaBasket submission. The original Solana project lives separately at [ShalyX/synthabasket](https://github.com/ShalyX/synthabasket).

## Product

Sentinel separates the research process into distinct areas:

1. **The Brief** — issuer reference-to-token price anatomy, with source/freshness states.
2. **Market Index** — issuer-specific Ondo and bStocks instruments on BSC; search, status and adjusted basis.
3. **Instrument Dossier** — contract, token-to-share conversion ratio, reference parity and optional quote checks.
4. **Basket Studio** — four-leg maximum allocations with explicit issuers, weights summing to 100%, and a proposed USDT budget.
5. **Execution Review** — short-lived Binance Web3 quote requests, deterministic fail-closed guards and an independently validated **local wallet readiness file**.

**Not a trading application:** No automated trading, signed messages, token approvals, on-chain transfers, wallet custody, or Agent Studio runtime. A read-only Binance Agentic Wallet CLI integration has been tested **locally**, and the site's imported diagnostic is not authorization to transact.

## Honest current availability

**The publicly hosted market endpoint is not live.** Binance Web3 Gateway returned business error `40304` on cloud-hosted signed API requests. The separate Sentinel Vercel project intentionally has **no Binance API credentials** configured until an approved hosting path is established; its endpoint currently displays a clear unavailable state. No invented prices or fabricated execution fills are provided. See [hosting investigation](docs/sentinel/HOSTING_STATUS.md) and [judge reproduction instructions](docs/sentinel/JUDGE_RUNBOOK.md).

## Local reproduction

Requirements: Node.js **22.x**, npm. Live Binance Web3 RWA data requires a legitimately supported account/hosting location and your own developer keys; do not route around geographic restrictions.

```sh
git clone https://github.com/ShalyX/synthabasket-sentinel.git
cd synthabasket-sentinel
npm ci --legacy-peer-deps
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000), which redirects to `/sentinel`.

To request authorized read-only data, create a **locally ignored** `.env.local` (never commit it):

```dotenv
OC_API_KEY=your_api_key
OC_SECRET_KEY=your_secret_key
```

If your hosting is restricted, the app displays an unavailable feed rather than fabricated stock marks.

## Tests

```sh
npx tsx --test src/lib/sentinel/*.test.ts
node --test scripts/agentic-wallet-readonly.test.mjs scripts/agentic-wallet-diagnostic.test.mjs
npx tsc --noEmit
npm run build
```

GitHub Actions runs these checks with Node 22. See `docs/sentinel` for architecture, source observations, compliance constraints and QA. Some low-level BSC research scripts are historical read-only/failed-simulation evidence; none are invoked by the public application.

## Project boundaries

| | Sentinel | STOCKLANA SynthaBasket |
|---|---|---|
| Network | BNB Smart Chain (56) | Solana Devnet |
| Purpose | Research, issuer comparison, allocation, quote review | SPL-backed index basket vault |
| GitHub | **This repository** | [ShalyX/synthabasket](https://github.com/ShalyX/synthabasket) |
| Hosting | [synthabasket-sentinel.vercel.app](https://synthabasket-sentinel.vercel.app) | [synthabasket.vercel.app](https://synthabasket.vercel.app) |

The two projects now have distinct Git repositories, Git histories and Vercel projects. No secrets are shared across their source repositories.

## Security

The client never sees `OC_SECRET_KEY`, local Agentic Wallet authorization tokens, private wallet data or signatures. Binance Web3 Gateway signing occurs only in the server route. Local CLI diagnostics are sanitized before the user optionally imports them through a browser file picker; the file is not uploaded.
