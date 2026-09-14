const test = require('node:test');
const assert = require('node:assert/strict');
const Appearance = require('../appearance.js');
const RenderSpec = require('../area-text-render-spec.js');
const Native = require('../area-text-native.js');
const Renderer = require('../native-renderer.js');

global.FormalAppearance = Appearance;
global.FormalAreaTextRenderSpec = RenderSpec;
global.FormalAreaTextNative = Native;

function bundle() {
  return { sourceFrameId: 'source-1', annotations: [{ annotationId: 'a1', appearance: null }] };
}

test('native renderer maps complete multi plans to strict-fit render specs', () => {
  const plan = { status: 'complete', results: [{ annotationId: 'a1', status: 'complete', decision: { segments: [{ renderSegmentId: 'segment-1', reading: 'かな', geometry: { left: 10, top: 20, width: 40, baseSize: 18, leading: 22 } }] } }] };
  const result = Renderer.createSpecs(bundle(), plan, 'request-1', 'RubyFont');
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.desiredLogicalSegmentIds, ['a1:segment-1']);
  assert.equal(result.specs[0].rendererMode, 'area-text-native');
  assert.deepEqual(result.specs[0].composerPolicy.trackingCandidates, [0, -25, -50, -75, -100]);
  assert.equal(result.specs[0].geometry.boxHeight, 22);
});

test('native renderer skips complete empty plans without annotations while rendering mixed plans', () => {
  const plan = {
    status: 'complete',
    results: [
      { annotationId: 'a1', status: 'complete', decision: { segments: [{ renderSegmentId: 'segment-1', reading: 'かな', geometry: { left: 10, top: 20, width: 40, baseSize: 18, leading: 22 } }] } },
      { annotationId: 'unresolved-1', status: 'complete', suppressed: true, decision: { segments: [] } }
    ]
  };
  const result = Renderer.createSpecs(bundle(), plan, 'request-mixed', 'RubyFont');
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.desiredLogicalSegmentIds, ['a1:segment-1']);
  assert.equal(result.specs.length, 1);
});

function hiddenResult(annotationId = 'hidden-1') {
  return { annotationId, status: 'hidden', outcome: 'hidden-confirmed', decision: { status: 'complete', segments: [] }, reasons: ['source-overset-hidden'] };
}

test('native renderer accepts confirmed hidden siblings as valid no-output items', () => {
  const visible = { annotationId: 'a1', status: 'complete', decision: { segments: [{ renderSegmentId: 'segment-1', reading: 'かな', geometry: { left: 10, top: 20, width: 40, baseSize: 18, leading: 22 } }] } };
  const result = Renderer.createSpecs(bundle(), { status: 'complete', results: [visible, hiddenResult()] }, 'request-hidden', 'RubyFont');
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.desiredLogicalSegmentIds, ['a1:segment-1']);
  assert.equal(result.specs.length, 1);
});

test('native renderer accepts hidden-only plans without creating physical output', () => {
  const result = Renderer.createSpecs(bundle(), { status: 'complete', results: [hiddenResult()] }, 'request-hidden-only', 'RubyFont');
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.specs, []);
  assert.deepEqual(result.desiredLogicalSegmentIds, []);
});

test('native renderer rejects malformed hidden items and contradictory blockers', () => {
  const malformed = hiddenResult();
  malformed.decision.segments = [{ renderSegmentId: 'unexpected', reading: 'かな' }];
  assert.throws(() => Renderer.createSpecs(bundle(), { status: 'complete', results: [malformed] }, 'request-invalid-hidden', 'RubyFont'), /native-render-hidden-contract-invalid/);
  assert.throws(() => Renderer.createSpecs(bundle(), { status: 'complete', results: [{ annotationId: 'a1', status: 'unresolved', decision: { segments: [] } }] }, 'request-invalid-unresolved', 'RubyFont'), /native-render-plan-incomplete/);
  assert.throws(() => Renderer.createSpecs(bundle(), { status: 'complete', results: [{ annotationId: 'a1', status: 'failed', decision: { segments: [] } }] }, 'request-invalid-failed', 'RubyFont'), /native-render-plan-incomplete/);
});

test('native renderer widens a short-base long-reading candidate from ruby size', () => {
  const plan = {
    status: 'complete',
    results: [
      { annotationId: 'a1', status: 'complete', decision: { segments: [{ renderSegmentId: 'segment-1', reading: 'こんかい', geometry: { left: 10, top: 20, width: 96, baseSize: 96, leading: 110 } }] } }
    ]
  };
  const result = Renderer.createSpecs(bundle(), plan, 'request-long-reading', 'RubyFont');
  assert.equal(result.specs[0].appearance.fontSize, 48);
  assert.equal(result.specs[0].geometry.autoLeft, -38);
  assert.equal(result.specs[0].geometry.autoWidth, 192);
  assert.equal(result.specs[0].finalLeft, -38);
  assert.equal(result.specs[0].finalWidth, 192);
});

