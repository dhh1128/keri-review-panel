# DESIGN — making the panel run on more than one engine

This file records why the panel has an engine-neutral runner (`cli/`) beside the original Claude Workflow, what was decided, what was rejected, and what has not been verified. It is for whoever next decides whether to change either runner. The README says how to use the panel; this says why it is shaped the way it is.

## The problem

Until 2026-10-14 the panel ran only inside Claude Code. Everything that makes it good is engine-neutral markdown: `keri-doctrine.md`, `review-house-style.md`, `orchestrating-reviews.md`, `personas/*.md` and the vendored `reference/bible/`. But the thing that runs it, `keri-review-panel.workflow.js`, is a script for Claude Code's Workflow runtime: `agent()` with schema validation, `parallel()`, per-call effort and model, and a preflight that finds its own prompts through the `~/.claude/workflows` symlink. A colleague using Codex could read every persona and still had no way to run the panel. Daniel asked whether it could move to Codex, Cursor or Copilot, and wanted a Codex session to argue the design with.

The design below came out of that argument. Codex's full contributions are in two rounds in `.ignored/portability/codex-reply.md` (not tracked); the decisions that came from it are restated here so they survive that file.

## Decisions

**One runner, many backends.** `cli/keri-review-panel.mjs` owns all orchestration as code — fan-out, concurrency, the dedupe_key merge, the verify gate, persistence — and makes each agent call through a backend adapter (`cli/lib/backends.mjs`). Two backends exist: `codex` (`codex exec --output-schema`) and `claude` (`claude -p --json-schema`). An engine can be chosen per run, per persona, or for the verify step, so a finding can be refuted by a different lab's model than the one that raised it. The reason this is worth more than portability: correlated blind spots between reviewer and refuter are the panel's main residual weakness, and a second lab is the cheapest decorrelation available.

**Node, so the Workflow's logic moves over nearly verbatim.** The Workflow is already JavaScript. Python was considered and gained nothing but a translation step in which parity bugs could hide.

**Personas return their report as data; the runner writes every file.** Each review call returns `{report_markdown, findings}` as one structured result. In the Workflow the agent writes its report file and separately returns a manifest, and nothing checks that the two agree. Returning both together removes that divergence and lets reviewers run read-only (`--sandbox read-only` for Codex, read-only tools for Claude), which in turn means a headless run never stalls on an approval prompt. This was Codex's proposal. The persona files still say "write your report to reviews/…" because the Workflow still uses them; the runner's prompt overrides that instruction explicitly rather than forking the persona files.

**The proposal is fetched deterministically and snapshotted before any model sees it.** GitHub PRs, issues and discussions go through `gh`; other URLs through `curl`; files are read; text is taken as given. The raw snapshot is written to `<out>/proposal/` with its source, retrieval time, sha256 and (for a PR) the head commit, and it is passed to every agent fenced as untrusted data. Codex's point, and a good one: GitHub content is mutable, so two runs are only comparable if each records exactly what it read. A deterministic fetch does not make the LLM normalization deterministic — that step is still a model call — but it makes it auditable.

**Schemas are canonicalized per backend.** Codex's structured-output mode requires every property to be listed in `required` and `additionalProperties: false`; optional fields must be expressed as nullable. The runner keeps one schema per call and derives the strict form mechanically (`canonicalize()` in `cli/lib/schemas.mjs`). Every result is re-validated by the runner after parsing, whatever the backend claims, plus semantic checks the schema cannot express: id prefix matches the persona, ids are unique, dedupe_key is kebab-case, the report is non-empty. One retry with the validation errors appended; then the persona is recorded as failed rather than silently dropped.

**Effort names map per engine.** Personas declare `medium` or `deep`. `deep` is not a setting either engine knows: it maps to `high` for both.

**The pipeline follows the contract, not the Workflow, where they disagree.** `orchestrating-reviews.md` §9 says merge by exact key, then semantic dedupe, then verify. The Workflow verifies raw findings before either merge. The runner follows §9, so verify runs once per surviving issue rather than once per duplicate. Likewise, the Workflow's default output directory is `<date>-<milestone>` and a same-day rerun overwrites it; the runner suffixes `-2`, `-3`. Both discrepancies are filed as `P-G8F6`; the Workflow itself is unchanged until Daniel decides. The verify gate is otherwise kept exactly: CRITICAL, any SEC finding regardless of severity, or an invulnerability objective (`all` mode: CRITICAL/HIGH recommending revise or reject).

**Progress is visible without the Workflow UI.** Losing `/workflows` was the main cost Codex named. The runner writes one timestamped line per event to stderr and to `<out>/progress.log`, records every call (engine, model, effort, duration, cost when reported, exit status) in `<out>/run.json`, and keeps each persona's raw result under `<out>/raw/`, so a failed run can be inspected and its completed reviews are not lost.

