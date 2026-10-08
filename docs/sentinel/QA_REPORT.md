# Sentinel research-desk QA — 2026-10-08

## Deployed / CI

Branch: `feat/sentinel-research-desk`.
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
