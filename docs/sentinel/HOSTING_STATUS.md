# Hosted Binance Web3 access — verified blocker (2026-10-08)

## Reproduced environments

| Environment | Request | Result |
|---|---|---|
| GitHub Actions | Signed GET RWA stock inventory | HTTP 200, business code `40304`, `Service not available due to compliance restriction`. |
| User Windows PC on direct local network | DNS lookup for `web3.binance.com` | `ENOTFOUND`, no API response. |
| Same PC during VPN-based connectivity experiment | Signed read-only RWA request | Genuine BSC inventory and quotes; this **does not** establish service/jurisdiction eligibility or authorize circumvention. |
| Initial Vercel Preview | `GET /api/sentinel/markets` | HTTP 503, Binance credentials missing in Vercel. |
| New Vercel Preview after encrypted Preview-only, branch-scoped secrets | `GET /api/sentinel/markets` | **HTTP 451**, public app error `Binance restricts RWA data access from this server environment`, `code: 40304`. |

Current Preview URL: https://synthabasket-ajhjg73ic-shalyxs-projects.vercel.app/sentinel

**Conclusion:** Secrets/signing are configured; current Vercel server access is blocked by a compliance gate. We cannot infer whether the cause is IP geography, account entitlement, or a combination from `40304` alone. Changing deployment regions or proxy routing solely to evade restrictions is not an acceptable deployment strategy.

## Documentation discrepancy

Binance Web3 API Error Codes (last modified September 1, 2026):
https://web3.binance.com/en/dev-docs/products/wallet-api/error-codes

It explicitly lists compliance codes `40301`, `40302` and `40303`, but does **not** document the observed `40304`. The API uses HTTP 200 for business errors; Sentinel's server maps business code `40304` to public HTTP 451 and displays a truthful restriction message.

## Support request (facts, not secrets)

Official hackathon builder group:
https://t.me/+MhiOLT0YUnlmNWFk

> We're building SynthaBasket Sentinel for BNB Hack: Tokenized Stocks Edition. Our signed Binance Web3 RWA calls pass HMAC unit tests, and a locally performed read-only test returned live stock inventory and SWAP quotes. However, GitHub Actions and the Vercel Preview runtime both receive business code 40304 ("Service not available due to compliance restriction") on `GET /build/api/v1/dex/market/rwa/tokens?binanceChainId=56`. Vercel secrets are present, branch-scoped and encrypted. The published docs list 40301–40303 but not 40304. Could you clarify whether this restriction is applied to the originating hosting IP, developer account jurisdiction/eligibility, or both? Is there an approved approach to running this API from a judge-accessible backend? We do not want to circumvent geographic compliance gates. The submission deadline is October 11, 12:00 UTC.

Do not share API keys, secrets, private wallets, signing material or raw request headers in support conversations.

## Deployment fallback if unresolved

The official hackathon allows a deployed link **or instructions that a judge can follow**. Provide a working repository with a reproducible local environment and a recorded demonstration from an authorized environment; see `JUDGE_RUNBOOK.md`. Do not falsely call a restricted hosted preview live. The user must personally write the required DX report.

Event terms: https://www.bnbchain.org/en/hackathons/tokenized-stocks

Production keys were not changed. Only the named feature branch's Vercel Preview contains the sensitive environment variables.

## After independent repository migration (2026-10-08)

Current app is **https://synthabasket-sentinel.vercel.app** from **https://github.com/ShalyX/synthabasket-sentinel**, with independent Git history and Vercel project. The two earlier `OC_*` credentials were **removed** from the original Vercel project's branch-specific preview settings. The new project has not been provisioned with Binance secrets. It responds with **HTTP 503: Binance credentials are not configured**, distinct from historical signed HTTP 451/40304 tests.

Do not treat any previous mention in this file of 'currently present preview credentials' as the present configuration; those were a temporary diagnostic on a now-deleted branch. Any future permissioned data provider should be configured independently for Sentinel following Binance's account/jurisdiction rules and without affecting the STOCKLANA project.
