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
  assert.ok(source.includes('doc.textFrames.areaText(path)'));
  assert.ok(source.includes('FormalAreaTextNative.verifyOneLineFit'));
  assert.ok(source.includes('FormalAreaTextNative.trackingCandidates'));
  assert.ok(source.includes('candidate.frame.remove()'));
  assert.ok(source.includes('constructedFromRectangle: true'));
  assert.ok(source.includes('areaTextKind: frame.kind'));
  assert.ok(source.includes('style-font-mismatch'));
  assert.ok(source.includes('style-composer-mismatch'));
  assert.ok(source.includes('geometry-readback-mismatch'));
  assert.ok(source.includes('candidate-justification-unsupported'));
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

test('native host validates the complete batch before DOM creation',()=>{
  const source=parse(path.join('v2','formal-step2','area-text-native-host.jsx'));
  const context={
    FormalAreaTextNativeBackend:()=>({prepareCandidate(){context.created++;return {};},disposeCandidate(){}}),
    FormalAreaTextRenderSpec:{validate(){return {ok:true};},backendSpec(s){return s;}},
    created:0
  };
  vm.runInNewContext(source+';this.Host=FormalAreaTextNativeHost;',context);
  const host=new context.Host({},{}), base={requestId:'r1',sourceFrameId:'f1',physicalId:'p1',logicalSegmentId:'s1'};
  assert.throws(()=>host.prepareAll([base,Object.assign({},base,{physicalId:'p2'})]),/render-spec-logical-duplicate/);
  assert.equal(context.created,0);
  assert.throws(()=>host.prepareAll([base,Object.assign({},base,{physicalId:'p1',logicalSegmentId:'s2'})]),/render-spec-physical-duplicate/);
  assert.equal(context.created,0);
  assert.throws(()=>host.prepareAll([base,Object.assign({},base,{physicalId:'p2',logicalSegmentId:'s2',requestId:'r2'})]),/render-spec-request-mismatch/);
  assert.equal(context.created,0);
});

test('native host converts every backend spec before creating any candidate',()=>{
  const source=parse(path.join('v2','formal-step2','area-text-native-host.jsx'));
  const context={
    FormalAreaTextNativeBackend:()=>({prepareCandidate(){context.created++;return {};},disposeCandidate(){}}),
    FormalAreaTextRenderSpec:{validate(){return {ok:true};},backendSpec(s){if(s.fail)throw Error('backend-spec-failed');return s;}},
    created:0
  };
  vm.runInNewContext(source+';this.Host=FormalAreaTextNativeHost;',context);
  const host=new context.Host({},{}), base={requestId:'r1',sourceFrameId:'f1',physicalId:'p1',logicalSegmentId:'s1'};
  assert.throws(()=>host.prepareAll([base,Object.assign({},base,{physicalId:'p2',logicalSegmentId:'s2',fail:true})]),/backend-spec-failed/);
  assert.equal(context.created,0);
});

test('native state activation is verified-only and ownership-scoped',()=>{
  const source=parse(path.join('v2','formal-step2','area-text-native.js'));
  assert.ok(source.includes('operation-not-verified'));
  assert.ok(source.includes('activation-record-not-owned'));
  assert.ok(source.includes('activation-binding-record-mismatch'));
  assert.ok(source.includes('cannot-activate-retired-physical'));
});

