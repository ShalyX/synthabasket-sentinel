# Sentinel × Binance Agentic Wallet — local quote handoff

**Integration status (October 8, 2026):** Sentinel already serves verified real signed Binance Web3 market inventory (488 BSC contracts, 448 stock tickers) and hosted SWAP quote-only requests. The official Agentic Wallet CLI was paired locally before. **No successful live Agentic Wallet CLI quote has yet been verified.** This milestone adds a local-only, user-operated handoff and a comparison UI.

## What this does

Open a live instrument dossier at https://synthabasket-sentinel.vercel.app/sentinel/markets/NVDA

1. Select the issuer contract (bStocks or Ondo). Sentinel constructs a read-only CLI quote command for 10 BSC USDT and the selected current contract.
2. Copy the command. Open PowerShell in the **standalone** SynthaBasket Sentinel repository on your own paired PC; paste it. It calls the official Binance *market-order quote* subcommand, never *market-order swap*.
3. The CLI response is piped directly to a local Node.js sanitizer (not saved raw). The sanitizer validates response source amount and symbols; it discards wallet/session information, quote IDs, and all other fields.
4. The sanitizer writes a small sanitized JSON file to the OS temp folder named sentinel-agentic-quote-observation.json.
5. Choose that file in the dossier's local import control. Sentinel compares it with the current hosted venue indication for the **same exact contract and amount**, if both are still fresh. Import happens entirely in the browser. No wallet data is uploaded or retained.

The local quote can be at most **2 minutes old** for live comparison. Hosted SWAP/RFQ venue indications are valid for **30 seconds**. A difference between the two quantities is **not** a trade signal, implied arbitrage, or a recommendation.

## Owner-operated instructions

Requires official Binance Agentic Wallet installed, connected, and authorized on the **owner's own computer**. The owner is responsible for checking product and jurisdiction eligibility, the target token, risk settings, and any quoting permissions. The owner must explicitly choose to run each CLI command.

In a PowerShell terminal:

    cd C:\Users\USER\source\synthabasket-sentinel

Then open the dossier and click **Copy safe quote command**; paste its full one-line command into that terminal. Example for the historically observed NVDAB contract (confirm the current address in the live inventory):

    baw market-order quote --fromTokenQty 10 --fromToken 0x55d398326f99059ff775485246999027b3197955 --toToken 0x02fca66c1d1afb4e2a7884261eb00f63598a7436 --binanceChainId 56 --json | node scripts/agentic-wallet-quote-handoff.mjs --ticker NVDA --platform bstock --token 0x02fca66c1d1afb4e2a7884261eb00f63598a7436 --symbol NVDAB --amount 10

It displays the saved local JSON file path. Import that file with the dossier's file selector, and request a fresh $10 hosted issuer quote above the comparison area. The website never gets your Agentic Wallet login, session, signature or transaction authorization.

**Official docs:** https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/market-order.md

## Verification and security limits

- The official CLI response for market-order quote documents source symbol, source quantity, target symbol and target quantity. Our sanitizer keeps only allowlisted, non-sensitive fields and records **execution disabled**.
- CLI quote response symbols are **not cryptographic proof of the target token contract**. The target address is *user-supplied command metadata*, validated against live inventory by the dossier. A maliciously crafted file can fabricate an observation. Never treat imported JSON as a signed attestation.
- The agentic quote's quantity and the hosted Binance Web3 route's quantity may differ due to routing, fees, slippage and timing. The comparison is information only.
- If the owner has tradeAllTokens=false or other restrictions, a particular quote may be rejected; the integration never changes wallet settings or silently attempts another command.
- The hosted public website never executes the CLI. The local sanitizer never invokes Binance Wallet itself, and never signs, swaps, broadcasts or approves a transaction.
- No *successful live Agentic Wallet quote* has been claimed here until the owner executes and independently validates the local procedure. Test fixtures below are synthetic, not real wallet quotes.

## Offline tests

    node --test scripts/agentic-wallet-quote-handoff.test.mjs
    npx tsx --test src/lib/sentinel/agentic-quote.test.ts

These ensure quote sanitizer rejects failed/mismatched output and discards raw secret fields; browser validation rejects stale, forged-permission, wrong-network, wrong-contract and mismatched-amount files.
