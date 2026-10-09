# Sentinel — LiquidMesh vendor documentation and issuer eligibility diligence
**2026-10-09 · Verdict: VERIFIED CONTRACT PROVENANCE IN PART; LIVE EXECUTION STILL BLOCKED**

## New official LiquidMesh router documentation

LiquidMesh's own [Smart Contracts page](https://docs.liquidmesh.io/docs/smart-contracts) identifies a cross-chain EVM router at:
- BSC **official LiquidMesh router** `0x3d90f66b534dd8482b181e24655a9e8265316be9`.
- Default LiquidMesh ERC-20 **approval contract** `0x8157a9d65807521fbb8db8f37eeecefdd247e9b1` (vendor also documents a `GET /v1/<networkId>/get-approve-address` endpoint).
- It explicitly says the direct LiquidMesh API returns `callMsg.to/data/value` for its router. These refer to **direct LiquidMesh API** flows, NOT automatically a Binance Web3-aggregated flow.

**Distinct outer route:** Our authenticated Binance Web3 swap build targeted **different** BSC contract `0xb44446b0c8e56988c34f7ff73ae904982b5fdda5` and quoted this same address as spender. It had selector `0xad43f73d`, whose active Diamond-style facet is `0xa9fa1b56f4d7bd25375c2d40b4c8e36a9509e603`. The official LiquidMesh router address `0x3d90…` appears as **word 2 of its 10-word outer calldata envelope**, while the remaining 4,580 bytes of nested routing instructions are not decoded. Thus this appears to be an **outer Binance aggregation/dispatch contract plus an inner LiquidMesh router**; we have NOT verified all delegatecall/call semantics. A direct LiquidMesh approval spender `0x8157…` must **NOT** replace or be combined with Binance's independently quoted spender `0xb444…`.

## Verified contract bytecode and provenance (independent read-only BSC RPCs)

Two independent public BSC RPC providers agreed on all observed code and storage below:

| Contract | BSC observation | SHA-256 raw runtime bytecode |
|---|---|---|
| Binance-built outer target `0xb444…dda5` | 180-byte Diamond-style proxy | `678b647bfc7b65b4036969469d160aa275ee2b9bef20c30e124ae1c2519648f1` |
| Official inner LiquidMesh router `0x3d90…6be9` | 2,206-byte ERC-1967 TransparentUpgradeableProxy | `d2486a9dd6c98f480c1357bb5cbe66658910c8f5f84b14c277cf859ea848cc63` |
| Current inner implementation `0xc3460c075f5d8effae3a587aa83d633c7be86b46` | 20,433-byte runtime | `1230b64b1cef2318540f980033c4ae8d7c0b636328720ba6c3cc23503e85755c` |
| Published direct-API approval address `0x8157…e9b1` | 1,610-byte runtime | `5607ab77a09664e662f63a66392dc1bbaee5a1b8d00e7a20f25cb120e03697a6` |