test('native renderer preserves centered baseSize geometry through backend and manual adjustment', () => {
  const custom = bundle();
  custom.annotations[0].appearance = { fontName: 'RubyFont', fontSize: null, manualDeltaX: 3, widthScale: 1.1, gapEm: 0.15 };
  const plan = {
    status: 'complete',
    results: [
      { annotationId: 'a1', status: 'complete', decision: { segments: [{ renderSegmentId: 'segment-1', reading: 'こんかい', geometry: { left: 10, top: 20, width: 96, baseSize: 96, leading: 110 } }] } }
    ]
  };
  const result = Renderer.createSpecs(custom, plan, 'request-geometry', 'RubyFont');
  const spec = result.specs[0];
  const backend = RenderSpec.backendSpec(spec);
  assert.equal(spec.appearance.fontSize, 48);
  assert.equal(spec.geometry.autoLeft, -38);
  assert.equal(spec.geometry.autoWidth, 192);
  assert.equal(spec.finalLeft, -35);
  assert.ok(Math.abs(spec.finalWidth - 211.2) < 0.000001);
  assert.equal(backend.left, -35);
  assert.ok(Math.abs(backend.width - 211.2) < 0.000001);
  assert.equal(spec.finalTop, 20);
  assert.equal(spec.finalHeight, 110);
});

test('native renderer tunes the default vertical gap while preserving measured glyph target', () => {
  const custom = bundle();
  const plan = {
    status: 'complete',
    results: [
      { annotationId: 'a1', status: 'complete', decision: { segments: [{ renderSegmentId: 'segment-1', reading: 'かな', geometry: { left: 10, top: 30, width: 40, baseSize: 100, leading: 110, measuredTop: 20, gap: 15 } }] } }
    ]
  };
  const result = Renderer.createSpecs(custom, plan, 'request-gap', 'RubyFont');
  const spec = result.specs[0];
  const backend = RenderSpec.backendSpec(spec);
  assert.equal(spec.geometry.measuredTop, 20);
  assert.equal(spec.geometry.gap, 10);
  assert.equal(backend.measuredTop, 20);
  assert.equal(backend.gap, 10);
});

test('native renderer still rejects a nonempty plan entry without its annotation', () => {
  const plan = {
    status: 'complete',
    results: [
      { annotationId: 'missing', status: 'complete', decision: { segments: [{ renderSegmentId: 'segment-1', reading: 'かな', geometry: { left: 10, top: 20, width: 40, baseSize: 18, leading: 22 } }] } }
    ]
  };
  assert.throws(() => Renderer.createSpecs(bundle(), plan, 'request-missing', 'RubyFont'), /native-render-annotation-missing/);
});

test('native renderer transition removes replaced logical bindings and preserves peers', () => {
  const previous = Native.createManifest();
  previous.activeBindings = { 'a1:segment-1': 'old-a', 'b1:segment-1': 'peer-b' };
  const result = Renderer.transition(previous, ['a1:segment-1'], [{ logicalSegmentId: 'a1:segment-1', physicalId: 'new-a' }]);
  assert.deepEqual(result.removedLogicalSegmentIds, ['b1:segment-1']);
  assert.deepEqual(result.retiredPhysicalIds, ['old-a', 'peer-b']);
});

test('native renderer transition retires hidden output without retiring visible peers', () => {
  const previous = Native.createManifest();
  previous.activeBindings = { 'hidden-1:segment-1': 'old-hidden', 'a1:segment-1': 'visible-peer' };
  const result = Renderer.transition(previous, ['a1:segment-1'], [{ logicalSegmentId: 'a1:segment-1', physicalId: 'new-visible' }]);
  assert.deepEqual(result.removedLogicalSegmentIds, ['hidden-1:segment-1']);
  assert.deepEqual(result.retiredPhysicalIds, ['old-hidden', 'visible-peer']);
});

test('native renderer allocates a collision-safe physical id after palette restart', () => {
  const previous = Native.createManifest();
  previous.activeBindings = { 'a1:segment-1': 'formal-native-restarted-0' };
  previous.renderRecords['formal-native-restarted-0'] = { physicalId: 'formal-native-restarted-0' };
  const plan = { status: 'complete', results: [{ annotationId: 'a1', status: 'complete', decision: { segments: [{ renderSegmentId: 'segment-1', reading: 'かな', geometry: { left: 10, top: 20, width: 40, baseSize: 18, leading: 22 } }] } }] };
  const result = Renderer.createSpecs(bundle(), plan, 'restarted', 'RubyFont', previous);
  assert.notEqual(result.specs[0].physicalId, 'formal-native-restarted-0');
  assert.match(result.specs[0].physicalId, /^formal-native-restarted-0-1$/);
});
