# Repository and Deployment Separation — Verified October 8, 2026

The builder requested complete separation of the BNB Chain Sentinel hackathon project from the prior STOCKLANA SynthaBasket submission.

## Source control

| | STOCKLANA | Sentinel |
|---|---|---|
| Repository | https://github.com/ShalyX/synthabasket | https://github.com/ShalyX/synthabasket-sentinel |
| Active branch | `main` | `main` |
| Git history | Existing Solana lineage | **Independent root commit `743e938`**, created from a Git-tracked source archive, not a fork |
| Primary code | Solana Devnet SPL basket vault | BNB Chain issuer research + read-only wallet diagnostic |
| Prior Sentinel branches | Removed from original remote after migration | No inherited branches or parent commits |

Old `ShalyX/synthabasket` main commit was verified unchanged at `281b127cfc7f857791247cbc2ae548e57883b579` before and after removing exactly two remote development branches: `feat/bnb-rwa-readonly-spike` and `feat/sentinel-research-desk`.

The **standalone** source snapshot excludes Solana contracts, legacy Solana app/API routes, old Solana workflows, Solana-only scripts, and unused Solana dependencies. The original source tree was not modified to extract the new repository.

## Hosting

| | STOCKLANA | Sentinel |
|---|---|---|
| Vercel project | `synthabasket` | `synthabasket-sentinel` |
| Project ID | `prj_KonkJmB5ZYBawEnF9WyBStbjUiWY` | `prj_PtLkeKCeUBBYtzcLjzAIFAeXLgRV` |
| Git link | `ShalyX/synthabasket` | `ShalyX/synthabasket-sentinel` |
| Production website | https://synthabasket.vercel.app | https://synthabasket-sentinel.vercel.app |
| Node | Original project setting | Node.js 22.x |

Both URLs were independently checked returning HTTP 200. The new Sentinel root redirects to `/sentinel`. Vercel's git connection listing confirmed the exact one-to-one mappings above.

## Secrets and market availability

- No `.env.local`, Vercel OIDC token, Binance API keys, wallet addresses, seed phrases, or private keys were copied into Git.
- The **two branch-specific Binance secrets** `OC_API_KEY` and `OC_SECRET_KEY` were deleted from the **original project's Preview** environment. Production environment entries belonging to STOCKLANA were untouched.
- The new isolated Sentinel Vercel project has **no Binance API credentials configured**. Its `/api/sentinel/markets` returns an honest HTTP 503 until access is authorized.
- Earlier signed deployments returned HTTP 451 / business `40304`; changing repository isolation does not resolve upstream compliance restrictions.
- Historical feature-preview deployment URLs on the old project may persist in its deployment history; they are **not** the active Sentinel host and will not receive future Sentinel pushes.

## Reproduction and remaining gates

CI for this repository runs Node 22 tests, typecheck and production Next.js build on its own `main` branch. Documentation and footer source links point to the new repository. A judge can follow `JUDGE_RUNBOOK.md`.

Open questions: compliant judge-accessible Binance market-data hosting, verified quote-only workflow, and the user-authored hackathon DX report. No swaps or trades were executed by the migration.
