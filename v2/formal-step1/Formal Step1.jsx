#target illustrator
#include "core.js"
#include "store.js"
#include "adapter.jsx"
#include "review.jsx"
(function(){try{if(!app.documents.length)throw Error("AIファイルを開いてください");var d=app.activeDocument,s=d.selection;if(!s||s.length!==1||s[0].typename!=="TextFrame")throw Error("TextFrameを1個だけ選択してください");var p=FormalStep1Adapter(d,s[0]),snap=p.snapshot(),old=FormalStore.read(snap.note),ctx={snapshot:snap,bundle:old||FormalStep1.create(snap.text)},edit=FormalStep1Review(ctx);if(edit){var result=FormalStep1.apply(p,ctx,edit),why=result.bundle.annotation.reviewReasons;alert("状態: "+result.bundle.renderStatus+(why.length?"\n診断: "+why.join(" / "):"")+"\n保存してください。");}}catch(e){alert("Formal Step 1を停止しました。\n"+(e.message||e));}}());
