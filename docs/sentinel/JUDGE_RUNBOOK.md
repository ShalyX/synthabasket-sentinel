# SynthaBasket Sentinel — Judge Reproduction Guide

**Project:** BSC tokenized-stock basket execution planner with deterministic safeguards and read-only portfolio monitoring.
**GitHub:** https://github.com/ShalyX/synthabasket-sentinel
**Production market endpoint:** https://synthabasket-sentinel.vercel.app
**Live six-decision walkthrough:** https://synthabasket-sentinel.vercel.app/sentinel/demo — released to the canonical production domain October 9, 2026.
**Track:** BNB Hack / Tokenized Stocks Edition, Main Track.
**Deadline:** October 11, 2026, 12:00 UTC.
**Source:** Next.js 15 / BSC chain ID 56 / Binance Web3 signed RWA market and Trading quotes / Binance Transaction API simulation / ERC-20 public `balanceOf`.
**Separate Solana project:** https://github.com/ShalyX/synthabasket (not this submission).

## The product promise and its verified limits

Sentinel is a **basket execution agent**, not only an issuer comparison research desk.

**Discover** real bStocks and Ondo issuer contracts → **compare** their ratio-adjusted exposure → **construct** a weighted basket → **quote, build and simulate** each unsigned BSC USDT leg → **request explicit user wallet approval only if release gates can genuinely pass** → **observe** actual issuer token balances and propose indicative rebalance amounts. The product does **not** claim to have purchased any tokens through this app. Live transaction release remains **HARD LOCKED** because router nested calldata/source and per-user issuer eligibility are unverified.

The working issuer data layer is real. Authenticated Binance production data has returned 488 BSC token contracts and 448 tickers. The production server holds signed quote/build/simulation credentials. The preview has a clearly labeled read-only relay with NO live quote/build credentials.

## Judge journey — follow the user, not just the API

1. **Open the canonical production Guided Demo.** Review source inventory, local basket, sender and execution release statuses. The final NO GO is a real safety decision, not a stubbed successful transaction.
2. **Issuer dossier `/sentinel/markets/NVDA`.** Find two distinct verified BSC issuer token records (NVDAB and NVDAon), actual token-to-share ratios and reference marks. A token mark is NOT a quote, nor an entitlement to underlying securities.
3. **Basket Studio `/sentinel/baskets`.** From the Guide you may click “Set NVDA + AMD research basket,” which selects real issuer records and an initial 50/50 local thesis. Adjust weights and issuers; the total remains 100%. A basket target does not issue shares, claim holdings, or spend funds.
4. **Execution Review `/sentinel/review`.** With authorized provider access, request fresh real venue quotes and inspect venue, basis, impact and expiry. An unavailable quote is an honest unavailable state. Do not claim it was a purchase.
5. **Simulation Lab /sentinel/execute.** Connect a public BSC wallet on chain 56; user-initiated 1–25 USDT-per-leg preflight is available from the canonical production domain. A genuine 1 USDT NVDAB production SWAP build/simulation on October 9 was BLOCKED by insufficient USDT. This verifies a fail-closed simulation path, not a purchase. The preview cannot reproduce authenticated quote/build/sim calls because it has no production API credentials.
6. **Execution Decision Record** on the simulation screen makes distinct determinations: market, intent, sender, route/simulation, funding/allowances, issuer entitlement, two-layer proxy/ABI semantics, and final release. The last three remain UNVERIFIED/LOCKED regardless of any green simulator status. No approval, swap or wallet signature is initiated.
7. **Portfolio Watch `/sentinel/watch`.** Read your actual selected issuer balances pinned to one BSC block, compare marked allocation with targets if nonempty, and get indicative drift changes only. A real zero position, as observed for a selected Ondo ABNB issuer token, displays $0.00 and **NO OBSERVED POSITIONS** instead of a fabricated rebalance. If a mark or balance is missing, the valuation remains unknown.
8. **Return to Guide.** The session-only journal records actual returned simulator and BSC balance responses for the SAME connected wallet, selected issuer mix and allocation. No replays of expired executable quotes, fictitious fills, fabricated wallet balances, or seeded trade receipts.

## Signed authentication and route evidence (dated, not tradable quotes)

October 9 read-only authenticated Binance LiquidMesh build for 1 BSC USDT to NVDAB produced **4,964 bytes of unsigned calldata** with outer swap selector `0xad43f73d`. Binance outer proxy/spender `0xb44446b0c8e56988c34f7ff73ae904982b5fdda5` is NOT the separately published inner LiquidMesh EVM router `0x3d90f66b534dd8482b181e24655a9e8265316be9`. Independently verified Sourcify source applies only to the inner TransparentUpgradeableProxy; implementation source and nested **4,580 bytes** remain unknown. The outer proxy exposes upgrade controls and an EOA owner. Binance bStocks requires legally permitted individual and wallet eligibility, not just a geographically eligible server; that integration isn't verified.

Reproducible investigation: `docs/sentinel/LIQUIDMESH_AUTHENTICATED_ROUTE_2026-10-09.md`, `LIQUIDMESH_OFFICIAL_ROUTER_ELIGIBILITY_2026-10-09.md`, and `LIQUIDMESH_SEMANTICS_ELIGIBILITY_2026-10-09.md`. Raw audit fixture stays privately stored outside git and was never broadcast.

## Verification and privacy

```sh
npm ci --legacy-peer-deps
npx tsx --test src/lib/sentinel/*.test.ts
npx tsc --noEmit
npm run build
```

No API secrets or signing handles shipped to the browser or PR preview. A public connected wallet is not an issuer KYC attestation. No autonomous Agent Studio identity, x402 onchain actor, self-custodied model signer or unattended portfolio trading is claimed. Session audit evidence is in memory only and resets on reload.

**Demo video:** preparation in [DEMO_CAPTURE_PLAN.md](DEMO_CAPTURE_PLAN.md). No completed/hosted MP4 URL until a real capture and final review. Avoid editing stale price numbers to look current.

## Official organizer submission

- Hackathon details: https://www.bnbchain.org/en/hackathons/tokenized-stocks
- Project form: https://forms.gle/yToDUzaDMwWnq6R6A
- Developer Experience Report: https://forms.gle/EUQ39xf54GHjC2ys5
- **Developer Experience Report must be personally authored** by the developer; AI-written report entries do not meet the organizer requirement.

No submission should be described as completed until both form confirmations are received and recorded. The confirmed demo must truthfully acknowledge the lack of an actual onchain stock purchase.
