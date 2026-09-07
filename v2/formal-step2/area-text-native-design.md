# AreaText-native renderer design brief

Status: research/design only. This document does not authorize production implementation or Illustrator runtime execution. The current renderer remains the implementation under test; this is the proposed next architecture.

## Decision boundary

Normal ruby output should be created as AreaText from the beginning. PointText is not a silent per-segment fallback. It is a separately selected compatibility renderer used only when an environment capability probe proves that the AreaText contract cannot be established. A single segment that cannot fit, resolve its font, or prove geometry remains a render failure/unresolved state and retains the last validated AreaText.

The logical pipeline stays unchanged:

`logical occurrence -> Annotation -> Render Segment -> renderer plan -> physical generation`

Renderer-specific DOM state must not become a second logical truth. `annotation.appearance` stores user intent; physical generation metadata stores the last verified DOM realization.

## Proposed renderer interface

Both renderers consume the same immutable render plan and return the same result shape. The shared layer owns annotation identity, segment identity, appearance normalization, persistence, generation metadata, ownership scope, and diagnostics. The renderer owns only DOM creation, style/geometry application, fit verification, activation, retirement, and cleanup.

Suggested operations:

1. `capabilityProbe(context)` — create a disposable rectangular path and AreaText, exercise only documented operations, read back the contract, and remove every object created by the probe.
2. `prepare(plan, operation)` — create or select pending physical objects without touching active objects.
3. `fit(candidate)` — apply bounded fitting policy and return a proof or a named failure.
4. `verify(candidate, expected)` — read back kind, contents, range, style, path geometry, and ownership note.
5. `activate(prepared)` — persist/read back the active generation marker before retirement.
6. `reuse(active, plan)` — only for unchanged, validated AreaText whose readback still matches the plan.
7. `replace(active, plan)` — fresh AreaText replacement for content, geometry, font/size, or other changes that invalidate readback.
8. `retire(old)` — remove only the previously active generation after activation succeeds.
9. `cleanupPending(operation)` — retry or report operation-created objects that could not be removed; never broaden cleanup to the whole source frame.
10. `rollback(snapshot)` — restore logical persistence separately from DOM transaction state.

## AreaText-native lifecycle

### Unchanged segment

Reuse only when the active note has the same logical `renderSegmentId`, generation, contents, appearance, and verified geometry contract. Re-observe before reuse; a matching note alone is not proof that the object is still valid.

### Changed segment

The preferred lifecycle is:

1. Keep the old validated AreaText untouched.
2. Create a fresh `PathItem` rectangle through `pathItems.rectangle(...)`.
3. Create AreaText through `textFrames.areaText(pathItem)`.
4. Set contents, reacquire `textRange`, set font/size/tracking policy, set paragraph attributes, then set/read geometry.
5. Verify kind, contents, range span, style, path/frame geometry, and managed pending metadata.
6. Persist and read back the active generation marker.
7. Retire the old generation only after all required checks succeed.
8. On failure, remove only the new frame/path; retain old output and report render failure.

`convertPointObjectToAreaObject()` is a documented alternative, but it mutates an existing object. Its identity, path ownership, and rollback behavior are runtime-only, so it is not preferred over fresh replacement yet. `add()` followed by writing `kind` is rejected because `kind` is documented read-only.

## Compatibility renderer

`AreaTextRenderer` and `PointTextCompatibilityRenderer` should implement the same plan/result interface. They may share logical and persistence code but must not share a hidden fallback branch.

AreaText capability failure may select compatibility mode for the environment or document according to the probe policy. Examples are failure to create AreaText, failure to read back its kind, failure of required geometry readback, or failure of the selected justification contract. The capability result needs version/document context and a reason, and must be cached only after a disposable transaction is clean.

Individual failures are not capability failures. A missing font, an unprovable fit, a height shortage, or a single segment that cannot fit must return render failure and preserve the last validated AreaText. It must not silently create PointText. Mixed AreaText/PointText output should be disallowed in normal mode; if compatibility mode is selected, its ownership and generation metadata must be explicit so a document cannot silently drift between renderer policies.

## Capability probe

The smallest useful probe is a disposable, non-threaded rectangular AreaText:

1. create rectangle path;
2. call `textFrames.areaText(path)`;
3. read `kind` and `textPath`;
4. set/read a short contents string;
5. reacquire `textRange` and inspect finite `start`, `end`, `contents`, and `lines`;
6. set/read font, size, justification, and (if selected) tracking;
7. change geometry through one candidate authority at a time and read back both frame and path dimensions;
8. remove the created frame and verify the path is not left orphaned, or record the ownership result;
9. on every exception, remove only objects known to have been created.

The probe must never use `kind = TextType.AREATEXT` as a conversion test, must not use a source frame, and must not infer overflow from an undocumented property. Capability success means the exact contract used by the renderer was observed, not merely that an object could be created.

## Box and reflow authority

The documentation establishes API existence but not which writable surface governs AreaText reflow in the target Illustrator. The following candidates remain deliberately unselected:

| Candidate | Known contract | Design use | Required runtime evidence |
|---|---|---|---|
| `PageItem.width/height` | inherited documented numeric properties | frame-level geometry candidate | write/read changes the AreaText box and reflows contents |
| `TextPath.width/height` | documented numeric properties on associated path | path-level geometry candidate | write/read is stable and controls the intended box |
| `TextPath.left/top` or frame position | documented position surfaces | placement candidate | coordinate relation remains stable after contents/reflow |
| rectangle creation geometry | documented path creation arguments | initial box only | resulting frame/path ownership and dimensions are stable |
| `setEntirePath()` / `pathPoints` | documented path operations with geometry risk | fallback only if necessary | safe ownership and no accidental topology change |

