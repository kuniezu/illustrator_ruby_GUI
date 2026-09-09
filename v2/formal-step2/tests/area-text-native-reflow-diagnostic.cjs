const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const grammar = require('../es3-grammar-gate.cjs');
const segments = require('../segments.js');

const root = path.resolve(__dirname, '..', '..', '..');
const file = path.join(root, 'v2/diagnostics/Formal Step2 AreaText Native Reflow Check.jsx');
const source = fs.readFileSync(file, 'utf8');
const hostSource = fs.readFileSync(path.join(root, 'v2/formal-step2/area-text-native-host.jsx'), 'utf8');
const backendSource = fs.readFileSync(path.join(root, 'v2/formal-step2/area-text-native-backend.jsx'), 'utf8');

test('reflow diagnostic is ES3-parseable and fail-closed', () => {
  assert.doesNotThrow(() => grammar.parseES3(source, file));
  for (const token of [
    'FormalStep2Adapter',
    'FormalAreaTextNativeIntegration.create',
    'FormalMultiStore',
    'textPath.width',
    'actual-2-to-1-reflow',
    'actual-1-to-2-reflow',
    'MANUAL_REQUIRED',
    'native-fit-manual-required',
    'native-fit-policy',
    'cleanupActive',
    'SaveOptions.DONOTSAVECHANGES',
    'native-fit-evidence',
    'fitEvidenceDetail',
    'readingLength',
    'rangeSpan',
    'contentsLength',
    'textPathHeight',
    'readbackPassed',
    'fitSafeReading',
    'runtimeReading'
  ]) assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(source, /source\.width\s*=/);
  assert.doesNotMatch(source, /\.overflows\b/);
  assert.doesNotMatch(source, /\.kind\s*=/);
  assert.doesNotMatch(source, /Formal Multi Step2\.jsx/);
  for (const token of ['fitEvidence', 'readingLength', 'rangeSpan', 'contentsLength', 'readbackPassed']) assert.match(hostSource, new RegExp(token));
  assert.match(backendSource, /readback:\s*readback/);
});

test('split hint is reused across observed 2-line -> 1-line -> 2-line states', () => {
  const base = '一張羅';
  const reading = 'いっちょうら';
  const hint = { baseBoundaryAfter: 2, readingBoundaryAfter: 5, baseText: base, reading, baseRevision: 0, readingRevision: 0 };
  const twoLines = [{ start: 0, end: 2, geometry: {} }, { start: 2, end: 3, geometry: {} }];
  const oneLine = [{ start: 0, end: 3, geometry: {} }];
  const first = segments.plan(base, reading, twoLines, [hint], 0, 0);
  const middle = segments.plan(base, reading, oneLine, [hint], 0, 0);
  const last = segments.plan(base, reading, twoLines, [hint], 0, 0);
  const stale = segments.plan(base, reading, twoLines, [{ ...hint, reading: 'old' }], 0, 0);
  assert.equal(first.status, 'complete');
  assert.deepEqual(first.segments.map((segment) => segment.reading), ['いっちょう', 'ら']);
  assert.equal(middle.status, 'complete');
  assert.equal(middle.segments.length, 1);
  assert.equal(middle.ignoredHints, true);
  assert.equal(last.status, 'complete');
  assert.equal(last.segments.length, 2);
  assert.equal(stale.status, 'unresolved');
});

test('strict fit rejects the observed 2-base-char / 5-reading-char overflow', () => {
  const native = require('../area-text-native.js');
  const observation = {
    horizontal: true, rectangular: true, nonThreaded: true, stable: true,
    frameContents: 'いっちょう', rangeContents: 'いっちょう', rangeStart: 0, rangeEnd: 5,
    lines: [{ start: 0, end: 4, contents: 'いっちょ' }]
  };
  const result = native.verifyOneLineFit(observation, 'いっちょう');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'fit-line-coverage-mismatch');
  assert.equal(result.retryable, true);
  assert.deepEqual(native.trackingCandidates(), [0, -25, -50, -75, -100]);
});

test('single-character render spec retains CENTER policy', () => {
  const renderSpec = require('../area-text-render-spec.js');
  const spec = renderSpec.create({
    sourceFrameId: 'source', annotationId: 'annotation', logicalSegmentId: 'segment', reading: 'ら',
    appearance: { fontName: 'TestFont', fontSize: 20, manualDeltaX: 0, widthScale: 1, gapEm: 0.15 },
    geometry: { autoLeft: 0, autoTop: 0, autoWidth: 20, boxHeight: 20 },
    meta: { requestId: 'request', generationId: 'generation', physicalId: 'physical' },
    composerPolicy: { justification: 'center', singleWordJustification: 'center', oneCharacterPolicy: 'center', trackingCandidates: [0, -25, -50, -75, -100] }
  });
  assert.equal(spec.singleCharacter, true);
  assert.equal(spec.composerPolicy.justification, 'center');
  assert.equal(spec.composerPolicy.singleWordJustification, 'center');
});
