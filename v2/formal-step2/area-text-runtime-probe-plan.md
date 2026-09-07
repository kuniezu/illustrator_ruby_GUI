# AreaText-native runtime probe plan

Status: diagnostic specification only. This file defines the minimum Illustrator runtime evidence required before production AreaText-native implementation is authorized.

Related decision: `area-text-native-decision.md`.

## Probe principles

- Use one diagnostic `.jsx` entry point and one disposable Illustrator document created by the probe.
- Never mutate the user's working document for capability testing.
- Every fixture starts from a fresh object set. Do not reuse a candidate whose geometry/style was mutated by a previous fixture.
- Every created frame/path/group must be operation-owned and counted before/after cleanup.
- Never use `kind = TextType.AREATEXT`.
- Never use an undocumented `overflows` property.
- Do not treat `app.redraw()` as a documented reflow-complete guarantee; use it only as an observation aid and reacquire DOM ranges.
- Log exact API readbacks and a small number of user-visible checks in one final report.
- If cleanup is uncertain, report failure and retain only objects whose ownership cannot be safely disproven; do not broaden deletion.

## Common diagnostics

For every relevant candidate record:
- fixture ID and step
- Illustrator `app.version` / `buildNumber` if available
- `$.version` / `$.os`
- frame typename/kind/orientation
- parent/layer identity evidence
- frame UUID if available
- frame note / operation ID
- frame left/top/width/height readback
- textPath left/top/width/height readback
- path-point anchors when needed
- contents
- textRange start/end/contents
- lines.length
- each line start/end/contents
- font name / size
- horizontalScale / verticalScale
- tracking
- paragraph justification
- singleWordJustification
- glyph-scaling min/desired/max
- letter-spacing min/desired/max
- word-spacing min/desired/max when tested
- autoLeading / leading when relevant
- previousFrame / nextFrame presence when available
- exception category/message sanitized for report
- created frame/path counts before and after disposal

## Fixture A — fresh AreaText creation and ownership

Purpose: prove the native creation lifecycle and cleanup boundary.

Steps:
1. Create a new document owned by the probe.
2. On a known layer, create a rectangular PathItem with explicit top/left/width/height.
3. Record path identity/parent/counts.
4. Call `textFrames.areaText(path)`.
5. Verify returned object is AreaText and horizontal.
6. Record returned frame parent, UUID, textPath and collection counts.
7. Set a short known reading and basic font/size.
8. Read back all identity and geometry evidence.
9. Remove the frame.
10. Record whether the original PathItem reference remains valid and whether any separate/orphan path remains.

Failure-injection subcase:
- force failure after rectangle creation but before successful frame verification;
- confirm only operation-created objects are cleaned.

PASS requires a reproducible, ownership-safe create/dispose contract for the target runtime.

## Fixture B — geometry authority comparison

Purpose: determine readback relationships and explicitly avoid selecting a mutation authority by assumption.

Create three otherwise identical fresh AreaText candidates.

B1 fresh geometry authority:
- create rectangle at width W1;
- create AreaText;
- create a second candidate directly at width W2;
- compare frame/textPath bounds, path points and line coverage.

B2 PageItem write candidate:
- create at W1;
- write frame/PageItem width to W2;
- reacquire frame/textPath/range/lines.

B3 TextPath write candidate:
- create at W1;
- write textPath width to W2;
- reacquire frame/textPath/range/lines.

Optional B4 only if required:
- setEntirePath/path-point change on a fresh candidate.

Production acceptance does not require B2/B3/B4 to work. The initial native renderer may PASS using fresh B1 geometry only. B2/B3 are evidence for manual-readback/optimization decisions.

## Fixture C — justification/composer policy

Purpose: establish the supported one-line Japanese ruby policy.

Use at least:
- multi-character hiragana reading
- a reading treated as one word by Illustrator if distinguishable
- one-character hiragana reading

Compare policies on fresh candidates:

C1 baseline full justify:
- `justification = FULLJUSTIFY`
- record default single-word/glyph/letter/word settings.

C2 explicit single-word full justify:
- `justification = FULLJUSTIFY`
- `singleWordJustification = FULLJUSTIFY`
- glyph scaling fixed 100/100/100.

