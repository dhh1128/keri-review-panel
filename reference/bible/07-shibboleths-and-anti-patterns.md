# 07 — Shibboleths and Anti-Patterns {#shibboleths}

## Thesis {#thesis}

KERI corrects, point by point, the priors that PKI, IAM, blockchain and mainstream verifiable-credential work install, so a reviewer reasoning from them produces critiques KERI's contributors recognize as category errors. Each entry's heading is a tell; the entry says why it is an error in KERI's terms and gives the reframing with its evidence. The chapter closes with the master reflex, checking what the code enforces before believing the prose, and with the critiques that survive reframing.

## Status {#status}

The chapter is about framings, so it carries markers only where the kind of evidence is load-bearing: where a correction lives on one specification branch and not the other, or where the evidence is code. Text only on a `v1.1` branch is not [spec], and an unmerged branch on a personal fork is not [code].

## 1. How a shibboleth works here {#how-shibboleths-work}

A shibboleth is a framing whose shape encodes an assumption. When an outsider says "how does KERI revoke a certificate," the words "certificate" and "revoke" smuggle in the X.509 model, so the question must be reframed before it can be answered. Such a critique cannot be falsified from inside the outsider's model, which is why the analyst must "name the objective function first," because "outsider critiques smuggle in unstated invulnerability goals" (standard-analysis.md > 0). Some critiques survive reframing ([section 14](#residuals)). The catalog is organized by the outsider's home domain, because that is how the reflex fires.

## 2. PKI / X.509 / CA tells {#pki-tells}

### 2.1 "Who is the trusted authority / who vouches for the identifier?" {#trusted-authority}

KERI eliminates the role rather than filling it. A CA's certificate "is not made with the controlling keypairs of the identifier but made with keypairs controlled by the CA," giving "evidence of authenticity of the assignment... but not evidence of the veracity of the mapping" (KERI spec > Overcoming existing security overlay flaws, L81). An AID is derived from its own keys, and anyone establishes who controls it by replaying its KEL: "The identifier is the root of trust" (keri-primer.md > 1.3).

### 2.2 "The strength of the system is the rigor of the CA's vetting." {#ca-vetting}

The CA vets once; afterwards security rests on the holder's unauditable key custody, and the CA machinery "guarantees... is that someone provided a public key before the certificate was created" (x509-prob.md > Governance). KERI declares key management in the KEL, so the question becomes what the key-state history shows and whether you can replay it yourself.

### 2.3 "Renew the credential / rotate to a new certificate." {#renewal}

Renewal conflates identity with privilege; re-issuing after compromise "is essentially the same as starting over by creating a brand-new independent mapping" (KERI spec, L83). A transferable AID persists across rotations, each chained to the prior key state: "The identifier string remains constant even as the keys change... Identity survives key rotation" (keri-primer.md > 2.1). Privileges that should expire are carried by ACDCs.

### 2.4 "Pin the key / pin the certificate for continuity." {#pinning}

Google Cloud's 2026 advice not to pin, because pinning "will cause your application to break during routine certificate rotations" (x509-prob.md > Prerotation), concedes that X.509 continuity is administrative. Pin the AID and follow its KEL: "Prerotation is exactly what would let a relying party commit to a durable cryptographic anchor *and* survive the rotation" (x509-prob.md > Prerotation).

### 2.5 "Trust ultimately bottoms out somewhere administrative anyway." {#administrative-bottom}

It differs in kind: "CT's chain of assurance bottoms out in administrators... KERI's bottoms out in mathematics: the self-certifying identifier derives from the initial public key, and the KEL's validity can be checked by anyone who replays its hash chain, without querying any authority" (wtbo.md > 3). What remains is the controller's custody of its keys and the soundness of the primitives (background.md > 4.6). Judgment leaves the authentication path, not reliance ([section 9](#semantic-tells)).

### 2.6 "Publishing the same AID at several well-knowns strengthens the AID binding." {#multiple-well-knowns}

[spec] "This pattern does not change the trust model of an OOBI", because "the AID binding produced by resolution is still cryptographically verified through KERI in the usual way" (KERI spec > OOBI with MFA, L2838 @`fbdd4a615`; the same on `v1.1`). OOBA governs only the recipient's willingness to bootstrap, and its independence is of delivery channels: two URLs in one email are one factor.

The count is evidence of something else, which entity an AID belongs to: [proposal] "The strength of the well-known establishment is multiplied by the number of such associations, i.e., it provides a reputational source of trust." (UniversalIdentifierTheory.pdf > 1.6 Root AID Establishment via Well Known Reputational Association, p.9 @`b47f21597`). The tell is the count used to judge key state or an event's authenticity ([chapter 14, section 4](14-identifiers-trust-bases-and-reputation.md#well-known-association)).

## 3. Revocation, CRL, OCSP, and phone-home tells {#revocation-tells}

### 3.1 "How does KERI revoke — where is the CRL / OCSP responder?" {#crl-ocsp}

