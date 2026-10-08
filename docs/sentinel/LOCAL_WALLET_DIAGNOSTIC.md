# Sentinel → Agentic Wallet: local diagnostic handoff

Updated 2026-10-08. This is a **read-only integration**, not wallet execution or a live quote.

## What is actually working

- Official Binance Agentic Wallet CLI pairing returned SUCCESS and the local CLI independently reported CONNECTED.
- BSC (chain ID 56) is supported.
- Binance wallet security settings were read locally: AutoReject for high-risk requests, token trading restrictions enabled, daily spending limit configured.
- `scripts/agentic-wallet-readonly.mjs` exposes a small allowlisted surface for checking status, chains, and settings. It contains a quote-only parser, but **we have not successfully verified a live Agentic Wallet quote in this milestone**.
- `scripts/agentic-wallet-diagnostic.mjs` generates a sanitized JSON file on the user's own PC by running **only** those three read-only checks. A recent local run succeeded. The file is not included in Git and contains no wallet addresses, raw CLI payloads, session token, secrets, quote IDs, approvals or transaction commands.

## Use the browser handoff

1. On the PC where the Binance Agentic Wallet CLI is installed and paired, run:
   ```sh
   node scripts/agentic-wallet-diagnostic.mjs
   ```
2. The generated file is `%TEMP%\\sentinel-wallet-readiness.json` on Windows.
3. Open Sentinel → **Execution Review** → **Wallet / Local Device**. Choose the file using the native file picker.
4. The browser validates the exact, read-only JSON schema, displays the observed connection and security settings, and marks checks older than ten minutes stale.

**Privacy:** This flow uses the browser's local File API; it does not POST the file, upload wallet data to Vercel, establish a browser wallet connection, or retain diagnostic state in localStorage. The app treats the file as a **user-supplied snapshot, not a cryptographically signed proof of a current session**. It can never grant permission to spend, approve, swap, sign or broadcast.

## Review gates

The original Binance Web3 quote endpoint in Execution Review remains independently gated by authorized market inventory and upstream Binance availability. A valid imported wallet diagnostic cannot unlock quote access when the live market API returns `40304`, and it does not prove account/regional eligibility. Quote results and all transaction actions remain fail-closed.

No special bounty eligibility is asserted simply because the local CLI is paired.

## Validation

- `node --test scripts/agentic-wallet-readonly.test.mjs scripts/agentic-wallet-diagnostic.test.mjs`
- `npx tsx --test src/lib/sentinel/*.test.ts`
- Hosted CI runs Next.js build and TypeScript checks with Node 22.
- Local Windows Node 24 development dependencies were partially installed during earlier npm networking failures; local `tsc` errors related to missing Next declaration files do **not** establish production CI failure. Use locked CI dependencies as the authoritative gate.

Original integration evidence: `AGENTIC_WALLET_PROOF.md`. Hosted `40304` diagnosis: `HOSTING_STATUS.md`.
