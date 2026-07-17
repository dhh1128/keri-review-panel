# keri-review-panel

A reusable, adversarial multi-persona review panel for **design proposals in the KERI / ACDC / CESR
ecosystem** — spec changes, GitHub discussions and PRs, worked examples, email threads, or ad-hoc
proposals. Point it at a design argument and it stress-tests that argument from seven distinct
disciplines, each reasoning **in KERI's own terms** rather than importing generic
PKI / IAM / OAuth / blockchain / SD-JWT priors.

It mirrors the architecture of `origin-review-panel` (code review) and `editorial-panel` (prose
review): a shared spine, one file per persona, dedupe-by-key synthesis, adjudicated dispositions,
and a Workflow runner.

## What's here

| File | Role |
|---|---|
| `keri-doctrine.md` | **Domain spine.** How to reason in KERI's terms: the load-bearing claims, the shibboleth/anti-pattern table, the evidence standard + sneer-test self-check. Every persona loads this first. Distilled from a ~35k-word reference (`reference/`). |
| `review-house-style.md` | **Disposition spine.** The adversarial epistemics every persona shares (resist sycophancy, earn findings, no fence-sitting, steelman-before-you-strike). |
| `orchestrating-reviews.md` | **Output contract.** Severity (adoption-obligation) and confidence semantics, `dedupe_key` convention, id prefixes, the re-anchoring rule, the findings manifest schema, and the synthesis contract. |
| `personas/*.md` | The seven reviewer lenses (below). |
| `keri-review-panel.workflow.js` | The runner: normalize proposal → (optionally dispatch lenses) → review → verify → synthesize → persist. |
| `freshness.sh` | Re-anchoring / staleness checker — greps each doctrine quote against live sources; fail-loud on drift. |
| `install.sh` | Symlinks the runner into `~/.claude/workflows/`. |
| `reference/` | The `bible/` sections (depth reading each persona cites) + the assembled `keri-bible.md` + the decentralization-purity steering note. |

## The roster

Default panel: **SEC + SKP + SPC + GOV**. Add-ons dispatched by topic or named explicitly: **KRT,
PRV, CSR**.

- **SEC** — Protocol Security & Verifier Realist — real-or-cosmetic; machine-actionable or gloss; what the verifier enforces.
- **KRT** — Knowledge-Representation & Relation-Algebra Theorist — coherent composable algebra, or a mnemonic?
- **PRV** — Privacy & Correlation-Resistance Specialist — linkability handles; is the critique aimed at the right layer?
- **SPC** — Spec-Precision & Language Designer — will two implementers build the same thing?
- **SKP** — First-Principles Skeptic — is the problem real, and does this solve it? argue the null hypothesis.
- **GOV** — Governance, Interop & Lifecycle Architect — who arbitrates; cross-ecosystem semantics; migration; four-impl parity.
- **CSR** — CESR / Wire-Format & Serialization Engineer — code-table slots, sizing, version strings, parser desync.

## Use

```
./install.sh
```

Then invoke the `keri-review-panel` workflow with:

```
args = {
  proposal: "<url | file path | pasted proposal text / email thread>",
  targets:  ["/home/you/code/keripy", "/home/you/code/signify-ts", ...],  // repos/specs to cross-reference
  baseDir:  "<absolute launching cwd>",        // for resolving relative targets
  personas: ["SEC","KRT","GOV"] | "auto" | omit // omit = default four; "auto" = topic dispatch
}
```

The panel writes per-persona reports + one synthesis to the run's `reviews/` directory and returns a
deduped, triaged findings queue.

## Two durability guarantees

1. **Citations re-anchor at review time.** `keri-doctrine.md` line numbers are hints verified at a
   fixed commit (stamped in the file); personas re-grep the *live* source they are pointed at and
   cite the current line/symbol, so panel *findings* never inherit the doctrine's citation rot. Run
   `./freshness.sh` to see which doctrine quotes have drifted.
2. **The doctrine is regenerable.** `reference/` holds the full bible and the per-source mining
   notes it was built from (in the sibling `keri-bible` workspace), so the doctrine can be refreshed
   against a newer spec/code baseline.

### A note on cross-model perspective
The KRT (relation-algebra) lens is the best candidate to run on a *non-Claude* model for genuine
perspective variety, since its core skill is model-independent formal reasoning. It is authored on
Claude here; to get an outside read, run its persona file + the proposal through `codex exec` or
`gemini -p` and fold the result in. Model diversity buys reasoning variety, **not** KERI-correctness
— that comes only from `keri-doctrine.md` and the re-anchoring discipline.
