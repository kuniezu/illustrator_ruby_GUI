const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..','..','..');
const compat=require('../extendscript-compat-lint.cjs');

function parse(relative){
  const file=path.join(root,relative),source=fs.readFileSync(file,'utf8');
  assert.doesNotThrow(()=>new vm.Script(source,{filename:file}));
  return source;
}

test('diagnostic JSX passes ES3 reserved-property compatibility lint',()=>{
  assert.deepEqual(compat.lintDiagnosticSource(),[]);
  assert.equal(compat.scanDiagnosticCompatibility('var x={new:1};','fixture.jsx').length,1);
});

test('native pure helpers parse in ordinary JavaScript',()=>{
  parse(path.join('v2','formal-step2','area-text-native.js'));
  parse(path.join('v2','formal-step2','area-text-render-spec.js'));
});

test('isolated native note store and adapter parse without executable payload support',()=>{
  const store=parse(path.join('v2','formal-step2','area-text-native-store.js'));
  const adapter=parse(path.join('v2','formal-step2','area-text-native-note-adapter.js'));
  assert.ok(store.includes('[v2-formal-step2-native:v1]'));
  assert.ok(store.includes('function restartPlan'));
  assert.ok(store.includes('function update'));
  assert.ok(!store.includes('JSON.parse'));
  assert.ok(!store.includes('eval('));
  assert.ok(adapter.includes('FormalAreaTextNativeStore.update'));
  assert.ok(!adapter.includes('source.note'));
});

test('isolated native persistence facade parses and remains unwired',()=>{
  const source=parse(path.join('v2','formal-step2','area-text-native-persistence-facade.js'));
  assert.ok(source.includes('FormalAreaTextNativeNoteAdapter.update'));
  assert.ok(source.includes('concurrent-source-change'));
  assert.ok(source.includes('concurrent-note-change'));
  assert.ok(source.includes('FormalAreaTextNativeStore.restartPlan'));
  assert.ok(!source.includes('persistence-adapter.jsx'));
  assert.ok(!source.includes('Formal Multi Step2.jsx'));
});

test('isolated transaction coordinator composes pure transitions with the facade',()=>{
  const source=parse(path.join('v2','formal-step2','area-text-native-transaction-coordinator.js'));
  assert.ok(source.includes('FormalAreaTextNative[operation]'));
  assert.ok(source.includes('FormalAreaTextNativePersistenceFacade.update'));
  assert.ok(source.includes('beginOperation'));
  assert.ok(source.includes('markVerified'));
  assert.ok(source.includes('markRetired'));
  assert.ok(source.includes('finishOperation'));
  assert.ok(!source.includes('source.note'));
  assert.ok(!source.includes('persistence-adapter.jsx'));
});

test('isolated recovery layer covers restart, cleanup, and source identity without production wiring',()=>{
  const source=parse(path.join('v2','formal-step2','area-text-native-recovery.js'));
  assert.ok(source.includes('prepare-candidates'));assert.ok(source.includes('reverify-candidates'));
  assert.ok(source.includes('native-recovery-duplicate-candidate'));assert.ok(source.includes('sourceFrameId'));
  assert.ok(source.includes('discardedCleanup'));assert.ok(source.includes('canFinish'));
  assert.ok(source.includes('function resume'));assert.ok(source.includes('function execute'));assert.ok(source.includes('function activate'));assert.ok(source.includes('validateOperationCandidates'));
  assert.ok(!source.includes('persistence-adapter.jsx'));assert.ok(!source.includes('Formal Multi Step2.jsx'));
});

test('native output identity codec and backend stamping are isolated and ordered',()=>{
  const identity=parse(path.join('v2','formal-step2','area-text-native-output-identity.js'));
  const backend=parse(path.join('v2','formal-step2','area-text-native-backend.jsx'));
  const renderSpec=parse(path.join('v2','formal-step2','area-text-render-spec.js'));
  assert.ok(identity.includes('[v2-formal-step2-native-output:v1]'));
  assert.ok(identity.includes('duplicate-match'));
  assert.ok(identity.includes('native-output-identity-immutable'));
  assert.equal(identity.includes('formal-step2-output'), false);
  assert.ok(backend.includes('FormalAreaTextNativeOutputIdentity.stamp'));
  assert.ok(backend.indexOf('FormalAreaTextNativeOutputIdentity.stamp') < backend.indexOf('applyTypography'));
  assert.ok(renderSpec.includes('sourceFrameId: spec.sourceFrameId'));
});

