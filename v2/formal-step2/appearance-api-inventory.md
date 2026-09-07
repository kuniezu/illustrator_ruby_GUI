# Appearance API inventory (exploratory pass)

This pass is exploratory and is not runtime-proven. The table records APIs actually referenced by the production adapter and persistence path; a static parse or Node mock is not evidence that Illustrator supports the operation.

| API / property / enum | File / function | R/W | Purpose | PointText / AreaText | Contract status | Static status | Runtime needed? | Destructive risk | Fallback |
|---|---|---|---|---|---|---|---|---|---|
| `textFrames.add()` | `adapter.jsx` / `measure`, `reconcile`, `restoreManaged` | R/W | Temporary measurement and managed ruby creation | both; ruby target is exploratory AreaText | documented-looking, version not checked | parsed/linted | yes | creates/removes text frames | failure becomes unresolved/rollback |
| `TextFrameItem.kind` / `TextType.AREATEXT`, `TextType.POINTTEXT` | `adapter.jsx` / `observe`, `reconcile`, `measure` | R/W | Entry guard, ruby box kind, point measurement probe | AreaText production boundary; PointText probe only | enum/property documentation review pending | parsed/linted | yes | wrong kind can affect layout | retain existing item and record diagnostic |
| `textPath` | diagnostics and Gate C probes | R/W in diagnostics only | Research reflow evidence | AreaText | unknown for this workflow | static probe present | yes | diagnostics restore in finally | probe is manual-only |
| `width`, `height` | `adapter.jsx` / `reconcile`, rollback restore | R/W | Ruby AreaText box and rollback snapshot | AreaText target | Illustrator behavior/version unverified | parsed/linted | yes | bad dimensions can move/clip ruby | retain logical state; transaction rollback |
| `left`, `top`, `position` | `adapter.jsx` / `reconcile`, rollback; `measure` probe | R/W | Auto placement, vertical reset, manual delta basis | both; source position is not geometry anchor | documented-looking, semantics need runtime | parsed/linted | yes | stale output placement | rollback and no guessed geometry |
| `contents` | `adapter.jsx` / `observe`, `measure`, `reconcile`, rollback | R/W | Source snapshot, reading text, measurement | both | documented | parsed/linted | yes | source/output mutation | snapshot/readback and rollback |
| `textRange` | `adapter.jsx` / `observe`, `measure`, `reconcile` | R | Character and line access | both | documented-looking | parsed/linted | yes | missing range blocks render | unresolved |
| `characterAttributes.textFont` | `adapter.jsx` / `measure`, `reconcile`, rollback | R/W | Source fallback and explicit ruby font | both | property documented-looking; font lookup unverified | parsed/linted | yes | invalid font assignment | source/default font fallback |
| `characterAttributes.size` | `adapter.jsx` / `measure`, `reconcile`, rollback | R/W | Base measurement and explicit ruby size | both | documented | parsed/linted | yes | bad size changes geometry | 0.5 base-size default |
| `paragraphAttributes.justification` | `adapter.jsx` / `reconcile`, rollback | R/W | Full justification for ruby AreaText | AreaText target | enum behavior unverified | parsed/linted | yes | unsupported enum may fail transaction | catch and retain diagnostic |
| `Justification.FULLJUSTIFY` | `adapter.jsx` / `reconcile` | R | Full-justify enum | AreaText | enum name requires official/runtime review | parsed/linted | yes | render failure | no guessed replacement |
| `AreaText` box width after `contents` change | `adapter.jsx` / `reconcile` | W then R | Auto width plus persisted widthScale | AreaText only | behavior unverified | static presence only | yes | width/contents ordering may drift | transaction rollback |
| `duplicate()` / `createOutline()` | `adapter.jsx` / `outlineLines` | R/W temporary | Source geometry observation | source AreaText | existing runtime dependency | parsed/linted | yes | temporary object residue | cleanup failure blocks destructive cleanup |
| `remove()` | `adapter.jsx` / reconcile, rollback, probes | W | Stale/temporary output cleanup | managed AreaText and probes | documented-looking | parsed/linted | yes | destructive | ownership-scoped transaction only |
| `note` | `adapter.jsx`, `persistence-adapter.jsx`, stores | R/W | Managed ownership and logical persistence | source and ruby TextFrames | documented | parsed/linted | yes | wrong note can orphan/retire output | readback and rollback |
| `BridgeTalk`, `$.evalFile`, `File.exists/open/close` | `persistence-adapter.jsx` | R/W | Host runtime loading and transaction dispatch | host bridge; not text-kind specific | ExtendScript/BridgeTalk assumptions | generated body parses/lints | yes | host failure before persistence | fail closed; report persistence failure |

## State now persisted

`annotation.appearance` contains `fontName`, `fontSize`, `manualDeltaX`, `widthScale`, and `gapEm`. Old 16-field annotation records are accepted and normalized to safe defaults. New records append five fields; no migration rewrite is performed.

## Rollback coverage

The adapter snapshot now records managed item `kind`, `contents`, font name, size, tracking, paragraph justification, width, height, `left`, and `top`. Logical appearance fields remain in the bundle and are persisted by `FormalMultiStore`. Manual delta and width scale are pure state in this pass; automatic DOM extraction of a user drag is not runtime-proven.

## Research TODO / explicit unknowns

- Verify the official Illustrator contract and version behavior for AreaText `kind`, `width`/`height`, `textPath`, `textRange.lines`, font lookup, and `Justification.FULLJUSTIFY`.
- Confirm that changing `contents` does not reset AreaText paragraph justification or box geometry.
- Confirm whether `width` and `height` are writable on the created ruby frame and whether setting `kind` before/after `contents` changes behavior.
- Determine a supported, ownership-safe way to observe a user's horizontal adjustment without treating renderer-generated placement as manual input.
- Confirm source glyph top and the `.15em` gap against actual Illustrator coordinate behavior.
- Confirm rollback restoration of font, justification, box dimensions, and identity on partial failure.
- Confirm missing font behavior on the target Illustrator installation.

No item in this inventory is considered runtime verified by this exploratory pass.
