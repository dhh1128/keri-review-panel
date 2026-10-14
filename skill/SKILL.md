---
name: keri-review-panel
description: Adversarial multi-persona review of a KERI / ACDC / CESR design proposal — a GitHub PR, issue or discussion, a spec change, a worked example, a file, or pasted text. Seven reviewer lenses (security, relation algebra, privacy, spec precision, first-principles skepticism, governance/interop, CESR wire format) reason in KERI's own terms, findings are deduplicated and the high-stakes ones adversarially verified, and a synthesis with a triaged findings table is written to disk. Use when asked to review, stress-test or critique a KERI/ACDC/CESR design or proposal, or to run the keri review panel.
---

# keri-review-panel

You do not perform this review yourself. A runner does it, by launching one headless reviewer per persona and merging their results. Your job is to start it with the right arguments, keep the user informed while it runs, and report what it found.

## 1. Gather the arguments

- **proposal** (required): a URL (GitHub PR, issue or discussion), a file path, or pasted text. For long pasted text, write it to a file first and pass the path.
- **targets**: local checkouts the proposal touches, so reviewers can check claims against real code and specs — e.g. a `keripy`, `keria`, `signify-ts` or `kswg-*-specification` checkout. Ask the user where their checkouts are if you cannot find them; a review without targets still runs, but flags every claim it could not check.
- **personas**: omit for the default four (SEC, SKP, SPC, GOV); `auto` to let the panel pick from the proposal's topic; or a comma list from SEC, KRT, PRV, SPC, SKP, GOV, CSR.

If the user did not say which proposal, ask. Do not guess.

## 2. Run it in the background

The runner lives in the panel repo at `cli/keri-review-panel.mjs`; `install.sh` puts it on PATH as `keri-review-panel`. A run takes several minutes to well over half an hour, so never wait on it in the foreground:

```
keri-review-panel run --engine <your engine: codex or claude> \
  --proposal <url|file> --target <path> [--target <path> ...] [--personas auto] \
  > /tmp/krp-run.json 2> /tmp/krp-run.log &
```

In Claude Code, drop the trailing `&` and start the command with the Bash tool's `run_in_background`, so you are notified when it exits instead of polling.

Pass `--engine codex` if you are Codex, `--engine claude` if you are Claude. If you are another agent (Copilot, Cursor…), the reviewers still have to run on one of those two: use whichever `command -v codex claude` finds, and ask the user if both are present. `--engine-for KRT=claude` (or `VERIFY=claude`, etc.) sends one persona or step to the other engine, which is worth offering when both are installed: a finding refuted by a different lab's model than the one that raised it is better tested.

The runner must be able to start its own agent processes. If you run inside a sandbox that blocks that (Codex in `workspace-write` blocks writes to `~/.codex` state), request escalation for this one command rather than working around it.

Tell the user the run has started, where its progress log is (the second line of `/tmp/krp-run.log` names `<out>/progress.log`), and roughly how long it will take: about 3–8 minutes per persona, with three running at once.

## 3. Report

When the process exits, read `/tmp/krp-run.json`. It names `reportPath`, the synthesis. Read the synthesis and give the user:

- the executive verdict, in a sentence or two;
- the blocking findings (CRITICAL/HIGH recommending revise or reject), one line each;
- the path to the synthesis and to the per-persona reports beside it.

Exit status 3 means the run is degraded — some personas failed, or the summary did: say what, from `degraded`. Exit 1 means the run aborted; the last lines of the log say why. Exit 2 is a usage error. Do not re-run automatically after a failure — report it and let the user decide.

Do not post any of this anywhere. The output is the user's working material, written under `.ignored/` so it is never swept into a commit.
