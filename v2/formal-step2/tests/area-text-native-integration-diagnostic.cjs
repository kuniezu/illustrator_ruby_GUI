const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),grammar=require('../es3-grammar-gate.cjs');

const file=path.join(__dirname,'..','..','diagnostics','Formal Step2 AreaText Native Integration Check.jsx');
const source=fs.readFileSync(file,'utf8');

test('one-shot integration diagnostic wires actual host and durable seam without UI entrypoint',()=>{
  assert.match(source,/#include "\.\.\/formal-step2\/area-text-native-host\.jsx"/);
  assert.match(source,/#include "\.\.\/formal-step2\/area-text-native-transaction-coordinator\.js"/);
  assert.match(source,/#include "\.\.\/formal-step2\/area-text-native-integration\.js"/);
  assert.match(source,/FormalAreaTextNativeIntegration\.create/);
  assert.match(source,/FormalAreaTextNativeHost\(doc, layer\)/);
  assert.match(source,/durable-begin/);assert.match(source,/durable-verified/);
  assert.match(source,/retirement-and-cleanup-pending/);assert.match(source,/cleanup-success/);
  assert.match(source,/DONOTSAVECHANGES/);assert.match(source,/app\.documents\.add\(\)/);
  assert.doesNotMatch(source,/\.kind\s*=/);assert.doesNotMatch(source,/\.overflows\b/);
  assert.doesNotMatch(source,/Formal Multi Step2\.jsx/);
});

test('one-shot integration diagnostic is ES3 grammar compatible',()=>{
  assert.doesNotThrow(()=>grammar.parseES3(source,file));
});
