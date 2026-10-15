#!/usr/bin/env bash
# sync-reference.sh — refresh this panel's vendored doctrine and bible from the keri-bible workspace.
#
# WHY THIS EXISTS, AND WHY IT IS NOT A RUN-TIME COPY.
#
# The panel is a deployed artifact: install.sh puts its runner on PATH and its skill where agents find it, and
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
# with the source commit, and the runner's preflight reports that stamp into every run.
#
# What it vendors: bible/*.md as reference/bible/ (deletions propagate), keri-doctrine.md at the repo
# root, the assembled keri-bible.md, the decentralization-purity steering note, and the provenance-marker
# legend as reference/LEGEND.md. The legend is extracted from keri-bible's docs/house-style.md, the single
# place it is written (build-bible.py takes it from there too), so a persona that loads single chapters
# can read the markers they carry. The doctrine links each rule to `bible/NN-...md#anchor`; here the
# chapters live under reference/bible/, so those links are rewritten to `reference/bible/...` on copy.
# Rewriting is simpler than moving the doctrine under reference/: the runner, the verify step, the
# skill and every persona load it from the repo root, and one sed keeps all of them unchanged.
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

# install <generated-file> <dst> <label>: like copy, for a file this script derived from upstream.
install_gen() {
  if [ -f "$2" ] && cmp -s "$1" "$2"; then rm -f "$1"; return; fi
  mv "$1" "$2"
  echo "  updated: $3"
  changed=$((changed+1))
}

# The doctrine, with its chapter links pointed at where the chapters are vendored, and its pointer to
# the legend pointed at the vendored legend.
TMP="$(mktemp)"
sed -e 's#](bible/#](reference/bible/#g' \
    -e 's#defined in the legend at the top of `keri-bible.md`#defined in the legend at `reference/LEGEND.md`#' \
    "$SRC/keri-doctrine.md" > "$TMP"
install_gen "$TMP" "$DIR/keri-doctrine.md" "keri-doctrine.md (links rewritten to reference/bible/)"

# The provenance-marker legend, from docs/house-style.md's "Provenance markers" section.
if [ -f "$SRC/docs/house-style.md" ] && grep -q '^## Provenance markers' "$SRC/docs/house-style.md"; then
  TMP="$(mktemp)"
  {
    echo '# Provenance markers {#legend}'
    echo
    echo 'Vendored from keri-bible docs/house-style.md by sync-reference.sh; edit it there.'
    awk '/^## Provenance markers/{on=1; next} on && /^## /{exit} on' "$SRC/docs/house-style.md" \
      | sed -e 's# This section is the legend that `build-bible.py` and the site generate from.##'
  } > "$TMP"
  install_gen "$TMP" "$DIR/reference/LEGEND.md" "reference/LEGEND.md"
else
  echo "ERROR: no '## Provenance markers' section in $SRC/docs/house-style.md; cannot vendor the legend." >&2
  exit 4
fi

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
