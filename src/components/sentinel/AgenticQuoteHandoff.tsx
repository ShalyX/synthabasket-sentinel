'use client';
import {useState} from 'react';
import {ArrowUpRight,Check,Clipboard,FileJson,LockKeyhole,ShieldAlert} from 'lucide-react';
import {compareAgenticQuote,parseAgenticQuote,BSC_USDT_ADDRESS,type AgenticQuoteObservation} from '@/lib/sentinel/agentic-quote';
import type {Equity,Platform,QuotePreview} from '@/lib/sentinel/model';

type QuoteState={loading:boolean;quote?:QuotePreview;error?:string};
interface Props {ticker:string;tokens:Equity[];quotes:Partial<Record<Platform,QuoteState>>;now:number;}
const show=(n:number)=>n.toLocaleString('en-US',{maximumFractionDigits:8});
export function AgenticQuoteHandoff({ticker,tokens,quotes,now}:Props){
 const [platform,setPlatform]=useState<Platform>('bstock');
 const [evidence,setEvidence]=useState<AgenticQuoteObservation|null>(null);
 const [error,setError]=useState('');
 const [copied,setCopied]=useState(false);
 const token=tokens.find(t=>t.platform===platform)||tokens[0];
 const cliReady=!!token&&token.tradingAvailable===true&&/^[A-Za-z0-9._-]{1,30}$/.test(token.symbol);
 const amount=10;
 const command=cliReady?[
  'baw market-order quote --fromTokenQty',String(amount),'--fromToken',BSC_USDT_ADDRESS,
  '--toToken',token.address,'--binanceChainId 56 --json',
  '| node scripts/agentic-wallet-quote-handoff.mjs',
  '--ticker',ticker,'--platform',token.platform,'--token',token.address,'--symbol',token.symbol,'--amount',String(amount)
 ].join(' '):'';
 const compare=evidence?compareAgenticQuote(evidence,token,token?quotes[token.platform]?.quote:undefined,now):null;
 const notes:Record<string,string>={
  'invalid-instrument':'This observation does not match the selected live contract, symbol, or quote amount.',
  'stale-local':'The local quote is over two minutes old (or its timestamp is invalid). Refresh it on your own device.',
  'venue-missing':'Local quote recorded. Request a fresh $10 quote above for this same issuer to compare venues.',
  'venue-expired':'The hosted venue quote has expired. Request a new $10 quote above.',
  'ready':'Both independent quote indications are recent. Differences do not constitute a trade recommendation.'
 };
 async function importFile(file?:File){
  setEvidence(null);setError('');
  if(!file)return;
  if(file.size>4096){setError('Please import only the small sanitized quote file.');return;}
  try{
   const parsed=parseAgenticQuote(JSON.parse(await file.text()));
   if(!parsed.ok){setError(parsed.error);return;}
   setEvidence(parsed.value);setPlatform(parsed.value.platform);
  }catch{setError('Could not parse a sanitized Agentic Wallet quote observation.');}
 }
 async function copyCommand(){
  if(!command)return;
  try{await navigator.clipboard.writeText(command);setCopied(true);setError('');}
  catch{setError('Clipboard unavailable; select and copy the command instead.');}
 }
 return <section className="desk-agentic-quote" aria-labelledby="desk-agentic-heading">
  <div className="desk-agentic-heading-row">
   <span className="desk-agentic-kicker">LOCAL WALLET / SECOND OPINION</span>
   <span className="desk-agentic-nonexec"><LockKeyhole size={14}/> QUOTE ONLY</span>
  </div>
  <div className="desk-agentic-lead">
   <div><h2 id="desk-agentic-heading">Two quote engines.<br/><em>Zero wallet access.</em></h2>
    <p>Compare Binance Web3's hosted venue indication with an Agentic Wallet quote from your own PC. The wallet session stays there. Sentinel sees only a sanitized file you choose to import.</p>
   </div>
   <span className="desk-agentic-glyph" aria-hidden="true">↗</span>
  </div>
  <div className="desk-agentic-columns">
   <div className="desk-agentic-column">
    <div className="desk-agentic-number">01 / RUN LOCALLY</div>
    <label htmlFor="desk-agentic-issuer">ISSUER CONTRACT</label>
    <select id="desk-agentic-issuer" value={token?.platform||'bstock'} onChange={e=>{setPlatform(e.target.value as Platform);setCopied(false);setError('');setEvidence(null);}}>
     {tokens.map(x=><option key={x.platform} value={x.platform}>{x.platform==='bstock'?'bStocks':'Ondo'} · {x.symbol}</option>)}
    </select>
    <p>The command requests a <b>$10 USDT quote</b> for the selected live BSC contract. It never submits a swap.</p>
    {command?<div className="desk-agentic-command"><code>{command}</code></div>:<div className="desk-agentic-placeholder">A verified, trading-indicated issuer is required to prepare a command.</div>}
    <button type="button" className="desk-agentic-copy" onClick={()=>void copyCommand()} disabled={!command}><Clipboard size={14}/>{copied?'Command copied':'Copy safe quote command'}</button>
   </div>
   <div className="desk-agentic-column">
    <div className="desk-agentic-number">02 / IMPORT EVIDENCE</div>
    <label htmlFor="desk-agentic-file">SANITIZED DEVICE QUOTE (.JSON)</label>
    <input id="desk-agentic-file" type="file" accept=".json,application/json" onChange={e=>{const file=e.currentTarget.files?.[0];void importFile(file);e.currentTarget.value='';}}/>
    <p>Run the command in this repository on your PC. The sanitizer drops raw quote IDs and wallet/session information, writing a JSON file in your temporary folder.</p>
    {error&&<p className="desk-agentic-error" role="alert"><ShieldAlert size={15}/>{error}</p>}
    {!evidence?<div className="desk-agentic-await"><FileJson size={21}/><span>Waiting for an optional local quote.<small>Nothing is uploaded or stored.</small></span></div>:
     <div className="desk-agentic-evidence" role="status">
      <div className="desk-agentic-evidence-top"><span><Check size={15}/> USER-SUPPLIED OBSERVATION</span><time>{new Date(evidence.observedAt).toLocaleTimeString()}</time></div>
      <div className="desk-agentic-values"><div><span>AGENTIC WALLET / LOCAL</span><strong>{show(compare?.localAmount??0)} <small>{evidence.tokenSymbol}</small></strong></div>
       <div><span>BINANCE WEB3 / HOSTED</span><strong>{compare?.venueAmount?show(compare.venueAmount):'—'} <small>{token?.symbol||''}</small></strong></div></div>
      {compare?.state==='ready'&&compare.deltaPct!==null?<div className="desk-agentic-delta"><b>{compare.deltaPct>0?'+':''}{compare.deltaPct.toFixed(2)}%</b><span>Indicative local vs hosted quantity. Routing, fees and slippage may differ.</span></div>:null}
      <p className="desk-agentic-state">{notes[compare?.state||'invalid-instrument']}</p>
     </div>}
   </div>
  </div>
  <div className="desk-agentic-disclaimer"><LockKeyhole size={15}/><span>A local JSON observation is not cryptographic wallet attestation, a verified order or spending permission. No session, approvals or transactions reach this website. <a href="https://github.com/ShalyX/synthabasket-sentinel/blob/main/docs/sentinel/AGENTIC_QUOTE_HANDOFF.md" target="_blank" rel="noreferrer">Integration notes <ArrowUpRight size={12}/></a></span></div>
 </section>;
}
