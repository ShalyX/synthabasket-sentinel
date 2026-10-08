# Sentinel Agentic Wallet — Verified Read-only Integration

**Verified October 8, 2026 (builder's authorized Windows PC):** The official Binance Agentic Wallet CLI v1.10.0 was installed, Binance App pairing completed, and `baw auth verify` returned `{"success":true,"data":{"status":"SUCCESS"}}`. A subsequent independent `baw wallet status --json` returned **CONNECTED**. This proves the local wallet session was established at the time of testing; a later session may expire.

## Actual observations

| Test | Observed result |
|---|---|
| `baw --version` | 1.10.0 |
| `baw auth verify --qrCodeId ... --json` | `SUCCESS` |
| `baw wallet status --json` | `CONNECTED` |
| `baw wallet chains --json` | Supports BSC (`binanceChainId=56`) |
| `baw wallet settings --json` | Read-only settings request succeeded |
| High-risk transaction handling | `AutoReject` |
| Token permission scope | Restricted (`tradeAllTokens=false`) |
| Daily spend limit | Configured; limit value deliberately not logged |
| `node scripts/agentic-wallet-readonly.mjs status` | `{"ok":true,"mode":"status","connected":true,"status":"CONNECTED","tradesExecuted":0,"signaturesRequested":0}` |
| `node scripts/agentic-wallet-readonly.mjs chains` | `bscSupported: true` |
| `node scripts/agentic-wallet-readonly.mjs settings` | `limitedTokenScope: true`, `highRiskHandling: "AUTO_REJECT"`, `dailyLimitConfigured: true` |
| Local adapter tests | **4 passed, 0 failed** |
| GitHub CI (Node 22) | **Passed**, including read-only adapter tests: https://github.com/ShalyX/synthabasket/actions/runs/37755791315 |

Verification does **not** include balances, account eligibility, successful quote execution, onchain trades, approvals, EIP-712 signing, Agent Studio runtime, or automatic order placement. No raw wallet addresses, credentials, pairing QR IDs, sign-in tokens or private key material are committed.

## Safe adapter interface

The read-only CLI adapter lives at `scripts/agentic-wallet-readonly.mjs`. It deliberately allows only documented status, chain, settings and optional quote commands. On the builder's paired Windows PC:

```sh
node scripts/agentic-wallet-readonly.mjs status
node scripts/agentic-wallet-readonly.mjs chains
node scripts/agentic-wallet-readonly.mjs settings
```

Optional **quote-only example**, after independently verifying the specific token contract in the current live RWA inventory and checking eligibility:

```sh
node scripts/agentic-wallet-readonly.mjs quote 0x02fca66c1d1afb4e2a7884261eb00f63598a7436 5
```

The address was observed historically as a BSC NVDAB contract; do not treat it as permanently verified. This quote path has **not** yet been live-tested in the newly paired CLI session. The wrapper enforces an allowlist and cannot sign, approve, submit, swap, broadcast, or place orders. It redacts raw wallet data and does not expose an Agentic Wallet session through a public Next.js route.

## Session renewal

Session authorization must originate in the owner's Binance app. If disconnected or expired:

1. Locally run `baw auth signin --json`.
2. The owner must verify the generated `pairingCode` with the `urlForWeb` shown in Binance app; approve **connection only**, not spending.
3. Locally run `baw auth verify --qrCodeId <newQrCodeId> --json` and wait for `SUCCESS`.
4. Independently confirm `baw wallet status --json` is `CONNECTED`.
5. Verify wallet spending limits, restricted tokens, and AutoReject/confirmation settings in the Binance App.

Never paste a password, mnemonic, QR session token or private key into public logs or chat.

## Jurisdiction and product boundaries

Signed Binance Web3 RWA API requests from the Vercel/GitHub-hosted backend returned business code `40304` due to compliance restriction. Local wallet pairing **does not** resolve legal eligibility or authorize region/IP bypass. Seek Binance developer support for a permitted judge-accessible deployment (see `HOSTING_STATUS.md`).

The current achievement is a **genuine locally connected, read-only wallet SDK/CLI integration**, not end-to-end Agentic Wallet execution or eligibility for any special bounty. The deterministic Sentinel risk review is not a Binance Agent Studio agent.

Official docs:
- https://developers.binance.com/en/docs/products/agentic-wallet/quickstart/install-agentic-wallet
- https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/authentication.md
