export const WALLET_DIAGNOSTIC_KIND = 'synthabasket.sentinel.wallet-diagnostic' as const;
export interface WalletDiagnostic {
 kind: typeof WALLET_DIAGNOSTIC_KIND;
 version: 1;
 observedAt: string;
 scope: 'local-read-only-observation';
 observations: {
  walletConnected: boolean;
  bscSupported: boolean;
  tokenScopeRestricted: boolean;
  highRiskHandling: 'AUTO_REJECT'|'APP_CONFIRMATION'|'UNKNOWN';
  dailyLimitConfigured: boolean;
 };
 permissions: {mayTrade:false;maySign:false;mayApprove:false};
}
export type DiagnosticParse = {ok:true;value:WalletDiagnostic}|{ok:false;error:string};
/**
 * This is a user-supplied local snapshot, not a signed attestation of wallet access.
 * Never accept this value as permission to sign, spend or place orders.
 */
export function parseWalletDiagnostic(value: unknown): DiagnosticParse {
 if (!value || typeof value !== 'object' || Array.isArray(value))
  return {ok:false,error:'Not a wallet diagnostic document.'};
 const r=value as Record<string,unknown>;
 if(r.kind!==WALLET_DIAGNOSTIC_KIND||r.version!==1||r.scope!=='local-read-only-observation')
  return {ok:false,error:'Unknown diagnostic format or version.'};
 if(typeof r.observedAt!=='string')return {ok:false,error:'Missing observation time.'};
 const time=Date.parse(r.observedAt);
 if(!Number.isFinite(time)||new Date(time).toISOString()!==r.observedAt)
  return {ok:false,error:'Invalid observation time.'};
 if(!r.observations||typeof r.observations!=='object'||Array.isArray(r.observations))
  return {ok:false,error:'Missing wallet checks.'};
 const o=r.observations as Record<string,unknown>;
 for(const key of ['walletConnected','bscSupported','tokenScopeRestricted','dailyLimitConfigured'])
  if(typeof o[key]!=='boolean')return {ok:false,error:'Incomplete wallet checks.'};
 if(!['AUTO_REJECT','APP_CONFIRMATION','UNKNOWN'].includes(String(o.highRiskHandling)))
  return {ok:false,error:'Unknown risk policy.'};
 if(!r.permissions||typeof r.permissions!=='object'||Array.isArray(r.permissions))
  return {ok:false,error:'Missing read-only permission limits.'};
 const p=r.permissions as Record<string,unknown>;
 if(p.mayTrade!==false||p.maySign!==false||p.mayApprove!==false)
  return {ok:false,error:'Only explicitly non-executing diagnostics are accepted.'};
 return {ok:true,value:{
  kind:WALLET_DIAGNOSTIC_KIND,version:1,observedAt:r.observedAt,
  scope:'local-read-only-observation',
  observations:{
   walletConnected:o.walletConnected as boolean,
   bscSupported:o.bscSupported as boolean,
   tokenScopeRestricted:o.tokenScopeRestricted as boolean,
   dailyLimitConfigured:o.dailyLimitConfigured as boolean,
   highRiskHandling:o.highRiskHandling as WalletDiagnostic['observations']['highRiskHandling']
  },
  permissions:{mayTrade:false,maySign:false,mayApprove:false}
 }};
}
export function diagnosticFreshness(diag:WalletDiagnostic|null,now:number,ttlMs=10*60*1000){
 if(!diag)return 'missing';
 const age=now-Date.parse(diag.observedAt);
 return Number.isFinite(age)&&age>=0&&age<=ttlMs?'recent':'stale';
}
