# SynthaBasket Sentinel — Restored Production Plan
2026-10-08 — correction of the reduced research-only scope.

## Product contract

Sentinel is a **BNB Chain basket execution agent**, not only a market-comparison desk.

Original builder-approved loop:
**discover → compare issuer wrappers and routes → construct weighted basket → simulate each BSC spot leg → explicit wallet-approved execution → monitor positions and advise on drift**.

An agent proposes and checks the work; **the human owns the spend authorization**. No arbitrary user-prompted onchain actions, blind unlimited token approvals, custodial key custody, or automatic transaction signing.

A previous version of this file marked execution "optional" and listed automatic orders as out of scope. That was a unilateral scope reduction from the initial product direction. This restored plan supersedes it. Comparison and safe quote research are **infrastructure for execution**, not the finish line.

## Milestone table

| ID | Job / acceptance gate | Status on Oct 8 |
|---|---|---|
| M0 | Signed Binance Web3 BSC token inventory and two-issuer same-stock quotes | DONE: real bStocks and Ondo SWAP / LiquidMesh quotes |
| M1 | Share-equivalent normalization, venue freshness, issuer status, editable portfolio thesis | DONE: 30-second live comparison, four-leg allocation and review |
| M2 | **Executable quote build and actual Transaction API simulation** for a specific issuer, amount and public wallet address, with no signer, allowance side effects, or sending | VERIFIED live Oct 8: quote → build → simulator ran; simulator correctly BLOCKED unfunded USDT, no transaction sent |
| M3 | **Controlled basket execution planner**: allocation to intent, per-leg simulation, exact-size caps, fees/allowances/sender checks, reject at first failing leg | IN PROGRESS: fail-first batch, chain-bound sender, BSC balances and read-only quote-spender allowance snapshots implemented; fee/permission readiness and live multi-leg success not verified |
| M4 | **Human-authorized mainnet execution**: wallet signer connection owned by user, chain/balance/allowance checks, individually reviewed exact approvals and spend caps, post-trade receipt; no unattended orders | NOT STARTED, core; cannot claim until onchain receipts |
| M5 | **Agent loop**: deterministic strategy monitoring or signal detection, preflight for rebalance candidates, clear explainability, no autonomous key access; opt-in review of proposals | NOT STARTED, core |
| M6 | **Agentic Wallet** integration beyond CLI quote, with actual independently verified permission safety and execution capability where permitted | NOT VERIFIED FOR EXECUTION; optional special prize |
| M7 | **BNB Agent Studio** autonomous runtime/identity/x402 if real deploy/test becomes feasible; no claim without deployed proof | UNVERIFIED / stretch special prize |
| M8 | Test full journey from unconnected wallet to onchain execution history, production QA, privacy and eligible regions, judge demo/video, personally authored mandatory DX report | PENDING |

## Immediate engineering order — do not return to demo polish

1. Implement M2 route in the standalone Sentinel repo only. Use official Binance Web3 Trading API to build a BSC 56 SWAP transaction from a fresh issuer quote and a **public** owner wallet address. Then call official Transaction API simulate with exact transaction from/to/data/value. **Do not sign, approve or broadcast.** Reject unsupported RFQ and undocumented signatures instead of silently falling back.
2. Verify real network M2 results. Simulation may fail for lack of USDT/BNB or allowance; show failure truthfully and do not call it a passed trade.
3. Wire M2 into the basket Execution Review: per-leg simulation status, refused/blocked reasons, optional spender/allowance gaps, and user-visible reviewed intent. Require one live simulation per leg before claiming executable readiness.
4. Build wallet-owned approvals/execution with mandatory distinct user confirmations for any monetary action; never infer spend authority from "review" or from a successful CLI quote.
5. Add a minimal bounded monitoring / rebalancing proposal loop (not an unsupervised actor holding funds).
6. Rebuild the **judge narrative around the whole agent execution loop** only after M4/M5 are genuinely exercised.

## Guardrails / stop conditions

- BSC **mainnet 56**, only verified live bStocks/Ondo addresses, spot only. Other chains and unknown contracts fail closed.
- Short-lived quote IDs never exposed in public snapshots; new quote must be bound to exact ticker/platform/address/input/public wallet and consumed before TTL.
- Maximum simulation budget **$25 per leg** and **$50 total basket** until explicit product authorization and risk review; slippage cap **0.5%**, price impact cap **2%**.
- Simulation API is read-only. A simulation SUCCESS is only prediction—not confirmed allowance, funding, a filled order or a purchase.
- No credential, wallet private material, pairing state or signing handle leaves the user's own wallet device. API credentials remain server-only.
- No live signing, approval, transaction broadcast, wallet transfer or automatic trading without explicit user approval. Eligibility and jurisdictional restrictions still apply.
- M4 readiness requires user-held wallet connection, real simulation, appropriate allowance funding and confirmed onchain receipt; never fabricate.
- Preserve exact deadline **Sunday Oct 11 2026 12:00 UTC**, reserve time for real video and self-authored report; truncate stretch features before core truthfulness/safety.
- Do not modify the original Solana STOCKLANA repo.

## Evidence

Actual observations in RESEARCH_AND_RESOURCES.md, ONDO_RFQ_RECEIVER.md, WRAPPER_QUOTE_COMPARISON.md, AGENTIC_QUOTE_HANDOFF.md, QA_REPORT.md. Main-track rules: https://www.bnbchain.org/en/hackathons/tokenized-stocks
