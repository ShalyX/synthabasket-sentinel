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
