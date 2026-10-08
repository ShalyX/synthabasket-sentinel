# SynthaBasket Sentinel — judge runbook

## Project and exact build

Repository: https://github.com/ShalyX/synthabasket
Development branch: `feat/sentinel-research-desk`
Hosted read-only preview: https://synthabasket-ajhjg73ic-shalyxs-projects.vercel.app/sentinel
Live stock data in hosted preview **is currently blocked** by Binance business code `40304`; see HOSTING_STATUS.md.

Sentinel is separate from the original Solana SynthaBasket app. It offers BSC tokenized-stock issuer discovery, ratio-adjusted parity analysis, a thematic basket studio, and read-only pre-transaction quote/policy review. It does not submit, approve, sign or execute trades, nor does it claim Binance Agentic Wallet or Agent Studio integration.

## Reproduce in an eligible environment

Requirements: Node.js **22.x**, npm, a Binance Web3 Developer API key and secret, and access that is **permitted under Binance's terms and your jurisdiction**. Do not use unapproved tunnels or IP masking to evade restrictions.

```sh
git clone --branch feat/sentinel-research-desk https://github.com/ShalyX/synthabasket.git
cd synthabasket
npm ci --legacy-peer-deps
```

Create a local, **untracked** `.env.local`:

```dotenv
OC_API_KEY=your_personal_api_key
OC_SECRET_KEY=your_personal_secret_key
```

Start:

```sh
npm run dev
```

Open `http://localhost:3000/sentinel` and visit:

1. **The Brief** (`/sentinel`) — observes source availability and underlying-to-token price math.
2. **Market Index** (`/sentinel/markets`) — searches verified BSC Ondo/bStocks inventory.
3. **Instrument Dossier** (`/sentinel/markets/NVDA`) — issuer-specific token contracts and conversion-adjusted basis.
4. **Basket Studio** (`/sentinel/baskets`) — choose up to four different underlying tickers and adjust weight to exactly 100%.
5. **Execution Review** (`/sentinel/review`) — request per-leg SWAP or RFQ quotes with optional public EVM wallet address; inspect time-limited quote and deterministic guard verdict.

Never provide a private key, seed phrase or wallet signature. Wallet address in quote input is optional and public. Executions are intentionally locked.

## Verify code independently

```sh
npx tsx --test src/lib/sentinel/*.test.ts
npx tsc --noEmit
npm run build
```

GitHub Actions tests and Next.js production build passed on October 8, 2026; see CI records on the branch. See `../BNB_RWA_OBSERVATIONS.md` for historical real API evidence, including two honest simulation failures from an unfunded wallet.

## Demonstration and score integrity

The preview can display unavailable feed states; **this is not a live-data success claim**. A judge in an unsupported region may likewise receive a compliance error. The project follows fail-closed behavior: it does not substitute fabricated stock prices or pretend a quote is an executed trade.

Official hackathon rules allow repo + demo + deployed link or reproduction instructions. A developer-experience report is mandatory and counts for 25% of judging; per the organizers, it must be personally authored by the builder, not AI-generated.

https://www.bnbchain.org/en/hackathons/tokenized-stocks
