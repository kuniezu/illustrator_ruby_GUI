# AreaText-native implementation handoff

Working branch: `v2/area-text-native-convergence-docs`

Base branch/head at split: `v2/formal-step2-render-segments` @ `be51232b24e437af33c8566c6f0797a6b24e4aa2`.

This branch intentionally keeps the main Luna/Codex branch untouched. It contains convergence docs plus unintegrated scaffolding intended to shorten the next implementation cycle.

## Added design/research

- `area-text-native-decision.md`
  - converged product/transaction decisions
- `area-text-runtime-probe-plan.md`
  - one-shot Illustrator runtime evidence plan

## Added implementation scaffolding

- `area-text-native.js`
  - pure source-manifest helpers
  - request/prepare/verified/activated lifecycle
  - active/pending/cleanup-pending classification from source state
  - conservative one-line fit proof helper
  - fixed initial tracking candidates `[0,-25,-50,-75,-100]`
  - generation/version-aware manual-adjustment capture

- `area-text-render-spec.js`
  - serializable RenderSpec with explicit appearance + geometry + request/generation identity
  - final rectangle geometry derived before host DOM creation
  - composer policy transported as plain data
  - intended to eliminate the current class where appearance exists in palette/pure state but is lost on the host path

- `area-text-native-backend.jsx`
  - candidate-only fresh rectangle -> `areaText()` backend
  - applies explicit font/size, full justification / one-character center policy, optional composer policy
  - observes fresh frame/range/lines and candidate geometry
  - verifies through `FormalAreaTextNative.verifyOneLineFit()`
  - tracking fallback only on candidate
  - candidate cleanup only
  - deliberately does NOT touch `source.note`, active manifest, old output, or retirement

- `area-text-native-host.jsx`
  - batch prepare/verify scaffold around RenderSpec + backend
  - returns verified physical render records and logical->physical bindings
  - deliberately stops before activation/persistence/retirement

- `../diagnostics/Formal Step2 AreaText Native Probe.jsx`
  - disposable-document diagnostic scaffold
  - fresh AreaText creation/ownership logging
  - fresh-width comparison without mutating an existing AreaText width
  - full-justify / single-character center cases
  - tracking sequence cases
  - structured ExtendScript Console output and cleanup
  - not yet the full A-H probe described in `area-text-runtime-probe-plan.md`

## Added tests

- `tests/area-text-native.cjs`
- `tests/area-text-render-spec.cjs`
- `tests/area-text-native-static.cjs`

These tests are intended to be run by the implementation reviewer before any branch integration or runtime checkpoint.

## Luna/Codex review pass

The branch was fetched and reviewed at `87dce54`, then the scaffold was corrected without wiring it into the production renderer. The review pass ran the full pure suite (212/212), the native tests (18/18), Gate 0 (6/6), and the ExtendScript compatibility lint (29 production files). Corrections were limited to candidate kind readback, official `doc.textFrames.areaText(path)` construction, RenderSpec tracking-policy transport, manifest retirement guards, and matching static tests. Illustrator runtime was not executed.

## Follow-up contract hardening

The follow-up review requires activation only from `verified` operations, validates candidate ownership and record/binding/request correspondence, and validates every RenderSpec in a batch before creating any DOM object. RenderSpec typography accepts only explicitly supported `full`/`center` mappings; backend readback checks AreaText kind, font, size, glyph scale, justification, tracking, and final geometry, while style/identity failures do not enter tracking fallback. Rectangle construction is recorded as a candidate invariant separate from AreaText kind readback. These changes remain scaffold-only and are covered by pure/static regression tests.

## Important non-decisions

Do not treat the scaffolding as runtime proof.

Still unresolved until the batched Illustrator probe:
- `areaText(path)` path lifecycle after successful creation/removal
- actual box-height/vertical-gap contract
- frame vs textPath readback authority for manual width observation
- whether coverage from `textRange.lines` proves visible full text in the supported runtime
- exact `FULLJUSTIFY` / `singleWordJustification` Japanese behavior
- composer letter-spacing values/policy
- whether bounded tracking is needed at all after composer policy
- re-observation timing/stability

The backend therefore accepts composer values but does not choose arbitrary letter-spacing limits.

## Recommended Luna/Codex takeover sequence

1. Fetch/compare this branch against `be51232...`.
2. Run:
   - pure tests
   - ExtendScript compatibility lint
   - Gate 0
   - generated BridgeTalk parse
   - `git diff --check`
3. Review scaffolding; fix static issues before cherry-picking/integrating.
4. Merge or selectively transplant the pure modules/backend/probe into the normal branch.
5. Complete the one-shot diagnostic to cover plan fixtures A-H, especially:
   - D visible overflow vs coverage
   - composer J1 policy comparison
   - generation failure injection
   - manual baseline
   - actual BridgeTalk RenderSpec delivery
6. User runs the one-shot Illustrator probe once.
7. Only then wire native backend into production rendering.

