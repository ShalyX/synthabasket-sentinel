# M10 — Live browser-wallet end-to-end **read-only** proof (October 10, 2026)

**Canonical deployment:** https://synthabasket-sentinel.vercel.app
**Environment:** Owner's actual desktop Chrome and existing Rabby browser extension, BNB Smart Chain 56. Read-only. The wallet is shown here only as `0x1dcb…32d2`; no wallet secrets or extension authorization tokens collected.

## Real interactive journey observed

1. Opened production `/sentinel/execute` in a fresh Chrome tab. It initially displayed **NOT CONNECTED**. Selected Rabby in the real wallet menu; the app showed **CONNECTED BSC · chain 56** with the existing browser account, without a signature.
2. Confirmed the live market feed and saved three-leg basket: **NVDA Ondo 34% / $8.50, MSFT bStocks 33% / $8.25, AMD bStocks 33% / $8.25**, total **$25.00 USDT**. This is a research/simulation target, not an onchain position.
3. Pressed **Check balances & allowances** in the actual browser UI. Public BSC readings: **0.000000 USDT** and approximately **0.00003863 BNB**; USDT fails $25 funding requirement. No signature was requested.
4. Pressed **Build & simulate basket**. The application requested a genuine fresh venue quote and unsigned LiquidMesh swap build for first leg **NVDA/Ondo $8.50**, then received Binance Transaction API **FAILED** with interpreted reason **insufficient ERC-20 token balance**. First leg marked **BLOCKED**; **MSFT and AMD both NOT REQUESTED**. Decision ledger reported **ROUTE & SIMULATOR: BLOCKED**, **FUNDS: NOT CLEARED**, **ISSUER ELIGIBILITY: UNVERIFIED**, **SWAP IMPLEMENTATION: UNVERIFIED**, **FINAL RELEASE: LOCKED**. The live diagnostic additionally observed the identified swap spender's BSC USDT allowance as **0.000000 / 8.500000**, without requesting approval.
5. Observed **explicit attempt 1/3**, with no auto-retries. Intentionally clicked **Rehearse all legs with fresh quotes**. Agent performed a new, user-initiated rehearsal and returned another provider-reported insufficient-balance denial at **attempt 2/3**. MSFT and AMD still did not proceed; no signature/approval/broadcast was initiated.
6. Chose **Disconnect from Sentinel** in the UI. It cleared wallet readiness, quote/simulation evidence and funding state; the action button became disabled until reconnection. The original browser wallet remained installed and its private keys untouched. Chose Rabby to reconnect to BSC chain 56; stale route/funding evidence stayed **NOT VERIFIED**.
7. Opened actual browser `/sentinel/watch` while Rabby was connected. The app independently observed **BSC block 126731849**, **NO OBSERVED POSITIONS**, and **$0.00** across the three **selected issuer contracts**. It explicitly did not infer a filled basket, historic trading activity, or rebalance permission.

## Product discrepancy found and repaired

The deployed M10 interface left the **Rehearse all legs with fresh quotes** button wording after disconnect/reconnect, although the actual rehearsal plan had been cleared. This was a stale **presentation counter**, not a retained transaction permission. The local fix removes the redundant `runId` counter; the button now derives first-run/recovery wording from `currentRun`, which is invalidated on basket/wallet/session changes. The operation-key invalidation also resets `evidenceKey`.

## Exact claim boundaries

- **Proven:** real browser-wallet connection, owner-session read-only funding diagnosis, fresh production quote/build/simulation on a selected real issuer token, first-leg fail-closed and later-leg non-attempt, manual-only bounded recovery, session invalidation, read-only BSC portfolio balance observation and final spend lock.
- **Not proven:** any signed ERC-20 approval, executed trade, settled token delivery, purchase receipt, verified personal issuer entitlement, or independently audited nested LiquidMesh transaction semantics. No live trade or actual purchase occurred in these tests.
- A connected wallet does **not** imply the owner is eligible to trade the token. This wallet has no observed BSC USDT for the $25 test. Do **not** suggest funding it until independent issuer permission and route audit clear.
- Images captured during the session are **private on the operator's local PC** and must not be committed to GitHub without privacy review.

**Verdict: execution agent's read-only and fail-closed browser journey demonstrated; live acquisition & settlement = NO GO / UNVERIFIED.**
