const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../area-text-render-spec.js');

function input(){return {
  sourceFrameId:'frame-1',annotationId:'ann-1',logicalSegmentId:'seg-1',reading:'かな',
  appearance:{fontName:'RubyFont',fontSize:8,manualDeltaX:3,widthScale:1.1,gapEm:.15},
  geometry:{autoLeft:40,autoTop:100,autoWidth:50,boxHeight:12},
  meta:{requestId:'req-1',generationId:'g2',physicalId:'p2'}
};}

test('render spec carries appearance and generation end to end',()=>{
  const s=S.create(input());
  assert.equal(S.validate(s).ok,true);
  assert.equal(s.appearance.fontName,'RubyFont');
  assert.equal(s.appearance.fontSize,8);
  assert.equal(s.finalLeft,43);
  assert.ok(Math.abs(s.finalWidth-55)<0.000001);
  assert.equal(s.requestId,'req-1');
  assert.equal(s.generationId,'g2');
  assert.equal(s.physicalId,'p2');
});

test('render spec defaults composer to glyph scale 100 and finite tracking sequence',()=>{
  const s=S.create(input());
  assert.deepEqual(s.composerPolicy.glyphScaling,{minimum:100,desired:100,maximum:100});
  assert.deepEqual(s.composerPolicy.trackingCandidates,[0,-25,-50,-75,-100]);
  assert.equal(s.composerPolicy.letterSpacing.minimum,null);
});

test('backend spec uses final rectangle geometry rather than mutable frame resizing',()=>{
  const s=S.create(input()),b=S.backendSpec(s);
  assert.equal(b.left,43);assert.ok(Math.abs(b.width-55)<0.000001);assert.equal(b.height,12);
  assert.equal(b.appearance.fontName,'RubyFont');assert.equal(b.appearance.fontSize,8);
  assert.deepEqual(b.composerPolicy.trackingCandidates,[0,-25,-50,-75,-100]);
});

test('render spec refuses missing identity and invalid dimensions',()=>{
  let x=input();x.meta.physicalId='';assert.throws(()=>S.create(x),/render-spec-identity-required/);
  x=input();x.geometry.autoWidth=0;assert.throws(()=>S.create(x),/render-spec-auto-width-invalid/);
});

test('render spec rejects unsupported typography policy instead of dropping it',()=>{
  let x=input();x.composerPolicy={justification:'right'};assert.throws(()=>S.create(x),/render-spec-justification-unsupported/);
  x=input();x.composerPolicy={singleWordJustification:'left'};assert.throws(()=>S.create(x),/render-spec-single-word-justification-unsupported/);
  x=input();x.composerPolicy={oneCharacterPolicy:'stretch'};assert.throws(()=>S.create(x),/render-spec-one-character-policy-unsupported/);
});

test('received render specs require complete supported composer policy',()=>{
  const base=S.create(input());
  let x=Object.assign({},base);delete x.composerPolicy;
  assert.equal(S.validate(x).ok,false);
  x=Object.assign({},base,{composerPolicy:Object.assign({},base.composerPolicy,{trackingCandidates:[]})});
  assert.equal(S.validate(x).ok,false);
  x=Object.assign({},base,{composerPolicy:Object.assign({},base.composerPolicy,{justification:'bogus'})});
  assert.equal(S.validate(x).ok,false);
  x=Object.assign({},base,{singleCharacter:true});
  assert.equal(S.validate(x).ok,false);
  x=Object.assign({},base,{composerPolicy:Object.assign({},base.composerPolicy,{trackingCandidates:[-101]})});
  assert.equal(S.validate(x).ok,false);
});

test('received specs reject unsupported composer values and nested geometry mutations',()=>{
  const base=S.create(input());
  let x=Object.assign({},base,{composerPolicy:Object.assign({},base.composerPolicy,{glyphScaling:Object.assign({},base.composerPolicy.glyphScaling,{minimum:90})})});
  assert.equal(S.validate(x).ok,false);
  x=Object.assign({},base,{composerPolicy:Object.assign({},base.composerPolicy,{glyphScaling:Object.assign({},base.composerPolicy.glyphScaling,{desired:110})})});
  assert.equal(S.validate(x).ok,false);
  x=Object.assign({},base,{composerPolicy:Object.assign({},base.composerPolicy,{letterSpacing:Object.assign({},base.composerPolicy.letterSpacing,{desired:1})})});
  assert.equal(S.validate(x).ok,false);
  x=Object.assign({},base);delete x.geometry;assert.equal(S.validate(x).ok,false);
  x=Object.assign({},base,{geometry:Object.assign({},base.geometry,{autoWidth:0})});assert.equal(S.validate(x).ok,false);
  x=Object.assign({},base,{finalLeft:999});assert.equal(S.validate(x).ok,false);
  x=Object.assign({},base,{finalWidth:999});assert.equal(S.validate(x).ok,false);
  assert.equal(S.validate(base).ok,true);
});
test('received specs require string identities and reject line-bearing readings',()=>{
  const base=S.create(input());
  let x=Object.assign({},base,{requestId:7});assert.equal(S.validate(x).ok,false);
  x=Object.assign({},base,{reading:'かな\n'});assert.equal(S.validate(x).ok,false);
  x=Object.assign({},base,{composerPolicy:Object.assign({},base.composerPolicy,{trackingCandidates:[0,-25,-25,-75,-100]})});assert.equal(S.validate(x).ok,false);
  x=Object.assign({},base,{composerPolicy:Object.assign({},base.composerPolicy,{trackingCandidates:[0,-25,-50,-75]})});assert.equal(S.validate(x).ok,false);
});