## Do not carry forward from the rough renderer

- `item.kind = TextType.AREATEXT`
- `restored.kind = ...`
- PointText managed-ruby creation in native path
- direct existing-frame width mutation as required reflow mechanism
- width-difference -> tracking as primary fit authority
- `-400/+400` native fit clamp
- delete-all/rebuild rollback

Source-geometry temporary PointText measurement is a separate concern and should not be deleted merely because managed ruby becomes AreaText-native.

## Residual review fixes at 16bbed6 follow-up

Activation now accepts only unchanged active bindings or operation-owned
candidates whose physical ID, request ID, and logical segment ID all match.
Final physical IDs are one-to-one; foreign, reassigned, and duplicate
bindings fail before applying changes, and rejection leaves the input manifest
unchanged.

RenderSpec validation now covers the received nested composer policy,
supported enum values, single-character consistency, required numeric fields,
and non-empty finite tracking candidates in the agreed -100..0 range. The host
validates the complete batch and converts every backend spec before creating
the first DOM candidate. Tracking fallback stops immediately on a
non-retryable style, identity, or geometry failure.

This cycle's results are distinct from the historical 212/212 result:

- `node --test v2/formal-step2/tests/*.cjs`: 224/224 PASS
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: 9/9 PASS
- `node v2/formal-step2/extendscript-compat-lint.cjs`: PASS (29 production files)
- `node --test v2/formal-step2/tests/gate-0.cjs`: 6/6 PASS
- `git diff --check`: PASS

New executable coverage includes activation ownership and immutability,
unchanged-active plus owned-candidate activation, batch conversion before DOM
creation, and tracking call-count termination after a non-retryable readback
failure.

## Receiver contract closure at ee96fc7 follow-up

The receiver contract now requires the supported fixed glyph scaling policy
(minimum, desired, and maximum all exactly 100). Letter and word spacing are
currently supported only as explicit `null` values; arbitrary unverified
numeric values are rejected. Nested geometry and appearance fields are
required, and derived final geometry must match the nested values within an
explicit `0.000001` tolerance. Renderer and geometry versions must match the
v1 receiver contract.

This cycle is separate from the prior 224/224 result:

- `node --test v2/formal-step2/tests/*.cjs`: 225/225 PASS
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: 9/9 PASS
- `node v2/formal-step2/extendscript-compat-lint.cjs`: PASS (29 production files)
- `node --test v2/formal-step2/tests/gate-0.cjs`: 6/6 PASS
- `git diff --check`: PASS

Added executable coverage covers unsupported glyph scaling, non-null spacing,
missing or malformed nested geometry, tampered derived left/width values, and
normal `create()` output acceptance. No Illustrator runtime or production
wiring was performed.

## One-shot A-H diagnostic branch handoff

The diagnostic branch `v2/area-text-native-one-shot-diagnostic` is based on
main at `97803c1dd1c4a752697d13bc66370fcc234923b8` and extends the disposable
AreaText probe into one aggregated A-H report. It remains completely separate
from production wiring and source persistence. A-E cover fresh creation,
geometry, composer, fit/overflow, and bounded tracking; F uses an isolated
copy-on-write mock; G records manual baseline formulas; H attempts an actual
BridgeTalk request to a disposable receiver and reports delivery/readback.

All runtime-dependent outcomes are deliberately reported as
`MANUAL_REQUIRED` or `CAPABILITY_UNAVAILABLE` until a user-owned Illustrator
run. The probe never uses `app.activeDocument`, production notes, production
manifest state, PointText fallback, or `kind = TextType.AREATEXT` assignment.

## A-H one-shot diagnostic implementation results

On branch `v2/area-text-native-one-shot-diagnostic`, based on main
`97803c1dd1c4a752697d13bc66370fcc234923b8`, the probe was completed as one
readable, non-minified `.jsx` report. It creates only a disposable document,
aggregates A-H records into one copyable ScriptUI text area, and closes the
document with `DONOTSAVECHANGES`. F remains a pure/mock copy-on-write
transaction case; H attempts BridgeTalk delivery to a disposable receiver
and includes candidate creation, readback, and cleanup in that receiver body.

Exact validation commands and results for this branch:

- `node --test v2/formal-step2/tests/*.cjs`: **226/226 PASS**
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: **10/10 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (29 production files)**
- `node --test v2/formal-step2/tests/gate-0.cjs`: **6/6 PASS**
- `git diff --check`: **PASS**

No Illustrator runtime, production wiring, source persistence, activation, or
PR/Issue operation was performed. Runtime-dependent results remain explicitly
`MANUAL_REQUIRED` or `CAPABILITY_UNAVAILABLE` in the report.

## Final generated BridgeTalk parse validation at c967cb9

Executed at the unchanged review HEAD:

`node --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`

Result: **6/6 PASS**. The generated BridgeTalk body parse case, named
`production generated BridgeTalk body parses as a script`, passed. This was a
validation-only run; no production code or runtime wiring changed.
