#!/usr/bin/env node
/**
 * Creates a local, non-secret read-only Binance Agentic Wallet diagnostic.
 * No transaction, swap, signature, approval or account details are requested.
 * File remains on the user's own device; never pushed or uploaded.
 */
import os from 'node:os';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { runSafe } from './agentic-wallet-readonly.mjs';

export const DIAGNOSTIC_KIND = 'synthabasket.sentinel.wallet-diagnostic';
export function composeDiagnostic(results, now = new Date()) {
  const { status, chains, settings } = results || {};
  if (!status?.ok || !chains?.ok || !settings?.ok)
    throw new Error('Wallet diagnostic incomplete: read-only checks did not all succeed.');
  if (!(now instanceof Date) || !Number.isFinite(now.valueOf()))
    throw new Error('Invalid observation timestamp.');
  return {
    kind: DIAGNOSTIC_KIND,
    version: 1,
    observedAt: now.toISOString(),
    scope: 'local-read-only-observation',
    observations: {
      walletConnected: status.connected === true,
      bscSupported: chains.bscSupported === true,
      tokenScopeRestricted: settings.limitedTokenScope === true,
      highRiskHandling: ['AUTO_REJECT','APP_CONFIRMATION'].includes(settings.highRiskHandling)
        ? settings.highRiskHandling : 'UNKNOWN',
      dailyLimitConfigured: settings.dailyLimitConfigured === true
    },
    permissions: { mayTrade: false, maySign: false, mayApprove: false }
  };
}

export async function saveDiagnostic(report, filename = 'sentinel-wallet-readiness.json') {
  if (!/^[a-zA-Z0-9_.-]{1,100}\.json$/.test(filename)) throw new Error('Invalid output filename.');
  const destination = path.join(os.tmpdir(), filename);
  await writeFile(destination, JSON.stringify(report, null, 2) + '\n', { encoding: 'utf8', flag: 'w', mode: 0o600 });
  return destination;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const report = composeDiagnostic({
      status: runSafe('status'),
      chains: runSafe('chains'),
      settings: runSafe('settings')
    });
    const destination = await saveDiagnostic(report);
    console.log('Saved a local, sanitized, read-only diagnostic: ' + destination);
    console.log('Wallet state at observation: ' + (report.observations.walletConnected ? 'CONNECTED' : 'NOT CONNECTED'));
    console.log('No wallet address, private key, Binance session or trade authorization is contained in the file.');
    console.log('Open Sentinel → Execution Review → Import device check. The file never leaves your browser.');
  } catch (error) {
    console.error('Local diagnostic failed: ' + (error instanceof Error ? error.message : 'Unknown failure'));
    process.exitCode = 1;
  }
}
