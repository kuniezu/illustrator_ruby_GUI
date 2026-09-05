# Gate A/B implementation comparison: Astra Lite vs Luna Medium

Date: 2026-09-05

## Purpose

This comparison was run to choose a practical implementation style for v2, not to promote either experiment branch into production. Both experiments started from the same baseline commit:

`32adf76be708dcb475ad4fd9f2872f9cb8c9f214`

The product context matters: this is primarily a personal Illustrator production aid. A visibly wrong generated ruby can be noticed and regenerated; therefore the implementation should protect source text, unrelated Illustrator objects, and persisted meaning data strictly, while avoiding enterprise-grade defensive complexity around every generated object.

## Experiment results

### Astra Lite

Branch: `experiment/astra-lite-gate-ab`

Head: `cd65503683c2e04a74de15beb89d338280070091`

Initial implementation:
- 8 added files
- 882 added lines
- extensive host mock / failure-path coverage
- detailed diagnostics and recovery logic
- first Illustrator runtime attempt failed on a PointText DOM assumption, but the UI exposed the underlying measurement failure clearly

Observed usage record supplied during the experiment:
- about 14m39s for the main run
- 5-hour allowance: 100% -> 63% (about 37% consumed)

Strengths:
- strongest defensive design
- best first-pass diagnostics
- strong distinction between complete desired=0, unresolved, and failed
- ownership/recovery contracts are explicit
- tests found and corrected several implementation defects before runtime

Costs:
- substantially more code and validation machinery than needed for this personal-use script
- high model-usage cost for a small vertical slice
- some safeguards protect scenarios outside the practical MVP path

### Luna Medium

Branch: `experiment/luna-medium-gate-ab`

Head after runtime fix: `cfe840e52f0e6552e52debc13877f1e4297f2409`

Current experiment size from the same baseline:
- 9 added files
- 144 added lines
- compact Domain / Store / Application / Adapter / Review split
- lightweight stage tracing added after the first runtime failure

Observed usage record supplied during the experiment:
- initial run about 5m32s
- 5-hour allowance: 63% -> 62% (about 1% consumed for the initial run)

Runtime history:
1. first Illustrator run failed and only reported `failed`
2. lightweight diagnostics were added
3. macOS VS Code ExtendScript Debugger confirmed that `nextFrame` and `previousFrame` are unavailable on `TextType.POINTTEXT`
4. Luna changed the PointText path so threaded-frame properties are not read
5. runtime then completed observation successfully
6. after confirming the reading, ruby generation succeeded
7. repeated apply did not proliferate objects
8. reading changes updated the existing ruby
9. suppression removed only the managed ruby while preserving semantic data
10. save / close / reopen preserved the reading and allowed re-editing

Strengths:
- much lower implementation and model-usage cost
- easier to inspect and modify
- sufficient architectural separation for the MVP
- after lightweight tracing was added, Illustrator DOM discovery became practical
- passed the important Gate A/B runtime round trip after one concrete DOM fix

Costs:
- first-pass diagnostics were too thin
- fewer failure-injection tests than Astra
- some correctness depends more heavily on iterative Illustrator runtime testing

## Decision from the comparison

For this project, formal v2 implementation should be **Luna-style by default**, with selected Astra-style safeguards imported where they protect data rather than merely generated presentation.

Use Luna Medium as the normal implementation model when model choice is available. Use a stronger / more defensive model for architecture review, difficult state failures, persistence corruption, ambiguous ownership, or bugs that survive normal runtime tracing.

Do not copy either experiment branch into production and do not treat either branch as canonical code. Formal implementation restarts from the accepted v2 documentation baseline.

## Required safeguards for formal v2

Keep these strict:
- never modify source body text as a side effect of ruby generation
- never delete or repurpose unrelated Illustrator objects
- tool-owned source and output identity; collision must stop rather than guess
- persisted reading / suppression / review decisions are canonical, generated ruby is a projection
- distinguish complete `desired=[]` from unresolved and failed
- save/reopen must preserve semantic data and allow re-editing
- repeated reconcile must be idempotent
- failed rendering must not silently erase persisted user meaning

Keep these lightweight and evidence-driven:
- generated-ruby rollback beyond what is needed for safe retry
- exhaustive matrix / hierarchy / style guards before those cases are supported
- enterprise-style logging framework
- speculative compatibility checks for unsupported frame types

## Diagnostics policy

Lightweight stage diagnostics are part of the MVP, because Illustrator DOM behavior is being learned empirically. At minimum retain stage information around:
- source/frame kind and orientation
- character/index mapping
- actual line mapping
- measurement
- render create/update/remove
- actual Illustrator exception message

The goal is not permanent verbose logging. The goal is that one runtime failure identifies the failing operation closely enough for a short fix cycle.

## Development cadence implication

The Astra experiment showed that a small vertical slice can consume a large fraction of a 5-hour model allowance when validation is very defensive. Formal work should therefore be divided into small Issues with a target of roughly 10-15% of the 5-hour allowance per implementation unit when practical. Large Gate C/D work should be split by observable capability rather than assigned as one long task.
