# AreaText-native convergence decision

Status: pre-implementation design decision. This file consolidates the independent Luna/Codex design, Astra independent review, and ChatGPT cross-check. It does not by itself authorize Illustrator runtime execution or production behavior changes.

Baseline for convergence: `be51232b24e437af33c8566c6f0797a6b24e4aa2`.

## 1. Standard renderer

The v2 normal renderer is AreaText-native from initial creation.

- Create a rectangular `PathItem` at the final intended geometry.
- Create ruby output through `textFrames.areaText(pathItem)`.
- Do not create PointText and convert it in the normal path.
- Do not write `TextFrameItem.kind`; it is read-only.
- PointText compatibility is deferred. Keep a future backend boundary, but implement it only if a supported target environment actually fails the native AreaText capability contract.
- A single segment fit/font/geometry failure is not a reason to switch renderer mode.

## 2. Fresh replacement policy

Managed ruby is treated as a versioned render artifact rather than a mutable long-lived layout object.

- Unchanged, validated AreaText may be retained after readback verification.
- A segment whose final render specification changes is prepared as a fresh AreaText candidate.
- Typical fresh-replacement triggers: reading, final box geometry, source reflow result, font, font size, widthScale, justification/spacing policy, or logical Split/Merge ownership.
- Metadata-only changes may reuse the existing AreaText when they do not change layout or fit semantics.
- Manual movement that has already been incorporated into the requested state may be retained after verification; a newly requested position/width is rendered fresh in the initial implementation.

Initial production code should not depend on resizing an existing AreaText box to cause reflow. The final rectangle geometry is calculated before creation and passed to `pathItems.rectangle(...)`. `PageItem.width/height` and `TextPath.width/height` remain readback/probe surfaces until target-runtime behavior proves a safe optimization.

## 3. Renderer responsibilities

Keep the renderer backend small.

Shared planner/coordinator owns:
- occurrence / Annotation / Render Segment planning
- normalized appearance intent
- logical IDs
- source persistence
- active manifest
- operation/request identity
- retirement queue
- diagnostics and result model

AreaText backend owns:
- candidate creation
- content and typography application
- box creation/placement
- fit verification
- actual appearance/geometry readback
- candidate disposal

Suggested backend surface:

```text
prepareCandidate(spec, context)
verifyCandidate(candidate, spec)
readActualAppearance(item)
disposeCandidate(candidate)
```

Activation and retirement stay outside the backend.

## 4. Source manifest is the active authority

Do not duplicate active/pending truth in every ruby note.

Conceptual source render state:

```text
renderState
  rendererMode
  manifestRevision
  activeBindings: logicalSegmentId -> physicalId
  renderRecords: physicalId -> verified render record
  operation: requestId / baseRevision / candidateIds
  retirementQueue: physicalId[]
```

Ruby note stores immutable physical identity and ownership evidence, for example:

```text
schema
sourceFrameId
annotationId
logicalSegmentId
physicalGeneration
operationId
```

A physical ruby is active only when the source manifest points to its physical ID. A candidate is pending because it belongs to the current operation and is not active; no separate `pending=true` flag is required as authoritative state. A retired object is one that is no longer active and is queued for cleanup.

Same logical segment old/new generations may coexist temporarily. Same physical ID on multiple actual objects is a collision and must fail closed.

## 5. Transaction boundary

Use a copy-on-write transaction:

1. Register request/base manifest state.
2. Build every changed candidate without modifying active objects.
3. Apply content, typography and final geometry.
4. Prove fit and read back required state.
5. If every required candidate verifies, write the new `activeBindings` and `retirementQueue` to the source store and read them back.
6. Only after successful activation, retire old generations.
7. Remove successfully retired IDs from the queue.
8. If retirement fails, preserve the new active generation and keep `cleanup-pending`; do not attempt a speculative full rollback.

Failure before activation removes only operation-owned candidates and retains old active output.

If activation/BridgeTalk outcome is unknown, re-read request/manifest state. Do not assume cancellation and do not immediately generate another generation for the same request.

## 6. AreaText box authority

Initial implementation authority is the geometry used to create the fresh rectangle.

Production v1 of the native renderer should not require writes to:
- `PageItem.width/height`
- `TextPath.width/height`
- `TextPath.setEntirePath()`
- direct path-point mutation

These may be measured in diagnostics and later used for optimizations or manual-width observation only after runtime evidence.

This avoids a previously observed class of behavior where changing frame width did not reliably cause expected AreaText reflow.

## 7. Typography policy

Normal multi-character ruby target:
- horizontal AreaText
- full justification
- single-word behavior explicitly probed/configured
- horizontal/vertical glyph scaling fixed to 100% unless a future explicit feature says otherwise
- paragraph indents/spacing normalized so inherited paragraph styles do not silently change usable box geometry

One-character ruby is an explicit exception candidate: center the glyph in the box rather than stretching the glyph or inventing artificial tracking to touch both edges.

### Composer-first fit policy

Before making manual tracking the main solution, probe Illustrator's justified-text composer.

J1 candidate:
- `FULLJUSTIFY`
- appropriate `singleWordJustification`
- glyph scaling 100/100/100
- bounded paragraph letter-spacing policy
- explicit word-spacing policy only if it affects the no-space Japanese reading case

