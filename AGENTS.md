# Repository working rules

- At the start of each work cycle, report the current time in JST.
- The first repository operation of every work cycle must capture the exact JST start time with an actual shell command; retain it for the cycle. The final user-visible report MUST end with `開始: YYYY-MM-DD HH:MM:SS JST` and `終了: YYYY-MM-DD HH:MM:SS JST`. Commit time is not a substitute; if the start time was not captured, state that explicitly rather than inventing it.
- Treat the linked Issue as the source of truth.
- Keep development source readable and non-compressed.
- Runtime verification is performed by the user; keep it distinct from pure tests.
- Unproven Illustrator/ExtendScript DOM assumptions require reference review first; user runtime checkpoints should be batched and minimized.
