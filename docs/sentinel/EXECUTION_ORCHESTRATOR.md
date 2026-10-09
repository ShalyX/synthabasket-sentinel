# M9 — Basket execution orchestrator, recovery, and reconciliation

**Implementation:** `src/lib/sentinel/execution-orchestrator.ts` and `src/lib/sentinel/transaction-reconciler.ts`. Wired into existing `/sentinel/execute` page and existing gated authorization component. **No additional dashboard.**

## Actual runtime transaction plan

A user connects a public BSC chain-56 wallet, chooses 1–4 unique issuer-specific tokenized stock contracts and a weighted strategy in Basket Studio, and requests a USDT rehearsal from Simulation Lab. `planRehearsal` freezes the exact connected wallet, issuer contract, ticker/platform/weights and per-leg cents. Requests above $25 per leg or $50 total are refused. Contract identity must match the signed production market inventory.

On the user's **Build & simulate basket** click, `rehearse` issues one `POST /api/sentinel/simulate` per leg, sequentially. The server handles **fresh authenticated quote → unsigned Binance Web3 swap build → Transaction API simulation**. The engine checks the complete shape of each response, including token contract, budget, chain 56, read-only flags, price, quote expiry and simulator result. It records the exact stage reached, stops on first blocked/unavailable/expired leg and marks later legs NOT_ATTEMPTED. Successful simulations are classified as **PREDICTED_PASS**, never executed trades.

### Recovery is explicit and bounded

* An aborted request or wallet/basket-session change stops the run without advancing a leg.
* Network errors, Binance failures, timeouts and ambiguous simulator responses become UNAVAILABLE. Funding, slippage, or policy denials become BLOCKED. A stale quote becomes EXPIRED.
* **No automatic retry.** The user may intentionally re-run the **whole basket** from fresh quotes, not reuse earlier leg approvals, calldata or simulator results. The original wallet, token contracts and target amounts must still match; otherwise a new plan is needed.
* Recovery allows no more than **3 manual attempts** for one unchanged plan. This is a bounded safety feature, not a solution to a persistent provider eligibility or insufficient-funding denial.
* An old PASS also expires when its quote window elapses. Neither a prior PASS nor a previously mined approval is a live trade permission.
* There is **no auto-rebalancing, approval or broadcast**.

### Chain lifecycle reconciliation

The transaction component remains **hard-disabled for actual spending** until independently validated issuer eligibility and full LiquidMesh nested router semantics are available. Its receipt path is nonetheless wired to a typed reconciler for later authorized use.

It only starts from an exact hash returned from an explicit browser-wallet transaction interaction, and carries the original expected account, router target, issuer token, ticker and platform. Public BSC receipt and settlement endpoints then distinguish:

- PENDING: no known mined receipt
- REVERTED: mined EVM failure
- MISMATCH: wrong hash, chain, intent or returned record
- APPROVAL_MINED: allowance transaction; no asset acquisition
- RECEIPT_ONLY: mined EVM success but no observed token delivery
- SETTLEMENT_INCOMPLETE: failed or unavailable transfer/balance proof
- TRANSFER_EVIDENCE_ONLY: matching receipt, issuer token logs and historical state deltas with at least 3 block confirmations

**Critically**, `TRANSFER_EVIDENCE_ONLY` is never called a filled purchase. A genuine purchased-basket claim additionally requires the exact wallet-approved calldata fingerprint and verifiable issuer entitlement; the existing endpoints do **not** yet supply these. The reducer always returns `filledPurchaseConfirmed:false` and `canProceedToNextSpend:false`. If a basket is only partially reconciled, do not advance another spend.

### Deterministic adversarial tests

`execution-orchestrator.test.ts`: valid plan, unsupported/mismatched issuer, budget, first-leg abort, partial failure and nonattempted subsequent legs, unknown network outcomes, live quote expiration, forged upstream response, wallet switch and capped fresh re-rehearsal.

`transaction-reconciler.test.ts`: pending and reverted transactions, approvals, mismatched hash/chain/token, transfer logs missing, insufficient confirmations, zero or absent historical balances, duplicate/partial basket receipts, and valid historical transfer evidence that **cannot become a fill claim**.

## Release gates unchanged

The independent server authorization API rejects live actions without explicitly enabled operator controls, full nested calldata interpretation and authoritative per-user issuer eligibility. The browser UI remains disabled; the wallet signer is not invoked by these orchestration tests or by the Simulation Lab. Nothing is signed, transmitted to BSC, or settled through this feature.

The work is a testable lifecycle engine and truthful transaction observer, **not** proof of a live successful stock-token purchase, router audit or securities eligibility.
