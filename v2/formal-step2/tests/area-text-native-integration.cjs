const test=require('node:test'),assert=require('node:assert/strict');
const Integration=require('../area-text-native-integration.js');

function tx(source,requestId){
  return {source:source,requestId:requestId,expectedContents:source.contents,expectedNote:source.note};
}
function spec(id,logical,request){
  return {
    physicalId:id,logicalSegmentId:logical,generationId:'g-'+id,requestId:request,
    sourceFrameId:'source-1',rendererVersion:'test',geometryVersion:'test',
    autoLeft:0,autoWidth:100,appliedLeft:0,appliedWidth:100,appliedTop:0,
    appliedHeight:50,tracking:0,fontName:'Test',fontSize:70,
    justification:'CENTER',singleWordJustification:'CENTER',fitReason:'fit-one-line-covered'
  };
}
function hostFor(entries,bindings){
  return {
    prepareAll(specs){return {status:'prepared',specs:specs};},
    verifyAll(batch){batch.status='verified';batch.records=entries;return batch;},
    bindingsByLogicalSegmentId(){return bindings;},
    recordsByPhysicalId(batch){var out={},i;for(i=0;i<batch.records.length;i++)out[batch.records[i].physicalId]=batch.records[i];return out;}
  };
}

test('integration seam enforces durable begin, prepare, host verify, durable verify, then activation',()=>{
  const calls=[];
  const orchestration={planAll(){calls.push('plan');return {status:'complete'};}};
  const source={contents:'text',note:''};
  const tx1=tx(source,'r1');
  const host={
    prepareAll(specs){calls.push('prepare');return {status:'prepared',specs:specs};},
    verifyAll(batch){calls.push('host-verify');batch.status='verified';batch.records=[];return batch;},
    bindingsByLogicalSegmentId(){calls.push('bindings');return {s1:'p1'};},
    recordsByPhysicalId(){calls.push('records');return {};}
  };
  const coordinator={
    begin(source){calls.push('begin');source.note='after-begin';return {status:'success',sourceContents:source.contents,note:source.note};},
    verify(source){calls.push('durable-verify');source.note='after-verify';return {status:'success',sourceContents:source.contents,note:source.note};},
    activate(){calls.push('activate');return {status:'success'};}
  };
  const seam=Integration.create(orchestration,host,coordinator);
  const prepared=seam.planAndPrepare({},'text',{},[{physicalId:'p1'}],tx1);
  assert.deepEqual(calls,['plan','begin','prepare']);
  assert.throws(()=>seam.activate(source,'text','', 'r1',prepared),/before-verify/);
  const verified=seam.verify(prepared);
  seam.activate(source,'text','after-verify', 'r1',verified,['old'],['discarded']);
  assert.deepEqual(calls,['plan','begin','prepare','host-verify','durable-verify','bindings','records','activate']);
});

test('connected actual coordinator persists begin, verify, activation and cleanup-pending',()=>{
  global.FormalAreaTextNative=require('../area-text-native.js');
  global.FormalAreaTextNativeStore=require('../area-text-native-store.js');
  global.FormalAreaTextNativeNoteAdapter=require('../area-text-native-note-adapter.js');
  global.FormalAreaTextNativePersistenceFacade=require('../area-text-native-persistence-facade.js');
  const Coordinator=require('../area-text-native-transaction-coordinator.js');
  const orchestration={planAll(){return {status:'complete'};}};
  const source={contents:'source',note:''};
  const old=spec('p-old','segment','old-request');
  const seamOld=Integration.create(orchestration,hostFor([old],{segment:'p-old'}),Coordinator);
  const preparedOld=seamOld.planAndPrepare({},source.contents,{},[old],tx(source,'old-request'));
  const verifiedOld=seamOld.verify(preparedOld);
  seamOld.activate(source,source.contents,source.note,'old-request',verifiedOld,[],[]);
  let state=FormalAreaTextNativeStore.read(source.note);
  assert.equal(state.activeBindings.segment,'p-old');
  Coordinator.finish(source,source.contents,source.note,'old-request');
  const newer=spec('p-new','segment','new-request');
  const discarded=spec('p-discarded','other','new-request');
  const seamNew=Integration.create(orchestration,hostFor([newer],{segment:'p-new'}),Coordinator);
  const preparedNew=seamNew.planAndPrepare({},source.contents,{},[newer,discarded],tx(source,'new-request'));
  const verifiedNew=seamNew.verify(preparedNew);
  seamNew.activate(source,source.contents,source.note,'new-request',verifiedNew,['p-old'],['p-discarded']);
  state=FormalAreaTextNativeStore.read(source.note);
  assert.equal(state.activeBindings.segment,'p-new');
  assert.deepEqual(state.retirementQueue,['p-old']);
  assert.deepEqual(state.cleanupQueue,['p-discarded']);
  assert.throws(()=>Coordinator.finish(source,source.contents,source.note,'new-request'),/operation-cleanup-pending/);
});

