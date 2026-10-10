# M17 — Automatic consumer checkout

**2026-10-10. Review implementation.** The production purchase machinery worked, but the primary experience exposed too much of its internal audit workflow. This milestone changes the presentation and orchestration, not the safety boundaries or the six-decision engine.

## Consumer journey

The product hierarchy is now:

- **The Brief** (`/sentinel`) is the editorial landing page and product orientation.
- **Market Index** (`/sentinel/markets`) is the dedicated stock and issuer-instrument directory.
- **Buy stocks** (`/sentinel/buy`) owns basket construction and amount selection.
- **Checkout** (`/sentinel/invest`) owns automatic preflight and wallet authorization.
- **Portfolio** (`/sentinel/portfolio`) owns verified on-chain holdings.

The purchase path is:

1. **Choose** stocks and a total USDT amount.
2. **Review** the resulting basket and expected token amounts.
3. **Buy** by approving the actions presented by the connected wallet.
4. **Track** verified positions in Portfolio.

Equal allocations and a supported issuer default are selected automatically. Issuer and allocation controls remain available under a per-stock customization disclosure rather than confronting every user by default.

## Automatic work

After checkout opens, Sentinel automatically:

- loads and revalidates signed issuer inventory;
- checks wallet USDT and BNB readiness;
- requests per-leg price indications;
- constructs and simulates wallet-bound routes;
- detects whether exact-size USDT approval is required;
- prepares approval or purchase calldata after one basket-level eligibility/provider-route acknowledgement;
- polls the wallet-returned transaction hash;
- verifies exact transaction input, receipt, issuer-token delivery, USDT debit, historical balance deltas and confirmations;
- prepares the swap after a mined approval;
- advances to the next basket leg only after verified delivery;
- links the completed basket to Portfolio.

## User-owned boundaries

Sentinel does **not** automate:

- wallet connection or network permission;
- issuer/jurisdiction eligibility acknowledgement;
- approval signatures;
- purchase signatures;
- local Agentic Wallet bridge startup or pairing.

Every on-chain approval and purchase still requires a separate wallet confirmation. No browser flow silently signs, broadcasts or retries a transaction.

## Progressive disclosure

- Browser-wallet checkout is the primary route.
- Binance Agentic Wallet is an advanced option because its loopback bridge is not a normal consumer installation flow.
- Wrapper ratios, contracts, routers, spenders, simulation diagnostics and settlement evidence remain accessible in disclosures or advanced routes.
- The six underlying decisions remain enforced by the existing model and APIs; users no longer have to operate them as six separate tools.

## Validation

- TypeScript and the Next.js production build pass.
- 108 deterministic Sentinel and Agentic tests pass.
- Automated browser QA at desktop and 390px mobile widths confirmed automatic checkout startup, wallet-driven re-analysis and exact-size approval preparation.
- A mock wallet rejected the signature request; checkout stopped cleanly and did not retry or submit automatically.

This milestone must be reviewed as a consumer experience before replacing the current production UI.
