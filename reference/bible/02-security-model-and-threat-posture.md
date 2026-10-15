# 02 — Security Model and Threat Posture {#security}

## Thesis {#thesis}

KERI does not promise that attacks cannot happen. It promises that when they happen the identifier survives, the misbehavior becomes evidence, and control can be recovered. Its objective function is survivability, not invulnerability; its mechanism is detection, not prevention; its characteristic property is that duplicity is evident, not that it is impossible; and it assumes from the outset that the controller may be malicious. Because KERI declines to buy global consensus, different validators may hold different valid histories of one identifier, possibly forever, and detection moves into an observer layer (watchers, jurors, judges) that the protocol enables but does not guarantee. The commonest review error is to judge KERI against an invulnerability objective it never adopted, which "is analogous to criticizing a smoke detector for not preventing fires." (dg-c02-claude.md > 5. Logical or Analytical Errors)

## Status {#status}

Most of this chapter rests on the keri-security-analysis corpus and on papers rather than on a specification, so markers appear where the distinction does work: implementation behavior in [section 4](#zero-trust) and [section 8](#witnesses), and an author's slides and a GitHub ruling set beside the analysis in [section 3](#lazy-consistency) and [section 9](#witnesses-as-watchers). The six per-claim Del Giudice analyses are model-authored ([section 12](#evidence-standards)).

## 1. Survivability, not invulnerability {#survivability}

The security-analysis method requires every analyst to name the objective a claim assumes, because the two objectives judge the same facts in opposite ways. An invulnerability framing "assumes that security requires prevention of entire classes of attack (e.g., forks, equivocation, conflicting histories) via mechanisms such as global ordering or consensus." A survivability framing "does value prevention" but "assumes that some adversarial behaviors are inevitable and evaluates security in terms of a gestalt... invulnerability, detectability, evidence preservation, recoverability, and mission-level continuity under disturbance." (standard-analysis.md > 0. Objective-Function Alignment)

KERI "adopts a survivability-oriented security model." (standard-analysis.md > 0. Objective-Function Alignment) Its aims are to keep functioning under disturbance, make hostile actions observable and attributable, preserve evidence for recovery and governance, and "Avoid abortive mission failure even when attacks succeed." The reframing rule follows: "Forks and equivocation by malicious controllers are anticipated disturbances, not protocol failures." (background.md > 4.5.1 Survivability-Oriented Security Framing (Analytical Context))

The papers say it in engineering terms: "detection and recovery are therefore first-class design requirements, not fallbacks." (wtbo.md > 3. Common Ground: What CT and KERI Share) [practice] One deployment states it as a business fact: "If our business grows, we will eventually be hacked." (origin-platform docs/origin-security.md > 1. Philosophy, L18 @cb758b1b5). Where the strength of pre-rotation is at issue, this corpus cites wtbo.md's conditional statement of it ([section 5](#pre-rotation-firewall)), not the unconditional "fundamentally resilient, not just resistant" of `kspqs.md`.

## 2. Detection, not prevention {#detection-not-prevention}

"KERI is fundamentally a detection-oriented system with optional response mechanisms." The hygiene rule that follows: "Any claim that implies prevention must be scrutinized for hidden assumptions." (background.md > 4.5 Detection vs Prevention)

The choice is a cost decision: "guaranteeing prevention requires global consensus at a cost in latency and scalability that both systems deliberately decline to pay." (cr-ad-trust.md > 3. Common Ground: What CT and KERI Share) In CAP terms, "KERI explicitly chooses availability and partition tolerance, and handles the consistency gaps through detection." (wtbo.md > 5. Evaluating KERI: Real Tradeoffs, Honestly Stated)

Certificate Transparency is detection-oriented too, and the specification marks the difference: "Unlike certificate transparency, KERI enables the detection of Duplicity in the Key state via nonrepudiable cryptographic proofs of Duplicity, not merely the detection of inconsistency... that MAY or MAY NOT be duplicitous." (KERI spec > Overcoming existing security overlay flaws, L85) CT detects that two logs disagree; KERI detects that one controller signed two conflicting things. The shibboleth is [chapter 07, section 3.3](07-shibboleths-and-anti-patterns.md#certificate-transparency).

### Established, with a standing invariant {#detection-established}

The keripy knowledge base states it as a protocol-level claim: KERI "does not make a malicious controller's fork impossible; it makes it detectable and attributable by observers." Witnesses and OOBIs are "sources of data, never sources of authority." (keripy-knowledge 00-lens.md > The load-bearing claims, claims 1 and 2)

## 3. Duplicity-evident, not duplicity-resistant {#duplicity-evident}

KERI "doesn't try to make duplicity impossible -- that would require global consensus... It makes duplicity provable and attributable." (wtbo.md > 4. KERI's Architecture: A Different Root of Trust)

### Definition of duplicity {#duplicity-definition}

Duplicity is "the existence of more than one Version of a Verifiable KEL for a given AID." (KERI spec, termdefs) Because both versions must be fully signed and witnessed, it "is only possible via key compromise or the controller acting duplicitously (indistinguishable to a watcher)." (KERI spec, L51) Duplicity differs from invalidity (background.md > 4.1.2 Duplicity vs Invalidity): an unsigned or malformed event is dropped, while a duplicitous event is valid and therefore evidence.

#### The terminological trap {#terminological-trap}

Del Giudice's thesis concludes that "KERI is therefore not duplicity-resistant but only duplicity-evident." (2025 ETH Zurich thesis, chapter 4, section 4.1, p.38, quoted in background.md > 8.2 Catalog of Security-Relevant Claims (from Del Giudice), DG-C03) If resistant means prevention, that is accurate. The word only imports an invulnerability bias, and a blockchain-trained reader hears "weaker than a blockchain", when KERI "solves a different problem." (dg-c03-claude.md > 6. Net Effect on Security Interpretation)

#### Why evidence is not a consolation prize {#evidence-not-consolation}

A malicious controller "producing a detectably duplicitous event history is tantamount to a detectable total exploit... analogous to a total but detectable exploit of any BFT ledger such as a detectable 51% attack on a proof-of-work ledger." (KERI spec, L1842) And "One verifiable copy of a KEL (more specificly a KERL) is enough to detect duplicity in any other verifiable but inconsistent copy." (KERI spec, L1719)

#### Global consistency is owed only when it is checked {#lazy-consistency}

[proposal] Sam Smith's 2020 Duplicity Game deck scopes consistency to the interaction: a private interaction carries a "Local Consistency Guarantee" and a public one a "Global Consistency Guarantee", and "Global consistency may only matter after A and B need to interact not before." and "Breaking the promise of global consistency is a provable liability." (Duplicity Game, slides headed Duplicity Game @b47f21597). On this chapter's reading, global consistency is lazy: validators that never compare views are owed nothing, and once they interact any divergence is duplicity they can prove. That is why the permanent divergence of [section 10](#local-validity) is not a defect in itself.

## 4. The zero-trust, malicious-controller stance {#zero-trust}

"Verifiers do not assume controller honesty." (background.md > 2.1 Controller) Protecting against a fully malicious controller is an explicit non-goal (background.md > 1.3 Explicit Non-Goals), and the controller "may also be malicious and, in some ways, may be indistinguishable from a successful malicious third party." (KERI spec, L1723) Zero trust here means "never trust always verify" (KERI spec, L103), and in code "every externally supplied event, signature, key, receipt, or credential is hostile input until verified" (keripy-knowledge 00-lens.md > The load-bearing claims, claim 3).

The witness set does not protect against a malicious controller. It "may produce multiple conflicting KELs," "each may independently achieve sufficient agreement", and "Witness thresholding alone does not prevent this." (background.md > 5.8 Malicious Controller Case), because such a controller "can simply run its own witnesses" (thesis, chapter 3, section 3.1.4, p.26, in background.md > 8.2 Catalog of Security-Relevant Claims (from Del Giudice)). Witnesses themselves "are assumed to be potentially malicious." (keri-primer.md > 2.6 Witnesses and the watcher network)

### The honest-controller subtlety {#honest-controller}

The honest-controller assumption in the formal literature is a proof simplification, not a deployment requirement: "Removing it does not break KERI's security -- it shifts the focus from prevention to detection and recovery." (dg-c06-claude.md > 3. Assumption Sensitivity)

#### In scope for analysis, out of scope for prevention {#malicious-in-scope}

For a controller that "intentionally produces multiple conflicting KELs", "KERI does not attempt to prevent this" and "Security relies on detectability and consequences, not impossibility." "This threat is in scope, but must be analyzed separately from honest-controller cases." (background.md > 4.4 Threat Surfaces > 4.4.2 Malicious Controller, L318-324) Consequences put the response after detection, by validators, governance and counterparties, inside the security claim, so an argument that stops at proving the fork has stated half of it.

#### Fail-closed and fail-open in the code {#fail-closed}

[code] The hostile-input rule has a machine-checkable form: input a verifier cannot evaluate is refused, not defaulted. keripy's two ACDC edge evaluators disagree on exactly that, with `vdr/verifying.py` dropping an unrecognized operator and applying the default while `acdc/ipexing.py` fails closed; [chapter 05, section 5.1](05-acdc-and-verifiable-data.md#verifying-ground-truth) has the code. One input with a fail-open and a fail-closed path is a threat-posture finding whichever way it resolves.

#### A failing message tells the sender nothing {#no-failure-oracle}

[proposal] Sam Smith rules that the best practice for a long-running internet-facing service is "to not inform the caller why a given message sent to the service failed" (keripy GitHub > #1580, comment of 2026-08-07, R-021, https://github.com/WebOfTrust/keripy/pull/1580#issuecomment-5221176507), to deny an oracle; [chapter 04, section 10](04-cesr-and-the-wire.md#no-failure-oracle) has the parser side.

## 5. The pre-rotation firewall: survivability instantiated {#pre-rotation-firewall}

Pre-rotation is where survivability becomes a mechanism: "control authority is split between keypairs that hold signing authority and keypairs that hold rotation authority." (KERI spec > Pre-rotation, L1364) An attacker with the current keys can sign but cannot rotate, since "later exploit of the current authoritative signing key(s) may not capture key rotation authority as it has already been transferred via the pre-commitment to a new unexposed set of keys." (KERI spec, L1628) The mechanism, its code in keripy, its post-quantum argument and its fail-open hazard are [chapter 03, section 5](03-key-management-and-identifier-lifecycle.md#pre-rotation).

What this chapter adds is the conditions. The asymmetry is designed: "Compromise of current keys is survivable; compromise of pre-rotation keys is catastrophic and unrecoverable." (keripy-knowledge 30-invariants.md > C. Pre-rotation & recovery (maximum sensitivity), C2) And the guarantee is a race, not a wall: "the hash protects the next key, never the one currently exposed, so safety rests on the controller detecting compromise and rotating before an adversary can exploit what the rotation reveals." (wtbo.md > 4. KERI's Architecture: A Different Root of Trust, L99 @181569b64). That sentence is the citation of record for the strength of pre-rotation. [spec-next] The CESR forward branch concedes the same limit: hiding pre-rotated keys "protects the next key pair but does not protect the currently exposed one" (CESR spec > Post-Quantum Cryptographic Primitives, L1553 @65fd7518b); it is not on `main` and binds nobody. Recovery does not launder accountability ([chapter 03, section 10](03-key-management-and-identifier-lifecycle.md#recovery-rotation)).

### The post-quantum hedge {#pq-hedge}

The firewall's post-quantum property is a claim about hashes, and it is [spec]: because prior-next key digests are post-quantum safe "in that a quantum computer is not advantaged over a conventional computer in inverting cryptographic strength digests", a surprise quantum attacker who inverts the exposed signing keys "is not able to forge a verifiable Rotation event" (KERI spec > SQAR, L1580 @fbdd4a615). The number attached to it is contested. The papers say a 256-bit hash "provides an effective 128 bits of post-quantum security" (kspqs.md > The Pre-Rotation Mechanism: A Royal Succession, L72 @181569b64), while ENISA's draft guidance, as the same paragraph reports, "does ask for 384-bit hash outputs where quantum security is sought". The author's answer, that this is "a parameter choice, not a change of primitive, and one KERI's agility accommodates by design" (same line), is his assessment, not a surveyed result. The same guidance treats hash-based mechanisms as usable standalone and lattice schemes as not yet, which is the bet pre-rotation makes. The forward branch stacks post-quantum signatures beside pre-rotation rather than in place of it [spec-next] (CESR spec > Post-Quantum Cryptographic Primitives, L1553 @65fd7518b). Unknown: whether the pre-rotation `n` field can carry a 384-bit commitment without a specification change, and whether any deployment uses anything but Blake3-256.

## 6. Guarantees are stated relative to assumptions (A1-A13) {#assumptions}

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

Three are most often granted for free. A3 is a proof convenience, not a deployment premise ([section 11](#dg-c06)). A5 "MUST NOT be silently assumed", so any argument that duplicity will be detected is smuggling it in. And "None of A8-A11 are enforced by KERI." (background.md > 6.4 Observer Assumptions (Explicit))

### Four threat surfaces {#threat-surfaces}

Every cell quotes background.md > 4.4 Threat Surfaces at the subsection in the first column (L301-354 @149fa6c35). Two of the four surfaces have no protocol mitigation.

| Surface | Threat | Mitigation | What remains |
|---|---|---|---|
| Controller key compromise (4.4.1) | "Adversary obtains current signing keys" | "Pre-rotation commitments"; "Recovery rotation" | "Compromise of pre-rotation keys is catastrophic" ([section 5](#pre-rotation-firewall)) |
| Malicious controller (4.4.2) | "Controller intentionally produces multiple conflicting KELs" | None: "KERI does not attempt to prevent this" | Detectability and consequences ([section 4](#malicious-in-scope)) |
| Witness misbehavior (4.4.3) | "Signing conflicting events"; "Withholding receipts"; "Colluding with controller" | "Thresholding"; "Assumptions on maximum faulty witnesses" | "Witness sets are controller-chosen"; "No global witness reputation or enforcement" |
| Observer absence or degradation (4.4.4) | "Watchers/jurors/judges are absent, lazy, siloed, or non-overlapping" | None in the protocol | "Duplicity may remain undetected indefinitely"; "Validators may accept conflicting histories permanently" |

The observer surface is where the one criticism that survives the Del Giudice bindings lands ([section 12](#contested)), and "This threat is explicitly acknowledged and not mitigated by protocol mechanics alone." (background.md > 4.4.4 Observer Absence or Degradation, L354)

## 7. KAWA: what witness agreement is (P1-P4) and is not (P5-P8) {#kawa}

KAWA, KERI's Algorithm for Witness Agreement, is "a single-phase agreement protocol that provides fault tolerance without the multi-phase commit overhead of classical Byzantine Fault Tolerant algorithms like PBFT." (cr-ad-trust.md > 4. KERI's Architecture: A Different Root of Trust) Its thresholds are N witnesses and a receipt threshold M (the toad). BFT sizing (N = 3f+1, M = 2f+1) is common, not mandated; a controller may set M = N or M = 1 (dg-c01-claude.md > 2. Faithfulness to KERI-as-Specified).

KAWA is "a controller-scoped agreement mechanism, not as a global consensus protocol." (background.md > 5. KAWA (KERI’s Algorithm for Witness Agreement), L444-445) It provides durability, availability and fault tolerance for one identifier, and does not attempt to "Establish global agreement among validators", "Prevent intentional equivocation by controllers" or "Enforce witness honesty beyond threshold assumptions" (background.md > 5.1 Purpose of KAWA, L457-462). Witness state is kept "per identifier" (background.md > 5.2 Inputs, Outputs, and State, L483), so nothing in KAWA relates two identifiers' histories; that inference is raw/07's.

### Provided properties {#kawa-provided}

All scoped to an honest controller unless noted (background.md > 5.6 Claimed Security Properties of KAWA).

- P1, Validity — "If a correct witness accepts an establishment event, that event was authorized by the controller." Depends A1, A3, A4.
- P2, Consistency — "Two correct witnesses will not accept different establishment events at the same sequence number." Depends A2, A3, A4, A7. "This is the strongest KAWA property and is conditional. It does not hold if the controller is malicious."
- P3, Durability — "Once an event has a sufficient agreement, it cannot be removed or replaced." Depends A2, A4, A6. "Durability is local to witnesses and does not imply global convergence."
- P4, Availability — "Validators can retrieve the KERL even if the controller is offline." Depends A2, A6.

#### Explicitly not provided by KAWA {#kawa-not-provided}

KAWA does not provide P5, fork prevention for malicious controllers; P6, global consistency across validators; P7, timely fork detection; or P8, automatic fork resolution. "Any claim implying these properties must introduce additional mechanisms (e.g., observers, governance, social response)." (background.md > 5.7 Properties Explicitly Not Provided by KAWA) "KAWA alone determines local durability. Observers determine global detectability." (background.md > 5.9 Relationship to Observer Layer)

#### Microledgers, not blockchain {#microledgers}

A blockchain's consensus decides whether and in what global order an event is recorded. KERI splits that into per-identifier microledgers, the KELs, and the controller has recorded an event in its own KEL before KAWA runs. KAWA asks not whether to record but whether anyone is trying to fork history after the fact, which is detection of equivocation (DECENTRALIZATION-PURITY-STEERING.md > The thesis this must capture). Local order suffices because "the controller is the sole source of truth for the creation of any and all key events, it alone, is sufficient to order its own key events", and key events are "idempotent authorization operations as opposed to non-idempotent account balance decrement or increment operations." (KERI spec > KAWA insight, L1836) The shibboleth is [chapter 07, section 4.1](07-shibboleths-and-anti-patterns.md#global-consensus).

#### The immunity constraint {#immunity-constraint}

What witness thresholds do buy: for N witnesses there is an M < N guaranteeing at most one sufficient agreement, despite a dishonest controller, provided at most F* = N - M are unavailable and F < M are duplicitous, so "the service may not produce multiple divergent but proper KERL." (KERI spec, L1866-1868) The validator chooses M to protect itself. It holds only within those bounds: if controller and witnesses collude, "KAWA can't protect -- protection then comes from validator-side duplicity detection across a large diverse observer set." (KERI spec, L1874) Pool sizing and diversity in practice are [chapter 11, section 4](11-infrastructure-and-operations.md#witness-pools).

## 8. Witnesses, backers, and thresholds {#witnesses}

A witness stores and serves the controller's KEL and returns signed receipts; "Witnesses make no assertion about identity... That is a fundamentally different role than a CA." (cr-ad-trust.md > 4. KERI's Architecture: A Different Root of Trust) It is under the controller's ultimate control, and a backer is an alternative that commonly uses a ledger (KERI spec, termdefs). Designation is [chapter 03, section 9](03-key-management-and-identifier-lifecycle.md#witnesses).

- Sufficient agreement is receipts meeting the toad, not all witnesses: "the controller accepts accountability for an event when any subset M of the N witnesses confirms that event." (KERI spec, L1846, L1850) [code] keripy's `WitnessReceiptor` waits for every witness — `completed = len(wigers) == len(wits)` (keripy src/keri/app/agenting.py, WitnessReceiptor.receiptDo, L360-361 @b8f60166b) — and never reads `hab.kever.toader`; in the knowledge base's words, "that is a defect, not the invariant" (keripy-knowledge 30-invariants.md > F. Witness threshold (TOAD), F2).
- Threshold discipline (A7) is the controller's: "KERI does not enforce threshold choices; misconfiguration weakens guarantees." (background.md > 5.3 Agreement Thresholds) With M = 1 the immunity constraint tolerates no duplicitous witness, since it needs F < M. The model-authored dg-c01 analysis says such a threshold "can be trivially broken by a single malicious witness" (dg-c01-claude.md > 3. Assumption Sensitivity), which overstates it: a lone witness cannot produce a second signed version without the controller's keys ([section 12](#never-grant)).
- Witness AIDs "MUST be non-transferable, fully qualified public keys" so a validator can verify a receipt from the AID alone (KERI spec, L353, L1252). The keripy prefix-code hazard is [chapter 03, section 3](03-key-management-and-identifier-lifecycle.md#ed25519n-landmine).

## 9. The observer layer: watchers, jurors, judges, and ambient duplicity detection {#observer-layer}

Global detectability is the job of an observer layer the protocol enables but does not mandate, with three roles kept apart so no observer both detects duplicity and rules on it (background.md > 6.2 Observer Roles (Functional Definitions)).

- Watcher — collects KERLs from several sources and detects conflicts at one sequence number, validator-selected, with "No required coverage or completeness / No protocol-mandated response." (same) It is "Under control of the VALIDATOR, not the controller," and follows first-seen. (KERI spec, termdefs)
- Juror — records evidence of duplicity in a Duplicitous Event Log, with "No authority to resolve conflicts" (same; KERI spec, L51, L1858).
- Judge — applies policy to rank conflicting KERLs and trigger remediation; it is "Policy-driven / Non-universal / May disagree across validators." (same)

### Super names scope, not a feature set {#super-scope}

[proposal] Answering a draft KID that defined super watchers by features, Samuel Smith wrote: "In my mind what makes a watcher, juror, or judge 'super' is the scope of the KELs it is watching therefore we could have super watchers or super jurors or super judges." Philip Feairheller: "a vLEI Super Watcher would have the scope of all AIDs in that ecosystem." (WebOfTrust/kids#1, 2023-11-05 and 2023-11-06). These are statements on a draft never merged. Two consequences: a deployment called a super watcher may be doing juror or judge work, so ask which role it performs; and scope is what makes the GLEIF super watcher a trust concentration ([section 11](#dg-c05)). `wtbo.md` uses the term for an archival watcher.

#### Ambient duplicity detection {#ambient-detection}

A watcher that "asks two witnesses for the head of the same identifier and gets different hash values, it has detected duplicity", and its proof "doesn't require trusting any authority's interpretation -- only the mathematics of the signatures." (cr-ad-trust.md > 4. KERI's Architecture: A Different Root of Trust) Ambient detection is the emergent property that equivocation "becomes observable somewhere in the network, given sufficient observer activity and information flow. This is not guaranteed by protocol mechanics." (background.md > 6.3 Ambient Duplicity Detection) It favors the defender: "a successful dead attack requires the isolation of a validator from ambient sources of the KERL... isolation... may be prohibitively expensive. Consequently, ambient verifiability provides asymmetry between the attacker and the defender in favor of the defender." (KERI spec, L1884)

Observer-enabled properties are conditional: detection depends on A8-A10 and "may be delayed or incomplete", and "Proof does not imply remediation" (background.md > 6.5 Security Properties Enabled by Observers (Conditional)). "Observers increase visibility, not control." (background.md > 6.6 Properties Observers Do Not Provide) A watcher makes an observation, not an enforcement decision: "The worst a dishonest watcher can do is stay silent about duplicity it has seen -- a risk addressed by running your own watcher or consulting multiple independent ones." (wtbo.md > 4. KERI's Architecture: A Different Root of Trust) See [chapter 07, section 8.2](07-shibboleths-and-anti-patterns.md#watcher-enforcement).

#### Core but optional {#core-but-optional}

"Observer mechanisms are core but optional" (background.md > 6.9 Analytical Implications, L853): optional to the protocol, core to the outcome. "Absence of observers is a deployment choice, not an inevitability" (L855-856), and an observer claim takes the form "Under observer assumptions A8–A11, property O# holds." (L859) In the extreme "Duplicity may persist indefinitely without detection", "an acknowledged design tradeoff, not a protocol failure." (background.md > 6.7 Failure Modes and Degradation, L822-830) A critique that never mentions observers has assumed them away (background.md > 6.8 Relationship to Security Claims in Literature, L843-847).

#### A witness is not a watcher {#witness-not-watcher}

A witness "MUST first verify the event's controller signatures before it can sign (witness)" an event (KERI spec, L1774), with no delegation-seal check, while a validator must also verify the "delegator anchoring seal (if delegated)" (KERI spec, L1780). So a witness can receipt a delegated event no watcher will yet accept, and a validator must obtain the delegator's KEL itself (keripy-knowledge 30-invariants.md > D. Delegation, D3).

#### Witnesses used as watchers in production {#witnesses-as-watchers}

[proposal] Sam Smith: "witnesses are being used as ersatz watchers in the wild, but witnesses cannot be watchers, and delegation is where this difference is most pronounced." (keripy GitHub > #1559, comment of 2026-07-31, R-008, https://github.com/WebOfTrust/keripy/issues/1559#issuecomment-5138781953). His rule: "An event should not be Seeable by a second party unless a watcher can see it, not if a witness can see it." His assessment, not a survey: "implementations that do not use watchers cannot get it right. This includes the GLEIF ecosystem in general." Any design that lets a relying party rely on a witness's view of a delegated identifier carries this defect. The operational form is [chapter 11, section 1](11-infrastructure-and-operations.md#roles-in-operation).

#### Contested and immature, a flag for reviewers {#observer-contested}

The observer layer is where the corpus's honest criticism lands, as a deployment-maturity gap: "A KERI deployment without robust watchers and governance is not a secure system." (cr-ad-trust.md > 5. Evaluating KERI: Real Tradeoffs, Honestly Stated) Named failure modes are correlated witness failure on one cloud provider, weak thresholds chosen for convenience, siloed or lazy watchers, and alert fatigue (same; dg-c0X-claude.md > 7. Pragmatic CISO's Operational Plausibility Notes). The analysts' operational notes are sorted against doctrine in [chapter 11, section 8](11-infrastructure-and-operations.md#ciso-notes).

## 10. Local vs global validity {#local-validity}

KERI does not promise that validators will ever agree. Four notions of convergence must be kept apart:

- Local consistency — "Local consistency is always achievable." (background.md > 7.4.1 Local Consistency)
- Global convergence — "KERI does not guarantee global convergence." (background.md > 7.4.2 Global Convergence)
- Eventual awareness — "This is possible, not guaranteed." (background.md > 7.4.3 Eventual Awareness)
- Permanent divergence — "Permanent divergence is an allowed outcome." (background.md > 7.4.4 Permanent Divergence)

"Safety in KERI means: Validators do not accept invalid histories." (background.md > 7.5.1 Safety (KERI-Specific)), not agreement on one history; "Liveness in KERI means: Honest controllers can continue to append events." (background.md > 7.5.2 Liveness (KERI-Specific)) Divergence is "permitted even with observers present." (dg-c03-claude.md > 3. Assumption Sensitivity) Observers can make it visible, not make it converge.

The specification's rule is a validator obligation: "An honest validator MUST trust when there is no evidence of duplicity and MUST NOT trust when there is any evidence of duplicity unless and until the duplicity has been reconciled." (KERI spec, L53) Treating its own first-seen copy as authoritative is "at the validator's discretion." (KERI spec, L1842) A KEL whose undisputed path validators cannot all find is irreconcilable and not trusted (KERI spec > Reconciliation, L1788-1790).

### Validator inputs, acceptance and fork handling {#validator-policy}

The analysis says "There is no protocol-mandated acceptance rule." (background.md > 7.3 Acceptance Rules, L912-923), and on duplicity a validator "may reject the identifier", "may select one branch", or "may await further evidence" (background.md > 7.6 Fork Handling at Validators, L995-998). Both are looser than the specification's MUST NOT. Open question: read narrowly, the first means no rule chooses among valid histories; the second squares with the specification only if selecting a branch counts as reconciliation or as the first-seen discretion. Neither source says which is intended, and the specification governs.

### Consensus terms, translated {#consensus-terms}

"Claims that use consensus language must be reframed:" (background.md > 7.7 Implications for Security Claims, L1007)

| Consensus term | KERI interpretation |
|---|---|
| Safety | Cryptographic validity |
| Liveness | Controller progress |
| Agreement | Witness-scoped |
| Finality | Local durability |
| Consistency | View-relative |

"Failure to perform this translation leads to category errors." (L1017) A finality claim is at most local durability (P3), and a consistency claim holds only relative to a validator's view.

## 11. The Del Giudice claim bindings (DG-C01..C06) {#dg-bindings}

Del Giudice's 2025 ETH Zurich Master's thesis, A Security Analysis of KERI, is "the most rigorous formal analysis of KERI's consensus mechanics" but "not peer-reviewed research." (cr-ad-trust.md > 5. Evaluating KERI: Real Tradeoffs, Honestly Stated) Each of its six claims resolves into a deliberate non-goal, a proof-scope limit, or an ecosystem-maturity gap; the only surviving residual is observer immaturity (background.md > 8.2 Catalog of Security-Relevant Claims (from Del Giudice), meta-pattern). The per-claim verdicts below come from model-authored analyses ([section 12](#evidence-standards)).

### DG-C01, fork-resistance for honest controllers {#dg-c01}

KAWA gives validity, consistency and reliability for honest controllers during establishment events, under BFT-style sizing and bounded faults (A1-A4, A7). Faithful within scope; the risk is a reader extending it to all deployments or treating BFT thresholds as mandatory (dg-c01-claude.md).

#### DG-C02, no prevention of malicious duplicity {#dg-c02}

KERI does not prevent duplicity by malicious controllers, and neither prevention nor timely detection is guaranteed. Faithful, but it "criticizes KERI for lacking a capability... that is explicitly outside KERI's design goals"; the surviving residual is that detection relies on an optional observer layer, "a critique of deployment readiness and ecosystem maturity, not of KERI's protocol design." (dg-c02-claude.md > 5. Logical or Analytical Errors; 6. Net Effect on Security Interpretation) The thesis: "We don't have any guarantees however on if and when this duplicity will be exposed." (Del Giudice thesis, chapter 4, section 4.1, p.38)

#### DG-C03, indefinitely conflicting KERLs {#dg-c03}

Validators may accept conflicting KERLs indefinitely (A12, A13). The description is faithful; the evaluative "only" imports an invulnerability expectation, and "No criticism survives objective-function alignment" (dg-c03-claude.md > 6. Net Effect on Security Interpretation).

#### DG-C04, recovery rotation and the single authoritative KERL {#dg-c04}

Under recovery rotation, correct witnesses may sign both an attacker's event and the owner's recovery at one sequence number, "because KERI prioritizes the ability to reclaim a compromised identity over strict uniqueness of history at every moment." (cr-ad-trust.md > 5. Evaluating KERI: Real Tradeoffs, Honestly Stated) This holds even when all actors behave correctly. Correct, and not insecurity, because "KERI's security model is evidence-based rather than proof-based" (dg-c04-claude.md > 5.1 Conflating Unprovability with Insecurity); the alternative is "an identity you cannot recover from compromise without involving a trusted third party" (same).

#### DG-C05, mitigation through governance and monitoring {#dg-c05}

Mitigation "likely requires governance, monitoring, or centralized archival services (e.g., a 'super watcher'), which introduce additional trust assumptions." (A8-A11) Faithful: survivability properties "emerge from system composition (protocol + observers + governance), not protocol alone." (dg-c05-claude.md > 6. Net Effect on Security Interpretation) The additional assumptions are mostly operational, except the super watcher, which is genuine centralization: "This works, but it reintroduces a centralized trust dependency that KERI was designed to avoid." (cr-ad-trust.md > 5. Evaluating KERI: Real Tradeoffs, Honestly Stated)

#### DG-C06, narrow scope and strong assumptions {#dg-c06}

The strongest proofs hold only for honest controllers, bounded witness faults, reliable communication and uncompromised rotation keys. Faithful about the proofs, misleading if read as "KERI requires honest controllers": observers are "explicitly excluded from Del Giudice's formal analysis" (background.md > 8.3 Explicit Omissions Relative to the KERI Specification) yet central to the model, and honest-controller is "a proof technique assumption... not a KERI deployment assumption." (dg-c06-claude.md > 5. Logical or Analytical Errors)

#### The thesis's declared scope and terms {#dg-scope}

The thesis puts "Delegation and multisignature controllers declared out of scope" and assumes non-transferable witnesses (background.md > 8.1 Declared Scope and Modeling Choices in the Thesis, L1075-1084), so no Del Giudice result can be cited for a delegated or multisig identifier. Its terms map onto the model as follows, a mapping that "should be applied before comparative or critical analysis." (background.md > 8.4 Terminology Normalization, L1303)

| Thesis term | Model mapping |
|---|---|
| Consistency | P2 (Section 5.6) |
| Safety | Cryptographic validity (Section 7.5.1) |
| Liveness | Controller progress (Section 7.5.2) |
| Agreement | Witness-scoped agreement (Section 5) |
| Eventual consistency | Eventual awareness (Section 7.4.3) |

The section numbers are background.md's. Consistency maps to P2 here and to view-relative in [section 10](#consensus-terms) because this table maps the thesis's specific witness-level use of the word; do not flatten them. Calling KERI eventually consistent claims more than it provides.

## 12. What is established, what is contested, and the load-bearing assumptions {#established-contested}

### Established {#established}

Uncontested across the analysis, papers, specification and implementation knowledge base: the survivability objective; detection over prevention; duplicity-evidence; the zero-trust stance and the malicious-controller non-goal; the pre-rotation firewall and its current-versus-next-key asymmetry; KAWA's P1-P4 and non-properties P5-P8; local, observer-dependent validity and permissible permanent divergence; and that observers increase visibility, not control.

#### Contested or genuinely limiting {#contested}

One class of criticism survives objective-function alignment, and it is not about the protocol: detection depends on an optional, immature observer and governance layer (DG-C02's residual and DG-C05). The super watcher relieves coverage gaps and reintroduces centralization. The formal literature is thin: its strongest analysis is a non-peer-reviewed thesis that excludes the observer layer (wtbo.md > 5. Evaluating KERI: Real Tradeoffs, Honestly Stated; background.md > 8.3 Explicit Omissions Relative to the KERI Specification). The corpus calls these "constraints of immaturity, not of architecture." (cr-ad-trust.md > 6. The Transition Problem: A Comparison of Trajectories)

#### A companion problem about evidence standards {#evidence-standards}

A structured adversarial pass by AI personas attacks one's own assumptions and reads like peer review without being it. An author in this corpus retracted such a claim about his own paper: those reviews were "conducted by AI models prompted to argue from a named lens, not by human domain experts", and "They are a structured way to attack one's own assumptions, not independent validation" (m-glance.md > 1. Introduction, L71-74 @181569b64). The six DG analyses (`dg-c01-claude.md` and siblings) are model-authored, so their verdicts are a structured self-attack on the thesis, with evidentiary weight below the thesis itself. They are the corpus's most careful reading of Del Giudice, not a second opinion.

#### Assumptions never to grant for free {#never-grant}

A3 (honest controller, a proof convenience); A5 (observer presence, never silently assumed); A7 (M > f); and A8-A11, none enforced by KERI. A low threshold is breakable only with the controller's keys in play, because two signed and witnessed versions can exist only if "the keys of the event's controller have been compromised by an attacker or the controller itself acted duplicitously" (KERI spec, L51). A claim that duplicity will be detected, promptly detected or automatically resolved smuggles these in and contradicts P5-P8; a claim of a single global truth for an identifier contradicts local validity.

## 13. Where KERI corrects the outsider's prior {#outsider-priors}

These review reflexes are category errors in this chapter's terms; the tells and reframings live in [chapter 07, section 7](07-shibboleths-and-anti-patterns.md#invulnerability-tells).

- Security means preventing all forks — KERI is survivability-oriented ([section 1](#survivability)).
- KERI needs a blockchain or global ordering — an explicit non-goal (background.md > 1.3 Explicit Non-Goals); local order suffices ([section 7](#microledgers)).
- A witness threshold gives global safety — "Agreement thresholds do not imply global safety." (background.md > 4.7 Analytical Implications)
- Validators converge, or KERI is eventually consistent — permanent divergence is allowed and eventual awareness is not guaranteed ([section 10](#local-validity)).
- A proof assuming an honest controller means insecurity against a dishonest one — dishonesty triggers detection, not failure ([section 11](#dg-c06)).
- Unprovable uniqueness means broken — recovery trades provable uniqueness for recoverability without a trusted third party ([section 11](#dg-c04)).

The analysis template forces the analyst to name the objective first and to restate a claim exactly: "you MUST restate the claim verbatim... If you cannot do so, stop and ask." (standard-analysis.md > 0. Objective-Function Alignment) A reviewer who cannot say which objective a criticism assumes is not ready to make it.

## Sources {#sources}

- background.md — KERI: Canonical Background for Security Analysis (v0), part of the keri-security-analysis corpus. WebOfTrust/keri-security-analysis, background.md, @149fa6c35 (2026-04-23), the repository's only commit. The main source: the assumption catalog A1-A13, KAWA P1-P8, the survivability framing, the threat surfaces and the DG-C01..C06 claim catalog. Mined in raw/07, sections 4.3, 4.4, 5-5.2, 6.7-6.9, 7.2-7.7, 8.1 and 8.4 in raw/07 section 13.
- CESR spec — Composable Event Streaming Representation (CESR) specification, Trust Over IP. trustoverip/kswg-cesr-specification, spec/spec-body.md, v1.1 @65fd7518b (2026-08-26), the forward branch; binds nobody. Mined in raw/02.
- cr-ad-trust.md — Cryptographic vs. Administrative Trust: KERI's Witness/Watcher Architecture and X.509 Certificate Transparency, keri-security-analysis corpus. WebOfTrust/keri-security-analysis, cr-ad-trust.md, @149fa6c35 (2026-04-23). Mined in raw/07.
- DECENTRALIZATION-PURITY-STEERING.md — human steering note at this repository's root, cited for the microledgers framing in [section 7](#microledgers). Not a mined source.
- Del Giudice thesis — A Security Analysis of KERI, Daniele Del Giudice, ETH Zurich Master's thesis, 2025, not peer-reviewed. Del_Giudice_Daniele.pdf in WebOfTrust/keri-security-analysis @149fa6c35, cited only as quoted in background.md section 8.2. Mined in raw/07.
- dg-c01-claude.md to dg-c06-claude.md — model-authored analyses of claims DG-C01 to DG-C06, keri-security-analysis corpus, @149fa6c35 (2026-04-23); a structured self-attack on the thesis, not an independent check ([section 12](#evidence-standards)). dg-c0X-claude.md means their common section 7. Mined in raw/07.
- Duplicity Game — slides by Samuel M. Smith for IIW Spring 2020. SmithSamuelM/Papers, presentations/DuplicityGame_IIW_2020_A.pdf, master @b47f21597 (2026-08-11). Read through pdftotext, so quoted slide lines have their layout breaks joined; Sam's framing, not an argued result. Mined in raw/20 section 8.
- keri-primer.md — A Primer on KERI, ACDCs, and CESR, Daniel Hardman. dhh1128/papers, keri-primer.md, @181569b64 (2026-09-15). Mined in raw/05 and raw/06.
- KERI spec — Key Event Receipt Infrastructure (KERI) specification, Trust Over IP. trustoverip/kswg-keri-specification, spec/spec-body.md and spec/termdefs.md, main @fbdd4a615 (2026-08-28). Mined in raw/01.
- keripy — the KERI reference implementation, WebOfTrust. WebOfTrust/keripy, main @b8f60166b (2026-09-14, `__version__` `2.1.0-dev1`). Mined in raw/09.
- keripy GitHub — Sam Smith's comments in WebOfTrust/keripy: issue #1559 (2026-07-31, R-008) and pull request #1580 (2026-08-07, R-021), read from the API cache of 2026-10-14 (`.ignored/sam-rulings-cache/`). [proposal]. Mined in raw/21.
- keripy-knowledge — an unpublished contributor knowledge base on keripy (`00-lens.md`, `30-invariants.md`). The `knowledge` branch of a keripy fork, @9489ac9bd (2026-07-02), whose code baseline is keripy `60ab9e08d`; behavior claims are anchored separately at the keripy pin. `00-lens.md` is a draft distillation of background.md and the papers, so its claims carry no weight their sources do not. Mined in raw/08.
- kspqs.md — KERI's Strategy for Post-Quantum Security, v1.2, Daniel Hardman. dhh1128/papers, kspqs.md, @181569b64 (2026-09-15). Mined in raw/05.
- m-glance.md — Measuring the Glance, v1.3, Daniel Hardman. dhh1128/papers, m-glance.md, @181569b64 (2026-09-15). Not about KERI; cited only in [section 12](#evidence-standards). Mined in raw/06.
- origin-platform — Provenant's Origin platform documentation [practice]. provenant-dev/origin-platform, docs/origin-security.md, main @cb758b1b5 (2026-08-26). One deployment's evidence, never normative; where it assigns duplicity detection to witnesses, this chapter follows KERI. Mined in raw/12.
- standard-analysis.md — Standard Analysis Template for KERI Security Claims, keri-security-analysis corpus. WebOfTrust/keri-security-analysis, standard-analysis.md, @149fa6c35 (2026-04-23). Mined in raw/07.
- WebOfTrust/kids#1 — an unmerged 2023 pull request proposing a KID on super watchers, with comments by Samuel M. Smith (2023-11-05, https://github.com/WebOfTrust/kids/pull/1#issuecomment-1793816692) and Philip Feairheller (2023-11-06, https://github.com/WebOfTrust/kids/pull/1#issuecomment-1794022044). The source puts "super" in double quotes where the chapter uses single. [proposal]. Not mined in a raw note.
- wtbo.md — Where Trust Bottoms Out: X.509, Certificate Transparency, and KERI's DPKI Architecture, v1.8, Daniel Hardman. dhh1128/papers, wtbo.md, @181569b64 (2026-09-15). Its section 4 is the citation of record for the strength of pre-rotation. Mined in raw/05.
