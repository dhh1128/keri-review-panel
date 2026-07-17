#!/usr/bin/env bash
# install.sh — symlink the keri-review-panel runner into ~/.claude/workflows/ so it can be invoked
# by name, from any KERI-related checkout, exactly like origin-review-panel / editorial-panel.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WF="$HOME/.claude/workflows"
mkdir -p "$WF"
ln -sfn "$DIR/keri-review-panel.workflow.js" "$WF/keri-review-panel.js"
chmod +x "$DIR/freshness.sh" 2>/dev/null || true
echo "linked $WF/keri-review-panel.js -> $DIR/keri-review-panel.workflow.js"
echo
echo "Invoke from any repo with:  Workflow name 'keri-review-panel'"
echo "  args = { proposal: <url|file|pasted text>, targets: [<repo/spec pointers>], baseDir: <launching cwd> }"
echo "  optional: personas (array | 'auto' | omit=default SEC,SKP,SPC,GOV), milestone, outDir, verify"
