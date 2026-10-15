# 13 — Authority, Authorization and Agents {#authority}

## Thesis {#thesis}

KERI carries authority as it carries everything else: as data whose authenticity a stranger can check from the data and key state alone. A targeted ACDC is the vehicle. Its Issuer conveys authority to its Issuee, the Issuee may issue the next ACDC, and the chain of issuer-to-issuee credentials, each anchored in its Issuer's KEL, is the authority. The party asked to honor an act walks that chain itself; no identity provider, token service or authorization server stands between them. That much is specification text. On it Sam Smith has built, in 2026, Edge Verifiable Access Control (EVAC), which turns ACDCs into access grants; a cure for broken delegation chains, in three parts of which one is specified; a revocation doctrine explaining why bare signatures pushed the industry into federation; and an account of AI agents whose content is that agents need nothing new, because an agent is a delegate.

Three claims organize the chapter. Two operations share the word delegation: delegating an identifier is a KEL operation ([chapter 03, section 8](03-key-management-and-identifier-lifecycle.md#delegation)), delegating authority is an ACDC chain, and a review that confuses them looks for guarantees in the wrong log. Authority that must be revocable must be read at verification time, and that is not a phone-home: the line falls between fetching state the verifier checks against key state and asking a service for a verdict ([section 5](#state-not-verdict)). And an AI agent is a delegate with its own identifier, acting under authority an accountable party granted and can revoke; everything else said about agents is advocacy, carried as Sam's assessment.

## Status {#status}

Most of this chapter is [proposal]. The normative floor is narrow and all in the ACDC specification's standardizing line: the targeted ACDC as a vehicle for authorization, the chain of authority, attenuation, and the bound blinded attribute block ([section 1](#normative-floor), [section 6](#broken-chains)). The bound block's structure is also [code] in keripy at `80f77b73b`, and nothing there uses it to judge a downstream issuance.

Above the floor sit EVAC, reversion of authority, the registry transfer event, the revocation doctrine of Sam's June 2026 white paper, group issuance, the agent pattern, and the shape-of-authority model in Daniel Hardman's `sda.md`. Several sources are slide decks, quoted by page from extracted text with damaged ligatures, and conference captions, quoted only as the captions read, for intent and framing. The applied patterns of [section 11](#applied-patterns) are spoken vendor and demonstration claims with no code read. The documents the AI material in [section 9](#agents) responds to, a Five Eyes statement and an OWASP report, were not read.

## 1. The normative floor: a targeted ACDC conveys authority {#normative-floor}

[spec] In a targeted ACDC, "the Issuer MAY use the ACDC as a contractual vehicle for conveying authorization to the Issuee." (ACDC spec > Top-level ACDC Sections > Attribute Section > Attribute Section Variants > Targeted Attribute Section, L324). The same paragraph states chain and attenuation: "an Issuer MAY delegate authority to an Issuee who MAY then become a verifiably authorized Issuer" who may pass on "that authority (or attenuation of that authority)" (L324), and the edge section names the pattern: "A common use case of a chain-of-authority is a delegation chain for authorization." (ACDC spec > Top-level ACDC Sections > Edge Section > Edge > Operator, `o` field, L1203). Both are unchanged in substance on `v1.1` @`2362e48a1` (L335, L1215).

[spec] The converse guards against a common misreading. An untargeted ACDC is "not authentic data as an authorization or entitlement to a specified party" (ACDC spec > Top-level ACDC Sections > Attribute Section > Attribute Section Variants > Untargeted Attribute Section, L334). An untargeted chain carries provenance, not authority, and authority inferred from an untargeted credential is a defect.

### What the floor gives a verifier {#floor-guarantees}

Each link is attributable to its Issuer's key state at the anchor, so a later rotation does not invalidate the chain, provided anchors are verified as of their position in each Issuer's log ([chapter 03, section 11](03-key-management-and-identifier-lifecycle.md#as-of-anchor)). Each link is revocable by its own Issuer, and revocation propagates downward: keripy raises `RevokedChainError` on a revoked far node ([chapter 05, section 5.1](05-acdc-and-verifiable-data.md#chain-revocation)). Each link's edge operator names how the near Issuer must relate to the far Issuee; `I2I` is the delegative case ([chapter 05, section 5](05-acdc-and-verifiable-data.md#edges)).

The floor does not say how a verifier decides whether an attenuated grant covers a requested act; rules are not machine-enforced ([chapter 05, section 6](05-acdc-and-verifiable-data.md#rules)), and edge operators check relations between adjacent nodes, not multi-hop authority ([chapter 07, section 10.5](07-shibboleths-and-anti-patterns.md#edge-operators)). Nor does it settle what happens to an issuance by a delegate whose grant is later revoked. Sam's overview deck hedges: revoking a link "breaks the chain and thereby may invalidate any authorizations or attestations that are chained from their credential." (AlphaOmega deck, p48). That "may" is the problem [section 6](#broken-chains) addresses.

### The vLEI as the deployed instance {#vlei-instance}

[architect] The vLEI chain (GLEIF, Qualified vLEI Issuer, Legal Entity, role credentials) is the deployed instance: "Anyone in the chain-of-authority can revoke the credential issued-by them." (AlphaOmega deck, p48). The 2025 deck's property set, "This provides TADAAA! (tail authenticated, delegated, attenuable, aggregable authorization)" (AlphaOmega deck, p30), became in 2026 "Delegable Attenuable Aggrable Revocable Transferable Authority" (EVAC deck, p3). The two added properties are what the proposals of [section 6](#broken-chains) exist to deliver, which is compact evidence that they are new design.

## 2. Two delegations, one word {#two-delegations}

### Delegating an identifier {#identifier-delegation}

[architect] KEL delegation creates an AID whose inception is approved by a seal in its delegator's log. It is cooperative, and it bounds what compromising either party alone gains ([chapter 03, section 8](03-key-management-and-identifier-lifecycle.md#joint-compromise)). It conveys control, not scope. The 2022 DAD deck draws the distinction the 2026 registry proposals extend: "Delegation of identifier (revokable). This creates a new identifier with its own set of keys" as against "Transfer of control (non-revokable)." (DAD deck, p10).

### Delegating authority {#authority-delegation}

[practice] An ACDC chain conveys a scope and needs no KEL delegation: "Delegated AIDs should work without there being an ACDC." ([chapter 03, section 8](03-key-management-and-identifier-lifecycle.md#delegation-trait-rulings), R-013), and the reverse holds in practice. The Utah SEDI fixture's "delegation chain" uses plain `incept` throughout and joins credentials by `I2I` edges ([chapter 05, section 11](05-acdc-and-verifiable-data.md#utah-delegation-chain)), and Bakobo's GCD schema treats KEL delegation as an exemplar of delegated authority, not a precondition ([chapter 05, section 11](05-acdc-and-verifiable-data.md#gcd)).

### Where the two meet {#delegation-composition}

- `DI2I` lets the near Issuer be the far Issuee or any AID delegated from it, at any depth, bounded by inception-time traits rather than the operator ([chapter 05, section 5](05-acdc-and-verifiable-data.md#di2i-depth)). keripy at `80f77b73b` fails `DI2I` closed. [proposal], [code]
- `DND` limits authority by construction: "a delegate configured never to sub-delegate produces no sub-delegation any verifier will honor" (sda.md > 7. Open loop, not closed, L121). keripy drops the forbidden event in key-state validation ([chapter 03, section 8](03-key-management-and-identifier-lifecycle.md#delegation-enforcement)). [spec], [code]
- `DID` asserts delegator and delegate are one controller, so reputation can cross; what a relying party does with that is left to it and its governance ([chapter 03, section 8](03-key-management-and-identifier-lifecycle.md#did-effect-unspecified)). [spec], with the consequence [proposal]

A design that says "delegation" must say which. One relying on KEL delegation for scope finds no scope in the KEL; one relying on an ACDC chain for the joint-compromise property does not get it, because an ACDC's Issuee can be any AID.

## 3. Lossless trust transfer, and the attack it is meant to remove {#trust-domains}

[architect] The EVAC deck sets "perpetual identity → perpetual issuances → lossless trust transfer (KERI Suite)" against "ephemeral identity → ephemeral issuances → lossy trust transfer (DNS/CA, OAuth/OIDC)" (EVAC deck, p4), concluding "ACDC lossless conveyor of trust → bridging ephemeral trust domains" (p4). Intermediaries disappear because "With KERI, each AID controller is its own identity provider" (EVAC deck, p5).

### Recursive privilege escalation {#rpea}

[architect] The deck says ACDC bridging "eliminates" the recursive privilege escalation attack (RPEA) (EVAC deck, p4). The argument is spoken: systems that cannot bridge trust domains enlarge them, "And that means now that you can do recursive privilege escalation" (KERIConf26 caption, Samuel Smith, The Future of KERI, 03:39). The idea predates the name: "Any mechanism that allows for lower priviledged users to access a network layer provides an attack vector for that user to elevate their priviledges" (ManyCubed.md > The Many-to-Many-to-Many Problem > Security, L26). No written source defines RPEA formally, so treat it as Sam's name for a class of attack, not a threat model with a stated adversary. The word "eliminates" is an assessment: mutual authentication at every edge removes the foothold only where every hop verifies, and a deployment that verifies at the boundary and trusts inside has the old perimeter back ([chapter 07, section 5.1](07-shibboleths-and-anti-patterns.md#authn-before-authz)).

### Legacy servers may stay, on one condition {#legacy-condition}

[architect], caption only. Sam tolerates OAuth inside its own domain: "You got to have an OAuth server. Fine, Leave it in there. But don't use it to expand its trust domain." (KERIConf26 caption, Samuel Smith, The Future of KERI, 06:37), with the bridging done in KERI and ACDCs (06:43). No written source carries this conditional tolerance. It is the test [section 11](#applied-patterns) applies to the OAuth bridge, and the reading this chapter gives the categorical rejection of tokens in [chapter 07, section 5.2](07-shibboleths-and-anti-patterns.md#bearer-tokens): what is rejected is the bearer secret and the identity provider as root of trust, not every component called a token server.

## 4. EVAC: edge verifiable access control {#evac}

### The rule and the mechanism {#evac-rule}

[proposal] "Authorization to access a resource is granted by the resource's controller (authority)" (EVAC deck, p6), any Issuer in the graph may be both authority and edge, and "Mutually authenticated edge (accessor) and authority prevent impersonation attacks" (p6). A grant is an ordinary ACDC whose attribute block holds "SAID UUID Issuee AID Registry Resource Map", rows pairing a route with a capability set, and the "Attribute section could convey a policy engine rule set" (EVAC deck, p14). Two registries back it: the Issuer's ordinary blindable registry, published by a Registrar and cached by the verifier's Observer (p15), and the Issuee's usage registry, in which each presentation is anchored (p16). EVAC adds no registry type; it composes the Issuer's state registry of [chapter 05, section 9](05-acdc-and-verifiable-data.md#registries) with the Issuee usage registry of [chapter 10](10-presentation-registries.md#asymmetry).

Sam says in the talk that the attribute block's `Registry` field is already in the specification (KERIConf26 caption, Samuel Smith, The Future of KERI, 11:55). That is partly supported: the specification permits an `rd` inside `a`, but because it "may better facilitate contractually protected disclosure of the bulk-issued registry" (ACDC spec > Top-level ACDC Sections > Attribute Section > Attribute Section Variants > Targeted Attribute Section, L326). Its use as an Issuee usage registry is keripy behavior and proposal ([chapter 10, section 7](10-presentation-registries.md#keripy-verifier)).

### Who enforces {#evac-enforcement}

[architect], caption only. Nothing written says how a verifier evaluates a resource map. Asked about least privilege, Sam put enforcement with the verifier or "a policy engine that the verifier asks to enforce it for them." (KERIConf26 caption, Samuel Smith, The Future of KERI, 49:41). Whether that engine is the verifier's own component or an outside service decides which side of [section 5](#state-not-verdict)'s line it falls on.

### Where it stands {#evac-status}

[proposal] EVAC is in neither ACDC branch and not in keripy at `80f77b73b`. Sam, in August 2026: "I started an EVAC white paper but have yet to publish it." ([keripy conversations > discussion #1550](https://github.com/WebOfTrust/keripy/discussions/1550#discussioncomment-17909785), comment of 2026-08-05).

## 5. Verification-time state: fetching state versus asking for a verdict {#state-not-verdict}

### The tension {#state-tension}

[chapter 07, section 3.2](07-shibboleths-and-anti-patterns.md#status-endpoint) carries as a shibboleth Daniel Hardman's rule: "A registry consulted at verification time is a phone-home in disguise." (sda.md > 7. Open loop, not closed, L119). But revocable authority cannot be honored without reading its state. EVAC's verifier reads two registries (EVAC deck, p15, p16); the ACDC specification puts a registry read at validation, "A validator queries its Observer, not the Registrar, at a point of validation (PoV) for an ACDC." (ACDC spec > Disclosure Mechanisms and Exploitation Protection > TEL Registrars and TEL Observers, L1693); and `sda.md`'s own section 8 relies on "revocation is real-time, so a grant whose justification has lapsed can be ended before its next use" (sda.md > 8. What is settled, and what is open, L129). Read literally, the section 7 sentence forbids what section 8 depends on.

### The resolution {#state-resolution}

End-verifiability allows a service to supply what a verifier needs, so long as the verifier checks it; it forbids verification that needs a service's answer rather than its data ([chapter 01, section 4](01-foundations-and-worldview.md#end-verifiability)). Applied to registries, the distinction has three parts.

#### What comes back: data the verifier checks, or an answer it must believe {#what-comes-back}

The phone-home KERI rejects is the one Sam names as the origin of federation: with bare-signature credentials, "the party who is presented with an issuance, no longer verifies the signature directly but asks the issuer to verify on its behalf." (Revocation.md > Proofing Mechanism Tradespace, L76). What comes back is a verdict the relying party can only trust. A TEL read differs in kind, because "Any Validator can cryptographically verify the authoritative state of the transaction by validating the presence of the seal in the associated KEL." (ACDC spec > Transaction event logs (TELs) as ACDC state registries > Validating transaction events, L1946), so the source of the bytes does not matter, as with KELs served by witnesses ([chapter 02, section 9](02-security-model-and-threat-posture.md#observer-layer)). For blinded state the verifier recomputes the commitment: keripy rejects a disclosed block that "does not reproduce blid, so it proves nothing about the registry's state" (keripy acdc/regeventing.py, vetBlind, L460 @80f77b73b). [spec], [code]

#### Who learns that verification happened {#who-learns}

[spec] Checkable state can still leak: a verifier reading the Issuer's Registrar per presentation tells the Issuer where and when its credential was used. The specification puts the Observer under the verifier's control and syncs it on state change, "not when there is a PoV" (ACDC spec > Disclosure Mechanisms and Exploitation Protection > TEL Registrars and TEL Observers, L1693), which "protects against forced validator-to-issuer correlation of ACDC usage, i.e., no forced phone home validation." (L1693). Bulk updates close the residual timing channel ([chapter 05, section 9](05-acdc-and-verifiable-data.md#bulk-updates)). A design can fail either test alone: a status service returning a signed yes or no fails the first even if private, and a Registrar queried per presentation fails the second though its answer is verifiable.

#### How fresh the state must be {#freshness}

[spec] A cache may lag the Registrar, and the specification answers with policy, not a callback: "a revocation does not go into effect until a specified date and time after the state update." (ACDC spec > Disclosure Mechanisms and Exploitation Protection > TEL Registrars and TEL Observers, L1695). A verifier whose Observer syncs within the grace period sees every revocation before it takes effect. That is an assumption about synchronization latency, set by policy and proven by nothing; a verifier that cannot meet it must treat its cache as stale. It is a dependency on data availability, like every verifier's on KEL events, not on any party's honesty.

#### The rule, restated {#state-rule}

Verification may read state at verification time, from any source including its own cache, provided the verifier checks that state against key state itself and the read does not disclose the point of validation to the Issuer. It may never accept a service's answer in place of that check. This chapter reads `sda.md`'s sentence as aimed at the second case; its literal wording also forbids the first, and is stricter than KERI's registry design and than `sda.md`'s own section 8.

### Applying the rule {#state-applications}

Both EVAC registry reads pass, if both go through the verifier's Observer and are verified against the relevant KEL. The Issuee's usage registry is harder, since keripy at `80f77b73b` does not retrieve a foreign registry at all ([chapter 10, Status](10-presentation-registries.md#status)). [proposal]

An EVAC policy engine the verifier runs, on rules it can read, is the verifier deciding. An outside engine returning permit or deny is a verdict service, and passes only if its rule set is published and its result reproducible, which is `sda.md`'s open-loop condition: "any two verifiers compute the same gate from the same credential" (sda.md > 7. Open loop, not closed, L117). [proposal]

An OAuth resource server that validates a token by introspection is receiving a verdict; whether the healthKERI bridge works that way is open ([section 11](#healthkeri-reading)). Cole Davis's simulated smart lock illustrates the permitted case: on a revocation in the lessor's TEL, "the smart lock just walks the cryptographic operations all the way back" (KERIConf26 caption, Cole Davis, Contract Credentials and Verifiable Identity, 19:46); it was simulated, not built on the KERI stack (22:50).

## 6. Broken chains: bound state, reversion, transfer {#broken-chains}

### The problem {#broken-chain-problem}

"When a delegatee's authority to issue authorizations is revoked, what is the status of any authorizations/entitlements issued before the authority was revoked?" (EVAC deck, p17). Sam names the failure: dynamically revocable issuances "that become zombies if the delegating ACDC is revoked." ([keripy conversations > discussion #1082](https://github.com/WebOfTrust/keripy/discussions/1082#discussioncomment-16688843), comment of 2026-04-23, edited 2026-04-26, R-037). A downstream credential whose issuer lost its authority is still valid on its face, and nobody can revoke it. Three answers follow.

### Bound blinded state: specified {#bound-blinded-state}

[spec] The bound blinded attribute block adds `bn` and `bd` to the blinded state a registry update commits to, naming the Issuee's key event (sequence number and SAID) at the update, so a state change is bound to the Issuee's key state as well as the Issuer's. "The purpose of the bound blinded attribute block is to better support chains of authority using delegated chained ACDCs." (ACDC spec > Transaction event logs (TELs) as ACDC state registries > Registry Message Types and Fields > Bound Blinded Attribute Block, L2433; the same on `v1.1` at L2634). It proves a delegate "had an authorization to issue its own delegated ACDCs, which authorization had been issued but not yet been revoked" (L2433) when it anchored its own issuance.

Read from the specification and the deck's diagram (EVAC deck, p18): revoking a delegate's grant records the delegate's key state at revocation. A downstream issuance the delegate anchored between the key event bound at issuance and the one bound at revocation was made while the grant stood; one anchored later was not. The verifier compares positions in one log, the delegate's, which is the as-of-anchor reasoning of [chapter 03, section 11](03-key-management-and-identifier-lifecycle.md#as-of-anchor) applied across a chain: "Breaking the chain-of-authority while preserving validity of prior valid issuances" (EVAC deck, p18).

Two limits. Sam calls the binding "an assertion by the issuer of issuer's intent." ([keripy conversations > discussion #1566](https://github.com/WebOfTrust/keripy/discussions/1566#discussioncomment-17846317), comment of 2026-07-30, R-039), and it does not make surviving issuances revocable again, so in the talk he ties it to issuances that expire on their own, such as a food handler's permit (KERIConf26 caption, Samuel Smith, The Future of KERI, 40:02, 40:18). And no verifier implements the comparison. keripy at `80f77b73b` defines the structure, "bn = bound issuee key event hex sequence number bnh at time of state update" (keripy core/structing.py, L99 @80f77b73b), carries it as an IPEX proof and checks a block against its BLID, but a search of `src` finds no consumer of the bound fields outside `core/structing.py`; only tests read them. [code], negative by search

### Reversion of authority: proposed {#reversion}

[proposal] Reversion makes the zombies revocable by returning their registries to the delegator: "when the ACDC of the delegatee is revoked, authority over any down stream ACDC state reverts to the delegator (State)." ([keripy conversations > discussion #1082](https://github.com/WebOfTrust/keripy/discussions/1082#discussioncomment-16688843), comment of 2026-04-23, R-037), and the existing edge from delegate's grant to delegator's lets "a verifier can cryptographically verify and trace the reversion of authority triggered by a revocation." (same). In the talk it climbs any number of levels (KERIConf26 caption, Samuel Smith, The Future of KERI, 25:10), and "it's not written up in the spec but this is an easy modification of the spec" (22:27); the ease is his estimate. Neither ACDC branch nor keripy has it. Unspecified: which signatures a verifier accepts on a reverted registry's later updates, how it finds the triggering revocation, and what happens when the delegator is itself revoked. The deck's diagram (EVAC deck, p19) binds later updates to the delegator's key state, which suggests the first answer; no written rule says so.

### Registry transfer: approved, not specified {#transfer}

[proposal] Transfer hands a registry to a new controller: "Replace the controller of registry without reverting the authority to delegator" (EVAC deck, p20). The event's names (`rxr`, then `xfr`), its double anchoring and its approval for ACDC v1.1 are in [chapter 05, section 9](05-acdc-and-verifiable-data.md#registry-transfer); neither branch has it, nor does keripy. In the talk, transfer is issued after reversion, by the authority control reverted to (KERIConf26 caption, Samuel Smith, The Future of KERI, 27:26), and Sam bounded it: "This is reversion for a hierarchy of authorizations and delegation, not a replacement for asset transfer." (38:46).

#### A written source that overstates the status {#transfer-drift}

Sam's June 2026 revocation paper says registry control "can be transferred via a transfer event in the registry." (Revocation.md > Proofing Mechanism Tradespace > Proofing Applied to Revocation Registries, L118). The registry event tables on both branches list `rip`, `bup` and `upd` and nothing else. Read the sentence as an informal paper describing a planned event in the present tense.

## 7. Why authority must be revocable, and anchored {#revocation-doctrine}

[proposal] Sam's revocation white paper (self-versioned V0.4, June 2026) is framed for SEDI, but its argument is about authority, and it explains why the anchoring doctrine of [chapter 05, section 9](05-acdc-and-verifiable-data.md#key-state-binding) is an authorization requirement.

### Long-lived entitlements must be revocable {#must-be-revocable}

"Therefore, with rare exception, if any, as a matter of policy, if not law, all state issuances MUST be revocable." (Revocation.md > Revocability Properties, L35). Short lifetimes do not escape this when reissuance is automatic, because the reissued series is itself a long-lived entitlement (L27). If authority must be revocable, it must be read at verification time, and [section 5](#state-not-verdict) is not optional.

### Bare signatures force revocation, and federation followed {#signatures-force-revocation}

"when the authenticity proofing mechanism is a bare attached digital signature, all issuances must be revocable, and are forceably revoked whenever the keys are rotated." (Revocation.md > Proofing Mechanism Tradespace, L70). Hiding the constant reissuance behind issuer-side verification "is the driver behind the architecture of federated identity systems such as OAuth/OIDC" (L76), a causal account [chapter 07, section 5.4](07-shibboleths-and-anti-patterns.md#federation) lacks. Anchoring removes the cause: "Issuances themselves are not individually signed; a hash of the issuance is anchored in the log." (L94). A delegate's authority anchored this way survives every party's rotations.

### One registry per issuance {#registry-per-issuance}

Against bitstring status lists the paper argues governance: a bitstring "encodes the status of all issuances into a single data structure. This co-mingles the governance." (Revocation.md > Proofing Mechanism Tradespace, L106). "ACDCs are not signed; they are bound (anchored) to a registry, which in turn is bound (anchored) to a KEL." (L114). Per-issuance registries are what make reversion and transfer possible per grant; a bulk-issued set revokes all or nothing ([chapter 05, section 9](05-acdc-and-verifiable-data.md#bulk-revocation), [chapter 07, section 3.4](07-shibboleths-and-anti-patterns.md#bulk-copy-revocation)).

### The claims an outsider will contest {#contested-revocation-claims}

These are Sam's assessments. "Therefore, unlinkability is largely an exercise in privacy theater." (Revocation.md > Tradespace of Proofing mechanisms, L190), though he keeps it as an adoption requirement in the same paragraph. "So revocation requirements alone obviate one of the main reasons to use anonymous signatures as a proofing mechanism." (L192). Accumulator-based revocation is dismissed without citation: "These have proven to be impractical for performance reasons." (L192). A reviewer may contest these on their merits. The doctrine's position on unlinkability as one tool among several is in [chapter 06, section 4](06-governance-ecosystems-and-interop.md#layered-privacy).

## 8. Group authority: membership, anchoring and joint issuance {#group-authority}

[proposal] KERI's group issuance white paper (KAGI, February 2025) supplies three answers.

Membership is private unless declared: "the KEL does not publicize the single-sig member AIDs that contribute to a group multi-sig AID." (KAGI > Background > Group Multi-Sig AID, L61). A group that must disclose its members does so "for the group multi-sig AID to issue an ACDC that discloses its member AIDs at the time of its issuance" (L65), reissuing when membership changes; multisig encodes a decision rule, not membership ([chapter 03, section 7](03-key-management-and-identifier-lifecycle.md#multisig)).

Anchoring is an access-control cost: "perimeter protection mechanisms now have to walk KELs to look up and find anchors" (KAGI > Background > KEL Sealed (Anchored) Issuances, L183). A design that verifies anchored grants at a load balancer pays that per request unless it caches key state, which KRAM's monotonic caches do ([chapter 09, section 3](09-kram-and-request-authentication.md#full-kram)).

Joint issuance is a threshold root: "Joint issuance is a new concept." (KAGI > Problems and Solutions > Other Options > Joint Issued ACDCs, L281). Each member issues and anchors its own copy, and a validator requires a threshold of identical copies. `sda.md` names it as the root of an authority chain: it "lets a grant be satisfied by a weighted threshold of endorsements, each owner signing from their own identifier, asynchronously and with no shared key." (sda.md > 8. What is settled, and what is open, L127). Whether the Dossier specification makes joint issuance normative was not checked.

## 9. Agents are delegates {#agents}

### The doctrine {#agents-doctrine}

[architect] The EVAC deck's agentic slide: "Agent has its own AID", "ACDC mechanisms are the same for AI, person, or entity agents." and "Multi-sig enables thresholded group agents" (EVAC deck, p7), retitling the acronym Edge Verifiable Agentic Control. In the talk the agent's identifier is delegated, "You just give the agent an AID, a delegated AID, right?" (KERIConf26 caption, Samuel Smith, The Future of KERI, 41:50), and "The ACDC mechanisms are exactly the same. They don't change." (42:03).

So an AI agent is a delegate in both senses of [section 2](#two-delegations): an identifier of its own, typically delegated so its establishment events need the principal's approval, and authority conveyed by a targeted ACDC, scoped, revocable and anchored, with depth limited by `DND` and by the chain of grants (KERIConf26 caption, Samuel Smith, The Future of KERI, 43:12). Nothing in the protocol distinguishes a software agent from a human one. The slide floats a disclosed attribute for the difference, "Maybe regulations should require attributes that indicate the type of agent. (AI vs person)" (EVAC deck, p7), a governance suggestion, not a protocol requirement.

### The same pattern a year earlier {#agents-kagi}

[proposal] KAGI proposed delegated agents to spare a multisig group from signing each IPEX stage: "Avoid multi-sig on each stage of IPEX by using a delegated agent" (KAGI > Problems and Solutions > Other Options > Agent Delegated Negotiation, L256). Its safety rule binds the group only through an anchored grant: "Agent-issued `agree` for one side and `grant` for the other are valid only if they include a verifiable reference to a corresponding anchored ACDC." (L257). The driver applies directly to AI agents: "Validation (which includes business logic and cryptographic verification) may be largely automatable, whereas signing requires human intervention." (KAGI > Problems and Solutions > Other Options, L250).

### The word agent already means a delegate in KERIA {#keria-agent}

The KERIA cloud agent is a delegated AID whose delegator is the controller's client AID, and it never holds the controller's signing keys ([chapter 03, section 12](03-key-management-and-identifier-lifecycle.md#two-aid-spine)). That is the shape the AI doctrine proposes, so the custody rule applies to AI agents without amendment ([chapter 07, section 5.3](07-shibboleths-and-anti-patterns.md#custodial-cloud)): an AI agent given its principal's keys, or a bearer secret, has been given control, not authority. KERIA's agent relays and stores while an AI agent acts, but the security rule is one.

### Containment by construction {#agent-containment}

[proposal] `sda.md` adds a pattern for orchestrators: "Give a powerful orchestrator broad authority to authorize but an empty act surface, and its blast radius on compromise collapses" (sda.md > 5. The relationship the act is performed under, L93). Under KERI, the orchestrator holds grants it may re-issue in attenuated form but none any resource honors directly, so its compromise yields only the power to propose further delegations, each checked. No deployment is known to do this.

### What remains a judgment {#agent-judgment}

KERI proves which keys signed, not that the signer meant it ([chapter 07, section 9](07-shibboleths-and-anti-patterns.md#signature-authorship)), and for an AI agent the gap between an authorized act and a faithful one is that gap: "Sincerity stays gate-able and auditable, never provable." (sda.md > 8. What is settled, and what is open, L131). The corpus also holds that verification may be automated and reliance may not ([chapter 07, section 9.3](07-shibboleths-and-anti-patterns.md#automated-trust)). An AI agent relying on credentials for its principal is automated reliance, and whether a scoped, revocable grant to do so satisfies the rule or breaks it is open.

### The KERI-or-surveillance thesis, as Sam's assessment {#surveillance-thesis}

[architect] Sam's AI deck, a list of questions prompted by a Five Eyes statement, contrasts AI-based identity, a "Digital persona derived from the continuous tracking & statistical correlation of one's behavior and biometric expression." (AI deck, p5), with a KERI-based alternative, and asks rather than asserts that there is no middle ground: "Why do you believe there may be no stable middle ground between these two futures?" (AI deck, p18). The revocation paper echoes it: AI and aggregators act "as super correlators to defeat any and all technical attempts at digital anonymity." (Revocation.md > Digital Identity System Goals > Privacy, L172), leaving legal recourse as the remaining protection.

The dichotomy is argued, not demonstrated, and it does not engage the strongest objection, that most deployments will run cryptographic identity for authority plus behavioral fraud detection. Sam once proposed behavioral AI as an authorization input inside one's own infrastructure: "Dynamic policy modification that uses AI to first profile and detect anamalous behavior and then restrict the authorization of that user prevents discovery." (ManyCubed.md > The Many-to-Many-to-Many Problem > Security, L40). Profiling inside one's perimeter is not behavioral identity across society, so this is a boundary the thesis leaves implicit, not a contradiction.

## 10. What a grant should contain: one proposal {#grant-shape}

[proposal] KERI carries a grant without saying what it should express; EVAC's resource map is a route plus capabilities. `sda.md` (Daniel Hardman, version 1.2, July 2026) is the one source that models the content of authority, with KERI and ACDC as its identity layer. It is an authored position, not community doctrine, and its author owns this corpus. Its additions over a capability list:

- Acts are located by effect over a kind of state, not by route, so a grant can bound everything a delegate might do. Bakobo's GCD schema implements this grid ([chapter 05, section 11](05-acdc-and-verifiable-data.md#gcd)). [practice]
- A relationship facet names principal, relationship type, liable party and presented identity, because "Beneficiary, actor, and liable party can be three different parties" (sda.md > 5. The relationship the act is performed under, L89).
- Authority to act is separate from authority to authorize, which yields [section 9](#agent-containment)'s containment pattern.
- Open-loop verification forces full disclosure of every constraint, since a stranger "cannot ask the issuer what was meant" (sda.md > 7. Open loop, not closed, L117), so GCD does not support graduated disclosure of its constraints.

### Standing authority {#standing-authority}

`sda.md` concedes the common objection to delegation credentials, that a persistent grant "is granted once and weighed against the conditions that held at issuance, not those that hold at the moment an act takes effect." (sda.md > 8. What is settled, and what is open, L129). Its answer is a gate recomputed per act at the execution boundary plus real-time revocation, and it rejects per-act minting of authority as the closed loop in other dress. Termination on completion stays open. This is the strongest framing of why EVAC needs dynamic revocation and why [section 6](#broken-chains) matters.

## 11. Applied patterns and bridges {#applied-patterns}

[practice], caption only. Every pattern here is a spoken claim at KERIConf26, unchecked against code: evidence of how the doctrine is applied, not of what it requires.

### An ACDC-backed OAuth authorization server {#healthkeri-bridge}

Phil Feairheller described healthKERI's authorization server for FHIR, where OAuth is mandated. A client registers by presenting a vLEI through IPEX, its client identifier becomes the credential's SAID, and "there's no client secret. Every token request from here on out is a signed request." (KERIConf26 caption, Phil Feairheller, ACDCs for Authorization, 13:25). A local watcher sidecar tracks key state (22:14), and the server is configured by trusted schemas and root issuers (25:33). A KERI-native gateway found no adopters, so the company is "meeting the customer where they are" (07:27).

#### Reading it against the doctrine {#healthkeri-reading}

The bridge removes what [chapter 07, section 5.2](07-shibboleths-and-anti-patterns.md#bearer-tokens) objects to, the shared client secret and the identity provider as root of trust, and it meets Sam's condition in [section 3](#legacy-condition). It does not settle the downstream side. If the access token it issues is a bearer token honored without further proof, the trust domain behind it still runs on a bearer secret, and if resource servers validate it by introspection they are asking for a verdict ([section 5](#state-applications)). The talk does not say which.

### Contract credentials, execution trust, delegated signing {#other-patterns}

Cole Davis presented contract credentials: a credential derived from a lease, with a lessee issuing itself an access credential a smart lock verifies, and termination revoking everything downstream (KERIConf26 caption, Cole Davis, Contract Credentials and Verifiable Identity, 14:15). Its normative hook is the specification's "contractual vehicle for conveying authorization" ([section 1](#normative-floor)); the demonstration was simulated (22:50). Alan Davies presented execution trust, a verification gate immediately before a high-value action in an existing system (KERIConf26 caption, Alan Davies, ACDCs for Enterprises, 13:13), the same move as `sda.md`'s gate at the execution boundary. Daniel Hardman presented an enterprise credential delegating the right to sign calls to a communications platform (KERIConf26 caption, Daniel Hardman, Open Verifiable Communications, 06:19), with a transit operator failing a call whose chain does not verify (10:02), the conference's one proof-of-concept of chained delegated authority.

### Guardianship {#guardianship}

[proposal] Sam's SEDI modeling treats guardianship as a chain of grants. A ward has "a limited set of citizen rights, which rights are held by their parents and must be delegated back to their child" ([keripy conversations > discussion #1550](https://github.com/WebOfTrust/keripy/discussions/1550), body of 2026-07-28, R-072), in diagrams labeled notional and not State of Utah policy. For a parent's control of a child's social-media access he picks the arrangement where the platform accepts authorization only from the parent's AID as "the minimally sufficient means for the parent to have control over the childs access to social media." ([keripy conversations > discussion #1573](https://github.com/WebOfTrust/keripy/discussions/1573#discussioncomment-17935861), comment of 2026-08-07, R-071). Divorce and remand to child services were among his cases for registry transfer ([section 6](#transfer)). The custody-from-birth position is in [chapter 06, section 3](06-governance-ecosystems-and-interop.md#sedi-architecture).

## 12. Open questions {#open-questions}

1. How a verifier evaluates an EVAC resource map against a request, and in what language a policy rule set in the attribute section is written.
2. How a verifier validates a reverted registry, and whether reversion recurses when the delegator is itself revoked.
3. Which two logs anchor the `xfr` event, and its fields; the deck's `rxr` diagram and its `xfr` bullet differ.
4. Whether any chain-walking verifier will use `bn` and `bd`, and what it does with an issuance anchored at the same key event as the revocation.
5. Whether an OAuth access token minted by an ACDC-backed authorization server is a bearer token downstream, and whether resource servers introspect it.
6. Whether delegating reliance to an AI agent satisfies the rule that reliance is not automated ([section 9](#agent-judgment)).
7. How a verifier obtains an Issuee's usage registry it does not already hold, without telling the Issuee or Issuer where verification happened.
8. Whether joint issuance is normative in the Dossier specification.
9. Termination of authority on completion of its purpose, which `sda.md` leaves open.

## Sources {#sources}

- ACDC spec — Authentic Chained Data Containers (ACDC) specification, Trust Over IP. trustoverip/kswg-acdc-specification, spec/spec-body.md. `main` @`f0bd097de` (2026-08-28) supports every [spec] claim; `v1.1` @`2362e48a1` (2026-09-11) was checked for the passages named in [section 1](#normative-floor) and [section 6](#bound-blinded-state), and for the absence of EVAC, reversion, `xfr` and `rxr`. Mined in raw/03 and raw/19.
- AI deck — KERI: The last best hope for individual-controlled digital ID in an AI world, Samuel M. Smith. SmithSamuelM/Papers, presentations/KERI_AI_Cyber_2026.pdf, master @`b47f21597` (2026-08-11), added `b218b5b` (2026-06-29). A list of questions, not a position paper; its answers are spoken. Quoted by page from text extracted to `.ignored/papers-text/`, whose ligatures (fi, ff) are damaged. Mined in raw/19.
- AlphaOmega deck — KERI general overview deck, Samuel M. Smith. SmithSamuelM/Papers, presentations/KERI_AlphaOmega.20250903.pdf, master @`b47f21597`, added `e0b2718` (2025-09-03). Quoted by page from extracted text. Mined in raw/19.
- DAD deck — Authentic Data Supply Chains, DAD architecture, Samuel M. Smith. SmithSamuelM/Papers, presentations/AuthenticDataSupplyChains_DAD_Arch.web.pdf, master @`b47f21597`, last touched `c949ebc` (2022-05-20). Lineage only. Mined in raw/19.
- EVAC deck — ACDCs for Delegable Authorization, Samuel M. Smith, the deck behind the KERIConf26 talk The Future of KERI. SmithSamuelM/Papers, presentations/AuthorizationEVAC.pdf, master @`b47f21597`, added and last touched `3ec04c2` (2026-04-30). Slide text, not specification prose; quoted by page from extracted text with damaged ligatures. Mined in raw/19.
- KAGI — KERI Architectures for Group Issuance, Samuel M. Smith. SmithSamuelM/Papers, whitepapers/KERIArchGroupIssuance.md, master @`b47f21597`, last changed `e8a56a9` (2025-02-05). Only its group-issuance half is used here; its KRAM half is in raw/15. Mined in raw/19.
- KERIConf26 caption — edited auto-captions of the KERI Conference 2026 talks, keri-foundation/CONF26-subtitles, subtitles/*.fixed.srt, read at `006042d39` (2026-10-04). Talks quoted or cited: Samuel Smith, The Future of KERI; Phil Feairheller, ACDCs for Authorization; Cole Davis, Contract Credentials and Verifiable Identity (the caption file's title uses an ampersand); Alan Davies, ACDCs for Enterprises; Daniel Hardman, Open Verifiable Communications. A weak provenance class: near-wording only, quoted only for intent and framing; read raw/14 section 0 before quoting any of it onward. Mined in raw/14 and raw/19.
- keripy — KERI reference implementation, WebOfTrust/keripy, `main` @`80f77b73b` (2026-10-01). Read for this chapter: `src/keri/core/structing.py` (the `BoundState` structure and its properties) and `src/keri/acdc/regeventing.py` (`vetBlind`), plus a `git grep` over `src` and `tests` for consumers of the bound fields. Other [code] claims are linked to the chapters that read them. Mined in raw/09, raw/19 and raw/21.
- keripy conversations — Sam Smith's comments in WebOfTrust/keripy discussions: #1082 (comment of 2026-04-23), #1550 (body of 2026-07-28 and comment of 2026-08-05), #1566 (comment of 2026-07-30), #1573 (comment of 2026-08-07). Read from the 2026-10-14 fetch cached under `.ignored/sam-rulings-cache/`, at their edited text where edited. [proposal] throughout. Mined in raw/21.
- ManyCubed.md — Many Cubed, Samuel M. Smith. SmithSamuelM/Papers, whitepapers/ManyCubed.md, master @`b47f21597`, last changed `667c79b` (2017-07-13). Lineage only. Mined in raw/19.
- Revocation.md — Revocation, Samuel M. Smith, self-versioned V0.4 2026/06/13. SmithSamuelM/Papers, whitepapers/Revocation.md, master @`b47f21597`, last changed `3854b8d` (2026-06-14). States the registry transfer event in the present tense; it is in neither ACDC branch ([section 6](#transfer-drift)). Mined in raw/19.
- sda.md — The Shape of Delegated Authority, Daniel Hardman, version 1.2, revised 2026-07-14. dhh1128/papers, sda.md, read at repository `main` @`68a5e2f76` (2026-09-28), file last changed `24c18bb` (2026-07-30). An authored position by the corpus's owner, not community doctrine; on one point ([section 5](#state-rule)) its literal wording is stricter than KERI's registry design and than its own section 8. Mined in raw/06 and raw/19.
