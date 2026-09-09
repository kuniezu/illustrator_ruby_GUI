const test=require('node:test'),assert=require('node:assert/strict');
const Integration=require('../area-text-native-integration.js');

test('integration seam enforces plan, prepare, verify, then activation',()=>{
  const calls=[];
  const orchestration={planAll(){calls.push('plan');return {status:'complete'};}};
  const host={prepareAll(specs){calls.push('prepare');return {status:'prepared',specs};},verifyAll(batch){calls.push('verify');batch.status='verified';return batch;},bindingsByLogicalSegmentId(){calls.push('bindings');return {s1:'p1'};},recordsByPhysicalId(){calls.push('records');return {p1:{physicalId:'p1',logicalSegmentId:'s1',requestId:'r1'}};}};
  const coordinator={activate(source,contents,note,request,bindings,records,retire,discarded){calls.push('activate');return {bindings,records,retire,discarded};}};
  const seam=Integration.create(orchestration,host,coordinator);
  const prepared=seam.planAndPrepare({},'text',{},['spec']);
  assert.deepEqual(calls,['plan','prepare']);
  assert.throws(()=>seam.activate({},'text','note','r1',prepared),/before-verify/);
  const verified=seam.verify(prepared);
  const result=seam.activate({},'text','note','r1',verified,['old'],['discarded']);
  assert.deepEqual(calls,['plan','prepare','verify','bindings','records','activate']);
  assert.deepEqual(result.retire,['old']);assert.deepEqual(result.discarded,['discarded']);
});

test('incomplete plan stops before candidate preparation',()=>{
  let prepared=0;const seam=Integration.create({planAll(){return {status:'unresolved'};}},{prepareAll(){prepared++;},verifyAll(){}},{activate(){}});
  const result=seam.planAndPrepare({},'text',{},[]);assert.equal(result.status,'unresolved');assert.equal(prepared,0);
});

test('integration source remains outside production entrypoints',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const root=path.resolve(__dirname,'..','..','..');
  const source=fs.readFileSync(path.join(root,'v2','formal-step2','area-text-native-integration.js'),'utf8');
  assert.ok(source.includes('FormalAreaTextNativeTransactionCoordinator')===false);
  assert.ok(!source.includes('Formal Multi Step2.jsx'));assert.ok(!source.includes('persistence-adapter.jsx'));assert.ok(!source.includes('source.note'));
});
