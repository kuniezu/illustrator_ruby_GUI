# Formal Step 2 Multi manual check

Run `Formal Multi Step2.jsx` in Illustrator with exactly one horizontal Area Text
range selected. The script opens a nonmodal palette so the selection can be changed
between Add operations.

1. Confirm the selected base text is shown and click **Add**.
2. Select a second word in the same Area Text frame and click **Add** again.
   Confirm that two separate annotations exist by using **Next unresolved**.
3. Enter a reading and click **Apply**; confirm the annotation-local status and reason update.
4. Use **Previous unresolved** and **Next unresolved** to move between annotations that still have reasons.
5. Select a different text frame and click **Add**; confirm the palette rejects the
   source-frame switch without changing the bound store.
6. Use **Suppress** and **Re-enable** and confirm the annotation remains in the
   same source frame.
7. Close the palette, save the document, reopen it, and run the script again.
   Confirm the multi annotation state is restored from the v2 multi note block.

This shell intentionally does not run rendering or reconciliation. Gate D geometry
and runtime lifecycle checks remain separate manual procedures.