**One SKILL.md front end for Codex and Copilot.** Both discover skills at `.agents/skills/<name>/SKILL.md` (user-level `~/.agents/skills/`) with `name` and `description` frontmatter. `install.sh` links `skill/` there. The skill tells the host agent to run the CLI in the background, watch `progress.log`, and read the synthesis — it does not orchestrate anything itself.

**The Claude Workflow stays until parity is shown.** It is the reference implementation. It is retired only after a fixed set of proposals produces equivalent reports and manifests through the CLI's `claude` backend, and the CLI's progress reporting has been used in anger on a multi-minute run. Until then Claude users keep using the Workflow, and `install.sh` does not put the skill in `~/.claude/skills`.

## Rejected alternatives

**Port by rewriting the orchestration as prose in a per-engine SKILL.md, and let each engine's own subagents do the fan-out.** Rejected by Claude in the first proposal and confirmed by Codex from the documentation: Codex subagents support parallelism and per-agent model/effort, but no per-child output schema, they inherit the parent's sandbox and approval mode, and a new approval request fails in an unattended flow. Prose orchestration also makes the merge and the verify gate non-repeatable, and produces one divergent copy per engine.

**Extract pure JS helpers shared by the Workflow and the CLI.** Codex's first migration plan. Rejected in round two because a Workflow script is self-contained — it cannot `import` or `require` — so "shared" helpers would be copy-pasted, which is the drift the plan was meant to avoid. Codex agreed, adding the caveat now recorded as the parity condition above: `claude -p` is a fresh process per call and is not automatically equivalent to Workflow `agent()`.

**A four-backend runner up front.** Codex's strongest pushback: Cursor and Copilot adapters would be written with no evidence those CLIs offer equivalent tool access, schema enforcement or sandboxing. Accepted. Only `codex` and `claude` are built; others wait for a probe.

**`claude --bare` for headless Claude calls,** to skip the user's hooks and CLAUDE.md. Rejected because bare mode reads auth only from `ANTHROPIC_API_KEY`, so it fails on a subscription login. The backend instead passes `--settings '{"disableAllHooks":true}'`, `--strict-mcp-config` and `--no-session-persistence`, so a review call does not register itself with session-coord or the tmux registry.

## Review history

The first cut of `cli/` was reviewed adversarially by Codex (gpt-6-sol, read-only) before it was committed, and every finding was fixed. The ones that changed the design, so a later reader does not undo them:

- **Claude reviewers get `--tools Read,Grep,Glob`, not just `--allowedTools`.** `--allowedTools` only pre-approves; it neither removes other tools nor overrides a user setting that allows `Edit`. The first cut also allowed `Bash(git log:*)`, and `git log --output=<file>` writes, which matters because the proposal is untrusted input. (Raised independently by Codex and by the security-guidance plugin.)
- **An exact-key merge keeps the most severe constituent whole.** Raising only the severity could produce `HIGH / recommend-accept`, which then escaped both the blocker count and `--verify all`.
- **Verify sees every constituent claim and refutes only if all fail.** Otherwise refuting the representative's evidence silently discarded a duplicate whose evidence was sound.
- **Fences carry a per-run random token,** so proposal text cannot close its own fence and speak as the runner.
- **The report must name each finding** (by id or exact title), checked by the runner; this is what actually enforces the report/manifest agreement the design claims.
- **Output directories are reserved with a non-recursive `mkdir`,** and an existing `--out` is refused, so concurrent runs cannot share one; `run.json` is rewritten after every call, so a killed run keeps its audit; a failed summary makes the run `degraded` (exit 3) rather than silently complete.

## Known gaps

- Cursor and Copilot backends do not exist, so those agents can host the skill but the reviewers still run on codex or claude. On 2026-10-14 both `codex exec` and `copilot skill list` discovered the skill from `~/.agents/skills`; neither has yet been watched invoking it end to end from a conversation. Cursor's support for `SKILL.md` is unverified.
- Parity with the Workflow is not yet demonstrated on any proposal. Until it is, findings from the two runners should not be compared as if they came from one instrument.
- Evidence so far is three smoke runs on 2026-10-14, all on one 360-character toy proposal (an ACDC `expires` field) against keripy: SEC+SKP on codex alone, the same on claude alone, and SEC+SPC+SKP on codex with verify and summary on claude. All completed with schema-valid results and no retries, and their findings were on-topic and grounded in keripy. That proves the plumbing, not the panel's quality on a real proposal, and none of it is a parity comparison against the Workflow.
- The proposal fetcher handles GitHub PRs, issues and discussions. Other hosts get a raw `curl`, which for an HTML page is noisy and may be wrong; there is no readability extraction.
- Running Codex from inside another sandboxed Codex session fails at startup (its app-server cannot write its state). The CLI must be launched from a normal shell, or the host agent must request escalation for it.
