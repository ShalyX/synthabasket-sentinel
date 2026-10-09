/** Display decisions must not turn a failed simulator into an "expired only" warning. */
export function preflightHeadline(state:{complete:boolean;blocked:boolean;expired:boolean}):string{
 if(state.blocked)return 'SIMULATION BLOCKED · NO TRADE SENT';
 if(state.complete)return 'ALL SELECTED LEGS SIMULATED · ZERO TRADES';
 if(state.expired)return 'QUOTE EXPIRED · NEW SIMULATION REQUIRED';
 return 'AWAITING AN EXPLICIT SIMULATION';
}

/** Follow explicit balance, gas OR allowance failures with a read-only wallet diagnostic.
 * The diagnostic observes balances and allowances; it never authorizes approval.
 * Never infer that a token approval is appropriate just because funds are absent.
 */
export function requiresFundingReadout(passed:boolean,reason:string|null):boolean{
 return !passed&&typeof reason==='string'&&/balance|funds|gas|allowance/i.test(reason);
}
