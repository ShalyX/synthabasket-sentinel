# Ondo RFQ receiving address — October 8, 2026

## Observed, not assumed

The owner tested live NVDA issuer quote buttons on the Singapore-hosted Sentinel:

- **NVDAB (bStocks)**: actual BSC read-only aggregator quote returned a LiquidMesh `SWAP` route, with a small quoted NVDA output amount; no wallet address or transaction was needed for that quote.
- **NVDAon (Ondo)**: Binance returned business code `40001` and Sentinel previously displayed only `Binance API request failed (code 40001)`. No Ondo quote was returned.
- Both issuer inventory entries reported trading indicated. **This is not equivalent to an executable route or user eligibility.**

## Official source interpretation

Binance Web3 API defines **40001** as request parameter validation (missing/invalid/out-of-range required field); it documents the specific cause in the upstream `msg` field. Sentinel's existing error wrapper did not expose that `msg`, so the exact missing parameter for this specific request was **not** independently verified.

Binance documents `userWalletAddress` as **required when obtaining RFQ quotes**, including equity/RWA providers Ondo and BStock, because the RFQ's receiving wallet must match the one ultimately authorizing the order. By contrast, a regular non-RFQ SWAP quote can work without this field.

Sources:
- https://web3.binance.com/en/dev-docs/products/wallet-api/error-codes
- https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/trading-api — Get Aggregated Quote

## Mitigation

- Moved the public BSC receiving-address input directly before the two issuer quote cards. The user provides it voluntarily; Sentinel never auto-fills or uses a random address.
- For Ondo, preflight explains the public-address requirement instead of sending an incomplete RFQ request. This local validation returns HTTP 422 with code `PUBLIC_WALLET_REQUIRED`, clearly distinguishable from Binance's upstream numeric `40001`.
- bStocks routes remain allowed without a public address when a regular SWAP quote is available.
- A Binance upstream `40001` is now identified as parameter validation (HTTP 422) with a non-committal explanation. If an address was already supplied, the UI does **not** claim that missing-wallet is the cause; issuer/venue limits may still apply.
- The Execution Review basket-side public wallet field likewise flags when a basket contains Ondo.
- No addresses are stored in localStorage. The address is transmitted only during an explicit quote request, server-to-server Binance signing; no wallet API session, approvals, seed phrase, private key, contract write, execution request or transaction.

## Owner-confirmed Ondo success — October 8, 2026

After the public BSC receiving-address field and clearer RFQ validation were deployed, the owner retried the Ondo issuer's **Inspect $10 quote** action on the live NVDA dossier and explicitly reported **"valid quote ✅"**. This is direct user acceptance-test feedback that the Ondo quote flow now returns a valid quote in their environment. The earlier no-address test returned Binance business code `40001`.

**Evidence boundary:** the report confirms a successful read-only **Ondo** quote from the user's browser. The exact received token quantity, venue, response mode (`RFQ` or `SWAP`), slippage, timestamps and any RFQ eligibility conditions were **not supplied**, so none are asserted here. No wallet address is recorded in project docs. A quote does not prove regulatory eligibility or a completed purchase.

**Next verification if needed:** capture only non-sensitive quote metadata (provider, execution mode, token quantity, expiry, and reported impact) from the live UI. Never paste wallet session tokens, seed phrases, private keys or signing requests. No trade was requested or executed in this test.
