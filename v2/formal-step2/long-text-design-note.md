# Gate D long-text UI design note

The legacy `Illustrator Ruby GUI.jsx` uses `getSelectedTextFrames()` only to bind
the source frame. It then keeps character selection in the UI through
`selectedCharIndices`, updates buttons with `updateSelection()`, and redraws a
bounded page with `renderPage()`. This avoids relying on Illustrator preserving a
partial text selection while a ScriptUI window is open.

The v2 workflow should reuse that interaction boundary while keeping its own data
and persistence contracts:

- **Extractor / occurrences:** read the Area Text contents once and create one
  occurrence for every contiguous kanji run. Each occurrence retains `start`, `end`,
  and `surface`; repeated surface forms remain separate occurrences.
- **Grouping and segmentation:** identical surfaces may share a UI lexeme group for
  compact display, but the occurrence list is never deduplicated. `splitAt` creates
  contiguous source ranges from one occurrence and `mergeAdjacent` combines only
  contiguous ranges. These are logical source edits, not render-line SplitHints.
  Each replacement carries a lineage list so ancestry is explicit rather than
  inferred from matching text.
- **Readings:** a group has a default reading propagated to all member occurrences,
  with a future per-occurrence override. Applying a reading later creates/updates
  each selected v2 Annotation using its occurrence range and source-relative anchor.
- **Visibility and enablement:** UI visibility is independent from render
  `enabled`; hiding a row must not suppress its annotation.
- **Persistence:** the multi store will persist occurrence ranges, group membership,
  readings, review state, and source snapshot. It will not persist x/y geometry.
- **Planning/rendering:** an occurrence remains one logical Annotation. Current line
  geometry is observed at render time and may produce multiple Render Segments for a
  wrapped occurrence, preserving the existing Gate C/D ownership rules.

For example, `水戸家侍衆` can be split into `水戸家 | 侍 | 衆`, and a longer
`水戸藩士市田九衛門隆正` can retain readings only on `市田` and `隆正`. A
non-contiguous merge is rejected; render-line SplitHints remain a separate layer.

The first pure slice below intentionally stops at extraction and grouping. It is
small enough to test without Illustrator and leaves the ScriptUI pagination layer
replaceable.
