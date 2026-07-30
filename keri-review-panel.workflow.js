export const meta = {
  name: 'keri-review-panel',
  description: 'Adversarial multi-persona review of a KERI/ACDC/CESR DESIGN proposal (spec change, discussion, PR, worked example, or pasted prose). Reasons in KERI\'s own terms via keri-doctrine.md; dedupes by dedupe_key and adjudicates dispositions. args is an OBJECT (see whenToUse).',
  whenToUse: 'For a multi-lens review of a KERI/ACDC/CESR design argument. ARGS (object): proposal = the design argument — a URL (GitHub PR/discussion), a file path, or pasted text / an email thread (required). targets = array of repo/spec pointers the proposal touches (e.g. ["/…/keripy","/…/signify-ts"]) that personas cross-reference to verify machine-behavior claims; relative pointers resolve against baseDir. baseDir = the launching session absolute cwd (for relative targets/outDir). personas = array of names/prefixes (SEC,KRT,PRV,SPC,SKP,GOV,CSR), the string "auto" (topic-dispatch picks load-bearing lenses from the proposal), or omitted (DEFAULT four: SEC,SKP,SPC,GOV). Optional: milestone (run label), outDir (where reviews are written; default <baseDir>/keri-review-<YYYY-MM-DD>-<milestone>), concurrency (default 3), effort, model, overrides = {PREFIX:{effort,model}}, verify ("off"|"default"|"all"). Writes per-persona reports + one synthesis to <outDir>/reviews/ (outDir defaults to <baseDir>/keri-review-<YYYY-MM-DD>-<milestone>, so runs never overwrite each other) and returns the triaged queue.',
  phases: [
    { title: 'Preflight', detail: 'normalize the proposal (fetch URL / read file / accept text), resolve the panel prompts dir, validate targets' },
    { title: 'Scope', detail: 'topic-dispatch lens selection (only when personas: "auto")' },
    { title: 'Review', detail: 'one agent per persona, unattended, chunked to respect the RAM ceiling' },
    { title: 'Verify', detail: 'adversarially refute high-stakes findings (CRITICAL, security, or invulnerability-objective) before they reach the queue' },
    { title: 'Synthesize', detail: 'merge by dedupe_key (most-obligated severity wins) + executive summary' },
    { title: 'Persist', detail: 'write the synthesis + per-persona reports to <outDir>/reviews/' },
  ],
}

// ---- inputs ----
if (!args || typeof args.proposal !== 'string' || !args.proposal.trim())
  throw new Error('keri-review-panel requires args.proposal = the design argument (a URL, a file path, or pasted text).')
const PROPOSAL_INPUT = args.proposal.trim()
const BASE_DIR = args && typeof args.baseDir === 'string' ? args.baseDir.replace(/\/+$/, '') : null
const milestone = (args && args.milestone) || 'review'
const CONCURRENCY = (args && args.concurrency) || 3
const TARGET_POINTERS = (args && Array.isArray(args.targets)) ? args.targets : []

const ALL_PERSONAS = [
  { slug: 'protocol-security-verifier-realist', prefix: 'SEC', name: 'Protocol Security & Verifier Realist', bible: '02, 03, 07', effort: 'deep' },
  { slug: 'kr-relation-algebra-theorist', prefix: 'KRT', name: 'Knowledge-Representation & Relation-Algebra Theorist', bible: '05, 06, 07', effort: 'deep' },
  { slug: 'privacy-correlation-resistance-specialist', prefix: 'PRV', name: 'Privacy & Correlation-Resistance Specialist', bible: '06, 05, 07', effort: 'medium' },
  { slug: 'spec-precision-language-designer', prefix: 'SPC', name: 'Spec-Precision & Language Designer', bible: '01, 04, 07', effort: 'medium' },
  { slug: 'first-principles-skeptic', prefix: 'SKP', name: 'First-Principles Skeptic', bible: '02, 01, 07', effort: 'medium' },
  { slug: 'governance-interop-lifecycle-architect', prefix: 'GOV', name: 'Governance, Interop & Lifecycle Architect', bible: '06, 05, 07', effort: 'medium' },
  { slug: 'cesr-wire-serialization-engineer', prefix: 'CSR', name: 'CESR / Wire-Format & Serialization Engineer', bible: '04, 03, 07', effort: 'medium' },
]
const NAME_TO_PREFIX = {
  sec: 'SEC', security: 'SEC', krt: 'KRT', kr: 'KRT', 'relation-algebra': 'KRT',
  prv: 'PRV', privacy: 'PRV', spc: 'SPC', spec: 'SPC', 'spec-precision': 'SPC',
  skp: 'SKP', skeptic: 'SKP', gov: 'GOV', governance: 'GOV', interop: 'GOV',
  csr: 'CSR', cesr: 'CSR', wire: 'CSR',
}
const toPrefix = (t) => NAME_TO_PREFIX[String(t).toLowerCase().trim()] || String(t).toUpperCase().trim()
const VALID = new Set(ALL_PERSONAS.map((p) => p.prefix))
const DEFAULT_PREFIXES = ['SEC', 'SKP', 'SPC', 'GOV']
const AUTO_SCOPE = args && args.personas === 'auto'
let wanted = AUTO_SCOPE ? null : (args && Array.isArray(args.personas) ? args.personas.map(toPrefix) : DEFAULT_PREFIXES)
let PERSONAS = AUTO_SCOPE ? null : ALL_PERSONAS.filter((p) => wanted.includes(p.prefix))

