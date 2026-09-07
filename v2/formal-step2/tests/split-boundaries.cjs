const test = require('node:test');
const assert = require('node:assert/strict');
const boundaries = require('../split-boundaries.js');
const longText = require('../occurrences.js');

test('boundary items display each character once and expose selectable offsets', () => {
  assert.deepEqual(boundaries.boundaryItems('漢字仮名'), [
    {character: '漢', offset: 1, label: '漢｜字仮名'},
    {character: '字', offset: 2, label: '漢字｜仮名'},
    {character: '仮', offset: 3, label: '漢字仮｜名'}
  ]);
});

test('boundary labels preserve surrogate-pair UTF-16 offsets', () => {
  assert.deepEqual(boundaries.boundaryItems('甲😀乙'), [
    {character: '甲', offset: 1, label: '甲｜😀乙'}, {character: '😀', offset: 3, label: '甲😀｜乙'}
  ]);
  assert.equal(boundaries.boundaryItems('甲😀乙').some((item) => item.offset === 2), false);
});

test('long runs do not duplicate full text for every boundary', () => {
  const items = boundaries.boundaryItems('漢字'.repeat(1000));
  assert.equal(items.length, 1999);
  assert.equal(items[0].character, '漢');
  assert.equal(items[items.length - 1].character, '漢');
  assert.ok(items.every((item) => item.label.length <= 11));
});

test('repeated characters remain identifiable by local context', () => {
  const items = boundaries.boundaryItems('大字大明ケ池');
  assert.equal(new Set(items.map((item) => item.label)).size, items.length);
  assert.ok(items[0].label.indexOf('大｜字大明') >= 0);
  assert.ok(items[2].label.indexOf('大字大｜明ケ池') >= 0);
});

test('unsupported supplementary candidate runs are rejected before split UI', () => {
  const extracted = longText.extract('甲𠀀乙');
  assert.equal(extracted.occurrences.length, 1);
  assert.equal(extracted.occurrences[0].unsupported, true);
  assert.throws(() => longText.splitAt(extracted, extracted.occurrences[0].occurrenceId, [1]), /unsupported-occurrence-cannot-split/);
});
