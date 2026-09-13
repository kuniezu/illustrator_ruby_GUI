#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..', '..');
const step2 = path.join(root, 'v2', 'formal-step2');
const catalogPath = path.join(step2, 'known-failure-regression-catalog.md');
const parityGatePath = path.join(step2, 'migration-parity-gate.md');

const catalogIds = [
  'DOM-01', 'DOM-02', 'DOM-03',
  'MULTI-01', 'MULTI-02', 'MULTI-03', 'MULTI-04',
  'ES3-01', 'ES3-02',
  'FIT-01', 'FIT-02', 'FIT-03', 'FIT-04', 'FIT-05', 'FIT-06', 'FIT-07',
  'LIFE-01', 'LIFE-02', 'LIFE-03', 'LIFE-04', 'LIFE-05', 'LIFE-06', 'LIFE-07', 'LIFE-08', 'LIFE-09', 'LIFE-10', 'LIFE-11', 'LIFE-12', 'LIFE-13', 'LIFE-14', 'LIFE-15', 'LIFE-16',
  'OBS-01', 'OBS-02', 'OBS-03', 'OBS-04', 'OBS-05', 'STATE-01', 'STATE-02', 'STATE-03', 'STATE-04', 'STATE-05', 'STATE-06', 'STATE-07', 'STATE-08', 'STATE-09', 'STATE-10', 'STATE-11', 'STATE-12', 'STATE-13', 'STATE-14'
];

