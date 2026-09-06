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

test('merge and split change group membership only', () => {
  let b = M.extract('甲乙 丙');
  const first = b.occurrences[0].occurrenceId;
  const second = b.occurrences[1].occurrenceId;
  b = M.merge(b, [first, second], 'lexeme-custom');
  assert.equal(b.occurrences[0].groupId, 'lexeme-custom');
  assert.equal(b.occurrences[1].groupId, 'lexeme-custom');
  b = M.split(b, [second]);
  assert.equal(b.occurrences[0].groupId, 'lexeme-custom');
  assert.equal(b.occurrences[1].groupId, 'occurrence-group-' + second);
});

test('occurrence visibility and render enablement remain independent', () => {
  const b = M.extract('甲');
  b.occurrences[0].visible = false;
  b.occurrences[0].enabled = true;
  assert.equal(M.validate(b).occurrences[0].enabled, true);
});

test('invalid and empty grouping selections are rejected', () => {
  const b = M.extract('甲');
  assert.throws(() => M.merge(b, []), /empty-merge-selection/);
  assert.throws(() => M.split(b, []), /empty-split-selection/);
  assert.throws(() => M.merge(b, ['missing']), /occurrence-missing/);
});
