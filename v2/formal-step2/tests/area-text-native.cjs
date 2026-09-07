const test=require('node:test'),assert=require('node:assert/strict');
const N=require('../area-text-native.js');

test('manifest uses source-side active bindings as authority',()=>{
  let s=N.createManifest();
  s=N.beginOperation(s,'req-1',['p-new']);
  assert.equal(N.physicalStatus(s,'p-new'),'pending');
  s=N.markVerified(s,'req-1');
  s=N.activate(s,'req-1',{seg1:'p-new'},{'p-new':{generationId:'g2'}},['p-old']);
  assert.equal(N.activePhysicalId(s,'seg1'),'p-new');
  assert.equal(N.physicalStatus(s,'p-new'),'active');
  assert.equal(N.physicalStatus(s,'p-old'),'cleanup-pending');
});

test('activation does not require retiring old identity first',()=>{
  let s=N.createManifest();s.activeBindings.seg1='p-old';s.renderRecords['p-old']={generationId:'g1'};
  s=N.beginOperation(s,'req-2',['p-new']);s=N.markVerified(s,'req-2');
  s=N.activate(s,'req-2',{seg1:'p-new'},{'p-new':{generationId:'g2'}},['p-old']);
  assert.equal(N.activePhysicalId(s,'seg1'),'p-new');
  assert.equal(N.physicalStatus(s,'p-old'),'cleanup-pending');
  s=N.markRetired(s,['p-old']);
  assert.equal(N.physicalStatus(s,'p-old'),'unreferenced');
  assert.equal(s.renderRecords['p-old'],undefined);
});

test('different request cannot overwrite an active prepare operation',()=>{
  let s=N.beginOperation(N.createManifest(),'req-a',['p-a']);
  assert.throws(()=>N.beginOperation(s,'req-b',['p-b']),/operation-already-active/);
});

test('one-line fit requires stable full range and line coverage',()=>{
  const obs={horizontal:true,rectangular:true,nonThreaded:true,stable:true,frameContents:'かな',rangeContents:'かな',rangeStart:10,rangeEnd:12,lines:[{start:10,end:12,contents:'かな'}]};
  assert.equal(N.verifyOneLineFit(obs,'かな').ok,true);
  assert.equal(N.verifyOneLineFit({...obs,stable:false},'かな').reason,'fit-observation-unstable');
  assert.equal(N.verifyOneLineFit({...obs,lines:[{start:10,end:11,contents:'か'}]},'かな').reason,'fit-line-coverage-mismatch');
  assert.equal(N.verifyOneLineFit({...obs,lines:[{start:10,end:11,contents:'か'},{start:11,end:12,contents:'な'}]},'かな').reason,'fit-line-count');
});

test('tracking fallback is finite and starts from zero',()=>{
  assert.deepEqual(N.trackingCandidates(),[0,-25,-50,-75,-100]);
});

test('manual adjustment capture ignores renderer roundoff and preserves prior state',()=>{
  const base={generationId:'g1',rendererVersion:'r1',geometryVersion:'v1',autoLeft:10,autoWidth:40,appliedLeft:14,appliedWidth:44};
  let r=N.captureManualAdjustment({generationId:'g1',rendererVersion:'r1',geometryVersion:'v1',left:14.001,width:44.001},base,{manualDeltaX:4,widthScale:1.1},.01);
  assert.equal(r.captured,false);assert.equal(r.reason,'unchanged');assert.equal(r.manualDeltaX,4);assert.equal(r.widthScale,1.1);
  r=N.captureManualAdjustment({generationId:'g1',rendererVersion:'r1',geometryVersion:'v1',left:16,width:48},base,{manualDeltaX:4,widthScale:1.1},.01);
  assert.equal(r.captured,true);assert.equal(r.manualDeltaX,6);assert.equal(r.widthScale,1.2);
});

test('manual adjustment capture refuses mismatched generation/version',()=>{
  const base={generationId:'g1',rendererVersion:'r1',geometryVersion:'v1',autoLeft:10,autoWidth:40,appliedLeft:10,appliedWidth:40};
  const r=N.captureManualAdjustment({generationId:'g2',rendererVersion:'r1',geometryVersion:'v1',left:20,width:50},base,{manualDeltaX:2,widthScale:1.1},.01);
  assert.equal(r.captured,false);assert.equal(r.reason,'baseline-unverified');assert.equal(r.manualDeltaX,2);assert.equal(r.widthScale,1.1);
});