J2 fallback:
- if J1 cannot produce a verified one-line fit, try bounded character tracking on the fresh candidate only
- initial finite sequence: `0, -25, -50, -75, -100`
- first verified fit wins
- do not accumulate from the previous render
- do not use `noBreak=true` to manufacture a false one-line result
- do not solve font failure, height shortage, one-character layout, or unstable observations with tracking

The `-100` floor is a provisional product policy, not an Adobe-guaranteed readability/safety limit. Binary search is deferred until monotonicity is runtime-proven.

## 8. Fit proof

Creation as AreaText is not success. Final success requires a conservative fit/readback proof after the last geometry and style write.

For initial supported ruby output require at least:
- standalone, non-threaded, horizontal, rectangular AreaText
- requested reading contains no line break
- `frame.contents === requestedReading`
- reacquired `textRange.contents === requestedReading`
- finite integer range start/end with internally consistent span
- exactly one line
- that line starts at the full range start and ends at the full range end
- line contents equal the requested reading
- font, size, scale, paragraph policy and final geometry read back as expected
- observation is reacquired after final style/geometry changes

No undocumented `overflows` property is used.

`hidden not proven` is not equivalent to `fit proven`. Zero lines, multiple lines, partial coverage or unstable observation return named render failures.

## 9. Manual adjustment state

Manual adjustment is segment-aware.

Annotation-level state may hold requested font/size/gap policy and common defaults. A Render Segment may hold overrides:
- `manualDeltaX`
- `widthScale`

Verified render record stores:
- `previousAutoLeft`
- `previousAutoWidth`
- `appliedLeft`
- `appliedWidth`
- physical generation
- geometry version
- renderer version
- last successful appearance/readback

Capture rules:

```text
manualDeltaX = actualLeft - previousAutoLeft
widthScale   = actualBoxWidth / previousAutoWidth
```

- If actual geometry is within tolerance of the prior applied geometry, preserve the existing delta/scale instead of creating drift from DOM rounding.
- Update baselines only after successful render activation.
- Do not infer manual edits when generation/geometry/renderer versions do not match the baseline.
- When reflow/Split/Merge changes segment identity, inherit a segment override only when correspondence to the same source interval is provable; otherwise preserve it as unresolved adjustment state rather than guessing.

## 10. Capability boundary

Capability checks are layered:

1. version/build: cache key only, never sufficient for PASS
2. application-session probe: disposable document, native required API contract
3. document entry: layer/lock/mode/source identity/coordinate prerequisites
4. operation/segment: actual font, box, fit, ownership and cleanup

Native capability should require fresh rectangle creation, AreaText creation, contents/style write/readback, one-line coverage evidence, placement readback and clean disposal.

PointText compatibility is not implemented in the initial native path. A future compatibility backend may be added only for a real environment-level capability failure. Mixed renderer output in one normal document is not supported by default.

## 11. BridgeTalk is an early slice

Do not leave BridgeTalk/persistence integration until the end.

The first end-to-end native slice must prove that different explicit appearance values in a RenderSpec reach the host-side AreaText creation/readback path. This specifically guards against pure helpers passing while production host proxies drop appearance or generation fields.

DOM objects never cross BridgeTalk payloads; use validated serialized data only.

Unknown timeout/result state is reconciled through request identity and source manifest readback rather than assumed cancellation.

## 12. Existing code to remove or isolate during implementation

Remove from native output path:
- `item.kind = TextType.AREATEXT`
- rollback `restored.kind = ...`
- PointText-based managed ruby creation
- width-difference-to-tracking fitting as primary authority
- legacy `-400/+400` native fitting policy
- delete-all-and-`add()` rollback reconstruction
- stale-output deletion before manifest activation
- direct reliance on frame width writes as AreaText reflow authority

Fix rather than discard:
- appearance fields lost in BridgeTalk plans/proxy
- manual adjustment helpers lacking persisted baselines
- duplicated appearance normalization/default paths

Keep separate from managed-ruby renderer:
- existing source geometry observation/no-guess logic
- source measurement PointText if still required by the geometry service
- hidden-evidence logic
- ownership validation and durable retirement concepts

Do not confuse temporary PointText used for source measurement with a PointText ruby renderer.

## 13. Implementation order after runtime decisions

1. Pure RenderSpec/result/failure model and source manifest schema.
2. One batched diagnostic probe to close the required DOM contracts.
3. BridgeTalk end-to-end: one fresh AreaText segment, explicit appearance, readback, failure cleanup.
4. Justification, one-character policy, box-height/vertical-gap policy and fit evidence.
5. Composer-first spacing policy; bounded tracking fallback only if required.
6. Single-segment activation and idempotent retry.
7. Multi-segment activation, retirement, cleanup-pending and failure injection.
8. Manual baseline persistence and unchanged-object reuse.
9. Session capability cache.
10. PointText compatibility backend only if a real supported environment requires it.

## 14. Still runtime-only

The diagnostic probe must determine, without making production depend on unnecessary mutation APIs:
- rectangle/`areaText()` path ownership and cleanup lifecycle
- exact usable coordinate/height behavior for fresh ruby AreaText
- frame vs textPath dimension readback relationship
- one-line Japanese `FULLJUSTIFY` and `singleWordJustification`
- composer letter-spacing policy versus explicit tracking fallback
- one-character center behavior
- whether the proposed range/line coverage reliably corresponds to visible full text in the target Illustrator
- re-observation timing after style changes
- manual box-width readback source and tolerance
- generation candidate coexistence/cleanup behavior

The accompanying runtime-probe plan defines the minimum fixture set.
