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
  assert.ok(s.includes('fitFixture')); assert.ok(s.includes('fontSize=70')); assert.ok(s.includes('ignorePath')); assert.ok(s.includes('areaText(path)')); assert.ok(s.includes('proportional-mixed-observe'));
});
test('Gate D three-line hints stay monotonic and proportional split remains absent', () => {
  const hints = [{baseBoundaryAfter:1,readingBoundaryAfter:2,baseText:'一二三四',reading:'いちにさんよん'},{baseBoundaryAfter:2,readingBoundaryAfter:4,baseText:'一二三四',reading:'いちにさんよん'}];
  const r = S.plan('一二三四','いちにさんよん',[{start:0,end:1},{start:1,end:2},{start:2,end:4}],hints,0,0);
  assert.equal(r.status, 'complete'); assert.equal(r.segments.length, 3);
});
