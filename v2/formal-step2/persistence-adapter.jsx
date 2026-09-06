/* Persistence bridge for palette callbacks. Serialization stays outside DOM strategy attempts. */
var FormalMultiPersistenceAdapter = (function () {
    var activeMessages=[];
    function errorText(error) { return error && error.message ? error.message : String(error); }
    function encoded(value) { return encodeURIComponent(String(value)); }
    function bridgeBody(expectedText, cachedNote, nextNote) {
        return "(function(){" +
            "function fail(m){throw Error(m);}" +
            "function storyFrame(selected){var frames=selected.story&&selected.story.textFrames,m=[],i,f,r;if(!frames||typeof frames.length!==\"number\"||!frames.length)fail(\"text-range-source-unavailable\");for(i=0;i<frames.length;i++){f=frames[i];r=f.textRange;if(f.typename===\"TextFrame\"&&r&&selected.start>=r.start&&selected.end<=r.start+String(f.contents).length)m.push(f);}if(m.length===1)return m[0];if(frames.length===1&&frames[0].typename===\"TextFrame\")return frames[0];fail(\"threaded-text-not-supported\");}" +
            "function resolve(){var s=app.activeDocument.selection,i=s,c;if(s&&s.typename===\"TextFrame\")return s;if(!s||typeof s.length!==\"number\"||s.length!==1)fail(\"single-text-frame-selection-required\");i=s[0];if(i&&i.typename===\"TextFrame\")return i;if(!i||i.typename!==\"TextRange\")fail(\"text-range-selection-required\");c=i.parent;if(c&&c.typename===\"TextFrame\")return c;return storyFrame(i);}" +
            "if(!app.documents.length)fail(\"there is no document\");var expected=decodeURIComponent(\"" + encoded(expectedText) + "\"),cached=decodeURIComponent(\"" + encoded(cachedNote) + "\"),next=decodeURIComponent(\"" + encoded(nextNote) + "\"),frame=resolve();" +
            "if(frame.orientation!==TextOrientation.HORIZONTAL)fail(\"text-frame-vertical-unsupported\");if(frame.kind!==TextType.AREATEXT&&frame.kind!==TextType.POINTTEXT)fail(\"text-frame-kind-unsupported\");if(String(frame.contents)!==expected)fail(\"source-snapshot-mismatch\");if(String(frame.note)!==cached)fail(\"source-note-target-mismatch\");frame.note=next;if(String(frame.note)!==next)fail(\"store-readback-mismatch\");return \"B-bridge-talk:success\";}());";
    }
    function bridge(expectedText, cachedNote, nextNote, callbacks, bridgeTalkRef) {
        var bt, sent;
        if(!bridgeTalkRef) throw Error("B-bridge-talk-unavailable");
        bt=new bridgeTalkRef(); bt.target="illustrator"; bt.body=bridgeBody(expectedText,cachedNote,nextNote);
        bt.onResult=function(result){if(result&&result.body==="B-bridge-talk:success")callbacks.success({strategy:"B-bridge-talk",note:nextNote});else callbacks.failure("B-bridge-talk:invalid-result:"+(result&&result.body?result.body:"empty"));};
        bt.onError=function(result){callbacks.failure("B-bridge-talk: "+errorText(result&&result.body?result.body:result));};
        bt.onTimeout=function(result){callbacks.failure("B-bridge-talk:timeout:"+errorText(result));};
        activeMessages.push(bt); sent=bt.send(); callbacks.pending(sent===false?"B-bridge-talk:queued":"B-bridge-talk:sent"); return bt;
    }
    function save(source, cachedNote, bundle, callbacks, bridgeTalkRef) {
        var nextNote=FormalMultiStore.write(cachedNote,bundle), diagnostics=[], result;
        callbacks=callbacks||{};
        try { source.note=nextNote; diagnostics.push("A-direct-source-note: success"); return {status:"success",strategy:"A-direct-source-note",note:nextNote,diagnostics:diagnostics}; }
        catch(error) { diagnostics.push("A-direct-source-note: "+errorText(error)); }
        try {
            result=bridge(bundle.textSnapshot,cachedNote,nextNote,{pending:function(message){diagnostics.push(message);if(callbacks.pending)callbacks.pending(diagnostics.slice(0));},success:function(value){value.diagnostics=diagnostics.concat(["B-bridge-talk: success"]);if(callbacks.success)callbacks.success(value);},failure:function(message){diagnostics.push(message);if(callbacks.failure)callbacks.failure(diagnostics.slice(0));}},bridgeTalkRef||(typeof BridgeTalk!=="undefined"?BridgeTalk:null));
            return {status:"pending",strategy:"B-bridge-talk",note:nextNote,diagnostics:diagnostics,bridge:result};
        } catch(error) { diagnostics.push("B-bridge-talk: "+errorText(error)); return {status:"failed",diagnostics:diagnostics}; }
    }
    return {save:save,bridgeBody:bridgeBody};
}());
if(typeof module!=="undefined")module.exports=FormalMultiPersistenceAdapter;
