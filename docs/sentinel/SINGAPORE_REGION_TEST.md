# Singapore Region Diagnostic — 2026-10-08

Historical experiment on a now-deleted preview branch (`feat/sentinel-research-desk`) of the original Vercel project. It did **not** result in a verified Singapore execution. The independent Sentinel deployment is separate; the original Solana production branch and app were unchanged.

## Why

Developer-machine signed read-only Binance Web3 RWA inventory returned records, while signed calls from US-hosted Vercel and GitHub runners returned Binance business error `40304: Service not available due to compliance restriction`.

Community suggested trying a non-US server, including Singapore. That suggests a **hypothesis**, not authorization and not a known fix.

## Small controlled change

Add `export const preferredRegion='sin1'` only to Next.js Node.js route `src/app/api/sentinel/markets/route.ts`. `sin1` is Vercel's Singapore region. Leave quote API in its existing region; do not test quotes, wallet approvals or trades.

Deploy feature branch as Preview and verify:
1. GitHub tests, TypeScript and production build remain green.
2. Vercel's compiled market function is actually assigned to `sin1` rather than `iad1` (do not assume the source directive was honored).
3. Call read-only `GET /api/sentinel/markets` once and record HTTP status, public error code and token count. Never record HMAC secrets.
4. Compare with confirmed old Preview result: `HTTP 451`, `code=40304` from US-hosted backend.
5. Regardless of outcome, treat any successful connection as **connectivity evidence only**. Confirm the permitted hosting/jurisdiction arrangement with Binance support before declaring it an approved, judge-accessible production data path. Do not implement proxy/VPN IP masking or trading to bypass compliance gates.

Official references:
- https://vercel.com/docs/regions (`sin1`: Singapore)
- https://nextjs.org/docs/15/app/api-reference/file-conventions/route-segment-config (`preferredRegion` route config)
