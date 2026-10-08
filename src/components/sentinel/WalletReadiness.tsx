'use client';
import {useState} from 'react';
import {CheckCircle2,FileJson,Info,LockKeyhole,ShieldCheck,ShieldX} from 'lucide-react';
import {
 diagnosticFreshness,parseWalletDiagnostic,type WalletDiagnostic
} from '@/lib/sentinel/wallet-diagnostic';

const entry=(status:boolean)=>status?'Observed':'Not confirmed';
export function WalletReadiness({now}:{now:number}){
 const [diagnostic,setDiagnostic]=useState<WalletDiagnostic|null>(null);
 const [error,setError]=useState('');
 const freshness=diagnosticFreshness(diagnostic,now);
 const checks=diagnostic?.observations;
 const safe=!!checks&&checks.walletConnected&&checks.bscSupported&&
  checks.tokenScopeRestricted&&checks.dailyLimitConfigured&&
  (checks.highRiskHandling==='AUTO_REJECT'||checks.highRiskHandling==='APP_CONFIRMATION');
 async function importFile(file?:File){
  setDiagnostic(null);setError('');
  if(!file)return;
  if(file.size>4096){setError('This does not look like the small, sanitized diagnostic file.');return;}
  try{
   const parsed=parseWalletDiagnostic(JSON.parse(await file.text()));
   if(!parsed.ok){setError(parsed.error);return;}
   setDiagnostic(parsed.value);
  }catch{setError('Could not read a valid JSON diagnostic.');}
 }
 return <section className="desk-wallet-observation" aria-labelledby="desk-wallet-heading">
  <div className="desk-wallet-obs-index"><span>WALLET / LOCAL DEVICE</span><span><LockKeyhole size={14}/> READ-ONLY</span></div>
  <div className="desk-wallet-obs-intro">
   <h3 id="desk-wallet-heading">A private<br/><em>handshake.</em></h3>
   <p>Sentinel never connects your Binance MPC session to a public server. Import a sanitized device check to review connection and security posture <strong>without giving the website wallet access.</strong></p>
  </div>
  <label className="desk-wallet-file-label" htmlFor="desk-wallet-diagnostic">
   <FileJson size={16}/> Local diagnostic (.json)
  </label>
  <input id="desk-wallet-diagnostic" type="file" accept=".json,application/json"
   onChange={event=>{const file=event.currentTarget.files?.[0];void importFile(file);event.currentTarget.value='';}}
   className="desk-wallet-file-input"/>
  <p className="desk-wallet-obs-instruction">
   On your PC, run <code>node scripts/agentic-wallet-diagnostic.mjs</code>. Open the file it creates in your system’s temporary folder.
  </p>
  {error&&<div className="desk-wallet-obs-error" role="alert"><ShieldX size={16}/>{error}</div>}
  {diagnostic&&checks&&<div className="desk-wallet-obs-result" role="status">
   <div className="desk-wallet-obs-status">
    {freshness==='recent'&&safe?<CheckCircle2 size={21}/>:<Info size={21}/>}
    <span><strong>{freshness==='stale'?'Check is out of date':safe?'Read-only checks observed':'Some checks need attention'}</strong>
     <small>{new Date(diagnostic.observedAt).toLocaleString()} · Imported file, not a live website connection</small></span>
   </div>
   <div className="desk-wallet-obs-row"><span>Wallet at observation</span><strong>{entry(checks.walletConnected)}</strong></div>
   <div className="desk-wallet-obs-row"><span>BNB Smart Chain</span><strong>{checks.bscSupported?'Supported':'Not confirmed'}</strong></div>
   <div className="desk-wallet-obs-row"><span>Token restrictions</span><strong>{checks.tokenScopeRestricted?'Enabled':'Unverified'}</strong></div>
   <div className="desk-wallet-obs-row"><span>High-risk policy</span><strong>{checks.highRiskHandling==='AUTO_REJECT'?'Auto-reject':checks.highRiskHandling==='APP_CONFIRMATION'?'App confirmation':'Unknown'}</strong></div>
   <div className="desk-wallet-obs-row"><span>Daily spend cap</span><strong>{checks.dailyLimitConfigured?'Configured':'Unverified'}</strong></div>
   <div className="desk-wallet-obs-denial"><LockKeyhole size={14}/>{freshness==='recent'?'Snapshot valid for display only.':'Device check older than ten minutes.'} No trade authorization is granted.</div>
  </div>}
  {!diagnostic&&!error&&<div className="desk-wallet-obs-empty">
   <ShieldCheck size={18}/><span>No local check imported. Wallet state is not available to this website.</span>
  </div>}
 </section>;
}
