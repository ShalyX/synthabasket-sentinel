# Sentinel — Singapore Hosting Operations

## Deployment ownership

**Source:** https://github.com/ShalyX/synthabasket-sentinel (main)
**Vercel project:** synthabasket-sentinel / prj_PtLkeKCeUBBYtzcLjzAIFAeXLgRV
**Public application:** https://synthabasket-sentinel.vercel.app
**Target:** Next.js Node.js functions on BNB Chain research service

The standalone repo's `vercel.json` explicitly sets `regions: ["sin1"]`, Vercel's Singapore region. This is distinct from earlier route-level `preferredRegion` experiments, which did not relocate Node.js functions. The project-level Vercel function region must also remain `sin1`. Do not configure any US fallback region for Sentinel's signed Binance data routes without evaluating upstream access restrictions. The Vercel edge ingress label is not the function execution location.

## Production credentials

Production-only, sensitive variables configured on the dedicated Sentinel project:

- `OC_API_KEY`
- `OC_SECRET_KEY`

Never place secret material in the GitHub repository, build output, screenshots or browser code. Do not copy keys into the separate STOCKLANA project. The signing module reads secrets only from server-side environment variables.

## Verification

After deployment, verify:

1. Vercel reports state READY and region `sin1` for the current deployment.
2. The read-only `GET /api/sentinel/markets` returns HTTP 200, populated real BSC token inventory and a routing header like `X-Vercel-Id: ...::sin1::...`.
3. The Market Index displays a connected feed, inventory counts and ticker rows, not fabricated prices.
4. Validate the quote endpoint independently with a supported, live inventory token using a **read-only venue quote**, without authorizing trading, signing or moving funds. An unsuccessful quote should remain an explicit unsupported state, not a simulated fill.
5. Check the original STOCKLANA URL and Vercel/GitHub repository mapping are unchanged.

## Results at initial successful rollout — October 8, 2026

A signed Binance BSC RWA inventory response returned **HTTP 200**, **488 contracts** and **448 tickers** from an actual Vercel `sin1` serverless function. Chrome Market Index QA showed `Feed connected`, 488 contracts and 448 ticker groups. The earlier US-hosted requests failed with business code `40304`.

The observed results support Singapore hosting as a working technical configuration. They **do not, on their own, establish jurisdictional or account eligibility**, and do not imply that Binance has certified or approved this particular deployment.

## Rollback

If the data route fails, preserve the explicit upstream-unavailable state. Do **not** silently substitute benchmark prices, VPN routing or another region. Review logs/status and coordinate with Binance support as appropriate. No wallet transaction is triggered by deployment or market inventory checks.
