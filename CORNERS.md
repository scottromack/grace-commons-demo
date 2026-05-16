# CORNERS.md — deferred items against the spec

This file tracks every place where the demo's implementation falls short of, defers, or collapses something the [Multi-Party Approval spec](../grace-commons/compositions/multi-party-approval.md) names. The discipline:

- Every entry names the spec section, the cut made, and the estimated relaxation cost.
- New entries land *during* the build, not after — the moment the implementation makes a choice that deviates from the spec, the entry is written.
- This file is the honest counterpart to the demo. A reader who has only the demo and `CORNERS.md` knows exactly how the demo deviates from the spec.

The rule for *what* belongs here vs. what belongs as a spec finding is in [`grace-commons/CLAUDE.md` § Implementation-discovered findings](../grace-commons/CLAUDE.md): contradictions go to Lineage notes via a review pass; preferences and rendering-target collapses go here.

---

## Pre-known entries (named in `BUILD_PLAN.md` §13 and §15)

### Audit table collapse

- **Spec section:** *Composes — Audit Trail*; *Application-level invariants — Invariant 5*.
- **Cut made:** The four constituent atoms of the Audit Trail substrate (Event Log + Actor Identity + Retention Window + Tamper Evidence) are collapsed into one `audit_event` table with `attestation`, `retention_until`, and `prev_row_hash` / `row_hash` columns. Every invariant the composition needs from the substrate is satisfied, but the four-atom didactic shape is lost.
- **What can't be demonstrated until relaxed:** the spec's *Retention-horizon asymmetry between substrate and constituents* edge case (which requires a separate Retention Window store visibly in `Purged` state) and the *Partial attestation on step failure* gap in Invariant 5 (which requires Actor Identity.attest and EventLog.append to be separable failure points).
- **Relaxation cost:** ~3–4 hours to split into four tables, update `src/domain/audit_trail.ts`, update the verifier, update the tamper test.

### `audit_pending` flag never fires

- **Spec section:** *Composition logic — Application state* (the `audit_pending` field) and *`initiate_chain`* step 7c.
- **Cut made:** All `initiate_chain` writes execute inside one SQLite transaction, so the spec's case (c) (constituent stores commit, Audit Trail fails) cannot physically happen. The column exists on `chain` per the spec, `read_chain` surfaces it, but no code path sets it.
- **What can't be demonstrated until relaxed:** the quarantined-chain recovery path that an auditor would see when audit-trail writes fail mid-initiation.
- **Relaxation cost:** ~1 hour to add a test-only `?fail-at=audit` fault-injection knob to step 6 of `initiate_chain`.

### `cascade_partial` flag never fires

- **Spec section:** *Cascade-recall of trailing assignments on chain termination — Partial-failure recovery during cascade*.
- **Cut made:** Same root cause — cascade calls execute inside one transaction, so no partial cascade can land.
- **What can't be demonstrated until relaxed:** the partial-cascade audit shape, the `cascade_partial = true` chain_resolved payload, the recovery-progress audit gap.
- **Relaxation cost:** ~30 min once the fault-injection knob above exists; emits a `cascade_partial` row when the knob is set.

### No `cascade_completed` retry loop

- **Spec section:** *Cascade-recall of trailing assignments — Partial-failure recovery during cascade*, last paragraph.
- **Cut made:** Spec names a retry-and-emit cycle for partial cascades; the demo skips it because there are no partials to retry.
- **Relaxation cost:** add when fault injection lands. Worker that scans for `cascade_partial = true` events with no matching `cascade_completed`, retries the failed calls, emits the follow-up event. ~1–2 hours.

### Per-DB writer lock instead of per-`chain_id` mutex

- **Spec section:** *Concurrent step decisions on the same chain* (Edge cases).
- **Cut made:** SQLite WAL + `BEGIN IMMEDIATE` + `busy_timeout = 5000` serializes the whole database, which is strictly stronger than the per-`chain_id` mutex the spec requires. Not a correctness corner — a throughput one.
- **Relaxation cost:** if concurrent chains ever need to make progress against each other, add an in-process keyed promise queue and switch to deferred transactions. ~1 hour.

---

## Items the spec itself defers

These are *not* corners the demo cut — they are items the spec explicitly names as out-of-scope. Listed here so a reader doesn't mistake them for demo gaps.

- **Compromise Disclosure / `application_actor` credential rotation.** Forward-referenced by the spec as a future composing pattern.
- **Approver standing-authorization check at `initiate_chain`.** Spec's *Approver authorization at initiation is a calling-system obligation* edge case.
- **Trusted Timestamping for `chain_terminal_at`.** Spec's *Clock source for `chain_terminal_at`* edge case.
- **Legal Hold composition.** Spec's *Audit Trail composition with Legal Hold* edge case.
- **Failed-Attempt Log composition** (audit entries for denied `initiate_chain` calls). Spec's *Audit Trail records of failed chain initiations* edge case.
- **Delegation, sequenced ordering, segregation-of-duties.** All three named as composing concerns out-of-scope for this composition.

---

## Build-discovered entries

*(Sonnet appends here as the build proceeds. One entry per choice that defers, collapses, or stubs something against the spec.)*
