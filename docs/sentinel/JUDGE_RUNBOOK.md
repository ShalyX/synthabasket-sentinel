# SynthaBasket Sentinel — Judge Reproduction Guide

**Project:** BSC tokenized-stock basket execution planner with deterministic safeguards and read-only portfolio monitoring.
**GitHub:** https://github.com/ShalyX/synthabasket-sentinel
**Production market endpoint:** https://synthabasket-sentinel.vercel.app
**New six-decision walkthrough:** `/sentinel/demo` on the current PR #1 preview; published stable production only after an explicitly authorized release.
**Track:** BNB Hack / Tokenized Stocks Edition, Main Track.
**Deadline:** October 11, 2026, 12:00 UTC.
**Source:** Next.js 15 / BSC chain ID 56 / Binance Web3 signed RWA market and Trading quotes / Binance Transaction API simulation / ERC-20 public `balanceOf`.
**Separate Solana project:** https://github.com/ShalyX/synthabasket (not this submission).

## The product promise and its verified limits

Sentinel is a **basket execution agent**, not only an issuer comparison research desk.

**Discover** real bStocks and Ondo issuer contracts → **compare** their ratio-adjusted exposure → **construct** a weighted basket → **quote, build and simulate** each unsigned BSC USDT leg → **request explicit user wallet approval only if release gates can genuinely pass** → **observe** actual issuer token balances and propose indicative rebalance amounts. The product does **not** claim to have purchased any tokens through this app. Live transaction release remains **HARD LOCKED** because router nested calldata/source and per-user issuer eligibility are unverified.

The working issuer data layer is real. Earlier authenticated read-only Binance calls returned 488 BSC contracts across 448 ticker symbols and both NVIDIA wrapper types. Production browser quotes are short-lived and may become unavailable. The preview explicitly marks when it relays first-party production inventory; it does not have production-scoped Binance quote/build/simulation credentials.

## Judge journey — follow the user, not just the API

1. **Open the new `/sentinel/demo` (PR preview).** Read the central question and the independent state of market inventory, basket, connected BSC account and final execution release. “NO GO” is a security result, not a stubbed success.
2. **Issuer dossier `/sentinel/markets/NVDA`.** Find two distinct verified BSC issuer token records (NVDAB and NVDAon), actual token-to-share ratios and reference marks. A token mark is NOT a quote, nor an entitlement to underlying securities.
3. **Basket Studio `/sentinel/baskets`.** From the Guide you may click “Set NVDA + AMD research basket,” which selects real issuer records and an initial 50/50 local thesis. Adjust weights and issuers; the total remains 100%. A basket target does not issue shares, claim holdings, or spend funds.
4. **Execution Review `/sentinel/review`.** With authorized provider access, request fresh real venue quotes and inspect venue, basis, impact and expiry. An unavailable quote is an honest unavailable state. Do not claim it was a purchase.
5. **Simulation Lab `/sentinel/execute`.** Connect an injected BSC wallet (chain 56). Select a bounded test size ($1–$25 per leg, at most $50 total), initiate quote→build→simulate per leg. On a properly authenticated authorized environment, the real Binance Transaction API can report PASS or BLOCKED. A previously tested route was BLOCKED by insufficient BSC USDT; no transaction was signed. **The public PR preview does not hold quote API credentials and cannot be relied on for signed simulation**.
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
