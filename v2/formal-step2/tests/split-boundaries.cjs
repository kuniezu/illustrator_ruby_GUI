const test = require('node:test');
const assert = require('node:assert/strict');
const boundaries = require('../split-boundaries.js');

test('boundary labels expose every UTF-16 boundary without IME input', () => {
  assert.deepEqual(boundaries.labels('漢字仮名'), [
    '漢 | 字仮名', '漢字 | 仮名', '漢字仮 | 名'
  ]);
});

test('boundary labels preserve surrogate-pair UTF-16 offsets', () => {
  assert.deepEqual(boundaries.labels('甲😀乙').map((value, index) => index + 1), [1, 2, 3]);
  assert.equal(boundaries.labels('甲😀乙')[2], '甲😀 | 乙');
});
