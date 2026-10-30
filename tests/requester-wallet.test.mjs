import test from 'node:test';
import assert from 'node:assert/strict';
import {requesterWalletStatus} from '../lib/requester-wallet.js';
const creator='0x4C7cb73aC8F8999af21cfc9fF4cF2333a9508Dcb';
const requester='0xd6b8a3a5eb329410d9504784812b8569afa8c2af';
test('same wallet matches case-insensitively',()=>{
  assert.equal(requesterWalletStatus(requester,requester.toUpperCase().replace(/^0X/,'0x')).match,true);
});
test('asset creator and a different requester cannot share the same permission',()=>{
  const state=requesterWalletStatus(requester,creator);
  assert.equal(state.match,false);
  assert.match(state.reason,/Wrong wallet/);
  assert.ok(state.reason.includes(creator));
  assert.ok(state.reason.includes(requester));
});
test('disconnected wallets are not assumed to be eligible',()=>{
  const state=requesterWalletStatus(requester,null);
  assert.equal(state.match,false);
  assert.match(state.reason,/No wallet connected/);
});
