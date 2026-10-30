/** Read-only identity check: rights are tied to the exact requester wallet. */
export function requesterWalletStatus(requester, connected) {
  if(!/^0x[0-9a-fA-F]{40}$/.test(requester||'')) return {match:false,reason:'Invalid requester address in the on-chain record.'};
  if(!/^0x[0-9a-fA-F]{40}$/.test(connected||'')) return {match:false,reason:'No wallet connected. Connect the Requester wallet '+requester+' to unlock.'};
  if(requester.toLowerCase()!==connected.toLowerCase()) return {match:false,reason:'Wrong wallet: connected '+connected+'; the Requester is '+requester+'. Switch MetaMask to the Requester account.'};
  return {match:true,reason:'Correct Requester wallet connected: '+connected};
}
