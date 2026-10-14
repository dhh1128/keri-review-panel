// Schemas for every agent call the runner makes, plus the two things each needs from here:
// canonicalize() derives the strict form Codex's structured-output mode demands, and validate()
// re-checks whatever a backend returns, because no backend's own enforcement is trusted.

const FINDING = {
  type: 'object', additionalProperties: false,
  // bucket is required with no null: orchestrating-reviews.md §8 has every finding name which of the
  // three it is. (The Workflow's schema left it optional; the contract does not.)
  required: ['id', 'persona', 'title', 'severity', 'confidence', 'dedupe_key', 'objective_function', 'layer', 'location', 'evidence', 'failure_scenario', 'recommended_disposition', 'bucket'],
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
    bucket: { enum: ['non-goal', 'proof-scope', 'deployment-gap'] }, revisit_condition: { type: ['string', 'null'] },
  },
}

export const REVIEW = {
  type: 'object', additionalProperties: false, required: ['report_markdown', 'findings'],
  properties: { report_markdown: { type: 'string' }, findings: { type: 'array', items: FINDING } },
}

export const NORMALIZE = {
  type: 'object', additionalProperties: false, required: ['short_name', 'normalized_proposal'],
  properties: { short_name: { type: 'string' }, normalized_proposal: { type: 'string' } },
}

export const SCOPE = {
  type: 'object', additionalProperties: false, required: ['personas', 'skipped'],
  properties: {
    personas: { type: 'array', items: { type: 'string' } },
    skipped: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['prefix', 'reason'], properties: { prefix: { type: 'string' }, reason: { type: 'string' } } } },
  },
}

export const DEDUPE = {
  type: 'object', additionalProperties: false, required: ['duplicateGroups'],
  properties: { duplicateGroups: { type: 'array', items: { type: 'array', items: { type: 'string' } } } },
}

export const VERIFY = {
  type: 'object', additionalProperties: false, required: ['verdict', 'note'],
  properties: { verdict: { enum: ['confirmed', 'refuted', 'uncertain'] }, note: { type: 'string' } },
}

export const SUMMARY = {
  type: 'object', additionalProperties: false, required: ['summary'],
  properties: { summary: { type: 'string' } },
}

// Strict form: every property required, no extras, and anything that was optional made nullable
// so "absent" is still expressible. Pure; returns a new schema.
export function canonicalize(s) {
  if (!s || typeof s !== 'object') return s
  const out = { ...s }
  if (s.items) out.items = canonicalize(s.items)
  if (s.properties) {
    const req = new Set(s.required || [])
    out.properties = {}
    for (const [k, v] of Object.entries(s.properties)) {
      let c = canonicalize(v)
      if (!req.has(k)) c = nullable(c)
      out.properties[k] = c
    }
    out.required = Object.keys(s.properties)
    out.additionalProperties = false
  }
  return out
}

function nullable(s) {
  if (s.enum) return s.enum.includes(null) ? s : { ...s, enum: [...s.enum, null] }
  const t = Array.isArray(s.type) ? s.type : [s.type]
  return t.includes('null') ? s : { ...s, type: [...t, 'null'] }
}

// Validates the subset of JSON Schema used above. Returns a list of error strings; empty = valid.
export function validate(schema, value, path = '$') {
  const errs = []
  if (schema.enum) {
    if (!schema.enum.includes(value)) errs.push(`${path}: ${JSON.stringify(value)} not in ${JSON.stringify(schema.enum)}`)
    return errs
  }
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : []
  if (types.length && !types.some((t) => isType(t, value))) {
    errs.push(`${path}: expected ${types.join('|')}, got ${value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value}`)
    return errs
  }
  if (Array.isArray(value) && schema.items) value.forEach((v, i) => errs.push(...validate(schema.items, v, `${path}[${i}]`)))
  if (value && typeof value === 'object' && !Array.isArray(value) && schema.properties) {
    for (const k of schema.required || []) if (!(k in value)) errs.push(`${path}.${k}: missing`)
    for (const [k, v] of Object.entries(value)) {
      if (schema.properties[k]) errs.push(...validate(schema.properties[k], v, `${path}.${k}`))
      else if (schema.additionalProperties === false) errs.push(`${path}.${k}: unexpected property`)
    }
  }
  return errs
}

function isType(t, v) {
  switch (t) {
    case 'null': return v === null
    case 'array': return Array.isArray(v)
    case 'object': return v !== null && typeof v === 'object' && !Array.isArray(v)
    case 'integer': return Number.isInteger(v)
    default: return typeof v === t
  }
}

// Checks the schema cannot express, for one persona's review result.
export function reviewSemantics(result, persona) {
  const errs = []
  if (!result.report_markdown || !result.report_markdown.trim()) errs.push('report_markdown is empty')
  const seen = new Set()
  for (const f of result.findings) {
    if (!f.id.startsWith(`${persona.prefix}-`)) errs.push(`${f.id}: id must start with "${persona.prefix}-"`)
    if (seen.has(f.id)) errs.push(`${f.id}: duplicate id`)
    seen.add(f.id)
    if (f.persona !== persona.slug) errs.push(`${f.id}: persona must be "${persona.slug}", got "${f.persona}"`)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.dedupe_key)) errs.push(`${f.id}: dedupe_key "${f.dedupe_key}" is not kebab-case`)
    // Report and manifest come back together so they cannot silently diverge; this is the check. A
    // heading naming the exact id is required — a substring would let SEC-F10 stand in for SEC-F1.
    // The section must also have a body: a bare heading explains nothing.
    const esc = f.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = new RegExp(`^#{2,4}[ \\t]+${esc}(?![\\w-])[^\\n]*\\n([\\s\\S]*?)(?=^#{1,4}[ \\t]|(?![\\s\\S]))`, 'm').exec(result.report_markdown)
    if (!m) errs.push(`${f.id}: report_markdown has no section headed "### ${f.id}: ..." for this finding`)
    else if (m[1].replace(/\s+/g, '').length < 40) errs.push(`${f.id}: its report section is empty or nearly so; explain the finding there`)
  }
  return errs
}
