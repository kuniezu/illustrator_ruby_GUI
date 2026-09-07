#!/usr/bin/env node

const acorn = require('acorn');

const parserConfig = { ecmaVersion: 3, sourceType: 'script', allowReserved: 'never' };

// Conservative ES3 grammar gate. vm.Script supplies ordinary syntax parsing;
// these explicit grammar checks cover constructs accepted by modern parsers
// but unavailable to the Illustrator ExtendScript ES3 subset.
const reservedWords = 'new delete default class enum extends super import export'.split(' ');

function reject(source, filename, pattern, reason) {
  const match = pattern.exec(source);
  if (!match) return null;
  return { filename, line: source.slice(0, match.index).split('\n').length, reason };
}

function parseES3(source, filename) {
  const text = String(source);
  const withoutDirectives = text.replace(/^\s*#(?:target|include).*$/gm, '');
  let violation;
  const checks = [
    [/\b(?:let|const|class)\b/g, 'modern binding/class syntax'],
    [/=>/g, 'arrow function'],
    [/`/g, 'template literal'],
    [/\?\./g, 'optional chaining'],
    [/\b(?:var|let|const)\s*[\[{]/g, 'destructuring'],
    [/\b(?:get|set)\s+[A-Za-z_$][\w$]*\s*\(/g, 'getter/setter'],
    [/\(\s*\{\s*(?!(?:return|if|for|while|switch|catch|function|try|finally|throw)\b)[A-Za-z_$][\w$]*\s*\(/g, 'method shorthand'],
    [/\{\s*[A-Za-z_$][\w$]*\s*\}/g, 'property shorthand'],
    [/,\s*\}/g, 'object literal trailing comma']
  ];
  for (let i = 0; i < checks.length; i++) {
    violation = reject(withoutDirectives, filename, checks[i][0], checks[i][1]);
    if (violation) throw Error(violation.filename + ':' + violation.line + ' ' + violation.reason);
  }
  for (let i = 0; i < reservedWords.length; i++) {
    const word = reservedWords[i];
    violation = reject(withoutDirectives, filename,
      new RegExp('\\{\\s*' + word + '\\s*:', 'g'), 'reserved-word property ' + word);
    if (violation) throw Error(violation.filename + ':' + violation.line + ' ' + violation.reason);
  }
  acorn.parse(withoutDirectives, parserConfig);
  return true;
}

module.exports = { parseES3, reservedWords, parserConfig, parserName: 'Acorn', parserVersion: acorn.version };

if (require.main === module) {
  const fs = require('node:fs');
  const file = process.argv[2];
  if (!file) throw Error('usage: node es3-grammar-gate.cjs <file>');
  parseES3(fs.readFileSync(file, 'utf8'), file);
  process.stdout.write('ES3 parser: Acorn ' + acorn.version +
    ' ecmaVersion=3 sourceType=script allowReserved=never PASS ' + file + '\n');
}
