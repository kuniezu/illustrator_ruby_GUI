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
    function scriptLiteral(value) {
        var key, parts;
        if (value === null || value === undefined) return "null";
        if (typeof value === "string") return '"' + value.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\r/g,"\\r").replace(/\n/g,"\\n") + '"';
        if (typeof value === "number" || typeof value === "boolean") return String(value);
        if (value instanceof Array) { parts=[]; for (var i=0;i<value.length;i++) parts.push(scriptLiteral(value[i])); return "["+parts.join(",")+"]"; }
        parts=[]; for (key in value) if (value.hasOwnProperty(key)) parts.push(scriptLiteral(key)+":"+scriptLiteral(value[key])); return "{"+parts.join(",")+"}";
    }
    function renderedBridgeBody(expectedText, cachedNote, nextNote, identity, bundle, specifications, sources, stagePath) {
        var specs=scriptLiteral(specifications), step1=encoded(sources.step1), segments=encoded(sources.segments), orchestration=encoded(sources.orchestration), adapter=encoded(sources.adapter), documentPath=encoded(identity.documentPath || ""), uuid=encoded(identity.uuid || ""), stageFilePath=encoded(stagePath || "");
        return "(function(){"+
            "function fail(m){throw Error(m);}"+
            "var stagePath=decodeURIComponent(\""+stageFilePath+"\"),stageFile;"+
            "function stage(n){try{if(stagePath){stageFile=File(stagePath);if(stageFile.open(\"w\")){stageFile.write(\"formal-multi-host:\"+n);stageFile.close();}}if(typeof $!==\"undefined\"&&$.writeln)$.writeln(\"formal-multi-host:\"+n);}catch(ignore){}}"+
            "stage(\"host-entry\");"+
            "stage(\"step1-eval-start\");"+
            "eval(decodeURIComponent(\""+step1+"\"));"+
            "stage(\"step1-eval-end\");stage(\"segments-eval-start\");"+
            "eval(decodeURIComponent(\""+segments+"\"));"+
            "stage(\"segments-eval-end\");stage(\"orchestration-eval-start\");"+
            "eval(decodeURIComponent(\""+orchestration+"\"));"+
            "stage(\"orchestration-eval-end\");stage(\"adapter-eval-start\");"+
            "eval(decodeURIComponent(\""+adapter+"\"));"+
            "stage(\"adapter-eval-end\");"+
            "var expected=decodeURIComponent(\""+encoded(expectedText)+"\"),cached=decodeURIComponent(\""+encoded(cachedNote)+"\"),next=decodeURIComponent(\""+encoded(nextNote)+"\"),documentPath=decodeURIComponent(\""+documentPath+"\"),uuid=decodeURIComponent(\""+uuid+"\"),specs="+specs+",doc,frame,renderAdapter,observation,plans=[],i,spec,one,result;"+
            "stage(\"host-validation-start\");if(!app.documents.length)fail(\"there is no document\");doc=app.activeDocument;if(!documentPath||!doc.fullName||!doc.fullName.fsName||String(doc.fullName.fsName)!==documentPath)fail(\"origin-document-mismatch\");if(!uuid||typeof doc.getPageItemFromUuid!==\"function\")fail(\"uuid-lookup-unavailable\");frame=doc.getPageItemFromUuid(uuid);if(!frame)fail(\"source-uuid-not-found\");if(String(frame.contents)!==expected)fail(\"source-snapshot-mismatch\");if(String(frame.note)!==cached)fail(\"source-note-target-mismatch\");stage(\"host-validation-end\");renderAdapter=FormalStep2Adapter(doc,frame);stage(\"adapter-constructed\");stage(\"observe-start\");observation=renderAdapter.observe();stage(\"observe-end\");"+
            "if(observation.status!==\"complete\")fail(\"render-observation-unresolved:\"+(observation.reasons||[]).join(\" | \"));"+
            "stage(\"plan-start\");for(i=0;i<specs.length;i++){spec=specs[i];stage(\"plan-annotation-\"+i+\"-start\");if(!spec.annotation||!spec.annotation.enabled){plans.push({annotationId:spec.annotationId,decision:{status:\"complete\",segments:[]}});stage(\"plan-annotation-\"+i+\"-end:cleanup\");continue;}one={textSnapshot:expected,revision:"+String(bundle.revision)+",annotations:[spec.annotation]};result=FormalMultiOrchestration.planOne(one,spec.annotationId,expected,observation);if(result.status!==\"complete\")fail(\"render-plan-unresolved:\"+(result.reasons||[]).join(\" | \"));plans.push({annotationId:spec.annotationId,decision:result.decision});stage(\"plan-annotation-\"+i+\"-end\");}stage(\"plan-end\");stage(\"transaction-start\");renderAdapter.renderAndStoreTransaction(\""+encoded(bundle.sourceFrameId)+"\",plans,function(){stage(\"note-commit-start\");frame.note=next;if(String(frame.note)!==next)fail(\"store-readback-mismatch\");stage(\"note-commit-end\");});stage(\"transaction-end\");stage(\"return\");return \"B-render-persist:success\";}());";
    }
    function renderedBridge(expectedText, cachedNote, nextNote, identity, bundle, specifications, sources, callbacks, bridgeTalkRef, stagePath) {
        var bt, sent, finished=false;
        if(!bridgeTalkRef) throw Error("B-bridge-talk-unavailable");
        if(typeof bridgeTalkRef.getSpecifier!=="function") throw Error("B-bridge-talk-specifier-unavailable");
        bt=new bridgeTalkRef(); bt.target=bridgeTalkRef.getSpecifier("illustrator"); if(!bt.target) throw Error("B-bridge-talk-target-unavailable"); bt.body=renderedBridgeBody(expectedText,cachedNote,nextNote,identity,bundle,specifications,sources,stagePath); bt.timeout=30;
        function finish(callback,value){if(finished)return;finished=true;removeMessage(bt);callback(value);}
        bt.onResult=function(result){if(result&&result.body==="B-render-persist:success")finish(callbacks.success,{strategy:"B-render-persist",note:nextNote});else finish(callbacks.failure,"B-render-persist: invalid-result:"+(result&&result.body?result.body:"empty"));};
        bt.onError=function(result){finish(callbacks.failure,"B-render-persist: "+errorText(result&&result.body?result.body:result));};
        bt.onTimeout=function(result){finish(callbacks.failure,"B-render-persist: timeout:"+errorText(result&&result.body?result.body:result));};
        activeMessages.push(bt); try { sent=bt.send(); } catch(error) { removeMessage(bt); throw error; }
        callbacks.pending(sent===false?"B-render-persist: send=false (queued-or-not-sent)":"B-render-persist: send=true"); return bt;
    }
    function saveRendered(expectedText, cachedNote, bundle, identity, specifications, sources, callbacks, bridgeTalkRef, stagePath) {
        var nextNote=FormalMultiStore.write(cachedNote,bundle), diagnostics=[], result;
        callbacks=callbacks||{};
        try {
            result=renderedBridge(expectedText,cachedNote,nextNote,identity||{},bundle,specifications,sources,{
                pending:function(message){diagnostics.push(message);if(callbacks.pending)callbacks.pending(diagnostics.slice(0));},
                success:function(value){value.diagnostics=diagnostics.concat(["B-render-persist: success"]);if(callbacks.success)callbacks.success(value);},
                failure:function(message){diagnostics.push(message);if(callbacks.failure)callbacks.failure(diagnostics.slice(0));}
            },bridgeTalkRef||(typeof BridgeTalk!=="undefined"?BridgeTalk:null),stagePath);
            return {status:"pending",strategy:"B-render-persist",note:nextNote,diagnostics:diagnostics,bridge:result};
        } catch(error) { diagnostics.push("B-render-persist: "+errorText(error)); return {status:"failed",diagnostics:diagnostics}; }
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
    function saveBridgeOnly(expectedText, cachedNote, bundle, identity, callbacks, bridgeTalkRef) {
        var nextNote=FormalMultiStore.write(cachedNote,bundle), diagnostics=[], result;
        callbacks=callbacks||{};
        try {
            result=bridge(expectedText,cachedNote,nextNote,identity||{},{pending:function(message){diagnostics.push(message);if(callbacks.pending)callbacks.pending(diagnostics.slice(0));},success:function(value){value.diagnostics=diagnostics.concat(["B-bridge-talk: success"]);if(callbacks.success)callbacks.success(value);},failure:function(message){diagnostics.push(message);if(callbacks.failure)callbacks.failure(diagnostics.slice(0));}},bridgeTalkRef||(typeof BridgeTalk!=="undefined"?BridgeTalk:null));
            return {status:"pending",strategy:"B-bridge-talk",note:nextNote,diagnostics:diagnostics,bridge:result};
        } catch(error) { diagnostics.push("B-bridge-talk: "+errorText(error)); return {status:"failed",diagnostics:diagnostics}; }
    }
    return {save:save,saveBridgeOnly:saveBridgeOnly,saveRendered:saveRendered,bridgeBody:bridgeBody,renderedBridgeBody:renderedBridgeBody,captureIdentity:captureIdentity};
}());
if(typeof module!=="undefined")module.exports=FormalMultiPersistenceAdapter;
