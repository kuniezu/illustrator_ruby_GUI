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
test('activated restart prioritizes durable discarded cleanup after reload',()=>{
  const s=state('activated',[],['old']);s.cleanupQueue=['discarded'];
  const r=R.restart(s,'source',resolver({'source:discarded':{status:'found'}}));
  assert.deepEqual(r,{action:'cleanup-discarded',requestId:'r1',found:['discarded'],missing:[]});
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
test('finish is blocked while durable cleanup queue still resolves',()=>{
  const active=state('activated',[],[]);active.cleanupQueue=['p1'];
  assert.equal(R.canFinish(active,'source',resolver({'source:p1':{status:'found'}})),false);
  assert.equal(R.canFinish(active,'source',resolver({})),false);
});
test('verified restart is executable without markVerified and reuses found candidates',()=>{
  const calls=[];const result=R.resume(state('verified',['p1','p2']),'source',resolver({'source:p1':{status:'found'}}),(found,missing)=>{calls.push({found,missing});return found.concat(missing);});
  assert.equal(result.action,'ready-for-activation');assert.deepEqual(result.reused,['p1']);assert.deepEqual(result.created,['p2']);assert.deepEqual(calls,[{found:['p1'],missing:['p2']}]);
});
test('activation wrapper validates before transition and rejects cross-source candidates',()=>{
  let called=false;const records={p1:{physicalId:'p1',sourceFrameId:'other'}};
  assert.throws(()=>R.activate('source',state('verified',['p1']),'r1',{s1:'p1'},records,[],[],resolver({'source:p1':{status:'found'}}),()=>{called=true;}),/source-mismatch/);assert.equal(called,false);
  const good={p1:{physicalId:'p1',sourceFrameId:'source'}};const out=R.activate('source',state('verified',['p1']),'r1',{s1:'p1'},good,[],[],resolver({'source:p1':{status:'found'}}),()=>{called=true;return 'activated';});assert.equal(out,'activated');assert.equal(called,true);
});
test('activation wrapper validates discarded candidates before transition',()=>{
  let called=false;const base=state('verified',['p1','p2']);
  assert.throws(()=>R.activate('source',base,'r1',{s1:'p1'},{p1:{physicalId:'p1',sourceFrameId:'source'}},[],['p2'],resolver({'source:p1':{status:'found'},'source:p2':{status:'missing'}}),()=>{called=true;}),/candidate-missing/);assert.equal(called,false);
  assert.throws(()=>R.activate('source',base,'r1',{s1:'p1'},{p1:{physicalId:'p1',sourceFrameId:'source'}},[],['p2'],resolver({'source:p1':{status:'found'},'source:p2':{status:'duplicate'}}),()=>{called=true;}),/duplicate-candidate/);assert.equal(called,false);
  const out=R.activate('source',base,'r1',{s1:'p1'},{p1:{physicalId:'p1',sourceFrameId:'source'}},[],['p2'],resolver({'source:p1':{status:'found'},'source:p2':{status:'found'}}),()=>{called=true;return 'activated';});assert.equal(out,'activated');assert.equal(called,true);
});
test('execute connects persisted prepare through materialize, verify, mark once, and activate',()=>{
  const map={'source:p1':{status:'found'},'source:p2':{status:'missing'}};let marks=0,verified=0,activated=0;
  const out=R.execute(state('prepare',['p1','p2']),'source','r1',resolver(map),(found,missing)=>{map['source:p2']={status:'found'};return {entries:found.concat(missing),bindings:{s1:'p1'},records:{p1:{physicalId:'p1',sourceFrameId:'source'},},discardedIds:['p2']};},(entries,reverify)=>{verified++;assert.equal(reverify,false);assert.equal(entries.length,2);return true;},(s)=>{marks++;return Object.assign({},s,{operation:Object.assign({},s.operation,{phase:'verified'})});},(s,request,bindings,records,retire,discarded)=>{activated++;assert.deepEqual(discarded,['p2']);return 'activated';});
  assert.equal(out,'activated');assert.equal(marks,1);assert.equal(verified,1);assert.equal(activated,1);
});
test('execute re-verifies persisted verified state without markVerified and stops on verification failure',()=>{
  const map={'source:p1':{status:'found'},'source:p2':{status:'missing'}};let marks=0,activated=0;
  const out=R.execute(state('verified',['p1','p2']),'source','r1',resolver(map),(found,missing)=>{map['source:p2']={status:'found'};return {entries:found.concat(missing),bindings:{s1:'p1',s2:'p2'},records:{p1:{physicalId:'p1',sourceFrameId:'source'},p2:{physicalId:'p2',sourceFrameId:'source'}}};},()=>true,()=>{marks++;throw Error('markVerified must not run');},(s)=>{activated++;return 'activated';});
  assert.equal(out,'activated');assert.equal(marks,0);assert.equal(activated,1);
  const before=JSON.stringify(state('verified',['p1']));assert.throws(()=>R.execute(state('verified',['p1']),'source','r1',resolver({'source:p1':{status:'found'}}),(found)=>({entries:found,bindings:{s1:'p1'},records:{p1:{physicalId:'p1',sourceFrameId:'source'}}}),()=>false,()=>{throw Error('must not mark');},()=>{throw Error('must not activate');}),/verification-failed/);assert.equal(JSON.stringify(state('verified',['p1'])),before);
});
