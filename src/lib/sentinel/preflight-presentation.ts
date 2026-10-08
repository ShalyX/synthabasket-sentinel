/** Display decisions must not turn a failed simulator into an "expired only" warning. */
export function preflightHeadline(state:{complete:boolean;blocked:boolean;expired:boolean}):string{
 if(state.blocked)return 'SIMULATION BLOCKED · NO TRADE SENT';
 if(state.complete)return 'ALL SELECTED LEGS SIMULATED · ZERO TRADES';
 if(state.expired)return 'QUOTE EXPIRED · NEW SIMULATION REQUIRED';
 return 'AWAITING AN EXPLICIT SIMULATION';
}

/** Follow a funding-related simulator failure with a read-only balance check.
 * Never interpret absence of funds as evidence that an approval is needed.
 */
export function requiresFundingReadout(passed:boolean,reason:string|null):boolean{
 return !passed&&typeof reason==='string'&&/balance|funds|gas/i.test(reason);
}