test('native persistence runtime checkpoint is diagnostic-only and includes the isolated store',()=>{
  const file=path.join(root,'v2','diagnostics','Formal Step2 AreaText Native Persistence Check.jsx');
  const source=fs.readFileSync(file,'utf8');
  const parseable=source.replace(/^\s*#target.*$/gm,'').replace(/^\s*#include.*$/gm,'');
  assert.doesNotThrow(()=>new vm.Script(parseable,{filename:file}));
  assert.ok(source.includes('#include "../formal-step2/area-text-native-store.js"'));
  assert.ok(source.includes('#include "../formal-step2/area-text-native-note-adapter.js"'));
  assert.ok(source.includes('FormalAreaTextNativeNoteAdapter.update'));
  assert.ok(source.includes('FormalAreaTextNativeStore.restartPlan'));
  assert.ok(source.includes('SaveOptions.DONOTSAVECHANGES'));
  assert.ok(source.includes('Folder.temp'));
  assert.ok(source.includes('app.open(tempFile)'));
  assert.ok(source.includes('unmanagedName'));
  assert.ok(source.includes('unmanagedContents'));
  assert.ok(source.includes('safe(reopenedForeign.contents) !== unmanagedContents'));
  assert.ok(!source.includes('findTextFrame(reopened, unmanaged.name)'));
  assert.ok(!source.includes('persistence-adapter.jsx'));
  assert.ok(!source.includes('Formal Multi Step2.jsx'));
});

test('native persistence checkpoint uses canonical exact manifest readback',()=>{
  const file=path.join(root,'v2','diagnostics','Formal Step2 AreaText Native Persistence Check.jsx');
  const source=fs.readFileSync(file,'utf8');
  assert.ok(source.includes('FormalAreaTextNativeStore.serialize(actual) !== FormalAreaTextNativeStore.serialize(expected)'));
  assert.ok(!source.includes('activeBindings.s1 !== expected.activeBindings.s1 && actual.activeBindings.s2 !== expected.activeBindings.s2'));
  const storeSource=parse(path.join('v2','formal-step2','area-text-native-store.js'));
  const context={};
  vm.runInNewContext(storeSource+';this.Store=FormalAreaTextNativeStore;',context);
  const base=vm.runInNewContext("({rendererMode:'area-text-native',manifestRevision:0,activeBindings:{s1:'p1'},renderRecords:{p1:{physicalId:'p1',logicalSegmentId:'s1',generationId:'g',requestId:'r',rendererVersion:'v',geometryVersion:'g',autoLeft:1,autoWidth:2,appliedLeft:1,appliedWidth:2,appliedTop:1,appliedHeight:1,tracking:0,fontName:'f',fontSize:1,justification:'full',singleWordJustification:'full',fitReason:'fit'}},operation:null,retirementQueue:[]})",context);
  const changed=vm.runInNewContext("({rendererMode:'area-text-native',manifestRevision:0,activeBindings:{s1:'p1'},renderRecords:{p1:{physicalId:'p1',logicalSegmentId:'s1',generationId:'g',requestId:'r',rendererVersion:'v',geometryVersion:'g',autoLeft:1,autoWidth:2,appliedLeft:1,appliedWidth:2,appliedTop:1,appliedHeight:1,tracking:0,fontName:'f',fontSize:1,justification:'full',singleWordJustification:'full',fitReason:'fit'},retired:{physicalId:'retired',logicalSegmentId:'retired',generationId:'g',requestId:'r',rendererVersion:'v',geometryVersion:'g',autoLeft:1,autoWidth:2,appliedLeft:1,appliedWidth:2,appliedTop:1,appliedHeight:1,tracking:0,fontName:'f',fontSize:1,justification:'full',singleWordJustification:'full',fitReason:'fit'}},operation:null,retirementQueue:['retired']})",context);
  assert.notEqual(context.Store.serialize(base),context.Store.serialize(changed));
});

test('native identity persistence checkpoint uses backend stamping and identity-only reopen resolution',()=>{
  const file=path.join(root,'v2','diagnostics','Formal Step2 AreaText Native Identity Persistence Check.jsx');
  const source=fs.readFileSync(file,'utf8');
  assert.ok(source.includes('#include "../formal-step2/area-text-render-spec.js"'));
  assert.ok(source.includes('#include "../formal-step2/area-text-native-output-identity.js"'));
  assert.ok(source.includes('#include "../formal-step2/area-text-native-backend.jsx"'));
  assert.ok(source.includes('FormalAreaTextNativeOutputIdentity.stamp'));
  assert.ok(source.includes('FormalAreaTextNativeOutputIdentity.resolve'));
  assert.ok(source.includes('app.open(tempFile)'));
  assert.ok(source.includes('SaveOptions.DONOTSAVECHANGES'));
  assert.ok(source.includes('identity-removal'));
  assert.ok(source.includes('source-replacement-accepted'));
  assert.ok(source.includes('source-replacement-mutated-note'));
  assert.equal(source.includes('source.note'),false);
  assert.equal(source.includes('Formal Multi Step2.jsx'),false);
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

test('native manifest carries durable discarded cleanup state and host exposes cleanup failure',()=>{
  const native=parse(path.join('v2','formal-step2','area-text-native.js'));
  const store=parse(path.join('v2','formal-step2','area-text-native-store.js'));
  const host=parse(path.join('v2','formal-step2','area-text-native-host.jsx'));
  assert.ok(native.includes('cleanupQueue'));assert.ok(native.includes('markDiscardedCleaned'));
  assert.ok(store.includes('cleanup-invalid'));assert.ok(store.includes('cleanup-discarded'));
  assert.ok(host.includes('cleanupPendingIds'));assert.ok(host.includes('cleanupFailed'));
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
test('native lifecycle checkpoint connects backend, persistence, recovery, and reopen',()=>{
  const file=path.join(root,'v2','diagnostics','Formal Step2 AreaText Native Lifecycle Check.jsx');
  const source=fs.readFileSync(file,'utf8');
  const parseable=source.replace(/^\s*#target.*$/gm,'').replace(/^\s*#include.*$/gm,'');
  assert.doesNotThrow(()=>new vm.Script(parseable,{filename:file}));
  assert.ok(source.includes('FormalAreaTextNativeTransactionCoordinator.begin'));
  assert.ok(source.includes('FormalAreaTextNativeTransactionCoordinator.verify'));
  assert.ok(source.includes('FormalAreaTextNativeTransactionCoordinator.activate'));
  assert.ok(source.includes('FormalAreaTextNativeTransactionCoordinator.retire'));
  assert.ok(source.includes('FormalAreaTextNativeTransactionCoordinator.finish'));
  assert.ok(source.includes('FormalAreaTextNativeRecovery.execute'));
  assert.ok(source.includes('FormalAreaTextNativeOutputIdentity.resolve'));
  assert.ok(source.includes('doc.saveAs(tempFile)'));assert.ok(source.includes('app.open(tempFile)'));
  assert.ok(source.includes('duplicate-fail-closed'));assert.ok(source.includes('SaveOptions.DONOTSAVECHANGES'));
});

test('native probe compares fresh geometry instead of resizing an existing frame',()=>{
  const source=fs.readFileSync(path.join(root,'v2','diagnostics','Formal Step2 AreaText Native Probe.jsx'),'utf8');
  assert.ok(source.includes('create("B1"'));
  assert.ok(source.includes('create("B2"'));
  assert.ok(!source.includes('.width ='));
  assert.ok(!source.includes('textPath.width ='));
});

test('C/D visual fixtures survive until checkpoint and cleanup follows continuation',()=>{
  const source=fs.readFileSync(path.join(root,'v2','diagnostics','Formal Step2 AreaText Native Probe.jsx'),'utf8');
  const c=source.indexOf('function runC()'), d=source.indexOf('function runD()'), checkpoint=source.indexOf('function runVisualCheckpoint()'), call=source.indexOf('runVisualCheckpoint(); cleanupOwnedFixtures(); runHProductionScaffold();');
  assert.ok(c>=0 && d>=0 && checkpoint>=0 && call>=0);
  assert.ok(source.slice(c,checkpoint).indexOf('cleanup(a)')<0);assert.ok(source.slice(d,checkpoint).indexOf('cleanup(a)')<0);
  assert.ok(call>checkpoint);
  assert.match(source,/C1: 複数文字 \+ FULLJUSTIFY/);assert.match(source,/C2: 1文字 \+ CENTER/);assert.match(source,/Continue/);
});

test('A-H one-shot diagnostic is disposable, aggregated, and not production wiring',()=>{
  const file=path.join(root,'v2','diagnostics','Formal Step2 AreaText Native Probe.jsx');
  const source=fs.readFileSync(file,'utf8');
  for(const id of ['A1','B1','B2','C1','C2','D1','D2','D3','D4','F1','F2','F3','F4','G1','G2','G3','G4','H']) assert.ok(source.includes('"'+id+'"'),id);
  assert.ok(source.includes('"E" + i'));
  assert.ok(source.includes('areaText(path)'));assert.ok(source.includes('BridgeTalk'));assert.ok(source.includes('sendWithTimeout'));
  assert.ok(source.includes('FormalAreaTextRenderSpec.create'));assert.ok(source.includes('FormalAreaTextRenderSpec.validate'));assert.ok(source.includes('FormalAreaTextNativeDiagnostic.buildReceiverBody'));assert.ok(source.includes('FormalAreaTextNativeDiagnostic.parseReceiverResult'));
  assert.ok(source.includes('FormalAreaTextNative.createManifest'));assert.ok(source.includes('FormalAreaTextNative.beginOperation'));assert.ok(source.includes('FormalAreaTextNative.activate'));assert.ok(source.includes('FormalAreaTextNative.captureManualAdjustment'));
  assert.ok(source.includes('FormalAreaTextNativeDiagnostic.runTracking'));assert.ok(source.includes('sharedFit'));assert.ok(source.includes('FormalAreaTextNativeDiagnostic.hCompletion'));
  assert.ok(source.includes('selectFontName'));assert.ok(source.includes('app.textFonts'));assert.ok(source.includes('no-font-available'));assert.ok(source.includes('parseReceiverResult'));assert.ok(!source.includes('function runH()'));assert.ok(!source.includes('function runHRenderSpec()'));
  assert.ok(source.includes('function eq'));assert.ok(source.includes('previousSelf'));assert.ok(source.includes('nextSelf'));assert.ok(source.includes('pathAlreadyGone'));assert.ok(source.includes('tracking=') && source.includes('stopReason='));
  assert.ok(source.includes('bt.onTimeout'));assert.ok(source.includes('sendWithTimeout'));const diagnosticSource=fs.readFileSync(path.join(root,'v2','formal-step2','area-text-native-diagnostic.js'),'utf8');assert.ok(diagnosticSource.includes('message.timeout'));assert.ok(diagnosticSource.includes('result-unknown-after-send-timeout'));assert.ok(source.includes('callback-timeout'));assert.ok(source.includes('renderSpecLiteral'));
  assert.ok(source.includes('Window("dialog"'));assert.ok(source.includes('report.join("\\n")'));assert.ok(source.includes('runVisualCheckpoint'));assert.ok(source.includes('cleanupOwnedFixtures'));
  assert.ok(source.includes('app.documents.add()'));assert.ok(source.includes('DONOTSAVECHANGES'));
  assert.ok(source.includes('var TRACKING = [0, -25, -50, -75, -100]'));
  assert.ok(source.includes('pendingH'));assert.ok(source.includes('completeH'));assert.ok(source.includes('finalizeReport'));assert.ok(source.includes('function summary()'));
  assert.ok(!source.includes('source.note'));assert.ok(!source.includes('kind = TextType.AREATEXT'));
  assert.ok(!source.includes('TextType.POINTTEXT'));assert.ok(!source.includes('app.activeDocument'));assert.ok(diagnosticSource.includes('quoteValue'));assert.ok(source.includes('FormalAreaTextNativeDiagnostic.quoteValue'));
});