The probe should alter one surface per fresh candidate, record before/after frame and textPath bounds, contents, lines, and kind, then discard it. No single authority should be chosen from static documentation alone.

## Contents, justification, and fit

Proposed setting order for a fresh candidate:

1. create box and AreaText;
2. assign requested contents;
3. reacquire `textRange`;
4. assign font and size;
5. assign tracking policy;
6. assign `paragraphAttributes.justification` and explicitly record the `singleWordJustification` policy if used;
7. apply verified box geometry and position;
8. reacquire all ranges and perform final readback.

The fit proof is conservative. For a standalone, non-threaded one-line ruby, require requested contents equality at frame and range level, finite integer span, local span equal to the requested string length, exactly one line, line local start zero, line local end equal to the validated source end, line contents equal to requested contents, and stable repeated observation after final style/geometry writes. Failure to prove fit is not proof of overset and must not trigger destructive cleanup.

`FULLJUSTIFY` and `singleWordJustification` behavior for one-character and Japanese last-line cases is runtime-only. Do not claim that a setting gives desired typography until those cases are observed.

## Bounded tracking fallback

Box width plus justification is the primary authority. Tracking is an explicitly bounded fallback only when natural content does not fit and all other required readbacks are valid. Start at zero, move toward a named conservative floor, and use a bounded search only if observed width/fit is monotonic in the target environment. If monotonicity is not established, use a small fixed sequence and fail closed. There is no evidence here to preserve the old `-400` as a universal policy; the floor and search must be configuration and diagnostics, not a hidden guarantee.

One-character readings, font lookup failure, height shortage, and unstable line observations each have explicit failure results. None selects PointText automatically.

## Generation and persistence

Logical identity and physical generation are separate:

- `annotationId` and `renderSegmentId` remain logical identities;
- `generationId` identifies one physical realization;
- note metadata includes source frame, segment, generation, renderer kind, and active/pending state;
- `active` is the only generation eligible for normal inspect/reuse;
- `pending` is operation-scoped and excluded from normal plans;
- `cleanup-pending` records an old/new object that could not be retired or removed.

For multiple segments, prepare all new objects first. If any candidate fails, remove only the operation-created set and keep every old active object. If activation succeeds but retirement fails, persist cleanup-pending and make retry idempotent; do not create a second active generation on retry. The source logical note and renderer result must remain separate: persistence success does not imply render success, and render failure must not roll back a logical state that was already durably read back.

## Manual adjustment model

`annotation.appearance` owns user intent and persisted values such as `manualDeltaX` and `widthScale`. A physical generation record owns observation baselines:

- `previousAutoLeft`
- `previousAutoWidth`
- `appliedLeft`
- `appliedWidth`
- `generationId`
- geometry/appearance version

Capture manual adjustment only from an active generation that the renderer did not just write, and only when the previous baseline matches. Otherwise retain the prior values and report unknown rather than interpreting renderer output as a user drag. Reflow applies `newAutoLeft + manualDeltaX` and `newAutoWidth * widthScale`; invalid or non-positive values fall back to zero delta and scale one.

## Current rough implementation to isolate

The next implementation should remove or quarantine, behind tests and explicit capability policy:

- `item.kind = TextType.AREATEXT` as conversion;
- PointText-based managed ruby creation in the normal path;
- tracking as the primary width authority;
- broad old-output deletion/reconstruction as rollback;
- any appearance fields that do not cross the host persistence boundary;
- manual-adjustment helpers without persisted baselines;
- treating `frame.width/height` as the sole AreaText authority;
- duplicate fallback guards and diagnostic/probe paths that can be reached by production rendering.

## Vertical slices for implementation

1. Native renderer: one fresh rectangle + `areaText()`, readback, and operation-local cleanup.
2. Justification and conservative one-line fit proof.
3. Bounded tracking fallback with explicit non-monotonic failure.
4. Pending generation metadata and single-segment activation/rollback.
5. Multi-segment prepare/activate/retire and cleanup-pending retry.
6. Appearance persistence and BridgeTalk host-path integration.
7. Manual delta/width-scale observation and reflow application.
8. Capability cache and explicitly selected PointText compatibility renderer.

Each slice needs pure planning tests, static/generated-body tests, and one batched runtime checkpoint. No slice should silently broaden ownership or alter logical occurrence resolution.

## Runtime-only research checklist

- Does `areaText()` consume or retain the rectangle PathItem, and what is its parent after creation?
- Which of frame geometry and textPath geometry actually controls the AreaText box and reflow?
- Does contents assignment preserve box geometry, justification, and range behavior?
- What are one-line/full-justify/last-line results for Japanese readings?
- Can the proposed range/line observations prove fit on the target Illustrator without an overflow flag?
- What happens on font lookup/assignment failure and on insufficient height?
- Does conversion mutate identity and path ownership in a rollback-safe way?
- Can pending and active same-segment objects coexist without inspect/reconcile seeing pending as active?
- Does remove() clean the associated path, and how are orphan paths detected?

No answer above is runtime-proven by this design pass.
