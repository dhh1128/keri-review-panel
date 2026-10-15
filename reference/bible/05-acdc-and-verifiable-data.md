# 05 — ACDC and Verifiable Data {#acdc}

## Thesis {#thesis}

An Authentic Chained Data Container (ACDC) is not a credential format in the W3C-VC or SD-JWT sense. It is a fragment of a distributed property graph whose nodes commit to their own content by SAID, whose edges are typed and carry operators, and whose authority is bound not to a signing key but to an issuer's key state anchored in a KEL.

Its goal is not data privacy as such but "the more general goal of protection from the unpermissioned exploitation of data" (ACDC spec > Disclosure Mechanisms, L1659). A critique that measures ACDC against a pure-privacy or pure-ZK yardstick measures the wrong thing.

## Status {#status}

Markers are load-bearing in the edge operators, where the specification's branches, keripy's two evaluators and the discussions disagree. Registrar and Observer are unbuilt, and bulk issuance sits in an annex of undeclared force.

## 1. What an ACDC fundamentally is {#what-an-acdc-is}

An ACDC is an ordered nested field map, serializable in JSON, CBOR, MGPK or CESR, and "One important feature of the fields maps used by ACDC is that they all MUST include a field with a SAID" (ACDC spec > ACDC Message Fields, L2982). It has no type field, because "the Schema, `s`, field itself is the type field" (ACDC spec > Type-is-schema, L182). Field maps are insertion-ordered, never lexicographic (ACDC spec > Ordered Nested Field Maps, L10), which answers the JSON canonicalization fragility of [chapter 07, section 6.4](07-shibboleths-and-anti-patterns.md#json-canonicalization).

### Top-level field order (MUST) {#field-order}

The order is `[v, t, d, u, i, rd, s, a, A, e, r]` (ACDC spec > Field Ordering, L32), the required fields `[v, d, i, s]` (L36), and an ACDC MUST NOT have both a non-empty `a` and a non-empty `A` (L106, L110).

#### Field label restrictions {#field-label-restrictions}

[spec-next] Only `v1.1` @`2362e48a1` constrains labels: "A field label in an ACDC MUST NOT, therefore, contain the character `-`" (ACDC spec > Field Label Restrictions, L63 @`2362e48a1`), because a compact disclosure path replaces `/` with `-`, and a lone `_` is reserved for an edge hop (L65). `v1.1` says nothing about already-issued ACDCs that break these rules; that is the open question. The disclosure path is a negotiation construct, not an ACDC field ([chapter 08, section 4](08-presentation-architectures-and-ipex.md#disclosure-paths)).

## 2. SAIDs and SAIDification {#saids}

"A digital signature on a SAID makes a verifiable cryptographic non-repudiable commitment that is equivalent to a commitment on the full serialization of the associated block from which the SAID was derived" (ACDC spec > SAID Fields, L81). Nested SAIDs let one top-level commitment bind a tree.

[code] keripy pads the id field with `#` to the digest's size (`sad[label] = Dummy * Matter.Sizes[code].fs`, keripy `core/coring.py`, `Saider._derive`, L4085), digests, and injects the result; `Saider.verify` (L4117-4160) fails closed.

There MUST be one way to compute a compactifiable section's SAID: the most compact form SAID, computed depth-first from leaves to trunk (ACDC spec > Most compact form SAID, L130-151). Its stability under compaction "is essential to Graduated Disclosure" (L136).

A schema's SAID sits in `$id`, whose value MUST be the bare SAID, not a URI (ACDC spec > Schema ID Field Label, L186-210).

### The UUID field as a blinding factor {#uuid-blinding}

Without the `u` field, "an adversary may be able to reconstruct the block contents merely from the SAID... and the Schema... using a rainbow or dictionary attack" (ACDC spec > UUID Fields, L89), because schema-allowed values may be far fewer than the digest's strength. So a public compact ACDC "only provides compactness, not privacy" (ACDC spec > Targeted Public-attribute, L501); see [chapter 07, section 10.2](07-shibboleths-and-anti-patterns.md#compact-not-private). A top-level `u` makes an ACDC private, and an empty one marks the metadata variant (ACDC spec > ACDC Variants, L120-174). `v1.1` renames the field Unique Entropy (UE) with unchanged substance, so a search of `v1.1` for UUID finds nothing; this chapter quotes `main` and says UUID.

## 3. Static, immutable schema {#static-schema}

"dynamic Schema references or dynamic Schema generation mechanisms MUST NOT be used" (ACDC spec > Static Schema, L194). A mutable schema enables a schema revocation attack, "effectively revok[ing] all the ACDCs that use that dynamic Schema reference" (L196), and a semantic malleability attack (L198). Hence "all Schemas MUST be static, i.e., Schemas MUST be SADs and therefore verifiable against their SAIDs" (L200), and dereferencing the `$schema` dialect URI "would be an attack vector" (ACDC spec > Schema dialect, L226). See [chapter 07, section 10.3](07-shibboleths-and-anti-patterns.md#schema-dereference).

The `$id` SAID is "the normative determiner" in validation; the semver `version` is "informative" (ACDC spec > Schema Versioning, L230). "Unavailable does not mean insecure or unverifiable. ACDCs MUST be verifiable when available" (ACDC spec > Schema Availability, L242).

## 4. Attribute section `a` vs aggregate section `A` {#attribute-vs-aggregate}

The choice between these two disclosure mechanisms fixes at issuance what can ever be disclosed separately.

The attribute section `a` is a labeled field map with reserved labels `d, u, i, dt` (ACDC spec > Attribute Section, L260). An Issuee `i` makes the ACDC Targeted (L312); without one it is "issued 'to whom it may concern'" (L330). Its labels are public, so it supports partial disclosure, a withheld block travelling as its SAID.

The aggregate section's "compact value is an aggregate / AGID (Aggregate ID), NOT a SAID" (ACDC spec > Aggregate Section, L661). It is an array of blinded blocks whose labels live inside them, so order "is not correlated to the actual order" (L694). The AGID is a digest over the list of block SAIDs (L712-747). A partially disclosed block "exposes, at the very least, the labels of other fields in its enclosing block," and a selectively disclosed one does not (L2733).

### The deciding question {#deciding-question}

[practice] "Does hiding the field labels or positions buy you anything?" (bakobo/schema `docs/choosing-attribute-vs-aggregate.md`). The same document says "an aggregate can disclose one element with no issuee", which is true of the mechanism and false, at keripy `80f77b73b`, for a registry-backed credential presented through keripy's V2 IPEX ([section 4.1](#age-credential)).

[proposal] Sam orders the choice by issuer first: "If two pieces of information have different issuers then they must be in different ACDCs and then a blindable edge enables graduated disclosure." ([keripy conversations > discussion #1550](https://github.com/WebOfTrust/keripy/discussions/1550#discussioncomment-17909785), comment of 2026-08-05, R-034).

The SEDI age credential is the aggregate's natural case: bakobo/schema's `sedi-age` is Sam's Age schema, "reproduced byte for byte" (bakobo/schema `sedi-age/index.md`, L3 @`cfcbdcc7a`), with "blinded boolean blocks for thresholds 13, 14, 15, 16, 18, 21, 40, 62, 65, 67 and 70" (same).

#### Where the aggregate's guarantee stops {#aggregate-guarantee-limit}

[spec] "The verifier does still learn how many elements the section has and which were withheld — the count and positions are structural, not blinded" (ACDC spec > Graduated Disclosure, L5051-5053). Hiding cardinality needs chained ACDCs (L2739).

### 4.1 The age credential, the reference implementation, and two findings {#age-credential}

Both findings, at keripy `80f77b73b`, come from reading code paths: no keripy test presents an Age credential (keripy `tests/sedi/test_ipex_sedi.py`, L39-50), and the path is `acdc/ipexing.py`, which keripy's CLI does not call ([section 5.1](#verifying-ground-truth)).

#### Finding 1: no selective Age presentation through IPEX grant {#age-finding-grant}

[code] Age requires `rd` (keripy `tests/sedi/test_sedi.py`, L1180), so it is registry-backed. keripy represents a withheld aggregate element as its SAID (keripy `core/mapping.py`, `Aggor.disclose`, L1899-1900), and for a registry-backed ACDC requires that "Every inspected aggregate entry must be a mapping." (keripy `acdc/ipexing.py`, `_presentationRegistries`, L1458-1460), because "A verifier cannot distinguish an omitted requirement from an undisclosed one using only its digest." (L1414-1415). The node fails and the grant with it (L1508-1512, L610-617). Proving over-21 this way discloses every threshold, including over-40 and over-62, which brackets the age. The rule stops a hidden element concealing a presentation-registry declaration ([chapter 10](10-presentation-registries.md)); no resolution has been proposed.

#### Finding 2: the aggregate issuee is read from a fixed position {#age-finding-issuee}

[code] keripy reads an aggregate's issuee "for aggregative ACDC .sad["A"][1]['i']" (keripy `core/serdering.py`, L2830) inside a bare `except` that returns `None` (L2837-2844), and the Age schema does not constrain `A`'s positions (keripy `tests/sedi/test_sedi.py`, L1204-1493). So an Age whose element 1 is withheld or misplaced reads as untargeted, which "lets a holder withhold element 1 and present a targeted credential as an untargeted affidavit" (bakobo/schema `this.i` > `@lkfnoess`, L2144-2147 @`cfcbdcc7a`). On the V2 path Finding 1 closes this hole, but only by also closing selective disclosure.

[proposal] The position is the editor's intent: "The issuee in an ACDC with Agg section (selectively disclosable) is the "i" field in the second (index 1) attribute block." ([keripy conversations > PR #1505](https://github.com/WebOfTrust/keripy/pull/1505#issuecomment-4981932724), comment of 2026-07-15, R-025). Neither branch states it beyond an example (ACDC spec > Aggregate Section > Composed Schema for selectively disclosable Aggregate section > JSON Serialization, L914, L930), so on this chapter's reading a schema must pin element 1 itself.

#### Sam's sparse-Merkle-tree proposal {#age-smt-proposal}

[proposal] Discussion [#1098](https://github.com/WebOfTrust/keripy/discussions/1098) proposes instead an SMT whose root is an attribute, with a salted leaf per date on which a predicate holds, so "A proof-of-age is given by an inclusion proof of a given predicate leaf in the SMT." It rejects ZKP predicates on detectability: "a static SMT predicate proof preserves KERI's security properties, whereas a dynamic ZKP predicate proof defeats them." The fixture's booleans go stale — "Over21 True if age>=21 else False" (keripy `tests/sedi/test_sedi.py`, L1385) — and are remedied by reissuance, while dated leaves stay correct; nothing read says which design is the plan.

## 5. Edges, chaining, and the operator families {#edges}

The far node is the ACDC whose SAID is in `n` (ACDC spec > Edge Section, L1172); reserved labels are `[d, u, n, s, o, w]` (L1149); and the far node MUST validate against both its own schema and the edge's `s` (L1176).

### The edge schema constraint is enforced {#edge-schema-enforced}

[code] The edge `s` "is a schema the far node must" "*satisfy*, not a SAID that must equal the far node's own schema" SAID (keripy `vdr/verifying.py`, `processCredential`, L196-197 @`80f77b73b`, citing keripy issue #1534). A failing far node raises `MissingChainError`, and an uncached schema escrows rather than failing (L195-230).

#### The m-ary operators {#m-ary-operators}

Edge-groups take `AND` (default), `OR`, `NAND`, `NOR`, `AVG` and `WAVG` (ACDC spec > Edge Section, L1099-1116). [code] Only `EdgeGroupOps = ("AND", "OR")` exist, in `acdc/ipexing.py` (keripy `acdc/ipexing.py`, `EdgeGroupOps`, L45 @`b8f60166b`; reduction at L1020-1053), with an empty group malformed.

#### The unary operators {#unary-operators}

| Op | Spec gloss | Default | Tier |
|---|---|---|---|
| `I2I` | Issuer-To-Issuee: this ACDC's Issuer AID MUST be the Issuee AID of the far node | Yes (targeted far node) | [spec] |
| `NI2I` | Not-Issuer-To-Issuee: no such requirement | Yes (untargeted far node) | [spec] |
| `DI2I` | Delegated-Issuer-To-Issuee: this Issuer MUST be the Issuee AID or a delegated AID of the Issuee | No | [spec] |
| `NOT` | logical NOT — inverts far node validity | No | [spec] |
| `E1E` | IssueE-To-IssueE: "The Issuee AID of this ACDC MUST be the Issuee AID of the node this Edge points to" | No | [spec-next], [code] |

#### E1E, the fifth unary operator {#e1e}

[spec-next] `E1E` is in `v1.1` (ACDC spec > Edge, L1206 @`2362e48a1`) and not `main`. "This is an identity relation on the two ACDCs' Issuees and places no constraint on either ACDC's Issuer" (L1206): where `I2I` and `DI2I` bind this Issuer to the far Issuee, `E1E` binds the two Issuees, for one subject holding credentials from different issuers, "a relationship the delegative `I2I` Operator cannot express" (L1223). Sam proposed it in keripy discussion [#1515](https://github.com/WebOfTrust/keripy/discussions/1515), keripy implemented it, and `v1.1` then defined it.

[proposal] He later proposed `I1I` and a delegated `DI1I`: "the leaf edge to the core is both E1E and I1I  that is issuee is issuee and issuer is issuer." (keripy discussion #1515, comment of 2026-10-01). Neither is implemented at `80f77b73b`, so an `I1I` edge is given the default by `vdr/verifying.py` and rejected by `acdc/ipexing.py`.

#### The default operator {#default-gate}

[spec] A targeted far node defaults to `I2I` and an untargeted one to `NI2I`, and in a list "the latest Operator... in the list takes precedence" (L1186). On `main` @`f0bd097de` L1197 the default fires unless `o` includes "any of the `I2I`, `NI2I` or `DI2I` Operators"; `v1.1` @`2362e48a1` L1209 adds `E1E` to that list. Under `main`'s gate an `E1E`-only edge would gain a delegative `I2I`; keripy follows `v1.1`.

[proposal] The default is to change: "The change of default is to land in v1.1 of the ACDC spec." ([ACDC spec conversations > issue #205](https://github.com/trustoverip/kswg-acdc-specification/issues/205#issuecomment-5268897690), comment of 2026-08-12, R-030), the new default being `NI2I`, because "most of the vLEIs in the wild depend on the default to `I2I`" (same). Neither `v1.1` nor keripy carries it yet; once it lands, a validator must read an ACDC's version before an operator-less edge.

#### How far `DI2I` reaches {#di2i-depth}

[proposal] The specification's `DI2I` admits "any delegated AIDs of the Issuee of the node to which the Edge points" (ACDC spec > Edge Section, L1209) without saying how deep. Sam rules any depth, bounded by the delegated AIDs' `DND` and `DID` traits ([chapter 03, section 8](03-key-management-and-identifier-lifecycle.md#config-traits)): "This is how we are safe, not by interpreting the `DI2I` operator as only being for children not grandchildren." ([keripy conversations > PR #1564](https://github.com/WebOfTrust/keripy/pull/1564#issuecomment-5158683549), comment of 2026-08-02, R-015). His earlier comment on the same PR agreeing to "limit DI2I to one layer children not all the way down" ([keripy conversations > PR #1564](https://github.com/WebOfTrust/keripy/pull/1564#issuecomment-5137135970), comment of 2026-07-30, R-015) is withdrawn, but neither branch says so, and keripy evaluates `DI2I` at no depth.

### 5.1 verifying.py ground truth — gloss versus enforced behavior {#verifying-ground-truth}

`Verifier.verifyChain` (keripy `vdr/verifying.py`) is what the CLI runs.

- Five operators are recognized: `UnaryOps = ('I2I', 'NI2I', 'DI2I', 'E1E', 'NOT')` (keripy `vdr/verifying.py`, `UnaryOps`, L43). The unimplemented ones are listed "so they fail closed diagnosably instead of being dropped and silently defaulting" (L38-39 @`b8f60166b`).
- In a list, the delegative operators `I2I`, `NI2I` and `DI2I` are exclusive and the latest wins (L436), while "E1E constrains the near issuee instead, so it does not conflict with them and composes (AND)" (L431). Unknown tokens are dropped (L435).
- If nothing recognized remains, the default is silently inferred: `op = 'I2I' if creder.iseaid is not None else 'NI2I'` (L443), reading an aggregate far node's issuee at the fixed position of [section 4.1](#age-credential).
- `I2I` is plain string equality: `if op == 'I2I' and issuer != farIssuee: return None` (L481). A multi-hop chain of authority is an emergent property of the edge walk, not of an operator.
- `E1E` is enforced ahead of the standardizing branch: `if farIssuee is None or issuee is None or issuee != farIssuee: return None` (L457-466). Its code comment calling `E1E` normative on `v1.1` (L40-41) was written by the corpus's author, so the marker rests on the specification text.
- `DI2I` and `NOT` fail closed: each raises `ValidationError` (L449, L453-455), because a `MissingChainError` would escrow and "escrowing would promise a retry that can never succeed" (L445 @`b8f60166b`). Older notes describing a `NotImplementedError` crash predate this; every prose account of `DI2I` behavior, including the Dossier's `operators-ref` table, still has no machine behind it.
- `NI2I` skips the binding by construction and requires only that the far node be issued.

#### Chain revocation propagates {#chain-revocation}

A revoked far node raises `RevokedChainError` (keripy `vdr/verifying.py`, L178-180 @`b8f60166b`).

#### A second implementation, and its scoping caveat {#second-implementation}

keripy's `acdc/ipexing.py` holds the m-ary operators, the closed-DAG walk and per-node issuer authentication, but its `loadHandlers` (L2149-2167) has no caller in `src/keri`; keripy's commands load V1 from `vc/protocoling.py`. A [code] claim sourced to `ipexing.py` is about tested code, not anything a shipped command does. See [chapter 08, section 6](08-presentation-architectures-and-ipex.md#two-ipex).

#### The two modules disagree on three axes {#module-disagreement}

- Unrecognized tokens: `vdr/verifying.py` drops them and falls back to the default (L435); `acdc/ipexing.py` fails closed (keripy `acdc/ipexing.py`, L921-922).
- Conflicting delegative operators: one takes the latest (L436), the other conjoins them, so `["I2I", "NI2I"]` is `NI2I` to one and `I2I` to the other.
- An absent `o`: one infers `I2I` or `NI2I` (L443), the other checks nothing (L910-911).

A conformant edge can pass credential processing and fail grant verification; the SEDI fixtures use `["E1E", "NI2I"]`, which both evaluate alike, so tests miss the divergence, and neither branch says what to do with an unrecognized operator. See [chapter 08, section 13](08-presentation-architectures-and-ipex.md#ground-truth).

#### DAG acyclicity is unchecked {#dag-acyclicity}

`_walkGraph` (keripy `acdc/ipexing.py`, L780-872) keeps a `seen` set that terminates on a cycle rather than rejecting it, `verifyChain` resolves one hop, and no code in `src/keri` checks for cycles. Assume nothing rejects a cyclic provenance graph.

### 5.2 The same-holder binding pattern {#same-holder-binding}

[practice] In a holder-issued presentation, "`I2I` requires the presenter to be the issuee of both source credentials." (bakobo/schema `sedi-present-age-portrait/index.md`, L5), pinned as `"const": "I2I"` (bakobo/schema `sedi-present-age-portrait.schema.json`, L152-153).

Where the state issues both credentials, `I2I` is wrong: "Its required `coreIdentity` edge links to Core with `E1E` and `NI2I`." (bakobo/schema `sedi-age/index.md`, L3 @`cfcbdcc7a`), as Sam's fixture builds it (keripy `tests/sedi/test_sedi.py`, L4360). Choose the operator that states the relation rather than dropping the edge; the older advice in Bakobo's decision record to bind at presentation instead predates `E1E`.

#### The tier caution survives {#e1e-tier-caution}

No operator in `main` binds two state-issued credentials about one subject, so a schema that requires `E1E`, as bakobo's `sedi-guardian` `citizen` edge does (bakobo/schema `sedi-guardian.schema.json`, L284, L317), builds on a forward branch; Sam's Age schema leaves the operator unconstrained (keripy `tests/sedi/test_sedi.py`, L1520-1527). The `NI2I` beside `E1E` makes the list mean "same issuee, issuer unconstrained" under either branch's gate.

#### Standing edges as a correlation point {#standing-edges}

[proposal] An edge a credential always carries lets verifiers join on the far node's SAID. Sam's answers: "With bulk issuance, each presentation context consisting of discloser and disclosee gets its own set of SEDI credentials and standing edges." ([keripy conversations > discussion #1515](https://github.com/WebOfTrust/keripy/discussions/1515#discussioncomment-17681089), comment of 2026-07-18, R-066), and "an edge can also be blinded, which means that disclosure of the edge itself can be held back" ([keripy conversations > discussion #1515](https://github.com/WebOfTrust/keripy/discussions/1515#discussioncomment-17682012), comment of 2026-07-18, R-066).

## 6. Rules and Ricardian contracts {#rules}

The rule section `r` is a Ricardian contract, "both human and machine-readable and referenceable by a cryptographic digest" (ACDC spec > Rule Section, L1239). Rules are terminal with a legal `l` field, rule-groups nest, and reserved labels are `[d, u, l]` (L1265-1300).

[practice] In Bakobo's GCD a verifier "MUST NOT impute a delegator's approval of delegated authority to a delegate without understanding and enforcing the rules of these extra rules." (bakobo/schema `gcd.schema.json`, `a.gfw`, L79).

### Rules are not machine-enforced {#rules-not-enforced}

keripy's `Verifier` does not evaluate rules — "disclosure rules not enforced in `Verifier`" (keripy-knowledge `20-crosswalk.md`) — so a rule binds a human or an application policy engine.

## 7. The graduated-disclosure ladder {#graduated-disclosure}

Graduated disclosure is "disclose enough to enable more disclosure, which in turn may enable even more disclosure" (ACDC spec > Graduated Disclosure, L1747). The rungs (L1749-1774):

1. Compact — a SAID commitment; compactness, not privacy.
2. Metadata — commits to Issuer, Schema, Edges and Rules of a private ACDC without its SAID, and "When metadata ACDC is disclosed, only Discloser commitments attach, NOT Issuer commitments" (ACDC spec > Metadata ACDC, L168-172).
3. Partial — SAID plus salty nonce.
4. Nested partial — per-block `d` and `u` at different depths (L633).
5. Full.
6. Selective — the aggregate of [section 4](#attribute-vs-aggregate).
7. Bulk-issued instances ([section 9](#bulk-issuance)).

"All the Graduated Disclosure mechanisms MAY be used in combination" (L1775).

### Worked examples in the standardizing branch {#ladder-worked-examples}

[spec] `main`'s annex (@`f0bd097de`, L4988-5098) separates "how an issuer *plans* for disclosure by the way it structures the credential, and how a holder *performs* disclosure at presentation while a verifier checks it" (L4991-4993). "Every disclosure level... verifies to the same top-level SAID, so what the credential commits to never changes as disclosure progresses" (L5095-5098).

Merkle Tree Certificate inclusion proofs share the vocabulary and not the job: "A Merkle inclusion proof establishes placement in a history. A SAID establishes identity of content" (papers `acdc-and-mtc.md` > 3.2 Trees, structure, and meaning).

## 8. Contractually-protected disclosure {#contractual-disclosure}

Two mechanisms attach obligations to disclosed data (ACDC spec, L1783-1792).

### Chain-Link Confidentiality (CLC) {#chain-link-confidentiality}

The offer discloses metadata and terms, and full disclosure follows agreement, so "the disclosed data has 'strings attached.'" Each Disclosee "in turn, is the Discloser to the next," and terms MUST propagate. [practice] Bakobo's SEDI rule: "This binds each downstream recipient reached through the edge section of a presentation." (bakobo/schema `sedi-id/rules.json`, L3 @`cfcbdcc7a`). Sam's fixtures leave every rule section empty (keripy `tests/sedi/test_sedi.py`, L4381-4393), so that language is Bakobo's, not the specification author's.

#### Contingent Disclosure {#contingent-disclosure}

A rule obliges disclosure, by the Discloser or an escrow agent, when a contingency such as breach is met: "Recourse via Full Disclosure of PII is latent... but never realized until the conditions of the contingency is satisfied" (L1792).

Contracts carry weight because "There is no cryptographic mechanism that precludes statistical correlation among a set of colluding Verifiers" (ACDC spec > Bulk-issued, L2785), so unlinkability without contractual protection is "an exercise in diminishing returns". The layered argument is [chapter 06, section 4](06-governance-ecosystems-and-interop.md#layered-privacy).

## 9. Registries and TELs {#registries}

A TEL is "a hash-chained data structure of sealed transaction events" anchored in a KEL, so its events are "also securely attributable to the KEL's controller" (ACDC spec > TEL Overview, L1918), and "the verifiability of transaction events in the TEL persists in spite of changes to Key States in the sealing KEL" (L1920). TEL events need no signature, since "the digest in the seal in the KEL is cryptographically equivalent to signing the transaction event itself" (L1946).

### The registry-dependent issuance lifecycle {#registry-lifecycle}

[spec] `main` @`f0bd097de` (L4852-4986) walks `rip` → `acm` → `bup` → verify → revoke. "The inception commits to no credential state: it is a vacuous placeholder that reveals nothing about what will later be issued" (L4865-4867), and a credential's SAID "is not known in advance; it is produced by issuance, not assumed" (L4890-4892). In a `bup`, "Only the blinded block's SAID travels in the `bup`; neither the credential SAID nor the word `issued` appears" (L4917-4918), and a later revocation uses an independent nonce. The boundary: "This is confidentiality of registry state, not anonymity of the credential — issuer, registry, and issuance chronology remain linkable, which is the intended, auditable trade-off" (L4983-4985). The lifecycle is Issuer-controlled throughout, with no Issuee-controlled registry, which matters to [chapter 10](10-presentation-registries.md).

#### Revocation is a state, not a deletion {#revocation-state}

[code] keripy keeps a revoked credential: "Log this and continue instead of the previous exception so we save a revoked credential" (keripy `vdr/verifying.py`, L129-132), and reads state from the TEL, not a list. `Tever`/`Tevery` implement registries with `vcp`, `iss`/`rev` and `bis`/`brv` events (keripy `vdr/eventing.py`).

### Registrar, Observer, and no phone-home {#registrar-observer}

A Registrar under the Issuer publishes the registry; an Observer under the Validators caches it, syncing on state change and not at validation, which "protects against forced validator-to-issuer correlation of ACDC usage, i.e., no forced phone home validation" (ACDC spec > TEL Registrars and TEL Observers, L1693). Running them is [chapter 11](11-infrastructure-and-operations.md).

[architect] Sam calls the split the witness and watcher structure one layer up: "we have witnesses that are controlled by controllers, watchers that are controlled by verifiers. We split the verification between two places. We do the same thing with ACDCs" (KERIConf26 caption, Sam Smith, The Digital Identity Tradespace, 16:48). Observers cache state and detect nothing; detecting a presenter's key compromise is the presentation registry of [chapter 10](10-presentation-registries.md).

#### Bulk updates as a privacy requirement {#bulk-updates}

[architect] Batching, a performance note in the specification (L1695), is a privacy requirement: "if you want to make it so that it's not statistically correlatable, you have to do it in a bulk or herd privacy protected way." (KERIConf26 caption, Sam Smith, The Digital Identity Tradespace, 33:14). The residue he names is collusion between a malicious observer and issuer: "There's no technical thing that makes it impossible in this, but what it does is it means that there's no easy way for them to do it" (KERIConf26 caption, Sam Smith, The Digital Identity Tradespace, 34:46).

#### Implementation status of Registrar and Observer {#registrar-observer-status}

Neither exists. `keri-foundation/observer` and `keri-foundation/registrar` are placeholders, keripy's `acdc/registraring.py` is a docstring stub, and keripy has no observer. Beneath them, keripy implements the blindable `bup`, `BlindState` (keripy `core/structing.py`; `acdc/messaging.py`, `blindate()`), and the `RegBaser`/`WebRegBaser` stores. Nothing specifies the Observer protocol, discovery, or batch window, so "the Observer handles that" is not an answer.

### Binding ACDC state to issuer key state {#key-state-binding}

ACDCs are "not directly signed by the Issuer... bound to the Issuer's Key State... and the Issuer's Key State is signed. This enables the Key State of the Issuer to change independently of the ACDC state" (ACDC spec > Binding to Key State, L1673). Validity is judged "AS OF its KEL anchor's sequence position, not current key state or wall-clock" (keripy-knowledge `30-invariants.md` > H1; `Tever.verifyAnchor`), the defense against [chapter 07, section 11](07-shibboleths-and-anti-patterns.md#retrograde-attack)'s retrograde attack.

[spec] The Dossier specification puts it for outsiders: "The signature exists on the anchoring key event, not on the dossier" (Dossier spec > How a Dossier Is Issued: Anchoring, Not Attached Signatures, L27-28). The partition is by lifespan: a token bears a signature "because its lifetime is measured in seconds and it is never expected to outlive a key rotation" (L473), and an ephemeral dossier MAY too. So the accurate rule is not that ACDCs are never signed but that nothing expected to outlive a rotation is authenticated by an attached signature.

#### Recon hypothesis: anchors not re-verified on presentation {#verifyanchor-hypothesis}

Open at keripy `60ab9e08d` and not re-examined since (landmine L15, high severity, medium confidence): recon "found no call to `Tever.verifyAnchor`" in `processCredential`, so "a credential presented with a forged `(seqner, saider)` proof could pass schema + TEL-state checks without the anchor being confirmed against the issuer's actual KEL at that sn — undermining invariant H1" (keripy-knowledge `31-landmines.md` > L15). Confirm that the ingest path ran `verifyAnchor`.

### Blindable state (BLID) {#blindable-state}

A blinded state block `[d, u, td, ts]` takes `u` from an Issuer–Discloser shared salt keyed by sequence number, so "an observer cannot correlate state to event updates" (ACDC spec > Blinded State Disclosure, L2043-2135). Placeholder updates and blind updates after revocation "decorrelate the time of revocation" (L2324).

#### `upd` is deprecated and still specified {#upd-deprecated}

[proposal] "We are going to drop support for `upd` in v1.1" ([keripy conversations > PR #1612](https://github.com/WebOfTrust/keripy/pull/1612#issuecomment-5259378594), comment of 2026-08-11, R-036), because "a blindable update can be unblinded by merely attaching the unblinded attribute block." ([keripy conversations > discussion #1566](https://github.com/WebOfTrust/keripy/discussions/1566#discussioncomment-17846317), comment of 2026-07-30, R-036). Both branches still define it (ACDC spec > Registry Message Types and Fields, L2161 @`2362e48a1`). [code] keripy's V2 TEL "only supports registry inception and blind updates" (keripy `acdc/regeventing.py`, L121), while `acdc/messaging.py` still builds `upd` (L78-104).

#### Registry transfer, approved and unspecified {#registry-transfer}

[proposal] An `xfr` event would move control "from the issuer AID defined in the `rip` to a new controller issuer defined in the `xfr`", and "This event must doubly anchored." ([keripy conversations > discussion #1566](https://github.com/WebOfTrust/keripy/discussions/1566#discussioncomment-17846317), comment of 2026-07-30, R-037); "I already discussed `xfr` with the community and got approval. so was planning to add it to ACDC v1.1." ([keripy conversations > discussion #1566](https://github.com/WebOfTrust/keripy/discussions/1566#discussioncomment-17856451), comment of 2026-07-31, R-037). Neither branch nor keripy has either, and which two logs carry the anchor is unstated; until then a registry's incepting issuer controls it for life.

#### TEL anchors follow first-seen {#tel-anchor-first-seen}

[proposal] "anchoring TEL events should follow the idempotent first seen rule used for KEL events." ([keripy conversations > PR #1612](https://github.com/WebOfTrust/keripy/pull/1612#issuecomment-5373529636), comment of 2026-08-21, R-038). [code] keripy's `putAnchor` keeps "the earliest verified sealing event for this TEL event" by sequence number (keripy `acdc/registering.py`, `putAnchor`, L58-64), which picks a different anchor from Sam's rule when a later seal is verified first; that case is untested.

### Bulk issuance {#bulk-issuance}

A holder gets copies of one credential, each to a different AID, so contexts cannot be joined through it (ACDC spec > Annex > Bulk-issued Private ACDCs, L2765); see [chapter 12, section 8](12-confidentiality-and-secure-messaging.md#bulk-issuance-privacy).

#### What landed, and its status {#bulk-landed}

[spec] Each member's blinding factor comes from one shared salt on a path that "is therefore `k.`, that is, the textual representation of the index `k`" (ACDC spec > Annex > Bulk-issued Private ACDCs > Basic Bulk Issuance Procedure, L2811), over qb64 operands, with Blake3-256 unless negotiated otherwise (L2818). [proposal] Every bulk MUST sits under `## Annex`, whose force neither branch declares, and Sam wants it moved: "For the v1.1 spec I would think we will want to move Bulk issuance from the annex so as to be normative." ([ACDC spec conversations > PR #204](https://github.com/trustoverip/kswg-acdc-specification/pull/204#issuecomment-5273991502), comment of 2026-08-12, R-045). It has not moved.

#### Independent registries: pre-created, not derived {#bulk-independent-registries}

[proposal] The specification does not say how a bulk set's registries are made (`main` L2897). Pre-created `rip`s with a salty `u` mean "This enables the Issuer to fully decorrelate the registry state updates from any data in the ACDC.", at the cost that "The `rd` field value is not derivable from the salt with a path." ([keripy conversations > PR #1576](https://github.com/WebOfTrust/keripy/pull/1576#issuecomment-5195334135), comment of 2026-08-05, R-040); SEDI chose that, and "The State would only update registries in bulk." (same, R-041). Deriving each registry's blinding factor from the bulk salt is proposed, with the path unsettled among `k.s`, `k.` and `k|` ([ACDC spec conversations > PR #204](https://github.com/trustoverip/kswg-acdc-specification/pull/204#pullrequestreview-4922214480), review of 2026-08-13, R-044).

#### Revocation is universal across the set {#bulk-revocation}

[proposal] "In a bulk issued set this means that all members of the set MUST be revoked." ([keripy conversations > discussion #1574](https://github.com/WebOfTrust/keripy/discussions/1574#discussioncomment-17938568), comment of 2026-08-07, R-042). A compromised key is handled by rotation, because "if the keys get compromised then the keystate is changed not the ACDC state." (same); a compromised shared salt means "the whole set has to be abandoned." (same).

## 10. IPEX — the issuance and presentation exchange {#ipex}

"The difference between exchange types is the information disclosed, not the mechanism" (L1797), in a non-normative section (L1795). Routes, keripy's two state machines and spurn are [chapter 08, section 6](08-presentation-architectures-and-ipex.md#two-ipex). A commitment to any variant commits to the top-level sections of all variants, and "A commitment to the top-level SAID of the compact version... is equivalent to a commitment to the hash tree root," so the Issuer MUST sign or seal the most compact SAID (ACDC spec > Issuer Commitment Rules, L1843).

### Bespoke and disclosure-specific ACDCs {#bespoke-acdcs}

A Discloser may issue its own ACDC that edges to another and names the Disclosee as Issuee, attaching obligations "without requiring any new tooling" (ACDC spec, L1860). [practice] "Bespoke" "names an ISSUANCE PATTERN, not a credential TYPE" (bakobo/schema `this.i` > `@sdp3wk`, L1950-1960 @`cfcbdcc7a`). See [chapter 08, section 3](08-presentation-architectures-and-ipex.md#bespoke-origin).

## 11. Real-world credential patterns and what schemas enforce {#applied-patterns}

### vLEI {#vlei}

[practice] vLEI (ISO 17442-3) chains GLEIF to QVIs to legal entities to roles with edges that const-pin far-node schemas (public-schema `vLEI/acdc/legal-entity-vLEI-credential.json`, L99; `ecr-authorization-vlei-credential.json`, L114). "A verifier receiving an employee's credential can traverse the chain back to GLEIF without consulting a trust registry." (papers `acdc-vc-diff.md` > Real-World Validation).

#### Telco schemas stopped pinning far-node schemas {#telco-unpinned}

[practice] Provenant's telco edges no longer pin (commit `2c8e834e2`): tn-alloc's `issuer` edge is "Intentionally generic — does not constrain the schema of the identity credential." (public-schema `tn-alloc/index.md` > Edge structure, L51). Since keripy still checks whatever `s` an edge carries ([section 5](#edge-schema-enforced)), on this chapter's reading restricting `s` moved from schema to verifier policy.

#### SEDI {#sedi}

[practice] "The state endorses an identity; it does not create one." (bakobo/schema `sedi-id/index.md` > Purpose, L15-17 @`cfcbdcc7a`). Its state-issued credentials are Sam's IAR, Core, Residence and Age; the others "are Bakobo profiles for the November SEDI Summit; they are not Sam's schemas or statements of Utah policy." (bakobo/schema `README.md` > Status, L65). The older `sedi-id`, with its four attributes, is "Superseded for new issuance" (bakobo/schema `sedi-id/index.md`, L3). Statute and governance are [chapter 06, section 3](06-governance-ecosystems-and-interop.md#sedi).

Core requires an unblinded boolean `primary` (bakobo/schema `sedi-core.schema.json`, `a.required`, L67-81) that cannot be withheld while `a` is expanded (keripy `tests/sedi/test_sedi.py`, L587). Residence is separate because "a single residence block would force over-disclosure on every verifier who only needs jurisdiction." (bakobo/schema `sedi-id/index.md`, L70-71), and the image is "Facial Image Proof Value as SAID of typed media block" (bakobo/schema `sedi-core.schema.json`, L293), a commitment rather than a locator. Whether `legalPresenceStatus` is an endorsed attribute conflicts with the governance artifact's `noOverAssertion` clause, unresolved (`raw/11` section 9 item 3).

#### The Utah delegation chain {#utah-delegation-chain}

The Utah chain, "Root AID -> Org Unit (division/department/program) -> Issuing Agent" (keripy `tests/sedi/test_sedi.py`, L3165-3166), is a chain of credentials, not KERI delegation: every AID is made with `incept`, and the file has no `delcept` or `dip`. Each credential edges to its issuer's with `"o": "I2I"` (L3598-3605, L3997-4004), and leaves reach the chain through Core. The two meanings of delegation are [chapter 13, section 2](13-authority-authorization-and-agents.md#two-delegations). The fixture's "SEDI AID Replace Schema" (L200) replaces an AID by credential for a holder who has lost control of it,; when it is preferred to rotation is unstated.

[practice] Bakobo's `sedi-guardian` names the guardian as issuee and the ward in a separately disclosable block, with "There is no guardian-to-ward edge." (bakobo/schema `sedi-guardian/index.md`, L3), and `rd` "MANDATORY; guardianship terminates dynamically" (bakobo/schema `sedi-guardian.schema.json`, L43).

#### GCD {#gcd}

[practice] Bakobo's GCD 3.1.0 is a delegation credential that does not require KEL delegation: "A GCD credential is a standard targeted ACDC; its authorization and constraint mechanics do not depend on the issuee being KEL-anchored to the issuer." (bakobo/schema `gcd/index.md` > Purpose, L9). public-schema's GCD page still carries an older version. GCD requires `rd` because "a GCD is authority evidence, so secure discovery of its revocation registry wins here." (bakobo/schema `gcd/index.md` > Schema, L37-40). Its `constraints` container is `"additionalProperties": true` (bakobo/schema `gcd.schema.json`, L130) and fail-closed by the verifier's duty: "This container remains FAIL-CLOSED, but the obligation runs to the verifier, not to schema validation" (L128). GCD says "these credentials do not support graduated disclosure. All constraints must be disclosed every time a verifier is evaluating delegated authority" (bakobo/schema `gcd/index.md`, L86), since partial disclosure would loosen the gate. The authority model is [chapter 13](13-authority-authorization-and-agents.md).

#### The Dossier {#dossier}

A Dossier's issuer attests composition by anchoring: "The issuer does not necessarily attest to the veracity of the claims within the evidence, but rather to the integrity and composition of the collection itself" (Dossier spec > The Role of the Issuer, L83). Joint issuance uses weighted thresholds (`MxN`, `RMxN`, `MxQ`, `RMxQ`) in an edge-group's `o` and "relies on logic within the ACDC layer," not multisig. The normative schema SAIDs are `EKuLzS_oN_mIao5og1NOujtF2QMXloiMCZP7xuAR5tY7` (base) and `ECRjgun8t3cay_YBiVxEY-qXKCz37oUrvE5GvmySwxCh` (endorsement); anything naming the earlier `ECpZgR2Y…` or `EAfn0gRM…` no longer resolves. Foreign material needs a wrapper ACDC: "Direct reference to non-ACDC material without a wrapper is NOT RECOMMENDED." See [chapter 07, section 10.4](07-shibboleths-and-anti-patterns.md#foreign-credentials).

[practice] Provenant's dossier base (`$id` `EHxI61CGs7FRuStz8P6QWJyMK4u2bGH1LQqIXsA4bT7q`) says "A dossier SHOULD NOT include an issuee; all evidence MUST be carried in e, never in a." (public-schema `dossier-base/dossier-base.schema.json`, L5) and "When phase transitions, a new dossier version SHOULD be issued." (L127). bakobo/schema publishes a third base (`EFf_1u…`).

#### The negative corpus {#negative-corpus}

[practice] bakobo/schema's CI rejects, among others, a GCD without `rd` or a `validUntil` backstop, a block missing its blinding nonce, and a presentation with a non-`I2I` operator or without `rd`; an unknown key in GCD's `constraints` is valid (bakobo/schema `gcd/index.md`, L143-144).

## 12. What ACDC corrects, and what remains uncertain {#corrections-and-uncertainty}

### Where ACDC corrects outsider priors {#outsider-priors}

ACDC's text rejects signing credentials directly (L1675), phone-home revocation (L1693), dynamic schemas (L194), compact-as-private (L501), bundled multi-claim credentials, which a graph of ACDCs refactors, "obviating the need for Selective Disclosure," (L2739), centralized namespace registries (L2936), over-investment in unlinkability (L2785), and privacy as the end goal (L1659).

### Where the ground truth is softer than the prose {#softer-ground-truth}

The gaps in sections 4.1 and 5.1 are implementation maturity on keripy's 2.1-dev line, not protocol defects: ACDC's constraints "are constraints of *youth*, not of *architecture*" (papers `wtbo.md` > 6. The Transition Problem: A Comparison of Trajectories). The age-credential collision may be the exception: two deliberate rules meet — hide nothing that could conceal a presentation-registry declaration, and disclose one threshold without the others — and resolving it may take a design decision rather than code. Nobody read has said which.

## Sources {#sources}

- ACDC spec — Authentic Chained Data Containers (ACDC) specification, Trust Over IP. trustoverip/kswg-acdc-specification, spec/spec-body.md. `main` @`f0bd097de` (2026-08-28) supports every unmarked or [spec] citation, including the annex's Graduated Disclosure and Registry-Dependent Issuance Lifecycle examples. `v1.1` @`2362e48a1` (2026-09-11) supports the [spec-next] citations, which carry that commit in their locator. Mined in raw/03.
- ACDC spec conversations — Sam Smith's comments and reviews in trustoverip/kswg-acdc-specification issues and pull requests, as spec editor. Numbers used: issue #205, PR #204. Each citation gives the comment URL and date; comment bodies were read from the 2026-10-14 fetch cached under `.ignored/sam-rulings-cache/`. [proposal] unless the text at a pin carries them. Mined in raw/21.
- bakobo/schema — Bakobo's applied ACDC schema corpus (SEDI, GCD, the `docs/` decision notes and the `this.i` decision record), Bakobo. bakobo/schema, repository root, main @`cfcbdcc7a` (2026-10-02). Evidence about what real schemas do, not about what the specification requires. Mined in raw/11.
- Dossier spec — Dossier specification, Trust Over IP. trustoverip/kswg-dossier-specification, spec/dossier-spec-body.md, main @`b9227753c` (2026-08-25). The `operators-ref` edge-operators reference beside it is untracked and unpinnable. Mined in raw/04.
- keri-foundation observer and registrar — placeholder repositories for the Observer and Registrar services, KERI Foundation. keri-foundation/observer and keri-foundation/registrar, checked 2026-09-01 (no pin recorded). Mined in raw/14.
- KERIConf26 caption — hand-edited auto-captions of Sam Smith's KERI Conference 2026 talk The Digital Identity Tradespace. keri-foundation/CONF26-subtitles, subtitles/*.fixed.srt, at an unrecorded commit. Near-wording only: evidence of intent and framing, never of a design detail; see `raw/14` section 0 before quoting it onward. Mined in raw/14.
- keripy — KERI reference implementation, WebOfTrust. WebOfTrust/keripy, src/keri and tests/. `main` @`80f77b73b` (2026-10-01) supports [code] claims by default; a locator marked `@b8f60166b` (2026-09-14) was read at that pin and not re-read at the later one. `__version__` is `2.1.0-dev1`. The SEDI test fixtures (`tests/sedi/test_sedi.py`, `tests/sedi/test_ipex_sedi.py`) are evidence of what the spec author intends credentials to look like, not library behavior. Mined in raw/09 and raw/11.
- keripy conversations — Sam Smith's comments in WebOfTrust/keripy issues, pull requests and discussions. Numbers used: PR #1505, discussion #1550, PR #1564, discussion #1515, discussion #1566, PR #1612, PR #1576, discussion #1574. Each citation gives the comment URL and date; comment bodies were read from the 2026-10-14 fetch cached under `.ignored/sam-rulings-cache/`, at their edited text. [proposal] throughout. Mined in raw/21.
- keripy discussion #1098 — ACDC with Static Age Predicate Proof SMT, Sam Smith. https://github.com/WebOfTrust/keripy/discussions/1098, created 2025-10-27, last edited 2026-09-26, fetched 2026-10-03; without its edit history it is evidence of his position at the last edit. Mined in raw/11 and raw/16.
- keripy discussion #1515 — New Unary Edge Operators to Support SEDI, Sam Smith. https://github.com/WebOfTrust/keripy/discussions/1515, opened 2026-07-17; comments of 2026-07-18 and 2026-10-01 read. Mined in raw/09, raw/11 and raw/21.
- keripy-knowledge — keripy knowledge base (`20-crosswalk.md`, `30-invariants.md`, `31-landmines.md`), Daniel Hardman. dhh1128/keripy, branch `knowledge` @`9489ac9bd`. Recon findings such as landmine L15 are hypotheses at the commit they were made against (`60ab9e08d`), not facts at the current pin. Mined in raw/08.
- papers — Daniel Hardman's papers (`acdc-vc-diff.md`, `acdc-and-mtc.md`, `wtbo.md`). dhh1128/papers, repository root, main @`68a5e2f76` (2026-10-03). The author's framing, not normative text. Mined in raw/05 and raw/06.
- public-schema — Provenant's public ACDC schema corpus (vLEI, telco, dossier base). provenant-dev/public-schema, repository root, main @`95a07e544` (2026-06-16). Evidence about what real schemas do, not about what the specification requires. Mined in raw/11.
