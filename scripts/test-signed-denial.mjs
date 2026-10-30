// A valid EIP-191 signature from an unrelated, ephemeral test wallet MUST NOT unlock Asset #1.
import {privateKeyToAccount,generatePrivateKey} from 'viem/accounts';
import {randomBytes} from 'node:crypto';
const wallet=privateKeyToAccount(generatePrivateKey());
const message=['RIGHTRAIL ACCESS','Host:rightrail.vercel.app','Request:1',
  'Actor:'+wallet.address,'Issued:'+Date.now(),'Nonce:'+randomBytes(16).toString('hex')].join('\n');
const signature=await wallet.signMessage({message});
const response=await fetch('https://rightrail.vercel.app/api/unlock',{
 method:'POST',headers:{'content-type':'application/json'},
 body:JSON.stringify({message,signature}),signal:AbortSignal.timeout(18000)
});
const body=await response.json();
if(response.status!==403 || body.error!=='No currently valid on-chain permit and receipt')
 throw Error('Expected 403 for validly signed wrong wallet, got '+JSON.stringify({status:response.status,body}));
console.log('VALID_SIGNATURE_WRONG_WALLET_DENIED '+JSON.stringify({httpStatus:403,reason:body.error,proofPassed:true,contentReleased:false}));