const FINDINGS_SCHEMA = {
  type: 'object', required: ['findings'], additionalProperties: false,
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'persona', 'title', 'severity', 'confidence', 'dedupe_key', 'objective_function', 'layer', 'location', 'evidence', 'failure_scenario', 'recommended_disposition'],
        properties: {
          id: { type: 'string' }, persona: { type: 'string' }, title: { type: 'string' },
          severity: { enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          confidence: { enum: ['CONFIRMED', 'LIKELY', 'SPECULATIVE'] },
          dedupe_key: { type: 'string' },
          objective_function: { enum: ['survivability', 'invulnerability'] },
          layer: { enum: ['keri-core', 'acdc', 'governance', 'deployment', 'wire'] },
          location: { type: 'string' }, evidence: { type: 'string' },
          steelman: { type: ['string', 'null'] }, failure_scenario: { type: 'string' },
          recommended_disposition: { enum: ['recommend-revise', 'recommend-reject', 'recommend-accept', 'needs-info'] },
          bucket: { type: ['string', 'null'] }, revisit_condition: { type: ['string', 'null'] },
        },
      },
    },
  },
}

async function runChunked(items, size, fn) {
  const out = []
  for (let i = 0; i < items.length; i += size) out.push(...await parallel(items.slice(i, i + size).map((it) => () => fn(it))))
  return out
}

