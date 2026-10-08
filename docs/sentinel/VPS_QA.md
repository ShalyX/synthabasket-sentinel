# VPS QA — SynthaBasket Sentinel

Dedicated isolated checkout on the existing Ubuntu host `VM-0-9-ubuntu`. Windows PC SSH alias: `caraxes-vps` using existing configured Git SSH. No credentials or secrets in this document.

## Run on the authorized Windows PC

```powershell
cd C:\Users\USER\source\synthabasket-sentinel
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\vps-qa.ps1
```

The script refreshes only `~/sentinel-qa` on the VPS, runs a clean dependency install, all Node unit tests with concurrency limited to two, TypeScript validation with limited Node heap, and a safe GET request to the public Vercel market API. It does not start web servers, expose services, move .env files or wallet keys, or interfere with existing workloads.

The host has about two CPUs, 2 GB RAM and limited disk headroom. **Do not run local Next production builds or browser automation there without capacity checks**; Vercel/GitHub CI continues to handle production builds.

## Verified October 8, 2026

First VPS dry-run surfaced an inconsistent `picomatch` package lock. Repairing the lockfile allowed `npm ci` and the 43 unit tests + TypeScript to pass. The repaired lockfile uses npm's public registry paths and integrity hashes.

This only verifies code/test reproducibility and production API reachability, **not actual token execution**. BSC wallet signing and spending require a separately approved execution flow.
