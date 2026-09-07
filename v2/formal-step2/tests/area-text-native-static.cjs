const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..','..','..');

test('native pure helper parses in ordinary JavaScript',()=>{
  const file=path.join(root,'v2','formal-step2','area-text-native.js');
  assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(file,'utf8'),{filename:file}));
});

test('native capability probe is isolated in a disposable document',()=>{
  const file=path.join(root,'v2','diagnostics','Formal Step2 AreaText Native Probe.jsx');
  const source=fs.readFileSync(file,'utf8');
  const parseable=source.replace(/^\s*#target.*$/gm,'');
  assert.doesNotThrow(()=>new vm.Script(parseable,{filename:file}));
  assert.ok(source.includes('app.documents.add()'));
  assert.ok(source.includes('SaveOptions.DONOTSAVECHANGES'));
  assert.ok(source.includes('layer.pathItems.rectangle'));
  assert.ok(source.includes('layer.textFrames.areaText(path)'));
  assert.ok(source.includes('Justification.FULLJUSTIFY'));
  assert.ok(source.includes('[0, -25, -50, -75, -100]'));
  assert.ok(source.includes('frame.remove()'));
  assert.ok(!source.includes('app.activeDocument'));
  assert.ok(!source.includes('source.note ='));
});

test('native probe compares fresh geometry instead of resizing an existing frame',()=>{
  const source=fs.readFileSync(path.join(root,'v2','diagnostics','Formal Step2 AreaText Native Probe.jsx'),'utf8');
  assert.ok(source.includes('createCandidate("B1"'));
  assert.ok(source.includes('createCandidate("B2"'));
  assert.ok(!source.includes('.width ='));
  assert.ok(!source.includes('textPath.width ='));
});
