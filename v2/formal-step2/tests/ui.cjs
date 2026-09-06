const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'Formal Multi Step2.jsx');
const source = fs.readFileSync(file, 'utf8');

function check(name, condition) {
  if (!condition) throw new Error(name);
  console.log('PASS ' + name);
}

check('includes multi namespace and workflow',
  source.indexOf('#include "multi.js"') >= 0 &&
  source.indexOf('#include "multi-store.js"') >= 0 &&
  source.indexOf('#include "workflow.js"') >= 0);
check('uses proven selection adapter', source.indexOf('FormalMultiSelectionAdapter.resolve') >= 0);
check('restores persisted exact selection and avoids duplicate add',
  source.indexOf('FormalMultiWorkflow.findSelection(bundle') >= 0 &&
  source.indexOf('if (existing) { currentId = existing; refresh(); return; }') >= 0);
check('uses a nonmodal palette and recaptures selection on Add',
  source.indexOf('#targetengine "formal-multi-step2"') >= 0 &&
  source.indexOf('new Window("palette"') >= 0 &&
  source.indexOf('function captureSelection()') >= 0 &&
  source.indexOf('var current = captureSelection()') >= 0);
check('rejects switching to another source frame', source.indexOf('source-frame-switch-not-allowed') >= 0);
check('initializes new frame without old migration', source.indexOf('FormalMulti.createFrame') >= 0 && source.indexOf('FormalMultiStore.read') >= 0);
check('exposes compact editing and review controls',
  source.indexOf('Add') >= 0 && source.indexOf('Apply') >= 0 &&
  source.indexOf('Suppress') >= 0 && source.indexOf('Re-enable') >= 0 &&
  source.indexOf('Previous unresolved') >= 0 && source.indexOf('Next unresolved') >= 0);
check('persists through multi store only',
  source.indexOf('FormalMultiStore.write') >= 0 &&
  source.indexOf('FormalSegments') < 0 && source.indexOf('reconcile') < 0);
check('derives annotation-local status',
  source.indexOf('function annotationStatus(annotation)') >= 0 &&
  source.indexOf('bundle.renderStatus') < 0);
check('guards palette event handlers', source.indexOf('function guard(action)') >= 0 && source.indexOf('guard(function ()') >= 0);
check('main entrypoint emits read-only selection diagnostics',
  source.indexOf('function writeSelectionDiagnostic(selection)') >= 0 &&
  source.indexOf('writeSelectionDiagnostic(documentRef.selection)') >= 0 &&
  fs.existsSync(path.join(__dirname, '..', '..', 'diagnostics', 'Formal Multi Selection Check.jsx')));
