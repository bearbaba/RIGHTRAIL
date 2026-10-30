import test from 'node:test';
import assert from 'node:assert/strict';
import {encodePersonalSignMessage,walletSignatureIssue} from '../lib/unlock-wallet.js';
test('personal_sign hex encoding preserves the exact EIP-191 challenge',()=>{
  const message='RIGHTRAIL ACCESS\nHost:rightrail.vercel.app\nRequest:1\nActor:0xd6b8a3a5eb329410d9504784812b8569afa8c2af\nIssued:1793363200000\nNonce:'+'0'.repeat(32);
  const hex=encodePersonalSignMessage(message);
  assert.match(hex,/^0x[0-9a-f]+$/);
  assert.equal(new TextDecoder().decode(Uint8Array.from(hex.slice(2).match(/../g),n=>parseInt(n,16))),message);
});
test('wallet rejection is cancellation, never a content access denial',()=>{
  for(const error of [{code:4001,message:'User rejected the request.'},{message:'User denied transaction signature'},{code:'ACTION_REJECTED',message:'rejected'}]){
    const result=walletSignatureIssue(error);
    assert.equal(result.cancelled,true);
    assert.match(result.message,/SIGNATURE CANCELLED/);
    assert.match(result.message,/PERMIT and Receipt remain valid/);
  }
});
test('pending wallet request and unsupported method are diagnosed',()=>{
  assert.match(walletSignatureIssue({code:-32002}).message,/already open/);
  assert.match(walletSignatureIssue({code:4200}).message,/does not support/);
  assert.equal(walletSignatureIssue({message:'Cannot independently verify permission right now'}).cancelled,false);
});
