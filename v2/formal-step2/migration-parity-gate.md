# Migration-parity gate

This gate applies before replacing, rewiring, or practically connecting any renderer, backend, persistence, or ownership path in Formal Step 2. It is a review gate, not a production architecture or migration implementation.

## Required mapping

The change record must map each row as **old contract -> new path -> regression evidence**. A row is not complete when it only describes the new implementation; it must name the preserved behavior and an executable or explicitly runtime-only proof.

| Contract dimension | Old contract -> new path -> regression evidence | Complete |
| --- | --- | --- |
| Geometry semantics | Center, base geometry, line coverage, width/height, and coordinate transforms are preserved and linked to focused evidence. | [ ] |
| Appearance/baseSize semantics | Font size, baseSize, manualDeltaX, widthScale, gap, and justification behavior are preserved and linked to focused evidence. | [ ] |
| Logical/physical identity | Logical segment identity, generation identity, and physical managed identity remain distinct and collision-safe. | [ ] |
| Persistence read/write ordering | Previous persisted state is read before replacement; serialized state is verified after write. | [ ] |
| Copy-on-write lifecycle | Prepare, verify, activate, retire, cleanup, finish, and restart boundaries preserve the old managed state until replacement is verified. | [ ] |
| Manual adjustment semantics | User manual placement and scale adjustments survive re-render and backend conversion without absorbing renderer roundoff. | [ ] |
| Source/unmanaged preservation | Source text and objects outside the requested ownership set remain unchanged on success, failure, and rollback. | [ ] |
| Structured diagnostics | Failure stage, category, and bounded evidence remain observable without converting uncertain failures into destructive cleanup. | [ ] |
| ExtendScript compatibility | Production and generated BridgeTalk paths remain ES3/ExtendScript compatible and pass the formal compatibility gate. | [ ] |

## Gate rule

Before the first runtime use of the changed path, the author records the mapping above in the durable work log and adds or updates the relevant minimum-pack anchor. The minimum pack must statically assert that this gate and all nine contract dimensions remain present. Illustrator-only behavior remains a separate runtime checkpoint and cannot be claimed by this document.

## Current baseline

The current native AreaText path is the reference baseline for the next runtime review. Its existing focused tests, known-failure catalog, lifecycle replay, compatibility lint, and gate-0 are the regression evidence referenced by the current dispatch. This document does not authorize runtime execution, renderer migration, or broad wiring.
