# Formal Multi Step 2 runtime checkpoint

1. Open and save an Illustrator document containing one horizontal AreaText TextFrame. Select the whole TextFrame and run `Formal Multi Step2.jsx`.
2. Confirm the nonmodal palette lists each contiguous Kanji occurrence with its source range. Select a row, enter a hiragana reading, change `enabled`, and confirm the reading.
3. For a longer Kanji run, use `局所分割` with UTF-16 boundaries, assign readings only to intended local units, and use `隣接結合` to verify local merge.
4. Click `保存`, close the palette, run the same JSX again, and confirm occurrence state and readings are restored. Save again and check that managed ruby count, position, width, tracking, and reading do not drift.
5. Disable or clear one occurrence and confirm only its managed ruby is removed. Confirm foreign/unmanaged objects and unrelated managed output remain.

This checkpoint supports only direct selection of one saved horizontal AreaText TextFrame through `Formal Multi Step2.jsx`. PointText, vertical text, direct TextRange selection, supplementary-plane Kanji/IVS, mixed typography guarantees, and the legacy single-annotation Step 2 entry are unsupported or deferred. Runtime verification is manual; pure tests and parse gates do not substitute for Illustrator verification.