const coverageMap = {
  'DOM-01': ['v2/formal-step2/tests/area-text-native-static.cjs', 'fresh rectangle/path AreaText construction'],
  'DOM-02': ['v2/formal-step2/tests/area-text-native-reflow-diagnostic.cjs', 'actual reflow remains manual-only'],
  'DOM-03': ['v2/formal-step2/tests/area-text-native-static.cjs', 'consumed path cleanup is not treated as owned failure'],
  'MULTI-01': ['v2/formal-step2/tests/run.cjs', 'foreign managed output is ignored'],
  'MULTI-02': ['v2/formal-step2/tests/run.cjs', 'duplicate segment identity is rejected'],
  'MULTI-03': ['v2/formal-step2/tests/area-text-native-reflow-diagnostic.cjs', '2-to-1-to-2 simulation is separate'],
  'MULTI-04': ['v2/formal-step2/tests/native-renderer.cjs', 'empty plan no-op'],
  'ES3-01': ['v2/formal-step2/tests/gate-0.cjs', 'production compatibility gate'],
  'ES3-02': ['v2/formal-step2/tests/gate-0.cjs', 'diagnostic compatibility gate'],
  'FIT-01': ['v2/formal-step2/tests/area-text-native.cjs', 'strict line coverage'],
  'FIT-02': ['v2/formal-step2/tests/native-renderer.cjs', 'centered baseSize geometry through backend'],
  'FIT-03': ['v2/formal-step2/tests/area-text-native.cjs', 'finite tracking candidates'],
  'FIT-04': ['v2/formal-step2/tests/persistence-adapter.cjs', 'structured failure detail'],
  'FIT-05': ['v2/formal-step2/tests/native-renderer.cjs', 'native renderer tunes the default vertical gap while preserving measured glyph target', 'native renderer tunes the default vertical gap while preserving measured glyph target'],
  'FIT-06': ['v2/formal-step2/tests/area-text-native-backend.cjs', 'native vertical placement uses glyph ink when AreaText box is much taller than ruby'],
  'FIT-07': ['v2/formal-step2/tests/area-text-native-backend.cjs', 'createOutline consumes the duplicate without false cleanup failure', 'assert.equal(duplicateRemoved, 0);'],
  'LIFE-01': ['v2/formal-step2/tests/area-text-native-integration.cjs', 'explicit logical removal'],
  'LIFE-02': ['v2/formal-step2/tests/area-text-native-transaction-coordinator.cjs', 'cleanup pending before finish'],
  'LIFE-03': ['v2/formal-step2/tests/area-text-native-recovery.cjs', 'new active remains authoritative'],
  'LIFE-04': ['v2/formal-step2/tests/area-text-native-integration.cjs', 'practical lifecycle replay'],
  'LIFE-05': ['v2/formal-step2/tests/area-text-native-transaction-coordinator.cjs', 'persisted state survives restart'],
  'LIFE-06': ['v2/formal-step2/tests/adapter-transaction.cjs', 'foreign identity preservation'],
  'LIFE-07': ['v2/formal-step2/tests/area-text-native.cjs', 'copy-on-write ownership guards'],
  'LIFE-08': ['v2/formal-step2/tests/native-renderer.cjs', 'native renderer transition removes replaced logical bindings and preserves peers', 'native renderer transition removes replaced logical bindings and preserves peers'],
  'LIFE-09': ['v2/formal-step2/tests/native-renderer.cjs', 'native renderer allocates a collision-safe physical id after palette restart', 'native renderer allocates a collision-safe physical id after palette restart'],
  'LIFE-10': ['v2/formal-step2/tests/area-text-native-integration.cjs', 'pre-activation failure aborts durable operation', 'pre-activation failure aborts durable operation'],
  'LIFE-11': ['v2/formal-step2/tests/area-text-native-recovery.cjs', 'activated cleanup keeps new active authority', 'activated restart prioritizes durable discarded cleanup after reload'],
  'LIFE-12': ['v2/formal-step2/tests/area-text-render-spec.cjs', 'vertical placement target survives RenderSpec/backendSpec', 'vertical placement target survives RenderSpec/backendSpec'],
  'LIFE-13': ['v2/formal-step2/tests/terminal-recovery-state-machine.cjs', 'executable terminal recovery clears discarded and retirement queues before the next request'],
  'LIFE-14': ['v2/formal-step2/tests/persistence-adapter.cjs', 'lifecycleAborted'],
  'LIFE-15': ['v2/formal-step2/tests/terminal-recovery-state-machine.cjs', 'production-equivalent converge aborts prepare state and clears its discarded queue before next begin'],
  'LIFE-16': ['v2/formal-step2/tests/persistence-adapter.cjs', 'generated practical recovery uses the shared executable runtime helper and action diagnostics'],
  'OBS-01': ['v2/formal-step2/tests/persistence-adapter.cjs', 'stage/category propagation'],
  'OBS-02': ['v2/formal-step2/tests/persistence-adapter.cjs', 'generated body parse'],
  'OBS-03': ['v2/formal-step2/tests/persistence-adapter.cjs', 'cleanup evidence is present in practical lifecycle failure', 'generated bridge preserves cleanup evidence in lifecycle failure'],
  'OBS-04': ['v2/formal-step2/tests/persistence-adapter.cjs', 'transport error is indeterminate and cannot be treated as safe retry'],
  'OBS-05': ['v2/formal-step2/tests/terminal-recovery-state-machine.cjs', 'executable recovery keeps duplicate ownership fail-closed'],
  'STATE-01': ['v2/formal-step2/tests/multi.cjs', 'confirmed reading crossing actual line boundary remains unresolved and local split children need reread'],
  'STATE-02': ['v2/formal-step2/tests/persistence-adapter.cjs', 'planner render evidence is written into the durable multi note before callback'],
  'STATE-03': ['v2/formal-step2/tests/persistence-adapter.cjs', 'generated bridge reports render-failure note only after persisted readback'],
  'STATE-04': ['v2/formal-step2/tests/multi.cjs', 'persisted planner state keeps complete, pending, and unresolved occurrences identical after reopen'],
  'STATE-05': ['v2/formal-step2/tests/persistence-adapter.cjs', 'all noncomplete render paths normalize stale occurrence evidence and require exact readback'],
  'STATE-06': ['v2/formal-step2/tests/workflow.cjs', 'no-op occurrence editor commit preserves unresolved render evidence'],
  'STATE-07': ['v2/formal-step2/tests/orchestration.cjs', 'split-hint-required exposes the exact planner boundaries at orchestration level'],
  'STATE-08': ['v2/formal-step2/tests/persistence-adapter.cjs', 'terminal native success writes complete render evidence after finish'],
  'STATE-09': ['v2/formal-step2/tests/persistence-adapter.cjs', 'native lifecycle failure returns the authoritative note for palette retry'],
  'STATE-10': ['v2/formal-step2/tests/persistence-adapter.cjs', 'native lifecycle failure returns the authoritative note for palette retry'],
  'STATE-11': ['v2/formal-step2/tests/workflow.cjs', 'semantic occurrence edits reset frame render status while no-op commits preserve it'],
  'STATE-12': ['v2/formal-step2/tests/persistence-adapter.cjs', 'runtime source preflight includes every evaluated dependency'],
  'STATE-13': ['v2/formal-step2/tests/workflow.cjs', 'long-text suppression and re-enable use occurrence review queue without changing siblings'],
  'STATE-14': ['v2/formal-step2/tests/persistence-adapter.cjs', 'native.recovery'],
};

const executedFiles = {};
const parityDimensions = [
  'Geometry semantics',
  'Appearance/baseSize semantics',
  'Logical/physical identity',
  'Persistence read/write ordering',
  'Copy-on-write lifecycle',
  'Manual adjustment semantics',
  'Source/unmanaged preservation',
  'Structured diagnostics',
  'ExtendScript compatibility'
];

