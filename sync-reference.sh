#!/usr/bin/env bash
# sync-reference.sh — refresh this panel's vendored doctrine and bible from the keri-bible workspace.
#
# WHY THIS EXISTS, AND WHY IT IS NOT A RUN-TIME COPY.
#
# The panel is a deployed artifact: install.sh symlinks the workflow into ~/.claude/workflows/ and
# it runs from any checkout, including headless boxes where the keri-bible workspace is absent. So
# the doctrine and the bible sections are VENDORED here, not read live from a sibling directory.
# Two properties follow, both wanted:
#
#   1. The panel runs standalone. No review depends on a path outside this repo.
#   2. A run is reproducible. Findings cite the doctrine; if it mutated under every run, two runs
#      of the same proposal would not be comparable, which defeats the dated run directories.
#
# The failure this fixes is not staleness per se -- it is SILENT staleness. Before 2026-09-01 the
# sync was a hand copy with no record, and the vendored bible drifted three files behind without
# anything saying so. Now: sync deliberately with this script, which stamps reference/SYNCED-FROM
# with the source commit, and the workflow preflight reports that stamp into every run.
#
# Usage:  ./sync-reference.sh [path-to-keri-bible] [--force]
#         KERI_BIBLE=/path/to/keri-bible ./sync-reference.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FORCE=0
SRC=""
for a in "$@"; do
  case "$a" in
    --force) FORCE=1 ;;
    *) SRC="$a" ;;
  esac
done
SRC="${SRC:-${KERI_BIBLE:-$HOME/code/me/keri-bible}}"

if [ ! -d "$SRC/bible" ] || [ ! -f "$SRC/keri-doctrine.md" ]; then
  echo "ERROR: no keri-bible workspace at $SRC (expected bible/ and keri-doctrine.md)." >&2
  echo "       Pass the path as an argument or set KERI_BIBLE." >&2
  exit 2
fi

# A sync must be able to name the commit it came from, so refuse a dirty source tree by default.
if ! git -C "$SRC" diff --quiet || ! git -C "$SRC" diff --cached --quiet; then
  if [ "$FORCE" -eq 0 ]; then
    echo "ERROR: $SRC has uncommitted changes, so the sync could not be stamped with a real commit." >&2
    echo "       Commit there first, or re-run with --force to stamp it as dirty." >&2
    exit 3
  fi
  DIRTY=" (dirty)"
else
  DIRTY=""
fi

SHA="$(git -C "$SRC" rev-parse --short HEAD)"
SUBJ="$(git -C "$SRC" log -1 --format=%s)"
WHEN="$(git -C "$SRC" log -1 --format=%cd --date=short)"

mkdir -p "$DIR/reference/bible"

# Deletions must propagate too: drop vendored sections that no longer exist upstream.
for f in "$DIR"/reference/bible/*.md; do
  [ -e "$f" ] || continue
  base="$(basename "$f")"
  if [ ! -f "$SRC/bible/$base" ]; then
    echo "  removed (gone upstream): reference/bible/$base"
    rm -f "$f"
  fi
done

changed=0
copy() { # copy <src> <dst> <label>
  if [ ! -f "$1" ]; then echo "  skipped (absent upstream): $3"; return; fi
  if [ -f "$2" ] && cmp -s "$1" "$2"; then return; fi
  cp "$1" "$2"
  echo "  updated: $3"
  changed=$((changed+1))
}

copy "$SRC/keri-doctrine.md" "$DIR/keri-doctrine.md" "keri-doctrine.md"
copy "$SRC/keri-bible.md" "$DIR/reference/keri-bible.md" "reference/keri-bible.md"
copy "$SRC/DECENTRALIZATION-PURITY-STEERING.md" "$DIR/reference/DECENTRALIZATION-PURITY-STEERING.md" "reference/DECENTRALIZATION-PURITY-STEERING.md"
for f in "$SRC"/bible/*.md; do
  base="$(basename "$f")"
  copy "$f" "$DIR/reference/bible/$base" "reference/bible/$base"
done

cat > "$DIR/reference/SYNCED-FROM" <<EOF
source:  keri-bible
commit:  ${SHA}${DIRTY}
date:    ${WHEN}
subject: ${SUBJ}
path:    ${SRC}
EOF

echo
if [ "$changed" -eq 0 ]; then
  echo "already in sync with keri-bible ${SHA}${DIRTY} (${WHEN})"
else
  echo "synced ${changed} file(s) from keri-bible ${SHA}${DIRTY} (${WHEN})"
fi
echo "stamp written: $DIR/reference/SYNCED-FROM"
echo
echo "Commit this repo so the deployed panel matches the stamp."
