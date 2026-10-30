import test from 'node:test';
import assert from 'node:assert/strict';
import { validPositiveId } from '../lib/api-inputs.js';

test('accept canonical asset/request IDs including bound', () => {
  for (const value of ['1','2','123','99999999','100000000'])
    assert.equal(validPositiveId(value), true, value);
});
test('reject zero, negative, leading zero, decimal, exponent and overflow', () => {
  for (const value of ['','0','-1','01','1.5','1e3','100000001','9999999999',' 1 ','+1','0x1'])
    assert.equal(validPositiveId(value), false, value);
});
test('reject arrays, objects and non-string IDs', () => {
  for (const value of [undefined,null,0,1,[],['1'],{},true])
    assert.equal(validPositiveId(value), false);
});
