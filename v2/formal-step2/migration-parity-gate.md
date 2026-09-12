# Migration-parity gate

This gate applies before replacing, rewiring, or practically connecting any renderer, backend, persistence, or ownership path in Formal Step 2. It is a review gate, not a production architecture or migration implementation.

## Required mapping

The change record must map each row as **old contract -> new path -> regression evidence**. A row is not complete when it only describes the new implementation; it must name the preserved behavior and an executable or explicitly runtime-only proof.

| Contract dimension | Old contract -> new path -> regression evidence | Complete |
| --- | --- | --- |
| Geometry semantics | legacy adapter `geometry.left/width/measuredTop/gap` and glyph-bottom target -> `native-renderer.js` + RenderSpec + temporary outline measurement in `area-text-native-backend.jsx` -> `tests/native-renderer.cjs`, `tests/area-text-render-spec.cjs`, `tests/area-text-native-backend.cjs`, `tests/area-text-native-static.cjs` | [x] |
| Appearance/baseSize semantics | legacy `normalizedAppearance`/`baseSize` -> `native-renderer.js` + RenderSpec -> `tests/native-renderer.cjs` | [x] |
| Logical/physical identity | legacy managed-item identity -> native manifest/output identity -> `tests/native-renderer.cjs`, `tests/area-text-native-integration.cjs`, `tests/area-text-native-static.cjs` | [x] |
| Persistence read/write ordering | legacy source-note commit -> generated bridge read-before-write + facade -> `tests/persistence-adapter.cjs`, `tests/area-text-native-persistence-facade.cjs` | [x] |
| Copy-on-write lifecycle | legacy reconcile/rollback -> coordinator/integration/BridgeTalk abort and retirement -> `tests/area-text-native-integration.cjs`, `tests/area-text-native-recovery.cjs`, `tests/persistence-adapter.cjs` | [x] |
| Manual adjustment semantics | legacy captured delta/scale -> RenderSpec/backend derived geometry -> `tests/native-renderer.cjs`, `tests/area-text-native.cjs` | [x] |
| Source/unmanaged preservation | legacy ownership-scoped removal -> stamped native identity and coordinator ownership -> `tests/adapter-transaction.cjs`, `tests/area-text-native-output-identity.cjs` | [x] |
| Structured diagnostics | legacy stage/reason/fit evidence -> generated lifecycle/cleanup evidence -> `tests/persistence-adapter.cjs`, `tests/area-text-native-static.cjs`, `tests/ui.cjs` | [x] |
| ExtendScript compatibility | legacy ES3 runtime surface -> generated/native production sources -> `extendscript-compat-lint.cjs`, `tests/gate-0.cjs` | [x] |

## Gate rule

Before the first runtime use of the changed path, the author records the mapping above in the durable work log and adds or updates the relevant minimum-pack anchor. The minimum pack must statically assert that this gate and all nine contract dimensions remain present. Illustrator-only behavior remains a separate runtime checkpoint and cannot be claimed by this document.

## P2 decisions recorded

- Manual adjustment is authoritative user state (`manualDeltaX` / `widthScale`); tracking is only the bounded fit fallback `0,-25,-50,-75,-100` and never a replacement for manual adjustment.
- Long-reading width uses the conservative maximum of measured base width and `readingLength * rubyFontSize`, recentered on the base segment; proportional-font refinements and adjacent-annotation interaction remain runtime review items.
- Partial updates are ownership-scoped to the current operation's candidate, active, retirement, and cleanup sets; unrelated managed and unmanaged objects remain outside the transaction.
- Legacy `formal-step2-output:v1` is not silently co-owned by the native manifest. A future entrypoint that encounters legacy output must stop safely or use an explicitly reviewed ownership adapter; this cycle does not implement migration.

## Current baseline

The current native AreaText path is the reference baseline for the next runtime review. The mappings above are the current old-contract to native-path evidence record; P1-specific failure/retry, identity, vertical placement, and cleanup diagnostics are required to remain executable before runtime. This document does not authorize runtime execution, renderer migration, or broad wiring.