There is no separate revocation layer, and the outsider's fails open: "The system is most vulnerable precisely when it is most needed" (keri-primer.md > 1.1). Key state is the head of the replayed KEL, an abandoned identifier rotating to a null next-key list (KERI spec, L340). Credential status is TEL state anchored in the issuer's KEL, and [code] revocation is a state transition the verifier logs so it can "save a revoked credential" (keripy vdr/verifying.py, L129-132; [chapter 05, section 9](05-acdc-and-verifiable-data.md#registries)).

### 3.2 "A registry / status endpoint is consulted at verification time." {#status-endpoint}

A callback that returns a verdict reintroduces the dependency end-verifiability removes; the ACDC Observer exists so there is "no forced phone home validation" (ACDC spec > TEL Registrars and Observers, L1693). Fetching state the verifier then checks against key state it has verified, from any source, is not a phone-home; accepting a service's answer instead is, and so is a read that tells the Issuer where its credential was used. Read literally, "A registry consulted at verification time is a phone-home in disguise" (sda.md > 7) forbids every registry read, which is stricter than KERI's own design and is not the position ([chapter 13, section 5](13-authority-authorization-and-agents.md#state-not-verdict)).

### 3.3 "Certificate Transparency already solved this." {#certificate-transparency}

Both are detection-oriented, but CT "redistributes administrative trust rather than eliminating it" (keri-primer.md > 1.1; wtbo.md, abstract). KERI detects with proof: "Unlike certificate transparency, KERI enables the detection of Duplicity in the Key state via nonrepudiable cryptographic proofs of Duplicity, not merely the detection of inconsistency... that MAY or MAY NOT be duplicitous" (KERI spec, L85). A watcher surfaces evidence; a browser root program enforces.

### 3.4 "Revoke just the compromised copy of a bulk-issued credential." {#bulk-copy-revocation}

The artifact is not what leaked. [proposal] "An issuer when it revokes authority revokes it universally. In a bulk issued set this means that all members of the set MUST be revoked."; "if the keys get compromised then the keystate is changed not the ACDC state" (keripy GitHub > #1574, comment of 2026-08-07, R-042, https://github.com/WebOfTrust/keripy/discussions/1574#discussioncomment-17938568). Withdrawn authority revokes the set; a compromised issuee key rotates that one AID; a compromised derivation salt means "the whole set has to be abandoned". This is the editor's account in a discussion, not specification text ([chapter 05, section 9](05-acdc-and-verifiable-data.md#bulk-issuance)).

## 4. Blockchain / consensus / global-ordering tells {#blockchain-tells}

### 4.1 "You need a ledger / global consensus / total ordering." {#global-consensus}

Global ordering is an explicit non-goal (background.md > 1.3), because key events are "idempotent authorization operations as opposed to non-idempotent account balance decrement or increment operations. Total or global ordering may be critical for non-idempotency, whereas local ordering may be sufficient for idempotency" (KERI spec > KAWA insight, L1836). Each controller orders its own KEL; a ledger is at most a tiebreaker after total compromise, "minimal use of a distributed consensus ledger" (KERI spec, L1888).

### 4.2 "Anchoring signatures in time sounds like a blockchain." {#anchoring-not-blockchain}

Anchoring needs only each signature's place in its own identifier's key-state history: "We don't need to know the relative order of two signing events — only how any one event relates to its key state. That means no total ordering, and no cumbersome consensus algorithm... no permissioning problem, no big central *anything* in the sky, no scale or performance bottlenecks, and no regulatory problems with data locality, privacy, or erasure" (was.md > Solution). That per-identifier order is all that defeating the retrograde attack requires ([section 11](#retrograde-attack)).

### 4.3 "Immutability requires a chain." {#immutability}

Immutability is a property of a commitment, not of agreement: "a SAID will verify if and only if its encompassing serialization has not been mutated, which makes the content immutable" (CESR spec > SAID, L1196). Placement in a history needs a chain; identity of content does not.

### 4.4 "But then how do you honor the right to be forgotten?" {#right-to-be-forgotten}

Only a shared ledger cannot forget. KERI's trust bases are separate, so "a given identifier's data may be erased and truly forgotten" (keri.one homepage), and RUN replaces CRUD: "there is no Delete. Instead of Delete, Peers Nullify" (KERI spec > RUN off the CRUD, L2870), keeping an invalidity marker so erased data cannot be replayed.

## 5. OAuth / OIDC / SAML / IAM / perimeter / federation tells {#iam-tells}

### 5.1 "Authentication precedes authorization as one indivisible login." {#authn-before-authz}

That is the sentry at the gate, whose token is too lossy for anyone inside the perimeter to check deeply (OS > 1). Every request is signed and verified at every hop, and authorization can precede authentication: "someone can receive permission if they can prove certain characteristics, even if a sentry does not (yet, or maybe ever) know who they are" (ASAAU > Appendix).

### 5.2 "Use a bearer token / session / API key to call the service." {#bearer-tokens}

"Possession of an API key... makes the holder indistinguishable from the account it belongs to, free to do anything that account can" (sda.md > 1). Identity is an AID and proof is a fresh signature per request over method, path, resource header and timestamp (RFC 9421) (GOC > 2): "The key authorizes an act; the ring authorizes a person to stand in your place" (sda.md > 1).

State the boundary with the row. The signature is scoped to one method, path and key state, but [code] neither KERIA (`7e685edaa`) nor signify-ts (`ffba8406e`) compares the signed timestamp or `expires` to a clock, and KERIA keeps no nonce cache, so a captured request replays on its path until rotation; enforcement would need no wire change ([chapter 09, section 2](09-kram-and-request-authentication.md#simple-kram)).

An OAuth server is not itself the tell: Sam accepts one that does not enlarge its trust domain and bridges with KERI and ACDCs (KERIConf26 caption, Samuel Smith, The Future of KERI), as healthKERI's does [practice] ([chapter 13, section 11](13-authority-authorization-and-agents.md#applied-patterns)).

### 5.3 "The server is trusted infrastructure; the cloud holds my keys." {#custodial-cloud}

"Agents... don't have the secrets of the client" (keria README), and the client authenticates the agent, rejecting a response "from a different remote agent" (signify-ts clienting.ts, L240-255). Keys are generated and events signed at the edge; the cloud stores and relays, and an agent that added authority would be the CA prior returning ([chapter 03, section 12](03-key-management-and-identifier-lifecycle.md#keria-signify)).

### 5.4 "Federation decentralizes." {#federation}

Federation moves centralization; trust registries are "a band aid; they just move the centralization back to a different level of the architecture" (x509-prob.md). Self-certifying roots and chaining remove it: "A verifier receiving an employee's credential can traverse the chain back to GLEIF without consulting a trust registry. The entire graph is self-certifying" (acdc-vc-diff.md > Real-World Validation).

### 5.5 "Secure the pipe (VPN/TLS) and the data inside is safe." {#secure-pipe}

"The walls of a pipe may be a secure perimeter, but every place where a pipe ends is a gap" (ASAAU > 3.6), and pipes leave data at rest bare. "Move Security with the Data, Not the Transport" (GOC > 8): sign, and where needed encrypt, the payload, keeping TLS as defense in depth.

### 5.6 "HPKE authenticates the sender." {#hpke-authenticity}

[proposal] "IND-CCA2, by itself, is insufficient to provide strong authenticity of the ciphertext." (SPAC_Message.md > Best Confidentiality (Public Key Encryption), L361 @`b47f21597`), relaying RFC 9180's warning about key-compromise impersonation. Authenticity needs a signature by the sender's identifier bound to the receiver, which is ESSR ([chapter 12, section 4](12-confidentiality-and-secure-messaging.md#essr)).

### 5.7 "Encrypt, then sign, and the message is both confidential and authentic." {#encrypt-then-sign}

[proposal] "An attacker can strip the signature and resign the ciphertext with the attacker's key but has never seen the plaintext of the cipher." (SPAC_Message.md > Best Combined Authenticity and Confidentiality, L366 @`b47f21597`). ESSR binds sender and receiver both. This is Sam's reading of An's analysis, which this corpus has not read, and that ESSR is the only secure approach is his assessment.

### 5.8 "TSP gives forward secrecy, like any modern secure-messaging protocol." {#tsp-forward-secrecy}

[spec] "TSP does not provide forward secrecy: an adversary that has recorded earlier messages and later obtains the decryption key can read them." (TSP spec > Limits, L1515 @`5599b4556`), on the standardizing line of an experimental specification. KERI's messaging work treats accountability, not ratcheted secrecy, as the remedy; rotation protects only what follows it ([chapter 12, section 10](12-confidentiality-and-secure-messaging.md#tsp-spec)).

## 6. SD-JWT / W3C-VC / DID "decentralized" drift tells {#vc-drift-tells}

These outsiders believe they already do decentralized identity; KERI's position is that they imported PKI and OAuth assumptions and re-created centralization one level up.

### 6.1 "A credential is a signed envelope (paired signature)." {#signed-envelope}

ACDCs are "bound to the Issuer's Key State... and the Issuer's Key State is signed. This enables the Key State of the Issuer to change independently of the ACDC state" (ACDC spec > Binding to Key State, L1673). For an outsider, cite the Dossier specification, which argues from rotation: [spec] "A dossier is not a signed document. The issuer does not compute a signature over the dossier ACDC and attach that signature to it as proof of authenticity" (Dossier spec > How a Dossier Is Issued: Anchoring, Not Attached Signatures, L13-14 @`b9227753c`).

Two guards. The partition is lifespan, not artifact kind: "key events are signed, and so are the short-lived transactional objects... Dossiers, endorsements, and other ACDCs are anchored" (L45-55). And a one-time dossier may carry an attached signature, because "A verifier MUST NOT treat an attached signature as equivalent to an anchor when evaluating a dossier as of any referenceTime other than the present" (L77-79).

### 6.2 "DIDs already solved decentralized issuance." {#dids-solved-it}

They solved holder rotation, not issuer rotation: "*most DIDs, including crowd favorites like did:web, can only be resolved to the current key state*," (was.md > Mitigation 3), so an issuer's compromise invalidates its history. An AID resolves to key state at any point by KEL replay, and "AIDs can be transformed to DIDs, but the opposite transformation is typically impossible" (sdjwt-acdc.md > 2.2): keep the lossless ACDC authoritative and derive a VC when needed.

### 6.3 "SD-JWT gives you selective disclosure and issuer flexibility." {#sd-jwt}

"*tokens are only designed to be evaluated against current key state*. If keys change, all existing tokens become invalid" (sdjwt-acdc.md > 2.3), and standalone envelopes need registries of trusted issuers. ACDCs "prove the bona fides of issuers by chaining to other ACDCs" (sdjwt-acdc.md > 2.4) and anchor to a rotating AID's key state.

### 6.4 "Canonicalize the JSON (JCS / JSON-LD) so the signature is stable." {#json-canonicalization}

In JSON-LD "this fragility has led to 'term redefinition' vulnerabilities, where the meaning of a signed credential can be altered without invalidating the signature" (keri-primer.md > 4.1). Commit to exact bytes with a SAID, in insertion order — "The natural canonical ordering for such mappings is insertion order" (CESR spec > Order-Preserving Data Structures, L1250-1252) — and reference schemas by SAID, so no link can rot.

### 6.5 "A self-referential identifier can't be cryptographically bound / a UUID is fine." {#uuid-identifiers}

An unbound self-referential identifier invites substitution: "Anyone can place such an identifier inside some other serialization and claim that the other serialization is the correct serialization" (CESR spec > SAID discussion, L1194). A SAID is both self-referential and bound, by digesting with a dummy-filled field and then overwriting it (CESR spec > Generation and Verification Protocols, L1200-1206).

### 6.6 "Adopt only the parts of KERI you need." {#keri-light}

The adversary goes to the missing part. [proposal] "Remove even one component protecting a vital area and the adversary will target the unprotected area to the exclusion of all else." (SecurityThreatsMitigationsSEDI.web.pdf, slide 166, Preventing wounds especially fatal wounds @`b47f21597`). Each part protects something: "Validators are protected from dead (stale) key compromise via the first-seen policy enforced by their own watcher network" (SEDI_Tradeoff.web.pdf, slide 13, KERI/ACDC Security Properties @`b47f21597`). Name the attack each omitted part stopped and who bears it. The tell is presenting the partial design as KERI's security at lower cost at people or government scale, where every source scopes the claim.

In writing, the half-measure argument targets cryptographic unlinkability (SEDI_Tradeoff.web.pdf, slide 26); its application to partial KERI is spoken, at KERIConf26, where this corpus's author called his own earlier KERI-light proposal a mistake at ecosystem scale (KERIConf26 caption, Ryan Hansen panel, What KERI allows us to do that we couldn't before, 13:06-13:27).

## 7. "Security means invulnerability / prevention / finality" tells {#invulnerability-tells}

This cluster is invisible to the reviewer holding it. [Chapter 02](02-security-model-and-threat-posture.md#survivability) is the home of the doctrine behind each row.

### 7.1 "A secure system prevents forks / equivocation." {#preventing-forks}

"KERI is explicitly not designed around invulnerability" (background.md > 4.5.1); faulting it for malicious-controller forks "is analogous to criticizing a smoke detector for not preventing fires" (dg-c02-claude.md > 5). Ask "not 'can duplicity occur?' — it can — but 'how quickly is it detected, and what happens when it is?'... a deployment question, not a protocol question" (wtbo.md > 5).

### 7.2 "Not duplicity-resistant? Then it's broken." {#duplicity-evident}

In "KERI is therefore not duplicity-resistant but only duplicity-evident", the word only imports an invulnerability bias (dg-c03-claude.md, sections 2 and 5). "It doesn't try to make duplicity impossible — that would require global consensus... It makes duplicity *provable and attributable*" (wtbo.md > 4), and a detected fork is fatal to the identifier's reputation (KERI spec, L1842).

### 7.3 "All validators must converge on one truth (finality)." {#finality}

"Permanent divergence is an allowed outcome" (background.md > 7.4.4). "Safety in KERI means: Validators do not accept *invalid* histories" (background.md > 7.5.1), not that they agree ([chapter 02, section 10](02-security-model-and-threat-posture.md#local-validity)).

### 7.4 "A threshold of witnesses gives global safety." {#witness-threshold}

"Agreement thresholds do not imply global safety" (background.md > 4.7); a malicious controller can run its own witnesses. The threshold is of accountable duplicity (TOAD): conflicting versions become hard to receipt and easy to expose, and global detectability belongs to the optional observer layer ([chapter 02, section 7](02-security-model-and-threat-posture.md#kawa)).

### 7.5 "If a proof assumes an honest controller, it's insecure against dishonest ones." {#honest-controller}

The premise is "a proof-technique simplification, NOT a KERI deployment requirement... Removing it does not break KERI's security — it shifts the focus from prevention to detection and recovery" (dg-c06-claude.md, sections 3 and 5). Separate the proofs' scope from the protocol's model, in which a malicious controller triggers detection.

## 8. Role-confusion tells: witness, watcher, backer, agent {#role-confusion-tells}

### 8.1 "A witness is a CA / a blockchain validator / a notary." {#witness-not-ca}

"Witnesses make no assertion about identity — they don't claim 'this key belongs to this entity.'... That is a fundamentally different role than a CA" (wtbo.md > 4). A witness is a controller-designated AID, assumed potentially malicious, that stores and serves events; witnesses "MUST be non-transferable" so receipts verify directly (KERI spec, L353).

### 8.2 "A watcher enforces / can distrust an identifier." {#watcher-enforcement}

"Watchers cannot unilaterally 'distrust' an identifier... The worst a dishonest watcher can do is stay silent about duplicity it has seen" (wtbo.md > 4). The relying party decides, ideally with a watcher in its own stack; relying only on a shared super watcher "is undesirable, as it encourages centralization" (wtbo.md > 5).

### 8.3 "A witness can serve a delegate's KEL, so it vouches for the delegation." {#witness-delegation}

"A witness is NOT a watcher. A witness may serve a delegate's KEL without the delegator's seal/KEL; a validator must independently obtain the delegator's KEL (OOBI) before validating" (keripy-knowledge invariant D3; landmine L4). Delegation is cooperative, "Both MUST participate" (KERI spec > Cooperative Delegation, L1610), and each link is checked ([chapter 03, section 8](03-key-management-and-identifier-lifecycle.md#delegation)).

### 8.4 "`DID` means the delegator vouches for all its delegatees." {#did-trait}

This is the X.509 path-validation reflex applied to the `DID` (Delegate-Is-Delegator) trait. Its refutation rests on [spec-next] text and an editor's [proposal] ruling, so a reviewer may press it as a question but not yet be told it is wrong on [spec] authority.

[spec] On both branches a validator may treat the two AIDs as equivalent, and neither says what follows for policy, rotation or revocation, so any reading leans on nothing. [spec-next] `v1.1` forecloses the transitive reading, "It says nothing about any Delegatees that the Delegatee may itself delegate" (KERI spec > Configuration traits field, v1.1 L381 @`3753f3797`), and makes the trait `dip`-only. `main` at `fbdd4a615` puts it in an `icp` example (KERI spec, L591), which the editor calls a defect [proposal]: "Yeah, putting DID in a plain, non-delegated ICP, as an example, was an oversight." (keripy GitHub > #1570, reply of 2026-08-04, R-012, https://github.com/WebOfTrust/keripy/discussions/1570#discussioncomment-17898407). The transitive reading will be wrong on the likely next standard, and is not wrong yet ([chapter 03, section 8](03-key-management-and-identifier-lifecycle.md#delegation)).

### 8.5 "The observer layer is KEL discovery / caching, and a 'super watcher' is a bigger cache." {#observer-not-cache}

[spec] Discovery is OOBIs, untrusted by design: KERI "does not, therefore, need its own dedicated discovery network; OOBIs with URLs will do" (KERI spec, L2635). [proposal] "The watcher, judge, and jurors each play distinct important roles in the KERI security posture of a validator[;] they are not merely discovery mechanisms for KELs[,] so having amnesia about why their roles are distinct is going to be problematic" (WebOfTrust/kids#1, 2023-11-05). The word super names the scope of KELs covered, not features ([chapter 02, section 9](02-security-model-and-threat-posture.md#observer-layer)).

### 8.6 "Agentic AI needs a new identity primitive." {#agent-identity}

An agent is a delegate. [proposal] "Agent has its own AID", and "ACDC mechanisms are the same for AI, person, or entity agents." (AuthorizationEVAC.pdf, p7 @`b47f21597`). Delegate its AID from an accountable party and give it authority by a credential chain checked at the edge; model or person changes the governance question, not the mechanism ([chapter 13, section 9](13-authority-authorization-and-agents.md#agents)).

## 9. Semantic tells: authorship, authenticity, meaning, aliases {#semantic-tells}

### 9.1 "A signature means the signer authored / asserts the content." {#signature-authorship}

"A signature is evidence that a signing mechanism ran" (sign-author.md); meaning comes from role, ceremony and policy. A dossier issuer's signature "does not necessarily attest to the veracity of the claims within the evidence, but rather to the integrity and composition of the collection" (Dossier spec > Role of the Issuer). The signer is accountable for the signature, not thereby its author.

### 9.2 "Cryptographic verification proves the claim is true." {#authenticity-veracity}

"Judgments about authenticity can — if managed very carefully — be reduced to an objective mathematical computation, whereas judgments about veracity inherently require subjective assessments of reputation" (authenticity-vs-veracity.md > Independence). KERI proves who said it and that it is unaltered, not that it is true ([chapter 06, section 1](06-governance-ecosystems-and-interop.md#authenticity-veracity)).

### 9.3 "Automate the whole verification, including the final trust decision." {#automated-trust}

"Automate the introduction. Automate the proof where you can. But never automate the verification of the proof" (oia.md). Deployments mark guesses apart from verified facts in the data (MA > 4). [Section 14](#doctrine-disagreement) records an open disagreement about how a human should take the final step.

### 9.4 "An alias / petname is an identifier." {#aliases}

"Treat an alias as an identifier and you get collisions; cache it... and you get staleness; parse a stranger's alias for meaning and you get an attack surface" (oia.md). "It is globally unique AIDs that MUST be used in all system logic" (HWGA, step 9): the alias is where a man in the middle can live, because cryptography cannot check the mapping it asserts.

### 9.5 "Multisig means it's an organization; one key is enough for org identity." {#multisig-org}

"It is not a generally true equivalence that multi-sig = org. Some orgs consist of only one person, so their AIDs are single-sig" (HWGA). What matters is that policy is visible: "Multisig is optional and infinitely variable, but defining and following policy about it is required" (keri-primer.md > 2.4), and KERI publishes thresholds in the KEL.

## 10. Data-modeling and disclosure tells {#disclosure-tells}

### 10.1 "Bundle all the claims into one big credential, then selectively disclose." {#bundled-credentials}

"Many non-ACDC verifiable credentials provide bundled credentials because there is no other way to associate the attributes... These bundled credentials could be refactored into a graph of ACDCs. Each... separately disclosable and verifiable thereby obviating the need for Selective Disclosure" (ACDC spec > Selective Disclosure annex, L2739). Issue small chained credentials and disclose by graduation; where statistical linkability is the threat, add contractual protection, since "there is no cryptographic mechanism that precludes statistical correlation among a set of colluding Verifiers" (ACDC spec > Bulk-issued, L2785; [chapter 05, section 7](05-acdc-and-verifiable-data.md#graduated-disclosure)).

#### Detectability, not cost {#bundled-credentials-detectability}

Sam's #1098 [proposal]: "the use of unlinkable ZKPs is therefore precluded to preserve the detectability of an Issuer signing infrastructure compromise", and "Likewise, the key compromise of an Issuee (Holder) can be made detectable using a presentation registry. Which would also be defeated by an unlinkable ZKP." (#1098). Unlinkable ZKPs thus trade away detect-and-recover at both ends ([section 7.1](#preventing-forks)). Boundaries: it is one author's argument in an uncommented discussion, last edited 2026-09-26; and its Issuee half rests on a registry that is [code] in keripy with no specification text, which a format must not foreclose and no presentation is obliged to use ([chapter 10](10-presentation-registries.md)).

### 10.2 "A compact / SAID-only credential is private." {#compact-not-private}

Without a blinding field, "an adversary may be able to reconstruct the block contents merely from the SAID... and the Schema... using a rainbow or dictionary attack" (ACDC spec > UUID Fields, L89); compact form "only provides compactness, not privacy" (ACDC spec > Targeted Public-attribute, L501). Privacy needs a high-entropy blinding field `u` ([chapter 05, section 2](05-acdc-and-verifiable-data.md#saids)).

### 10.3 "Dereference the schema `$schema`/`$id` to validate." {#schema-dereference}

A dynamic schema enables schema-revocation and semantic-malleability attacks (ACDC spec > Static Schema, L196-198). "All Schemas MUST be static, i.e., Schemas MUST be SADs and therefore verifiable against their SAIDs" (ACDC spec, L200), so a schema may come from anywhere ([chapter 05, section 3](05-acdc-and-verifiable-data.md#static-schema)).

### 10.4 "Wrap or ingest a foreign credential (X.509, W3C-VC, mDL) as a native root of trust." {#foreign-credentials}

"Direct reference to non-ACDC material without a wrapper is NOT RECOMMENDED, as it places an untenable burden on the verifier to parse and validate an arbitrary foreign format, understand its lifecycle, and locate its revocation mechanism" (Dossier spec > Incorporating Evidence). A bridging party verifies the foreign credential and issues a Foreign Artifact ACDC, which "transforms the problem of verifying a foreign format into the problem of trusting the attestation of the bridging party" (Dossier spec > 3).

### 10.5 "I2I / edge operators do multi-hop authority reasoning." {#edge-operators}

[code] `I2I` is AID string equality and nothing more, `if op == 'I2I' and issuer != farIssuee: return None` (keripy vdr/verifying.py, L481 @`80f77b73b`); multi-hop authority comes from the recursive edge walk. [spec-next] "Unlike `I2I` and `DI2I`, which are delegative Operators... `E1E` is an identity relation between the two ACDCs' Issuee AIDs" (ACDC spec > Edge, L1223 @`2362e48a1`), and the editor ruled a same-party use of `I2I` misapplied: "So the edge defines an an identity relation not a delegation relation." (keripy GitHub > #1505, comment of 2026-07-17, R-029, https://github.com/WebOfTrust/keripy/pull/1505#issuecomment-5004919975) ([chapter 05, section 5.1](05-acdc-and-verifiable-data.md#verifying-ground-truth)).

#### A second tell: which verifier {#edge-operators-two-verifiers}

[code] At `80f77b73b` keripy's two evaluators, `vdr/verifying.py` and `acdc/ipexing.py`, disagree on an unrecognized operator, on a list of operators, and on an edge with no `o`, so one edge can pass one and fail the other. Neither has been checked against the specification, so do not pick a side; neither is in KERIA's dependency ([section 12](#main-not-deployed)).

#### The unknown-operator trap {#unknown-operator-trap}

Sam narrowed #1515 to `E1E` because "we want to avoid it falling into the unknown operator trap" (#1515, 2026-07-18) [proposal]. Its proposed `I1I` and `DI1I` are absent from keripy at `80f77b73b`, so an edge carrying one is defaulted by one evaluator and refused by the other.

### 10.6 "Unlinkability is the privacy goal." {#unlinkability-goal}

[proposal] "KERI/ACDC postulates that the end goal is not unlinkability, but rather unexploitability through the strongest security." (SEDI_Tradeoff.web.pdf, slide 11, KERI's Paradigm Shift: Security First @`b47f21597`). Unlinkability also costs accountability, "Cryptographic un-linkability defeats legal, contractual, and economic accountability" (SevenPrivacies.web.pdf, slide 26 @`b47f21597`), and issuer-compromise detection ([section 10.1](#bundled-credentials-detectability)). These are Sam's assessments, open to contest, but ACDC must not be measured against a goal it does not claim ([chapter 12, section 3](12-confidentiality-and-secure-messaging.md#effective-privacy)).

### 10.7 "Selective disclosure is a privacy safe harbor." {#selective-disclosure-harbor}

[proposal] "Correctly understood, selective disclosure is a naive form of K-anonymity performed by the discloser (presenter)." (SPAC_Message.md > Contextual Linkability Re-identification Attack, L1104 @`b47f21597`). It reduces what is disclosed, not the receiver's obligations, and "should not provide a safe harbor", though "Unfortunately, current regulatory policy does not respect this distinction." (SustainablePrivacy.pdf > 2.3, p.5 @`b47f21597`). The 2023 SPAC text reads as if GDPR already imposes this; cite the 2026 text ([chapter 12, section 7](12-confidentiality-and-secure-messaging.md#sustainable-privacy)).

### 10.8 "A long-lived cryptonym is a supercookie." {#cryptonym-supercookie}

Correlation lives in the context, not the identifier. [proposal] "Two different AIDs are by themselves uncorrelated in an information-theoretic security sense" (SPAC_Message.md > Basics, L474 @`b47f21597`), so a controller can use one per relationship, and inside one "The secure attributability of an AID, together with its perfect correlatability within a context, enables secure reputational trust" (SPAC_Message.md > Basics, L482). Partitioning removes only the identifier as correlator; a signed presentation stays a durable correlator in its context ([chapter 12, section 5](12-confidentiality-and-secure-messaging.md#contexts)).

## 11. The one attack you must be able to name: the retrograde attack {#retrograde-attack}

"By themselves, digital signatures are much weaker evidence than casual thinkers might imagine," (was.md, intro): whoever later obtains a key can forge evidence "that looks like it originated in the past, *forever*" (was.md > Retrograde attack), and current-key-only systems such as X.509, JWTs and did:web cannot ask whether a signature was valid last week. "An analysis of an anchored signature will produce the same result no matter when it happens" (was.md > Conclusion). [code] `Tever.verifyAnchor` checks the anchoring KEL event (keripy vdr/eventing.py), but the credential `Verifier` may not repeat the check at presentation (landmine L15, HIGH, a recon hypothesis) ([chapter 03, section 11](03-key-management-and-identifier-lifecycle.md#as-of-anchor)).

## 12. The master reflex: verify the code, distrust the prose {#verify-the-code}

KERI's guarantees are conditional, and the conditions live partly in whether the code honors them. The rule that "every externally supplied event, signature, key, receipt, or credential is *hostile input until verified*... 'looks well-formed' is not 'is authorized'" (00-lens.md, claim 3) applies to prose about code. Documented gaps:

- [code] `DI2I` is documented and fails closed with `ValidationError` (keripy vdr/verifying.py, L453-455 @`80f77b73b`; keripy acdc/ipexing.py, L926-927), a closed door rather than a crash.
- The credential anchor may not be re-validated at presentation (landmine L15, a hypothesis).
- "the spec rule; keripy's `WitnessReceiptor` currently waits for ALL witnesses instead — that is a defect, not the invariant" (30-invariants.md, F2; landmine L9).
- Pre-rotation checks can go permissive on a digest-code mismatch, "silently excluded from threshold satisfaction rather than failing closed — weakening the pre-rotation check (the firewall)" (landmine L6, HIGH).
- A code missing from a shadow table "round-trips as primitive but invisible to SAID derivation... fails late and silently" (landmine L5), a discipline for any new code ([chapter 04, section 5.5](04-cesr-and-the-wire.md#shadow-tables)).

Date a gap rather than assert it, because code moves too: landmines L16 and L17 call edge grouping read but not enforced, and [code] at `b8f60166b` m-ary grouping is implemented (`EdgeGroupOps = ("AND", "OR")`, keripy acdc/ipexing.py, L903).

### The reflex is bidirectional {#bidirectional-reflex}

A code comment about a specification is prose that borrows the code's credibility. keripy's now reads "E1E is normative on the spec's v1.1 branch (kswg-acdc-specification#197). It is absent from the 1.0 text currently under ToIP ratification" (keripy vdr/verifying.py, L40-41 @`80f77b73b`), correcting an earlier version that denied `E1E` any specification basis. This corpus's author wrote it (`d9ba3d9da`), so it is not independent evidence; the [spec-next] marker rests on the specification.

### keripy main is not the deployed stack {#main-not-deployed}

[code] KERIA pins `"keri==1.2.14",` (KERIA pyproject.toml, L30 @`928ce26a4`), while keripy `main` is on the `2.1.0-dev1` line that carries IPEX V2, `E1E` enforcement and presentation-registry verification, and the V2 IPEX handler has no caller in `src/keri`. Ask which line, which module, and whether anything calls it.

### Knowledge-base staleness {#kb-staleness}

The keripy knowledge base (`9489ac9bd`) has a code baseline of keripy `60ab9e08d`, 493 commits behind `b8f60166b`; L16 and L17 no longer hold and the other landmines are unconfirmed since. It maps where behavior lives, and is not evidence of what keripy does today.

### The reviewer's checklist {#reviewer-checklist}

Whose authority? Verified or merely parsed? Which invariant does this guard protect — "Can't name it? Assume it's load-bearing." Is it an external contract, where diverging from the specification "silently breaks interop," (00-lens.md, claim 5)? Judged against the anchor's key state? And "do not 'simplify away' a guard you don't fully understand; treat an unexplained check as protecting an invariant until proven otherwise" (00-lens.md, claim 6). Reading only prose over-credits the system; reading only code misses which discrepancies are bugs.

## 13. Quick-reference: the tell → the reframing {#quick-reference}

- Who vouches for the identifier? → The log is the root of trust ([2.1](#trusted-authority)).
- Renew the certificate. → Rotate; privileges expire in ACDCs ([2.3](#renewal)).
- More well-knowns, stronger binding. → Evidence of whose AID, never of key state ([2.6](#multiple-well-knowns)).
- Where is the CRL or OCSP? → Status is anchored state ([3.1](#crl-ocsp)).
- Consult the registry at verify time. → Fetch state and verify it; never accept a verdict ([3.2](#status-endpoint)).
- Revoke one bulk copy. → Revoke the set or rotate the key [proposal] ([3.4](#bulk-copy-revocation)).
- You need global consensus. → Per-identifier order suffices ([4.1](#global-consensus)).
- Use a bearer token. → Sign each request; freshness is unenforced ([5.2](#bearer-tokens)).
- Federation decentralizes. → It moves centralization ([5.4](#federation)).
- Secure the pipe. → Secure the data ([5.5](#secure-pipe)).
- HPKE, or encrypt-then-sign, authenticates. → Use ESSR [proposal] ([5.6](#hpke-authenticity)).
- TSP gives forward secrecy. → It does not [spec] ([5.8](#tsp-forward-secrecy)).
- A credential is a signed envelope. → Anchor anything that outlives a rotation ([6.1](#signed-envelope)).
- DIDs or SD-JWTs already do this. → Only against current key state ([6.2](#dids-solved-it)).
- Canonicalize the JSON. → Commit to bytes with a SAID ([6.4](#json-canonicalization)).
- Adopt only the parts you need. → The adversary targets the omission [proposal] ([6.6](#keri-light)).
- Security means preventing forks. → Make them evident and recoverable ([7.1](#preventing-forks)).
- Witness agreement is global safety. → It is accountability ([7.4](#witness-threshold)).
- A witness or watcher has authority. → It stores or reports; the relying party decides ([8.1](#witness-not-ca)).
- `DID` vouches transitively. → Unspecified; [spec-next] one delegation only ([8.4](#did-trait)).
- Observers are a cache. → They are security roles ([8.5](#observer-not-cache)).
- Agents need a new primitive. → An agent is a delegate [proposal] ([8.6](#agent-identity)).
- Verified means true. → Authentic, not veracious ([9.2](#authenticity-veracity)).
- Unlinkable ZKPs add privacy. → They defeat detection [proposal] ([10.1](#bundled-credentials-detectability)).
- The operator means X. → Ask which verifier, at which commit ([10.5](#edge-operators)).
- Unlinkability is the goal. → Unexploitability is [proposal] ([10.6](#unlinkability-goal)).
- A cryptonym is a supercookie. → The context correlates [proposal] ([10.8](#cryptonym-supercookie)).
- Encode every algorithm variant. → [proposal] "Too much agility is a bad thing. There is a goldilocks amount of agility." (CESR spec GitHub > #165, comment of 2026-03-19, R-018; [chapter 04, section 5.6](04-cesr-and-the-wire.md#goldilocks-agility)).
- The prose says the code does X. → Verify both ways, with a date ([12](#verify-the-code)).
- keripy does X, so deployments do. → KERIA pins `keri==1.2.14` ([12](#main-not-deployed)).

## 14. Load-bearing assumptions and conceded weaknesses {#residuals}

The reframings hold within KERI's objective function, rest on assumptions a reviewer may probe, and leave some critiques standing.

### What the reframings are conditional on {#reframing-conditions}

Cryptographic soundness; secrecy of pre-rotated keys, since losing both current and next keys is "catastrophic and unrecoverable" (00-lens.md, claim 4); and for detection, the optional observer layer: "A KERI deployment without robust watchers and governance is not a secure system" (cr-ad-trust.md > 5; [chapter 02, section 6](02-security-model-and-threat-posture.md#assumptions)).

### The weaknesses that survive reframing {#surviving-residuals}

Observer infrastructure is immature, and a super watcher reintroduces "a centralized trust dependency that KERI was designed to avoid" (cr-ad-trust.md > 5); the formal literature is thin, its strongest analysis "a 2025 ETH Zürich Master's thesis... not peer-reviewed," (wtbo.md > 5); and depending on jurisdiction KERI lacks legal recognition X.509 has. Advocates call these "constraints of *youth*, not of *architecture*" (wtbo.md > 6), an assertion to test, not a fact.

### The trusted-third-party relaxation is two concessions {#two-concessions}

A Verifier requiring rotation in a presentation is conceded to "violate[] the maxim that security not be dependent on a trusted third party" [proposal], because the harm is local. And the Issuee's remedy, a presentation registry, is [proposal] "an Issuer-Verifier-protected mechanism to detect compromise of its signing keys", needing a non-colluding Issuer and an enforcing Verifier; [code] keripy enforces it on `/ipex/grant`, "Reject any malformed, missing, or invalid presentation factor." (keripy acdc/ipexing.py, L616 @`80f77b73b`), with no specification text. It has no table row, because the insiders' sources still disagree about what it requires ([chapter 10, section 8](10-presentation-registries.md#adversarial)).

### A provenance weakness in the corpus's own method {#provenance-residual}

Review by AI personas is a structured self-attack, not validation; a paper in the corpus says its own such passes "were conducted by AI models prompted to argue from a named lens, not by human domain experts" (m-glance.md > 1). That holds for this corpus's panels ([chapter 01, section 8](01-foundations-and-worldview.md#load-bearing-assumptions)).

### An unresolved disagreement inside the corpus's own doctrine {#doctrine-disagreement}

The paper behind [section 9.3](#automated-trust) offers eyeball comparison of an identifier visualization as the human's final step; another concludes that casual comparison against an adversary who has ground offline "is broken", making a seeded commit-and-reveal walk "a requirement, not an enhancement" (amp-diff.md > 4.3.9). Neither cites the other. It is not a tell, since the insider source recommends the practice and the refuting paper calls itself empirically untested.

### Holding both {#holding-both}

The tells in [sections 2 to 11](#pki-tells) are category errors to reframe; the weaknesses here should be pressed. A reviewer who has internalized the doctrine can say of any critique whether it survives objective-function alignment, and why.

## Sources {#sources}

- #1098 — WebOfTrust/keripy discussion #1098, ACDC with Static Age Predicate Proof SMT, Samuel M. Smith, https://github.com/WebOfTrust/keripy/discussions/1098, created 2025-10-27, last edited 2026-09-26, fetched 2026-10-03. Where a [proposal] here is an argument rather than a mechanism, as with [section 10.1](#bundled-credentials)'s case against unlinkable proofs, it is its author's position, not a surveyed or community result. Mined in raw/16 (section 1a) and raw/11.
- #1515 — WebOfTrust/keripy discussion #1515, on edge operators (`E1E`, `I1I`, `DI1I`), Samuel M. Smith, https://github.com/WebOfTrust/keripy/discussions/1515, opening post 2026-07-17, comments cited from 2026-07-18 and 2026-10-01. Mined in raw/09 (section 11).
- 00-lens.md — keripy-knowledge load-bearing claims, a file in keripy-knowledge (see that entry), 00-lens.md, at the same pin, `9489ac9bd` (2026-07-02). Mined in raw/08.
- 30-invariants.md — keripy-knowledge invariants, a file in keripy-knowledge (see that entry), 30-invariants.md, at the same pin, `9489ac9bd` (2026-07-02). Mined in raw/08.
- ACDC spec — Authentic Chained Data Containers (ACDC) specification, Trust Over IP. trustoverip/kswg-acdc-specification, spec/spec-body.md, main @`f0bd097de` (2026-08-28) for unmarked and [spec] citations; v1.1 @`2362e48a1` (2026-09-11) for the [spec-next] `E1E` citations in [section 10.5](#edge-operators) and [section 12](#verify-the-code). Mined in raw/03.
- acdc-vc-diff.md — ACDCs and W3C VCs: Lossless vs. Lossy, Daniel Hardman. dhh1128/papers, acdc-vc-diff.md, main @`68a5e2f76` (2026-09-28). Mined in raw/05 and raw/06.
- amp-diff.md — Amplifying Difference: Perceptual Design and Verification of Human-Centric Entropy Visualizations, Daniel Hardman. dhh1128/papers, amp-diff.md, main @`68a5e2f76` (2026-09-28). Mined in raw/05 and raw/06.
- ASAAU — Authorizing Services and Automation Users, Provenant. provenant-dev/origin-platform, docs/authorizing-services-and-automation-users.md, main @`cb758b1b5` (2026-08-26). A private client repository; vendor practice, [practice]. Mined in raw/12.
- authenticity-vs-veracity.md — Authenticity vs. Veracity, Daniel Hardman. dhh1128/papers, authenticity-vs-veracity.md, main @`68a5e2f76` (2026-09-28). Mined in raw/05 and raw/06.
- AuthorizationEVAC.pdf — ACDCs for Delegable Authorization, slide deck, Samuel M. Smith. SmithSamuelM/Papers, master @`b47f21597` (2026-08-11), presentations/AuthorizationEVAC.pdf, added `3ec04c2` (2026-04-30); read through pdftotext, cited by page. [proposal]. Mined in raw/19.
- background.md — KERI: Canonical Background for Security Analysis (v0). dhh1128/keri-security-analysis, background.md, main @`149fa6c35` (2026-04-23, the repository's only commit; mined 2026-07-17). Security analysis, not specification text; it carries no provenance marker. Mined in raw/07.
- CESR spec — Composable Event Streaming Representation (CESR) specification, Trust Over IP. trustoverip/kswg-cesr-specification, spec/spec-body.md, main @`bad6edd84` (2026-08-28) for unmarked and [spec] citations; v1.1 @`65fd7518b` (2026-08-26) for the [spec-next] post-quantum code table mentioned in [section 12](#verify-the-code). Mined in raw/02.
- CESR spec GitHub — Sam Smith's comment of 2026-03-19 on trustoverip/kswg-cesr-specification pull request #165 (R-018), read from the read-only API cache of 2026-10-14 (`.ignored/sam-rulings-cache/`) and checked against the cached text. [proposal]. Mined in raw/21.
- cr-ad-trust.md — Cryptographic vs. Administrative Trust: KERI's Witness/Watcher Architecture and X.509 Certificate Transparency. dhh1128/keri-security-analysis, cr-ad-trust.md, main @`149fa6c35` (2026-04-23, the repository's only commit; mined 2026-07-17). Security analysis, not specification text; it carries no provenance marker. Mined in raw/07.
- dg-c02-claude.md — Analysis of DG-C02, a claim from Del Giudice's thesis. dhh1128/keri-security-analysis, dg-c02-claude.md, main @`149fa6c35` (2026-04-23, the repository's only commit; mined 2026-07-17). Security analysis, not specification text; it carries no provenance marker. Mined in raw/07.
- dg-c03-claude.md — Analysis of DG-C03, a claim from Del Giudice's thesis. dhh1128/keri-security-analysis, dg-c03-claude.md, main @`149fa6c35` (2026-04-23, the repository's only commit; mined 2026-07-17). Security analysis, not specification text; it carries no provenance marker. Mined in raw/07.
- dg-c06-claude.md — Analysis of DG-C06, a claim from Del Giudice's thesis. dhh1128/keri-security-analysis, dg-c06-claude.md, main @`149fa6c35` (2026-04-23, the repository's only commit; mined 2026-07-17). Security analysis, not specification text; it carries no provenance marker. Mined in raw/07.
- Dossier spec — Dossier specification, Trust Over IP. trustoverip/kswg-dossier-specification, spec/dossier-spec-body.md and schemas/endorsement.json, main @`b9227753c` (2026-09-03). Mined in raw/04.
- GOC — General Origin Platform Characteristics, Provenant. provenant-dev/origin-platform, docs/general-origin-characteristics.md, main @`cb758b1b5` (2026-08-26). A private client repository; vendor practice, [practice]. Mined in raw/12.
- HWGA — How We Generate Aliases, Provenant. provenant-dev/origin-platform, docs/how-we-generate-aliases.md, main @`cb758b1b5` (2026-08-26). A private client repository; vendor practice, [practice]. Mined in raw/12.
- KERI spec — Key Event Receipt Infrastructure (KERI) specification, Trust Over IP. trustoverip/kswg-keri-specification, spec/spec-body.md, main @`fbdd4a615` (2026-08-28) for unmarked and [spec] citations; v1.1 @`3753f3797` (2026-08-26) for the [spec-next] `DID` trait citations in [section 8.4](#did-trait). Mined in raw/01.
- keri-primer.md — A Primer on KERI, ACDCs, and CESR, Daniel Hardman. dhh1128/papers, keri-primer.md, main @`68a5e2f76` (2026-09-28). Mined in raw/05 and raw/06.
- keri.one — keri.one homepage, Samuel M. Smith, https://keri.one/. Mined 2026-07-17 and re-verified against the live page 2026-10-03. Mined in raw/13.
- KERIA — KERIA, WebOfTrust/keria, src/keria (including authing.py), README and pyproject.toml. main @`7e685edaa` (2026-09-11) for the request-freshness claims in [section 5.2](#bearer-tokens); main @`928ce26a4` (2026-09-30) for the `keri==1.2.14` dependency pin in [section 12](#verify-the-code). Mined in raw/10.
- KERIConf26 caption — KERI Conference 2026 edited auto-captions (Lehi, Utah, 22-23 April 2026), keri-foundation/CONF26-subtitles @`006042d39` (2026-10-04): Samuel Smith, The Future of KERI; Phil Feairheller, ACDCs for Authorization; the Ryan Hansen panel, What KERI allows us to do that we couldn't before. Cited as the captions read, for status and intent only, and paraphrased here, never quoted. Mined in raw/19 and raw/20.
- keripy — keripy, the KERI reference implementation, WebOfTrust/keripy, src/keri and tests/sedi. main @`80f77b73b` (2026-10-01, mined 2026-10-03) for the claims re-read in that pass, which carry that stamp; main @`b8f60166b` (2026-09-14) for claims not re-read since, which keep theirs; code locators with no commit come from earlier passes of raw/09. A keripy [code] is a claim about keripy main, on its 2.1.0-dev line, and not about KERIA, which pins keri==1.2.14 ([section 12](#verify-the-code)). Mined in raw/09 and raw/16.
- keripy GitHub — Sam Smith's comments in WebOfTrust/keripy conversations: pull request #1505 (2026-07-17, R-029), and discussions #1515 (body), #1570 (2026-08-04, R-012) and #1574 (2026-08-07, R-042). Read from the read-only API cache of 2026-10-14 (`.ignored/sam-rulings-cache/`), quotes checked against the cached text; Sam's typing errors are kept as written. [proposal]: an editor's comment, not specification text. Mined in raw/21.
- keripy-knowledge — keripy-knowledge, a distilled contributor knowledge base for keripy, on the orphan branch knowledge of dhh1128/keripy, @`9489ac9bd` (2026-07-02, mined 2026-09-15). Cited here for its invariants (H1, D1, D3) and landmines (L4, L5, L6, L9, L15, L16, L17). Its declared code baseline is keripy `60ab9e08d`, 493 commits behind `b8f60166b`; [section 12](#verify-the-code) says what that means for its claims. Mined in raw/08.
- kids#1 — WebOfTrust/kids#1, a GitHub conversation on a draft KERI Improvement Document about watchers, never merged; Samuel M. Smith's comment of 2023-11-05. Maintainer statements, [proposal]. No raw note mines it; [chapter 02, section 9](02-security-model-and-threat-posture.md#observer-layer) quotes the same thread.
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
