# M4 — Operator-locked, human-authorized BSC execution (initial implementation)

## Current status
Code path is implemented for review, independent allowlist checks, exact-size USDT approval, separately confirmed swap request and public receipt verification. **Not verified live. Not enabled by default. M4 is NOT complete.** An additional hard-coded fail-closed semantic guard is installed: changing environment flags/allowlists alone can NEVER unlock real signing until an ABI-specific router decoder is independently audited and implemented.

### Environment gate (ALL required)
- `SENTINEL_LIVE_EXECUTION_ENABLED=true` (default `false`)
- `SENTINEL_ALLOWED_SWAP_TARGETS=` audited, comma-separated Binance LiquidMesh onchain swap contract addresses
- `SENTINEL_ALLOWED_APPROVAL_SPENDERS=` independently audited, comma-separated quote approveTarget addresses
- `SENTINEL_ALLOWED_SWAP_SELECTORS=` independently decoded/audited, comma-separated 4-byte swap function selectors (e.g. `0x12345678` only if truly audited; **do not copy this illustrative value**)

**A selector alone is not proof of a safe swap.** The current ABI-specific decoder deliberately rejects every route, because no actual LiquidMesh router calldata has been independently decoded. The separately operated read-only audit probe in the review branch is collecting evidence (not permission). **No production credentials or allowlists are included in source.** Never guess a router or a spender from `tx.to`, an Explorer label or UI. Resolve verified router bytecode, function signature, spender, and calldata semantics before touching this switch. Auditing an address/selector is *necessary but not sufficient* to establish safety; confirm expiry, min-out, recipient, input-token and input-amount semantics inside calldata on the actual route.

### Live action
1. User independently selects a supported issuer-backed leg capped at $25 BSC USDT; basket simulation remains $50 max.
2. They press **Review fresh wallet action**. Server re-fetches issuer inventory, quote and swap build for their public chain-56 address, checks policy and configured route/spender/selector allowlists, exact amount/asset, USDT/BNB balances, onchain allowance, gas and quote time.
3. If allowance is zero: show **APPROVAL REQUIRED**. The single wallet request is an **exact-size** USDT `approve`, never max uint; it does not automatically trigger a swap. User must refresh after mining. Nonzero but insufficient allowance blocks pending manual reset.
4. If allowance covers and fresh Binance simulator predicts success: show **SWAP READY**. The user must check the explicit mainnet acknowledgment and click **Ask wallet to spend** within the short quote window. The injected browser wallet itself shows the real BSC transaction and requires a second explicit confirmation.
5. Sent transaction hash is **pending** until the read-only BSC receipt endpoint confirms chain 56, hash, sender and target, with on-chain status 0x1. An EVM success receipt **is not yet proof of issuer-token delivery, economic fill, or finality**. No approval is silently bundled with the swap; no automatic next basket leg is sent.

### Known limitations / next safety gate
- User's observed wallet holds no BSC USDT. Nothing can be live-tested as a successful purchase with it.
- **Authenticated route evidence captured 2026-10-09:** LiquidMesh actual `tx.to` and separately verified approve spender BOTH `0xb44446b0c8e56988c34f7ff73ae904982b5fdda5`, selector `0xad43f73d`, current dynamically dispatched facet `0xa9fa1b56f4d7bd25375c2d40b4c8e36a9509e603`. The previous blanket restriction `tx.to !== spender` was incorrect and has been removed, while the independent semantic ABI guard continues to reject all execution.
- A live swap contract ABI decoder/semantic validator, audited allowlist entries, issuer eligibility/jurisdiction determination, tested quote TTL, and actual wallet rejection/mined-receipt cases are not yet signed off. Keep live switch OFF. See [authenticated route evidence](LIQUIDMESH_AUTHENTICATED_ROUTE_2026-10-09.md).
- No verified jurisdiction/issuer eligibility is available; integrations must follow Binance's public bStocks country-eligibility guidance, not market inventory flags alone.
- Simulated output alone is NOT execution proof. Future work: compare on-chain token balance deltas, receipt logs and gas cost against the pretrade quote; persist only durable public receipts.
- Server uses a public BSC RPC that is not an integrity oracle or transaction finality service. Independent RPC comparison and multiple confirmations should precede production rollout.
- This code never handles private keys; user wallet sends all onchain requests. Agent cannot transact unattended.

### Local checks
Run `npx tsx --test src/lib/sentinel/*.test.ts`, `npx tsc --noEmit`, `npm run build` before review. Any missing dependency or live-account blocker must be reported rather than presumed passed.
