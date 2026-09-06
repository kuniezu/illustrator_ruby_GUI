const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'Formal Multi Step2.jsx');
const source = fs.readFileSync(file, 'utf8');

function check(name, condition) {
  if (!condition) throw new Error(name);
  console.log('PASS ' + name);
}

check('includes long-text model and multi namespace',
  source.indexOf('#include "../formal-step1/core.js"') >= 0 &&
  source.indexOf('#include "../formal-step1/store.js"') >= 0 &&
  source.indexOf('#include "../formal-step1/core.js"') < source.indexOf('#include "multi.js"') &&
  source.indexOf('#include "../formal-step1/store.js"') < source.indexOf('#include "multi.js"') &&
  source.indexOf('#include "re-resolution.js"') >= 0 &&
  source.indexOf('#include "multi.js"') >= 0 &&
  source.indexOf('#include "occurrences.js"') >= 0 &&
  source.indexOf('#include "projection.js"') >= 0 &&
  source.indexOf('#include "multi-store.js"') >= 0 &&
  source.indexOf('#include "workflow.js"') >= 0);
check('uses TextFrame selection without partial-range dependency',
  source.indexOf('FormalMultiSelectionAdapter.resolveFrame') >= 0 &&
  source.indexOf('picked.strategy') >= 0 &&
  source.indexOf('picked.text') >= 0 &&
  source.indexOf('sourceKindText(source)') >= 0);
check('requires stable document and frame identity before palette startup',
  source.indexOf('captureIdentity(source, documentRef)') >= 0 &&
  source.indexOf('save-document-first-for-long-text-persistence') >= 0);
check('extracts and displays every logical occurrence',
  source.indexOf('FormalLongText.extract(picked.text)') >= 0 &&
  source.indexOf('listbox') >= 0 &&
  source.indexOf('function listText(occurrence)') >= 0 &&
  source.indexOf('occurrence.occurrenceId') >= 0 &&
  source.indexOf('occurrence.start') >= 0 &&
  source.indexOf('occurrence.end') >= 0);
check('uses a nonmodal palette and saves editable occurrence state',
  source.indexOf('#targetengine "formal-multi-step2"') >= 0 &&
  source.indexOf('new Window("palette"') >= 0 &&
  source.indexOf('FormalMultiWorkflow.setOccurrenceReading') >= 0 &&
  source.indexOf('FormalMultiWorkflow.setOccurrenceEnabled') >= 0 &&
  source.indexOf('FormalMultiProjection.project') >= 0 &&
  source.indexOf('FormalMultiPersistenceAdapter.save') >= 0 &&
  source.indexOf('cachedNote') >= 0 &&
  source.indexOf('list.onChange') >= 0 &&
  source.indexOf('function loadEditor(index)') >= 0 &&
  source.indexOf('保存完了') >= 0);
check('restores persisted long-text state through the multi store',
  source.indexOf('FormalMultiStore.read(cachedNote)') >= 0 &&
  source.indexOf('FormalMultiPersistenceAdapter.save(source, cachedNote, bundle') >= 0 &&
  source.indexOf('再実行で復元') >= 0);
check('keeps persistence strategies inside one save action',
  source.indexOf('pending: function') >= 0 &&
  source.indexOf('failure: function') >= 0 &&
  source.indexOf('if (savePending) return') >= 0 &&
  source.indexOf('saveButton.enabled = false') >= 0 &&
  source.indexOf('closeButton.enabled = false') >= 0 &&
  source.indexOf('closeButton.enabled = true') >= 0 &&
  source.indexOf('source.note =') < 0);
check('keeps rendering separate from the minimal shell',
  source.indexOf('FormalMultiPersistenceAdapter.save') >= 0 &&
  source.indexOf('FormalLongTextReResolution.reconcile') >= 0 &&
  source.indexOf('FormalSegments') < 0 &&
  source.indexOf('renderer') < 0);
check('validates the bundle before showing the palette',
  source.indexOf('FormalMulti.validate(bundle)') >= 0 &&
  source.indexOf('FormalMultiSelectionAdapter.resolveFrame') >= 0);
