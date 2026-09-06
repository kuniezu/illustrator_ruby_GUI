const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '..', '..', '..');

function expandIncludes(file, stack) {
  const absolute = path.resolve(file);
  const chain = stack || [];
  if (chain.includes(absolute)) throw new Error('include-cycle: ' + absolute);
  const source = fs.readFileSync(absolute, 'utf8');
  return source.replace(/^\s*#include\s+["']([^"']+)["'].*$/gm, (match, includePath) => {
    const included = path.resolve(path.dirname(absolute), includePath);
    if (!fs.existsSync(included)) throw new Error('include-missing: ' + included);
    return expandIncludes(included, chain.concat([absolute]));
  });
}

function parseExtendScriptSubset(source, filename) {
  const withoutDirectives = source.replace(/^\s*#(?:target|include).*$/gm, '');
  return new vm.Script(withoutDirectives, { filename: filename });
}

function loadPersistenceAdapter() {
  const source = fs.readFileSync(path.join(repoRoot, 'v2', 'formal-step2', 'persistence-adapter.jsx'), 'utf8');
  const context = {
    FormalMultiStore: { write: (note) => note },
    encodeURIComponent: encodeURIComponent,
    decodeURIComponent: decodeURIComponent
  };
  vm.runInNewContext(source + ';this.adapter=FormalMultiPersistenceAdapter;', context);
  return context.adapter;
}

test('Formal Multi Step2 entrypoint parses after faithful include expansion', () => {
  const entry = path.join(repoRoot, 'v2', 'formal-step2', 'Formal Multi Step2.jsx');
  const expanded = expandIncludes(entry);
  assert.doesNotThrow(() => parseExtendScriptSubset(expanded, entry));
});

test('production generated BridgeTalk body parses as a script', () => {
  const adapter = loadPersistenceAdapter();
  const sources = {
    step1: fs.readFileSync(path.join(repoRoot, 'v2', 'formal-step1', 'core.js'), 'utf8'),
    segments: fs.readFileSync(path.join(repoRoot, 'v2', 'formal-step2', 'segments.js'), 'utf8'),
    orchestration: fs.readFileSync(path.join(repoRoot, 'v2', 'formal-step2', 'orchestration.js'), 'utf8'),
    adapter: fs.readFileSync(path.join(repoRoot, 'v2', 'formal-step2', 'adapter.jsx'), 'utf8')
  };
  const body = adapter.renderedBridgeBody(
    '甲',
    'old',
    'new',
    { uuid: 'uuid-1', documentPath: 'C:/doc.ai' },
    { revision: 0, sourceFrameId: 'frame-1' },
    [{
      annotationId: 'annotation-1',
      annotation: {
        annotationId: 'annotation-1',
        sourceFrameId: 'frame-1',
        anchor: { baseText: '甲', startHint: 0, beforeContext: '', afterContext: '' },
        reading: 'か',
        readingConfirmed: true,
        enabled: true,
        placementMode: 'auto',
        splitHints: []
      }
    }],
    sources,
    'C:/Temp/formal-multi-host-gate-0.log'
  );
  assert.doesNotThrow(() => new vm.Script(body, { filename: 'generated-rendered-bridge.jsx' }));
});

