# Sentinel visual redesign — 2026-10-08

User rejection (binding): original preview was "AI-slop" and packed the entire product into one cramped page. This is an explicit anti-reference. Recoloring the old dashboard is not acceptable.

## Product idea
A tokenized-equity decision should resemble a defensible investment research record, not a neon Web3 trading terminal. The visual metaphor is an *editorial market desk*: index, annotated dossier, composition sheet, pre-flight receipt.

## Divergent concepts considered
1. **Data-terminal grid**: strong information density but too close to the rejected original.
2. **Research publication / print ledger**: open margins, precise tabulation, issuer sheets, annotated equations and a physical-looking receipt; strongest product fit.
3. **Kinetic portfolio canvas**: engaging allocations, but too expensive in time and likely to obscure provenance.

Selected: research publication. Off-white paper, dark pine ink and controlled vermilion notation; large Georgia editorial headlines and monospace numerical contracts. No dark gradient, glass cards, fake sparkline or giant decorative network illustration. SynthaBasket's existing name and layered mark are preserved, interpreted as three thin price/reference strokes.

## New information architecture
- `/sentinel` — The Brief: conceptual thesis, *actual* price-to-reference anatomy with live/blank states, featured verified stocks, orientation.
- `/sentinel/markets` — Market Index: searchable, sortable live inventory with provider grouping, status, ratio-adjusted basis.
- `/sentinel/markets/[ticker]` — Instrument Dossier: issuer-specific contracts, adjusted reference parity, market/session and optional fresh $10 quote per issuer.
- `/sentinel/baskets` — Basket Studio: local-only composition with at most four underlying stocks, explicitly selected issuers, weights totaling 100%, editable spending budget and issuer-aware theme presets.
- `/sentinel/review` — Execution Review: fresh per-leg quotes and deterministic policy checks with a time-limited receipt. No signing/broadcast.

The shell carries market data and basket selection between pages. Navigation and layout respond differently on narrow viewports; menu collapses, directory scrolls horizontally with visible labels, quote sheet stacks, builder and review become single-column.

## Truth contract
Each display number must come from the actual Binance Web3 API, derived from it using the issuer conversion ratio, or explicitly marked as a user-entered hypothetical allocation. When API data is unavailable, show an explicit feed-unavailable state instead of synthetic example prices. Execution is always locked.

## Motion
Only causally relevant hover/press transitions and the in-progress refresh spinner; all animation removed in reduced-motion preference.

## QA gates
Run explicit tests for basket weights, data math and no false policy success. Build and typecheck with GitHub CI. Inspect deployed 1440 and 390/375 pixel renders and full flow before release; mere HTTP 200 is insufficient.
