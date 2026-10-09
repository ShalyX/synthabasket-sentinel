# Sentinel — One coherent BSC basket execution demo (target 3:35; maximum 4:00)

**Status (October 9, 2026):** interactive six-decision Guided Demo implemented; recording/export **NOT yet completed**. This document is a practical, reproducible capture and truthful claims contract, not a substitute for an actual MP4 or public video URL.

**Product job:** demonstrate the agent loop **discover → issuer comparison → weighted basket → quote/build/simulate → explicit transaction RELEASE DENIED → real wallet holdings/drift**. Do not repeat the former three-move wrapper-only research-desk demo.

**Verified canonical production:** https://synthabasket-sentinel.vercel.app/sentinel/demo — merged October 9 with production-scoped Binance API credentials. The production quote endpoint returned HTTP 200 (LiquidMesh SWAP), the unsigned simulator returned HTTP 200 with a genuine insufficient-USDT BLOCK, and live authorization was rejected with HTTP 503. No transaction was signed or broadcast. Preview environments have read-only inventory relay only.

## Capture structure — 3:35 target

| Time | Real route / scene | Required evidence and on-screen truth |
|---|---|---|
| 00:00–00:18 | `/sentinel/demo` new hero | "A basket is a plan. Can it execute?" Inventory status is dynamically derived. Execution "NO GO" is visible |
| 00:18–00:45 | `/sentinel/markets/NVDA` | Two distinct live bStocks/Ondo BSC contracts and token/share conversion ratios. Say *issuer inventory*, not filled order |
| 00:45–01:15 | `/sentinel/baskets` | Choose NVDA+AMD or another currently supported issuer basket. Adjust allocation and show exactly 100% weighted target; no shares issued |
| 01:15–01:47 | `/sentinel/review` | Initiate real read-only quote requests if authenticated, otherwise show explicit unavailability. User-controlled receiver address may be needed for Ondo. Don't splice earlier quotes into a live screen |
| 01:47–02:35 | `/sentinel/execute` | Show connected BSC wallet, bounded USDT input, **actual** quote→build→Transaction API simulate result if environment permits. Blocked due USDT balance is a successful guardrail demonstration, not a purchase. If preview denies requests, say preview lacks signing credentials and display the UNAVAILABLE state |
| 02:35–03:00 | **Execution Decision Record** under simulation | Point to each independent gate. Source, weight, wallet, simulator and funds may be observed; issuer entitlement and nested router semantics explicitly **UNVERIFIED**, and final **LOCKED** |
| 03:00–03:23 | `/sentinel/watch` with connected BSC wallet | Read actual ERC-20 `balanceOf` at a BSC block, show empty ABNBon position if that's what the wallet really holds; **do not edit zero into positive balances**. A target is not a purchase |
| 03:23–03:35 | Return `/sentinel/demo` historical session evidence | In-memory session proof appears only for real simulator or balance API responses from the same wallet and basket. End on **no filled trade claimed** |

## Caption-ready truthful narration

- "Two contracts can track one stock. The token amount alone doesn't tell you equivalent underlying exposure."
- "I choose the issuer and weight of each leg. This is a target portfolio, not yet a token position."
- "The agent asks for a real route, builds unsigned calldata, and asks the simulator what would happen. A blocked outcome is useful evidence."
- "A prediction of success still isn't permission to trade. The router's full nested semantics and this user's issuer eligibility aren't verified, so the system refuses live execution."
- "Finally it reads real wallet balances. A zero balance is a zero position—not a pretend rebalance opportunity."
- "This is the honest current boundary: live research, verifiable preflight, actual wallet observation, and hard-denied execution. No stock tokens purchased through Sentinel."

## Recording and evidence acceptance

- Full 16:9 screen recording at 1080p when possible; actual UI and native transitions. No fake toast, fabricated success modal, staged tx hash, pseudo-wallet screenshot, QR keys or synthetic portfolio chart.
- Captions over native product UI; soft/no soundtrack, natural speech if recorded. Prior excessive audio is explicitly **not** to be reused.
- Keep actual quote expiry visible; if expired or failing, call that out. Historical observed LiquidMesh route in `LIQUIDMESH_AUTHENTICATED_ROUTE_2026-10-09.md` is a **dated authenticated unsigned build**, not current tradable liquidity or a mined transaction.
- Wallet address is public but may be blurred; no seed phrase, developer API key, authenticated headers, Vercel secrets, private account identifiers or location/KYC screenshots.
- Use legal regional access; a Singapore server successfully quoting is NOT the owner's personal issuer eligibility.
- If the live simulator fails because USDT/BNB is absent, show the failure and its onchain public-wallet diagnostic without framing it as a fault or completed swap.
- Evidence journal is in-memory; refreshing the browser resets it, and a different connected wallet or basket invalidates it. Film within one session if showing the proof row.
- Final export must have duration at most 4:00, be accessible without sign-in, play fully, and include a verified stable public URL added to `SUBMISSION.md`. No URL exists yet; do not invent one.
- Report form is human-authored only; an AI-generated developer-experience report is ineligible per organizer guidance.

**Operator checklist:** [ ] Guided route loads [ ] inventory observed [ ] exact issuers selected [ ] real venue quote or explicit unavailable [ ] simulator result or explicit unavailable [ ] final execution release locked [ ] real wallet balance [ ] complete final cut [ ] privacy review [ ] video URL working [ ] submission receipt.
