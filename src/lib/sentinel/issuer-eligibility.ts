import type {Platform} from './model';

/**
 * Trading eligibility is NOT an attribute of a price quote, market inventory,
 * wallet address, deployment region, claimed country, or IP geolocation alone.
 * No verified product-specific Binance country-eligibility API response or
 * issuer/wallet admission attestation is currently available to this service.
 *
 * Fail CLOSED for all actual tokenized-securities spending until a vetted
 * provider adapter securely attests the person, product, jurisdiction, wallet,
 * terms and expiry. No env flag, self-attestation or unsigned JSON can open it.
 */
export interface IssuerEligibilityVerdict{
 platform:Platform;state:'NOT_VERIFIED';canTrade:false;
 source:'NO_VERIFIED_ISSUER_ENTITLEMENT';reason:string;
};
export function assessIssuerTradingEligibility(platform:Platform):IssuerEligibilityVerdict{
 return {
  platform,state:'NOT_VERIFIED',canTrade:false,source:'NO_VERIFIED_ISSUER_ENTITLEMENT',
  reason:platform==='bstock'?
   'bStocks requires issuer-verified user/product/jurisdiction access and the official country-eligibility API; quote, wallet or location are not proof. Live execution is locked.':
   'This tokenized security requires independently verified issuer/user/jurisdiction access. Live execution is locked.'
 };
}
