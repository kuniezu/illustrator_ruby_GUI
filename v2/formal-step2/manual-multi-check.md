# Formal Step 2 Multi manual check

Run `Formal Multi Step2.jsx` in Illustrator with exactly one horizontal Area Text
range selected.

1. Confirm the selected base text is shown and click **Add**.
2. Enter a reading and click **Apply**; confirm the status and reason update.
3. Click **Add** again for a second selected word, then use **Previous unresolved**
   and **Next unresolved** to move between annotations that still have reasons.
4. Use **Suppress** and **Re-enable** and confirm the annotation remains in the
   same source frame.
5. Close the dialog, save the document, reopen it, and run the script again.
   Confirm the multi annotation state is restored from the v2 multi note block.

This shell intentionally does not run rendering or reconciliation. Gate D geometry
and runtime lifecycle checks remain separate manual procedures.