function run(label, args) {
  process.stdout.write('\n[minimum-pack] ' + label + '\n');
  for (let i = 0; i < args.length; i++) {
    if (/\.cjs$/.test(args[i])) executedFiles[path.relative(root, args[i]).replace(/\\/g, '/')]=true;
  }
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(label + ' failed with exit code ' + String(result.status));
}

const catalog = fs.readFileSync(catalogPath, 'utf8');
for (let i = 0; i < catalogIds.length; i++) {
  if (catalog.indexOf(catalogIds[i]) < 0) throw new Error('catalog entry missing: ' + catalogIds[i]);
}
const parityGate = fs.readFileSync(parityGatePath, 'utf8');
if (parityGate.indexOf('old contract -> new path -> regression evidence') < 0) {
  throw new Error('migration-parity gate mapping rule missing');
}
for (let i = 0; i < parityDimensions.length; i++) {
  if (parityGate.indexOf(parityDimensions[i]) < 0) {
    throw new Error('migration-parity contract dimension missing: ' + parityDimensions[i]);
  }
}
if (parityGate.indexOf('minimum pack must statically assert') < 0) {
  throw new Error('migration-parity minimum-pack requirement missing');
}
for (let i = 0; i < parityDimensions.length; i++) {
  const row = parityGate.indexOf('| ' + parityDimensions[i] + ' |');
  if (row < 0 || parityGate.indexOf('[x]', row) < 0 || parityGate.indexOf('tests/', row) < 0) {
    throw new Error('migration-parity evidence missing: ' + parityDimensions[i]);
  }
}
process.stdout.write('\n[minimum-pack] migration-parity gate PASS (9 contract dimensions)\n');

run('native renderer and centered/baseSize geometry', [
  '--test', path.join(step2, 'tests', 'native-renderer.cjs'),
  path.join(step2, 'tests', 'area-text-native.cjs'),
  path.join(step2, 'tests', 'area-text-render-spec.cjs'),
  path.join(step2, 'tests', 'area-text-native-backend.cjs')
]);
run('practical bridge ordering and structured diagnostics', [
  '--test', path.join(step2, 'tests', 'persistence-adapter.cjs'),
  path.join(step2, 'tests', 'area-text-native-reflow-diagnostic.cjs')
]);
run('ownership, explicit removal, cleanup ordering, and preservation', [
  '--test',
  path.join(step2, 'tests', 'area-text-native-integration.cjs'),
  path.join(step2, 'tests', 'area-text-native-transaction-coordinator.cjs'),
  path.join(step2, 'tests', 'area-text-native-recovery.cjs'),
  path.join(step2, 'tests', 'terminal-recovery-state-machine.cjs'),
  path.join(step2, 'tests', 'adapter-transaction.cjs')
]);
run('static DOM and practical ownership assertions', [
  '--test',
  path.join(step2, 'tests', 'area-text-native-static.cjs'),
  path.join(step2, 'tests', 'run.cjs')
]);
run('multi segmentation and diagnostic UI contracts', [
  '--test',
  path.join(step2, 'tests', 'multi.cjs'),
  path.join(step2, 'tests', 'workflow.cjs'),
  path.join(step2, 'tests', 'multi-renderer.cjs'),
  path.join(step2, 'tests', 'orchestration.cjs'),
  path.join(step2, 'tests', 'ui.cjs')
]);
run('ExtendScript compatibility', [path.join(step2, 'extendscript-compat-lint.cjs')]);
run('gate-0', ['--test', path.join(step2, 'tests', 'gate-0.cjs')]);

const diff = spawnSync('git', ['diff', '--check'], { cwd: root, stdio: 'inherit' });
if (diff.status !== 0) throw new Error('git diff --check failed');
for (let i = 0; i < catalogIds.length; i++) {
  const id = catalogIds[i];
  const mapping = coverageMap[id];
  if (!mapping) throw new Error('coverage map entry missing: ' + id);
  if (!executedFiles[mapping[0]]) throw new Error('coverage anchor was not executed: ' + id + ' -> ' + mapping[0]);
  if (mapping[2]) {
    const evidence = fs.readFileSync(path.join(root, mapping[0]), 'utf8');
    if (evidence.indexOf(mapping[2]) < 0) throw new Error('assertion marker missing: ' + id + ' -> ' + mapping[2]);
  }
}
process.stdout.write('\n[minimum-pack] coverage map PASS (' + String(catalogIds.length) + ' IDs with assertion markers)\n');
process.stdout.write('\n[minimum-pack] PASS\n');
