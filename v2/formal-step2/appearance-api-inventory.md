# Appearance API inventory (exploratory pass)

This pass is exploratory and is not runtime-proven. The table records APIs used by the current adapter plus the APIs proposed for an AreaText-native renderer, then classifies them against the Adobe Illustrator Scripting Guide. A static parse or Node mock is not evidence that Illustrator supports the operation.

The proposed architecture, capability probe, generation lifecycle, fit proof, and implementation slices are documented in [area-text-native-design.md](area-text-native-design.md).

Official references used:

- [TextFrameItem](https://ai-scripting.docsforadobe.dev/jsobjref/TextFrameItem/)
- [PageItem](https://ai-scripting.docsforadobe.dev/jsobjref/PageItem/)
- [TextFrameItems.areaText](https://ai-scripting.docsforadobe.dev/jsobjref/TextFrameItems/)
- [Working with text frames](https://ai-scripting.docsforadobe.dev/scriptingJavascript/workingWithTextFrames/)
- [TextPath](https://ai-scripting.docsforadobe.dev/jsobjref/TextPath/)
- [PathItems.rectangle](https://ai-scripting.docsforadobe.dev/jsobjref/PathItems/)
- [ParagraphAttributes](https://ai-scripting.docsforadobe.dev/jsobjref/ParagraphAttributes/)
- [TextFonts](https://ai-scripting.docsforadobe.dev/jsobjref/TextFonts/)
- [TextFont](https://ai-scripting.docsforadobe.dev/jsobjref/TextFont/)
- [CharacterAttributes](https://ai-scripting.docsforadobe.dev/jsobjref/CharacterAttributes/)
- [Lines](https://ai-scripting.docsforadobe.dev/jsobjref/Lines/)
- [TextRange](https://ai-scripting.docsforadobe.dev/jsobjref/TextRange/)
- [Scripting constants](https://ai-scripting.docsforadobe.dev/jsobjref/scripting-constants/)

| API / property / enum | File / function | R/W | Purpose | PointText / AreaText | Contract status | Static status | Runtime needed? | Destructive risk | Fallback |
|---|---|---|---|---|---|---|---|---|---|
| `textFrames.add()` | `adapter.jsx` / `measure`, `reconcile`, `restoreManaged` | R/W | Temporary measurement and current rough ruby creation | both; official docs show generic add, not conversion contract | documented method; does not establish AreaText kind | parsed/linted | yes | creates/removes text frames | failure becomes unresolved/rollback |
| `TextFrameItem.kind` / `TextType.AREATEXT`, `TextType.POINTTEXT` | `adapter.jsx` / `observe`, `reconcile`, `measure` | R/W in code; official property is read-only | Entry guard, current rough kind assignment, point probe | AreaText boundary; PointText probe only | **officially read-only**; `kind=AREATEXT` is rejected as a supported conversion design | parsed/linted only | yes | wrong kind or failed assignment can abort render | do not rely on assignment; use fresh `areaText()` replacement after design review |
| `TextFrameItem.convertPointObjectToAreaObject()` | future alternative; not production-used | method returns `TextFrameItem` | PointText → AreaText conversion | PointText input; AreaText result | **documented conversion method; official support high** | not wired | yes | mutates existing object; identity, path ownership, and rollback semantics are unknown | keep old object until conversion/readback is proven; fresh replacement remains safer |
| `textFrames.areaText(pathItem[, orientation...])` | not yet production-used; recommended replacement path | create | Official AreaText construction | AreaText only | **documented and preferred** | not yet wired | yes | path/frame ownership and orphan cleanup | create new path/frame; remove new objects only after failure |
| `pathItems.rectangle(top,left,width,height[,reversed])` | not yet production-used; recommended replacement path | create | Fresh rectangular text path | AreaText only | documented | not yet wired | yes | orphan PathItem if areaText fails | retain old ruby; cleanup only newly created path/frame |
| `textPath` | diagnostics and Gate C probes; future replacement | R/W properties vary | Path geometry and reflow evidence | AreaText/path text; invalid for PointText | documented as associated path; ownership lifecycle not specified in cited page | static probe present | yes | deleting path may affect associated text | do not delete until new frame/readback ownership is proven |
| `TextPath.width`, `TextPath.height`, `TextPath.left`, `TextPath.top` | current adapter uses frame width/height; future replacement candidate | R/W in inventory candidate | Box geometry and position through associated path | AreaText/path text | properties documented as Number; write/reflow effect still runtime-only | static references only | yes | wrong path dimensions can reflow/clip | new path only; rollback removes new frame/path |
| `TextFrameItem.width`, `TextFrameItem.height` (inherited `PageItem`) | `adapter.jsx` / `reconcile`, rollback restore | R/W in current code | Current rough box sizing | AreaText target | **documented inherited `PageItem` properties; API existence and read/write surface are documented. Whether they control AreaText box/reflow, and their priority versus `textPath.width`/`height`, is runtime-only** | parsed/linted only | yes | wrong authority or geometry write can misplace ruby | compare frame and textPath readback; use only the authority proven on target Illustrator |
| `left`, `top`, `position` | `adapter.jsx` / `reconcile`, rollback; `measure` probe | R/W | Auto placement, vertical reset, manual delta basis | both; source position is not geometry anchor | documented-looking, semantics need runtime | parsed/linted | yes | stale output placement | rollback and no guessed geometry |
| `contents` | `adapter.jsx` / `observe`, `measure`, `reconcile`, rollback | R/W | Source snapshot, reading text, measurement | both | documented | parsed/linted | yes | source/output mutation | snapshot/readback and rollback |
| `textRange` | `adapter.jsx` / `observe`, `measure`, `reconcile` | R | Character and line access | both | documented-looking | parsed/linted | yes | missing range blocks render | unresolved |
| `TextRange.start`, `TextRange.end`, `TextRange.contents`, `TextRange.lines` | future `fit`/`verify`; current observation helpers | R | One-line fit proof and local UTF-16 span validation | AreaText target; source and ruby ranges | documented reference surfaces; coordinate correspondence remains runtime-only | not wired for native renderer | yes | false fit proof can activate overflowed ruby | fail closed as unresolved |
| `characterAttributes.textFont` | `adapter.jsx` / `measure`, `reconcile`, rollback | R/W | Source fallback and explicit ruby font | both | property documented-looking; font lookup unverified | parsed/linted | yes | invalid font assignment | source/default font fallback |
| `characterAttributes.size` | `adapter.jsx` / `measure`, `reconcile`, rollback | R/W | Base measurement and explicit ruby size | both | documented | parsed/linted | yes | bad size changes geometry | 0.5 base-size default |
| `characterAttributes.tracking` | `adapter.jsx` / `fit`, `reconcile`; future bounded fallback | R/W | Bounded negative tracking fallback only | AreaText primary; PointText compatibility candidate | documented surface; monotonic fit behavior runtime-only | parsed/linted | yes | typography distortion or non-convergence | bounded search, then render failure |
| `paragraphAttributes.justification` | `adapter.jsx` / `reconcile`, rollback | R/W | Full justification for ruby AreaText | AreaText target | documented writable ParagraphAttributes property | parsed/linted | yes | unsupported paragraph object may fail transaction | catch and retain diagnostic |
| `paragraphAttributes.singleWordJustification` | future `prepare`/`verify` probe | R/W candidate | Define one-word/full-justify behavior | AreaText target | documented candidate; desired value and interaction runtime-only | not wired | yes | unexpected one-word spacing | preserve default unless probe proves policy |
| `Justification.FULLJUSTIFY` | `adapter.jsx` / `reconcile` | R | Full-justify enum | AreaText | enum type is documented; exact desired value/last-line behavior needs runtime confirmation | parsed/linted | yes | one-line/last-line behavior may differ | record readback; no typography claim |
| `AreaText` box width after `contents` change | `adapter.jsx` / `reconcile` | W then R | Auto width plus persisted widthScale | AreaText only | no official guarantee found that contents preserves geometry/justification | static presence only | yes | width/contents ordering may drift | fresh replacement and readback |
| `duplicate()` / `createOutline()` | `adapter.jsx` / `outlineLines` | R/W temporary | Source geometry observation | source AreaText | existing runtime dependency | parsed/linted | yes | temporary object residue | cleanup failure blocks destructive cleanup |
| `remove()` | `adapter.jsx` / reconcile, rollback, probes | W | Stale/temporary output cleanup | managed AreaText and probes | documented-looking | parsed/linted | yes | destructive | ownership-scoped transaction only |
| `parent`, `layer` | future creation/ownership verification | R | Confirm new frame/path ownership and cleanup scope | AreaText and PathItem | documented object relationships; exact areaText path lifecycle runtime-only | not wired | yes | orphan cleanup or foreign deletion | retain old; cleanup only operation-created objects |
| `uuid` | future generation diagnostics only | R | Optional physical identity evidence | PageItem subclasses | documented on current Illustrator reference; version availability/runtime persistence required | not wired | yes | treating UUID as durable logical identity | use note/managed metadata as authoritative |
| `note` | `adapter.jsx`, `persistence-adapter.jsx`, stores | R/W | Managed ownership and logical persistence | source and ruby TextFrames | documented | parsed/linted | yes | wrong note can orphan/retire output | readback and rollback |
| `BridgeTalk`, `$.evalFile`, `File.exists/open/close` | `persistence-adapter.jsx` | R/W | Host runtime loading and transaction dispatch | host bridge; not text-kind specific | ExtendScript/BridgeTalk assumptions | generated body parses/lints | yes | host failure before persistence | fail closed; report persistence failure |

## State now persisted

`annotation.appearance` contains `fontName`, `fontSize`, `manualDeltaX`, `widthScale`, and `gapEm`. Old 16-field annotation records are accepted and normalized to safe defaults. New records append five fields; no migration rewrite is performed.

## Rollback coverage

The adapter snapshot now records managed item `kind`, `contents`, font name, size, tracking, paragraph justification, width, height, `left`, and `top`. Logical appearance fields remain in the bundle and are persisted by `FormalMultiStore`. Manual delta and width scale are pure state in this pass; automatic DOM extraction of a user drag is not runtime-proven.

## Official API findings and design consequences

1. `TextFrameItem.kind` is documented as read-only and its type is `TextType`; the current `item.kind = TextType.AREATEXT` line is therefore an unsupported conversion assumption. It must not be treated as an official conversion API.
2. Adobe's official creation examples use `pathItems.rectangle(...)` followed by `textFrames.areaText(pathItem)`. This is the first-choice construction for a fresh ruby AreaText; the rectangle/path ownership must still be proven on the target Illustrator.
3. `TextFrameItem.textPath` is the associated path for area/path text. The cited documentation does not state that `areaText()` consumes, transfers, or permits independently deleting the PathItem. Path ownership is therefore unknown and cleanup must be transactional.
4. `TextPath.width` and `TextPath.height` are documented numeric properties. Separately, `TextFrameItem` inherits the documented read/write `PageItem.width` and `PageItem.height` surface; this establishes API existence, not AreaText reflow authority. Which surface actually controls the AreaText box, and its priority versus `textPath.width`/`height`, remains runtime-only.
5. `ParagraphAttributes.justification` is documented and typed as `Justification`. `FULLJUSTIFY` is a documented enum family member in the scripting constants, but one-line and last-line behavior is not established by the docs.
6. `TextFonts.getByName(name)` returns a `TextFont`; `TextFont.name`, `family`, and `style` are read-only. Assignment to `characterAttributes.textFont` is shown in official examples. Missing-font exception/fallback remains runtime-only.
7. `TextFrameItem.convertPointObjectToAreaObject()` is a documented PointText-to-AreaText conversion method returning a `TextFrameItem`. Its official support and low path-construction complexity make it a valid independent alternative, but mutation, object identity, path ownership, and rollback semantics remain runtime-unknown; its destructive transaction safety is therefore worse than fresh replacement. No precedence over fresh replacement is concluded here.
8. The native design must separate documented existence from safe use: `TextFrameItem.kind` readback proves type only; it does not prove box geometry, one-line fit, justification behavior, or cleanup ownership. Those are separate readback gates.

## Replacement alternative matrix

| Option | Official support | Rollback safety | Ownership complexity | Reflow reliability | ExtendScript | Complexity | Decision |
|---|---|---|---|---|---|---|---|
| A. `add()` then `kind=AREATEXT` | contradicted by read-only `kind` docs | low | low initially, unsafe semantics | unknown | syntax-compatible | low | rejected |
| B. `convertPointObjectToAreaObject()` | documented conversion method; official support high | lower than fresh replacement until mutation/rollback is proven | low path-construction complexity; identity/path semantics unknown | potentially strong, runtime-only | compatible API surface | medium | valid alternative; no precedence decision |
| C. fresh PathItem + `textFrames.areaText()` | documented creation path | high if new objects are tracked | medium; path lifecycle must be proven | strongest documented construction candidate | compatible API surface | medium | preferred construction |
| D. reuse existing AreaText | kind/path are already valid | medium | high for stale ownership and reflow | may preserve hidden state, not yet proven | compatible | medium | investigate only after runtime evidence |
| E. fresh AreaText replacement + old retire | uses C and isolates old object | highest | medium/high, explicit new path/frame ownership | strongest transaction boundary | compatible | high | preferred overall lifecycle |

## Recommended replacement transaction

Keep old managed output untouched; create a fresh rectangular PathItem and AreaText; set contents, character attributes, paragraph attributes, path geometry and position; set ownership note and read back kind/text/font/size/justification/path dimensions; only then retire old output. On any failure, remove only the newly created frame/path and retain old output. Do not let `inspect()` treat the new object as an existing reusable segment before its ownership note and verification are complete; use a pending/new identity or an operation-local created list.

## Research TODO / explicit unknowns

- Verify target-version runtime behavior for fresh `areaText()` creation, associated PathItem parent/ownership, and whether the path remains addressable after creation.
- Verify target-version runtime behavior for `convertPointObjectToAreaObject()`, including returned kind, object identity, associated path ownership, and rollback after partial failure.
- Verify target-version runtime behavior for `TextPath.width`/`height` and whether they are the actual reflow authority after contents changes.
- Verify target-version runtime behavior for AreaText `kind` readback; do not attempt a write as a probe.
- Confirm that changing `contents` does not reset AreaText paragraph justification or box geometry.
- Confirm whether `width` and `height` are writable on the created ruby frame and whether setting `kind` before/after `contents` changes behavior.
- Determine a supported, ownership-safe way to observe a user's horizontal adjustment without treating renderer-generated placement as manual input.
- Confirm source glyph top and the `.15em` gap against actual Illustrator coordinate behavior.
- Confirm rollback restoration of font, justification, box dimensions, and identity on partial failure.
- Confirm missing font behavior on the target Illustrator installation.
- Compare `PageItem.width`/`height` and `TextPath.width`/`height` by a readback-only geometry probe; do not select an authority from documentation alone.
- Verify `singleWordJustification`, `FULLJUSTIFY`, and last-line behavior with one-character, one-word, and multi-character Japanese readings.
- Verify whether a fresh AreaText's `textRange.lines` and `TextRange.start/end` can prove a non-threaded one-line fit without relying on an undocumented overflow flag.

No item in this inventory is considered runtime verified by this exploratory pass.