// ---- Phase 0: preflight — normalize the proposal, locate prompts, validate targets ----
phase('Preflight')
const targetsForAgent = TARGET_POINTERS.map((t) => (t.startsWith('/') || !BASE_DIR) ? t : `${BASE_DIR}/${t}`)
const PREFLIGHT_SCHEMA = {
  type: 'object', required: ['short_name', 'normalized_proposal', 'proposal_kind', 'prompts_dir', 'targets', 'today'], additionalProperties: false,
  properties: {
    short_name: { type: 'string' },
    normalized_proposal: { type: 'string' },
    proposal_kind: { enum: ['url', 'file', 'text'] },
    today: { type: 'string' },
    prompts_dir: { type: ['string', 'null'] },
    targets: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['pointer', 'resolved', 'kind', 'exists'], properties: { pointer: { type: 'string' }, resolved: { type: ['string', 'null'] }, kind: { type: 'string' }, exists: { type: 'boolean' } } } },
  },
}
const pf = await agent(
  `You are the preflight for a KERI design-review panel. Do THREE things, make no edits:\n\n` +
  `1. NORMALIZE THE PROPOSAL. The proposal is provided below between <<< >>>. Decide its kind:\n` +
  `   - if it looks like a URL (starts with http), FETCH it (WebFetch) and extract the actual proposal/discussion/PR text;\n` +
  `   - else if it is an existing file path (test -f), READ it;\n` +
  `   - else treat it as literal pasted text (an email thread or ad-hoc description).\n` +
  `   Produce a self-contained "normalized_proposal": a faithful, complete statement of what is being proposed and why ` +
  `   (preserve the author's claims and any concrete examples; do not editorialize or critique). Give it a short_name (kebab, for filenames).\n` +
  `   Proposal:\n<<<\n${PROPOSAL_INPUT}\n>>>\n\n` +
  `2. LOCATE THE PANEL PROMPTS. Run: readlink -f ~/.claude/workflows/keri-review-panel.js 2>/dev/null ; take the DIRECTORY of the resolved ` +
  `   path as prompts_dir (it holds keri-doctrine.md, review-house-style.md, orchestrating-reviews.md, personas/). If the symlink is missing, prompts_dir = null.\n\n` +
  `3. VALIDATE TARGETS. For each of these pointers ${JSON.stringify(targetsForAgent)}: run \`git -C "<p>" rev-parse --show-toplevel\` ` +
  `   (if it is a git repo, resolved = toplevel, kind = "code-repo" or "spec-repo" by content); else if the path exists, resolved = it, kind = "dir"/"file"; else exists=false. Run shell under \`nice -n 19 ionice -c 3\`.\n\n` +
  `4. DATE THE RUN. Run: date +%F ; return it as "today" (YYYY-MM-DD). It names this run's output directory, so runs never collide.\n\n` +
  `Return {short_name, normalized_proposal, proposal_kind, prompts_dir, targets:[{pointer, resolved, kind, exists}], today}.`,
  { label: 'preflight', phase: 'Preflight', schema: PREFLIGHT_SCHEMA },
)
if (!pf) return { error: 'preflight failed' }
const PROMPTS_DIR = (args && args.promptsDir) || pf.prompts_dir
if (!PROMPTS_DIR) return { error: 'could not locate panel prompts. Run ./install.sh (creates the ~/.claude/workflows/keri-review-panel.js symlink) or pass args.promptsDir.', preflight: pf }
const shortName = pf.short_name || 'proposal'
const NORMALIZED = pf.normalized_proposal
const goodTargets = (pf.targets || []).filter((t) => t.exists)
// A proposal review is not owned by any single target repo, so it gets its own run directory
// rather than writing into a target's reviews/ — the named exception in bakobo/dev
// standards/reviews.md. The <YYYY-MM-DD>-<milestone> naming is the same either way.
const RUN_DATE = pf.today
const RUN_DIR_NAME = `${RUN_DATE}-${milestone}`
const OUT = ((args && args.outDir) || (BASE_DIR ? `${BASE_DIR}/keri-review-${RUN_DIR_NAME}` : `${PROMPTS_DIR}/runs/${RUN_DIR_NAME}`)).replace(/\/+$/, '')
const reviewsDir = `${OUT}/reviews`
const targetsBlock = goodTargets.length ? goodTargets.map((t) => `${t.resolved} (${t.kind})`).join(', ') : '(none supplied — reason from the proposal + doctrine; flag where a code/spec check is needed but unavailable)'
log(`Proposal "${shortName}" (${pf.proposal_kind}); prompts ${PROMPTS_DIR}; targets: ${targetsBlock}; out ${reviewsDir}`)

// ---- Phase 0.5: topic dispatch (only when personas: "auto") ----
if (AUTO_SCOPE) {
  phase('Scope')
  const SCOPE_SCHEMA = { type: 'object', required: ['personas', 'skipped'], additionalProperties: false, properties: { personas: { type: 'array', items: { type: 'string' } }, skipped: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['prefix', 'reason'], properties: { prefix: { type: 'string' }, reason: { type: 'string' } } } } } }
  const catalog = ALL_PERSONAS.map((p) => `${p.prefix} (${p.name})`).join('; ')
  const scope = await agent(
    `Pick which review lenses are LOAD-BEARING for this KERI design proposal. Read each persona's "Trigger topics" ` +
    `in ${PROMPTS_DIR}/personas/*.md, then map the proposal to lenses. Always include SEC and SKP (broadly load-bearing). ` +
    `Add others only where the proposal genuinely triggers them (e.g. edges/operators -> KRT; disclosure/correlation -> PRV; ` +
    `new spec notation/defaults -> SPC; EGF/cross-ecosystem/versioning -> GOV; new CESR primitive/wire change -> CSR). Skip a lens with a reason ` +
    `when the proposal has no surface for it (e.g. CSR for a pure-semantics proposal that adds no wire primitive).\n\n` +
    `Lenses: ${catalog}.\nProposal:\n<<<\n${NORMALIZED}\n>>>\n\nReturn {personas:[prefixes to RUN], skipped:[{prefix, reason}]}. Use only: ${[...VALID].join(', ')}.`,
    { label: 'scope', phase: 'Scope', schema: SCOPE_SCHEMA, agentType: 'Explore' },
  )
  const chosen = [...new Set((scope && Array.isArray(scope.personas) ? scope.personas : []).map(toPrefix).filter((x) => VALID.has(x)))]
  wanted = chosen.length ? chosen : DEFAULT_PREFIXES
  PERSONAS = ALL_PERSONAS.filter((p) => wanted.includes(p.prefix))
  const skips = (scope && Array.isArray(scope.skipped) ? scope.skipped : []).map((s) => `${s.prefix}: ${s.reason}`)
  log(`Scope: running ${wanted.join(', ')}${skips.length ? `; skipped — ${skips.join(' | ')}` : ''}`)
}

