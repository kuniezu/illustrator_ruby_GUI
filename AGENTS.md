# Repository working rules

- At the start of each work cycle, report the current time in JST.
- The first repository operation of every work cycle must capture the exact JST start time with an actual shell command; retain it for the cycle. The final user-visible report MUST end with `開始: YYYY-MM-DD HH:MM:SS JST` and `終了: YYYY-MM-DD HH:MM:SS JST`. Commit time is not a substitute; if the start time was not captured, state that explicitly rather than inventing it.
- Keep development source readable and non-compressed.
- Runtime verification is performed by the user; keep it distinct from pure tests.
- Unproven Illustrator/ExtendScript DOM assumptions require reference review first; user runtime checkpoints should be batched and minimized.
- Before introducing or changing an Illustrator/ExtendScript DOM operation, search the repository for the same API or equivalent lifecycle and compare against the proven existing pattern. If the new implementation differs, record why and add a regression for the difference before runtime.
- `v2/formal-step2/04_Work整理結果/04_実装・実機前チェックリスト.md` is mandatory shared preflight. The worker checks sections A/B around implementation; ChatGPT supervisor checks sections C/D before runtime. New mistakes must be added both to the historical list and to a preventive checklist item.

## Continuation handoff rule

- `v2/formal-step2/04_Work整理結果/01_次これやって.md` is the single source of truth for the execution worker.
- `v2/formal-step2/04_Work整理結果/02_今これやったよ.md` is the single latest completion report from the execution worker.
- `v2/formal-step2/04_Work整理結果/03_作業ログ.md` remains append-only durable history.
- GitHub Issue #14 is an audit/history mirror only. Do not use Issue comments or chat summaries to choose work when `01_次これやって.md` exists.

### Worker start

- When the user says only `続けてください`, first refresh the local target branch from remote before reading any handoff file: run `git fetch origin`, confirm the worktree is clean, and if the current target branch is behind `origin/<branch>` with no local divergence, fast-forward it with `git pull --ff-only`. If the worktree is dirty or the branch has diverged, STOP and report instead of guessing or using stale local files, **except for the narrowly defined BLOCKED-continuation case below**.
- **BLOCKED-continuation exception:** if the immediately preceding worker cycle ended `BLOCKED`, the current uncommitted changes are the preserved work product of that same dispatch, and the planning/review ChatGPT has published a newer remote `01_次これやって.md` that explicitly instructs continuation from those preserved changes, the worker may continue with the dirty worktree. In that case: (1) do not `git pull`, `reset --hard`, checkout over the changed files, or otherwise discard the local work; (2) run `git fetch origin`; (3) inspect `git status` and `git diff` and verify that the dirty files are exactly the expected prior-dispatch work, with no unrelated user or repository changes; (4) read the latest remote handoff read-only with `git show origin/<branch>:"v2/formal-step2/04_Work整理結果/01_次これやって.md"` (or an equivalent read-only command) before implementation; (5) continue only when that remote handoff explicitly identifies the same BLOCKED continuation and preserved work; (6) if unrelated changes, ambiguous ownership, or unexpected divergence are present, STOP and report. This exception exists only to resume an explicitly supervised BLOCKED cycle; it does not weaken the normal clean-worktree rule for ordinary work.
- In a BLOCKED-continuation cycle, the remote handoff may be newer than local HEAD because it is a control-plane/documentation commit. Do not treat that alone as code divergence. Keep the local implementation changes intact while working; once the implementation and required validation pass, make the worktree safe/clean through an ordinary commit, then incorporate the remote control-plane commits with a normal non-destructive Git operation such as rebase/fast-forward as appropriate. Resolve conflicts by preserving both the reviewed implementation and the latest handoff intent; never discard the implementation merely to match remote.
- After remote synchronization in an ordinary clean-worktree cycle, read `01_次これやって.md` and use only its `dispatch_id`, state, target branch, `base_code_head`, work items, and stop condition. In the BLOCKED-continuation exception, use the read-only remote copy of `01_次これやって.md` as that source of truth until the local branch can be safely synchronized.
- `base_code_head` is the reviewed implementation baseline, not an exact branch-HEAD lock. The handoff/checklist/control-plane commits that carry the current dispatch may legitimately be descendants of `base_code_head`. Verify that `base_code_head` is an ancestor of the refreshed target branch; do not STOP merely because HEAD is newer due to documentation/control-plane commits.
- Verify the current branch and that the dispatch file is the latest remote version before changing code. If `base_code_head` is not an ancestor, or the branch/worktree has unrelated divergence, STOP and report the mismatch; do not fall back to Issue comments or remembered instructions.
- Before implementation, execute section A of `04_実装・実機前チェックリスト.md` and use it as a real preflight, not a decorative document.
- If `state` is `USER_RUNTIME_REQUIRED`, `STOP`, or otherwise not executable, do not resume older work.
- If `02_今これやったよ.md` already reports the same `dispatch_id` as completed, do not execute it again.

### Worker finish

- Before commit/push completion, execute section B of `04_実装・実機前チェックリスト.md`.
- Before commit/push completion, overwrite `02_今これやったよ.md` with the current `dispatch_id`, resulting HEAD/commit, completed items, tests, runtime-not-run status, working-tree/push status, exact start/end JST, and checklist A/B outcome.
- Append durable technical detail to `03_作業ログ.md` when appropriate.
- Commit/push and STOP. Do not choose or begin the next task.

## Role routing

- Planning/review ChatGPT owns remote review and `01_次これやって.md`. After the user says `終わりましたー`, it verifies remote HEAD/diff and the latest `02_今これやったよ.md`, then executes checklist section C. Before asking the user for Illustrator runtime, it must execute section D and explicitly state `PRE-RUNTIME CHECK: PASS`. Otherwise it writes the next worker dispatch or stays stopped.
- The separately running Luna/Codex/Work execution worker owns implementation/testing and `02_今これやったよ.md`.
- Issue #14 may be updated for auditability, but it is not a worker dispatch source.
