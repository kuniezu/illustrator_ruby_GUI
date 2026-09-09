const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..','..','..');
const grammar=require('../es3-grammar-gate.cjs');
const F=require('../../formal-step1/core.js');global.FormalStep1=F;global.FormalStore=require('../../formal-step1/store.js');
const M=require('../multi.js');global.FormalMulti=M;const Long=require('../occurrences.js');global.FormalLongText=Long;const P=require('../projection.js');global.FormalMultiProjection=P;const S=require('../segments.js');global.FormalSegments=S;const O=require('../orchestration.js');global.FormalMultiOrchestration=O;const R=require('../multi-renderer.js');
const Native=require('../area-text-native.js');

const file=path.join(root,'v2','diagnostics','Formal Step2 AreaText Native Multi Annotation Check.jsx');
const source=fs.readFileSync(file,'utf8');

function projected(){
  const logical=Long.extract('甲 乙');
  logical.occurrences[0].reading='こう'; logical.occurrences[0].readingConfirmed=true;
  logical.occurrences[1].reading='おつ'; logical.occurrences[1].readingConfirmed=true;
  const frame=M.createFrame(logical.textSnapshot); frame.sourceFrameId='multi-test-source'; frame.occurrences=logical.occurrences;
  return P.project(frame);
}

test('multi-annotation runtime diagnostic is isolated and ES3 compatible',()=>{
  assert.doesNotThrow(()=>grammar.parseES3(source,file));
  for(const token of ['FormalMultiRenderer','FormalAreaTextNativeIntegration.create','FormalAreaTextNativeHost','multi-a-g1','multi-b-g1','suppress-a-edit-b','manifest-authority','source-unmanaged-preserved','DONOTSAVECHANGES']) assert.ok(source.includes(token),token);
  assert.doesNotMatch(source,/\.kind\s*=/); assert.doesNotMatch(source,/\.overflows\b/); assert.doesNotMatch(source,/Formal Multi Step2\.jsx/);
});

test('existing multi renderer preserves deterministic annotation order',()=>{
  const b=projected(), calls=[];
  const result=R.render(b,b.textSnapshot,{status:'complete',lines:[{start:0,end:1,geometry:{left:0,width:20,charWidths:[20]}},{start:2,end:3,geometry:{left:30,width:20,charWidths:[20]}}]}, {reconcile(x){calls.push(x.annotation.annotationId);}});
  assert.equal(result.status,'complete'); assert.deepEqual(calls,b.annotations.map(x=>x.annotationId));
});

test('suppressing one projected annotation leaves the peer renderable',()=>{
  const b=projected(); b.occurrences[0].enabled=false; const next=P.project(M.replaceOccurrences(b,b.occurrences)), result=R.plan(next,next.textSnapshot,{status:'complete',lines:[{start:0,end:1,geometry:{}},{start:2,end:3,geometry:{}}]});
  assert.equal(result.status,'complete'); assert.equal(result.plans.length,2); assert.equal(result.plans[0].suppressed,true); assert.equal(result.plans[1].annotationId,b.annotations[1].annotationId);
});

test('repeated projection and specification are idempotent without duplicate managed ids',()=>{
  const first=P.project(projected()), second=P.project(first), a=R.specifications(first), b=R.specifications(second);
  assert.deepEqual(b.map(x=>x.annotationId),a.map(x=>x.annotationId)); assert.equal(new Set(b.map(x=>x.annotationId)).size,b.length);
});

test('native manifest update can replace only annotation B while removing A binding',()=>{
  let state=Native.createManifest();
  state=Native.beginOperation(state,'r1',['a1','b1']);
  state=Native.markVerified(state,'r1');
  state=Native.activate(state,'r1',{a:'a1',b:'b1'},{a1:{physicalId:'a1',requestId:'r1',logicalSegmentId:'a'},b1:{physicalId:'b1',requestId:'r1',logicalSegmentId:'b'}},[],[]);
  state=Native.finishOperation(state,'r1');
  state=Native.beginOperation(state,'r2',['b2']); state=Native.markVerified(state,'r2');
  state=Native.activate(state,'r2',{a:null,b:'b2'},{b2:{physicalId:'b2',requestId:'r2',logicalSegmentId:'b'}},['a1','b1'],[]);
  assert.equal(state.activeBindings.a,undefined); assert.equal(state.activeBindings.b,'b2'); assert.deepEqual(state.retirementQueue,['a1','b1']); assert.equal(Native.physicalStatus(state,'b2'),'active');
});
