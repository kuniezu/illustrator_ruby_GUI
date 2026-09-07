# AreaText-native implementation handoff

Working branch: `v2/area-text-native-convergence-docs`

Base branch/head at split: `v2/formal-step2-render-segments` @ `be51232b24e437af33c8566c6f0797a6b24e4aa2`.

This branch intentionally keeps the main Luna/Codex branch untouched. It contains convergence docs plus unintegrated scaffolding intended to shorten the next implementation cycle.

## Added design/research

- `area-text-native-decision.md`
  - converged product/transaction decisions
- `area-text-runtime-probe-plan.md`
  - one-shot Illustrator runtime evidence plan

## Added implementation scaffolding

- `area-text-native.js`
  - pure source-manifest helpers
  - request/prepare/verified/activated lifecycle
  - active/pending/cleanup-pending classification from source state
  - conservative one-line fit proof helper
  - fixed initial tracking candidates `[0,-25,-50,-75,-100]`
  - generation/version-aware manual-adjustment capture

- `area-text-render-spec.js`
  - serializable RenderSpec with explicit appearance + geometry + request/generation identity
  - final rectangle geometry derived before host DOM creation
  - composer policy transported as plain data
  - intended to eliminate the current class where appearance exists in palette/pure state but is lost on the host path

- `area-text-native-backend.jsx`
  - candidate-only fresh rectangle -> `areaText()` backend
  - applies explicit font/size, full justification / one-character center policy, optional composer policy
  - observes fresh frame/range/lines and candidate geometry
  - verifies through `FormalAreaTextNative.verifyOneLineFit()`
  - tracking fallback only on candidate
  - candidate cleanup only
  - deliberately does NOT touch `source.note`, active manifest, old output, or retirement

- `area-text-native-host.jsx`
  - batch prepare/verify scaffold around RenderSpec + backend
  - returns verified physical render records and logical->physical bindings
  - deliberately stops before activation/persistence/retirement

- `../diagnostics/Formal Step2 AreaText Native Probe.jsx`
  - disposable-document diagnostic scaffold
  - fresh AreaText creation/ownership logging
  - fresh-width comparison without mutating an existing AreaText width
  - full-justify / single-character center cases
  - tracking sequence cases
  - structured ExtendScript Console output and cleanup
  - not yet the full A-H probe described in `area-text-runtime-probe-plan.md`

## Added tests

- `tests/area-text-native.cjs`
- `tests/area-text-render-spec.cjs`
- `tests/area-text-native-static.cjs`

These are authored but were not executed in this ChatGPT-side branch because the environment cannot reach GitHub to materialize the repository and the connector does not execute repository tests. Luna/Codex should run the normal test/compatibility suite immediately after taking over.

## Important non-decisions

Do not treat the scaffolding as runtime proof.

Still unresolved until the batched Illustrator probe:
- `areaText(path)` path lifecycle after successful creation/removal
- actual box-height/vertical-gap contract
- frame vs textPath readback authority for manual width observation
- whether coverage from `textRange.lines` proves visible full text in the supported runtime
- exact `FULLJUSTIFY` / `singleWordJustification` Japanese behavior
- composer letter-spacing values/policy
- whether bounded tracking is needed at all after composer policy
- re-observation timing/stability

The backend therefore accepts composer values but does not choose arbitrary letter-spacing limits.

## Recommended Luna/Codex takeover sequence

1. Fetch/compare this branch against `be51232...`.
2. Run:
   - pure tests
   - ExtendScript compatibility lint
   - Gate 0
   - generated BridgeTalk parse
   - `git diff --check`
3. Review scaffolding; fix static issues before cherry-picking/integrating.
4. Merge or selectively transplant the pure modules/backend/probe into the normal branch.
5. Complete the one-shot diagnostic to cover plan fixtures A-H, especially:
   - D visible overflow vs coverage
   - composer J1 policy comparison
   - generation failure injection
   - manual baseline
   - actual BridgeTalk RenderSpec delivery
6. User runs the one-shot Illustrator probe once.
7. Only then wire native backend into production rendering.

## Do not carry forward from the rough renderer

- `item.kind = TextType.AREATEXT`
- `restored.kind = ...`
- PointText managed-ruby creation in native path
- direct existing-frame width mutation as required reflow mechanism
- width-difference -> tracking as primary fit authority
- `-400/+400` native fit clamp
- delete-all/rebuild rollback

Source-geometry temporary PointText measurement is a separate concern and should not be deleted merely because managed ruby becomes AreaText-native.
