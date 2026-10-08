import {NextRequest,NextResponse} from 'next/server';
import {assessPreview} from '@/lib/sentinel/policy';
import {tokenUnits,type QuotePreview} from '@/lib/sentinel/model';
import {BSC_USDT,binanceGet,getSentinelMarkets,UpstreamError} from '@/lib/sentinel/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const limits=new Map<string,{count:number,until:number}>();
export async function POST(req:NextRequest){
 const ip=(req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown').slice(0,80);
 const now=Date.now(),before=limits.get(ip);
 if(before&&before.until>now&&before.count>=12)return NextResponse.json({error:'Quote rate limit reached; retry in a minute.'},{status:429});
 limits.set(ip,before&&before.until>now?{count:before.count+1,until:before.until}:{count:1,until:now+60000});
 if(limits.size>2000)limits.clear();
 let request:unknown;
 try{if(Number(req.headers.get('content-length')||'0')>2048)throw new Error('Large body');request=await req.json();}
 catch{return NextResponse.json({error:'Invalid request JSON.'},{status:400});}
 if(!request||typeof request!=='object')return NextResponse.json({error:'Invalid quote request.'},{status:400});
 const {ticker,platform,amountUsd,walletAddress}=request as Record<string,unknown>;
 if(typeof ticker!=='string'||!/^[A-Z0-9.-]{1,16}$/.test(ticker)||!['ondo','bstock'].includes(String(platform))||
  typeof amountUsd!=='number'||!Number.isFinite(amountUsd)||amountUsd<1||amountUsd>250||
  Math.abs(Math.round(amountUsd*100)-amountUsd*100)>1e-5)
  return NextResponse.json({error:'Provide a valid ticker, provider and $1–$250 amount (two decimals).'},{status:400});
 if(walletAddress!==undefined&&(typeof walletAddress!=='string'||!/^0x[a-f0-9]{40}$/i.test(walletAddress)))
  return NextResponse.json({error:'Invalid public EVM wallet address.'},{status:400});
 try{
  const markets=await getSentinelMarkets();
  const token=markets.tokens.find(t=>t.ticker===ticker&&t.platform===platform);
  if(!token)return NextResponse.json({error:'Token is not in the verified live BSC inventory.'},{status:404});
  if(token.tradingAvailable!==true)return NextResponse.json({error:'Issuer has not confirmed this token is open for trading.'},{status:409});
  const amount=(BigInt(Math.round(amountUsd*100))*10n**16n).toString();
  const qs:Record<string,string>={binanceChainId:'56',amount,fromTokenAddress:BSC_USDT,toTokenAddress:token.address};
  if(typeof walletAddress==='string')qs.userWalletAddress=walletAddress;
  const data=await binanceGet('/api/v1/dex/aggregator/quote',qs);
  if(!Array.isArray(data)||!data.length)return NextResponse.json({error:'No executable venue offered a quote.'},{status:409});
  const route=data.find(r=>r?.executionMode==='SWAP'&&r.toTokenAmount)||
   data.find(r=>r?.executionMode==='RFQ'&&r.toTokenAmount);
  if(!route||!['SWAP','RFQ'].includes(route.executionMode))
   return NextResponse.json({error:'No supported SWAP/RFQ route returned.'},{status:409});
  const received=tokenUnits(String(route.toTokenAmount||''),token.decimals);
  if(received===null||received<=0)throw new UpstreamError('The quoted token amount is invalid.',0);
  const impactValue=route.priceImpactPercent==null?null:Number(route.priceImpactPercent);
  const impact=impactValue!==null&&Number.isFinite(impactValue)?impactValue:null;
  const checkedAt=new Date().toISOString();
  const preview:QuotePreview={ticker,platform:token.platform,address:token.address,amountUsd,
   tokenAmount:received,vendor:typeof route.vendorName==='string'?route.vendorName.slice(0,60):null,
   mode:route.executionMode,priceImpactPct:impact,
   reportedFee:route.tradeFee!=null?String(route.tradeFee).slice(0,40):null,checkedAt,
   review:assessPreview(token,amountUsd,impact,checkedAt)};
  return NextResponse.json(preview,{headers:{'Cache-Control':'no-store'}});
 }catch(e){const err=e instanceof UpstreamError?e:new UpstreamError('Quote could not be obtained.',0);
  return NextResponse.json({error:err.message,code:err.code},{status:err.httpStatus});
 }
}
