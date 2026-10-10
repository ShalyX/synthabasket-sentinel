import type {Platform} from './model';

/**
 * Trading eligibility is NOT an attribute of a price quote, market inventory,
 * wallet address, deployment region, claimed country, or IP geolocation alone.
 * No verified product-specific Binance country-eligibility API response or
 * issuer/wallet admission attestation is currently available to this service.
 *
 * A provider entitlement API is still preferable. Until one is available, a
 * live action may proceed only on the user's explicit, per-review attestation.
 * The result must remain labelled USER_ATTESTED; it is never represented as
 * provider verification or inferred from wallet, IP address, quote or inventory.
 */
export type IssuerEligibilityVerdict=
 |{platform:Platform;state:'NOT_ATTESTED';canTrade:false;source:'NO_USER_ATTESTATION';reason:string}
 |{platform:Platform;state:'USER_ATTESTED';canTrade:true;source:'EXPLICIT_USER_ATTESTATION';reason:string};
export function assessIssuerTradingEligibility(platform:Platform,userAttested=false):IssuerEligibilityVerdict{
 if(!userAttested)return {platform,state:'NOT_ATTESTED',canTrade:false,source:'NO_USER_ATTESTATION',
  reason:'Confirm that you are eligible to trade the selected issuer product in your jurisdiction. A quote or wallet connection is not proof of eligibility.'};
 return {platform,state:'USER_ATTESTED',canTrade:true,source:'EXPLICIT_USER_ATTESTATION',
  reason:'User explicitly attested eligibility for this fresh execution review. Sentinel has not independently verified the issuer account, jurisdiction or legal entitlement.'};
}
