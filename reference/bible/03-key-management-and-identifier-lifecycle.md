# 03 — Key Management and Identifier Lifecycle {#key-management}

## Thesis {#thesis}

An Autonomic Identifier is not a name that points at a key; it is the head of a signed, append-only history of its own key state. The identifier is derived from its inception event, so it cannot be separated from the key material that first controlled it, and authority moves forward through rotation events chained to a commitment made before the current keys were ever exposed. The structural fact that distinguishes KERI from certificates, tokens and most DID methods is that control authority is split in two. Signing authority, the current keys, does the daily work and is treated as expendable; rotation authority, the next keys published only as a hash, is held offline, and its compromise is the one unrecoverable event in the system. This chapter walks the lifecycle in the order the protocol enforces it, and separates what keripy, KERIA and signify-ts enforce from what prose merely describes, because the gap between them is where defects live.

## Status {#status}

Most of this chapter is [spec] and most code claims are [code], so markers appear only where they do work, chiefly in [section 8](#delegation), where the two KERI specification branches say different things about one config trait. The knowledge-base landmines cited here were observed at a keripy baseline 493 commits behind the current pin; they are discipline to assume, not statements about keripy today.

## 1. The lifecycle in one frame: the KEL and its event types {#kel-event-types}

The Key Event Log (KEL) is "a Verifiable data structure that is a backward and forward chained, signed, append-only log of key events for an AID. The first entry... must be the one and only Inception event." (KERI spec termdefs; also spec-body.md L176) It is chained backward through the prior event's digest (`p`) and forward through the commitment to the next keys' digests (KERI spec, L31, L176). Its five ilks are inception (`icp`), rotation (`rot`), interaction (`ixn`), delegated inception (`dip`) and delegated rotation (`drt`) (KERI spec, L1748). A verifier establishes who controls an AID "by replaying its KEL from inception, not by querying any trusted directory or CA." (keripy-knowledge `00-lens.md` > claim 1)

Key state is what a replay computes: current keys and signing threshold, next-key digests and next threshold, witnesses and witness threshold, and configuration traits, changed only by establishment events (KERI spec termdefs, "Key state"). In keripy it is `Kever` with its persisted `KeyStateRecord`; `Kever.incept` sets keys, thresholds and witnesses "from the event body itself." (keripy `core/eventing.py`, `Kever.incept`, L2323; raw/09 section 1)

## 2. Inception: how an AID is born {#inception}

- Sequence number zero, exactly once. keripy raises on a positive `sn` (keripy `core/eventing.py`, L2335-2336), and "There MUST be only one Establishment event that is an Inception event. All subsequent Establishment events MUST be Rotation events." (KERI spec, L1378) A second sn=0 with a different SAID is escrowed as likely duplicity (keripy-knowledge `30-invariants.md` > B1).
- The identifier is the digest of the inception event. For a self-addressing AID the `d` and `i` fields "MUST have the same value and same derivation code" (KERI spec, L1380-1381). keripy fills `d` with `#` dummy characters, serializes, digests and overwrites (keripy `core/coring.py`, `Saider._derive`, L4058-4096), so "Changing field order/serialization changes the SAID." (keripy-knowledge `30-invariants.md` > B5) The AID is a tamper-evident commitment to the exact bytes that created it.
- The signing threshold cannot exceed the key count: `if len(self.verfers) < self.tholder.size` -> "Invalid sith" (keripy `core/eventing.py`, L2340).
- Configuration traits are fixed at inception. Establishment-Only (`EO`) forbids interaction events, so every event is signed by fresh one-time pre-rotated keys; Do-Not-Delegate (`DND`) makes a validator drop delegated events whose delegator carries it (KERI spec, L377, L379).

The derivation code is the fork in the road. A basic derivation embeds the public key in the prefix (`B`, Ed25519 non-transferable); a self-addressing one uses a digest of the inception event (`E`, Blake3-256) (keripy `core/coring.py`, L244-294). Only prefixive codes may be AIDs: `Prefixer.__init__` raises `InvalidCodeError` outside `PreDex` (keripy `core/coring.py`, `Prefixer.__init__`, L3830-3831). [Chapter 04](04-cesr-and-the-wire.md#code-tables) owns the code tables.

## 3. Transferable versus non-transferable AIDs {#transferability}

"A basic SCID... does not support Rotation... and therefore MUST be abandoned once the controlling private key becomes weakened or compromised." (KERI spec, L107) Changing its key means abandoning the identifier and any reputation attached to it. A transferable AID survives rotation because it is derived from the whole inception event, including the pre-rotation commitment: for transferable AIDs the KEL joins identifier, keys and controller to "persist bindings across rotation," and "The essence of the KERI protocol is a strongly bound tetrad." (KERI spec, L162-182)

### The correction to the outsider prior {#non-transferable-prior}

"Non-transferability in KERI is expressed by an empty next-key commitment (`ncount=0`, `nsith='0'`), not by a special prefix code -- except where a basic non-transferable code like `Ed25519N` legitimately carries the key itself." (keripy-knowledge `31-landmines.md` > L1) keripy enforces it: a non-transferable prefix must have empty next digests, witnesses and anchored data at inception, "Invalid inception next digest list not empty for non-transferable prefix" (keripy `core/eventing.py`, L2352-2355, L2362, L2383), and rotation without a prior commitment raises "Attempted rotation for nontransferable prefix..." (L2650-2653). Rotating a transferable AID to an empty next list abandons it: "no more key events MUST be allowed in its KEL." (KERI spec, L340, L174)

#### The Ed25519N landmine {#ed25519n-landmine}

keripy's `Hab.incept` and `GroupHab.incept` hardcode `code = MtrDex.Ed25519N` for any non-transferable AID whatever the signing-key type (keripy `app/habbing.py`, L2931, L3728), which is wrong for a post-quantum non-transferable AID needing a digest prefix (keripy-knowledge `31-landmines.md` > L1). It blocks nothing today, because keripy at `b8f60166b` has no post-quantum codes (raw/09 section 10 item 3) and the knowledge base's own plan defers that work until two conflicting in-repo Falcon design documents are reconciled (keripy-knowledge `PLAN.md` > 9. Decisions to confirm at approval (not now), @`9489ac9bd`). Treat it as a known defect, not a template, and do not treat the Falcon design question as settled.

#### Witnesses must be non-transferable {#witnesses-non-transferable}

A witness AID "MUST be non-transferable, fully qualified public keys" so that a receipt verifies straight from the AID with no witness KEL (KERI spec, L353, L1252). Treating this as optional is "a characterization error about KERI-as-specified." (keri-security-analysis `background.md` > 2.3 Witness; raw/07 section 6)

## 4. Establishment versus interaction events {#establishment-vs-interaction}

Establishment events (`icp`, `rot`, `dip`, `drt`) establish or change key state; interaction events (`ixn`) anchor data via seals and change none (KERI spec, L1751-1752). Current keys always come from the last establishment event, and any message, including an `ixn`, is authorized only if its signatures satisfy that event's threshold (keripy-knowledge `30-invariants.md` > B4). An `ixn` cannot supersede anything ([section 10](#recovery-rotation)); its job is to bind external data to key state at a point in the sequence, "an indirect signature that persists across key-state change" (KERI spec, L1280). Repeated interaction signing widens the window for a stolen current key but never risks rotation authority; an AID that wants no reuse window declares `EO` (KERI spec, L377).

### The last-establishment-event rule {#last-establishment-rule}

The key state in force at a position in a KEL is the one set by the last establishment event at or before that position, and interleaved interaction events do not move it. In a KEL with interaction traffic the latest event is usually an `ixn`, which establishes nothing, so anything that names which key state a signature is checked against must name the last establishment event. No specification states the rule. keripy and KERIA each corrected a violation of it in September 2026, independently and from opposite ends of the wire: keripy's KRAM gate now compares against `kever.lastEst`, because "Signing keys change only at establishment events, so the key state ref names the last establishment event rather than the last event of any kind." [code] (keripy `core/kraming.py`, module docstring, L70-75 @`b8f60166b`), and KERIA's `endrole` and `locscheme` reply handlers now build their signature groups from `hab.kever.lastEst` [code] (KERIA `src/keria/app/aiding.py`, L1665-1666 and L1766-1767 @`7e685edaa`). KERIA pins keripy's 1.x line, so its fix was not inherited. [Chapter 09](09-kram-and-request-authentication.md) owns the KRAM side; the lesson here is that a rule living only in a docstring can drift unnoticed.

## 5. Pre-rotation: the firewall and the crown jewel {#pre-rotation}

[Chapter 02](02-security-model-and-threat-posture.md#pre-rotation-firewall) owns pre-rotation as security doctrine; this section owns its mechanics.

### What is committed {#what-is-committed}

Every establishment event names the current signing keys in cleartext (`k`) and the next keys only as digests (`n`): "control authority is split between keypairs that hold signing authority and keypairs that hold rotation authority." (KERI spec > Pre-rotation, L1364) "Pre-rotation is the firewall; the next key is the crown jewel." (keripy-knowledge `00-lens.md` > claim 4) The firewall is real only if the next key is held apart: "The next (rotation) key must be managed differently/independently from the current key -- offline, air-gapped, cold storage, different device. This independence is what makes pre-rotation a real firewall." (raw/05 L95; papers `keri-primer.md` > 2.3 Pre-rotation) The pre-rotated keys "serve as first-time, one-time, and only-time rotation keys in the next rotation operation." (KERI spec, L1628)

#### Why it is post-quantum by construction {#post-quantum-construction}

The commitment is a hash, and hashes resist quantum attack better than signatures; an attacker who could invert public-key generation "must first invert the digest of the public key using non-quantum computation. Pre-quantum cryptographic strength is, therefore, not weakened post-quantum." (KERI spec, L1711-1713) The guarantee covers rotation authority only: "the hash protects the *next* key, never the one currently exposed, so safety rests on the controller detecting compromise and rotating before an adversary can exploit what the rotation reveals." (papers `wtbo.md` > 4. KERI's Architecture: A Different Root of Trust, L99 @`181569b64`) CESR's `v1.1` branch says the same normatively, that pre-rotation and post-quantum signatures are "complementary, not alternatives" [spec-next] (CESR spec `v1.1` > Post-Quantum Cryptographic Primitives, L1553 @`65fd7518b`). [Chapter 02, section 5](02-security-model-and-threat-posture.md#pq-hedge) owns the post-quantum hedge, including the contested 256-bit digest strength.

#### Exactly what is checked at rotation {#rotation-check}

keripy's `Kever.exposeds` is the firewall in code (keripy `core/eventing.py`, `Kever.exposeds`, L2940-2984). For each rotation signature it takes the prior next-key digest at the signature's `ondex`, re-digests the revealed public key with that digest's code, and counts the signature only if they match (L2980-2982); the counted keys must then satisfy the prior next threshold, or the event escrows with "Failure satisfying prior nsith" (L2853-2863). "An attacker holding only current signing keys cannot rotate -- they do not know the pre-images." (raw/09 section 2) keripy's `Siger` carries `.index` into current keys and `.ondex` into prior-next digests, so a rotation signature may need two indices: "Second index looks up prior-next digest, first index the exposed key, verify digest, then verify signature." (KERI spec, L1256) Across implementations, `ondex` must be computed from the prior establishment event, not the proposed one (signify-ts issue #378; raw/10 section 6d).

#### The implementation defect a reviewer must guard {#permissive-defect}

The check can fail open on a digest-code mismatch, silently excluding an `ondex` from threshold satisfaction (keripy-knowledge `31-landmines.md` > L6). One layer up, `Serder._compute` overwrites the SAID field from raw bytes, and "a wrong digest code yields an invalid SAID with no error." (keripy-knowledge `31-landmines.md` > L7) The invariant over both is "Never weaken or short-circuit this." (keripy-knowledge `30-invariants.md` > C1) Neither landmine was re-tested at `b8f60166b`, and any new digest code widens the surface.

## 6. Rotation and the general pre-rotation family {#rotation-family}

A basic rotation promotes the committed next keys to current and commits a fresh next set. The specification defines a family beyond it, encoding governance patterns simpler systems cannot express.

- Partial rotation holds some committed keys in reserve; augmented rotation adds keys that were not committed. Either way "A rotation's current key list MUST be satisfiable w.r.t. BOTH prior-next and current thresholds." (KERI spec > General Pre-rotation, L1470-1498)
- Reserve rotation lets reserve keys add fault tolerance without participating unless a member is unavailable, the basis for "provisional/custodial/escrow control authority." (KERI spec > Reserve Rotation, L1501-1543)
- Custodial rotation gives a custodian the signing keys and the owner exclusive rotation authority, with exposed rotation keys weighted 0 in the new current threshold, so the owner can "revoke custodian's signing authority unilaterally." (KERI spec > Custodial Rotation, L1545-1576) KERIA's passcode rotation uses exactly this ([section 12](#passcode-rotation)).
- Abandonment rotates to an empty next list (KERI spec, L340, L174).

### The post-quantum recovery variants {#pq-recovery}

SQAR (Surprise Quantum Attack Recovery) is a partial-plus-augmented rotation to post-quantum signing keys, assuming the prior-next digests are safe though the keys are not, with the rotation keys weighted 0 (KERI spec > SQAR, L1578-1606). Hybrid multisig hedges further: with a threshold requiring both an ECC and a PQC signature, "Even if the ECC key is broken, the attacker cannot satisfy the full threshold without also breaking the post-quantum key." (papers `keri-primer.md` > 2.5 Quantum resistance; raw/05 L89) Migration is per identifier: "The upgrade is an event in the KEL. Not a global infrastructure project." (keri-security-analysis `cr-ad-trust.md` > 6. The Transition Problem: A Comparison of Trajectories)

#### The keystore hazard {#keystore-hazard}

keripy advances and erases key material before the rotation is validated, so "On rejection you need an explicit `replay(advance=False)` recovery; a naive caller can strand the keystore ahead of the KEL." (keripy-knowledge `31-landmines.md` > L11) This is operational rather than protocol, and it bites custodial deployments.

## 7. Multisig: exposing governance, not inventing it {#multisig}

Multisig is fractionally weighted thresholds declared in the public KEL. A threshold (`kt` current, `nt` next) is an M-of-N hex integer or a list of rational-fraction clauses (KERI spec, L327); clauses are ANDed, a clause is satisfied when its verified weights sum to at least 1, and rational fractions avoid rounding (KERI spec, L1419). `[1/2,1/2,1/2]` means "2 of 3." (KERI spec, L1421), and nested lists model multi-device contributors (L1466). The policy "majority of Founders OR supermajority of Investors," encodes as `kt = [["1/2","1/2","1/2"],["1/3","1/3","1/3","1/3"]]` (papers `keri-primer.md` > 2.4 Weighted multisig and transparent, granular governance), and break-glass recovery as phone 0.5, laptop 0.5 and cold storage 1.0: "The recovery logic is baked into the math of the identifier itself." (raw/05 L150)

KERI's contribution "is less about inventing and more about exposing": "multisig is optional and infinitely variable, but defining and following policy about it is required." (papers `keri-primer.md` > 2.4 Weighted multisig and transparent, granular governance) The papers ask why anyone imagines "it's safe to use the single-signature mechanism of X509 certs as the only gate on unlocking the entire reputation of modern corporations." (papers `x509-prob.md` > One key isn't realistic) Joint issuance extends the idea to "a weighted threshold of endorsements, each owner signing from their own identifier, asynchronously and with no shared key" (papers `sda.md` > 8. What is settled, and what is open). In keripy a multisig controller is `GroupHab`, and "A group/rotation with >63 keys changes the Siger encoding; consumers that don't handle the 'big' indexed codes may reject." (keripy-knowledge `31-landmines.md` > L14)

## 8. Delegation: cooperative, two-event, two-way peg {#delegation}

A delegation is two events that reference each other: a delegating event in the delegator's KEL sealing the delegated event, and a `dip` or `drt` in the delegatee's KEL naming the delegator in `di`. "Both MUST participate." (KERI spec > Cooperative Delegation, L1610-1612) The delegatee's AID is the digest of its `dip`, which references the delegator, so the delegatee is bound to its delegator by construction (KERI spec, L1616): forbidden acts are "not merely against the rules but outside the space of possible moves." (papers `sda.md` > 7. Open loop, not closed)

### The joint-compromise property {#joint-compromise}

The delegator keeps establishment control authority and the delegatee gets "revokable signing authority." (KERI spec, L1618) An exploiter of the delegatee alone cannot capture control: "A successful exploiter must also compromise the delegator's authoritative keys." Compromising only the delegator's signing keys cannot force a delegated rotation either; "Both sets of keys must be compromised simultaneously." (KERI spec, L1622) An attacker holding a delegatee's pre-rotated keys "must either induce the delegator to issue a seal or must also compromise the delegator's signing keys." (KERI spec, L1688-1690)

#### Config traits {#config-traits}

[spec] `DID` (Delegate-Is-Delegator) treats a delegatee as equivalent to its delegator for horizontal signing scale, and `DND` forbids delegation. Delegation seals carried in `ixn` events are less secure than those in `rot` events (KERI spec `main`, L379-381 @`fbdd4a615`). On `main`, `DID` gets one sentence — the trait "enables the Controller to signal to validators that any Delegate (Delegatee) AIDs are to be treated as equivalent to the Delegator" — and a table row marking it Inception Only (KERI spec `main`, L373, L381 @`fbdd4a615`). `main` states no placement rule.

#### What v1.1 adds {#v1-1-adds}

[spec-next] KERI spec `v1.1` replaces that sentence with a rationale (KERI spec `v1.1` > Configuration traits field, L381 @`3753f3797`). Placement is normative: the trait "appears in the Delegated Inception, `dip` event of a Delegatee and MUST NOT appear in a non-delegated Inception, `icp` event". What it asserts is identity of entity: the delegatee's controller and the delegator "are one and the same entity". Consent is the existing anchoring seal, so the delegator "thereby also consents to the appearance of the `DID` config trait in that event". The assertion does not propagate: "It says nothing about any Delegatees that the Delegatee may itself delegate". Placement in a delegator's `icp` is ruled out because "a Delegator MAY itself be the Delegatee of a higher-level Delegator." The purpose shifts from a delegator's to a controller's infrastructure and becomes derivable from the logs: the trait "enables horizontal scaling of a Controller's signing infrastructure by making the equivalence of the AIDs that Controller operates verifiable from their KELs". On both branches `DID` is Inception Only, so a rotation cannot introduce it.

#### The boundary neither branch draws {#did-effect-unspecified}

Both branches say a validator may treat the AIDs as equivalent; neither says what a validator MUST or MUST NOT do with that. Nothing states whether a signature under the delegatee's key state satisfies a policy written against the delegator's AID, whether the equivalence survives the delegatee's rotations, or what happens when the delegation is revoked or superseded. The spec editor says the omission is deliberate ([section 8](#delegation-trait-rulings)), which leaves the specification as silent as before. No example anywhere shows `DID` in a `dip`: Fay's delegated inception carries `"c": []` on both branches (`main` L781, `v1.1` L780), so an implementer has no serialization to check against.

#### The Ean example on main {#ean-example-tension}

`main`'s worked example puts `DID` where `v1.1` forbids it: Ean, a delegator, carries `"c": ["DID"]` in a plain `icp` (KERI spec `main`, L591 @`fbdd4a615`). `v1.1` empties Ean's list because "the `DID` config trait, which belongs in a Delegatee's Delegated Inception, `dip` event, has no referent here." (v1.1 L618) The editor calls `main`'s version an error: "Yeah, putting DID in a plain, non-delegated ICP, as an example, was an oversight." ([keripy conversations > discussion #1570](https://github.com/WebOfTrust/keripy/discussions/1570#discussioncomment-17898407), reply of 2026-08-04, R-012) [proposal]. `main` still carries it, so a citation must name its branch. Removing `"DID"` also changes Ean's inception bytes, and since Ean's AID is that event's SAID, every downstream AID literal, `p`, `di` and seal value differs between branches; never cite an AID literal from the worked examples without naming the branch.

#### What the spec editor says the traits are for {#delegation-trait-rulings}

[proposal] Sam Smith's comments in keripy conversations answer much of what the branches leave open; none of it is specification text. He gives the `v1.1` placement rule in his own words: "THE DID sits in a Delegatee Inception event." ([keripy conversations > discussion #1570](https://github.com/WebOfTrust/keripy/discussions/1570#discussioncomment-17896521), comment of 2026-08-04, R-012). On when each trait applies: "Delegated AIDs should work without there being an ACDC." Custodial key management, where another controller runs the delegatee's key hosts, uses `DND` and omits `DID`: "Because the custodian is a different controller, then DID is not used." Horizontal scaling by one controller uses it: "Because they are the same and the controller wants the world to know they are the same, then the controller uses DID." ([keripy conversations > discussion #1570](https://github.com/WebOfTrust/keripy/discussions/1570#discussioncomment-17896622), comment of 2026-08-04, R-013). Depth is bounded by these traits: "Delegation depth is controlled via config traits in the inception event." ([keripy conversations > PR #1564](https://github.com/WebOfTrust/keripy/pull/1564#issuecomment-5158683549), comment of 2026-08-02, R-015), which is why the ACDC operator `DI2I` admits delegated AIDs at any depth ([chapter 05, section 5](05-acdc-and-verifiable-data.md#di2i-depth)).

`DID` exists so that reputation crosses the delegation: "This then allows reputation to be transitive across a delegation relationship." Its effect is left open on purpose: "What a second party does with this declaration of controller equivalence between two AIDs (delegator and delegate) is up to the second party." ([keripy conversations > discussion #1598](https://github.com/WebOfTrust/keripy/discussions/1598), body of 2026-08-09, R-016). And "There is no code support yet for "DID" because DID enforcement comes at the EGF level AFAIK" ([keripy conversations > PR #1572](https://github.com/WebOfTrust/keripy/pull/1572#issuecomment-5184567539), comment of 2026-08-04, R-014). These make the gap a stated design choice without filling it, because no governance framework read for this corpus says what it does with `DID`.

#### What keripy actually enforces {#delegation-enforcement}

A delegated event is authorized only by a seal in the delegator's KEL, located through the seal-source couple in `Kever.validateDelegation`, and the delegating event must be first-seen before the delegated one is accepted (keripy-knowledge `30-invariants.md` > D1, D2). "The delegator MUST NOT accept a delegable event unless it is locally sourced, fully signed by its controller, and fully witnessed by its controller's designated witness pool." (keripy `core/eventing.py`, L3087-3089) A delegator "SHOULD NOT automatically approve a delegable rotation event unless that event's change to the witness pool is below the witness pool's prior threshold" (KERI spec, L1778), because a compromised delegatee could otherwise rotate in its own witnesses.

[code] At keripy `80f77b73b`, `DND` is enforced in key-state validation: `if dkever.doNotDelegate:  # drop event if delegation not allowed` (keripy `core/eventing.py`, `Kever.validateDelegation`, L3251 @`80f77b73b`), so such an event "will be dropped and hence never be seen by anyone anywhere." ([keripy conversations > PR #1572](https://github.com/WebOfTrust/keripy/pull/1572#issuecomment-5184545123), comment of 2026-08-04, R-014). Nothing enforces `DID`. A delegated inception may anchor seals as a plain inception may; Sam called their omission "a bug" ([keripy conversations > issue #1544](https://github.com/WebOfTrust/keripy/issues/1544#issuecomment-5070932782), comment of 2026-07-24, R-001), and `BaseHab.incept` now passes `data=data` to `delcept` (keripy `app/habbing.py`, `BaseHab.incept`, L1107-1116 @`80f77b73b`).

#### The gaps {#delegation-gaps}

Three delegation landmines are recorded: `validateDelegation` "trusts `db.fons` even if the delegating event is only escrowed" (keripy-knowledge `31-landmines.md` > L13); delegated inception "has no confirmation loop; assumes delegator KEL already present" (L12); and a validator must be separately introduced to the delegator, because "A witness is NOT a watcher" (keripy-knowledge `31-landmines.md` > L4).

## 9. Witness and backer designation {#witnesses}

[Chapter 02, section 8](02-security-model-and-threat-posture.md#witnesses) owns witnesses as doctrine: a witness stores and serves events under the controller's designation, its threshold is accountability rather than consensus, and KAWA's guarantees are local to the witness set. keripy names the threshold for what it is, "`toader (Number): instance of TOAD (threshold of accountable duplicity)`" (keripy `core/eventing.py`, L1945).

### Backers {#backers}

A backer is the ledger-backed alternative to a witness, a registrar anchoring events on a ledger under the `RB` trait and a Registrar Backer Seal (KERI spec, L345, L494). A registry may have no backers at all: keripy's `NB` trait raises `ValueError` if any are specified (keripy `vdr/eventing.py`, L89-90), which contradicts the witness-as-validator prior.

### Local versus remote: the firewall as second factor {#local-vs-remote}

keripy classifies each event as local (protected path) or remote, "to allow increased security on local events where a threshold structure is imposed" (keripy `core/eventing.py`, L3048-3049). Witnesses accept only local events, so an attacker must compromise "not merely the controller's private key(s) but also the unique second factor on each of a threshold satisfycing number of witnesses." (keripy `core/eventing.py`, L3051-3057) keripy strips remotely sourced signatures from locally membered indices before counting, "So that attacker can't source remotely compromised but locally membered signatures to satisfy threshold." (keripy `core/eventing.py`, L2780-2791)

### Witness invariants and one defect {#witness-invariants}

A non-empty witness list requires `1 <= toad <= len(wits)` and an empty one `toad == 0` (keripy-knowledge `30-invariants.md` > F1; keripy `core/eventing.py`, L2869-2896). Witness changes allow no duplicates, cuts must be current witnesses, cuts and adds must be disjoint, and removes precede adds so receipt indices stay stable (keripy `core/eventing.py`, L2696-2726; KERI spec, L358, L362). Sufficiency is "receipts meeting TOAD, not all witnesses" (keripy-knowledge `30-invariants.md` > F2), but keripy's `WitnessReceiptor` "currently waits for ALL witnesses instead," blocking if one witness is down (keripy-knowledge `31-landmines.md` > L9).

## 10. Recovery (superseding) rotation {#recovery-rotation}

Recovery rotation is the one narrow exception to "first seen, always seen, never unseen" (KERI spec, L49). At most one valid KEL exists per AID (KERI spec, L178), yet a controller whose signing key is compromised must sign a conflicting event at an already-seen sequence number to reclaim control. "Supersede means that after an event has already been accepted as first seen into a KEL that a different event with the same sequence number is accepted that supersedes the pre-existing event... This enables the recovery of events signed by compromised keys." (keripy `core/eventing.py`, L3139-3142)

### The forked KEL is preserved, not erased {#forked-kel}

"the KEL is forked at the sn of the superseding event. All events in the superseded branch of the fork still exist but, by virtue of being superseded, are disputed." (keripy `core/eventing.py`, L3143-3145) That is duplicity evidence by construction. The first-seen ordinal `fn` is distinct from `sn`: "Each event accepted into a KEL has a unique fn but multiple events due to recovery forks may share the same sn." (L3153-3155)

#### The superseding rules {#superseding-rules}

(KERI spec, L1804-1825; keripy `core/eventing.py`, L3158-3207)

- A0 — a rotation may supersede an interaction at the same `sn`, if that interaction is not before another rotation.
- A1 — a non-delegated rotation may not supersede another rotation at the same `sn`.
- A2 — an interaction may never supersede any event.
- B — a delegated rotation may supersede the latest-seen delegated rotation at the same `sn` under conditions set by the delegator's KEL ordering.
- C — recurse to the non-delegated root; if neither A nor B holds there, discard the superseding rotation.

A `rot` can therefore supersede a fraudulent `ixn`, but "recovery can not happen for any compromise of pre-rotated keys, only the latest-seen." (KERI spec, L1825) Current-key compromise is survivable; pre-rotation-key compromise is not.

#### Recovery is not an escape from accountability {#recovery-accountability}

"Because events are signed nonrepudiably, any key compromise is still the responsibility of the controller... still may be held accountable for any harm." Recovery repairs the KEL for future validators only (KERI spec, L1792), and if validators cannot find the same undisputed trunk, the KEL is irreconcilable and untrusted (KERI spec, L1788-1790).

## 11. Key state as-of-anchor: the retrograde-attack defense {#as-of-anchor}

The outsider prior is to check a signature against the signer's current key state. KERI calls that a "pyrrhic victory": "After-the-fact audits are impossible, because anything in the past can be faked with compromised keys." (papers `was.md` > Mitigation 3 (pyrrhic victory)) An attacker who ever obtains a key can forge evidence "that looks like it originated in the past, forever," (papers `was.md`, unheaded opening), and most DIDs are exposed because they "can only be resolved to the current key state" (papers `was.md` > Mitigation 3 (pyrrhic victory)). [Chapter 07, section 11](07-shibboleths-and-anti-patterns.md#retrograde-attack) carries the tell.

KERI's defense: "An anchored signature/credential is validated against the issuer key state AS OF its KEL anchor's sequence position, not current key state or wall-clock." (keripy-knowledge `30-invariants.md` > H1) keripy enforces it in `Tever.verifyAnchor`, which fetches the issuer's KEL event at the anchor's `sn` and requires its SAID to match — "the anchor must be the issuer KEL event at exactly that sn." (keripy-knowledge `30-invariants.md` > H1) "An analysis of an anchored signature will produce the same result no matter when it happens." (papers `was.md` > Conclusion) An anchored signature is a provable association through the KEL, "independent of any container context." (papers `keri-primer.md` > 3.3 Anchored vs. paired signatures)

### The gap a reviewer must flag {#verifier-anchor-gap}

The credential `Verifier` may not re-run the anchor check: "recon found no call to `Tever.verifyAnchor` here -- anchor validation appears to happen only in `Tevery` when a TEL event is received, not when a credential + proof is verified." (keripy-knowledge `31-landmines.md` > L15, flagged HIGH, confidence medium) A credential with a forged `(seqner, saider)` proof might then pass schema and TEL-state checks unanchored. `vdr/verifying.py` read at keripy `b8f60166b` names no anchor re-check step in its enforcement order, which neither confirms nor refutes the landmine. Settle it against current code before relying on the credential path.

BADA (Best-Available-Data-Acceptance) applies the same monotonicity to data at rest: a KEL-anchored update is accepted only if its anchor is later in the KEL than the prior one's (KERI spec > BADA Policy, L2872; KERI spec > KEL Anchored Updates, L2894-2907 @`fbdd4a615`).

#### How this section and section 4 fit together {#anchor-and-establishment}

The as-of-anchor rule says which position a signature is judged at; the last-establishment-event rule of [section 4](#last-establishment-rule) says which key state that position resolves to. A validator that finds the anchor at the right `sn` and then reads key state off the latest event has an as-of-anchor check that degrades into a current-key-state check the moment the issuer emits an `ixn`. The two rules are one mechanism.

## 12. The KERIA/Signify edge-versus-agent custody split {#keria-signify}

In production, the dominant pattern separates who holds the keys from who runs the infrastructure without giving the infrastructure the keys. It instantiates pre-rotation, delegation and custodial rotation.

### The custody rule {#custody-rule}

"All client tasks/calls are signed 'at the edge', not in the hosted KERIA instance." (KERIA `README.md`) signify-ts takes key generation and event signing from the agent's five functions, leaving "a remote cloud agent that never has access to the decryption keys," with "only the public keys and blake3 hash of the next keys made available to the agent." (signify-ts `README.md`) The agent "holds only encrypted key material it cannot decrypt and never signs on the controller's behalf. The custodian is a blind store + relay, not a signer." (raw/10 section 4)

#### The two-AID delegation spine {#two-aid-spine}

The Client AID is the controller's own transferable AID, with one signing and one rotation key derived at the edge from a 21-character passcode; it is the delegator. The Agent AID is a KERIA-created `dip` whose `di` is the Client AID; it signs every response so the client can authenticate its agent (KERIA `docs/protocol.md` > Agent Worker Initialization, Steps One-Three). Authentication is "asymmetric-by-role but symmetric-in-mechanism: client signs every request with the Client AID; agent signs every response with the Agent AID." (raw/10 section 1) There are no bearer tokens; each request carries a fresh HTTP message signature ([chapter 09](09-kram-and-request-authentication.md)).

#### What the code enforces at the boundary {#boundary-enforcement}

On connect, signify-ts requires the agent's inception to be a `dip` with a delegator anchor ("no anchor to controller AID") and exactly one signing key, one next key and threshold 1 (signify-ts `src/keri/app/controller.ts`, L44-82). KERIA refuses a multisig controller: "multisig groups not supported as agent controller" (KERIA `src/keria/app/agenting.py`, L871). Unsigned admin traffic gets HTTP 401 (KERIA `src/keria/core/authing.py`, L187-189), and the client rejects a "message from a different remote agent," (signify-ts `src/keri/app/clienting.ts`, L243).

#### Passcode rotation is a KEL rotation {#passcode-rotation}

Changing a passcode is a partial custodial rotation of the Client AID: "To provide post-quantum secure passcode recovery, a passcode recovery must be accompanied by partial rotation of the Client AID." (KERIA `docs/protocol.md` > Passcode Rotation > Partial Client AID Rotaion in Support of Passcode Rotation, the heading's own spelling) The old rotation key, regenerated from the old passcode, signs with weight 0 to satisfy the prior commitment, and the new signing key takes weight 1 (raw/10 section 2), the custodial pattern of [section 6](#rotation-family). An interrupted rotation makes KERIA "lock[s] out all other operations until it is completed successfully," (KERIA `docs/protocol.md` > Passcode Rotation Recovery).

#### Edge key-derivation methods {#key-derivation-methods}

Every method keeps unencrypted private material at the edge: Salty (one Argon2-stretched salt per AID, stored server-side encrypted), Randy (random keys stored as encrypted blobs), Sandy (a salt per establishment event), Group (no keys; designates the local multisig participant), and experimental HSM (KERIA `docs/protocol.md` > Key Generate Methods). On rotation the edge re-derives and checks each AID's keys against published state, throwing "Invalid Salty AID" on mismatch (signify-ts `src/keri/app/controller.ts`, L372-374). The Salty path has no delimiter, so "when `stem` ends in a hex digit, distinct `(stem,ridx,kidx)` tuples can map to the same path -> same derived seed." (keripy-knowledge `31-landmines.md` > L10; keria/signify #928)

#### Cross-implementation parity is the deepest risk {#parity-risk}

keripy, KERIA, signify-ts and SignifyPy must agree byte for byte on encoding, key stretching, SAID computation and signature bytes; [chapter 06, section 7](06-governance-ecosystems-and-interop.md#implementation-compat) owns parity. KERIA depends on keripy's 1.2.x line, `"keri==1.2.14",` (KERIA `pyproject.toml`, L30 @`928ce26a4`), while every keripy [code] claim here is from the 2.1.0-dev `main` line, so keripy behavior describes a KERIA deployment only where KERIA reimplements it.

## 13. What is enforced versus what is prose: the ground-truth summary {#ground-truth}

Machine-enforced, at the pins given in [Sources](#sources): one inception at sn 0 with `d == i` and a bounded threshold; empty commitments for non-transferable AIDs; the pre-rotation check of [section 5](#rotation-check); backward hash chaining, increasing sequence numbers and current keys from the last establishment event (keripy-knowledge `30-invariants.md` > B2-B4); seal-authorized, first-seen delegation; forked-and-preserved recovery; the local/remote second factor; and edge custody with a single-key delegated agent.

Recorded but unre-tested landmines, none a protocol flaw: L15, the credential verifier possibly skipping the anchor check; L6 and L7, digest-code fail-open paths; L9, receipting waiting for all witnesses; L11 to L13, keystore and delegation ordering; L1, the `Ed25519N` hardcode; and L10, the Salty path collision. Two uncertainties sit in the specification instead: the effect of `DID` ([section 8](#did-effect-unspecified)), and the last-establishment-event rule, which nothing normative states ([section 4](#last-establishment-rule)).

The governing rule is the knowledge base's: "do not 'simplify away' a guard you don't fully understand; treat an unexplained check as protecting an invariant until proven otherwise." (keripy-knowledge `00-lens.md` > claim 6) The dual index, the local/remote split, the two-way delegation peg and the weight-0 rotation key each encode a guarantee a simpler design cannot retrofit.

## Sources {#sources}

- CESR spec — Composable Event Streaming Representation (CESR) specification, Trust Over IP. trustoverip/kswg-cesr-specification, spec/spec-body.md, `v1.1` @`65fd7518b` (2026-08-26). Supports only the [spec-next] citation in [section 5](#post-quantum-construction); the standardizing branch has no counterpart section. Mined in raw/02.
- KERI spec — Key Event Receipt Infrastructure (KERI) specification, Trust Over IP. trustoverip/kswg-keri-specification, spec/spec-body.md and spec/termdefs.md. `main` @`fbdd4a615` (2026-08-28) supports every unmarked or [spec] citation; `v1.1` @`3753f3797` (2026-08-26) supports the [spec-next] citations in [section 8](#v1-1-adds). The branches have diverged, so [spec-next] is not "`main` plus more" and cannot be promoted on the expectation of a merge. Mined in raw/01.
- KERIA — KERI Agent, WebOfTrust. WebOfTrust/keria, `README.md`, `docs/protocol.md`, `pyproject.toml`, `src/keria/app/aiding.py`, `src/keria/app/agenting.py` and `src/keria/core/authing.py`. `main` @`7e685edaa` (2026-09-11), including the `aiding.py` change in `b57780a8b`; @`928ce26a4` (2026-09-30), a changed-files read, for the `keri==1.2.14` pin. Mined in raw/10.
- keripy — KERI reference implementation, WebOfTrust. WebOfTrust/keripy, src/keri. `main` @`b8f60166b` (2026-09-14, `__version__` `2.1.0-dev1`) for the `kraming.py` gate, the post-quantum code search and the `vdr/verifying.py` read. `core/eventing.py`, `core/coring.py`, `vdr/eventing.py`, `app/habbing.py`, `app/keeping.py` and `core/signing.py`, where most code claims live, were read at `3a8e01aec` (2026-07-17) and their hints and behavior are pinned there. The `DND` drop in `Kever.validateDelegation` and `data=data` in `BaseHab.incept` were read at `main` @`80f77b73b` (2026-10-01). Mined in raw/09 and raw/21.
- keripy conversations — Sam Smith's comments in WebOfTrust/keripy discussions #1570 and #1598, PRs #1564 and #1572, and issue #1544, read from the 2026-10-14 fetch cached under `.ignored/sam-rulings-cache/`, at edited text where edited. [proposal] throughout. Mined in raw/21.
- keripy-knowledge — keripy knowledge base (`00-lens.md`, `30-invariants.md`, `31-landmines.md`, `PLAN.md`), Daniel Hardman. dhh1128/keripy, branch `knowledge` @`9489ac9bd` (2026-07-02). Private and unpublished; cited as `L1`, `C1`, `H1` and so on. Its code baseline is keripy `60ab9e08d`, 493 commits behind `b8f60166b`, so each landmine is an observation about a superseded dev line, not a statement about current keripy, and its banner claim that all twenty still hold has at least one known counterexample. Mined in raw/08.
- keri-security-analysis — KERI security-analysis corpus (`cr-ad-trust.md`; `background.md`), Daniel Hardman. dhh1128/keri-security-analysis, main @`149fa6c35` (2026-04-23). Mined in raw/07.
- papers — Daniel Hardman's papers (`keri-primer.md`, `wtbo.md`, `was.md`, `sda.md`, `x509-prob.md`), dhh1128/papers, main; `wtbo.md` pinned @`181569b64` (2026-09-15), the others with no pin of record in this chapter. The author's framing, not normative text. The `was.md` retrograde-attack quotes sit in its unheaded opening, as [chapter 01, section 6](01-foundations-and-worldview.md#pki-problem) records. Mined in raw/05 and raw/06.
- signify-ts — Signify TypeScript client, WebOfTrust. WebOfTrust/signify-ts, `README.md`, `src/keri/app/controller.ts` and `src/keri/app/clienting.ts`, `main` @`ffba8406e` (2026-09-10). Mined in raw/10.
