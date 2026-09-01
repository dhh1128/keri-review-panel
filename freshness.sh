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
# Paths follow the per-org bucket layout under ~/code (see ~/code/repos.yaml). These were
# corrected on 2026-09-01: every root previously named a pre-reorg path like
# /home/daniel/code/kswg-keri-specification, none of which had existed since the repos moved
# into org buckets. Because a missing root was skipped silently, the script built an empty
# corpus and reported every quote as drifted -- or was simply never run. It now fails loudly.
CODE="${CODE_ROOT:-$HOME/code}"
SOURCES=(
  "$CODE/wot/kswg-keri-specification/spec"
  "$CODE/me/kswg-cesr-specification/spec"
  "$CODE/me/kswg-acdc-specification/spec"
  "$CODE/me/kswg-dossier-specification/spec"
  "$CODE/me/papers"
  "$CODE/wot/keripy/src"
  "$CODE/wot/keria/src"
  "$CODE/wot/signify-ts/src"
  "$CODE/wot/keri-security-analysis"
  "$CODE/wot/keripy-knowledge"
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
# Resolve roots BEFORE building the corpus. The counting must not happen inside the pipeline
# below: `for ... done | norm` runs the loop in a subshell, so any counter incremented there is
# lost when it exits. (That exact bug shipped for one commit here.)
LIVE_ROOTS=()
for root in "${SOURCES[@]}"; do
  if [ -e "$root" ]; then
    LIVE_ROOTS+=("$root")
  else
    echo "WARNING: source root missing, skipping: $root" >&2
  fi
done

# A dead config looks exactly like total citation rot. Refuse to report that as a result.
if [ "${#LIVE_ROOTS[@]}" -eq 0 ]; then
  echo "ERROR: no source roots exist. Fix SOURCES in $0 (or set CODE_ROOT). Not reporting drift." >&2
  exit 2
fi
if [ "${#LIVE_ROOTS[@]}" -lt $(( ${#SOURCES[@]} / 2 )) ]; then
  echo "WARNING: fewer than half the source roots resolved; 'drifted' counts below are unreliable." >&2
fi

for root in "${LIVE_ROOTS[@]}"; do
  find "$root" -type f \( -name '*.md' -o -name '*.py' -o -name '*.ts' -o -name '*.txt' \) \
    -not -path '*/node_modules/*' -not -path '*/.git/*' -print0 2>/dev/null | xargs -0 cat 2>/dev/null
done | norm > "$CORPUS"
echo "corpus: $(wc -c < "$CORPUS") bytes from ${#LIVE_ROOTS[@]}/${#SOURCES[@]} roots" >&2

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
  echo "A miss falls into one of three classes, and only the third is actionable:"
  echo "  1. NOT A CITATION. Illustrative 'outsider-framing' quotes in the shibboleth table, and"
  echo "     persona prose in quotation marks, are hypothetical text. They can never be found."
  echo "  2. NOT ON DISK. Quotes from GitHub discussions (keripy #934/#1095/#1613/#1618/#1627) and"
  echo "     from SmithSamuelM/Papers kram.md are cited by the doctrine but are not filesystem"
  echo "     sources, so they are absent from SOURCES by design and always report missing."
  echo "  3. REAL DRIFT. A quote that should be in a spec/paper/code root and is not. This is the"
  echo "     signal: re-read the source and re-anchor the citation."
  echo "This script cannot tell the three apart, so treat the total as an upper bound, not a score."
  printf '  - %s\n' "${MISSING_LIST[@]}"
fi
[ $missing -eq 0 ]
