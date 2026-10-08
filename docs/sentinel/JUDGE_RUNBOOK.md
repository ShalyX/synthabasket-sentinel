# SynthaBasket Sentinel — Judge Reproduction Guide

**Repository:** https://github.com/ShalyX/synthabasket-sentinel
**Production:** https://synthabasket-sentinel.vercel.app
**Guided live demo:** https://synthabasket-sentinel.vercel.app/sentinel/demo
**NVIDIA dossier:** https://synthabasket-sentinel.vercel.app/sentinel/markets/NVDA
**Track:** BNB Hack: Tokenized Stocks Edition, Main Track
**Stack:** Next.js 15 / Node.js 22 / BSC mainnet (56) / Binance Web3 signed RWA Data and Trading aggregator quote API.
**Deadline:** 11 October 2026 at 12:00 UTC.
**Original Solana STOCKLANA:** separate project at https://github.com/ShalyX/synthabasket.

## Suggested live journey — 3 minutes

This is the actual deployed product, not a sample-data presentation. The public app's market feed uses server-side credentials for signed Binance Web3 RWA inventory. No venue quote amount is hardcoded as if live.

1. **The first 20 seconds:** Open the guided demo route. Check the signed-feed status and live issuer counts. On October 8, the production Singapore endpoint returned **488 issuer contracts / 448 tickers**; inventory can change.
2. **Inspect two NVIDIA wrappers:** Click **Examine NVIDIA**. The issuer dossier shows bStocks NVDAB and Ondo NVDAon as two different BSC contracts, with independently reported share references and token-to-share ratios.
3. **Inspect real $10 SWAP indications:** Click **Inspect $10 quote** for the bStocks contract. The user also successfully obtained an Ondo SWAP quote after supplying a **public BSC receiving address**. No wallet connection, secret key or transaction is required. Each issuer's venue, mode, amount, impact and 30-second expiry are displayed only if the actual signed quote request succeeds.
4. **Normalize exposures:** With a public BSC receiver supplied for the observed Ondo request, use **Inspect both $10 quotes** in **The Wrapper Test**. Sentinel computes quoted token output × token-to-share ratio, then the percentage difference in indicative underlying-share equivalent units for the **same USDT budget**. Stale, mismatched or ratio-invalid quotes cannot become a current comparison.
5. **Watch expiry:** At eight seconds remaining, the countdown turns amber. At expiry, the live verdict is removed; an earlier valid overlapping quote pair may appear as **REFERENCE ONLY / NOT EXECUTABLE** with a fresh-quote button. It is not a cached executable price.
6. **Build a basket:** Open Basket Studio and choose **THE COMPUTE STACK** if all legs appear in the current inventory. Adjust the allocations; the total stays exactly 100%. Set a $10–$250 BSC USDT research budget. This proposes allocations locally, not onchain.
7. **Inspect pretrade safeguards:** Open Execution Review with the basket selected, request current venue indications, and inspect issuer state, ratio-adjusted parity, reported impact and quote freshness. The result is advisory research only; never a signed order.

## Optional local Agentic Wallet evidence

The owner paired the official Binance Agentic Wallet CLI on a separate authorized Windows device and **successfully executed a read-only quote** for 10 BSC USDT to NVDAB. The local sanitizer emitted a small observation JSON that the owner could import in Sentinel. This is real **owner-operated local quote evidence** but **not an autonomous agent, wallet attestation, transaction, or wallet integration into the public cloud service**. A simultaneous fresh difference against the hosted venue was **not** independently confirmed. See AGENTIC_QUOTE_HANDOFF.md.

## Local reproduction

The public deployed site needs no judge-supplied developer API key. If reproducing the local source:

    git clone https://github.com/ShalyX/synthabasket-sentinel.git
    cd synthabasket-sentinel
    npm ci --legacy-peer-deps
    npm run dev

Open http://localhost:3000/sentinel/demo. Supply **your own legally permitted Binance Web3 developer credentials** as OC_API_KEY and OC_SECRET_KEY in gitignored .env.local for live signed API calls; never commit or display them. The runtime is pinned to Singapore sin1 on production, which demonstrates region deployment and past API access, **not jurisdictional approval**.

Validate the source with:

    npx tsx --test src/lib/sentinel/*.test.ts
    node --test scripts/agentic-wallet-readonly.test.mjs scripts/agentic-wallet-diagnostic.test.mjs scripts/agentic-wallet-quote-handoff.test.mjs scripts/deployment-region.test.mjs
    npx tsc --noEmit
    npm run build

CI: https://github.com/ShalyX/synthabasket-sentinel/actions/workflows/sentinel-ci.yml

## Honesty / scope boundaries

- **No swaps or purchases have been executed in this product.** It does not broadcast trades, sign wallet transactions, handle token approvals, issue onchain basket shares, or establish stock ownership. No invented receipt or fill is shown.
- **No autonomous Agent Studio integration.** There is no persistent x402-funded agent, deployed agent identity or permissioned autonomous order flow.
- **Not a best-execution guarantee.** Different issuer ratios, prices, fees and conditions mean raw token quantity alone is not comparable. Results expire and are solely informational.
- **No guaranteed access.** Binance regional, account and issuer constraints still apply. Hosted API calls may fail; Sentinel displays an explicit unavailable state rather than simulated quotes.
- **Main-track uncertainty:** Organizer guidance includes transaction simulation and demonstration with small live BSC amounts. Sentinel demonstrates real read-only integration but not that execution proof; judges must assess it accordingly.

## Submission

Official event: https://www.bnbchain.org/en/hackathons/tokenized-stocks
Submission form: https://forms.gle/yToDUzaDMwWnq6R6A
Developer Experience Report form: https://forms.gle/EUQ39xf54GHjC2ys5

A **personally written** and technically specific Developer Experience Report is mandatory and worth 25% of the total score. AI-generated DevEx reports are not accepted. A public repo and accessible deployment are required; a video **no longer than four minutes** is strongly recommended. See SUBMISSION.md and DEVEX_EVIDENCE_WORKSHEET.md.

**Not submitted until the owner completes both forms and retains actual submission confirmations.**