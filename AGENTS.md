# Repository working rules

- At the start of each work cycle, report the current time in JST.
- The first repository operation of every work cycle must capture the exact JST start time with an actual shell command; retain it for the cycle. The final user-visible report MUST end with `開始: YYYY-MM-DD HH:MM:SS JST` and `終了: YYYY-MM-DD HH:MM:SS JST`. Commit time is not a substitute; if the start time was not captured, state that explicitly rather than inventing it.
- Keep development source readable and non-compressed.
- Runtime verification is performed by the user; keep it distinct from pure tests.
- Unproven Illustrator/ExtendScript DOM assumptions require reference review first; user runtime checkpoints should be batched and minimized.
- Before introducing or changing an Illustrator/ExtendScript DOM operation, search the repository for the same API or equivalent lifecycle and compare against the proven existing pattern. If the new implementation differs, record why and add a regression for the difference before runtime.

## Continuation handoff rule

- `v2/formal-step2/04_Work整理結果/01_次これやって.md` is the single source of truth for the execution worker.
- `v2/formal-step2/04_Work整理結果/02_今これやったよ.md` is the single latest completion report from the execution worker.
- `v2/formal-step2/04_Work整理結果/03_作業ログ.md` remains append-only durable history.
- GitHub Issue #14 is an audit/history mirror only. Do not use Issue comments or chat summaries to choose work when `01_次これやって.md` exists.

### Worker start

- When the user says only `続けてください`, read `01_次これやって.md` first and use only its `dispatch_id`, state, target branch, base HEAD, work items, and stop condition.
- Verify the current branch and HEAD against the file before changing code. If they materially differ, STOP and report the mismatch; do not fall back to Issue comments or remembered instructions.
- If `state` is `USER_RUNTIME_REQUIRED`, `STOP`, or otherwise not executable, do not resume older work.
- If `02_今これやったよ.md` already reports the same `dispatch_id` as completed, do not execute it again.

### Worker finish

- Before commit/push completion, overwrite `02_今これやったよ.md` with the current `dispatch_id`, resulting HEAD/commit, completed items, tests, runtime-not-run status, working-tree/push status, and exact start/end JST.
- Append durable technical detail to `03_作業ログ.md` when appropriate.
- Commit/push and STOP. Do not choose or begin the next task.

## Role routing

- Planning/review ChatGPT owns remote review and `01_次これやって.md`. After the user says `終わりましたー`, it verifies remote HEAD/diff and the latest `02_今これやったよ.md`, then writes the next `01_次これやって.md` or sets a runtime-wait state.
- The separately running Luna/Codex/Work execution worker owns implementation/testing and `02_今これやったよ.md`.
- Issue #14 may be updated for auditability, but it is not a worker dispatch source.
