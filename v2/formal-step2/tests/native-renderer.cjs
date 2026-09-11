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
  assert.deepEqual(result.removedLogicalSegmentIds, ['a1:segment-1', 'b1:segment-1']);
  assert.deepEqual(result.retiredPhysicalIds, ['old-a', 'peer-b']);
});