// ---- Phase 1: fan out the personas ----
phase('Review')
const plan = PERSONAS.map((p) => ({
  ...p,
  eff: (args.overrides && args.overrides[p.prefix] && args.overrides[p.prefix].effort) || args.effort || p.effort,
  mdl: (args.overrides && args.overrides[p.prefix] && args.overrides[p.prefix].model) || args.model || null,
}))
log(`Review plan: ${plan.map((p) => `${p.prefix}/${p.eff}`).join(', ')}`)
const perPersona = await runChunked(plan, CONCURRENCY, (p) => {
  const opts = { label: `review:${p.prefix}`, phase: 'Review', schema: FINDINGS_SCHEMA, effort: p.eff }
  if (p.mdl) opts.model = p.mdl
  return agent(
    `You are the ${p.name} (${p.prefix}) persona of the keri-review-panel, reviewing a DESIGN proposal in UNATTENDED mode ` +
    `(effort: ${p.eff}, run_label: "${milestone}"). Run any shell under \`nice -n 19 ionice -c 3\`.\n\n` +
    `LOAD, in order: ${PROMPTS_DIR}/keri-doctrine.md ; ${PROMPTS_DIR}/review-house-style.md ; ${PROMPTS_DIR}/orchestrating-reviews.md ; ` +
    `your persona ${PROMPTS_DIR}/personas/${p.slug}.md ; your depth reading ${PROMPTS_DIR}/reference/bible/ sections ${p.bible}.\n\n` +
    `THE PROPOSAL UNDER REVIEW:\n<<<\n${NORMALIZED}\n>>>\n\n` +
    `TARGET SOURCES to cross-reference (verify machine-behavior claims here; RE-ANCHOR every citation against these LIVE sources — ` +
    `never cite a doctrine line number you have not re-confirmed): ${targetsBlock}.\n\n` +
    `Do your review exactly as your persona file and orchestrating-reviews.md prescribe: steelman first, then find only real, ` +
    `grounded findings (say "nothing in my lens" if that is honest), each with objective_function + layer + the ` +
    `non-goal/proof-scope/deployment-gap bucket, and run the pre-ship sneer-test self-check. Use id prefix "${p.prefix}-" and the ` +
    `dedupe_key convention (name the ISSUE, not the symptom, so sibling lenses merge). Write your narrative report to the ABSOLUTE path ` +
    `"${reviewsDir}/${p.slug}-${milestone}.md" (create "${reviewsDir}"; do NOT git add/commit). Then return the findings manifest as structured output.`,
    opts,
  ).then((r) => (r && Array.isArray(r.findings) ? r.findings : []))
})
const raw = perPersona.filter(Boolean).flat()
log(`${raw.length} raw findings from ${PERSONAS.length} personas`)

// ---- Phase 1.5: adversarial verify (refute high-stakes findings) ----
const verifyMode = (args && args.verify) || 'default'
const VERIFY_SCHEMA = { type: 'object', required: ['verdict', 'note'], additionalProperties: false, properties: { verdict: { enum: ['confirmed', 'refuted', 'uncertain'] }, note: { type: 'string' } } }
const verifyGate = (f) => verifyMode === 'all'
  ? (f.severity === 'CRITICAL' || f.severity === 'HIGH') && (f.recommended_disposition === 'recommend-revise' || f.recommended_disposition === 'recommend-reject')
  : (f.severity === 'CRITICAL' || f.persona === 'protocol-security-verifier-realist' || f.objective_function === 'invulnerability')
