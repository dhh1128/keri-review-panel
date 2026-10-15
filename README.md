# keri-review-panel

A reusable, adversarial multi-persona review panel for claude and codex that analyzes **design proposals in the KERI / ACDC / CESR
ecosystem** — spec changes, GitHub discussions and PRs, worked examples, email threads, or ad-hoc
proposals. Point it at a design argument and it stress-tests that argument from eight distinct
disciplines, each reasoning **in KERI's own terms** rather than importing generic
PKI / IAM / OAuth / blockchain / SD-JWT priors.

## What's here

| File | Role |
|---|---|
| `keri-doctrine.md` | **Domain spine.** How to reason in KERI's terms: 37 numbered rules grouped by topic (trust and identity, security model, keys, wire, data and disclosure, governance and meaning, evidence discipline), each linking to the bible section that grounds it; the shibboleth table; and the evidence standard with its pre-ship self-check. Every persona loads this first. Vendored from `keri-bible`, with its chapter links rewritten to `reference/bible/`. It does not route lenses to chapters; the per-persona `bible` lists in `cli/keri-review-panel.mjs` do. |
| `review-house-style.md` | **Disposition spine.** The adversarial epistemics every persona shares (resist sycophancy, earn findings, no fence-sitting, steelman-before-you-strike). |
| `orchestrating-reviews.md` | **Output contract.** Severity (adoption-obligation) and confidence semantics, `dedupe_key` convention, id prefixes, the re-anchoring rule, the findings manifest schema, and the synthesis contract. |
| `personas/*.md` | The eight reviewer lenses (below). |
| `freshness.sh` | Re-anchoring / staleness checker — greps each doctrine quote against live sources; fail-loud on drift. |
| `cli/` | The runner (`keri-review-panel run`): fetch and snapshot the proposal → (optionally dispatch lenses) → review → merge and dedupe → verify → synthesize → persist, with `codex` and `claude` backends. |
| `skill/SKILL.md` | The skill Claude Code, Codex and Copilot CLI load; it starts the runner and reports the result. |
| `DESIGN.md` | Why the runner is shaped as it is, what was decided and rejected, and what is unverified. |
| `install.sh` | Symlinks the runner onto PATH and the skill into `~/.agents/skills/` and `~/.claude/skills/`, then runs `sync-reference.sh` (non-fatally). |
| `sync-reference.sh` | Refreshes `keri-doctrine.md` + `reference/` from the `keri-bible` workspace (chapters, the assembled bible, and the marker legend), and stamps `reference/SYNCED-FROM` with the source commit. |
| `reference/` | The `bible/` chapters 01-14 (depth reading each persona cites) + `LEGEND.md`, the provenance-marker legend ([spec], [spec-next], [code], [proposal], [practice], [architect]) every persona loads after the doctrine + the assembled `keri-bible.md` + the decentralization-purity steering note. **Vendored, not read live** — see below. |
| `reference/SYNCED-FROM` | Which `keri-bible` commit the vendored copy came from. The preflight reports it into every run's synthesis header. |

## The roster

Default panel: **SEC + SKP + SPC + GOV**. Add-ons dispatched by topic or named explicitly: **KRT,
PRV, CSR, OPS**.

- **SEC** — Protocol Security & Verifier Realist — real-or-cosmetic; machine-actionable or gloss; what the verifier enforces.
- **KRT** — Knowledge-Representation & Relation-Algebra Theorist — coherent composable algebra, or a mnemonic?
- **PRV** — Privacy & Correlation-Resistance Specialist — linkability handles; is the critique aimed at the right layer?
- **SPC** — Spec-Precision & Language Designer — will two implementers build the same thing?
- **SKP** — First-Principles Skeptic — is the problem real, and does this solve it? argue the null hypothesis.
- **GOV** — Governance, Interop & Lifecycle Architect — who arbitrates; cross-ecosystem semantics; migration; four-impl parity.
- **CSR** — CESR / Wire-Format & Serialization Engineer — code-table slots, sizing, version strings, parser desync.
- OPS — Operations & Infrastructure Realist — witness pools and common-mode faults, watchers, mailboxes, discovery, registrars; vendor practice presented as protocol.

## Use

Requirements: Node 20+, `git`, and `gh` (authenticated) for GitHub URLs; plus at least one agent CLI, `codex` or `claude`, logged in.

