const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../occurrences.js');

test('extracts every contiguous kanji occurrence without including kana or brackets', () => {
  const b = M.extract('甲乙(甲乙)かな甲');
  assert.deepEqual(b.occurrences.map(x => ({start:x.start,end:x.end,surface:x.surface})), [
    {start:0,end:2,surface:'甲乙'}, {start:3,end:5,surface:'甲乙'}, {start:8,end:9,surface:'甲'}
  ]);
  assert.notEqual(b.occurrences[0].occurrenceId, b.occurrences[1].occurrenceId);
});

test('groups repeated surfaces while preserving distinct occurrences', () => {
  const b = M.extract('甲 甲 乙');
  assert.equal(b.occurrences[0].groupId, b.occurrences[1].groupId);
  assert.notEqual(b.occurrences[0].occurrenceId, b.occurrences[1].occurrenceId);
  assert.notEqual(b.occurrences[0].groupId, b.occurrences[2].groupId);
});

test('splitAt edits one logical range and mergeAdjacent restores it', () => {
  let b = M.extract('徳川斉昭');
  const original = b.occurrences[0].occurrenceId;
  b = M.splitAt(b, original, [2]);
  assert.deepEqual(b.occurrences.map(x => ({start:x.start,end:x.end,surface:x.surface})), [
    {start:0,end:2,surface:'徳川'}, {start:2,end:4,surface:'斉昭'}
  ]);
  const ids = b.occurrences.map(x => x.occurrenceId);
  b = M.mergeAdjacent(b, ids);
  assert.deepEqual(b.occurrences.map(x => ({start:x.start,end:x.end,surface:x.surface})), [{start:0,end:4,surface:'徳川斉昭'}]);
});

test('group reading propagates without collapsing occurrence identity', () => {
  let b = M.extract('甲 甲');
  b = M.setGroupReading(b, b.occurrences[0].groupId, 'こう', true);
  assert.equal(b.occurrences[0].reading, 'こう');
  assert.equal(b.occurrences[1].reading, 'こう');
  assert.notEqual(b.occurrences[0].occurrenceId, b.occurrences[1].occurrenceId);
});

test('occurrence visibility and render enablement remain independent', () => {
  const b = M.extract('甲');
  b.occurrences[0].visible = false;
  b.occurrences[0].enabled = true;
  assert.equal(M.validate(b).occurrences[0].enabled, true);
});

test('invalid and empty grouping selections are rejected', () => {
  const b = M.extract('甲');
  assert.throws(() => M.mergeAdjacent(b, ['occurrence-0']), /merge-requires-adjacent-occurrences/);
  assert.throws(() => M.splitAt(b, b.occurrences[0].occurrenceId, []), /empty-split-boundaries/);
  assert.throws(() => M.mergeAdjacent(b, ['missing', 'also-missing']), /occurrence-missing/);
  assert.throws(() => M.splitAt(b, b.occurrences[0].occurrenceId, [99]), /invalid-split-boundary/);
});
