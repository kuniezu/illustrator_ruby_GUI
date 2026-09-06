const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', '..', 'diagnostics', 'Formal Step2 TextFrame Multi-Path Probe.jsx');
const source = fs.readFileSync(file, 'utf8');

function check(name, condition) {
  if (!condition) throw new Error(name);
  console.log('PASS ' + name);
}

check('probe is separate and read-only',
  source.includes('#target illustrator') &&
  source.includes('Read-only research probe') &&
  !source.includes('.remove()') &&
  !source.includes('.contents ='));
check('probe isolates property errors',
  source.includes('function read(path, getter)') &&
  source.includes('=ERROR') &&
  source.includes('try { run(); } catch'));
check('probe covers selection shapes and story candidates',
  source.includes('document.selection') &&
  source.includes('selection[0]') &&
  source.includes('TextRange') &&
  source.includes('story.textFrames'));
check('probe records enum raw/string/number and strict/loose comparisons',
  source.includes('.kind.raw') &&
  source.includes('.kind.String') &&
  source.includes('.kind.Number') &&
  source.includes('.loose=') &&
  source.includes('.strict='));
check('probe records structural TextFrame evidence',
  source.includes('.textRange.start') &&
  source.includes('.textRange.end') &&
  source.includes('.textPath.typename') &&
  source.includes('.rowCount') &&
  source.includes('.columnCount') &&
  source.includes('.story.textFrames.length'));
check('probe reports evidence-based candidate strategies',
  source.includes('strategy("A-direct-strict"') &&
  source.includes('strategy("B-direct-loose"') &&
  source.includes('strategy("C-derived-strict"') &&
  source.includes('strategy.D='));
