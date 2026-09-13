const test=require('node:test'),assert=require('node:assert/strict');
const N=require('../area-text-native.js'),R=require('../area-text-native-recovery.js');

function activatedState(){
  let state=N.createManifest();
  state=N.beginOperation(state,'first',['p-old']);
  state=N.markVerified(state,'first');
  state=N.activate(state,'first',{segment:'p-old'},{'p-old':{physicalId:'p-old',requestId:'first',logicalSegmentId:'segment'}},[],[]);
  state=N.finishOperation(state,'first');
  state=N.beginOperation(state,'second',['p-new','p-discard']);
  state=N.markVerified(state,'second');
  return N.activate(state,'second',{segment:'p-new'},{'p-new':{physicalId:'p-new',requestId:'second',logicalSegmentId:'segment'}},['p-old'],['p-discard']);
}

test('executable terminal recovery clears discarded and retirement queues before the next request',()=>{
  let state=activatedState(), inventory={old:'found',discarded:'found'}, calls=[];
  const resolve=(source,id)=>({status:id==='p-old'?inventory.old:id==='p-discard'?inventory.discarded:'missing'});
  const result=R.converge(state,'source',resolve,(action,current)=>{let ids=(action.found||[]).concat(action.missing||[]);calls.push(action.action);if(action.action==='cleanup-discarded'){inventory.discarded='missing';return N.markDiscardedCleaned(current,ids);}if(action.action==='cleanup-retirement'){inventory.old='missing';return N.markRetired(current,ids);}if(action.action==='finish-operation')return N.finishOperation(current,action.requestId);throw Error('unexpected-action:'+action.action);},8);
  state=result.state;
  assert.deepEqual(calls,['cleanup-discarded','cleanup-retirement','finish-operation']);
  assert.equal(result.steps,3);
  assert.equal(N.recoveryState(state),'finished/recoverable');
  state=N.beginOperation(state,'third',['p-next']);
  assert.equal(state.operation.requestId,'third');
});

test('production-equivalent converge aborts prepare state and clears its discarded queue before next begin',()=>{
  let state=N.beginOperation(N.createManifest(),'prepare-request',['p-candidate']);
  const result=R.converge(state,'source',(source,id)=>({status:'missing'}),(action,current)=>{const ids=(action.found||[]).concat(action.missing||[]);assert.equal(action.action,'prepare-candidates');current=N.abortOperation(current,action.requestId,ids);return N.markDiscardedCleaned(current,ids);},8);
  assert.equal(result.state.operation,null);assert.deepEqual(result.state.cleanupQueue,[]);assert.equal(N.beginOperation(result.state,'next-request',['p-next']).operation.requestId,'next-request');
});

test('executable recovery keeps duplicate ownership fail-closed',()=>{
  const state=activatedState();
  assert.throws(()=>R.restart(state,'source',(source,id)=>({status:id==='p-discard'?'duplicate':'missing'})),/duplicate-candidate/);
});
