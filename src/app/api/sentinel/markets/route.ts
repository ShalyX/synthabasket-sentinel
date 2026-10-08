import { NextResponse } from 'next/server';
import {getSentinelMarkets,UpstreamError} from '@/lib/sentinel/server';
export const runtime='nodejs';
// Deployment region is configured centrally in vercel.json (sin1).
export const dynamic='force-dynamic';
export async function GET(){
 try{return NextResponse.json(await getSentinelMarkets(),{headers:{'Cache-Control':'private, no-store'}});}
 catch(e){const err=e instanceof UpstreamError?e:new UpstreamError('Market discovery failed.',0);
  return NextResponse.json({error:err.message,code:err.code,available:false,tokens:[]},{status:err.httpStatus,headers:{'Cache-Control':'no-store'}});
 }
}
