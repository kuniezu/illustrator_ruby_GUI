const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compatibilityLint = require('../extendscript-compat-lint.cjs');
const grammarGate = require('../es3-grammar-gate.cjs');

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

const scanExtendScriptCompatibility = compatibilityLint.scanExtendScriptCompatibility;

function assertExtendScriptCompatible(source, filename) {
  const violations = scanExtendScriptCompatibility(source, filename);
  assert.equal(violations.length, 0, violations.map((item) =>
    item.filename + ':' + item.line + ' forbidden ' + item.token
  ).join('\n'));
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

test('production source passes the formal ExtendScript compatibility gate', () => {
  compatibilityLint.productionSourceFiles().forEach((file) => {
    assertExtendScriptCompatible(fs.readFileSync(file, 'utf8'), path.relative(repoRoot, file));
  });
});

test('production source passes the explicit ES3 grammar gate', () => {
  compatibilityLint.productionSourceFiles().forEach((file) => {
    assert.doesNotThrow(() => grammarGate.parseES3(fs.readFileSync(file, 'utf8'), path.relative(repoRoot, file)));
  });
});

test('ES3 grammar fixtures reject modern and reserved constructs', () => {
  const failures = [
    '{new:1}', '{delete:1}', '{default:1}', '{class:1}', '{enum:1}',
    '{extends:1}', '{super:1}', '{import:1}', '{export:1}', '{a:1,}',
    '({get value(){return 1;}})', '({value(){return 1;}})', 'var x={value};',
    'var {x}=value;', 'var [x]=value;', 'obj?.x', 'x=>x', '`x`', 'let x=1;',
    'const x=1;', 'class X {}'
  ];
  failures.forEach((source) => assert.throws(() => grammarGate.parseES3(source, 'es3-fixture.js'), source));
  assert.doesNotThrow(() => grammarGate.parseES3('({"new":1})', 'es3-pass.js'));
  assert.doesNotThrow(() => grammarGate.parseES3('obj["new"]; new Foo(); delete obj.foo; var x={a:1}; var y=[1,];', 'es3-pass.js'));
});

test('ExtendScript compatibility denylist catches forbidden APIs and allows ES3 strings', () => {
  const violations = scanExtendScriptCompatibility(
    'var text="x"; text.indexOf("x"); var values=[]; values.indexOf(1); values.map(function(x){return x;}); var modern = new Set();',
    'compatibility-fixture.js'
  );
  assert.deepEqual(violations.map((item) => item.token), [
    'Array.prototype.map',
    'Set',
    'values.indexOf'
  ]);
});

test('include-expanded entrypoint passes the formal ExtendScript compatibility gate', () => {
  const entry = path.join(repoRoot, 'v2', 'formal-step2', 'Formal Multi Step2.jsx');
  const expanded = expandIncludes(entry);
  assertExtendScriptCompatible(expanded, 'include-expanded Formal Multi Step2.jsx');
});

test('diagnostic expanded entrypoint passes the explicit ES3 grammar gate', () => {
  const entry = path.join(repoRoot, 'v2', 'diagnostics', 'Formal Step2 AreaText Native Probe.jsx');
  const expanded = expandIncludes(entry);
  assert.doesNotThrow(() => grammarGate.parseES3(expanded, 'expanded AreaText Native Probe.jsx'));
});

test('production generated BridgeTalk body parses as a script', () => {
  const adapter = loadPersistenceAdapter();
  const sources = {
    step1: path.join(repoRoot, 'v2', 'formal-step1', 'core.js'),
    segments: path.join(repoRoot, 'v2', 'formal-step2', 'segments.js'),
    orchestration: path.join(repoRoot, 'v2', 'formal-step2', 'orchestration.js'),
    appearance: path.join(repoRoot, 'v2', 'formal-step2', 'appearance.js'),
    adapter: path.join(repoRoot, 'v2', 'formal-step2', 'adapter.jsx')
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
  assertExtendScriptCompatible(body, 'generated-rendered-bridge.jsx');
  assert.doesNotThrow(() => grammarGate.parseES3(body, 'generated-rendered-bridge.jsx'));
  assert.doesNotMatch(body, /eval\(decodeURIComponent\(/);
  assert.ok(body.indexOf('core.js') < body.indexOf('segments.js'));
  assert.ok(body.indexOf('segments.js') < body.indexOf('orchestration.js'));
  assert.ok(body.indexOf('orchestration.js') < body.indexOf('appearance.js'));
  assert.ok(body.indexOf('orchestration.js') < body.indexOf('adapter.jsx'));
});

test('ScriptUI refresh helper parses after include expansion', () => {
  const helper = fs.readFileSync(path.join(repoRoot, 'v2', 'formal-step2', 'ui-refresh.js'), 'utf8');
  assert.doesNotThrow(() => new vm.Script(helper, { filename: 'ui-refresh.js' }));
});