let refuted = []
const verById = new Map()
if (verifyMode !== 'off') {
  phase('Verify')
  const toVerify = raw.filter(verifyGate)
  if (!toVerify.length) log(`Verify (${verifyMode}): no findings matched the gate`)
  else {
    log(`Verify (${verifyMode}): adversarially checking ${toVerify.length} of ${raw.length}`)
    const verdicts = (await runChunked(toVerify, CONCURRENCY, (f) =>
      agent(
        `Adversarially try to REFUTE this KERI design-review finding — actively look for why it is WRONG, not why it is right. ` +
        `Ground yourself in ${PROMPTS_DIR}/keri-doctrine.md. Cross-check the live target sources (${targetsBlock}) under \`nice -n 19 ionice -c 3\`.\n\n` +
        `A finding is REFUTED if: it rests on a generic PKI/IAM/blockchain/SD-JWT prior the doctrine rejects; it assumes an INVULNERABILITY ` +
        `objective where survivability is the design goal; it faults KERI-core for a higher-layer (ACDC/governance/deployment) property; ` +
        `its machine-behavior claim does not hold against the re-anchored code/spec; or it is a documented non-goal or proof-scope limit, not a real gap.\n\n` +
        `Finding:\n  id: ${f.id}\n  title: ${f.title}\n  severity: ${f.severity}\n  objective_function: ${f.objective_function}\n  layer: ${f.layer}\n  location: ${f.location}\n  evidence: ${f.evidence}\n  failure_scenario: ${f.failure_scenario}\n\n` +
        `Return {verdict, note}: "confirmed" (holds against the doctrine and re-anchored sources), "refuted" (concrete contrary evidence — a category error, wrong layer, non-goal, or failed code check), or "uncertain". DEFAULT to "uncertain" unless you can establish it. note = one line.`,
        { label: `verify:${f.id}`, phase: 'Verify', schema: VERIFY_SCHEMA },
      ).then((r) => ({ id: f.id, verdict: (r && r.verdict) || 'uncertain', note: (r && r.note) || '' }))
        .catch((e) => ({ id: f.id, verdict: 'uncertain', note: `verification failed (${(e && e.message) || 'no verdict'})` }))
    )).filter(Boolean)
    for (const v of verdicts) verById.set(v.id, v)
    for (const f of raw) { const v = verById.get(f.id); if (v) f.verification = v }
    refuted = raw.filter((f) => f.verification && f.verification.verdict === 'refuted')
    const rids = new Set(refuted.map((f) => f.id))
    raw.splice(0, raw.length, ...raw.filter((f) => !rids.has(f.id)))
    log(`Verify: ${verdicts.filter((v) => v.verdict === 'confirmed').length} confirmed, ${refuted.length} refuted (excluded), ${verdicts.filter((v) => v.verdict === 'uncertain').length} uncertain`)
  }
}

// ---- merge by dedupe_key ----
const SEV = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
const merged = new Map()
for (const f of raw) {
  const k = f.dedupe_key
  if (!merged.has(k)) merged.set(k, { ...f, reported_by: [f.persona] })
  else { const m = merged.get(k); if (!m.reported_by.includes(f.persona)) m.reported_by.push(f.persona); if (SEV[f.severity] < SEV[m.severity]) m.severity = f.severity }
}
const items = [...merged.values()].sort((a, b) => SEV[a.severity] - SEV[b.severity])
log(`${raw.length} raw -> ${items.length} after exact-key dedupe`)

