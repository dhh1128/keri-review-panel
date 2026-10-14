import { test } from 'node:test'
import assert from 'node:assert/strict'
import { REVIEW, canonicalize, validate, reviewSemantics } from '../lib/schemas.mjs'

const P = { prefix: 'SEC', slug: 'protocol-security-verifier-realist' }
const finding = (id) => ({ id, persona: P.slug, title: 't', severity: 'HIGH', confidence: 'LIKELY', dedupe_key: 'a-b', objective_function: 'survivability', layer: 'acdc', location: 'l', evidence: 'e', steelman: null, failure_scenario: 'f', recommended_disposition: 'recommend-revise', bucket: 'deployment-gap', revisit_condition: null })

test('canonical form requires every property and keeps optional ones nullable', () => {
  const c = canonicalize(REVIEW).properties.findings.items
  assert.deepEqual(c.required, Object.keys(c.properties))
  assert.ok(c.properties.revisit_condition.type.includes('null'))
  assert.ok(!c.properties.bucket.enum.includes(null))
})

test('bucket must be one of the three contract values', () => {
  const bad = { report_markdown: '### SEC-F1: t', findings: [{ ...finding('SEC-F1'), bucket: 'banana' }] }
  assert.ok(validate(REVIEW, bad).some((e) => e.includes('bucket')))
  const missing = { report_markdown: '### SEC-F1: t', findings: [finding('SEC-F1')] }
  delete missing.findings[0].bucket
  assert.ok(validate(REVIEW, missing).some((e) => e.includes('bucket: missing')))
})

test('SEC-F10 in the report does not satisfy SEC-F1', () => {
  assert.equal(reviewSemantics({ report_markdown: '### SEC-F10: x', findings: [finding('SEC-F1')] }, P).length, 1)
  const b = 'enough explanatory text to count as a real section body here'
  assert.equal(reviewSemantics({ report_markdown: `### SEC-F1: x\n${b}\n### SEC-F10: y\n${b}`, findings: [finding('SEC-F1'), finding('SEC-F10')] }, P).length, 0)
})

test('ids, persona and dedupe_key are checked', () => {
  const errs = reviewSemantics({ report_markdown: '### SKP-F1: x', findings: [{ ...finding('SKP-F1'), dedupe_key: 'Bad Key' }] }, P)
  assert.ok(errs.some((e) => e.includes('must start with "SEC-"')))
  assert.ok(errs.some((e) => e.includes('kebab-case')))
})

test('a heading split across lines, or one with no body, does not count', () => {
  const body = 'A real explanation of the finding, long enough to say something.'
  assert.equal(reviewSemantics({ report_markdown: `##\nSEC-F1\n${body}`, findings: [finding('SEC-F1')] }, P).length, 1)
  assert.equal(reviewSemantics({ report_markdown: '### SEC-F1: t\n### SEC-F2: u', findings: [finding('SEC-F1')] }, P).length, 1)
  assert.equal(reviewSemantics({ report_markdown: `### SEC-F1: t\n${body}\n## Residual unknowns`, findings: [finding('SEC-F1')] }, P).length, 0)
})
