# Repository working rules

- At the start of each work cycle, report the current time in JST.
- The first repository operation of every work cycle must capture the exact JST start time with an actual shell command; retain it for the cycle. The final user-visible report MUST end with `開始: YYYY-MM-DD HH:MM:SS JST` and `終了: YYYY-MM-DD HH:MM:SS JST`. Commit time is not a substitute; if the start time was not captured, state that explicitly rather than inventing it.
- Treat the linked Issue as the source of truth.
- Keep development source readable and non-compressed.
- Runtime verification is performed by the user; keep it distinct from pure tests.
- Unproven Illustrator/ExtendScript DOM assumptions require reference review first; user runtime checkpoints should be batched and minimized.

## Continuation dispatch rule

- When the user says only `続けてください`, fetch Issue #14 body and latest comments before doing repository work.
- Identify the latest effective `[NEXT WORK]` and record its comment ID/URL, target branch, base HEAD, and stop condition.
- Compare the actual target-branch diff with that base HEAD and execute only unfinished items from that dispatch.
- Do not infer continuation from chat summaries. If Issue fetch fails, or branch/base HEAD materially differs, stop and report instead of using stale instructions.
- If the latest Issue state is runtime-wait or STOP, do not resume older work.
- Completion reports must include the dispatch comment, new HEAD, completed items, tests, runtime-not-run status, and remaining items.
