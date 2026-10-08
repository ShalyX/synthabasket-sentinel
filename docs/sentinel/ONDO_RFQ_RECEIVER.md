# Ondo SWAP quote and public receiving address — October 8, 2026

## Problem and result

Sentinel's standalone Singapore-hosted (sin1) NVDA dossier offers issuer-specific quotes for two different BSC token wrappers. On the first test, a read-only NVDAB (bStocks) LiquidMesh SWAP quote succeeded without a public wallet address, while an NVDAon (Ondo) quote returned Binance business code 40001 (parameter validation). Sentinel initially displayed only a generic Binance API failure.

After the owner provided a **public BSC receiving address** in Sentinel's revised quote form, an Ondo quote succeeded. The owner then reported these complete non-sensitive quote-screen values for two **$10 USDT** requests:

| Field | bStocks — NVDAB | Ondo — NVDAon |
|---|---|---|
| Issuer | bStocks | Ondo Finance |
| Route type | **SWAP** | **SWAP** |
| Quote provider | LiquidMesh | LiquidMesh |
| Token output for $10 USDT | **0.04223466 NVDAB** | **0.04220982 NVDAon** |
| Reported price impact | 0.0000% | 0.0001% |
| Observed token mark | $236.8442 | $237.3572 |
| Token-to-share ratio | 1.000778 | 1.001715 |
| Adjusted premium / discount | +0.00% (rounded) | +0.00% (rounded) |
| Quote time remaining on screen | 18 seconds | 19 seconds |

**Crucial: BOTH successful routes are SWAP, NOT RFQ.** The public receiving address was useful on the Ondo SWAP request in this observed session. Provider identity (Ondo vs. bStocks) does not determine the route mode (SWAP vs. RFQ).

## Cross-issuer comparison: normalize the wrapper

Raw output shows **0.00002484 more bStocks tokens** for the same $10 input (roughly +0.05885% versus Ondo's token count). But wrapper conversion ratios differ:

- bStocks implied share exposure: 0.04223466 × 1.000778 ≈ **0.04226752 underlying share units**.
- Ondo implied share exposure: 0.04220982 × 1.001715 ≈ **0.04228221 underlying share units**.

The wrapper-adjusted exposure is **roughly 0.03476% higher on Ondo**, despite the raw token count being lower. This is a basic indicative normalization, NOT a best-execution claim. The quotes have brief validity windows, impact values may be rounded, and fees, execution conditions, route/liquidity changes and issuer terms may differ.

## What the earlier error means

Binance code **40001** is a request-parameter validation error. Binance's documentation says a public receiving address may be needed by RWA/RFQ quote routes. The earlier no-address Ondo request was rejected, while an address-supplied Ondo **SWAP** quote later succeeded. This strongly suggests a missing receiver parameter caused the earlier failure in that case; it does not establish that all Ondo SWAP routes require an address or that every wallet is eligible. The specific upstream message for the failed request was not captured.

Source docs:
- https://web3.binance.com/en/dev-docs/products/wallet-api/error-codes
- https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/trading-api

## Product behavior

- A public BSC quote-receiver field is shown **before** the issuer cards, not hidden below them.
- Sentinel explains the observed Ondo requirement, including the fact that the result may be SWAP or RFQ. A missing Ondo receiver is rejected locally with an informative HTTP 422 rather than making another known-incomplete upstream call.
- A bStocks regular SWAP quote can still be requested without an address.
- A Binance business code 40001 now reports parameter-validation uncertainty, rather than implying a trade failure or inferring a precise error field not exposed by the upstream response.
- A receiving address is sent only after an explicit quote request; no Binance Agentic Wallet session, seed phrase, private key, sign/approve request or trade is involved.

## Evidence limits

The results above come directly from the owner's live Sentinel screen, not an independent machine-captured HTTP transcript of both responses. No wallet address, session identifier or private credential is retained in the project documentation. No trade or asset movement was executed. A successful quote does not establish user jurisdiction, eligibility, or a guaranteed execution price.
