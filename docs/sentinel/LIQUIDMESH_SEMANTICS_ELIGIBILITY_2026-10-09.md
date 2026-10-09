# M4 gates: LiquidMesh semantics and bStocks issuer eligibility
**Audit date:** 2026-10-09 | **Release verdict: NO GO / fail closed**

## Verification outcomes

| Release requirement | Status | Evidence / limitation |
|---|---|---|
| Binance-authenticated route/approver contract | VERIFIED AS OBSERVED | Existing [authenticated route evidence](LIQUIDMESH_AUTHENTICATED_ROUTE_2026-10-09.md) resolves BSC router/spender `0xb44446b0c8e56988c34f7ff73ae904982b5fdda5`; selector `0xad43f73d`. One captured quote/build is not an enduring guarantee |
| Active BSC router bytecode / selector facet | TWO-RPC VERIFIED AT OBSERVATION | Independent public BSC RPCs agreed on router 180 bytes + SHA256 `678b647bfc7b65b4036969469d160aa275ee2b9bef20c30e124ae1c2519648f1`, selector facet `0xa9fa1b56f4d7bd25375c2d40b4c8e36a9509e603` 8,622 bytes + SHA256 `924e9da536e78a9ce92f633058a62907ee5834738947432d186e02b212a0d574`. Both chainId 56 and same selector mapping; can change in future |
| Diamond upgrade functions and owner | OBSERVED, GOVERNANCE NOT AUDITED | Onchain `diamondCut` selector `0x1f931c1c` resolves to a distinct 3,385-byte facet `0xd60232b0b4a9725c513a44062d922f0fda11c058`. `owner()` `0x8da5cb5b` and `transferOwnership(address)` `0xf2fde38b` resolve to a 737-byte ownership facet `0x95901efcd07c491bc4daed91ff0aafd12a1e40f4`. Two public BSC RPCs returned current owner `0x1c6f8a6d1011ca0334f6f8f5e2f9222ef1b68fa9`; owner has **no deployed bytecode (EOA)** at observation. This makes upgrades a material risk; does not prove whether a timelock/policy governs actual upgrades without facet ABI/source |
| Authenticated outer calldata, private saved fixture | STRUCTURALLY CHECKED | Local expired transaction data sha256 `1d56f4a9416fd0476580ed290a474296f2000f8e8d311bae311770629bb177a2` matches the private fixture. A strict 10-word ABI-shaped envelope parses exact USDT contract/input raw amount, NVDAB contract/minOut, quoted output, and exactly **4,580 bytes opaque dynamic nested instructions**. Synthetic mutation tests reject mismatched amount/token/minOut, selector and malformed length |
| Recipient, external calls, fee recipients, callback and nested targets | **NOT VERIFIED** | The wallet address is not present as a literal in calldata. The facet and its nested routing bytes do not have verified source or authoritative ABI. Outer field matching **cannot establish what arbitrary delegated external calls do**. The full 4,580 bytes are NOT audited |
| LiquidMesh public signature/source | **NOT VERIFIED** | Fourbyte signature database did not resolve `0xad43f73d`; Sourcify had no verified sources for router or facet when checked. Broader cross-chain code matches are not code provenance or a vendor audit |
| Individual issuer eligibility (bStocks) | **NOT VERIFIED** | Binance bStocks official FAQ says secondary-market access is only for eligible users in permitted jurisdictions, NOT a public offer outside the ADGM, and third-party integrators must implement geographic controls. FAQ describes a public country-eligibility REST API but **does not provide the request path/parameters/response**, and publicly indexed Binance Web3 RWA API reference does not expose it. There is no authenticated user/product/wallet admission evidence. IP, guessed country, public wallet and signed market quote are **not substitutes** |
| Individual issuer eligibility (Ondo) | **NOT VERIFIED** | Must be separately established for any Ondo tokenized-security routes, not inherited from bStocks |
| Mainnet transaction | **NOT AUTHORIZED** | No approvals, signatures, token purchases or broadcasts in this audit. The execution guard still denies ALL trades, independently of config flags and inferred token availability |

## Read-only reproducibility

Run from this branch:

```sh
node scripts/audit-liquidmesh-readonly.cjs
node scripts/audit-liquidmesh-owner.cjs
python scripts/audit-liquidmesh-admin.py
npx tsx scripts/inspect-private-liquidmesh-evidence.ts <PRIVATE_EXPIRED_JSON_PATH>
npx tsx --test src/lib/sentinel/*.test.ts
```

The private expired calldata fixture is held locally outside Git; **never store its raw content or any Binance credentials in a public repository**. None of these commands requests a signature or transfers tokens. Onchain checks are at observation time, not a guarantee of future state. Recheck at the same block whenever possible; cross-RPC latest-head results can differ around upgrades.

## Source-authorized request for vendor/issuer

**LiquidMesh:** Supply the independently verifiable Solidity source, exact ABI for `0xad43f73d`, full nested calldata schema (including the 4,580-byte dynamic field), contract registry, function/callback/recipient semantics, allowance and fee handling, privileged selectors, facet upgrade access control and governance/timelock/multisig mechanisms. Please confirm whether proxy owner `0x1c6f8a6d1011ca0334f6f8f5e2f9222ef1b68fa9` can directly invoke `diamondCut` or whether any additional on-chain guard exists. Do not assume an EOA implies exclusively one natural person or that all upgrades are unilateral.

**Binance bStocks / issuer:** Provide the documented **country-eligibility REST endpoint** (exact URL, request parameters, current response schema, terms/TTL), intended for third-party integrators. Clarify how to verify the *specific end user's* product/jurisdiction and wallet eligibility without exposing protected identity data to Sentinel, including the permitted secondary-market jurisdictions, restrictions on US persons, contract transfer restrictions/blacklist status, and required integration approval or disclosures.

## Safe engineering state

- `src/lib/sentinel/issuer-eligibility.ts` always returns `NOT_VERIFIED` for any proposed trading; **no self-declared country or server region can set `canTrade=true`**. Applies to bStocks and Ondo.
- `src/lib/sentinel/route-audit.ts` parses only outer observed bytes; `verifyKnownRouterSemantics` still **returns BLOCKED even for exact matching bytes**, because sender/recipient and dynamic calls remain unverified.
- `/api/sentinel/authorize` calls the independent issuer check before considering a user-owned approval/swap. It remains protected by the default-OFF environment switch and empty allowlists. **Do not switch on live spending.**

## Authoritative references

- Binance bStocks FAQ: https://www.binance.com/en-NG/support/faq/detail/f0c03cd6509a4085b4cce1636f16be38
- Binance Web3 RWA API reference: https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data
- LiquidMesh Terms §§3, 5–7: https://portal.liquidmesh.io/terms
- LiquidMesh Swap API overview: https://docs.liquidmesh.io/docs/quote-api
- LiquidMesh technical support/API entry: https://docs.liquidmesh.io/docs/api-access-and-usage

**Next steps:** Obtain vetted ABI/nested schema and genuine issuer eligibility integration; only after both independently pass can a fresh funded user-confirmed onchain test be considered.
