# The KERI Bible

## Table of Contents

- [01 — Foundations and Worldview](#01-foundations)
- [02 — Security Model and Threat Posture](#02-security)
- [03 — Key Management and Identifier Lifecycle](#03-key-management)
- [04 — CESR and the Wire](#04-cesr-wire)
- [05 — ACDC and Verifiable Data](#05-acdc)
- [06 — Governance, Ecosystems and Interop](#06-governance)
- [07 — Shibboleths and Anti-Patterns](#07-shibboleths)
- [08 — Presentation Architectures and the IPEX Disclosure Model](#08-presentation)
- [09 — KRAM and Request Authentication](#09-kram)
- [10 — Presentation Registries and Issuee-Side Detectability](#10-registries)
- [11 — Infrastructure and Operations](#11-infrastructure)
- [12 — Confidentiality and Secure Messaging](#12-confidentiality)
- [13 — Authority, Authorization and Agents](#13-authority)
- [14 — Identifiers, Trust Bases and Reputation](#14-identifiers)

---

## Provenance markers {#legend}

A marker says what kind of evidence a claim rests on. Each kind answers a different question, so the markers are not a ranking, and only `[spec]` says what conformance requires. A claim carries the marker of the evidence it actually has and never borrows a stronger kind, even when a specification editor makes it in a discussion; changing a marker needs new evidence at a named commit. Older text sometimes calls a marker's kind its tier. A marker is written plain, with no bold and no code span.

- `[spec]`, normative. The text is in the line of a specification that the community is actively standardizing, its `main` branch.
- `[spec-next]`, forward branch. The text is in a specification's `v1.1` branch and not in `main`. It is new thinking that is likely, not certain, to become normative, and it binds nobody today.
- `[code]`, implemented. An implementation (keripy unless named otherwise) behaves this way at a named commit. Code is evidence about code, not about what the specification requires.
- `[proposal]`, proposed. A design stated in a discussion, issue, pull request, whitepaper or code on an unmerged branch, and in no specification. However confident its author, it binds nobody.
- `[practice]`, vendor or deployment practice. What one organization's product, service, schema set or deployment does. Evidence of how the doctrine survives contact with practice; never evidence of what KERI is. It covers deployment evidence and applied schema sets such as bakobo/schema.
- `[architect]`, Sam Smith in his own voice outside a specification: keri.one, his conference talks, and personal communications. It carries his intent, which is often exactly what a reviewer needs, and it is not normative.

Unmarked text has one meaning everywhere. A specification citation with no marker is to that specification's standardizing line, and so means `[spec]`. A claim with neither a marker nor a citation is the chapter's own synthesis, the weakest kind of evidence in it.

Code that exists only on an unmerged fork is a proposal made in code, so it is cited as `[proposal]`, with the fork, branch and commit in the locator. Older raw notes call this `[K-fork]`.

---

# 01 — Foundations and Worldview {#01-foundations}

## Thesis {#01-thesis}

KERI (Key Event Receipt Infrastructure) tries to give the internet the identity layer it was born without by relocating the root of trust from administrators to mathematics. Its foundational move is to make an identifier self-certifying — derived from, and controlled by, its own keys — so that the authority to speak for it is proven by a replayable, hash-chained history of key events rather than asserted by a certificate authority, registry, ledger or federation (KERI spec > End-verifiable, L89; papers `wtbo.md` > 4. KERI's Architecture: A Different Root of Trust). The rest of the worldview follows from that relocation: end-verifiability instead of phone-home trust; detection and recovery instead of prevention; per-identifier ordering instead of global consensus; and a three-layer stack in which KERI is the "who," ACDC the "what," and CESR the language they speak (papers `keri-primer.md` > 3. ACDCs; 4. CESR). This chapter states that worldview, the priors from PKI, blockchain and mainstream verifiable-credentials work that it corrects, and the assumptions under which its guarantees hold.

## 1. What KERI is, and what it is not {#01-what-keri-is}

KERI is a decentralized key management infrastructure (DKMI) whose purpose is to establish the authenticity of data by verifiably attributing it to a controller's identifier (KERI spec > Overlay, L69). By exchanging key event logs each party "can validate the other's key state and securely attribute (authenticate) any signed statements or any sealed issuances of data" (KERI spec > Direct exchange, L33), with the goal of "universal duplicity detectability and ambient verifiability with the goal of providing a universal DKMI in support of a trust-spanning layer for the internet" (KERI spec > Ecosystem, L61).

Outsiders reliably map KERI onto categories it does not belong to, so the negative definition matters as much.

- Not a blockchain. "KERI rejects the need for global consensus regarding identity" (papers `keri-primer.md` > 2. KERI). Each KEL is "somewhat like a 'blockchain' that manages the key state for one and only one AID" (KERI spec, L31), with no global ledger and no ordering across identifiers, which is an explicit non-goal (keri-security-analysis `background.md` > 1.3 Explicit Non-Goals). A ledger appears only as a last-resort tiebreaker after total compromise, "minimal use of a distributed consensus ledger" (KERI spec > KAWA, L1888); KERI is "ledger-less... or ledger-portable" (keri.one homepage).
- Not an encryption protocol: "KERI is a protocol for managing identity, not for encrypting communications." (papers `kspqs.md` > Securing the Conversation: Addressing HNDL); [chapter 12](#12-confidentiality) covers confidentiality.
- Not a certificate scheme: "Witnesses make no assertion about identity — they don't claim 'this key belongs to this entity.'... That is a fundamentally different role than a CA" (papers `wtbo.md` > 4. KERI's Architecture: A Different Root of Trust).
- Not duplicity-resistant but duplicity-evident: KERI does not make equivocation impossible, which "would require global consensus... It makes duplicity *provable and attributable*" (same) ([chapter 02, section 3](#02-duplicity-evident)).
- Not a prevention system: "KERI is fundamentally a detection-oriented system with optional response mechanisms" (keri-security-analysis `background.md` > 4.5 Detection vs Prevention), and any claim implying prevention "must be scrutinized for hidden assumptions" (same).
- Not, today, a drop-in replacement for PKI: "This is not an argument that KERI's decentralized PKI is a drop-in replacement for classical PKI everywhere, today. It's not that simple" (papers `wtbo.md` > 6. The Transition Problem: A Comparison of Trajectories). Its constraints are said to be "of *youth*, not of *architecture*" (same), an assertion to test, not a proven fact.

The design ethos is minimally sufficient means: "building blocks that have already been rigorously audited, formally verified, and accepted by governments and industry for years" (papers `kspqs.md`), added in "many thin layers" on the hourglass model (KERI spec > OKEA, L2952). Over-provisioned strength is waste: "there is minimally sufficient cryptographic strength and more cryptographic strength just wastes computation and bandwidth" (CESR spec > Compact fixed-size codes, L446).

## 2. Autonomic identity and self-certifying identifiers {#01-autonomic-identity}

An Autonomic Identifier (AID) is "a self-managing cryptonymous identifier that must be self-certifying (self-authenticating) and must be encoded in CESR as a qualified Cryptographic primitive" (KERI spec termdefs). It generalizes the Self-Certifying Identifier (SCID), a cryptonym "uniquely cryptographically derived from the public key of an asymmetric keypair" (KERI spec > SCID, L107). Self-certification removes the external authority: "The identifier itself contains all the information needed to verify its authenticity. It is cryptographically derived from its controlling public keys" (papers `kspqs.md`), whereas "a domain name is 'rent-seeking text,' a UUID is 'arbitrary entropy'" (papers `keri-primer.md` > 2.1 Autonomic identifiers).

The innovation over a bare SCID is persistence across rotation. A basic AID is the key digest and "MUST be abandoned once the controlling private key becomes weakened or compromised" (KERI spec > SCID, L107). A transferable AID is derived from the whole inception event, including a commitment to the next keys, so "the identifier string remains constant even as the keys change... Identity survives key rotation" (papers `keri-primer.md` > 2.1 Autonomic identifiers). [Chapter 03, sections 2 and 3](#03-inception) own the mechanics, including the tetrad binding and the `d == i` rule.

Behind this is a claim about identity itself: identity is sameness, "it's what holds constant across contexts" (papers `x509-prob.md` > Lifespans don't match). "An organization incorporated in 1975 doesn't renew its identity every ninety days" (keri-security-analysis `cr-ad-trust.md` > 1. The Identity Problem: Administrative Trust and Its Limits). Privileges are dynamic and should expire; identity is stable and should not, which is why "renewing an *identity* is a non-sequitur" (same). A persistent AID is sameness made technical.

## 3. The root of trust is the identifier's own key-event history {#01-root-of-trust}

The KEL is a backward- and forward-chained, signed, append-only log of an AID's key events ([chapter 03, section 1](#03-kel-event-types)). Trust bottoms out there: "This root-of-trust is cryptographic, i.e. not administrative, because it does not rely on any trusted third-party administrative process but is established with cryptographically verifiable data structures alone" (KERI spec > End-verifiable, L89). In contrast, "CT's chain of assurance bottoms out in administrators... KERI's bottoms out in mathematics: the self-certifying identifier derives from the initial public key, and the KEL's validity can be checked by anyone who replays its hash chain, without querying any authority" (papers `wtbo.md` > 3. Common Ground: What CT and KERI Share).

"The head of the log *is* the current state, and anyone can verify it offline, at any time" (keri-security-analysis `cr-ad-trust.md` > 4. KERI's Architecture: A Different Root of Trust). There is no separate revocation infrastructure: key state, including abandonment, lives in the replayable KEL, which is "continuously current" (keri-security-analysis `cr-ad-trust.md` > 2. Certificate Transparency: Progress and Its Limits).

Two invariants make the KEL a root of trust. "In KERI, there MUST be at most one valid KEL for any identifier or none at all" (KERI spec, L178), and events are "first seen, always seen, never unseen" (KERI spec > First seen, L49, L1788), which is the basis of duplicity detection. Because events are signed nonrepudiably, recovery from compromise is not an escape from accountability ([chapter 03, section 10](#03-recovery-rotation)). The root of trust is a history, and history is not rewritten.

## 4. End-verifiability and ambient verifiability {#01-end-verifiability}

### End-verifiability {#01-end-verifiability-defined}

A message's authenticity can be verified by its ultimate recipient from the data alone, with no dependence on anything in between: "Everything in KERI or that depends on KERI is also end-verifiable; therefore, KERI has no security dependency on any other infrastructure, including conventional PKI." (KERI spec, L88). It is "a prerequisite for true zero-trust computing infrastructure, where zero-trust means never trust always verify" (KERI spec, L103).

#### Ambient verifiability {#01-ambient-verifiability}

Ambient verifiability makes it ubiquitous: "the source of any data can be verified anywhere, at any time, by anybody. Ambient verifiability removes any need to trust any of the components in the middle, i.e., the whole internet" (KERI spec, L97). Because verifiable copies of a KEL percolate everywhere, an attacker rewriting the past must isolate a validator from all of them, and "isolation... may be prohibitively expensive. Consequently, ambient verifiability provides asymmetry between the attacker and the defender in favor of the defender" (KERI spec, L1884). Hence "protecting one's private keys is much easier than protecting all internet infrastructure" (KERI spec, L99).

End-verifiability is also why KERI rejects phone-home verification: consulting an issuer, registry or status endpoint at verification time reintroduces the dependency it exists to remove. "A registry consulted at verification time is a phone-home in disguise" (papers `sda.md` > 7. Open loop, not closed). The ACDC architecture checks revocation state "without exposing a point of validation (PoV)" (ACDC spec > TEL Registrars and Observers, L1693), a named rejection of OCSP and CRLs ([chapter 07, section 3.1](#07-crl-ocsp)).

#### Discovery is separated from trust {#01-discovery-vs-trust}

KERI finds an identifier's KEL through Out-Of-Band Introductions (OOBIs), URIs associated with an AID, and treats them as untrusted: "an OOBI itself is not trusted but MUST be verified... any information obtained from the service endpoint provided in the OOBI MUST be verified by some other mechanism" (KERI spec, L2629). Because what an OOBI delivers is end-verifiable, KERI "does not, therefore, need its own dedicated discovery network; OOBIs with URLs will do," and may "safely use DNS/CA, web search engines, social media, email, and messaging as discovery mechanisms. The worst case is the OOBI fails" (KERI spec, L2635; KERI spec > OKEA, L2954). Even the multi-namespace bootstrap pattern "does not change the trust model of an OOBI" (KERI spec > OOBI with MFA, L2838 @`fbdd4a615`); [chapter 06, section 2](#06-oobi-mfa-arbitration) has the detail and [chapter 11](#11-infrastructure) the operations. Finding data is untrusted; verifying it is self-contained.

## 5. The three-layer stack: KERI, CESR, ACDC — and why each exists {#01-three-layer-stack}

KERI is the "Who" (identity), ACDC the "What" (data), and CESR "the language they speak" (papers `keri-primer.md` > 3. ACDCs; 4. CESR). Each layer exists because a property could not be had otherwise.

### 5.1 KERI — the identity / key-management layer {#01-keri-layer}

KERI answers who controls this identifier now and how anyone can know it, contributing the AID, the KEL, pre-rotation, witnesses, delegation and the duplicity model. Pre-rotation makes an AID survivable: "even if a hacker can abuse a current key, they can't rotate to new keys and take permanent control without accomplishing a second hack somewhere else" (papers `x509-prob.md` > Prerotation is missing).

### 5.2 CESR — the encoding / interchange layer {#01-cesr-layer}

CESR is "a dual text-binary encoding format that has the unique property of text-binary concatenation composability" (CESR spec > SAD Path Signatures, L1396): concatenated primitives convert as a group between text and binary "without loss" (CESR spec > Composability, L5), which naive Base64, padding each primitive separately, cannot do: it gives only "one-way composability" (CESR spec, L252). CESR "was developed for the KERI protocol" (CESR spec > SAID, L1186) but is "not limited to merely encoding Cryptographic Primitives" (CESR spec > Abstract Domain, L11). It exists as a layer for compact codes suited to constrained devices (KERI spec > Compact labels, L257), for crypto agility in which a new algorithm claims an unused code and "old ones will break if they receive the new ones" while new implementations accept old streams (CESR spec > Protocol genus/version codes, L618), and for deterministic parsing of interleaved JSON, CBOR and MGPK (CESR spec > Stream parsing rules, L427). Agility makes migration "an event in the KEL. Not a global infrastructure project" (keri-security-analysis `cr-ad-trust.md` > 6. The Transition Problem: A Comparison of Trajectories), and it has a ceiling: "There is a saying in crypto. Too much agility is a bad thing. There is a goldilocks amount of agility." (CESR spec GitHub > #165, comment of 2026-03-19, R-018, https://github.com/trustoverip/kswg-cesr-specification/pull/165#issuecomment-4086516133) [proposal]. [Chapter 04](#04-goldilocks-agility) owns CESR.

### 5.3 ACDC — the authentic-data / credential layer {#01-acdc-layer}

An ACDC is an ordered, SAID-bearing field map "issued by" and "issued to" AIDs (ACDC spec > Targeted Attribute Section, L318), so authentic data is always attributable to a KERI-rooted controller. ACDCs are "fragments of a globally distributed property graph" (ACDC spec > ACDCs as secure graph fragments, L1060-1068), and "No shared or trusted relationship between the Controllers and Verifiers is REQUIRED" (ACDC spec > AID Fields, L95). They are "not just a format — they're a *methodology* for creating verifiable evidence" (papers `x509-prob.md` > Much better alternatives exist). ACDC is the lossless archival form and W3C VC, SD-JWT and mDL are lossy distribution forms, so "once you've chosen a lossy format as your primary evidence, you cannot reconstruct what you've lost" (papers `acdc-vc-diff.md` > Lossless vs. Lossy: A Choice That Matters). The recommended posture keeps the lossless ACDC authoritative and generates lossy formats when an ecosystem requires them (papers `acdc-vc-diff.md` > The Right Format for the Job). [Chapter 05](#05-what-an-acdc-is) owns ACDC.

### 5.4 SAID — the connective tissue {#01-said}

A SAID is "a special type of content-addressable identifier based on an encoded cryptographic digest that is self-referential" (CESR spec > SAID, L1184), and "Any sufficiently strong cryptographic commitment to a content-addressable identifier is functionally equivalent to a cryptographic commitment to the content itself" (CESR spec > SAID, L1188). A signature on a SAID therefore commits to the whole serialization (KERI spec, L306), and "a SAID will verify if and only if its encompassing serialization has not been mutated, which makes the content immutable" (CESR spec > SAID, L1196): "An ACDC is not a mutable document; it is a crystallized fact" (papers `keri-primer.md` > 3.2 SAIDs). SAIDs let KELs anchor arbitrary data, let ACDCs reference each other across trust domains, and let CESR carry compact commitments to large structures. Canonical order is insertion order, not lexicographic: "The natural canonical ordering for such mappings is insertion order" (CESR spec > Order-Preserving Data Structures, L1250), against JCS-style canonicalization ([section 7](#01-mainstream-divergence)).

## 6. The X.509 / PKI problem KERI answers {#01-pki-problem}

### Identifier separated from its keys {#01-identifier-key-separation}

In X.509 an identifier "is a record in a database. The key is a separate artifact. The binding between them is an assertion", which "places the root of trust outside the identity itself" (keri-security-analysis `cr-ad-trust.md` > 1. The Identity Problem: Administrative Trust and Its Limits). The KERI specification states it as a verifiability failure: a certificate gives "evidence of authenticity of the assignment... but not evidence of the veracity of the mapping" (KERI spec > Overcoming existing security overlay flaws, L81). And rotation has no cryptographic link: "When rotating the valid signing keys, there is no cryptographically Verifiable way to link the new (rotated in) controlling/signing key(s) to the prior (rotated out)" (KERI spec, L83). CRLs and OCSP do not fix this — "This merely is asserted." — and re-issuing a certificate "is essentially the same as starting over by creating a brand-new independent mapping" (KERI spec, L83). Google Cloud's 2026 advice not to pin certificates, because pinning breaks at routine rotation, shows it: "there is no cryptographic thread joining the old key to the new one, so a relying party that pinned the old key pinned nothing durable" (papers `x509-prob.md` > Prerotation is missing) ([chapter 07, section 2.4](#07-pinning)).

Further PKI failures the corpus names:

- The wrong locus of risk: "*Certificate authorities aren't the ones that choose or manage the keys in certs.* Holders of certs do that" (papers `x509-prob.md` > Governance is opaque, centralized, and inconsistent, L65 @`181569b64`), so the risk lives in opaque holder key management, a "missile silo" guarded by "one opaquely managed secret" (same section, L49 and L51).
- Evidence that expires by design: "Evidence of identity expires by design, not by necessity" (keri-security-analysis `cr-ad-trust.md` > 1. The Identity Problem: Administrative Trust and Its Limits), which "created a strong incentive to take the insecure and easy path: if there's a risk of a compromised key, just wait until the cert expires" (papers `x509-prob.md` > Revocation is disincented): "The organizations most in need of urgent revocation are the ones most likely to wait" (same).
- Fail-open revocation: when an OCSP responder is down, browsers "accept the unverifiable certificate as valid because blocking traffic is considered too disruptive", so "The system is most vulnerable precisely when it is most needed" (papers `keri-primer.md` > 1.1 Fragility of centralized roots).
- Certificate Transparency redistributes trust. It "is a detection mechanism, not a prevention mechanism" (papers `keri-primer.md` > 1.1 Fragility of centralized roots), with a merge-delay window and an ultimate arbiter that is "a handful of browser vendors" (papers `wtbo.md` > 1. The Identity Problem: Administrative Trust and Its Limits) with "immediate, global effect... no formal appeals process" (papers `wtbo.md` > Notes, [b]). "The result is not a decentralized trust hierarchy. It is a more elaborate one" (keri-security-analysis `cr-ad-trust.md` > 2. Certificate Transparency: Progress and Its Limits) ([chapter 07, section 3.3](#07-certificate-transparency)).
- Jurisdiction-bound trust: "Assertions rooted in the SHAKEN ecosystem mandated by US regulators are not accepted in Europe or Asia" (papers `keri-primer.md` > 1.1 Fragility of centralized roots).

#### The retrograde attack, the deepest contribution {#01-retrograde-attack}

Bare signatures are "difficult to sequence relative to a compromise or revocation event" (papers `was.md`, intro). An attacker who obtains a key once can forge evidence "that looks like it originated in the past, *forever*", and this remains possible "even if she rotates or revokes K before Malfoy steals it" (papers `was.md`, unheaded opening, L18–33 @`181569b64`). X.509, JWTs, OAuth2, OIDC, SD-JWTs and current-state-only DIDs share the limit: "you can ask whether one is valid *now*... but you can't ask whether it was valid a week ago" (papers `was.md` > Mitigation 3 (pyrrhic victory)). NIST SP 800-102 agrees that a signed message "provides no assurance that the private key was used to sign the message at that time" (papers `keri-primer.md` > 3.3 Anchored vs. paired signatures). KERI's answer is anchored signatures: "Keep tamper-evident records that can prove how a given signing event relates in time to changes in the associated key state" (papers `was.md` > Solution), anchored in the KEL, after which a rotation means "Malfoy's attack window closes forever" (same), and which need "no total ordering, and no cumbersome consensus algorithm" (same). [Chapter 03, section 11](#03-as-of-anchor) owns the mechanism.

The boundary the corpus states: this is a migration-cost argument, not present-day parity. X.509 has legal standing KERI lacks, "a gap of legal recognition, not of technical capability" (papers `wtbo.md` > Notes, [c]), and "KERI's oft-cited operational complexity is itself load-bearing" (papers `wtbo.md` > 6. The Transition Problem: A Comparison of Trajectories). That KERI's constraints are of immaturity while PKI's are architectural is a falsifiable, contestable position.

## 7. The decentralization-purity thesis and where the mainstream diverged {#01-mainstream-divergence}

The corpus describes generations of identity evidence: X.509 as 1.0, DIDs and W3C VCs as 2.0, ACDC and KERI as 3.0, "in production since December 2022, when the first global-scale systems went to production" (papers `x509-prob.md`). The drift critique is that SD-JWT, W3C VCs and most DID methods imported PKI and OAuth assumptions and "re-created centralization one level up while losing time, trust-chain, and key-history fidelity" (raw/06 section 9). Its author "worked on both of these standards, and I remain proud of their virtues" (papers `x509-prob.md` > Much better alternatives exist), so it is an insider's critique. The divergences:

- DIDs stalled on issuer rotation. "Evidence is also *issued by* an identifier... If the issuer updates their identifier, old evidence is invalidated", and "This risk is poorly understood in SSI circles" (papers `x509-prob.md` > Much better alternatives exist), like a licensing bureau "whose recover-from-breach plan required all current license holders to come back to the office" (papers `was.md`) ([chapter 07, section 6.2](#07-dids-solved-it)).
- W3C VCs are lossy in six ways: the trust chain collapses to one hop, VCs are "generally verifiable only in the present", edges cannot carry properties, the three-party model fits pure attestation badly, issuer key history is opaque, and `@context` link rot lets meaning change "without breaking the cryptographic signature" (papers `acdc-vc-diff.md`).
- SD-JWT signs the wrong thing: its `kid` "points at the key, not the identifier, so key rotation invalidates historical signatures" (papers `sdjwt-acdc.md` > 2.3 Signing mechanism), and its standalone envelopes "will need registries of trusted issuers" (papers `sdjwt-acdc.md` > 2.4 Chaining), where ACDCs "prove the bona fides of issuers by chaining to other ACDCs." Its flexibility in identifier type "makes it much more difficult to predict or enforce security properties" (papers `sdjwt-acdc.md` > 2.2 Identifiers). [Chapter 06, section 8](#06-scorecard) has the comparison.
- Canonicalization: JCS "is brittle," and JSON-LD term redefinition means "the meaning of a signed credential can be altered without invalidating the signature" (papers `keri-primer.md` > 4.1 The engineering bottleneck: text vs. binary) ([chapter 07, section 6.4](#07-json-canonicalization)).
- Blockchain reflexes: anchoring needs only per-identifier ordering, with "no permissioning problem, no big central *anything* in the sky, no scale or performance bottlenecks, and no regulatory problems with data locality, privacy, or erasure" (papers `was.md` > Solution); forgetting an identifier on a blockchain "requires a hard fork of the entire chain" (papers `keri-primer.md` > 3.5 Privacy and selective disclosure), whereas KERI's separate logs let a user delete a KEL "without disrupting the global ecosystem" (same) ([chapter 07, section 4.1](#07-global-consensus)).

### Most DIDs resolve only to current key state {#01-did-current-state}

"most DIDs, including crowd favorites like did:web, can only be resolved to the current key state" (papers `was.md` > Mitigation 3 (pyrrhic victory)), so historical actions cannot be verified unless the method supports `versionId` or `versionTime`, which most do not. That exposes them to the retrograde attack of [section 6](#01-retrograde-attack). The conversion runs one way: "AIDs can be transformed to DIDs, but the opposite transformation is typically impossible" (papers `sdjwt-acdc.md` > 2.2 Identifiers).

Beneath these is one architectural fork. In closed-loop systems "the party that *issues* authority is the same party that *checks* it"; in open-loop systems "a third party who is *not* the issuer can verify authority *without* consulting the issuer" (papers `sda.md` > 7. Open loop, not closed). KERI and ACDC are open-loop, the authority-side form of end-verifiability, and the drift toward registries, status endpoints and current-state resolution is a slide back to closed-loop trust.

Cryptography's reach is bounded by authenticity against veracity: "Judgments about authenticity can — *if managed very carefully* — be reduced to an objective mathematical computation, whereas judgments about veracity inherently require subjective assessments of reputation" (papers `authenticity-vs-veracity.md`). KERI mechanizes authenticity and does not claim veracity ([chapter 06, section 1](#06-authenticity-veracity)), a discipline the applied schema corpus restates [practice]: an ACDC's validation "can prove that an issuer remains committed to a citation — but only the interaction context... plus governance... establishes what proposition is true" (bakobo/schema `citation/index.md` > Citations > Semantic precision, L39 @`cfcbdcc7a`). That is why a human keeps the final judgment: "Automate the introduction. Automate the proof where you can. But never automate the verification of the proof" (papers `oia.md` > Connections, and the line between introducing and proving, L86 @`181569b64`).

## 8. Well-established vs. contested: the load-bearing assumptions {#01-load-bearing-assumptions}

### 8.1 Well-established: definitional or cryptographically grounded {#01-well-established}

- The self-certifying derivation, KEL structure, pre-rotation and SAID anchoring are specified and implemented, resting on standard hash and signature assumptions ("A1 — Cryptographic Soundness," keri-security-analysis `background.md` > 4.6 Explicit Assumptions Introduced in This Section) and roughly 128-bit strength targets (KERI spec > Annex A, L1698-1704).
- Survivability is a stated design goal: "KERI, as specified, adopts a survivability-oriented security model" (keri-security-analysis `standard-analysis.md` > 0. Objective-Function Alignment), so faulting it for not preventing malicious-controller duplicity is a category error ([chapter 02, section 1](#02-survivability)).
- The post-quantum argument for pre-rotation is sound in shape: an attacker "must first invert the digest... Pre-quantum cryptographic strength is, therefore, not weakened post-quantum" (CESR spec > Post-Quantum Security, L1510-1512; KERI spec, L1711-1713). The "effective 128 bits" number attached to it is contested ([chapter 02, section 5](#02-pq-hedge)). Regulation is moving the other way on classical signatures: the EU catalog's draft demotes them to a time-limited class, so "staying classical becomes a rationale owed for every new system rather than a wall met on a date" (papers `wtbo.md` > 6. The Transition Problem: A Comparison of Trajectories, L147 @`181569b64`).

### 8.2 Contested, conditional, or load-bearing assumptions {#01-contested}

[Chapter 02](#02-assumptions) owns the security assumptions and their evidence. In summary: KERI does not guarantee global convergence, and permanent divergence between validators is allowed ([chapter 02, section 10](#02-local-validity)); KAWA's consistency holds only under an honest controller, who may otherwise run its own witnesses ([chapter 02, section 7](#02-kawa)); the observer layer that detection depends on is optional, unenforced and immature, and "A KERI deployment without robust watchers and governance is not a secure system" (keri-security-analysis `cr-ad-trust.md` > 5. Evaluating KERI: Real Tradeoffs, Honestly Stated) ([chapter 02, section 9](#02-observer-layer)); centralized "super watcher" archives pull back toward the dependency KERI avoids; double compromise of current and rotation keys is unrecoverable by design; and the strongest formal analysis is an unreviewed 2025 Master's thesis, whose findings the corpus resolves by its own argument rather than by independent consensus.

#### Adversarial review by AI personas is not independent validation {#01-ai-review-not-validation}

A source in this corpus says so about itself: passes over `m-glance.md`'s model "were conducted by AI models prompted to argue from a named lens, not by human domain experts", and "They are a structured way to attack one's own assumptions, not independent validation" (papers `m-glance.md` > 1. Introduction, L71–74 @`181569b64`). The paper is not a KERI source, but the point applies on the same terms to adversarial-review output produced for this repository, including `keri-doctrine.md`'s panels. It is evidence about what the method's output is worth, not that any claim here is wrong.

#### A signed presentation is a durable correlator {#01-durable-correlator}

When a credential is shown to infrastructure rather than only to a counterparty, the evidence is identical at every party that sees it, which makes "a conventional signed presentation a durable correlator across matchers and across queries", and "unlinkable presentation that still permits counting is not a solved problem" (papers `active-discovery.md` > Proving who is asking, L113 @`181569b64`). The recommended mitigation is architectural: "The narrower and safer arrangement is for the seeker's evidence to travel end-to-end and be evaluated only by the sought party" (same line). This bounds graduated disclosure once a third party sees a presentation at all, and it is the author conceding the gap in his own voice.

### 8.3 Properties stated relative to assumptions {#01-relative-to-assumptions}

Security properties are always stated relative to their assumptions: "Agreement thresholds do not imply global safety... Failure to state these boundaries results in overstated guarantees" (keri-security-analysis `background.md` > 4.7 Analytical Implications; 5.10 Analytical Boundary Conditions). KERI's worldview is internally consistent on its own survivability terms. The open questions are whether watchers, governance, legal recognition and tooling mature fast enough to deliver in practice the detection and recovery the design permits but does not compel.

## 9. Where the doctrines came from {#01-lineage}

Each doctrine has a dated origin in Sam Smith's papers, which are [proposal]: whitepapers, several co-authored, none specification text. Where Sam's later narration differs, the papers are the record (raw/20 section 7.1).

The security frame came first: "Survivability can be broken up into three aspects, these are, susceptibility, vulnerability, and recoverability." (Smith Papers `Identity-System-Essentials.pdf` > Security), the triad of [chapter 02, section 1](#02-survivability). That 2016 paper rested security on ledgers, "Using diffuse trust distributed consensus enables the decentralized and highly secure management of many parts of the identity system" (Smith Papers `Identity-System-Essentials.pdf` > Hybrid Ledgers), a position KERI later reversed, so it is history, not doctrine.

Pre-rotation took two steps. In 2017 Self-Identifying Data listed "The four R's of key managment are:" (Smith Papers `SelfIdentifyingData.md` > Identifier Key Management, L171; the misspelling is the source's), with no pre-commitment. In 2018 Decentralized Autonomic Data folded revocation into rotation, "We call these the essential three R's of key management." (Smith Papers `DecentralizedAutonomicData.md` > Key Management, L108), and introduced the mechanism: "The approach presented here is to pre-rotate the DID key and declare the pre-rotation at the inception of the DID." (Smith Papers `DecentralizedAutonomicData.md` > Basic Pre-rotation, L228) ([chapter 03, section 5](#03-pre-rotation)). The same paper's Replicants, redundant hosts of an event history, are the ancestors of witnesses, and it rejects a consensus ledger because it "is not the minimally sufficient means of providing this capability" (Smith Papers `DecentralizedAutonomicData.md` > Replayability, L427). The co-authored Cooperation Beats Aggregation still endorsed "blockchain-anchored decentralized identity infrastructure" in 2019 (Smith Papers `CooperationBeatsAggregation.md` > Conclusion, L258), a lag in a jointly written paper rather than Sam's position that year.

ACDC chaining comes from A DID for Everything (2018), where "Data flows may be provenanced via a self-referential blockchain" (Smith Papers `A_DID_for_everything.md` > Motivation, L99), each item carrying the identifier and signature of the one before ([chapter 05, section 5](#05-edges)). Identifier theory and reputation, the purpose all of it serves, run from Open Reputation (2015) to Universal Identifier Theory (2020) and belong to [chapter 14, Identifiers, Trust Bases and Reputation](#14-identifiers).

## Sources {#01-sources}

- ACDC spec — Authentic Chained Data Containers (ACDC) specification, Trust Over IP. trustoverip/kswg-acdc-specification, spec/spec-body.md, at the 2026-07-17 corpus stamp (no commit recorded), so its line hints are hints at that stamp. Line numbers per raw/03. Mined in raw/03.
- bakobo/schema — Bakobo's applied ACDC schema corpus [practice]. bakobo/schema, `citation/index.md`, main @`cfcbdcc7a` (2026-10-02); the quoted sentence is also at L39 of provenant-dev/public-schema `citation/index.md` @`95a07e544`. Evidence of how the doctrine survives contact with practice, not of what KERI is. Mined in raw/11.
- CESR spec — Composable Event Streaming Representation (CESR) specification, Trust Over IP. trustoverip/kswg-cesr-specification, spec/spec-body.md, at the 2026-07-17 corpus stamp (no commit recorded), so its line hints are hints at that stamp. Line numbers per raw/02. Mined in raw/02.
- CESR spec GitHub — Sam Smith's comment of 2026-03-19 on trustoverip/kswg-cesr-specification pull request #165 (R-018), read from the API cache of 2026-10-14 (`.ignored/sam-rulings-cache/`). [proposal]: an editor's comment, not specification text. Mined in raw/21.
- KERI spec — Key Event Receipt Infrastructure (KERI) specification, Trust Over IP. trustoverip/kswg-keri-specification, spec/spec-body.md and spec/termdefs.md, main @`fbdd4a615` (2026-08-28). Nothing here rests on the `v1.1` branch. Line numbers per raw/01. Mined in raw/01.
- keri.one — keri.one homepage, Samuel M. Smith. https://keri.one/, mined 2026-07-17 (a web source with no commit). Mined in raw/13.
- keri-security-analysis — KERI security-analysis corpus (`cr-ad-trust.md`, Cryptographic vs. Administrative Trust; `background.md`, with the A1–A13 assumption catalog; `standard-analysis.md`), Daniel Hardman. dhh1128/keri-security-analysis, main @`149fa6c35` (2026-04-23), the repository's only commit. Mined in raw/07.
- papers — Daniel Hardman's papers: `keri-primer.md`, `wtbo.md` (Where Trust Bottoms Out, v1.8), `x509-prob.md`, `was.md` (Why Anchored Signatures?), `kspqs.md` (KERI's Strategy for Post-Quantum Security, v1.2), `sdjwt-acdc.md`, `acdc-vc-diff.md`, `authenticity-vs-veracity.md`, `oia.md`, `sda.md` (The Shape of Delegated Authority), `active-discovery.md` (Building Active Discovery) and `m-glance.md`. dhh1128/papers, main @`181569b64` (2026-09-15). The author's framing, not normative text. The `was.md` retrograde-attack quotes are in its unheaded opening; no heading named Retrograde attack exists. Building Active Discovery does not concern OOBIs: its "discovery" means finding an unknown person by attributes, and the OOBI material in [section 4](#01-discovery-vs-trust) corresponds to nothing in it. Sections per raw/05 and raw/06. Mined in raw/05 and raw/06.
- Smith Papers — Samuel M. Smith's papers repository, SmithSamuelM/Papers, master @`b47f21597` (2026-08-11): `whitepapers/Identity-System-Essentials.pdf` (Smith and Khovratovich, 2016), `whitepapers/SelfIdentifyingData.md` (2017), `whitepapers/DecentralizedAutonomicData.md` (2018), `whitepapers/A_DID_for_everything.md` (RWOT VII, 2018) and `whitepapers/CooperationBeatsAggregation.md` (Shea, Smith and Stöcker, 2019). [proposal], cited in [section 9](#01-lineage) as dated history. Mined in raw/20.

---

# 02 — Security Model and Threat Posture {#02-security}

## Thesis {#02-thesis}

KERI does not promise that attacks cannot happen. It promises that when they happen the identifier survives, the misbehavior becomes evidence, and control can be recovered. Its objective function is survivability, not invulnerability; its mechanism is detection, not prevention; its characteristic property is that duplicity is evident, not that it is impossible; and it assumes from the outset that the controller may be malicious. Because KERI declines to buy global consensus, different validators may hold different valid histories of one identifier, possibly forever, and detection moves into an observer layer (watchers, jurors, judges) that the protocol enables but does not guarantee. The commonest review error is to judge KERI against an invulnerability objective it never adopted, which "is analogous to criticizing a smoke detector for not preventing fires." (dg-c02-claude.md > 5. Logical or Analytical Errors)

## Status {#02-status}

Most of this chapter rests on the keri-security-analysis corpus and on papers rather than on a specification, so markers appear where the distinction does work: implementation behavior in [section 4](#02-zero-trust) and [section 8](#02-witnesses), and an author's slides and a GitHub ruling set beside the analysis in [section 3](#02-lazy-consistency) and [section 9](#02-witnesses-as-watchers). The six per-claim Del Giudice analyses are model-authored ([section 12](#02-evidence-standards)).

## 1. Survivability, not invulnerability {#02-survivability}

The security-analysis method requires every analyst to name the objective a claim assumes, because the two objectives judge the same facts in opposite ways. An invulnerability framing "assumes that security requires prevention of entire classes of attack (e.g., forks, equivocation, conflicting histories) via mechanisms such as global ordering or consensus." A survivability framing "does value prevention" but "assumes that some adversarial behaviors are inevitable and evaluates security in terms of a gestalt... invulnerability, detectability, evidence preservation, recoverability, and mission-level continuity under disturbance." (standard-analysis.md > 0. Objective-Function Alignment)

KERI "adopts a survivability-oriented security model." (standard-analysis.md > 0. Objective-Function Alignment) Its aims are to keep functioning under disturbance, make hostile actions observable and attributable, preserve evidence for recovery and governance, and "Avoid abortive mission failure even when attacks succeed." The reframing rule follows: "Forks and equivocation by malicious controllers are anticipated disturbances, not protocol failures." (background.md > 4.5.1 Survivability-Oriented Security Framing (Analytical Context))

The papers say it in engineering terms: "detection and recovery are therefore first-class design requirements, not fallbacks." (wtbo.md > 3. Common Ground: What CT and KERI Share) [practice] One deployment states it as a business fact: "If our business grows, we will eventually be hacked." (origin-platform docs/origin-security.md > 1. Philosophy, L18 @cb758b1b5). Where the strength of pre-rotation is at issue, this corpus cites wtbo.md's conditional statement of it ([section 5](#02-pre-rotation-firewall)), not the unconditional "fundamentally resilient, not just resistant" of `kspqs.md`.

## 2. Detection, not prevention {#02-detection-not-prevention}

"KERI is fundamentally a detection-oriented system with optional response mechanisms." The hygiene rule that follows: "Any claim that implies prevention must be scrutinized for hidden assumptions." (background.md > 4.5 Detection vs Prevention)

The choice is a cost decision: "guaranteeing prevention requires global consensus at a cost in latency and scalability that both systems deliberately decline to pay." (cr-ad-trust.md > 3. Common Ground: What CT and KERI Share) In CAP terms, "KERI explicitly chooses availability and partition tolerance, and handles the consistency gaps through detection." (wtbo.md > 5. Evaluating KERI: Real Tradeoffs, Honestly Stated)

Certificate Transparency is detection-oriented too, and the specification marks the difference: "Unlike certificate transparency, KERI enables the detection of Duplicity in the Key state via nonrepudiable cryptographic proofs of Duplicity, not merely the detection of inconsistency... that MAY or MAY NOT be duplicitous." (KERI spec > Overcoming existing security overlay flaws, L85) CT detects that two logs disagree; KERI detects that one controller signed two conflicting things. The shibboleth is [chapter 07, section 3.3](#07-certificate-transparency).

### Established, with a standing invariant {#02-detection-established}

The keripy knowledge base states it as a protocol-level claim: KERI "does not make a malicious controller's fork impossible; it makes it detectable and attributable by observers." Witnesses and OOBIs are "sources of data, never sources of authority." (keripy-knowledge 00-lens.md > The load-bearing claims, claims 1 and 2)

## 3. Duplicity-evident, not duplicity-resistant {#02-duplicity-evident}

KERI "doesn't try to make duplicity impossible -- that would require global consensus... It makes duplicity provable and attributable." (wtbo.md > 4. KERI's Architecture: A Different Root of Trust)

### Definition of duplicity {#02-duplicity-definition}

Duplicity is "the existence of more than one Version of a Verifiable KEL for a given AID." (KERI spec, termdefs) Because both versions must be fully signed and witnessed, it "is only possible via key compromise or the controller acting duplicitously (indistinguishable to a watcher)." (KERI spec, L51) Duplicity differs from invalidity (background.md > 4.1.2 Duplicity vs Invalidity): an unsigned or malformed event is dropped, while a duplicitous event is valid and therefore evidence.

#### The terminological trap {#02-terminological-trap}

Del Giudice's thesis concludes that "KERI is therefore not duplicity-resistant but only duplicity-evident." (2025 ETH Zurich thesis, chapter 4, section 4.1, p.38, quoted in background.md > 8.2 Catalog of Security-Relevant Claims (from Del Giudice), DG-C03) If resistant means prevention, that is accurate. The word only imports an invulnerability bias, and a blockchain-trained reader hears "weaker than a blockchain", when KERI "solves a different problem." (dg-c03-claude.md > 6. Net Effect on Security Interpretation)

#### Why evidence is not a consolation prize {#02-evidence-not-consolation}

A malicious controller "producing a detectably duplicitous event history is tantamount to a detectable total exploit... analogous to a total but detectable exploit of any BFT ledger such as a detectable 51% attack on a proof-of-work ledger." (KERI spec, L1842) And "One verifiable copy of a KEL (more specificly a KERL) is enough to detect duplicity in any other verifiable but inconsistent copy." (KERI spec, L1719)

#### Global consistency is owed only when it is checked {#02-lazy-consistency}

[proposal] Sam Smith's 2020 Duplicity Game deck scopes consistency to the interaction: a private interaction carries a "Local Consistency Guarantee" and a public one a "Global Consistency Guarantee", and "Global consistency may only matter after A and B need to interact not before." and "Breaking the promise of global consistency is a provable liability." (Duplicity Game, slides headed Duplicity Game @b47f21597). On this chapter's reading, global consistency is lazy: validators that never compare views are owed nothing, and once they interact any divergence is duplicity they can prove. That is why the permanent divergence of [section 10](#02-local-validity) is not a defect in itself.

## 4. The zero-trust, malicious-controller stance {#02-zero-trust}

"Verifiers do not assume controller honesty." (background.md > 2.1 Controller) Protecting against a fully malicious controller is an explicit non-goal (background.md > 1.3 Explicit Non-Goals), and the controller "may also be malicious and, in some ways, may be indistinguishable from a successful malicious third party." (KERI spec, L1723) Zero trust here means "never trust always verify" (KERI spec, L103), and in code "every externally supplied event, signature, key, receipt, or credential is hostile input until verified" (keripy-knowledge 00-lens.md > The load-bearing claims, claim 3).

The witness set does not protect against a malicious controller. It "may produce multiple conflicting KELs," "each may independently achieve sufficient agreement", and "Witness thresholding alone does not prevent this." (background.md > 5.8 Malicious Controller Case), because such a controller "can simply run its own witnesses" (thesis, chapter 3, section 3.1.4, p.26, in background.md > 8.2 Catalog of Security-Relevant Claims (from Del Giudice)). Witnesses themselves "are assumed to be potentially malicious." (keri-primer.md > 2.6 Witnesses and the watcher network)

### The honest-controller subtlety {#02-honest-controller}

The honest-controller assumption in the formal literature is a proof simplification, not a deployment requirement: "Removing it does not break KERI's security -- it shifts the focus from prevention to detection and recovery." (dg-c06-claude.md > 3. Assumption Sensitivity)

#### In scope for analysis, out of scope for prevention {#02-malicious-in-scope}

For a controller that "intentionally produces multiple conflicting KELs", "KERI does not attempt to prevent this" and "Security relies on detectability and consequences, not impossibility." "This threat is in scope, but must be analyzed separately from honest-controller cases." (background.md > 4.4 Threat Surfaces > 4.4.2 Malicious Controller, L318-324) Consequences put the response after detection, by validators, governance and counterparties, inside the security claim, so an argument that stops at proving the fork has stated half of it.

#### Fail-closed and fail-open in the code {#02-fail-closed}

[code] The hostile-input rule has a machine-checkable form: input a verifier cannot evaluate is refused, not defaulted. keripy's two ACDC edge evaluators disagree on exactly that, with `vdr/verifying.py` dropping an unrecognized operator and applying the default while `acdc/ipexing.py` fails closed; [chapter 05, section 5.1](#05-verifying-ground-truth) has the code. One input with a fail-open and a fail-closed path is a threat-posture finding whichever way it resolves.

#### A failing message tells the sender nothing {#02-no-failure-oracle}

[proposal] Sam Smith rules that the best practice for a long-running internet-facing service is "to not inform the caller why a given message sent to the service failed" (keripy GitHub > #1580, comment of 2026-08-07, R-021, https://github.com/WebOfTrust/keripy/pull/1580#issuecomment-5221176507), to deny an oracle; [chapter 04, section 10](#04-no-failure-oracle) has the parser side.

## 5. The pre-rotation firewall: survivability instantiated {#02-pre-rotation-firewall}

Pre-rotation is where survivability becomes a mechanism: "control authority is split between keypairs that hold signing authority and keypairs that hold rotation authority." (KERI spec > Pre-rotation, L1364) An attacker with the current keys can sign but cannot rotate, since "later exploit of the current authoritative signing key(s) may not capture key rotation authority as it has already been transferred via the pre-commitment to a new unexposed set of keys." (KERI spec, L1628) The mechanism, its code in keripy, its post-quantum argument and its fail-open hazard are [chapter 03, section 5](#03-pre-rotation).

What this chapter adds is the conditions. The asymmetry is designed: "Compromise of current keys is survivable; compromise of pre-rotation keys is catastrophic and unrecoverable." (keripy-knowledge 30-invariants.md > C. Pre-rotation & recovery (maximum sensitivity), C2) And the guarantee is a race, not a wall: "the hash protects the next key, never the one currently exposed, so safety rests on the controller detecting compromise and rotating before an adversary can exploit what the rotation reveals." (wtbo.md > 4. KERI's Architecture: A Different Root of Trust, L99 @181569b64). That sentence is the citation of record for the strength of pre-rotation. [spec-next] The CESR forward branch concedes the same limit: hiding pre-rotated keys "protects the next key pair but does not protect the currently exposed one" (CESR spec > Post-Quantum Cryptographic Primitives, L1553 @65fd7518b); it is not on `main` and binds nobody. Recovery does not launder accountability ([chapter 03, section 10](#03-recovery-rotation)).

### The post-quantum hedge {#02-pq-hedge}

The firewall's post-quantum property is a claim about hashes, and it is [spec]: because prior-next key digests are post-quantum safe "in that a quantum computer is not advantaged over a conventional computer in inverting cryptographic strength digests", a surprise quantum attacker who inverts the exposed signing keys "is not able to forge a verifiable Rotation event" (KERI spec > SQAR, L1580 @fbdd4a615). The number attached to it is contested. The papers say a 256-bit hash "provides an effective 128 bits of post-quantum security" (kspqs.md > The Pre-Rotation Mechanism: A Royal Succession, L72 @181569b64), while ENISA's draft guidance, as the same paragraph reports, "does ask for 384-bit hash outputs where quantum security is sought". The author's answer, that this is "a parameter choice, not a change of primitive, and one KERI's agility accommodates by design" (same line), is his assessment, not a surveyed result. The same guidance treats hash-based mechanisms as usable standalone and lattice schemes as not yet, which is the bet pre-rotation makes. The forward branch stacks post-quantum signatures beside pre-rotation rather than in place of it [spec-next] (CESR spec > Post-Quantum Cryptographic Primitives, L1553 @65fd7518b). Unknown: whether the pre-rotation `n` field can carry a 384-bit commitment without a specification change, and whether any deployment uses anything but Blake3-256.

## 6. Guarantees are stated relative to assumptions (A1-A13) {#02-assumptions}

"Security properties must be stated relative to assumptions." "Agreement thresholds do not imply global safety." "Failure to state these boundaries results in overstated guarantees." (background.md > 4.7 Analytical Implications; 5.10 Analytical Boundary Conditions) Each assumption below is a place where a deployment can silently fall short.

| ID | Name | Statement | Source |
|---|---|---|---|
| A1 | Cryptographic Soundness | "Hash functions and signature schemes are secure." | background.md > 4.6 Explicit Assumptions Introduced in This Section |
| A2 | Bounded Witness Faults | "At most `f` witnesses behave arbitrarily for a given identifier." | background.md > 4.6 Explicit Assumptions Introduced in This Section |
| A3 | Honest Controller (Conditional) | "The controller follows the protocol except where explicitly stated." Many analyses, including Del Giudice's KAWA analysis, implicitly rely on A3. | background.md > 4.6 Explicit Assumptions Introduced in This Section |
| A4 | Witness Non-Equivocation | "Correct witnesses do not sign conflicting events for the same sequence number, except as explicitly allowed by recovery rotation rules." | background.md > 4.6 Explicit Assumptions Introduced in This Section; 5.4 Witness Behavior Rules |
| A5 | Observer Presence | "At least some validators employ watchers that compare histories across sources." Qualification: "A5 is optional in practice and MUST NOT be silently assumed." | background.md > 4.6 Explicit Assumptions Introduced in This Section |
| A6 | Network Liveness | "Messages between honest parties are eventually delivered." | background.md > 4.6 Explicit Assumptions Introduced in This Section |
| A7 | Threshold Discipline | "Controllers configure `M` such that `M > f`." (M = toad; common but not required: N = 3f+1, M = 2f+1) | background.md > 5.3 Agreement Thresholds |
| A8 | Observer Coverage | "At least some observers monitor identifiers of interest." | background.md > 6.4 Observer Assumptions (Explicit) |
| A9 | Observer Diligence | "Observers actively fetch, compare, and update KERLs." | background.md > 6.4 Observer Assumptions (Explicit) |
| A10 | Information Flow | "Observers obtain KERLs from sufficiently diverse sources." | background.md > 6.4 Observer Assumptions (Explicit) |
| A11 | Evidence Integrity | "Observers preserve and share evidence accurately." | background.md > 6.4 Observer Assumptions (Explicit) |
| A12 | Validator Diversity | "Validators may observe different subsets of the network and data sources." | background.md > 7.2 Validator Inputs |
| A13 | Policy Variance | "Validators may apply incompatible fork-handling policies." | background.md > 7.6 Fork Handling at Validators |

Three are most often granted for free. A3 is a proof convenience, not a deployment premise ([section 11](#02-dg-c06)). A5 "MUST NOT be silently assumed", so any argument that duplicity will be detected is smuggling it in. And "None of A8-A11 are enforced by KERI." (background.md > 6.4 Observer Assumptions (Explicit))

### Four threat surfaces {#02-threat-surfaces}

Every cell quotes background.md > 4.4 Threat Surfaces at the subsection in the first column (L301-354 @149fa6c35). Two of the four surfaces have no protocol mitigation.

| Surface | Threat | Mitigation | What remains |
|---|---|---|---|
| Controller key compromise (4.4.1) | "Adversary obtains current signing keys" | "Pre-rotation commitments"; "Recovery rotation" | "Compromise of pre-rotation keys is catastrophic" ([section 5](#02-pre-rotation-firewall)) |
| Malicious controller (4.4.2) | "Controller intentionally produces multiple conflicting KELs" | None: "KERI does not attempt to prevent this" | Detectability and consequences ([section 4](#02-malicious-in-scope)) |
| Witness misbehavior (4.4.3) | "Signing conflicting events"; "Withholding receipts"; "Colluding with controller" | "Thresholding"; "Assumptions on maximum faulty witnesses" | "Witness sets are controller-chosen"; "No global witness reputation or enforcement" |
| Observer absence or degradation (4.4.4) | "Watchers/jurors/judges are absent, lazy, siloed, or non-overlapping" | None in the protocol | "Duplicity may remain undetected indefinitely"; "Validators may accept conflicting histories permanently" |

The observer surface is where the one criticism that survives the Del Giudice bindings lands ([section 12](#02-contested)), and "This threat is explicitly acknowledged and not mitigated by protocol mechanics alone." (background.md > 4.4.4 Observer Absence or Degradation, L354)

## 7. KAWA: what witness agreement is (P1-P4) and is not (P5-P8) {#02-kawa}

KAWA, KERI's Algorithm for Witness Agreement, is "a single-phase agreement protocol that provides fault tolerance without the multi-phase commit overhead of classical Byzantine Fault Tolerant algorithms like PBFT." (cr-ad-trust.md > 4. KERI's Architecture: A Different Root of Trust) Its thresholds are N witnesses and a receipt threshold M (the toad). BFT sizing (N = 3f+1, M = 2f+1) is common, not mandated; a controller may set M = N or M = 1 (dg-c01-claude.md > 2. Faithfulness to KERI-as-Specified).

KAWA is "a controller-scoped agreement mechanism, not as a global consensus protocol." (background.md > 5. KAWA (KERI’s Algorithm for Witness Agreement), L444-445) It provides durability, availability and fault tolerance for one identifier, and does not attempt to "Establish global agreement among validators", "Prevent intentional equivocation by controllers" or "Enforce witness honesty beyond threshold assumptions" (background.md > 5.1 Purpose of KAWA, L457-462). Witness state is kept "per identifier" (background.md > 5.2 Inputs, Outputs, and State, L483), so nothing in KAWA relates two identifiers' histories; that inference is raw/07's.

### Provided properties {#02-kawa-provided}

All scoped to an honest controller unless noted (background.md > 5.6 Claimed Security Properties of KAWA).

- P1, Validity — "If a correct witness accepts an establishment event, that event was authorized by the controller." Depends A1, A3, A4.
- P2, Consistency — "Two correct witnesses will not accept different establishment events at the same sequence number." Depends A2, A3, A4, A7. "This is the strongest KAWA property and is conditional. It does not hold if the controller is malicious."
- P3, Durability — "Once an event has a sufficient agreement, it cannot be removed or replaced." Depends A2, A4, A6. "Durability is local to witnesses and does not imply global convergence."
- P4, Availability — "Validators can retrieve the KERL even if the controller is offline." Depends A2, A6.

#### Explicitly not provided by KAWA {#02-kawa-not-provided}

KAWA does not provide P5, fork prevention for malicious controllers; P6, global consistency across validators; P7, timely fork detection; or P8, automatic fork resolution. "Any claim implying these properties must introduce additional mechanisms (e.g., observers, governance, social response)." (background.md > 5.7 Properties Explicitly Not Provided by KAWA) "KAWA alone determines local durability. Observers determine global detectability." (background.md > 5.9 Relationship to Observer Layer)

#### Microledgers, not blockchain {#02-microledgers}

A blockchain's consensus decides whether and in what global order an event is recorded. KERI splits that into per-identifier microledgers, the KELs, and the controller has recorded an event in its own KEL before KAWA runs. KAWA asks not whether to record but whether anyone is trying to fork history after the fact, which is detection of equivocation (DECENTRALIZATION-PURITY-STEERING.md > The thesis this must capture). Local order suffices because "the controller is the sole source of truth for the creation of any and all key events, it alone, is sufficient to order its own key events", and key events are "idempotent authorization operations as opposed to non-idempotent account balance decrement or increment operations." (KERI spec > KAWA insight, L1836) The shibboleth is [chapter 07, section 4.1](#07-global-consensus).

#### The immunity constraint {#02-immunity-constraint}

What witness thresholds do buy: for N witnesses there is an M < N guaranteeing at most one sufficient agreement, despite a dishonest controller, provided at most F* = N - M are unavailable and F < M are duplicitous, so "the service may not produce multiple divergent but proper KERL." (KERI spec, L1866-1868) The validator chooses M to protect itself. It holds only within those bounds: if controller and witnesses collude, "KAWA can't protect -- protection then comes from validator-side duplicity detection across a large diverse observer set." (KERI spec, L1874) Pool sizing and diversity in practice are [chapter 11, section 4](#11-witness-pools).

## 8. Witnesses, backers, and thresholds {#02-witnesses}

A witness stores and serves the controller's KEL and returns signed receipts; "Witnesses make no assertion about identity... That is a fundamentally different role than a CA." (cr-ad-trust.md > 4. KERI's Architecture: A Different Root of Trust) It is under the controller's ultimate control, and a backer is an alternative that commonly uses a ledger (KERI spec, termdefs). Designation is [chapter 03, section 9](#03-witnesses).

- Sufficient agreement is receipts meeting the toad, not all witnesses: "the controller accepts accountability for an event when any subset M of the N witnesses confirms that event." (KERI spec, L1846, L1850) [code] keripy's `WitnessReceiptor` waits for every witness — `completed = len(wigers) == len(wits)` (keripy src/keri/app/agenting.py, WitnessReceiptor.receiptDo, L360-361 @b8f60166b) — and never reads `hab.kever.toader`; in the knowledge base's words, "that is a defect, not the invariant" (keripy-knowledge 30-invariants.md > F. Witness threshold (TOAD), F2).
- Threshold discipline (A7) is the controller's: "KERI does not enforce threshold choices; misconfiguration weakens guarantees." (background.md > 5.3 Agreement Thresholds) With M = 1 the immunity constraint tolerates no duplicitous witness, since it needs F < M. The model-authored dg-c01 analysis says such a threshold "can be trivially broken by a single malicious witness" (dg-c01-claude.md > 3. Assumption Sensitivity), which overstates it: a lone witness cannot produce a second signed version without the controller's keys ([section 12](#02-never-grant)).
- Witness AIDs "MUST be non-transferable, fully qualified public keys" so a validator can verify a receipt from the AID alone (KERI spec, L353, L1252). The keripy prefix-code hazard is [chapter 03, section 3](#03-ed25519n-landmine).

## 9. The observer layer: watchers, jurors, judges, and ambient duplicity detection {#02-observer-layer}

Global detectability is the job of an observer layer the protocol enables but does not mandate, with three roles kept apart so no observer both detects duplicity and rules on it (background.md > 6.2 Observer Roles (Functional Definitions)).

- Watcher — collects KERLs from several sources and detects conflicts at one sequence number, validator-selected, with "No required coverage or completeness / No protocol-mandated response." (same) It is "Under control of the VALIDATOR, not the controller," and follows first-seen. (KERI spec, termdefs)
- Juror — records evidence of duplicity in a Duplicitous Event Log, with "No authority to resolve conflicts" (same; KERI spec, L51, L1858).
- Judge — applies policy to rank conflicting KERLs and trigger remediation; it is "Policy-driven / Non-universal / May disagree across validators." (same)

### Super names scope, not a feature set {#02-super-scope}

[proposal] Answering a draft KID that defined super watchers by features, Samuel Smith wrote: "In my mind what makes a watcher, juror, or judge 'super' is the scope of the KELs it is watching therefore we could have super watchers or super jurors or super judges." Philip Feairheller: "a vLEI Super Watcher would have the scope of all AIDs in that ecosystem." (WebOfTrust/kids#1, 2023-11-05 and 2023-11-06). These are statements on a draft never merged. Two consequences: a deployment called a super watcher may be doing juror or judge work, so ask which role it performs; and scope is what makes the GLEIF super watcher a trust concentration ([section 11](#02-dg-c05)). `wtbo.md` uses the term for an archival watcher.

#### Ambient duplicity detection {#02-ambient-detection}

A watcher that "asks two witnesses for the head of the same identifier and gets different hash values, it has detected duplicity", and its proof "doesn't require trusting any authority's interpretation -- only the mathematics of the signatures." (cr-ad-trust.md > 4. KERI's Architecture: A Different Root of Trust) Ambient detection is the emergent property that equivocation "becomes observable somewhere in the network, given sufficient observer activity and information flow. This is not guaranteed by protocol mechanics." (background.md > 6.3 Ambient Duplicity Detection) It favors the defender: "a successful dead attack requires the isolation of a validator from ambient sources of the KERL... isolation... may be prohibitively expensive. Consequently, ambient verifiability provides asymmetry between the attacker and the defender in favor of the defender." (KERI spec, L1884)

Observer-enabled properties are conditional: detection depends on A8-A10 and "may be delayed or incomplete", and "Proof does not imply remediation" (background.md > 6.5 Security Properties Enabled by Observers (Conditional)). "Observers increase visibility, not control." (background.md > 6.6 Properties Observers Do Not Provide) A watcher makes an observation, not an enforcement decision: "The worst a dishonest watcher can do is stay silent about duplicity it has seen -- a risk addressed by running your own watcher or consulting multiple independent ones." (wtbo.md > 4. KERI's Architecture: A Different Root of Trust) See [chapter 07, section 8.2](#07-watcher-enforcement).

#### Core but optional {#02-core-but-optional}

"Observer mechanisms are core but optional" (background.md > 6.9 Analytical Implications, L853): optional to the protocol, core to the outcome. "Absence of observers is a deployment choice, not an inevitability" (L855-856), and an observer claim takes the form "Under observer assumptions A8–A11, property O# holds." (L859) In the extreme "Duplicity may persist indefinitely without detection", "an acknowledged design tradeoff, not a protocol failure." (background.md > 6.7 Failure Modes and Degradation, L822-830) A critique that never mentions observers has assumed them away (background.md > 6.8 Relationship to Security Claims in Literature, L843-847).

#### A witness is not a watcher {#02-witness-not-watcher}

A witness "MUST first verify the event's controller signatures before it can sign (witness)" an event (KERI spec, L1774), with no delegation-seal check, while a validator must also verify the "delegator anchoring seal (if delegated)" (KERI spec, L1780). So a witness can receipt a delegated event no watcher will yet accept, and a validator must obtain the delegator's KEL itself (keripy-knowledge 30-invariants.md > D. Delegation, D3).

#### Witnesses used as watchers in production {#02-witnesses-as-watchers}

[proposal] Sam Smith: "witnesses are being used as ersatz watchers in the wild, but witnesses cannot be watchers, and delegation is where this difference is most pronounced." (keripy GitHub > #1559, comment of 2026-07-31, R-008, https://github.com/WebOfTrust/keripy/issues/1559#issuecomment-5138781953). His rule: "An event should not be Seeable by a second party unless a watcher can see it, not if a witness can see it." His assessment, not a survey: "implementations that do not use watchers cannot get it right. This includes the GLEIF ecosystem in general." Any design that lets a relying party rely on a witness's view of a delegated identifier carries this defect. The operational form is [chapter 11, section 1](#11-roles-in-operation).

#### Contested and immature, a flag for reviewers {#02-observer-contested}

The observer layer is where the corpus's honest criticism lands, as a deployment-maturity gap: "A KERI deployment without robust watchers and governance is not a secure system." (cr-ad-trust.md > 5. Evaluating KERI: Real Tradeoffs, Honestly Stated) Named failure modes are correlated witness failure on one cloud provider, weak thresholds chosen for convenience, siloed or lazy watchers, and alert fatigue (same; dg-c0X-claude.md > 7. Pragmatic CISO's Operational Plausibility Notes). The analysts' operational notes are sorted against doctrine in [chapter 11, section 8](#11-ciso-notes).

## 10. Local vs global validity {#02-local-validity}

KERI does not promise that validators will ever agree. Four notions of convergence must be kept apart:

- Local consistency — "Local consistency is always achievable." (background.md > 7.4.1 Local Consistency)
- Global convergence — "KERI does not guarantee global convergence." (background.md > 7.4.2 Global Convergence)
- Eventual awareness — "This is possible, not guaranteed." (background.md > 7.4.3 Eventual Awareness)
- Permanent divergence — "Permanent divergence is an allowed outcome." (background.md > 7.4.4 Permanent Divergence)

"Safety in KERI means: Validators do not accept invalid histories." (background.md > 7.5.1 Safety (KERI-Specific)), not agreement on one history; "Liveness in KERI means: Honest controllers can continue to append events." (background.md > 7.5.2 Liveness (KERI-Specific)) Divergence is "permitted even with observers present." (dg-c03-claude.md > 3. Assumption Sensitivity) Observers can make it visible, not make it converge.

The specification's rule is a validator obligation: "An honest validator MUST trust when there is no evidence of duplicity and MUST NOT trust when there is any evidence of duplicity unless and until the duplicity has been reconciled." (KERI spec, L53) Treating its own first-seen copy as authoritative is "at the validator's discretion." (KERI spec, L1842) A KEL whose undisputed path validators cannot all find is irreconcilable and not trusted (KERI spec > Reconciliation, L1788-1790).

### Validator inputs, acceptance and fork handling {#02-validator-policy}

The analysis says "There is no protocol-mandated acceptance rule." (background.md > 7.3 Acceptance Rules, L912-923), and on duplicity a validator "may reject the identifier", "may select one branch", or "may await further evidence" (background.md > 7.6 Fork Handling at Validators, L995-998). Both are looser than the specification's MUST NOT. Open question: read narrowly, the first means no rule chooses among valid histories; the second squares with the specification only if selecting a branch counts as reconciliation or as the first-seen discretion. Neither source says which is intended, and the specification governs.

### Consensus terms, translated {#02-consensus-terms}

"Claims that use consensus language must be reframed:" (background.md > 7.7 Implications for Security Claims, L1007)

| Consensus term | KERI interpretation |
|---|---|
| Safety | Cryptographic validity |
| Liveness | Controller progress |
| Agreement | Witness-scoped |
| Finality | Local durability |
| Consistency | View-relative |

"Failure to perform this translation leads to category errors." (L1017) A finality claim is at most local durability (P3), and a consistency claim holds only relative to a validator's view.

## 11. The Del Giudice claim bindings (DG-C01..C06) {#02-dg-bindings}

Del Giudice's 2025 ETH Zurich Master's thesis, A Security Analysis of KERI, is "the most rigorous formal analysis of KERI's consensus mechanics" but "not peer-reviewed research." (cr-ad-trust.md > 5. Evaluating KERI: Real Tradeoffs, Honestly Stated) Each of its six claims resolves into a deliberate non-goal, a proof-scope limit, or an ecosystem-maturity gap; the only surviving residual is observer immaturity (background.md > 8.2 Catalog of Security-Relevant Claims (from Del Giudice), meta-pattern). The per-claim verdicts below come from model-authored analyses ([section 12](#02-evidence-standards)).

### DG-C01, fork-resistance for honest controllers {#02-dg-c01}

KAWA gives validity, consistency and reliability for honest controllers during establishment events, under BFT-style sizing and bounded faults (A1-A4, A7). Faithful within scope; the risk is a reader extending it to all deployments or treating BFT thresholds as mandatory (dg-c01-claude.md).

#### DG-C02, no prevention of malicious duplicity {#02-dg-c02}

KERI does not prevent duplicity by malicious controllers, and neither prevention nor timely detection is guaranteed. Faithful, but it "criticizes KERI for lacking a capability... that is explicitly outside KERI's design goals"; the surviving residual is that detection relies on an optional observer layer, "a critique of deployment readiness and ecosystem maturity, not of KERI's protocol design." (dg-c02-claude.md > 5. Logical or Analytical Errors; 6. Net Effect on Security Interpretation) The thesis: "We don't have any guarantees however on if and when this duplicity will be exposed." (Del Giudice thesis, chapter 4, section 4.1, p.38)

#### DG-C03, indefinitely conflicting KERLs {#02-dg-c03}

Validators may accept conflicting KERLs indefinitely (A12, A13). The description is faithful; the evaluative "only" imports an invulnerability expectation, and "No criticism survives objective-function alignment" (dg-c03-claude.md > 6. Net Effect on Security Interpretation).

#### DG-C04, recovery rotation and the single authoritative KERL {#02-dg-c04}

Under recovery rotation, correct witnesses may sign both an attacker's event and the owner's recovery at one sequence number, "because KERI prioritizes the ability to reclaim a compromised identity over strict uniqueness of history at every moment." (cr-ad-trust.md > 5. Evaluating KERI: Real Tradeoffs, Honestly Stated) This holds even when all actors behave correctly. Correct, and not insecurity, because "KERI's security model is evidence-based rather than proof-based" (dg-c04-claude.md > 5.1 Conflating Unprovability with Insecurity); the alternative is "an identity you cannot recover from compromise without involving a trusted third party" (same).

#### DG-C05, mitigation through governance and monitoring {#02-dg-c05}

Mitigation "likely requires governance, monitoring, or centralized archival services (e.g., a 'super watcher'), which introduce additional trust assumptions." (A8-A11) Faithful: survivability properties "emerge from system composition (protocol + observers + governance), not protocol alone." (dg-c05-claude.md > 6. Net Effect on Security Interpretation) The additional assumptions are mostly operational, except the super watcher, which is genuine centralization: "This works, but it reintroduces a centralized trust dependency that KERI was designed to avoid." (cr-ad-trust.md > 5. Evaluating KERI: Real Tradeoffs, Honestly Stated)

#### DG-C06, narrow scope and strong assumptions {#02-dg-c06}

The strongest proofs hold only for honest controllers, bounded witness faults, reliable communication and uncompromised rotation keys. Faithful about the proofs, misleading if read as "KERI requires honest controllers": observers are "explicitly excluded from Del Giudice's formal analysis" (background.md > 8.3 Explicit Omissions Relative to the KERI Specification) yet central to the model, and honest-controller is "a proof technique assumption... not a KERI deployment assumption." (dg-c06-claude.md > 5. Logical or Analytical Errors)

#### The thesis's declared scope and terms {#02-dg-scope}

The thesis puts "Delegation and multisignature controllers declared out of scope" and assumes non-transferable witnesses (background.md > 8.1 Declared Scope and Modeling Choices in the Thesis, L1075-1084), so no Del Giudice result can be cited for a delegated or multisig identifier. Its terms map onto the model as follows, a mapping that "should be applied before comparative or critical analysis." (background.md > 8.4 Terminology Normalization, L1303)

| Thesis term | Model mapping |
|---|---|
| Consistency | P2 (Section 5.6) |
| Safety | Cryptographic validity (Section 7.5.1) |
| Liveness | Controller progress (Section 7.5.2) |
| Agreement | Witness-scoped agreement (Section 5) |
| Eventual consistency | Eventual awareness (Section 7.4.3) |

The section numbers are background.md's. Consistency maps to P2 here and to view-relative in [section 10](#02-consensus-terms) because this table maps the thesis's specific witness-level use of the word; do not flatten them. Calling KERI eventually consistent claims more than it provides.

## 12. What is established, what is contested, and the load-bearing assumptions {#02-established-contested}

### Established {#02-established}

Uncontested across the analysis, papers, specification and implementation knowledge base: the survivability objective; detection over prevention; duplicity-evidence; the zero-trust stance and the malicious-controller non-goal; the pre-rotation firewall and its current-versus-next-key asymmetry; KAWA's P1-P4 and non-properties P5-P8; local, observer-dependent validity and permissible permanent divergence; and that observers increase visibility, not control.

#### Contested or genuinely limiting {#02-contested}

One class of criticism survives objective-function alignment, and it is not about the protocol: detection depends on an optional, immature observer and governance layer (DG-C02's residual and DG-C05). The super watcher relieves coverage gaps and reintroduces centralization. The formal literature is thin: its strongest analysis is a non-peer-reviewed thesis that excludes the observer layer (wtbo.md > 5. Evaluating KERI: Real Tradeoffs, Honestly Stated; background.md > 8.3 Explicit Omissions Relative to the KERI Specification). The corpus calls these "constraints of immaturity, not of architecture." (cr-ad-trust.md > 6. The Transition Problem: A Comparison of Trajectories)

#### A companion problem about evidence standards {#02-evidence-standards}

A structured adversarial pass by AI personas attacks one's own assumptions and reads like peer review without being it. An author in this corpus retracted such a claim about his own paper: those reviews were "conducted by AI models prompted to argue from a named lens, not by human domain experts", and "They are a structured way to attack one's own assumptions, not independent validation" (m-glance.md > 1. Introduction, L71-74 @181569b64). The six DG analyses (`dg-c01-claude.md` and siblings) are model-authored, so their verdicts are a structured self-attack on the thesis, with evidentiary weight below the thesis itself. They are the corpus's most careful reading of Del Giudice, not a second opinion.

#### Assumptions never to grant for free {#02-never-grant}

A3 (honest controller, a proof convenience); A5 (observer presence, never silently assumed); A7 (M > f); and A8-A11, none enforced by KERI. A low threshold is breakable only with the controller's keys in play, because two signed and witnessed versions can exist only if "the keys of the event's controller have been compromised by an attacker or the controller itself acted duplicitously" (KERI spec, L51). A claim that duplicity will be detected, promptly detected or automatically resolved smuggles these in and contradicts P5-P8; a claim of a single global truth for an identifier contradicts local validity.

## 13. Where KERI corrects the outsider's prior {#02-outsider-priors}

These review reflexes are category errors in this chapter's terms; the tells and reframings live in [chapter 07, section 7](#07-invulnerability-tells).

- Security means preventing all forks — KERI is survivability-oriented ([section 1](#02-survivability)).
- KERI needs a blockchain or global ordering — an explicit non-goal (background.md > 1.3 Explicit Non-Goals); local order suffices ([section 7](#02-microledgers)).
- A witness threshold gives global safety — "Agreement thresholds do not imply global safety." (background.md > 4.7 Analytical Implications)
- Validators converge, or KERI is eventually consistent — permanent divergence is allowed and eventual awareness is not guaranteed ([section 10](#02-local-validity)).
- A proof assuming an honest controller means insecurity against a dishonest one — dishonesty triggers detection, not failure ([section 11](#02-dg-c06)).
- Unprovable uniqueness means broken — recovery trades provable uniqueness for recoverability without a trusted third party ([section 11](#02-dg-c04)).

The analysis template forces the analyst to name the objective first and to restate a claim exactly: "you MUST restate the claim verbatim... If you cannot do so, stop and ask." (standard-analysis.md > 0. Objective-Function Alignment) A reviewer who cannot say which objective a criticism assumes is not ready to make it.

## Sources {#02-sources}

- background.md — KERI: Canonical Background for Security Analysis (v0), part of the keri-security-analysis corpus. WebOfTrust/keri-security-analysis, background.md, @149fa6c35 (2026-04-23), the repository's only commit. The main source: the assumption catalog A1-A13, KAWA P1-P8, the survivability framing, the threat surfaces and the DG-C01..C06 claim catalog. Mined in raw/07, sections 4.3, 4.4, 5-5.2, 6.7-6.9, 7.2-7.7, 8.1 and 8.4 in raw/07 section 13.
- CESR spec — Composable Event Streaming Representation (CESR) specification, Trust Over IP. trustoverip/kswg-cesr-specification, spec/spec-body.md, v1.1 @65fd7518b (2026-08-26), the forward branch; binds nobody. Mined in raw/02.
- cr-ad-trust.md — Cryptographic vs. Administrative Trust: KERI's Witness/Watcher Architecture and X.509 Certificate Transparency, keri-security-analysis corpus. WebOfTrust/keri-security-analysis, cr-ad-trust.md, @149fa6c35 (2026-04-23). Mined in raw/07.
- DECENTRALIZATION-PURITY-STEERING.md — human steering note at this repository's root, cited for the microledgers framing in [section 7](#02-microledgers). Not a mined source.
- Del Giudice thesis — A Security Analysis of KERI, Daniele Del Giudice, ETH Zurich Master's thesis, 2025, not peer-reviewed. Del_Giudice_Daniele.pdf in WebOfTrust/keri-security-analysis @149fa6c35, cited only as quoted in background.md section 8.2. Mined in raw/07.
- dg-c01-claude.md to dg-c06-claude.md — model-authored analyses of claims DG-C01 to DG-C06, keri-security-analysis corpus, @149fa6c35 (2026-04-23); a structured self-attack on the thesis, not an independent check ([section 12](#02-evidence-standards)). dg-c0X-claude.md means their common section 7. Mined in raw/07.
- Duplicity Game — slides by Samuel M. Smith for IIW Spring 2020. SmithSamuelM/Papers, presentations/DuplicityGame_IIW_2020_A.pdf, master @b47f21597 (2026-08-11). Read through pdftotext, so quoted slide lines have their layout breaks joined; Sam's framing, not an argued result. Mined in raw/20 section 8.
- keri-primer.md — A Primer on KERI, ACDCs, and CESR, Daniel Hardman. dhh1128/papers, keri-primer.md, @181569b64 (2026-09-15). Mined in raw/05 and raw/06.
- KERI spec — Key Event Receipt Infrastructure (KERI) specification, Trust Over IP. trustoverip/kswg-keri-specification, spec/spec-body.md and spec/termdefs.md, main @fbdd4a615 (2026-08-28). Mined in raw/01.
- keripy — the KERI reference implementation, WebOfTrust. WebOfTrust/keripy, main @b8f60166b (2026-09-14, `__version__` `2.1.0-dev1`). Mined in raw/09.
- keripy GitHub — Sam Smith's comments in WebOfTrust/keripy: issue #1559 (2026-07-31, R-008) and pull request #1580 (2026-08-07, R-021), read from the API cache of 2026-10-14 (`.ignored/sam-rulings-cache/`). [proposal]. Mined in raw/21.
- keripy-knowledge — an unpublished contributor knowledge base on keripy (`00-lens.md`, `30-invariants.md`). The `knowledge` branch of a keripy fork, @9489ac9bd (2026-07-02), whose code baseline is keripy `60ab9e08d`; behavior claims are anchored separately at the keripy pin. `00-lens.md` is a draft distillation of background.md and the papers, so its claims carry no weight their sources do not. Mined in raw/08.
- kspqs.md — KERI's Strategy for Post-Quantum Security, v1.2, Daniel Hardman. dhh1128/papers, kspqs.md, @181569b64 (2026-09-15). Mined in raw/05.
- m-glance.md — Measuring the Glance, v1.3, Daniel Hardman. dhh1128/papers, m-glance.md, @181569b64 (2026-09-15). Not about KERI; cited only in [section 12](#02-evidence-standards). Mined in raw/06.
- origin-platform — Provenant's Origin platform documentation [practice]. provenant-dev/origin-platform, docs/origin-security.md, main @cb758b1b5 (2026-08-26). One deployment's evidence, never normative; where it assigns duplicity detection to witnesses, this chapter follows KERI. Mined in raw/12.
- standard-analysis.md — Standard Analysis Template for KERI Security Claims, keri-security-analysis corpus. WebOfTrust/keri-security-analysis, standard-analysis.md, @149fa6c35 (2026-04-23). Mined in raw/07.
- WebOfTrust/kids#1 — an unmerged 2023 pull request proposing a KID on super watchers, with comments by Samuel M. Smith (2023-11-05, https://github.com/WebOfTrust/kids/pull/1#issuecomment-1793816692) and Philip Feairheller (2023-11-06, https://github.com/WebOfTrust/kids/pull/1#issuecomment-1794022044). The source puts "super" in double quotes where the chapter uses single. [proposal]. Not mined in a raw note.
- wtbo.md — Where Trust Bottoms Out: X.509, Certificate Transparency, and KERI's DPKI Architecture, v1.8, Daniel Hardman. dhh1128/papers, wtbo.md, @181569b64 (2026-09-15). Its section 4 is the citation of record for the strength of pre-rotation. Mined in raw/05.

---

# 03 — Key Management and Identifier Lifecycle {#03-key-management}

## Thesis {#03-thesis}

An Autonomic Identifier is not a name that points at a key; it is the head of a signed, append-only history of its own key state. The identifier is derived from its inception event, so it cannot be separated from the key material that first controlled it, and authority moves forward through rotation events chained to a commitment made before the current keys were ever exposed. The structural fact that distinguishes KERI from certificates, tokens and most DID methods is that control authority is split in two. Signing authority, the current keys, does the daily work and is treated as expendable; rotation authority, the next keys published only as a hash, is held offline, and its compromise is the one unrecoverable event in the system. This chapter walks the lifecycle in the order the protocol enforces it, and separates what keripy, KERIA and signify-ts enforce from what prose merely describes, because the gap between them is where defects live.

## Status {#03-status}

Most of this chapter is [spec] and most code claims are [code], so markers appear only where they do work, chiefly in [section 8](#03-delegation), where the two KERI specification branches say different things about one config trait. The knowledge-base landmines cited here were observed at a keripy baseline 493 commits behind the current pin; they are discipline to assume, not statements about keripy today.

## 1. The lifecycle in one frame: the KEL and its event types {#03-kel-event-types}

The Key Event Log (KEL) is "a Verifiable data structure that is a backward and forward chained, signed, append-only log of key events for an AID. The first entry... must be the one and only Inception event." (KERI spec termdefs; also spec-body.md L176) It is chained backward through the prior event's digest (`p`) and forward through the commitment to the next keys' digests (KERI spec, L31, L176). Its five ilks are inception (`icp`), rotation (`rot`), interaction (`ixn`), delegated inception (`dip`) and delegated rotation (`drt`) (KERI spec, L1748). A verifier establishes who controls an AID "by replaying its KEL from inception, not by querying any trusted directory or CA." (keripy-knowledge `00-lens.md` > claim 1)

Key state is what a replay computes: current keys and signing threshold, next-key digests and next threshold, witnesses and witness threshold, and configuration traits, changed only by establishment events (KERI spec termdefs, "Key state"). In keripy it is `Kever` with its persisted `KeyStateRecord`; `Kever.incept` sets keys, thresholds and witnesses "from the event body itself." (keripy `core/eventing.py`, `Kever.incept`, L2323; raw/09 section 1)

## 2. Inception: how an AID is born {#03-inception}

- Sequence number zero, exactly once. keripy raises on a positive `sn` (keripy `core/eventing.py`, L2335-2336), and "There MUST be only one Establishment event that is an Inception event. All subsequent Establishment events MUST be Rotation events." (KERI spec, L1378) A second sn=0 with a different SAID is escrowed as likely duplicity (keripy-knowledge `30-invariants.md` > B1).
- The identifier is the digest of the inception event. For a self-addressing AID the `d` and `i` fields "MUST have the same value and same derivation code" (KERI spec, L1380-1381). keripy fills `d` with `#` dummy characters, serializes, digests and overwrites (keripy `core/coring.py`, `Saider._derive`, L4058-4096), so "Changing field order/serialization changes the SAID." (keripy-knowledge `30-invariants.md` > B5) The AID is a tamper-evident commitment to the exact bytes that created it.
- The signing threshold cannot exceed the key count: `if len(self.verfers) < self.tholder.size` -> "Invalid sith" (keripy `core/eventing.py`, L2340).
- Configuration traits are fixed at inception. Establishment-Only (`EO`) forbids interaction events, so every event is signed by fresh one-time pre-rotated keys; Do-Not-Delegate (`DND`) makes a validator drop delegated events whose delegator carries it (KERI spec, L377, L379).

The derivation code is the fork in the road. A basic derivation embeds the public key in the prefix (`B`, Ed25519 non-transferable); a self-addressing one uses a digest of the inception event (`E`, Blake3-256) (keripy `core/coring.py`, L244-294). Only prefixive codes may be AIDs: `Prefixer.__init__` raises `InvalidCodeError` outside `PreDex` (keripy `core/coring.py`, `Prefixer.__init__`, L3830-3831). [Chapter 04](#04-code-tables) owns the code tables.

## 3. Transferable versus non-transferable AIDs {#03-transferability}

"A basic SCID... does not support Rotation... and therefore MUST be abandoned once the controlling private key becomes weakened or compromised." (KERI spec, L107) Changing its key means abandoning the identifier and any reputation attached to it. A transferable AID survives rotation because it is derived from the whole inception event, including the pre-rotation commitment: for transferable AIDs the KEL joins identifier, keys and controller to "persist bindings across rotation," and "The essence of the KERI protocol is a strongly bound tetrad." (KERI spec, L162-182)

### The correction to the outsider prior {#03-non-transferable-prior}

"Non-transferability in KERI is expressed by an empty next-key commitment (`ncount=0`, `nsith='0'`), not by a special prefix code -- except where a basic non-transferable code like `Ed25519N` legitimately carries the key itself." (keripy-knowledge `31-landmines.md` > L1) keripy enforces it: a non-transferable prefix must have empty next digests, witnesses and anchored data at inception, "Invalid inception next digest list not empty for non-transferable prefix" (keripy `core/eventing.py`, L2352-2355, L2362, L2383), and rotation without a prior commitment raises "Attempted rotation for nontransferable prefix..." (L2650-2653). Rotating a transferable AID to an empty next list abandons it: "no more key events MUST be allowed in its KEL." (KERI spec, L340, L174)

#### The Ed25519N landmine {#03-ed25519n-landmine}

keripy's `Hab.incept` and `GroupHab.incept` hardcode `code = MtrDex.Ed25519N` for any non-transferable AID whatever the signing-key type (keripy `app/habbing.py`, L2931, L3728), which is wrong for a post-quantum non-transferable AID needing a digest prefix (keripy-knowledge `31-landmines.md` > L1). It blocks nothing today, because keripy at `b8f60166b` has no post-quantum codes (raw/09 section 10 item 3) and the knowledge base's own plan defers that work until two conflicting in-repo Falcon design documents are reconciled (keripy-knowledge `PLAN.md` > 9. Decisions to confirm at approval (not now), @`9489ac9bd`). Treat it as a known defect, not a template, and do not treat the Falcon design question as settled.

#### Witnesses must be non-transferable {#03-witnesses-non-transferable}

A witness AID "MUST be non-transferable, fully qualified public keys" so that a receipt verifies straight from the AID with no witness KEL (KERI spec, L353, L1252). Treating this as optional is "a characterization error about KERI-as-specified." (keri-security-analysis `background.md` > 2.3 Witness; raw/07 section 6)

## 4. Establishment versus interaction events {#03-establishment-vs-interaction}

Establishment events (`icp`, `rot`, `dip`, `drt`) establish or change key state; interaction events (`ixn`) anchor data via seals and change none (KERI spec, L1751-1752). Current keys always come from the last establishment event, and any message, including an `ixn`, is authorized only if its signatures satisfy that event's threshold (keripy-knowledge `30-invariants.md` > B4). An `ixn` cannot supersede anything ([section 10](#03-recovery-rotation)); its job is to bind external data to key state at a point in the sequence, "an indirect signature that persists across key-state change" (KERI spec, L1280). Repeated interaction signing widens the window for a stolen current key but never risks rotation authority; an AID that wants no reuse window declares `EO` (KERI spec, L377).

### The last-establishment-event rule {#03-last-establishment-rule}

The key state in force at a position in a KEL is the one set by the last establishment event at or before that position, and interleaved interaction events do not move it. In a KEL with interaction traffic the latest event is usually an `ixn`, which establishes nothing, so anything that names which key state a signature is checked against must name the last establishment event. No specification states the rule. keripy and KERIA each corrected a violation of it in September 2026, independently and from opposite ends of the wire: keripy's KRAM gate now compares against `kever.lastEst`, because "Signing keys change only at establishment events, so the key state ref names the last establishment event rather than the last event of any kind." [code] (keripy `core/kraming.py`, module docstring, L70-75 @`b8f60166b`), and KERIA's `endrole` and `locscheme` reply handlers now build their signature groups from `hab.kever.lastEst` [code] (KERIA `src/keria/app/aiding.py`, L1665-1666 and L1766-1767 @`7e685edaa`). KERIA pins keripy's 1.x line, so its fix was not inherited. [Chapter 09](09-kram-and-request-authentication.md) owns the KRAM side; the lesson here is that a rule living only in a docstring can drift unnoticed.

## 5. Pre-rotation: the firewall and the crown jewel {#03-pre-rotation}

[Chapter 02](#02-pre-rotation-firewall) owns pre-rotation as security doctrine; this section owns its mechanics.

### What is committed {#03-what-is-committed}

Every establishment event names the current signing keys in cleartext (`k`) and the next keys only as digests (`n`): "control authority is split between keypairs that hold signing authority and keypairs that hold rotation authority." (KERI spec > Pre-rotation, L1364) "Pre-rotation is the firewall; the next key is the crown jewel." (keripy-knowledge `00-lens.md` > claim 4) The firewall is real only if the next key is held apart: "The next (rotation) key must be managed differently/independently from the current key -- offline, air-gapped, cold storage, different device. This independence is what makes pre-rotation a real firewall." (raw/05 L95; papers `keri-primer.md` > 2.3 Pre-rotation) The pre-rotated keys "serve as first-time, one-time, and only-time rotation keys in the next rotation operation." (KERI spec, L1628)

#### Why it is post-quantum by construction {#03-post-quantum-construction}

The commitment is a hash, and hashes resist quantum attack better than signatures; an attacker who could invert public-key generation "must first invert the digest of the public key using non-quantum computation. Pre-quantum cryptographic strength is, therefore, not weakened post-quantum." (KERI spec, L1711-1713) The guarantee covers rotation authority only: "the hash protects the *next* key, never the one currently exposed, so safety rests on the controller detecting compromise and rotating before an adversary can exploit what the rotation reveals." (papers `wtbo.md` > 4. KERI's Architecture: A Different Root of Trust, L99 @`181569b64`) CESR's `v1.1` branch says the same normatively, that pre-rotation and post-quantum signatures are "complementary, not alternatives" [spec-next] (CESR spec `v1.1` > Post-Quantum Cryptographic Primitives, L1553 @`65fd7518b`). [Chapter 02, section 5](#02-pq-hedge) owns the post-quantum hedge, including the contested 256-bit digest strength.

#### Exactly what is checked at rotation {#03-rotation-check}

keripy's `Kever.exposeds` is the firewall in code (keripy `core/eventing.py`, `Kever.exposeds`, L2940-2984). For each rotation signature it takes the prior next-key digest at the signature's `ondex`, re-digests the revealed public key with that digest's code, and counts the signature only if they match (L2980-2982); the counted keys must then satisfy the prior next threshold, or the event escrows with "Failure satisfying prior nsith" (L2853-2863). "An attacker holding only current signing keys cannot rotate -- they do not know the pre-images." (raw/09 section 2) keripy's `Siger` carries `.index` into current keys and `.ondex` into prior-next digests, so a rotation signature may need two indices: "Second index looks up prior-next digest, first index the exposed key, verify digest, then verify signature." (KERI spec, L1256) Across implementations, `ondex` must be computed from the prior establishment event, not the proposed one (signify-ts issue #378; raw/10 section 6d).

#### The implementation defect a reviewer must guard {#03-permissive-defect}

The check can fail open on a digest-code mismatch, silently excluding an `ondex` from threshold satisfaction (keripy-knowledge `31-landmines.md` > L6). One layer up, `Serder._compute` overwrites the SAID field from raw bytes, and "a wrong digest code yields an invalid SAID with no error." (keripy-knowledge `31-landmines.md` > L7) The invariant over both is "Never weaken or short-circuit this." (keripy-knowledge `30-invariants.md` > C1) Neither landmine was re-tested at `b8f60166b`, and any new digest code widens the surface.

## 6. Rotation and the general pre-rotation family {#03-rotation-family}

A basic rotation promotes the committed next keys to current and commits a fresh next set. The specification defines a family beyond it, encoding governance patterns simpler systems cannot express.

- Partial rotation holds some committed keys in reserve; augmented rotation adds keys that were not committed. Either way "A rotation's current key list MUST be satisfiable w.r.t. BOTH prior-next and current thresholds." (KERI spec > General Pre-rotation, L1470-1498)
- Reserve rotation lets reserve keys add fault tolerance without participating unless a member is unavailable, the basis for "provisional/custodial/escrow control authority." (KERI spec > Reserve Rotation, L1501-1543)
- Custodial rotation gives a custodian the signing keys and the owner exclusive rotation authority, with exposed rotation keys weighted 0 in the new current threshold, so the owner can "revoke custodian's signing authority unilaterally." (KERI spec > Custodial Rotation, L1545-1576) KERIA's passcode rotation uses exactly this ([section 12](#03-passcode-rotation)).
- Abandonment rotates to an empty next list (KERI spec, L340, L174).

### The post-quantum recovery variants {#03-pq-recovery}

SQAR (Surprise Quantum Attack Recovery) is a partial-plus-augmented rotation to post-quantum signing keys, assuming the prior-next digests are safe though the keys are not, with the rotation keys weighted 0 (KERI spec > SQAR, L1578-1606). Hybrid multisig hedges further: with a threshold requiring both an ECC and a PQC signature, "Even if the ECC key is broken, the attacker cannot satisfy the full threshold without also breaking the post-quantum key." (papers `keri-primer.md` > 2.5 Quantum resistance; raw/05 L89) Migration is per identifier: "The upgrade is an event in the KEL. Not a global infrastructure project." (keri-security-analysis `cr-ad-trust.md` > 6. The Transition Problem: A Comparison of Trajectories)

#### The keystore hazard {#03-keystore-hazard}

keripy advances and erases key material before the rotation is validated, so "On rejection you need an explicit `replay(advance=False)` recovery; a naive caller can strand the keystore ahead of the KEL." (keripy-knowledge `31-landmines.md` > L11) This is operational rather than protocol, and it bites custodial deployments.

## 7. Multisig: exposing governance, not inventing it {#03-multisig}

Multisig is fractionally weighted thresholds declared in the public KEL. A threshold (`kt` current, `nt` next) is an M-of-N hex integer or a list of rational-fraction clauses (KERI spec, L327); clauses are ANDed, a clause is satisfied when its verified weights sum to at least 1, and rational fractions avoid rounding (KERI spec, L1419). `[1/2,1/2,1/2]` means "2 of 3." (KERI spec, L1421), and nested lists model multi-device contributors (L1466). The policy "majority of Founders OR supermajority of Investors," encodes as `kt = [["1/2","1/2","1/2"],["1/3","1/3","1/3","1/3"]]` (papers `keri-primer.md` > 2.4 Weighted multisig and transparent, granular governance), and break-glass recovery as phone 0.5, laptop 0.5 and cold storage 1.0: "The recovery logic is baked into the math of the identifier itself." (raw/05 L150)

KERI's contribution "is less about inventing and more about exposing": "multisig is optional and infinitely variable, but defining and following policy about it is required." (papers `keri-primer.md` > 2.4 Weighted multisig and transparent, granular governance) The papers ask why anyone imagines "it's safe to use the single-signature mechanism of X509 certs as the only gate on unlocking the entire reputation of modern corporations." (papers `x509-prob.md` > One key isn't realistic) Joint issuance extends the idea to "a weighted threshold of endorsements, each owner signing from their own identifier, asynchronously and with no shared key" (papers `sda.md` > 8. What is settled, and what is open). In keripy a multisig controller is `GroupHab`, and "A group/rotation with >63 keys changes the Siger encoding; consumers that don't handle the 'big' indexed codes may reject." (keripy-knowledge `31-landmines.md` > L14)

## 8. Delegation: cooperative, two-event, two-way peg {#03-delegation}

A delegation is two events that reference each other: a delegating event in the delegator's KEL sealing the delegated event, and a `dip` or `drt` in the delegatee's KEL naming the delegator in `di`. "Both MUST participate." (KERI spec > Cooperative Delegation, L1610-1612) The delegatee's AID is the digest of its `dip`, which references the delegator, so the delegatee is bound to its delegator by construction (KERI spec, L1616): forbidden acts are "not merely against the rules but outside the space of possible moves." (papers `sda.md` > 7. Open loop, not closed)

### The joint-compromise property {#03-joint-compromise}

The delegator keeps establishment control authority and the delegatee gets "revokable signing authority." (KERI spec, L1618) An exploiter of the delegatee alone cannot capture control: "A successful exploiter must also compromise the delegator's authoritative keys." Compromising only the delegator's signing keys cannot force a delegated rotation either; "Both sets of keys must be compromised simultaneously." (KERI spec, L1622) An attacker holding a delegatee's pre-rotated keys "must either induce the delegator to issue a seal or must also compromise the delegator's signing keys." (KERI spec, L1688-1690)

#### Config traits {#03-config-traits}

[spec] `DID` (Delegate-Is-Delegator) treats a delegatee as equivalent to its delegator for horizontal signing scale, and `DND` forbids delegation. Delegation seals carried in `ixn` events are less secure than those in `rot` events (KERI spec `main`, L379-381 @`fbdd4a615`). On `main`, `DID` gets one sentence — the trait "enables the Controller to signal to validators that any Delegate (Delegatee) AIDs are to be treated as equivalent to the Delegator" — and a table row marking it Inception Only (KERI spec `main`, L373, L381 @`fbdd4a615`). `main` states no placement rule.

#### What v1.1 adds {#03-v1-1-adds}

[spec-next] KERI spec `v1.1` replaces that sentence with a rationale (KERI spec `v1.1` > Configuration traits field, L381 @`3753f3797`). Placement is normative: the trait "appears in the Delegated Inception, `dip` event of a Delegatee and MUST NOT appear in a non-delegated Inception, `icp` event". What it asserts is identity of entity: the delegatee's controller and the delegator "are one and the same entity". Consent is the existing anchoring seal, so the delegator "thereby also consents to the appearance of the `DID` config trait in that event". The assertion does not propagate: "It says nothing about any Delegatees that the Delegatee may itself delegate". Placement in a delegator's `icp` is ruled out because "a Delegator MAY itself be the Delegatee of a higher-level Delegator." The purpose shifts from a delegator's to a controller's infrastructure and becomes derivable from the logs: the trait "enables horizontal scaling of a Controller's signing infrastructure by making the equivalence of the AIDs that Controller operates verifiable from their KELs". On both branches `DID` is Inception Only, so a rotation cannot introduce it.

#### The boundary neither branch draws {#03-did-effect-unspecified}

Both branches say a validator may treat the AIDs as equivalent; neither says what a validator MUST or MUST NOT do with that. Nothing states whether a signature under the delegatee's key state satisfies a policy written against the delegator's AID, whether the equivalence survives the delegatee's rotations, or what happens when the delegation is revoked or superseded. The spec editor says the omission is deliberate ([section 8](#03-delegation-trait-rulings)), which leaves the specification as silent as before. No example anywhere shows `DID` in a `dip`: Fay's delegated inception carries `"c": []` on both branches (`main` L781, `v1.1` L780), so an implementer has no serialization to check against.

#### The Ean example on main {#03-ean-example-tension}

`main`'s worked example puts `DID` where `v1.1` forbids it: Ean, a delegator, carries `"c": ["DID"]` in a plain `icp` (KERI spec `main`, L591 @`fbdd4a615`). `v1.1` empties Ean's list because "the `DID` config trait, which belongs in a Delegatee's Delegated Inception, `dip` event, has no referent here." (v1.1 L618) The editor calls `main`'s version an error: "Yeah, putting DID in a plain, non-delegated ICP, as an example, was an oversight." ([keripy conversations > discussion #1570](https://github.com/WebOfTrust/keripy/discussions/1570#discussioncomment-17898407), reply of 2026-08-04, R-012) [proposal]. `main` still carries it, so a citation must name its branch. Removing `"DID"` also changes Ean's inception bytes, and since Ean's AID is that event's SAID, every downstream AID literal, `p`, `di` and seal value differs between branches; never cite an AID literal from the worked examples without naming the branch.

#### What the spec editor says the traits are for {#03-delegation-trait-rulings}

[proposal] Sam Smith's comments in keripy conversations answer much of what the branches leave open; none of it is specification text. He gives the `v1.1` placement rule in his own words: "THE DID sits in a Delegatee Inception event." ([keripy conversations > discussion #1570](https://github.com/WebOfTrust/keripy/discussions/1570#discussioncomment-17896521), comment of 2026-08-04, R-012). On when each trait applies: "Delegated AIDs should work without there being an ACDC." Custodial key management, where another controller runs the delegatee's key hosts, uses `DND` and omits `DID`: "Because the custodian is a different controller, then DID is not used." Horizontal scaling by one controller uses it: "Because they are the same and the controller wants the world to know they are the same, then the controller uses DID." ([keripy conversations > discussion #1570](https://github.com/WebOfTrust/keripy/discussions/1570#discussioncomment-17896622), comment of 2026-08-04, R-013). Depth is bounded by these traits: "Delegation depth is controlled via config traits in the inception event." ([keripy conversations > PR #1564](https://github.com/WebOfTrust/keripy/pull/1564#issuecomment-5158683549), comment of 2026-08-02, R-015), which is why the ACDC operator `DI2I` admits delegated AIDs at any depth ([chapter 05, section 5](#05-di2i-depth)).

`DID` exists so that reputation crosses the delegation: "This then allows reputation to be transitive across a delegation relationship." Its effect is left open on purpose: "What a second party does with this declaration of controller equivalence between two AIDs (delegator and delegate) is up to the second party." ([keripy conversations > discussion #1598](https://github.com/WebOfTrust/keripy/discussions/1598), body of 2026-08-09, R-016). And "There is no code support yet for "DID" because DID enforcement comes at the EGF level AFAIK" ([keripy conversations > PR #1572](https://github.com/WebOfTrust/keripy/pull/1572#issuecomment-5184567539), comment of 2026-08-04, R-014). These make the gap a stated design choice without filling it, because no governance framework read for this corpus says what it does with `DID`.

#### What keripy actually enforces {#03-delegation-enforcement}

A delegated event is authorized only by a seal in the delegator's KEL, located through the seal-source couple in `Kever.validateDelegation`, and the delegating event must be first-seen before the delegated one is accepted (keripy-knowledge `30-invariants.md` > D1, D2). "The delegator MUST NOT accept a delegable event unless it is locally sourced, fully signed by its controller, and fully witnessed by its controller's designated witness pool." (keripy `core/eventing.py`, L3087-3089) A delegator "SHOULD NOT automatically approve a delegable rotation event unless that event's change to the witness pool is below the witness pool's prior threshold" (KERI spec, L1778), because a compromised delegatee could otherwise rotate in its own witnesses.

[code] At keripy `80f77b73b`, `DND` is enforced in key-state validation: `if dkever.doNotDelegate:  # drop event if delegation not allowed` (keripy `core/eventing.py`, `Kever.validateDelegation`, L3251 @`80f77b73b`), so such an event "will be dropped and hence never be seen by anyone anywhere." ([keripy conversations > PR #1572](https://github.com/WebOfTrust/keripy/pull/1572#issuecomment-5184545123), comment of 2026-08-04, R-014). Nothing enforces `DID`. A delegated inception may anchor seals as a plain inception may; Sam called their omission "a bug" ([keripy conversations > issue #1544](https://github.com/WebOfTrust/keripy/issues/1544#issuecomment-5070932782), comment of 2026-07-24, R-001), and `BaseHab.incept` now passes `data=data` to `delcept` (keripy `app/habbing.py`, `BaseHab.incept`, L1107-1116 @`80f77b73b`).

#### The gaps {#03-delegation-gaps}

Three delegation landmines are recorded: `validateDelegation` "trusts `db.fons` even if the delegating event is only escrowed" (keripy-knowledge `31-landmines.md` > L13); delegated inception "has no confirmation loop; assumes delegator KEL already present" (L12); and a validator must be separately introduced to the delegator, because "A witness is NOT a watcher" (keripy-knowledge `31-landmines.md` > L4).

## 9. Witness and backer designation {#03-witnesses}

[Chapter 02, section 8](#02-witnesses) owns witnesses as doctrine: a witness stores and serves events under the controller's designation, its threshold is accountability rather than consensus, and KAWA's guarantees are local to the witness set. keripy names the threshold for what it is, "`toader (Number): instance of TOAD (threshold of accountable duplicity)`" (keripy `core/eventing.py`, L1945).

### Backers {#03-backers}

A backer is the ledger-backed alternative to a witness, a registrar anchoring events on a ledger under the `RB` trait and a Registrar Backer Seal (KERI spec, L345, L494). A registry may have no backers at all: keripy's `NB` trait raises `ValueError` if any are specified (keripy `vdr/eventing.py`, L89-90), which contradicts the witness-as-validator prior.

### Local versus remote: the firewall as second factor {#03-local-vs-remote}

keripy classifies each event as local (protected path) or remote, "to allow increased security on local events where a threshold structure is imposed" (keripy `core/eventing.py`, L3048-3049). Witnesses accept only local events, so an attacker must compromise "not merely the controller's private key(s) but also the unique second factor on each of a threshold satisfycing number of witnesses." (keripy `core/eventing.py`, L3051-3057) keripy strips remotely sourced signatures from locally membered indices before counting, "So that attacker can't source remotely compromised but locally membered signatures to satisfy threshold." (keripy `core/eventing.py`, L2780-2791)

### Witness invariants and one defect {#03-witness-invariants}

A non-empty witness list requires `1 <= toad <= len(wits)` and an empty one `toad == 0` (keripy-knowledge `30-invariants.md` > F1; keripy `core/eventing.py`, L2869-2896). Witness changes allow no duplicates, cuts must be current witnesses, cuts and adds must be disjoint, and removes precede adds so receipt indices stay stable (keripy `core/eventing.py`, L2696-2726; KERI spec, L358, L362). Sufficiency is "receipts meeting TOAD, not all witnesses" (keripy-knowledge `30-invariants.md` > F2), but keripy's `WitnessReceiptor` "currently waits for ALL witnesses instead," blocking if one witness is down (keripy-knowledge `31-landmines.md` > L9).

## 10. Recovery (superseding) rotation {#03-recovery-rotation}

Recovery rotation is the one narrow exception to "first seen, always seen, never unseen" (KERI spec, L49). At most one valid KEL exists per AID (KERI spec, L178), yet a controller whose signing key is compromised must sign a conflicting event at an already-seen sequence number to reclaim control. "Supersede means that after an event has already been accepted as first seen into a KEL that a different event with the same sequence number is accepted that supersedes the pre-existing event... This enables the recovery of events signed by compromised keys." (keripy `core/eventing.py`, L3139-3142)

### The forked KEL is preserved, not erased {#03-forked-kel}

"the KEL is forked at the sn of the superseding event. All events in the superseded branch of the fork still exist but, by virtue of being superseded, are disputed." (keripy `core/eventing.py`, L3143-3145) That is duplicity evidence by construction. The first-seen ordinal `fn` is distinct from `sn`: "Each event accepted into a KEL has a unique fn but multiple events due to recovery forks may share the same sn." (L3153-3155)

#### The superseding rules {#03-superseding-rules}

(KERI spec, L1804-1825; keripy `core/eventing.py`, L3158-3207)

- A0 — a rotation may supersede an interaction at the same `sn`, if that interaction is not before another rotation.
- A1 — a non-delegated rotation may not supersede another rotation at the same `sn`.
- A2 — an interaction may never supersede any event.
- B — a delegated rotation may supersede the latest-seen delegated rotation at the same `sn` under conditions set by the delegator's KEL ordering.
- C — recurse to the non-delegated root; if neither A nor B holds there, discard the superseding rotation.

A `rot` can therefore supersede a fraudulent `ixn`, but "recovery can not happen for any compromise of pre-rotated keys, only the latest-seen." (KERI spec, L1825) Current-key compromise is survivable; pre-rotation-key compromise is not.

#### Recovery is not an escape from accountability {#03-recovery-accountability}

"Because events are signed nonrepudiably, any key compromise is still the responsibility of the controller... still may be held accountable for any harm." Recovery repairs the KEL for future validators only (KERI spec, L1792), and if validators cannot find the same undisputed trunk, the KEL is irreconcilable and untrusted (KERI spec, L1788-1790).

## 11. Key state as-of-anchor: the retrograde-attack defense {#03-as-of-anchor}

The outsider prior is to check a signature against the signer's current key state. KERI calls that a "pyrrhic victory": "After-the-fact audits are impossible, because anything in the past can be faked with compromised keys." (papers `was.md` > Mitigation 3 (pyrrhic victory)) An attacker who ever obtains a key can forge evidence "that looks like it originated in the past, forever," (papers `was.md`, unheaded opening), and most DIDs are exposed because they "can only be resolved to the current key state" (papers `was.md` > Mitigation 3 (pyrrhic victory)). [Chapter 07, section 11](#07-retrograde-attack) carries the tell.

KERI's defense: "An anchored signature/credential is validated against the issuer key state AS OF its KEL anchor's sequence position, not current key state or wall-clock." (keripy-knowledge `30-invariants.md` > H1) keripy enforces it in `Tever.verifyAnchor`, which fetches the issuer's KEL event at the anchor's `sn` and requires its SAID to match — "the anchor must be the issuer KEL event at exactly that sn." (keripy-knowledge `30-invariants.md` > H1) "An analysis of an anchored signature will produce the same result no matter when it happens." (papers `was.md` > Conclusion) An anchored signature is a provable association through the KEL, "independent of any container context." (papers `keri-primer.md` > 3.3 Anchored vs. paired signatures)

### The gap a reviewer must flag {#03-verifier-anchor-gap}

The credential `Verifier` may not re-run the anchor check: "recon found no call to `Tever.verifyAnchor` here -- anchor validation appears to happen only in `Tevery` when a TEL event is received, not when a credential + proof is verified." (keripy-knowledge `31-landmines.md` > L15, flagged HIGH, confidence medium) A credential with a forged `(seqner, saider)` proof might then pass schema and TEL-state checks unanchored. `vdr/verifying.py` read at keripy `b8f60166b` names no anchor re-check step in its enforcement order, which neither confirms nor refutes the landmine. Settle it against current code before relying on the credential path.

BADA (Best-Available-Data-Acceptance) applies the same monotonicity to data at rest: a KEL-anchored update is accepted only if its anchor is later in the KEL than the prior one's (KERI spec > BADA Policy, L2872; KERI spec > KEL Anchored Updates, L2894-2907 @`fbdd4a615`).

#### How this section and section 4 fit together {#03-anchor-and-establishment}

The as-of-anchor rule says which position a signature is judged at; the last-establishment-event rule of [section 4](#03-last-establishment-rule) says which key state that position resolves to. A validator that finds the anchor at the right `sn` and then reads key state off the latest event has an as-of-anchor check that degrades into a current-key-state check the moment the issuer emits an `ixn`. The two rules are one mechanism.

## 12. The KERIA/Signify edge-versus-agent custody split {#03-keria-signify}

In production, the dominant pattern separates who holds the keys from who runs the infrastructure without giving the infrastructure the keys. It instantiates pre-rotation, delegation and custodial rotation.

### The custody rule {#03-custody-rule}

"All client tasks/calls are signed 'at the edge', not in the hosted KERIA instance." (KERIA `README.md`) signify-ts takes key generation and event signing from the agent's five functions, leaving "a remote cloud agent that never has access to the decryption keys," with "only the public keys and blake3 hash of the next keys made available to the agent." (signify-ts `README.md`) The agent "holds only encrypted key material it cannot decrypt and never signs on the controller's behalf. The custodian is a blind store + relay, not a signer." (raw/10 section 4)

#### The two-AID delegation spine {#03-two-aid-spine}

The Client AID is the controller's own transferable AID, with one signing and one rotation key derived at the edge from a 21-character passcode; it is the delegator. The Agent AID is a KERIA-created `dip` whose `di` is the Client AID; it signs every response so the client can authenticate its agent (KERIA `docs/protocol.md` > Agent Worker Initialization, Steps One-Three). Authentication is "asymmetric-by-role but symmetric-in-mechanism: client signs every request with the Client AID; agent signs every response with the Agent AID." (raw/10 section 1) There are no bearer tokens; each request carries a fresh HTTP message signature ([chapter 09](09-kram-and-request-authentication.md)).

#### What the code enforces at the boundary {#03-boundary-enforcement}

On connect, signify-ts requires the agent's inception to be a `dip` with a delegator anchor ("no anchor to controller AID") and exactly one signing key, one next key and threshold 1 (signify-ts `src/keri/app/controller.ts`, L44-82). KERIA refuses a multisig controller: "multisig groups not supported as agent controller" (KERIA `src/keria/app/agenting.py`, L871). Unsigned admin traffic gets HTTP 401 (KERIA `src/keria/core/authing.py`, L187-189), and the client rejects a "message from a different remote agent," (signify-ts `src/keri/app/clienting.ts`, L243).

#### Passcode rotation is a KEL rotation {#03-passcode-rotation}

Changing a passcode is a partial custodial rotation of the Client AID: "To provide post-quantum secure passcode recovery, a passcode recovery must be accompanied by partial rotation of the Client AID." (KERIA `docs/protocol.md` > Passcode Rotation > Partial Client AID Rotaion in Support of Passcode Rotation, the heading's own spelling) The old rotation key, regenerated from the old passcode, signs with weight 0 to satisfy the prior commitment, and the new signing key takes weight 1 (raw/10 section 2), the custodial pattern of [section 6](#03-rotation-family). An interrupted rotation makes KERIA "lock[s] out all other operations until it is completed successfully," (KERIA `docs/protocol.md` > Passcode Rotation Recovery).

#### Edge key-derivation methods {#03-key-derivation-methods}

Every method keeps unencrypted private material at the edge: Salty (one Argon2-stretched salt per AID, stored server-side encrypted), Randy (random keys stored as encrypted blobs), Sandy (a salt per establishment event), Group (no keys; designates the local multisig participant), and experimental HSM (KERIA `docs/protocol.md` > Key Generate Methods). On rotation the edge re-derives and checks each AID's keys against published state, throwing "Invalid Salty AID" on mismatch (signify-ts `src/keri/app/controller.ts`, L372-374). The Salty path has no delimiter, so "when `stem` ends in a hex digit, distinct `(stem,ridx,kidx)` tuples can map to the same path -> same derived seed." (keripy-knowledge `31-landmines.md` > L10; keria/signify #928)

#### Cross-implementation parity is the deepest risk {#03-parity-risk}

keripy, KERIA, signify-ts and SignifyPy must agree byte for byte on encoding, key stretching, SAID computation and signature bytes; [chapter 06, section 7](#06-implementation-compat) owns parity. KERIA depends on keripy's 1.2.x line, `"keri==1.2.14",` (KERIA `pyproject.toml`, L30 @`928ce26a4`), while every keripy [code] claim here is from the 2.1.0-dev `main` line, so keripy behavior describes a KERIA deployment only where KERIA reimplements it.

## 13. What is enforced versus what is prose: the ground-truth summary {#03-ground-truth}

Machine-enforced, at the pins given in [Sources](#03-sources): one inception at sn 0 with `d == i` and a bounded threshold; empty commitments for non-transferable AIDs; the pre-rotation check of [section 5](#03-rotation-check); backward hash chaining, increasing sequence numbers and current keys from the last establishment event (keripy-knowledge `30-invariants.md` > B2-B4); seal-authorized, first-seen delegation; forked-and-preserved recovery; the local/remote second factor; and edge custody with a single-key delegated agent.

Recorded but unre-tested landmines, none a protocol flaw: L15, the credential verifier possibly skipping the anchor check; L6 and L7, digest-code fail-open paths; L9, receipting waiting for all witnesses; L11 to L13, keystore and delegation ordering; L1, the `Ed25519N` hardcode; and L10, the Salty path collision. Two uncertainties sit in the specification instead: the effect of `DID` ([section 8](#03-did-effect-unspecified)), and the last-establishment-event rule, which nothing normative states ([section 4](#03-last-establishment-rule)).

The governing rule is the knowledge base's: "do not 'simplify away' a guard you don't fully understand; treat an unexplained check as protecting an invariant until proven otherwise." (keripy-knowledge `00-lens.md` > claim 6) The dual index, the local/remote split, the two-way delegation peg and the weight-0 rotation key each encode a guarantee a simpler design cannot retrofit.

## Sources {#03-sources}

- CESR spec — Composable Event Streaming Representation (CESR) specification, Trust Over IP. trustoverip/kswg-cesr-specification, spec/spec-body.md, `v1.1` @`65fd7518b` (2026-08-26). Supports only the [spec-next] citation in [section 5](#03-post-quantum-construction); the standardizing branch has no counterpart section. Mined in raw/02.
- KERI spec — Key Event Receipt Infrastructure (KERI) specification, Trust Over IP. trustoverip/kswg-keri-specification, spec/spec-body.md and spec/termdefs.md. `main` @`fbdd4a615` (2026-08-28) supports every unmarked or [spec] citation; `v1.1` @`3753f3797` (2026-08-26) supports the [spec-next] citations in [section 8](#03-v1-1-adds). The branches have diverged, so [spec-next] is not "`main` plus more" and cannot be promoted on the expectation of a merge. Mined in raw/01.
- KERIA — KERI Agent, WebOfTrust. WebOfTrust/keria, `README.md`, `docs/protocol.md`, `pyproject.toml`, `src/keria/app/aiding.py`, `src/keria/app/agenting.py` and `src/keria/core/authing.py`. `main` @`7e685edaa` (2026-09-11), including the `aiding.py` change in `b57780a8b`; @`928ce26a4` (2026-09-30), a changed-files read, for the `keri==1.2.14` pin. Mined in raw/10.
- keripy — KERI reference implementation, WebOfTrust. WebOfTrust/keripy, src/keri. `main` @`b8f60166b` (2026-09-14, `__version__` `2.1.0-dev1`) for the `kraming.py` gate, the post-quantum code search and the `vdr/verifying.py` read. `core/eventing.py`, `core/coring.py`, `vdr/eventing.py`, `app/habbing.py`, `app/keeping.py` and `core/signing.py`, where most code claims live, were read at `3a8e01aec` (2026-07-17) and their hints and behavior are pinned there. The `DND` drop in `Kever.validateDelegation` and `data=data` in `BaseHab.incept` were read at `main` @`80f77b73b` (2026-10-01). Mined in raw/09 and raw/21.
- keripy conversations — Sam Smith's comments in WebOfTrust/keripy discussions #1570 and #1598, PRs #1564 and #1572, and issue #1544, read from the 2026-10-14 fetch cached under `.ignored/sam-rulings-cache/`, at edited text where edited. [proposal] throughout. Mined in raw/21.
- keripy-knowledge — keripy knowledge base (`00-lens.md`, `30-invariants.md`, `31-landmines.md`, `PLAN.md`), Daniel Hardman. dhh1128/keripy, branch `knowledge` @`9489ac9bd` (2026-07-02). Private and unpublished; cited as `L1`, `C1`, `H1` and so on. Its code baseline is keripy `60ab9e08d`, 493 commits behind `b8f60166b`, so each landmine is an observation about a superseded dev line, not a statement about current keripy, and its banner claim that all twenty still hold has at least one known counterexample. Mined in raw/08.
- keri-security-analysis — KERI security-analysis corpus (`cr-ad-trust.md`; `background.md`), Daniel Hardman. dhh1128/keri-security-analysis, main @`149fa6c35` (2026-04-23). Mined in raw/07.
- papers — Daniel Hardman's papers (`keri-primer.md`, `wtbo.md`, `was.md`, `sda.md`, `x509-prob.md`), dhh1128/papers, main; `wtbo.md` pinned @`181569b64` (2026-09-15), the others with no pin of record in this chapter. The author's framing, not normative text. The `was.md` retrograde-attack quotes sit in its unheaded opening, as [chapter 01, section 6](#01-pki-problem) records. Mined in raw/05 and raw/06.
- signify-ts — Signify TypeScript client, WebOfTrust. WebOfTrust/signify-ts, `README.md`, `src/keri/app/controller.ts` and `src/keri/app/clienting.ts`, `main` @`ffba8406e` (2026-09-10). Mined in raw/10.

---

# 04 — CESR and the Wire {#04-cesr-wire}

## Thesis {#04-thesis}

CESR (Composable Event Streaming Representation) is the external interop contract that makes the stack verifiable, not a serialization convenience. Its defining property is text-binary concatenation composability: any set of self-framing primitives concatenated in the text domain converts en masse to binary and back with no loss and no re-parsing (CESR spec > Composability, L5). The rest follows from that property and one arithmetic fact, that 24 is the least common multiple of Base64's 6 bits per character and a byte's 8 bits (CESR spec > Conversions, L196): the sizing math, the code-table taxonomy, count codes, version strings, the cold-start tritets, and the mechanism by which a new algorithm claims an unused code. Treating CESR as Base64 with type tags, reaching for `=` padding or lexicographic canonicalization, or simplifying the encoding as an implementation detail are wire-interop defects that keripy's own tests will not catch, because the contract is with every other implementation (00-lens.md, claim 5).

## Status {#04-status}

Unmarked claims are [spec], meaning CESR's `main` at `bad6edd84`. The post-quantum code table is [spec-next] on `v1.1` at `65fd7518b`, and an open, unmerged pull request proposes to revert it from that branch ([section 5.7](#04-pq-in-practice)).

## 1. What CESR fundamentally is, and the priors it corrects {#04-what-cesr-is}

CESR is a dual text-binary encoding whose unique property is concatenation composability (CESR spec > SAD Path Signatures, L1390). Three outsider priors are wrong.

It is not crypto-only: "The CESR protocol... is not limited to merely encoding Cryptographic Primitives but any primary data type (numbers, text, datetimes, lists, maps) may be encoded in a composable way" (CESR spec > Abstract Domain representations, L11).

It is not naive Base64. Standard Base64 pads each conversion separately, which gives only one-way composability: convert a concatenation of raw values and bits from adjacent primitives land in one character, destroying the boundaries (CESR spec > Text Code Size, L184, L252). CESR forbids the `=` pad character "because all CESR-encoded Primitives are composable" (CESR spec > Concrete Domain representations, L93).

The encoding is an external contract, and compliance is normative: "All compliant encoded Primitives MUST be Composable. All compliant encoded Primitives MUST be self-framing" (CESR spec > Composability, L5).

The design aesthetic is minimally sufficient strength: "there is minimally sufficient cryptographic strength and more cryptographic strength just wastes computation and bandwidth" (CESR spec > Compact fixed-size codes, L446), with a 128-bit floor (CESR spec > Annex A > Code table entry policy, L783). The text domain is primary: "A primary design goal of CESR is to select an encoding approach that provides high usability, readability, or human friendliness in the 'T' domain... The 'B' domain's purpose is merely to provide convenient compactness at scale" (CESR spec > Stable Framing Codes, L202). The genus/version mechanism ([section 8](#04-genus-version)) lets one encoding serve KERI, ACDC, TSP and other protocols.

## 2. The three domains and the six transformations {#04-three-domains}

A primitive has three representations (CESR spec > Abstract Domain representations, L11): text 'T' (streamable Base64), binary 'B' (streamable binary), and raw 'R', the non-streamable pair `(code, raw)` where cryptography happens. Composability is a property of T and B. There are six transformations, one per ordered pair, and full circuits such as `R -> T(R) -> T -> B(T) -> B -> R(B) -> R` (CESR spec > Transformations between Domains, L17-31, L40).

`T(B)` and `B(T)` are plain Base64 encode and decode, so "CESR Primitives are compatible with existing Base64 (RFC-4648) tooling"; only R↔T and R↔B need new code (CESR spec > Text Code Size, L266). [code] keripy makes the contract executable: a primitive is `composable` iff `len(qb64b) % 4 == 0 and len(qb2) % 3 == 0 and encodeB64(qb2) == qb64b and decodeB64(qb64b) == qb2` (keripy core/coring.py, L1239-1247 @`b8f60166b`).

## 3. Composability — the core invariant and the 24-bit backbone {#04-composability}

"An encoding has Composability when any set of Self-Framing concatenated Primitives expressed in either the Text domain or Binary domain may be converted as a group to the other Domain and back again without loss" (CESR spec > Composability, L5). Formally `T(cat(b[k])) = cat(T(b[k]))` and `B(cat(t[k])) = cat(B(t[k]))`, and the invariant is total: "Each and every Primitive or Count Code group of primitives MUST satisfy the Concatenation Composability property" (CESR spec > Concatenation composability property, L73).

Self-framing makes de-concatenation possible. A parser reads the first character or byte, indexes a table, and learns how many characters or bytes belong to the primitive: "The self-framing property of the primitives enables de-concatenation" (L87). There are no delimiters; the type code carries the length. [code] keripy dispatches on the first character: a leading `-` is a count code, `_` an op code, anything else indexes the `Hards` table (keripy core/coring.py, L1350-1362 @`b8f60166b`).

### 3.1 The 24-bit alignment rule (the arithmetic backbone) {#04-alignment}

"all Primitives MUST be aligned on 24-bit boundaries to satisfy the Composability property" (CESR spec > Conversions, L198). So every B-domain primitive is a multiple of 3 bytes and every T-domain primitive a multiple of 4 characters. The pad size is `ps = (3 - (N mod 3)) mod 3` for raw length `N` (CESR spec > Text Code Size, L264); the double modulo maps `0->0, 1->2, 2->1`, and simplifying it breaks triplet alignment (30-invariants.md, A4). Pad size selects code size: pad 0 takes a code of length `4M`, pad 1 `4M+1`, pad 2 `4M+2` (CESR spec > Example of pad size computation, L276-280).

[code] keripy carries the arithmetic verbatim. `Matter._infil` computes `ps = (3 - ((rs + ls) % 3)) % 3` and raises when `ps != (cs % 4)`, and `Matter._rawSize` recovers raw length as `(((fs - cs) * 3 // 4) - ls)` (keripy core/coring.py, L866-867, L1284-1290 @`b8f60166b`). The order of operations in that expression is load-bearing — the warning is the knowledge base's, not a source comment: "Order of ops matters (`*3//4` before `- ls`)" (30-invariants.md, A5). The invariants are `fs % 4 == 0`, `cs % 4 != 3`, `(ls + rs) % 3 == 0`, `ls ∈ {0,1,2}`, and the raw-length equality (30-invariants.md > A).

### 3.2 Mid-padding — a deliberate "never do it the other way" {#04-mid-padding}

Alignment can come from trailing `=` characters, as in Base64, or from leading zero bytes prepended to the raw value. CESR chose the second: "all CESR primitives MUST employ mid-padding as defined" (CESR spec > Code characters and lead bytes, L234). The lead bytes equal in number the pad characters they replace (L226), and the zeros land between the type code and the value, which stays right-aligned and readable (CESR spec > Stable value encoding, L214). [code] keripy's `_infil` encodes `bytes([0] * (ps + ls)) + raw` and drops the first `ps` characters (keripy core/coring.py, L1301 @`b8f60166b`).

This is the most fragile surface in the stack. A parser does not throw on a miscomputed size; it mis-frames the next primitive: "Get the sizing math wrong and a parser that predates your code desyncs the entire stream — silently, because CESR is self-framing" (30-invariants.md > A, L31-32).

## 4. Stable framing codes — the usability doctrine {#04-stable-framing}

"The type portion of all compliant prepended Framing Codes MUST be stable in the Text domain" — "the leading characters that determine the type do not change when any other portion of the primitive changes" (CESR spec > Stable type encoding, L202-206). The type consumes a fixed whole number of characters and never shares a character with length or value. Stability is imposed on T rather than B because text parsers see only whole characters (L208). And "the value portion of any primitive MUST be right aligned" (CESR spec > Stable value encoding, L216), so small numbers stay legible.

"Each code table MUST be uniquely indicated by the first character of the type code in the 'T' domain" (CESR spec > Multiple code table approach, L240): read the selector and you know how to parse the rest. [code] keripy keys its `Hards` and `Bards` size tables by the T-domain and B-domain selector (keripy core/coring.py, L1350-1355 @`b8f60166b`).

## 5. The multiple-code-table design and crypto agility {#04-code-tables}

### 5.1 Why multiple tables {#04-why-multiple-tables}

One table would either waste characters on common codes or run out of room for rare ones (CESR spec > Multiple code table approach, L238). The compact tables target the cryptographic sweet spots, 32-byte raw values (pad 1, a one-character code) and 64-byte ones (pad 2, a two-character code), which cover EdDSA and ECDSA keys, 256-bit digests and 512-bit signatures (CESR spec > Compact fixed-size codes, L450-474).

### 5.2 Code table selectors {#04-table-selectors}

Of 64 Base64 characters, 12 are selectors, leaving 52 one-character type codes in the default table, 13 tables in all (CESR spec > Code table selectors, L476-487): `-` selects count codes, `_` op codes (reserved), `[A-Z, a-z]` are one-character codes with pad size 1, and `[0-9]` select the other ten tables. "The first character of any Primitive MUST be either a selector or a 1-character code type" (L484).

### 5.3 How a new algorithm claims an unused slot, and what an old parser does with it {#04-unused-slot-agility}

The derivation code names the suite, and a new suite takes a previously unused code: "The CESR derivation code enables cryptographic digest algorithm agility... Each serialization may use a different cryptographic digest algorithm as indicated by its derivation code. This provides interoperable future-proofing" (CESR spec > SAID, L1180).

Every code announces its own length, because the selectors "select a given code table and indicate the number of remaining characters in the text code" (CESR spec > Code table selectors, L484). Only a variable-size code also announces its value's length: in the small variable tables (`4`, `5`, `6`) "the last two characters provide the size of the value as a Base64 encoded integer" (CESR spec > Table types > Small variable-length raw-size tables, L539), and in the large ones (`7`, `8`, `9`) the last four do. The fixed-size tables (one-character codes and selectors `0` to `3`) carry no size characters, so a value's length is known only to a parser whose table lists the type. An unknown variable-size code is skippable in principle; an unknown fixed-size code is not, because the old parser cannot find the next primitive. The specification says the same: "old ones will break if they receive the new ones" (CESR spec > Protocol genus/version codes, L618).

[code] keripy skips neither. `Matter._exfil` raises `UnexpectedCodeError(f"Unsupported code ={hard}.")` on any unknown hard code, variable-size included (keripy core/coring.py, Matter._exfil, L1375 @`80f77b73b`). Inside a counted group the parser drops that group, because "processOneIter already flushed group so do not flush stream" (keripy core/parsing.py, Parser.allParsator, L532-537 @`80f77b73b`); with no enclosing count it runs `del ims[:]  # delete rest of stream to force cold restart` (L539-544). Either way the old receiver loses data it cannot read and does not misread it. Nothing in the specification requires skipping variable-size codes.

A new code is safe only if it takes an unused slot and its sizing entry changes nothing an existing parser knows, hence the entry policy (CESR spec > Annex A > Code table entry policy, L783) and the shadow-table rule ([section 5.5](#04-shadow-tables)).

### 5.4 Backward-compatibility semantics of adding codes {#04-backward-compatibility}

The specification is asymmetric (CESR spec > Protocol genus/version codes, L618-622):

- "Any addition of a new code to the code table is backward-breaking in at least one direction... New implementations with the new codes can accept streams from old implementations, but old ones will break if they receive the new ones" (L618).
- A changed meaning is a MAJOR version increment and breaks both directions (L620).
- An added code is a MINOR increment and breaks only a new sender to an old receiver (L622).

There are 4,096 minor versions per major, because additive extension is the common case. Crypto agility is therefore not that any parser reads any stream: a new algorithm is a minor bump that old parsers reject detectably and new parsers accept alongside old streams, provided the sizing math is right.

### 5.5 The reference-implementation trap: shadow tables {#04-shadow-tables}

A digest, key or signature code lives in several keripy tables. Registered only in `MatterCodex` and `Matter.Sizes`, it round-trips as a primitive but is invisible to SAID derivation and prefix validation, and "fails late and silently" (31-landmines.md, landmine L5). A correct addition also touches `Saider.Digests`, `Serder.Digests` and the relevant `*Dex` sets (`PreDex`, `DigDex`, `SmallVrzDex`/`LargeVrzDex`), and on the 2.0 line `BUDex` and `Counter.BUCodes`. [code] The source says so: "# When add new to DigCodes update Saider.Digests and Serder.Digests class attr" (keripy core/coring.py, L444 @`b8f60166b`).

The knowledge base writes this as advice about a pending Falcon change, and there is none: [code] keripy at `b8f60166b` has no post-quantum code of any kind, a search of `src/keri` for FN-DSA, ML-DSA, SLH-DSA, Dilithium, Falcon, SPHINCS, Kyber and ML-KEM finding only the `falcon` web framework. Its own plan defers the work: "**Prereq:** resolve the two conflicting Falcon spec docs first" (PLAN.md > 7 effort table, L170). The rule is right for whoever writes the first one, and for any new code.

### 5.6 Two allocation rules that turn taste into normative constraint [spec-next] {#04-allocation-rules}

`v1.1` at `65fd7518b` adds placement rules with no counterpart on `main` (CESR spec > Code table entry policy, L785-791).

The compact tables are scarce: 52 one-character and 64 two-character codes, against 262,144 in each four-character table. Entries there "MUST be reserved for Primitives whose raw size is small enough that a longer code would materially increase the size of the encoded Primitive", so "Post-quantum codes MUST therefore be placed in the four-character fixed tables given by the `1`, `2`, and `3` selectors" (L785).

Which four-character table is arithmetic: "Which of the three four-character fixed tables a given Primitive occupies is not a matter of choice. It is determined by the raw size of the Primitive modulo 3" (L787). A selector encodes lead-byte alignment, not algorithm semantics, and "the Primitives belonging to a single algorithm are commonly distributed across more than one table" (L787): an Ed25519 key is `D`, its signature `0B`. Inferring an algorithm family or security level from a selector reads length arithmetic as taxonomy.

Parameter-set admission is restrictive: "Admitting every variant of an algorithm invites the use of variants that have received little implementation scrutiny" (L791). Only the six SLH-DSA `s` sets get entries, the fast `f` variants being "the wrong trade for a protocol whose signatures are transmitted and archived far more often than they are generated" (L791), which is the specification's reasoning about KERI's traffic and less obviously true for a high-frequency signer.

#### Too much agility is itself a defect {#04-goldilocks-agility}

The editor's reasons, in the pull request that added the table, are [proposal]. A fixed code chosen by raw size modulo 3 wastes little: "So at worst case there is never more than 2 bytes of overhead no matter the length of the primitive." (CESR spec GitHub > #165, comment of 2026-03-18, R-017, https://github.com/trustoverip/kswg-cesr-specification/pull/165#issuecomment-4085555336), and the fixed code doubles as the dispatch key. Agility has a limit: "There is a saying in crypto. Too much agility is a bad thing. There is a goldilocks amount of agility." (CESR spec GitHub > #165, comment of 2026-03-19, R-018, https://github.com/trustoverip/kswg-cesr-specification/pull/165#issuecomment-4086516133). He preferred fixed-length Falcon signatures because squeezing out bytes "opens the vulnerability for timing attacks and makes downstream uses of the signatures more difficult". And a code names an encoding, never a use: "The CESR code defines the encoding not the usage semantics." (CESR spec GitHub > #165, comment of 2026-03-19, R-019, https://github.com/trustoverip/kswg-cesr-specification/pull/165#issuecomment-4087093269), the one exception being transferable and non-transferable key codes for AIDs. A reviewer arguing that CESR should encode every parameter set, or give a digest a code for its role, is arguing against the editor.

### 5.7 Post-quantum agility in practice — what is actually where {#04-pq-in-practice}

On the standardizing line there are no post-quantum codes. At `main` `bad6edd84` the specification has no FN-DSA, ML-DSA, SLH-DSA, ML-KEM or FIPS text; Falcon appears once, as a candidate: "Falcon appears to be among the leading candidates with open-source code already available" (CESR spec > Code table entry policy, L783). Its post-quantum story is the pre-rotation hash firewall ([section 11](#04-said)). Older drafts circulate FN-DSA assignments (`1AAQ`, `1AAR`, and one-character `b`, `c`, `d`, `e`) cited to a Post-Quantum Security section; that text exists only in commit `d35125e61`, reachable from no ref in the repository, and was never on either branch.

[spec-next] `v1.1` at `65fd7518b` adds about 33 primitives for FN-DSA (FIPS 206), ML-DSA (FIPS 204) and SLH-DSA (FIPS 205) in the `1`, `2` and `3` tables. It stacks them on the firewall: "The two mechanisms are complementary, not alternatives; pre-rotation continues to provide defense in depth for whichever signature scheme is in use" (CESR spec > Post-Quantum Cryptographic Primitives, L1553). Every signature code is fixed-size: "Every post-quantum signature code defined in this specification encodes a signature of fixed raw size" (L1555), partly because "A variable-length encoding obliges the parser to consult a length field rather than the code alone" (L1555). The one-character codes `b` to `e` stay unassigned and the allocation rule forbids post-quantum codes there; FN-DSA-1024 keys and signatures and FN-DSA seeds sit at `2AAA` to `2AAD`, while FN-DSA-512 keys and signatures, whose raw sizes are ≡ 0 mod 3, sit at `1AAQ` and `1AAR` (`v1.1` L1021-1022, L1036-1039).

Two absences matter. There is no ML-KEM code: "ML-KEM is a key-encapsulation mechanism rather than a signature scheme; codes for it are not defined here and are left to a later version" (CESR spec v1.1 > Code table entry policy, L789), so CESR has no post-quantum encryption primitive at either pin. And there is no post-quantum indexed signature code ([section 12](#04-interop-risks), item 7). The placeholder issue #14 for post-quantum operations stands at L559 on both branches.

No shipped implementation carries the table. [code] keripy at `b8f60166b` and signify-ts at `ffba8406e` have no post-quantum codes. The only implementation is an unmerged personal fork, `dhh1128/signify-ts` branch `feat/cesr-pq-codes` at `4ed767b49`, which is [proposal]. It is still the best evidence for [section 5.3](#04-unused-slot-agility): its parser sizes by table lookup on the code alone — `const sizage = sizes.get(head.slice(0, hs));` (signify-ts fork src/keri/core/parsing.ts, L256 @`4ed767b49`) — and adding all 33 rows needed no parser change.

Pull request trustoverip/kswg-cesr-specification#178, open, unmerged, unreviewed and with no stated reason, proposes to revert the table from `v1.1`. The [spec-next] markers stand, but the table is contested on its own branch. Treat the mechanism as settled and demonstrated, and the codes as forward-branch text that nothing shipped implements.

## 6. Sizing math and the table taxonomy {#04-sizing-taxonomy}

Raw primitives are fixed-length or variable-length; there are also count-code, genus/version, op-code and context tables (CESR spec > Table types, L493-499).

### 6.1 Fixed-length raw-size tables (CESR spec, L503-531) {#04-fixed-size-tables}

- One-character table (`[A-Z, a-z]`): 52 codes, pad size 1, the 32-byte sweet spot.
- Two-character table (selector `0`): 64 codes, pad size 2, the 64-byte sweet spot.
- Large fixed tables (selectors `1`/`2`/`3` for 0, 1 or 2 lead bytes): four-character codes, `64**3 = 262,144` each; the selector "implicitly encodes the number of lead bytes."

### 6.2 Variable-length raw-size tables (CESR spec, L533-577) {#04-variable-size-tables}

Size counts quadlets (four characters) or triplets (three bytes).

- Small variable (selectors `4`/`5`/`6`): a four-character code of selector, type and two size characters; 64 types, up to 4,095 quadlets.
- Large variable (selectors `7`/`8`/`9`): an eight-character code of selector, three type and four size characters; 262,144 types, up to 16,777,215 quadlets. The first 62 types mirror the small table so a short value can use the short code.

### 6.3 Parse-part vocabulary (CESR spec, L718-778) {#04-parse-parts}

The parser reads the selector, then the hard size `hs`, extracts the hard characters, indexes the size table and extracts the rest; the same table works in the B domain (L720). The part labels recur throughout keripy: `hs` hard, `ss` soft, `os` other, `ms` main (`ss - os`), `cs` code (`hs + ss`), `vs` value, `fs` full (`hs + ss + vs`), `ls` lead, `ps` pad, `rs` raw, `bs` binary (`ls + rs`) (L765-778). [code] keripy holds them in `Sizage = namedtuple("Sizage", "hs ss xs fs ls")` and `Matter.Sizes`; `fs is None` marks a variable-size code, and a fixed code satisfies `fs % 4 == 0` (keripy core/coring.py, L660, L864 @`b8f60166b`). Some fixed codes carry their value in the soft part with an empty raw part (CESR spec, L660), which keripy calls `_special`: `fs is not None and ss > 0` (keripy core/coring.py, L910-918 @`b8f60166b`).

## 7. Count / group framing codes (grouping and pipelining) {#04-count-codes}

Count codes count quadlets or triplets, never primitives: a count code "always counts the number of quadlets/triplets in the group not the number of primitives" (CESR spec > Count Code tables, L591). That is what lets a group be skipped without parsing it, which enables pipelining, offloading and groups of groups (CESR spec > Count or Group Framing Codes, L362). A count code is a composable primitive with no raw value and pad size 0; [code] in keripy `hs + ss == fs` for every counter (30-invariants.md, A7; keripy core/counting.py, Counter).

The count is the same in both domains: "the count value is invariant between 'T' and 'B' Domains... MUST be the number of Quadlets in the 'T' domain and the number of Triplets in the 'B' domain" (L581). "Each element in content of a Count Code group MUST be aligned on a 24-bit boundary. Thus the only elements allowed in the contents of a Count Code group are other primitives or groups" (L591). After the `-` selector, a letter makes a one-character count code and a numeral, `-` or `_` selects a secondary table (L594); the small table counts to 4,095 (L599), the large `--` table to `64**5 - 1` quadlets (L605).

[code] These are keripy's attachment groups. The v1 codex at `80f77b73b` runs `-A` ControllerIdxSigs, `-B` WitnessIdxSigs, `-C` NonTransReceiptCouples, `-E` FirstSeenReplayCouples, `-F` TransIdxSigGroups, `-G` SealSourceCouples, `-H` TransLastIdxSigGroups, `-I` SealSourceTriples, `-L` PathedMaterialCouples and `-Z` ESSRPayloadGroup, with no `-D` (keripy core/counting.py, L56-76 @`80f77b73b`). The v1 and v2 codices differ, which is why the genus/version code ([section 8](#04-genus-version)) must precede them.

### 7.1 keripy retires transferable receipts as a wire type and reuses v2 `-N` — ahead of the spec {#04-receipts-retired}

[code] at `80f77b73b`, from keripy PR #1683, beginning with `9762d6bb4` "retire use of TransReceiptIdxSigGroups group code". `TransReceiptIdxSigGroups` is gone from both of keripy's counter tables; v1 keeps it only as a comment, `#'-D': Cizage(hs=2, ss=2, fs=4),` (keripy core/counting.py, L618), so a v1 `-D` group has nothing to size it. A transferable endorsement now travels as `TransIdxSigGroups` (`-F` in v1, `-X` in v2), routed to the old receipt handler (keripy core/parsing.py, L1412), so a transferable receipt is a role a signature group plays, not a code. Removing v1 `-D` contradicts no specification text, which defines count codes only for v2 (CESR spec, L872), and v2 `-D` (datagram segment) agrees on both sides.

v2 `-N` is a specification-implementation divergence. keripy reassigned it: `NonceSealSingles: str = '-N'  # Nonce Seal Single(s), nonce as sealed data, nonce or dig.` (keripy core/counting.py, L228). Both CESR branches still define `-N##` as "Transferable identifier receipt quadruples pre+snu+dig+sig up to 4,095 quadlets/triplets" (CESR spec, L915 @`bad6edd84`; L923 @`65fd7518b`) [spec]. The editor had proposed re-forming or dropping the old group: "Or we can decide to delete the group." (keripy GitHub > #1450, issue body of 2026-06-23, R-009, https://github.com/WebOfTrust/keripy/issues/1450) [proposal]. The divergence is latent: `NonceSealSingles` is absent from `SealCodex_2_0`, from `Serder.ClanCodes` and from the parser's methods, so keripy cannot parse a `-N` group; but v2 `messagize` frames a `SealNonce` bond as `-N` if a caller passes one (keripy core/eventing.py, L1851, L1859–1860; keripy core/structing.py, L396, L646–652). No `src/keri` caller does, so this is a library capability, read from code and not run.

Typed-digest seals may now carry a nonce: keripy's `SealKind` second element is "d = digest or nonce using custom derivation given by type field (Noncer)" (keripy core/structing.py, L69), while the specification's `-W` row reads "Typed digest seal couples `type+dig`" (L933 @`bad6edd84`). Framing survives, since every value `Noncer` admits is a self-framing primitive, but a verifier that treats the second element as a content digest is wrong about keripy's output.

## 8. The protocol genus/version code — versioning the tables themselves {#04-genus-version}

A genus/version code switches which code tables the parser uses: "A protocol genus and version code itself MUST NOT provide a count of the following Quadlets or triplets but MUST modify the protocol genus and Version of all the following Count Codes" (CESR spec > Protocol genus/version table, L609). Its format is `-_GGGVVV`: a three-character genus and a version whose first character is major and last two minor, so `CAA` is 2.00; KERI/ACDC use `-_AAABAA` (v1.00) and `-_AAACAA` (v2.00) (CESR spec > Protocol genus/version codes, L615, L865-866). It lets one encoding serve several protocols and versions their tables, and "The only table that all protocols MUST share (i.e., has identical values) is the protocol genus and version table" (L611).

A genus/version code governs the following count codes at top level until the next one, or inside one of three overrideable universal groups, and only in first position: "the parser MUST only treat the genus/version count code, especially as an override, when it appears as the first count code within the framed material of an overrideable universal count code. Otherwise, there MUST be no special override meaning" (CESR spec > Universal genus/version override, L816). Override ambiguity would be a downgrade surface, which is why the position is pinned.

A message's version is permanent and its attachments follow the parser [proposal]: "Key event messages, because they are signed and must be verifiable indefinitely, can't be upgraded.", but "there should be no reason that attachments can't be version 2 even when the message is V1, except when talking to a V1-only parser." (keripy GitHub > #1519, comment of 2026-07-23, R-002, https://github.com/WebOfTrust/keripy/pull/1519#issuecomment-5060786324). Since a v2 key event cannot be converted to v1 and still verify, a v1-only parser is a dead end.

v2 attaches messages instead of embedding them, because "This embedding requires that embedded messages share the same serialization of the embedding message. Which breaks down for v2 with 4 serialization types." (keripy GitHub > #1441, comment of 2026-06-22, R-022, https://github.com/WebOfTrust/keripy/pull/1441#issuecomment-4772533040) [proposal]. [code] keripy's embedding constructor `specialExchange` defaults to v1 JSON (keripy peer/exchanging.py, specialExchange, L801-815 @`80f77b73b`). A v2 design that embeds a message in another's body is reaching for a v1 construct.

## 9. Version strings — framing the interleaved non-native serializations {#04-version-strings}

A CESR parser must support three interleaved non-native serializations, JSON, CBOR and MGPK (CESR spec > Performant resynchronization, L388), framed by a version string in the first field, `v` (CESR spec > Version String field, L1123, L1125).

The v2 form is `PPPPMmmGggKKKKBBBB.`, 19 characters: protocol, protocol version, genus-table version, serialization kind (`JSON`, `CBOR`, `MGPK`, `CESR`), total length, and a `.` terminator that lets a future version change the string's size (L1131, L1152). `Mmm`, `Ggg` and `BBBB` are "a number expressed as a base 64 number, not a string encoded in Base64", with `A` as 0 and `_` as 63 (L1146); misreading that is a parsing bug. The v1 form `PPPPvvKKKKllllll_` is 17 characters with hex version and length, and v2 implementations must support it to verify 1.XX events (CESR spec > Legacy Version 1.XX string field format, L1156-1174). [code] keripy's `Rever` regex tries v2 then v1 (keripy kering.py, L39-61 @`b8f60166b`).

CESR-native field maps carry no version string; they use `-G` count codes and a protocol version field. An implementation may inject a placeholder `v` in memory, but "there is no normative indication that the in-memory object was deserialized from a CESR native field map" (L1148), a round-trip gotcha across implementations.

## 10. Streaming, cold start, and the eight tritets {#04-cold-start}

After a cold start a parser must find framing, and ambiguity forces another restart; "Good cold start re-synchronization is essential to robust performant Stream processing" (CESR spec > Cold start Stream parsing problem, L380-384). The first three bits of the first byte act like a byte-order mark: the start bits of text CESR, binary CESR, JSON, CBOR and MGPK "MUST be mutually distinct" (CESR spec > Performant resynchronization, L390). The eight cases (CESR spec > Top-level Stream Starting Tritets, L411-420):

- `0b000` annotated T domain; `0b001` T count code (`-`); `0b010` T op code (`_`); `0b011` JSON (`{`);
- `0b100` MGPK FixMap; `0b101` CBOR map; `0b110` MGPK Map16/Map32; `0b111` B-domain count or op code.

JSON, CBOR and MGPK maps take `011` to `110`, and Base64 `-` and `_` fit the free text slots while their binary forms land at `111` (L392-404). "Each Stream MUST start (restart) with one of eight cases" (CESR spec > Stream parsing rules, L427). [code] keripy's `ColdCodex` enumerates the same eight, and `sniff` dispatches on `ims[0] >> 5` (keripy kering.py, L239-322 @`b8f60166b`).

After the tritet, a count code carries what is needed to parse its group, and for a JSON, CBOR or MGPK map "the mapping's first field MUST be a Version String" (L438). Non-native serializations may interleave with CESR only at top level: "This is NOT true for non-native serializations nested inside CESR groups." Nested ones are wrapped: "a non-native CESR serializations MUST be encoded as a CESR primitive and then enclosed in a special count code for non-native messages" (CESR spec > Interleaved non-CESR serializations, L374-376).

### A failing message tells the sender nothing {#04-no-failure-oracle}

The editor rules [proposal] that for an internet-facing security service the best practice is "to not inform the caller why a given message sent to the service failed" (keripy GitHub > #1580, comment of 2026-08-07, R-021, https://github.com/WebOfTrust/keripy/pull/1580#issuecomment-5221176507), because error detail, and even a crash that forces a restart, is an oracle: "So the approach is to swallow and log all exceptions, not bubble them up." A caller that needs the exceptions, such as one pre-qualifying its own messages, gets a separate wrapper. This describes keripy's design in Sam's words; the parser was not re-read for it. Granular error responses from a public-facing KERI parser would build the oracle the rule denies.

## 11. SAID — the content-address that lives inside its own content {#04-said}

A SAID is "a special type of content-addressable identifier based on an encoded cryptographic digest that is self-referential" (CESR spec > SAID, L1178). Derivation fills the SAID field with `#` characters (not a Base64 character) to the digest's full encoded length, digests the serialization with the algorithm the code names, and writes the encoding back; verification repeats this and compares (CESR spec > Generation and Verification Protocols, L1197-1199). Because the encoded digest has the length of the fill, no offset moves. [code] keripy's `Saider` does exactly this and fails closed on any exception (keripy core/coring.py, L3875-3982 @`b8f60166b`). [Chapter 05, section 2](#05-saids) carries SAIDs in ACDCs.

A SAID is a CESR primitive with a derivation code (L1180, L1190), so digest agility applies to content addresses. [spec-next] `v1.1` refuses a code for a digest of a post-quantum public key because it "would mix the semantics of a Primitive's use with the semantics of its cryptographic algorithm" (CESR spec v1.1 > Post-Quantum Cryptographic Primitives, L1559 @`65fd7518b`): the code names the algorithm, the context names the role.

Field order is insertion order. "The crucial consideration in SAID generation is reproducibility. This requires the ordering and sizing of fields in the serialization to be fixed" (L1240), and lexicographic ordering "often results in oddly-labeled fields that are so named merely to ensure that the lexicographic ordering matches a given logical ordering" (L1246). Modern languages preserve insertion order, so "there is no need for any canonical serialization but natural insertion order" (L1250). Assuming JOSE-style canonicalization is wrong at the wire, and a reordering cleanup changes every SAID.

## 12. Why the encoding is an external interop contract — and the highest-risk surfaces {#04-interop-risks}

keripy's tests test keripy, not the contract. KERIA, signify-ts and every conforming stack must agree byte for byte: "a change that passes keripy's own tests but diverges from the spec/wire format is a defect, because it silently breaks interop. CESR code-table entries and sizing, field names and order, SAID derivation, version strings, and count codes are external contracts" (00-lens.md, claim 5, L54-57). That file is marked "STATUS: DRAFT — needs Daniel's endorsement", so its claims are one contributor's distillation, and the specification text each cites is the firmer footing. The surfaces to probe first:

1. Sizing arithmetic (`Matter.Sizes`, `_infil`, `_rawSize`, `composable`): the double-modulo pad, `cs % 4 != 3`, `fs % 4 == 0`, and `*3//4` before `- ls`. A wrong entry desyncs every later primitive silently. The knowledge base calls it "the highest-risk surface in the flagship" (00-lens.md, claim 8, L81).
2. Shadow-table completeness when adding a code ([section 5.5](#04-shadow-tables)).
3. The genus/version override position (CESR spec > Universal genus/version override, L816-818). Honoring it elsewhere, or emitting it out of position, is a table-selection confusion and a downgrade vector.
4. Version-string parsing: base-64 numbers, not Base64 strings, and the 19- versus 17-character spans (L1146). A lenient regex reads the wrong length.
5. Cold-start tritets: a parser that mishandles `000` or `111`, or interleaves non-native messages below top level, cannot resynchronize (CESR spec, L411-427).
6. Additive-code asymmetry: a design that makes old parsers silently accept an unknown code smuggles a downgrade; the correct behavior is a clean version-gated reject (L618-622).
7. No post-quantum signature can enter an indexed group. The indexed table at `v1.1` (L1109-1131) and on `main` holds only Ed25519, secp256k1 and Ed448 forms, so KERI's indexed groups — controller, witness, transferable — cannot carry an FN-DSA, ML-DSA or SLH-DSA signature, and a post-quantum signature cannot take part in a multisig or a witness receipt. The specification tracks it as issue 171.
8. Indexed signatures switch codes at index 63 (`Ed25519_Crt_Sig` to `Ed25519_Big_Crt_Sig`), and a consumer without the big codes rejects large multisig groups (31-landmines.md, landmine L14, verified at keripy `60ab9e08d`).
9. v2 `-N` has two meanings ([section 7.1](#04-receipts-retired)). A group whose code means different things to producer and consumer may be parsed wrongly rather than rejected (unverified: no parser was run on one). It is latent, and keripy's emitter can frame a group its own parser cannot read.
10. Sequence numbers are hex. [code] signify-ts at `ffba8406e` built a source-seal `Seqner` from `new Seqner({ sn: parseInt(seal[1].s) })` (signify-ts src/keri/core/eventing.ts, L432), reading hex as decimal, and at `5a174b545` reads `new Seqner({ snh: seal[1].s }).qb64b` (signify-ts eventing.ts, L430; signify-ts#417). The bad attachment would have been well-framed, so framing could not flag it: valid CESR can still be wrong.
11. The Ed448 seed code is a byte short. Both branches define `K`, "Seed of Ed448 private key", with 76 text characters, which holds 56 raw bytes (CESR spec, L961 @`bad6edd84`; L969 @`65fd7518b`). The editor accepts that the key is 57 bytes: "The cryptography library has the raw size of both private and public keys at 57 bytes" (CESR spec GitHub > #175, comment of 2026-09-01, R-020, https://github.com/trustoverip/kswg-cesr-specification/issues/175#issuecomment-5497714395) [proposal]. A 57-byte value has pad size 0 and cannot take a one-character code, so the repair is a new four-character code; until then an implementation that puts an Ed448 seed under `K` truncates it or stores something else. The issue is open.

### Well-established versus contested {#04-established-vs-contested}

Established in specification and code: composability, 24-bit alignment, mid-padding, stable framing, quadlet counts, the genus/version format and scope, the version strings, and the eight-tritet cold start. Open: the op-code table (`_`) is reserved and unspecified (CESR L628, L948), some large-variable and context tables are not fully populated, and post-quantum codes are absent on `main` and contested on `v1.1`. Two source typos are not doctrine: the `6A` text says "pad size of 0" beside two lead bytes (L553), and a `-S#####` code lacks a leading `-` (L926).

#### The load-bearing assumption {#04-load-bearing-assumption}

Crypto agility holds because sizing is a pure function of the code and a new code takes a slot whose size class no existing parser depends on. It is "a disciplined additive extension that old parsers reject cleanly and new parsers accept," resting entirely on exact sizing math (CESR spec > Protocol genus/version codes, L618-622; 00-lens.md, claim 8). The fork's parser ([section 5.7](#04-pq-in-practice)) is evidence that the assumption holds in practice [proposal].

## Sources {#04-sources}

- 00-lens.md — keripy-knowledge load-bearing claims, a file in keripy-knowledge (see that entry), 00-lens.md, @`9489ac9bd` (2026-07-02). Mined in raw/08.
- 30-invariants.md — keripy-knowledge invariants, a file in keripy-knowledge (see that entry), 30-invariants.md, @`9489ac9bd` (2026-07-02). Mined in raw/08.
- 31-landmines.md — keripy-knowledge landmines, a file in keripy-knowledge (see that entry), 31-landmines.md, @`9489ac9bd` (2026-07-02). Mined in raw/08.
- CESR spec — Composable Event Streaming Representation (CESR) specification, Trust Over IP. trustoverip/kswg-cesr-specification, spec/spec-body.md. main @`bad6edd84` (2026-08-28) for unmarked and [spec] claims; v1.1 @`65fd7518b` (2026-08-26) for [spec-next] claims. The two branches are not ancestor and descendant (their merge base is `7a6adca67`), and nothing read this month states an intent to merge, so [spec-next] text here is likely-but-not-certain future normative text. The earlier pin `d35125e61` is reachable from no ref ([section 5.7](#04-pq-in-practice)). Mined in raw/02.
- CESR spec GitHub — Sam Smith's comments in trustoverip/kswg-cesr-specification conversations: pull request #165 (comments of 2026-03-18 and 2026-03-19, R-017, R-018, R-019) and issue #175 (comments of 2026-09-01, R-020; issue open on 2026-10-14). Read from the read-only API cache of 2026-10-14 (`.ignored/sam-rulings-cache/`), quotes checked against the cached text. An editor's comment is [proposal] unless the text at a spec pin carries it, and each use here says which. Mined in raw/21.
- keripy — keripy, the KERI reference implementation, WebOfTrust/keripy, src/keri. main @`b8f60166b` (2026-09-14, `__version__` `2.1.0-dev1`) for every [code] claim not stamped otherwise. main @`80f77b73b` (2026-10-01, still `2.1.0-dev1`) for `specialExchange` in [section 8](#04-genus-version), the count-code and seal claims in [section 7](#04-count-codes) and [section 7.1](#04-receipts-retired), and the unknown-code handling in [section 5.3](#04-unused-slot-agility). keripy `main` is not what KERIA runs: KERIA pins `keri==1.2.14` ([chapter 07, section 12](#07-main-not-deployed)), so a keripy-main claim is not evidence about a KERIA deployment. Mined in raw/09.
- keripy GitHub — Sam Smith's comments in WebOfTrust/keripy conversations: pull requests #1441 (2026-06-22, R-022), #1519 (2026-07-23, R-002) and #1580 (2026-08-07, R-021), and issue #1450 (body of 2026-06-23, R-009). Read from the read-only API cache of 2026-10-14 (`.ignored/sam-rulings-cache/`), quotes checked against the cached text. [proposal] throughout. Mined in raw/21.
- keripy-knowledge — keripy-knowledge, a distilled contributor knowledge base for keripy, on the orphan branch knowledge of dhh1128/keripy, @`9489ac9bd` (2026-07-02). Its declared code baseline is keripy `60ab9e08d`, 493 commits behind `b8f60166b`; its sizing invariants and shadow-table discipline are used here as rules, not as claims about current keripy behavior. Its banner that all twenty landmines are still present does not hold without qualification, since two are stale (raw/08 F-08H). Mined in raw/08.
- kswg-cesr-specification#178 — trustoverip/kswg-cesr-specification pull request #178, https://github.com/trustoverip/kswg-cesr-specification/pull/178, opened 2026-09-22 by Kor Dwarshuis from branch revert-165-pq, single commit `487fab701`; state read 2026-10-03 (open, unmerged, unreviewed). No raw note mines it.
- PLAN.md — keripy-knowledge plan, a file in keripy-knowledge (see that entry), PLAN.md, @`9489ac9bd` (2026-07-02). Mined in raw/08. Read only in part (the section 7 effort table and the section 9 open decisions).
- signify-ts — signify-ts, the TypeScript Signify client, WebOfTrust/signify-ts, src. main @`ffba8406e` (2026-09-10) for the absence of post-quantum codes in [section 5.7](#04-pq-in-practice) and the pre-fix `messagize` in item 10 of [section 12](#04-interop-risks); main @`5a174b545` (2026-09-16) for the fixed `messagize`. Mined in raw/10.
- signify-ts fork — Daniel Hardman's fork of signify-ts, dhh1128/signify-ts, branch feat/cesr-pq-codes, @`4ed767b49` (2026-09-05). Code on an unmerged personal fork, and therefore [proposal]: no implementation anyone else runs behaves this way. The chapter's doctrine does not depend on it. Mined in raw/10.
- signify-ts#417 — WebOfTrust/signify-ts#417, the change that made `messagize` read the source-seal sequence number as hex. Mined in raw/10 (section 11c).

---

# 05 — ACDC and Verifiable Data {#05-acdc}

## Thesis {#05-thesis}

An Authentic Chained Data Container (ACDC) is not a credential format in the W3C-VC or SD-JWT sense. It is a fragment of a distributed property graph whose nodes commit to their own content by SAID, whose edges are typed and carry operators, and whose authority is bound not to a signing key but to an issuer's key state anchored in a KEL.

Its goal is not data privacy as such but "the more general goal of protection from the unpermissioned exploitation of data" (ACDC spec > Disclosure Mechanisms, L1659). A critique that measures ACDC against a pure-privacy or pure-ZK yardstick measures the wrong thing.

## Status {#05-status}

Markers are load-bearing in the edge operators, where the specification's branches, keripy's two evaluators and the discussions disagree. Registrar and Observer are unbuilt, and bulk issuance sits in an annex of undeclared force.

## 1. What an ACDC fundamentally is {#05-what-an-acdc-is}

An ACDC is an ordered nested field map, serializable in JSON, CBOR, MGPK or CESR, and "One important feature of the fields maps used by ACDC is that they all MUST include a field with a SAID" (ACDC spec > ACDC Message Fields, L2982). It has no type field, because "the Schema, `s`, field itself is the type field" (ACDC spec > Type-is-schema, L182). Field maps are insertion-ordered, never lexicographic (ACDC spec > Ordered Nested Field Maps, L10), which answers the JSON canonicalization fragility of [chapter 07, section 6.4](#07-json-canonicalization).

### Top-level field order (MUST) {#05-field-order}

The order is `[v, t, d, u, i, rd, s, a, A, e, r]` (ACDC spec > Field Ordering, L32), the required fields `[v, d, i, s]` (L36), and an ACDC MUST NOT have both a non-empty `a` and a non-empty `A` (L106, L110).

#### Field label restrictions {#05-field-label-restrictions}

[spec-next] Only `v1.1` @`2362e48a1` constrains labels: "A field label in an ACDC MUST NOT, therefore, contain the character `-`" (ACDC spec > Field Label Restrictions, L63 @`2362e48a1`), because a compact disclosure path replaces `/` with `-`, and a lone `_` is reserved for an edge hop (L65). `v1.1` says nothing about already-issued ACDCs that break these rules; that is the open question. The disclosure path is a negotiation construct, not an ACDC field ([chapter 08, section 4](#08-disclosure-paths)).

## 2. SAIDs and SAIDification {#05-saids}

"A digital signature on a SAID makes a verifiable cryptographic non-repudiable commitment that is equivalent to a commitment on the full serialization of the associated block from which the SAID was derived" (ACDC spec > SAID Fields, L81). Nested SAIDs let one top-level commitment bind a tree.

[code] keripy pads the id field with `#` to the digest's size (`sad[label] = Dummy * Matter.Sizes[code].fs`, keripy `core/coring.py`, `Saider._derive`, L4085), digests, and injects the result; `Saider.verify` (L4117-4160) fails closed.

There MUST be one way to compute a compactifiable section's SAID: the most compact form SAID, computed depth-first from leaves to trunk (ACDC spec > Most compact form SAID, L130-151). Its stability under compaction "is essential to Graduated Disclosure" (L136).

A schema's SAID sits in `$id`, whose value MUST be the bare SAID, not a URI (ACDC spec > Schema ID Field Label, L186-210).

### The UUID field as a blinding factor {#05-uuid-blinding}

Without the `u` field, "an adversary may be able to reconstruct the block contents merely from the SAID... and the Schema... using a rainbow or dictionary attack" (ACDC spec > UUID Fields, L89), because schema-allowed values may be far fewer than the digest's strength. So a public compact ACDC "only provides compactness, not privacy" (ACDC spec > Targeted Public-attribute, L501); see [chapter 07, section 10.2](#07-compact-not-private). A top-level `u` makes an ACDC private, and an empty one marks the metadata variant (ACDC spec > ACDC Variants, L120-174). `v1.1` renames the field Unique Entropy (UE) with unchanged substance, so a search of `v1.1` for UUID finds nothing; this chapter quotes `main` and says UUID.

## 3. Static, immutable schema {#05-static-schema}

"dynamic Schema references or dynamic Schema generation mechanisms MUST NOT be used" (ACDC spec > Static Schema, L194). A mutable schema enables a schema revocation attack, "effectively revok[ing] all the ACDCs that use that dynamic Schema reference" (L196), and a semantic malleability attack (L198). Hence "all Schemas MUST be static, i.e., Schemas MUST be SADs and therefore verifiable against their SAIDs" (L200), and dereferencing the `$schema` dialect URI "would be an attack vector" (ACDC spec > Schema dialect, L226). See [chapter 07, section 10.3](#07-schema-dereference).

The `$id` SAID is "the normative determiner" in validation; the semver `version` is "informative" (ACDC spec > Schema Versioning, L230). "Unavailable does not mean insecure or unverifiable. ACDCs MUST be verifiable when available" (ACDC spec > Schema Availability, L242).

## 4. Attribute section `a` vs aggregate section `A` {#05-attribute-vs-aggregate}

The choice between these two disclosure mechanisms fixes at issuance what can ever be disclosed separately.

The attribute section `a` is a labeled field map with reserved labels `d, u, i, dt` (ACDC spec > Attribute Section, L260). An Issuee `i` makes the ACDC Targeted (L312); without one it is "issued 'to whom it may concern'" (L330). Its labels are public, so it supports partial disclosure, a withheld block travelling as its SAID.

The aggregate section's "compact value is an aggregate / AGID (Aggregate ID), NOT a SAID" (ACDC spec > Aggregate Section, L661). It is an array of blinded blocks whose labels live inside them, so order "is not correlated to the actual order" (L694). The AGID is a digest over the list of block SAIDs (L712-747). A partially disclosed block "exposes, at the very least, the labels of other fields in its enclosing block," and a selectively disclosed one does not (L2733).

### The deciding question {#05-deciding-question}

[practice] "Does hiding the field labels or positions buy you anything?" (bakobo/schema `docs/choosing-attribute-vs-aggregate.md`). The same document says "an aggregate can disclose one element with no issuee", which is true of the mechanism and false, at keripy `80f77b73b`, for a registry-backed credential presented through keripy's V2 IPEX ([section 4.1](#05-age-credential)).

[proposal] Sam orders the choice by issuer first: "If two pieces of information have different issuers then they must be in different ACDCs and then a blindable edge enables graduated disclosure." ([keripy conversations > discussion #1550](https://github.com/WebOfTrust/keripy/discussions/1550#discussioncomment-17909785), comment of 2026-08-05, R-034).

The SEDI age credential is the aggregate's natural case: bakobo/schema's `sedi-age` is Sam's Age schema, "reproduced byte for byte" (bakobo/schema `sedi-age/index.md`, L3 @`cfcbdcc7a`), with "blinded boolean blocks for thresholds 13, 14, 15, 16, 18, 21, 40, 62, 65, 67 and 70" (same).

#### Where the aggregate's guarantee stops {#05-aggregate-guarantee-limit}

[spec] "The verifier does still learn how many elements the section has and which were withheld — the count and positions are structural, not blinded" (ACDC spec > Graduated Disclosure, L5051-5053). Hiding cardinality needs chained ACDCs (L2739).

### 4.1 The age credential, the reference implementation, and two findings {#05-age-credential}

Both findings, at keripy `80f77b73b`, come from reading code paths: no keripy test presents an Age credential (keripy `tests/sedi/test_ipex_sedi.py`, L39-50), and the path is `acdc/ipexing.py`, which keripy's CLI does not call ([section 5.1](#05-verifying-ground-truth)).

#### Finding 1: no selective Age presentation through IPEX grant {#05-age-finding-grant}

[code] Age requires `rd` (keripy `tests/sedi/test_sedi.py`, L1180), so it is registry-backed. keripy represents a withheld aggregate element as its SAID (keripy `core/mapping.py`, `Aggor.disclose`, L1899-1900), and for a registry-backed ACDC requires that "Every inspected aggregate entry must be a mapping." (keripy `acdc/ipexing.py`, `_presentationRegistries`, L1458-1460), because "A verifier cannot distinguish an omitted requirement from an undisclosed one using only its digest." (L1414-1415). The node fails and the grant with it (L1508-1512, L610-617). Proving over-21 this way discloses every threshold, including over-40 and over-62, which brackets the age. The rule stops a hidden element concealing a presentation-registry declaration ([chapter 10](10-presentation-registries.md)); no resolution has been proposed.

#### Finding 2: the aggregate issuee is read from a fixed position {#05-age-finding-issuee}

[code] keripy reads an aggregate's issuee "for aggregative ACDC .sad["A"][1]['i']" (keripy `core/serdering.py`, L2830) inside a bare `except` that returns `None` (L2837-2844), and the Age schema does not constrain `A`'s positions (keripy `tests/sedi/test_sedi.py`, L1204-1493). So an Age whose element 1 is withheld or misplaced reads as untargeted, which "lets a holder withhold element 1 and present a targeted credential as an untargeted affidavit" (bakobo/schema `this.i` > `@lkfnoess`, L2144-2147 @`cfcbdcc7a`). On the V2 path Finding 1 closes this hole, but only by also closing selective disclosure.

[proposal] The position is the editor's intent: "The issuee in an ACDC with Agg section (selectively disclosable) is the "i" field in the second (index 1) attribute block." ([keripy conversations > PR #1505](https://github.com/WebOfTrust/keripy/pull/1505#issuecomment-4981932724), comment of 2026-07-15, R-025). Neither branch states it beyond an example (ACDC spec > Aggregate Section > Composed Schema for selectively disclosable Aggregate section > JSON Serialization, L914, L930), so on this chapter's reading a schema must pin element 1 itself.

#### Sam's sparse-Merkle-tree proposal {#05-age-smt-proposal}

[proposal] Discussion [#1098](https://github.com/WebOfTrust/keripy/discussions/1098) proposes instead an SMT whose root is an attribute, with a salted leaf per date on which a predicate holds, so "A proof-of-age is given by an inclusion proof of a given predicate leaf in the SMT." It rejects ZKP predicates on detectability: "a static SMT predicate proof preserves KERI's security properties, whereas a dynamic ZKP predicate proof defeats them." The fixture's booleans go stale — "Over21 True if age>=21 else False" (keripy `tests/sedi/test_sedi.py`, L1385) — and are remedied by reissuance, while dated leaves stay correct; nothing read says which design is the plan.

## 5. Edges, chaining, and the operator families {#05-edges}

The far node is the ACDC whose SAID is in `n` (ACDC spec > Edge Section, L1172); reserved labels are `[d, u, n, s, o, w]` (L1149); and the far node MUST validate against both its own schema and the edge's `s` (L1176).

### The edge schema constraint is enforced {#05-edge-schema-enforced}

[code] The edge `s` "is a schema the far node must" "*satisfy*, not a SAID that must equal the far node's own schema" SAID (keripy `vdr/verifying.py`, `processCredential`, L196-197 @`80f77b73b`, citing keripy issue #1534). A failing far node raises `MissingChainError`, and an uncached schema escrows rather than failing (L195-230).

#### The m-ary operators {#05-m-ary-operators}

Edge-groups take `AND` (default), `OR`, `NAND`, `NOR`, `AVG` and `WAVG` (ACDC spec > Edge Section, L1099-1116). [code] Only `EdgeGroupOps = ("AND", "OR")` exist, in `acdc/ipexing.py` (keripy `acdc/ipexing.py`, `EdgeGroupOps`, L45 @`b8f60166b`; reduction at L1020-1053), with an empty group malformed.

#### The unary operators {#05-unary-operators}

| Op | Spec gloss | Default | Tier |
|---|---|---|---|
| `I2I` | Issuer-To-Issuee: this ACDC's Issuer AID MUST be the Issuee AID of the far node | Yes (targeted far node) | [spec] |
| `NI2I` | Not-Issuer-To-Issuee: no such requirement | Yes (untargeted far node) | [spec] |
| `DI2I` | Delegated-Issuer-To-Issuee: this Issuer MUST be the Issuee AID or a delegated AID of the Issuee | No | [spec] |
| `NOT` | logical NOT — inverts far node validity | No | [spec] |
| `E1E` | IssueE-To-IssueE: "The Issuee AID of this ACDC MUST be the Issuee AID of the node this Edge points to" | No | [spec-next], [code] |

#### E1E, the fifth unary operator {#05-e1e}

[spec-next] `E1E` is in `v1.1` (ACDC spec > Edge, L1206 @`2362e48a1`) and not `main`. "This is an identity relation on the two ACDCs' Issuees and places no constraint on either ACDC's Issuer" (L1206): where `I2I` and `DI2I` bind this Issuer to the far Issuee, `E1E` binds the two Issuees, for one subject holding credentials from different issuers, "a relationship the delegative `I2I` Operator cannot express" (L1223). Sam proposed it in keripy discussion [#1515](https://github.com/WebOfTrust/keripy/discussions/1515), keripy implemented it, and `v1.1` then defined it.

[proposal] He later proposed `I1I` and a delegated `DI1I`: "the leaf edge to the core is both E1E and I1I  that is issuee is issuee and issuer is issuer." (keripy discussion #1515, comment of 2026-10-01). Neither is implemented at `80f77b73b`, so an `I1I` edge is given the default by `vdr/verifying.py` and rejected by `acdc/ipexing.py`.

#### The default operator {#05-default-gate}

[spec] A targeted far node defaults to `I2I` and an untargeted one to `NI2I`, and in a list "the latest Operator... in the list takes precedence" (L1186). On `main` @`f0bd097de` L1197 the default fires unless `o` includes "any of the `I2I`, `NI2I` or `DI2I` Operators"; `v1.1` @`2362e48a1` L1209 adds `E1E` to that list. Under `main`'s gate an `E1E`-only edge would gain a delegative `I2I`; keripy follows `v1.1`.

[proposal] The default is to change: "The change of default is to land in v1.1 of the ACDC spec." ([ACDC spec conversations > issue #205](https://github.com/trustoverip/kswg-acdc-specification/issues/205#issuecomment-5268897690), comment of 2026-08-12, R-030), the new default being `NI2I`, because "most of the vLEIs in the wild depend on the default to `I2I`" (same). Neither `v1.1` nor keripy carries it yet; once it lands, a validator must read an ACDC's version before an operator-less edge.

#### How far `DI2I` reaches {#05-di2i-depth}

[proposal] The specification's `DI2I` admits "any delegated AIDs of the Issuee of the node to which the Edge points" (ACDC spec > Edge Section, L1209) without saying how deep. Sam rules any depth, bounded by the delegated AIDs' `DND` and `DID` traits ([chapter 03, section 8](#03-config-traits)): "This is how we are safe, not by interpreting the `DI2I` operator as only being for children not grandchildren." ([keripy conversations > PR #1564](https://github.com/WebOfTrust/keripy/pull/1564#issuecomment-5158683549), comment of 2026-08-02, R-015). His earlier comment on the same PR agreeing to "limit DI2I to one layer children not all the way down" ([keripy conversations > PR #1564](https://github.com/WebOfTrust/keripy/pull/1564#issuecomment-5137135970), comment of 2026-07-30, R-015) is withdrawn, but neither branch says so, and keripy evaluates `DI2I` at no depth.

### 5.1 verifying.py ground truth — gloss versus enforced behavior {#05-verifying-ground-truth}

`Verifier.verifyChain` (keripy `vdr/verifying.py`) is what the CLI runs.

- Five operators are recognized: `UnaryOps = ('I2I', 'NI2I', 'DI2I', 'E1E', 'NOT')` (keripy `vdr/verifying.py`, `UnaryOps`, L43). The unimplemented ones are listed "so they fail closed diagnosably instead of being dropped and silently defaulting" (L38-39 @`b8f60166b`).
- In a list, the delegative operators `I2I`, `NI2I` and `DI2I` are exclusive and the latest wins (L436), while "E1E constrains the near issuee instead, so it does not conflict with them and composes (AND)" (L431). Unknown tokens are dropped (L435).
- If nothing recognized remains, the default is silently inferred: `op = 'I2I' if creder.iseaid is not None else 'NI2I'` (L443), reading an aggregate far node's issuee at the fixed position of [section 4.1](#05-age-credential).
- `I2I` is plain string equality: `if op == 'I2I' and issuer != farIssuee: return None` (L481). A multi-hop chain of authority is an emergent property of the edge walk, not of an operator.
- `E1E` is enforced ahead of the standardizing branch: `if farIssuee is None or issuee is None or issuee != farIssuee: return None` (L457-466). Its code comment calling `E1E` normative on `v1.1` (L40-41) was written by the corpus's author, so the marker rests on the specification text.
- `DI2I` and `NOT` fail closed: each raises `ValidationError` (L449, L453-455), because a `MissingChainError` would escrow and "escrowing would promise a retry that can never succeed" (L445 @`b8f60166b`). Older notes describing a `NotImplementedError` crash predate this; every prose account of `DI2I` behavior, including the Dossier's `operators-ref` table, still has no machine behind it.
- `NI2I` skips the binding by construction and requires only that the far node be issued.

#### Chain revocation propagates {#05-chain-revocation}

A revoked far node raises `RevokedChainError` (keripy `vdr/verifying.py`, L178-180 @`b8f60166b`).

#### A second implementation, and its scoping caveat {#05-second-implementation}

keripy's `acdc/ipexing.py` holds the m-ary operators, the closed-DAG walk and per-node issuer authentication, but its `loadHandlers` (L2149-2167) has no caller in `src/keri`; keripy's commands load V1 from `vc/protocoling.py`. A [code] claim sourced to `ipexing.py` is about tested code, not anything a shipped command does. See [chapter 08, section 6](#08-two-ipex).

#### The two modules disagree on three axes {#05-module-disagreement}

- Unrecognized tokens: `vdr/verifying.py` drops them and falls back to the default (L435); `acdc/ipexing.py` fails closed (keripy `acdc/ipexing.py`, L921-922).
- Conflicting delegative operators: one takes the latest (L436), the other conjoins them, so `["I2I", "NI2I"]` is `NI2I` to one and `I2I` to the other.
- An absent `o`: one infers `I2I` or `NI2I` (L443), the other checks nothing (L910-911).

A conformant edge can pass credential processing and fail grant verification; the SEDI fixtures use `["E1E", "NI2I"]`, which both evaluate alike, so tests miss the divergence, and neither branch says what to do with an unrecognized operator. See [chapter 08, section 13](#08-ground-truth).

#### DAG acyclicity is unchecked {#05-dag-acyclicity}

`_walkGraph` (keripy `acdc/ipexing.py`, L780-872) keeps a `seen` set that terminates on a cycle rather than rejecting it, `verifyChain` resolves one hop, and no code in `src/keri` checks for cycles. Assume nothing rejects a cyclic provenance graph.

### 5.2 The same-holder binding pattern {#05-same-holder-binding}

[practice] In a holder-issued presentation, "`I2I` requires the presenter to be the issuee of both source credentials." (bakobo/schema `sedi-present-age-portrait/index.md`, L5), pinned as `"const": "I2I"` (bakobo/schema `sedi-present-age-portrait.schema.json`, L152-153).

Where the state issues both credentials, `I2I` is wrong: "Its required `coreIdentity` edge links to Core with `E1E` and `NI2I`." (bakobo/schema `sedi-age/index.md`, L3 @`cfcbdcc7a`), as Sam's fixture builds it (keripy `tests/sedi/test_sedi.py`, L4360). Choose the operator that states the relation rather than dropping the edge; the older advice in Bakobo's decision record to bind at presentation instead predates `E1E`.

#### The tier caution survives {#05-e1e-tier-caution}

No operator in `main` binds two state-issued credentials about one subject, so a schema that requires `E1E`, as bakobo's `sedi-guardian` `citizen` edge does (bakobo/schema `sedi-guardian.schema.json`, L284, L317), builds on a forward branch; Sam's Age schema leaves the operator unconstrained (keripy `tests/sedi/test_sedi.py`, L1520-1527). The `NI2I` beside `E1E` makes the list mean "same issuee, issuer unconstrained" under either branch's gate.

#### Standing edges as a correlation point {#05-standing-edges}

[proposal] An edge a credential always carries lets verifiers join on the far node's SAID. Sam's answers: "With bulk issuance, each presentation context consisting of discloser and disclosee gets its own set of SEDI credentials and standing edges." ([keripy conversations > discussion #1515](https://github.com/WebOfTrust/keripy/discussions/1515#discussioncomment-17681089), comment of 2026-07-18, R-066), and "an edge can also be blinded, which means that disclosure of the edge itself can be held back" ([keripy conversations > discussion #1515](https://github.com/WebOfTrust/keripy/discussions/1515#discussioncomment-17682012), comment of 2026-07-18, R-066).

## 6. Rules and Ricardian contracts {#05-rules}

The rule section `r` is a Ricardian contract, "both human and machine-readable and referenceable by a cryptographic digest" (ACDC spec > Rule Section, L1239). Rules are terminal with a legal `l` field, rule-groups nest, and reserved labels are `[d, u, l]` (L1265-1300).

[practice] In Bakobo's GCD a verifier "MUST NOT impute a delegator's approval of delegated authority to a delegate without understanding and enforcing the rules of these extra rules." (bakobo/schema `gcd.schema.json`, `a.gfw`, L79).

### Rules are not machine-enforced {#05-rules-not-enforced}

keripy's `Verifier` does not evaluate rules — "disclosure rules not enforced in `Verifier`" (keripy-knowledge `20-crosswalk.md`) — so a rule binds a human or an application policy engine.

## 7. The graduated-disclosure ladder {#05-graduated-disclosure}

Graduated disclosure is "disclose enough to enable more disclosure, which in turn may enable even more disclosure" (ACDC spec > Graduated Disclosure, L1747). The rungs (L1749-1774):

1. Compact — a SAID commitment; compactness, not privacy.
2. Metadata — commits to Issuer, Schema, Edges and Rules of a private ACDC without its SAID, and "When metadata ACDC is disclosed, only Discloser commitments attach, NOT Issuer commitments" (ACDC spec > Metadata ACDC, L168-172).
3. Partial — SAID plus salty nonce.
4. Nested partial — per-block `d` and `u` at different depths (L633).
5. Full.
6. Selective — the aggregate of [section 4](#05-attribute-vs-aggregate).
7. Bulk-issued instances ([section 9](#05-bulk-issuance)).

"All the Graduated Disclosure mechanisms MAY be used in combination" (L1775).

### Worked examples in the standardizing branch {#05-ladder-worked-examples}

[spec] `main`'s annex (@`f0bd097de`, L4988-5098) separates "how an issuer *plans* for disclosure by the way it structures the credential, and how a holder *performs* disclosure at presentation while a verifier checks it" (L4991-4993). "Every disclosure level... verifies to the same top-level SAID, so what the credential commits to never changes as disclosure progresses" (L5095-5098).

Merkle Tree Certificate inclusion proofs share the vocabulary and not the job: "A Merkle inclusion proof establishes placement in a history. A SAID establishes identity of content" (papers `acdc-and-mtc.md` > 3.2 Trees, structure, and meaning).

## 8. Contractually-protected disclosure {#05-contractual-disclosure}

Two mechanisms attach obligations to disclosed data (ACDC spec, L1783-1792).

### Chain-Link Confidentiality (CLC) {#05-chain-link-confidentiality}

The offer discloses metadata and terms, and full disclosure follows agreement, so "the disclosed data has 'strings attached.'" Each Disclosee "in turn, is the Discloser to the next," and terms MUST propagate. [practice] Bakobo's SEDI rule: "This binds each downstream recipient reached through the edge section of a presentation." (bakobo/schema `sedi-id/rules.json`, L3 @`cfcbdcc7a`). Sam's fixtures leave every rule section empty (keripy `tests/sedi/test_sedi.py`, L4381-4393), so that language is Bakobo's, not the specification author's.

#### Contingent Disclosure {#05-contingent-disclosure}

A rule obliges disclosure, by the Discloser or an escrow agent, when a contingency such as breach is met: "Recourse via Full Disclosure of PII is latent... but never realized until the conditions of the contingency is satisfied" (L1792).

Contracts carry weight because "There is no cryptographic mechanism that precludes statistical correlation among a set of colluding Verifiers" (ACDC spec > Bulk-issued, L2785), so unlinkability without contractual protection is "an exercise in diminishing returns". The layered argument is [chapter 06, section 4](#06-layered-privacy).

## 9. Registries and TELs {#05-registries}

A TEL is "a hash-chained data structure of sealed transaction events" anchored in a KEL, so its events are "also securely attributable to the KEL's controller" (ACDC spec > TEL Overview, L1918), and "the verifiability of transaction events in the TEL persists in spite of changes to Key States in the sealing KEL" (L1920). TEL events need no signature, since "the digest in the seal in the KEL is cryptographically equivalent to signing the transaction event itself" (L1946).

### The registry-dependent issuance lifecycle {#05-registry-lifecycle}

[spec] `main` @`f0bd097de` (L4852-4986) walks `rip` → `acm` → `bup` → verify → revoke. "The inception commits to no credential state: it is a vacuous placeholder that reveals nothing about what will later be issued" (L4865-4867), and a credential's SAID "is not known in advance; it is produced by issuance, not assumed" (L4890-4892). In a `bup`, "Only the blinded block's SAID travels in the `bup`; neither the credential SAID nor the word `issued` appears" (L4917-4918), and a later revocation uses an independent nonce. The boundary: "This is confidentiality of registry state, not anonymity of the credential — issuer, registry, and issuance chronology remain linkable, which is the intended, auditable trade-off" (L4983-4985). The lifecycle is Issuer-controlled throughout, with no Issuee-controlled registry, which matters to [chapter 10](10-presentation-registries.md).

#### Revocation is a state, not a deletion {#05-revocation-state}

[code] keripy keeps a revoked credential: "Log this and continue instead of the previous exception so we save a revoked credential" (keripy `vdr/verifying.py`, L129-132), and reads state from the TEL, not a list. `Tever`/`Tevery` implement registries with `vcp`, `iss`/`rev` and `bis`/`brv` events (keripy `vdr/eventing.py`).

### Registrar, Observer, and no phone-home {#05-registrar-observer}

A Registrar under the Issuer publishes the registry; an Observer under the Validators caches it, syncing on state change and not at validation, which "protects against forced validator-to-issuer correlation of ACDC usage, i.e., no forced phone home validation" (ACDC spec > TEL Registrars and TEL Observers, L1693). Running them is [chapter 11](11-infrastructure-and-operations.md).

[architect] Sam calls the split the witness and watcher structure one layer up: "we have witnesses that are controlled by controllers, watchers that are controlled by verifiers. We split the verification between two places. We do the same thing with ACDCs" (KERIConf26 caption, Sam Smith, The Digital Identity Tradespace, 16:48). Observers cache state and detect nothing; detecting a presenter's key compromise is the presentation registry of [chapter 10](10-presentation-registries.md).

#### Bulk updates as a privacy requirement {#05-bulk-updates}

[architect] Batching, a performance note in the specification (L1695), is a privacy requirement: "if you want to make it so that it's not statistically correlatable, you have to do it in a bulk or herd privacy protected way." (KERIConf26 caption, Sam Smith, The Digital Identity Tradespace, 33:14). The residue he names is collusion between a malicious observer and issuer: "There's no technical thing that makes it impossible in this, but what it does is it means that there's no easy way for them to do it" (KERIConf26 caption, Sam Smith, The Digital Identity Tradespace, 34:46).

#### Implementation status of Registrar and Observer {#05-registrar-observer-status}

Neither exists. `keri-foundation/observer` and `keri-foundation/registrar` are placeholders, keripy's `acdc/registraring.py` is a docstring stub, and keripy has no observer. Beneath them, keripy implements the blindable `bup`, `BlindState` (keripy `core/structing.py`; `acdc/messaging.py`, `blindate()`), and the `RegBaser`/`WebRegBaser` stores. Nothing specifies the Observer protocol, discovery, or batch window, so "the Observer handles that" is not an answer.

### Binding ACDC state to issuer key state {#05-key-state-binding}

ACDCs are "not directly signed by the Issuer... bound to the Issuer's Key State... and the Issuer's Key State is signed. This enables the Key State of the Issuer to change independently of the ACDC state" (ACDC spec > Binding to Key State, L1673). Validity is judged "AS OF its KEL anchor's sequence position, not current key state or wall-clock" (keripy-knowledge `30-invariants.md` > H1; `Tever.verifyAnchor`), the defense against [chapter 07, section 11](#07-retrograde-attack)'s retrograde attack.

[spec] The Dossier specification puts it for outsiders: "The signature exists on the anchoring key event, not on the dossier" (Dossier spec > How a Dossier Is Issued: Anchoring, Not Attached Signatures, L27-28). The partition is by lifespan: a token bears a signature "because its lifetime is measured in seconds and it is never expected to outlive a key rotation" (L473), and an ephemeral dossier MAY too. So the accurate rule is not that ACDCs are never signed but that nothing expected to outlive a rotation is authenticated by an attached signature.

#### Recon hypothesis: anchors not re-verified on presentation {#05-verifyanchor-hypothesis}

Open at keripy `60ab9e08d` and not re-examined since (landmine L15, high severity, medium confidence): recon "found no call to `Tever.verifyAnchor`" in `processCredential`, so "a credential presented with a forged `(seqner, saider)` proof could pass schema + TEL-state checks without the anchor being confirmed against the issuer's actual KEL at that sn — undermining invariant H1" (keripy-knowledge `31-landmines.md` > L15). Confirm that the ingest path ran `verifyAnchor`.

### Blindable state (BLID) {#05-blindable-state}

A blinded state block `[d, u, td, ts]` takes `u` from an Issuer–Discloser shared salt keyed by sequence number, so "an observer cannot correlate state to event updates" (ACDC spec > Blinded State Disclosure, L2043-2135). Placeholder updates and blind updates after revocation "decorrelate the time of revocation" (L2324).

#### `upd` is deprecated and still specified {#05-upd-deprecated}

[proposal] "We are going to drop support for `upd` in v1.1" ([keripy conversations > PR #1612](https://github.com/WebOfTrust/keripy/pull/1612#issuecomment-5259378594), comment of 2026-08-11, R-036), because "a blindable update can be unblinded by merely attaching the unblinded attribute block." ([keripy conversations > discussion #1566](https://github.com/WebOfTrust/keripy/discussions/1566#discussioncomment-17846317), comment of 2026-07-30, R-036). Both branches still define it (ACDC spec > Registry Message Types and Fields, L2161 @`2362e48a1`). [code] keripy's V2 TEL "only supports registry inception and blind updates" (keripy `acdc/regeventing.py`, L121), while `acdc/messaging.py` still builds `upd` (L78-104).

#### Registry transfer, approved and unspecified {#05-registry-transfer}

[proposal] An `xfr` event would move control "from the issuer AID defined in the `rip` to a new controller issuer defined in the `xfr`", and "This event must doubly anchored." ([keripy conversations > discussion #1566](https://github.com/WebOfTrust/keripy/discussions/1566#discussioncomment-17846317), comment of 2026-07-30, R-037); "I already discussed `xfr` with the community and got approval. so was planning to add it to ACDC v1.1." ([keripy conversations > discussion #1566](https://github.com/WebOfTrust/keripy/discussions/1566#discussioncomment-17856451), comment of 2026-07-31, R-037). Neither branch nor keripy has either, and which two logs carry the anchor is unstated; until then a registry's incepting issuer controls it for life.

#### TEL anchors follow first-seen {#05-tel-anchor-first-seen}

[proposal] "anchoring TEL events should follow the idempotent first seen rule used for KEL events." ([keripy conversations > PR #1612](https://github.com/WebOfTrust/keripy/pull/1612#issuecomment-5373529636), comment of 2026-08-21, R-038). [code] keripy's `putAnchor` keeps "the earliest verified sealing event for this TEL event" by sequence number (keripy `acdc/registering.py`, `putAnchor`, L58-64), which picks a different anchor from Sam's rule when a later seal is verified first; that case is untested.

### Bulk issuance {#05-bulk-issuance}

A holder gets copies of one credential, each to a different AID, so contexts cannot be joined through it (ACDC spec > Annex > Bulk-issued Private ACDCs, L2765); see [chapter 12, section 8](#12-bulk-issuance-privacy).

#### What landed, and its status {#05-bulk-landed}

[spec] Each member's blinding factor comes from one shared salt on a path that "is therefore `k.`, that is, the textual representation of the index `k`" (ACDC spec > Annex > Bulk-issued Private ACDCs > Basic Bulk Issuance Procedure, L2811), over qb64 operands, with Blake3-256 unless negotiated otherwise (L2818). [proposal] Every bulk MUST sits under `## Annex`, whose force neither branch declares, and Sam wants it moved: "For the v1.1 spec I would think we will want to move Bulk issuance from the annex so as to be normative." ([ACDC spec conversations > PR #204](https://github.com/trustoverip/kswg-acdc-specification/pull/204#issuecomment-5273991502), comment of 2026-08-12, R-045). It has not moved.

#### Independent registries: pre-created, not derived {#05-bulk-independent-registries}

[proposal] The specification does not say how a bulk set's registries are made (`main` L2897). Pre-created `rip`s with a salty `u` mean "This enables the Issuer to fully decorrelate the registry state updates from any data in the ACDC.", at the cost that "The `rd` field value is not derivable from the salt with a path." ([keripy conversations > PR #1576](https://github.com/WebOfTrust/keripy/pull/1576#issuecomment-5195334135), comment of 2026-08-05, R-040); SEDI chose that, and "The State would only update registries in bulk." (same, R-041). Deriving each registry's blinding factor from the bulk salt is proposed, with the path unsettled among `k.s`, `k.` and `k|` ([ACDC spec conversations > PR #204](https://github.com/trustoverip/kswg-acdc-specification/pull/204#pullrequestreview-4922214480), review of 2026-08-13, R-044).

#### Revocation is universal across the set {#05-bulk-revocation}

[proposal] "In a bulk issued set this means that all members of the set MUST be revoked." ([keripy conversations > discussion #1574](https://github.com/WebOfTrust/keripy/discussions/1574#discussioncomment-17938568), comment of 2026-08-07, R-042). A compromised key is handled by rotation, because "if the keys get compromised then the keystate is changed not the ACDC state." (same); a compromised shared salt means "the whole set has to be abandoned." (same).

## 10. IPEX — the issuance and presentation exchange {#05-ipex}

"The difference between exchange types is the information disclosed, not the mechanism" (L1797), in a non-normative section (L1795). Routes, keripy's two state machines and spurn are [chapter 08, section 6](#08-two-ipex). A commitment to any variant commits to the top-level sections of all variants, and "A commitment to the top-level SAID of the compact version... is equivalent to a commitment to the hash tree root," so the Issuer MUST sign or seal the most compact SAID (ACDC spec > Issuer Commitment Rules, L1843).

### Bespoke and disclosure-specific ACDCs {#05-bespoke-acdcs}

A Discloser may issue its own ACDC that edges to another and names the Disclosee as Issuee, attaching obligations "without requiring any new tooling" (ACDC spec, L1860). [practice] "Bespoke" "names an ISSUANCE PATTERN, not a credential TYPE" (bakobo/schema `this.i` > `@sdp3wk`, L1950-1960 @`cfcbdcc7a`). See [chapter 08, section 3](#08-bespoke-origin).

## 11. Real-world credential patterns and what schemas enforce {#05-applied-patterns}

### vLEI {#05-vlei}

[practice] vLEI (ISO 17442-3) chains GLEIF to QVIs to legal entities to roles with edges that const-pin far-node schemas (public-schema `vLEI/acdc/legal-entity-vLEI-credential.json`, L99; `ecr-authorization-vlei-credential.json`, L114). "A verifier receiving an employee's credential can traverse the chain back to GLEIF without consulting a trust registry." (papers `acdc-vc-diff.md` > Real-World Validation).

#### Telco schemas stopped pinning far-node schemas {#05-telco-unpinned}

[practice] Provenant's telco edges no longer pin (commit `2c8e834e2`): tn-alloc's `issuer` edge is "Intentionally generic — does not constrain the schema of the identity credential." (public-schema `tn-alloc/index.md` > Edge structure, L51). Since keripy still checks whatever `s` an edge carries ([section 5](#05-edge-schema-enforced)), on this chapter's reading restricting `s` moved from schema to verifier policy.

#### SEDI {#05-sedi}

[practice] "The state endorses an identity; it does not create one." (bakobo/schema `sedi-id/index.md` > Purpose, L15-17 @`cfcbdcc7a`). Its state-issued credentials are Sam's IAR, Core, Residence and Age; the others "are Bakobo profiles for the November SEDI Summit; they are not Sam's schemas or statements of Utah policy." (bakobo/schema `README.md` > Status, L65). The older `sedi-id`, with its four attributes, is "Superseded for new issuance" (bakobo/schema `sedi-id/index.md`, L3). Statute and governance are [chapter 06, section 3](#06-sedi).

Core requires an unblinded boolean `primary` (bakobo/schema `sedi-core.schema.json`, `a.required`, L67-81) that cannot be withheld while `a` is expanded (keripy `tests/sedi/test_sedi.py`, L587). Residence is separate because "a single residence block would force over-disclosure on every verifier who only needs jurisdiction." (bakobo/schema `sedi-id/index.md`, L70-71), and the image is "Facial Image Proof Value as SAID of typed media block" (bakobo/schema `sedi-core.schema.json`, L293), a commitment rather than a locator. Whether `legalPresenceStatus` is an endorsed attribute conflicts with the governance artifact's `noOverAssertion` clause, unresolved (`raw/11` section 9 item 3).

#### The Utah delegation chain {#05-utah-delegation-chain}

The Utah chain, "Root AID -> Org Unit (division/department/program) -> Issuing Agent" (keripy `tests/sedi/test_sedi.py`, L3165-3166), is a chain of credentials, not KERI delegation: every AID is made with `incept`, and the file has no `delcept` or `dip`. Each credential edges to its issuer's with `"o": "I2I"` (L3598-3605, L3997-4004), and leaves reach the chain through Core. The two meanings of delegation are [chapter 13, section 2](#13-two-delegations). The fixture's "SEDI AID Replace Schema" (L200) replaces an AID by credential for a holder who has lost control of it,; when it is preferred to rotation is unstated.

[practice] Bakobo's `sedi-guardian` names the guardian as issuee and the ward in a separately disclosable block, with "There is no guardian-to-ward edge." (bakobo/schema `sedi-guardian/index.md`, L3), and `rd` "MANDATORY; guardianship terminates dynamically" (bakobo/schema `sedi-guardian.schema.json`, L43).

#### GCD {#05-gcd}

[practice] Bakobo's GCD 3.1.0 is a delegation credential that does not require KEL delegation: "A GCD credential is a standard targeted ACDC; its authorization and constraint mechanics do not depend on the issuee being KEL-anchored to the issuer." (bakobo/schema `gcd/index.md` > Purpose, L9). public-schema's GCD page still carries an older version. GCD requires `rd` because "a GCD is authority evidence, so secure discovery of its revocation registry wins here." (bakobo/schema `gcd/index.md` > Schema, L37-40). Its `constraints` container is `"additionalProperties": true` (bakobo/schema `gcd.schema.json`, L130) and fail-closed by the verifier's duty: "This container remains FAIL-CLOSED, but the obligation runs to the verifier, not to schema validation" (L128). GCD says "these credentials do not support graduated disclosure. All constraints must be disclosed every time a verifier is evaluating delegated authority" (bakobo/schema `gcd/index.md`, L86), since partial disclosure would loosen the gate. The authority model is [chapter 13](13-authority-authorization-and-agents.md).

#### The Dossier {#05-dossier}

A Dossier's issuer attests composition by anchoring: "The issuer does not necessarily attest to the veracity of the claims within the evidence, but rather to the integrity and composition of the collection itself" (Dossier spec > The Role of the Issuer, L83). Joint issuance uses weighted thresholds (`MxN`, `RMxN`, `MxQ`, `RMxQ`) in an edge-group's `o` and "relies on logic within the ACDC layer," not multisig. The normative schema SAIDs are `EKuLzS_oN_mIao5og1NOujtF2QMXloiMCZP7xuAR5tY7` (base) and `ECRjgun8t3cay_YBiVxEY-qXKCz37oUrvE5GvmySwxCh` (endorsement); anything naming the earlier `ECpZgR2Y…` or `EAfn0gRM…` no longer resolves. Foreign material needs a wrapper ACDC: "Direct reference to non-ACDC material without a wrapper is NOT RECOMMENDED." See [chapter 07, section 10.4](#07-foreign-credentials).

[practice] Provenant's dossier base (`$id` `EHxI61CGs7FRuStz8P6QWJyMK4u2bGH1LQqIXsA4bT7q`) says "A dossier SHOULD NOT include an issuee; all evidence MUST be carried in e, never in a." (public-schema `dossier-base/dossier-base.schema.json`, L5) and "When phase transitions, a new dossier version SHOULD be issued." (L127). bakobo/schema publishes a third base (`EFf_1u…`).

#### The negative corpus {#05-negative-corpus}

[practice] bakobo/schema's CI rejects, among others, a GCD without `rd` or a `validUntil` backstop, a block missing its blinding nonce, and a presentation with a non-`I2I` operator or without `rd`; an unknown key in GCD's `constraints` is valid (bakobo/schema `gcd/index.md`, L143-144).

## 12. What ACDC corrects, and what remains uncertain {#05-corrections-and-uncertainty}

### Where ACDC corrects outsider priors {#05-outsider-priors}

ACDC's text rejects signing credentials directly (L1675), phone-home revocation (L1693), dynamic schemas (L194), compact-as-private (L501), bundled multi-claim credentials, which a graph of ACDCs refactors, "obviating the need for Selective Disclosure," (L2739), centralized namespace registries (L2936), over-investment in unlinkability (L2785), and privacy as the end goal (L1659).

### Where the ground truth is softer than the prose {#05-softer-ground-truth}

The gaps in sections 4.1 and 5.1 are implementation maturity on keripy's 2.1-dev line, not protocol defects: ACDC's constraints "are constraints of *youth*, not of *architecture*" (papers `wtbo.md` > 6. The Transition Problem: A Comparison of Trajectories). The age-credential collision may be the exception: two deliberate rules meet — hide nothing that could conceal a presentation-registry declaration, and disclose one threshold without the others — and resolving it may take a design decision rather than code. Nobody read has said which.

## Sources {#05-sources}

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

---

# 06 — Governance, Ecosystems and Interop {#06-governance}

## Thesis {#06-thesis}

KERI separates two kinds of trust decision. Cryptographic verification — signatures, SAIDs, hash-chain consistency, anchor-position validity — is universal, mechanical, and answerable by anyone with no authority in the loop. Ecosystem-defined behavior — what a credential means, which chain is valid, whether an issuer is fit, what a recipient may do with disclosed data — is semantic and governed by people or policy. An Ecosystem Governance Framework (EGF) lives entirely on the second side. Because verification depends on no governance body or registry, governance can only publish rules participants opt into, never become a new root of trust. A critique that faults KERI for "not preventing correlation" or "still needing governance" is usually attacking the wrong layer: KERI's core promises key-state continuity and duplicity evidence, not unlinkability or semantic agreement.

## Status {#06-status}

Sections 6 and 7 turn on markers: CESR and KERI `main` are [spec]; their divergent `v1.1` branches are [spec-next], not to be promoted on the expectation of a merge; code on an unmerged personal fork is [proposal]. SEDI rests on enacted Utah law, which carries no marker, on Sam Smith's slides and comments [proposal], and on two diverged forks of the applied schema corpus [practice], so every schema citation names its fork.

## 1. What an EGF is, and the two-layer verification split {#06-egf-two-layer}

The Dossier specification states the split. Layer 1, cryptographic validation, means "confirming anchors, SAIDs, and KEL consistency" and "is universal and defined by this specification." Layer 2, semantic validation, "is necessarily application-specific and requires context-dependent business logic" (Dossier spec > Dossier Data Model (Normative) > Base JSON-Schema Definition, L127 @b9227753c): a generic verifier "can verify that an edge labeled 'lunarPropertyDeed' is cryptographically linked, but it cannot know what that means or how to process it." Layer 1 confirms anchoring, not an issuer signature, which a dossier does not carry (raw/04 section 1A). An EGF supplies one ecosystem's Layer-2 rules: blessed schemas, issuer fitness, chain validity, obligations on disclosed data. The ACDC specification defers such behavior rather than defining it: edge-operator "validity logic is EGF-dependent" (ACDC spec > Edge Section, L1112-1116), and a type registry collapses to "merely Schema discovery or schema blessing for a given context or ecosystem" (ACDC spec > Extensibility, L2934-2936).

### The authenticity/veracity axis {#06-authenticity-veracity}

Authenticity is "the truthfulness of an imputed origin" and veracity "the truthfulness of claimed facts in content" (authenticity-vs-veracity.md > Formal definitions). Only the first mechanizes: "Judgments about authenticity can — if managed very carefully — be reduced to an objective mathematical computation, whereas judgments about veracity inherently require subjective assessments of reputation" (authenticity-vs-veracity.md > Independence). Layer 1 verifies authenticity; governance, reputation and human judgment adjudicate veracity and fitness, which is why no real deployment can omit an EGF.

#### A governance hook bound by SAID {#06-governance-hook}

A GCD credential's `gfw` field is "A SAID that identifies a governance framework that adds richer semantics to the role field and any custom constraints present in this credential," (bakobo/schema gcd/gcd.schema.json, a.gfw.description, L79 @cfcbdcc7a), and "The act of issuing or receiving a GCD credential constitutes binding acceptance of the rules" (bakobo/schema gcd/index.md > Governance Framework, L116 @cfcbdcc7a). Other credential families restate that rule in their own words ([section 3](#06-data-loyalty)). The general mechanism is the rule section `r`, "both human and machine-readable and referenceable by a cryptographic digest," (ACDC spec > Rule Section, L1239). An EGF's terms are a SAID-committed contract that participation accepts, not a URL a verifier may consult, so governance binds without becoming a phone-home dependency.

## 2. Who arbitrates ecosystem-defined behavior {#06-arbitration}

KERI's contrast with X.509 is enforcement against observation: "A browser vendor that distrusts a CA is making an enforcement decision — exercising judgment with immediate global consequences... A KERI watcher that detects duplicity is making an observation — surfacing cryptographic evidence that the relying party confirms independently" (wtbo.md > 4. KERI's Architecture: A Different Root of Trust). Layer 1 has no arbiter ([chapter 07, section 8.2](#07-watcher-enforcement)).

Layer 2 is arbitrated plurally and by opt-in: "A verifier does not rely on a single authority but makes explicit trust decisions about a plurality of evidence issuers" (Dossier spec > Security Considerations > Verifier Trust and Root of Trust Management). In GLEIF's vLEI framework, developed with ToIP (raw/13 section 7), the arbitration structure is itself a credential chain from GLEIF through Qualified vLEI Issuers to legal entities and roles, so "A verifier receiving an employee's credential can traverse the chain back to GLEIF without consulting a trust registry. The entire graph is self-certifying" (acdc-vc-diff.md > Real-World Validation). Trust registries, on KERI's view, "are a band aid; they just move the centralization back to a different level of the architecture... immature and fragmented... primarily address governance for issuers, not issuees," (x509-prob.md).

The assurance a verifier demands is its own threshold. Bakobo's `org-vet` 2.0.0 lets "verifiers... decide what level of assurance will satisfy them, and accept any credential having an LoA >= their threshhold" (bakobo/schema org-vet/index.md > Levels of assurance, L14 @cfcbdcc7a; the misspelling is the source's) and defines its top level partly by "enough witnesses to reliably detect and recover from duplicity" (L20). Its clauses say the LoA "states which procedures the issuer carried out — not a guarantee about the organization," and "requires a verifier to check the registry rather than treat an unexpired credential as current" (bakobo/schema org-vet/index.md > Governance framework, L30 @cfcbdcc7a). public-schema has no `org-vet`; its `org-identity` keeps the LoA table under citation-style rules (public-schema org-identity/index.md > Rules and governance, L76-80), so every LoA citation here is to bakobo's.

### Recipient-side arbitration of OOBI bootstrap {#06-oobi-mfa-arbitration}

OOBI with MFA is recipient-side arbitration too. One AID is published at `/.well-known/oobi/{aid}` on several "independently controlled namespaces", and the recipient accepts "only when a configured threshold of namespaces returns a consistent OOBI for the same AID," [spec] (KERI spec > OOBI with MFA, L2838 @fbdd4a615), a threshold the recipient configures, unlike the witness threshold a controller declares. "This pattern does not change the trust model of an OOBI"; it "governs only whether the recipient is willing to bootstrap from the OOBIs at all." Agreement is evidence about willingness, never authenticity ([chapter 07, section 2.6](#07-multiple-well-knowns)); [section 6](#06-bootstrap-buckets) has the configuration.

### EGFs define the exchange shapes {#06-egf-shapes}

The editor puts exchange shapes on the governance side [proposal]: enterprises and regulators define acceptable credential graphs in their EGFs, "So predefined shapes will be the norm." (keripy GitHub > #1542, comment of 2026-07-30, R-055, https://github.com/WebOfTrust/keripy/discussions/1542#discussioncomment-17842586), though "The current spec is very unrestrictive." Leak prevention belongs to EGF-driven tooling because "Schemas are not rich enough by design to handle all those" (keripy GitHub > #1532, comment of 2026-07-22, R-063, https://github.com/WebOfTrust/keripy/issues/1532#issuecomment-5052264212). Expecting IPEX itself to guarantee a leak-free apply asks Layer 1 for a Layer-2 property.

## 3. SEDI: statute, roles and limits {#06-sedi}

SEDI (State-Endorsed Digital Identity) applies KERI's root-of-trust doctrine to civil identity. Its statute holds that "An individual possesses an individual identity innate to the individual's existence and independent of the state, which identity is fundamental and inalienable." (Utah Code 63A-20 > 63A-20-101 Digital identity bill of rights, (1), p.1). The state endorses an identity; it does not create one. In the active credential family "The state issues Core to the citizen." (bakobo/schema sedi-core/index.md, L3 @cfcbdcc7a), to the citizen's own AID, so withdrawing the endorsement leaves the identifier and its log with the holder.

### Which law {#06-sedi-statute}

The statute is Utah Code Title 63A, Chapter 20, effective 2026-05-06, "Enacted by Chapter 436, 2026 General Session" (Utah Code 63A-20 > 63A-20-101 Digital identity bill of rights, p.1). Talks call it SB 260 (raw/20 section 4.1), a number not tied here to a specific bill, so this chapter cites Code sections. Law carries no marker and names no technology.

### The bill of rights {#06-sedi-bill-of-rights}

Section 63A-20-101 lists eleven rights. Those that constrain a design are against compulsion ((4); 63A-20-304(1)(a)), against revocation except for compromise, error, fraud or the holder's request ((5); 63A-20-301(5)), to open standards ((7); 63A-20-301(2)(e)), "to choose what identity attributes are disclosed" ((8)), against state "surveillance, profiling, tracking, or persistent monitoring" ((10)), and against surrendering one's device to present ((11); 63A-20-304(1)(c), 63A-20-501(3), 63A-20-601(3)). What revocation removes is the endorsement; the holder's identifier and log are untouched.

### Requirements that read as KERI properties {#06-sedi-requirements}

The mapping to KERI is this chapter's. A personal digital identifier must be "mathematically provable to be under a holder's control" and "transportable to technical infrastructure of the holder's choosing" (Utah Code 63A-20 > 63A-20-201 Definitions, (20), p.3). The identity must include "compromise detection, recovery mechanisms, and cross-context correlation protections" (63A-20-301(1)(a), p.5), which duplicity evidence and pre-rotation supply; must not rest on shared secrets (63A-20-201(4)(b)); and must not let the department "monitor, surveil, or track the presentation" (63A-20-301(3), p.6). Issuance infrastructure must sit in an in-state, state-controlled data center (63A-20-301(2)(c)), which constrains the state's keys, witnesses and registries, not holders'. Any technology meeting these qualifies; that only KERI does is its authors' assessment.

### Identity proofing at a point in time {#06-sedi-proofing}

Proofing gates the credential (63A-20-302(6)(c), p.7) under "a generally accepted identity proofing standard" (Utah Code 63A-20 > 63A-20-303 Identity proofing, (1)(a)(i), pp.7-8), with no assurance level named, and the endorsement "reflects verification at a point in time" without "continuous monitoring" (63A-20-303(1)(d), p.8) — `org-vet`'s point-in-time clause ([section 2](#06-arbitration)) enacted for persons. Sam Smith adds the economics [proposal]: "Strongest Identity assurance amortized over the lifespan of unbounded term (persistence) AIDs" (SEDI_Tradeoff, slide Unique features of KERI/ACDC that require Issuer linkability). Because an AID survives rotation, a person is proofed once against it. [Chapter 14](#14-identifiers) owns the theory of accumulated assurance.

### Roles: holder, guardian, wallet, verifier, relying party {#06-sedi-roles}

The statute separates verification from reliance, [section 1](#06-egf-two-layer)'s split in statutory form: a verifier "mathematically verifies a state digital identity to evaluate the state digital identity's authenticity and integrity" (Utah Code 63A-20 > 63A-20-201 Definitions, (30), p.3), and processes only the minimum for "a specified purpose defined by the relying party requesting the presentation" (Utah Code 63A-20 > 63A-20-501 Requirements for verifiers, (1)(d), p.10). A holder may be "a digital guardian who manages and presents a state digital identity on behalf of the individual" (63A-20-201(9)(b), p.2), whose presentations wallets, verifiers and relying parties must accept (63A-20-401(1)(h), 63A-20-501(1)(e), 63A-20-601(1)(e)); Sam's deck offers delegated chains of authority for it, "= secure guardianship" (SEDI_Tradeoff, slide Unique features of KERI/ACDC that require Issuer linkability) [proposal]. A wallet's presentation log must be "accessible only to the holder" (Utah Code 63A-20 > 63A-20-401 Requirements for digital wallet providers, (1)(f), p.9); whether a registry anchored in the holder's witness-served KEL satisfies that depends on what its anchors reveal, which is unchecked ([chapter 10](10-presentation-registries.md)).

### The statutory duty of loyalty and its enforcement {#06-sedi-loyalty-statute}

Section 63A-20-701's duty is quoted in [section 4](#06-data-loyalty-defined); 63A-20-702 confines a presentation record to "the primary purpose for which the presentation was performed" (Utah Code 63A-20 > 63A-20-702 Processing restrictions, (1)(a), p.12). Enforcement runs through the data privacy ombudsperson and the attorney general (Utah Code 63A-20 > 63A-20-801 Complaints and enforcement, (1) and (4)(b), p.12), with no private right of action, and the complaint list omits digital guardians although 63A-20-701 binds them. The Legislative Auditor General audits the program, including the monitoring restrictions, from 2028-01-01 (63A-20-802(2)(b), p.13).

### What the state says it will not be {#06-sedi-self-limits}

As intent rather than law, Utah's privacy architect says: "We are not the wallet. We're not your key escrow. We're not your key recovery." (KERIConf26 caption, George McEwan, The Landscape of SEDI, 27:42). He also described wallet attestation by "a cryptographic hash and a signature of the application you're using" (28:42), which the statute leaves to rule (63A-20-301(1)(f), p.5).

### The issuer's threat model, and why issuance is linkable {#06-sedi-threat-model}

Sam's SEDI decks lead with the threat to the issuer [proposal]: "Weakest vulnerability is the AuthZ infrastructure not the signing hardware." (SecurityThreatsMitigationsSEDI, slide Conventional Enterprise Signing Infrastructure). At state scale, "Revoking and reissuing millions or tens of millions of Government issuances due to likely or potential key compromise is impractical." (SEDI_Tradeoff, slide Why key compromise is the hard problem for SEDI), so recovery must be specific, and "Anchored issuances are linkable and thereby enable the detection of specific forgery and the specific recovery of forged issuances." (same slide). KERI's authors therefore reject issuer-unlinkable signatures for SEDI.

That does not collide with the statute's "cross-context correlation protections", which name no mechanism; on this chapter's reading KERI supplies them through the layers of [section 4](#06-layered-privacy), not issuer unlinkability.

### The SEDI credential family {#06-sedi-family-now}

Bakobo's original root credential `sedi-id` is "Superseded for new issuance" (bakobo/schema sedi-id/index.md, L3 @cfcbdcc7a). The state-issued credentials are Sam Smith's IAR, Core, Residence and Age, pinned to his keripy test module at `80f77b73b`; the presentation, guardian and authorization schemas "are Bakobo profiles for the November SEDI Summit; they are not Sam's schemas or statements of Utah policy" (bakobo/schema README.md > Status, L65).

#### An authority chain of credentials, not delegation {#06-sedi-authority-chain}

keripy's SEDI fixtures head the state's hierarchy "Root AID -> Org Unit (division/department/program) -> Issuing Agent" (keripy tests/sedi/test_sedi.py, L3165-3166 @80f77b73b), but every AID is a plain `incept`, with no `delcept`, `dip` or `delpre` in the module (raw/11 section 4). Authority runs through credentials: Organizational Unit, then Issuing Agent, then each citizen's Core, linked by `I2I` edges (keripy tests/sedi/test_sedi.py, L3519, L3598-3605, L3997-4004). This is a fixture, the spec author's intended shape rather than library behavior, and it matches GCD 2.0.1's treatment of the KEL binding as "a stronger, optional fact" (bakobo/schema this.i, `@n8wq3d`, L258-260). A reviewer who reads "delegation chain" in SEDI as KEL delegation should walk edges instead.

#### Minimization at the credential boundary {#06-sedi-minimization}

The active Core requires more than the statute's four endorsed attributes: names, birth date, facial image proof, legal presence status, issue and expiration dates, and a `primary` flag (bakobo/schema sedi-core/sedi-core.schema.json, a.required, L67-81). Minimization happens at the credential boundary instead. Residence is its own credential with a compact arm per block, so "a holder can reveal one block, such as county, while withholding the others" (bakobo/schema sedi-residence/index.md, L3 @cfcbdcc7a), because a block discloses atomically and "a single residence block would force over-disclosure on every verifier who only needs jurisdiction" (bakobo/schema sedi-id/index.md > The attributes > Name and residence are decomposed — deliberately, L70-71). That is how an EGF's rules become mechanically enforceable.

#### Duty of data loyalty {#06-data-loyalty}

Bakobo's SEDI rules artifact is one `l` string carrying named clauses as text, because "Sam's r object permits only d and l" (bakobo/schema this.i, `@2vqmhxai`, L2235). New SEDI examples reference it; Sam's own fixtures carry an empty rule section and no legal language (raw/11 section 4). The contractual form of the duty therefore binds only where an issuer references Bakobo's artifact, while 63A-20-701 imposes data loyalty by statute on the department, wallets, verifiers, relying parties and guardians regardless ([section 4](#06-data-loyalty-defined)).

The clauses codify a fiduciary posture: a verifier MUST NOT "assimilate, aggregate, correlate, sell, or otherwise combine disclosed attributes... for any purpose beyond the disclosed purpose," and "this binds each downstream recipient reached through the edge section of a presentation"; no presentation may be used "to enable monitoring, surveillance, profiling, tracking, or persistent correlation"; and accepting a presentation elects the statutory safe harbor, which breach forfeits (bakobo/schema sedi-id/rules.json, L3 @cfcbdcc7a). "Issuing or accepting a SEDI credential is binding acceptance of its referenced revision" (bakobo/schema sedi-id/index.md > Governance, L159). Data loyalty is contractual and, for the parties Utah names, statutory; it is not cryptographic.

A holder's correlation resistance has three legs, none from KERI's core: the governance leg above; a deployment leg, Bakobo's presentation schemas requiring the holder's own registry `rd`, so that "logged" means "logged in the holder's KEL and nowhere a third party watches" (bakobo/schema this.i, `@lm37js6k`, L1987, L1993-1994); and a disclosure leg, selective disclosure of one age threshold, which keripy does not provide ([section 4](#06-layers-not-composing)).

#### An open governance tension {#06-sedi-governance-tension}

The `noOverAssertion` clause says "the state endorses only name, birth date, image, and Utah residence address (63A-20-301(2)(f))" (bakobo/schema sedi-id/rules.json, L3), while Core endorses `legalPresenceStatus` on the strength of "an email to Daniel Hardman on 2026-09-23" from Sam Smith (bakobo/schema sedi-core/index.md, L5), relayed correspondence usable for intent only. The statute lists the four attributes (Utah Code 63A-20 > 63A-20-301 State-endorsed digital identity requirements, (2)(f), p.6) and makes lawful presence an eligibility condition (63A-20-302(6)(a), p.7), which favors the rules file without settling it, because the list is introduced with "a specific set of identity attributes including an individual's:" and whether "including" is exhaustive is unconstrued. When rules and schemas are separate artifacts, nothing mechanical keeps them consistent.

#### The author's proposed architecture and the custody of children {#06-sedi-architecture}

The specification's author offers two proposals for a state program, not Utah policy [proposal]. For issuance, "the proposed architecture for SEDI is the the IAL3 identity assurance process issues a SEDI management ACDC", used only "to request bulk issued SEDI credentials", with a wallet rule "don't reuse a bulk issued aid unless its with the same disclosee" (keripy GitHub > #1532, comment of 2026-07-23, R-047, https://github.com/WebOfTrust/keripy/issues/1532#issuecomment-5061387439): [section 4](#06-decorrelation)'s decorrelation as an issuance design. For children, "So if the State issued a SEDI to the Baby they are issuing it to an AID controlled by the parents not the Baby." (keripy GitHub > #1550, discussion body of 2026-07-28, R-072, https://github.com/WebOfTrust/keripy/discussions/1550), and a platform accepting authorization only from the parent's AID is "the minimally sufficient means for the parent to have control over the childs access to social media" under every key arrangement, so "policy may reach down to the key management layer of the Issuee (citizen) not merely the Issuer (State)" (keripy GitHub > #1573, comments of 2026-08-07, R-071, https://github.com/WebOfTrust/keripy/discussions/1573#discussioncomment-17935861). Emancipation at adulthood is left open.

## 4. Correlation-resistance and data loyalty as layered properties {#06-layered-privacy}

KERI's core does not promise unlinkability, and cannot. Unlinkability, correlation minimization and data loyalty belong to higher layers — ACDC disclosure, governance and contract, deployment discipline — composed on a substrate indifferent to them. Even the ACDC specification makes privacy a means: "the primary design goal is not data privacy protection per se but the more general goal of protection from the unpermissioned exploitation of data. Privacy mechanisms are means, not ends" (ACDC spec > Disclosure Mechanisms, L1659). It also states the ceiling: "there is no cryptographic mechanism that precludes statistical correlation among a set of colluding Verifiers" (ACDC spec > Bulk-issued, L2785), so unlinkability without contractual protection can be "an exercise in diminishing returns".

### The disclosure layer (ACDC) {#06-disclosure-layer}

This layer contributes graduated disclosure ([chapter 05, section 7](#05-graduated-disclosure)), blinding UUIDs (ACDC spec > UUID Fields, L89-91), bulk issuance with a fresh SAID per context (ACDC spec > Bulk-issued, L2767), and sparse Merkle trees after which "a given seal in the KEL... no longer provides a point of correlation to any other transaction event" (ACDC spec > Bulk-issued, L2914-2924). The result is "3rd party unlinkability" (ACDC spec > Bulk-issued, L2854).

#### The governance/contractual layer (EGF, rules) {#06-contractual-layer}

This layer contributes contractually protected disclosure, where "the disclosed data has 'strings attached'" that bind each downstream disclosee (ACDC spec > Contractually Protected Disclosure, L1783-1792; [chapter 05, section 8](#05-contractual-disclosure)). It yields "2nd party unlinkability via contractual disincentives to link" (ACDC spec > Bulk-issued, L2854) and is the SEDI duty of [section 3](#06-data-loyalty). Where it does not deter collusion, the specification falls back to independent-AID or independent-registry bulk issuance "at storage/compute cost" (ACDC spec > Bulk-issued, L2887-2911).

#### An agree binds; an admit removes the easy defense {#06-agree-binds}

The editor has ruled that "An agree is legally binding not sending an admit does not convey backing out." and that an admit "enables easy enforcement by removing plausible deniablity." (keripy GitHub > #1505, comment of 2026-07-17, R-049, https://github.com/WebOfTrust/keripy/pull/1505#issuecomment-4997904242) [proposal]. Chain-link confidentiality and the duty of data loyalty then reinforce each other — "So CLC and DDL are mutually reinforcing" — so the contractual layer's enforceability is designed into the IPEX message sequence. [Chapter 08, section 10](#08-anchoring) owns the sequence and its anchoring.

#### The deployment layer {#06-deployment-layer}

This layer contributes per-facet AIDs that are "uncorrelatable identifiers for one person" (sda.md > 6. Who is acting), rotation of citation-signing AIDs, and AID pools for herd privacy (Dossier spec > Privacy Considerations; raw/04 section 8). One deployment makes it a rule [practice]: "Each facet of an identity really should have its own AID" (origin-platform docs/managing-aliases.md > Solution > 1. AIDs, L91 @cb758b1b5).

#### Two correct layers that do not compose {#06-layers-not-composing}

At keripy `80f77b73b` a registry-backed ACDC presented with any aggregate element withheld fails, because "A verifier cannot distinguish an omitted requirement from an undisclosed one using only its digest" (keripy src/keri/acdc/ipexing.py, IpexHandler._presentationRegistries, L1414-1415 @80f77b73b) [code]. Sam's Age schema requires `rd`, so a holder proving over-21 must disclose every threshold block. The module has no caller in `src/keri` and no test presents an Age, so this is reference-implementation code, not shipped behavior ([chapter 05, section 4.1](#05-age-credential) owns the finding). A rule protecting detectability at the protocol layer withdrew selective disclosure at the disclosure layer, and nobody owned the seam. Whether the schema, keripy or Age's registry requirement gives way is open and is Sam's to decide.

#### The three-party exploitation model {#06-three-party-model}

The 1st party is the data subject, the 2nd the intended disclosee, the 3rd any unintended observer, and "any use of 1st party data by a 3rd party is likewise, by definition, exploitive" (ACDC spec > Data Privacy, L1712-1726). Third-party protection is encryption ([chapter 12](#12-confidentiality)), second-party protection contractual, cross-context minimization technical. Observers sync with registrars on state change, not at validation, so there is "no forced phone home validation" (ACDC spec > TEL Registrars and TEL Observers, L1693); "A registry consulted at verification time is a phone-home in disguise" (sda.md > 7. Open loop, not closed). SEDI's portrait is committed by digest because a download locator "is phone-home by another name §301(3)/§701, and creates an availability chokepoint" (bakobo/schema sedi-id/index.md > The attributes > Image: committed by digest, bytes holder-carried, L89-91 @cfcbdcc7a), and Core keeps "Facial Image Proof Value as SAID of typed media block" (bakobo/schema sedi-core/sedi-core.schema.json, L293). KERI's core supplies the substrate — blinding SAIDs, cheap AIDs, seals that reveal no PII, TELs that need not phone home — not unlinkability, so test the seams between layers rather than the base layer.

### Data loyalty, defined {#06-data-loyalty-defined}

Data loyalty is a fiduciary duty, imposed by statute or contract, that whoever holds a person's data act as that person's loyal agent. Utah's statute binds "The department, a digital wallet provider, a verifier, a relying party, and a digital guardian" to refrain from processing that would (Utah Code 63A-20 > 63A-20-701 Duty of loyalty, pp.11-12):

1. "conflict with the best interests of an individual;"
2. "take advantage of or otherwise exploit an individual;"
3. "result in a disproportionate risk to an individual;"
4. "are to an individual's detriment; or"
5. "cause harm to an individual."

The duty is abstention, and its parties are defined by relation to a state digital identity (63A-20-201(6), (26), (30)), so outside SEDI data loyalty binds only by contract. The legal theory is Richards and Hartzog's: "Data loyalty has three key features—it is a (1) relational duty (2) that prohibits self-dealing (3) at the expense of a trusting party." (BulkIssuanceSynergyDataLoyalty, slide Duty of Data Loyalty, quoting Hartzog and Richards). Sam's definition [proposal] is that "a loyal data agent acts as a fiduciary on behalf of the data subject", which consent cannot discharge because "the act of consent can be easily socially engineered against the best interests of the consenter" (SustainablePrivacy.pdf > 4 Legal and Regulatory Issues, p.10). Utah makes consent a gate (63A-20-401(2)(c)) with no exception in 63A-20-701, so on this chapter's reading consent is necessary, not sufficient. The statute, the ACDC specification and Sam all name exploitation as the harm, Sam's being "any form of data opportunism that benefits the 2nd party at the expense of the 1st party" (same section); none names linkability.

### Decorrelation, not uncorrelatability {#06-decorrelation}

Real contexts leak, so the editor sets the goal [proposal]: "So the viable goal can not be uncorrelatability it must be decorrelation." (keripy GitHub > #1515, comment of 2026-07-18, R-065, https://github.com/WebOfTrust/keripy/discussions/1515#discussioncomment-17682212) — correlatable information that is not exploited, which is what contractual protection enforces. Bulk issuance helps because "partitioning identifier sets makes enforcement easier": an identifier seen outside its context is evidence of a breach. Against standing edges joining verifiers on a core credential's SAID, "each presentation context consisting of discloser and disclosee gets its own set of SEDI credentials and standing edges." (keripy GitHub > #1515, comment of 2026-07-18, R-066, https://github.com/WebOfTrust/keripy/discussions/1515#discussioncomment-17681089), and "an edge can also be blinded" (https://github.com/WebOfTrust/keripy/discussions/1515#discussioncomment-17682012). No implementation is known to issue per-context standing edges.

#### Participation is not correlation {#06-participation-not-correlation}

"Proof of participation is not the same as correlation." (keripy GitHub > #1542, comment of 2026-07-23, R-054, https://github.com/WebOfTrust/keripy/discussions/1542#discussioncomment-17755467) [proposal]. A binding negotiation needs a pair of AIDs and "a clear intent to engage in legal relations"; graduated disclosure governs only what the presented ACDCs reveal. Faulting IPEX for exposing the negotiating AID asks the contractual layer to work without parties.

## 5. Cross-ecosystem semantics: meaning across trust domains {#06-cross-ecosystem-semantics}

"No shared or trusted relationship between the Controllers and Verifiers is REQUIRED" (ACDC spec > AID Fields, L95), so meaning must cross trust domains without a shared authority. KERI's first answer is type-is-schema, "the Schema, `s`, field itself is the type field" (ACDC spec > Type-is-schema, L182): with static, content-addressed schemas ([chapter 05, section 3](#05-static-schema)) the content address is the namespace, with "no need for centralized permissioned name-space Registries to resolve name-space collisions" (ACDC spec > Extensibility, L2936) and "no link that can rot" (acdc-vc-diff.md > What Makes a Credential Format Lossy? > Loss 6: Schema Stability).

That fixes the identity of meaning, not agreement on it: two ecosystems with different schema SAIDs for residence have two types. Interop is semantic, a governance act; Bakobo's `sedi-id` design says to "align the component *semantics* with 18013-5 so a bridge crosswalk is mechanical, but keep the statute's vocabulary" (bakobo/schema sedi-id/index.md > The attributes > Name and residence are decomposed — deliberately, L79-82 @cfcbdcc7a). Edge `s` constraints let an ecosystem pin which foreign schema a far node must satisfy, as the vLEI ladder does at every hop (public-schema vLEI/acdc/legal-entity-vLEI-credential.json, L99 @95a07e544; ACDC spec > Edge Section, L1176).

### Two coherent choices on far-schema pinning {#06-far-schema-pinning}

Provenant's telco credentials choose the opposite: at public-schema `95a07e544` no telco edge carries a SAID-valued `const` (raw/11 section 2), and the `issuer` edge is "Intentionally generic — does not constrain the schema of the identity credential" (public-schema tn-alloc/index.md > Edge structure, L51). keripy still validates a far node against whatever schema an edge names (keripy src/keri/vdr/verifying.py, Verifier.processCredential, L196-197, L208-228 @80f77b73b) [code]. The vLEI ladder decides acceptable far schemas in the schema, binding every issuer; the telco family leaves it to verifier policy. That choice belongs in an EGF, made explicitly; neither repository states its reason.

#### Bridge, do not adopt {#06-bridge-dont-adopt}

For foreign ecosystems — W3C VC, ISO mDL, X.509, SD-JWT — a bridging party verifies natively and issues a Foreign Artifact ACDC, which "transforms the problem of verifying a foreign format into the problem of trusting the attestation of the bridging party" (Dossier spec > Incorporating Evidence > Referencing Non-ACDC Evidence > Bridging from Foreign Credential Ecosystems). Its `art_posture` and `rev_latency` fields make that trust explicit and issuer-scoped; a non-zero latency "allows verifiers to treat the FAA as a proxy for the foreign credential, assuming they trust the FAA issuer" (bakobo/schema faa/index.md > What belongs in this credential, L30-31 @cfcbdcc7a). Revocation lifecycles "are decoupled unless a specific governance framework explicitly links them" (same Dossier section). Direction matters: "AIDs can be transformed to DIDs, but the opposite transformation is typically impossible" (sdjwt-acdc.md > 2. Differences > 2.2 Identifiers).

### did:webs, a bridge to the DID world {#06-did-webs}

did:webs projects a KERI AID into a form DID tooling resolves. It is a ToIP KERI Suite specification at version 0.10.3, edited by Sam Smith and Daniel Hardman among others; it is [spec] for did:webs conformance only, outside the KERI, ACDC and CESR lines, and may still change. It separates discovery from trust ([chapter 01, section 4](#01-discovery-vs-trust)): "Authenticity of a resolved `did:webs` DID document MUST NOT depend on host honesty." (did:webs spec > Security Considerations, L2378-2379 @2d84ef2b0).

A resolver verifies a `keri.cesr` event stream and requires that "The derived DID document MUST equal the transformed DID document." (did:webs spec > DID Method Operations > Read (Resolve), L361); a `versionId` gives historical key state, which `did:web` lacks ([chapter 01, section 7](#01-did-current-state)), and diverging copies of a stream invalidate both (did:webs spec > AID controlled identifiers, L190-192). The web name is an alias the AID authorizes: the controller "MUST authorize the full `did:webs` identifier as a designated alias ACDC anchored to the KERI AID" (did:webs spec > DID Method Operations > Create, L287), the doctrine of [chapter 07, section 9.4](#07-aliases) with a mechanism. It concedes that "the method does not by itself guarantee availability" (did:webs spec > Security Considerations > Common security threats, L2410-2411): critiques of DNS or hosting target a conceded discovery layer, while a resolver that skips the stream or alias check has a real defect. Its delegation, BADA and multisig rules were not read.

## 6. Versioning and migration cost {#06-versioning-migration}

### The wire/encoding layer (CESR) {#06-wire-layer-versioning}

[Chapter 04, section 8](#04-genus-version) owns the genus/version mechanism. The rule this chapter rests on is the asymmetry: "New implementations with the new codes can accept streams from old implementations, but old ones will break if they receive the new ones" [spec] (CESR spec > Protocol genus/version codes, L618 @bad6edd84). CESR `main` carries no post-quantum code and still names Falcon only as a candidate [spec] (CESR spec > Code table entry policy, L783); `v1.1` defines about thirty-three [spec-next] ([chapter 04, section 5.7](#04-pq-in-practice)). Any claim that KERI has post-quantum support is wrong at every pin named here.

The `v1.1` rows arrive under two allocation rules. Because "The one- and two-character code tables are a scarce resource", "Post-quantum codes MUST therefore be placed in the four-character fixed tables" [spec-next] (CESR spec > Code table entry policy, L785 @65fd7518b), a scarcity filter over `main`'s quality filter that governs who may spend a shared namespace. And placement "is not a matter of choice. It is determined by the raw size of the Primitive modulo 3" (L787), turning a committee decision into arithmetic. Where meaning is pushed out to governance, allocation is pushed back into mechanism ([chapter 04, section 5.6](#04-allocation-rules)).

#### The message layer {#06-message-layer-versioning}

New code must read old version strings ([chapter 04, section 9](#04-version-strings)), not the reverse. One migration rule bears on governance [proposal]: "Its only with v2 exchange messages that we plan to anchor exchanges." (keripy GitHub > #1492, comment of 2026-07-27, R-057, https://github.com/WebOfTrust/keripy/pull/1492#issuecomment-5093267019). Anchored IPEX is v2-only, so an ecosystem on KERIA's `keri==1.2.14` line ([section 7](#06-implementation-compat)) must upgrade to get it.

#### The schema layer {#06-schema-layer-versioning}

A schema's `$id` SAID is "the normative determiner" and its `version` field "informative" (ACDC spec > Schema Versioning, L230-234 @f0bd097de), so any content change makes a new schema, and "registry.json and any credential referencing the old SAID must be updated" (bakobo/schema KNOWLEDGE_TRANSFER.md > Hard facts about ACDC schemas (respect these), L88-90 @cfcbdcc7a). At `b9227753c` both normative Dossier schema SAIDs changed — the base to `EKuLzS_oN_mIao5og1NOujtF2QMXloiMCZP7xuAR5tY7` [spec] (Dossier spec schemas/dossier-base.json, $id, L3 @b9227753c) — in a commit titled "Correct signing language in the schemas and recompute their SAIDs". Because "A schema S IS-A dossier iff S's top-level allOf array contains a $ref to this schema's SAID" (L5), a prose fix broke every derived schema. Content addressing moves the cost of evolution from ambiguity to coordination.

Unpaid coordination shows: the specification, public-schema (public-schema dossier-base/dossier-base.schema.json, L3 @95a07e544) and bakobo (bakobo/schema dossier-base/dossier-base.json, L3 @cfcbdcc7a) publish three different dossier bases, so a schema that IS-A one IS-NOT-A the others (raw/11 section 9 item 9). Content addressing makes divergence impossible to miss, not impossible.

#### The Well-Known OOBI repath {#06-well-known-oobi}

"An OOBI MAY be returned as the result of an HTTP `GET` request to a well-known URI [RFC8615] using the registered `oobi` suffix," at `/.well-known/oobi/{aid}` [spec] (KERI spec > Well-Known OOBI, L2693 and L2698 @fbdd4a615), replacing `/.well-known/keri/oobi/{aid}`, so the old path is non-conformant. "any returned material MUST be verified in-band before use, as with any other OOBI" (L2713). It is a conformance change, not a trust-model change.

#### Bootstrap Configuration buckets {#06-bootstrap-buckets}

Pre-configured OOBIs fall in three buckets [spec] (KERI spec > Bootstrap Configuration, L2851-2855 @fbdd4a615): `iurls` for introductions, where "An OOBI of unspecified purpose is an `iurls` entry."; `durls` for SAID-addressed data, verified "by re-deriving the SAID of the returned bytes and comparing it to the SAID embedded in the URI."; and `wurls`, single well-known URLs used "as factors in an out-of-band multi-factor authentication arrangement" ([section 2](#06-oobi-mfa-arbitration)), kept apart "so that the additional trust assumptions of an OOBA arrangement do not leak into the general endpoint cache." They "are a deployment convention and SHOULD NOT be treated as distinct wire forms" (L2851). The section says "Implementations have converged on three named buckets" (L2851), but KERIA at `7e685edaa` has no `wurls` and serves no `/.well-known/` route, and signify-ts at `ffba8406e` implements no buckets [code]; keripy is unchecked.

#### Migration cost against X.509 {#06-migration-cost}

KERI's comparative claim is that PKI's post-quantum transition is "mandatory, global, and expensive... a global re-rooting," while KERI's is "one rotation per identifier, made unilaterally" (wtbo.md > 6. The Transition Problem: A Comparison of Trajectories), because pre-rotation lets a controller "rotate to stronger quantum-safe functions over time" (KERI spec > Pre-rotation, L1680). The protocol-level advantage is real. Two bounds apply. The report that a post-quantum integration "took only a couple of hours" (kspqs.md, personal communication, Sam Smith, Oct 7 2025) is a first-hand account usable for intent only, and keripy's `src/keri/core` at `b8f60166b` has no post-quantum code [code]. And implementation cost is high: each code lives in several shadow tables, and a change that "passes keripy's own tests but diverges from the spec/wire format" "is a defect, because it silently breaks interop" (keripy-knowledge 00-lens.md > The load-bearing claims, claim 5; [chapter 04, section 5.5](#04-shadow-tables)). That knowledge base describes a dev line 493 commits old, and its freshness check no longer runs because it points at repository paths that no longer exist, so its hazards are discipline to assume, not statements about keripy today.

## 7. Backward compatibility across keripy, keria, and signify-ts {#06-implementation-compat}

keripy, KERIA, signify-ts and SignifyPy must agree byte for byte, and the specification is the contract: "CESR code-table entries and sizing, field names and order, SAID derivation, version strings, count codes are external contracts" (keripy-knowledge 00-lens.md > The load-bearing claims, claim 5). Externally a KERIA agent is "just another KERI node relaying edge-signed CESR" (KERIA README.md > Message Router); [chapter 03, section 12](#03-keria-signify) owns the custody split.

HTTP message-signature construction is "the highest-risk interop surface" (raw/10 > 7a. HTTP message-signature construction): the default signed-field lists differ in order between `authing.ts` and `authing.py`, held together only by the emitted `Signature-Input` header ([chapter 09](09-kram-and-request-authentication.md) owns request authentication). Key derivation must match or "the edge and any other edge impl derive different keys from the same passcode" (raw/10 > 7c. Key derivation must be deterministic & identical). Event semantics must match; the signify-ts CHANGELOG records parity fixes "matching KERIpy `BaseHab.sign` behaviour" (signify-ts CHANGELOG.md > 0.4.0), and signify-ts read hex sequence numbers as decimal until `5a174b545` [code] ([chapter 04, section 12](#04-interop-risks)).

The implementations are on different keripy lines: KERIA pins `"keri==1.2.14",` (KERIA pyproject.toml, L30 @928ce26a4) [code] while keripy `main` is `2.1.0-dev`, where IPEX V2 and presentation-registry checks landed (raw/10 section 11a), so keripy-`main` evidence does not describe a KERIA deployment ([chapter 07](#07-main-not-deployed)). The admin API types are generated from KERIA's OpenAPI specification (raw/10 > 7e. Types are generated FROM the KERIA OpenAPI spec), but the code tables are reimplemented per language, "the deepest interop layer (the qb64 derivation-code tables must be identical across all four impls)" (raw/10 > Gaps / not covered). No shipped implementation carries the `v1.1` post-quantum table [code], so that seam has held by inaction, not process ([chapter 04, section 5.7](#04-pq-in-practice)).

Compatibility rests on convention and vigilance, not shared code, and the bootstrap buckets show the specification describing a convergence the implementations have not reached. Nothing in the architecture says who watches which seam.

## 8. Decentralization scorecard: KERI versus SD-JWT / OIDC4VC {#06-scorecard}

The SD-JWT column rests on Hardman's KERI-partisan comparison papers, whose technical claims check out against the SD-JWT and JWT specifications and whose evaluative framing is argument; read the table as a structured argument, not a neutral benchmark.

| Principle | KERI / ACDC | SD-JWT / OIDC4VC | Source grounding |
|---|---|---|---|
| Root of trust | Self-certifying identifier; "bottoms out in mathematics" | Issuer key trusted via registry or CA | wtbo.md > 3. Common Ground: What CT and KERI Share |
| Issuer key rotation | Validity binds to key state at anchor position | "key rotation invalidates historical signatures" | ACDC spec > Binding to Key State, L1673-1675; sdjwt-acdc.md > 2.3 Signing mechanism |
| Point-in-time verification | Anchored signatures defeat retrograde attacks | "tokens are only designed to be evaluated against current key state" | was.md > Mitigation 3 (pyrrhic victory); sdjwt-acdc.md > 2.3 Signing mechanism |
| Trust chain | Typed edges form a DAG of authority | Issuer-to-holder only; the chain "becomes implicit" | acdc-vc-diff.md > Loss 1: The Trust Chain |
| Issuer registries | Chaining removes them | "SD-JWTs will need registries of trusted issuers... centralized, governed" | sdjwt-acdc.md > 2.4 Chaining |
| Revocation privacy | "no forced phone home validation" | Status-list and OCSP-style phone-home | ACDC spec > TEL Registrars and TEL Observers, L1693 |
| Crypto agility | Additive code slot plus per-identifier rotation; no PQ code standardized | Algorithm negotiation; coordinated migration | CESR spec > SAID, L1180; wtbo.md > 6. The Transition Problem: A Comparison of Trajectories |
| Jurisdiction | Chains to a global root across borders (vLEI, VVP) | CA trust is jurisdiction-bound | acdc-vc-diff.md; keri-primer.md > 1.1 Fragility of centralized roots |
| Canonicalization | SAID over exact insertion-ordered bytes | JCS brittle; JSON-LD redefinition alters signed meaning | CESR spec > Order-Preserving, L1250; keri-primer.md > 4.1 The engineering bottleneck: text vs. binary |
| Ultimate arbiter | None at Layer 1; plural opt-in EGFs at Layer 2 | Registry governance over CA and browser roots | wtbo.md > 1. The Identity Problem: Administrative Trust and Its Limits |

The thesis behind it is drift: SD-JWT, W3C VCs and most DID methods "imported PKI/OAuth assumptions (issue-to-key thinking, current-key-state-only verification, standalone envelopes, trust registries, `@context` link-rot, three-party holder bias) and thereby re-created centralization one level up while losing time, trust-chain, and key-history fidelity" (raw/06 section 9). Its complement is lossless against lossy: ACDC is the archival format and VC, SD-JWT and mDL are distribution formats generated on demand (acdc-vc-diff.md > Lossless vs. Lossy: A Choice That Matters).

## 9. Load-bearing assumptions and contested points {#06-assumptions}

### Well-established {#06-well-established}

The two-layer split, KERI's core not promising unlinkability, content-addressed schemas ending namespace collision and link rot, the wire-versioning asymmetry, and phone-home-free revocation are each specified, as the sections above cite.

#### Contested or assumption-laden {#06-contested}

The no-arbiter claim holds at Layer 1 only: at Layer 2 an EGF like GLEIF's is an authority that concentrates trust, and KERI's rebuttal is that it is opt-in, per-vertical and cryptographically bound. KERI's formal literature "remains thin", and X.509 has eIDAS standing KERI lacks, "a gap of legal recognition, not of technical capability" (wtbo.md > 5. Evaluating KERI: Real Tradeoffs, Honestly Stated; wtbo.md > Notes, note [c]). The other seams worth pressing are stated where they arise: the migration evidence ([section 6](#06-migration-cost)), forked schema corpora that make "the schema" ambiguous without a fork named ([section 6](#06-schema-layer-versioning)), layers that fail to compose ([section 4](#06-layers-not-composing)), SEDI's rules against its Core ([section 3](#06-sedi-governance-tension)), and parity held by vigilance ([section 7](#06-implementation-compat)).

## Sources {#06-sources}

- ACDC spec — Authentic Chained Data Containers (ACDC) specification, Trust Over IP. trustoverip/kswg-acdc-specification, spec/spec-body.md, main @f0bd097de (2026-08-28) and v1.1 @2362e48a1 (2026-09-11). Mined in raw/03.
- acdc-vc-diff.md — ACDCs and W3C VCs: Lossless vs. Lossy, Daniel Hardman. dhh1128/papers, acdc-vc-diff.md, @68a5e2f76 (2026-09-28). Mined in raw/05 and raw/06.
- authenticity-vs-veracity.md — Authenticity vs. Veracity, Daniel Hardman. dhh1128/papers, authenticity-vs-veracity.md, @68a5e2f76 (2026-09-28). Mined in raw/05 and raw/06.
- bakobo/schema — Bakobo's published ACDC schema corpus [practice]. bakobo/schema, @cfcbdcc7a (2026-10-02). It forked from Provenant's public-schema at `8db57eb75` and has diverged: bakobo's organization-vetting credential is `org-vet` 2.0.0, public-schema's is `org-identity`, and the two publish different dossier bases. `KNOWLEDGE_TRANSFER.md` exists at `cfcbdcc7a` and was removed afterwards in `4267478`, so it is citable at this pin and not at the repository head. Mined in raw/11.
- BulkIssuanceSynergyDataLoyalty — Bulk Issuance Context Management: Self-enforcing Data Loyalty, slides by Samuel M. Smith for IIW, April 2026. SmithSamuelM/Papers, presentations/BulkIssuanceSynergyDataLoyalty.pdf, master @`b47f21597` (2026-08-11), cited by slide title. Its Duty of Data Loyalty slide quotes Woodrow Hartzog and Neil Richards, Legislating Data Loyalty, 97 Notre Dame Law Review Reflection 356 (2022), https://scholarship.law.bu.edu/faculty_scholarship/3143/, which was not read (the repository returned 403), so those quotations rest on the slide. [proposal]. Mined in raw/17.
- CESR spec — Composable Event Streaming Representation (CESR) specification, Trust Over IP. trustoverip/kswg-cesr-specification, spec/spec-body.md, main @bad6edd84 (2026-08-28) for every [spec] claim and v1.1 @65fd7518b (2026-08-26) for every [spec-next] claim. The branches are divergent (merge base `7a6adca67`), so nothing [spec-next] may be promoted on the expectation of a merge. Mined in raw/02.
- did:webs spec — ToIP `did:webs` Method Specification, v0.10.3, Trust Over IP KERI Suite Working Group; editors include Samuel M. Smith and Daniel Hardman. trustoverip/kswg-did-method-webs-specification, spec/header.md and spec/body.md, main @`2d84ef2b0` (2026-08-11). [spec] for did:webs conformance only. Read for its introduction, scope, resolution, designated-alias and security sections. Mined in raw/20.
- Dossier spec — Dossier specification, Trust Over IP. trustoverip/kswg-dossier-specification, spec/dossier-spec-body.md and schemas/, main @b9227753c (2026-08-25). Mined in raw/04.
- KERI spec — Key Event Receipt Infrastructure (KERI) specification, Trust Over IP. trustoverip/kswg-keri-specification, spec/spec-body.md, main @fbdd4a615 (2026-08-28), which supports every [spec] KERI claim. Mined in raw/01.
- keri-primer.md — A Primer on KERI, ACDCs, and CESR, Daniel Hardman. dhh1128/papers, keri-primer.md, @68a5e2f76 (2026-09-28). Mined in raw/05 and raw/06.
- KERIA — KERIA, the KERI cloud agent, WebOfTrust. WebOfTrust/keria, main @7e685edaa (2026-09-11), and @928ce26a4 (2026-09-30) for the `keri==1.2.14` pin only. Mined in raw/10.
- KERIConf26 caption — edited auto-captions of KERI Conference 2026 (Lehi, Utah, 2026-04-22 and 23), keri-foundation/CONF26-subtitles, subtitles/*.fixed.srt, @`006042d39` (2026-10-04). Quoted only as the captions read, for intent and framing. Mined in raw/14 and raw/20.
- keripy — keripy, the KERI reference implementation in Python, WebOfTrust. WebOfTrust/keripy, main @b8f60166b (2026-09-14, `__version__` `2.1.0-dev1`), and main @80f77b73b (2026-10-01) for the SEDI fixtures and `src/keri/acdc/ipexing.py` and `vdr/verifying.py` claims. The `tests/sedi/` fixtures are the spec author's intended credential shapes, never [code]. Mined in raw/09 and raw/11.
- keripy GitHub — Sam Smith's comments in WebOfTrust/keripy conversations: pull requests #1492 (R-057) and #1505 (R-050, R-049); issue #1532 (R-063, R-047); discussions #1515 (R-065, R-066), #1542 (R-054, R-055), #1550 (R-072) and #1573 (R-071). Read from the API cache of 2026-10-14; Sam's typing errors are kept as written. [proposal] throughout. Mined in raw/21.
- keripy-knowledge — a private, unpublished contributor knowledge base on keripy (`00-lens.md`), on the `knowledge` branch of a keripy fork, @9489ac9bd (2026-07-02). Its code baseline is keripy `60ab9e08d`, 493 commits behind `b8f60166b`, describing a `2.0.0-dev6` line, so its claims are discipline, not statements about keripy today. Mined in raw/08.
- kspqs.md — KERI's Strategy for Post-Quantum Security, v1.2, Daniel Hardman. dhh1128/papers, kspqs.md, @68a5e2f76 (2026-09-28). Its "couple of hours" figure is a first-hand report of a conversation with Sam Smith, usable for status and intent only. Mined in raw/05.
- origin-platform — Provenant's Origin platform documentation [practice]. provenant-dev/origin-platform, docs/managing-aliases.md, @cb758b1b5 (2026-08-26). One deployment's stated practice, not KERI doctrine. Mined in raw/12.
- public-schema — Provenant's published ACDC schema corpus [practice]. provenant-dev/public-schema, @95a07e544 (2026-06-16). The vLEI claims rest on public-schema alone. Mined in raw/11.
- raw/04 — this corpus's mining note on the Dossier specification, raw/04-dossier-spec.md, sections 1A and 8.
- raw/06 — this corpus's mining note on decentralization purity and drift, raw/06-papers-di-drift.md, section 9.
- raw/10 — this corpus's mining note on KERIA and signify-ts, raw/10-keria-signify.md, sections 7a, 7c, 7e, 11a and its gaps list.
- raw/11 — this corpus's mining note on the applied credential corpus, raw/11-credentials.md, sections 2, 4 and 9.
- raw/13 — this corpus's mining note on keri.one, raw/13-keri-one-web.md, section 7.
- raw/20 — this corpus's mining note on identifier theory, reputation and SEDI as law, raw/20-identity-theory-reputation-sedi.md, section 4.1.
- sda.md — The Shape of Delegated Authority, v1.2, Daniel Hardman. dhh1128/papers, sda.md, @68a5e2f76 (2026-09-28). Mined in raw/06.
- sdjwt-acdc.md — How SD-JWT and ACDC are similar and different, Daniel Hardman. dhh1128/papers, sdjwt-acdc.md, @68a5e2f76 (2026-09-28). KERI-partisan comparison; see [section 8](#06-scorecard). Mined in raw/06.
- SecurityThreatsMitigationsSEDI — Security Threats and Mitigations for Persistent State Issued Citizen Entitlements (SEDI), slides by Samuel M. Smith. SmithSamuelM/Papers, presentations/SecurityThreatsMitigationsSEDI.web.pdf, master @`b47f21597` (2026-08-11), cited by slide title. [proposal]. Mined in raw/20.
- SEDI_Tradeoff — SEDI: Policy and Technology Trade Space, slides by Samuel M. Smith dated 2025/10/01. SmithSamuelM/Papers, presentations/SEDI_Tradeoff.web.pdf, master @`b47f21597` (2026-08-11), cited by slide title. [proposal]. Mined in raw/20.
- signify-ts — signify-ts, the TypeScript edge signer, WebOfTrust. WebOfTrust/signify-ts, main @ffba8406e (2026-09-10), and @5a174b545 (2026-09-16) for the sequence-number fix only. Mined in raw/10.
- SustainablePrivacy.pdf — Sustainable Privacy, v1.2.8 2026/08/11, Samuel M. Smith. SmithSamuelM/Papers, whitepapers/SustainablePrivacy.pdf, master @`b47f21597` (2026-08-11), cited by section and page. [proposal]. Mined in raw/17.
- Utah Code 63A-20 — Utah Code Title 63A, Chapter 20, State-Endorsed Digital Identity, enacted by Chapter 436, 2026 General Session, effective 2026-05-06, Utah Legislature. https://le.utah.gov/xcode/Title63A/Chapter20/63A-20.html, read as the official PDF https://le.utah.gov/xcode/Title63A/Chapter20/C63A-20_2026050620260506.pdf (sha256 `3d4361005`), cited by section and PDF page. Enacted law, which carries no provenance marker. Mined in raw/20.
- was.md — Why Anchored Signatures?, Daniel Hardman. dhh1128/papers, was.md, @68a5e2f76 (2026-09-28). Mined in raw/05 and raw/06.
- wtbo.md — Where Trust Bottoms Out: X.509, Certificate Transparency, and KERI's DPKI Architecture, Daniel Hardman. dhh1128/papers, wtbo.md, @68a5e2f76 (2026-09-28). Mined in raw/05.
- x509-prob.md — Why X509 Certs Should Be Secondary Evidence of Org Identity, Daniel Hardman. dhh1128/papers, x509-prob.md, @68a5e2f76 (2026-09-28). Mined in raw/05 and raw/06.

---

# 07 — Shibboleths and Anti-Patterns {#07-shibboleths}

## Thesis {#07-thesis}

KERI corrects, point by point, the priors that PKI, IAM, blockchain and mainstream verifiable-credential work install, so a reviewer reasoning from them produces critiques KERI's contributors recognize as category errors. Each entry's heading is a tell; the entry says why it is an error in KERI's terms and gives the reframing with its evidence. The chapter closes with the master reflex, checking what the code enforces before believing the prose, and with the critiques that survive reframing.

## Status {#07-status}

The chapter is about framings, so it carries markers only where the tier is load-bearing: where a correction lives on one specification branch and not the other, or where the evidence is code. Text only on a `v1.1` branch is not [spec], and an unmerged branch on a personal fork is not [code].

## 1. How a shibboleth works here {#07-how-shibboleths-work}

A shibboleth is a framing whose shape encodes an assumption. When an outsider says "how does KERI revoke a certificate," the words "certificate" and "revoke" smuggle in the X.509 model, so the question must be reframed before it can be answered. Such a critique cannot be falsified from inside the outsider's model, which is why the analyst must "name the objective function first," because "outsider critiques smuggle in unstated invulnerability goals" (standard-analysis.md > 0). Some critiques survive reframing ([section 14](#07-residuals)). The catalog is organized by the outsider's home domain, because that is how the reflex fires.

## 2. PKI / X.509 / CA tells {#07-pki-tells}

### 2.1 "Who is the trusted authority / who vouches for the identifier?" {#07-trusted-authority}

KERI eliminates the role rather than filling it. A CA's certificate "is not made with the controlling keypairs of the identifier but made with keypairs controlled by the CA," giving "evidence of authenticity of the assignment... but not evidence of the veracity of the mapping" (KERI spec > Overcoming existing security overlay flaws, L81). An AID is derived from its own keys, and anyone establishes who controls it by replaying its KEL: "The identifier is the root of trust" (keri-primer.md > 1.3).

### 2.2 "The strength of the system is the rigor of the CA's vetting." {#07-ca-vetting}

The CA vets once; afterwards security rests on the holder's unauditable key custody, and the CA machinery "guarantees... is that someone provided a public key before the certificate was created" (x509-prob.md > Governance). KERI declares key management in the KEL, so the question becomes what the key-state history shows and whether you can replay it yourself.

### 2.3 "Renew the credential / rotate to a new certificate." {#07-renewal}

Renewal conflates identity with privilege; re-issuing after compromise "is essentially the same as starting over by creating a brand-new independent mapping" (KERI spec, L83). A transferable AID persists across rotations, each chained to the prior key state: "The identifier string remains constant even as the keys change... Identity survives key rotation" (keri-primer.md > 2.1). Privileges that should expire are carried by ACDCs.

### 2.4 "Pin the key / pin the certificate for continuity." {#07-pinning}

Google Cloud's 2026 advice not to pin, because pinning "will cause your application to break during routine certificate rotations" (x509-prob.md > Prerotation), concedes that X.509 continuity is administrative. Pin the AID and follow its KEL: "Prerotation is exactly what would let a relying party commit to a durable cryptographic anchor *and* survive the rotation" (x509-prob.md > Prerotation).

### 2.5 "Trust ultimately bottoms out somewhere administrative anyway." {#07-administrative-bottom}

It differs in kind: "CT's chain of assurance bottoms out in administrators... KERI's bottoms out in mathematics: the self-certifying identifier derives from the initial public key, and the KEL's validity can be checked by anyone who replays its hash chain, without querying any authority" (wtbo.md > 3). What remains is the controller's custody of its keys and the soundness of the primitives (background.md > 4.6). Judgment leaves the authentication path, not reliance ([section 9](#07-semantic-tells)).

### 2.6 "Publishing the same AID at several well-knowns strengthens the AID binding." {#07-multiple-well-knowns}

[spec] "This pattern does not change the trust model of an OOBI", because "the AID binding produced by resolution is still cryptographically verified through KERI in the usual way" (KERI spec > OOBI with MFA, L2838 @`fbdd4a615`; the same on `v1.1`). OOBA governs only the recipient's willingness to bootstrap, and its independence is of delivery channels: two URLs in one email are one factor.

The count is evidence of something else, which entity an AID belongs to: [proposal] "The strength of the well-known establishment is multiplied by the number of such associations, i.e., it provides a reputational source of trust." (UniversalIdentifierTheory.pdf > 1.6 Root AID Establishment via Well Known Reputational Association, p.9 @`b47f21597`). The tell is the count used to judge key state or an event's authenticity ([chapter 14, section 4](#14-well-known-association)).

## 3. Revocation, CRL, OCSP, and phone-home tells {#07-revocation-tells}

### 3.1 "How does KERI revoke — where is the CRL / OCSP responder?" {#07-crl-ocsp}

There is no separate revocation layer, and the outsider's fails open: "The system is most vulnerable precisely when it is most needed" (keri-primer.md > 1.1). Key state is the head of the replayed KEL, an abandoned identifier rotating to a null next-key list (KERI spec, L340). Credential status is TEL state anchored in the issuer's KEL, and [code] revocation is a state transition the verifier logs so it can "save a revoked credential" (keripy vdr/verifying.py, L129-132; [chapter 05, section 9](#05-registries)).

### 3.2 "A registry / status endpoint is consulted at verification time." {#07-status-endpoint}

A callback that returns a verdict reintroduces the dependency end-verifiability removes; the ACDC Observer exists so there is "no forced phone home validation" (ACDC spec > TEL Registrars and Observers, L1693). Fetching state the verifier then checks against key state it has verified, from any source, is not a phone-home; accepting a service's answer instead is, and so is a read that tells the Issuer where its credential was used. Read literally, "A registry consulted at verification time is a phone-home in disguise" (sda.md > 7) forbids every registry read, which is stricter than KERI's own design and is not the position ([chapter 13, section 5](#13-state-not-verdict)).

### 3.3 "Certificate Transparency already solved this." {#07-certificate-transparency}

Both are detection-oriented, but CT "redistributes administrative trust rather than eliminating it" (keri-primer.md > 1.1; wtbo.md, abstract). KERI detects with proof: "Unlike certificate transparency, KERI enables the detection of Duplicity in the Key state via nonrepudiable cryptographic proofs of Duplicity, not merely the detection of inconsistency... that MAY or MAY NOT be duplicitous" (KERI spec, L85). A watcher surfaces evidence; a browser root program enforces.

### 3.4 "Revoke just the compromised copy of a bulk-issued credential." {#07-bulk-copy-revocation}

The artifact is not what leaked. [proposal] "An issuer when it revokes authority revokes it universally. In a bulk issued set this means that all members of the set MUST be revoked."; "if the keys get compromised then the keystate is changed not the ACDC state" (keripy GitHub > #1574, comment of 2026-08-07, R-042, https://github.com/WebOfTrust/keripy/discussions/1574#discussioncomment-17938568). Withdrawn authority revokes the set; a compromised issuee key rotates that one AID; a compromised derivation salt means "the whole set has to be abandoned". This is the editor's account in a discussion, not specification text ([chapter 05, section 9](#05-bulk-issuance)).

## 4. Blockchain / consensus / global-ordering tells {#07-blockchain-tells}

### 4.1 "You need a ledger / global consensus / total ordering." {#07-global-consensus}

Global ordering is an explicit non-goal (background.md > 1.3), because key events are "idempotent authorization operations as opposed to non-idempotent account balance decrement or increment operations. Total or global ordering may be critical for non-idempotency, whereas local ordering may be sufficient for idempotency" (KERI spec > KAWA insight, L1836). Each controller orders its own KEL; a ledger is at most a tiebreaker after total compromise, "minimal use of a distributed consensus ledger" (KERI spec, L1888).

### 4.2 "Anchoring signatures in time sounds like a blockchain." {#07-anchoring-not-blockchain}

Anchoring needs only each signature's place in its own identifier's key-state history: "We don't need to know the relative order of two signing events — only how any one event relates to its key state. That means no total ordering, and no cumbersome consensus algorithm... no permissioning problem, no big central *anything* in the sky, no scale or performance bottlenecks, and no regulatory problems with data locality, privacy, or erasure" (was.md > Solution). That per-identifier order is all that defeating the retrograde attack requires ([section 11](#07-retrograde-attack)).

### 4.3 "Immutability requires a chain." {#07-immutability}

Immutability is a property of a commitment, not of agreement: "a SAID will verify if and only if its encompassing serialization has not been mutated, which makes the content immutable" (CESR spec > SAID, L1196). Placement in a history needs a chain; identity of content does not.

### 4.4 "But then how do you honor the right to be forgotten?" {#07-right-to-be-forgotten}

Only a shared ledger cannot forget. KERI's trust bases are separate, so "a given identifier's data may be erased and truly forgotten" (keri.one homepage), and RUN replaces CRUD: "there is no Delete. Instead of Delete, Peers Nullify" (KERI spec > RUN off the CRUD, L2870), keeping an invalidity marker so erased data cannot be replayed.

## 5. OAuth / OIDC / SAML / IAM / perimeter / federation tells {#07-iam-tells}

### 5.1 "Authentication precedes authorization as one indivisible login." {#07-authn-before-authz}

That is the sentry at the gate, whose token is too lossy for anyone inside the perimeter to check deeply (OS > 1). Every request is signed and verified at every hop, and authorization can precede authentication: "someone can receive permission if they can prove certain characteristics, even if a sentry does not (yet, or maybe ever) know who they are" (ASAAU > Appendix).

### 5.2 "Use a bearer token / session / API key to call the service." {#07-bearer-tokens}

"Possession of an API key... makes the holder indistinguishable from the account it belongs to, free to do anything that account can" (sda.md > 1). Identity is an AID and proof is a fresh signature per request over method, path, resource header and timestamp (RFC 9421) (GOC > 2): "The key authorizes an act; the ring authorizes a person to stand in your place" (sda.md > 1).

State the boundary with the row. The signature is scoped to one method, path and key state, but [code] neither KERIA (`7e685edaa`) nor signify-ts (`ffba8406e`) compares the signed timestamp or `expires` to a clock, and KERIA keeps no nonce cache, so a captured request replays on its path until rotation; enforcement would need no wire change ([chapter 09, section 2](#09-simple-kram)).

An OAuth server is not itself the tell: Sam accepts one that does not enlarge its trust domain and bridges with KERI and ACDCs (KERIConf26 caption, Samuel Smith, The Future of KERI), as healthKERI's does [practice] ([chapter 13, section 11](#13-applied-patterns)).

### 5.3 "The server is trusted infrastructure; the cloud holds my keys." {#07-custodial-cloud}

"Agents... don't have the secrets of the client" (keria README), and the client authenticates the agent, rejecting a response "from a different remote agent" (signify-ts clienting.ts, L240-255). Keys are generated and events signed at the edge; the cloud stores and relays, and an agent that added authority would be the CA prior returning ([chapter 03, section 12](#03-keria-signify)).

### 5.4 "Federation decentralizes." {#07-federation}

Federation moves centralization; trust registries are "a band aid; they just move the centralization back to a different level of the architecture" (x509-prob.md). Self-certifying roots and chaining remove it: "A verifier receiving an employee's credential can traverse the chain back to GLEIF without consulting a trust registry. The entire graph is self-certifying" (acdc-vc-diff.md > Real-World Validation).

### 5.5 "Secure the pipe (VPN/TLS) and the data inside is safe." {#07-secure-pipe}

"The walls of a pipe may be a secure perimeter, but every place where a pipe ends is a gap" (ASAAU > 3.6), and pipes leave data at rest bare. "Move Security with the Data, Not the Transport" (GOC > 8): sign, and where needed encrypt, the payload, keeping TLS as defense in depth.

### 5.6 "HPKE authenticates the sender." {#07-hpke-authenticity}

[proposal] "IND-CCA2, by itself, is insufficient to provide strong authenticity of the ciphertext." (SPAC_Message.md > Best Confidentiality (Public Key Encryption), L361 @`b47f21597`), relaying RFC 9180's warning about key-compromise impersonation. Authenticity needs a signature by the sender's identifier bound to the receiver, which is ESSR ([chapter 12, section 4](#12-essr)).

### 5.7 "Encrypt, then sign, and the message is both confidential and authentic." {#07-encrypt-then-sign}

[proposal] "An attacker can strip the signature and resign the ciphertext with the attacker's key but has never seen the plaintext of the cipher." (SPAC_Message.md > Best Combined Authenticity and Confidentiality, L366 @`b47f21597`). ESSR binds sender and receiver both. This is Sam's reading of An's analysis, which this corpus has not read, and that ESSR is the only secure approach is his assessment.

### 5.8 "TSP gives forward secrecy, like any modern secure-messaging protocol." {#07-tsp-forward-secrecy}

[spec] "TSP does not provide forward secrecy: an adversary that has recorded earlier messages and later obtains the decryption key can read them." (TSP spec > Limits, L1515 @`5599b4556`), on the standardizing line of an experimental specification. KERI's messaging work treats accountability, not ratcheted secrecy, as the remedy; rotation protects only what follows it ([chapter 12, section 10](#12-tsp-spec)).

## 6. SD-JWT / W3C-VC / DID "decentralized" drift tells {#07-vc-drift-tells}

These outsiders believe they already do decentralized identity; KERI's position is that they imported PKI and OAuth assumptions and re-created centralization one level up.

### 6.1 "A credential is a signed envelope (paired signature)." {#07-signed-envelope}

ACDCs are "bound to the Issuer's Key State... and the Issuer's Key State is signed. This enables the Key State of the Issuer to change independently of the ACDC state" (ACDC spec > Binding to Key State, L1673). For an outsider, cite the Dossier specification, which argues from rotation: [spec] "A dossier is not a signed document. The issuer does not compute a signature over the dossier ACDC and attach that signature to it as proof of authenticity" (Dossier spec > How a Dossier Is Issued: Anchoring, Not Attached Signatures, L13-14 @`b9227753c`).

Two guards. The partition is lifespan, not artifact kind: "key events are signed, and so are the short-lived transactional objects... Dossiers, endorsements, and other ACDCs are anchored" (L45-55). And a one-time dossier may carry an attached signature, because "A verifier MUST NOT treat an attached signature as equivalent to an anchor when evaluating a dossier as of any referenceTime other than the present" (L77-79).

### 6.2 "DIDs already solved decentralized issuance." {#07-dids-solved-it}

They solved holder rotation, not issuer rotation: "*most DIDs, including crowd favorites like did:web, can only be resolved to the current key state*," (was.md > Mitigation 3), so an issuer's compromise invalidates its history. An AID resolves to key state at any point by KEL replay, and "AIDs can be transformed to DIDs, but the opposite transformation is typically impossible" (sdjwt-acdc.md > 2.2): keep the lossless ACDC authoritative and derive a VC when needed.

### 6.3 "SD-JWT gives you selective disclosure and issuer flexibility." {#07-sd-jwt}

"*tokens are only designed to be evaluated against current key state*. If keys change, all existing tokens become invalid" (sdjwt-acdc.md > 2.3), and standalone envelopes need registries of trusted issuers. ACDCs "prove the bona fides of issuers by chaining to other ACDCs" (sdjwt-acdc.md > 2.4) and anchor to a rotating AID's key state.

### 6.4 "Canonicalize the JSON (JCS / JSON-LD) so the signature is stable." {#07-json-canonicalization}

In JSON-LD "this fragility has led to 'term redefinition' vulnerabilities, where the meaning of a signed credential can be altered without invalidating the signature" (keri-primer.md > 4.1). Commit to exact bytes with a SAID, in insertion order — "The natural canonical ordering for such mappings is insertion order" (CESR spec > Order-Preserving Data Structures, L1250-1252) — and reference schemas by SAID, so no link can rot.

### 6.5 "A self-referential identifier can't be cryptographically bound / a UUID is fine." {#07-uuid-identifiers}

An unbound self-referential identifier invites substitution: "Anyone can place such an identifier inside some other serialization and claim that the other serialization is the correct serialization" (CESR spec > SAID discussion, L1194). A SAID is both self-referential and bound, by digesting with a dummy-filled field and then overwriting it (CESR spec > Generation and Verification Protocols, L1200-1206).

### 6.6 "Adopt only the parts of KERI you need." {#07-keri-light}

The adversary goes to the missing part. [proposal] "Remove even one component protecting a vital area and the adversary will target the unprotected area to the exclusion of all else." (SecurityThreatsMitigationsSEDI.web.pdf, slide 166, Preventing wounds especially fatal wounds @`b47f21597`). Each part protects something: "Validators are protected from dead (stale) key compromise via the first-seen policy enforced by their own watcher network" (SEDI_Tradeoff.web.pdf, slide 13, KERI/ACDC Security Properties @`b47f21597`). Name the attack each omitted part stopped and who bears it. The tell is presenting the partial design as KERI's security at lower cost at people or government scale, where every source scopes the claim.

In writing, the half-measure argument targets cryptographic unlinkability (SEDI_Tradeoff.web.pdf, slide 26); its application to partial KERI is spoken, at KERIConf26, where this corpus's author called his own earlier KERI-light proposal a mistake at ecosystem scale (KERIConf26 caption, Ryan Hansen panel, What KERI allows us to do that we couldn't before, 13:06-13:27).

## 7. "Security means invulnerability / prevention / finality" tells {#07-invulnerability-tells}

This cluster is invisible to the reviewer holding it. [Chapter 02](#02-survivability) is the home of the doctrine behind each row.

### 7.1 "A secure system prevents forks / equivocation." {#07-preventing-forks}

"KERI is explicitly not designed around invulnerability" (background.md > 4.5.1); faulting it for malicious-controller forks "is analogous to criticizing a smoke detector for not preventing fires" (dg-c02-claude.md > 5). Ask "not 'can duplicity occur?' — it can — but 'how quickly is it detected, and what happens when it is?'... a deployment question, not a protocol question" (wtbo.md > 5).

### 7.2 "Not duplicity-resistant? Then it's broken." {#07-duplicity-evident}

In "KERI is therefore not duplicity-resistant but only duplicity-evident", the word only imports an invulnerability bias (dg-c03-claude.md, sections 2 and 5). "It doesn't try to make duplicity impossible — that would require global consensus... It makes duplicity *provable and attributable*" (wtbo.md > 4), and a detected fork is fatal to the identifier's reputation (KERI spec, L1842).

### 7.3 "All validators must converge on one truth (finality)." {#07-finality}

"Permanent divergence is an allowed outcome" (background.md > 7.4.4). "Safety in KERI means: Validators do not accept *invalid* histories" (background.md > 7.5.1), not that they agree ([chapter 02, section 10](#02-local-validity)).

### 7.4 "A threshold of witnesses gives global safety." {#07-witness-threshold}

"Agreement thresholds do not imply global safety" (background.md > 4.7); a malicious controller can run its own witnesses. The threshold is of accountable duplicity (TOAD): conflicting versions become hard to receipt and easy to expose, and global detectability belongs to the optional observer layer ([chapter 02, section 7](#02-kawa)).

### 7.5 "If a proof assumes an honest controller, it's insecure against dishonest ones." {#07-honest-controller}

The premise is "a proof-technique simplification, NOT a KERI deployment requirement... Removing it does not break KERI's security — it shifts the focus from prevention to detection and recovery" (dg-c06-claude.md, sections 3 and 5). Separate the proofs' scope from the protocol's model, in which a malicious controller triggers detection.

## 8. Role-confusion tells: witness, watcher, backer, agent {#07-role-confusion-tells}

### 8.1 "A witness is a CA / a blockchain validator / a notary." {#07-witness-not-ca}

"Witnesses make no assertion about identity — they don't claim 'this key belongs to this entity.'... That is a fundamentally different role than a CA" (wtbo.md > 4). A witness is a controller-designated AID, assumed potentially malicious, that stores and serves events; witnesses "MUST be non-transferable" so receipts verify directly (KERI spec, L353).

### 8.2 "A watcher enforces / can distrust an identifier." {#07-watcher-enforcement}

"Watchers cannot unilaterally 'distrust' an identifier... The worst a dishonest watcher can do is stay silent about duplicity it has seen" (wtbo.md > 4). The relying party decides, ideally with a watcher in its own stack; relying only on a shared super watcher "is undesirable, as it encourages centralization" (wtbo.md > 5).

### 8.3 "A witness can serve a delegate's KEL, so it vouches for the delegation." {#07-witness-delegation}

"A witness is NOT a watcher. A witness may serve a delegate's KEL without the delegator's seal/KEL; a validator must independently obtain the delegator's KEL (OOBI) before validating" (keripy-knowledge invariant D3; landmine L4). Delegation is cooperative, "Both MUST participate" (KERI spec > Cooperative Delegation, L1610), and each link is checked ([chapter 03, section 8](#03-delegation)).

### 8.4 "`DID` means the delegator vouches for all its delegatees." {#07-did-trait}

This is the X.509 path-validation reflex applied to the `DID` (Delegate-Is-Delegator) trait. Its refutation rests on [spec-next] text and an editor's [proposal] ruling, so a reviewer may press it as a question but not yet be told it is wrong on [spec] authority.

[spec] On both branches a validator may treat the two AIDs as equivalent, and neither says what follows for policy, rotation or revocation, so any reading leans on nothing. [spec-next] `v1.1` forecloses the transitive reading, "It says nothing about any Delegatees that the Delegatee may itself delegate" (KERI spec > Configuration traits field, v1.1 L381 @`3753f3797`), and makes the trait `dip`-only. `main` at `fbdd4a615` puts it in an `icp` example (KERI spec, L591), which the editor calls a defect [proposal]: "Yeah, putting DID in a plain, non-delegated ICP, as an example, was an oversight." (keripy GitHub > #1570, reply of 2026-08-04, R-012, https://github.com/WebOfTrust/keripy/discussions/1570#discussioncomment-17898407). The transitive reading will be wrong on the likely next standard, and is not wrong yet ([chapter 03, section 8](#03-delegation)).

### 8.5 "The observer layer is KEL discovery / caching, and a 'super watcher' is a bigger cache." {#07-observer-not-cache}

[spec] Discovery is OOBIs, untrusted by design: KERI "does not, therefore, need its own dedicated discovery network; OOBIs with URLs will do" (KERI spec, L2635). [proposal] "The watcher, judge, and jurors each play distinct important roles in the KERI security posture of a validator[;] they are not merely discovery mechanisms for KELs[,] so having amnesia about why their roles are distinct is going to be problematic" (WebOfTrust/kids#1, 2023-11-05). The word super names the scope of KELs covered, not features ([chapter 02, section 9](#02-observer-layer)).

### 8.6 "Agentic AI needs a new identity primitive." {#07-agent-identity}

An agent is a delegate. [proposal] "Agent has its own AID", and "ACDC mechanisms are the same for AI, person, or entity agents." (AuthorizationEVAC.pdf, p7 @`b47f21597`). Delegate its AID from an accountable party and give it authority by a credential chain checked at the edge; model or person changes the governance question, not the mechanism ([chapter 13, section 9](#13-agents)).

## 9. Semantic tells: authorship, authenticity, meaning, aliases {#07-semantic-tells}

### 9.1 "A signature means the signer authored / asserts the content." {#07-signature-authorship}

"A signature is evidence that a signing mechanism ran" (sign-author.md); meaning comes from role, ceremony and policy. A dossier issuer's signature "does not necessarily attest to the veracity of the claims within the evidence, but rather to the integrity and composition of the collection" (Dossier spec > Role of the Issuer). The signer is accountable for the signature, not thereby its author.

### 9.2 "Cryptographic verification proves the claim is true." {#07-authenticity-veracity}

"Judgments about authenticity can — if managed very carefully — be reduced to an objective mathematical computation, whereas judgments about veracity inherently require subjective assessments of reputation" (authenticity-vs-veracity.md > Independence). KERI proves who said it and that it is unaltered, not that it is true ([chapter 06, section 1](#06-authenticity-veracity)).

### 9.3 "Automate the whole verification, including the final trust decision." {#07-automated-trust}

"Automate the introduction. Automate the proof where you can. But never automate the verification of the proof" (oia.md). Deployments mark guesses apart from verified facts in the data (MA > 4). [Section 14](#07-doctrine-disagreement) records an open disagreement about how a human should take the final step.

### 9.4 "An alias / petname is an identifier." {#07-aliases}

"Treat an alias as an identifier and you get collisions; cache it... and you get staleness; parse a stranger's alias for meaning and you get an attack surface" (oia.md). "It is globally unique AIDs that MUST be used in all system logic" (HWGA, step 9): the alias is where a man in the middle can live, because cryptography cannot check the mapping it asserts.

### 9.5 "Multisig means it's an organization; one key is enough for org identity." {#07-multisig-org}

"It is not a generally true equivalence that multi-sig = org. Some orgs consist of only one person, so their AIDs are single-sig" (HWGA). What matters is that policy is visible: "Multisig is optional and infinitely variable, but defining and following policy about it is required" (keri-primer.md > 2.4), and KERI publishes thresholds in the KEL.

## 10. Data-modeling and disclosure tells {#07-disclosure-tells}

### 10.1 "Bundle all the claims into one big credential, then selectively disclose." {#07-bundled-credentials}

"Many non-ACDC verifiable credentials provide bundled credentials because there is no other way to associate the attributes... These bundled credentials could be refactored into a graph of ACDCs. Each... separately disclosable and verifiable thereby obviating the need for Selective Disclosure" (ACDC spec > Selective Disclosure annex, L2739). Issue small chained credentials and disclose by graduation; where statistical linkability is the threat, add contractual protection, since "there is no cryptographic mechanism that precludes statistical correlation among a set of colluding Verifiers" (ACDC spec > Bulk-issued, L2785; [chapter 05, section 7](#05-graduated-disclosure)).

#### Detectability, not cost {#07-bundled-credentials-detectability}

Sam's #1098 [proposal]: "the use of unlinkable ZKPs is therefore precluded to preserve the detectability of an Issuer signing infrastructure compromise", and "Likewise, the key compromise of an Issuee (Holder) can be made detectable using a presentation registry. Which would also be defeated by an unlinkable ZKP." (#1098). Unlinkable ZKPs thus trade away detect-and-recover at both ends ([section 7.1](#07-preventing-forks)). Boundaries: it is one author's argument in an uncommented discussion, last edited 2026-09-26; and its Issuee half rests on a registry that is [code] in keripy with no specification text, which a format must not foreclose and no presentation is obliged to use ([chapter 10](10-presentation-registries.md)).

### 10.2 "A compact / SAID-only credential is private." {#07-compact-not-private}

Without a blinding field, "an adversary may be able to reconstruct the block contents merely from the SAID... and the Schema... using a rainbow or dictionary attack" (ACDC spec > UUID Fields, L89); compact form "only provides compactness, not privacy" (ACDC spec > Targeted Public-attribute, L501). Privacy needs a high-entropy blinding field `u` ([chapter 05, section 2](#05-saids)).

### 10.3 "Dereference the schema `$schema`/`$id` to validate." {#07-schema-dereference}

A dynamic schema enables schema-revocation and semantic-malleability attacks (ACDC spec > Static Schema, L196-198). "All Schemas MUST be static, i.e., Schemas MUST be SADs and therefore verifiable against their SAIDs" (ACDC spec, L200), so a schema may come from anywhere ([chapter 05, section 3](#05-static-schema)).

### 10.4 "Wrap or ingest a foreign credential (X.509, W3C-VC, mDL) as a native root of trust." {#07-foreign-credentials}

"Direct reference to non-ACDC material without a wrapper is NOT RECOMMENDED, as it places an untenable burden on the verifier to parse and validate an arbitrary foreign format, understand its lifecycle, and locate its revocation mechanism" (Dossier spec > Incorporating Evidence). A bridging party verifies the foreign credential and issues a Foreign Artifact ACDC, which "transforms the problem of verifying a foreign format into the problem of trusting the attestation of the bridging party" (Dossier spec > 3).

### 10.5 "I2I / edge operators do multi-hop authority reasoning." {#07-edge-operators}

[code] `I2I` is AID string equality and nothing more, `if op == 'I2I' and issuer != farIssuee: return None` (keripy vdr/verifying.py, L481 @`80f77b73b`); multi-hop authority comes from the recursive edge walk. [spec-next] "Unlike `I2I` and `DI2I`, which are delegative Operators... `E1E` is an identity relation between the two ACDCs' Issuee AIDs" (ACDC spec > Edge, L1223 @`2362e48a1`), and the editor ruled a same-party use of `I2I` misapplied: "So the edge defines an an identity relation not a delegation relation." (keripy GitHub > #1505, comment of 2026-07-17, R-029, https://github.com/WebOfTrust/keripy/pull/1505#issuecomment-5004919975) ([chapter 05, section 5.1](#05-verifying-ground-truth)).

#### A second tell: which verifier {#07-edge-operators-two-verifiers}

[code] At `80f77b73b` keripy's two evaluators, `vdr/verifying.py` and `acdc/ipexing.py`, disagree on an unrecognized operator, on a list of operators, and on an edge with no `o`, so one edge can pass one and fail the other. Neither has been checked against the specification, so do not pick a side; neither is in KERIA's dependency ([section 12](#07-main-not-deployed)).

#### The unknown-operator trap {#07-unknown-operator-trap}

Sam narrowed #1515 to `E1E` because "we want to avoid it falling into the unknown operator trap" (#1515, 2026-07-18) [proposal]. Its proposed `I1I` and `DI1I` are absent from keripy at `80f77b73b`, so an edge carrying one is defaulted by one evaluator and refused by the other.

### 10.6 "Unlinkability is the privacy goal." {#07-unlinkability-goal}

[proposal] "KERI/ACDC postulates that the end goal is not unlinkability, but rather unexploitability through the strongest security." (SEDI_Tradeoff.web.pdf, slide 11, KERI's Paradigm Shift: Security First @`b47f21597`). Unlinkability also costs accountability, "Cryptographic un-linkability defeats legal, contractual, and economic accountability" (SevenPrivacies.web.pdf, slide 26 @`b47f21597`), and issuer-compromise detection ([section 10.1](#07-bundled-credentials-detectability)). These are Sam's assessments, open to contest, but ACDC must not be measured against a goal it does not claim ([chapter 12, section 3](#12-effective-privacy)).

### 10.7 "Selective disclosure is a privacy safe harbor." {#07-selective-disclosure-harbor}

[proposal] "Correctly understood, selective disclosure is a naive form of K-anonymity performed by the discloser (presenter)." (SPAC_Message.md > Contextual Linkability Re-identification Attack, L1104 @`b47f21597`). It reduces what is disclosed, not the receiver's obligations, and "should not provide a safe harbor", though "Unfortunately, current regulatory policy does not respect this distinction." (SustainablePrivacy.pdf > 2.3, p.5 @`b47f21597`). The 2023 SPAC text reads as if GDPR already imposes this; cite the 2026 text ([chapter 12, section 7](#12-sustainable-privacy)).

### 10.8 "A long-lived cryptonym is a supercookie." {#07-cryptonym-supercookie}

Correlation lives in the context, not the identifier. [proposal] "Two different AIDs are by themselves uncorrelated in an information-theoretic security sense" (SPAC_Message.md > Basics, L474 @`b47f21597`), so a controller can use one per relationship, and inside one "The secure attributability of an AID, together with its perfect correlatability within a context, enables secure reputational trust" (SPAC_Message.md > Basics, L482). Partitioning removes only the identifier as correlator; a signed presentation stays a durable correlator in its context ([chapter 12, section 5](#12-contexts)).

## 11. The one attack you must be able to name: the retrograde attack {#07-retrograde-attack}

"By themselves, digital signatures are much weaker evidence than casual thinkers might imagine," (was.md, intro): whoever later obtains a key can forge evidence "that looks like it originated in the past, *forever*" (was.md > Retrograde attack), and current-key-only systems such as X.509, JWTs and did:web cannot ask whether a signature was valid last week. "An analysis of an anchored signature will produce the same result no matter when it happens" (was.md > Conclusion). [code] `Tever.verifyAnchor` checks the anchoring KEL event (keripy vdr/eventing.py), but the credential `Verifier` may not repeat the check at presentation (landmine L15, HIGH, a recon hypothesis) ([chapter 03, section 11](#03-as-of-anchor)).

## 12. The master reflex: verify the code, distrust the prose {#07-verify-the-code}

KERI's guarantees are conditional, and the conditions live partly in whether the code honors them. The rule that "every externally supplied event, signature, key, receipt, or credential is *hostile input until verified*... 'looks well-formed' is not 'is authorized'" (00-lens.md, claim 3) applies to prose about code. Documented gaps:

- [code] `DI2I` is documented and fails closed with `ValidationError` (keripy vdr/verifying.py, L453-455 @`80f77b73b`; keripy acdc/ipexing.py, L926-927), a closed door rather than a crash.
- The credential anchor may not be re-validated at presentation (landmine L15, a hypothesis).
- "the spec rule; keripy's `WitnessReceiptor` currently waits for ALL witnesses instead — that is a defect, not the invariant" (30-invariants.md, F2; landmine L9).
- Pre-rotation checks can go permissive on a digest-code mismatch, "silently excluded from threshold satisfaction rather than failing closed — weakening the pre-rotation check (the firewall)" (landmine L6, HIGH).
- A code missing from a shadow table "round-trips as primitive but invisible to SAID derivation... fails late and silently" (landmine L5), a discipline for any new code ([chapter 04, section 5.5](#04-shadow-tables)).

Date a gap rather than assert it, because code moves too: landmines L16 and L17 call edge grouping read but not enforced, and [code] at `b8f60166b` m-ary grouping is implemented (`EdgeGroupOps = ("AND", "OR")`, keripy acdc/ipexing.py, L903).

### The reflex is bidirectional {#07-bidirectional-reflex}

A code comment about a specification is prose that borrows the code's credibility. keripy's now reads "E1E is normative on the spec's v1.1 branch (kswg-acdc-specification#197). It is absent from the 1.0 text currently under ToIP ratification" (keripy vdr/verifying.py, L40-41 @`80f77b73b`), correcting an earlier version that denied `E1E` any specification basis. This corpus's author wrote it (`d9ba3d9da`), so it is not independent evidence; the [spec-next] tier rests on the specification.

### keripy main is not the deployed stack {#07-main-not-deployed}

[code] KERIA pins `"keri==1.2.14",` (KERIA pyproject.toml, L30 @`928ce26a4`), while keripy `main` is on the `2.1.0-dev1` line that carries IPEX V2, `E1E` enforcement and presentation-registry verification, and the V2 IPEX handler has no caller in `src/keri`. Ask which line, which module, and whether anything calls it.

### Knowledge-base staleness {#07-kb-staleness}

The keripy knowledge base (`9489ac9bd`) has a code baseline of keripy `60ab9e08d`, 493 commits behind `b8f60166b`; L16 and L17 no longer hold and the other landmines are unconfirmed since. It maps where behavior lives, and is not evidence of what keripy does today.

### The reviewer's checklist {#07-reviewer-checklist}

Whose authority? Verified or merely parsed? Which invariant does this guard protect — "Can't name it? Assume it's load-bearing." Is it an external contract, where diverging from the specification "silently breaks interop," (00-lens.md, claim 5)? Judged against the anchor's key state? And "do not 'simplify away' a guard you don't fully understand; treat an unexplained check as protecting an invariant until proven otherwise" (00-lens.md, claim 6). Reading only prose over-credits the system; reading only code misses which discrepancies are bugs.

## 13. Quick-reference: the tell → the reframing {#07-quick-reference}

- Who vouches for the identifier? → The log is the root of trust ([2.1](#07-trusted-authority)).
- Renew the certificate. → Rotate; privileges expire in ACDCs ([2.3](#07-renewal)).
- More well-knowns, stronger binding. → Evidence of whose AID, never of key state ([2.6](#07-multiple-well-knowns)).
- Where is the CRL or OCSP? → Status is anchored state ([3.1](#07-crl-ocsp)).
- Consult the registry at verify time. → Fetch state and verify it; never accept a verdict ([3.2](#07-status-endpoint)).
- Revoke one bulk copy. → Revoke the set or rotate the key [proposal] ([3.4](#07-bulk-copy-revocation)).
- You need global consensus. → Per-identifier order suffices ([4.1](#07-global-consensus)).
- Use a bearer token. → Sign each request; freshness is unenforced ([5.2](#07-bearer-tokens)).
- Federation decentralizes. → It moves centralization ([5.4](#07-federation)).
- Secure the pipe. → Secure the data ([5.5](#07-secure-pipe)).
- HPKE, or encrypt-then-sign, authenticates. → Use ESSR [proposal] ([5.6](#07-hpke-authenticity)).
- TSP gives forward secrecy. → It does not [spec] ([5.8](#07-tsp-forward-secrecy)).
- A credential is a signed envelope. → Anchor anything that outlives a rotation ([6.1](#07-signed-envelope)).
- DIDs or SD-JWTs already do this. → Only against current key state ([6.2](#07-dids-solved-it)).
- Canonicalize the JSON. → Commit to bytes with a SAID ([6.4](#07-json-canonicalization)).
- Adopt only the parts you need. → The adversary targets the omission [proposal] ([6.6](#07-keri-light)).
- Security means preventing forks. → Make them evident and recoverable ([7.1](#07-preventing-forks)).
- Witness agreement is global safety. → It is accountability ([7.4](#07-witness-threshold)).
- A witness or watcher has authority. → It stores or reports; the relying party decides ([8.1](#07-witness-not-ca)).
- `DID` vouches transitively. → Unspecified; [spec-next] one delegation only ([8.4](#07-did-trait)).
- Observers are a cache. → They are security roles ([8.5](#07-observer-not-cache)).
- Agents need a new primitive. → An agent is a delegate [proposal] ([8.6](#07-agent-identity)).
- Verified means true. → Authentic, not veracious ([9.2](#07-authenticity-veracity)).
- Unlinkable ZKPs add privacy. → They defeat detection [proposal] ([10.1](#07-bundled-credentials-detectability)).
- The operator means X. → Ask which verifier, at which commit ([10.5](#07-edge-operators)).
- Unlinkability is the goal. → Unexploitability is [proposal] ([10.6](#07-unlinkability-goal)).
- A cryptonym is a supercookie. → The context correlates [proposal] ([10.8](#07-cryptonym-supercookie)).
- Encode every algorithm variant. → [proposal] "Too much agility is a bad thing. There is a goldilocks amount of agility." (CESR spec GitHub > #165, comment of 2026-03-19, R-018; [chapter 04, section 5.6](#04-goldilocks-agility)).
- The prose says the code does X. → Verify both ways, with a date ([12](#07-verify-the-code)).
- keripy does X, so deployments do. → KERIA pins `keri==1.2.14` ([12](#07-main-not-deployed)).

## 14. Load-bearing assumptions and conceded weaknesses {#07-residuals}

The reframings hold within KERI's objective function, rest on assumptions a reviewer may probe, and leave some critiques standing.

### What the reframings are conditional on {#07-reframing-conditions}

Cryptographic soundness; secrecy of pre-rotated keys, since losing both current and next keys is "catastrophic and unrecoverable" (00-lens.md, claim 4); and for detection, the optional observer layer: "A KERI deployment without robust watchers and governance is not a secure system" (cr-ad-trust.md > 5; [chapter 02, section 6](#02-assumptions)).

### The weaknesses that survive reframing {#07-surviving-residuals}

Observer infrastructure is immature, and a super watcher reintroduces "a centralized trust dependency that KERI was designed to avoid" (cr-ad-trust.md > 5); the formal literature is thin, its strongest analysis "a 2025 ETH Zürich Master's thesis... not peer-reviewed," (wtbo.md > 5); and depending on jurisdiction KERI lacks legal recognition X.509 has. Advocates call these "constraints of *youth*, not of *architecture*" (wtbo.md > 6), an assertion to test, not a fact.

### The trusted-third-party relaxation is two concessions {#07-two-concessions}

A Verifier requiring rotation in a presentation is conceded to "violate[] the maxim that security not be dependent on a trusted third party" [proposal], because the harm is local. And the Issuee's remedy, a presentation registry, is [proposal] "an Issuer-Verifier-protected mechanism to detect compromise of its signing keys", needing a non-colluding Issuer and an enforcing Verifier; [code] keripy enforces it on `/ipex/grant`, "Reject any malformed, missing, or invalid presentation factor." (keripy acdc/ipexing.py, L616 @`80f77b73b`), with no specification text. It has no table row, because the insiders' sources still disagree about what it requires ([chapter 10, section 8](#10-adversarial)).

### A provenance weakness in the corpus's own method {#07-provenance-residual}

Review by AI personas is a structured self-attack, not validation; a paper in the corpus says its own such passes "were conducted by AI models prompted to argue from a named lens, not by human domain experts" (m-glance.md > 1). That holds for this corpus's panels ([chapter 01, section 8](#01-load-bearing-assumptions)).

### An unresolved disagreement inside the corpus's own doctrine {#07-doctrine-disagreement}

The paper behind [section 9.3](#07-automated-trust) offers eyeball comparison of an identifier visualization as the human's final step; another concludes that casual comparison against an adversary who has ground offline "is broken", making a seeded commit-and-reveal walk "a requirement, not an enhancement" (amp-diff.md > 4.3.9). Neither cites the other. It is not a tell, since the insider source recommends the practice and the refuting paper calls itself empirically untested.

### Holding both {#07-holding-both}

The tells in [sections 2 to 11](#07-pki-tells) are category errors to reframe; the weaknesses here should be pressed. A reviewer who has internalized the doctrine can say of any critique whether it survives objective-function alignment, and why.

## Sources {#07-sources}

- #1098 — WebOfTrust/keripy discussion #1098, ACDC with Static Age Predicate Proof SMT, Samuel M. Smith, https://github.com/WebOfTrust/keripy/discussions/1098, created 2025-10-27, last edited 2026-09-26, fetched 2026-10-03. Where a [proposal] here is an argument rather than a mechanism, as with [section 10.1](#07-bundled-credentials)'s case against unlinkable proofs, it is its author's position, not a surveyed or community result. Mined in raw/16 (section 1a) and raw/11.
- #1515 — WebOfTrust/keripy discussion #1515, on edge operators (`E1E`, `I1I`, `DI1I`), Samuel M. Smith, https://github.com/WebOfTrust/keripy/discussions/1515, opening post 2026-07-17, comments cited from 2026-07-18 and 2026-10-01. Mined in raw/09 (section 11).
- 00-lens.md — keripy-knowledge load-bearing claims, a file in keripy-knowledge (see that entry), 00-lens.md, at the same pin, `9489ac9bd` (2026-07-02). Mined in raw/08.
- 30-invariants.md — keripy-knowledge invariants, a file in keripy-knowledge (see that entry), 30-invariants.md, at the same pin, `9489ac9bd` (2026-07-02). Mined in raw/08.
- ACDC spec — Authentic Chained Data Containers (ACDC) specification, Trust Over IP. trustoverip/kswg-acdc-specification, spec/spec-body.md, main @`f0bd097de` (2026-08-28) for unmarked and [spec] citations; v1.1 @`2362e48a1` (2026-09-11) for the [spec-next] `E1E` citations in [section 10.5](#07-edge-operators) and [section 12](#07-verify-the-code). Mined in raw/03.
- acdc-vc-diff.md — ACDCs and W3C VCs: Lossless vs. Lossy, Daniel Hardman. dhh1128/papers, acdc-vc-diff.md, main @`68a5e2f76` (2026-09-28). Mined in raw/05 and raw/06.
- amp-diff.md — Amplifying Difference: Perceptual Design and Verification of Human-Centric Entropy Visualizations, Daniel Hardman. dhh1128/papers, amp-diff.md, main @`68a5e2f76` (2026-09-28). Mined in raw/05 and raw/06.
- ASAAU — Authorizing Services and Automation Users, Provenant. provenant-dev/origin-platform, docs/authorizing-services-and-automation-users.md, main @`cb758b1b5` (2026-08-26). A private client repository; vendor practice, [practice]. Mined in raw/12.
- authenticity-vs-veracity.md — Authenticity vs. Veracity, Daniel Hardman. dhh1128/papers, authenticity-vs-veracity.md, main @`68a5e2f76` (2026-09-28). Mined in raw/05 and raw/06.
- AuthorizationEVAC.pdf — ACDCs for Delegable Authorization, slide deck, Samuel M. Smith. SmithSamuelM/Papers, master @`b47f21597` (2026-08-11), presentations/AuthorizationEVAC.pdf, added `3ec04c2` (2026-04-30); read through pdftotext, cited by page. [proposal]. Mined in raw/19.
- background.md — KERI: Canonical Background for Security Analysis (v0). dhh1128/keri-security-analysis, background.md, main @`149fa6c35` (2026-04-23, the repository's only commit; mined 2026-07-17). Security analysis, not specification text; it carries no provenance marker. Mined in raw/07.
- CESR spec — Composable Event Streaming Representation (CESR) specification, Trust Over IP. trustoverip/kswg-cesr-specification, spec/spec-body.md, main @`bad6edd84` (2026-08-28) for unmarked and [spec] citations; v1.1 @`65fd7518b` (2026-08-26) for the [spec-next] post-quantum code table mentioned in [section 12](#07-verify-the-code). Mined in raw/02.
- CESR spec GitHub — Sam Smith's comment of 2026-03-19 on trustoverip/kswg-cesr-specification pull request #165 (R-018), read from the read-only API cache of 2026-10-14 (`.ignored/sam-rulings-cache/`) and checked against the cached text. [proposal]. Mined in raw/21.
- cr-ad-trust.md — Cryptographic vs. Administrative Trust: KERI's Witness/Watcher Architecture and X.509 Certificate Transparency. dhh1128/keri-security-analysis, cr-ad-trust.md, main @`149fa6c35` (2026-04-23, the repository's only commit; mined 2026-07-17). Security analysis, not specification text; it carries no provenance marker. Mined in raw/07.
- dg-c02-claude.md — Analysis of DG-C02, a claim from Del Giudice's thesis. dhh1128/keri-security-analysis, dg-c02-claude.md, main @`149fa6c35` (2026-04-23, the repository's only commit; mined 2026-07-17). Security analysis, not specification text; it carries no provenance marker. Mined in raw/07.
- dg-c03-claude.md — Analysis of DG-C03, a claim from Del Giudice's thesis. dhh1128/keri-security-analysis, dg-c03-claude.md, main @`149fa6c35` (2026-04-23, the repository's only commit; mined 2026-07-17). Security analysis, not specification text; it carries no provenance marker. Mined in raw/07.
- dg-c06-claude.md — Analysis of DG-C06, a claim from Del Giudice's thesis. dhh1128/keri-security-analysis, dg-c06-claude.md, main @`149fa6c35` (2026-04-23, the repository's only commit; mined 2026-07-17). Security analysis, not specification text; it carries no provenance marker. Mined in raw/07.
- Dossier spec — Dossier specification, Trust Over IP. trustoverip/kswg-dossier-specification, spec/dossier-spec-body.md and schemas/endorsement.json, main @`b9227753c` (2026-09-03). Mined in raw/04.
- GOC — General Origin Platform Characteristics, Provenant. provenant-dev/origin-platform, docs/general-origin-characteristics.md, main @`cb758b1b5` (2026-08-26). A private client repository; vendor practice, [practice]. Mined in raw/12.
- HWGA — How We Generate Aliases, Provenant. provenant-dev/origin-platform, docs/how-we-generate-aliases.md, main @`cb758b1b5` (2026-08-26). A private client repository; vendor practice, [practice]. Mined in raw/12.
- KERI spec — Key Event Receipt Infrastructure (KERI) specification, Trust Over IP. trustoverip/kswg-keri-specification, spec/spec-body.md, main @`fbdd4a615` (2026-08-28) for unmarked and [spec] citations; v1.1 @`3753f3797` (2026-08-26) for the [spec-next] `DID` trait citations in [section 8.4](#07-did-trait). Mined in raw/01.
- keri-primer.md — A Primer on KERI, ACDCs, and CESR, Daniel Hardman. dhh1128/papers, keri-primer.md, main @`68a5e2f76` (2026-09-28). Mined in raw/05 and raw/06.
- keri.one — keri.one homepage, Samuel M. Smith, https://keri.one/. Mined 2026-07-17 and re-verified against the live page 2026-10-03. Mined in raw/13.
- KERIA — KERIA, WebOfTrust/keria, src/keria (including authing.py), README and pyproject.toml. main @`7e685edaa` (2026-09-11) for the request-freshness claims in [section 5.2](#07-bearer-tokens); main @`928ce26a4` (2026-09-30) for the `keri==1.2.14` dependency pin in [section 12](#07-verify-the-code). Mined in raw/10.
- KERIConf26 caption — KERI Conference 2026 edited auto-captions (Lehi, Utah, 22-23 April 2026), keri-foundation/CONF26-subtitles @`006042d39` (2026-10-04): Samuel Smith, The Future of KERI; Phil Feairheller, ACDCs for Authorization; the Ryan Hansen panel, What KERI allows us to do that we couldn't before. Cited as the captions read, for status and intent only, and paraphrased here, never quoted. Mined in raw/19 and raw/20.
- keripy — keripy, the KERI reference implementation, WebOfTrust/keripy, src/keri and tests/sedi. main @`80f77b73b` (2026-10-01, mined 2026-10-03) for the claims re-read in that pass, which carry that stamp; main @`b8f60166b` (2026-09-14) for claims not re-read since, which keep theirs; code locators with no commit come from earlier passes of raw/09. A keripy [code] is a claim about keripy main, on its 2.1.0-dev line, and not about KERIA, which pins keri==1.2.14 ([section 12](#07-verify-the-code)). Mined in raw/09 and raw/16.
- keripy GitHub — Sam Smith's comments in WebOfTrust/keripy conversations: pull request #1505 (2026-07-17, R-029), and discussions #1515 (body), #1570 (2026-08-04, R-012) and #1574 (2026-08-07, R-042). Read from the read-only API cache of 2026-10-14 (`.ignored/sam-rulings-cache/`), quotes checked against the cached text; Sam's typing errors are kept as written. [proposal]: an editor's comment, not specification text. Mined in raw/21.
- keripy-knowledge — keripy-knowledge, a distilled contributor knowledge base for keripy, on the orphan branch knowledge of dhh1128/keripy, @`9489ac9bd` (2026-07-02, mined 2026-09-15). Cited here for its invariants (H1, D1, D3) and landmines (L4, L5, L6, L9, L15, L16, L17). Its declared code baseline is keripy `60ab9e08d`, 493 commits behind `b8f60166b`; [section 12](#07-verify-the-code) says what that means for its claims. Mined in raw/08.
- kids#1 — WebOfTrust/kids#1, a GitHub conversation on a draft KERI Improvement Document about watchers, never merged; Samuel M. Smith's comment of 2023-11-05. Maintainer statements, [proposal]. No raw note mines it; [chapter 02, section 9](#02-observer-layer) quotes the same thread.
- m-glance.md — Measuring the Glance: An Adversarial Estimate of Habituated Perceptual Entropy in entviz and SSH Randomart, Daniel Hardman. dhh1128/papers, m-glance.md, main @`68a5e2f76` (2026-09-28). Mined in raw/05 and raw/06.
- MA — Managing Aliases, Provenant. provenant-dev/origin-platform, docs/managing-aliases.md, main @`cb758b1b5` (2026-08-26). A private client repository; vendor practice, [practice]. Mined in raw/12.
- oia.md — Opaque Identifier Aliases, Daniel Hardman. dhh1128/papers, oia.md, main @`68a5e2f76` (2026-09-28). Mined in raw/05 and raw/06.
- OS — Origin Security, Provenant. provenant-dev/origin-platform, docs/origin-security.md, main @`cb758b1b5` (2026-08-26). A private client repository; vendor practice, [practice]. Mined in raw/12.
- sda.md — The Shape of Delegated Authority, Daniel Hardman. dhh1128/papers, sda.md, main @`68a5e2f76` (2026-09-28). Mined in raw/05 and raw/06.
- sdjwt-acdc.md — How SD-JWT and ACDC are similar and different, Daniel Hardman. dhh1128/papers, sdjwt-acdc.md, main @`68a5e2f76` (2026-09-28). Mined in raw/05 and raw/06.
- SecurityThreatsMitigationsSEDI.web.pdf — Security Threats and Mitigations for Persistent State Issued Citizen Entitlements (SEDI), slide deck dated 2025/10/01, Samuel M. Smith. SmithSamuelM/Papers, master @`b47f21597` (2026-08-11), presentations/SecurityThreatsMitigationsSEDI.web.pdf, last changed `6fa71dd` (2026-01-16); read through pdftotext, cited by slide. [proposal]. Mined in raw/20.
- SEDI_Tradeoff.web.pdf — SEDI: Policy and Technology Trade Space, Comprehensive Solutions vs. Incremental Solutions, slide deck, Samuel M. Smith, dated 2025/10/01. SmithSamuelM/Papers, master @`b47f21597` (2026-08-11), presentations/SEDI_Tradeoff.web.pdf, last changed `d00f260` (2025-10-11); read through pdftotext, cited by slide. [proposal]. Mined in raw/20.
- SevenPrivacies.web.pdf — The Seven Privacies: Ugly Baby Pageant, slide deck, Samuel M. Smith, undated. SmithSamuelM/Papers, master @`b47f21597` (2026-08-11), presentations/SevenPrivacies.web.pdf, last changed `da3cde9` (2025-09-11); read through pdftotext, cited by slide. [proposal]. Mined in raw/17.
- sign-author.md — Signing Doesn't Always Claim Authorship, Daniel Hardman. dhh1128/papers, sign-author.md, main @`68a5e2f76` (2026-09-28). Mined in raw/05 and raw/06.
- signify-ts — signify-ts, the TypeScript Signify client, WebOfTrust/signify-ts, src (including authing.ts and clienting.ts) and README, main @`ffba8406e` (2026-09-10). Mined in raw/10.
- SPAC_Message.md — Secure Privacy, Authenticity, and Confidentiality (SPAC), version string 0.5.3, Samuel M. Smith. SmithSamuelM/Papers, master @`b47f21597` (2026-08-11), whitepapers/SPAC_Message.md, last substantive change `cd2661f` (2025-06-11), last touched `b8cc11a` (2026-04-30, a typo fix). The version string did not move with the content, so cite it by commit. [proposal]. Mined in raw/17.
- standard-analysis.md — Standard Analysis Template for KERI Security Claims. dhh1128/keri-security-analysis, standard-analysis.md, main @`149fa6c35` (2026-04-23, the repository's only commit; mined 2026-07-17). Security analysis, not specification text; it carries no provenance marker. Mined in raw/07.
- SustainablePrivacy.pdf — Sustainable Privacy, v1.2.8 2026/08/11, Samuel M. Smith. SmithSamuelM/Papers, master @`b47f21597` (2026-08-11), whitepapers/SustainablePrivacy.pdf, last changed `b47f215` (2026-08-11); read through pdftotext, cited by section and page. [proposal]. Mined in raw/17.
- TSP spec — Trust Spanning Protocol (TSP) Specification, Experimental Implementor's Draft Rev 3 with Errata, Wenjing Chu and Samuel Smith, Trust Over IP. trustoverip/tswg-tsp-specification, spec/spec.md, main @`5599b4556` (2026-09-30). The standardizing line of an explicitly experimental specification. Mined in raw/17.
- UniversalIdentifierTheory.pdf — Universal Identifier Theory, v1.40 2025/09/14 (original 2020/10/20), Samuel M. Smith. SmithSamuelM/Papers, master @`b47f21597` (2026-08-11), whitepapers/UniversalIdentifierTheory.pdf, added `e2e995f` (2025-09-14); the same blob as whitepapers/IdentifierTheory_web.pdf. Read through pdftotext, cited by section and page. [proposal]. Mined in raw/20.
- was.md — Why Anchored Signatures?, Daniel Hardman. dhh1128/papers, was.md, main @`68a5e2f76` (2026-09-28). Mined in raw/05 and raw/06.
- who-sign.md — Who Is Signing?, Daniel Hardman. dhh1128/papers, who-sign.md, main @`68a5e2f76` (2026-09-28). Mined in raw/05 and raw/06.
- wtbo.md — Where Trust Bottoms Out: X.509, Certificate Transparency, and KERI's DPKI Architecture, Daniel Hardman. dhh1128/papers, wtbo.md, main @`68a5e2f76` (2026-09-28). Mined in raw/05 and raw/06.
- x509-prob.md — Why X509 Certs Should Be Secondary Evidence of Org Identity, Daniel Hardman. dhh1128/papers, x509-prob.md, main @`68a5e2f76` (2026-09-28). Mined in raw/05 and raw/06.

---

# 08 — Presentation Architectures and the IPEX Disclosure Model {#08-presentation}

## Thesis {#08-thesis}

An ACDC presentation discloses not a credential but a directed acyclic graph of credentials, normalized to have exactly one source node, the origin, and negotiated by naming paths into that graph rather than attributes. That commitment lets ACDC absorb the other verifiable-credential architectures: a one-node DAG is a portable data lake, and a bespoke origin with N edges is a credential soup made cryptographically rigid. The hard part is a problem the graph does not answer. A DAG commits to data, and a presentation must also establish who is presenting, now, and with what authority. Freshness (KRAM), multiple endorsement, anchoring (`ax`), tethering and presentation registries all answer that authentication-factor problem, and none is in any specification branch. The commonest errors here are quoting a design discussion as spec, and quoting a spec's forward branch as its standardizing one.

## Status {#08-status}

This is the least-settled area of the KERI/ACDC design space, revised in public and in place; read it as a map of a live argument, not a conformance reference. Before relying on a claim, check keripy discussion [#1627](https://github.com/WebOfTrust/keripy/discussions/1627), then [#1613](https://github.com/WebOfTrust/keripy/discussions/1613), whose body still carries the self-declared version string "v1.5 2026/08/18" although GitHub records later edits, then the open keripy and `kswg-acdc-specification` pull requests in [Sources](#08-sources).

The distance from normative is uneven. The authentication half, [section 7](#08-authentication-factors) through [section 10](#08-anchoring), is in no specification. The structural half, [section 2](#08-one-dag-one-origin) and [section 4](#08-disclosure-paths), is in the ACDC `v1.1` branch only, so it is [spec-next]; `main` at `f0bd097de` does not contain the words Disclosure Paths. [spec] covers the bespoke ACDC, four of the five unary edge operators, the m-ary operators, the edge `s` constraint, and an IPEX route table that negotiates by naming attributes. keripy at `80f77b73b` is ahead of both branches in places, in a V2 IPEX module its CLI does not run ([section 6](#08-two-ipex)).

## 1. The four presentation architectures {#08-architectures}

[proposal] The taxonomy is from #1627, ACDC Presentation Architectures (SmithSamuelM, 2026-08-19).

### Portable Datalake {#08-portable-datalake}

One document holds all attributes about one subject from one issuer, and the holder discloses a subset: mDoc/mDL and mainstream W3C VC. It cannot express delegation; everything comes from "one and only one Issuer"; the issuer must pull from every relevant database, inviting the consolidated data lake that maximizes breach blast radius; and reissuance runs at the rate of the most volatile attribute.

### Credential Soup {#08-credential-soup}

Attributes come at presentation time from several credentials, issuers and issuees, as in Sovrin. It allows partitioned issuer databases, but negotiation is ambiguous, each source needs its own fresh proof of control, nothing proves several issuee AIDs are one party, and a soup "cannot support delegation in any normative secure way."

### Verifiable DAG {#08-verifiable-dag}

ACDC's default. Edges carry digests of their far nodes, so "A verifiable cryptographic commitment to the origin ACDC of that DAG is a verifiable commitment to every node in the DAG," and typically only the origin's issuer or issuee needs a fresh authentication factor. Delegation is native, and forgery "must be in totality, and not piecemeal," unlike in a soup. The costs are verification complexity and the reissuance cascade of [section 12](#08-sedi-recipes).

### DAG Soup {#08-dag-soup-architecture}

Several disconnected DAGs, each with its own origin, in one exchange under a multiply-endorsed grant; the subject of #1627's only concrete proposal ([section 11](#08-dag-soup)).

### ACDC subsumes the other two {#08-subsumption-claim}

"the ACDC DAG, as a special case, can mimic either a portable data lake or a credential soup as needed." One ACDC with a selectively disclosable aggregate is a data lake; a bespoke origin with N edges is a soup with a verifiable spine. It is #1627's strongest argument.

## 2. The normalized structure: one DAG, one origin {#08-one-dag-one-origin}

[spec-next] An ACDC is a graph fragment, a node and its outgoing edges only, and the exchanged graph is normalized: "That DAG MUST have exactly one source node, called the origin node" (ACDC spec > Disclosure Paths > DAG of ACDCs, L1821 @2362e48a1). Where the material is not already connected, "a DAG MUST be formed by issuing a bespoke ACDC whose node is the origin, with Edges chaining back to every other ACDC the exchange includes" (ACDC spec > Disclosure Paths > DAG of ACDCs, L1823 @2362e48a1).

The origin is a source, not a root of authority. Edges point near to far and carry the far node's digest, so authority flows toward the origin while commitment flows from it. #1627 uses "root of the DAG" for the far, deepest node, the opposite end; translate when reading it beside the spec.

The DAG is well-ordered, so "A well-ordered DAG with a single source node linearizes into a unique, reproducible order" (ACDC spec > Disclosure Paths > DAG of ACDCs > Ordering, L1831 @2362e48a1), breadth-first by choice. That lets `dp` identify an ACDC by position rather than by SAID, so a disclosure request adds no correlator of its own. The branch overloads "node" on purpose: "node path" in [section 4](#08-disclosure-paths) means a block within one ACDC, "origin node" a node of the DAG.

## 3. The bespoke origin ACDC {#08-bespoke-origin}

[spec] A bespoke (disclosure-specific) ACDC is issued by the Discloser for one exchange: "A given Discloser issues its own bespoke ACDC referencing some other ACDC via an Edge. This means that the normal validation logic and tooling for a chained ACDC can be applied without complicating the presentation exchange logic" (ACDC spec > Disclosure-specific (Bespoke) Issued ACDCs, L1862 @f0bd097de; identical at L2063 @2362e48a1). It carries presentation-specific terms in its rule section, such as anti-assimilation and one-time-purpose clauses, and names the Disclosee as Issuee, so that "Signing the agreement to the offer of that bespoke ACDC consummates a contract between the named Issuer and the named Issuee." Its structural job as origin is [spec-next]; conflating the two makes the origin apparatus look standardized.

### A purpose clause belongs in the bespoke origin {#08-purpose-clause}

[proposal] Asked whether an exchange message should state its purpose in `m`, Sam pointed to the origin's rule section: "The advantage of putting it in the DAG is that it gets all the security, perpetuality, etc of the DAG" (keripy discussion #1617, comment of 2026-08-13, R-064, https://github.com/WebOfTrust/keripy/discussions/1617#discussioncomment-18006490). It is a preference, not a ruling.

### The bespoke origin as recipe {#08-recipe}

[proposal] Unchained ACDCs from one root of trust to one issuee, the SEDI shape, are a degenerate soup, since "All the ingredients came from the same cupboard." A bespoke origin with one edge per ingredient makes them a DAG, and needs no registry or anchor: "It merely needs to be signed and have attached signatures because it's a one-time use ACDC." Its schema is not one-time: "It acts as a permanent recipe for the soup... an EGF can define the schema of the bespoke ACDC for all its seminal use cases."

#1627 justifies the recipe edge correctly, "each edge from the recipe ACDC can use the I2I edge operator", and then misstates it: "the Issuer of the recipe is the citizen AID, and the Issuer of all the far node ACDCs is also the citizen AID" is wrong, because the State issues the far nodes and the citizen is their Issuee.

## 4. Disclosure paths: the `dp` field {#08-disclosure-paths}

[spec-next] `dp` is how a disclosure is requested. It grew out of discussions #1512, #1542 and #1549 into a `v1.1` section that begins "This section is normative." (ACDC spec > Disclosure Paths, L1811 @2362e48a1). Its only binding to a message sits inside the IPEX section, which opens "This section is non-normative.", so the syntax is normative and its only use is not ([question 10](#08-q-dp-normative-seam)).

### Shape {#08-dp-shape}

"The `dp` field is not an ACDC field. It appears in the messages that negotiate a disclosure, not in the ACDCs that are disclosed" (ACDC spec > Disclosure Paths, L1813 @2362e48a1). Its value is a list of tuples, each "of the form `(ACDCSchemaSAID, PathPrefix, [paths])`" (ACDC spec > Disclosure Paths > Disclosure Paths, `dp`, Field, L1881 @2362e48a1), a list rather than a map because "Two ACDCs of the same type, that is, of the same Schema SAID, MAY appear in one DAG, and a field map could not tell them apart" (ACDC spec > Disclosure Paths > Disclosure Paths, `dp`, Field, L1883 @2362e48a1).

A request is a path rather than a schema because of Sam's layering: "So disclosure is reasoning about exposure. What parts to expose when. Not what those parts mean." (keripy PR #1505, comment of 2026-07-16, R-058, https://github.com/WebOfTrust/keripy/pull/1505#issuecomment-4992746261). [proposal]

### Path syntax and closures {#08-path-syntax}

A path beginning with `/` is DAG-absolute; others are ACDC-relative. Edge traversal "MUST therefore begin with `/e`", and the hop to the far ACDC is the virtual component `_`, as in `/e/reports/project/_/a/author` (ACDC spec > Disclosure Paths > Path Syntax > Traversing Edges, L1845 @2362e48a1). The compact CESR form separates components with `-`, which is why `v1.1` restricts field labels ([chapter 05, section 1](#05-field-label-restrictions)). A path ending in `/` designates a whole node and everything beneath it; one ending in a component "designates a single leaf" (ACDC spec > Disclosure Paths > Path Syntax > Node Paths and Leaf Paths, L1855-1861 @2362e48a1).

"The disclosure designated by a set of paths is the union of their closures" (ACDC spec > Disclosure Paths > Path Syntax > Closures, L1865 @2362e48a1). In a partially disclosable section one SAID and UUID cover the block, so a leaf path discloses all its simple fields; in the selectively disclosable Aggregate Section a leaf path "closes over that block alone and tells nothing of any sibling." The rule section "MUST NOT be assumed fully disclosed," so it is designated when wanted. Paths are not permissions: "A closure states what a path discloses. It does not bound what the Disclosee may then do with what it holds."

### Prefixes and ordering {#08-dp-ordering}

A prefix is empty or a DAG-absolute path to the tuple's ACDC, and the effective path is prefix plus entry (ACDC spec > Disclosure Paths > Disclosure Paths, `dp`, Field > Path Prefix, L1889-1891 @2362e48a1). Elements are breadth-first and "The zeroth element MUST represent the origin node ACDC" (ACDC spec > Disclosure Paths > Disclosure Paths, `dp`, Field > Identifying Each Tuple's ACDC, L1899 @2362e48a1). With empty prefixes position identifies each tuple; where a schema makes an edge optional, "The ordering then has gaps. In that case the prefix of every element after the zeroth MUST be non-empty" (ACDC spec > Disclosure Paths > Disclosure Paths, `dp`, Field > Identifying Each Tuple's ACDC, L1911 @2362e48a1). In the Aggregate Section a path may name a blinded block by its unique field label, `A/over21`, but not reach inside it (ACDC spec > Disclosure Paths > Special Cases > Aggregate Section Pathing, L1923-1931 @2362e48a1).

### Placement and the route table {#08-dp-placement}

"So where a `dp` field appears in an `apply` or `offer`, it MUST appear in that message's query section, `q`, and not in its attribute section, `a`" (ACDC spec > IPEX Protocol Messages > Disclosure Paths in `apply` and `offer`, L2015 @2362e48a1). `a` is where `ax` and the origin `o` are proposed to live ([section 10](#08-anchoring)).

The route table differs by branch. On `main` the `apply` row reads "Schema or its SAID, Attribute field label list, Aggregate element label list, signature on `apply` or its SAID" (ACDC spec > IPEX Protocol Messages, L1811-1813 @f0bd097de) [spec]; on `v1.1` both label lists in `apply` and `offer` become `dp` (ACDC spec > IPEX Protocol Messages, L2004-2006 @2362e48a1) [spec-next]. The other rows match. A row quoted without its branch misstates the protocol.

### An empty `dp` {#08-empty-dp}

In an answer, an empty list means "the answering path list is the same as the one it answers"; unsolicited, it "MUST NOT be an empty list" (ACDC spec > Disclosure Paths > Disclosure Paths, `dp`, Field > Solicited Response, L1917 @2362e48a1). [spec-next] Sam has ruled otherwise, so the branch lags its editor: "If there is no prior message then an empty [] means give me nothing. To get everything their must be a path." (keripy PR #1698, comment of 2026-10-01, R-052, https://github.com/WebOfTrust/keripy/pull/1698#issuecomment-5937132701). [proposal] keripy's upstream head follows him, "An empty plan inherits from a prior message and means no disclosure", and validates `dp` on `agree` and `grant` too (keripy acdc/ipexing.py, IpexHandler.verify, L513-519 @c102367ea). [code]

### Predefined shapes {#08-predefined-shapes}

[proposal] Sam expects the general machinery to be used narrowly: "So predefined shapes will be the norm." (keripy discussion #1542, comment of 2026-07-30, R-055, https://github.com/WebOfTrust/keripy/discussions/1542#discussioncomment-17842586), with shapes defined by EGFs. He adds a rule no branch carries: an `offer` whose origin schema differs from the `apply`'s "is functionally the same as if the Offerer spurned the apply and then initiated a new IPEX with an unsolicited offer", and an IPEX may start with an `offer` or a `grant` (same discussion, https://github.com/WebOfTrust/keripy/discussions/1542#discussioncomment-17841472).

### `dp` in keripy: negotiated, not enforced {#08-dp-in-keripy}

[code] keripy requires `dp` in `q` of `apply` and `offer`, as one validated triple in a one-element list (keripy acdc/ipexing.py, IpexHandler.verify, L497-503 @80f77b73b): "We currently only support one DAG (until Multi DAG), so exactly one entry is required" (keripy acdc/ipexing.py, _validSingleDagList, L223 @b8f60166b). An `offer` answering an `apply` inherits its plan. But `grant`, the verb that discloses, never reads `dp` (keripy acdc/ipexing.py, IpexHandler.verify, L591-596 @80f77b73b), so a grant disclosing more or less than agreed is accepted, and `Compactor.compact(paths=…)` has no caller in `src/` and no translation from `dp` paths. `dp` is implemented as negotiation, not enforcement ([question 8](#08-q-dp-enforcement)).

## 5. Edges and operators, as presentation uses them {#08-edges}

`I2I` closes the bespoke recipe, and every proposal to signal multiple endorsement in the ACDC is a new edge-group operator ([section 9](#08-multiple-endorsement)). The operators, their keripy enforcement, `E1E`, the proposed `I1I` and `DI1I`, and the decided v1.1 change of the empty-operator default to `NI2I` live in [chapter 05, section 5](#05-edges). Two facts from there matter here. keripy's `vdr/verifying.py` and V2 `acdc/ipexing.py` disagree on unrecognized, conflicting and absent operators, so an edge can pass credential processing and fail grant verification ([chapter 05, section 5.1](#05-module-disagreement)). And only V2 evaluates edge-groups over a disclosed DAG, implementing `AND` and `OR` only. [code]

The operator namespace has no registry. The Dossier spec writes `MxN`, `RMxN`, `MxQ` and `RMxQ` into it, "following ACDC operator conventions" (Dossier spec > Joint Issuance > Threshold Operators, L364-372 @6037adfb9); nothing prevents a future collision.

## 6. Two IPEX state machines, and only one of them runs {#08-two-ipex}

### V1 and V2 {#08-ipex-v1}

[code] keripy has two IPEX implementations, and every [code] claim must say which. V1, `vc/protocoling.py`, is what the CLI loads (keripy cli/commands/ipex/list.py, L25 @80f77b73b). Its legal-predecessor table runs `apply`, `offer`, `agree`, `grant`, `admit`, with `spurn` answering any of the first four; it rejects a second response to one prior and fails closed on an unmatched route (keripy vc/protocoling.py, PreviousRoutes and verify, L16-22 and L55-106 @b8f60166b; byte-identical at `80f77b73b`). V2, `acdc/ipexing.py`, is library and tests only: its `loadHandlers` (L2149-2167 @80f77b73b) has no caller in `src/keri`. V2 claims are about code that exists, not behavior keripy performs, and every authentication mechanism in sections 7, 9 and 10 is in V2.

### The split is deliberate {#08-split-deliberate}

[proposal] The `acdc` subpackage "provides a place to support the new features in acdc v2 while leaving support for acdc v1 in the vc subpackage." (keripy PR #1170, body of 2026-02-04, R-078, https://github.com/WebOfTrust/keripy/pull/1170), and "Its only with v2 exchange messages that we plan to anchor exchanges. We really don't want to be anchoring v1 exchanges." (keripy PR #1492, comment of 2026-07-27, R-057, https://github.com/WebOfTrust/keripy/pull/1492#issuecomment-5093267019). V2 is meant to survive; when the CLI moves to it is unsaid.

### Where V1 and V2 disagree {#08-v1-v2-differences}

[code] V2 lets a `grant` answer an `apply` directly, `Ipex.grant: (Ipex.apply, Ipex.agree),` (keripy acdc/ipexing.py, PreviousRoutes, L35 @80f77b73b); V1 requires `agree` first; neither ACDC branch specifies predecessors. V2 adds role symmetry between prior and reply, rejection of orphan nests and dangling edges because "grant must disclose one fully closed reachable DAG rooted at the message's `a.o[0]`", a one-nest-per-node guard against substitution, edge-group evaluation, and the checks of sections 7 and 10.

### Spurning a grant {#08-spurn-grant}

[code] V2 refuses a spurn only of a grant that answers a prior: `if verb == Ipex.spurn and pverb == Ipex.grant and pserder.ked.get("p", ""):` (keripy acdc/ipexing.py, IpexHandler._verifyReplyChain, L761 @80f77b73b), unchanged at `c102367ea`. `raw/09` section 7b states the reverse and is wrong. V1 lets a spurn answer any grant. The rule is Sam's: "an unsolicited grant i.e using a xip message should be spurnable. that is nuance i did not anticipate." (keripy issue #1628, comment of 2026-08-19, R-051, https://github.com/WebOfTrust/keripy/issues/1628#issuecomment-5349282926). A disclosee who never asked can refuse a credential; one who agreed cannot repudiate after the grant. [proposal] Neither branch's route table has a row for spurning a `grant` (ACDC spec > IPEX Protocol Messages, L1812-1816 @f0bd097de; L2005-2009 @2362e48a1) ([question 11](#08-q-spurn-grant)).

### Deferral and refusal {#08-defer-vs-refuse}

[code] The exchange handler escrows a message whose chain is missing, because "Registry-backed IPEX grants may arrive before the disclosee has fetched the issuer's TEL history from observers", and drops one whose behavior check fails before it is logged (keripy peer/exchanging.py, Exchanger.processEvent, L389-410 @80f77b73b). Only the grant route opts out of waiting on missing foreign evidence: "Opted routes request the KEL and continue with known factors." (keripy peer/exchanging.py, Exchanger.processEvent, L167 @80f77b73b).

## 7. Authentication factors: the second problem {#08-authentication-factors}

[proposal] The DAG does not prove the sender controls anything now. #1613, Authentication Factors in IPEX, treats this.

### Two purposes, three ranked factors {#08-factor-ranking}

Each ACDC in a granted DAG needs an Issuer factor; the `grant` needs a fresh Grantor factor; "For a given ACDC, a Grantor may be the Issuee, Issuer, both, or neither." Factors rank registry (TEL) anchor, KEL anchor, bare signature, because anchors "enable perpetual verifiability and detectability of impersonation fraud. Whereas a bare signature does not," and the highest supplied factor is used. A bare signature dies with the issuer's key state: such ACDCs "become unverifiable and must be reissued" after rotation, so a signature-only bespoke origin suits a one-time recipe and not later proof of what was presented.

### The issuer factor in keripy {#08-issuer-factor-every-node}

[code] V2 requires "one valid issuer authentication factor per node" (keripy acdc/ipexing.py, IpexHandler._verifyIssuerAuthGraph, L1132 @80f77b73b), choosing one without fallthrough: registry if a top-level `rd` is present, else an issuer-KEL seal, where "An invalid anchor must not silently downgrade the ACDC to signature authentication.", else signatures that "already name the current state" (keripy acdc/ipexing.py, IpexHandler._verifyIssuerAuthNode, L1237-1240 @80f77b73b). By inference from the code, not a run, an unanchored ACDC signed under since-rotated keys no longer authenticates in a V2 grant ([question 9](#08-q-current-keys)).

### Vocabulary and the receiver AID {#08-receiver-aid}

The Discloser sends `offer` and `grant`; the Disclosee sends `apply`, `agree` and `admit`. "In common parlance, a Grantor is a Presentor, and the grant is a presentation." Every message names both parties, and Sam treats the negotiating AIDs as the price of a binding contract rather than a leak: "Proof of participation is not the same as correlation." (keripy discussion #1542, comment of 2026-07-23, R-054, https://github.com/WebOfTrust/keripy/discussions/1542#discussioncomment-17755467). [proposal] V2 refuses a reply whose prior names no receiver (keripy acdc/ipexing.py, IpexHandler._verifyReplyChain, L766-768 @80f77b73b). [code]

## 8. Freshness: KRAM, and what rests on it {#08-freshness-kram}

KRAM is treated in [chapter 09](09-kram-and-request-authentication.md); this section covers how IPEX depends on it. A signature is a bearer token, "Any holder of both the document and its signature can replay them, and the signature will verify" (#1613), and KRAM gives one play or none within a window on the receiver's clock, collecting a multisig sender's signatures in its escrow. It uses monotonic receiver-clock datetimes, not the nonce #1613 describes ([chapter 09, section 8](#09-load-bearing)), and it is in no KERI specification ([chapter 09, section 5](#09-normative-status)), so the freshness the multiply-endorsed design needs is absent at the specification layer.

### The evidence policy {#08-evidence-policy}

[code] keripy's `Kramer` passes non-sender attachments through, and each route decides their fate: a route without a `verifyEvidence` policy rejects foreign evidence (keripy peer/exchanging.py, Exchanger.processEvent, L140 @80f77b73b). In V2, "Only Grant accepts supplemental grantor evidence." (keripy acdc/ipexing.py, IpexHandler.verifyEvidence, L1574 @80f77b73b), keeping signatures under the endorser's current establishment event and fresh source seals, a valid seal displacing the same AID's signatures. Accepted endorsements are indexed by AID in `eidx`. V1 has no policy and refuses. A valid source seal authenticates an `exn` sender on its own, after which an invalid optional sender signature group is tolerated; do not simplify that into a conjunction.

V2 also reads KRAM's acceptance time: "A presentation requirement needs a completed KRAM acceptance." (keripy acdc/ipexing.py, IpexHandler._verifyPresentationAuthGraph, L1524 @80f77b73b), with the receiver time `rdt` as the registry-history cutoff ([chapter 10, section 6](#10-rdt-coupling)).

### Tethering {#08-tethering}

[proposal] The `grant` carries the origin SAID in an origin `o` field, and an ACDC is tethered "when any Grantor AID appears anywhere in the DAG of ACDCs originating at the origin ACDC"; "Tethering implies no other relationship besides fresh (timely) proof-of-control over an AID so tethered." The case is entitlement replay: Cal must know that Bob, not a thief, presents Bob's coupon. V2's set named `tethered` holds registry-authenticated Issuees and is not this; #1613's tethering is unimplemented. [code]

## 9. Multiply endorsed presentation {#08-multiple-endorsement}

### #1555 and #1556 {#08-proposal-1555}

[proposal] #1555 lets non-sender AIDs attach signature groups to a single `grant`, under KRAM's timeliness, and puts the signal in the ACDC because "There is no normative cryptographic commitment in an exchange message to a given schema." Its mechanism is a new m-ary edge-group operator, `ME`, on a bespoke origin: each far ACDC must be endorsed by its issuee. #1613 supersedes most of it, but not `ME`. Its companion #1556 makes unary defaults depend on the enclosing group (`NI2I` under `ME`) and adds an `IAND` group defaulting to `E1E`, rather than changing a global default that "might break vLEIs in the wild." A maintainer call has since decided a global `NI2I` default for v1.1 ACDCs ([chapter 05, section 5](#05-default-gate)).

### #1613, the current proposal {#08-proposal-1613}

[proposal] #1613 "solves for the proxy negotiator for another AID use case without needing a new edge operator." It "does not supersede the proposal for a new edge operator" and leaves several AIDs negotiating in concert unsolved. The motive is correlation: a controller uses one AID as proxy "so that this other AID is not disclosed until after contractual protection is in place". The IPEX processor "MUST validate all non-sender endorsements after KRAM" against each endorser's current key state and threshold, preferring a seal source to signatures. Endorsement attaches to the `grant` alone, since "A valid IPEX could consist of only a `grant` message." A non-sender multisig endorser gets no help from KRAM's escrow, so "the Grantor must employ some pre-protocol to collect a threshold-satisfying set of signatures and then attach them to the grant"; the offered mitigation, that proxy and principal share a controller, constrains deployment topology.

### What keripy does with endorsements {#08-keripy-endorsement}

[code] V2's `grant` generator takes endorsers, "Additional local habitats that sign the same outer exchange as non-sender grantors (e.g proxy AIDs).", and anchorers (keripy acdc/ipexing.py, _sign, L291-294 @80f77b73b). The verifier filters and stores endorsements as [section 8](#08-evidence-policy) describes, then unpacks `_, _, extraSeals = evidence` (keripy acdc/ipexing.py, IpexHandler.verify, L605 @80f77b73b) and discards the signatures: only seals count, and only toward `ax`. #1613's per-Grantor endorsement requirement has no consumer, the multisig pre-protocol is moot in the code, and whether non-sender signatures are threshold-checked is unverified ([question 6](#08-q-endorsement-signatures)).

### Live co-presence versus durable consent {#08-copresence-vs-consent}

`ME` needs every issuee online at presentation time, so it does not cover an offline party such as a guardian's dependent. That case closes under plain `I2I` with a consent ACDC between: `bespoke(issuer=A, issuee=V) --I2I--> consent(issuer=B, issuee=A) --I2I--> credential(issuer=HA, issuee=B)`, which A cannot forge because B must issue the consent. This was measured against keripy's v2 code in #1555's comments.

## 10. Anchoring: `ax`, presentation registries, origin-AID anchoring {#08-anchoring}

This comes from #1613, in neither ACDC branch; all three anchoring legs are [code] in keripy's unwired V2 module.

### The `ax` field {#08-ax-field}

[proposal] KRAM gives no way "to signal to the IPEX that the relevant messages MUST be perpetually verifiable and hence anchored." `ax` is a boolean in the `a` section of `apply`, `offer` and `grant`. Satisfying it means the Grantor anchors the `grant` and the Applicant anchors `agree` and `admit`. Unlike `dp`, which sits in `q`, `ax` and the origin `o` sit in `a` and do appear in a `grant`.

### `ax` in keripy {#08-ax-keripy}

[code] Anchoring is negotiated state: replies preserve it, and an `offer` may initiate it but not drop it (keripy acdc/ipexing.py, IpexHandler.verify, L561-568 @80f77b73b); that one-sidedness is an invariant. "Agree and Admit satisfy anchoring directly through their sender." (keripy acdc/ipexing.py, IpexHandler.verify, L573 @80f77b73b), by a seal in the sender's KEL whose digest is the exn's SAID; missing KEL evidence defers rather than refuses. For a grant, "A truthy ax requires one permitted Grant anchorer." (keripy acdc/ipexing.py, IpexHandler.verify, L620 @80f77b73b): any anchoring AID among `candidates = (serder.pre, origin.iseaid, origin.israid)` (L648), the sender or the origin's Issuee or Issuer, including Issuees a presentation registry authenticated. So a grant can satisfy `ax` with no sender anchor. `o` and `ax` are one-item lists on the wire, "until Multi DAG" ([section 11](#08-dag-soup)).

### An origin `o` on the `offer` {#08-offer-origin}

[proposal] "The offer message also needs to have an origin `o` field to replace the ACDC field." (keripy PR #1629, review of 2026-08-20, R-053, https://github.com/WebOfTrust/keripy/pull/1629#pullrequestreview-4987948288), naming the metadata ACDC DAG whose rule section the agreent must see before agreeing. Neither branch has it.

### Presentation registries {#08-presentation-registries}

[Chapter 10](10-presentation-registries.md) is their home. An Issuee-controlled registry binds the `grant` SAID, signalled by the issuer through `rd` and `i` in the ACDC's attribute section. V2 will "Verify every presentation registry declared across the DAG." (keripy acdc/ipexing.py, IpexHandler.verify, L609 @80f77b73b) on every `grant`, and a binding authenticates its Issuee without an endorsement, where #1613 says such a grant is "always double-authenticated" ([chapter 10, section 7](#10-keripy-verifier)). #1613 also floats restricting `rd` in `a` to presentation registries ([question 5](#08-q-rd-restriction)).

### Why anchor, and the contractual logic {#08-contract-logic}

[proposal] Anchoring `agree` proves agreement before disclosure; anchoring `grant` proves "what was granted and, as importantly, what was not granted"; anchoring `admit` "removes plausible deniability regarding the Disclosee's knowledge of the disclosed information and could trigger safe harbor protections." The `agree` binds: "An agree is legally binding not sending an admit does not convey backing out." (keripy PR #1505, comment of 2026-07-17, R-049, https://github.com/WebOfTrust/keripy/pull/1505#issuecomment-4997904242). Because the messages are hash-chained, "anchoring the tail also anchors the whole transation including the head" (keripy PR #1505, comment of 2026-07-16, R-050, https://github.com/WebOfTrust/keripy/pull/1505#issuecomment-4996894599), so multiple anchors are contingencies, letting each peer require the other's anchor before its next step without a trusted third party.

### Four tiers of IPEX {#08-four-tiers}

[proposal] Sam's decision aid (keripy discussion #1512, comment of 2026-07-22, R-062, https://github.com/WebOfTrust/keripy/discussions/1512#discussioncomment-17737728) has four tiers: signed only, where "Only the granted ACDC is itself perpetually verifiable, Not the IPEX transaction"; signed with a presentation registry, letting the presenter detect use of compromised keys; anchored, where "The Agree, and Admit exchange messages are anchored by the Disclosee. The Grant is anchored by the Discloser."; and anchored with a registry, the ACDC requiring anchoring through the `rd` in its attribute section.

### Origin-AID anchoring {#08-origin-aid-anchoring}

[proposal] With several Grantors, #1613 rules that "either the sender must anchor the grant or the Issuee or Issuer of the origin ACDC of the grant must anchor the grant," in that priority, so the sender can stay out of the disclosed DAG. keripy implements set membership, not priority. [code] The rule is "a loose business logic requirement" below EGF policy: a grant can satisfy `ax` and still be refused by the verifier's own rules, such as one that Bob specifically must anchor.

## 11. DAG soup: the list form, and what remains open {#08-dag-soup}

### Why it is needed {#08-why-dag-soup}

[proposal] #1627 argues that when "each have different Issuee, then the presentation must be multiply endorsed", and that several DAGs in one exchange beat a series of IPEXes, which "requires a meta IPEX protocol." With anchoring, signalling by edge operator would need yet another operator, so "the complications of a combination of multiply-endorsed and multiply-anchored presentations may flip the trade-space away from using edge operators as the primary way to signal either or both."

### The list form {#08-list-form-amendment}

[proposal] #1627's preferred option makes `dp` "a list of a list of tuples," `o` "a list of SAIDs," and `ax` "a list of Booleans," one element per DAG, presented as needed now because "the `dp` field is already a list. So it would be ambiguous". A field-map form with an informative label per DAG is offered as deferrable. dhh1128 endorsed the list form. keripy carries its single-DAG case, so the multi-DAG generalization needs no type change ([section 10](#08-ax-keripy)). [code]

Position avoids a leak: a meaningful label, sent before terms are agreed, describes the evidence to a disclosee who may walk away, while position discloses only a count. A positional gap, though, cannot say which DAG is missing.

### What the list form does not settle {#08-list-form-open}

No message carries both `dp` and `o`, so the disclosee's order in an `apply` and the discloser's in a `grant` are unbound, and an `ax` list in an `apply` indexes nothing. Sam's reply on the discussion, that the KEL anchor "only applies when their is not a presentation registry being used by DAG ACDCs", says which obligation falls on which AID, not what the index means. `ax` also binds the `agree` and `admit`, of which there is one each per exchange, so a per-DAG `ax` has no reading for the disclosee's half ([question 3](#08-q-dag-ordering)).

The "ambiguous" claim may not hold, since each field is type-discriminable with one probe, the argument #1627 uses for the field map. keripy adopted the nested form anyway while `v1.1` says a `dp` value is a list of tuples, so code and branch disagree on its shape. Of the three fields, only `ax` gains a capability from multi-DAG: a negotiated anchoring obligation bound to one body of evidence, which a single bespoke origin cannot express.

## 12. The two SEDI recipes, and the reissuance cascade {#08-sedi-recipes}

[proposal] #1627's applied section offers a genuine trade. A bespoke origin as recipe forms relationships only at presentation time, so data changes "do not trigger a cascade of reissuance of other ACDCs", at the cost of a bespoke ACDC per presentation and no memorialization of the graph's state. A chained ontology pre-builds the DAG with non-delegative edges (`NI2I` or `E1E`), so "All presentations are just branches of this master recipe." It is simplest for tooling and interop, at the cost of a cascade: changes in upper branches force reissuance below, so volatile data belongs in the leaves. Delegation is not tradeable: "secure delegation requires a DAG that represents the authority structure. A bespoke ACDC can not replace it. The delegation chain is inescapable."

### Which node is the origin {#08-ontology-origin-tension}

Under the ontology recipe a presentation is a branch whose source is not the ontology's origin, yet anchoring and tethering are stated against "the origin ACDC" of the grant. If the branch root is the origin, who can satisfy `ax` changes with the branch; if the ontology's source must be, every presentation drags the upper graph along. #1627 does not say ([question 2](#08-q-ontology-origin)).

## 13. Ground-truth matrix {#08-ground-truth}

keripy at `80f77b73b` unless a cell says otherwise; V2 means `acdc/ipexing.py`, which nothing in `src/keri` calls. Operator rows are in [chapter 05, section 5.1](#05-verifying-ground-truth).

| Construct | ACDC `main` | ACDC `v1.1` | Proposed in | keripy |
|---|---|---|---|---|
| One DAG, one origin | absent | present | #1549 | grant must disclose one closed DAG from `a.o[0]` (V2) |
| Bespoke origin | present | present | #1627 | named, not built |
| `dp` paths in `q` | absent | present | #1512, #1542, #1549, PR #1698 | wire shape on `apply`/`offer`; not enforced; at `c102367ea` also `agree`/`grant` |
| `apply`/`offer` route rows | label lists | `dp` | — | `dp` (V2) |
| Spurn of `grant` | no row | no row | issue #1628 | V2: flow-starting only; V1: any |
| Predecessor table | none | none | — | V1: `agree` before `grant`; V2: `grant` may answer `apply` |
| KRAM | absent from KERI spec | — | KRAM whitepaper, #1613 | see [chapter 09](#09-keripy) |
| Non-sender endorsements | — | — | #1555, #1613 | V2 `grant` keeps valid subset, then discards signatures from the verdict |
| Issuer factor per node | — | — | #1613 | V2: exactly one of registry, KEL seal, current-key signature |
| `ax`, origin `o` in `grant` | — | — | #1613 | one-item lists; `grant` anchored by sender or origin Issuee or Issuer (V2) |
| Origin `o` in `offer` | — | — | PR #1629 | not checked |
| Presentation registry | `rd` in `a` permitted | same | #1095, #1613 | verified on V2 `grant` ([chapter 10](#10-keripy-verifier)) |
| Tethering | — | — | #1613 | absent |
| `ME`, `IAND`, group-scoped defaults | — | — | #1555, #1556 | absent at `42db8991b`, not re-tested |

Absences last tested at `42db8991b` are not current negatives. The authentication rows are empty in both spec columns and fullest in code keripy's CLI does not load.

## 14. Open questions and known tensions {#08-open-questions}

### Question 1: Where does the multi-endorsement signal live? {#08-q-signal-home}

#1555 says the ACDC; #1627 leans toward the `exn`. `ME` is not superseded, so both are live.

### Question 2: Under the ontology recipe, which node is the origin? {#08-q-ontology-origin}

It fixes who can satisfy `ax` ([section 12](#08-ontology-origin-tension)).

### Question 3: What binds the DAG ordering across messages? {#08-q-dag-ordering}

Nothing yet ([section 11](#08-list-form-open)).

### Question 4: What is KRAM's normative home? {#08-q-kram-home}

It is load-bearing for sections 8 through 10 and in no specification ([chapter 09, section 9](#09-open-questions)).

### Question 5: Should `rd` in the attribute section be restricted to presentation registries? {#08-q-rd-restriction}

Disambiguation, the EGF declaring the purpose, breaks nothing, because a presentation registry needs `rd`+`i` in `a` and a non-empty top-level `rd` while the hiding case needs the top-level `rd` absent. Forbidding strikes the spec's method of providing "the `rd` field nested inside either the Attribute or Aggregate section" (ACDC spec > Annex > Bulk-issued Private ACDCs > Basic Bulk Issuance Procedure, L3049 @2362e48a1). #1613 calls the hiding case useless under independent-registry bulk issuance, and pending `kswg-acdc-specification` #204 rebuts it: the Registry SAID "remains, however, a stable identifier for the copy itself, and hence for the context in which that copy is used."

### Question 6: Are endorsement signatures meant to count? {#08-q-endorsement-signatures}

Either a policy layer reading `eidx` is coming or anchoring has replaced #1613's endorsement requirement ([section 9](#08-keripy-endorsement)).

### Question 7: What should a validator do with an unrecognized operator token? {#08-q-unknown-operator}

keripy's two modules differ, and Sam assents to the diagnosis that neither branch says: "This seems right." (kswg-acdc-specification issue #201, comment of 2026-07-31, R-031, https://github.com/trustoverip/kswg-acdc-specification/issues/201#issuecomment-5138898171). No remedy is stated ([chapter 05, section 5.1](#05-module-disagreement)).

### Question 8: Is unenforced `dp` a gap or a design? {#08-q-dp-enforcement}

Sam's view on a neighboring question is that "each type of use case needs a specific workflow that defines by construction what is disclosed at what stage." (issue #1532, comment of 2026-07-23, R-063, https://github.com/WebOfTrust/keripy/issues/1532#issuecomment-5058749739). If `dp` enforcement follows that, it belongs in EGF workflow tooling, not the verifier; the inference is this chapter's. Whether KERIA or signify enforce it is unchecked.

### Question 9: Is "current keys only" intended for issuer signatures? {#08-q-current-keys}

If so, rotation silently invalidates every unanchored, registryless ACDC an issuer signed, for IPEX; if not, it is a bug ([section 7](#08-issuer-factor-every-node)).

### Question 10: `dp`'s syntax is normative and its only binding is not {#08-q-dp-normative-seam}

Sam forecasts, assuming an IETF working group, that "IPEX probably gets its own spec" (keripy discussion #1542, comment of 2026-07-30, R-056, https://github.com/WebOfTrust/keripy/discussions/1542#discussioncomment-17841472). [proposal]

### Question 11: Should the route table say a flow-starting grant may be spurned? {#08-q-spurn-grant}

Sam and V2 say so; the spec has no row and V1 differs ([section 6](#08-spurn-grant)).

## Sources {#08-sources}

- ACDC spec — Authentic Chained Data Containers (ACDC) specification, Trust Over IP. trustoverip/kswg-acdc-specification, spec/spec-body.md, on two lines; the branch is part of the citation. `main` @`f0bd097de` (2026-08-28) for [spec] claims (route table L1809-1818, Bespoke Issued ACDCs L1860). `v1.1` @`2362e48a1` (2026-09-11) for [spec-next] claims (Disclosure Paths L1809-1986, `dp` in `apply`/`offer` L2013-2019, route table L2004-2009, bulk issuance L3049). Mined in raw/03.
- Dossier spec — KSWG Dossier specification, Trust Over IP. trustoverip/kswg-dossier-specification, spec/dossier-spec-body.md, Threshold Operators (L364), @`6037adfb9` (2026-08-12). Mined in raw/04.
- keripy — KERI reference implementation, WebOfTrust/keripy, src/keri and tests. `main` @`80f77b73b` (2026-10-01) for [code] claims not stamped otherwise (`acdc/ipexing.py`, `peer/exchanging.py`, `cli/commands/ipex/list.py`). `upstream/main` @`b8f60166b` (2026-09-14) for `_validSingleDagList` and `vc/protocoling.py` (byte-identical at `80f77b73b`). @`42db8991b` (2026-08-25) for the `ME`, `IAND` and group-default absences. Upstream `main` @`c102367ea` (2026-10-14), `acdc/ipexing.py` only, via the GitHub contents API. Mined in raw/09, raw/15, raw/16 and raw/21.
- keripy discussions — WebOfTrust/keripy discussions, https://github.com/WebOfTrust/keripy/discussions, by SmithSamuelM; bodies are revised in place, so quote, do not cite by line; snapshots of 2026-09-15, ruling comments from the raw/21 cache of 2026-10-14. #1512 (R-062), #1542 (R-054 to R-056), #1549, #1555, #1556, #1613 (body says v1.5 2026-08-18), #1617 (R-064), #1627 (last edited 2026-09-11), #1095. Mined in raw/09, raw/15, raw/16 and raw/21.
- keripy issues and PRs — WebOfTrust/keripy, https://github.com/WebOfTrust/keripy/issues and https://github.com/WebOfTrust/keripy/pulls, cited for Sam's rulings by comment URL from the raw/21 cache of 2026-10-14: PR #1170 (R-078), PR #1492 (R-057), PR #1505 (R-049, R-050, R-058), issue #1532 (R-063), issue #1628 (R-051), PR #1629 (R-053), PR #1698 (R-052). Mined in raw/21.
- KRAM whitepaper — KERI Request Authentication Mechanism, v0.7.6, Samuel M. Smith. SmithSamuelM/Papers, whitepapers/kram.md, `master` @`67550b477`. Treated in [chapter 09](09-kram-and-request-authentication.md). Mined in raw/15.
- kswg-acdc-specification issues and PRs — trustoverip/kswg-acdc-specification, https://github.com/trustoverip/kswg-acdc-specification/issues. Issue #201 (R-031), mined in raw/21; PR #204 (pending), not mined in a raw note.

---

# 09 — KRAM and Request Authentication {#09-kram}

## Thesis {#09-thesis}

KERI signs everything, and a signature over an unordered message can be replayed by whoever captures it. Key events are immune, because a sequence number and prior digest give each its place in a total order, but the six non-key-event message types that carry KERI's supporting traffic (`qry`, `rpy`, `pro`, `bar`, `xip`, `exn`) have no such order. KRAM supplies their replay protection, and its design commitment is that the protection be non-interactive: no challenge, no nonce round trip, no session, because challenge-response doubles the traffic and reintroduces a synchronous channel into a protocol built for asynchronous public networks. KRAM uses a datetime stamp read against the receiver's clock, so the sender cannot lie about time, and in its full form a monotonic cache keyed per message. Those supply the two properties every replay defense needs, timeliness and uniqueness.

## Status {#09-status}

KRAM is in no KERI specification, and it is substantially implemented in keripy, a 2,324-line module with a 6,193-line test file at `80f77b73b`. Every open question in this chapter lives in that gap. In keripy KRAM is also no longer only a replay filter: it records the receiver time at which it accepted a complete transactioned message, and IPEX's presentation-registry check depends on that record ([section 8](#09-load-bearing)). None of this reaches KERIA, which pins `keri==1.2.14` rather than keripy `main` ([section 5](#09-normative-status)).

## 1. What problem KRAM solves, and why not the obvious alternatives {#09-problem}

[proposal] A signed message can be attributed to its sender's controller only while key state holds: "Should the key state change between the time of origination and the time of verification, then the verifier can no longer assume the signature as a secure form of attribution because one of the primary reasons for a given controller to change its key state is to recover from key compromise" (keripy discussion [#934](https://github.com/WebOfTrust/keripy/discussions/934) > KRAM). Attribution defeats impersonation at reception, and no more.

[proposal] The scope is the non-key-event layer: "KERI Key Event messages and their associated KELs have built-in ordering mechanisms that are tied to the current key state, so they are self-protecting from replay attacks. However, the generic exchange, query, reply, prod, and bare messages do not have any built-in replay attack protection. For this purpose, the KRAM (KERI Request Authentication Mechanism) was designed." (#934). Asking whether KRAM applies to an `icp` or `rot` is a malformed question.

[proposal] #934 rejects sessions as "precluded for asynchronous networks" and challenge-response because it "is fundamentally less scalable… since it requires a minimum of two times the message traffic for each message to be authenticated." The whitepaper adds that nonce challenge-response predates network time servers, cheap random numbers and affordable signatures; with verified key state and ubiquitous NTP, a signed timestamp is the mechanism to beat. The KERI specification argues the same for data at rest, without naming KRAM: "Because non-interactive mitigations are asynchronous, however, they do not have the latency and scalability limitations of interactive mitigations and are therefore preferred" (KERI spec > BADA (Best-Available-Data-Acceptance) Policy > Security Issues, L2878). [Section 6](#09-kram-and-bada) takes up where BADA and KRAM collide.

[proposal] "In general replay attack protection imposes some form of timeliness to any signed request and some form of uniqueness to any signed request" (KRAM whitepaper > Replay Attack Protection). Everything below is one of those two properties or a resource bound on them.

## 2. Simple KRAM: what is deployed, and why it is not enough {#09-simple-kram}

[proposal] In simple KRAM a message carries a `dt` stamp, and the receiver accepts it only inside a window around its own current time, `[t-d-m*l, t+d]`, for clock skew `d`, average latency `l` and a small integer `m` (example values 0.01 s, 1 s, 3). There is no cache, and "This window limits the time during which a replay attack can be mounted… Therefore the protective efficacy of simple KRAM is better the smaller the window." Because the window is anchored to the receiver's clock, "the originator of the message can't lie about time." That survives into full KRAM.

[proposal] Only this version shipped: "due to the exigency of limited resources in implementing support for the vLEI, only the most expedient version of KRAM, called simple KRAM, was implemented. This has now become problematic and is largely the root cause of the associated issues and discussions." (#934). #934 generalizes this into why KERI components sit at uneven maturity: under the vLEI's time and budget pressure, "bare-bones features needed for the vLEI became expedient, whereas other features were not."

### Multisig cannot fit through a three-second window {#09-multisig-window-failure}

[proposal] With a multisig sender, a simple-KRAM receiver can only accept on any one member's signature, and then "the message is not protected by the threshold of the group multi-sig." Escrowing for the rest does not help, because "all the to-be escrowed signatures must still arrive within the narrow time window, which means the coordination of the group members must be tight enough to fit in this window." People on separate devices do not sign within seconds, so a multisig `exn` under simple KRAM abandons its threshold or cannot be sent.

[proposal] The supported workaround is two-level simple KRAM: the over-the-wire `exn` is a wrapper single-signed by one member and subject to KRAM, carrying an embedded payload signed by the group, not subject to KRAM, and collected in an escrow — "a tunneled exchange message… The tunnel is meant to cross through simple KRAM." Every member signs twice. Collecting payload signatures before sending is HAMI ([keripy#911](https://github.com/WebOfTrust/keripy/issues/911)). A window that must be short to be secure, meeting a ceremony whose length humans set, produces a tunnel through the security mechanism; full KRAM's move is to make the window long without making it weak.

### Signify request signatures carry no freshness check {#09-signify-freshness}

KERIA's client requests are authenticated by signature, not by KRAM, and [code] nothing checks their freshness. In KERIA at `7e685edaa` `SignedHeaderAuthenticator` lists `Signify-Timestamp` among its `DefaultFields` (KERIA `src/keria/core/authing.py`, L81) and verifies the RFC 9421 signature base, but `inputage.expires` is only folded into that base (L143-144), `ESSRAuthenticator.inbound` signs the timestamp as `dt=dt` (L253) without comparing it, `fromIso8601` does not appear in the file, and there is no replay cache in `src/keria`. signify-ts at `ffba8406e` likewise folds `input.expires` into the signed parameters (signify-ts `src/keri/core/authing.ts`, L136-137) and never compares it. The signature covers `@method` and `@path`, so a captured request cannot be replayed against another method and path, which is more than a bearer token offers; against the same pair it replays until key rotation. This is a negative search over a bounded set of files, and since the fields are present and signed, enforcement would be a verifier change with no wire change ([chapter 07, section 5.2](#07-bearer-tokens)).

## 3. Full KRAM: monotonic caches, and why the window can be long {#09-full-kram}

[proposal] Full KRAM asks whether a timestamp is fresh and strictly later than the last one cached for this sender. Once the cache does the uniqueness work, "the monotonicity of the cache protects against a replay attack and the time window merely bounds the memory requirements." A window that is only a memory bound can be hours or weeks, which is what makes multisig workable. The window is `[t-d-l, t+d]` on the receiver's clock (example values `d = 100` ms, short lag 2 s, long lag 2 h, exchange lag 48 h), and each cache entry records the window parameters in force when it was created, so reconfiguration never disturbs caches in flight.

[proposal] A rewound receiver clock would reopen old windows, so "the receiver persists to durable storage a single timestamp of the latest time it sees. If the network time is even older than the latest saved time, the receiver can refuse to accept messages until the clock catches up." Under the strict policy the receiver answers a signed request once, so an interception shows up to the sender as a missing or redirected response: duplicity-detection reasoning applied to request authentication.

[proposal] Cache keys are drawn from `[source AID, message type, route, exchange ID, message ID]`. Finer keys stop interleaved transactions colliding and raise throughput, since microsecond timestamps give about a million monotonic slots per second per entry; in the whitepaper's worst case, `d = 100` ms with zero latency, a sender has about 90,000 slots before it must block, so microsecond resolution "is more than adequate for the foreseeable future." One rule has teeth: "When using per-transaction ID or per-message ID caching, the window size must be per transaction type, not per transaction ID/message ID, to avoid a cache-prune replay attack." A sender that named its own window could exhaust the receiver's memory or open a replay gap at prune time, so the window class is always the receiver's decision. Reordering by asynchronous delivery is not replay; the whitepaper uses one cache entry per transaction on asynchronous transport, because interactive transactions self-order.

## 4. The v0.7.6 redesign: three authentication types, two window levels, two gap attacks — and one rule that lives only in code {#09-redesign}

The whitepaper's front matter is a redesign that supersedes the sections behind it, and reading those older sections as current is the easiest mistake to make with this source. Sam's motive: "we added a lot of flexibility to allow resource tuning that may be overkill… in hindsight, I think single-key and multi-key controlled identifiers are sufficiently different that a different logic split would benefit."

[proposal] There are three authentication types: attached seal reference (`asr`), attached signature single-key (`assk`) and attached signature multi-key (`asmk`), split by "the cardinality of the current key list for the sender AID, not by whether the attached signature(s) satisfy the threshold… because threshold satisfication requires verifying the attached signatures first, which is a much heavier operation than merely counting the elements in the key list." A seal reference is authenticated by the sender's KEL and takes the short window; when both a seal and signatures arrive, the cheaper seal is checked first. Only `asmk` waits, so long windows are confined to the one case that needs them.

[proposal] There are two window levels: an inner window per message ID, `[rdt-d-l, rdt+d]`, and for transactioned exchanges an outer window per exchange ID, `[xdt, xdt+xl]`, from the `dt` of the opening `xip`, because "a transaction may not advance until a message is authenticated". A message's SAID digests its `dt`, so messages with different datetimes have different caches, and a sender needs no cross-device synchronization; the price is that "the lower storage limit required for full KRAM is higher," leaving window size as the only knob. The redesign assumes KERI v2: a v1 `exn` is non-transactioned even when its `p` field chains it.

### Accept lag versus prune lag, and the two gap attacks {#09-gap-attacks}

[proposal] Each cache type has paired lags, `sl/ll/xl` to accept and `psl/pll/pxl` to prune, with prune at least accept. They make reconfiguration safe against two attacks. Gap replay: a message is accepted and pruned, the accept window is lengthened, and the replay falls inside it with no cache entry to refuse it. Gap first-play: a message rejected as too old is never cached, the window is lengthened, and an attacker plays it first, so the victim, who reissued it with a fresh `dt`, suffers the effect twice. The mitigation is staged: raise the prune lag at once, and delay raising the accept lag by the difference. Decreases are safe. Changing cache-type granularity is unsolved: "This logic has yet to be worked out".

[proposal] A `"kram"` configuration carries `enabled`, `caches` and `denials`, triples of version, ilk and route prefix that act "like a set of explicit firewall denial rules," for pre-KRAM applications and for "message-type-route combinations, such as BADA-RUN endpoints, that conflict with KRAM." If the sender's KEL is missing, drop the message and cue a retrieval rather than escrow, because "the time required to notify and then retrieve the KEL exceeds the KRAM message window, causing the message to be dropped, even after the KEL is retrieved. Which makes moot the use of the escrow." The whitepaper also notes that the existing escrow logic has "a bug… that can cause a loop that repeatedly reescrows." Stripping attachments forces a weak denial of service, stripping and reattaching invalid signatures a stronger one, and a bogus seal beside valid signatures attempts amplification; the answer is to accept if either authenticator validates and check the cheapest first, with transport encryption as a complement.

### Which key state authenticates a signature: the currency rule, and the one place it is written down {#09-currency-rule}

[code] This rule is in keripy's code and in no specification. A transferable signature arrives as a `tsg`, `(prefixer, number, sdiger, sigers)`, whose `(number, sdiger)` names an event in the signer's KEL, and the receiver must decide whether that reference is current: the sender's latest event of any kind, or its last establishment event. The two agree until a non-establishment event intervenes. keripy takes the second: "Signing keys change only at establishment events, so the key state ref names the last establishment event rather than the last event of any kind" (keripy `core/kraming.py`, module docstring above `class Kramer`, L70-75 @`b8f60166b`), enforced by `if (number.sn != kever.lastEst.s or sdiger.qb64 != kever.lastEst.d): continue` (keripy `core/kraming.py`, `Kramer._verifyAttachedSigs`, L706-707) and at ten sites ([section 7](#09-keripy)). Stale signatures, made under key state a rotation has superseded, are still refused (keripy `tests/core/test_kraming.py`, `test_stale_tsgs`, L2598).

The latest-event rule fails on any AID that has anchored something without rotating — a registry inception, an issuance, a revocation — which is every credential issuer: correctly formed signatures are refused, and a multisig sender that anchors mid-collection never reaches threshold, because the partial-multisig escrow pins the reference when collection begins. keripy held that rule until `8870ea6a0` (PR [#1658](https://github.com/WebOfTrust/keripy/pull/1658)) and `72b034073` (PR [#1662](https://github.com/WebOfTrust/keripy/pull/1662)), so code at earlier pins behaves that way.

[proposal] Sam states the rule in a conversation, not a specification: "The seal reference should be to the keystate determined by the latest establishment event." and "These type of checks should always be aginst the Kever instance" (keripy conversations > PR #1658, https://github.com/WebOfTrust/keripy/pull/1658#issuecomment-5514292225, comment of 2026-09-02, R-003). He withdrew the same comment's allowance for a later interaction event: "My bad halfway through the writeup I forgot this was a signature group code not a seal reference." (keripy conversations > issue #1667, https://github.com/WebOfTrust/keripy/issues/1667#issuecomment-5516149525, comment of 2026-09-02). For a seal reference the rule differs: "When the authentication factor is a seal reference then its always pointing to the exact event that holds the anchoring seal" (same). Issue #1667's title, "KRAM: accept a tsg reference that names an interaction event after the last establishment event", describes the case he withdrew. Behavior under delegated, superseding and recovery establishment is unexamined.

## 5. Normative status: the tier that is empty {#09-normative-status}

KRAM is in no KERI specification, so nothing here is [spec]. At `trustoverip/kswg-keri-specification` `main` @`fbdd4a615` a search for `kram` finds nothing under `spec/`; its one hit is a glossary entry pulled from `trustoverip/kerisuite-glossary` (KERI spec `specs.json`, L26): "All requests from a web client must use KRAM (KERI Request Authentication Method) for replay attack protection. The method is essentially based on each request body needing to include a date time string field in ISO-8601 format that must be within an acceptable time window relative to the server's date time," The ACDC and CESR specifications were searched without a pin, so their negative is unverified.

That one published definition describes simple KRAM, the variant #934 says cannot support multisig, so an implementer working from the specifications would build what the designer has superseded. The glossary says Method and the whitepaper Mechanism; use Mechanism. Everything load-bearing lives in `SmithSamuelM/Papers/whitepapers/kram.md`, versioned and directive down to module names, but one person's repository with no change control; keripy issue [#937](https://github.com/WebOfTrust/keripy/issues/937) names it as the implementation target. A protocol layer every non-key-event message depends on is specified nowhere a standards process can reach, and an adversarial reviewer will lead with that, correctly. The whitepaper last changed on 2026-03-06; keripy has since added the currency rule, which no specification states.

### The same correction at both ends of the wire {#09-convergent-correction}

The cost of that gap is concrete. keripy fixed the receiver's currency test on 2026-09-01, and KERIA fixed the sender's construction of the same quad on 2026-09-07: [code] at `7e685edaa` the `/end/role` handler builds `tsg = (hab.kever.prefixer, coring.Seqner(sn=hab.kever.lastEst.s), coring.Saider(qb64=hab.kever.lastEst.d), rsigers)` (KERIA `src/keria/app/aiding.py`, end-role handler, L1663-1668), where before `b57780a8b` it read `coring.Seqner(sn=hab.kever.sn), coring.Saider(qb64=hab.kever.serder.said),` (L1665-1666). Fourteen other KERIA sites already followed the convention. The two codebases share no code here, since KERIA pins `"keri==1.2.14",` (KERIA `pyproject.toml`, L30 @`928ce26a4`) while keripy `main` is on the 2.1.0-dev line, so the fixes were independent. A rule everyone agrees on, written nowhere, was discovered twice by breakage. Whether other KERIA sites still seal to the latest event was not audited, and whether `keri==1.2.14` contains any of `kraming.py` was not checked. The two KERIA stragglers serve `/end/role` and `/loc/scheme`, the routes keripy denies to KRAM because they belong to BADA ([section 6](#09-kram-and-bada)); whether that is why they lagged cannot be settled from the code. The pin also bounds every [code] claim here: what keripy `main` does is not evidence of what a KERIA deployment does.

## 6. KRAM and BADA-RUN: siblings that cannot both govern a message {#09-kram-and-bada}

[spec] BADA (Best-Available-Data-Acceptance) governs data at rest and guarantees monotonic updates to signed data: an anchored update wins if its anchor is later in the KEL; an unanchored one wins on later key state and then later datetime, by the controller's clock (KERI spec, ~L2887-2918). [proposal] KRAM governs messages in flight, by the receiver's clock. Because they disagree on whose clock is authoritative, one message cannot be subject to both, and the whitepaper resolves it by exclusion: BADA-RUN endpoints go in the denials list. [code] keripy hard-codes this: `Kramer.OobiDenials` denies `rpy` routes `/end/role` and `/loc/scheme` whenever KRAM is enabled, because "OOBI endpoint discovery replies rely on BADA acceptance rather than KRAM replay protection" (keripy `core/kraming.py`, `Kramer.OobiDenials`, L98-147).

BADA orders what a host stores; KRAM orders what a host accepts off the wire. Discovery is BADA's and the rest of the non-key-event set is KRAM's, and the boundary is drawn by configuration rather than message shape, so an operator can get it wrong.

## 7. What keripy actually does {#09-keripy}

[code] keripy implements the v0.7.6 redesign in `src/keri/core/kraming.py`. Line hints are at `b8f60166b` unless stamped otherwise; past about L1460 they run 2 to 5 lines short of `80f77b73b`.

- `AuthTypeCodex` defines `asr`, `assk` and `asmk`, with `asmk` commented "Long lag window. Accumulates sigs." (L38-51).
- `Kramer.intake` applies denials and then `kramit`, prefix-matching the denial string (L1028-1034); `_fetchCacheType` cascades from `msgType.R.route` to `msgType` to a catchall keyed `"~"` (L293-313).
- Nineteen KRAM sub-databases hold cache types, message and transaction caches, transaction-opener datetimes, partial multisig state and non-authenticator attachments, including `kramULGS` for foreign last-sig groups whose KEL is unresolved and `kramCIGS` for non-sender cigars (keripy `db/basing.py`, L1310-1388).
- Multi-key accumulation pins `currentKeyState = (Number(num=kever.lastEst.s), Diger(qb64=kever.lastEst.d))` when collection opens (`Kramer.kramit`, L1159-1160) and drops the message and its partial state if the sender rotates. The currency rule appears at all ten sites that compare a `tsg` against key state.
- Endorser last-sig groups are frozen at receipt to the endorser's last establishment event, because this "freezes the establishment reference so a later endorser rotation before the sender reaches its signature threshold does not reinterpret the escrowed signatures" (`Kramer._storeNonAuthAttachments` docstring, L828-830). An escrow that holds signatures across a long window must record the key state each was made under.
- The reconfiguration machinery the whitepaper left unfinished exists (`changeConfig`, `reconcileConfig`, `_computeWorstCaseDelta` and others, L1684-2225), and `Pruner` runs every second (L2227-2318).
- `Kevery.processMsg` is the single entry for `qry, rpy, pro, bar, xip, exn`: allow and deny lists, then `self.kramer.intake()`, then dispatch (keripy `core/eventing.py`, L4645, L4703 @`80f77b73b`). `processXip`, `processPro` and `processBar` are stubs: `"""Stub: KERI v2 exchange transaction; no processing yet."""` (L4780-4781 @`80f77b73b`).
- `Kevery.__init__` defaults `enableKram=False`, but the agent and witness runtimes, `directing.py` and `indirecting.py`, pass `enableKram=True`. The claim that KRAM is disabled by default is true of the class and false of deployments.
- `Baser.clean()` keeps the replay caches across a rebuild: "Copy KRAM replay caches without reverification. Discard cache types and partial state; Kramer rebuilds cache types from configuration." (keripy `db/basing.py`, `Baser.clean`, L1594-1595 @`80f77b73b`). A runtime window change not written to configuration does not survive a clean, and a multisig message mid-collection must be re-sent with a new `dt`.

[proposal] Issue [#1302](https://github.com/WebOfTrust/keripy/issues/1302) records that PR #1288 landed the core "aligned with the v0.7.5 whitepaper" and lists remaining gaps: attachment databases, the pruning doer, key-state retrieval cueing, AID allow and deny, and continued signature collection until prune time. [code] The first four are present; the fifth is the divergence below.

[proposal] The allow and deny lists filter; they do not authenticate: "The AID based denail/accept lists are not authenticating they are filtering." (keripy conversations > PR #1360, https://github.com/WebOfTrust/keripy/pull/1360#issuecomment-4122133697, comment of 2026-03-24, R-006; "denail" is his slip). The sender AID is a claim until the attachments verify it.

[code] Window classes have no defaults and no guidance. Every lag septuple comes from configuration (`_populateCtyp`, L196-208), and `_parseValidateCtyp` enforces only ordering and sign — `d >= 0`, `0 < sl <= ll <= xl`, and prune lags at least accept lags (L170-185) — with no ceiling or floor. A receiver that configures nothing gets a `KramError`, not a safe default (L312-313). The parameter that sets the width of the replay surface is the deployer's to choose unaided.

### Do partials survive threshold? {#09-partials-divergence}

[proposal] versus [code]. The whitepaper keeps partial signatures after threshold, deliberately: "the partially signed database entries will remain until the prune window closes, upon which all the partially signed database entries will be deleted" (KRAM whitepaper > Full KRAM processing steps, L306, L353, L427 @`6ed1ceff4`), because "It is desirable to know all who signed, not just the first who meet the threshold." keripy discards them on acceptance: "The cache remains as the replay marker. Partial state is no longer retryable after the accepted handoff." (keripy `core/kraming.py`, `Kramer.kramit`, L1215-1220; transactioned branch near L1465-1471 @`80f77b73b`), and `Baser.clean()` drops them too. The whitepaper's reason is evidentiary and the code's is replay safety. The observable consequence is that a late co-signer's endorsement of an accepted multisig message is silently discarded. The whitepaper is the design of record; the code is what runs.

### Three divergences worth checking [code] {#09-three-divergences}

1. Cache-type route matching is exact (`key == f"{msgType}.R.{route}"`, L294, L299) while denial matching is a prefix (`md.startswith(d)`, L1031), so a cache type for `/end` does not govern `/end/role` but a denial for `/end` does. A window can silently fall back to the catchall.
2. The gap-attack defenses assume windows change only through `changeConfig`; `test_existing_caches_unchanged_on_config_update` (keripy `tests/core/test_kraming.py`, L3628) covers in-flight caches, and whether another path can mutate a live window is not established.
3. `_scrubSameSenderPriorEventTsgs` justifies its policy by citing "KRAM PR #1788" (L525-528), which does not exist in `WebOfTrust/keripy`. The policy is coherent; its provenance is unresolvable, which matters in a module that is the only written home of several of KRAM's rules.

## 8. Where KRAM is load-bearing for other designs {#09-load-bearing}

Multiply-endorsed presentation uses KRAM's escrow as its signature collector: "This elegantly solves the multi-sig problem without requiring a pre-protocol to collect signatures. The receiver's KRAM escrow does the signature collection" (keripy discussion [#1613](https://github.com/WebOfTrust/keripy/discussions/1613)). So a freshness mechanism is also an availability mechanism: with KRAM off or a short window, group presentation stops working ([chapter 08, section 8](#08-freshness-kram)).

[code] At `80f77b73b` KRAM's acceptance time is also evidence. The transactioned cache record carries `rdt (str): receiver datetime when KRAM accepted the complete message` (keripy `recording.py`, `TxnMsgCacheRecord` docstring, L505), set only once a multi-key message meets threshold: "A partial cache is only a replay marker. Receiver time is recorded once the complete threshold is accepted." (keripy `core/kraming.py`, L1658-1659 @`80f77b73b`). IPEX's presentation-registry check refuses a `grant` without it — "A presentation requirement needs a completed KRAM acceptance." (keripy `acdc/ipexing.py`, L1524 @`80f77b73b`) — and cuts off registry history at that time (L1543). KRAM's bookkeeping has become an input to whether a presentation is valid. An inference, not tested: a deployment with KRAM disabled cannot accept a `grant` that declares a presentation registry. `kraming.py` itself contains no registry logic, and no whitepaper or specification mentions a receiver acceptance time used by another protocol.

#1613's argument for the `ax` anchoring field is that KRAM proves timeliness but "gives neither party a way to signal to the IPEX that the relevant messages MUST be perpetually verifiable and hence anchored." KRAM is a freshness mechanism, and anchoring converts a timely exchange into a durable one. Tethering is defined by KRAM's guarantee: "Tethering implies no other relationship besides fresh (timely) proof-of-control over an AID so tethered."

KRAM is not built on a nonce, though #1613's paraphrase lists a salty nonce `u` field among its inputs, which is not a field of an `exn`. The whitepaper's uniqueness comes from monotonic receiver-clock datetimes, and its one salty nonce makes a transaction ID unique without replacing the timestamp, "because a timestamp is still needed in order to know when any given transaction can be pruned." [code] keripy reads `msg.stamp` and never `u` (keripy `core/kraming.py`, L1071).

## 9. Open questions {#09-open-questions}

1. Where does KRAM get a normative home — the KERI specification or a standalone one? It is required for every non-key-event message and specified only in a personal repository.
2. What is the migration from simple to full KRAM? Deployments and the glossary are simple, keripy implements full, and multiply-endorsed presentation needs full. Nothing says what a mixed network does or how a receiver signals which it enforces.
3. Who owns the granularity-change gap analysis, which the whitepaper marks unfinished and keripy implements, when they differ?
4. What happens downstream of `xip`, `pro` and `bar`, which pass through KRAM into stubs?
5. How should an operator choose window classes? Too long widens the replay surface, too short breaks multisig, and there are only example numbers.
6. Does the `Exchanger` gap close? KRAM preserves non-sender endorsements for downstream handlers ("leaves only non-sender triples in ssts for non-auth forwarding / escrow"), while `Exchanger.processEvent` rejects any signature not from the sender (keripy `peer/exchanging.py`, L88-95 @`4df8e4a86`, not re-read at later pins; [chapter 08, section 8](#08-freshness-kram)).
7. Do partial signatures survive threshold ([section 7](#09-partials-divergence))? Which policy governs, and was the whitepaper's rationale weighed or not seen?
8. Where is the currency rule ([section 4](#09-currency-rule)) written normatively? It decides which key state a signature is checked against, two implementations broke on it independently, and it exists in a docstring and a conversation.
9. Should other protocols rely on KRAM's acceptance time ([section 8](#09-load-bearing))? If so, it is a second reason KRAM needs a normative home; if not, the presentation check needs a time source that does not vanish when KRAM is disabled.
10. Is the configuration file the durable record of window classes? A runtime `changeConfig` not written to it is lost on a clean, which could half-apply the staged defense against gap attacks; whether `changeConfig` persists was not checked.

## Sources {#09-sources}

- KERI spec — Key Event Receipt Infrastructure (KERI) specification, Trust Over IP. trustoverip/kswg-keri-specification, spec/spec-body.md, plus `specs.json` (L26, the glossary cross-reference) and `docs/versions/v1/index.html` (L2661, the glossary's KRAM entry pulled from trustoverip/kerisuite-glossary), main @`fbdd4a615` (2026-08-28). KRAM is absent from it, with zero hits under `spec/`. Mined in raw/01 and raw/15.
- KERIA — KERI Agent, WebOfTrust. WebOfTrust/keria, `src/keria/core/authing.py` and `src/keria/app/aiding.py`, main @`7e685edaa` (2026-09-11); `pyproject.toml` (L30) at @`928ce26a4` (2026-09-30), for its keripy dependency. KERIA runs on keripy's 1.2.x line (`keri==1.2.14`), so a [code] stamp on keripy `main` is not a claim about KERIA. Mined in raw/10.
- keripy — KERI reference implementation, WebOfTrust. WebOfTrust/keripy, src/keri and tests/. `main` @`80f77b73b` (2026-10-01) for the claims stamped with it: the `rdt` acceptance timestamp and its IPEX consumer, `Baser.clean()`, the `processMsg` entry and the `xip`/`pro`/`bar` stubs, and the line counts. `main` @`b8f60166b` (2026-09-14) for everything else in `core/kraming.py`, `core/eventing.py`, `db/basing.py` and `tests/core/test_kraming.py`; those hints drift by 2 to 5 lines past `kraming.py` L1460 at `80f77b73b`. `upstream/main` @`4df8e4a86` (2026-09-01) alone supports the `peer/exchanging.py` L88-95 claim. Mined in raw/15 and raw/16.
- keripy conversations — Sam Smith's comments in WebOfTrust/keripy issues and pull requests. Numbers used: PR #1658, issue #1667, PR #1360. Each citation gives the comment URL and date; comment bodies were read from the 2026-10-14 fetch cached under `.ignored/sam-rulings-cache/`. [proposal] throughout. Mined in raw/21.
- keripy discussion #1613 — Authentication Factors in IPEX, Sam Smith. https://github.com/WebOfTrust/keripy/discussions/1613, created 2026-08-12, last edited 2026-09-02. Mined in raw/16.
- keripy discussion #934 — KERI Architectures for Group Issuance (KAGI) and KRAM, Sam Smith. https://github.com/WebOfTrust/keripy/discussions/934, 2025-01-30. Sam in his own voice on why KRAM exists and why only the weak version shipped. Mined in raw/15.
- keripy issues and pull requests — WebOfTrust/keripy issues [#911](https://github.com/WebOfTrust/keripy/issues/911) (HAMI), [#937](https://github.com/WebOfTrust/keripy/issues/937) (KRAM implementation) and [#1302](https://github.com/WebOfTrust/keripy/issues/1302) (closed 2026-03-25), and pull requests #1288, [#1658](https://github.com/WebOfTrust/keripy/pull/1658) and [#1662](https://github.com/WebOfTrust/keripy/pull/1662) (the currency-rule change). Mined in raw/15.
- KRAM whitepaper — KERI Request Authentication Mechanism (KRAM), v0.7.6, Sam Smith. SmithSamuelM/Papers, `whitepapers/kram.md`, master, last substantive edit @`67550b477` (2026-03-06), merged @`6ed1ceff4` the same day. A maintained, versioned, implementation-directive design document that keripy is built from, and not binding on anyone outside keripy. Read via the GitHub API. [proposal]. Mined in raw/15.
- signify-ts — Signify TypeScript client, WebOfTrust. WebOfTrust/signify-ts, `src/keri/core/authing.ts`, `upstream/main` @`ffba8406e`. Mined in raw/10.

---

# 10 — Presentation Registries and Issuee-Side Detectability {#10-registries}

## Thesis {#10-thesis}

KERI answers key compromise with detect and recover, and for the Issuer that answer is built: an ACDC's state is anchored in a TEL that is anchored in the Issuer's KEL, so an Issuer can see issuances it did not make without anyone's cooperation. The Issuee has no equivalent. A thief with an Issuee's keys can present its credentials, and the real Issuee has nowhere to look. A presentation registry, which Sam first called an Issuee usage registry, closes that asymmetry: the Issuee keeps its own blindable state registry, a presentation must be anchored in it, and the Issuee can detect presentations it did not make and rotate to invalidate them.

Two things set it apart. It is deliberately optional, on a quantitative argument: Issuer compromise is rampant and high-ROI, Issuee compromise localized and low-ROI, so Issuee-side detectability is something an Issuee elects and pays for. And one mechanism does two unrelated jobs, impersonation-fraud detection and correlation resistance, with different preconditions, so a design can satisfy one and not deliver the other. Confusing them is the likeliest error in this area.

## Status {#10-status}

Pre-normative, and partly built in keripy only. The markers must be held apart because code and specification say different things.

- [code] at keripy `80f77b73b`, for `/ipex/grant` only. The verifier check exists and fails closed: every Issuee registry declared across the disclosed DAG must bind the `grant`, as of the receiver's KRAM acceptance time, and the requirement is read from issuance metadata on every `grant`, independent of `ax`. The Issuee's write path exists. The V2 IPEX handler that does this has no caller in `src/keri`, so this is tested code in the reference implementation, not behavior any shipped keripy command performs ([section 7](#10-keripy-verifier)).
- [proposal]: retrieval of a foreign registry, #1095's acceptance delay, a presentation registry on an ACDC with no Issuer state registry, the correlation-protected self-issued bespoke origin, and the design's whole rationale.
- No [spec] or [spec-next] text, beyond one word ([section 5](#10-normative)). A peer implementation built from either specification line will produce `grant`s keripy refuses, with no normative text to say why ([section 8](#10-adversarial)).

The code is a subset of #1613 that departs from it twice: a registry binding authenticates the `grant` without the Issuee's endorsement, where #1613 says "the grant message must be endorsed by each Grantor", and the requirement applies to every declaration whoever sends, where #1613 conditions it on the Issuee being the Grantor ([section 6](#10-registrar-and-kram), questions 8 and 9).

### Two names, and searching one misses the other {#10-two-names}

Sam calls it an Issuee usage registry in [#1095](https://github.com/WebOfTrust/keripy/discussions/1095) (October 2025), the document that invents the idea and carries most of its security reasoning, and a presentation registry in [#1613](https://github.com/WebOfTrust/keripy/discussions/1613) (August 2026). A search for "presentation registry" misses #1095. In speech he has said "user presentation registry" (KERIConf26 caption, Samuel Smith, The Digital Identity Tradespace, 14:36). keripy uses the narrow vocabulary: "presentation registry" in `ipexing.py`, "issuee-controlled registry" in the registry facade (keripy acdc/registraring.py, Registrar.present, L413 @80f77b73b), a binding kind `'presentation'` with TEL state `"presented"`, and a `tethered` set for the Issuees a registry authenticates; "Usage registry" occurs nowhere in keripy's `src/` or `tests/`. A survey needs all of these terms. This chapter uses "presentation registry" for the IPEX-anchoring application and "usage registry" for the general primitive ([question 1](#10-q-name)).

## 1. The asymmetry that motivates it {#10-asymmetry}

### Issuer-side detectability {#10-issuer-detectability}

[proposal] #1095 names the catastrophic failure as Issuer key compromise: "The ROI to an attacker for compromising the Issuer keys could be huge, especially if that Issuer is a root-of-trust for Identity assurance for an ecosystem." Anchoring answers it: "The impersonator MUST anchor the ACDC in a TEL that is anchored in the Issuer's KEL. This anchor enables the Issuer to detect any fraudulent issuances without requiring the cooperation of any other party, such as the Verifier." Detection with no dependency on a counterparty is the KERI-shaped part. Sam's comparative claim, "AFAIK, only KERI/ACDC provides such protection in a decentralized identity system", is his assessment, not a surveyed result.

### Issuee-side detectability {#10-issuee-detectability}

[proposal] "If a given Issuee's keys are compromised, the impersonation fraud is localized to that specific Issuee. It does not have rampant potential." #1095 draws three consequences.

1. Low susceptibility, with a cheap mitigation: prophylactic rotation, effective "because the verifier always checks the presentation as being signed by the latest keys of the Issuee." Rotating without reissuing "is a unique super-power of KERI/ACDC as a decentralized identity system."
2. Localized harm licenses localized measures, such as a Verifier requiring a rotation as part of a presentation, and Sam concedes the doctrinal cost: "This violates the maxim that security not be dependent on a trusted third party, but for localized harm, the party most likely to be harmed is the Verifier (Validator), which provides incentives for them to protect themselves." This is a knowing relaxation of the no-trusted-third-party maxim, and [section 8](#10-ttp-concessions) records a second one.
3. The Issuee can elect its own detectability. That is the usage registry.

It costs infrastructure: "the Issuee must have its own Registrar to manage its usage registries", and "Many Issuees will feel that their key management is sufficient to protect against key compromise and therefore would not want the extra protection and friction of a usage Registrar." Any argument that it should be mandatory has to answer that cost.

### Rotate, do not revoke {#10-rotate-not-revoke}

[proposal] A compromised Issuee key is answered by key state, not credential state: "if the keys get compromised then the keystate is changed not the ACDC state." And the two registries differ in kind: "A presentation registry on the other hand is not tracking ACDC state, but is merely logging presentations" (keripy discussion #1574, comment of 2026-08-07, R-042, https://github.com/WebOfTrust/keripy/discussions/1574#discussioncomment-17938568). It makes presentations, not the ACDC, perpetually verifiable, so impersonation at presentation time becomes detectable by the Issuee.

### Where it sits among the tiers of IPEX {#10-ipex-tiers}

[proposal] Sam's four tiers of IPEX ([chapter 08, section 10](#08-four-tiers)) place the registry as an add-on at either stakes level: "This enables the presenter to detect if anyone has compromised the Presenter's keys and is fraudulently using those keys" (keripy discussion #1512, comment of 2026-07-22, R-062, https://github.com/WebOfTrust/keripy/discussions/1512#discussioncomment-17737728). An Issuee or EGF that does not want it still has the signed-only and anchored tiers.

### Optional to use, but not to be foreclosed {#10-not-foreclosed}

[proposal] [#1098](https://github.com/WebOfTrust/keripy/discussions/1098) (ACDC with Static Age Predicate Proof SMT, last edited 2026-09-26) rejects unlinkable ZKP predicate proofs on detectability grounds, for the Issuer and then the Issuee: "Likewise, the key compromise of an Issuee (Holder) can be made detectable using a presentation registry. Which would also be defeated by an unlinkable ZKP." `raw/16` section 1a reads this as consistent with optionality, since detectability "can be made" available, while treating the possibility of a presentation registry as something a cryptographic choice may not foreclose; that reading is the note's, not Sam's. Without the edit history, the sentence is evidence of his position at 2026-09-26 only.

## 2. The mechanism {#10-mechanism}

### The rule {#10-original-rule}

[proposal] #1095: "The ACDC must include a requirement that the ACDC is only verifiable when the presentation of the ACDC by the Issuee is anchored as the latest state in an Issuee-controlled *usage registry*." In IPEX terms the anchored object is the `grant`: "the value of the registry `rd` field in the attribute `a` section MUST be the SAID of the `rip` event of the associated presentation Registry. The Issuee of the associated ACDC, who is also a Grantor of that IPEX, MUST control this registry. The value of the ACDC SAID field in the blinded attribute block of the latest non-vacuous event in that presentation Registry must be the SAID of the `grant` message." (#1613). The slot that normally carries an ACDC SAID carries a `grant` SAID.

### Three of four requirements in keripy {#10-requirements-in-keripy}

[code] At `80f77b73b` three of those requirements hold and one does not (`raw/16` section 2.2). The `rd` must be the registry's `rip` SAID, or `_vetRegistry` raises `MisregistryError`. The Issuee must control the registry: `vetBinds` checks "if controller is not None and record.issuer != controller:" (keripy acdc/regeventing.py, vetBinds, L714 @80f77b73b), with the `a`-section `i` as controller. The latest non-vacuous event must bind the `grant` SAID (keripy acdc/ipexing.py, IpexHandler._verifyPresentationAuthGraph, L1537 @80f77b73b). The clause "who is also a Grantor of that IPEX" is not enforced; the registry alone authenticates the Issuee ([question 9](#10-q-single-vs-double)). The Issuee writes with `Registrar.present`, "Bind a grant message SAID in an issuee-controlled registry." (keripy acdc/registraring.py, Registrar.present, L413 @80f77b73b), and `vacate` writes a vacuous update. `present` does not check that its caller is anyone's Issuee; only the verifier's incepter check enforces control.

### One registry for many credentials {#10-many-to-one}

[proposal] "A *usage registry* can be employed to track the usage of one or more ACDCs by the Issuee… This means that the registry does not leak specific usage of a given ACDC to third parties" (#1095). Blinding is what makes many-to-one safe; unblinded, a shared registry would be a correlation engine.

### Detection converted to prevention {#10-acceptance-delay}

[proposal] #1095 alone offers this: "by adding a time delay from presentation anchor to acceptance, the verifier can assume that a compromised Issuee would do a recovery, invalidating the fraudulent presentation." It is the only proposal in the corpus that turns Issuee-side detection into prevention, and its cost, that every honest presentation waits, is a tradeoff an EGF should set. keripy does not implement it.

### Incentive alignment {#10-incentive-alignment}

[proposal] #1613 puts it as liability: a verifier accepting an unanchored grant "is presumptively in violation of any contractual or regulatory protection afforded to the real Grantor by colluding with a fraudulent grantor."

## 3. Two jobs, two different preconditions {#10-two-jobs}

The mechanism is the same in both jobs and the guarantees are not.

### Job one: impersonation-fraud detection {#10-job-fraud-detection}

[proposal] This requires that the Issuer is not the Grantor. The requirement is baked in by a party the attacker has not compromised: "an imposter that merely compromises the Grantor's signing infrastructure can't avoid the requirement without also compromising the Issuer." The Grantee refuses an unanchored grant, and the real Issuee sees registry events it did not create and rotates. The hole is self-issuance, which #1613 states: "An imposter who controls the Grantor's signing infrastructure can create ACDCs whose authentication factor is an unanchored signature." So fraud detection is a property of the three-party arrangement, not of the registry.

[code] keripy builds the verifier half, including the property that the Grantor cannot opt out: the test says "Presentation anchoring is mandatory from issuance metadata even" when a later `grant` omits `ax` (keripy tests/acdc/test_ipexing.py, test_ipex_v2_presentation_registry_binds_proxy_grant, L6232 @80f77b73b). Compacting the attribute section cannot hide the declaration, because a registry-backed ACDC with an undisclosed `a` or `A` entry is refused: "A verifier cannot distinguish an omitted requirement from an undisclosed one using only its digest." (keripy acdc/ipexing.py, IpexHandler._presentationRegistries, L1414-1415 @80f77b73b). Nothing checks that Issuer and Issuee differ, so the self-issuance hole is present in code exactly as #1613 concedes it.

### Job two: correlation resistance {#10-job-correlation}

[proposal] This works even self-issued. If Grantor and Grantee each anchor the same `grant` SAID in their public KELs, "a third party… would be able to detect the same grant SAID in both the Grantor's KEL and the Grantee's KEL, thereby correlating the IPEX." In a blinded presentation registry, "neither the grant SAID nor any other artifacts of the granted DAG appear in the KEL of the Grantor," which removes the join point. A Grantor needs no cooperating Issuer for this: it self-issues a bespoke origin carrying `i` and `rd` in its attribute section. One constraint is easy to violate: "the bespoke ACDC itself must use a blinded state Registry for its Issuer authentication so that the SAID of its ACDC is not correlatable. If it uses a direct KEL anchor, then that anchor itself would be correlatable." Nothing in keripy forbids this construction and no test builds one, so whether it composes is untested.

The single-origin rule this relies on, that one anchor covers a DAG because committing to the origin commits to everything reachable, is [spec-next]: "That DAG MUST have exactly one source node, called the origin node" (ACDC spec > Disclosure Paths > DAG of ACDCs, L1821 @2362e48a1), with a bespoke origin where the ACDCs are unchained ([chapter 08, section 2](#08-one-dag-one-origin)). `v1.1` does not say such an origin needs a blinded state registry ([question 7](#10-q-two-bespoke-origins)).

### Correlation resistance is itself conditional {#10-correlation-conditional}

[proposal] The registry is "bound to the AID of the Issuee, so it is linkable. A bulk-issued ACDC with independent AIDs can remove this linkage" (#1095). Full unlinkability needs blinded state and independent-registry bulk issuance; used naively, a presentation registry hides which credential was presented while advertising that the Issuee presented something.

### Multi-ACDC DAGs {#10-multi-acdc}

[proposal] Because the `grant`'s origin `o` names the DAG origin, one registry anchor "provides a perpetually verifiable proof of the presentation of all ACDCs in that DAG, but not necessarily a fresh proof of control for all Issuee AIDS in that DAG. Multiple anchors in different registries provide multiple vectors of detectability and multiple fresh proofs-of-control; the perpetual verifiability is redundant." That `o` is an exchange-message field defined in no ACDC branch, where `o` is the edge Operator; the concept it names is [spec-next] and the field is [proposal] and [code].

[code] keripy implements the strict form: "Every declared node-local presentation registry must bind the grant." (keripy tests/acdc/test_ipexing.py, test_ipex_v2_verifies_presentation_registries_for_different_issuees, L6355 @80f77b73b). Each binding is also a fresh proof of control for its Issuee, so a declared registry cannot be ignored. Declarations are honored on any node, and the SEDI examples cover the DAG with one anchor by practice rather than rule: "Residence needs only issuer proof; Core owns the presentation proof." (keripy tests/sedi/test_ipex_sedi.py, test_residence_sedi_uses_nested_core_presentation_registry, L2529 @80f77b73b).

## 4. The trigger, and the ambiguity blocking it {#10-trigger}

### The signal is a three-part test {#10-three-part-signal}

[proposal] Per #1613 the requirement fires when a non-empty `rd` and a valid Issuee `i` sit at the top level of the ACDC's attribute section and the ACDC's own top-level `rd` is non-empty. With no Issuee in `a`, an `rd` there imposes nothing; with the top-level `rd` empty or missing, the inner `rd` "refers to an ACDC state registry, not an IPEX presentation registry." The top-level `rd` does disambiguation work that a quick reading misses.

### Why disambiguation is needed {#10-why-disambiguate}

[proposal] The v1 spec also permits `rd` in `a` as a hidden ACDC state registry, so one slot carries two meanings. #1613 offers EGF-declared purpose with presentation as the default, then argues the hiding case down, since its only benefit arises "when the ACDC in compact form is made public, independent of any given presentation", and floats: "Given the potentially dubious value, we might want to forbid using the `rd` field in the attribute section for an ACDC state registry." It ends "Not sure if either is a worthy use case", and a trigger cannot be specified on a field whose meaning is contested.

The choice is permanent per ACDC: "a presentation registry may not be used with an ACDC that uses the `rd` field in the attribute `a` section as an Issuer-controlled ACDC state." An Issuer choosing the hiding case forecloses Issuee-side detectability on that credential, while #1613 judges hiding "is not useful with full independent Registry bulk issuance since each presentation could use a different member of the bulk issued set". `v1.1` has not taken up any of #1613's options: its Registry SAID Field section and reserved-fields row are byte-identical to `main` ([question 2](#10-q-disambiguation)).

### keripy has made the choice {#10-keripy-choice}

[code] keripy implements the three-part test, extended to disclosed `A` entries (keripy acdc/ipexing.py, IpexHandler._presentationRegistries, L1467-1488 @80f77b73b), and refuses the hiding case. Without a top-level `rd`, an inner `rd` is a "hidden issuer registry, not a presentation registry." (keripy acdc/ipexing.py, IpexHandler._presentationRegistries, L1419 @80f77b73b) and the ACDC fails, with no fallback to a signature (keripy tests/acdc/test_ipexing.py, test_ipex_v2_rejects_hidden_issuer_registry_signature_fallback, L3558 @80f77b73b). That is an implementation choice, not a resolution, and it means a v1-conformant ACDC using `a.rd` as a hidden state registry is rejected by keripy's V2 verifier.

#1618 suggests an anchored exchange "would also need an `rd` on the exchange". keripy does not do that: the registry is found from the DAG, as #1613 requires, "the registry must be pre-specified in one of the ACDCs in the granted DAG". The question stays open for the specifications.

## 5. What is normative: one word {#10-normative}

[spec] In the ACDC specification on `main` @`f0bd097de` and `v1.1` @`2362e48a1`, "Presentation registry" has zero occurrences and "usage registry" occurs once. What exists:

- The nested-`rd` purpose list includes usage: "Issuance and/or revocation, transfer, retraction, or usage registry for ACDC when not at top-level" (ACDC spec > ACDC Structure > Other Reserved Fields, L48 @f0bd097de). That word is the only trace of this design in any specification.
- Nested `rd` "MAY be used for some other registry, such as an application-specific or Issuer-specific registry" (ACDC spec > ACDC Structure > Registry SAID Field, L85 @f0bd097de); its stated rationale is bulk issuance and graduated disclosure, not fraud detection. Neither branch contemplates an Issuee-controlled registry: "Issuee-controlled", "Issuee controlled" and "Issuee's registry" occur zero times at `2362e48a1`. keripy has one, so this is now a gap between the specifications and the reference implementation.
- Blindable state registries and `rip` are fully normative. A `rip` is "a vacuous placeholder that reveals nothing about what will later be issued," the source of #1613's "latest non-vacuous event".

### The worked lifecycle states the correlation boundary {#10-correlation-boundary}

[spec] The Registry-Dependent Issuance Lifecycle states what a blindable registry buys: "This is confidentiality of registry state, not anonymity of the credential — issuer, registry, and issuance chronology remain linkable, which is the intended, auditable trade-off." That is the normative form of #1095's caveat in [section 3](#10-correlation-conditional): linkability of the registry is the chosen trade, not an oversight, and spec text for presentation registries will need to say the same of an Issuee's registry. The lifecycle runs Issuer-side end to end; the Issuee only holds the shared salt.

### One wording tension {#10-wording-tension}

[spec] "Because the Issuer `i` field appears in the `rip` event, the Registry SAID, `rd` field value cryptographically binds the Registry to the Issuer AID" (ACDC spec > Transaction event logs (TELs) as ACDC state registries > Registry SAID, `rd` field, L2019 @f0bd097de). For a presentation registry the incepter is the Issuee. The sentence is about the registry's own incepting controller and is not wrong, but it assumes Issuer and incepter coincide. keripy reads it the way this design needs: the check that the ACDC's "issuer must match the issuer that incepted the presented registry" (keripy acdc/regeventing.py, vetBindings, L494 @80f77b73b) runs only for a top-level `rd`, and the presentation path checks the Issuee as incepter instead ([question 5](#10-q-rip-text)).

## 6. Where this sits against Registrar/Observer and KRAM {#10-registrar-and-kram}

### It extends the governance split to a third party {#10-governance-split}

[Chapter 05, section 9](#05-registries) records Sam's framing that the Registrar/Observer split replays witness/watcher one layer up: "We have registrars controlled by the issuers, and observers controlled by the verifiers" (KERIConf26 caption, Samuel Smith, The Digital Identity Tradespace, 16:58). A presentation registry adds an Issuee-controlled Registrar, so the Holder, previously the one party running no state infrastructure, now runs some. "We shouldn't have shared governance" (KERIConf26 caption, Samuel Smith, The Digital Identity Tradespace, 16:54), applied consistently, gives every party to a transaction its own state service; that synthesis is this chapter's. Sam's own phrasing is that it "allows presenters to detect compromise of their proofs that are in their credentials that they're presenting" (KERIConf26 caption, Samuel Smith, The Digital Identity Tradespace, 14:44). These are edited auto-captions; read `raw/14` section 0 before quoting them.

### It sits inside KRAM's window {#10-kram-window}

[proposal] "in order to pass KRAM, a `grant` message anchor must happen in a timely fashion relative to the IPEX exchange." (#1613). A registry write thus enters the critical path of a freshness window, and #1095's acceptance delay adds latency on top; nothing in the corpus connects the two numerically ([chapter 09, section 3](#09-full-kram)).

### keripy couples the two differently {#10-rdt-coupling}

[code] In keripy the registry check depends on KRAM rather than the write having to pass it. KRAM's transactioned-message cache records `rdt`, "receiver datetime when KRAM accepted the complete message" (keripy recording.py, TxnMsgCacheRecord, L505 @80f77b73b), set for a multi-key sender only once its threshold is met. The registry check refuses without it, "A presentation requirement needs a completed KRAM acceptance." (keripy acdc/ipexing.py, IpexHandler._verifyPresentationAuthGraph, L1524 @80f77b73b), and cuts the registry history off at it: "Require a valid binding anchored before the KRAM-accepted send." (keripy acdc/ipexing.py, IpexHandler._verifyPresentationAuthGraph, L1543 @80f77b73b). Three consequences follow (`raw/16` section 2.2): the test compares the TEL event's own `dt`, which the Issuee asserts, against the receiver's clock; the KEL event anchoring that TEL event may arrive later, through escrow; and since the bound target is this `grant`'s SAID, the binding is made after the `grant` body is fixed. `raw/15` section 4.8 infers, untested, that a deployment with KRAM disabled cannot accept a `grant` carrying a declaration. No specification mentions a receiver acceptance time consumed by another protocol.

### The registry anchor adds to the ordinary one {#10-double-authentication}

[proposal] "KRAM does not recognize or process a presentation registry-based authentication factor for the grant message," so "a presentation registry-anchored grant message is always double-authenticated," which is "unavoidable because the processing of presentation registry validation happens higher up in the stack than grant message authentication." (#1613). The registry write adds to the signature or KEL anchor rather than replacing either, and a verifier that treats it as a replacement will err one way or the other. keripy's `kraming.py` has no presentation-registry logic beyond `rdt`, and the check sits in `ipexing.py`, above KRAM, as #1613 says it should.

### keripy confirms the layering for the sender only {#10-sender-layering}

[code] When the declared Issuee also sends the `grant`, as in every SEDI test, double authentication holds by construction. When it does not, keripy no longer requires the Issuee to endorse: the proxy test says "the Issuee does not need a redundant EXN endorsement." (keripy tests/acdc/test_ipexing.py, test_ipex_v2_presentation_registry_binds_proxy_grant, L6205-6206 @80f77b73b). #1613 says the opposite: "To be accepted by KRAM, the grant message must be endorsed by each Grantor". Commit `790797bcd` carried "A registry supplements, but never replaces, a Grant endorsement." and `b7c170f93`, "remove grantor requisite", deleted it before PR #1693 merged, without giving a reason, so `main` never enforced it. The positions can be reconciled, since a registry anchor is a KEL-anchored commitment to the exact `grant` SAID and in effect makes the Issuee a Grantor without an endorsement, but #1613 does not record that design change. A side effect follows from the code, untested: the endorser index `eidx` (keripy db/basing.py, Baser, L591 @80f77b73b) is filled from signatures and seals only, so a registry-only Issuee is not indexed against the `grant` ([question 9](#10-q-single-vs-double)).

### Independent of `ax`, and counted toward it {#10-independent-of-ax}

[proposal] "Notwithstanding the presence or absence of the `ax` field, when an ACDC in a granted DAG meets the requirements for a Issuer signaled presentation anchor registry… then that `grant` message MUST be anchored in that registry for the `grant` to be valid." `ax` lets a party request perpetual verifiability; a presentation registry lets an Issuer impose it at issuance, and the Grantor cannot opt out ([chapter 08, section 10](#08-anchoring)). keripy runs the check on every `grant` whether or not `ax` is present. [code]

[code] A registry anchor also counts toward `ax`: "Presentation registries authenticate their controlling Issuees." (keripy acdc/ipexing.py, IpexHandler.verify, L626 @80f77b73b), followed by "Restrict default qualification to sender, Issuee, or issuer." (keripy acdc/ipexing.py, IpexHandler.verify, L647 @80f77b73b). That realizes #1613's origin-AID anchoring rule as set membership, so its "order of priority" has no operational effect.

### Which registry may be used {#10-which-registry}

[proposal] "There is no security advantage to using a presentation registry specified by the Grantor, as the main purpose… is to allow the Grantor to detect a compromise of its signing key infrastructure". keripy agrees in effect: it recognizes only registries declared in a DAG node, and nothing on the `grant` can name one. [code] #1613 would reuse "the existing tooling for a bulk-issued ACDC"; the Issuee's write path reuses the `_blind` path of Issuer issuance, and whether bulk-issuance tooling serves presentation registries was not examined.

## 7. keripy: the verifier side is built, for `grant` only {#10-keripy-verifier}

[code] at `80f77b73b` throughout (`raw/16` section 7). The verification, the `present`/`vacate` pair and non-sender `grant` endorsements came in PR #1693 (merged 2026-09-28), and PRs #1689 and #1697 put Issuee presentation registries into the SEDI example schemas; those titles are used for status only. One boundary bounds every claim here: `acdc/ipexing.py` is the V2 IPEX handler, its `loadHandlers` has no caller in `src/keri`, keripy's CLI wires the V1 handler, and the v1 `vdr` verifier has no presentation registry ([chapter 08, section 6](#08-two-ipex)).

### 7.1 What is implemented {#10-implemented}

On every `/ipex/grant`, after the DAG walk, edge semantics and per-node Issuer authentication pass, `IpexHandler.verify` runs `_verifyPresentationAuthGraph`: "Verify every presentation registry declared across the DAG." (keripy acdc/ipexing.py, IpexHandler.verify, L609 @80f77b73b). For each node with a top-level `rd`, it collects the `(i, rd)` pairs declared in a disclosed `a` or disclosed `A` entries, and requires for each that the registry is incepted by that `i`, that its latest non-vacuous update as of KRAM acceptance binds this `grant`'s SAID, and that the node carries a KEL source reference from the Issuee to the binding event. Any failure rejects the `grant`. The Issuees so authenticated form the `tethered` set and count as anchorers for `ax`. No other verb consults a presentation registry, matching #1613's statement that the `grant` is "the presentation".

### 7.2 Where it fails closed {#10-fails-closed}

Each step refuses rather than skipping (`raw/16` section 7.2): a registry-backed node with a compact `a` or `A` or an undisclosed aggregate entry; an inner `rd` without a top-level one ([section 4](#10-keripy-choice)); a `grant` without completed KRAM acceptance. The TEL must be held locally — "Registry verification requires an injected local Regery." (keripy acdc/ipexing.py, IpexHandler._registryEvidence, L1290 @80f77b73b) — and a missing `rip` or update raises a retryable `MissingChainError`. Updates after KRAM acceptance are ignored, so a later presentation cannot displace an accepted one. The binding event must be sealed in the Issuee's KEL: "Presentation timing requires the Grant to carry this bup's KEL source." (keripy acdc/regeventing.py, vetBinds, L750 @80f77b73b). A valid registry cannot be substituted for the declared one (keripy tests/acdc/test_ipexing.py, test_ipex_v2_rejects_substituted_presentation_registry, L6301 @80f77b73b). Nothing falls back to a weaker factor.

### 7.3 Who must act, and what is still absent {#10-still-absent}

The Issuee writes through `Registrar.present` and `vacate`, and `grant(..., anchorers=[])` omits the sender KEL anchor: "empty list leaves anchoring to a presentation registry." (keripy acdc/ipexing.py, grant, L1950 @80f77b73b). `grant()` also takes non-sender endorsers and anchorers, validated after KRAM, and the declared Issuee need not be among them. Whether non-sender signature groups are threshold-checked was not established, and #1613's tethering is not implemented. PR #1693 implements multiply endorsed grants against #1555, which this corpus compares only through #1613's restatement.

Still absent: retrieval of a foreign registry — the tests "Simulate the future observer retrieval layer by preloading the" foreign TEL (keripy tests/acdc/test_ipexing.py, test_ipex_v2_full_authentication_flow_across_three_haberies, L6829 @80f77b73b), so in deployment such a `grant` escrows or fails unless the TEL arrived out of band; a presentation registry on an ACDC without an Issuer state registry; a tested self-issued bespoke origin; and any specification text. A registry an Issuee stands up without an Issuer's declaration is ignored.

### 7.4 The three-factor framing {#10-three-factor-framing}

#1618 states symmetrically that three factors apply to the presentation: "Grant is signed (normal)", "Grant is anchored in a presentation registry (issuee-controlled; `rd` on the origin ACDC can force the check)", and "Grant is anchored in a KEL without a presentation registry (a case V1 did not really specify)". The list is unnumbered in the source, and its author withdrew it the same day as a duplicate of #1613, so it is a compact restatement, not corroboration. All three legs are [code] in V2. The framing's parenthesis is narrower than the code, which honors a declaration on any node, not only the origin. The KEL-anchor leg shipped first, in PR #1674, which said presentation-registry anchoring "will come in a follow up PR"; that the cheaper leg came first is what cost predicts and says nothing about either design's merits.

## 8. Reading this adversarially {#10-adversarial}

### The origin document has had no engagement {#10-no-engagement}

#1095 has zero comments in eleven months. That silence does not reflect the design's status: Sam names presentation registries in a #1627 comment of 2026-09-02, "This anchor in the KEL only applies when their is not a presentation registry being used by DAG ACDCs", PR #1674 promised the work in writing, and keripy has built the verifier. #1627's body, through its 2026-09-11 edit, never mentions a presentation registry; Sam's own survey of the presentation tradespace reaches for one only when asked about anchoring. A dead thread is not a dead idea.

### The novelty claim is unverified {#10-novelty-claim}

"nobody else does as far as I've never seen anybody do it" (KERIConf26 caption, Samuel Smith, The Digital Identity Tradespace, 14:40) and "AFAIK, only KERI/ACDC provides such protection" (#1095) are hedged by their author. Holder-side presentation logging is not unheard of in the wider VC world. The defensible narrower claim is that here the log is cryptographically required by the credential and enforced by the verifier, not a courtesy audit trail; the broad claim is unchecked.

### Two trusted-third-party concessions {#10-ttp-concessions}

The first is [section 1](#10-issuee-detectability)'s, in Sam's words. The second lands on the mechanism itself. #1613 describes what the registry gives the Grantor as "an Issuer-Verifier-protected mechanism to detect compromise of its signing keys". It needs an Issuer that is a different, non-colluding party, the only reason an imposter cannot self-issue a credential demanding nothing ([section 3](#10-job-fraud-detection)), and a Verifier that enforces: "The verifier then enforces the protection by not accepting presentations (grant messages) that are not so anchored." So the Issuee's self-protection depends on two other parties. Both concessions are stated by their author; a reviewer who quotes the no-trusted-third-party maxim against this design is right about the tension, and the corpus's residuals should name both.

### Refusals no specification states {#10-unspecified-refusals}

[code] keripy's V2 verifier rejects four kinds of `grant` (`raw/16` section 8 item 13): one whose ACDC declares an Issuee registry that does not bind it; one with an `a`-section `rd` and no top-level `rd`, which v1 allows as a hidden state registry; and registry-backed ACDCs with a compact `a` or any undisclosed `A` entry. None has a [spec] or [spec-next] counterpart. A peer built from either specification line will produce `grant`s keripy rejects, which is a conformance hazard; that the handler is not yet shipped, and that `E1E` was also implemented first, does not change what an interoperating implementer faces ([question 8](#10-q-unspecified-refusals)).

### Code and design document disagree {#10-code-vs-design}

#1613 conditions the requirement on the Issuee being the Grantor and requires every Grantor to endorse; keripy applies it unconditionally and accepts a registry binding in place of an endorsement ([section 6](#10-sender-layering)). A reader of #1613 will expect checks the code does not make and miss a refusal it does make, and neither document says the other has moved.

## 9. Open questions {#10-open-questions}

### Question 1: What is it called? {#10-q-name}

"Issuee usage registry" (#1095), "presentation registry" (#1613, #1618), "user presentation registry" (caption). #1550's Guardianship for SEDI uses the same primitive for agent capability control, with a legend reading `rd = issuee usage registry SAID`, and #1627 proposes a "transfer registry where a state change is not to revoke an ACDC but to provide a forward reference" to a replacement; the spec's `rd` gloss lists four purposes. With presentation only one use, the general name should probably be the usage one. keripy has chosen the narrow name, which sets the vocabulary most implementers meet first ([section 1](#10-rotate-not-revoke), [Status](#10-two-names)).

### Question 2: Does `rd` in `a` get disambiguated, and how? {#10-q-disambiguation}

Resolved in keripy, open in both specifications ([section 4](#10-trigger)). The readings are exclusive per ACDC and permanent. Tracked as [chapter 08, section 14, question 5](#08-q-rd-restriction).

### Question 3: Does the exchange need its own `rd`? {#10-q-exchange-rd}

keripy says no, finding the registry from the DAG; the specifications are silent ([section 4](#10-keripy-choice)).

### Question 4: What is the latency budget? {#10-q-latency}

There is no number anywhere. keripy's rule is looser than "must pass KRAM": the Issuee-asserted TEL `dt` must precede KRAM acceptance, and the anchoring KEL event may arrive later ([section 6](#10-rdt-coupling)). A compromised signer could backdate `dt`, but the backdated event would then be anchored in the real Issuee's KEL and detectable, so the looseness may be acceptable; nobody has written that argument down. Nothing implements #1095's delay.

### Question 5: What would `rip` spec text say? {#10-q-rip-text}

The spec binds a registry to "the Issuer AID"; for a presentation registry the incepter is the Issuee. keripy reads it as whoever incepted the registry, and the spec text does not say so ([section 5](#10-wording-tension)).

### Question 6: Who verifies, and against what? {#10-q-who-verifies}

The Grantee checks against a TEL it must already hold. Retrieval is unbuilt, and whether it should go through the Issuee's Registrar or a verifier-controlled Observer, which watches registrar state exactly as this needs ([chapter 05, section 9](#05-registries)), is connected by no source. PR #1674 names "presentation-registry anchoring or observer-based TEL retrieval" as follow-up work without connecting them.

### Question 7: Two incompatible bespoke origin ACDCs share a name {#10-q-two-bespoke-origins}

#1613's self-issued bespoke origin must use a blinded state registry or hand correlation back at the origin ([section 3](#10-job-correlation)); #1627's SEDI recipe origin uses no registry, no anchor and bare signatures, because it is one-time use ([chapter 08, section 3](#08-bespoke-origin)). Each is coherent for its job, neither mentions the other, and a worked example combining a presentation registry with a recipe origin yields a correlatable presentation whose perpetual verifiability the origin cannot carry. keripy builds neither combination.

### Question 8: keripy refuses `grant`s for reasons no specification states {#10-q-unspecified-refusals}

Which side moves: the specifications adopting the four refusals of [section 8](#10-unspecified-refusals), or keripy relaxing those a peer cannot be expected to know?

### Question 9: Single versus double authentication, and for whom {#10-q-single-vs-double}

#1613 applies the requirement "when the Issuee is the Grantor of that IPEX" (#1613 > Registry Anchored Granted ACDCs) and requires every Grantor to endorse; keripy applies it to every declaration whoever sends, and accepts the registry binding alone. They agree when a holder presents its own credential. Under keripy's rule, an ACDC presented as third-party evidence, where "an ACDC is presented as evidence, but the Issuee AID is unrelated to the Discloser's AID", cannot be presented unless its Issuee binds this `grant`, which may be intended and was not discussed; and `eidx` misses registry-only Issuees. Should #1613 move to match the code, or the reverse?

### Question 10: Does fail-closed discovery rule out selective aggregate disclosure? {#10-q-aggregate-disclosure}

Unverified. Rejecting any undisclosed `A` entry appears to rule out selective disclosure of a registry-backed ACDC's aggregate. The SEDI Age credential has a top-level `rd` and an `A`, no IPEX test presents it, and `raw/16` did not check how keripy represents an undisclosed aggregate element. [Chapter 05, section 4.1](#05-age-credential) records the related finding.

## Sources {#10-sources}

- ACDC spec — Authentic Chained Data Containers (ACDC) specification, Trust Over IP. trustoverip/kswg-acdc-specification, spec/spec-body.md. `main` @`f0bd097de` (2026-08-28) for [spec] claims: Other Reserved Fields, Registry SAID Field, Registry-Dependent Issuance Lifecycle, TELs as ACDC state registries. `v1.1` @`2362e48a1` (2026-09-11) for [spec-next] claims: Disclosure Paths > DAG of ACDCs. The negatives in [section 5](#10-normative) are taken at both pins. Mined in raw/03 and raw/16.
- KERIConf26 caption — edited auto-captions of the KERI Conference 2026 talks (Lehi, Utah, April 2026), keri-foundation/CONF26-subtitles, subtitles/*.fixed.srt, @`006042d39`; this chapter quotes Samuel Smith, The Digital Identity Tradespace. Captions preserve near-wording, never exact speech, and are quoted only for intent and framing. Mined in raw/14.
- keripy — KERI reference implementation, WebOfTrust/keripy, `main` @`80f77b73b` (2026-10-01): `src/keri/acdc/ipexing.py`, `acdc/regeventing.py`, `acdc/registraring.py`, `recording.py`, `db/basing.py`, and the tests `tests/acdc/test_ipexing.py` and `tests/sedi/test_ipex_sedi.py`; commits `790797bcd` and `b7c170f93`. Mined in raw/16, with raw/09 for the IPEX rework and raw/15 section 4.8 for KRAM's `rdt`.
- keripy discussions — WebOfTrust/keripy GitHub discussions, https://github.com/WebOfTrust/keripy/discussions. [#1095](https://github.com/WebOfTrust/keripy/discussions/1095) (ACDC Issuee Usage Registry, SmithSamuelM, October 2025), [#1613](https://github.com/WebOfTrust/keripy/discussions/1613) (Authentication Factors in IPEX, SmithSamuelM, August 2026), [#1098](https://github.com/WebOfTrust/keripy/discussions/1098) (last edited 2026-09-26, fetched 2026-10-03), [#1618](https://github.com/WebOfTrust/keripy/discussions/1618), [#1550](https://github.com/WebOfTrust/keripy/discussions/1550), [#1627](https://github.com/WebOfTrust/keripy/discussions/1627). Cited for Sam's rulings by comment URL from the raw/21 cache of 2026-10-14: [#1512](https://github.com/WebOfTrust/keripy/discussions/1512) (R-062) and [#1574](https://github.com/WebOfTrust/keripy/discussions/1574) (R-042). Mined in raw/16 and raw/21.
- keripy PRs — WebOfTrust/keripy pull requests, cited for status and intent only: [#1674](https://github.com/WebOfTrust/keripy/pull/1674) (merged 2026-09-11), [#1689](https://github.com/WebOfTrust/keripy/pull/1689), [#1693](https://github.com/WebOfTrust/keripy/pull/1693) (merged 2026-09-28) and [#1697](https://github.com/WebOfTrust/keripy/pull/1697). Mined in raw/16.

---

# 11 — Infrastructure and Operations {#11-infrastructure}

## Thesis {#11-thesis}

KERI's infrastructure is separated control over shared data. The controller designates a witness pool that promulgates its key event log; each validator chooses, and may keep secret, a watcher pool that confirms what it is shown; and one layer up, an issuer's registrar serves transaction event logs to observers that verifiers control. The specification fixes that split and little else: who controls which pool, KAWA's threshold arithmetic, the controller's duty to propagate events so a validator cannot be eclipsed, witnesses as a second authentication factor, and discovery by untrusted OOBIs. How many witnesses, where they run, who runs them, whether a witness doubles as a mailbox, and how many watchers a validator consults are arguments in talks and papers or one vendor's choices, and this chapter keeps those apart. Its central argument, implied by the arithmetic though not stated: KAWA's bounds count independent faults, so a pool whose witnesses share an operator, cloud, region or codebase is smaller than it looks, and the defence against eclipse lives in the breadth and independence of watchers, not the geography of witnesses. As of October 2026, witnesses are productized, watchers detect duplicity among one identifier's witnesses but do not share what they see, registrars and observers have just appeared, and several things said about them in talks are not yet true of the code.

## Status {#11-status}

Most of this chapter is not normative, and it marks each claim. The [spec] material is the KERI specification's `main` at `fbdd4a615`: the role split, KAWA's inequality, witness-as-second-factor, the eclipse obligation, the watcher incentive and confidentiality text, and OOBI discovery. The specification has no mailbox, no pool size beyond KAWA's inequality, and no geography, vendor or hosting guidance. The rest is [proposal] (Sam Smith's papers, decks and GitHub comments), [code] (keripy at `927c0cb87` and the KERI Foundation's packages, only where code was read), [practice] (vendor READMEs, product rules, a website, and what vendors said), the model-authored analysis corpus, and conference captions quoted only for intent. Vendor repositories were read at the pins in Sources; [section 13](#11-landscape) is the most likely to be stale.

## 1. Separated control over shared data {#11-separated-control}

### What the specification fixes {#11-role-split}

[spec] "The controller chooses how the witnesses are hosted." (KERI spec > Indirect exchange via witnesses and watchers, L43 @fbdd4a615), while the watcher pool "is under the ultimate control of the AID's event validator. To clarify, it is not under the control of the AID's controller." (L45). The witnesses form "a highly available and secure promulgation network for that AID" (L43), and the watchers "a highly available and secure confirmation network" (L47). The security content of both roles is [chapter 02, sections 8 and 9](#02-observer-layer).

### Where the split came from {#11-split-lineage}

[proposal] Sam's 2020 Trust Bases deck: "Shared data = good, shared control = bad." and "KERI = separated control over shared data." (Trust Bases deck, p. 38 @b47f21597). It justifies the split as a trade: separation "may provide better decentralization, more flexibility, better scalability, lower cost, higher performance, and more privacy at comparable security." (same). The deck does not claim separation makes KERI secure; end-verifiability does that. In 2026 Sam put the corollary as "KERI doesn't exist without infrastructure." (KERIConf26 caption, Samuel Smith, State of the KERI Suite, 35:37).

### Witnesses are not watchers, in operation {#11-roles-in-operation}

[proposal] The commonest operational error is letting a relying party rely on a witness's view ([chapter 02, section 9](#02-witnesses-as-watchers)). Sam's rule: "An event should not be Seeable by a second party unless a watcher can see it, not if a witness can see it." (keripy GitHub > #1559, comment of 2026-07-31, R-008, https://github.com/WebOfTrust/keripy/issues/1559#issuecomment-5138781953). A product that ships witnesses and no watchers has shipped the promulgation half of KERI's infrastructure and none of the confirmation half.

## 2. Registrars and observers: the split one layer up {#11-registrar-observer}

An issuer's registrar holds its TELs; a verifier's observer fetches and verifies them, and the verifier asks its observer, not the issuer. The mechanism is [chapter 05, section 9](#05-registries), and issuee-controlled registrars are [chapter 10, section 6](#10-governance-split).

### What the KERI Foundation published in October 2026 {#11-kf-registrar-observer}

[practice] `kf-observer` (2026-10-08) "is the ACDC counterpart of a watcher. Watchers serve KELs; this process serves TELs." (kf-observer README > kf-observer, L8 @d6368aef9), and `kf-registrar` (2026-10-09) "the ACDC counterpart of a witness." (kf-registrar README > kf-registrar, L7 @bf14eac4d). The observer requires "Wallets and verifiers must not talk to the registrar — they talk to an observer (anti-correlation). For SEDI, observers are not optional." (kf-observer README > kf-observer, L9). It checks each TEL event against the issuer's KEL and "stores a verified copy" (L5), leaving the issued-or-not check to the verifier (kf-observer README > Trust boundary), so the verifier depends on its data, not its verdict.

### Two departures from the witness and watcher pattern {#11-registrar-departures}

Both are this chapter's reading of READMEs, not of code. First, the relationship is permissioned by the issuer: the registrar's external port is "authenticated with KRAM and restricted to configured observer AIDs" (kf-registrar README > Dual HTTP, L24 @bf14eac4d). Any watcher may query any witness, but an observer may query only registrars that list it, so a verifier's choice of observer is bounded by every relevant issuer's allow-list; nothing read says how a verifier obtains one all its issuers will serve. Second, a TEL has no availability layer: "There is no registrar pool, no TEL receipts" (L27). Integrity rests on KEL anchors; availability rests on one registrar, a single point of failure.

## 3. The five Ws: a map, not an architecture {#11-five-ws}

[practice] Wallet, witness, watcher, web and wizard are the KERI Foundation's organizing frame, in no specification: it aims to build One-click KERI "through the 5 W's: Wallet, Witness, Watcher, Web, and Wizard." (KF profile > Why?, L7 @68a0d8883). Sam wrote that the Foundation "got funding to support open infrastructure (5Ws) as a public utility" (CESR spec GitHub > #165, comment of 2026-03-19) [proposal]. Witness and watcher are specification roles; web is, in Thomas Mayfield's gloss, OOBI discovery plus transports; wizard has no protocol content. The services page's gloss "Watchers – validation of authoritative key state" (keri.foundation services page, fetched 2026-10-15) is wrong in KERI's terms, because a watcher reports and only the relying party decides ([chapter 07, section 8.2](#07-watcher-enforcement)). The frame's useful content is a standard to hold vendors to: "Each of these five roles are independently operated, independently verified and uniquely can be independently replaced." (KERIConf26 caption, Thomas Mayfield, KERI Infrastructure and the 5 W's, 10:56).

## 4. Witness pools: arithmetic, sizing, diversity {#11-witness-pools}

### What is normative {#11-kawa-arithmetic}

[spec] KAWA fixes the arithmetic and nothing else: "at most one sufficient agreement occurs or none at all" provided "at most F* = N-M of the witnesses are potentially unavailable and at most F < M is duplicitous" (KERI spec > Immunity and Availability, L1866 @fbdd4a615). Its bounds and the toad discipline are [chapter 02, section 7](#02-immunity-constraint). The specification says nothing about where witnesses run, who runs them, or how many is enough, so the diversity doctrine below has no normative text behind it; the specification's one use of common-mode is about reserve rotation keys, not witnesses (KERI spec > Reserve Rotation, L1503 @fbdd4a615).

### The common-mode argument {#11-common-mode}

Sam's argument exists only at a conference: "if your witnesses all come from the same vendor, the vendor is a common mode failure source." (KERIConf26 caption, Samuel Smith, State of the KERI Suite, 40:17). A vendor agrees: "we tell our customers, you can't just get your witnesses from us." (KERIConf26 caption, Thomas Mayfield, KERI Infrastructure and the 5 W's, 31:23, Phil Feairheller in the Q&A). The derivation is this chapter's synthesis: KAWA's bounds count faulty witnesses as separate faults, which assumes they fail separately, so N witnesses sharing an operator, cloud, region or codebase have an effective size of one against that cause. One model-authored analyst says the same: "if witnesses are all hosted by the same cloud provider or operated by the same organization, correlated failures become likely." (dg-c01-claude.md > 7. Pragmatic CISO's Operational Plausibility Notes, L199 @149fa6c35).

Diversity defends against faulty witnesses, not against the controller who chooses them: "Witness sets are controller-chosen" (background.md > 4.4.3 Witness Misbehavior, L340-341 @149fa6c35). A malicious controller can run every witness, and the defence there is the validator's watchers ([section 7](#11-watchers)). A 2019 deck makes the related point that a known validator set is a censorship target (Censorship Resistance deck, p. 4 @b47f21597) [proposal]; a witness pool is published in the KEL and so is known.

### How many witnesses: there is no normative number {#11-pool-size}

- One or four, relayed secondhand from Sam: "It was either one or four cuz he says when you have three or four as your signing threshold for witnesses you can't be eclipsed" (KERIConf26 caption, Evan Asawaka, Mobile Wallet, 21:55); "three or four" is almost certainly "three of four". Do not attribute it to Sam in public without the video.
- [practice] The Foundation's boot service hardcodes it: "witness profile is `1-of-1` or `3-of-4`" (kf-boot README > Product Rules, L164 @14c8f616e).
- [practice] GLEIF runs five (KERIConf26 caption, Evan Asawaka, Mobile Wallet, 21:17); no governance framework read gives witness-count guidance.
- [practice] healthKERI lets the user choose N per region.

At 3-of-4, F* = 1, so one witness may be down, and F < M tolerates a duplicitous witness that 1-of-1 (F = 0) cannot.

### Placement as deployed {#11-placement}

[practice] The Foundation's guide titles single-host "Single Host (not very practical)" (kf-boot setup guide > Set up kf-boot on Ubuntu 24.04, L1 @14c8f616e), and of co-located witnesses Ryan Hansen said "We would not say do that in production. It doesn't really give you much help." (KERIConf26 caption, Ryan Hansen, Witnesses and Watchers, 9:02). healthKERI runs four regions, "We have New York, Frankfurt, Singapore, and Sydney." (KERIConf26 caption, Phil Feairheller, Infrastructure for Security, 26:36), but region diversity is not operator diversity: four regions of one vendor are one common-mode source. Procurement pushes the same way; of Utah, "They need multiple vendors and the way we synchronize with each other is the KERI protocol." (KERIConf26 caption, Thomas Mayfield, KERI Infrastructure and the 5 W's, 30:57). The only multi-vendor pool demonstrated in the sources is a desktop wallet rotating witnesses from two provider plugins onto one AID (raw/18 section 3.4). The ledger-backed alternative, the backer, is [chapter 03, section 9](#03-backers); no deployed ledger-backed witness network was found.

## 5. Witnesses as an authentication factor {#11-second-factor}

### The normative pattern {#11-second-factor-spec}

[spec] A witness pool is a threshold structure when "each witness only accepts local events that are protected by a unique authentication factor in addition to the controller's signatures on the event", so an attacker must "compromise not merely the controller's set of private key(s) but also the unique second factor on each of a threshold number of witnesses" (KERI spec > Validator Roles and Event Locality, L1764 @fbdd4a615). keripy's version is [chapter 03, section 9](#03-local-vs-remote).

### The instances {#11-second-factor-instances}

[code] keripy ships the client: the receipting doer takes a "map of witness AIDs to (time,auth) tuples for providing TOTP auth for witnessing" (keripy app/agenting.py, Receiptor.receipt, L62 @927c0cb87). raw/18 attributes this docstring to `WitnessReceiptor`; it belongs to `Receiptor.receipt`. Phil Feairheller says he added the feature for healthKERI. [practice] The Foundation's witness requires it: "Before the witness will receipt events, the controller must register its AID with two-factor authentication" (witness-hk developer guide > Step 7: Authenticate with TOTP, L172 @39e1c3fc7).

### The reason given, and the trade nobody named {#11-second-factor-trade}

The stated rationale was avoiding vendor lock-in, not security: "we thought that was more vendor lock-in than we really were comfortable with, so we went with this one-time password solution." (KERIConf26 caption, Phil Feairheller, Infrastructure for Security, 25:50). Per-witness codes being "really onerous" (27:16), healthKERI offers one code for all of an AID's witnesses [practice]. On this chapter's analysis, one code collapses the specification's "unique authentication factor" per witness into a single factor for the whole pool; whether that is an acceptable instance is open.

## 6. Eclipse attacks: two meanings {#11-eclipse}

### The specification's eclipse: isolating a validator {#11-eclipse-validator}

[spec] A dead attack must reach a validator before the original event does, and the obligation falls on the controller: "a controller MUST propagate the event sufficiently widely enough that the attacker cannot eclipse all components, such as Watchers, that the validator may consult." (KERI spec > Non-establishment Dead-attack, L1638 @fbdd4a615). For establishment events, "This may be very difficult given a sufficiently widespread watcher network." (KERI spec > Establishment Dead-attack, L1652). The defender's asymmetry is [chapter 02, section 9](#02-ambient-detection). raw/18 cites L1652 as the non-establishment case; it sits under Establishment Dead-attack.

### The vendor's eclipse: reaching the witnesses {#11-eclipse-witness}

[practice] Vendors use eclipse for the reachability of a witness pool: "So, someone would immediately now have to attack four different places around the world to eclipse" (KERIConf26 caption, Phil Feairheller, Infrastructure for Security, 30:55). That is not the specification's sense. Witnesses are the controller's infrastructure, which a validator may never consult, and isolating a validator from witnesses yields a forged history only with the controller's keys. Geographic spread of witnesses does not satisfy the propagation obligation.

### What is missing {#11-eclipse-gaps}

The specification gives no propagation target, no watcher count, and no guidance on choosing watchers to make an eclipse expensive. Watcher breadth and independence is where the defence lives, and all of it is [practice]. Any discovery network that can withhold a validator's copy of the original KEL is an eclipse tool ([section 10](#11-keridemlia)).

## 7. Watchers as deployed {#11-watchers}

### The normative frame, and a tension inside it {#11-watcher-frame}

[spec] "Watchers are not explicitly managed by key events." so a validator's watchers "MAY be kept confidential and, therefore, unknown to potential attackers." (KERI spec > Indirect exchange via witnesses and watchers, L45 @fbdd4a615). And "Watchers have a strong incentive to share all the KELs they watch." (L49), since first-seen "strongly incentivizes both parties to support a widespread low-latency global network of watchers and watcher pools that share their first-seen KELs." (same). The two pull apart in operation: a shared network a validator subscribes to learns which identifiers each subscriber watches. No source resolves this.

### What vendors built {#11-vendor-watchers}

[practice] healthKERI moved from rented per-customer watchers to a pooled network on Sam's advice — "He said it's no more secure giving them VMs inside of our infrastructure than if I just created a global watcher network." (KERIConf26 caption, Phil Feairheller, Infrastructure for Security, 33:24) — assigning "We do four watchers. So, pick them at random, one in each region." (KERIConf26 caption, Phil Feairheller, Infrastructure for Security, 36:38). The Foundation's boot service requires that "one hosted watcher is required before onboarding completes" (kf-boot README > Product Rules, L169 @14c8f616e): one watcher, hosted by the operator that allocates the witness pool. Veridian announced watcher services for the second half of 2026 (KERIConf26 caption, Thomas Mayfield, KERI Infrastructure and the 5 W's, 8:12). A vendor-run global watcher network is the scope concentration of [chapter 02, section 9](#02-super-scope): a privacy and concentration cost, not an integrity one, while the relying party verifies what it is given.

### What the open watcher code does {#11-watopnet}

[code] The Foundation's watcher, `watopnet`, which depends on its witness package, "Detects even, behind, ahead, and duplicitous conditions" by fetching each witness's key state (watcher-hk watopnet/app/watching.py, Sentinal docstring, L811-812 @9be717f8a), and on duplicity logs that "witnesses have a duplicitous event" and returns (Sentinal.watch, L968). A search of `src/` at that pin for `gossip`, `peer` and `share` finds no watcher-to-watcher exchange and no evidence publication. So it detects duplicity among one identifier's witnesses but does not share first-seen KELs, does not act as a juror, and cannot see a fork shown to a different audience through channels those witnesses never saw. These are maturity facts at a pin, and the concrete content of the concession that observability infrastructure is immature ([chapter 07, section 14](#07-residuals)).

### Local watchers {#11-local-watchers}

[spec] A validator "MAY use its own watcher pool to watch its own witness pool of the AID that it itself controls" (KERI spec > Indirect exchange via witnesses and watchers, L45 @fbdd4a615). The 2026 closing panel proposed it for ordinary users: "you should have a local watcher that is informing your wallet of any changes to your key state that you didn't source" (KERIConf26 caption, panel, What KERI allows us to do that we couldn't before, 24:18). kf-boot excludes "local watcher or sidecar behavior" from its scope (kf-boot README > Scope, L50 @14c8f616e).

### Failure modes and incentives {#11-watcher-failure-modes}

Observer degradation in general is [chapter 02, section 9](#02-core-but-optional). The analysts add "Inconsistent polling frequencies (watchers check weekly instead of continuously)" and "Alert fatigue (evidence of duplicity exists but is not acted upon)" (dg-c02-claude.md > 7. Pragmatic CISO's Operational Plausibility Notes, L132-134 @149fa6c35), and "Running watchers has costs but diffuse benefits; free-rider problems likely" (dg-c05-claude.md > 7. Pragmatic CISO's Operational Plausibility Notes, L175 @149fa6c35), citing no evidence. The free-rider point runs against the specification's incentive argument, and the open watcher's lack of sharing is at least consistent with it.

## 8. Validator policy and operational posture {#11-validator-policy}

### The rule {#11-acceptance-rule}

The specification's MUST NOT trust on evidence of duplicity, and the open question of how the analysis corpus's looser acceptance and fork-handling statements square with it, are [chapter 02, section 10](#02-validator-policy). An operator should implement the specification's rule as the default, as the analysts recommend: "Reject identifiers on detection of duplicity (fail-closed)" (dg-c03-claude.md > 7. Pragmatic CISO's Operational Plausibility Notes, L238 @149fa6c35).

### The analysts' notes, sorted against doctrine {#11-ciso-notes}

The six dg-c0X analyses end with notes that are "explicitly non-normative and does not assess protocol correctness" (dg-c01-claude.md > 7. Pragmatic CISO's Operational Plausibility Notes, L187 @149fa6c35), model-generated and uncited. Where they pull against doctrine, doctrine wins.

Consistent with doctrine:

- "Treat controller compromise as inevitable and design for graceful degradation." (dg-c01-claude.md > 7, L195), the survivability objective as an operating rule.
- "Provide strong default thresholds in tooling." (L211), and validators may refuse weak thresholds as local policy.
- "Deploy watcher infrastructure as a first-class operational concern." (L238)
- Custody of next keys: "Attackers who obtain current keys frequently have broader access (credential stores, backups, build pipelines), making pre-rotation key security questionable." (dg-c04-claude.md > 7.1 Deployment Reality of Recovery Rotation Scenarios, L150). The firewall assumes next keys are kept apart ([chapter 02, section 5](#02-pre-rotation-firewall)), so next-key material must not live in any store, backup or pipeline that holds current signing keys.

In conflict with doctrine:

- Recovery escrow, "Controllers registering recovery intentions with trusted third parties before compromise" (dg-c04-claude.md > 7.4 Operational Mitigations, L176): pre-rotation already is the sealed recovery commitment ([chapter 07, section 2.1](#07-trusted-authority)).
- "Publish authoritative KELs for high-stakes identifiers (e.g., root authorities)" (dg-c03-claude.md > 7, L235): a publisher can make a KEL available, not authoritative; its authority is its signatures.
- "Governance is not optional" (L259): defensible as a deployment requirement for high-stakes use, wrong as a protocol requirement.

Policy options with limits, on this chapter's reading: accepting only recent recovery rotations (dg-c04-claude.md > 7.4, L177) is permissible local policy that rejects a legitimate late recovery, and no time window appears in the recovery rules ([chapter 03, section 10](#03-recovery-rotation)). The claim that "Higher M values make recovery rotation harder to execute maliciously (but also harder to execute legitimately)" (L175) looks mistaken: rotation authority comes from the pre-committed keys, so M changes receipting fault tolerance, not who can rotate.

## 9. Mailboxes {#11-mailboxes}

### Not a specification concept {#11-mailbox-status}

The specification has no mailbox on either branch (raw/18 section 9.1). A mailbox is store-and-forward for a controller that is not always online, and in KERIA "An agent functions as a mailbox." while "the agent is not a witness. The agent is not a watcher." (KERIConf26 caption, Kent Bull, KERIA Tutorial, 8:09 and 19:17). The agent's custody boundary is [chapter 03, section 12](#03-keria-signify).

### The conflation, and its history {#11-mailbox-conflation}

Practitioners call bundling mailboxes into witnesses an accident: "because of an artifact of accident of history, witnesses in the beginning of GLEIF's implementation of the the KERI spec, witnesses and mailboxes were combined." (KERIConf26 caption, Kent Bull, KERIA Tutorial, 7:15). He added that "HealthKERI actually did witnesses the right way in the sense that it's only a witness." (same, 7:08). Phil Feairheller called the belief that offline messages go to witnesses "a common misconception" (KERIConf26 caption, Evan Asawaka, Mobile Wallet, 19:53, in the Q&A), and said healthKERI had bundled them "simply because we were moving very fast and had nowhere else to hang them" and has "since moved away from that." (same, 19:57 and 20:05) [practice].

[code] keripy has a separate `mailbox` role (keripy kering.py, Rolage, L378-380 @927c0cb87), but `setupWitness` builds a `Mailboxer` into every witness (keripy app/indirecting.py, setupWitness, L62), and `MailboxDirector` defaults to `witnesses=True` (L513), so its `addPollers` will "add mailbox pollers for every witness for this prefix identifier" (L621). By default a witness is a mailbox and a client polls its witnesses as mailboxes.

### The open witness still bundles one {#11-witness-hk-mailbox}

The Foundation's witness, healthKERI's donated code, still gives each witness "its own non-transferable KERI identifier (Hab), its own keystore, and its own mailbox." (witness-hk developer guide > Architecture, L245-246 @39e1c3fc7) [practice], and serves `mbx` queries as a server-sent event stream (witness-hk witopnet/app/indirecting.py, HttpEnd.on_post, L280-284) [code]. So "moved away from that" is true of healthKERI's product but not of the open code at its pin; whether the mailbox is vestigial is a question for a maintainer.

### Why the separation matters {#11-mailbox-separation}

This chapter's reconstruction, which no source argues: a witness is designated in the KEL, so it is public and tied to the AID, while a mailbox holds inbound traffic. Bundling lets the infrastructure published for key-state availability see who messages the controller and when, the metadata that ESSR and SPAC protect ([chapter 12](12-confidentiality-and-secure-messaging.md)). It also couples two availability requirements that should be sized separately.

## 10. Discovery {#11-discovery}

The separation of discovery from trust is [chapter 01, section 4](#01-discovery-vs-trust), bootstrap configuration is [chapter 06, section 6](#06-bootstrap-buckets), and why observers are not a discovery service is [chapter 07, section 8.5](#07-observer-not-cache).

### OOBIs with URLs will do {#11-oobis-will-do}

[spec] "KERI does not, therefore, need its own dedicated discovery network; OOBIs with URLs will do." (KERI spec > Out-Of-Band-Introduction (OOBI), L2635 @fbdd4a615). "Percolating intermediaries do not need to be trusted." (KERI spec > SPED (Speedy Percolated Endpoint Discovery), L2843). A self (blind) OOBI lets a controller's witness AIDs appear only in its KEL, not in every bootstrap configuration (KERI spec > Self (Blind) OOBI (SOOBI), L2827), and a hostile OOBI's worst case is bounded: "an OOBI may be part of a DDOS attack but not as part of a service endpoint cache poison attack." (KERI spec > OOBI Forwarding, L2831).

### Bootstrap the controller, then redirect {#11-oobi-bootstrap}

[proposal] For long, for example post-quantum, witness AIDs, Sam: "Ultimately what the User cares about iOut of Band is to be given the controller AID of interest not its witness AIDs" (CESR spec GitHub > #165, comment of 2026-03-19, R-011, https://github.com/trustoverip/kswg-cesr-specification/pull/165#issuecomment-4090031232), and "The service endpoint in that bootstrap OOBI serves up the service endpoints of the witnesses (essentially a redirect)." (same). So a published introduction, QR code or link, should name the controller AID and serve witness endpoints behind it, so a change of witnesses never stales it.

### Percolation, as first argued {#11-percolation}

[proposal] The 2021 Percolation deck: "Discovery becomes an availability not a security problem." (Percolation deck, p. 3 @b47f21597). Its defence against discovery eclipse, "User permissioning means honest nodes self-isolate dishonest-nodes." (p. 2), is a theoretical claim, not a demonstrated property. It also says percolated discovery "Replaces or Augments User Permissioned DHT" and "Watcher Network may provide super Nodes for aggregated discovery if desirable" (p. 4), which is compatible with watchers not being discovery mechanisms as their security role. [practice] The Foundation's boot service verifies itself by percolated discovery, so "clients do not need preinstalled boot-server inception material" (kf-boot README > Transport And Auth, L95-97 @14c8f616e), over KRAM-authenticated `exn` ([chapter 09, section 1](#09-problem)).

### KERIdemlia: the boundary case {#11-keridemlia}

[proposal] KERIdemlia (2021, Ryan W. West and Sam Smith) prototyped a Kademlia DHT that "stores key state for identifiers, which maps identifiers to witness identifiers and witness identifiers to witness IP addresses" (KERIdemlia paper, p. 1 @b47f21597), from a design in the 2020 Trust Bases deck (p. 52), and claims "Keridemlia may serve as an end-verifiable replacement for DNS." (p. 3). Its prototype did not complete the verification its design rests on (p. 8). Its write path "only allows signed, verified data to be published to the network, discarding all unverified data." (p. 1). It stores key state, not the KEL, and still sends the client to a witness because "a malicious Keridemlia node could publish false KES data to mislead clients" (p. 8), bounding attacks "to only dropping data entries or denying service." (p. 8). The specification chose OOBIs with URLs, and keripy at `927c0cb87` has no `kademlia` or `dht`; it was superseded in practice, not rejected.

On this chapter's analysis, a DHT fits KERI's rule that what an OOBI leads to "MUST be verified by some other mechanism" (KERI spec > Out-Of-Band-Introduction (OOBI), L2629) as one more untrusted source. But the paper omits the two attacks that matter: eclipse and Sybil attacks on the DHT, where dropping entries is exactly a dead attack's precondition ([section 6](#11-eclipse)), and lookup privacy, since a global DHT reveals which AIDs a querier resolves. A discovery network is admissible only as an untrusted availability layer and never as the only path, and availability of first-seen history is itself part of KERI's security.

## 11. Software and hosting {#11-software-hosting}

### The premises the software is written against {#11-zero-trust-computing}

[proposal] keripy and the Foundation's services run on hio, Sam's structured-concurrency runtime, whose premises are "The network is always hostile, internally & externally; Locality is not trustworthy." and "Data is signed/encrypted in motion and at rest." (Hio deck, p. 60 @b47f21597). That is about network position; the specification's local event is earned by supervision or authentication ([section 5](#11-second-factor-spec)), so the two are consistent.

### Concurrency, and logging key-state fetches {#11-hio-rulings}

[proposal] "Multiple doers running in a single process are only logically parallel. They are still sequential within the one process." (keripy GitHub > #855, comment of 2025-12-03, R-010, https://github.com/WebOfTrust/keripy/issues/855#issuecomment-3607600921), though "HIO now supports multiprocessing." (same). And "Whenever you create a cue to get keystate, also do a logger.info so that someone watching the logs can do analytics on missing keystate." (keripy GitHub > #1323, review of 2026-03-12, R-070, https://github.com/WebOfTrust/keripy/pull/1323#pullrequestreview-3939540930). Missing key state is the first signal of unreachable witnesses or an isolated validator, so this logging rule has a security reading.

### Deployment stack, and the unexplained container objection {#11-deployment-stack}

[practice] The Foundation's stack is Python 3.14, libsodium, Falcon, nginx terminating TLS, and Circus under systemd (kf-boot setup guide @14c8f616e; witness-hk Ansible README > Architecture @39e1c3fc7), with the boot service private and the witness and watcher public ("the boot server is private. So it's not publicly accessible.", KERIConf26 caption, Keanu Pahio, KERI Development and Deployment, 6:59); of the boot host, "Keep on localhost in production." (witness-hk README > witopnet-sample.sh, L176 @39e1c3fc7).

Sam's objection to containers is relayed, not argued: "Sam's pretty adamant that there's some major security concerns about that approach." (KERIConf26 caption, Ryan Hansen, Witnesses and Watchers, 12:17). No source states the concerns. The Foundation's witness repository carries a container build and Helm chart on a `v1.3.6` branch (`272ded4d3`), not on `main`. Its Ansible pilot runs "run-keripy-witness.sh → keri runWitness(...)" (witness-hk Ansible README > Architecture, L14 @39e1c3fc7), which reads as keripy's built-in witness rather than `witopnet`; that was not checked.

## 12. Running a witness: what the reference code does {#11-witness-code}

[code] The open witness serves one controller: a provisioned witness holds a "list of controller AIDs this witness serves (currently one)." (witness-hk witopnet/core/witnessing.py, Witness docstring, L471 @39e1c3fc7). Nothing in the specification requires that; the reasons are a vendor's (isolation, simple scaling), and "currently one" marks a present choice. No source argues a privacy rationale. And keripy's receiptor waits for every witness rather than the threshold, so one witness down can block receipting ([chapter 02, section 8](#02-witnesses)); an operator sizing for F* = 1 does not yet get the benefit from the reference client.

## 13. The KERI Foundation and the vendor landscape, as of 2026-10-15 {#11-landscape}

### What exists {#11-landscape-exists}

[practice] The Foundation's open witness (`witness-hk`, package `witopnet`), watcher (`watcher-hk`, `watopnet`) and boot service (`kf-boot`) derive from healthKERI's donated code: "HealthKERI had developed Locksmith wallet, watchers and witnesses for their proprietary products." (KERIConf26 caption, Samuel Smith, State of the KERI Suite, 43:33); the desktop wallet is `locksmith`; `kf-registrar` and `kf-observer` are new ([section 2](#11-kf-registrar-observer)). The older `keri-foundation/observer` and `keri-foundation/registrar` repositories are still one-line placeholders, and raw/14's statement that neither service exists describes those two. Onboarding allocates a witness pool and a hosted watcher, then the wallet rotates its AID onto the pool (kf-boot README > Onboarding Flow @14c8f616e).

### What is promised {#11-landscape-promised}

Hosted test networks, "we'll be providing some witness and watcher networks on our own servers so that people who want to test it out can test it out" (KERIConf26 caption, Samuel Smith, State of the KERI Suite, 44:04), were not checked. One-click KERI was promised in 2024 within a year, "we hope to finish One-click-KERI in a year" (KF profile > When?, L23 @68a0d8883), and restated in April 2026 as "One click, it'll install KERI infrastructure for you." (KERIConf26 caption, Samuel Smith, State of the KERI Suite, 41:22). Per-ecosystem deployment recommendations were expected from the Foundation and not found. Jay Alexander Elliot's case for keeping wallet and provider plugins separate is the Foundation's openness claim: without that boundary, "the system may still look open on paper, but it becomes less open in practice" (KERIConf26 caption, Jay Alexander Elliot, Open KERI Infrastructure, 1:27).

### What does not hold {#11-landscape-does-not-hold}

Both package READMEs give `pip install witopnet` and `pip install watopnet` (witness-hk README > From PyPI, L34 @39e1c3fc7; watcher-hk README > From PyPI, L43 @9be717f8a), and PyPI returned 404 for both on 2026-10-14 and 2026-10-15. The services page says "That’s why we certify all code offered." (keri.foundation services page, fetched 2026-10-15); no certification process or list was found. Its FAQ explains its separate repositories: "The KERI Foundation decided to maintain its own repositories to focus more on further maturing the KERISuite" (keri.foundation FAQ > 3. Projects, fetched 2026-10-15).

## 14. What is established, what is contested, and open questions {#11-established-contested}

### Established {#11-established}

The role split, KAWA's inequality, the controller's propagation duty with watcher breadth as its defence, and witnesses as a thresholded second factor are normative; pool size, placement and operator are not. Discovery is untrusted and needs no network of its own. The specification has no mailbox.

### Contested or unresolved {#11-contested}

The diversity doctrine is synthesis from KAWA's independence assumption, carried only in captions and a model-authored analysis. The one-or-four recommendation is secondhand. Sam's container objection is hearsay with no stated reason. The vendor sense of eclipse is not the specification's.

### Open questions {#11-open-questions}

1. Is the per-witness mailbox in `witness-hk` vestigial ([section 9](#11-witness-hk-mailbox))?
2. What are Sam's security concerns about containerized deployment ([section 11](#11-deployment-stack))?
3. Does any watcher share first-seen KELs or duplicity evidence, as the specification's incentive argument assumes ([section 7](#11-watopnet))?
4. How does a confidential watcher set coexist with a vendor's shared watcher network ([section 7](#11-watcher-frame))?
5. Is one TOTP code across an AID's witnesses an acceptable instance of the per-witness factor ([section 5](#11-second-factor-trade))?
6. Does one witness per controller have a written privacy rationale, or is it purely operational ([section 12](#11-witness-code))?
7. Why does the registrar allow-list observers, and how does a verifier get an observer every relevant issuer will serve ([section 2](#11-registrar-departures))?
8. Which witness does the `witness-hk` Ansible pilot deploy ([section 11](#11-deployment-stack))?
9. Will the vLEI governance frameworks or the Foundation publish witness-count guidance ([section 4](#11-pool-size))?
10. Was KERIdemlia ever evaluated against DHT eclipse, Sybil attacks or lookup privacy ([section 10](#11-keridemlia))?

## Sources {#11-sources}

- background.md — KERI: Canonical Background for Security Analysis (v0), keri-security-analysis corpus, this project's own analytical model and never [spec]. WebOfTrust/keri-security-analysis, background.md, @149fa6c35 (2026-04-23), the repository's only commit. Quotes drop the source's markdown emphasis. Mined in raw/07 section 13.
- Censorship Resistance deck — Censorship Resistance of Permissioned Ledgers, Survivability Analysis, Phil Windley and Samuel M. Smith, IIW Fall 2019. SmithSamuelM/Papers, presentations/CensorshipResistance_IIW_2019_B.pdf, master @b47f21597; pages are PDF pages (raw/18's slide 3 is page 4). Mined in raw/18.
- CESR spec GitHub — Sam Smith's comment of 2026-03-19 on trustoverip/kswg-cesr-specification pull request #165 (R-011), read from the API cache of 2026-10-14 (`.ignored/sam-rulings-cache/`), preserving his typing ("iOut"). [proposal]. Mined in raw/21.
- dg-c01-claude.md to dg-c06-claude.md — model-authored analyses, keri-security-analysis corpus, @149fa6c35 (2026-04-23), cited only from their non-normative section 7 (Pragmatic CISO's Operational Plausibility Notes). Mined in raw/07 section 13.8.
- Hio deck — Hierarchical Asynchronous Coroutines and I/O, Samuel M. Smith. SmithSamuelM/Papers, presentations/Hio.web.pdf, master @b47f21597; pages are PDF pages. [proposal]. Mined in raw/18.
- KERI spec — Key Event Receipt Infrastructure (KERI) specification, Trust Over IP. trustoverip/kswg-keri-specification, spec/spec-body.md, main @fbdd4a615 (2026-08-28); the absence of "mailbox" was checked on main and on v1.1 @3753f3797 by raw/18. Mined in raw/01 and raw/18.
- KERIConf26 caption — hand-corrected auto-captions of the KERI Conference 2026 talks (2026-04-22 to 23), keri-foundation/CONF26-subtitles @006042d (2026-10-04). Quoted as the captions read, for intent and framing only; times are cue starts. Where a quote comes from a Q&A after someone else's talk, the locator names the talk and the text names the speaker. Mined in raw/14 and raw/18.
- KERIdemlia paper — WIP: Keridemlia White Paper, Ryan W. West and Samuel M. Smith, 2021. SmithSamuelM/Papers, whitepapers/keridemlia.pdf, master @b47f21597. Quotes checked against an OCR of an unreadable text layer. [proposal]. Mined in raw/18.
- keripy — the KERI reference implementation, WebOfTrust. WebOfTrust/keripy, main @927c0cb87 (2026-10-10): src/keri/app/indirecting.py, src/keri/kering.py, src/keri/app/agenting.py. Mined in raw/18.
- keripy GitHub — Sam Smith's comments in WebOfTrust/keripy: issue #1559 (2026-07-31, R-008), issue #855 (2025-12-03, R-010) and pull request #1323 (2026-03-12, R-070), read from the API cache of 2026-10-14. [proposal]. Mined in raw/21.
- keri.foundation services page and FAQ — https://keri.foundation/about/services/ and https://keri.foundation/faq/, fetched 2026-10-15; the fetch date is the pin. [practice]. Mined in raw/18.
- KF profile — the KERI Foundation's GitHub organization profile. keri-foundation/.github, profile/README.md, @68a0d8883 (2024-07-20). [practice]. Mined in raw/18.
- kf-boot README and kf-boot setup guide — keri-foundation/kf-boot, README.md and setup-guide.md, main @14c8f616e (2026-09-11). Product rules are vendor policy. [practice]. Mined in raw/18.
- kf-observer README — keri-foundation/kf-observer, README.md, main @d6368aef9 (2026-10-08). README only. [practice]. Mined in raw/18.
- kf-registrar README — keri-foundation/kf-registrar, README.md, main @bf14eac4d (2026-10-09). README only. [practice]. Mined in raw/18.
- Percolation deck — Invasion Percolation Discovery, OOBIs, Spanning Trust Layer, Samuel M. Smith, IIW 2021 B. SmithSamuelM/Papers, presentations/KERI_Percolation_OOBI.web.pdf, master @b47f21597; pages are PDF pages. [proposal]. Mined in raw/18.
- Trust Bases deck — Verifiable Trust Bases, Renewing the Web of Trust, version 2.53, Samuel M. Smith, 2020-10-20. SmithSamuelM/Papers, presentations/KERIVerifiableTrustBases.web.pdf, master @b47f21597; pages are PDF pages. [proposal]. Mined in raw/18.
- watcher-hk — the KERI Foundation's watcher, package `watopnet`. keri-foundation/watcher-hk, main @9be717f8a (2026-09-25), README.md and src/watopnet/app/watching.py. README claims are [practice]; src/ is [code]. Mined in raw/18.
- witness-hk — the KERI Foundation's witness, package `witopnet`, healthKERI's donated code. keri-foundation/witness-hk, main @39e1c3fc7 (2026-09-29), README.md, docs/developer-guide.rst, ansible/README.md, src/witopnet/core/witnessing.py and src/witopnet/app/indirecting.py; branch `v1.3.6` at `272ded4d3` (2026-09-28) for its container files. README and guide claims are [practice]; src/ is [code]. Mined in raw/18.

---

# 12 — Confidentiality and Secure Messaging {#12-confidentiality}

## Thesis {#12-thesis}

KERI's core makes no promise about who can read a message or see that two parties are talking; [chapter 06, section 4](#06-layered-privacy) defers that to SPAC and TSP, and this chapter is where the deferral lands. The answer is a priority order and a construction. The order is authenticity, confidentiality, then the best privacy those allow, because Sam Smith argues the first two can be won outright while privacy can only be defended at a cost. The construction is ESSR, encrypt-sender-sign-receiver, applied between autonomic identifiers rather than long-term public keys: the sender's identifier goes inside the ciphertext, the receiver's under the signature, and each party's keys come from its key event log, so the binding survives rotation. Privacy is built on top from contexts partitioned so that the context, not the identifier, is what an observer correlates; contexts nested and routed through intermediaries; and, for data already shared, legal accountability rather than concealment.

Privacy is not confidentiality: KERI's authors use the surveillance meaning, who talked to whom. Cryptographic unlinkability is not the goal; they argue contextual re-identification defeats it and it costs accountability. And in ToIP's Trust Spanning Protocol, authenticity and confidentiality are cryptographic while metadata privacy depends on intermediaries, and timing, size and frequency survive every mechanism.

## Status {#12-status}

Almost everything is [proposal]: whitepapers and decks in Sam Smith's Papers repository, 2021 to August 2026, several saying they are his opinion ("In my opinion", SPAC paper > PAC Trilemma, L11 @b47f21597). The PAC trilemma is posited, not proved. Apart from TSP sentences marked [spec], nothing in sections [1](#12-trade-space), [2](#12-vocabulary), [3](#12-effective-privacy), [5](#12-contexts) or [7](#12-sustainable-privacy) is in any specification. Three things reached further:

- [spec] in CESR: the ESSR wrapper and payload count codes and the X25519 sealed-box and HPKE-Base cipher codes are in the master table on `main` and `v1.1` ([section 9](#12-wire)).
- [spec], experimental, outside the KERI suite: ToIP's Trust Spanning Protocol adopts ESSR by name, with SPAC's nesting, routing and relationship forming ([section 10](#12-tsp-spec)). Its status line reads "Experimental Implementor's Draft Rev 3 with Errata (September 30, 2026)" (TSP spec, L4 @5599b4556). TSP comes from a different working group and accepts KERI AIDs among other identifiers.
- [code] in keripy, narrowly: one ESSR send path and SPAC's payload-type tag ([section 11](#12-implementation)). keripy has ESSR, not TSP.

Conference captions are cited for intent only. Sam co-authors the SPAC papers and TSP, so their agreement is not independent corroboration.

## 1. The trade space: authenticity and confidentiality before privacy {#12-trade-space}

### The PAC trilemma {#12-pac-trilemma}

[proposal] "One can have any two of the three (privacy, authenticity, confidentiality) at the highest level but not all three." (SPAC paper > PAC Trilemma, L13 @b47f21597). Strong authenticity is non-repudiation, which links you: "Transitive value transfer will violate complete privacy." (PAC deck, slide 9 @b47f21597). The same deck defines strong privacy as "un-correlated interactions over unbounded time and space" and weak privacy as "un-correlated interactions over bounded time and space" (PAC deck, slide 12 @b47f21597).

The wording has two forms. Beside "at the highest level", the 2021 deck also has "to the same degree" (PAC deck, slide 2 @b47f21597), which the 2025 deck applies to an interaction: "An interaction between two parties may be two of the three, private, authentic, and confidential to the same degree" (Seven Privacies deck, slide 8 @b47f21597). The first bounds the corner of the trade space, the second every symmetric point inside it, and no source reconciles them ([question 1](#12-open-questions)).

### Priority is not layering {#12-priority-not-layering}

[proposal] The priority is ToIP's, adopted by Sam: "one should start with high authenticity, then high confidentiality, and then as high as possible privacy" (SPAC paper > PAC Trilemma, L17 @b47f21597). It is not the order of layers in a message: "the ordering of the ToIP design goals w.r.t. authenticity, confidentiality, and privacy may be different from the ordering of layers" (SPAC paper > PAC Trilemma, L31 @b47f21597). A reviewer who infers that the signature must be innermost has made that conflation; ESSR signs on the outside.

### Cold war and hot war {#12-cold-hot-war}

[proposal] "Authenticity and confidentiality are like a cold war." Strong cryptography is cheap, so "there need be no casualties in this cold war" (SPAC paper > Cold War versus Hot War, L116 @b47f21597). In privacy every routing identifier is a correlation surface against unbounded adversaries, so "In the hot war of privacy, we have to Pareto optimize protection mechanisms." (L128). The objective is the paper's subtitle: "The Best Privacy Possible Given the Strongest Authenticity and Confidentiality" (SPAC paper, L3 @b47f21597). It is a design objective, not a theorem, and it assumes the cold-war cryptography really is cheap and sufficient, leaving weakness only "in the strength of the key management of the associated key pairs" (L116), KERI's home ground ([chapter 03, section 5](#03-pre-rotation)).

## 2. Vocabulary: privacy, confidentiality, metadata privacy {#12-vocabulary}

### Who versus what {#12-who-versus-what}

[proposal] Sam's definitions have been stable since 2021: "Privacy is primarily about control over the disclosure of who participated in the conversation (non-content meta-data = identifiers)." "Confidentiality is primarily about control over the disclosure of what (content data) was said in the conversation and to whom it was said (partitioning)." (SPAC deck, slide 10 @b47f21597). The paper extends who to "conversation (interaction) identifiers" (SPAC paper > PAC Trilemma, L48 @b47f21597), which is why interaction identifiers are a privacy problem in [section 6](#12-interaction-identifiers).

Of the ToIP definition of privacy (a receiver honoring the sender's expectations about shared data) and the surveillance definition (the correlatability of public metadata), the paper picks the second: "for the purposes of protocol design the definitions of confidentiality and privacy that are most suitable are the surveillance definitions" (SPAC paper > Privacy and Confidentiality, L78 @b47f21597). The first returns in [section 7](#12-accountability), answered by contract.

[spec] TSP names the split, and its vocabulary is the one to use with the wider community: protection of envelope metadata "is termed metadata privacy, differentiating it from the narrower understanding of privacy" (TSP spec > Authenticity, Confidentiality, and Metadata Privacy, L105 @5599b4556).

### The three-party exploitation model {#12-three-parties}

[proposal] The model is the ACDC specification's ([chapter 06, section 4](#06-three-party-model)), with two refinements. Privacy toward a third party "is protected if the 3rd party has no knowledge of the identifiers used by the 1st and 2nd parties" (SPAC paper > Three-Party Exploitation Model, L142 @b47f21597). And "An intermediary may be considered a 1st, 2nd, or 3rd party depending on how and by whom it is trusted or not." (L140): an intermediary trusted by both ends is a second party to the routing metadata and a third party to the content. Protection from third parties is cryptographic and structural, from second parties contractual ([section 7](#12-accountability)), and across contexts technical ([section 5](#12-contexts)).

### The drift toward "confidential" {#12-confidential-drift}

[proposal] Since 2023 Sam's vocabulary has moved toward confidential. A January 2026 fragment gives the strongest statement in the corpus of why second-party protection cannot be technical: "once shared, there is no technology that by itself protects the first party's interests" (Confidential data fragment > Three-Party Model, L11 @b47f21597). The 2025 deck's taxonomy: "Information that is not-shared = private (one party data)" and "Information that is shared with restrictions = confidential" (Seven Privacies deck, slide 13 @b47f21597). The deck never enumerates seven privacies; reading its Combinations slide's seven states as the title's seven is an inference this chapter does not adopt ([question 9](#12-open-questions)).

## 3. Effective privacy and the threat ranking {#12-effective-privacy}

### Exploitation, not correlation {#12-exploitation-not-correlation}

[proposal] "Protection against exploitation via correlation provides a more gentle trade space than mere protection against correlation." (SPAC paper > Effective Privacy, L103 @b47f21597). Protection against correlation as such never ends, since "One can always play the equivalent of a trump card" (SPAC paper > Cold War versus Hot War, L122 @b47f21597), so the target becomes exploitable correlation and the goal effective privacy, the earliest written form of the editor's 2026 goal of decorrelation ([chapter 06, section 4](#06-decorrelation)). The assumption is explicit and attackable: state actors are out of scope, because "to attempt state-actor proof mitigations would likely take us down rabbit holes that we can never return from" (SPAC paper > Exploiters, L155 @b47f21597). Every privacy property in this chapter is stated against identity thieves and data aggregators, not an adversary watching every link.

### Identity theft first {#12-identity-theft-first}

[proposal] Identity theft ranks ahead of aggregation: "The internet is broken primarily because of identity theft." (SPAC deck, slide 62 @b47f21597), on an unmeasured argument about adoption sequence. Its remedy is authentication: "any step that has strong authentication with individually signed requests for authorization will stop the attack from proceeding" (SPAC paper > Mitigations, L195 @b47f21597); signed requests are [chapter 09](#09-problem)'s subject, and the escalation attack it stops is [chapter 13, section 3](#13-rpea)'s.

SPAC's own place is narrower than its name: "protection from 2nd party aggregators may be best provided by higher layer protocols that provide contractually protected disclosure" (SPAC paper > Summary Threats and Mitigations, L256 @b47f21597).

## 4. ESSR: authenticated encryption between identifiers {#12-essr}

### The building blocks {#12-building-blocks}

[proposal] The SPAC baseline was chosen for adoptability, "only highly adoptable, well-proven, cryptographic operations from broadly supported libraries" (SPAC paper > Adoptability via Dumb Crypto, L323 @b47f21597), pre-quantum only. Signing is libsodium Ed25519, chosen for strong unforgeability where "the popular ECDSA signature scheme only has the weaker EUF-CMA" (SPAC paper > Best Authenticity, L331 @b47f21597); encryption is the libsodium sealed box, an IND-CCA2 scheme with "the end-only viewability of asymmetric public key encryption" (SPAC paper > Best Confidentiality, L351 @b47f21597)., properties relayed from literature not read here.

[spec] TSP reverses the baseline. "TSP implementations MUST support HPKE-Base mode as defined in this document." (TSP spec > Hybrid Public Key Encryption (HPKE), L993 @5599b4556), and of the sealed box, "implementors SHOULD consider migrating to the HPKE option specified in this document. We MAY remove this option in the future." (TSP spec > Libsodium Sealed Box, L1052 @5599b4556). The paper's reason for the sealed box, that RFC 9180 implementations were "not yet broadly available" (L359), has aged. TSP also adds post-quantum ML-DSA-65 and an ML-KEM-768/X25519 hybrid (TSP spec > HPKE PQ and PQ/T Algorithms, L1048 @5599b4556).

### Why neither encryption nor encrypt-then-sign suffices {#12-encrypt-then-sign}

[proposal] "IND-CCA2, by itself, is insufficient to provide strong authenticity of the ciphertext." (SPAC paper > Best Confidentiality, L361 @b47f21597). Signing the ciphertext opens another forgery: "An attacker can strip the signature and resign the ciphertext with the attacker's key but has never seen the plaintext of the cipher." (SPAC paper > Best Combined Authenticity and Confidentiality, L366 @b47f21597). The fix binds the receiver's key under the signature and "bind the sender's public key inside the ciphertext" (L366): ESSR, "Encrypt Sender's key and then Sign Receiver's key" (SPAC paper > Modified ESSR, L370 @b47f21597), from Jee Hea An's 2001 analysis (IACR ePrint 2001/079). Of four unforgeability notions, "Simply using the encrypt then sign approach provides TUF-PTXT, TUF-CTXT, and RUF-CTXT but not RUF-PTXT." (SPAC paper > Modified ESSR, L372 @b47f21597), and ESSR provides all four: otherwise a malicious receiver may find another plaintext and key pair producing the signed ciphertext.

[spec] TSP restates the result: "No naive composition of public-key encryption and signature achieves authenticated encryption in the public-key setting." (TSP spec > Cryptographic Algorithms, L957 @5599b4556). The paper's appendix goes further, "The ESSR framework basically tells us that there is really only one secure approach to mixing encryption with signatures." (SPAC paper > Appendix: Using Crypto in a way that is Too-Clever-By-Half, L1165 @b47f21597), which is Sam's generalization, not An's result. An's paper was not read, so the property table is relayed twice through authors invested in ESSR ([question 2](#12-open-questions)).

### Identifiers in place of keys {#12-aids-not-keys}

[proposal] KERI binds identifiers rather than keys: "We apply ESSR to KERI by modifying the basic ESSR approach to support unbounded-term identifiers by replacing the sender's long-term public key with its AID" (SPAC paper > Baseline KERI ESSR, L388 @b47f21597), and the receiver's likewise, with current keys from each KEL. A long-term key is abandoned within a NIST cryptoperiod, taking its reputation with it (SPAC paper > Unbounded-Term AIDs instead of Long-Term Public Keys, L266 @b47f21597); with an AID, "If the provided message is using stale keys for a given AID the associated cryptographic operations will fail against the current key state" (L274). The encryption key may be "cryptographically derived from the signing public key" (L272), as keripy does ([section 11](#12-implementation)).

[spec] TSP adopts the substitution: "TSP binds VIDs where ESSR binds public keys.", and a binding to a VID "survives rotation of the keys behind it, where a binding to a public key would not." (TSP spec > Cryptographic Algorithms, L959 @5599b4556). It states the cost the paper does not: "TSP provides no means to establish which key state was current when a signature was made" (TSP spec > Security and Privacy Considerations > Binding of identifiers, L1480 @5599b4556), so ESSR's argument, which fixes the receiver's key at signing, is rebuilt by composition, concluding "No scheme specified here admits a collision meeting these constraints." (L1482). That is the specification's argument, not a cited proof, and the place a cryptographer should press.

For KERI the cost is sharper. KERI fixes which key state was current by anchoring ([chapter 03, section 11](#03-as-of-anchor)), and an ESSR message is anchored in no log, so the as-of-anchor defense against the retrograde attack does not reach it; a receiver later holding a retired key is limited only by the composition argument. Anchoring a digest of each message in the sender's KEL would restore the defense at a key event per message ([question 10](#12-open-questions)).

### Variants, and what each gives up {#12-essr-variants}

[proposal] "Any variation from the full ESSR policy may make a security trade-off induced by removing one of its protections." (SPAC paper > KERI ESSR Summary, L435 @b47f21597).

- Plaintext-sourceless. Dropping the plaintext copy of the sender's AID, which lets a firewall verify before decrypting, means "DDOS or firewall protection (security) could be traded for not exposing the sender's AID (privacy)" (SPAC paper > Plaintext Sourceless Variant, L401 @b47f21597), recoverable where "a given receiver AID, is only used for one given sender AID" (L407).
- Sourceless. Removing the sender from the ciphertext too "still exposes the receiver to an attack when the approved sender is malicious" (SPAC paper > Sourceless Variant, L411 @b47f21597).
- Destinationless. The paper argues the receiver's AID can sometimes go, since "an attacker can't purport any plaintext to have been encrypted to a different key pair other than the one that appears in the receiver's KEL" (SPAC paper > Destinationless Variant, L421 @b47f21597), and concludes only that a malicious receiver "may not gain any appreciable advantage" (L423). This is the weakest-supported claim in the ESSR material ([question 7](#12-open-questions)).

Replay is open in the base construction. The paper offers rejecting stale-key messages, which does nothing within one key state, or anchoring a digest in the sender's KEL (SPAC paper > Replay Attack Protection, L431 @b47f21597). TSP puts freshness above itself, in "the layer that understands what its messages mean" (TSP spec > Security and Privacy Considerations, L1473 @5599b4556); for KERI that is KRAM ([chapter 09](#09-problem)), whose normative status is empty ([chapter 09, section 5](#09-normative-status)).

### End-only viewability {#12-end-only-viewability}

[proposal] The confidentiality principle is the dual of end-verifiability ([chapter 01, section 4](#01-end-verifiability)): "If the edges (ends) are secure, then the security of the middle doesn't matter." (SPAC paper > End-Verifiabilty and End-Only-Viewability, L282 @b47f21597). The authenticity overlay underwrites it, because "the encryption key state must be securely attributable to the intended identifier for confidentiality to work" (TSP deck, slide 15 @b47f21597). One property is unique to this paper, first-party non-viewability: a sealed box's sender cannot decrypt it, so a party can encrypt to a destination or an isolated part of itself and delete the plaintext. "This is the zero-trust principle of encrypted-at-rest, not merely encrypted-in-motion." (SPAC paper > Appendix: 1st Party Non-Viewability, L1175 @b47f21597). It is the mechanism behind [chapter 07, section 5.5](#07-secure-pipe).

### DDoS efficiency constrains nesting {#12-ddos-efficiency}

[proposal] "Any protocol that requires decryption in order to make a drop decision can only make that drop decision at the edge host" (SPAC paper > DDOS Protection Efficiency, L1135 @b47f21597), and "multiplying nesting layers directly impacts DDOS efficiency" (L1133); hence the outer signature over plaintext in full ESSR. So the nesting of [section 6](#12-nesting-routing) is not free; its depth is a security trade.

## 5. Relationships, contexts and partitions {#12-contexts}

### The formal definitions {#12-context-definitions}

[proposal] The SPAC privacy model's core definitions (SPAC paper > Relationships > Basics, L471-L485 @b47f21597):

- "A cryptonym is a cryptographically derived pseudonym with at least 128 bits of entropy in the derivation." (L471)
- "A relationship is a pairing of two AIDs, one each from a different controller." (L473), bidirectional or one-way.
- "Two different AIDs are by themselves uncorrelated in an information-theoretic security sense" (L474).
- "A context is a set of events." (L475), and "A partition is a set of contexts with mutually disjoint relationships." (L478), whose members "may be correlatable due to other information associated with any pair of contexts" (L480).
- "The secure attributability of an AID, together with its perfect correlatability within a context, enables secure reputational trust" (L482).

[spec] TSP carries the identifier half: VIDs must be "cryptographically non-correlatable in an information-theoretic security context" (TSP spec > Cryptographic Non-Correlation, L152 @5599b4556).

### The context is the correlator {#12-context-correlates}

An AID lets anyone who sees it link every interaction in which it appears, but two different AIDs carry nothing that links them, so an analyst connecting one party's separate relationships works from what surrounds the identifiers. The written support is L474 and L480; Sam's slogan is "It is the context that is the supercorrelator not the identifiers." (KERIConf26 caption, Samuel Smith, SPAC & TSP, 14:00). A reviewer who calls an AID a stable correlator is right within a context and wrong in general, and the design wants the first: "We want perfect correlation within a context so that we have accountability." (KERIConf26 caption, Samuel Smith, SPAC & TSP, 16:27). The same reasoning underlies [chapter 06, section 4](#06-participation-not-correlation)'s ruling that participation is not correlation. The boundary is L480: contexts remain correlatable by timing, size, address and behavior, and the partition removes only the identifier ([section 10](#12-tsp-limits)).

### Out-of-band authentication {#12-ooba}

[proposal] Any secure protocol "requires at least one out-of-band-authentication (OOBA) factor in order to protect against a man-in-the-middle (MITM) attack" (SPAC paper > OOB Setup, L573 @b47f21597), and the same factor answers cheap pseudonymity: "Requiring an OOBA factor for any given identifier makes that identifier relatively expensive." (L577). It does not create a cryptographic binding the AID lacked ([chapter 07, section 2.6](#07-multiple-well-knowns)).

### Two meanings of OOBI {#12-oobi-overload}

The SPAC paper's OOBI is a reputable introduction inside an authenticated relationship: "We call this an Out-Of-Band-Introduction (OOBI) because the reputable relationship authentication was established Out-Of-Band with respect to the new relationship." (SPAC paper > Relationship Formation Protocol, L651 @b47f21597). KERI's OOBI is a discovery URL carrying no trust ([chapter 01, section 4](#01-discovery-vs-trust)). TSP avoids the collision: an introduction "conveys a VID and nothing more" until verified (TSP spec > Security and Privacy Considerations > Introductions, L1564 @5599b4556).

## 6. Nesting and routing {#12-nesting-routing}

### Five steps from direct to private {#12-five-steps}

[proposal] The paper builds its protocol in five steps, each with a verdict on the deck.

1. Direct ESSR, IP addresses in the clear: "Strongly Authentic and Confidential but not Private" (SPAC deck, slide 36 @b47f21597).
2. A business relationship wrapped in the ciphertext of a communication relationship, so "No 3rd party observer can view that there is a relationship" (SPAC paper > Direct Protocol as Wrapper, L630 @b47f21597): "Somewhat Private".
3. Relationship formation, where an existing relationship introduces a new one ([section 5](#12-oobi-overload)).
4. One shared intermediary, which sees which AIDs relate but never content, and holds them "only ever in memory." (SPAC paper > One Shared Intermediary, L699 @b47f21597): "Mostly Private". Both ends must trust it, and its network provider can correlate timing and size.
5. Non-shared intermediaries, one per end, so "An attacker has to get that by successfully attacking both C and D." (SPAC paper > Discussion, L792 @b47f21597), with routing tables signed at rest: "Very Private".

A final step nests a third relationship inside the routed one, hiding it "from not just 3rd parties but also the 2nd party trusted intermediaries" (SPAC paper > Cross Relationship Context Interaction Contexts, L865 @b47f21597), and the deck drops the qualifier: "Strongly Authentic and Confidential and Private" (SPAC deck, slide 44 @b47f21597). That unqualified verdict should not be accepted as stated. It holds against identifier correlation, not against timing and size analysis by an observer of more than one hop, which step 4's own limits admit ([section 10](#12-tsp-limits)).

### Routing split between two halves {#12-dead-drop}

[proposal] "The non-shared intermediary protocols above use a combination of both source vector routing and table routing." (SPAC paper > Combined Source Vector and Table Routing as Dead Drop, L1045 @b47f21597). The sender carries part of the route and the far intermediary's table supplies the rest, acting as "a dead drop controlled by the far-side destination" (L1049).

### Interaction identifiers {#12-interaction-identifiers}

[proposal] The SAID of a nonce-salted first message makes an interaction identifier "cryptographically universally unique to a given interaction" (SPAC paper > iSAIDs as IIDs, L813 @b47f21597), and putting it inside the ciphertext makes the interaction as private as its relationship: "if the relationship context is private, then any of its interaction contexts are also private (QED)" (SPAC paper > Privacy by Isolating Interaction Contexts, L827 @b47f21597). The inference is sound; its premise is what [section 10](#12-tsp-limits) qualifies.

### Multisig is a sketch {#12-multisig-sketch}

[proposal] For a multi-key receiver the ciphertext "must appear as a list of ciphertexts" (SPAC paper > Multi-sig Extension, L1057 @b47f21597). Nothing else specifies this, and keripy encrypts to the first key only ([section 11](#12-implementation)), so confidential messaging to a multisig group ([chapter 03, section 7](#03-multisig)) is open.

## 7. Sustainable privacy {#12-sustainable-privacy}

### The time value of information {#12-time-value}

[proposal] "In general, privacy dissipates over time." (SPAC paper > Time Value of Information, L1064 @b47f21597). But correlated information loses value too, so there is "a sweet spot for sustainable privacy protection that is governed by the time constant of the time value of exploitable correlation" (L1066), and partitioned contexts reset the clock: "Once a context has become leaky, however, a new isolated context can be created that restarts the clock on time value correlatability." (L1068). The argument is qualitative: no source estimates a time constant for any market, so "sustainably protectable indefinitely" (L1068) is a conditional whose condition is unmeasured ([question 3](#12-open-questions)).

### Covert, not clandestine {#12-covert-clandestine}

[proposal] A covert operative has a cover identity and survives; "a given clandestine operation is unsustainable long-term." (SPAC paper > Sustainable Management of Contexts, L1084 @b47f21597), and internet privacy tools have tended to be clandestine. The prescription: "Nest clandestine contexts inside covert contexts" (SPAC deck, slide 51 @b47f21597). The model has a herd requirement: users who use an intermediary only for what they hide "make the mere use of C itself a correlatable signal" (L1086). A covert intermediary is only as good as its legitimate traffic, which no protocol supplies.

### The contextual linkability attack {#12-contextual-linkability}

[proposal] Selective disclosure is undone by "a set of non-selectively disclosed attributes obtained from the context of the disclosure that is sufficient to re-identify the discloser" (SPAC paper > Contextual Linkability Re-identification Attack, L1101 @b47f21597), which the verifier controls: "Correctly understood, selective disclosure is a naive form of K-anonymity performed by the discloser (presenter)." (L1104). The legal half should be cited in its 2026 form, which is normative rather than a statement of law: selective disclosure "should not provide a safe harbor", and "Unfortunately, current regulatory policy does not respect this distinction." (Sustainable Privacy > 2.3, p. 5 @b47f21597).

The 2026 paper adds two arguments. Unlinkable ZKP disclosure has a security cost, an undetectable impersonation of a compromised issuer ([chapter 07, section 10.1](#07-bundled-credentials-detectability)), and a cryptoperiod limit: "at most, a bare ZKP VC can be used only for applications with a VC lifespan of no more than two years" (Sustainable Privacy > 2.4, p. 7 @b47f21597), where a KEL-anchored ACDC survives rotation ([chapter 05, section 1](#05-what-an-acdc-is)).

### Accountability as the remedy {#12-accountability}

[proposal] For data shared with a second party, "the only sustainable privacy protection mechanism" is "some form of contractually protected disclosure" (Sustainable Privacy > 3.1, p. 8 @b47f21597), now including the duty of data loyalty: "The 2nd party data holder must act as a loyal agent of the 1st party." (Sustainable Privacy > 4, p. 10 @b47f21597). Consent is not the mechanism, because "the act of consent can be easily socially engineered against the best interests of the consenter" (same page). The sharpest form is a charge against unlinkability: "Cryptographic un-linkability defeats legal, contractual, and economic accountability" (Seven Privacies deck, slide 26 @b47f21597).

Without the contractual layer of [chapter 06, section 4](#06-contractual-layer), the other two cannot hold for shared data. ACDC carries the contract through [chapter 05, section 8](#05-contractual-disclosure) and IPEX's agree and admit ([chapter 06, section 4](#06-agree-binds)). The conceded weakness ([chapter 07, section 14](#07-residuals)) applies: accountability rests on courts and regulators the protocol does not supply, varies by jurisdiction, and reaches only a second party that can be found. Against an anonymous third party it is empty, which is why sections [4](#12-essr) to [6](#12-nesting-routing) exist.

## 8. Bulk-issuance privacy in the 2026 decks {#12-bulk-issuance-privacy}

[proposal] The mechanics of bulk issuance are in [chapter 05, section 9](#05-bulk-issuance); the April 2026 IIW decks add its link to this chapter's model. "Each member of a bulk-issued set has a unique AID with unique keys derived using an HDKey algorithm" (Bulk privacy deck, slide 18 @b47f21597), so each member can live in its own context. "Placeholder updates provide herd privacy wrt correlation to date time of actual state changes" (Bulk privacy deck, slide 23 @b47f21597), the registry form of covert traffic and of [chapter 05, section 9](#05-bulk-updates)'s bulk updates. The deck also prefers a sparse Merkle tree predicate proof to a ZKP because it preserves detectability of issuer compromise ([chapter 05](#05-age-smt-proposal)).

## 9. The wire {#12-wire}

### The SPAC and TSP envelope in CESR {#12-cesr-envelope}

[proposal] The SPAC paper's CESR appendix and a TSP CESR paper specify one wrapper. Tunneled messages "are encoded as sniffable CESR streams" (SPAC paper > Appendix: CESR Implementation, L1191 @b47f21597), so KERI and ACDC messages ride inside unchanged. The plaintext head is uniform "so that the head contains no correlatable metadata besides the source and destination AIDs" (SPAC paper > Head, L1207 @b47f21597). The wrapper is `-E##` (`--E#####` large), the payload group `-Z##`, and a body beginning with `-` is a plaintext group, anything else a cipher primitive (SPAC paper > Determining if the payload field value is a ciphertext CESR primitive or a plaintext CESR group, L1549 @b47f21597). The native payload types are `CTL`, `HOP`, `RFI`, `RFA`, `RFD`, `PAD` and `SCS` (SPAC paper > SPAC Payload Types, L1246-L1254 @b47f21597); control payloads carry a pad field "to pad the total packet size to some desired minimum length" (SPAC paper > Padding Control Message Payloads, L1265 @b47f21597).

### What is in the CESR specification {#12-cesr-codes}

[spec] The master table has "| `-E##` | ESSR wrapper signable up to 4,095 quadlets/triplets |" (CESR spec > Universal Code table genus/version codes that do not allow genus/version override, L842 @bad6edd84; L850 @65fd7518b) and the payload group "ESSR (TSP) Payload `version+messagtype+...` up to 4,095 quadlets/triplets" (CESR spec > Master code table for genus/version `-_AAACAA` (KERI/ACDC protocol stack Version 2.00), L939 @bad6edd84; L947 @65fd7518b; "messagtype" sic), with the X25519 sealed-box (`4C` to `9AAE`) and HPKE-Base (`4F` to `9AAF`) cipher codes (L1028-L1051 @bad6edd84).

### Where the papers and the specifications diverge {#12-wire-divergences}

- Identifier encoding. The TSP CESR paper has an open mode, where "all VIDs must be either URNs or DIDs encoded as variable-length CESR UTF-8 byte strings" (TSP CESR paper > VID fields in Open Mode, L17 @b47f21597), and a closed mode with bare AIDs. TSP has no closed mode and a syntax rule its own KERI example breaks ([section 10](#12-tsp-vid-syntax)).
- The version field. SPAC uses `0OSPACAABCAA`, the TSP CESR paper `YTSP_AAB`, and TSP `YTSP-AAC`, version 0.2 (TSP spec > TSP Envelope Encoding, L1130 @5599b4556).
- The hop-list code. SPAC's prose says "The hop list group code is `-K##`." (SPAC paper > Hop Payload, L1377 @b47f21597), but its tables, the TSP paper and the specification use `-J##`, with `-K##` for the tail's indexed signatures. The prose is a defect ([question 5](#12-open-questions)).
- The `4F` code. CESR has "HPKE Base cipher bytes of QB2 plaintext" (CESR spec > Master code table for genus/version `-_AAACAA` (KERI/ACDC protocol stack Version 2.00), L1046 @bad6edd84); SPAC has "HPKE Base cipher bytes of sniffable stream plaintext" (SPAC paper > Ciphertext Body, L1316 @b47f21597). Two payloads under one code, and TSP does not say which it means. By [chapter 04, section 12](#04-interop-risks)'s rule this is a finding ([question 6](#12-open-questions)).

## 10. What the TSP specification settles {#12-tsp-spec}

### Shape and status {#12-tsp-shape}

[spec], with [Status](#12-status)'s caveats. TSP is identifier-agnostic: a KERI AID is one example VID beside `did:webs`, `did:webvh` and `did:peer` (TSP spec > Examples, L206 @5599b4556). It requires separate rotation authority for public VIDs (TSP spec > VID General Requirements, L144 @5599b4556), defines no rotation of its own, and lists as recovery limits pre-commitment to next keys, delegation, and first-seen recording, KERI's three defenses without naming KERI (TSP spec > Security and Privacy Considerations > Limits, L1511 @5599b4556). "The metadata privacy protections are achieved by nested TSP messages and routed messages through intermediaries." (TSP spec > Authenticity, Confidentiality, and Metadata Privacy, L107 @5599b4556), the two SPAC mechanisms.

### ESSR with HPKE-Base {#12-tsp-hpke}

[spec] Under HPKE-Base, "the binding of the ciphertext to the sender identity required by the ESSR construction is provided by the associated data `aad`" (TSP spec > HPKE-Base Mode, L1010 @5599b4556), and the in-payload sender field defaults to a null VID (L1041); under the sealed box it stays mandatory (TSP spec > Sealed Box, L1102 @5599b4556). Whether associated-data binding gives receiver unforgeability of plaintext in An's sense is the specification's own argument ([section 4](#12-aids-not-keys)), with a fallback from "the payload check alone" (TSP spec > Binding of identifiers, L1482 @5599b4556).

### Routing and relationship forming {#12-tsp-routing}

[spec] Routed mode follows SPAC's non-shared-intermediary design, typically source, its intermediary, the destination's intermediary, destination (TSP spec > Metadata Privacy in Routed Mode, L464 @5599b4556). The last hop uses a VID the destination chose, so "an intermediary cannot oblige its clients to re-establish their routing information with every correspondent" (L469). Relationship forming is mandatory before application traffic, which SPAC did not require (TSP spec > Direct Relationship Forming, L714 @5599b4556), and "The most private option is to remain silent." (L734).

### What TSP says it does not do {#12-tsp-limits}

[spec] TSP states its limits:

- No forward secrecy: "TSP does not provide forward secrecy: an adversary that has recorded earlier messages and later obtains the decryption key can read them." (TSP spec > Security and Privacy Considerations > Limits, L1515 @5599b4556). Rotation protects the future, not the recorded past.
- Metadata privacy is not cryptographic: "Metadata privacy and availability in routed mode are not among them." (TSP spec > What An Intermediary Is Trusted For, L1558 @5599b4556), "them" being the properties that need no judgment about an operator.
- "Timing, size, and frequency survive encryption, nesting, and routing alike." (TSP spec > What Remains Observable, L1527 @5599b4556). TSP does not batch, reorder or delay, so an endpoint "needs to know what its intermediaries actually do" (L1527).
- Non-retention is "not enforced by any mechanism in TSP; it is a commitment by the operator." (TSP spec > What An Intermediary Is Trusted For, L1554 @5599b4556), which is what SPAC's "only ever in memory" becomes.
- A dropping intermediary "cannot be distinguished by the sender from one that has not yet delivered it" (TSP spec > What An Intermediary Is Trusted For, L1556 @5599b4556).
- "A verified VID is an identifier that can be relied upon consistently, not an identity." (TSP spec > Introductions, L1566 @5599b4556), [chapter 07, section 9](#07-semantic-tells)'s authenticity-veracity line for channels.

A design that claims metadata privacy without naming its intermediaries, their fan-out and their padding claims a property the specification says it cannot deliver alone.

### The VID syntax conflict {#12-tsp-vid-syntax}

[spec] TSP requires "that the VID format be either compliant DID format [[ref:DID]] or compliant URN format [[ref:RFC8141]]" (TSP spec > VID Syntax, L158 @5599b4556), while its example says "An AID is not a DID; it is used directly" (TSP spec > Examples, L206 @5599b4556). A bare AID in an envelope therefore violates the syntax rule unless carried as a URN or `did:webs`. Sam co-authors both texts, so this is a question for him ([question 4](#12-open-questions)).

## 11. What is implemented {#12-implementation}

### keripy: one ESSR send path {#12-keripy-essr}

[code] keripy at `927c0cb87` has a `keri.spac` package with one primitive: `PayloadTypes = PayloadTypage(HOP='HOP', RFI='RFI', RFA='RFA', RFD='RFD', SCS='SCS')` (keripy spac/payloading.py, module level, L15 @927c0cb87), omitting `CTL` and `PAD`. `StreamPoster`'s ESSR option, for mailbox delivery, sends a plaintext that is a SPAC `SCS` payload with an always-empty pad: "bext field can be randomized to reduce correlation based on packet size, empty for now" (keripy app/forwarding.py, StreamPoster._chunk, L317 @927c0cb87). `_essrWrapper` derives the receiver's X25519 key from its first current signing key, seals with the libsodium sealed box, and signs an outer `exn` on `/essr/req` naming both ends, `modifiers=dict(src=hab.pre, dest=ctrl)`, with a digest of the ciphertext (keripy app/forwarding.py, StreamPoster._essrWrapper, L408-L430 @927c0cb87).: ESSR in shape.

Four boundaries apply. The wrapper is a KERI v1 `exn`, not `-E##`, though keripy defines `ESSRWrapperGroup: str = '-E'` (keripy core/counting.py, L210 @927c0cb87). Only the first key is used, so a multisig receiver gets one ciphertext. There is no receive handler: the `Exchanger` checks the ciphertext digest, raising "essr diger={diger.qb64} is invalid against content" (keripy peer/exchanging.py, Exchanger.processEvent, L337 @927c0cb87), and `Manager.decrypt` can open a sealed box (keripy app/keeping.py, Manager.decrypt, L1431 @927c0cb87), but nothing routes `/essr/req` to decrypt and dispatch. And there is no routing, relationship forming, padding message or HPKE. keripy implements direct-mode ESSR to a mailbox and none of sections [5](#12-contexts) and [6](#12-nesting-routing).

### Deployments, by status only {#12-deployments}

[practice] Conference speakers reported ESSR beyond keripy, unverified against code: Veridian's KERIA fork tunneling client-to-agent traffic for over a year, with agent-to-agent streams in basic TSP form, not upstream (Fergal O'Connor, Signify Security Architecture); a healthKERI gateway wrapping transactions in ESSR, not adopted for lack of interoperability; and plugin-to-service traffic per Phil Feairheller. The KERIA pull request named was not located ([question 8](#12-open-questions)).

### A proposed use for TSP inside KERI {#12-tsp-in-keri}

[proposal] Sam suggests an authorizer could answer a downstream authorizee's signed query by "attaching the unblinded state to a TSP protected response" (keripy GitHub > #1082, body created 2025-08-17 and last edited 2026-04-27, https://github.com/WebOfTrust/keripy/discussions/1082), the clearest written statement of where TSP sits in the KERI stack: beside ACDC and KRAM, carrying the second-party disclosures blinded state keeps from third parties ([chapter 05, section 9](#05-blindable-state)).

## 12. Open questions {#12-open-questions}

1. Which form of the PAC trilemma is current, "at the highest level" or "to the same degree"? They make different claims ([section 1](#12-pac-trilemma)).
2. An's paper (IACR ePrint 2001/079) is unread here, so the four-property table is relayed through interested parties ([section 4](#12-encrypt-then-sign)).
3. No source estimates a correlation time constant for any market ([section 7](#12-time-value)).
4. Must a bare KERI AID be wrapped as a URN or DID under TSP? ([section 10](#12-tsp-vid-syntax)).
5. SPAC's `-K##` hop-list code contradicts its own tables and the specification, probably a typo ([section 9](#12-wire-divergences)).
6. Does `4F` carry QB2 plaintext or a sniffable stream? ([section 9](#12-wire-divergences)).
7. Is the destinationless ESSR variant sound? ([section 4](#12-essr-variants)).
8. Where is the ESSR receive path? Until the KERIA change named in the talks is read, ESSR is implemented, in inspectable code, on the send side only ([section 11](#12-keripy-essr)).
9. What are the seven privacies of the Seven Privacies deck? ([section 2](#12-confidential-drift)).
10. Do the authors acknowledge that ESSR messages lose the as-of-anchor defense? ([section 4](#12-aids-not-keys)).

## Sources {#12-sources}

- Bulk privacy deck — Samuel M. Smith, Bulk Issuance Privacy (IIW, April 2026), and its companion Bulk Issuance Synergy with Data Loyalty. SmithSamuelM/Papers, presentations/BulkIssuancePrivacy.pdf and presentations/BulkIssuanceSynergyDataLoyalty.pdf, master @`b47f21597` (2026-08-11), both added `b8cc11a` (2026-04-30). Quoted from the extracted text in `.ignored/papers-text/`; the extraction loses fi and ff ligatures, and no quote here crosses a damaged word. Mined in raw/17.
- CESR spec — Composable Event Streaming Representation (CESR) specification, Trust Over IP. trustoverip/kswg-cesr-specification, spec/spec-body.md, `main` @`bad6edd84` (2026-08-28) and `v1.1` @`65fd7518b` (2026-08-26); read 2026-10-15 for the ESSR count codes and cipher codes only. Mined in raw/17.
- Confidential data fragment — Samuel M. Smith, ACDC Affordances for Confidential (Sensitive) Data Protection and Management, an undated fragment. SmithSamuelM/Papers, whitepapers/ACDCConfidentialDataManagement.md, master @`b47f21597`, last touched `6fa71dd` (2026-01-16). Mined in raw/17.
- KERIConf26 caption — edited auto-captions of the KERI Conference 2026 talks (Lehi, Utah, April 2026), keri-foundation/CONF26-subtitles, subtitles/*.fixed.srt @`006042d`; this chapter quotes Samuel Smith, SPAC & TSP, at times read from the caption file on 2026-10-15. Near-wording only, quoted for intent and framing, never for a design detail; see raw/14 section 0. The deployment reports in [section 11](#12-deployments) come from the raw/14 and raw/17 summaries of other talks and are not quoted. Mined in raw/14 and raw/17.
- keripy — KERI reference implementation, WebOfTrust/keripy, `upstream/main` @`927c0cb87` (2026-10-10), read for raw/17 and re-checked 2026-10-15: `src/keri/spac/payloading.py`, `src/keri/app/forwarding.py`, `src/keri/peer/exchanging.py`, `src/keri/core/counting.py`, `src/keri/app/keeping.py`. The ESSR send path was added in `a6e12a74b` (2025-09-02). Mined in raw/17.
- keripy GitHub — WebOfTrust/keripy discussion [#1082](https://github.com/WebOfTrust/keripy/discussions/1082) (New Bound and Blinded State TEL, SmithSamuelM, created 2025-08-17), body read from the raw/21 cache fetched 2026-10-14. Mined in raw/21.
- PAC deck — Samuel M. Smith, KERI PAC Theorem, version 2.60 2021/04/23. SmithSamuelM/Papers, presentations/KERI_PAC_Theorem.pdf, master @`b47f21597`, last touched `f9cae65` (2022-04-08). Slides 1-32 and 79-92 read; ligature-damaged in extraction. Mined in raw/17.
- Seven Privacies deck — Samuel M. Smith, Seven Privacies, undated. SmithSamuelM/Papers, presentations/SevenPrivacies.web.pdf, master @`b47f21597`, last touched `da3cde9` (2025-09-11). Mined in raw/17.
- SPAC deck — Samuel M. Smith, SPAC Overview, title slide 2023/06/17. SmithSamuelM/Papers, presentations/SPAC_Overview.web.pdf, master @`b47f21597`, last touched `b4e21b8` (2023-11-17). The SPAC Strawman deck of the same date adds nothing and is not cited. Mined in raw/17.
- SPAC paper — Samuel M. Smith, Secure Privacy, Authenticity, and Confidentiality (SPAC), Version 0.5.3 (original draft 2023-03-25). SmithSamuelM/Papers, whitepapers/SPAC_Message.md, master @`b47f21597`; last substantive change `cd2661f` (2025-06-11), CESR appendix added `9d163d6` (2025-04-21), last touched `b8cc11a` (2026-04-30). The version string has not moved since 2023 although the content has, so cite by commit. Mined in raw/17.
- Sustainable Privacy — Samuel M. Smith, Sustainable Privacy, v1.2.8 2026/08/11 (original 2023/09/18). SmithSamuelM/Papers, whitepapers/SustainablePrivacy.pdf, master @`b47f21597`. Cited by section number and page of the extracted text, with hyphenated line breaks rejoined. Mined in raw/17.
- TSP CESR paper — Samuel M. Smith, TSP CESR Implementation, undated. SmithSamuelM/Papers, whitepapers/TSP_CESR_Implementation.md, master @`b47f21597`, last touched `24db805` (2025-07-09). Mined in raw/17.
- TSP deck — Samuel M. Smith, Trust Spanning Protocol slides, title slide 2023/02/08. SmithSamuelM/Papers, presentations/TSPSlides20230308.web.pdf, master @`b47f21597`, last touched `6f0ab85` (2023-03-08). Mined in raw/17.
- TSP spec — Trust Spanning Protocol (TSP) Specification, Experimental Implementor's Draft Rev 3 with Errata, Wenjing Chu and Samuel Smith, Trust Over IP. trustoverip/tswg-tsp-specification, spec/spec.md, `main` @`5599b4556` (2026-09-30), read from a shallow clone on 2026-10-14 and 2026-10-15; the test-vector appendix was not read. Not in refresh/sources.yaml. Mined in raw/17.

---

# 13 — Authority, Authorization and Agents {#13-authority}

## Thesis {#13-thesis}

KERI carries authority as it carries everything else: as data whose authenticity a stranger can check from the data and key state alone. A targeted ACDC is the vehicle. Its Issuer conveys authority to its Issuee, the Issuee may issue the next ACDC, and the chain of issuer-to-issuee credentials, each anchored in its Issuer's KEL, is the authority. The party asked to honor an act walks that chain itself; no identity provider, token service or authorization server stands between them. That much is specification text. On it Sam Smith has built, in 2026, Edge Verifiable Access Control (EVAC), which turns ACDCs into access grants; a cure for broken delegation chains, in three parts of which one is specified; a revocation doctrine explaining why bare signatures pushed the industry into federation; and an account of AI agents whose content is that agents need nothing new, because an agent is a delegate.

Three claims organize the chapter. Two operations share the word delegation: delegating an identifier is a KEL operation ([chapter 03, section 8](#03-delegation)), delegating authority is an ACDC chain, and a review that confuses them looks for guarantees in the wrong log. Authority that must be revocable must be read at verification time, and that is not a phone-home: the line falls between fetching state the verifier checks against key state and asking a service for a verdict ([section 5](#13-state-not-verdict)). And an AI agent is a delegate with its own identifier, acting under authority an accountable party granted and can revoke; everything else said about agents is advocacy, carried as Sam's assessment.

## Status {#13-status}

Most of this chapter is [proposal]. The normative floor is narrow and all in the ACDC specification's standardizing line: the targeted ACDC as a vehicle for authorization, the chain of authority, attenuation, and the bound blinded attribute block ([section 1](#13-normative-floor), [section 6](#13-broken-chains)). The bound block's structure is also [code] in keripy at `80f77b73b`, and nothing there uses it to judge a downstream issuance.

Above the floor sit EVAC, reversion of authority, the registry transfer event, the revocation doctrine of Sam's June 2026 white paper, group issuance, the agent pattern, and the shape-of-authority model in Daniel Hardman's `sda.md`. Several sources are slide decks, quoted by page from extracted text with damaged ligatures, and conference captions, quoted only as the captions read, for intent and framing. The applied patterns of [section 11](#13-applied-patterns) are spoken vendor and demonstration claims with no code read. The documents the AI material in [section 9](#13-agents) responds to, a Five Eyes statement and an OWASP report, were not read.

## 1. The normative floor: a targeted ACDC conveys authority {#13-normative-floor}

[spec] In a targeted ACDC, "the Issuer MAY use the ACDC as a contractual vehicle for conveying authorization to the Issuee." (ACDC spec > Top-level ACDC Sections > Attribute Section > Attribute Section Variants > Targeted Attribute Section, L324). The same paragraph states chain and attenuation: "an Issuer MAY delegate authority to an Issuee who MAY then become a verifiably authorized Issuer" who may pass on "that authority (or attenuation of that authority)" (L324), and the edge section names the pattern: "A common use case of a chain-of-authority is a delegation chain for authorization." (ACDC spec > Top-level ACDC Sections > Edge Section > Edge > Operator, `o` field, L1203). Both are unchanged in substance on `v1.1` @`2362e48a1` (L335, L1215).

[spec] The converse guards against a common misreading. An untargeted ACDC is "not authentic data as an authorization or entitlement to a specified party" (ACDC spec > Top-level ACDC Sections > Attribute Section > Attribute Section Variants > Untargeted Attribute Section, L334). An untargeted chain carries provenance, not authority, and authority inferred from an untargeted credential is a defect.

### What the floor gives a verifier {#13-floor-guarantees}

Each link is attributable to its Issuer's key state at the anchor, so a later rotation does not invalidate the chain, provided anchors are verified as of their position in each Issuer's log ([chapter 03, section 11](#03-as-of-anchor)). Each link is revocable by its own Issuer, and revocation propagates downward: keripy raises `RevokedChainError` on a revoked far node ([chapter 05, section 5.1](#05-chain-revocation)). Each link's edge operator names how the near Issuer must relate to the far Issuee; `I2I` is the delegative case ([chapter 05, section 5](#05-edges)).

The floor does not say how a verifier decides whether an attenuated grant covers a requested act; rules are not machine-enforced ([chapter 05, section 6](#05-rules)), and edge operators check relations between adjacent nodes, not multi-hop authority ([chapter 07, section 10.5](#07-edge-operators)). Nor does it settle what happens to an issuance by a delegate whose grant is later revoked. Sam's overview deck hedges: revoking a link "breaks the chain and thereby may invalidate any authorizations or attestations that are chained from their credential." (AlphaOmega deck, p48). That "may" is the problem [section 6](#13-broken-chains) addresses.

### The vLEI as the deployed instance {#13-vlei-instance}

[architect] The vLEI chain (GLEIF, Qualified vLEI Issuer, Legal Entity, role credentials) is the deployed instance: "Anyone in the chain-of-authority can revoke the credential issued-by them." (AlphaOmega deck, p48). The 2025 deck's property set, "This provides TADAAA! (tail authenticated, delegated, attenuable, aggregable authorization)" (AlphaOmega deck, p30), became in 2026 "Delegable Attenuable Aggrable Revocable Transferable Authority" (EVAC deck, p3). The two added properties are what the proposals of [section 6](#13-broken-chains) exist to deliver, which is compact evidence that they are new design.

## 2. Two delegations, one word {#13-two-delegations}

### Delegating an identifier {#13-identifier-delegation}

[architect] KEL delegation creates an AID whose inception is approved by a seal in its delegator's log. It is cooperative, and it bounds what compromising either party alone gains ([chapter 03, section 8](#03-joint-compromise)). It conveys control, not scope. The 2022 DAD deck draws the distinction the 2026 registry proposals extend: "Delegation of identifier (revokable). This creates a new identifier with its own set of keys" as against "Transfer of control (non-revokable)." (DAD deck, p10).

### Delegating authority {#13-authority-delegation}

[practice] An ACDC chain conveys a scope and needs no KEL delegation: "Delegated AIDs should work without there being an ACDC." ([chapter 03, section 8](#03-delegation-trait-rulings), R-013), and the reverse holds in practice. The Utah SEDI fixture's "delegation chain" uses plain `incept` throughout and joins credentials by `I2I` edges ([chapter 05, section 11](#05-utah-delegation-chain)), and Bakobo's GCD schema treats KEL delegation as an exemplar of delegated authority, not a precondition ([chapter 05, section 11](#05-gcd)).

### Where the two meet {#13-delegation-composition}

- `DI2I` lets the near Issuer be the far Issuee or any AID delegated from it, at any depth, bounded by inception-time traits rather than the operator ([chapter 05, section 5](#05-di2i-depth)). keripy at `80f77b73b` fails `DI2I` closed. [proposal], [code]
- `DND` limits authority by construction: "a delegate configured never to sub-delegate produces no sub-delegation any verifier will honor" (sda.md > 7. Open loop, not closed, L121). keripy drops the forbidden event in key-state validation ([chapter 03, section 8](#03-delegation-enforcement)). [spec], [code]
- `DID` asserts delegator and delegate are one controller, so reputation can cross; what a relying party does with that is left to it and its governance ([chapter 03, section 8](#03-did-effect-unspecified)). [spec], with the consequence [proposal]

A design that says "delegation" must say which. One relying on KEL delegation for scope finds no scope in the KEL; one relying on an ACDC chain for the joint-compromise property does not get it, because an ACDC's Issuee can be any AID.

## 3. Lossless trust transfer, and the attack it is meant to remove {#13-trust-domains}

[architect] The EVAC deck sets "perpetual identity → perpetual issuances → lossless trust transfer (KERI Suite)" against "ephemeral identity → ephemeral issuances → lossy trust transfer (DNS/CA, OAuth/OIDC)" (EVAC deck, p4), concluding "ACDC lossless conveyor of trust → bridging ephemeral trust domains" (p4). Intermediaries disappear because "With KERI, each AID controller is its own identity provider" (EVAC deck, p5).

### Recursive privilege escalation {#13-rpea}

[architect] The deck says ACDC bridging "eliminates" the recursive privilege escalation attack (RPEA) (EVAC deck, p4). The argument is spoken: systems that cannot bridge trust domains enlarge them, "And that means now that you can do recursive privilege escalation" (KERIConf26 caption, Samuel Smith, The Future of KERI, 03:39). The idea predates the name: "Any mechanism that allows for lower priviledged users to access a network layer provides an attack vector for that user to elevate their priviledges" (ManyCubed.md > The Many-to-Many-to-Many Problem > Security, L26). No written source defines RPEA formally, so treat it as Sam's name for a class of attack, not a threat model with a stated adversary. The word "eliminates" is an assessment: mutual authentication at every edge removes the foothold only where every hop verifies, and a deployment that verifies at the boundary and trusts inside has the old perimeter back ([chapter 07, section 5.1](#07-authn-before-authz)).

### Legacy servers may stay, on one condition {#13-legacy-condition}

[architect], caption only. Sam tolerates OAuth inside its own domain: "You got to have an OAuth server. Fine, Leave it in there. But don't use it to expand its trust domain." (KERIConf26 caption, Samuel Smith, The Future of KERI, 06:37), with the bridging done in KERI and ACDCs (06:43). No written source carries this conditional tolerance. It is the test [section 11](#13-applied-patterns) applies to the OAuth bridge, and the reading this chapter gives the categorical rejection of tokens in [chapter 07, section 5.2](#07-bearer-tokens): what is rejected is the bearer secret and the identity provider as root of trust, not every component called a token server.

## 4. EVAC: edge verifiable access control {#13-evac}

### The rule and the mechanism {#13-evac-rule}

[proposal] "Authorization to access a resource is granted by the resource's controller (authority)" (EVAC deck, p6), any Issuer in the graph may be both authority and edge, and "Mutually authenticated edge (accessor) and authority prevent impersonation attacks" (p6). A grant is an ordinary ACDC whose attribute block holds "SAID UUID Issuee AID Registry Resource Map", rows pairing a route with a capability set, and the "Attribute section could convey a policy engine rule set" (EVAC deck, p14). Two registries back it: the Issuer's ordinary blindable registry, published by a Registrar and cached by the verifier's Observer (p15), and the Issuee's usage registry, in which each presentation is anchored (p16). EVAC adds no registry type; it composes the Issuer's state registry of [chapter 05, section 9](#05-registries) with the Issuee usage registry of [chapter 10](#10-asymmetry).

Sam says in the talk that the attribute block's `Registry` field is already in the specification (KERIConf26 caption, Samuel Smith, The Future of KERI, 11:55). That is partly supported: the specification permits an `rd` inside `a`, but because it "may better facilitate contractually protected disclosure of the bulk-issued registry" (ACDC spec > Top-level ACDC Sections > Attribute Section > Attribute Section Variants > Targeted Attribute Section, L326). Its use as an Issuee usage registry is keripy behavior and proposal ([chapter 10, section 7](#10-keripy-verifier)).

### Who enforces {#13-evac-enforcement}

[architect], caption only. Nothing written says how a verifier evaluates a resource map. Asked about least privilege, Sam put enforcement with the verifier or "a policy engine that the verifier asks to enforce it for them." (KERIConf26 caption, Samuel Smith, The Future of KERI, 49:41). Whether that engine is the verifier's own component or an outside service decides which side of [section 5](#13-state-not-verdict)'s line it falls on.

### Where it stands {#13-evac-status}

[proposal] EVAC is in neither ACDC branch and not in keripy at `80f77b73b`. Sam, in August 2026: "I started an EVAC white paper but have yet to publish it." ([keripy conversations > discussion #1550](https://github.com/WebOfTrust/keripy/discussions/1550#discussioncomment-17909785), comment of 2026-08-05).

## 5. Verification-time state: fetching state versus asking for a verdict {#13-state-not-verdict}

### The tension {#13-state-tension}

[chapter 07, section 3.2](#07-status-endpoint) carries as a shibboleth Daniel Hardman's rule: "A registry consulted at verification time is a phone-home in disguise." (sda.md > 7. Open loop, not closed, L119). But revocable authority cannot be honored without reading its state. EVAC's verifier reads two registries (EVAC deck, p15, p16); the ACDC specification puts a registry read at validation, "A validator queries its Observer, not the Registrar, at a point of validation (PoV) for an ACDC." (ACDC spec > Disclosure Mechanisms and Exploitation Protection > TEL Registrars and TEL Observers, L1693); and `sda.md`'s own section 8 relies on "revocation is real-time, so a grant whose justification has lapsed can be ended before its next use" (sda.md > 8. What is settled, and what is open, L129). Read literally, the section 7 sentence forbids what section 8 depends on.

### The resolution {#13-state-resolution}

End-verifiability allows a service to supply what a verifier needs, so long as the verifier checks it; it forbids verification that needs a service's answer rather than its data ([chapter 01, section 4](#01-end-verifiability)). Applied to registries, the distinction has three parts.

#### What comes back: data the verifier checks, or an answer it must believe {#13-what-comes-back}

The phone-home KERI rejects is the one Sam names as the origin of federation: with bare-signature credentials, "the party who is presented with an issuance, no longer verifies the signature directly but asks the issuer to verify on its behalf." (Revocation.md > Proofing Mechanism Tradespace, L76). What comes back is a verdict the relying party can only trust. A TEL read differs in kind, because "Any Validator can cryptographically verify the authoritative state of the transaction by validating the presence of the seal in the associated KEL." (ACDC spec > Transaction event logs (TELs) as ACDC state registries > Validating transaction events, L1946), so the source of the bytes does not matter, as with KELs served by witnesses ([chapter 02, section 9](#02-observer-layer)). For blinded state the verifier recomputes the commitment: keripy rejects a disclosed block that "does not reproduce blid, so it proves nothing about the registry's state" (keripy acdc/regeventing.py, vetBlind, L460 @80f77b73b). [spec], [code]

#### Who learns that verification happened {#13-who-learns}

[spec] Checkable state can still leak: a verifier reading the Issuer's Registrar per presentation tells the Issuer where and when its credential was used. The specification puts the Observer under the verifier's control and syncs it on state change, "not when there is a PoV" (ACDC spec > Disclosure Mechanisms and Exploitation Protection > TEL Registrars and TEL Observers, L1693), which "protects against forced validator-to-issuer correlation of ACDC usage, i.e., no forced phone home validation." (L1693). Bulk updates close the residual timing channel ([chapter 05, section 9](#05-bulk-updates)). A design can fail either test alone: a status service returning a signed yes or no fails the first even if private, and a Registrar queried per presentation fails the second though its answer is verifiable.

#### How fresh the state must be {#13-freshness}

[spec] A cache may lag the Registrar, and the specification answers with policy, not a callback: "a revocation does not go into effect until a specified date and time after the state update." (ACDC spec > Disclosure Mechanisms and Exploitation Protection > TEL Registrars and TEL Observers, L1695). A verifier whose Observer syncs within the grace period sees every revocation before it takes effect. That is an assumption about synchronization latency, set by policy and proven by nothing; a verifier that cannot meet it must treat its cache as stale. It is a dependency on data availability, like every verifier's on KEL events, not on any party's honesty.

#### The rule, restated {#13-state-rule}

Verification may read state at verification time, from any source including its own cache, provided the verifier checks that state against key state itself and the read does not disclose the point of validation to the Issuer. It may never accept a service's answer in place of that check. This chapter reads `sda.md`'s sentence as aimed at the second case; its literal wording also forbids the first, and is stricter than KERI's registry design and than `sda.md`'s own section 8.

### Applying the rule {#13-state-applications}

Both EVAC registry reads pass, if both go through the verifier's Observer and are verified against the relevant KEL. The Issuee's usage registry is harder, since keripy at `80f77b73b` does not retrieve a foreign registry at all ([chapter 10, Status](#10-status)). [proposal]

An EVAC policy engine the verifier runs, on rules it can read, is the verifier deciding. An outside engine returning permit or deny is a verdict service, and passes only if its rule set is published and its result reproducible, which is `sda.md`'s open-loop condition: "any two verifiers compute the same gate from the same credential" (sda.md > 7. Open loop, not closed, L117). [proposal]

An OAuth resource server that validates a token by introspection is receiving a verdict; whether the healthKERI bridge works that way is open ([section 11](#13-healthkeri-reading)). Cole Davis's simulated smart lock illustrates the permitted case: on a revocation in the lessor's TEL, "the smart lock just walks the cryptographic operations all the way back" (KERIConf26 caption, Cole Davis, Contract Credentials and Verifiable Identity, 19:46); it was simulated, not built on the KERI stack (22:50).

## 6. Broken chains: bound state, reversion, transfer {#13-broken-chains}

### The problem {#13-broken-chain-problem}

"When a delegatee's authority to issue authorizations is revoked, what is the status of any authorizations/entitlements issued before the authority was revoked?" (EVAC deck, p17). Sam names the failure: dynamically revocable issuances "that become zombies if the delegating ACDC is revoked." ([keripy conversations > discussion #1082](https://github.com/WebOfTrust/keripy/discussions/1082#discussioncomment-16688843), comment of 2026-04-23, edited 2026-04-26, R-037). A downstream credential whose issuer lost its authority is still valid on its face, and nobody can revoke it. Three answers follow.

### Bound blinded state: specified {#13-bound-blinded-state}

[spec] The bound blinded attribute block adds `bn` and `bd` to the blinded state a registry update commits to, naming the Issuee's key event (sequence number and SAID) at the update, so a state change is bound to the Issuee's key state as well as the Issuer's. "The purpose of the bound blinded attribute block is to better support chains of authority using delegated chained ACDCs." (ACDC spec > Transaction event logs (TELs) as ACDC state registries > Registry Message Types and Fields > Bound Blinded Attribute Block, L2433; the same on `v1.1` at L2634). It proves a delegate "had an authorization to issue its own delegated ACDCs, which authorization had been issued but not yet been revoked" (L2433) when it anchored its own issuance.

Read from the specification and the deck's diagram (EVAC deck, p18): revoking a delegate's grant records the delegate's key state at revocation. A downstream issuance the delegate anchored between the key event bound at issuance and the one bound at revocation was made while the grant stood; one anchored later was not. The verifier compares positions in one log, the delegate's, which is the as-of-anchor reasoning of [chapter 03, section 11](#03-as-of-anchor) applied across a chain: "Breaking the chain-of-authority while preserving validity of prior valid issuances" (EVAC deck, p18).

Two limits. Sam calls the binding "an assertion by the issuer of issuer's intent." ([keripy conversations > discussion #1566](https://github.com/WebOfTrust/keripy/discussions/1566#discussioncomment-17846317), comment of 2026-07-30, R-039), and it does not make surviving issuances revocable again, so in the talk he ties it to issuances that expire on their own, such as a food handler's permit (KERIConf26 caption, Samuel Smith, The Future of KERI, 40:02, 40:18). And no verifier implements the comparison. keripy at `80f77b73b` defines the structure, "bn = bound issuee key event hex sequence number bnh at time of state update" (keripy core/structing.py, L99 @80f77b73b), carries it as an IPEX proof and checks a block against its BLID, but a search of `src` finds no consumer of the bound fields outside `core/structing.py`; only tests read them. [code], negative by search

### Reversion of authority: proposed {#13-reversion}

[proposal] Reversion makes the zombies revocable by returning their registries to the delegator: "when the ACDC of the delegatee is revoked, authority over any down stream ACDC state reverts to the delegator (State)." ([keripy conversations > discussion #1082](https://github.com/WebOfTrust/keripy/discussions/1082#discussioncomment-16688843), comment of 2026-04-23, R-037), and the existing edge from delegate's grant to delegator's lets "a verifier can cryptographically verify and trace the reversion of authority triggered by a revocation." (same). In the talk it climbs any number of levels (KERIConf26 caption, Samuel Smith, The Future of KERI, 25:10), and "it's not written up in the spec but this is an easy modification of the spec" (22:27); the ease is his estimate. Neither ACDC branch nor keripy has it. Unspecified: which signatures a verifier accepts on a reverted registry's later updates, how it finds the triggering revocation, and what happens when the delegator is itself revoked. The deck's diagram (EVAC deck, p19) binds later updates to the delegator's key state, which suggests the first answer; no written rule says so.

### Registry transfer: approved, not specified {#13-transfer}

[proposal] Transfer hands a registry to a new controller: "Replace the controller of registry without reverting the authority to delegator" (EVAC deck, p20). The event's names (`rxr`, then `xfr`), its double anchoring and its approval for ACDC v1.1 are in [chapter 05, section 9](#05-registry-transfer); neither branch has it, nor does keripy. In the talk, transfer is issued after reversion, by the authority control reverted to (KERIConf26 caption, Samuel Smith, The Future of KERI, 27:26), and Sam bounded it: "This is reversion for a hierarchy of authorizations and delegation, not a replacement for asset transfer." (38:46).

#### A written source that overstates the status {#13-transfer-drift}

Sam's June 2026 revocation paper says registry control "can be transferred via a transfer event in the registry." (Revocation.md > Proofing Mechanism Tradespace > Proofing Applied to Revocation Registries, L118). The registry event tables on both branches list `rip`, `bup` and `upd` and nothing else. Read the sentence as an informal paper describing a planned event in the present tense.

## 7. Why authority must be revocable, and anchored {#13-revocation-doctrine}

[proposal] Sam's revocation white paper (self-versioned V0.4, June 2026) is framed for SEDI, but its argument is about authority, and it explains why the anchoring doctrine of [chapter 05, section 9](#05-key-state-binding) is an authorization requirement.

### Long-lived entitlements must be revocable {#13-must-be-revocable}

"Therefore, with rare exception, if any, as a matter of policy, if not law, all state issuances MUST be revocable." (Revocation.md > Revocability Properties, L35). Short lifetimes do not escape this when reissuance is automatic, because the reissued series is itself a long-lived entitlement (L27). If authority must be revocable, it must be read at verification time, and [section 5](#13-state-not-verdict) is not optional.

### Bare signatures force revocation, and federation followed {#13-signatures-force-revocation}

"when the authenticity proofing mechanism is a bare attached digital signature, all issuances must be revocable, and are forceably revoked whenever the keys are rotated." (Revocation.md > Proofing Mechanism Tradespace, L70). Hiding the constant reissuance behind issuer-side verification "is the driver behind the architecture of federated identity systems such as OAuth/OIDC" (L76), a causal account [chapter 07, section 5.4](#07-federation) lacks. Anchoring removes the cause: "Issuances themselves are not individually signed; a hash of the issuance is anchored in the log." (L94). A delegate's authority anchored this way survives every party's rotations.

### One registry per issuance {#13-registry-per-issuance}

Against bitstring status lists the paper argues governance: a bitstring "encodes the status of all issuances into a single data structure. This co-mingles the governance." (Revocation.md > Proofing Mechanism Tradespace, L106). "ACDCs are not signed; they are bound (anchored) to a registry, which in turn is bound (anchored) to a KEL." (L114). Per-issuance registries are what make reversion and transfer possible per grant; a bulk-issued set revokes all or nothing ([chapter 05, section 9](#05-bulk-revocation), [chapter 07, section 3.4](#07-bulk-copy-revocation)).

### The claims an outsider will contest {#13-contested-revocation-claims}

These are Sam's assessments. "Therefore, unlinkability is largely an exercise in privacy theater." (Revocation.md > Tradespace of Proofing mechanisms, L190), though he keeps it as an adoption requirement in the same paragraph. "So revocation requirements alone obviate one of the main reasons to use anonymous signatures as a proofing mechanism." (L192). Accumulator-based revocation is dismissed without citation: "These have proven to be impractical for performance reasons." (L192). A reviewer may contest these on their merits. The doctrine's position on unlinkability as one tool among several is in [chapter 06, section 4](#06-layered-privacy).

## 8. Group authority: membership, anchoring and joint issuance {#13-group-authority}

[proposal] KERI's group issuance white paper (KAGI, February 2025) supplies three answers.

Membership is private unless declared: "the KEL does not publicize the single-sig member AIDs that contribute to a group multi-sig AID." (KAGI > Background > Group Multi-Sig AID, L61). A group that must disclose its members does so "for the group multi-sig AID to issue an ACDC that discloses its member AIDs at the time of its issuance" (L65), reissuing when membership changes; multisig encodes a decision rule, not membership ([chapter 03, section 7](#03-multisig)).

Anchoring is an access-control cost: "perimeter protection mechanisms now have to walk KELs to look up and find anchors" (KAGI > Background > KEL Sealed (Anchored) Issuances, L183). A design that verifies anchored grants at a load balancer pays that per request unless it caches key state, which KRAM's monotonic caches do ([chapter 09, section 3](#09-full-kram)).

Joint issuance is a threshold root: "Joint issuance is a new concept." (KAGI > Problems and Solutions > Other Options > Joint Issued ACDCs, L281). Each member issues and anchors its own copy, and a validator requires a threshold of identical copies. `sda.md` names it as the root of an authority chain: it "lets a grant be satisfied by a weighted threshold of endorsements, each owner signing from their own identifier, asynchronously and with no shared key." (sda.md > 8. What is settled, and what is open, L127). Whether the Dossier specification makes joint issuance normative was not checked.

## 9. Agents are delegates {#13-agents}

### The doctrine {#13-agents-doctrine}

[architect] The EVAC deck's agentic slide: "Agent has its own AID", "ACDC mechanisms are the same for AI, person, or entity agents." and "Multi-sig enables thresholded group agents" (EVAC deck, p7), retitling the acronym Edge Verifiable Agentic Control. In the talk the agent's identifier is delegated, "You just give the agent an AID, a delegated AID, right?" (KERIConf26 caption, Samuel Smith, The Future of KERI, 41:50), and "The ACDC mechanisms are exactly the same. They don't change." (42:03).

So an AI agent is a delegate in both senses of [section 2](#13-two-delegations): an identifier of its own, typically delegated so its establishment events need the principal's approval, and authority conveyed by a targeted ACDC, scoped, revocable and anchored, with depth limited by `DND` and by the chain of grants (KERIConf26 caption, Samuel Smith, The Future of KERI, 43:12). Nothing in the protocol distinguishes a software agent from a human one. The slide floats a disclosed attribute for the difference, "Maybe regulations should require attributes that indicate the type of agent. (AI vs person)" (EVAC deck, p7), a governance suggestion, not a protocol requirement.

### The same pattern a year earlier {#13-agents-kagi}

[proposal] KAGI proposed delegated agents to spare a multisig group from signing each IPEX stage: "Avoid multi-sig on each stage of IPEX by using a delegated agent" (KAGI > Problems and Solutions > Other Options > Agent Delegated Negotiation, L256). Its safety rule binds the group only through an anchored grant: "Agent-issued `agree` for one side and `grant` for the other are valid only if they include a verifiable reference to a corresponding anchored ACDC." (L257). The driver applies directly to AI agents: "Validation (which includes business logic and cryptographic verification) may be largely automatable, whereas signing requires human intervention." (KAGI > Problems and Solutions > Other Options, L250).

### The word agent already means a delegate in KERIA {#13-keria-agent}

The KERIA cloud agent is a delegated AID whose delegator is the controller's client AID, and it never holds the controller's signing keys ([chapter 03, section 12](#03-two-aid-spine)). That is the shape the AI doctrine proposes, so the custody rule applies to AI agents without amendment ([chapter 07, section 5.3](#07-custodial-cloud)): an AI agent given its principal's keys, or a bearer secret, has been given control, not authority. KERIA's agent relays and stores while an AI agent acts, but the security rule is one.

### Containment by construction {#13-agent-containment}

[proposal] `sda.md` adds a pattern for orchestrators: "Give a powerful orchestrator broad authority to authorize but an empty act surface, and its blast radius on compromise collapses" (sda.md > 5. The relationship the act is performed under, L93). Under KERI, the orchestrator holds grants it may re-issue in attenuated form but none any resource honors directly, so its compromise yields only the power to propose further delegations, each checked. No deployment is known to do this.

### What remains a judgment {#13-agent-judgment}

KERI proves which keys signed, not that the signer meant it ([chapter 07, section 9](#07-signature-authorship)), and for an AI agent the gap between an authorized act and a faithful one is that gap: "Sincerity stays gate-able and auditable, never provable." (sda.md > 8. What is settled, and what is open, L131). The corpus also holds that verification may be automated and reliance may not ([chapter 07, section 9.3](#07-automated-trust)). An AI agent relying on credentials for its principal is automated reliance, and whether a scoped, revocable grant to do so satisfies the rule or breaks it is open.

### The KERI-or-surveillance thesis, as Sam's assessment {#13-surveillance-thesis}

[architect] Sam's AI deck, a list of questions prompted by a Five Eyes statement, contrasts AI-based identity, a "Digital persona derived from the continuous tracking & statistical correlation of one's behavior and biometric expression." (AI deck, p5), with a KERI-based alternative, and asks rather than asserts that there is no middle ground: "Why do you believe there may be no stable middle ground between these two futures?" (AI deck, p18). The revocation paper echoes it: AI and aggregators act "as super correlators to defeat any and all technical attempts at digital anonymity." (Revocation.md > Digital Identity System Goals > Privacy, L172), leaving legal recourse as the remaining protection.

The dichotomy is argued, not demonstrated, and it does not engage the strongest objection, that most deployments will run cryptographic identity for authority plus behavioral fraud detection. Sam once proposed behavioral AI as an authorization input inside one's own infrastructure: "Dynamic policy modification that uses AI to first profile and detect anamalous behavior and then restrict the authorization of that user prevents discovery." (ManyCubed.md > The Many-to-Many-to-Many Problem > Security, L40). Profiling inside one's perimeter is not behavioral identity across society, so this is a boundary the thesis leaves implicit, not a contradiction.

## 10. What a grant should contain: one proposal {#13-grant-shape}

[proposal] KERI carries a grant without saying what it should express; EVAC's resource map is a route plus capabilities. `sda.md` (Daniel Hardman, version 1.2, July 2026) is the one source that models the content of authority, with KERI and ACDC as its identity layer. It is an authored position, not community doctrine, and its author owns this corpus. Its additions over a capability list:

- Acts are located by effect over a kind of state, not by route, so a grant can bound everything a delegate might do. Bakobo's GCD schema implements this grid ([chapter 05, section 11](#05-gcd)). [practice]
- A relationship facet names principal, relationship type, liable party and presented identity, because "Beneficiary, actor, and liable party can be three different parties" (sda.md > 5. The relationship the act is performed under, L89).
- Authority to act is separate from authority to authorize, which yields [section 9](#13-agent-containment)'s containment pattern.
- Open-loop verification forces full disclosure of every constraint, since a stranger "cannot ask the issuer what was meant" (sda.md > 7. Open loop, not closed, L117), so GCD does not support graduated disclosure of its constraints.

### Standing authority {#13-standing-authority}

`sda.md` concedes the common objection to delegation credentials, that a persistent grant "is granted once and weighed against the conditions that held at issuance, not those that hold at the moment an act takes effect." (sda.md > 8. What is settled, and what is open, L129). Its answer is a gate recomputed per act at the execution boundary plus real-time revocation, and it rejects per-act minting of authority as the closed loop in other dress. Termination on completion stays open. This is the strongest framing of why EVAC needs dynamic revocation and why [section 6](#13-broken-chains) matters.

## 11. Applied patterns and bridges {#13-applied-patterns}

[practice], caption only. Every pattern here is a spoken claim at KERIConf26, unchecked against code: evidence of how the doctrine is applied, not of what it requires.

### An ACDC-backed OAuth authorization server {#13-healthkeri-bridge}

Phil Feairheller described healthKERI's authorization server for FHIR, where OAuth is mandated. A client registers by presenting a vLEI through IPEX, its client identifier becomes the credential's SAID, and "there's no client secret. Every token request from here on out is a signed request." (KERIConf26 caption, Phil Feairheller, ACDCs for Authorization, 13:25). A local watcher sidecar tracks key state (22:14), and the server is configured by trusted schemas and root issuers (25:33). A KERI-native gateway found no adopters, so the company is "meeting the customer where they are" (07:27).

#### Reading it against the doctrine {#13-healthkeri-reading}

The bridge removes what [chapter 07, section 5.2](#07-bearer-tokens) objects to, the shared client secret and the identity provider as root of trust, and it meets Sam's condition in [section 3](#13-legacy-condition). It does not settle the downstream side. If the access token it issues is a bearer token honored without further proof, the trust domain behind it still runs on a bearer secret, and if resource servers validate it by introspection they are asking for a verdict ([section 5](#13-state-applications)). The talk does not say which.

### Contract credentials, execution trust, delegated signing {#13-other-patterns}

Cole Davis presented contract credentials: a credential derived from a lease, with a lessee issuing itself an access credential a smart lock verifies, and termination revoking everything downstream (KERIConf26 caption, Cole Davis, Contract Credentials and Verifiable Identity, 14:15). Its normative hook is the specification's "contractual vehicle for conveying authorization" ([section 1](#13-normative-floor)); the demonstration was simulated (22:50). Alan Davies presented execution trust, a verification gate immediately before a high-value action in an existing system (KERIConf26 caption, Alan Davies, ACDCs for Enterprises, 13:13), the same move as `sda.md`'s gate at the execution boundary. Daniel Hardman presented an enterprise credential delegating the right to sign calls to a communications platform (KERIConf26 caption, Daniel Hardman, Open Verifiable Communications, 06:19), with a transit operator failing a call whose chain does not verify (10:02), the conference's one proof-of-concept of chained delegated authority.

### Guardianship {#13-guardianship}

[proposal] Sam's SEDI modeling treats guardianship as a chain of grants. A ward has "a limited set of citizen rights, which rights are held by their parents and must be delegated back to their child" ([keripy conversations > discussion #1550](https://github.com/WebOfTrust/keripy/discussions/1550), body of 2026-07-28, R-072), in diagrams labeled notional and not State of Utah policy. For a parent's control of a child's social-media access he picks the arrangement where the platform accepts authorization only from the parent's AID as "the minimally sufficient means for the parent to have control over the childs access to social media." ([keripy conversations > discussion #1573](https://github.com/WebOfTrust/keripy/discussions/1573#discussioncomment-17935861), comment of 2026-08-07, R-071). Divorce and remand to child services were among his cases for registry transfer ([section 6](#13-transfer)). The custody-from-birth position is in [chapter 06, section 3](#06-sedi-architecture).

## 12. Open questions {#13-open-questions}

1. How a verifier evaluates an EVAC resource map against a request, and in what language a policy rule set in the attribute section is written.
2. How a verifier validates a reverted registry, and whether reversion recurses when the delegator is itself revoked.
3. Which two logs anchor the `xfr` event, and its fields; the deck's `rxr` diagram and its `xfr` bullet differ.
4. Whether any chain-walking verifier will use `bn` and `bd`, and what it does with an issuance anchored at the same key event as the revocation.
5. Whether an OAuth access token minted by an ACDC-backed authorization server is a bearer token downstream, and whether resource servers introspect it.
6. Whether delegating reliance to an AI agent satisfies the rule that reliance is not automated ([section 9](#13-agent-judgment)).
7. How a verifier obtains an Issuee's usage registry it does not already hold, without telling the Issuee or Issuer where verification happened.
8. Whether joint issuance is normative in the Dossier specification.
9. Termination of authority on completion of its purpose, which `sda.md` leaves open.

## Sources {#13-sources}

- ACDC spec — Authentic Chained Data Containers (ACDC) specification, Trust Over IP. trustoverip/kswg-acdc-specification, spec/spec-body.md. `main` @`f0bd097de` (2026-08-28) supports every [spec] claim; `v1.1` @`2362e48a1` (2026-09-11) was checked for the passages named in [section 1](#13-normative-floor) and [section 6](#13-bound-blinded-state), and for the absence of EVAC, reversion, `xfr` and `rxr`. Mined in raw/03 and raw/19.
- AI deck — KERI: The last best hope for individual-controlled digital ID in an AI world, Samuel M. Smith. SmithSamuelM/Papers, presentations/KERI_AI_Cyber_2026.pdf, master @`b47f21597` (2026-08-11), added `b218b5b` (2026-06-29). A list of questions, not a position paper; its answers are spoken. Quoted by page from text extracted to `.ignored/papers-text/`, whose ligatures (fi, ff) are damaged. Mined in raw/19.
- AlphaOmega deck — KERI general overview deck, Samuel M. Smith. SmithSamuelM/Papers, presentations/KERI_AlphaOmega.20250903.pdf, master @`b47f21597`, added `e0b2718` (2025-09-03). Quoted by page from extracted text. Mined in raw/19.
- DAD deck — Authentic Data Supply Chains, DAD architecture, Samuel M. Smith. SmithSamuelM/Papers, presentations/AuthenticDataSupplyChains_DAD_Arch.web.pdf, master @`b47f21597`, last touched `c949ebc` (2022-05-20). Lineage only. Mined in raw/19.
- EVAC deck — ACDCs for Delegable Authorization, Samuel M. Smith, the deck behind the KERIConf26 talk The Future of KERI. SmithSamuelM/Papers, presentations/AuthorizationEVAC.pdf, master @`b47f21597`, added and last touched `3ec04c2` (2026-04-30). Slide text, not specification prose; quoted by page from extracted text with damaged ligatures. Mined in raw/19.
- KAGI — KERI Architectures for Group Issuance, Samuel M. Smith. SmithSamuelM/Papers, whitepapers/KERIArchGroupIssuance.md, master @`b47f21597`, last changed `e8a56a9` (2025-02-05). Only its group-issuance half is used here; its KRAM half is in raw/15. Mined in raw/19.
- KERIConf26 caption — edited auto-captions of the KERI Conference 2026 talks, keri-foundation/CONF26-subtitles, subtitles/*.fixed.srt, read at `006042d39` (2026-10-04). Talks quoted or cited: Samuel Smith, The Future of KERI; Phil Feairheller, ACDCs for Authorization; Cole Davis, Contract Credentials and Verifiable Identity (the caption file's title uses an ampersand); Alan Davies, ACDCs for Enterprises; Daniel Hardman, Open Verifiable Communications. A weak provenance class: near-wording only, quoted only for intent and framing; read raw/14 section 0 before quoting any of it onward. Mined in raw/14 and raw/19.
- keripy — KERI reference implementation, WebOfTrust/keripy, `main` @`80f77b73b` (2026-10-01). Read for this chapter: `src/keri/core/structing.py` (the `BoundState` structure and its properties) and `src/keri/acdc/regeventing.py` (`vetBlind`), plus a `git grep` over `src` and `tests` for consumers of the bound fields. Other [code] claims are linked to the chapters that read them. Mined in raw/09, raw/19 and raw/21.
- keripy conversations — Sam Smith's comments in WebOfTrust/keripy discussions: #1082 (comment of 2026-04-23), #1550 (body of 2026-07-28 and comment of 2026-08-05), #1566 (comment of 2026-07-30), #1573 (comment of 2026-08-07). Read from the 2026-10-14 fetch cached under `.ignored/sam-rulings-cache/`, at their edited text where edited. [proposal] throughout. Mined in raw/21.
- ManyCubed.md — Many Cubed, Samuel M. Smith. SmithSamuelM/Papers, whitepapers/ManyCubed.md, master @`b47f21597`, last changed `667c79b` (2017-07-13). Lineage only. Mined in raw/19.
- Revocation.md — Revocation, Samuel M. Smith, self-versioned V0.4 2026/06/13. SmithSamuelM/Papers, whitepapers/Revocation.md, master @`b47f21597`, last changed `3854b8d` (2026-06-14). States the registry transfer event in the present tense; it is in neither ACDC branch ([section 6](#13-transfer-drift)). Mined in raw/19.
- sda.md — The Shape of Delegated Authority, Daniel Hardman, version 1.2, revised 2026-07-14. dhh1128/papers, sda.md, read at repository `main` @`68a5e2f76` (2026-09-28), file last changed `24c18bb` (2026-07-30). An authored position by the corpus's owner, not community doctrine; on one point ([section 5](#13-state-rule)) its literal wording is stricter than KERI's registry design and than its own section 8. Mined in raw/06 and raw/19.

---

# 14 — Identifiers, Trust Bases and Reputation {#14-identifiers}

## Thesis {#14-thesis}

KERI secures identifiers, not identities, and the order matters. An AID proves who controls it and nothing else: not which person or organization stands behind it, and not whether what that controller says is true. Sam Smith's identifier theory supplies the missing layer. A trust basis is what an identifier's security rests on, and there are three kinds: autonomic (a self-certifying root of trust), algorithmic (a ledger) and administrative (a trusted entity). A trust domain is the set of statements verifiably issued under one AID, and inside it a human-meaningful name can be made secure by an anchored authorization, which turns it into a legitimized identifier (LID) written as the couplet `aid|lid`. Everything an AID cannot prove about its controller is reputation: which entity it belongs to, whether that entity's statements are reliable, whether it is the same entity as another AID. Reputation is measured, contextual behavior; it needs secure attribution before it means anything; and it is what makes an AID worth trusting, because a bare AID is a cheap pseudonym anyone can mint and abandon. Identity assurance is the most widely used form of it.

For a reviewer this separates the questions. Who controls an AID is answered by its key event log, with no authority anywhere. Which entity it belongs to, and whether to rely on what it says, is answered by reputation, which does involve vouching by assurers, by issuers in a credential chain, and by the relying party's judgment. A critique that asks who vouches for an AID's control has imported a prior KERI removed; a design that assumes control settles identity has skipped a layer KERI's own author says is required.

## Status {#14-status}

Almost nothing here is normative. The identifier theory, reputation doctrine, trust-basis taxonomy, LIDs, the PAC trilemma and the cheap-pseudonymity argument are [proposal]: Sam's whitepapers, slide decks and one GitHub discussion. None of these constructs appears in the KERI or ACDC specification at the pins in [Sources](#14-sources), and no keripy code computes or stores reputation. The KERI specification uses "trust basis" twice and applies the authenticity-versus-veracity split once ([section 2](#14-trust-bases), [section 5](#14-two-kinds-of-trust)), and the ACDC specification uses "trust domains" twice in passing; "legitimi", "human-meaningful", "trilemma", "pseudonym", "Zooko" and "identity assurance" are absent from both. Where this chapter says KERI holds something, it means KERI's author argues it, unless a [spec] marker says otherwise.

Slide quotes are headline bullets cited by slide title. Some lineage papers are co-authored, as their Sources entries say. Conference captions are used only for framing, and two are from speakers other than Sam; [architect] marks Sam's spoken words. The did:webs specification is marked [proposal] here, which under-claims a document that is a specification in its own standards track outside the KERI, ACDC and CESR lines. The written statements of cheap pseudonymity and of KERI's choice within the PAC trilemma are recent (discussion #1598 and UIT v1.40), so a revision of either could move this chapter.

## 1. Identifier first, identity second {#14-identifier-first}

Universal Identifier Theory (UIT) opens by choosing its subject: "We use the term identifier system instead of identity system" (UIT > 1.1 Unified Model of Identifiers, p.1 @b47f21597) [proposal]. Identity is defined thinly: "We formally define a (digital) identity to be a (digital) identifier plus attributes." (same) [proposal]. The ordering is a security claim: the model "takes a security-first approach" because "all other properties of an identifier are of little value" unless the identifier is securely controlled (UIT > 1.1 Unified Model of Identifiers, p.2 @b47f21597) [proposal], and UIT's mechanism for control is self-certification (UIT > 1.2 Identifier Control and Trust Basis, p.2-3), the derivation of [chapter 01, section 2](#01-autonomic-identity).

Because an identity is an identifier plus attributes, the attributes, including which real entity the identifier belongs to, can be asserted, contested and accumulated in a layer above key state. KERI's core proves control of an identifier ([chapter 01, section 3](#01-root-of-trust)); the identity that hangs off it is claims. UIT v1.40 also detaches KERI from any namespace: "A given DID may be a type of AID but not all DIDs are AIDs." and "KERI itself is name space agnostic" (UIT > 1.3 Self-Managing Self-Certifying Identifiers (AIDs), p.6 @b47f21597) [proposal]. Its v1.32 predecessor's sentence that "AIDs may be used as a type of DID." (UIT v1.32 > 1.3 Self-Managing Self-Certifying Identifiers (AIDs), p.6 @416b7ac) is not the current position.

## 2. Three trust bases {#14-trust-bases}

"A trust basis binds controllers, identifiers, and key-pairs.", and "A trust domain is the ecosystem of interactions (functions) that rely on a trust basis." (SEDI_Tradeoff deck > slide Trust Basis of a Trust Domain @b47f21597) [proposal]. There are three.

- Autonomic: "root-of-trust in verifiable cryptographic proofs of infrastructure with no shared governance" (same slide) [proposal].
- Algorithmic, a ledger: "root-of-trust in verifiable operational infrastructure with shared governance" (same slide) [proposal].
- Administrative, such as DNS plus certificate authorities: "root-of-trust in non-verifiable operational infrastructure with opaque governance" (same slide) [proposal].

Against ledgers, UIT's objection is portability: "Should the ledger go away, so does the root of trust." and "One may characterize a ledger as a centralized logical construct that is governed in a decentralized manner." (UIT > 1.2 Identifier Control and Trust Basis, p.4 @b47f21597) [proposal]. Against administrative bases it is blunter: "Security may be dependent on something as nebulous as employee morale." (UIT > 1.2 Identifier Control and Trust Basis, p.5) [proposal]. [Chapter 07, section 4.1](#07-global-consensus) and [chapter 07, section 2.5](#07-administrative-bottom) carry the corresponding tells; the taxonomy lets a reviewer name which basis a design has silently adopted.

The KERI specification uses the term without defining it: KERI "provides the trust basis for a universal AIS" (KERI spec > End-verifiable, L89 @fbdd4a615), and "the identifier’s trust basis is not locked to any given witness or set of witnesses" (KERI spec > Advantages, L1840 @fbdd4a615), the portability argument stated for witnesses. The three-way classification is UIT's.

Two refinements matter in review. A concrete interaction is overlaid per identifier, not per protocol, so each party in an exchange has its own trust basis (SEDI_Tradeoff deck > slide Overlay: Protocol Abstraction vs. Concrete Interaction) [proposal], and the weakest basis a decision depends on bounds it. And cross-domain trust is appraisal: "Maximal trust transitivity happens in an interaction when the trust bases of all parties are mutually appraisable" (SEDI_Tradeoff deck > slide Trust Domain Appraisability @b47f21597) [proposal], which the deck poses as a question, not a result.

## 3. The trust domain and the legitimized identifier {#14-trust-domain}

"The trust domain of an AID is the set of statements that may be securely verified as being issued by the controller of that AID" (UIT > 1.3 Self-Managing Self-Certifying Identifiers (AIDs), p.6 @b47f21597) [proposal]. Each statement is checked against the keys authoritative when it was issued ([chapter 03, section 11](#03-as-of-anchor)); UIT calls this the persistent authorization model, under which a statement "signed with the set of authoritative keys at the time of its signing is valid until revoked" (UIT > 4.1 Authorization Models, p.20) [proposal].

A human-meaningful name alone has "no inherent security property of a human-meaningful identifier. This makes them insecure by default." (UIT > 1.4 Legitimized Human Meaningful Identifiers (LIDs), p.6 @b47f21597) [proposal]. An AID's controller, and only that controller, can legitimize a name within its trust domain by a verifiable authorization; the result is a LID, written `aid|lid`, where the bar is the authorization (UIT > 1.4, p.6-7) [proposal]. The AID supplies the security and the LID the meaning.

UIT offers the couplet as its resolution of Zooko's triangle. Global scarcity disappears because "Scarcity only occurs within the trust domain of each AID but is completely managed by the controller of that trust domain (AID)." (UIT > 1.4, p.7) [proposal]. UIT faults ledger-based resolutions because there "not one identifier but a combination of identifiers is needed to solve the trilemma" (UIT > 1.1 Unified Model of Identifiers, p.2), yet the couplet is itself a combination. The claim therefore amounts to saying that a combination is principled when the joining element is a verifiable authorization in a self-certifying trust domain and unprincipled when it is a registration on someone else's ledger. That is Sam's argument, with no outside assessment in the corpus.

### 3.1 Primary, secondary and tertiary identifiers {#14-identifier-classes}

AIDs are primary. "Secondary identifiers are LIDs and are not self-certifying but are secured under the aegis of an associated primary identifier's trust domain." Everything else is tertiary: "tertiary identifiers are unsecured and may only be used internally or where security is unimportant" (UIT > 1.4 Legitimized Human Meaningful Identifiers (LIDs), p.7 @b47f21597) [proposal]. A secondary identifier appears with its primary or where the primary is known. The class predates KERI — the 2016 alias "is a human friendly globally unique string of text that may be associated with an identity in addition to its primary cryptonym" and "It is a secondary identifier." (ISE > Aliases, p.4 @b47f21597) [proposal] — but UIT added the security condition: a secondary identifier is secure only when an AID's controller has authorized it.

### 3.2 LIDs in practice {#14-lids-in-practice}

"GLEIF's Legal Entity Identifier (LEI) may be viewed as a type of LID" (UIT > 1.7 Examples of LIDs, p.10 @b47f21597) [proposal], legitimized by a GLEIF root AID, and GS1 codes are treated alike (UIT > 1.7, p.11). "Usually, the issuance of an LID uses an administrative trust basis." (UIT > 1.7, p.10) [proposal]. The couplet secures the binding of the name to the issuing AID, not the issuer's vetting; what changes is that the vetting's output is anchored, attributable and checkable without a callback ([chapter 06, section 2](#06-arbitration)).

did:webs is the cleanest working instance [proposal]: the controller "MUST authorize the full `did:webs` identifier as a designated alias ACDC anchored to the KERI AID" (did:webs spec > Create, L287 @2d84ef2b0), and the example rule text states the LID's boundary exactly: "It does not assert that the controller of this AID has control over the infrastructure or anything else related to the namespace" (did:webs spec > Full Example, L1565 @2d84ef2b0). [Chapter 06, section 5](#06-did-webs) owns the method.

### 3.3 A LID is not an alias {#14-lid-not-alias}

[Chapter 07, section 9.4](#07-aliases) says an alias is a memory aid, not evidence, and only AIDs may drive logic. In UIT's terms that is the rule for tertiary identifiers. A LID is a name made verifiable by an anchored authorization from a known AID. Two errors follow: reading the alias rule as forbidding LIDs, and so rejecting a did:webs host name or verifiable LEI as a petname; and treating a bare alias as a LID, and so keying logic on a name nobody legitimized. The test is whether a verifiable authorization from an identified AID binds the name. If it does, logic may key on the couplet; if not, the name is tertiary. Even a LID inherits only the security of its binding, not the reputation of its name: a LID legitimized by an AID nobody recognizes is a secure name in a domain nobody trusts.

## 4. Establishing a root AID by well-known reputational association {#14-well-known-association}

Every chain of trust starts at a root AID, which is unique but random, so nothing about it says whose it is. "The process that establishes an AID as the root identifier with an organization may be called a well-known reputational association." Its security condition is social: "Once this connection between root AID and organization becomes common knowledge, then it is secure." (UIT > 1.6 Root AID Establishment via Well Known Reputational Association, p.9 @b47f21597) [proposal]. The mechanism is redundancy across channels the entity controls or that already know it, such as RFC 8615 `/.well-known/` paths or registrations with vetting bodies: "The strength of the well-known establishment is multiplied by the number of such associations, i.e., it provides a reputational source of trust." (UIT > 1.6, p.9) [proposal]. "Consistent common knowledge is the root of reputational trust" (UIT > 1.6, p.10) [proposal]. Once the root is established, every further link is a signed statement under its keys, so the reputational step happens once.

This is the conceptual ancestor of the KERI specification's OOBI-with-MFA pattern ([chapter 06, section 2](#06-oobi-mfa-arbitration)), which bounds itself as UIT does not: the pattern "does not change the trust model of an OOBI", and it "governs only whether the recipient is willing to bootstrap from the OOBIs at all" (KERI spec > OOBI with MFA, L2838 @fbdd4a615) [spec].

### The tension with the OOBI shibboleth {#14-well-known-tension}

UIT says an association's strength is multiplied by the number of well-knowns; [chapter 07, section 2.6](#07-multiple-well-knowns) says publishing an AID at several well-knowns does not strengthen the AID binding, and names as the tell "any sentence in which the count of well-knowns appears as an input to an authenticity judgment". Both are right, about different bindings. The binding between an AID and its keys and endpoints is cryptographic, OOBI resolution verifies it, and no number of well-knowns improves it. The binding between an AID and an entity — whether this is the AID GLEIF or the State of Utah actually uses — cannot be established by cryptography at all, because an entity is not a key; it is a reputational fact, and redundancy across independent channels is how reputational facts become credible. So the count of well-knowns is never an input to an authenticity judgment about key state and is a legitimate input to a reputational judgment about which entity an AID belongs to. This chapter's synthesis: a reviewer meeting a root-AID bootstrap should ask which binding each step establishes, and expect the reputational step to be explicit, redundant and done once.

## 5. Two kinds of trust, and the order between them {#14-two-kinds-of-trust}

UIT's first kind of trust is in the cryptographic root: who said something, and whether they were consistent. "But we may not trust in the veracity of what was said. For this, we need the second type of trust." (UIT > 1.5 Reputational Trust, p.8 @b47f21597) [proposal]. That second kind is reputational: "Reputation is a measure of accumulated consistent behavior." (same). This is the authenticity-versus-veracity split of [chapter 06, section 1](#06-authenticity-veracity), in an earlier written form.

UIT adds an order: "First, authenticity (AID), and then veracity (LID)." (UIT > 1.5, p.8) [proposal]. Reputation needs provably consistent attribution, so "Provable trust in the AID mechanism enables provable trust in the entity behind the LID mechanism." (UIT > 1.5, p.9) [proposal]. Hardman calls the axes orthogonal and UIT makes the second depend on the first, and these are compatible: the judgments are independent, since an authentic statement may be false, while a veracity judgment is useful only if the statement is attributable. Cite Hardman for the analysis and UIT for the dependency. UIT's "veracity (LID)" is shorthand for the reliability of the legitimizing authority, since "we rely on the reputational integrity of the controller to trust that a given LID has been authorized correctly" (UIT > 1.5, p.9) [proposal].

The KERI specification draws the split once, about certificate authorities: a CA certificate "merely provides evidence of the authenticity of the assignment of the mapping but not evidence of the veracity of the mapping" (KERI spec > Overcoming existing security overlay flaws, L81 @fbdd4a615) [spec]. did:webs defines "the term decentralized trust includes verifiability, confidentiality, and privacy, but excludes veracity of the content." (did:webs spec > Introduction, L81-82 @2d84ef2b0) [proposal], and assigns veracity to "(personal) evaluation of available reputational data and verifiable credentials (VCs)" (same, L83-84): what decentralized trust cannot reach, reputation must.

## 6. What reputation is {#14-reputation-defined}

The definition has held for a decade: reputation is "A considered evaluation (measure) of past behavior used to predict future behavior." and "Confidence improves with contextual similarity." (AR_ACDC_Rep deck > slide Reputation @b47f21597; the 2017 deck has the same lines) [proposal]. The 2025 form is "Reputation is a behavior-based contextual predictor that enables an interaction." (SEDI_Tradeoff deck > slide Reputable Authenticatable Pseudonymity (RAP) @b47f21597) [proposal]. Reputation is about behavior, it predicts, and it is bounded by context; "Contextual predictors are more powerful", "Behavior based predictors are more credible", and "Transitive predictors are more portable" (AR_ACDC_Rep deck > slide What is reputation AI?) [proposal].

### 6.1 Reputes, not ratings {#14-reputes-not-ratings}

Reputation is computed from recorded behavior, not from scores: "Instances of behavior = reputational events or reputes for short" (AR_ACDC_Rep deck > slide Computational reputation @b47f21597) [proposal], and "Reputation from reputed behavior allows for re-scoping, re-weighting, re-combination, and re-evaluation of collected reputes (not so for ratings)" (same slide). A rating has collapsed evidence into one judgment in one context; a record of behavior can be re-read for a new one. It is the same preference for evidence over verdicts that makes a watcher report duplicity rather than distrust an identifier ([chapter 07, section 8.2](#07-watcher-enforcement)).

### 6.2 Reputation is not a set of credentials {#14-not-credentials}

"Reputation is not a set of verifiable claims but a set of verifiable claims can contribute to a reputation" (ReputationIIW2017 deck > slide Issues @b47f21597) [proposal]. A credential is an issuer's attributable assertion; a reputation is a relying party's evaluation, which may count that assertion as one input, weighted by the issuer's reputation and the closeness of contexts. That keeps reputation on the relying party's side and keeps a credential from being read as a verdict.

### 6.3 Why reputation is the motive {#14-reputation-motive}

On its author's account reputation is the reason the program exists [proposal]: "decentralized identity is essential to decentralized reputation which is essential to decentralized 2 sided networks." (IdentityAndReputation.md, paragraph 2 @b47f21597). The economics follow: "Curation is applied reputation" and "Portable Reputation is a potential meta-platform" (AR_ACDC_Rep deck > slides Curation and Meta-platform) [proposal]. The founding sentence keri.one carries first appears in a 2019 co-authored paper: "a reputation is meaningless without an underlying identity and an identity is valueless without a credible reputation." (CooperationBeatsAggregation.md > Identity and reputation systems as trust brokerages, L132 @b47f21597) [proposal], and such a system "enables trust to be transitive between contexts to some degree" (same, L136).

This explains what looks like a privacy concession. If identity exists so that behavior can accumulate into reputation, persistence across rotation is the point, since an identifier that dies with its first key cannot accumulate anything. Within a context, "the secure attributability of an AID, together with its perfect correlatability, enables secure reputational trust (good or bad) in that AID" (SEDI_Tradeoff deck > slide Relationship Properties @b47f21597) [proposal]. Correlatability inside a context is the feature; across contexts it is the hazard, where the PAC trade of [section 9](#14-pac-trilemma) begins.

## 7. Reputation by reference and by behavior {#14-reference-and-behavior}

The 2026 talks named two routes. Phil Windley called the first reputation by reference, "essentially how we bootstrap things" (KERIConf26 caption, Phil Windley, Digital Identity Needs a Legal Foundation, 23:02), as when a diploma chains through a university to its accreditors and the state; the second is reputation by behavior, accumulated from direct interaction. Sam lists "reputation by reference" among UIT's contributions (KERIConf26 caption, Samuel Smith, State of the KERI Suite, 30:30) [architect], though UIT describes the mechanism, a chain of authorizations from a well-known root, without the name. In his older vocabulary, by-behavior is direct reputing and by-reference is intermediated, with a "Reputery = Indirect Source (Implied Reputer) or Intermediate Source" between the behavior and the relying party (ReputationIIW2017 deck > slide Indirect and intermediated reputing @b47f21597) [proposal]. Asked whether reputation by reference is not also accumulated behavior, the answer in Windley's Q&A was "It is!, but it's at a distance." The difference is whom the relying party trusts: "In reputation you explicitly trust the reputer." (KERIConf26 caption, Phil Windley, Digital Identity Needs a Legal Foundation, 27:09 and 28:09; speaker unattributed). By reference, the relying party trusts the reputer's observation; by behavior, only its own.

### 7.1 ACDC chains as the carrier {#14-acdc-carrier}

The SEDI deck names ACDC chaining as the carrier for reputation by reference: "Verifiable reputation via ACDC chained evidence dossiers" and "Multiple roots-of-trust for reputation" (SEDI_Tradeoff deck > slide Unique features of KERI/ACDC that require Issuer linkability @b47f21597) [proposal]. Each edge is an issuer's attributable statement, and a relying party walks the chain to roots whose reputations it already holds ([chapter 05, section 5](#05-edges)), weighing each of several roots by its own reputation, which repeats [section 4](#14-well-known-association) at every root.

No specification or implementation defines a reputation computation over ACDC chains, a repute schema, or reputation by behavior as credentials. Windley's suggestion that receipts become credentials for scoring markets is a talk. Sam's 2022 deck Automated Reasoning and ACDCs contains the 2016-2018 reputation material and reasoning slides, with no slide showing an ACDC as reputation input (AR_ACDC_Rep deck, read in full, `raw/20` section 2.7); it shows that Sam linked ACDCs to reputation, not a design.

### 7.2 Transitivity across a delegation {#14-delegation-transitivity}

The one place the theory reaches the protocol is the `DID` trait. Sam says it exists "to formally signal that the controller of the delegated AID is identical to the controller of the delegating AID" (keripy GitHub > discussion #1598, body of 2026-08-09, R-016, https://github.com/WebOfTrust/keripy/discussions/1598) [proposal], so that "any reputation earned by the delegator is also imbued in the delegatee", and misbehavior reflects back, and that it is needed "because not all delegated AIDs have the same legal controlling entity as their delegator AID." (same). [Chapter 03, section 8](#03-delegation-trait-rulings) carries the rulings and specification history, and [chapter 07, section 8.4](#07-did-trait) the tell that reads `DID` as transitive endorsement.

What this chapter adds is the reason. `DID` is a statement about the second binding of [section 4](#14-well-known-association), AID to entity, made by the controller and countersigned by the delegator's anchoring seal. It transfers reputation because reputation attaches to entities, and it does not transfer authority, which is why it does not propagate to further delegations and why the specification states no validator consequence ([chapter 03, section 8](#03-did-effect-unspecified)). Reputation is the relying party's to compute, so the protocol carries the assertion and stops. An entity splits itself across delegated AIDs because "One way to avoid common mode sources of systemic failure is to use multivalent key management infrastructure." (keripy GitHub > discussion #1598) [proposal], which UIT develops for an organization's root AID (UIT > 5 Multi-valent Key Management Infrastructure for an Entity, p.23 @b47f21597) [proposal].

## 8. Cheap pseudonymity and identity assurance {#14-cheap-pseudonymity}

An AID is self-certifying, which is its strength, and anyone can make one, which is its weakness. AIDs "are just cheap cryptographic pseudonyms (cryptonyms) for the controlling entity that holds the private keys the control the AID." (keripy GitHub > discussion #1598, body of 2026-08-09, https://github.com/WebOfTrust/keripy/discussions/1598; "the control" is the source's typing) [proposal], so "an AID is not very useful for real world interactions between controllers unless a given AID is no longer cheap." (same). Sam said the same at the conference: identity assurance "solves one problem. It's called the cheap pseudonymity problem", because "nobody can trust an AID that anybody can create." (KERIConf26 caption, Samuel Smith, The Digital Identity Tradespace, 36:15 and 36:37) [architect]. The remedy is cost: "And for reputation to be useful and meaningful it must be costly." (keripy GitHub > discussion #1598) [proposal]. Abandoning a costly cryptonym abandons its reputation.

This is why KERI's control guarantee is necessary and not sufficient. Self-certification removes every authority from the question of control ([chapter 01, section 3](#01-root-of-trust)) but not the cost of the question of trust, and a design that trusts a freshly incepted AID because its log verifies has confused the two. This chapter's synthesis: the reflex that nobody vouches for the identifier is correct for control and wrong for trust.

### 8.1 Identity assurance as costly reputation {#14-assurance-as-reputation}

"One type of costly reputation is identity assurance." The controller discloses its legal identity to a prover, and "The prover issues a perpetually verifiable assertion that binds the AID to that real identity. That AID now is not cheap." (keripy GitHub > discussion #1598) [proposal]. Sam ranks it first because "identity assurance is the form of reputation most widely used in our society" (same). Persistence is what makes the cost worth paying: assurance is "amortized over the lifespan of unbounded term (persistence) AIDs" (SEDI_Tradeoff deck > slide Unique features of KERI/ACDC that require Issuer linkability @b47f21597) [proposal], so a rotation-surviving identifier is proofed once. [Chapter 06, section 3](#06-sedi-architecture) owns SEDI's use of it.

### 8.2 Assurance as accumulated weak bindings {#14-weak-bindings}

The SEDI deck shows several assurers, each asserting a weak binding between a person and an AID's controller: "Relatively weak binding reinforced by multiple bindings = reputation" (SEDI_Tradeoff deck > slide Identity Assurance and Reputation @b47f21597) [proposal]. It is [section 4](#14-well-known-association) applied to people: no single proofing act is strong, and independence across assurers is what makes the binding credible. The binding of an AID to a person is therefore never cryptographic, however strong the AID; its strength is bounded by the assurers' reputations and independence, and an assurance credential is authentic while its veracity is its assurer's reputation. Out-of-band authentication at relationship setup "also provides protection from cheap pseudonymity" (SEDI_Tradeoff deck > slide OOB Setup) [proposal], and a relationship "sufficiently authenticated and is therefore reputable (not cheap) can be used to issue the equivalent of a letter of introduction" (SEDI_Tradeoff deck > slide Relationship Formation Sub-Protocol) [proposal]: reputation by reference for one relationship. [Chapter 12, section 5](#12-contexts) owns that protocol.

### 8.3 Reputable pseudonymity {#14-rap}

Cost need not mean a legal name: "RAP = Trust based on contextual behavior that is securely cryptonymously attributable but without linkage to an actual person or legal entity." (SEDI_Tradeoff deck > slide Reputable Authenticatable Pseudonymity (RAP) @b47f21597) [proposal]. Its limit is on the same slide: "there is no practical pseudonymity without strong counterincentives for 2nd parties to share contextual behavior data." (same). A pseudonym survives only if those who see its behavior are deterred from linking it, which puts the burden on the contractual layer of [chapter 06, section 4](#06-layered-privacy). In the 2026 talks RAP grows into RAP-C3, Sam's one-line summary of KERI (KERIConf26 caption, Samuel Smith, The Digital Identity Tradespace, 03:20) [architect]; the letter the deck expands as "authenticatable" is read as "autonomic" in the talk summaries (`raw/20` section 2.5), and the two should not be normalized.

## 9. The PAC trilemma {#14-pac-trilemma}

UIT states a trilemma for identifier system security overlays: privacy, authenticity and confidentiality, at most two at the highest degree. "One must make a trade. This is a trilemma for identifier system security overlays." (UIT > 1.8 Identifier System Security Overlay Properties, p.12 @b47f21597) [proposal]. No single cryptographic operation provides all three: non-repudiable signatures give the strongest authenticity and are correlation points, while Diffie-Hellman gives confidentiality without non-repudiation (same). KERI chooses authenticity and confidentiality, "because this best protects all participants from impersonation fraud." (same) [proposal]; v1.32 named only authenticity, and the choice of confidentiality is v1.40's (UIT v1.32 > 1.8 Identifier System Security Overlay Properties, p.11 @416b7ac). The SEDI deck calls it a theorem, "An interaction between two parties may be two of the three, private, authentic, and confidential at the highest degree" (SEDI_Tradeoff deck > slide PAC Theorem — Trilemma @b47f21597) [proposal], but the corpus holds no proof and no outside assessment; it is a design heuristic stated by its author.

The trilemma is the reason KERI's core "does not promise unlinkability, and cannot" ([chapter 06, section 4](#06-layered-privacy)): its bottom layer is non-repudiable signatures. The privacy KERI offers is layered above them ([chapter 06, section 4](#06-decorrelation)), and the stated goal is "not unlinkability, but rather unexploitability through the strongest security." (SEDI_Tradeoff deck > slide KERI's Paradigm Shift: Security First) [proposal]. That is why reputation is compatible with privacy at all: it needs correlation within a context, and the harm is exploitation across contexts. [Chapter 12, section 1](#12-trade-space) owns the trade space.

## 10. Load-bearing assumptions and conceded weaknesses {#14-conceded-weaknesses}

### 10.1 Established {#14-established}

Within the limits of [Status](#14-status), these are stable across a decade of Sam's writing and consistent with the specifications where they speak: KERI secures control of identifiers, and identity is identifier plus attributes, which are claims; authenticity and veracity are different judgments, a distinction the KERI specification applies to certificate authorities; reputation is a relying party's contextual evaluation of attributable behavior, neither credential nor rating; and a human-meaningful name is secure only as a secondary identifier legitimized in an AID's trust domain, which did:webs implements.

### 10.2 Contested, unbuilt or unverified {#14-contested}

- No reputation mechanism is specified or implemented; a design relying on a reputation layer relies on theory and on each relying party's own logic.
- Identity assurance is not cryptographic ([section 8.2](#14-weak-bindings)). A guarantee about an assured AID inherits the assurers' assumptions as well as KERI's ([chapter 02, section 6](#02-assumptions)).
- Root-AID establishment rests on common knowledge, which no protocol supplies. Before an AID is well known, an attacker who publishes a different AID first or more widely can win the reputational race, and nothing says how a relying party knows the "once" of [section 4](#14-well-known-association) has arrived.
- The `aid|lid` resolution of Zooko's triangle has no outside assessment, and standards-body LIDs are usually issued on an administrative basis, so the couplet secures their binding, not their vetting ([section 3](#14-trust-domain)).
- The PAC trilemma is stated without proof, and the confidentiality half of KERI's choice is carried by protocols outside the KERI specification ([section 9](#14-pac-trilemma)).
- Reputable pseudonymity is conditional on deterrence the protocol cannot supply ([section 8.3](#14-rap)).
- `DID` carries an entity-equivalence assertion with no specified consequence, and no governance framework read for this corpus consumes it, so reputation's transitivity across delegation is an intent with no consumer ([section 7.2](#14-delegation-transitivity)).
- Unread sources: the captions of Sam's Tradespace talk stop at 37:02, as he begins a GLEIF analogy for identity assurance; the 2015 Open Reputation papers the decks cite were read for title pages only (`raw/20` section 7.2); and UIT v1.40 drops, unexplained, a v1.32 sentence about a delegator replacing a delegate's identifier prefix (`raw/20` section 1.8), on which this chapter does not rely.

### 10.3 Where KERI corrects the outsider's prior {#14-outsider-priors}

Asking who vouches for an AID is the right question about the entity behind it and the wrong one about its control; KERI answers the second with a log and leaves the first to reputation ([section 8](#14-cheap-pseudonymity)). Treating a credential as a reputation collapses an issuer's assertion into a relying party's evaluation ([section 6.2](#14-not-credentials)). Equating privacy with unlinkability measures KERI against a property its author argues no system can have together with strong authenticity, and against a harm, linkage, that the KERI side replaces with exploitation ([section 9](#14-pac-trilemma)). A reviewer may contest that argument, but may not measure KERI against a goal it explicitly declines.

## Sources {#14-sources}

- ACDC spec — Authentic Chained Data Containers (ACDC) specification, Trust Over IP. trustoverip/kswg-acdc-specification, spec/spec-body.md, main @`f0bd097de` (2026-08-28). Used only for negative results: the terms listed in [Status](#14-status) are absent, and "trust domains" appears twice in passing (L95, L1068). Mined in raw/03 and raw/20.
- AR_ACDC_Rep deck — Automated Reasoning and ACDCs: Secure Decentralized Reputation Algorithms, Samuel M. Smith (2022-05-10). SmithSamuelM/Papers, presentations/AR_ACDC_Rep.web.pdf, master @`b47f21597` (2026-08-11), read through extracted text and cited by slide title. Mined in raw/20.
- CooperationBeatsAggregation.md — Decentralized Identity as a Meta-platform: How Cooperation Beats Aggregation, v1.6 (2019-11-19), Shea, Smith and Stöcker, with Caballero as editor, RWOT9. SmithSamuelM/Papers, whitepapers/CooperationBeatsAggregation.md, master @`b47f21597`. Co-authored; its sentences are not Sam's alone. Mined in raw/20.
- did:webs spec — The did:webs DID Method Specification, v0.10.3, Trust Over IP KERI Suite Working Group. trustoverip/kswg-did-method-webs-specification, spec/header.md and spec/body.md, main @`2d84ef2b0` (2026-08-11). Its own standards track, marked [proposal] here following raw/20 section 6, which under-claims it. Only its framing, L287 and the L1565 example rule text were read for this chapter. Mined in raw/20.
- IdentityAndReputation.md — Decentralized Identity and Reputation, Samuel M. Smith (2018). SmithSamuelM/Papers, whitepapers/IdentityAndReputation.md, master @`b47f21597`. Mined in raw/20.
- ISE — Identity System Essentials, Samuel M. Smith and Dmitry Khovratovich, Evernym (2016-03-29). SmithSamuelM/Papers, whitepapers/Identity-System-Essentials.pdf, master @`b47f21597`, read through extracted text. Co-authored and pre-KERI, with security resting on ledgers, a position KERI reversed; cited only for the alias as a secondary identifier. Mined in raw/20.
- KERI spec — Key Event Receipt Infrastructure (KERI) specification, Trust Over IP. trustoverip/kswg-keri-specification, spec/spec-body.md, main @`fbdd4a615` (2026-08-28), read by commit: End-verifiable L89, Overcoming existing security overlay flaws L81, Advantages L1840, OOBI with MFA L2838, and the negative results in [Status](#14-status). Mined in raw/01 and raw/20.
- KERIConf26 caption — edited auto-captions of the KERI Conference 2026 talks (Lehi, Utah, 22-23 April 2026), keri-foundation/CONF26-subtitles, subtitles/*.fixed.srt @`006042d39` (2026-10-04): Phil Windley, Digital Identity Needs a Legal Foundation; Samuel Smith, State of the KERI Suite; Samuel Smith, The Digital Identity Tradespace, whose captions end at 37:02. Times are cue starts. Near-wording only, quoted for framing and intent; speakers within the Windley Q&A are not attributed. Mined in raw/14 and raw/20.
- keripy GitHub — Sam Smith's discussion WebOfTrust/keripy #1598, Cheap Pseudonymity, Identity Assurance as Reputation, Multivalent DKMI, and the DID config trait, https://github.com/WebOfTrust/keripy/discussions/1598, body of 2026-08-09, no comments, read from the API cache of 2026-10-14 (`.ignored/sam-rulings-cache/disc/WebOfTrust_keripy_1598.json`). [proposal]. Mined in raw/21.
- ReputationIIW2017 deck — Reputation, Samuel M. Smith, IIW 2017. SmithSamuelM/Papers, presentations/ReputationIIW2017.pdf, master @`b47f21597`, read through extracted text with "fi" ligatures normalized; cited by slide title. Mined in raw/20.
- SEDI_Tradeoff deck — SEDI Policy and Technology Trade Space: Comprehensive Solutions vs. Incremental Solutions, Samuel M. Smith, dated 2025-10-01. SmithSamuelM/Papers, presentations/SEDI_Tradeoff.web.pdf, master @`b47f21597` (last changed `d00f260`, 2025-10-11), read through extracted text and cited by slide title. Mined in raw/20.
- UIT — Universal Identifier Theory, Samuel M. Smith, v1.40 (2025-09-14; original 2020-10-20). SmithSamuelM/Papers, whitepapers/UniversalIdentifierTheory.pdf, master @`b47f21597`, read through extracted text and cited by section and printed page. v1.32 (2020-10-23) was read at Papers @`416b7ac` (whitepapers/IdentifierTheory_web.pdf) only for the differences cited in [section 1](#14-identifier-first) and [section 9](#14-pac-trilemma). Mined in raw/20.
