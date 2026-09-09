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

## Role routing

- Planning/review ChatGPT owns Issue design, CURRENT DISPATCH updates, and remote review; it receives `終わりましたー` and does not launch a separate execution handoff.
- The separately running Luna/Codex/Work execution worker receives `続けてください`, reads Issue #14 CURRENT DISPATCH, implements/tests/commits/pushes, then stops.
- Issue #14 remains the source of truth; `01_次これやって.md` and `02_今これやったよ.md` are temporary header-only bookkeeping, while `03_作業ログ.md` is append-only durable detail.
