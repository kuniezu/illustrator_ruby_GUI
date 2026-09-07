const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..','..','..');

function parse(relative){
  const file=path.join(root,relative),source=fs.readFileSync(file,'utf8');
  assert.doesNotThrow(()=>new vm.Script(source,{filename:file}));
  return source;
}

test('native pure helpers parse in ordinary JavaScript',()=>{
  parse(path.join('v2','formal-step2','area-text-native.js'));
  parse(path.join('v2','formal-step2','area-text-render-spec.js'));
});

test('native backend scaffold parses and only creates fresh area text candidates',()=>{
  const source=parse(path.join('v2','formal-step2','area-text-native-backend.jsx'));
  assert.ok(source.includes('layer.pathItems.rectangle'));
  assert.ok(source.includes('layer.textFrames.areaText(path)'));
  assert.ok(source.includes('FormalAreaTextNative.verifyOneLineFit'));
  assert.ok(source.includes('FormalAreaTextNative.trackingCandidates'));
  assert.ok(source.includes('candidate.frame.remove()'));
  assert.ok(source.includes('applyComposerPolicy'));
  assert.ok(!source.includes('kind = TextType.AREATEXT'));
  assert.ok(!source.includes('source.note'));
  assert.ok(!source.includes('activeBindings'));
});

test('native host batch keeps activation and source persistence outside backend',()=>{
  const source=parse(path.join('v2','formal-step2','area-text-native-host.jsx'));
  assert.ok(source.includes('FormalAreaTextRenderSpec.backendSpec'));
  assert.ok(source.includes('backend.prepareCandidate'));
  assert.ok(source.includes('backend.verifyCandidate'));
  assert.ok(source.includes('backend.tryTracking'));
  assert.ok(source.includes('bindingsByLogicalSegmentId'));
  assert.ok(!source.includes('source.note'));
  assert.ok(!source.includes('.remove()'));
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
