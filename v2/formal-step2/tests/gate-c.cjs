/* One-shot Gate C checklist. Pure checks run here; Illustrator-only checks stay explicit. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');
const segments = require(path.join(root, 'segments.js'));
const results = [];
function check(name, fn) { try { fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL: ' + e.message]); } }
check('initial 2-segment plan', () => {
  const lines = [{start: 0, end: 2, geometry: {}}, {start: 2, end: 3, geometry: {}}];
  const hints = [{baseBoundaryAfter: 2, readingBoundaryAfter: 4, baseText: '一張羅', reading: 'いっちょうら'}];
  assert.strictEqual(segments.plan('一張羅', 'いっちょうら', lines, hints, 0, 0).segments.length, 2);
});
check('same state remains reusable', () => {
  const h = [{baseBoundaryAfter: 2, readingBoundaryAfter: 4, baseText: '一張羅', reading: 'いっちょうら'}];
  assert.strictEqual(segments.plan('一張羅', 'いっちょうら', [{start: 0,end: 2,geometry:{}},{start:2,end:3,geometry:{}}], h, 1, 1).status, 'complete');
});
check('reading change is stale', () => {
  const h = [{baseBoundaryAfter: 2, readingBoundaryAfter: 4, baseText: '一張羅', reading: 'いっちょうら'}];
  assert.strictEqual(segments.plan('一張羅', 'べつのよみ', [{start:0,end:2,geometry:{}},{start:2,end:3,geometry:{}}], h, 1, 1).reasons[0], 'split-hint-stale');
});
check('boundary change is rejected', () => {
  const h = [{baseBoundaryAfter: 2, readingBoundaryAfter: 4, baseText: '一張羅', reading: 'いっちょうら'}];
  assert.strictEqual(segments.plan('一張羅', 'いっちょうら', [{start:0,end:1,geometry:{}},{start:1,end:3,geometry:{}}], h, 1, 1).reasons[0], 'split-hint-boundary-mismatch');
});
check('duplicate, overlap, reverse and nonnumeric hints are rejected', () => {
  const bad = [
    [{baseBoundaryAfter: 2, readingBoundaryAfter: 2, baseText: '一張羅', reading: 'いっちょうら'}, {baseBoundaryAfter: 2, readingBoundaryAfter: 4, baseText: '一張羅', reading: 'いっちょうら'}],
    [{baseBoundaryAfter: 3, readingBoundaryAfter: 4, baseText: '一張羅', reading: 'いっちょうら'}, {baseBoundaryAfter: 2, readingBoundaryAfter: 5, baseText: '一張羅', reading: 'いっちょうら'}],
    [{baseBoundaryAfter: 2, readingBoundaryAfter: 5, baseText: '一張羅', reading: 'いっちょうら'}, {baseBoundaryAfter: 3, readingBoundaryAfter: 4, baseText: '一張羅', reading: 'いっちょうら'}],
    [{baseBoundaryAfter: '2', readingBoundaryAfter: 4, baseText: '一張羅', reading: 'いっちょうら'}]
  ];
  bad.forEach((h) => assert.throws(() => segments.validateHints(h, 3, 6), /invalid-split-hint/));
});
check('no proportional auto split', () => {
  const plan = segments.plan('一張羅', 'いっちょうら', [{start:0,end:2,geometry:{}},{start:2,end:3,geometry:{}}], [], 0, 0);
  assert.strictEqual(plan.status, 'unresolved'); assert.strictEqual(plan.reasons[0], 'split-hint-required');
});
const adapter = fs.readFileSync(path.join(root, 'adapter.jsx'), 'utf8');
check('temporary measurement cleanup is present', () => { assert.ok(adapter.includes('finally')); assert.ok(adapter.includes('probe.remove()')); });
check('unmanaged preservation is guarded by managed notes', () => { assert.ok(adapter.includes('formal-step2-output:v1;')); });
console.log(results.map(x => x[1] + ' ' + x[0]).join('\n'));
console.log('MANUAL_REQUIRED save/reopen and Illustrator render/reconcile verification');
if (results.some(x => x[1].indexOf('FAIL') === 0)) process.exitCode = 1;
