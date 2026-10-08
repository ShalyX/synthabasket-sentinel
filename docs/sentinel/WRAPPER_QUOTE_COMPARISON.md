# Wrapper-adjusted venue quote comparison

Implemented on the standalone Sentinel instrument dossier, directly beneath the two issuer cards:

https://synthabasket-sentinel.vercel.app/sentinel/markets/NVDA

## What the investor sees

One click **Inspect both $10 quotes** requests read-only, issuer-specific Binance Web3 quote indications for the same underlying. If Ondo is present, the user must explicitly supply a public BSC receiving address first; the app never requests a private key, session, approval or wallet signature.

Each issuer is presented as a three-step ledger:

1. Actual current quote **token output** for $10 USDT.
2. The specific token-to-share ratio reported in Binance RWA inventory.
3. **Underlying-share-equivalent exposure** = token output × token-to-share ratio.

When both quotes are less than 30 seconds old and share the same stock, issuer contracts and budget, the panel calculates which issuer has the higher **indicative converted exposure** and displays the percentage difference relative to the lower exposure.

A comparison is deliberately **not** calculated for expired, missing, mismatched ticker/contract/provider/budget, nonpositive quote amounts, or absent/invalid conversion ratios. Policy warnings remain visible.

## Verified mathematical fixture from the owner's actual quote screen

These are owner-supplied **historical sample readings**, embedded only in unit tests and documentation to prove the math. They are **not** embedded into production UI as live quotes.

| Metric | bStocks | Ondo |
|---|---:|---:|
| Budget | $10 USDT | $10 USDT |
| Token output | 0.04223466 NVDAB | 0.04220982 NVDAon |
| Token-to-share ratio | 1.000778 | 1.001715 |
| Share-equivalent output | 0.04226751856548 | 0.04228220984130 |
| Quote mode / venue | SWAP / LiquidMesh | SWAP / LiquidMesh |

The raw token count favors **bStocks**, while the wrapper-adjusted exposure from these particular short-lived quotes favors **Ondo by about 0.0348%**. Difference in share-equivalent units: **0.00001469127582**.

This is **not a recommendation, a legal ownership claim, a fee-adjusted best-execution assessment, proof of settlement, or a guaranteed conversion**. Ratios, vendor conditions, available liquidity, slippage and quotes can change, and quote observations are not simultaneous. The live UI recomputes from the most recent accepted API response and current issuer metadata.

## Safeguards and UX

- The panel only appears for a ticker with both verified bStocks and Ondo contracts.
- The individual issuer quote buttons remain available; the one-click pair request shares their existing read-only fetch flow.
- The paired quote button needs an explicitly provided valid public BSC receiving address for Ondo. No autofill, no key signing.
- One stale quote automatically invalidates the cross-issuer comparison at the 30-second mark, rather than showing a historical winner as current. Freshness countdown is derived from the earlier-expiring quote.
- If a reference ratio is missing, the output shows **—** and explains why; no fabricated prices or substituted share units.
- The percentage denominator is the *lower* normalized exposure, with the issuer name identifying which indication is higher.
- Mobile layout displays issuer ledgers vertically. No progress bar magnifies a sub-0.1% difference visually.
- The feature has no database, no transaction signing and no on-chain state changes.

## Reproduction

    npx tsx --test src/lib/sentinel/wrapper-comparison.test.ts
    npx tsc --noEmit
    npm run build

The tests include the actual historical owner-supplied quote sample, reversed raw/normalized ranking, equal-share exposure, stale quotes, missing conversions, mismatched budgets/contracts/providers, and blocked-policy warning.

For browser QA, inject synthetic quote responses only into a local test-browser session while using the live issuer inventory, so neither an artificial receiving address nor a fake quote is sent to Binance. These QA fixtures are never emitted by the production app.

## Production browser verification — October 8, 2026

Tested after standalone production deployment `f50d09a`, serving in Singapore `sin1`:

