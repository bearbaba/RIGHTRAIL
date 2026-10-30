/** EIP-1193 personal_sign expects an 0x-prefixed UTF-8 message. */
export function encodePersonalSignMessage(message) {
  if(typeof message!=='string') throw new Error('Invalid signature message');
  return '0x'+Array.from(new TextEncoder().encode(message),v=>v.toString(16).padStart(2,'0')).join('');
}
export function walletSignatureIssue(error) {
  const code=error?.code??error?.data?.originalError?.code??error?.error?.code;
  const raw=String(error?.shortMessage??error?.message??error??'');
  const cancelled=code===4001||code==='ACTION_REJECTED'||/user (rejected|denied|cancelled|canceled)|request (rejected|denied)|rejected by user/i.test(raw);
  if(cancelled) return {cancelled:true,message:'SIGNATURE CANCELLED: The wallet did not approve the RIGHTRAIL ACCESS message. Your on-chain PERMIT and Receipt remain valid. Open the wallet extension and click Verify wallet & unlock again when ready. No GEN was spent.'};
  if(code===-32002||/already pending|request already pending|already processing/i.test(raw))
    return {cancelled:false,message:'A wallet signature request is already open. Check the wallet extension and finish or cancel the previous prompt before retrying.'};
  if(code===4200||/unsupported method|method not supported/i.test(raw))
    return {cancelled:false,message:'This wallet does not support personal_sign. Use an EIP-1193 wallet that can sign an EIP-191 message, then reconnect the requester account.'};
  return {cancelled:false,message:'Wallet signature failed: '+(raw||'Unknown wallet error')};
}
