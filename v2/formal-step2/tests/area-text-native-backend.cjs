const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const backendSource = fs.readFileSync(path.join(__dirname, '..', 'area-text-native-backend.jsx'), 'utf8');

test('native vertical placement uses glyph ink when AreaText box is much taller than ruby', () => {
  let outlineRemoved = 0;
  let duplicateRemoved = 0;
  const range = {
    contents: '',
    characterAttributes: {
      size: 10,
      tracking: 0,
      horizontalScale: 100,
      verticalScale: 100,
      textFont: { name: 'RubyFont' }
    },
    paragraphAttributes: {
      minimumGlyphScaling: 100,
      desiredGlyphScaling: 100,
      maximumGlyphScaling: 100,
      minimumLetterSpacing: 100,
      desiredLetterSpacing: 100,
      maximumLetterSpacing: 100,
      minimumWordSpacing: 100,
      desiredWordSpacing: 100,
      maximumWordSpacing: 100,
      justification: 'full',
      singleWordJustification: 'full'
    }
  };
  const frame = {
    kind: 'area',
    orientation: 'horizontal',
    top: 30,
    width: 40,
    height: 110,
    visibleBounds: [0, 20, 40, 200],
    parent: {},
    contents: '',
    textRange: range,
    duplicate() {
      const temporary = {
        parent: {},
        createOutline() {
          this.parent = null;
          return {
            parent: {},
            visibleBounds: [0, frame.top + 65, 20, frame.top + 75],
            remove() { outlineRemoved += 1; this.parent = null; }
          };
        },
        remove() { duplicateRemoved += 1; this.parent = null; }
      };
      return temporary;
    }
  };
  const context = {
    TextType: { AREATEXT: 'area' },
    Justification: { FULLJUSTIFY: 'full', CENTER: 'center' },
    app: { textFonts: { getByName() { return { name: 'RubyFont' }; } } },
    FormalAreaTextNative: {},
    FormalAreaTextNativeOutputIdentity: { stamp() {} }
  };
  context.layer = { pathItems: { rectangle() { return { parent: {}, filled: true, stroked: true }; } } };
  context.doc = { textFrames: { areaText() { return frame; } } };
  vm.runInNewContext(backendSource + '; this.Backend = FormalAreaTextNativeBackend;', context);

  const backend = new context.Backend(context.doc, context.layer);
  const spec = {
    sourceFrameId: 'source-1',
    physicalId: 'physical-1',
    reading: 'かな',
    left: 0,
    top: 30,
    width: 40,
    height: 110,
    measuredTop: 90,
    gap: 2,
    singleCharacter: false,
    appearance: { fontName: 'RubyFont', fontSize: 10 },
    composerPolicy: { justification: 'full', singleWordJustification: 'full' }
  };
  const candidate = backend.prepareCandidate(spec);

  assert.equal(candidate.verticalPlacement.measurement, 'glyph-ink-outline');
  assert.equal(candidate.verticalPlacement.desiredBottom, 92);
  assert.equal(candidate.verticalPlacement.residual, 0);
  assert.equal(frame.top, 17);
  assert.equal(outlineRemoved, 2);
  assert.equal(duplicateRemoved, 0);

  frame.duplicate = function () {
    return {
      parent: {},
      createOutline() {
        return { parent: {}, visibleBounds: [0, 95, 20, 105], remove() { throw Error('outline-remove-failed'); } };
      },
      remove() { duplicateRemoved += 1; this.parent = null; }
    };
  };
  assert.throws(() => backend.prepareCandidate(spec), (error) => {
    assert.match(String(error), /ruby-glyph-cleanup-failed/);
    assert.equal(String(error.cleanupPendingIds), 'physical-1');
    assert.match(error.cleanupEvidence, /outline-remove-failed/);
    return true;
  });
});

test('createOutline consumes the duplicate without false cleanup failure', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'area-text-native-backend.jsx'), 'utf8');
  assert.match(source, /outlined = false/);
  assert.match(source, /outlined = true/);
  assert.match(source, /if \(!outlined\) try/);
});
