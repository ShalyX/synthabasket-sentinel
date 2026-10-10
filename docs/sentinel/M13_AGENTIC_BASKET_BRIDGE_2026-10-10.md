# M13 — SynthaBasket Sentinel / Binance Agentic Wallet bridge

**2026-10-10 — implementation built; live basket execution initiated from Sentinel NOT YET verified.** The successful October 10 NVDAB trade was initiated manually using Binance CLI, not by Sentinel.

## User experience

Basket Studio → Execution Review → Agentic Execute → pair local wallet → review fresh quotes and funding → explicitly authorize the basket → sequential Binance Wallet orders → verify BSC settlement → public-wallet Portfolio Watch.

The Vercel site does not run Binance Wallet or hold an MPC session. A separate Node process runs on the owner's Windows PC, bound to 127.0.0.1:8787. The website calls it directly over browser loopback only. It accepts one explicitly allowed production HTTPS origin, requires a random secret visible only in the local process console, and never saves that secret in Git, the site or the durable journal. No private key or Binance session leaves the PC.

Source modules:
- scripts/sentinel-baw-bridge.mjs — local HTTP API, separate trading enable switch, journal, quote, order state machine and independent RPC settlement
- scripts/sentinel-baw-bridge-core.mjs — deterministic input, issuer/quote/order/transfer checks
- src/lib/sentinel/bridge-plan.ts — 1–4 bStocks legs, exact-cent allocations up to $25
- src/app/sentinel/agent/page.tsx — explicit preview and checkout UI; shows per-leg evidence and public-watch link
- src/app/sentinel/watch/page.tsx — public read-only observation via verified bridge-account address (separate from Rabby wallet)

## Start

In PowerShell on the connected Windows PC, inside C:\Users\USER\sentinel-m4-work:

    npm run bridge:baw

This is **read-only by default**. It prints a random pairing secret in that PC's terminal. On the same PC open https://synthabasket-sentinel.vercel.app/sentinel/agent, paste the secret there, and pair. Refresh that page after starting the local bridge. Never share a pairing secret with anyone, including chat.

To deliberately allow real mainnet spending, stop the read-only process and start a **new** bridge process:

    $env:SENTINEL_BAW_ENABLE_TRADING = '1'
    npm run bridge:baw

This generates a new secret. The user must still request fresh quotes, explicitly acknowledge current issuer/account eligibility and the trade's risks, check the basket approval box, then type EXECUTE BASKET. The local agent never starts live trading automatically. No browser wallet is required: the authenticated local Binance Agentic Wallet is the signer.

**No remote/tunneled access:** never publish the bridge over Cloudflare, Tailscale, a LAN binding, Vercel API routes or a reverse proxy. Only 127.0.0.1 is supported.

## Enforced rules

- Only BSC 56, USDT payment, bStocks with live signed issuer inventory and tradingAvailable=true.
- Max 4 legs, minimum $1 each, max total $25 per approved basket, 0.5% user-set slippage.
- Quote-only preview may show insufficient funding; it cannot execute until the wallet actually has spendable USDT and buffered BNB gas. Binance user eligibility is not cryptographically attested; it remains the account holder's responsibility and Binance's restriction to enforce.
- Bridge preview expires after 60 seconds and requires explicit exact-plan confirmation. The wallet, inventory, funds and quote direction are re-checked before each new order. Deterioration > 0.5% from preview stops rather than repricing silently.
- The bridge saves a SUBMISSION_UNCERTAIN record **before** calling the official Binance CLI swap. Interruption or timeout never triggers automatic resubmission.
- The Binance CLI submit result is not a fill. FINISHED is required. Exact submitted-order ID is preferred; where Binance indexing disagrees, only exactly one new order with the exact token, chain, source quantity and observed time window can be matched. An ambiguous match halts execution.
- BSC receipt, sender, USDT debit, token delivery and at least 3 confirmations must be confirmed by **two separate RPC providers agreeing** before advancing another leg. The raw token quantity is retained; share-equivalent units are different from token units.
- A partial, failed, unknown or non-reconcilable basket stops; the user may retry **read-only reconciliation**, not order submission. Journal survives browser disconnect or local-process restarts.

## Proven and not proven

Verified: Python/Node/TypeScript logic and guard tests, Next production build, CORS allowed origin, wrong-origin 403, unauthenticated 401, read-only bridge startup and health. Previously, a manually submitted $1 NVDAB Binance Agentic Wallet purchase reached real BSC settlement; M12 documents the transaction and the raw-token/share-equivalent distinction.

Unverified as of this commit: live multi-leg spending initiated from the deployed Sentinel UI, browser loopback interaction on the deployed site, and full Binance wallet order reconciling through this new bridge on a real purchase. These must not be claimed as passing until a user-approved production browser-wallet run occurs. The custom LiquidMesh direct-signer remains locked.

**Important prior findings:** the manual NVDAB trade showed different Binance submit/order-list IDs; this is why the bridge requires an unambiguous matched transaction or stops. Binance Wallet may approve virtually unlimited USDT spend to its on-chain wallet spender. The new UI warns this can happen; review and revoke unnecessary approvals separately in Binance Wallet. Vendor token-security audit data was unavailable for NVDAB. A quote is not a legal trading-eligibility attestation.

## Tests

    node --test scripts/sentinel-baw-bridge-core.test.mjs
    npx tsx --test src/lib/sentinel/bridge-plan.test.ts
    npx tsc --noEmit
    npm run build

Read-only loopback probe: GET /health with Origin https://synthabasket-sentinel.vercel.app should respond 200, tradingEnabled false by default; arbitrary Origin should be rejected 403; GET /state without private Authorization should be rejected 401.

Full end-to-end status remains **PENDING USER-INITIATED LIVE BASKET TEST**. Do not fake this status.
