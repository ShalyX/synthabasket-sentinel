# SynthaBasket Sentinel — Standalone Project Status

**October 8, 2026.** This is the independent BNB Chain Sentinel application, not the original STOCKLANA Solana index protocol.

- **GitHub:** https://github.com/ShalyX/synthabasket-sentinel — `main`, independent root commit `743e938`, with no inherited STOCKLANA Git ancestry.
- **Vercel:** https://synthabasket-sentinel.vercel.app — independent project `synthabasket-sentinel` linked to this repository; all five research views deployed.
- **Original STOCKLANA remains:** https://github.com/ShalyX/synthabasket and https://synthabasket.vercel.app. Its `main` commit was independently verified unchanged as `281b127` after the split. The original repo's two Sentinel feature branches were deleted once the independent repository was pushed and its production site validated.
- **Source isolation:** Removed Solana program, Solana app routes, Solana-specific API routes, legacy CI and Solana-only dependencies from the standalone copy. The original repository was not modified during the extraction.
- **Secrets:** No personal local environment or wallet credentials were copied. Old preview-only OC_API_KEY/OC_SECRET_KEY in the original Vercel project were deleted. The new Vercel project has no Binance API credentials pending a permitted data hosting solution.
- **CI:** New Node 22 workflow runs all data/policy/diagnostic tests, TypeScript and production Next.js build. See https://github.com/ShalyX/synthabasket-sentinel/actions/workflows/sentinel-ci.yml.
- **Locally verified wallet:** official Binance Agentic Wallet CLI successfully paired, CONNECTED, BSC supported, high-risk AutoReject, restricted trade tokens and a configured daily cap. The app's private import of a sanitized read-only diagnostic was browser-tested at 390px. **Live Agentic Wallet quote remains unverified.**
- **Market feed:** Hosted Binance API compliance code 40304 was verified on the previous signed US preview. This independent Vercel project currently reports 503 until approved credentials/hosting are available. Do not claim the site shows live stock data.
- **Singapore:** A route-level `preferredRegion='sin1'` was requested on the old preview, but its function still ran in `iad1`. No genuine Singapore request was verified. There is no circumventing proxy or region-hopping fallback.

**Next priorities:** authorized live market-data hosting; verify permitted venue quote in a compliant environment; finish judge-facing demo and user-written developer-experience report. No claims of executed trades or autonomous Agent Studio integration.
