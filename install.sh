#!/usr/bin/env bash
# install.sh — put the keri-review-panel runner on PATH and its skill where Claude Code, Codex and
# Copilot CLI discover skills. Idempotent; symlinks only.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
chmod +x "$DIR/freshness.sh" "$DIR/sync-reference.sh" "$DIR/cli/keri-review-panel.mjs" 2>/dev/null || true

BIN="${KRP_BIN_DIR:-$HOME/.local/bin}"
mkdir -p "$BIN"
ln -sfn "$DIR/cli/keri-review-panel.mjs" "$BIN/keri-review-panel"
echo "linked $BIN/keri-review-panel -> $DIR/cli/keri-review-panel.mjs"
case ":$PATH:" in *":$BIN:"*) ;; *) echo "NOTE: $BIN is not on your PATH; add it, or set KRP_BIN_DIR to a directory that is." ;; esac

# One skill for every host: ~/.agents/skills for Codex and Copilot CLI, ~/.claude/skills for Claude
# Code (and the second Claude account's config dir, when this box has one).
for d in "$HOME/.agents/skills" "$HOME/.claude/skills" "$HOME/.claude-provenant/skills"; do
  case "$d" in "$HOME/.claude-provenant/"*) [ -d "$HOME/.claude-provenant" ] || continue ;; esac
  mkdir -p "$d"
  ln -sfn "$DIR/skill" "$d/keri-review-panel"
  echo "linked $d/keri-review-panel -> $DIR/skill"
done

# The Claude Workflow runner was retired on 2026-10-14 (see DESIGN.md). Remove links an earlier
# install left in .claude/workflows, but only ones that point into this repo.
for l in "$HOME/.claude/workflows/keri-review-panel.js" "$HOME/.claude-provenant/workflows/keri-review-panel.js"; do
  if [ -L "$l" ] && case "$(readlink "$l")" in "$DIR"/*) true ;; *) false ;; esac; then
    rm "$l" && echo "removed retired workflow link $l"
  fi
done

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
echo "Ask your agent to \"run the keri review panel on <url>\", or run: keri-review-panel run --help"
