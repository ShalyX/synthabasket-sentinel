# BNB Tokenized Stocks — Binance Web3 RWA read-only spike

This branch contains an authenticated **read-only** market-data probe targeting BSC mainnet (chain ID 56). It does not execute trades, submit quotes, use Agentic Wallet, or deploy BNB Agent Studio.

## Credentials

Get **both** an API Key and a Secret Key from the Binance Web3 developer portal.

Put these in local `.env.local` (already gitignored):

```env
OC_API_KEY=your-key
OC_SECRET_KEY=your-secret
```

Never put the secret in `NEXT_PUBLIC_*`, commit it, or paste it into chat. Binance requires HMAC-SHA256 with the exact `/build`-prefixed path.

## Run

```bash
node --test scripts/bnb-rwa-smoke.test.mjs
node --env-file=.env.local scripts/bnb-rwa-smoke.mjs
```

The probe calls only the signed GET endpoints for RWA platforms, BSC token inventory, NVDA lookup and reference-versus-on-chain price. It records observed latency and errors for your developer-experience report.

## Execution gates

1. Verify actual supported equity tokens on BSC mainnet and live issuer/trading status.
2. Verify executable Trading API quote, including RFQ versus AMM behavior, expiry, liquidity and fees.
3. Independently simulate transaction on BSC mainnet.
4. Execute a tiny live trade only after explicit wallet approval and verify its receipt.
5. Integrate Agentic Wallet permissions separately; a normal Web3 API key is not an Agentic Wallet session.
6. Add BNB Agent Studio persistent runtime, ERC-8004 identity, ERC-8183 interface and self-funding only if the core mainnet demonstration is stable.

Official docs: https://web3.binance.com/en/dev-docs/authentication ; https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data ; https://www.bnbchain.org/en/bnb-agent-studio
