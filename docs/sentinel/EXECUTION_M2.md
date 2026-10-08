# M2 — Real BSC swap build and simulation (not a trade)

October 8, 2026. The restored execution-agent plan makes transaction simulation a CORE milestone, not research polish.

## Implementation

- /sentinel/execute is the new Simulation Lab, using the investor's existing issuer-specific weighted basket. It never fabricates prices or positions.
- POST /api/sentinel/simulate invokes three official signed endpoints **only after user instruction**: GET Trading quote → GET Trading swap transaction build → POST Transaction API simulation, all bound to BSC mainnet 56, real signed live issuer inventory and the supplied **public** BSC wallet sender.
- Input: exact ticker, issuer, public address, and $1–$25 BSC USDT per leg; at most $50 USDT combined. USDT uses the actual 18 decimals. Liquidity/path proof is restricted to the observed LiquidMesh SWAP mode; unknown vendors and RFQ signatures are rejected.
- Route guard: token contract, chain, wallet sender, quote amount, price impact ≤2%, requested slippage 0.5%, 30s quote validity, contract metadata from real inventory, no extra native BNB value, no ERC20 approval calldata disguised as a swap, no strange allowance increase or invalid simulation response.
- Read-only Transaction API simulation receives unsigned EVM fields from, to, value=0, data. The user-facing result returns only a reduced receipt with simulated status and changed-balance/allowance counts; quote ID, raw calldata, and sender address never appear in the browser response.
- Basket-level simulation runs legs sequentially and **stops on the first failed leg**. It never signs, approves, broadcasts, funds or submits an order.

## Meaning of the result

SIMULATION_PASSED means Binance Transaction API predicted success for the built spot swap; it is NOT a confirmed trade or an execution authorization. BLOCKED includes failed simulator status, revert, unexpected allowance increase or expired quote. The app does not automatically change wallet permissions or switch venues to force success.

Historical direct technical spikes in ../BNB_RWA_OBSERVATIONS.md already confirmed real Binance quote/build/Transaction API transport. They returned simulator FAILED because the synthetic and the previously checked real public wallet lacked allowance or sufficient BSC USDT funds. This is an actual execution readiness blocker, not an error to hide.

**User-observed production browser verification, October 8, 2026:** One issuer-backed NVDA / bStocks basket leg ($25 BSC USDT) successfully traversed the live quote, built LiquidMesh SWAP calldata, and Binance Transaction API simulator. Quote returned 0.1079236 NVDAB at reported 0.0015% price impact; unsigned transaction calldata length was 5,092 bytes. The simulator returned **FAILED**, with a funding-related reason. No balance changes, allowances, signature, approval or broadcast were reported. This verifies real three-stage API integration, **not a successful execution simulation or onchain trade**. Public wallet address and calldata are intentionally omitted from these notes.

**Follow-up:** An optional public BSC balance diagnostic separately checks USDT available toward the proposed total and whether BNB is present, without claiming sufficient gas or approved allowance. It returns unavailable rather than fabricating balances if the official BSC RPC cannot be reached. A funded, eligible, user-approved onchain swap receipt is a separate M4 milestone.

## Official API documentation

- https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/trading-api
- https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/transaction-api
- https://www.bnbchain.org/en/hackathons/tokenized-stocks

Unit tests, TypeScript and production build must pass before deploy. No wallet secrets are stored or required.