// ---- Phase 2: synthesize ----
phase('Synthesize')
const SYN_SCHEMA = { type: 'object', required: ['summary', 'duplicateGroups'], additionalProperties: false, properties: { summary: { type: 'string' }, duplicateGroups: { type: 'array', items: { type: 'array', items: { type: 'string' } } } } }
const synth = await agent(
  `You are the synthesis step for the keri-review-panel review of "${shortName}". Here are ${items.length} findings, merged by exact dedupe_key (JSON):\n${JSON.stringify(items)}\n\n` +
  `Return {summary, duplicateGroups}:\n` +
  `1. summary: a 4-6 sentence executive verdict — is the proposal sound in KERI's terms; the blocking findings (CRITICAL/HIGH recommend-revise/reject); the single most important thing the author should address. Do not restate every finding.\n` +
  `2. duplicateGroups: arrays of finding ids that describe the SAME underlying issue across lenses and should merge (judge from title + location + evidence). Be conservative; [] if none.`,
  { label: 'synthesize', phase: 'Synthesize', schema: SYN_SCHEMA },
)
const summary = (synth && synth.summary) || ''
const dgroups = (synth && Array.isArray(synth.duplicateGroups)) ? synth.duplicateGroups : []
const byId = new Map(items.map((f) => [f.id, f]))
const dropped = new Set(); const canon = new Map()
for (const g of dgroups) {
  const mem = [...new Set(g)].filter((id) => byId.has(id) && !dropped.has(id)).map((id) => byId.get(id))
  if (mem.length < 2) continue
  const c = mem.reduce((b, m) => SEV[m.severity] < SEV[b.severity] ? m : b, mem[0])
  const rb = [...c.reported_by]
  for (const m of mem) { if (m === c) continue; for (const p of m.reported_by) if (!rb.includes(p)) rb.push(p); dropped.add(m.id) }
  canon.set(c.id, { ...c, reported_by: rb })
}
const reconciled = items.filter((f) => !dropped.has(f.id)).map((f) => canon.get(f.id) || f).sort((a, b) => SEV[a.severity] - SEV[b.severity])
const blockers = reconciled.filter((i) => (i.severity === 'CRITICAL' || i.severity === 'HIGH') && (i.recommended_disposition === 'recommend-revise' || i.recommended_disposition === 'recommend-reject'))
log(`${reconciled.length} reconciled findings, ${blockers.length} blockers`)

// ---- Phase 3: persist ----
phase('Persist')
const personaReports = PERSONAS.map((p) => `${p.slug}-${milestone}.md`)
const PERSIST_SCHEMA = { type: 'object', required: ['path'], additionalProperties: false, properties: { path: { type: 'string' } } }
const persisted = await agent(
  `Write the keri-review-panel synthesis report, then return its path. No source edits, no git add/commit.\n` +
  `Create "${reviewsDir}" if needed, then Write "${reviewsDir}/keri-review-panel-${milestone}.md" with:\n` +
  `1. A header: proposal "${shortName}", targets [${targetsBlock}], milestone "${milestone}", date ${RUN_DATE}, personas (${PERSONAS.map((p) => p.prefix).join(', ')}), counts (${raw.length} raw, ${reconciled.length} after dedupe, ${blockers.length} blockers; verification: ${refuted.length} refuted).\n` +
  `1b. Immediately after the header, on its own line, exactly: "status: untriaged — ${blockers.length} blocking, ${reconciled.length} total." This line is the triage marker; a later session updates it in place as findings are dispositioned.\n` +
  `2. "## Executive verdict" verbatim:\n${summary}\n` +
  `3. "## Findings" — a table sorted CRITICAL->LOW: id | severity | confidence | layer | objective | disposition | reported_by | title.\n` +
  `4. "## Per-persona reports" — bullet list of these sibling files: ${personaReports.join(', ')}.\n` +
  `5. "## Refuted (excluded)" — a table of findings adversarial verify refuted (id | title | note), so nothing is silently lost. Rows:\n${JSON.stringify(refuted.map((f) => ({ id: f.id, title: f.title, note: f.verification ? f.verification.note : '' })))}\n` +
  `6. "## Machine-readable manifest" — a fenced json block with exactly this array:\n${JSON.stringify(reconciled)}\n` +
  `Return {path}.`,
  { label: 'persist', phase: 'Persist', schema: PERSIST_SCHEMA },
)
const reportPath = (persisted && persisted.path) || `${reviewsDir}/keri-review-panel-${milestone}.md`
log(`Synthesis written to ${reportPath}`)

return { proposal: shortName, targets: goodTargets.map((t) => t.resolved), milestone, reportPath, reviewsDir, personas: PERSONAS.map((p) => p.prefix), rawCount: raw.length, blockerCount: blockers.length, refutedCount: refuted.length, items: reconciled, summary }
