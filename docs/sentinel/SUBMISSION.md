# SynthaBasket Sentinel — Submission Package / PENDING OWNER SUBMISSION

**Status:** DRAFT PACKAGE — NOT SUBMITTED.
**Official hackathon:** https://www.bnbchain.org/en/hackathons/tokenized-stocks
**Submission deadline:** 11 October 2026 at **12:00 UTC**.
**Submit project:** https://forms.gle/yToDUzaDMwWnq6R6A
**Developer Experience Report form:** https://forms.gle/EUQ39xf54GHjC2ys5
**Track:** Main Track — Tokenized Stocks Products & Agents on BNB Smart Chain.

## Ready-to-review project fields

**Name:** SynthaBasket Sentinel

**Category:** BSC tokenized-stock basket execution planner, quote/build/simulation agent and read-only portfolio monitor.

**One-line description:** Build issuer-specific BSC stock baskets, rehearse each swap using real unsigned Binance Web3 transactions and deterministic risk checks, expose blocked execution safely, and monitor actual wallet allocations.

**Project overview (review before use):** Sentinel plans issuer-specific BSC tokenized-stock baskets from live Binance Web3 inventory. Users choose bStocks/Ondo wrappers, normalize equivalent share exposure from genuine quotes, and set explicit 100%-weighted USDT intents. Each leg receives an actual unsigned BSC swap build and Binance Transaction API simulation. A per-gate decision record evaluates the wallet, balances, allowances, simulator outcome, issuer user-specific permission, and nested router safety. Signing and real trading stay HARD LOCKED until independent issuer eligibility and ABI verification are available. Wallet Portfolio Watch reads actual ERC-20 balances at one BSC block and proposes only indicative allocation drift. The current production version did not purchase stock tokens, request signatures or broadcast transactions.

**Public source:** https://github.com/ShalyX/synthabasket-sentinel
**Working public site:** https://synthabasket-sentinel.vercel.app/sentinel
**Six-decision end-to-end Guided Demo (LIVE production):** https://synthabasket-sentinel.vercel.app/sentinel/demo
**Primary instrument proof:** https://synthabasket-sentinel.vercel.app/sentinel/markets/NVDA
**Detailed judge runbook:** https://github.com/ShalyX/synthabasket-sentinel/blob/main/docs/sentinel/JUDGE_RUNBOOK.md
**Video link:** NOT RECORDED / UPLOADED YET. Fill in only after verifying a working public video. Recommended length is under 4 minutes.

## What is demonstrably verified

| Claim | Status | Evidence |
|---|---|---|
| Independent public repository and production deployment | VERIFIED | Source repo and Singapore Vercel project; per-release CI |
| Signed Binance Web3 RWA inventory on BSC 56 | VERIFIED | HTTP 200, 488 contracts / 448 tickers observed October 8, 2026 |
| Provider-specific NVIDIA issuer contracts, conversions and reference prices | VERIFIED | Actual bStocks NVDAB and Ondo NVDAon inventory and browser |
| Signed live Web3 Trading aggregator quote API | VERIFIED | Both issuer routes SWAP / LiquidMesh, no onchain execution |
| Wrapper-adjusted share-equivalent comparison with true 30s expiry | VERIFIED | Owner screenshots and unit/browser QA; no fabricated quote data |
| Basket themes, weights, up to four different underlying tickers | VERIFIED | Product and unit tests; browser local storage |
| Deterministic safety/freshness review | VERIFIED AS RESEARCH | Tests and live browser review UI; not execution authorization |
| Local user-run Binance Agentic Wallet CLI quote | VERIFIED AS LOCAL OBSERVATION | Owner-run 10 USDT read-only quote and sanitized JSON |
| Full simultaneous CLI-versus-hosted live venue comparison | NOT YET VERIFIED | Comparison expired before both results were current |
| Real transaction preflight simulation | VERIFIED, often BLOCKED | Binance authenticated quote/build/simulate tested against public BSC wallet, insufficient funding; never a fill |
| Real purchased stock tokens / settled trade | NOT VERIFIED / NO GO | No onchain stock-token purchase, wallet authorization or settlement was performed |
| Autonomous Agent Studio agent and x402 identity/funding | NOT IMPLEMENTED | Not claimed |

Current issuer inventories, venue prices and modes can change after the verified observations. Avoid presenting historical numbers as currently quoted values.

## Main-track risk / transparency

The organizer's track rules say: BSC mainnet, spot-only, dry-run with Transaction API, then demonstrate small live amounts. Sentinel is a working **read-only research product**, not a purchase/execution interface. It demonstrates live integration and two-issuer comparison, but **does not satisfy an executed-trade demonstration** at this point. Do not mark this gate complete or fabricate a receipt. Address only if the builder explicitly authorizes a separate eligible, risk-reviewed, legitimate execution path; not during unrelated demo work.

## Remaining owner actions

- [ ] Record a truthful video of **4:00 maximum** (recommended) that shows the live first-time user journey. Use DEMO_CAPTURE_PLAN.md; redact any public address you do not want shown.
- [ ] Watch the full exported video and confirm the UI, labels, data and timing are correct. Do not splice synthetic QA quotes into the recording.
- [ ] **Personally write** the mandatory Developer Experience Report in your own words. Use DEVEX_EVIDENCE_WORKSHEET.md to recall firsthand events and verify your own details. AI-generated reports are explicitly not accepted.
- [ ] Verify GitHub repo, production Guided Demo, NVIDIA quote and Basket Studio remain accessible without browser developer credentials.
- [ ] Review the restricted-jurisdiction rules and confirm eligibility yourself. The site working in Singapore does not establish personal eligibility.
- [ ] Complete the official **project submission form** and save an actual confirmation URL, message and timestamp privately.
- [ ] Complete the official **DevEx report form**, and likewise retain a confirmation. Do not assume project submission automatically includes the separate report.
- [ ] Preserve the public repo, video and deployment throughout the October 12–23 judging period.
- [ ] Create SUBMISSION_RECEIPT.md only after the platform confirms submission, keeping any personal identifiers private.

## Scores / practical emphasis

Official: **30% Technical Implementation**, **25% Creativity**, **25% Developer Experience Report**, **20% Product/UX**. This submission's core original insight is **issuer-normalized underlying exposure** from two actual tokenized-stock quote routes—not simply showing two token prices in a comparison chart.

Special prizes are not separately entered. This build does **not** claim an autonomous AI execution layer or Agent Studio integration. Do not position the read-only CLI handoff as a winning autonomous agent without further real evidence.
