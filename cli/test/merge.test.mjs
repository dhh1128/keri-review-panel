// Run: node --test cli/test/*.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeByKey, applyGroups, dropRefuted } from '../lib/merge.mjs'

const f = (id, o = {}) => ({ id, persona: o.persona || 'first-principles-skeptic', title: id, severity: 'MEDIUM', confidence: 'LIKELY', recommended_disposition: 'recommend-revise', objective_function: 'survivability', dedupe_key: 'k', ...o })

test('a tie on severity cannot hide a reject behind an accept', () => {
  const [item] = mergeByKey([f('SPC-F1', { severity: 'HIGH', recommended_disposition: 'recommend-accept' }), f('GOV-F1', { severity: 'HIGH', recommended_disposition: 'recommend-reject' })])
  assert.equal(item.id, 'GOV-F1')
  assert.equal(item.recommended_disposition, 'recommend-reject')
  assert.deepEqual(item.merged_ids, ['SPC-F1', 'GOV-F1'])
})

test('the representative is kept whole, never a mix of two claims', () => {
  const [item] = mergeByKey([f('A-F1', { severity: 'LOW', recommended_disposition: 'recommend-accept', evidence: 'weak' }), f('B-F1', { severity: 'HIGH', evidence: 'strong' })])
  assert.equal(item.severity, 'HIGH')
  assert.equal(item.evidence, 'strong')
  assert.equal(item.recommended_disposition, 'recommend-revise')
})

test('a refuted HIGH does not lend its severity to a surviving LOW', () => {
  const [item] = mergeByKey([f('SEC-F1', { severity: 'HIGH', recommended_disposition: 'recommend-reject' }), f('SKP-F1', { severity: 'LOW' })])
  item.constituents[0].verification = { verdict: 'refuted' }
  item.constituents[1].verification = { verdict: 'confirmed' }
  const { items, refuted } = dropRefuted([item])
  assert.equal(items.length, 1)
  assert.equal(items[0].id, 'SKP-F1')
  assert.equal(items[0].severity, 'LOW')
  assert.deepEqual(refuted.map((c) => c.id), ['SEC-F1'])
})

test('an item whose every claim is refuted leaves the queue', () => {
  const [item] = mergeByKey([f('SEC-F1')])
  item.constituents[0].verification = { verdict: 'refuted' }
  assert.equal(dropRefuted([item]).items.length, 0)
})

test('overlapping groups are not chained', () => {
  const items = mergeByKey([f('A', { dedupe_key: 'a' }), f('B', { dedupe_key: 'b' }), f('C', { dedupe_key: 'c' })])
  const { items: out, skipped } = applyGroups(items, [['A', 'B'], ['B', 'C']])
  assert.equal(out.length, 2)
  assert.deepEqual(skipped, [['B', 'C']])
  assert.ok(out.some((i) => i.merged_ids.includes('C') && i.merged_ids.length === 1))
})

test('constituents keep their own persona and objective for the verify gate', () => {
  const [item] = mergeByKey([f('SPC-F1', { severity: 'MEDIUM' }), f('KRT-F1', { severity: 'LOW', objective_function: 'invulnerability', persona: 'kr-relation-algebra-theorist' })])
  assert.equal(item.objective_function, 'survivability')
  assert.ok(item.constituents.some((c) => c.objective_function === 'invulnerability'))
})

test('a blocking claim outranks a non-blocking one of higher severity', () => {
  const [item] = mergeByKey([f('A-F1', { severity: 'CRITICAL', recommended_disposition: 'recommend-accept' }), f('B-F1', { severity: 'HIGH', recommended_disposition: 'recommend-reject' })])
  assert.equal(item.id, 'B-F1')
})

test('items are re-sorted after refuted claims are dropped', () => {
  const items = mergeByKey([f('SEC-F1', { dedupe_key: 'a', severity: 'CRITICAL' }), f('SKP-F1', { dedupe_key: 'a', severity: 'LOW' }), f('GOV-F1', { dedupe_key: 'b', severity: 'HIGH' })])
  items.find((i) => i.dedupe_key === 'a').constituents.find((c) => c.id === 'SEC-F1').verification = { verdict: 'refuted' }
  assert.deepEqual(dropRefuted(items).items.map((i) => i.id), ['GOV-F1', 'SKP-F1'])
})
