# M15 — Issuer-aware product restructure and purchase restoration

**2026-10-10. Current product context.** This milestone supersedes M14's read-only checkout decision without rewriting the historical M12–M14 evidence.

## Product definition

SynthaBasket Sentinel is an issuer-aware basket preflight agent for tokenized stocks on BNB Smart Chain. Users construct thematic baskets, inspect the actual issuer-backed wrapper behind each stock ticker, obtain live execution quotes, simulate transactions against their connected wallet, and identify unsafe or unverifiable trades before signing.

## Canonical journey

The original six decisions were preserved as the product state model rather than deleted:

1. Select the ticker and exact issuer wrapper.
2. Define weights and an exact-cent BSC USDT budget.
3. Obtain fresh per-leg venue quotes and inspect contract identity.
4. Build and simulate wallet-bound transaction calldata.
5. Choose a signer route and explicitly authorize live spending.
6. Reconcile settlement and observe the actual on-chain portfolio.

The primary navigation groups these decisions as **Build → Review/Preflight → Purchase → Portfolio**. Guided Demo still presents all six decisions. Older Market, Basket Studio, Execution Review, Simulation Lab and Watch rooms remain advanced diagnostics, not competing primary journeys.

## Issuer choice

The main builder no longer silently collapses every ticker to a preferred wrapper. A starter may choose a default, but each selected ticker exposes all currently trading-indicated bStocks/Ondo alternatives, their provider symbol and token/share conversion ratio. Switching wrappers updates the same basket leg rather than adding a duplicate ticker. Review binds the selected platform and exact BSC contract.

## Purchase routes

### Binance Agentic Wallet bridge

- Whole-basket sequential execution for bStocks, up to four legs and $25 total.
- Runs only on the user's computer at `127.0.0.1:8787`; the hosted app never receives the Binance wallet session or pairing secret.
- Requires fresh preview, observed funding, an approval checkbox and the phrase `EXECUTE BASKET`.
- Journals before submission, stops on ambiguity and advances only after Binance order status plus independent BSC settlement evidence.
- M13 records that a manual $1 NVDAB Agentic Wallet trade settled before this bridge. On October 10, the owner also ran a separate production Sentinel-initiated, one-leg $1 NVDAB bridge smoke test; the deployed UI reported `SETTLED_VERIFIED` and terminal basket phase `FINISHED`.

### Direct browser wallet

- Per-leg bStocks or Ondo signing through the connected EIP-1193/EIP-6963 BSC wallet.
- Server rebuilds a fresh authenticated Binance route and pins sender, input/output tokens, amount, minimum output, outer router, quoted spender and selector.
- Nested LiquidMesh calls remain independently undecoded. The route is therefore labelled `AUTHENTICATED_BINANCE_BUILD`, not audited semantics, and requires explicit provider-trust acceptance.
- Eligibility is a fresh user attestation, never inferred from location, quote, inventory or wallet connection and never labelled provider verification.
- Any missing allowance produces a separate exact-size USDT approval. The swap is prepared only after a fresh simulation passes.
- Receipt reconciliation matches the wallet transaction's exact calldata, sender, target and zero native value, then requires the expected issuer-token transfer, USDT debit, historical balance deltas and at least three confirmations before marking that leg `PURCHASE_VERIFIED`.
- Every leg remains separately clicked; no unattended signatures or automatic order chain.

Direct browser authorization is default-off at the server. Production must explicitly set `SENTINEL_LIVE_EXECUTION_ENABLED=true` plus the observed router, quoted spender and selector allowlists shown in `.env.example`. This is an operator acceptance of the documented provider-trust model, not a claim of independent LiquidMesh source verification.

## Verified in this milestone

- 99 deterministic/unit/bridge tests pass.
- Next production build and TypeScript checks pass.
- Desktop and 390px mobile browser runs show explicit wrapper controls and both purchase lanes.
- With the live execution flag and pinned allowlists enabled locally, a real authenticated Binance $1 NVDA/bStocks quote/build reached `APPROVAL_REQUIRED` with exact USDT approval calldata for the observed `0xb444…` router/spender. No transaction was signed or broadcast during this verification.
- PR #3 was merged to `main`, GitHub CI passed, and the production Vercel deployment and signed market feed returned HTTP 200.
- The reviewed production router, spender and selector allowlists were enabled. A separate no-signature production probe returned the expected exact-size $1 NVDAB `APPROVAL_REQUIRED` action.
- The owner then completed a production browser-wallet smoke test. The owner reported that Sentinel verified the exact-size approval, signed $1 NVDAB swap, issuer-token delivery and USDT debit, ending at `PURCHASE_VERIFIED`.
- The owner separately ran the production local Agentic bridge in deliberately enabled live mode with a fresh one-leg $1 NVDAB preview. The owner reported terminal leg state `SETTLED_VERIFIED` and basket phase `FINISHED`.

The two transaction results above are **owner-confirmed production evidence** from Sentinel's wallet-owned interfaces. No pairing secret, private wallet session, raw balance or signing material was collected. Unless public transaction hashes are added separately, this document does not claim that the repository maintainer independently replayed those private wallet sessions.

## Remaining non-product deliverables

- Video, submission and personal DevEx-report work intentionally remain outside this product milestone.
