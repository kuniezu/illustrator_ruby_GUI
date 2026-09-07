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

function productionSourceFiles() {
  const roots = [
    path.join(repoRoot, 'v2', 'formal-step1'),
    path.join(repoRoot, 'v2', 'formal-step2')
  ];
  const files = [];
  function visit(directory) {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'tests') visit(file);
      } else if (/\.(?:js|jsx)$/.test(entry.name)) {
        files.push(file);
      }
    });
  }
  roots.forEach(visit);
  return files.sort();
}

// ExtendScript's parser accepts some syntax that its ES3 runtime cannot execute.
// Keep this denylist separate from parseExtendScriptSubset so API compatibility is
// checked explicitly instead of being mistaken for syntax compatibility.
const extendScriptDenylist = [
  { token: 'Array.prototype.forEach', pattern: /\.forEach\s*\(/g },
  { token: 'Array.prototype.map', pattern: /\.map\s*\(/g },
  { token: 'Array.prototype.filter', pattern: /\.filter\s*\(/g },
  { token: 'Array.prototype.some', pattern: /\.some\s*\(/g },
  { token: 'Array.prototype.every', pattern: /\.every\s*\(/g },
  { token: 'Array.prototype.reduce', pattern: /\.reduce\s*\(/g },
  { token: 'Array.prototype.reduceRight', pattern: /\.reduceRight\s*\(/g },
  { token: 'Object.keys', pattern: /\bObject\.keys\s*\(/g },
  { token: 'Object.create', pattern: /\bObject\.create\s*\(/g },
  { token: 'Object.defineProperty', pattern: /\bObject\.defineProperty\s*\(/g },
  { token: 'JSON.stringify', pattern: /\bJSON\.stringify\s*\(/g },
  { token: 'JSON.parse', pattern: /\bJSON\.parse\s*\(/g },
  { token: 'Set', pattern: /\b(?:new\s+)?Set\s*\(/g },
  { token: 'Map', pattern: /\b(?:new\s+)?Map\s*\(/g },
  { token: 'Promise', pattern: /\b(?:new\s+)?Promise\s*\(/g },
  { token: 'let', pattern: /\blet\b/g },
  { token: 'const', pattern: /\bconst\b/g },
  { token: 'arrow function', pattern: /=>/g },
  { token: 'template literal', pattern: /`/g },
  { token: 'class', pattern: /\bclass\b/g }
];

// String#indexOf is part of ES3. These are the explicitly allowed string
// receivers in the production path; array receivers remain denylisted above.
const allowedStringIndexOfReceivers = [
  's', 'text', 'tag', 'note', 'key', 'annotationId'
];

function scanExtendScriptCompatibility(source, filename) {
  const violations = [];
  extendScriptDenylist.forEach((rule) => {
    let match;
    rule.pattern.lastIndex = 0;
    while ((match = rule.pattern.exec(source)) !== null) {
      const line = source.slice(0, match.index).split('\n').length;
      violations.push({ filename: filename, token: rule.token, line: line });
      if (match[0].length === 0) rule.pattern.lastIndex++;
    }
  });
  const indexOfPattern = /\b([A-Za-z_$][\w$]*)\.indexOf\s*\(/g;
  let indexOfMatch;
  while ((indexOfMatch = indexOfPattern.exec(source)) !== null) {
    const receiver = indexOfMatch[1];
    if (allowedStringIndexOfReceivers.indexOf(receiver) < 0) {
      const line = source.slice(0, indexOfMatch.index).split('\n').length;
      violations.push({ filename: filename, token: receiver + '.indexOf', line: line });
    }
  }
  return violations;
}

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
  productionSourceFiles().forEach((file) => {
    assertExtendScriptCompatible(fs.readFileSync(file, 'utf8'), path.relative(repoRoot, file));
  });
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

test('production generated BridgeTalk body parses as a script', () => {
  const adapter = loadPersistenceAdapter();
  const sources = {
    step1: path.join(repoRoot, 'v2', 'formal-step1', 'core.js'),
    segments: path.join(repoRoot, 'v2', 'formal-step2', 'segments.js'),
    orchestration: path.join(repoRoot, 'v2', 'formal-step2', 'orchestration.js'),
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
  assert.doesNotMatch(body, /eval\(decodeURIComponent\(/);
  assert.ok(body.indexOf('core.js') < body.indexOf('segments.js'));
  assert.ok(body.indexOf('segments.js') < body.indexOf('orchestration.js'));
  assert.ok(body.indexOf('orchestration.js') < body.indexOf('adapter.jsx'));
});

test('ScriptUI refresh helper parses after include expansion', () => {
  const helper = fs.readFileSync(path.join(repoRoot, 'v2', 'formal-step2', 'ui-refresh.js'), 'utf8');
  assert.doesNotThrow(() => new vm.Script(helper, { filename: 'ui-refresh.js' }));
});
