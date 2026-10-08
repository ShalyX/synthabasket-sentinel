# Sentinel — multi-room architecture
Based on the original SynthaBasket Next.js 15 app; original `/app` and Solana vault remain unchanged.

## Routes
- `/sentinel` — independent editorial brief and price-anatomy reference demonstration
- `/sentinel/markets` — issuer-aware live BSC token inventory
- `/sentinel/markets/[ticker]` — instrument dossier, ratio-adjusted basis and issuer quote checks
- `/sentinel/baskets` — user-controlled, locally stored 4-leg maximum allocations
- `/sentinel/review` — fresh SWAP/RFQ quote receipt and fail-closed deterministic guard

## Shared application state
`src/components/sentinel/DeskContext.tsx` holds a 30-second market snapshot, honest live/stale/offline state and locally persisted basket allocation. No secret, public wallet address or quote ID is persisted. Shared header/footer `DeskShell.tsx`; token/logo and evidence primitives `DeskBits.tsx`; design rules `src/app/sentinel/desk.css`. The original one-page `sentinel.css` was retired.

## Integration
`src/lib/sentinel/server.ts` signs Binance Web3 API GET requests entirely server-side with `OC_API_KEY` and `OC_SECRET_KEY`, short timeout and 30-second cache. `src/app/api/sentinel/markets/route.ts` validates BSC chain 56 and issuer identities. `src/app/api/sentinel/quote/route.ts` validates token/provider against live inventory, cents-denominated BSC USDT input, optional *public* EVM address, 12 requests/minute process-local throttle; strips expiring quote IDs and transaction payloads.

`src/lib/sentinel/model.ts` computes basis against reference price multiplied by tokenToShareRatio. `src/lib/sentinel/policy.ts` checks available trading, excessive basis, impact and fresh timestamp. `src/lib/sentinel/basket.ts` preserves selected percentages on reload, rebalances to exactly 100%, avoids duplicate underlying tickers and limits to four.

## Hard boundaries
No live wallet adapter, approval, EIP-712 signing, Agentic Wallet session, Agent Studio identity, EVM broadcast or automatic order. A passing policy review is not executable consent. Official restricted-jurisdiction terms apply to users and hosting; no VPN or proxy fallback is a deployment architecture.

## Known hosting obstacle
Vercel preview currently lacks Binance Web3 `OC_API_KEY` and `OC_SECRET_KEY` environment secrets, returning HTTP 503 for markets. Earlier GitHub-hosted signed API checks returned business code 40304 compliance restriction; credential provisioning alone may not resolve US datacenter eligibility. Determine a supported deployment with Binance developer support and verify that judge-accessible hosting is permitted.
