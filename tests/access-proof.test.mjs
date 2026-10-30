import test from 'node:test';
import assert from 'node:assert/strict';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { parseChallenge, verifyAccessChallenge } from '../lib/access-proof.js';
const actor = privateKeyToAccount(generatePrivateKey());
const now = 1793346300000;
const host = 'rightrail.vercel.app';
const nonce = 'f'.repeat(32);
const message = (id=7, a=actor.address, issued=now, domain=host, n=nonce) =>
  ['RIGHTRAIL ACCESS', 'Host:'+domain, 'Request:'+id,'Actor:'+a,'Issued:'+issued,'Nonce:'+n].join('\n');
test('correct actor and host are recovered from an independently signed proof', async()=>{
  const m=message(),signature=await actor.signMessage({message:m});
  const proof=await verifyAccessChallenge({message:m,signature,host,now});
  assert.equal(proof.requestId,7);
  assert.equal(proof.actor.toLowerCase(),actor.address.toLowerCase());
});
test('different origin cannot replay a valid signature', async()=>{
  const m=message(),signature=await actor.signMessage({message:m});
  await assert.rejects(()=>verifyAccessChallenge({message:m,signature,host:'attacker.example',now}),/mismatch/);
});
test('tampering request id breaks the signature even if formatting is correct',async()=>{
  const m=message(),signature=await actor.signMessage({message:m});
  await assert.rejects(()=>verifyAccessChallenge({message:message(8),signature,host,now}),/Signature/);
});
test('wrong actor cannot reuse signature',async()=>{
  const m=message(),signature=await actor.signMessage({message:m});
  const victim=privateKeyToAccount(generatePrivateKey());
  await assert.rejects(()=>verifyAccessChallenge({message:message(7,victim.address),signature,host,now}),/Signature/);
});
test('expired proof and future-dated proof fail closed',async()=>{
  const m=message(),signature=await actor.signMessage({message:m});
  assert.throws(()=>parseChallenge(m,signature,host,now+120001),/expired/);
  assert.throws(()=>parseChallenge(m,signature,host,now-120001),/expired/);
});
test('malformed or oversized nonce and noncanonical request IDs are rejected',async()=>{
  const m=message(),signature=await actor.signMessage({message:m});
  assert.throws(()=>parseChallenge(message(7,actor.address,now,host,'z'.repeat(32)),signature,host,now),/mismatch/);
  assert.throws(()=>parseChallenge(message('007'),signature,host,now),/mismatch/);
  assert.throws(()=>parseChallenge(m+'\nINJECTED',signature,host,now),/mismatch/);
});
