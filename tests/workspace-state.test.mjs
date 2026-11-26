import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceState,subscribe,updateAccount,acquire,release} from '../lib/workspace-state.js';
test('one wallet and mutually exclusive signing operations',()=>{const seen=[];const off=subscribe(s=>seen.push(s));updateAccount('0xABC');assert.equal(workspaceState().account,'0xabc');assert.equal(acquire('rights'),true);assert.equal(acquire('v2'),false);release('v2');assert.equal(workspaceState().owner,'rights');release('rights');assert.equal(acquire('v2'),true);updateAccount(null);assert.equal(workspaceState().account,null);release('v2');assert.equal(workspaceState().owner,null);assert.equal(seen.at(-1).owner,null);off()});