test('incomplete plan stops before durable begin or candidate preparation',()=>{
  let begun=0,prepared=0;
  const seam=Integration.create({planAll(){return {status:'unresolved'};}},{prepareAll(){prepared++;},verifyAll(){}},{begin(){begun++;},verify(){},activate(){}});
  const result=seam.planAndPrepare({},'text',{},[],{source:{contents:'text',note:''},requestId:'r',expectedContents:'text',expectedNote:''});
  assert.equal(result.status,'unresolved');assert.equal(begun,0);assert.equal(prepared,0);
});

test('integration source remains outside production entrypoints',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const root=path.resolve(__dirname,'..','..','..');
  const source=fs.readFileSync(path.join(root,'v2','formal-step2','area-text-native-integration.js'),'utf8');
  assert.ok(source.indexOf('FormalAreaTextNativeTransactionCoordinator')<0);
  assert.ok(source.indexOf('Formal Multi Step2.jsx')<0);assert.ok(source.indexOf('persistence-adapter.jsx')<0);
});

test('reconcileExisting reuses finished active manifest without creating candidates',()=>{
  const calls=[];
  const orchestration={planAll(){calls.push('plan');return {status:'complete',results:[]};}};
  const seam=Integration.create(orchestration,{prepareAll(){throw Error('must-not-prepare');},verifyAll(){},bindingsByLogicalSegmentId(){return {};},recordsByPhysicalId(){return {}; }},{begin(){throw Error('must-not-begin');},verify(){},activate(){}});
  const result=seam.reconcileExisting({annotations:[]},'source',{status:'complete',lines:[]},{operation:null,activeBindings:{a:'p1',b:'p2'}});
  assert.equal(result.status,'reused'); assert.deepEqual(result.physicalIds,['p1','p2']); assert.deepEqual(calls,['plan']);
});

test('activation seam carries explicit logical removal for a 2-to-1 collapse while preserving a peer',()=>{
  global.FormalAreaTextNative=require('../area-text-native.js');
  global.FormalAreaTextNativeStore=require('../area-text-native-store.js');
  global.FormalAreaTextNativeNoteAdapter=require('../area-text-native-note-adapter.js');
  global.FormalAreaTextNativePersistenceFacade=require('../area-text-native-persistence-facade.js');
  const Coordinator=require('../area-text-native-transaction-coordinator.js');
  const orchestration={planAll(){return {status:'complete'};}};
  const source={contents:'source',note:''};
  const first=[spec('p-old-0','segment-0','r1'),spec('p-old-1','segment-1','r1'),spec('p-peer','peer','r1')];
  const firstSeam=Integration.create(orchestration,hostFor(first,{'segment-0':'p-old-0','segment-1':'p-old-1',peer:'p-peer'}),Coordinator);
  let prepared=firstSeam.planAndPrepare({},source.contents,{},first,tx(source,'r1'));
  let verified=firstSeam.verify(prepared);
  firstSeam.activate(source,source.contents,source.note,'r1',verified,[],[]);
  Coordinator.finish(source,source.contents,source.note,'r1');
  const next=spec('p-new-0','segment-0','r2');
  const nextSeam=Integration.create(orchestration,hostFor([next],{'segment-0':'p-new-0'}),Coordinator);
  prepared=nextSeam.planAndPrepare({},source.contents,{},[next],tx(source,'r2'));
  verified=nextSeam.verify(prepared);
  assert.throws(()=>nextSeam.activate(source,source.contents,source.note,'r2',verified,['p-old-0','p-old-1'],[]),/retirement-not-eligible/);
  nextSeam.activate(source,source.contents,source.note,'r2',verified,['p-old-0','p-old-1'],[],['segment-1']);
  const state=FormalAreaTextNativeStore.read(source.note);
  assert.equal(state.activeBindings['segment-0'],'p-new-0');
  assert.equal(state.activeBindings['segment-1'],undefined);
  assert.equal(state.activeBindings.peer,'p-peer');
  assert.deepEqual(state.retirementQueue,['p-old-0','p-old-1']);
});
