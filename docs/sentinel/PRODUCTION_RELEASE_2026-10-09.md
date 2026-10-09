# Sentinel — production release verification (October 9, 2026)

**Canonical application:** https://synthabasket-sentinel.vercel.app/sentinel/demo
**Source:** https://github.com/ShalyX/synthabasket-sentinel
**Reviewed PR:** https://github.com/ShalyX/synthabasket-sentinel/pull/1
**Reviewed application merge SHA:** b068c2df73d2de3bfeb656d92517984da65e618c (PR head 98bb75884595584f6528a217675e5416cf38b610).

## Shipped

One complete execution-first journey: issuer inventory and wrapper math, target-weighted basket creation, real server-side Binance Web3 venue quotes and unsigned transaction builds, Binance Transaction API simulation, a per-gate decision ledger, and read-only BSC portfolio balance observation. Live signing remains independently HARD LOCKED.

## Observed production checks on October 9

| Probe | Observation |
|---|---|
| Production DNS/alias and Git | Vercel READY production deployment at main merge b068c2d |
| Guided Demo, Simulation Lab, Portfolio Watch | All HTTP 200 with expected product content |
| Authenticated RWA market inventory | 488 contracts / 448 distinct tickers; direct production Binance server-side feed |
| Read-only 1 BSC USDT to bStocks NVDAB quote | HTTP 200, LiquidMesh SWAP indication |
| Unsigned BSC spot transaction build + simulation | HTTP 200; upstream simulator BLOCKED due to insufficient ERC-20 USDT funds; no approval, signature or broadcast |
| Live execution authorization | HTTP 503 / rejected |
| Wallet Portfolio Watch API | HTTP 200, chain 56, block 126644821, observed ERC-20 balance zero for NVDAB on a previously used public QA wallet; genuine provider mark; no orders |
| CI + deploy | GitHub pull request checks SUCCESS, Vercel READY |
| Runtime error clusters | None returned for recent 20-minute window |
| Log drains | None configured |

The previously used public test wallet is not presumed to be the user's current wallet. This QA proves read-only behavior, not that an end user owns NVDAB or that their jurisdiction is eligible.

**Security:** Binance developer credentials remain server-side production-only. A successful Binance quote or simulated transaction is not proof of issuer entitlement, legal permission, executed trade or user asset ownership. Server-side issuer entitlement adapter and full nested-router semantic checks fail closed independently of operator flags.

**Open items:** full official LiquidMesh nested ABI/upgrade audit; authoritative issuer country AND personally bound wallet/product eligibility; eligible owner-confirmed live execution if ever supported. Submission, developer-experience report and a finished public demo MP4 are NOT yet completed. The accurate storyboard lives in [the capture plan](DEMO_CAPTURE_PLAN.md).