test('tracking stops after the first non-retryable readback failure',()=>{
  const source=parse(path.join('v2','formal-step2','area-text-native-backend.jsx'));
  let trackingWrites=0, size=8, tracking=0;
  const attrs={get size(){return size;},set size(v){size=v;},textFont:{name:'RubyFont'},horizontalScale:100,verticalScale:100,
    get tracking(){return tracking;},set tracking(v){trackingWrites++;tracking=v;if(trackingWrites===1)size=7;}};
  const range={start:0,end:2,contents:'かな',lines:[{start:0,end:2,contents:'かな'}],characterAttributes:attrs,
    paragraphAttributes:{justification:'full',singleWordJustification:'full',minimumGlyphScaling:100,desiredGlyphScaling:100,maximumGlyphScaling:100,minimumLetterSpacing:null,desiredLetterSpacing:null,maximumLetterSpacing:null,minimumWordSpacing:null,desiredWordSpacing:null,maximumWordSpacing:null}};
  const frame={kind:'area',orientation:'horizontal',previousFrame:null,nextFrame:null,contents:'かな',textRange:range,left:10,top:20,width:30,height:12,textPath:{left:10,top:20,width:30,height:12}};
  const context={TextType:{AREATEXT:'area'},TextOrientation:{HORIZONTAL:'horizontal'},Justification:{FULLJUSTIFY:'full',CENTER:'center'},app:{redraw(){}},FormalAreaTextNative:{verifyOneLineFit(){return {ok:false,reason:'fit-failed'};}}};
  vm.runInNewContext(source+';this.Backend=FormalAreaTextNativeBackend;',context);
  const backend=context.Backend({},{}), candidate={frame:frame};
  const spec={singleCharacter:false,reading:'かな',left:10,top:20,width:30,height:12,appearance:{fontName:'RubyFont',fontSize:8},composerPolicy:{minimumGlyphScaling:100,desiredGlyphScaling:100,maximumGlyphScaling:100,minimumLetterSpacing:null,desiredLetterSpacing:null,maximumLetterSpacing:null,minimumWordSpacing:null,desiredWordSpacing:null,maximumWordSpacing:null,justification:'full',singleWordJustification:'full',trackingCandidates:[0,-25,-50]}};
  const result=backend.tryTracking(candidate,spec);
  assert.equal(result.ok,false);assert.equal(result.reason,'style-size-mismatch');assert.equal(result.retryable,false);assert.equal(trackingWrites,1);
});

test('native capability probe is isolated in a disposable document',()=>{
  const file=path.join(root,'v2','diagnostics','Formal Step2 AreaText Native Probe.jsx');
  const source=fs.readFileSync(file,'utf8');
  const parseable=source.replace(/^\s*#target.*$/gm,'').replace(/^\s*#include.*$/gm,'');
  assert.doesNotThrow(()=>new vm.Script(parseable,{filename:file}));
  assert.ok(source.includes('app.documents.add()'));
  assert.ok(source.includes('SaveOptions.DONOTSAVECHANGES'));
  assert.ok(source.includes('layer.pathItems.rectangle'));
  assert.ok(source.includes('doc.textFrames.areaText(path)'));
  assert.ok(source.includes('Justification.FULLJUSTIFY'));
  assert.ok(source.includes('[0, -25, -50, -75, -100]'));
  assert.ok(source.includes('frame.remove()'));
  assert.ok(!source.includes('app.activeDocument'));
  assert.ok(!source.includes('source.note ='));
});

test('native probe compares fresh geometry instead of resizing an existing frame',()=>{
  const source=fs.readFileSync(path.join(root,'v2','diagnostics','Formal Step2 AreaText Native Probe.jsx'),'utf8');
  assert.ok(source.includes('create("B1"'));
  assert.ok(source.includes('create("B2"'));
  assert.ok(!source.includes('.width ='));
  assert.ok(!source.includes('textPath.width ='));
});

test('A-H one-shot diagnostic is disposable, aggregated, and not production wiring',()=>{
  const file=path.join(root,'v2','diagnostics','Formal Step2 AreaText Native Probe.jsx');
  const source=fs.readFileSync(file,'utf8');
  for(const id of ['A1','B1','B2','C1','C2','D1','D2','D3','D4','F1','F2','F3','F4','G1','G2','G3','G4','H']) assert.ok(source.includes('"'+id+'"'),id);
  assert.ok(source.includes('"E" + i'));
  assert.ok(source.includes('areaText(path)'));assert.ok(source.includes('BridgeTalk'));assert.ok(source.includes('bt.send(30)'));
  assert.ok(source.includes('FormalAreaTextRenderSpec.create'));assert.ok(source.includes('FormalAreaTextRenderSpec.validate'));assert.ok(source.includes('FormalAreaTextRenderSpec.backendSpec'));
  assert.ok(source.includes('Window("dialog"'));assert.ok(source.includes('report.join("\\n")'));
  assert.ok(source.includes('app.documents.add()'));assert.ok(source.includes('DONOTSAVECHANGES'));
  assert.ok(source.includes('var TRACKING = [0, -25, -50, -75, -100]'));
  assert.ok(source.includes('pendingH'));assert.ok(source.includes('completeH'));assert.ok(source.includes('finalizeReport'));assert.ok(source.includes('function summary()'));
  assert.ok(!source.includes('source.note'));assert.ok(!source.includes('kind = TextType.AREATEXT'));
  assert.ok(!source.includes('TextType.POINTTEXT'));assert.ok(!source.includes('app.activeDocument'));
});
