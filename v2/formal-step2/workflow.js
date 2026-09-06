/* Pure minimal workflow state; ScriptUI and Illustrator selection stay outside. */
var FormalMultiWorkflow = (function () {
    function fail(message) { throw Error(message); }
    function context(text, start, end) { var limit=16; return {beforeContext:text.substring(Math.max(0,start-limit),start),afterContext:text.substring(end,Math.min(text.length,end+limit))}; }
    function addSelection(bundle, sourceText, start, end) { var a, c; if(sourceText!==bundle.textSnapshot)fail("source-snapshot-mismatch"); if(typeof start!=="number"||typeof end!=="number"||!isFinite(start)||!isFinite(end)||Math.floor(start)!==start||Math.floor(end)!==end||start<0||end<=start||end>sourceText.length)fail("invalid-source-selection"); a=FormalStep1.create(sourceText).annotation; c=context(sourceText,start,end); a.sourceFrameId=bundle.sourceFrameId;a.anchor={baseText:sourceText.substring(start,end),startHint:start,beforeContext:c.beforeContext,afterContext:c.afterContext};a.reading="";a.readingConfirmed=false;a.enabled=true;a.placementMode="auto";a.reviewReasons=["reading-unconfirmed"];a.splitHints=[];return FormalMulti.add(bundle,a); }
    function setReading(bundle, annotationId, reading, confirmed) { return FormalMulti.update(bundle,annotationId,{reading:String(reading),readingConfirmed:confirmed!==false,splitHints:[]}); }
    function setEnabled(bundle, annotationId, enabled) { return FormalMulti.update(bundle,annotationId,{enabled:!!enabled}); }
    function reviewQueue(bundle, results) { var queue=[],i,j; for(i=0;i<bundle.annotations.length;i++)for(j=0;j<results.length;j++)if(results[j].annotationId===bundle.annotations[i].annotationId&&results[j].status==="unresolved"){queue.push(bundle.annotations[i].annotationId);break;} return queue; }
    function navigate(queue, currentId, direction) { var i; for(i=0;i<queue.length;i++)if(queue[i]===currentId){i+=direction;return i>=0&&i<queue.length?queue[i]:null;} return queue.length?(direction>0?queue[0]:queue[queue.length-1]):null; }
    return {addSelection:addSelection,setReading:setReading,setEnabled:setEnabled,reviewQueue:reviewQueue,navigate:navigate};
}());
if(typeof module!=="undefined")module.exports=FormalMultiWorkflow;