[Sourcify's exact BSC source match](https://sourcify.dev/server/v2/contract/56/0x3d90f66b534dd8482b181e24655a9e8265316be9?fields=abi,compilation) confirms the **inner proxy** is `TransparentUpgradeableProxy`, Solidity 0.8.17. The proxy has zero public ABI functions, because its fallback forwards to the implementation. The BSC implementation **is not verified in Sourcify** (404 at the time of lookup). Its current implementation is obtained from the standard ERC-1967 implementation storage slot, not assumed from the proxy source.

The outer Binance Diamond-style route's current selector facet is **not** source-verified on Sourcify, and even verified proxy source does not prove the safety of a mutable implementation.

Reproduce the two-RPC fingerprints and implementation slots without credentials or signing:

```sh
node scripts/audit-liquidmesh-official-router.cjs
node scripts/audit-liquidmesh-readonly.cjs
```

## Execution-security consequences

- Strictly require the **Binance outer tx.to** and **quoted spender** from a fresh signed build, independently checked. The vendor's documented direct router or approval address **cannot replace** either one.
- Add a structural assertion that observed Binance envelope word 2 equals the vendor-published official inner router. A mismatch fails. This is still **not** proof that the inner router is called, and does not validate the nested 4,580-byte payload.
- The outer route is **Diamond-style and EOA-owned** (previous two-RPC checks); the inner router is **TransparentUpgradeableProxy**. At least two layers of upgrade/change authority require review, monitoring and verified ABI/source.
- No vendor-published source/ABI was found for the *inner 20,433-byte BSC implementation* or *outer Binance execution facet*. Neither dynamic call data schema nor recipient/refund/fee/callback semantics is independently established. Therefore `verifyKnownRouterSemantics` must continue returning DENY and `SENTINEL_LIVE_EXECUTION_ENABLED` must stay OFF.
- A nested third-party instruction may spend funds even if the outer envelope amount/minOut match. Never declare an audit complete based on a human-readable selector name, single fingerprint, or prior successful simulation.

## Binance bStocks eligibility — official policy, NOT a user verdict

Binance's [bStocks FAQ](https://www.binance.com/en-NG/support/faq/detail/f0c03cd6509a4085b4cce1636f16be38) says bStocks are available on secondary markets only to **eligible users** in some jurisdictions; third-party integrators must enforce geographic restrictions and it advertises a public **country-eligibility REST API**. It warns that the issuer may restrict wallets. The indexed [official Binance Web3 API endpoint list](https://web3.binance.com/en/dev-docs/llms.txt) enumerates RWA endpoints but **does not list a bStocks country-eligibility endpoint**; an entirely separate [Stocks Trading REST API market-data catalog](https://developers.binance.com/en/docs/catalog/advanced-trading-stocks-trading/api/rest-api/market-data) likewise does not establish individual access.

Therefore:
1. The country eligibility endpoint path/schema, response TTL and integration terms are **NOT verified** — do not make up paths such as `/country-eligibility`, or use a geolocation/IP guess.
2. The user has **not authenticated or presented any issuer-issued product-specific eligibility response** to Sentinel. Their nationality, residence, travel location, Binance account KYC, sanctions status or market permissions cannot be inferred from this conversation, a VPN/IP, or a wallet address.
3. A supported future verdict must explicitly bind **product = bStocks, end-user, jurisdiction, relevant provider/venue, wallet, expiry and issuer-side restrictions**. Country-eligible **alone** is not personal clearance.
4. The LiquidMesh portal has a **different** whitelist-beta KYC and wallet-whitelist mechanism; access to LiquidMesh APIs is not permission to acquire bStocks. Official terms: https://portal.liquidmesh.io/terms.
5. Existing `assessIssuerTradingEligibility()` deliberately returns `NOT_VERIFIED`. Do not bypass the block through app configuration. The user may verify privately through their own account and authorized provider process; do not collect passports, national IDs, KYC tokens, screenshots with identifying details or secret account credentials in GitHub or this chat.

## Official vendor handoff (NOT SENT)

**LiquidMesh support** — `support@liquidmesh.io` (listed in their official terms and developer docs):

Subject: BSC router source/ABI and Binance aggregator nested calldata audit — Sentinel integration

Hello LiquidMesh engineering team,

We are validating the safety of a BSC integration for a tokenized-securities basket product. Your official documentation identifies router `0x3d90f66B534Dd8482b181e24655A9e8265316BE9` and default approval contract `0x8157a9d65807521FBB8db8f37EEEcEfDD247E9B1`.

An authenticated Binance Web3 quote/build returned LiquidMesh as its venue, but targeted outer contract `0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5` with swap selector `0xad43f73d`, equal quote approval spender, and 4,580 bytes of nested routing data. The inner official router appears in the outer encoded envelope. We are not signing or sending these transactions until independently verified.

Could you share (1) versioned verified Solidity source and ABI for the BSC router's current implementation `0xc3460c075f5d8effae3a587aa83d633c7be86b46`, (2) schema/provenance for its nested routing payload and whether the Binance outer route can invoke it, (3) recipient, minOut, expiry, refund, fee, callback/third-party call semantics, (4) access controls and timelock/multisig for proxy upgrades, and (5) any audit reports with on-chain code hashes? If your team does not operate the Binance outer contract, please identify who can provide its facet/source and any required integration agreement.

A public repository or documentation URL suffices; please do not send private keys or wallet secrets. Thank you.

**Binance bStocks developer / support request** — use the official [Binance 24/7 support chat](https://www.binance.com/en/chat?sourceEntry=4) or support escalation via Binance developer documentation:

Subject: Third-party bStocks country-eligibility REST API and end-user/wallet eligibility attestation

Hello bStocks integrations team,

Your official bStocks FAQ (section 16) states that Binance provides a public REST API with a country-eligibility endpoint for third-party integrators. We are developing a non-custodial BSC basket execution product and wish to comply with all relevant restrictions, not infer eligibility from IP, wallet holdings or successful swap quotes.

Please share (1) the **official documented REST base URL/path/method**, public authentication requirements, parameters, response schema and TTL, (2) which country/region designation(s) must be checked and how updates/revocations work, (3) whether country eligibility is enough for secondary-market onchain bStocks transfers or what additional **individual user, KYC, product/venue, wallet whitelist/blacklist and issuer authorization** is required, (4) a supported privacy-preserving way to verify a specific end-user/wallet without giving the integrator sensitive identity documents, and (5) any integration approval/application requirement.

We will keep trading disabled until the authoritative response and user-specific requirements are verified. Thank you.

## Remaining blockers

1. Authoritative source and ABI for **both** execution layers, plus the exact 4,580-byte payload and governance restrictions.
2. Provider-issued documented bStocks country eligibility API **and** explicit end-user/product/wallet authorization.
3. Fresh user-authorized funded test only after (1) and (2), with BSC receipts and actual token balance deltas.

No approval, broadcast or real transaction was made during this verification.
