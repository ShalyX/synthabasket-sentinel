# Sentinel research and source record
Official event: https://www.bnbchain.org/en/hackathons/tokenized-stocks
Binance Web3 developer docs: https://web3.binance.com/en/dev-docs/authentication
Observed live integration facts: ../BNB_RWA_OBSERVATIONS.md
2026-10-08 Windows machine after VPN: BSC inventory 488 tokens (Ondo 442 / bStocks 46), including NVIDIA across issuers.
RWA attributes from real API: underlyingTicker, referencePrice, tokenPrice, tokenToShareRatio, statusInfo.openState and marketStatus, tokenContractAddress, decimals.
BSC USDT for observed quotes: 0x55d398326f99059ff775485246999027b3197955; 18 decimals verified via RPC.
Supported modes in observed route: LiquidMesh SWAP for NVDA through both issuers; historical Ondo error 40001 without wallet reference. Do not hardcode issuer-to-mode mapping.
Unresolved: account trade eligibility and hosted data residency/access. DNS / service compliance restrictions differ. Public hosted UI may show an explicit unavailable state until legitimately hosted in supported conditions.
No fake quotes, stock price series or historic performance are to be invented.
