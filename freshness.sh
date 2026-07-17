#!/usr/bin/env bash
# freshness.sh — re-anchoring / staleness checker for the keri-review-panel doctrine.
#
# The doctrine cites sources with exact QUOTES as the durable anchor and bare line numbers only as
# hints (see keri-doctrine.md "Citation durability"). This script checks whether each quoted span in
# the target markdown files still exists in the LIVE sources. A quote no longer found is a fail-LOUD
# signal that the source drifted and the citation needs re-verifying.
#
# Matching is robust to markdown markup: both the quote and the sources are normalized (markdown
# emphasis *_` stripped, lowercased, whitespace collapsed) before comparison, so `*key event logs*`
# in a source still matches "key event logs" in a quote. Elided quotes ("A... B") match on their
# longest fragment.
#
# Usage:  ./freshness.sh [file.md ...]     (defaults to keri-doctrine.md + personas/*.md)
set -uo pipefail

# --- config: live source roots (edit to match your checkout locations) ---
SOURCES=(
  "/home/daniel/code/kswg-keri-specification/spec"
  "/home/daniel/code/kswg-cesr-specification/spec"
  "/home/daniel/code/kswg-acdc-specification/spec"
  "/home/daniel/code/kswg-dossier-specification/spec"
  "/home/daniel/code/papers"
  "/home/daniel/code/keripy/src"
  "/home/daniel/code/keria/src"
  "/home/daniel/code/signify-ts/src"
  "/home/daniel/code/keri-security-analysis"
  "/home/daniel/code/keripy-knowledge"
)
MINLEN=24   # skip short quoted spans (terms/framings, not source citations)

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGETS=("$@")
if [ ${#TARGETS[@]} -eq 0 ]; then
  TARGETS=("$DIR/keri-doctrine.md")
  while IFS= read -r f; do TARGETS+=("$f"); done < <(ls "$DIR"/personas/*.md 2>/dev/null)
fi

# normalize: lowercase; strip markdown emphasis and quote chars; tighten " / " to "/"; collapse ws
norm() { tr 'A-Z' 'a-z' | tr -d '*_`' | tr -d "\"'" | sed -E 's/[—–]/ /g; s# */ *#/#g' | tr -s ' \t\n\r' ' '; }

echo "building normalized source corpus..." >&2
CORPUS="$(mktemp)"; trap 'rm -f "$CORPUS"' EXIT
for root in "${SOURCES[@]}"; do
  [ -e "$root" ] || continue
  find "$root" -type f \( -name '*.md' -o -name '*.py' -o -name '*.ts' -o -name '*.txt' \) \
    -not -path '*/node_modules/*' -not -path '*/.git/*' -print0 2>/dev/null | xargs -0 cat 2>/dev/null
done | norm > "$CORPUS"
echo "corpus: $(wc -c < "$CORPUS") bytes" >&2

total=0; live=0; missing=0
declare -a MISSING_LIST
for tf in "${TARGETS[@]}"; do
  [ -f "$tf" ] || continue
  while IFS= read -r q; do
    span="${q#\"}"; span="${span%\"}"
    frag="${span//.../$'\n'}"        # split elided quotes; test the longest fragment
    longest=""
    while IFS= read -r part; do
      p="$(printf '%s' "$part" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
      [ ${#p} -gt ${#longest} ] && longest="$p"
    done < <(printf '%s\n' "$frag")
    [ ${#longest} -lt $MINLEN ] && continue
    needle="$(printf '%s' "$longest" | norm | sed -E 's/^[[:space:][:punct:]]+//; s/[[:space:][:punct:]]+$//')"
    total=$((total+1))
    if grep -Fq -- "$needle" "$CORPUS" 2>/dev/null; then
      live=$((live+1))
    else
      missing=$((missing+1)); MISSING_LIST+=("[$(basename "$tf")] $longest")
    fi
  done < <(grep -oE "\"[^\"]{$MINLEN,}\"" "$tf")
done

echo "freshness: $live live / $missing missing of $total checked quotes (minlen $MINLEN, markup-normalized)"
if [ $missing -gt 0 ]; then
  echo
  echo "MISSING — not found in live sources; re-verify these citations."
  echo "(Illustrative 'outsider-framing' quotes in the shibboleth table are hypothetical, not source"
  echo " text, so some misses are benign. A source-quote that has genuinely drifted is real signal.)"
  printf '  - %s\n' "${MISSING_LIST[@]}"
fi
[ $missing -eq 0 ]
