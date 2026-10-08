'use client';
import Link from 'next/link';
import {useParams,useRouter} from 'next/navigation';
import {useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,Check,Clock3,Info,Plus,RefreshCw} from 'lucide-react';
import {useDesk,useStock} from '@/components/sentinel/DeskContext';
import {AgenticQuoteHandoff} from '@/components/sentinel/AgenticQuoteHandoff';
import {WrapperQuoteComparison} from '@/components/sentinel/WrapperQuoteComparison';
import {BlankState,ClearBanner,Eyebrow,SourceStamp,TokenMark} from '@/components/sentinel/DeskBits';
import {formatBasis,formatUsd,type Equity,type Platform,type QuotePreview} from '@/lib/sentinel/model';
import {previewIsFresh} from '@/lib/sentinel/policy';
import {needsOndoAddress,ONDO_PUBLIC_ADDRESS_REQUIRED,publicWalletAddressValid} from '@/lib/sentinel/quote-issues';
type QuoteStatus={loading:boolean;quote?:QuotePreview;error?:string};
export default function EquityDossier(){
 const params=useParams<{ticker:string}>(),router=useRouter();
 const ticker=String(params.ticker||'').toUpperCase(),tokens=useStock(ticker);
 const {snapshot,feed,basket,addToken}=useDesk();
 const [wallet,setWallet]=useState(''),[quotes,setQuotes]=useState<Partial<Record<Platform,QuoteStatus>>>({}),[now,setNow]=useState(Date.now());
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id);},[]);
 const reference=tokens[0]?.referencePrice??null;
 const name=tokens[0]?.company||ticker;
 const issuerList=[...tokens].sort((a,b)=>a.platform==='bstock'?-1:b.platform==='bstock'?1:0);
 const baseAsset=issuerList[0];
 const inBasket=(t:Equity)=>basket.find(b=>b.ticker===t.ticker&&b.platform===t.platform);
 const canAdd=(t:Equity)=>basket.length<4||basket.some(b=>b.ticker===t.ticker);
 const comparisonBusy=issuerList.some(t=>quotes[t.platform]?.loading);
 const comparisonCannotRefresh=feed!=='live'?'The live issuer inventory is unavailable.':
  issuerList.length!==2?'This stock needs both bStocks and Ondo contracts to compare.':
  issuerList.some(t=>t.tradingAvailable!==true)?'Both issuers must indicate trading availability.':
  issuerList.some(t=>t.platform==='ondo')&&!publicWalletAddressValid(wallet)?'Enter a valid public BSC receiving address above to inspect both quotes.':null;
 const quote=async(token:Equity)=>{
  if(needsOndoAddress(token.platform,wallet)){
   setQuotes(q=>({...q,[token.platform]:{loading:false,error:ONDO_PUBLIC_ADDRESS_REQUIRED}}));
   document.getElementById('desk-dossier-wallet')?.focus();
   return;
  }
  if(wallet.trim()&&!publicWalletAddressValid(wallet)){
   setQuotes(q=>({...q,[token.platform]:{loading:false,error:'Enter a valid public BSC wallet address (0x followed by 40 hexadecimal characters), or leave it blank for a wallet-free SWAP quote.'}}));
   document.getElementById('desk-dossier-wallet')?.focus();
   return;
  }
  setQuotes(q=>({...q,[token.platform]:{loading:true}}));
  try{
   const payload:Record<string,unknown>={ticker,platform:token.platform,amountUsd:10};
   if(wallet.trim())payload.walletAddress=wallet.trim();
   const response=await fetch('/api/sentinel/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||'No quote available.');
   setQuotes(q=>({...q,[token.platform]:{loading:false,quote:result}}));
  }catch(e){setQuotes(q=>({...q,[token.platform]:{loading:false,error:e instanceof Error?e.message:'Quote request failed.'}}));}
 };
 function add(t:Equity){addToken(t);router.push('/sentinel/baskets');}
 return <div className="desk-wrap desk-internal-page">
  <div className="desk-breadcrumb"><Link href="/sentinel">THE BRIEF</Link><span>→</span><Link href="/sentinel/markets">MARKET INDEX</Link><span>→</span><b>{ticker}</b></div>
  {!tokens.length&&!snapshot?<BlankState title="Waiting for the inventory." description="This instrument can only be inspected when the RWA feed responds." action={<Link href="/sentinel/markets" className="desk-button-ink">Return to the index <ArrowRight size={15}/></Link>}/>:null}
  {!tokens.length&&snapshot?<BlankState title="No verified instrument for this ticker." description="It may not be issued by the supported platforms on BSC." action={<Link href="/sentinel/markets" className="desk-button-ink">Browse available stocks <ArrowRight size={15}/></Link>}/>:null}
  {tokens.length>0&&<>
   <section className="desk-dossier-hero">
    <div className="desk-dossier-hero-main"><Eyebrow>INSTRUMENT DOSSIER / {ticker}</Eyebrow><div className="desk-dossier-heading"><TokenMark token={baseAsset} size="large"/><h1>{ticker}<span>.</span></h1></div><p className="desk-dossier-company">{name}</p><div className="desk-dossier-notation"><span>UNDERLYING STOCK</span><strong>{formatUsd(reference,2)}</strong><small>Reference mark, not an executable quote.</small></div></div>
    <div className="desk-dossier-hero-side"><span>DOSSIER SUMMARY</span><div><b>{issuerList.length}</b><small>ISSUER CONTRACT{issuerList.length===1?'':'S'} ON BSC</small></div><p>Different contract wrappers can mean different parity and venue access. Never assume a ticker identifies the exact token.</p><SourceStamp/></div>
   </section>
   <section className="desk-equation-explain"><div><b>PRICE CONSTRUCTION</b><p><span>Share reference</span> × <span>Token-to-share conversion</span> = <span>Adjusted parity</span>. The observed token mark can deviate from that parity.</p></div><Link href="/sentinel/review">How we evaluate execution <ArrowUpRight size={16}/></Link></section>
   <section className="desk-quote-receiver" aria-label="Public BSC address for RFQ quotes">
    <div><span>QUOTE RECEIVER / PUBLIC ADDRESS</span><p>bStocks SWAP quotes can work without a wallet. <strong>Ondo also returned a SWAP quote, but required a public BSC receiving address in our test.</strong> This is not a wallet connection.</p></div>
    <div className="desk-dossier-context-form"><label htmlFor="desk-dossier-wallet">PUBLIC BSC ADDRESS / QUOTE RECEIVER</label><input id="desk-dossier-wallet" value={wallet} onChange={e=>{setWallet(e.target.value);setQuotes({});}} placeholder="0x… (public address only)" autoComplete="off" spellCheck={false} aria-describedby="desk-dossier-wallet-note"/><span id="desk-dossier-wallet-note">Only sent to Binance if you explicitly request a quote. Never enter a private key or seed phrase. No signing or transaction is performed.</span></div>
   </section>
   <div className="desk-issuer-strap"><span>ISSUERS / SIDE BY SIDE</span><span>BSC MAINNET · PER-TOKEN BASIS</span></div>
   <section className={'desk-dossier-issuers '+(issuerList.length===1?'single':'')}>
    {issuerList.map((token,i)=>{
     const state=quotes[token.platform],fresh=previewIsFresh(state?.quote,now);
     const parity=token.referencePrice!==null&&token.tokenToShareRatio!==null?token.referencePrice*token.tokenToShareRatio:null;
     const age=state?.quote?Math.max(0,30-Math.floor((now-Date.parse(state.quote.checkedAt))/1000)):0;
     return <article className="desk-issuer-sheet" key={token.platform}>
      <div className="desk-issuer-sheet-header"><span>ISSUER Nº {String(i+1).padStart(2,'0')} / {token.platform==='bstock'?'BSTOCKS':'ONDO'}</span><span className={'desk-availability '+(token.tradingAvailable===true?'good':'bad')}><i/>{token.tradingAvailable===true?'TRADING INDICATED':token.tradingAvailable===false?'RESTRICTED / CLOSED':'UNVERIFIED'}</span></div>
      <div className="desk-issuer-sheet-title"><div><b>{token.symbol}</b><p>{token.platform==='bstock'?'bStocks':'Ondo Finance'} · BEP-20 compatible token</p></div><span className="desk-issuer-initial">{token.platform==='bstock'?'B':'O'}</span></div>
      <div className="desk-issuer-price"><small>OBSERVED TOKEN MARK</small><strong>{formatUsd(token.tokenPrice,4)}</strong></div>
      <div className="desk-issuer-math">
       <div><span>Reference price / share</span><b>{formatUsd(token.referencePrice,4)}</b></div>
       <div><span>× Token-to-share ratio</span><b>{token.tokenToShareRatio?.toFixed(6)??'—'}</b></div>
       <div className="subtotal"><span>= Converted reference</span><b>{formatUsd(parity,4)}</b></div>
       <div className="total"><span>ADJUSTED PREMIUM / DISCOUNT</span><b className={Math.abs(token.basisPct??0)>2.5?'risk':''}>{formatBasis(token.basisPct)}</b></div>
      </div>
      <div className="desk-issuer-details"><p><span>Reference session</span><b>{token.marketSession||'Not specified by issuer'}</b></p><p><span>Contract address</span><a href={'https://bscscan.com/address/'+token.address} target="_blank" rel="noreferrer">{token.address.slice(0,10)}…{token.address.slice(-8)} <ArrowUpRight size={13}/></a></p></div>
      <div className="desk-issuer-sheet-actions"><button type="button" disabled={!canAdd(token)} className="desk-button-ink" onClick={()=>add(token)}>{inBasket(token)?'Change selected issuer':'Add to basket'} <Plus size={15}/></button><button type="button" className="desk-button-outline" disabled={state?.loading||feed!=='live'||token.tradingAvailable!==true} onClick={()=>void quote(token)}>{state?.loading?<RefreshCw size={16} className="desk-spin"/>:<ArrowUpRight size={16}/>} Inspect $10 quote</button></div>
      {needsOndoAddress(token.platform,wallet)&&<p className="desk-issuer-quote-requirement">For the Ondo quote, enter your public BSC receiving address above. The returned route may be SWAP or RFQ; no connection or signature is requested.</p>}
      {state?.error&&<ClearBanner type="warning">{state.error}</ClearBanner>}
      {state?.quote&&<div className={'desk-quote-slip '+(fresh?'current':'expired')}><div><b>VENUE INDICATION</b><span>{fresh?age+'s left':'EXPIRED'}</span></div><strong>{state.quote.tokenAmount.toLocaleString('en-US',{maximumFractionDigits:8})} {token.symbol}</strong><p>{state.quote.mode} · {state.quote.vendor||'Unidentified venue'} · {state.quote.priceImpactPct===null?'Impact not provided':state.quote.priceImpactPct.toFixed(4)+'% reported impact'}</p><small>{state.quote.review.status==='blocked'?'Policy flagged: '+state.quote.review.reasons.join(' '):'Informational check passed. No trade authorization.'}</small></div>}
     </article>;
    })}
   </section>
   {issuerList.length===2&&<WrapperQuoteComparison ticker={ticker} tokens={issuerList} quotes={quotes} now={now}
    cannotRefreshReason={comparisonCannotRefresh} refreshing={comparisonBusy}
    refreshBoth={()=>{if(!comparisonCannotRefresh&&!comparisonBusy)void Promise.all(issuerList.map(quote));}}/>}
   <AgenticQuoteHandoff ticker={ticker} tokens={issuerList} quotes={quotes} now={now}/>
   <section className="desk-dossier-context"><div><Eyebrow>READING THE RECORD</Eyebrow><h2>Two marks.<br/><em>One underlying.</em></h2></div><p>Token price, stock reference, and token-to-share ratio serve different purposes. A small basis does not guarantee depth or execution, and an open issuer status does not establish your personal eligibility. Quotes must be requested at the time of evaluation. Even a successful RFQ remains indicative until executed through an eligible wallet.</p></section>
   <div className="desk-dossier-bottom"><Link href="/sentinel/markets"><ArrowLeft size={16}/> All stocks</Link><Link href="/sentinel/baskets">Open basket studio <ArrowRight size={17}/></Link></div>
  </>}
 </div>;
}