C3 composer letter-spacing policy:
- same as C2;
- set a bounded min/desired/max letter-spacing policy;
- keep glyph scaling 100/100/100;
- record whether the composer fits the reading without explicit character tracking.

C4 one-character policy:
- compare FULLJUSTIFY behavior with explicit CENTER policy;
- user-visible check should prefer undistorted center if full justify gives no meaningful two-edge distribution.

C5 contents reassignment:
- after successful paragraph setup, change contents and then reapply/reacquire attributes according to the proposed production ordering;
- verify which values persist and which must always be reasserted.

PASS selects an explicit paragraph policy. Do not infer support from enum write success alone.

## Fixture D — fit evidence versus visible overflow

Purpose: verify that range/line coverage is a safe fit capability for the supported target conditions.

Create fresh non-threaded rectangular AreaText cases:

D1 confirmed one-line fit
- short reading, sufficient width/height.

D2 two-line wrap
- same font/size with deliberately narrow box.

D3 visible trailing overset
- geometry chosen so trailing reading is visibly hidden/red-overflow in UI.

D4 strong/complete hidden tail
- stronger shortage if reproducible.

D5 height shortage
- sufficient width but insufficient height.

For each case compare user-visible result with:
- frame/range contents equality
- range start/end
- lines.length
- line start/end/contents
- previousFrame/nextFrame
- repeated reacquisition after final style/geometry write

Candidate production fit proof is accepted only if D1 passes and D2–D5 do not falsely satisfy the same proof.

Do not use outline cluster count as the primary fit proof.

## Fixture E — composer-first and bounded tracking fallback

Purpose: decide whether explicit tracking is needed after the native paragraph composer.

Use a reading/box pair that does not fit under neutral policy but is near the boundary.

E1 composer-first:
- apply selected C policy with glyph scaling 100/100/100 and bounded letter spacing;
- test fit evidence.

If E1 does not fit, test fresh/reinitialized candidates or fully reset state for:

E2 tracking sequence:
- 0
- -25
- -50
- -75
- -100

For each value:
- apply from neutral baseline, never cumulative
- redraw only as observation aid
- reacquire textRange and lines
- record full fit proof and style readback

PASS policy:
- first verified fit wins;
- if observations are non-monotonic/unstable, return `layout-observation-unstable` and do not introduce binary search;
- if -100 still fails, return layout failure.

One-character, font failure and height shortage are excluded from tracking-fit success.

## Fixture F — generation / manifest transaction

Purpose: validate copy-on-write recovery semantics without depending on destructive rollback.

Use at least two logical segments and physical IDs.

F1 prepare failure:
- old active remains in source manifest;
- candidate creation/style/fit fails before activation;
- only candidate is disposed.

F2 verify failure:
- candidate exists but readback fails;
- old active remains.

F3 activation success:
- write new activeBindings plus retirementQueue in one source-store update;
- read back exact requestId/baseRevision/new binding before deleting old.

F4 retire partial failure:
- simulate/force a failure after one old object is retired and before another retires;
- new active manifest remains authoritative;
- failed old stays in retirementQueue / cleanup-pending.

F5 retry/idempotency:
- repeat same requestId after uncertain result;
- reconcile source state instead of creating another generation.

F6 candidate/active coexistence:
- ensure normal inspect/reuse selects only the physical object referenced by activeBindings and ignores operation candidates.

PASS requires no logical-ID-only destructive cleanup and no speculative rollback after activation.

## Fixture G — manual adjustment baseline

Purpose: prove segment-level manual delta/width-scale capture without drift.

G1 initial render:
- store autoLeft/autoWidth and appliedLeft/appliedWidth.

G2 user-like horizontal movement:
- move the active ruby by a known delta;
- read actual position;
- compute `manualDeltaX = actualLeft - previousAutoLeft`.

G3 user-like width change:
- modify box width through whichever readback/edit surface is selected by the probe/UI contract;
- example auto 40 -> manual 44, expect widthScale 1.10.

G4 reflow/new auto geometry:
- newAutoWidth 50 -> requested final width 55;
- fresh candidate generation should reproduce the preserved scale.

G5 unchanged save:
- read actual geometry again;
- verify renderer/DOM numeric tolerance does not create a second manual adjustment.

