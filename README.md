# SynthaBasket Sentinel

**Tokenized-stock research and pre-execution intelligence for BNB Smart Chain.**

[Guided Demo — start here](https://synthabasket-sentinel.vercel.app/sentinel/demo) · [Sentinel live app](https://synthabasket-sentinel.vercel.app/sentinel) · [NVDA issuer comparison](https://synthabasket-sentinel.vercel.app/sentinel/markets/NVDA) · [Source/runbook](docs/sentinel/JUDGE_RUNBOOK.md)

Sentinel is an independent BNB Chain hackathon project, **not** the Solana STOCKLANA SynthaBasket submission. The original Solana project lives separately at [ShalyX/synthabasket](https://github.com/ShalyX/synthabasket).

## Product

Sentinel separates the research process into distinct areas:

1. **The Brief** — issuer reference-to-token price anatomy, with source/freshness states.
2. **Guided Demo** — the real, judge-friendly three-step journey from the same-stock/different-wrapper insight to basket construction and safety review.
3. **Market Index** — issuer-specific Ondo and bStocks instruments on BSC; search, status and adjusted basis.
4. **Instrument Dossier** — contract, token-to-share conversion ratio, reference parity and optional quote checks.
5. **Basket Studio** — four-leg maximum allocations with explicit issuers, weights summing to 100%, and a proposed USDT budget.
6. **Execution Review** — short-lived Binance Web3 quote requests, deterministic fail-closed guards and an independently validated **local wallet readiness file**.
7. **Agentic Wallet second opinion** — the instrument dossier generates an optional quote-only command for the owner's paired PC. The official CLI's response can be locally sanitized and imported to compare against a fresh hosted quote for the same contract. The wallet session never reaches Vercel. This user-operated handoff was **successfully exercised with a real local CLI quote on October 8**: 10 USDT indicated 0.04268987900435519 NVDAB. The sanitized observation was inspected and imported into the browser. The fresh, simultaneous two-source comparison was **not** completed because its two-minute local quote window expired; see [instructions](docs/sentinel/AGENTIC_QUOTE_HANDOFF.md).

**Not a trading application:** No automated trading, signed messages, token approvals, on-chain transfers, wallet custody, or Agent Studio runtime. A read-only Binance Agentic Wallet CLI integration has been tested **locally**, and the site's imported diagnostic is not authorization to transact.

## Honest current availability

**Live BSC market inventory connected (verified October 8, 2026).** The independent Sentinel Vercel production project runs its API in Singapore (`sin1`) with two sensitive, production-scoped Binance Web3 Gateway credentials. The signed, read-only `/api/sentinel/markets` request returned HTTP **200**, with **488 issuer-specific token contracts** across **448 underlying tickers**. Browser verification confirmed the Market Index showed `Feed connected`, 488 contracts and 448 tickers. Binance's `40304` still applied to earlier US-hosted attempts; successful Singapore connectivity is **not** proof of Binance's formal jurisdiction/hosting approval. No prices are invented. The owner has now obtained one read-only live Agentic Wallet quote locally, **but no wallet signatures, token approvals, swaps or trades were executed**. See [hosting investigation](docs/sentinel/HOSTING_STATUS.md) and [judge reproduction instructions](docs/sentinel/JUDGE_RUNBOOK.md).

### Read-only venue quote verified

On October 8, Sentinel's **Singapore-hosted Binance Web3 aggregator** returned an HTTP 200 quote for **5 USDT to NVDA (bStocks)**, SWAP route via **LiquidMesh**, with a nonzero token amount and Sentinel policy state `review`. This is **a quote only**: no wallet address, transaction signing, approval or swap was involved. A separate **user-operated Agentic Wallet CLI quote is now verified as a sanitized local observation**, not as a trade or attestation. Singapore is pinned for deployments in `vercel.json`; Vercel runtime response headers independently confirmed the function's `sin1` execution region.

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
node --test scripts/agentic-wallet-readonly.test.mjs scripts/agentic-wallet-diagnostic.test.mjs scripts/agentic-wallet-quote-handoff.test.mjs
npx tsc --noEmit
npm run build
```

GitHub Actions runs these checks with Node 22. See `docs/sentinel` for architecture, source observations, compliance constraints and QA. Some low-level BSC research scripts are historical read-only/failed-simulation evidence; none are invoked by the public application.

## Hackathon demo and submission

For the BNB Hack: Tokenized Stocks Edition, begin with the [live guided demo](https://synthabasket-sentinel.vercel.app/sentinel/demo), then consult the [judge reproduction guide](docs/sentinel/JUDGE_RUNBOOK.md), [video capture plan](docs/sentinel/DEMO_CAPTURE_PLAN.md), and [submission readiness checklist](docs/sentinel/SUBMISSION.md). The mandatory **Developer Experience Report must be personally written**, not generated by AI; the [evidence worksheet](docs/sentinel/DEVEX_EVIDENCE_WORKSHEET.md) contains raw facts and blank prompts, not a report.

**Submission has not yet been completed.** The demo video and personal report remain outstanding; no real swaps or autonomously signed transactions are claimed.

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
