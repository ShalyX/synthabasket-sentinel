import type {BasketLeg} from './basket';

export type JourneyProofKind='SIMULATION'|'PORTFOLIO';
export type JourneyProofState=
 'SIMULATOR_BLOCKED'|'SIMULATOR_PASSED'|'PARTIAL_REHEARSAL'|
 'PORTFOLIO_EMPTY'|'PORTFOLIO_DRIFT'|'PORTFOLIO_WITHIN_BAND'|'PORTFOLIO_UNPRICED';
export type JourneyProof={
 kind:JourneyProofKind;state:JourneyProofState;walletAddress:string;
 basketKey:string;recordedAt:string;summary:string;source:string;
 observedLegs:number;totalLegs:number;
};
export const basketEvidenceKey=(basket:BasketLeg[])=>basket.map(l=>l.ticker+':'+l.platform+':'+l.weight).join('|');
export function trustedJourneyProof(
 value:JourneyProof, walletAddress:string|null, basket:BasketLeg[],nowMs:number
):boolean{
 if(!walletAddress||!/^0x[0-9a-f]{40}$/i.test(walletAddress)||
    !/^0x[0-9a-f]{40}$/i.test(value.walletAddress)||walletAddress.toLowerCase()!==value.walletAddress.toLowerCase())
  return false;
 if(value.basketKey!==basketEvidenceKey(basket)||basket.length===0||
  value.totalLegs!==basket.length||value.observedLegs<0||value.observedLegs>value.totalLegs)
  return false;
 if(!Number.isFinite(nowMs)||!Number.isFinite(Date.parse(value.recordedAt))||
    Date.parse(value.recordedAt)>nowMs+5_000||
    nowMs-Date.parse(value.recordedAt)>10*60_000)
  return false;
 if(value.summary.length>260||value.source.length>80)return false;
 if(value.kind==='SIMULATION'&&!['SIMULATOR_BLOCKED','SIMULATOR_PASSED','PARTIAL_REHEARSAL'].includes(value.state))return false;
 if(value.kind==='PORTFOLIO'&&!['PORTFOLIO_EMPTY','PORTFOLIO_DRIFT','PORTFOLIO_WITHIN_BAND','PORTFOLIO_UNPRICED'].includes(value.state))return false;
 return true;
}
export function journeyProofLabel(value:JourneyProof,nowMs:number){
 const historical=Date.parse(value.recordedAt)<=nowMs;
 const title:Record<JourneyProofState,string>={
  SIMULATOR_BLOCKED:'Simulator blocked an attempted route',
  SIMULATOR_PASSED:'Simulator predicted success',
  PARTIAL_REHEARSAL:'Some legs were not simulated',
  PORTFOLIO_EMPTY:'No selected issuer positions observed',
  PORTFOLIO_DRIFT:'Observed allocation crossed its band',
  PORTFOLIO_WITHIN_BAND:'Observed allocation within its band',
  PORTFOLIO_UNPRICED:'Portfolio observation incomplete'
 };
 return {title:title[value.state],historical,
  caveat:value.kind==='SIMULATION'?'Read-only upstream prediction, not a real transaction.':'Read-only wallet balance observation, not purchase or ownership certification.'};
}
