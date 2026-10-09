# Sentinel M4 — live LiquidMesh route and issuer-contract audit

**Status: BLOCKED / NOT CLEARED TO TRADE** — 9 October 2026. No approvals, swaps, signatures or broadcasts were made as part of this audit.

## Verified facts (read-only)
- Chain is BNB Smart Chain, chainId 56. BSC USDT used by Sentinel: `0x55d398326f99059ff775485246999027b3197955`, decimals 18 per existing protocol code.
- The **current production Sentinel signed RWA inventory** returns NVDAB bStocks at `0x02fca66c1d1afb4e2a7884261eb00f63598a7436` with 18 decimals. This agrees with BscScan's NVDAB token entry; it is not a synthetic/devnet mirror.
- Independent read-only `eth_getCode` and `eth_call` using the BNB Chain published JSON-RPC endpoint confirmed NVDAB is a **BeaconProxy** at the address above, with beacon `0x156d6dce9a4f6139a3406f1f021f1a4880de93a3`, whose live implementation() response was `0xcfed6c4679297ea4889f8183bc057b4a86c64e46`. NVDAB proxy and its implementation have nonempty deployed code.
- Code fingerprint observations (SHA-256 of raw deployed bytecode, not Keccak/EVM EXTCODEHASH):
  - USDT: `a5a6d887c581c25cba4104e4281a530044ba59d718e62cdaa80ef89900299d50` (4,413 bytes)
  - NVDAB proxy: `cab8def0d66267b06413aa602595cddeef26d118e1aa3ce8795139a4b518aa7d` (283 bytes)
  - Beacon: `8fcfd53bedda9ff9f8b672da979fc5b8b563a3b61dcf9b32c5c075390000312f` (644 bytes)
  - Implementation: `814fc45a704716dbda5b91791b69b7780924f66ae604606d670bded136bc339c` (10,836 bytes).
- The beacon and implementation MAY upgrade. Pinning only proxy or issuer-token address is not an adequate pretrade security review. A second independent public RPC check was attempted and timed out, so these hashes have one RPC observation (plus BscScan public description), not independent quorum verification.

## Gaps / reasons for NO GO
- **LiquidMesh router address: NOT YET OBSERVED from a real authenticated build.**
- **Quoted approveTarget spender: NOT YET OBSERVED in an auditable signed build.**
- **Actual four-byte swap selector and raw calldata ABI: NOT YET INDEPENDENTLY DECODED.**
- The M4 prototype allowed configured router/spender/selector lists but did NOT establish the decoded recipient, minOut, input token, input quantity, expiry and all downstream onchain effects. A router + selector allowlist alone is not a calldata audit.
- A read-only single-leg audit probe was deployed on a **preview** from the current branch. That endpoint failed with `Binance credentials are not configured on this server.` Production credentials are intentionally production-only. Do not circumvent geographic/access restrictions or copy those credentials into a public preview merely for this probe. Delete the temporary route after this audit pass.
- Real BSC wallet previously had **0 USDT** and dust BNB. A funded transaction simulation and an actual user-confirmed purchase remain untested.
- **Eligibility NOT verified:** Binance's official bStocks FAQ specifically requires third-party integrators to enforce geographic restrictions using a country-eligibility REST API. The exact current endpoint and authoritative user/wallet eligibility remain unresolved. Market-inventory `tradingAvailable` is NOT jurisdictional authorization. Until independent jurisdiction verification is implemented, do not allow a bStocks purchase.
- M4 auth must remain disabled even if operator config sets environmental allowlists; implementation uses a **hard fail-closed ABI semantic guard** until an audited decoder exists.
- BStocks rebasing/multiplier and upgradeable implementation complicate interpretation of token balance changes and require issuer-aware settlement rules.

## Implemented fail-closed controls in this tranche
- Require builder `minReceiveAmount` and `slippagePercent` to match the 0.50% quote window.
- `verifyKnownRouterSemantics()` rejects all live authorizations until actual verified ABI decoder is implemented. No secret, admin flag or allowance override can bypass this in present source.
- Public `/api/sentinel/settlement` independently matches receipt chain/hash/sender/target and inventory token; checks ERC20 Transfer logs, historical balanceOf snapshots at pre/post mined block (when available), and at least three observed block confirmations. If archival RPC balance data are missing, it returns INCOMPLETE rather than claiming token delivery.
- Onchain settlement cannot by itself prove legal ownership rights, economic fill, quote-bound calldata or finality. These require separate proof.

## Authoritative references
- Binance Web3 API Trading API: https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/trading-api
- Binance bStocks FAQ (eligibility/geo enforcement): https://www.binance.com/en-NG/support/faq/detail/f0c03cd6509a4085b4cce1636f16be38
- Binance bStocks terms announcement: https://www.binance.com/en-AE/support/announcement/detail/2c0c92ed15ac42d1b14bb1eac00d22bb
- BscScan actual token: https://bscscan.com/token/0x02fca66c1d1afb4e2a7884261eb00f63598a7436
- Official public BNB RPC: https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/json-rpc-endpoint/
- Locally reproducible issuer contract fingerprint probe: `node scripts/audit-bsc-token.cjs` (public RPC, no signing).

## Remaining acceptance tests before mainnet spend
1. Obtain current valid route evidence in an **authorized credentialed environment**; record actual router, spender, selector, full calldata (privately), and quote minOut / expiry.
2. Confirm router and spender on BSC with verified source, implementation/proxy ownership, verified ABI, code hashes, allowance behavior and upgrade risks.
3. Implement ABI-specific calldata decoder and compare recipient/input/output/amount/minOut/deadline; add mutation tests and guard against arbitrary external calls or untrusted callbacks.
4. Integrate issuer provider's geographic eligibility checks; no guessed country whitelist or evasion.
5. Re-evaluate gas, allowance and simulation with a funded eligible user, minimum budget, exact user wallet confirmations.
6. Verify the issued transaction on BSC, relevant token Transfer events, historical pre/post ERC-20 balances, fees and expected minimum output. Publish only public, non-sensitive receipts.
