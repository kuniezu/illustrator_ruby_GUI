/* Persistence bridge for palette callbacks. Serialization stays outside DOM strategy attempts. */
var FormalMultiPersistenceAdapter = (function () {
    var activeMessages=[];
    function errorText(error) { return error && error.message ? error.message : String(error); }
    function encoded(value) { return encodeURIComponent(String(value)); }
    function captureIdentity(source, documentRef) {
        var identity={uuid:null,documentPath:null};
        try { if(source && source.uuid) identity.uuid=String(source.uuid); } catch(error) {}
        try { if(documentRef && documentRef.fullName && documentRef.fullName.fsName) identity.documentPath=String(documentRef.fullName.fsName); } catch(error) {}
        return identity;
    }
    function removeMessage(bt) { for(var i=activeMessages.length-1;i>=0;i--) if(activeMessages[i]===bt) activeMessages.splice(i,1); }
    function bridgeBody(expectedText, cachedNote, nextNote, identity) {
        return "(function(){" +
            "function fail(m){throw Error(m);}" +
            "function storyFrame(selected){var frames=selected.story&&selected.story.textFrames,m=[],i,f,r;if(!frames||typeof frames.length!==\"number\"||!frames.length)fail(\"text-range-source-unavailable\");for(i=0;i<frames.length;i++){f=frames[i];r=f.textRange;if(f.typename===\"TextFrame\"&&r&&selected.start>=r.start&&selected.end<=r.start+String(f.contents).length)m.push(f);}if(m.length===1)return m[0];if(frames.length===1&&frames[0].typename===\"TextFrame\")return frames[0];fail(\"threaded-text-not-supported\");}" +
            "function resolve(doc,uuid){var frame;if(!uuid)fail(\"source-uuid-unavailable\");if(typeof doc.getPageItemFromUuid!==\"function\")fail(\"uuid-lookup-unavailable\");frame=doc.getPageItemFromUuid(uuid);if(!frame)fail(\"source-uuid-not-found\");return frame;}" +
            "if(!app.documents.length)fail(\"there is no document\");var expected=decodeURIComponent(\"" + encoded(expectedText) + "\"),cached=decodeURIComponent(\"" + encoded(cachedNote) + "\"),next=decodeURIComponent(\"" + encoded(nextNote) + "\"),documentPath=decodeURIComponent(\"" + encoded(identity.documentPath || "") + "\"),uuid=decodeURIComponent(\"" + encoded(identity.uuid || "") + "\"),doc=app.activeDocument,frame;" +
            "if(!documentPath)fail(\"origin-document-identity-unavailable\");if(!doc.fullName||!doc.fullName.fsName||String(doc.fullName.fsName)!==documentPath)fail(\"origin-document-mismatch\");frame=resolve(doc,uuid);" +
            "if(frame.orientation!==TextOrientation.HORIZONTAL)fail(\"text-frame-vertical-unsupported\");if(frame.kind!==TextType.AREATEXT&&frame.kind!==TextType.POINTTEXT)fail(\"text-frame-kind-unsupported\");if(String(frame.contents)!==expected)fail(\"source-snapshot-mismatch\");if(String(frame.note)!==cached)fail(\"source-note-target-mismatch\");frame.note=next;if(String(frame.note)!==next)fail(\"store-readback-mismatch\");return \"B-bridge-talk:success\";}());";
    }
    function bridge(expectedText, cachedNote, nextNote, identity, callbacks, bridgeTalkRef) {
        var bt, sent, finished=false;
        if(!bridgeTalkRef) throw Error("B-bridge-talk-unavailable");
        if(typeof bridgeTalkRef.getSpecifier!=="function") throw Error("B-bridge-talk-specifier-unavailable");
        bt=new bridgeTalkRef(); bt.target=bridgeTalkRef.getSpecifier("illustrator"); if(!bt.target) throw Error("B-bridge-talk-target-unavailable"); bt.body=bridgeBody(expectedText,cachedNote,nextNote,identity); bt.timeout=30;
        function finish(callback,value){if(finished)return;finished=true;removeMessage(bt);callback(value);}
        bt.onResult=function(result){if(result&&result.body==="B-bridge-talk:success")finish(callbacks.success,{strategy:"B-bridge-talk",note:nextNote});else finish(callbacks.failure,"B-bridge-talk: invalid-result:"+(result&&result.body?result.body:"empty"));};
        bt.onError=function(result){finish(callbacks.failure,"B-bridge-talk: "+errorText(result&&result.body?result.body:result));};
        bt.onTimeout=function(result){finish(callbacks.failure,"B-bridge-talk: timeout:"+errorText(result&&result.body?result.body:result));};
        activeMessages.push(bt); try { sent=bt.send(); } catch(error) { removeMessage(bt); throw error; }
        callbacks.pending(sent===false?"B-bridge-talk: send=false (queued-or-not-sent)":"B-bridge-talk: send=true"); return bt;
    }
    function save(source, cachedNote, bundle, identity, callbacks, bridgeTalkRef) {
        var nextNote=FormalMultiStore.write(cachedNote,bundle), diagnostics=[], result;
        callbacks=callbacks||{};
        try { source.note=nextNote; diagnostics.push("A-direct-source-note: success"); return {status:"success",strategy:"A-direct-source-note",note:nextNote,diagnostics:diagnostics}; }
        catch(error) { diagnostics.push("A-direct-source-note: "+errorText(error)); }
        try {
            result=bridge(bundle.textSnapshot,cachedNote,nextNote,identity||{},{pending:function(message){diagnostics.push(message);if(callbacks.pending)callbacks.pending(diagnostics.slice(0));},success:function(value){value.diagnostics=diagnostics.concat(["B-bridge-talk: success"]);if(callbacks.success)callbacks.success(value);},failure:function(message){diagnostics.push(message);if(callbacks.failure)callbacks.failure(diagnostics.slice(0));}},bridgeTalkRef||(typeof BridgeTalk!=="undefined"?BridgeTalk:null));
            return {status:"pending",strategy:"B-bridge-talk",note:nextNote,diagnostics:diagnostics,bridge:result};
        } catch(error) { diagnostics.push("B-bridge-talk: "+errorText(error)); return {status:"failed",diagnostics:diagnostics}; }
    }
    return {save:save,bridgeBody:bridgeBody,captureIdentity:captureIdentity};
}());
if(typeof module!=="undefined")module.exports=FormalMultiPersistenceAdapter;
