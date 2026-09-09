const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..','..','..'),grammar=require('../es3-grammar-gate.cjs'),S=require('../segments.js');
const file=path.join(root,'v2','diagnostics','Formal Step2 AreaText Native SplitHint Check.jsx'),source=fs.readFileSync(file,'utf8');
const base='一張羅',reading='いっちょうら',lines=[{start:0,end:2,geometry:{}},{start:2,end:3,geometry:{}}],hint={baseBoundaryAfter:2,readingBoundaryAfter:5,baseText:base,reading:reading,baseRevision:0,readingRevision:0};

test('SplitHint diagnostic is isolated, consolidated, and ES3 compatible',()=>{
  assert.doesNotThrow(()=>grammar.parseES3(source,file));
  for(const token of ['FormalMultiStore','multi-renderer.js','FormalAreaTextNativeIntegration.create','split-hint-persisted','simulated-reflow','stale-hint-peer-safety','native-three-segment-activation','native-reconcile-idempotence','DONOTSAVECHANGES']) assert.ok(source.includes(token),token);
  assert.doesNotMatch(source,/\.kind\s*=/); assert.doesNotMatch(source,/\.overflows\b/); assert.doesNotMatch(source,/Formal Multi Step2\.jsx/);
});

test('valid SplitHint yields two ordered physical segments',()=>{
  const result=S.plan(base,reading,lines,[hint],0,0);
  assert.equal(result.status,'complete'); assert.deepEqual(result.segments.map(x=>x.reading),['いっちょう','ら']); assert.deepEqual(result.segments.map(x=>x.baseText),['一張','羅']);
});

test('simulated 2-to-1-to-2 reflow reuses only a valid hint',()=>{
  const one=S.plan(base,reading,[{start:0,end:3,geometry:{}}],[hint],0,0), back=S.plan(base,reading,lines,[hint],0,0), stale=S.plan(base,reading,lines,[Object.assign({},hint,{reading:'old'})],0,0);
  assert.equal(one.status,'complete'); assert.equal(one.segments.length,1); assert.equal(one.ignoredHints,true); assert.equal(back.segments.length,2); assert.equal(stale.status,'unresolved');
});
