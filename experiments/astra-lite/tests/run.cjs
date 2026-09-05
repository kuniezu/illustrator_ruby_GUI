/* Run with Node >=18: node experiments/astra-lite/tests/run.cjs
   Mocks prove orchestration/guards, NOT Illustrator DOM behavior or visual layout. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const A = require('../core.js');

function edit(b, patch = {}) {
    const a = A.Store.clone(b).annotation;
    return Object.assign(a, {reading: 'にほんていえん', readingConfirmed: true}, patch);
}
function observation(status = 'complete') {
    return {status, reasons: status === 'complete' ? [] : ['measurement-unavailable'],
        metrics: {left: 0, top: 100, width: 80, baseSize: 20, fontName: 'TestFont'}};
}
function portMock() {
    const state = {text: '日本庭園', note: 'other user\r\n%= note\n', objects: [], applied: 0, observed: 0};
    const port = {
        snapshot() { return {text: state.text, note: state.note}; },
        inspect() { if (state.collision) throw Error('source-id-collision'); return state.objects; },
        writeNote(expected, next) { assert.equal(state.note, expected); state.note = next; },
        observe() { state.observed++; if (state.onObserve) state.onObserve(); return observation(state.measureStatus); },
        reconcile(b, p) {
            assert.equal(p.status, 'complete'); state.applied++;
            if (state.renderError) throw Error('injected-render-failure');
            state.objects = p.desired.map(d => ({tag: A.Store.tag(b), reading: d.reading}));
        }
    };
    return {port, state};
}

test('Store preserves foreign note bytes and all semantic fields through round trip', () => {
    const b = A.Domain.create('日本庭園');
    Object.assign(b.annotation, {reading: 'にほん=ていえん%;\n', enabled: false, readingConfirmed: true,
        placementMode: 'auto_offset', userReview: '見直し', reviewReasons: ['reason,comma', '改行\n理由']});
    b.annotation.offset = {inlineEm: -0.25, blockEm: 0.125};
    const prefix = '他者のnote\r\n%=[]\n', suffix = '\n追記\r\n';
    const note = A.Store.replace(prefix, b) + suffix;
    assert.deepEqual(A.Store.read(note), b);
    b.revision++; b.annotation.enabled = true;
    const next = A.Store.replace(note, b);
    assert.ok(next.startsWith(prefix)); assert.ok(next.endsWith(suffix));
    assert.equal(next.split('[astra-lite-gate-ab:v1]').length - 1, 1);
    assert.deepEqual(A.Store.read(next), b);
});
test('Store rejects version, duplicate/truncated markers, bad encoding and malformed fields', () => {
    const b = A.Domain.create('日本庭園'), note = A.Store.replace('', b);
    for (const broken of [note.replace(':v1]', ':v2]'), note + note, note.slice(0, -1),
        note.replace('schemaVersion=1', 'schemaVersion=2'), note.replace('enabled=true', 'enabled=perhaps'),
        note.replace('reading=', 'reading=%XX'), note.replace('startHint=0', 'startHint=999'),
        note.replace('revision=0', 'revision=NaN'), '[/astra-lite-gate-ab]',
        note.replace('sourceFrameId=', 'unrecognized=')]) {
        assert.throws(() => A.Store.read(broken), undefined, broken);
        assert.throws(() => A.Store.replace(broken, b));
    }
});
test('Store round-trips small finite numeric offsets', () => {
    const b = A.Domain.create('日本庭園'); b.annotation.offset.inlineEm = 0.00000001;
    assert.deepEqual(A.Store.read(A.Store.replace('', b)), b);
});
test('IDs are tool-owned and independent of host UUID', () => {
    const first = A.Domain.create('日本庭園'), second = A.Domain.create('日本庭園');
    assert.notEqual(first.sourceFrameId, second.sourceFrameId);
    assert.notEqual(first.annotation.annotationId, second.annotation.annotationId);
    assert.equal(first.annotation.sourceFrameId, first.sourceFrameId);
    assert.ok(!first.sourceFrameId.includes('uuid'));
});
test('Anchor includes overlapping candidates and does not guess nearest match', () => {
    const anchor = {baseText: '日日', startHint: 0, beforeContext: '', afterContext: ''};
    assert.equal(A.Domain.resolve('日日日', '日日', anchor).status, 'unresolved');
    assert.equal(A.Domain.resolve('日日', '日日', anchor).start, 0);
    assert.equal(A.Domain.resolve('新日本庭園', '旧日本庭園', {baseText: '日本', startHint: 1, beforeContext: '', afterContext: '庭園'}).start, 1);
    assert.equal(A.Domain.resolve('京都', '日本', {baseText: '日本', startHint: 0, beforeContext: '', afterContext: ''}).status, 'unresolved');
});
test('complete desired=0 is distinct from failed/unresolved measurements', () => {
    const b = A.Domain.create('日本庭園'); b.annotation = edit(b);
    for (const status of ['failed', 'unresolved']) {
        const p = A.Domain.plan(b, b.textSnapshot, observation(status));
        assert.equal(p.status, status); assert.equal(p.desired, undefined);
    }
    b.annotation.enabled = false;
    assert.deepEqual(A.Domain.plan(b, b.textSnapshot, observation('failed')), {status: 'complete', desired: []});
});
test('manual, reading confirmation, user review and partial ranges block automatic rendering', () => {
    const b = A.Domain.create('日本庭園');
    for (const change of [{readingConfirmed: false}, {placementMode: 'manual'}, {userReview: '確認待ち'}, {reading: 'にほん\nていえん'}]) {
        b.annotation = edit(A.Domain.create('日本庭園'), change); b.annotation.sourceFrameId = b.sourceFrameId;
        assert.equal(A.Domain.plan(b, b.textSnapshot, observation()).status, 'unresolved');
    }
    b.annotation = edit(b, {placementMode: 'auto', userReview: ''}); b.annotation.anchor.baseText = '日本';
    assert.equal(A.Domain.plan(b, b.textSnapshot, observation()).reasons[0], 'gate-ab-whole-frame-only');
});
test('Application: three runs, reading update, suppress, reopen, re-enable', () => {
    const {port, state} = portMock(), foreign = state.note;
    let c = A.Application.open(port), identity = c.bundle.sourceFrameId;
    assert.equal(state.note, foreign); // Opening/cancelling writes nothing.
    for (let n = 0; n < 3; n++) {
        const r = A.Application.apply(port, c, edit(c.bundle));
        assert.equal(r.bundle.renderStatus, 'complete'); assert.equal(state.objects.length, 1);
        c = A.Application.open(port); assert.equal(c.bundle.sourceFrameId, identity);
    }
    A.Application.apply(port, c, edit(c.bundle, {reading: 'べつのよみ'}));
    c = A.Application.open(port); assert.equal(c.bundle.annotation.reading, 'べつのよみ');
    const observed = state.observed;
    A.Application.apply(port, c, edit(c.bundle, {reading: 'べつのよみ', enabled: false}));
    assert.equal(state.objects.length, 0); assert.equal(state.observed, observed);
    c = A.Application.open(port);
    assert.equal(c.bundle.annotation.reading, 'べつのよみ'); assert.equal(c.bundle.annotation.enabled, false);
    assert.equal(c.bundle.sourceFrameId, identity);
    A.Application.apply(port, c, edit(c.bundle, {enabled: true}));
    assert.equal(state.objects.length, 1); assert.ok(state.note.startsWith(foreign));
});
test('Application saves unresolved/failed intent while retaining previous output', () => {
    const {port, state} = portMock(); let c = A.Application.open(port);
    A.Application.apply(port, c, edit(c.bundle));
    for (const status of ['failed', 'unresolved']) {
        c = A.Application.open(port); state.measureStatus = status;
        const calls = state.applied, prior = JSON.stringify(state.objects);
        A.Application.apply(port, c, edit(c.bundle, {reading: '保存される読み'}));
        assert.equal(state.applied, calls); assert.equal(JSON.stringify(state.objects), prior);
        assert.equal(A.Store.read(state.note).annotation.reading, '保存される読み');
        assert.equal(A.Store.read(state.note).renderStatus, status);
    }
});
test('Application rejects stale UI, mid-observation text change and ID collision before saving', () => {
    for (const kind of ['stale', 'observation', 'collision']) {
        const {port, state} = portMock(), c = A.Application.open(port), note = state.note;
        if (kind === 'stale') state.text += '変更';
        if (kind === 'observation') state.onObserve = () => { state.text += '変更'; };
        if (kind === 'collision') state.collision = true;
        assert.throws(() => A.Application.apply(port, c, edit(c.bundle)));
        assert.equal(state.note, note); assert.equal(state.applied, 0);
    }
});
test('Application records renderer failure and can retry from persisted intent', () => {
    const {port, state} = portMock(); let c = A.Application.open(port); state.renderError = true;
    assert.equal(A.Application.apply(port, c, edit(c.bundle)).bundle.renderStatus, 'failed');
    c = A.Application.open(port); state.renderError = false;
    assert.equal(c.bundle.annotation.reading, 'にほんていえん');
    assert.equal(A.Application.apply(port, c, edit(c.bundle)).bundle.renderStatus, 'complete');
});

// Minimal host simulation exercises the REAL adapter, not a second reconcile implementation.
function host() {
    const frames = [], font = {name: 'TestFont'}, trace = {tempCount: 0};
    const doc = {typename: 'Document', textFrames: frames};
    const layer = {typename: 'Layer', parent: doc, visible: true, locked: false};
    function frame(contents = '', note = '') {
        let text = contents, metadata = note;
        const f = {typename: 'TextFrame', parent: layer, layer, locked: false, hidden: false,
            kind: 'point', orientation: 'horizontal', nextFrame: null, previousFrame: null,
            matrix: {mValueA: 1, mValueB: 0, mValueC: 0, mValueD: 1}, left: 0, top: 100,
            attr: {size: 20, textFont: font, fillColor: {typename: 'GrayColor', gray: 100}, tracking: 0,
                baselineShift: 0, rotation: 0, horizontalScale: 100, verticalScale: 100}, noteWrites: 0};
        Object.defineProperty(f, 'contents', {get: () => text, set(v) { if (f.failContentOnce) { f.failContentOnce = false; throw Error('content-injected'); } text = v; }});
        Object.defineProperty(f, 'note', {get: () => metadata, set(v) {
            f.noteWrites++; if (f.noteWrites === f.failNoteAt) throw Error('note-injected'); metadata = v;
        }});
        Object.defineProperty(f, 'width', {get: () => text.length * f.attr.size * 0.6});
        const paragraph = {justification: 'left'}, range = {start: 0, characterAttributes: f.attr, paragraphs: [paragraph]};
        Object.defineProperty(range, 'end', {get: () => text.length});
        Object.defineProperty(range, 'characters', {get: () => text.split('').map((ch, i) => ({contents: ch,
            start: i + (f.badIndex ? 1 : 0), end: i + 1, characterAttributes: f.attr}))});
        Object.defineProperty(range, 'lines', {get: () => f.lineData || [{start: 0, end: text.length, contents: text}]});
        f.textRange = range;
        f.remove = () => { if (f.failRemove) throw Error('remove-injected'); const i = frames.indexOf(f); if (i >= 0) frames.splice(i, 1); };
        f.duplicate = () => {
            const copy = frame(text, metadata); trace.tempCount++;
            const remove = copy.remove; copy.remove = () => { remove(); trace.tempCount--; };
            copy.createOutline = () => {
                if (f.failOutline) throw Error('outline-injected'); copy.remove();
                trace.tempCount++;
                return {geometricBounds: [0, 100, 80, 80], remove() { trace.tempCount--; }};
            };
            return copy;
        };
        frames.push(f); return f;
    }
    layer.textFrames = {add() { const f = frame(); if (trace.failNewOutput) f.failContentOnce = true; return f; }};
    const source = frame('日本庭園', 'foreign note\r\n');
    const globals = {AstraLite: A, app: {activeDocument: doc, textFonts: {getByName: () => font}},
        TextType: {POINTTEXT: 'point'}, TextOrientation: {HORIZONTAL: 'horizontal'}, Justification: {LEFT: 'left'}};
    vm.createContext(globals); vm.runInContext(fs.readFileSync(path.join(root, 'illustrator.jsx'), 'utf8'), globals);
    return {source, frame, frames, trace, doc, port: globals.AstraLiteIllustrator(doc, source)};
}
test('Real adapter mock: creates once, updates the same object three times and suppresses only its output', () => {
    const h = host(), user = h.frame('user text', 'unrelated metadata'); let c = A.Application.open(h.port), output;
    for (let i = 0; i < 3; i++) {
        const r = A.Application.apply(h.port, c, edit(c.bundle, {reading: 'よみ' + i}));
        assert.equal(r.bundle.renderStatus, 'complete');
        const managed = h.port.inspect(r.bundle); assert.equal(managed.length, 1);
        if (output) assert.equal(managed[0], output); output = managed[0];
        assert.equal(output.contents, 'よみ' + i); c = A.Application.open(h.port);
    }
    A.Application.apply(h.port, c, edit(c.bundle, {enabled: false}));
    assert.equal(h.port.inspect(c.bundle).length, 0); assert.ok(h.frames.includes(user));
    assert.equal(user.note, 'unrelated metadata'); assert.equal(h.trace.tempCount, 0);
    assert.equal(A.Store.read(h.source.note).annotation.enabled, false);
});
test('Real adapter mock: rejects copied source/output IDs; unknown tags stay untouched', () => {
    for (const kind of ['source', 'output', 'unknown']) {
        const h = host(); let c = A.Application.open(h.port);
        A.Application.apply(h.port, c, edit(c.bundle)); c = A.Application.open(h.port);
        const note = h.source.note;
        const copy = kind === 'source' ? h.frame(h.source.contents, note) :
            h.frame('copied', kind === 'output' ? A.Store.tag(c.bundle) : 'astra-lite-output:v99;unknown');
        assert.throws(() => A.Application.apply(h.port, c, edit(c.bundle, {enabled: false})));
        assert.equal(h.source.note, note); assert.ok(h.frames.includes(copy));
    }
});
test('Real adapter mock: generated frame cannot become source and lock/unknown properties stop', () => {
    const h = host(), b = A.Domain.create('日本庭園');
    h.source.note = A.Store.tag(b); assert.throws(() => A.Application.open(h.port), /generated-ruby/);
    h.source.note = ''; h.source.locked = true; assert.throws(() => A.Application.open(h.port), /locked/);
    h.source.locked = false; Object.defineProperty(h.source, 'hidden', {get() { throw Error('unavailable'); }});
    assert.throws(() => A.Application.open(h.port), /unavailable/);
});
test('Real adapter mock: line/index mismatch, supplementary characters and unsupported kind are not success', () => {
    for (const kind of ['index', 'lines', 'unicode', 'area', 'rotation', 'unknown-matrix', 'group']) {
        const h = host();
        if (kind === 'index') h.source.badIndex = true;
        if (kind === 'lines') h.source.lineData = [{start: 0, end: 2, contents: '日本'}];
        if (kind === 'unicode') h.source.contents = '𠮷';
        if (kind === 'area') h.source.kind = 'area';
        if (kind === 'rotation') h.source.matrix.mValueB = 0.1;
        if (kind === 'unknown-matrix') h.source.matrix = {};
        if (kind === 'group') h.source.parent = {typename: 'GroupItem', hidden: false, locked: false, clipped: false, parent: h.source.layer};
        assert.equal(h.port.observe().status, 'unresolved'); assert.equal(h.trace.tempCount, 0);
    }
});
test('Real adapter mock: measurement failure removes its duplicate, preserves source and output', () => {
    const h = host(); let c = A.Application.open(h.port);
    A.Application.apply(h.port, c, edit(c.bundle)); c = A.Application.open(h.port);
    const output = h.port.inspect(c.bundle)[0]; h.source.failOutline = true;
    const result = A.Application.apply(h.port, c, edit(c.bundle, {reading: '新しい読み'}));
    assert.equal(result.bundle.renderStatus, 'failed'); assert.equal(h.trace.tempCount, 0);
    assert.equal(h.frames.length, 2); assert.equal(output.contents, 'にほんていえん');
    assert.equal(h.source.contents, '日本庭園');
});
test('Real adapter mock: failed creation cleans up; failed update restores existing object; retry succeeds', () => {
    const h = host(); let c = A.Application.open(h.port); h.trace.failNewOutput = true;
    assert.equal(A.Application.apply(h.port, c, edit(c.bundle)).bundle.renderStatus, 'failed');
    assert.equal(h.frames.length, 1);
    h.trace.failNewOutput = false; c = A.Application.open(h.port);
    A.Application.apply(h.port, c, edit(c.bundle)); c = A.Application.open(h.port);
    const output = h.port.inspect(c.bundle)[0]; output.failContentOnce = true;
    assert.equal(A.Application.apply(h.port, c, edit(c.bundle, {reading: '変更'})).bundle.renderStatus, 'failed');
    assert.equal(output.contents, 'にほんていえん'); assert.equal(h.frames.length, 2);
    c = A.Application.open(h.port); A.Application.apply(h.port, c, edit(c.bundle, {reading: '変更'}));
    assert.equal(output.contents, '変更'); assert.equal(h.port.inspect(c.bundle)[0], output);
});
test('Real adapter mock: failed suppress leaves semantics and reports failure, retry reaches zero', () => {
    const h = host(); let c = A.Application.open(h.port); A.Application.apply(h.port, c, edit(c.bundle));
    c = A.Application.open(h.port); const output = h.port.inspect(c.bundle)[0]; output.failRemove = true;
    const r = A.Application.apply(h.port, c, edit(c.bundle, {enabled: false}));
    assert.equal(r.bundle.renderStatus, 'failed'); assert.equal(A.Store.read(h.source.note).annotation.enabled, false);
    assert.ok(h.frames.includes(output)); output.failRemove = false;
    c = A.Application.open(h.port); A.Application.apply(h.port, c, edit(c.bundle, {enabled: false}));
    assert.equal(h.port.inspect(c.bundle).length, 0);
});
test('Real adapter mock: initial store write failure restores note; final failure leaves recoverable pending intent', () => {
    const h = host(); let c = A.Application.open(h.port); const original = h.source.note;
    h.source.failNoteAt = 1;
    assert.throws(() => A.Application.apply(h.port, c, edit(c.bundle)), /store-write-failed-restored/);
    assert.equal(h.source.note, original); assert.equal(h.frames.length, 1);
    h.source.failNoteAt = h.source.noteWrites + 2;
    assert.throws(() => A.Application.apply(h.port, c, edit(c.bundle)), /store-write-failed-restored/);
    c = A.Application.open(h.port);
    assert.equal(c.bundle.renderStatus, 'pending'); assert.equal(c.bundle.annotation.reading, 'にほんていえん');
    const output = h.port.inspect(c.bundle)[0]; h.source.failNoteAt = 0;
    assert.equal(A.Application.apply(h.port, c, edit(c.bundle)).bundle.renderStatus, 'complete');
    assert.equal(h.port.inspect(c.bundle)[0], output);
});
test('Static: runtime syntax, entry includes, conservative syntax guard, no legacy dependency', () => {
    for (const name of ['core.js', 'illustrator.jsx', 'review.jsx', 'Astra Lite Gate AB.jsx']) {
        const source = fs.readFileSync(path.join(root, name), 'utf8');
        new vm.Script(source.replace(/^#.*$/gm, ''), {filename: name});
        assert.ok(!/\b(?:const|let|class)\s|=>|`|\?\./.test(source), name + ' modern runtime syntax');
        assert.ok(!/\beval\s*\(|JSON\.|Array\.prototype\s*\[|\.uuid\b/.test(source), name + ' forbidden shortcut');
        for (const include of source.matchAll(/^#include "([^"]+)"/gm)) assert.ok(fs.existsSync(path.join(root, include[1])));
        assert.ok(!source.includes('Illustrator Ruby GUI.jsx'));
    }
    assert.ok(!fs.readFileSync(path.join(root, 'review.jsx'), 'utf8').includes('.textFrames.add'));
});
test('Review UI mock: changing reading requires reconfirmation, returns plain command, cancel returns nothing', () => {
    const b = A.Domain.create('日本庭園'); b.annotation = edit(b);
    for (const cancel of [false, true]) {
        const controls = [], alerts = [];
        function Window() {
            const w = {closed: 0, close(code) { this.closed = code; },
                show() {
                    if (cancel) return 0;
                    const reading = controls.find(c => c.type === 'edittext' && c.text === 'にほんていえん');
                    const confirmed = controls.find(c => c.type === 'checkbox' && c.text === 'この読みを確認済みにする');
                    assert.equal(confirmed.value, true);
                    reading.text = 'こうせいご'; reading.onChanging(); assert.equal(confirmed.value, false);
                    controls.find(c => c.type === 'button' && c.text === '保存して適用').onClick();
                    return this.closed;
                }};
            function add(type, bounds, text, options) {
                const c = {type, text, options, add};
                if (type === 'dropdownlist') {
                    let selection;
                    Object.defineProperty(c, 'selection', {get: () => selection, set: n => { selection = {text: text[n]}; }});
                }
                controls.push(c); return c;
            }
            w.add = add; return w;
        }
        const env = {Window, alert: message => alerts.push(message)};
        vm.createContext(env); vm.runInContext(fs.readFileSync(path.join(root, 'review.jsx'), 'utf8'), env);
        const result = env.AstraLiteReview({bundle: b}, '', null);
        assert.equal(alerts.length, 0);
        if (cancel) assert.equal(result, null);
        else {
            assert.equal(result.action, 'apply'); assert.equal(result.edit.reading, 'こうせいご');
            assert.equal(result.edit.readingConfirmed, false); assert.equal(result.edit.enabled, true);
            assert.equal(result.edit.placementMode, 'auto'); assert.equal(result.edit.style.sizeRatio, 0.5);
            assert.equal(result.edit.offset.inlineEm, 0);
        }
    }
});
