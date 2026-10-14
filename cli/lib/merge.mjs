// Grouping findings that name one issue. An item is a group of constituent findings; every claim is
// kept whole, gated and verified on its own, and the item shows the fields of its strongest
// SURVIVING constituent (severity, then most blocking disposition, then confidence). So severity,
// disposition, objective and evidence always travel together, a tie cannot hide a reject behind an
// accept, and a refuted claim never lends its severity to the claim that survived.

export const SEV = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
const DISP = { 'recommend-reject': 0, 'recommend-revise': 1, 'needs-info': 2, 'recommend-accept': 3 }
const CONF = { CONFIRMED: 0, LIKELY: 1, SPECULATIVE: 2 }
// A blocking claim (CRITICAL/HIGH recommending revise or reject) outranks any non-blocking one, even
// of higher severity: a CRITICAL/recommend-accept must not hide a HIGH/recommend-reject.
export const isBlocking = (f) => (f.severity === 'CRITICAL' || f.severity === 'HIGH') && ['recommend-revise', 'recommend-reject'].includes(f.recommended_disposition)
const rank = (f) => [isBlocking(f) ? 0 : 1, SEV[f.severity], DISP[f.recommended_disposition], CONF[f.confidence]]
function stronger(a, b) {
  const x = rank(a), y = rank(b)
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i]
  return false
}

export function makeItem(cs) {
  const rep = cs.reduce((b, c) => stronger(c, b) ? c : b, cs[0])
  return { ...rep, reported_by: [...new Set(cs.map((c) => c.persona))], merged_ids: cs.map((c) => c.id), constituents: cs }
}

export const bySeverity = (a, b) => SEV[a.severity] - SEV[b.severity]

// Exact-key merge (orchestrating-reviews.md §9, first step).
export function mergeByKey(raw) {
  const byKey = new Map()
  for (const f of raw) byKey.set(f.dedupe_key, [...(byKey.get(f.dedupe_key) || []), f])
  return [...byKey.values()].map(makeItem).sort(bySeverity)
}

// Apply model-proposed duplicate groups. A group overlapping an earlier accepted group is skipped,
// not chained: [A,B] and [B,C] must not collapse A and C, which may each need a different change.
export function applyGroups(items, groups) {
  const byId = new Map(items.map((f) => [f.id, f])), used = new Set(), grouped = [], skipped = []
  for (const g of groups) {
    const ids = [...new Set(g)].filter((id) => byId.has(id))
    if (ids.length < 2) continue
    if (ids.some((id) => used.has(id))) { skipped.push(ids); continue }
    ids.forEach((id) => used.add(id))
    grouped.push(makeItem(ids.flatMap((id) => byId.get(id).constituents)))
  }
  return { items: [...grouped, ...items.filter((f) => !used.has(f.id))].sort(bySeverity), skipped }
}

// After verify: a refuted claim leaves its item, an item with no surviving claim leaves the queue,
// and the rest are rebuilt so the representative is the strongest claim that survived.
export function dropRefuted(items) {
  const isRefuted = (c) => c.verification?.verdict === 'refuted'
  const refuted = items.flatMap((i) => i.constituents).filter(isRefuted)
  const kept = items.map((i) => { const live = i.constituents.filter((c) => !isRefuted(c)); return live.length ? makeItem(live) : null }).filter(Boolean).sort(bySeverity)
  return { items: kept, refuted }
}
