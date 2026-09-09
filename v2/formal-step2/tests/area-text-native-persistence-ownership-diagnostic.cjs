const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..','..','..');
function source(){const file=path.join(root,'v2','diagnostics','Formal Step2 AreaText Native Persistence Ownership Check.jsx');const s=fs.readFileSync(file,'utf8');assert.doesNotThrow(()=>new vm.Script(s.replace(/^\s*#target.*$/gm,'').replace(/^\s*#include.*$/gm,''),{filename:file}));return s;}
test('persistence ownership diagnostic is ES3-safe and save/reopen scoped',()=>{const s=source();for(const x of ['doc.saveAs(tempFile)','app.open(tempFile)','FormalMultiStore.write','FormalMulti.update','readingConfirmed','baseBoundaryAfter !== 2','activeBindings','FormalAreaTextNativeOutputIdentity.resolve','reconcileExisting','persistedObservation','managedIds=3->3','stageBatch','verifyStaged','activateVerified','finishActivated','copy-on-write-staging','copy-on-write-after-reopen','unmanaged','tempFile.remove','SaveOptions.DONOTSAVECHANGES'])assert.ok(s.includes(x),x);assert.equal(s.includes('.kind ='),false);assert.equal(s.includes('.overflows'),false);assert.equal(s.includes('source.note ='),true);});
test('persistence diagnostic never touches an existing user document',()=>{const s=source();assert.ok(s.includes('if (app.documents.length) fail("existing-document-open; refusing-to-touch-user-document")'));assert.ok(s.includes('app.documents.add()'));});
test('bookkeeping files keep the temporary header-only contract',()=>{assert.equal(fs.readFileSync(path.join(root,'v2/formal-step2/04_Work整理結果/01_次これやって.md'),'utf8'),'# 次これやって\n');assert.equal(fs.readFileSync(path.join(root,'v2/formal-step2/04_Work整理結果/02_今これやったよ.md'),'utf8'),'# 今これやったよ\n');});
test('persistence diagnostic retires only owned generations after activation',()=>{const s=source();assert.ok(s.includes('stageBatch("persist-r2"'));assert.ok(s.includes('activateVerified(staged, [oldId, "persist-a2"])'));assert.ok(s.includes('finishActivated(staged)'));assert.ok(s.includes('removeOwned(oldId, doc)'));assert.ok(s.includes('copy-on-write-after-reopen'));});
test('pure manifest lifecycle exercises pending, verified, active, retirement boundaries',()=>{
  const Native=require('../area-text-native.js');
  let m=Native.createManifest();
  m.activeBindings={'persist-a-0':'old','persist-b-0':'peer'};
  m.renderRecords={old:{physicalId:'old',logicalSegmentId:'persist-a-0'},peer:{physicalId:'peer',logicalSegmentId:'persist-b-0'}};
  m=Native.beginOperation(m,'r2',['new']);
  assert.equal(m.activeBindings['persist-a-0'],'old'); assert.deepEqual(m.operation.candidateIds,['new']);
  m=Native.markVerified(m,'r2'); assert.equal(m.operation.phase,'verified');
  m=Native.activate(m,'r2',{'persist-a-0':'new','persist-b-0':'peer'},{new:{physicalId:'new',requestId:'r2',logicalSegmentId:'persist-a-0'}},['old'],[]);
  assert.equal(m.activeBindings['persist-a-0'],'new'); assert.deepEqual(m.retirementQueue,['old']);
  m=Native.markRetired(m,['old']); m=Native.finishOperation(m,'r2'); assert.equal(m.operation,null); assert.deepEqual(m.retirementQueue,[]);
});
