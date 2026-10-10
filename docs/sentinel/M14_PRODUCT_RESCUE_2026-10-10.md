# M14 — SynthaBasket Sentinel: Consumer Product Rescue

> Historical milestone. Superseded by [M15_PRODUCT_RESTRUCTURE_2026-10-10.md](M15_PRODUCT_RESTRUCTURE_2026-10-10.md), which restores issuer choice and both purchase routes while preserving the six-decision model.

**2026-10-10.** Main product route now follows **Discover & Build → Review & Invest → Portfolio**. Developer-focused rooms remain accessible through advanced links, but not primary navigation.

## Hard execution boundary / P0

Official Binance docs support wallet connection and transaction signing in dApps. The current Binance Agentic Wallet docs describe authenticated agent/CLI workflows, not an open third-party per-user website checkout API. The previous M13 local bridge is kept for developer diagnostics only; no consumer is asked to install Binance CLI or paste a pairing token.

**No live browser-wallet swap has been enabled.** Custom LiquidMesh nested router semantics and issuer/jurisdiction requirements remain independently unverified. The customer checkout shows a disabled purchase action with the actual reason. It does not call the legacy authorization API or request any live on-chain approval.

## Consumer journey

1. Main route /sentinel: search live issuer stock tokens, select from research themes or individual contracts, adjust 100% basket weights, and set an exact-cent USDT budget from $1 to $250. Selections are not holdings.
2. Review /sentinel/invest: show exact selected contract identities and per-leg allocations. Connected EIP-1193 / EIP-6963 browser wallet drives read-only funding checks. A single action obtains fresh venue quotes, checks identity and price policy, and requests optional unsigned official Binance route simulation when the wallet is connected. Quotes age out after 30s. Per-leg failures and unavailable evidence are shown truthfully.
3. Portfolio /sentinel/portfolio: use the SAME connected wallet across these pages. Read exact selected ERC-20 balances from BSC and mark the observed holdings using live issuer prices. Never invent fills or treat missing chain data as zero. Activity area links to genuine BscScan history but does not claim proprietary per-user order history that hasn't been built.
4. Advanced developer tools: /sentinel/review, /sentinel/execute, /sentinel/agent, /sentinel/watch remain accessible from deep links and footer.

## Guard rails

- A new deterministic exact-cent allocation helper verifies live contract availability, per-leg minimum $1 and a maximum four-leg basket.
- Quote identity is bound to the exact ticker, platform, token contract, amount and 30-second freshness window.
- Quote success, predicted route simulation, wallet funding and unsigned calldata do not authorize any spend in this release.
- EIP-1193 account and chain binding persists across the consumer route through the same wallet context.
- All legacy execution-router safety locks remain untouched. The new product does not send a transaction.

## Future execution milestones

1. Confirm a supported, audited browser-wallet route with investor eligibility enforcement and route/selector/minOutput/spender review for target tokenized stocks.
2. Keep exact spend caps, explicit per-basket authorization, separate user wallets, sequential legs and fail-closed recovery.
3. Perform a user-authorized first-time browser purchase that produces independently verified BSC receipts, fills and portfolio hydration.
4. Add per-user persisted order history with provenance and partial basket recovery rather than inferring it from balances.

**Honest ship label:** consumer UX and read-only portfolio delivered; public live checkout is not yet verified or enabled. Do not claim complete end-to-end browser trading.