- Live `/sentinel/markets/NVDA` loaded two genuine inventory records and the initially empty comparison; with no public BSC receiving address the combined quote action was correctly disabled.
- To avoid submitting a fabricated public receiver to Binance, a **local Chrome DevTools QA-only interception** replaced exactly the two browser quote POST responses with **clearly synthetic fixtures** using the user's previously observed token amounts. Market inventory, contract addresses and current conversion ratios remained **real and live**.
- A synthetic public `0x` address was entered into the **isolated QA browser only**; the interception confirmed both $10 issuer quote requests stayed entirely local and never reached Binance.
- Clicking the new combined action produced `data-comparison-status=ready`, normalized bStocks exposure `0.04226753`, normalized Ondo exposure `0.04228222`, and headline **Ondo +0.0348%**. The observed current ratios were **1.000778224** and **1.001715249**, slightly more precise than the historical six-decimal display; normalized output matched the actual live ratios to within `2e-8`.
- **390px mobile:** browser `innerWidth=390`, `document.documentElement.scrollWidth=390`; no horizontal scrolling.
- After the browser's *local test clock* jumped forward by 31 seconds, state changed to `expired`, the winner headline disappeared and normalized outputs became dashes.
- Unit tests, TypeScript checks and the production build passed. **No real paired Binance quotes were issued by this synthetic browser test**, and no wallet session, approval, trade, or transaction was involved.

As a precision improvement, the issuer price cards now display up to **nine decimal places** for token-to-share conversion ratios, matching the precision used in the normalization panel instead of displaying only six.

## Quote lifecycle polish — October 8, 2026

The owner tested a real live NVDA wrapper comparison and captured **two seconds remaining** on the shorter quote. The product originally hid its current verdict abruptly at expiry. This release adds an explicit lifecycle:

- **LIVE (30–9s):** an animated 30-second progress track shows the minimum remaining lifetime across both issuer quotes, with a live countdown. Time derives from actual quote response timestamps.
- **CLOSING SOON (8–1s):** the track and panel gently shift to amber, with an "Almost gone" message and the existing **Refresh both quotes** action. No automatic re-quoting, wallet connection, or execution.
- **EXPIRED (0s):** the green live verdict disappears, the lifetime track empties, and the header explicitly says "QUOTE WINDOW CLOSED". Current-exposure cells become dashes.
- **PREVIOUS OBSERVATION:** if and only if the same validated pair had overlapping 30-second quote lifetimes, an archival panel remains readable. It displays the earlier calculated share-equivalent amounts and previous difference, clearly stamped **REFERENCE ONLY / NOT EXECUTABLE**. This is not a live winner or guaranteed executable price.
- **GET FRESH COMPARISON:** the expired panel includes a prominent button to refresh both $10 quotes via the existing read-only API. No trading permissions requested.
- **REFRESHING:** the panel explicitly reports that new quotes are pending. Old values cannot masquerade as new live results.

Archival safety: no archive is constructed when issuer ticker, contract, provider, input budget, or conversion ratio is invalid or mismatched, or the two quotes' timestamps are 30+ seconds apart. Nothing is stored in local storage or persisted across visits. The archival share-equivalent numbers are reconstructed from the two genuine quote amounts and the currently reported inventory conversion ratios; ratios may change, so the archived view remains illustrative.

Accessibility/motion: the lifetime track is a labeled 0–30 second progressbar; per-second text is intentionally not live-announced to screen readers. Motion respects operating-system reduced-motion preferences.

## TTL validation

    npx tsx --test src/lib/sentinel/wrapper-comparison.test.ts

Tests include the eight-second warning boundary, strict expiry at zero seconds, and historical reconstruction only for previously valid overlapping quote pairs. Browser QA uses locally intercepted synthetic quote responses and a shifted test-browser clock, never fabricated requests sent to Binance.

### Deployed end-to-end browser verification — October 8, 2026

Production commit **f1278d5** was READY on Vercel in Singapore **sin1**; GitHub CI was SUCCESS. An isolated Windows Chrome DevTools browser loaded the **actual production page and live BSC issuer inventory** and locally intercepted only the quote POST requests with clearly **synthetic QA response objects** (using the owner's earlier observed token outputs). No artificial wallet address or quote request was sent to Binance.

The browser test demonstrated:
- Initial view showed the live inventory, both issuer cards, disabled combined quote action until a valid public receiver was entered.
- Two synthetic $10 quote POST responses rendered the live normalized wrapper comparison. Four total intercepted requests were observed after using the refresh recovery action.
- At a test-clock offset of +23 seconds, the UI entered **closing** and showed **CLOSING SOON · 6s** while retaining the still-valid live result.
- At +31 seconds, it entered **expired**, set the accessibility progress value to **0**, hid the live headline and active normalized values, and showed a clearly marked **REFERENCE ONLY / PREVIOUS OBSERVATION** with the expired results.
- The **Get fresh comparison** control successfully restored an active pair and removed the expired archive.
- On a **390px** browser viewport, measured document width was **390px** (no horizontal overflow).
- **34** TypeScript model/policy tests, **10** Node security/deployment tests, a TypeScript check, and Vercel/GitHub production builds passed.

These results verify only the new browser UX and its logic. They are not evidence of new live Binance prices or any transaction execution.
