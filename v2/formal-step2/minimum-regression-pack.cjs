#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..', '..');
const step2 = path.join(root, 'v2', 'formal-step2');
const catalogPath = path.join(step2, 'known-failure-regression-catalog.md');

const catalogIds = [
  'DOM-01', 'DOM-02', 'DOM-03',
  'MULTI-01', 'MULTI-02', 'MULTI-03', 'MULTI-04',
  'ES3-01', 'ES3-02',
  'FIT-01', 'FIT-02', 'FIT-03', 'FIT-04',
  'LIFE-01', 'LIFE-02', 'LIFE-03', 'LIFE-04', 'LIFE-05', 'LIFE-06', 'LIFE-07',
  'OBS-01', 'OBS-02'
];

function run(label, args) {
  process.stdout.write('\n[minimum-pack] ' + label + '\n');
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(label + ' failed with exit code ' + String(result.status));
}

const catalog = fs.readFileSync(catalogPath, 'utf8');
for (let i = 0; i < catalogIds.length; i++) {
  if (catalog.indexOf(catalogIds[i]) < 0) throw new Error('catalog entry missing: ' + catalogIds[i]);
}

run('native renderer and centered/baseSize geometry', [
  '--test', path.join(step2, 'tests', 'native-renderer.cjs'),
  path.join(step2, 'tests', 'area-text-native.cjs')
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
  path.join(step2, 'tests', 'adapter-transaction.cjs')
]);
run('multi segmentation and diagnostic UI contracts', [
  '--test',
  path.join(step2, 'tests', 'multi-renderer.cjs'),
  path.join(step2, 'tests', 'orchestration.cjs'),
  path.join(step2, 'tests', 'ui.cjs')
]);
run('ExtendScript compatibility', [path.join(step2, 'extendscript-compat-lint.cjs')]);
run('gate-0', ['--test', path.join(step2, 'tests', 'gate-0.cjs')]);

const diff = spawnSync('git', ['diff', '--check'], { cwd: root, stdio: 'inherit' });
if (diff.status !== 0) throw new Error('git diff --check failed');
process.stdout.write('\n[minimum-pack] PASS\n');
