const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const D=require('../area-text-native-diagnostic.js');

test('tracking stops at first verified fit',()=>{
  let calls=[];const r=D.runTracking([0,-25,-50,-75,-100],v=>{calls.push(v);return {ok:v===0,retryable:true};});
  assert.deepEqual(calls,[0]);assert.equal(r.tracking,0);
});
test('tracking stops at first non-retryable failure',()=>{
  let calls=[];const r=D.runTracking([0,-25,-50],v=>{calls.push(v);return {ok:false,retryable:v!==0,reason:'style'};});
  assert.deepEqual(calls,[0]);assert.equal(r.stopped,true);assert.equal(r.reason,'style');
});
test('report is finalized only after async completion and contains result',()=>{
  const gate=D.reportGate();gate.add('H request');assert.equal(gate.isComplete(),false);
  gate.add('H PASS receiver=ok');const output=gate.finalize();assert.equal(gate.isComplete(),true);assert.match(output,/H PASS receiver=ok/);assert.throws(()=>gate.add('late'),/report-already-finalized/);
});
test('result, error, and timeout each finalize exactly once',()=>{
  for(const value of ['result','error','callback-timeout']){
    let outputs=[];const gate=D.completionGate(v=>outputs.push(v));assert.equal(gate.isDone(),false);assert.equal(gate.complete(value),true);assert.equal(gate.complete('late'),false);assert.deepEqual(outputs,[value]);
  }
});
test('receiver result status is validated instead of treating callback as PASS',()=>{
  const expected={schema:'formal-area-text-render-spec:v1',rendererMode:'area-text-native',rendererVersion:'area-text-native-v1',geometryVersion:'area-text-rectangle-v1',requestId:'r',logicalSegmentId:'s',physicalId:'p',reading:'かな',singleCharacter:'false',finalGeometry:'10:20:40:12',fontName:'TestFont'};
  const pass='PASS:schema=formal-area-text-render-spec:v1,rendererMode=area-text-native,rendererVersion=area-text-native-v1,geometryVersion=area-text-rectangle-v1,requestId=r,logicalSegmentId=s,physicalId=p,reading=かな,singleCharacter=false,finalGeometry=10:20:40:12,verify=verified-fit,fontName=TestFont';
  assert.equal(D.parseReceiverResult(pass,expected).status,'PASS');
  assert.equal(D.parseReceiverResult('CAPABILITY_UNAVAILABLE:no-font-available',expected).status,'CAPABILITY_UNAVAILABLE');
  assert.equal(D.parseReceiverResult('some unexpected body',expected).status,'FAIL');
  assert.notEqual(D.parseReceiverResult('some unexpected body',expected).status,'PASS');
});
test('expected negative fit remains an observed case, not a diagnostic failure',()=>{
  const outcomes={D1:'PASS',D2:'PASS observed-nonfit',D3:'PASS observed-nonfit',D4:'PASS observed-nonfit'};
  assert.match(D.buildSummary(outcomes,['D1','D2','D3','D4']),/D2 PASS observed-nonfit/);
});
test('copy-on-write transaction preserves old active on failure and queues retirement after activation',()=>{
  const initial={active:'old',queue:[],phase:'active'};
  const failed=D.transaction(initial,()=>{throw Error('verify-failed');});
  assert.equal(failed.failed,true);assert.equal(failed.state,initial);assert.equal(initial.active,'old');
  const success=D.transaction(initial,state=>{state.active='new';state.queue.push('old');state.phase='active';return {state:state,failed:false};});
  assert.equal(success.state.active,'new');assert.deepEqual(success.state.queue,['old']);assert.equal(initial.active,'old');
});
test('cleanup report is emitted once for one owned entry',()=>{
  const entry={},calls=[];assert.equal(D.cleanupOnce(entry,()=>calls.push('remove')),true);assert.equal(D.cleanupOnce(entry,()=>calls.push('remove')),false);assert.deepEqual(calls,['remove']);
});
test('generated H receiver body parses with full RenderSpec payload',()=>{
  const spec={schema:'formal-area-text-render-spec:v1',rendererMode:'area-text-native',rendererVersion:'area-text-native-v1',geometryVersion:'area-text-rectangle-v1',requestId:'r',sourceFrameId:'f',annotationId:'a',logicalSegmentId:'s',generationId:'g',physicalId:'p',reading:'かな',singleCharacter:false,appearance:{fontName:'TestFont',fontSize:8,manualDeltaX:0,widthScale:1,gapEm:.15},geometry:{autoLeft:10,autoTop:20,autoWidth:40,boxHeight:12},composerPolicy:{justification:'full',singleWordJustification:'full',oneCharacterPolicy:'center',glyphScaling:{minimum:100,desired:100,maximum:100},letterSpacing:{minimum:null,desired:null,maximum:null},wordSpacing:{minimum:null,desired:null,maximum:null},trackingCandidates:[0,-25,-50,-75,-100]},finalLeft:10,finalTop:20,finalWidth:40,finalHeight:12};
  const body=D.buildReceiverBody(JSON.stringify(spec),JSON.stringify('C:/repo'));
  assert.doesNotThrow(()=>new vm.Script(body,{filename:'generated-h-receiver.jsx'}));assert.match(body,/FormalAreaTextRenderSpec\.validate/);assert.match(body,/FormalAreaTextNativeBackend/);assert.match(body,/DONOTSAVECHANGES/);assert.match(body,/result='PASS:/);assert.match(body,/rendererMode=/);assert.match(body,/fontName=/);assert.match(body,/\$\.evalFile/);
});
