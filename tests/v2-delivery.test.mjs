import test from 'node:test';
import assert from 'node:assert/strict';
import { privateKeyToAccount } from 'viem/accounts';
import {parseV2Proof,verifyV2Proof,authorizeDelivery,sha256} from '../lib/v2-delivery.js';
const account=privateKeyToAccount('0x'+'1'.padStart(64,'0')); // public test-only key
const actor=account.address.toLowerCase(), gate='0x'+'a'.repeat(40),rights='0x'+'b'.repeat(40);
const host='example.test', now=1700000000000, content='synthetic private asset';
const message=['RIGHTRAIL V2 ACCESS','Host:'+host,'Chain:61999','Gate:'+gate,'Grant:1',
  'Actor:'+actor,'Issued:'+now,'Nonce:'+'f'.repeat(64)].join('\n');
const signature=await account.signMessage({message});
const proof=await verifyV2Proof(message,signature,{gate,host,now});
test('canonical proof validates; host, deployment, time, tampering fail',async()=>{
  assert.equal(proof.digest,sha256(message));
  assert.throws(()=>parseV2Proof(message,signature,{gate,host:'wrong.test',now}));
  assert.throws(()=>parseV2Proof(message,signature,{gate:rights,host,now}));
  assert.throws(()=>parseV2Proof(message,signature,{gate,host,now:now+1200001}));
  await assert.rejects(verifyV2Proof(message.replace('Grant:1','Grant:2'),signature,{gate,host,now}));
});
function fixture(){
  const grant={id:1,actor,asset_id:2,policy_version:3,content_sha256:sha256(content),
    expires_at:now/1000+120,max_uses:2,used:1,revoked:false};
  const receipt={id:1,grant_id:1,actor,asset_id:2,policy_version:3,content_sha256:sha256(content),
    challenge_sha256:proof.digest,use_number:1,consumed_at:now/1000};
  const asset={id:2,active:true,version:3,content_sha256:sha256(content)};
  const state={grant,receipt,asset,live:true,claimed:false};
  const read=async(a,method,args)=>({receipt_for_challenge:1,get_receipt:receipt,
      get_grant:grant,get_asset:asset,can_deliver:state.live})[method];
  const claim=async()=>{if(state.claimed)return false;state.claimed=true;return true;};
  const input={proof,gate,rights,read,claim,contentFor:()=>content,now:()=>now};
  return {state,input};
}
test('only one concurrent delivery succeeds with atomic claim stub',async()=>{
  const {input}=fixture();
  const out=await Promise.all(Array.from({length:12},()=>authorizeDelivery(input)));
  assert.equal(out.filter(x=>x.ok).length,1);
  assert.equal(out.filter(x=>x.error==='DELIVERY_ALREADY_CLAIMED').length,11);
});
test('wrong receipt grant, actor, digest, resource, or revoked grant never claims',async()=>{
  for(const mutate of [s=>s.receipt.grant_id=2,s=>s.receipt.actor=gate,
    s=>s.receipt.challenge_sha256='0'.repeat(64),s=>s.asset.version=4,
    s=>s.grant.revoked=true,s=>s.live=false,s=>s.grant.expires_at=now/1000]){
    const {state,input}=fixture();mutate(state);
    assert.equal((await authorizeDelivery(input)).ok,false);
    assert.equal(state.claimed,false);
  }
});
test('claim store unavailable fails closed',async()=>{
  const {input}=fixture();input.claim=async()=>{throw Error('offline')};
  await assert.rejects(authorizeDelivery(input),/offline/);
});
test('revocation observed after claim burns claim without delivering',async()=>{
  const {state,input}=fixture();input.claim=async()=>{state.claimed=true;state.live=false;return true;};
  assert.equal((await authorizeDelivery(input)).ok,false);
  assert.equal(state.claimed,true);
});