```
git clone https://github.com/dhh1128/keri-review-panel && cd keri-review-panel && ./install.sh
```

`install.sh` puts `keri-review-panel` on your PATH (`~/.local/bin`, or `$KRP_BIN_DIR`) and links `skill/` into `~/.agents/skills/` (Codex, Copilot CLI) and `~/.claude/skills/` (Claude Code). After that you can ask your agent to "run the keri review panel on <url>", or run it yourself:

```
keri-review-panel run --engine codex \
  --proposal https://github.com/WebOfTrust/keripy/discussions/1515 \
  --target ~/code/keripy --target ~/code/kswg-acdc-specification \
  --personas auto
```

- `--proposal` takes a GitHub PR, issue or discussion URL, another URL, a file, pasted text, or `-` for stdin. It is fetched and snapshotted before any model sees it, so the run records exactly what was reviewed.
- `--target` (repeatable) points at local checkouts that reviewers check claims against. Without targets the review still runs, but flags every claim it could not check.
- `--personas` omitted runs SEC, SKP, SPC, GOV; `auto` picks lenses from the proposal; or name them, e.g. `SEC,KRT,CSR`.
- `--engine-for KRT=claude` (or `VERIFY=claude`, `SUMMARY=codex`…) sends one persona or step to another engine. Verifying on a different lab's model than the reviewers is the cheapest way to decorrelate their blind spots.
- `--dry-run` fetches and snapshots the proposal and prints the plan without calling a model. `--help` lists the rest.

Output goes to `.ignored/keri-review-<date>-<milestone>/` under the current directory (never overwriting an earlier run): `reviews/` holds one report per persona plus the synthesis, `proposal/` the raw snapshot, `progress.log` a line per event (tail it while a run is going), `manifest.json` the findings, and `run.json` every agent call with its engine, timing and cost. A run takes roughly 3–8 minutes per persona, three at a time. Exit status 3 means the run is degraded (a persona or the summary failed); the synthesis and `run.json` say what.

Reviewers run read-only (`codex exec --sandbox read-only`; Claude with read-only tools), and the runner writes every file. `DESIGN.md` explains why.

When a target is a keripy checkout, SEC also reads that checkout's `ref/ErrorHandling.md` live, if present. It states which exception types keripy's intake path catches and skips versus lets propagate, which decides whether a malformed peer message is dropped or crashes a service, so it is a security invariant rather than a style rule. keripy's naming and style conventions (`ref/naming.md`) are deliberately not loaded here; `upstream-pr` hands those to the `/code-review` step a keripy PR also owes.

## Two durability guarantees

1. **Citations re-anchor at review time.** `keri-doctrine.md` line numbers are hints verified at a
   fixed commit (stamped in the file); personas re-grep the *live* source they are pointed at and
   cite the current line/symbol, so panel *findings* never inherit the doctrine's citation rot. Run
   `./freshness.sh` to see which doctrine quotes have drifted.
2. **The doctrine is regenerable.** `reference/` holds the full bible and the per-source mining
   notes it was built from (in the sibling `keri-bible` workspace), so the doctrine can be refreshed
   against a newer spec/code baseline.
3. **The doctrine is vendored, and deliberately not copied at run time.** The panel installs as a
   standalone artifact and must run on boxes where `keri-bible` is absent, so no review may depend on
   a path outside this repo. Vendoring also keeps runs *reproducible*: findings cite the doctrine, and
   a doctrine that mutated under every run would make two runs of the same proposal incomparable —
   which is exactly what the dated run directories exist to prevent. The real hazard is not staleness
   but *silent* staleness, so: sync deliberately with `./sync-reference.sh`, which records the source
   commit in `reference/SYNCED-FROM`; and the preflight reads that stamp, compares it against the
   sibling workspace when present, and writes `doctrine: <commit> (current|STALE: …)` into the run
   header. A stale panel now says so in its own output instead of quietly reviewing against old
   doctrine. It reports; it never auto-syncs mid-run.

### A note on cross-model perspective
The KRT (relation-algebra) lens is the best candidate to run on a *non-Claude* model for genuine
perspective variety, since its core skill is model-independent formal reasoning. With the CLI this is one flag:
`--engine-for KRT=codex`. Model diversity buys reasoning variety, **not** KERI-correctness
— that comes only from `keri-doctrine.md` and the re-anchoring discipline.
