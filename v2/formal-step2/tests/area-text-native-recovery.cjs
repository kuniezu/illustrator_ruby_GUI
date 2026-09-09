const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../area-text-native-recovery.js');

function resolver(map){return (source,id)=>{const value=map[source+':'+id];return value||{status:'missing'};};}
function state(phase,ids,queue){return {operation:phase?{requestId:'r1',phase,candidateIds:ids||[]}:null,retirementQueue:queue||[]};}

test('prepare restart separates existing and missing candidates',()=>{
  const r=R.restart(state('prepare',['p1','p2']),'source',resolver({'source:p1':{status:'found'}}));
  assert.deepEqual(r,{action:'prepare-candidates',requestId:'r1',found:['p1'],missing:['p2']});
});
test('verified restart converges through reverify and rejects duplicate candidate',()=>{
  const r=R.restart(state('verified',['p1']),'source',resolver({'source:p1':{status:'found'}}));
  assert.equal(r.action,'reverify-candidates');
  assert.throws(()=>R.restart(state('verified',['p1']),'source',resolver({'source:p1':{status:'duplicate'}})),/duplicate-candidate/);
});
test('activated restart cleans found retirement and treats missing as already removed',()=>{
  const r=R.restart(state('activated',[],['old','gone']),'source',resolver({'source:old':{status:'found'}}));
  assert.deepEqual(r,{action:'cleanup-retirement',requestId:'r1',found:['old'],missing:['gone']});
});
test('activation requires source identity and unique resolver result',()=>{
  const records={p1:{physicalId:'p1',sourceFrameId:'source'}};
  assert.deepEqual(R.validateActivation('source',records,resolver({'source:p1':{status:'found'}})).physicalIds,['p1']);
  assert.throws(()=>R.validateActivation('other',records,resolver({'other:p1':{status:'found'}})),/source-mismatch/);
  assert.throws(()=>R.validateActivation('source',records,resolver({'source:p1':{status:'duplicate'}})),/duplicate-candidate/);
  assert.throws(()=>R.validateActivation('source',records,resolver({})),/candidate-missing/);
});
test('discard cleanup retains deletion failure and converges after retry',()=>{
  const map={'source:gone':{status:'missing'},'source:p1':{status:'found'}};let attempts=0;
  const first=R.discardedCleanup(['gone','p1'],'source',resolver(map),()=>{attempts++;return false;});
  assert.deepEqual(first,{removed:['gone'],pending:['p1'],complete:false});
  map['source:p1']={status:'missing'};
  const second=R.discardedCleanup(['p1'],'source',resolver(map),()=>{attempts++;return true;});
  assert.deepEqual(second,{removed:['p1'],pending:[],complete:true});assert.equal(attempts,1);
});
test('successful deletion followed by crash is resolved by missing on retry',()=>{
  let map={'source:p1':{status:'found'}};
  const deletion=R.discardedCleanup(['p1'],'source',resolver(map),()=>{map['source:p1']={status:'missing'};return true;});
  assert.deepEqual(deletion,{removed:['p1'],pending:[],complete:true});
  assert.deepEqual(R.discardedCleanup(['p1'],'source',resolver(map),()=>{throw Error('must not delete missing');}),{removed:['p1'],pending:[],complete:true});
});
test('finish is blocked while cleanup resolver still finds a discarded candidate',()=>{
  const active=state('activated',[],[]);
  assert.equal(R.canFinish(active,['p1'],'source',resolver({'source:p1':{status:'found'}})),false);
  assert.equal(R.canFinish(active,['p1'],'source',resolver({})),true);
});
