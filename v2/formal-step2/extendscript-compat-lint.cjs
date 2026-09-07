#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');

// This denylist is intentionally separate from syntax parsing: ES3-compatible
// syntax does not prove that an API exists in the ExtendScript runtime.
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

// String#indexOf is ES3. These are explicit exceptions; unknown receivers are
// reported as possible Array#indexOf uses rather than silently accepted.
const allowedStringIndexOfReceivers = ['s', 'text', 'tag', 'note', 'key', 'annotationId'];

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

function scanExtendScriptCompatibility(source, filename) {
  const violations = [];
  extendScriptDenylist.forEach((rule) => {
    let match;
    rule.pattern.lastIndex = 0;
    while ((match = rule.pattern.exec(source)) !== null) {
      violations.push({ filename: filename, token: rule.token,
        line: source.slice(0, match.index).split('\n').length });
      if (match[0].length === 0) rule.pattern.lastIndex++;
    }
  });
  const indexOfPattern = /\b([A-Za-z_$][\w$]*)\.indexOf\s*\(/g;
  let indexOfMatch;
  while ((indexOfMatch = indexOfPattern.exec(source)) !== null) {
    const receiver = indexOfMatch[1];
    if (allowedStringIndexOfReceivers.indexOf(receiver) < 0) {
      violations.push({ filename: filename, token: receiver + '.indexOf',
        line: source.slice(0, indexOfMatch.index).split('\n').length });
    }
  }
  return violations;
}

function formatViolations(violations) {
  return violations.map((item) =>
    item.filename + ':' + item.line + ' forbidden ' + item.token
  ).join('\n');
}

function lintProductionSources() {
  const violations = [];
  productionSourceFiles().forEach((file) => {
    violations.push.apply(violations, scanExtendScriptCompatibility(
      fs.readFileSync(file, 'utf8'), path.relative(repoRoot, file)));
  });
  return violations;
}

if (require.main === module) {
  const violations = lintProductionSources();
  if (violations.length) {
    process.stderr.write(formatViolations(violations) + '\n');
    process.exitCode = 1;
  } else {
    process.stdout.write('ExtendScript compatibility: PASS (' +
      productionSourceFiles().length + ' production files)\n');
  }
}

module.exports = {
  formatViolations: formatViolations,
  lintProductionSources: lintProductionSources,
  productionSourceFiles: productionSourceFiles,
  scanExtendScriptCompatibility: scanExtendScriptCompatibility
};
