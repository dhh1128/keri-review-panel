#!/usr/bin/env bash
# install.sh — symlink the keri-review-panel runner into ~/.claude/workflows/ so it can be invoked
# by name, from any KERI-related checkout, exactly like origin-review-panel / editorial-panel.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WF="$HOME/.claude/workflows"
mkdir -p "$WF"
ln -sfn "$DIR/keri-review-panel.workflow.js" "$WF/keri-review-panel.js"
chmod +x "$DIR/freshness.sh" "$DIR/sync-reference.sh" 2>/dev/null || true
echo "linked $WF/keri-review-panel.js -> $DIR/keri-review-panel.workflow.js"

# The engine-neutral runner and its skill (see DESIGN.md). The skill goes where Codex and Copilot
# CLI discover user skills; it is deliberately NOT linked into ~/.claude/skills while the Workflow
# above remains the Claude entry point.
BIN="${KRP_BIN_DIR:-$HOME/.local/bin}"
mkdir -p "$BIN" "$HOME/.agents/skills"
chmod +x "$DIR/cli/keri-review-panel.mjs"
ln -sfn "$DIR/cli/keri-review-panel.mjs" "$BIN/keri-review-panel"
ln -sfn "$DIR/skill" "$HOME/.agents/skills/keri-review-panel"
echo "linked $BIN/keri-review-panel -> $DIR/cli/keri-review-panel.mjs"
echo "linked $HOME/.agents/skills/keri-review-panel -> $DIR/skill"
case ":$PATH:" in *":$BIN:"*) ;; *) echo "NOTE: $BIN is not on your PATH; add it, or set KRP_BIN_DIR to a directory that is." ;; esac

# Refresh the vendored doctrine/bible if the keri-bible workspace is here. Non-fatal: the panel is
# meant to run standalone from what it vendors, so a box without keri-bible installs fine and uses
# the committed snapshot. See sync-reference.sh for why this is not a run-time copy.
echo
if "$DIR/sync-reference.sh" >/dev/null 2>&1; then
  sed -n 's/^commit: */reference synced from keri-bible /p' "$DIR/reference/SYNCED-FROM" 2>/dev/null
  if ! git -C "$DIR" diff --quiet -- keri-doctrine.md reference 2>/dev/null; then
    echo "NOTE: the sync changed vendored files — commit this repo so the deployed panel matches."
  fi
else
  echo "NOTE: skipped reference sync (no keri-bible workspace, or it has uncommitted changes)."
  echo "      Using the committed snapshot: $(sed -n 's/^commit: *//p' "$DIR/reference/SYNCED-FROM" 2>/dev/null || echo 'unstamped')"
fi
echo
echo "Invoke from any repo with:  Workflow name 'keri-review-panel'"
echo "  args = { proposal: <url|file|pasted text>, targets: [<repo/spec pointers>], baseDir: <launching cwd> }"
echo "  optional: personas (array | 'auto' | omit=default SEC,SKP,SPC,GOV), milestone, outDir, verify"
