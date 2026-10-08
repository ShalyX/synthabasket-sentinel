# Sentinel research-desk QA — 2026-10-08

## Deployed / CI

Historical QA of the original feature branch (now deleted after extraction). Current standalone repo: https://github.com/ShalyX/synthabasket-sentinel, branch `main`. See STATUS.md for current state.
- **PASS** [GitHub Actions CI](https://github.com/ShalyX/synthabasket/actions/runs/37717746043): allocations and market/policy unit tests, TypeScript `tsc --noEmit`, Next.js production build.
- **PASS** Deployed Vercel UI Preview: https://synthabasket-ajhjg73ic-shalyxs-projects.vercel.app/sentinel
- **PASS** Actual Chrome screenshots inspected at 1440x950 (Brief, Market Index, Basket Studio) and CDP screenshot emulation at 390x844 for the five distinct page types. At 390px `documentElement.scrollWidth === window.innerWidth` and mobile menu control is shown. Oversized headline spacing corrected in commit a709029.
- **PASS** Local Node/tsx unit test execution on the user's PC: **13 tests, 13 passed, 0 failed** on October 8.
- **LOCAL INSTALL WARNING** The PC runs Node 24 while package requires Node 22; npm 11 `npm ci` timed out retrieving packages and exited with `Exit handler never called`. The Next.js binary and test dependencies were still present; `next --version` and all 13 tests ran successfully. CI on Node 22 remains the canonical build proof.
- **PENDING** Full interactive desktop/mobile menu and live quote UI QA with authorized API access. A failed local dev-server startup check is not a successful application-server claim.

## Hosted API result after credential configuration

- **PASS** `OC_API_KEY` and `OC_SECRET_KEY` stored as sensitive Vercel Preview variables scoped only to `feat/sentinel-research-desk`; none printed or committed.
- **BLOCKED / VERIFIED** `GET /api/sentinel/markets` on the revised Vercel preview returned **HTTP 451** with public error `code: 40304`. This confirms Binance's compliance restriction, instead of the earlier HTTP 503 for missing credentials. See `HOSTING_STATUS.md`.
- No VPN/proxy routing was built into Vercel.
- No live swaps, wallet approvals or signatures have been sent.

## Storage management

Cleared outdated, unreferenced Codex installation caches last modified before September 20, preserving `codex-primary-runtime`, recent installers, all user projects/downloads, model files, credentials, and custom skills.
- Before: ~0.424 GiB free C:
- Immediately after: 5.088 GiB free C:
- After Windows reclaimed storage: 6.61 GiB measured
- Safe recovery: ~4.66 GiB at minimum. Local npm downloads may subsequently consume some space.

## Submission gates

Get permitted judge-accessible data or provide explicit local reproduction instructions and video; secure issuer trade eligibility; demonstrate real user flow without fake data; complete the user's own developer-experience report. Binance Agentic Wallet and BNB Agent Studio remain optional and unimplemented.

## Standalone Git and Vercel separation — October 8, 2026

This repository was extracted into a new independent root commit, excluding the original Solana app, Solana smart contracts, Solana workflows and dependencies. See `REPO_SEPARATION.md` for the exact verified original and new project IDs.

- **Current canonical source:** https://github.com/ShalyX/synthabasket-sentinel, `main`. Previous references in this historical QA log to the deleted feature branch and its Vercel deployments are preserved as historical test evidence only.
- **Current canonical host:** https://synthabasket-sentinel.vercel.app. `/sentinel`, `/sentinel/markets`, `/sentinel/review` and the root redirect returned HTTP 200.
- **Original STOCKLANA main remains** `281b127`, production HTTP 200. The old remote Sentinel branches and preview-only Binance credentials were explicitly removed from STOCKLANA.
- **Present market API state:** the new Vercel project has no Binance credentials; inventory correctly returns HTTP 503. The older restricted `40304` result is a documented historical cloud-hosting experiment.
- **Dependency isolation:** dropped unused Solana SDK/wallet/Anchor dependencies from package and regenerated lockfile. New Node 22 CI is the authoritative build verification.

## Independent Singapore production market verification — October 8, 2026

**Current evidence, superseding earlier preview / HTTP 503 reports:**

1. Dedicated Vercel project synthabasket-sentinel is connected only to independent GitHub repository ShalyX/synthabasket-sentinel. STOCKLANA deployment and main branch were unchanged.
2. Existing Binance developer credentials were sent through local Vercel CLI stdin as sensitive **Production-only** environment variables. No values were printed or committed.
3. Deployment dpl_8XiwHu4eY7e6Sxi2tEVESKtc9uev reached READY, region sin1.
4. Public read-only GET https://synthabasket-sentinel.vercel.app/api/sentinel/markets returned **HTTP 200**, response routing header beginning cdg1::sin1::, count 488 and tokens.length 488. The server authenticates its Binance Web3 RWA inventory request. No fallback/simulated feed.
5. Actual Chrome DevTools test of the Market Index confirmed Feed connected, 488 contracts, **448 distinct underlying tickers**, 24 initial table rows (first AAL), no error banner. Browser hydration PASSED.
6. **Limit:** Historical US hosting 40304 failures remain true, and Singapore connection success does not prove Binance's approved hosting/jurisdiction policy. No live Binance Agentic Wallet quote, token approval, transaction signature or swap was requested.

Earlier entries stating current Sentinel production lacked Binance credentials are historical and no longer reflect the October 8 Singapore deployment.

## Singapore signed venue quote verification — October 8, 2026

**Read-only, not trading.** From actual live BSC inventory with the selected token tradingAvailable=true, a read-only pricing request was sent to POST https://synthabasket-sentinel.vercel.app/api/sentinel/quote with ticker NVDA, platform bstock, amountUsd 5. No walletAddress or authorization data was in the client request.

The quote endpoint validates real Binance BSC inventory and requests a signed upstream GET to the Binance Web3 aggregator quote endpoint (not a transaction submission route). Observed:
- HTTP **200**
- Runtime response header X-Vercel-Id begins **cdg1::sin1::** (Singapore).
- Underlying NVDA, provider bStocks.
- **LiquidMesh** venue, reported **SWAP** execution mode. This is a proposed route description, **not an executed swap**.
- Requested budget 5 USDT; nonzero quoted token amount present.
- Sentinel risk-policy state: **review**, which is not authorization to execute.
- Quote observation time 2026-10-08T13:16:34.551Z.

**Nothing signed, approved, swapped, submitted or transferred**. A live Binance Agentic Wallet CLI quote is still a separate, unverified integration.

Vercel source now pins the sole function region as Singapore (sin1) in standalone vercel.json, and CI includes a region-contract test; post-deployment region metadata and response headers remain the runtime authority.
