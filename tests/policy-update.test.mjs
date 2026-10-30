import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePolicyUpdate,confirmPolicyUpdate} from '../lib/policy-update.js';
const creator='0x4C7cb73aC8F8999af21cfc9fF4cF2333a9508Dcb';
const requester='0xD6b8A3A5eB329410D9504784812b8569afA8C2aF';
const previous='Version 2: All uses require separate written creator approval.';
const next='Free non-commercial educational tutorials are allowed with clear creator credit and a visible link; paid ads, resale, and AI training are prohibited.';
const asset={active:true,version:2,owner:creator.toLowerCase(),policy:previous};
test('creator may prepare a replacement policy with prior version pinned',()=>{
  assert.deepEqual(preparePolicyUpdate(asset,creator,next),{policy:next,priorVersion:2});
});
test('noncreator cannot change the policy',()=>{
  assert.throws(()=>preparePolicyUpdate(asset,requester,next),/Creator/);
});
test('identical, short, inactive policy updates are refused',()=>{
  assert.throws(()=>preparePolicyUpdate(asset,creator,previous),/unchanged/);
  assert.throws(()=>preparePolicyUpdate(asset,creator,'short'),/between 48/);
  assert.throws(()=>preparePolicyUpdate({...asset,active:false},creator,next),/not active/);
});
test('readback verifies signer, exact policy and exactly one increment',()=>{
  const updated={...asset,version:3,policy:next};
  assert.equal(confirmPolicyUpdate(updated,creator,next,2),true);
  assert.equal(confirmPolicyUpdate(updated,creator,next,1),false);
  assert.equal(confirmPolicyUpdate(updated,requester,next,2),false);
  assert.equal(confirmPolicyUpdate(updated,creator,'different policy',2),false);
});
