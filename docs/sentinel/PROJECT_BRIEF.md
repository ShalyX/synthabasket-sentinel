# SynthaBasket Sentinel — original execution vision, restored Oct 8, 2026

**Identity:** a user-controlled, execution-aware tokenized-stock basket agent for BNB Smart Chain.

**Problem:** tokenized equities representing the same underlying stock can be issued as different wrappers, routed to different venues, and subject to different reference ratios and restrictions. Users need a repeatable decision-to-execution system, not isolated token quotes.

**User:** an eligible BSC wallet holder constructing thematic equity baskets from spot RWA tokens and explicitly authorizing any spend.

**Core job:** translate a user-directed basket thesis into verified issuer choices and weights; quote and normalize exposure; simulate actual BSC execution; reject failed or unsafe legs; present concrete user approval; execute only approved spot transactions; monitor holdings and generate explained rebalance proposals.

**Initial vision:** discover → analyze → basket → transaction simulation → user-approved execution → monitoring. Binance Web3 APIs supply issuer data, aggregation, transaction simulation and possible broadcasting. Official Agentic Wallet and BNB Agent Studio may extend execution/orchestration only when genuinely integrated; they are separate prize opportunities, not features to claim in advance.

**Product boundaries:** No custodial wallet, private-key request, automatic order signatures, undisclosed router approvals, synthetic fills or invented performance. Execution authorization belongs to the human. The execution path must be honest about constraints such as allowance, gas, market hour and legal eligibility.

**Current state:** Strong live discovery and research front-end completed; simulation, wallet-approved trading and monitoring are not finished. Previous research-only brief and demo language must be corrected; the product is not considered finished until the execution-path gates pass.

**Non-goals:** Solana vault/share minting as part of this BSC build, derivatives/perpetuals, unattended unlimited trading, unverified RFQ settlement, fabricated price history, or circumventing Binance jurisdiction rules.

**Hackathon:** Main Track required; $2,000 Agentic Wallet and $2,000 Agent Studio specials only after real technical proof. Deadline October 11, 2026 12:00 UTC.

**Architecture:** independent main branch at https://github.com/ShalyX/synthabasket-sentinel; original STOCKLANA at https://github.com/ShalyX/synthabasket remains untouched. Canonical engineering tasks are in PRODUCTION_PLAN.md.
