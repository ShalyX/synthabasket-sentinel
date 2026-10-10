# M11 — Independent LiquidMesh transaction-semantics audit
**2026-10-10 · VERDICT: PROVENANCE CHECKED; EXECUTABLE SEMANTICS UNVERIFIED / NO GO**

Scope: the real Binance Web3 LiquidMesh SWAP route, not a hypothetical direct LiquidMesh API trade. All operations were read-only. No signature, approval, broadcast or purchase.

## Independent evidence

1. Official LiquidMesh guide: https://docs.liquidmesh.io/docs/smart-contracts documents the direct-API BSC router **0x3d90f66b534dd8482b181e24655a9e8265316be9** and usual direct-API spender **0x8157a9d65807521fbb8db8f37eeecefdd247e9b1**. Neither should replace Binance's quoted outer target or spender.
2. Previously authenticated Binance build: **outer transaction and quoted spender 0xb44446b0c8e56988c34f7ff73ae904982b5fdda5**, selector **0xad43f73d**. Re-ran the offline inspector on the preserved private, expired transaction; SHA-256 matched its recorded digest **1d56f4a9416fd0476580ed290a474296f2000f8e8d311bae311770629bb177a2**. Envelope matches exactly one USDT input, bStocks NVDAB output, minOut and quoted output and contains **4,580 opaque nested bytes**. Recipient, external targets and callbacks **NOT VERIFIED**.
3. Fresh independent BSC current-state checks, using bsc-dataseed.bnbchain.org and bsc.publicnode.com: both independently agreed on all five bytecode fingerprints, with unchanged outer swap-facet pointer and official LiquidMesh ERC-1967 implementation pointer. Reproducible by scripts/audit-liquidmesh-official-router.cjs and scripts/audit-liquidmesh-readonly.cjs.
4. Stronger new same-block check scripts/audit-liquidmesh-pinned.cjs: first pinned read at block **126735074** succeeded from the canonical node. Other public providers returned JSON-RPC **-32602 Invalid params** for historical storage calls, although latest reads worked. Two-provider **same-block** attestation therefore remains **UNVERIFIED**. The script correctly exits nonzero. This is an RPC evidence limitation, not proof the code changed.
5. PUSH-aware independent bytecode inspection scripts/audit-liquidmesh-opcodes.cjs found **9 CALL and 3 STATICCALL opcode sites** in the outer 8,622-byte facet, and **20 CALL and 9 STATICCALL opcode sites** in the 20,433-byte inner implementation. Opcode presence is **not execution trace or reachable control flow**, and cannot prove external targets or recipient.
6. New adversarial tests demonstrate that changing the expected recipient, opaque control address, or nested bytes can still satisfy the **outer structure**, but must not pass the actual verifyKnownRouterSemantics authorization guard.

## Onchain identities and controls

| Contract | Bytecode bytes | Current SHA-256 (raw code bytes) |
| --- | ---: | --- |
| Binance outer 0xb444…dda5 | 180 | 678b647bfc7b65b4036969469d160aa275ee2b9bef20c30e124ae1c2519648f1 |
| Outer swap facet 0xa9fa…e603 | 8,622 | 924e9da536e78a9ce92f633058a62907ee5834738947432d186e02b212a0d574 |
| Official LiquidMesh proxy 0x3d90…6be9 | 2,206 | d2486a9dd6c98f480c1357bb5cbe66658910c8f5f84b14c277cf859ea848cc63 |
| Inner LiquidMesh implementation 0xc346…6b46 | 20,433 | 1230b64b1cef2318540f980033c4ae8d7c0b636328720ba6c3cc23503e85755c |
| Direct-API spender 0x8157…e9b1 | 1,610 | 5607ab77a09664e662f63a66392dc1bbaee5a1b8d00e7a20f25cb120e03697a6 |

The outer owner was observed as **0x1c6f8a6d1011ca0334f6f8f5e2f9222ef1b68fa9**, with no deployed code at that address at the sampled block. The official proxy's ERC-1967 implementation points to 0xc346…6b46; its ERC-1967 admin slot read zero. Do NOT infer lack of upgrade power or a safe governance model from either result without verified implementation source and complete proxy/diamond admin semantics.

## Exact gate remaining

- Independently verifiable deployed source/ABI of Binance outer facet and LiquidMesh inner implementation, including governance, upgrade authority and matching code hashes.
- The actual full ABI of selector 0xad43f73d and a validated schema for the 4,580-byte payload: prove real recipient, all nested CALL targets, exact input limit, minOutput, fee/refund addresses, callbacks, token-transfer allowances, expiry and failure behavior.
- Independent verification of the Binance-quoted spender, which is NOT automatically LiquidMesh's default approval contract, against every fresh quote.
- Independently issuer-attested user/product/jurisdiction/wallet entitlement, separate from calldata safety.

The project's verifyKnownRouterSemantics function continues to **DENY** even a perfectly matching observed envelope. Keep SENTINEL_LIVE_EXECUTION_ENABLED disabled, and do not fund or approve to manufacture a live purchase claim.

## Reproduction (no credentials, no spending)

    node scripts/audit-liquidmesh-official-router.cjs
    node scripts/audit-liquidmesh-readonly.cjs
    node scripts/audit-liquidmesh-pinned.cjs
    node scripts/audit-liquidmesh-opcodes.cjs
    npx tsx scripts/inspect-private-liquidmesh-evidence.ts <PRIVATE_EXPIRED_JSON_PATH>
    npx tsx --test src/lib/sentinel/route-audit.test.ts

The expired raw calldata fixture stays on the owner's computer outside Git. Do not upload it or private keys.

**Conclusion: execution TARGET identity and partial envelope established; independently proven END-TO-END execution semantics NOT established. NO GO.**
