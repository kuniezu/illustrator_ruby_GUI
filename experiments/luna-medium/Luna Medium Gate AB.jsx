#target illustrator
#include "core.js"
#include "illustrator.jsx"
#include "review.jsx"
(function(){try{if(!app.documents.length)throw Error("実験用AIを開いてください");var d=app.activeDocument,s=d.selection;if(!s||s.length!==1||s[0].typename!=="TextFrame")throw Error("本文TextFrameを1個だけ直接選択してください");var p=LunaMediumIllustrator(d,s[0]),ctx=LunaMedium.Application.open(p),edit=LunaMediumReview(ctx);if(edit){var result=LunaMedium.Application.apply(p,ctx,edit);alert("状態: "+result.bundle.renderStatus+"。AIファイルを保存してください。");}}catch(e){alert("Luna Mediumを停止しました。\n"+e.message);}}());
