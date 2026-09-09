# AreaText-native implementation handoff

Working branch: `v2/area-text-native-one-shot-diagnostic`

Current runtime status: Gate D batch and AreaText-native A-H diagnostic
checkpoints are complete; this branch remains scaffold/diagnostic-only and
is not wired into production.

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

## A-H review hardening results

The follow-up hardening makes H use an actual BridgeTalk request with a
RenderSpec-shaped payload and a disposable receiver that performs schema
identity/geometry delivery, fresh rectangle creation, `areaText(path)`,
typography/readback, and cleanup. H completion is gated so the single final
report is built only after the callback or a send/availability failure. E
stops on the first verified fit and does not continue after a non-retryable
failure. A records path/frame lifecycle readbacks rather than asserting them;
B reports tolerance comparisons for frame and textPath; D separates expected
negative fit observations from diagnostic execution status; F checks actual
mock state transitions; G includes disposable candidate readback; cleanup is
idempotent and summary statuses are generated from recorded outcomes.

Exact validation commands and results on this branch:

- `node --test v2/formal-step2/tests/*.cjs`: **232/232 PASS**
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: **10/10 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (30 production files)**
- `node --test v2/formal-step2/tests/gate-0.cjs`: **6/6 PASS**
- `node --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`: **6/6 PASS**
- `git diff --check`: **PASS**

New pure execution coverage is in
`tests/area-text-native-diagnostic.cjs`; it covers first-fit termination,
non-retryable termination, deferred final reporting, expected negative D
cases, F state transitions, and single cleanup reporting. No Illustrator
runtime was executed and no production wiring was changed.

## A-H semantic review hardening at 8b3b9e2 follow-up

The diagnostic now routes H through the actual
`FormalAreaTextRenderSpec.create` -> `validate` -> `backendSpec` path before
building the BridgeTalk payload. The disposable receiver performs fresh
rectangle creation, `areaText(path)`, typography/readback, geometry and line
reporting, and owned cleanup. The final report is deferred until H completes
or fails, so the receiver result/error is included in the one displayed
report. E terminates at the first verified fit or first non-retryable result;
A records path/frame lifecycle observations; B emits tolerance comparisons;
D records expected negative fit outcomes without classifying the diagnostic as
failed; F checks state transitions; G includes disposable candidate readback;
and cleanup is guarded against duplicate processing.

Exact validation commands and results for this follow-up:

- `node --test v2/formal-step2/tests/*.cjs`: **232/232 PASS**
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: **10/10 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (30 production files)**
- `node --test v2/formal-step2/tests/gate-0.cjs`: **6/6 PASS**
- `node --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`: **6/6 PASS**
- `git diff --check`: **PASS**

No Illustrator runtime, main-branch merge, production wiring, PR, or Issue
operation was performed.

## NEXT WORK 5594684418 recovery boundary follow-up

Dispatch source: Issue #14 comment [5594684418](https://github.com/kuniezu/illustrator_ruby_GUI/issues/14#issuecomment-5594684418).
Target branch: `v2/area-text-native-one-shot-diagnostic`.
Base reviewed HEAD: `525e31c6a0e25ae4a540bbb966524fc4e5002c0d`.
Stop condition: commit/push this branch and stop. No Illustrator runtime,
production wiring, merge, PR, or Issue operation.

Added the isolated ES3-safe `area-text-native-recovery.js` layer. It provides:

- executable restart plans for `prepare`, `verified`, and `activated` phases;
- found/missing/duplicate resolver handling, with duplicate candidates failing closed;
- sourceFrameId plus physicalId validation before activation;
- discarded-candidate cleanup tracking that retains deletion failures and
  converges when a resolver later reports `missing`;
- a finish guard that remains false while cleanup IDs are still resolvable.

The native host's verified records now carry `sourceFrameId` for the isolated
activation boundary. Production persistence, renderer, UI, and activation
entrypoints remain unwired.

Focused validation:

- `node --test v2/formal-step2/tests/area-text-native-recovery.cjs v2/formal-step2/tests/area-text-native-static.cjs v2/formal-step2/tests/area-text-native.cjs v2/formal-step2/tests/area-text-native-transaction-coordinator.cjs`: **63/63 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (36 production files; diagnostic entrypoint PASS)**
- formal-step2 suite excluding `gate-0.cjs`: **279 PASS; 1 file could not load because Acorn is unavailable in this environment**
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: **20/20 PASS**
- `git diff --check`: **PASS**

Illustrator runtime was not run. The remaining boundary is integration of this
recovery layer with a real production host/resolver after independent review.

## Native output identity persistence checkpoint at 5593267268

Added the disposable diagnostic entrypoint
`v2/diagnostics/Formal Step2 AreaText Native Identity Persistence Check.jsx`.
It creates two native AreaText candidates through the current RenderSpec and
backend path with one sourceFrameId and distinct physicalIds, verifies the
immutable identity stamp before save, saves and reopens a temporary document,
resolves active and retirement candidates by identity only, removes one
resolved retirement candidate, and confirms the unrelated TextFrame remains
unchanged. The checkpoint does not use the production entrypoint or source
notes and is not wired into production.

The diagnostic entrypoint is included in the Gate 0 expanded-source ES3 and
compatibility checks. Static coverage also verifies the backend stamping and
identity-only reopen resolution contract.

Validation for this dispatch was run after the diagnostic addition:

- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/*.cjs`: **296/296 PASS**
- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/area-text-native-static.cjs`: **19/19 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (35 production files; diagnostic entrypoint PASS)**
- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/gate-0.cjs`: **10/10 PASS**
- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`: **10/10 PASS**
- `git diff --check`: **PASS**

Illustrator runtime was not executed. No production wiring, main-branch
merge, PR, or Issue operation was performed.

## Native output identity immutability at comment 5593019120

The public identity `write()`/`stamp()` contract is now fail-closed and
immutable. A missing native-output marker may be stamped once; an existing
marker succeeds only when both `sourceFrameId` and `physicalId` match exactly,
and repeated identical stamping is byte-identical. Any source or physical ID
replacement is rejected with `native-output-identity-immutable` before note
mutation. Lifecycle state remains outside the ruby note.

Validation:

- `node --test v2/formal-step2/tests/area-text-native-output-identity.cjs`: **7/7 PASS**
- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/*.cjs`: **295/295 PASS**
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: **18/18 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (35 production files; diagnostic entrypoint PASS)**
- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/gate-0.cjs`: **10/10 PASS**
- `git diff --check`: **PASS**

The Acorn preload was repository-external and removed after testing. No
Illustrator runtime, production persistence/activation wiring, merge, PR, or
Issue operation was performed.

## Exact manifest readback hardening at dispatch 5589894761

The isolated persistence checkpoint now compares the complete readback
manifest with the expected manifest using
`FormalAreaTextNativeStore.serialize(actual) ===
FormalAreaTextNativeStore.serialize(expected)`. The previous partial
`activeBindings.s1/s2` comparison was removed. This covers the complete
canonical authority, including header, active bindings, render records,
operation/candidates, and retirement queue, before the separate restart-plan
assertion. A static/pure regression test also proves that a changed retirement
record/queue cannot serialize as equal and guards against the old false-PASS
pattern.

Validation from this change:

- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/*.cjs`: **271/271 PASS**. The preload only exposes the repository's existing Acorn 8.15.0 runtime dependency; it is outside the repository and was removed after testing.
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: **15/15 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (32 production files; diagnostic entrypoint PASS)**
- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/gate-0.cjs`: **10/10 PASS**
- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`: **10/10 PASS**
- `git diff --check`: **PASS**

No Illustrator runtime, production persistence/renderer wiring, main-branch
merge, PR, or Issue operation was performed. The branch remains diagnostic-only
and is ready for the requested review of this exact readback assertion.

## Stale unmanaged DOM reference fix at comment 5590047374

The user runtime checkpoint passed save, reopen, exact native-manifest
readback, restart planning, note coexistence, and cleanup. Its only failure
was the unmanaged-frame assertion dereferencing `unmanaged.name` after the
original document had been closed. The diagnostic now stores the unmanaged
frame name and contents as plain strings before close, reacquires the frame
after reopen, and verifies its contents without touching the stale DOM object.

Validation:

- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/*.cjs`: **271/271 PASS**
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: **15/15 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (32 production files; diagnostic entrypoint PASS)**
- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/gate-0.cjs`: **10/10 PASS**
- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`: **10/10 PASS**
- `git diff --check`: **PASS**

The preload only exposes the existing Acorn runtime from outside the
repository and was removed after testing. Illustrator runtime was not run in
this cycle; production persistence/renderer wiring remains unchanged.

## Production-adjacent native persistence facade at comment 5590536962

Added the isolated ES3-compatible
`v2/formal-step2/area-text-native-persistence-facade.js`. It composes the
native store and optimistic note adapter without changing production
`persistence-adapter.jsx`, renderer orchestration, UI, or BridgeTalk.

The facade reads the current source contents/note and persisted manifest,
returns restart classification from the readback manifest, and updates only
when both the expected source contents and exact expected note snapshot match.
It performs exact post-write note/manifest readback and reports readback
mismatch as persistence failure without claiming rollback. FormalMulti and
unrelated note bytes remain owned by the existing store coexistence contract.

Focused facade coverage includes changed source/note rejection before mutation,
FormalMulti/unrelated-byte preservation, malformed residue fail-closed
behavior, write/readback mismatch, and restart classification from persisted
readback. The facade is intentionally not included by any production
entrypoint.

Validation:

- `node --test v2/formal-step2/tests/area-text-native-persistence-facade.cjs`: **6/6 PASS**
- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/*.cjs`: **278/278 PASS**
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: **16/16 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (33 production files; diagnostic entrypoint PASS)**
- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/gate-0.cjs`: **10/10 PASS**
- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`: **10/10 PASS**
- `git diff --check`: **PASS**

The Acorn preload was repository-external and removed after testing. No
Illustrator runtime, production wiring, merge, PR, or Issue operation was
performed. The facade remains a scaffold for later review.

## Isolated durable transaction coordinator at comment 5590689898

Added `v2/formal-step2/area-text-native-transaction-coordinator.js`. This
scaffold composes the existing pure `FormalAreaTextNative` transitions with
`FormalAreaTextNativePersistenceFacade`; it does not duplicate transaction
rules and is not wired into production persistence, renderer, UI, or
BridgeTalk.

The coordinator persists prepare, verified, activation with transition-derived
retirement, retirement completion, and final finish states. It passes exact
source contents and note snapshots to the facade, preserves request/revision
semantics, and returns the facade's persisted readback/restart classification.
Focused tests cover source/note concurrency rejection before mutation, stale
activation, repeated same request/plan, complete prepare-to-finish coexistence
with FormalMulti/unrelated bytes, and readback authority.

Validation:

- `node --test v2/formal-step2/tests/area-text-native-transaction-coordinator.cjs`: **6/6 PASS**
- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/*.cjs`: **285/285 PASS**
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: **17/17 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (34 production files; diagnostic entrypoint PASS)**
- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/gate-0.cjs`: **10/10 PASS**
- `git diff --check`: **PASS**

The Acorn preload was repository-external and removed after testing. No
Illustrator runtime, production wiring, merge, PR, or Issue operation was
performed.

## Durable native output identity at comment 5591368602

Added the isolated ES3-compatible
`v2/formal-step2/area-text-native-output-identity.js`. It owns immutable
`sourceFrameId` + `physicalId` only, under the distinct versioned
`[v2-formal-step2-native-output:v1]` namespace. It does not copy lifecycle,
active, pending, or retirement state; the source manifest remains the sole
authority for those fields.

The codec deterministically serializes/parses Unicode and delimiter-safe
values, ignores unrelated and legacy output notes, and fails closed on
unknown/malformed/duplicate markers. Its resolver returns exactly one match,
an explicit missing result, or a duplicate-identity failure without using
collection index or geometry inference. The native backend now carries
`sourceFrameId` in `backendSpec` and stamps the fresh AreaText candidate
immediately after AreaText creation and kind verification, before typography
or verification. Stamp/readback failure follows the existing candidate
disposal path. The diagnostic receiver loads the identity codec before the
backend.

Validation:

- `node --test v2/formal-step2/tests/area-text-native-output-identity.cjs`: **6/6 PASS**
- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/*.cjs`: **294/294 PASS**
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: **18/18 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (35 production files; diagnostic entrypoint PASS)**
- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/gate-0.cjs`: **10/10 PASS**
- `git diff --check`: **PASS**

The Acorn preload was repository-external and removed after testing. No
Illustrator runtime, production persistence/activation wiring, merge, PR, or
Issue operation was performed.

## Native output identity immutability at comment 5593019120

The public identity `write()`/`stamp()` contract is now fail-closed and
immutable. A missing native-output marker may be stamped once; an existing
marker succeeds only when both `sourceFrameId` and `physicalId` match exactly,
and repeated identical stamping is byte-identical. Any source or physical ID
replacement is rejected with `native-output-identity-immutable` before note
mutation. Lifecycle state remains outside the ruby note.

## Persisted-state authority hardening at comment 5590995892

The durable transaction coordinator now reads the current source through
`FormalAreaTextNativePersistenceFacade.read()` before every transition. It
requires the caller's expected source contents and exact note snapshot to
match that readback, derives the transition input solely from the persisted
native manifest, and uses `createManifest()` only for `begin` when no native
block exists. `verify`, `activate`, `retire`, and `finish` fail closed when no
persisted native manifest exists. The public coordinator API no longer accepts
an independently authoritative state argument.

Focused tests cover no-native begin, non-begin missing-manifest failure,
prepare-to-verified, complete persisted activation/retirement/finish,
concurrency rejection, persisted-manifest authority against caller state,
idempotent repeated begin, and readback authority. Transaction rules remain
inside `FormalAreaTextNative`; the coordinator only composes transitions with
the facade.

Validation:

- `node --test v2/formal-step2/tests/area-text-native-transaction-coordinator.cjs`: **8/8 PASS**
- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/*.cjs`: **287/287 PASS**
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: **17/17 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (34 production files; diagnostic entrypoint PASS)**
- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/gate-0.cjs`: **10/10 PASS**
- `git diff --check`: **PASS**

The Acorn preload was repository-external and removed after testing. No
Illustrator runtime, production wiring, merge, PR, or Issue operation was
performed.

## Runtime checkpoint follow-up at comment 5590047374

The user runtime checkpoint passed save, reopen, exact manifest readback,
restart planning, note coexistence, and cleanup. The only failure was the
unmanaged-frame assertion, which dereferenced the pre-close Illustrator DOM
object (`unmanaged.name`) after its document had been closed. The diagnostic
now stores the name and contents as plain strings before close, reacquires the
frame after reopen by the stored name, and verifies the reopened contents
without accessing the stale object. This remains a diagnostic-only fix; no
production persistence or renderer wiring was changed.

## Persisted manifest referential hardening at comment 5584422982

The isolated store now requires every active logical binding to have a
corresponding render record whose `physicalId` matches the map value and whose
`logicalSegmentId` matches the binding key. Persisted operation revisions are
also checked against the source-manifest transaction contract: `prepare` and
`verified` require `baseRevision === manifestRevision`, while `activated`
requires `manifestRevision === baseRevision + 1`.

Native namespace residue is fail-closed: an orphan native close marker,
unknown version, duplicate block, or broken block cannot be bypassed by
appending a new block. Existing FormalMulti and unrelated note bytes remain
untouched on valid replacement, and no production persistence or renderer path
is wired to this store.

## Isolated note restart scaffold at comment 5584247546

The one-shot diagnostic branch now contains an isolated ES3-compatible native
note store in `area-text-native-store.js` and a thin note adapter in
`area-text-native-note-adapter.js`. The store uses the exact namespace
`[v2-formal-step2-native:v1]` and a deterministic tagged serialization rather
than JSON, eval, or executable payloads. It persists the authoritative
`rendererMode`, `manifestRevision`, `activeBindings`, complete host-produced
`renderRecords` (identity, generation/request/version fields, auto/applied
geometry, tracking, font, justification, fit reason, and evidence),
`operation` request/base/phase/candidate state, and `retirementQueue`.

Reads and writes are strict: duplicate, unknown-version, broken, malformed,
non-finite, duplicate-identity, active/retirement-overlap, and incomplete
record/operation states fail closed. Existing note bytes, including the
FormalMulti block, are preserved byte-for-byte outside replacement of the
native block. Optimistic update requires the exact expected note and verifies
the exact written note plus parsed manifest readback.

Restart planning is deterministic and does not invent a request or candidate:

- `prepare` -> `reprepare`
- `verified` -> `reprepare-reverify`
- `activated` with retirement queue -> `cleanup-retirement`
- `activated` without queue -> `finish-operation`
- no operation with queue -> `cleanup-retirement`
- no operation and no queue -> `idle`
- malformed manifest -> `manual-recovery-required`

The store and adapter are intentionally not included by any production
entrypoint, persistence adapter, renderer, or activation path. This is a
restart/coexistence scaffold only; no Illustrator runtime evidence is claimed.

Exact validation for this dispatch (2026-09-08):

- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/area-text-native-store.cjs`: **6/6 PASS**
- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/area-text-native-store.cjs v2/formal-step2/tests/area-text-native-static.cjs`: **19/19 PASS**
- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/*.cjs`: **268/268 PASS**
- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/area-text-native.cjs`: **28/28 PASS**
- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/area-text-native-static.cjs`: **13/13 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (32 production files; diagnostic entrypoint PASS)**
- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/gate-0.cjs`: **9/9 PASS**
- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`: **9/9 PASS; generated BridgeTalk parse case PASS**
- `git diff --check`: **PASS**

No Illustrator runtime, production wiring, main-branch merge, PR, or Issue
operation was performed.

## Isolated save-close-reopen checkpoint preparation at comment 5589690815

Added the diagnostic-only entrypoint
`v2/diagnostics/Formal Step2 AreaText Native Persistence Check.jsx`.
It refuses to run when any existing document is open, creates a disposable
document, creates two uniquely named source TextFrames plus an unmanaged
foreign TextFrame, and writes the native manifest only through
`FormalAreaTextNativeNoteAdapter.update()` and
`FormalAreaTextNativeStore`. The fixtures contain exact unrelated prefix,
FormalMulti fixture bytes, and suffix bytes.

The primary fixture persists an `activated` manifest with a non-empty
`retirementQueue` and must report `cleanup-retirement` after reopen. The second
fixture persists a `verified` manifest and must report
`reprepare-reverify` with the same request and candidate plan. The entrypoint
saves under a uniquely named `Folder.temp` AI path, closes, reopens that exact
file, reacquires fixtures by deterministic names, validates note coexistence,
manifest fields, source contents, restart actions, and foreign-frame presence,
then closes and deletes only that temporary file. Cleanup failures report the
exact path; no user document is touched.

The entrypoint is intentionally not included by any production entrypoint and
does not modify `persistence-adapter.jsx`, renderer/orchestration, normal UI,
or activation. Illustrator runtime was **not run** in this preparation cycle.

Exact validation for comment `5589690815`:

- `node --require D:\\data\\codex\\node-path-preload.cjs --test v2/formal-step2/tests/*.cjs`: **270/270 PASS**
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: **14/14 PASS**
- `node --test v2/formal-step2/tests/gate-0.cjs`: **10/10 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (32 production files; diagnostic entrypoint PASS)**
- `git diff --check`: **PASS**

No Illustrator runtime, production wiring, main-branch merge, PR, or Issue
operation was performed.

## Source-manifest transaction hardening at 5583881276

Dispatch source: Issue #14 comment
https://github.com/kuniezu/illustrator_ruby_GUI/issues/14#issuecomment-5583881276

Pure/static changes on `v2/area-text-native-one-shot-diagnostic` now enforce
the operation `baseRevision` at activation and reject stale activation without
mutating the input manifest. `beginOperation()` rejects duplicate candidate
IDs and a changed candidate plan for an already-active request; repeating the
same request with the same candidate set is idempotent.

Activation now accepts explicit `null` binding values for logical removal and
automatically queues replaced/removed physical IDs for retirement. It rebuilds
the complete intended active map, verifies one-to-one physical ownership, and
rejects pre-existing active duplicates or active/retirement intersections.
Every candidate must be consumed by a matching owned record/binding, or be
explicitly listed in the discarded-candidate argument. Existing active
bindings may remain omitted when intentionally unchanged. All validation is
performed on a cloned state, preserving the original manifest on failure.

The pure recovery model is documented as `prepare` -> `verified` ->
`activated`, with retirement represented as cleanup-pending until successful
cleanup permits `finished/recoverable`. Cleanup failure never rolls active
state back. The manual-baseline design records the required
generation/version guards and auto/applied geometry fields for safe
`manualDeltaX` / `widthScale` persistence; no persistence wiring was added.

Exact validation for this dispatch:

- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/*.cjs`: **257/257 PASS**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/area-text-native.cjs v2/formal-step2/tests/area-text-native-static.cjs`: **36/36 PASS**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (30 production files; diagnostic entrypoint PASS)**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/gate-0.cjs`: **9/9 PASS**
- `git diff --check`: **PASS** (only Git line-ending normalization warnings)

No Illustrator runtime, production wiring, merge, PR, or Issue operation was
performed in this cycle.

## Recovery-state ownership hardening at 5584020006

Dispatch source: Issue #14 comment
https://github.com/kuniezu/illustrator_ruby_GUI/issues/14#issuecomment-5584020006

`finishOperation()` now refuses to clear an activated operation while
`retirementQueue` is non-empty, preserving the cleanup-pending state until
`markRetired()` succeeds. `markRetired()` now requires every requested ID to
already be in the retirement queue before deleting its render record, so an
unrelated or nonexistent record cannot be retired by caller input.

Explicit activation `retireIds` are retained for compatibility but must name a
known render record; replacement/removal IDs are still derived from active
binding changes. Unknown or foreign IDs fail before any state mutation.

The pure `recoveryState()` helper reports `prepare`, `verified`,
`activated-cleanup-pending`, `activated-clean`, and `finished/recoverable`
from manifest authority without adding a second mutable state field. Tests
cover both blocked and successful finish paths, queue ownership, unknown
retirement IDs, and unchanged input state on rejection.

Exact validation for dispatch `5584020006`:

- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/*.cjs`: **260/260 PASS**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/area-text-native.cjs`: **27/27 PASS**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/area-text-native-static.cjs`: **12/12 PASS**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (30 production files; diagnostic entrypoint PASS)**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/gate-0.cjs`: **9/9 PASS**
- `git diff --check`: **PASS** (only Git line-ending normalization warnings)

No Illustrator runtime, production persistence/renderer wiring, merge, PR, or
Issue operation was performed in this cycle. Deferred work remains real
persistence/restart wiring and production renderer integration.

## Retirement authority tightening at 5584132304

Dispatch source: Issue #14 comment
https://github.com/kuniezu/illustrator_ruby_GUI/issues/14#issuecomment-5584132304

`renderRecords` is inventory/history only; its presence does not authorize
retirement. Compatibility `retireIds` supplied to activation are now accepted
only when they are among the old active physical IDs displaced or removed by
the submitted binding transition. Replaced and removed IDs remain derived
automatically from that transition. Unrelated known historical records,
unknown IDs, and unchanged active bindings cannot be made cleanup-pending by
caller input. Rejections preserve the input manifest.

Exact validation for dispatch `5584132304`:

- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/*.cjs`: **261/261 PASS**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/area-text-native.cjs`: **28/28 PASS**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/area-text-native-static.cjs`: **12/12 PASS**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (30 production files; diagnostic entrypoint PASS)**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/gate-0.cjs`: **9/9 PASS**
- `git diff --check`: **PASS** (only Git line-ending normalization warnings)

No Illustrator runtime, persistence wiring, production renderer wiring, merge,
PR, or Issue operation was performed in this cycle.

## Source-manifest transaction hardening at 09ec083 follow-up

The pure manifest state now enforces the operation base revision at activation,
rejects duplicate candidate plans, and rejects a changed plan for an existing
request instead of silently retaining the old operation. Activation validates
the complete candidate plan: every candidate must have a matching owned
record/binding, or must be explicitly listed in the new discarded-candidate
argument. Existing active bindings may be omitted for unchanged retention.

Binding values of `null` explicitly express logical removal. Replaced and
removed physical IDs are added to the retirement queue; the final active map
is rebuilt and checked for one-to-one physical identity. Pre-existing active /
retirement intersections and active physical duplicates are rejected before
state changes. All failures operate on a clone, so the input manifest remains
unchanged.

The recovery model is intentionally pure/static in this cycle:

- `prepare`: operation exists, candidates are owned, and no activation has
  occurred; retrying the same request is allowed only with the same candidate
  set.
- `verified`: all candidate verification has completed; activation is the only
  path that can change active bindings.
- `activated`: the new active map is authoritative and old physical IDs are
  cleanup-pending; cleanup failure must not roll active state back.
- `finished/recoverable`: after cleanup succeeds, retirement records may be
  removed and the operation can be finished. A restart may safely retry
  preparation before activation or cleanup after activation, but must not
  infer a new plan from a stale request.

The manual-baseline persistence contract remains design-only. An annotation
baseline must carry `generationId`, `rendererVersion`, `geometryVersion`,
`autoLeft`, `autoWidth`, `appliedLeft`, and `appliedWidth`; captured
`manualDeltaX` and `widthScale` are reused only when all identity/version
guards match. Invalid or missing optional fields use safe defaults, and
Split/Merge do not guess inheritance without proven correspondence.

Runtime convergence recorded from the prior checkpoint: A/B/C/D/H passed;
C1/C2/D1-D4 visual checks passed; E exhausted the bounded tracking candidates
without a verified fit; AreaText construction/path lifecycle and self-next
unthreaded semantics were confirmed; manual baseline persistence remains
deferred to a later production/runtime cycle.

## C/D visual checkpoint and RenderSpec separator escaping at d55ef1e follow-up

C1/C2 and D1-D4 are now retained in the disposable diagnostic document until
an explicit ScriptUI visual-checkpoint dialog is dismissed. The dialog names
the multi-character FULLJUSTIFY, single-character CENTER, expected-fit, and
expected-nonfit fixtures. Only after continuation are all owned fixtures
cleaned; H then runs, and the existing final aggregated A-H report and
DONOTSAVECHANGES close path remain unchanged.

The diagnostic RenderSpec serializer now delegates string literal escaping to
the shared ES3-safe helper. Backslashes, quotes, CR/LF, U+2028, and U+2029 are
escaped without emitting raw JavaScript line separators. A regression test
covers Japanese text, quotes, backslashes, CR/LF, and both Unicode separators;
the generated H receiver parse and execution/return tests remain active.

Exact validation commands and results for this follow-up (Acorn 8.15.0 was
resolved through the existing external pinned `NODE_PATH` because this
environment has no local `node_modules/acorn`):

- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/*.cjs`: **249/249 PASS**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/area-text-native-static.cjs`: **12/12 PASS**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/area-text-native-diagnostic.cjs`: **15/15 PASS**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (30 production files; diagnostic entrypoint PASS)**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/gate-0.cjs`: **9/9 PASS**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`: **9/9 PASS** (the current Gate 0 runner reports all nine tests under this filter)
- `git diff --check`: **PASS** (only Git line-ending normalization warnings)

No Illustrator runtime, main-branch merge, production wiring, PR, or Issue
operation was performed.

## H sender timeout convergence at 1bf792d follow-up

The actual Probe H sender now uses the shared `sendWithTimeout()` flow. It
sets the documented BridgeTalk message `timeout` property before calling
`send(30)`. A synchronous result/error/timeout callback completes through the
existing exactly-once gate. If `send()` returns true without a callback, the
sender conservatively completes as `CAPABILITY_UNAVAILABLE` with
`result-unknown-after-send-timeout`; this does not claim that the receiver did
not execute. A false return remains distinct as `send=false`, and callbacks
arriving after completion are ignored. The diagnostic avoids appending a
pending line after a synchronous callback has already finalized the report.

Validation executed in this cycle:

- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/*.cjs`: **247/247 PASS**
- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/area-text-native-static.cjs`: **11/11 PASS**
- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (30 production files; diagnostic entrypoint PASS)**
- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/gate-0.cjs`: **9/9 PASS**
- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`: **9/9 PASS** (the current Gate 0 runner still reports all nine tests under this filter)
- `git diff --check`: **PASS** (only standard LF/CRLF conversion warnings)

The focused H sender-flow regression is included in the full suite and covers
synchronous result, synchronous error, send false, send true with no callback,
late result after unknown completion, timeout callback, and exactly-once
completion. Acorn 8.15.0 was used through the external pinned
`NODE_PATH=D:\\data\\codex\\acorn-runtime\\node_modules` because this
environment still has no local `node_modules/acorn`; this is reported as an
environment limitation, not the normal repository bootstrap path.

No Illustrator runtime, production wiring, main-branch merge, PR, or Issue
operation was performed in this cycle.

## NEXT WORK 5582080230 implementation cycle

Dispatch source: Issue #14 comment [5582080230](https://github.com/kuniezu/illustrator_ruby_GUI/issues/14#issuecomment-5582080230).
Target branch: `v2/area-text-native-one-shot-diagnostic`.
Base HEAD checked before work: `8432e1c9eb7e9c8f1864d2a68c961501391ea9df`.
Stop condition: commit and push this diagnostic branch, then stop. Illustrator
runtime, production wiring, main-branch merge, PR, and Issue close remain
forbidden.

Completed in this cycle:

- Added the shared threading identity classifier. It distinguishes no links,
  strict self-reference, and external previous/next links; getter failures are
  unverified rather than inferred from kind or contents.
- Updated backend observation and tracking retry behavior. Only line-count or
  line-coverage shortage is retryable; style, identity, threading, stability,
  range, and other failures stop tracking immediately.
- Made fresh AreaText disposal ownership-aware. The consumed construction path
  is not removed after successful frame removal; disposal reports
  `frameRemoved`, `pathAlreadyGone`, and `cleanupFailed` and remains idempotent.
- Made D diagnostic aggregation depend on actual create/observe/fit results,
  including expected-negative cases and unexpected-fit failures.
- Added H exactly-once completion protection, robust encoded receiver-field
  parsing, full identity expectations, and explicit verification-reason checks.
- Hardened received RenderSpec identity/readings and strict tracking policy.
- Added the requested continuation dispatch rule to repository-root AGENTS.md.

Validation executed in this cycle:

- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/*.cjs`: **245/245 PASS**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/area-text-native-static.cjs`: **11/11 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (30 production files; diagnostic entrypoint PASS)**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/gate-0.cjs`: **9/9 PASS**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`: **9/9 PASS**
- `git diff --check`: **PASS**

The Acorn runtime was the pinned 8.15.0 installation used by the repository's
ES3 gate in this environment. No Illustrator runtime was run. The following
Issue-deferred production-wiring blockers remain intentionally untouched:
manifest revision persistence re-read, binding removal transitions,
retirementQueue/active intersection hardening, candidate-plan reconciliation,
crash/save-close-reopen recovery, full coordinator persistence wiring, and
manual baseline persistence/runtime wiring.

## NEXT WORK 5582463018 correction cycle

Dispatch source: Issue #14 comment [5582463018](https://github.com/kuniezu/illustrator_ruby_GUI/issues/14#issuecomment-5582463018).
Target branch: `v2/area-text-native-one-shot-diagnostic`.
Base reviewed HEAD: `531ea69ae6df416c1a41854b9d226ff369a3257d`.
Stop condition: commit/push this branch and stop. No Illustrator runtime,
production wiring, merge, PR, or Issue operation.

Corrections in this cycle:

- `classifyThreading()` now accepts previous-none plus next-none or strict
  next-self as normal non-threaded AreaText, rejects previous-self and foreign
  previous/next links, and treats property readback exceptions as unverified.
- `verifyOneLineFit()` now distinguishes zero-lines (`fit-zero-lines`,
  non-retryable) from multi-line/coverage shortage. Tracking fallback cannot
  hide a height/zero-line failure.
- Probe E now builds its fit result through the shared
  `FormalAreaTextNative.verifyOneLineFit()` contract and preserves the actual
  retry reason rather than mapping every non-fit to coverage shortage.
- H now uses `FormalAreaTextNativeDiagnostic.hCompletion()` on the actual
  sender path. Result, error, timeout, send-false, and late-callback behavior
  converge through one exactly-once gate; the documented `bt.send(30)` timeout
  and `bt.onTimeout` remain the runtime no-callback mechanism.
- Regression tests now cover self-next acceptance, previous-self rejection,
  zero-lines no-retry, shared E fit semantics, and H completion cases.

Dependency reproducibility note: `package.json`/`package-lock.json` pin Acorn
8.15.0, but this environment has no local `node_modules/acorn` and npm is not
available. Validation therefore used the external pinned installation via
`NODE_PATH=D:\data\codex\acorn-runtime\node_modules`; this is reported as an
environment limitation, not as the normal repository bootstrap workflow.

Validation for this correction cycle:

- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/*.cjs`: **246/246 PASS**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/area-text-native-static.cjs`: **11/11 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (30 production files; diagnostic entrypoint PASS)**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/gate-0.cjs`: **9/9 PASS**
- `$env:NODE_PATH='D:\data\codex\acorn-runtime\node_modules'; node --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`: **9/9 PASS**
- `git diff --check`: **PASS**

No Illustrator runtime was run. The remaining deferred production-wiring
blockers from the prior dispatch remain intentionally untouched.

## A-H runtime evidence follow-up at edea280

The real Illustrator probe reported H failure because the generated receiver
IIFE ended with `result;` and did not return its value. The receiver now ends
with `return result;`. A mock ExtendScript execution test exercises both the
success path (`PASS:` with actual fields) and backend capability failure
(`CAPABILITY_UNAVAILABLE:`), rather than checking only source text.

The diagnostic geometry comparator is now an explicit ES3-safe numeric helper
with exact, in-tolerance, out-of-tolerance, and nonnumeric tests. Comparison
errors are recorded as geometry reasons instead of being silently converted
to false. The probe now reports previous/next frame readability, self
identity, kind, and contents. It does not relax the unresolved nextFrame
production assumption. Tracking reports each trial's tracking, fit,
retryable, and stop reason. Path cleanup diagnostics identify post-frame path
invalidation separately from a successful path removal. F fixture IDs were
made descriptive without changing manifest semantics.

Exact validation commands and results for this follow-up:

- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/*.cjs`: **241/241 PASS**
- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/area-text-native-static.cjs`: **11/11 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (30 production files; diagnostic entrypoint PASS)**
- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/gate-0.cjs`: **9/9 PASS**
- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`: **matching production BridgeTalk ES3 test PASS**
- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/area-text-native-diagnostic.cjs`: **H generated receiver execution/return-value and geometry tests PASS**
- `git diff --check`: **PASS**

No Illustrator runtime, main-branch merge, production wiring, PR, or Issue
operation was performed.

## Real ES3 parser authority at 7d6206b follow-up

The ES3 grammar gate now uses the fixed development dependency Acorn 8.15.0
as its parse authority with the verified configuration
`ecmaVersion: 3`, `sourceType: "script"`, and `allowReserved: "never"`.
Node `vm.Script` is no longer used as ES3 grammar evidence. The existing
conservative ExtendScript checks remain supplementary. `package.json` and
`package-lock.json` pin Acorn 8.15.0 with registry integrity metadata.

Acorn behavior was executed before adoption: unquoted reserved properties and
object trailing commas fail, while quoted reserved properties, bracket access,
`new Foo()`, `delete obj.foo`, ordinary ES3 objects, and array trailing commas
pass. Production sources, faithful expanded diagnostic includes, the
production generated BridgeTalk body, and the generated H receiver body all
use the real parser gate. The normal CLI continues to report the denylist
separately as `ExtendScript API/syntax denylist`.

Because this desktop runtime has no npm executable, tests used the isolated
Acorn 8.15.0 package with `NODE_PATH=D:\\data\\codex\\acorn-runtime\\node_modules`;
the committed package and lockfile make the dependency reproducible through
the normal Node package workflow.

Exact validation commands and results for this follow-up:

- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/*.cjs`: **239/239 PASS**
- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/area-text-native-static.cjs`: **11/11 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (30 production files; diagnostic entrypoint PASS)**
- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/gate-0.cjs`: **9/9 PASS**
- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`: **matching production BridgeTalk ES3 test PASS**
- `$env:NODE_PATH='D:\\data\\codex\\acorn-runtime\\node_modules'; node --test v2/formal-step2/tests/area-text-native-diagnostic.cjs`: **H generated receiver ES3 test PASS**
- `git diff --check`: **PASS**

No Illustrator runtime, main-branch merge, production wiring, PR, or Issue
operation was performed.

## ES3 grammar gate hardening at bd69731 follow-up

The diagnostic JSX reserved-word parse regression is now covered by an
explicit ES3 grammar gate, separate from the API/syntax denylist. The gate
uses the repository's dependency-free conservative parser: ordinary syntax is
parsed with Node's script parser after directives are removed, while the
ExtendScript ES3 subset rejects reserved-word property literals, object
trailing commas, getters/setters, method/property shorthand, destructuring,
optional chaining, arrow functions, template literals, let/const, and class
syntax. Array trailing commas and quoted/bracketed reserved properties remain
valid fixtures. Acorn was checked but is not installed in this runtime, so no
untracked external dependency was added.

The gate now covers all formal-step production sources, the faithful expanded
diagnostic entrypoint and its includes, the production generated BridgeTalk
body, and the generated H receiver body. The normal denylist CLI now reports
its evidence separately as `ExtendScript API/syntax denylist` and includes the
diagnostic entrypoint check.

Exact validation commands and results for this follow-up:

- `node --test v2/formal-step2/tests/*.cjs`: **239/239 PASS**
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: **11/11 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (30 production files; diagnostic entrypoint PASS)**
- `node --test v2/formal-step2/tests/gate-0.cjs`: **9/9 PASS**
- `node --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`: **matching parse test PASS**
- `git diff --check`: **PASS**

No Illustrator runtime, main-branch merge, production wiring, PR, or Issue
operation was performed.

## ExtendScript parse compatibility fix at 239ea64 follow-up

The A-H probe's `runF` no longer uses the reserved-word property literal
`{ new: ... }`; it assigns the candidate record through
`candidateRecords["new"]`, preserving the same manifest semantics. A
diagnostic-specific compatibility scan now checks the probe JSX for reserved
word property literals, in addition to the existing production API/syntax
denylist. A regression fixture proves that `{new:1}` is rejected while the
current probe passes. No A-H semantic contract was changed.

Exact validation commands and results for this follow-up:

- `node --test v2/formal-step2/tests/*.cjs`: **236/236 PASS**
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: **11/11 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (30 production files)**
- `node --test v2/formal-step2/tests/gate-0.cjs`: **6/6 PASS**
- `node --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`: **6/6 PASS**
- `git diff --check`: **PASS**

No Illustrator runtime, main-branch merge, production wiring, PR, or Issue
operation was performed.

## A-H final semantic closure at cde4bbc follow-up

H now transports the complete RenderSpec object literal rather than a pipe
protocol. The sender uses `FormalAreaTextRenderSpec.create`, `validate`, and
`backendSpec`; the receiver loads the same RenderSpec/native/backend source
files, validates the received object, converts it, and runs
`prepareCandidate`, `verifyCandidate`/`tryTracking`, and `disposeCandidate`
against a disposable document. The generated receiver body has a dedicated
Node parse test. BridgeTalk result, error, and documented `onTimeout` all use
the same completion path, and the final report is deferred until completion.

E uses the diagnostic helper's first-fit/non-retryable algorithm and performs
runtime observation checks for kind, orientation, threading, and stability. F
uses the existing `FormalAreaTextNative` manifest transitions. G performs
disposable frame/textPath readback and uses `captureManualAdjustment` for
version mismatch. Summary statuses come from recorded outcomes and cleanup is
idempotent.

Exact validation commands and results for this follow-up:

- `node --test v2/formal-step2/tests/*.cjs`: **234/234 PASS**
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: **10/10 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (30 production files)**
- `node --test v2/formal-step2/tests/gate-0.cjs`: **6/6 PASS**
- `node --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`: **6/6 PASS**
- `git diff --check`: **PASS**

The H-specific generated-body test is
`generated H receiver body parses with full RenderSpec payload`. No
Illustrator runtime, main-branch merge, production wiring, PR, or Issue
operation was performed.

## A-H final review hardening at cde4bbc follow-up

H no longer converts the payload to a pipe protocol. The sender creates and
validates a complete RenderSpec, serializes every contract field, and the
generated receiver validates the received object before `backendSpec`
conversion. The receiver loads the existing native core and backend via
`$.evalFile`, then uses `prepareCandidate`, `verifyCandidate`/`tryTracking`,
and `disposeCandidate` on a disposable document only. `onResult`, `onError`,
and the documented BridgeTalk `onTimeout` path all converge through one
completion gate; the final report is not built while H is pending and timeout
reports `CAPABILITY_UNAVAILABLE reason=callback-timeout`.

E now uses the same retry semantics as the production scaffold through the
pure diagnostic helper tests; F executes the existing
`FormalAreaTextNative` manifest state transitions; G performs disposable
frame/textPath readback and uses `captureManualAdjustment` for version
mismatch; and the H generated body has its own Node parse test.

Exact validation commands and results for this follow-up:

- `node --test v2/formal-step2/tests/*.cjs`: **234/234 PASS**
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: **10/10 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (30 production files)**
- `node --test v2/formal-step2/tests/gate-0.cjs`: **6/6 PASS**
- `node --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`: **6/6 PASS**
- `git diff --check`: **PASS**

The H-specific generated body parse is included in the full suite as
`generated H receiver body parses with full RenderSpec payload`. No
Illustrator runtime, main-branch merge, production wiring, PR, or Issue
operation was performed.

## Final generated BridgeTalk parse validation at c967cb9

Executed at the unchanged review HEAD:

`node --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`

Result: **6/6 PASS**. The generated BridgeTalk body parse case, named
`production generated BridgeTalk body parses as a script`, passed. This was a
validation-only run; no production code or runtime wiring changed.

## H receiver hardening at 80cd705 follow-up

H now selects the first readable non-empty font name from `app.textFonts` at
diagnostic runtime. If no font is available, the diagnostic completes with
`CAPABILITY_UNAVAILABLE reason=no-font-available`; the selected font name is
included in the H detail. The receiver returns a `PASS:` body containing the
received schema, renderer/version identities, request and segment identities,
reading, final geometry, verification result, and readback font name. The
sender parses that body and compares the expected values before reporting H
PASS; capability and unexpected bodies do not become PASS. The obsolete pipe
protocol H functions were removed. The generated receiver parse test remains
in place.

Exact validation commands and results for this follow-up:

- `node --test v2/formal-step2/tests/*.cjs`: **235/235 PASS**
- `node --test v2/formal-step2/tests/area-text-native-static.cjs`: **10/10 PASS**
- `node v2/formal-step2/extendscript-compat-lint.cjs`: **PASS (30 production files)**
- `node --test v2/formal-step2/tests/gate-0.cjs`: **6/6 PASS**
- `node --test v2/formal-step2/tests/gate-0.cjs --test-name-pattern "production generated BridgeTalk body parses as a script"`: **6/6 PASS**
- `git diff --check`: **PASS**

No Illustrator runtime, main-branch merge, production wiring, PR, or Issue
operation was performed.
