#target illustrator
#include "../formal-step1/core.js"
#include "../formal-step1/store.js"
#include "segments.js"
#include "store.js"
#include "adapter.jsx"
#include "review.jsx"
(function(){try{if(!app.documents.length)throw Error("AIファイルを開いてください");var d=app.activeDocument,s=d.selection;if(!s||s.length!==1||s[0].typename!=="TextFrame")throw Error("Area TextFrameを1個だけ選択してください");var p=FormalStep2Adapter(d,s[0]),snap=p.snapshot(),old=FormalStep2Store.read(snap.note),ctx={snapshot:snap,bundle:old||FormalStep1.create(snap.text)},observation=p.observe(),decision=FormalSegments.plan(snap.text,ctx.bundle.annotation.reading,observation.lines,ctx.bundle.splitHints||[],ctx.bundle.revision,ctx.bundle.revision),edit=FormalStep2Review(ctx,decision);if(edit){var result=FormalStep2Apply(p,ctx,edit,edit.splitHints),why=result.bundle.annotation.reviewReasons;alert("状態: "+result.bundle.renderStatus+(why.length?"\n診断: "+why.join(" / "):"")+"\n保存してください。");}}catch(e){alert("Formal Step 2を停止しました。\n"+(e.message||e));}}());
