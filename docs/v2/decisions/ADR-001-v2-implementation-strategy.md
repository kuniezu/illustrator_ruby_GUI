# ADR-001: v2 implementation strategy

Status: Accepted

Date: 2026-09-05

## Context

v2 changes the product from a one-shot ruby generator into a persistent ruby annotation manager for Illustrator documents. Earlier analysis converged on the following core ideas:

- semantic RubyAnnotation data is canonical
- generated Illustrator ruby TextFrames are rendered projection
- Logical Annotation and Render Segment are separate concepts
- sparse split hints are learned only when wrapping actually requires them
- native Illustrator UUID is not a persistent identity
- ambiguous source binding must stop for review rather than guess
- the legacy implementation should remain available as reference, while v2 is reimplemented in the same repository

A Gate A/B comparison was then run from one common baseline using Astra Lite and Luna Medium. The comparison showed a large difference in implementation/usage cost, while Luna's compact implementation passed the required Illustrator runtime round trip after one concrete DOM correction and after lightweight diagnostics were added.

This project is primarily a personal Illustrator production aid. Source content and unrelated user objects must be protected strictly, but generated ruby presentation can tolerate visible, recoverable defects during development.

## Decision

### 1. Repository strategy

Use the existing repository and freeze the legacy path as reference. Reimplement v2 cleanly rather than incrementally extending PR #8 or promoting either experiment branch.

The Astra and Luna experiment branches are evidence only. Formal implementation must start from the accepted v2 documentation baseline, not by merging or cherry-picking an experiment wholesale.

### 2. Responsibility boundaries

Keep the following conceptual boundaries:

1. Review UI
2. Application orchestration
3. Domain model / deterministic plan
4. Store
5. Illustrator Adapter / Renderer boundary

These are responsibility boundaries, not a mandate to create many classes or files. Prefer plain data and small functions until complexity is demonstrated by runtime evidence.

### 3. Canonical model

Persist semantic annotation state, including at least:

- schemaVersion / revision
- sourceFrameId
- annotationId
- anchor information
- reading
- enabled
- placementMode
- reviewReasons
- readingConfirmed
- minimal style / offset state

State such as suppression, manual placement, review need, and reading confirmation should remain orthogonal rather than forced into one mutually exclusive enum.

### 4. Initial persistence strategy

Define Store as an interface first.

The first formal PoC uses a frame-local SourceBundle in `TextFrame.note`, preserving unrelated note content through a namespaced envelope and verifying write/readback. Centralized document storage remains a candidate only if capacity, durability, copy behavior, or recovery tests show frame-local note is insufficient.

Generated ruby objects are never canonical storage.

### 5. Identity and ambiguity

Use tool-owned sourceFrameId and annotationId. Illustrator native UUID may be used only as runtime information, never as the persistent key.

Duplicate tool-owned source IDs are a collision. Do not auto-dedupe and do not choose a nearest object automatically.

### 6. Rendering safety contract

The Renderer/reconcile path must be idempotent.

A complete desired plan containing zero ruby objects is a valid state and must be distinguishable from unresolved or failed planning/measurement.

Ownership is mandatory for managed output. Never delete or repurpose unmanaged or unknown objects.

Failed rendering must not silently erase persisted semantic decisions.

### 7. Diagnostics policy

Retain lightweight stage tracing for Illustrator DOM work. It should identify, when practical:

- frame kind/orientation
- character/index verification
- line-map verification
- measurement stage
- render create/update/remove stage
- actual Illustrator exception message

Do not build a heavy logging framework unless later evidence requires it.

### 8. Model/workflow strategy

For this project, prefer Luna-style implementation: compact code, direct runtime feedback, and iterative correction.

When model selection is available, Luna Medium is the default implementation candidate. Use a more defensive model or review pass for persistence corruption, ownership ambiguity, difficult state transitions, or bugs that survive normal tracing.

Implementation Issues should be small enough that one run normally consumes roughly 10-15% of the available 5-hour model allowance when practical. Gate C/D should be split by observable capability.

### 9. MVP gate

Practical MVP target remains Gate D.

- Gate A: feasibility of identity, Store, actual line/index observation
- Gate B: one persisted annotation round trip with minimal review UI and idempotent reconcile
- Gate C: line-wrap-driven Render Segments and sparse split hints, including 1->2->3->1 behavior
- Gate D: long-text practical workflow, tokenization/manual split-merge/review/navigation and required vertical-text support

Gate E (shared/project dictionaries, launcher/import/distribution and other expansion) is optional after practical use is reached.

## Consequences

Positive:
- faster path to a usable personal tool
- smaller code surface and lower model-usage cost
- runtime diagnostics make Illustrator DOM discovery efficient
- critical data/ownership safety remains explicit

Trade-offs:
- more behavior will be learned through real Illustrator testing rather than predicted defensively in advance
- some unsupported cases will stop explicitly instead of being handled preemptively
- additional guards will be added only when practical failures justify them

## Related evidence

- `docs/v2/analysis/comparison/astra-lite-vs-luna-medium-gate-ab.md`
- `docs/v2/analysis/sol/`
- `docs/v2/analysis/atlas/`
- Issue #10: Astra Lite Gate A/B experiment
- Issue #11: Luna Medium Gate A/B experiment
