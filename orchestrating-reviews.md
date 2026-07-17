# Orchestrating Reviews — the output contract

Every persona reports findings in the shape defined here so the synthesis step can dedupe and
adjudicate across lenses, and so the runner can consume a machine-readable manifest. This file is
loaded by every persona and by the workflow runner. It is the contract; do not deviate from it.

---

## §1. Input — what a review targets

A review targets a **design argument**, not (primarily) a repository. The runner normalizes whatever
form the proposal arrives in — a GitHub PR or discussion URL, a spec-clause reference, a worked
example, an email thread, or pasted ad-hoc prose — into one **normalized proposal statement** that
every persona receives identically. Separately, the runner passes **target source pointer(s)**: the
repo(s) and/or spec(s) the proposal touches (e.g. `keripy`, `signify-ts`, `keria`,
`kswg-acdc-specification`), which personas cross-reference to verify machine-behavior claims. A
proposal may implicate more than one target (interop is common); check each named one.

## §2. Severity — an *adoption-obligation*, not a bug rank

Severity states how obligated the ecosystem is to resolve the finding **before adopting the
proposal as written**. This is a design review, so severity is about the soundness and cost of the
*idea*, not a runtime crash.

- **CRITICAL** — the proposal is unsound as written: it breaks a load-bearing KERI invariant,
  silently breaks wire/interop across implementations, introduces an authority/trust dependency the
  design deletes, or rests on a category error. Must be resolved or the proposal rejected.
- **HIGH** — a load-bearing flaw that must be resolved before adoption: a real hole, an
  underspecification that will make two implementers diverge, a privacy/correlation handle, an
  unenforced-but-claimed semantic. Adoption should wait.
- **MEDIUM** — a genuine weakness worth fixing: avoidable complexity, a missing conformance test, a
  notation that invites misconfiguration, a migration cost not accounted for.
- **LOW** — minor: a clarity nit, a naming quibble, a non-blocking suggestion.

## §3. Confidence — how sure you are the finding holds

- **CONFIRMED** — grounded in a re-anchored code path, spec clause, or reproducible argument.
- **LIKELY** — well-reasoned but resting on an inference you could not fully close.
- **SPECULATIVE** — a flagged concern worth surfacing; you could not establish it. Use sparingly and
  never above MEDIUM severity without downgrading, or say why.

## §4. `dedupe_key` — name the issue, not the symptom

A short kebab-case slug naming the **underlying issue**, chosen so that independent personas who see
the same issue emit the *same* key and it merges. Key the root cause, not the lens.

- Good: `edge-operator-semantics-unenforced`, `i3i-egf-arbiter-undefined`,
  `compact-acdc-rainbow-correlatable`, `new-operator-wire-downgrade`.
- Bad: `security-issue-3`, `krt-finding-2` (lens-scoped, will never merge).

## §5. Id prefixes

Each persona prefixes its finding ids with its tag: **SEC-** (Protocol Security & Verifier Realist),
**KRT-** (Knowledge-Representation & Relation-Algebra), **PRV-** (Privacy & Correlation-Resistance),
**SPC-** (Spec-Precision & Language Designer), **SKP-** (First-Principles Skeptic), **GOV-**
(Governance, Interop & Lifecycle), **CSR-** (CESR / Wire-Format & Serialization). E.g. `SEC-F1`.

## §6. Re-anchoring — citations are hints until re-confirmed

`keri-doctrine.md`'s line numbers were verified at a fixed commit and drift as sources evolve. When
you cite a source in a finding, you MUST re-anchor it against the live target you are pointed at:
grep for the quoted text or symbol in the current source and cite the line/symbol you find *now*.
Never copy a line number out of the doctrine into a finding without re-confirming it. If a quoted
passage no longer exists in the live source, say so — that is itself a finding (the proposal or
doctrine is out of date). This is what keeps panel findings free of the doctrine's citation rot.

## §7. Report file — human-readable narrative

Write your narrative report to `reviews/<persona-slug>-<run_label>.md` (create `reviews/` if
needed; never `git add`/commit). Structure:

```markdown
# <Persona> Review: <proposal short-name>
**Date:** YYYY-MM-DD  **Target(s):** <repos/specs>  **Effort:** medium|deep  **Objective lens:** survivability
**Sources used:** keri-doctrine, review-house-style, <bible sections>, <live sources re-anchored>

## Executive summary
[2-4 sentences: is the proposal sound in your lens; the single biggest finding; nothing-in-my-lens is a valid summary.]

## Steelman
[The strongest version of the proposal in KERI's terms, before you critique it.]

## Top findings
### F1: <title>
- **Severity / Confidence / dedupe_key / Objective function / Layer**
- **Location:** <proposal ref> and/or <re-anchored source cite>
- **Finding:** what is wrong, in KERI's terms
- **Why it matters:** the concrete failure scenario (input -> wrong outcome, or interop/semantic break)
- **Recommendation:** the smallest change that resolves it (proposed, not imposed)
[...through max_findings]

## Additional patterns noted
## Residual unknowns
```

## §8. Findings manifest — machine-readable (required in unattended mode)

Return this as your final message (the runner consumes the returned manifest, not the file):

```yaml
findings:
  - id: SEC-F1
    persona: protocol-security-verifier-realist
    title: "..."
    severity: HIGH            # CRITICAL | HIGH | MEDIUM | LOW  (§2)
    confidence: CONFIRMED     # CONFIRMED | LIKELY | SPECULATIVE  (§3)
    dedupe_key: edge-operator-semantics-unenforced   # §4
    objective_function: survivability   # survivability | invulnerability (name which the finding assumes)
    layer: keri-core          # keri-core | acdc | governance | deployment | wire
    location: "proposal §3; keripy vdr/verifying.py I2I branch (re-anchored)"
    evidence: "one line: the re-anchored cite + the doctrine/bible ground it rests on"
    steelman: "one line: the strongest reading of what the author intended"
    failure_scenario: "concrete inputs/state -> wrong output, interop break, or semantic ambiguity"
    recommended_disposition: recommend-revise  # recommend-revise | recommend-reject | recommend-accept | needs-info
    bucket: deployment-gap    # non-goal | proof-scope | deployment-gap  (which of the three; §What-counts)
    revisit_condition: null
```

## §9. Synthesis contract (for the runner)

The runner merges by exact `dedupe_key` (most-obligated severity wins; `reported_by` accumulates
across personas), then runs a conservative semantic-dedup pass, then optionally an adversarial
**verify** pass that tries to *refute* CRITICAL/HIGH findings before they reach the queue (a finding
that assumes an invulnerability objective, or rests on an un-re-anchored citation, is a prime refute
target). Refuted findings are excluded from the queue but recorded, never silently dropped.
