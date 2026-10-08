# Sentinel requirements / acceptance
R1 Live discover: /api/sentinel/markets queries signed RWA inventory on BSC 56 and sanitizes to known issuers and contract addresses. Verify observed record count.
R2 Price integrity: compute (onchain token price / (underlying reference × token-to-share ratio) − 1) × 100. Missing reference/ratio yields no comparison.
R3 Compare: select a stock ticker and show provider-specific tokens and issuer trading states. Never assume all providers quote.
R4 Basket: select up to 4 distinct underlying stocks, choose issuer, redistribute allocations to exactly 100%, editable amount.
R5 Quotes: obtain fresh Binance quote per basket leg (amount in BSC USDT base units), expose mode/vendor, not quoteId/transaction calldata.
R6 Policy: explicit cap and fail-closed checks for status, reference-adjusted basis, price impact and expiry; review ≠ permission to trade.
R7 States: loading, retry, upstream compliance failure, expired quote, missing route, unavailable provider, small-screen table.
R8 Safety: no API keys in browser, signed transactions, automatic approvals or order submission; throttle quotes, validate inputs.
R9 Proof: clean CI build, unit tests, live local API screen capture, recorded timestamps and route samples.
R10 Hackathon: BSC mainnet asset integration and Binance Web3 API, proof and personally authored developer experience report. Agentic Wallet and Agent Studio separate until verified.
