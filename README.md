# SynthaBasket Sentinel

**An issuer-aware basket preflight agent for tokenized stocks on BNB Smart Chain: choose the actual wrapper, obtain live quotes, simulate against your wallet, authorize through browser or Agentic Wallet, and verify what settled.**

[Guided Demo — start here](https://synthabasket-sentinel.vercel.app/sentinel/demo) · [Sentinel live app](https://synthabasket-sentinel.vercel.app/sentinel) · [NVDA issuer comparison](https://synthabasket-sentinel.vercel.app/sentinel/markets/NVDA) · [Source/runbook](docs/sentinel/JUDGE_RUNBOOK.md)

Sentinel is an independent BNB Chain hackathon project, **not** the Solana STOCKLANA SynthaBasket submission. The original Solana project lives separately at [ShalyX/synthabasket](https://github.com/ShalyX/synthabasket).

## Product

The primary product is one journey backed by six explicit decisions:

1. **Build** — choose up to four stocks and the exact bStocks or Ondo wrapper behind each ticker, then set weights and a $1–$25 BSC USDT budget.
2. **Review / Preflight** — bind every leg to its issuer contract, request fresh quotes, inspect funding and simulate wallet-specific calldata. A quote or predicted pass is never treated as a fill.
3. **Purchase** — choose local Binance Agentic Wallet basket execution or direct, per-leg browser-wallet signing. Both routes require fresh evidence, explicit eligibility confirmation and wallet-owned authorization.
4. **Portfolio** — read the selected issuer-token balances from BSC and reconcile actual settlement rather than inventing positions from basket targets.

The Guided Demo retains the complete six-decision state model: wrapper selection, allocation, quote review, calldata simulation, spend authorization and settlement/portfolio observation. The older Market Index, Instrument Dossier, Basket Studio, Execution Review, Simulation Lab and Watch screens remain available as advanced diagnostics. See the [current M15 product context](docs/sentinel/M15_PRODUCT_RESTRUCTURE_2026-10-10.md).

### Current execution paths

- **Binance Agentic Wallet:** whole-basket, bStocks-only execution through an origin-restricted local bridge. It requires a private loopback pairing secret, fresh preview, funding checks, explicit basket approval and `EXECUTE BASKET`; it journals before submission and stops on uncertain settlement.
- **Browser wallet:** bStocks or Ondo execution one leg at a time. The server requests an authenticated Binance build, pins the outer transaction facts, requires exact-size approval, and reconciles the exact wallet-submitted calldata plus issuer-token delivery. The nested LiquidMesh route is explicitly provider-trusted, not represented as independently decoded.

The direct browser route is server-default-off. Enabling it requires the reviewed environment allowlists in `.env.example`, fresh user eligibility and provider-route attestations, and a separate wallet confirmation for every approval or swap.

**Authenticated LiquidMesh evidence obtained (October 9, 2026):** Fresh Binance-signed BSC NVDA/bStocks quote/build confirmed actual router and approval spender `0xb44446b0c8e56988c34f7ff73ae904982b5fdda5`, swap selector `0xad43f73d`, and a storage-dispatched implementation facet. Raw 4,964-byte calldata was preserved privately for audit; it was never signed or broadcast. [Read the authenticated route findings](docs/sentinel/LIQUIDMESH_AUTHENTICATED_ROUTE_2026-10-09.md).

**Historical preview milestone (October 9):** Uncredentialed Vercel previews obtain *market inventory only* from this project's canonical production read-only market endpoint, with schema and 70-second freshness checks and an explicit “First-party relay” label. No Binance credentials are copied to previews, and missing data still fails closed. Wallet balance reads stay direct, pinned to one BSC block; M4 was disabled at that milestone.

**M5 Portfolio Watch (October 9):** The new [/sentinel/watch](/sentinel/watch) route follows the current BSC account's selected issuer-contract balances at one block; marks are sourced from the Binance inventory, not invented. Deterministic drift thresholds and indicative rebalance suggestions remain review-only; no trades or approvals. [Read M5 architecture and limitations](docs/sentinel/PORTFOLIO_WATCH_M5.md).

**Vendor router source finding (October 9):** LiquidMesh officially publishes a BSC router at `0x3d90f66b534dd8482b181e24655a9e8265316be9`, **different from Binance's outer swap tx.to** `0xb44446b0c8e56988c34f7ff73ae904982b5fdda5`. Sourcify exactly verifies the vendor router's `TransparentUpgradeableProxy`, but its current BSC implementation and the Binance outer Diamond facet lack verified source. Binance's official bStocks FAQ says an eligibility endpoint exists without documenting its request/response. [Source-of-truth contract and eligibility findings](docs/sentinel/LIQUIDMESH_OFFICIAL_ROUTER_ELIGIBILITY_2026-10-09.md).

**Historical semantics and eligibility finding (October 9):** Two BSC RPCs independently confirmed the LiquidMesh router/facet and EOA owner, and Sentinel structurally checks the observed nested envelope. **Full nested call semantics remain NOT source-verified, and no authoritative bStocks user-country/issuer eligibility proof is available.** Trading stayed disabled at this milestone; M15 adds a separately labelled provider-trust and user-attestation route rather than claiming those gaps were independently resolved. [Read the execution-gate verification](docs/sentinel/LIQUIDMESH_SEMANTICS_ELIGIBILITY_2026-10-09.md).

**Historical M11 audit verdict (October 9, 2026): NO GO for real funds.** An authenticated live Binance LiquidMesh quote/build was captured and its **outer** calldata envelope validated, but the nested instructions and current swap implementations were not independently verified. M15 preserves that audit result and exposes the browser route only through explicit provider-trust acceptance, user eligibility attestation, allowlists and wallet confirmation; it does not relabel the opaque route as audited. [Read the reproducible audit findings](docs/sentinel/LIQUIDMESH_AUDIT_2026-10-09.md).

**M8 interactive end-to-end demo (October 9):** The current PR branch adds a six-decision execution walkthrough, a separately statused Decision Record in Simulation Lab, and session-only provenance for real simulator/BSC balance observations. The judge capture guide now covers the whole product rather than just wrapper comparisons. [Full runbook](docs/sentinel/JUDGE_RUNBOOK.md) · [Video capture plan](docs/sentinel/DEMO_CAPTURE_PLAN.md). **No complete demo MP4 or public video URL has been produced yet.**

**Production release status:** Agentic Wallet purchase is available through the local bridge when the owner deliberately starts it in live mode. Direct browser authorization is implemented behind a default-OFF operator flag and allowlists. The enabled route has reached a real authenticated $1 NVDAB `APPROVAL_REQUIRED` review without signing or broadcasting; an owner-approved deployed browser swap still needs a live settlement smoke test.

## Honest current availability

**Live BSC market inventory connected (verified October 8, 2026).** The independent Sentinel Vercel production project runs its API in Singapore (`sin1`) with two sensitive, production-scoped Binance Web3 Gateway credentials. The signed, read-only `/api/sentinel/markets` request returned HTTP **200**, with **488 issuer-specific token contracts** across **448 underlying tickers**. Browser verification confirmed the Market Index showed `Feed connected`, 488 contracts and 448 tickers. Binance's `40304` still applied to earlier US-hosted attempts; successful Singapore connectivity is **not** proof of Binance's formal jurisdiction/hosting approval. No prices are invented. M13 records a later manually initiated $1 NVDAB Agentic Wallet purchase; that proof must not be represented as a Sentinel-initiated bridge basket or browser-wallet fill. See [hosting investigation](docs/sentinel/HOSTING_STATUS.md) and [current product context](docs/sentinel/M15_PRODUCT_RESTRUCTURE_2026-10-10.md).

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

# Optional, dangerous direct browser-wallet release. OFF by default.
# Use the exact reviewed target/spender/selector values from .env.example.
SENTINEL_LIVE_EXECUTION_ENABLED=false
SENTINEL_ALLOWED_SWAP_TARGETS=0xb44446b0c8e56988c34f7ff73ae904982b5fdda5
SENTINEL_ALLOWED_APPROVAL_SPENDERS=0xb44446b0c8e56988c34f7ff73ae904982b5fdda5
SENTINEL_ALLOWED_SWAP_SELECTORS=0xad43f73d
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

**Submission has not yet been completed.** The demo video and personal report remain outstanding. A prior manual $1 NVDAB Agentic Wallet purchase is documented in M13; Sentinel-initiated bridge-basket and deployed browser-wallet settlement smoke tests remain pending.

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
