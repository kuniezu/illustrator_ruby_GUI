const test=require('node:test'),assert=require('node:assert/strict');
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