G6 reopen/re-observe if feasible:
- ensure persisted baseline and active physical record are sufficient to avoid drift.

If segment/source correspondence changes, do not infer override inheritance by array index.

## Fixture H — BridgeTalk end-to-end RenderSpec

Purpose: close the known class where pure appearance state exists but host proxy drops fields.

Through the actual generated BridgeTalk host body, send at least two distinct RenderSpecs with deliberately different:
- font where available
- font size
- widthScale
- manualDeltaX
- reading
- logical segment ID
- request/generation metadata

Host creates disposable fresh AreaText candidates, reads back the resulting state, and returns a structured result.

PASS requires each distinct input field to reach the host-side operation or return an explicit unsupported/failure reason. No palette-side precomputed success may substitute for host readback.

Unknown timeout/result must be resolvable by request identity/source state in the later production transaction design.

## Visual checks to batch for the user

The diagnostic should minimize manual steps. One run should produce a single report plus a small visual checklist:

1. D1 appears one line with full reading visible.
2. D3/D4 visually show overflow where the coverage diagnostic says fit=false.
3. C2/C3 multi-character ruby visually uses intended both-ends distribution without glyph distortion.
4. C4 one-character ruby is acceptably centered and not stretched.
5. G manual shift/width example behaves as logged.

Everything else should be machine-reported.

## Runtime decision outputs

The probe should end with explicit decisions, not only raw logs:

- `native_creation`: PASS/FAIL
- `path_lifecycle`: classified result
- `fresh_rectangle_geometry`: PASS/FAIL
- `frame_width_write`: SUPPORTED / NOT_REQUIRED / UNRELIABLE
- `textPath_width_write`: SUPPORTED / NOT_REQUIRED / UNRELIABLE
- `box_readback_authority`: selected read surface or unresolved
- `justify_policy`: selected configuration or unresolved
- `one_char_policy`: CENTER / other explicit result
- `fit_coverage_capability`: PASS/FAIL
- `composer_fit`: PASS/INSUFFICIENT/UNSTABLE
- `tracking_fallback`: REQUIRED/NOT_REQUIRED plus accepted floor
- `generation_manifest_model`: PASS/FAIL for diagnostic transaction
- `manual_baseline_readback`: PASS/FAIL
- `bridgetalk_spec_delivery`: PASS/FAIL
- `cleanup`: PASS/FAIL

Production implementation starts only after required native capabilities are PASS and every unresolved item has an explicit fail-closed behavior.

## A-H one-shot implementation status

The companion diagnostic `../diagnostics/Formal Step2 AreaText Native Probe.jsx`
now runs A-H in one disposable-document session and aggregates the result into
one copyable ScriptUI text area. A-E observe fresh AreaText candidates and
record compact geometry, contents, line, typography, composer, and bounded
tracking evidence. F is an isolated copy-on-write mock transaction. G records
the pure manual-baseline calculation. H attempts an actual BridgeTalk request
to a disposable receiver document and reports delivery/readback separately.

The implementation is diagnostic-only, not production-ready. `PASS` in the
static test suite means only that the diagnostic structure is present and
parseable. Illustrator-dependent results remain `MANUAL_REQUIRED` or
`CAPABILITY_UNAVAILABLE` until the user runs the single probe and reviews the
report. No source document, source note, production manifest, or unmanaged
object is used by the diagnostic.

| Case | STATIC/PURE PROVEN | RUNTIME TO VERIFY | MANUAL VISUAL CHECK | CAPABILITY DEPENDENT |
|---|---|---|---|---|
| A | disposable creation/cleanup path | path/frame lifecycle | none | areaText path ownership |
| B | fresh geometry comparison fixtures | frame/textPath readback authority | geometry placement | writable/readback surfaces |
| C | explicit enum policy path | composer readback | Japanese justification | composer behavior |
| D | coverage cases and line capture | overflow/height evidence | visible overflow | documented API capability |
| E | bounded tracking sequence | trial readback and fit | typography appearance | tracking necessity |
| F | copy-on-write mock | none | none | none |
| G | baseline formulas | actual width/left authority | manual edit behavior | DOM geometry surface |
| H | generated disposable receiver body | BridgeTalk delivery/readback | none | BridgeTalk target/session |
