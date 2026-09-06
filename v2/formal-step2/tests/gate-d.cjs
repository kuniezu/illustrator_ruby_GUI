const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const S = require('../segments.js');
test('Gate D batch has A-E cases and one-shot report', () => {
  const s = fs.readFileSync(path.join(__dirname, '..', '..', 'diagnostics', 'Formal Step2 Gate D Batch Runtime Matrix.jsx'), 'utf8');
  for (const id of ['A1','A2','B1','B2','C1','C2','C3','D1','D2','D3','E1','E2','E3','E4']) assert.ok(s.includes('"' + id + '"'));
  assert.ok(s.includes('PASS')); assert.ok(s.includes('FAIL')); assert.ok(s.includes('MANUAL_REQUIRED')); assert.ok(s.includes('finally')); assert.ok(s.includes('cleanup()'));
  assert.ok(s.includes('textFrames.areaText')); assert.ok(s.includes('tracking=200')); assert.ok(s.includes('tracking-clamp')); assert.ok(s.includes('geometryClusters='));
  assert.ok(s.includes('fitFixture')); assert.ok(s.includes('fixtures.pop()')); assert.ok(s.includes('fontSize=70')); assert.ok(s.includes('ignorePath')); assert.ok(s.includes('areaText(path)')); assert.ok(s.includes('proportional-mixed-observe'));
  assert.ok(s.includes('actual-reflow')); assert.ok(s.includes('renderer-lifecycle'));
  assert.ok(s.includes('fitFixture(fixture("C", "一張羅", 120), 2)'));
  assert.ok(s.includes('fixture=6glyphs')); assert.ok(s.includes('一二三四五六'));
  assert.ok(s.includes('desired=2->1->2'));
});
test('Gate D three-line fixture uses two-character boundaries and no proportional split', () => {
  const hints = [{baseBoundaryAfter:2,readingBoundaryAfter:4,baseText:'一二三四五六',reading:'いちにさんよんごろく'},{baseBoundaryAfter:4,readingBoundaryAfter:8,baseText:'一二三四五六',reading:'いちにさんよんごろく'}];
  const r = S.plan('一二三四五六','いちにさんよんごろく',[{start:0,end:2},{start:2,end:4},{start:4,end:6}],hints,0,0);
  assert.equal(r.status, 'complete'); assert.equal(r.segments.length, 3);
});
