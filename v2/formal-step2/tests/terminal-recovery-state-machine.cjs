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
  let state=activatedState(), inventory={old:'found',discarded:'found'};
  const resolve=(source,id)=>({status:id==='p-old'?inventory.old:id==='p-discard'?inventory.discarded:'missing'});
  let action=R.restart(state,'source',resolve);
  assert.equal(action.action,'cleanup-discarded');
  inventory.discarded='missing';
  state=N.markDiscardedCleaned(state,action.found.concat(action.missing));
  action=R.restart(state,'source',resolve);
  assert.equal(action.action,'cleanup-retirement');
  inventory.old='missing';
  state=N.markRetired(state,action.found.concat(action.missing));
  action=R.restart(state,'source',resolve);
  assert.equal(action.action,'finish-operation');
  state=N.finishOperation(state,action.requestId);
  assert.equal(N.recoveryState(state),'finished/recoverable');
  state=N.beginOperation(state,'third',['p-next']);
  assert.equal(state.operation.requestId,'third');
});

test('executable recovery keeps duplicate ownership fail-closed',()=>{
  const state=activatedState();
  assert.throws(()=>R.restart(state,'source',(source,id)=>({status:id==='p-discard'?'duplicate':'missing'})),/duplicate-candidate/);
});
