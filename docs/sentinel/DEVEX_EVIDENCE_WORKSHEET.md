# Personal Developer Experience Report — evidence worksheet (NOT the report)

**Important:** The hackathon explicitly rejects **AI-generated Developer Experience Reports**. This is a technical fact sheet and a blank personal reflection worksheet to help the BUILDER remember what they directly experienced. It is **NOT** a report to copy/paste or submit. The builder must independently write their own reflections, opinions and suggestions.

Official report form: https://forms.gle/EUQ39xf54GHjC2ys5
Hackathon criteria: https://www.bnbchain.org/en/hackathons/tokenized-stocks

## Verifiable observations to inspect while writing

| Topic / evidence | Observed factual record | Confidence / caveat |
|---|---|---|
| RWA market inventory | A successful signed BSC market endpoint returned **488 token contracts** / **448 tickers** on 8 Oct 2026 | VERIFIED at that time; numbers can change |
| US hosting failure | US-East iad1 Vercel API attempts failed with Binance business code **40304**, exposed as HTTP 451 | VERIFIED earlier; indicates a product compliance constraint; not a legal interpretation |
| Singapore service | Independent Vercel project pinned sin1; live signed inventory and $5/$10 venue quotes returned HTTP 200 | VERIFIED. Does not automatically imply compliance clearance |
| Dual stock issuers | NVIDIA appeared as both **NVDAB (bStocks)** and **NVDAon (Ondo)** on BSC | VERIFIED in live inventory |
| Normalization requirement | Each issuer provided a different token-to-share ratio. Raw quote token counts favored bStocks, while share-equivalent calculation on the observed pair favored Ondo | VERIFIED mathematical calculation for a specific transient observation, not general price ranking |
| Read-only bStocks quote | $10 USDT -> **0.04223466 NVDAB**, **SWAP**, **LiquidMesh**, reported impact **0.0000%** | OWNER-SUPPLIED actual dossier reading, time-limited |
| Read-only Ondo quote | $10 USDT -> **0.04220982 NVDAon**, **SWAP**, **LiquidMesh**, reported impact **0.0001%** | OWNER-SUPPLIED actual dossier reading, time-limited |
| Parameter error | Ondo quote initially failed with Binance business code **40001** without a public receiving address | VERIFIED real failure; upstream detailed message was not captured |
| Address-supplied result | The owner then provided a **public receiving address**, and the Ondo **SWAP** quote succeeded | OWNER CONFIRMED; do not share wallet address |
| Agentic Wallet CLI | The CLI was paired on the owner's Windows device. A read-only quote of **10 USDT -> 0.04268987900435519 NVDAB** succeeded and was sanitized locally | OWNER CONFIRMED sanitized observation. No wallet session or transaction exposed |
| Wallet comparison | Sanitized local Agentic observation was imported; the two fresh quote windows did not overlap for a confirmed live two-source difference | PARTIAL; not an execution or a successful simultaneous comparison |
| Quote freshness | Quotes expire after 30 seconds. Sentinel's UI removes the live comparison and can show an explicitly expired historical reference | LIVE BROWSER VERIFIED using synthetic browser-only fixtures; real owner observed live results |
| Real swaps and Agent Studio | No completed purchases, approvals, trades or autonomous agent were implemented | NOT CLAIMED |
| Timing from docs to first call | **Unknown** | Must be personally reconstructed; do not invent minutes |
| Latency measurements | **Not recorded as an independently reproducible benchmark** | Must measure or report uncertainty, never invent a median |
| Exact docs corrections | Refer to the cited Binance Web3 API documentation and identify specific field/page you actually consulted | Research yourself; do not invent an error in a docs page |

### Personal writing prompts — builder must answer in their own words

**Onboarding:** When did you first open the Binance developer documentation, how did you request an API key, and what was your first genuinely successful request? How long did it take? Which steps consumed most time?

**Documentation:** Identify an exact URL, section heading, API parameter and the difference between what you expected and what you observed. What would have prevented the wrong assumption?

**API errors:** What was the precise meaning of 40304 versus 40001 in your workflow? Which error was actionable? Which was ambiguous? Why?

**Wallet and AI stack:** What did pairing Binance Agentic Wallet actually make easier? Where did it stop? What local-only diagnostic/quote handoff was helpful, and what did the CLI never do?

**Tokenized-stock behavior:** What surprised you about comparing bStocks and Ondo NVDA? Why is the token-to-share ratio important? What did the 30-second quote expiry change about your UI design?

**Suggested improvements:** If you owned the Binance API quickstart, how would you clarify network, hosting region, receiving-wallet requirements and SWAP/RFQ route metadata? Separate *what happened* from *what you suggest*.

**Missing capabilities:** Which specific endpoints, fields, troubleshooting guidance or SDK examples would make your next project easier? Which are truly missing versus already documented elsewhere?

### Blank firsthand notes

- My actual first API success date/time and elapsed onboarding time:
- One exact API docs page/section I checked:
- One specific error or discrepancy I personally reproduced:
- My measured latency, or why I did not measure it:
- A screenshot/log reference I am comfortable sharing:
- My own proposed redesign in my own language:
- One thing I genuinely enjoyed and one thing I genuinely struggled with:

Write your report **separately**, directly in the official organizer form. Do not submit this worksheet as the report or claim it is human-written narrative.
