# 07 — Shibboleths and Anti-Patterns

**Thesis.** Every technical community has shibboleths — framings that instantly mark a speaker as an insider or an outsider — and KERI's are unusually load-bearing, because the whole architecture is a deliberate, point-by-point correction of the priors that PKI, IAM, blockchain, and mainstream verifiable-credentials work install in the people who grew up on them. A reviewer who reasons from those priors will produce critiques that KERI's core contributors recognize instantly as category errors: criticizing a duplicity-*evident* system for not being duplicity-*resistant*, asking who the trusted authority is, wanting global consensus or finality, treating a witness as a CA, treating revocation as a blocklist, treating a credential as a signed envelope, or treating "decentralized" as a synonym for "on a ledger." This section is a catalog of those outsider-tells. For each, it states the generic framing the outsider brings, explains precisely why that framing is a category error *in KERI's own terms*, gives the KERI-correct reframing, and cites the source. It closes with the single most important habit an adversarial reviewer of *this codebase* can cultivate — the reflex to check what the code actually enforces before believing what the prose claims — because KERI's implementations contain real, documented gaps between the doctrine and the machine. The goal is inoculation: after this section, a reviewer should be able to hear their own PKI/blockchain/OAuth reflexes firing and catch them before they reach the page.

---

## 0. How to read this chapter

This chapter is about framings rather than about pins, so it carries tier markers only in the handful of places where a tier is load-bearing — where the correction to a shibboleth lives on one branch of a specification and not the other, or where the evidence is code rather than text. Where no marker appears, the citation is a paper or the standardizing line of a specification, and should be read as the latter.

- **[N]** — in the line the community is actively standardizing: the KERI specification's `main` @`fbdd4a615`, the ACDC specification's `main` @`f0bd097de`, the CESR specification's `main` @`bad6edd84`, the Dossier specification's `main` @`b9227753c`.
- **[N1.1]** — in a specification's `v1.1` branch and *not* in `main`: KERI @`3753f3797`, ACDC @`2362e48a1`, CESR @`65fd7518b`. New thinking that is likely, not certain, to fold into the next standard. It binds nobody today and must never be quoted as normative.
- **[K]** — what an implementation does at a named commit: keripy `main` @`b8f60166b` (2026-09-14), KERIA @`7e685edaa`, signify-ts @`ffba8406e`.
- **[P]** — proposed in a discussion or a whitepaper, and present in no specification branch.

A marker is never upgraded for convenience. Two applications of that rule bite in this chapter: text that exists only on a `v1.1` branch is not `[N]` however obviously it reads as a correction, and an unmerged branch on a personal fork is not `[K]`.

---

## 1. How a shibboleth works here, and why it matters

A shibboleth is not merely jargon. It is a framing whose *shape* encodes an assumption. When an outsider says "how does KERI revoke a certificate," the words "certificate" and "revoke" smuggle in the entire X.509 model — an issued artifact with a validity window, a separate revocation list, a phone-home check — none of which exists in KERI. The question cannot be answered on its own terms; it must first be *reframed*, and the need to reframe it is the tell.

This matters for a review panel for two reasons. First, a critique built on a smuggled assumption is not just wrong, it is *unfalsifiable from inside the outsider's model* — the reviewer will keep finding "missing" features that were deliberately never there. The security-analysis corpus makes this the first rule of its analysis method: an analyst "MUST restate the claim verbatim... If you cannot do so, stop and ask," and must "name the objective function first," precisely because "outsider critiques smuggle in unstated invulnerability goals" (`standard-analysis.md` §0). Second, KERI's own advocates are candid that some outsider critiques *survive* reframing — the observer/watcher infrastructure really is immature, the formal literature really is thin — so a reviewer who cannot separate the category errors from the genuine residuals will either dismiss KERI wholesale or swallow it wholesale, and both are failures of the same discipline (`dg-c02-claude.md` §5-6; wtbo.md §5-6).

The catalog below is organized by the outsider's home domain, because that is how the reflex fires. Each entry follows the same shape: **the framing**, **why it is a category error**, **the reframing**, all cited.

---

## 2. PKI / X.509 / CA tells

### 2.1 "Who is the trusted authority / who vouches for the identifier?"

**The framing.** In PKI the root of trust is an administrator: a CA signs a certificate that asserts a binding between an identifier and a key, and relying parties trust the CA's operational process. The outsider reflexively asks who plays that role in KERI.

**Why it is a category error.** KERI's foundational move is to eliminate the role, not to fill it. "The fundamental flaw... is the separation of the identifier from the cryptographic keys that control it"; in X.509 the binding is "merely an assertion — a digital certificate — signed by a third party," creating "a root of trust that is external to the identity itself" (keri-primer.md §1). The KERI spec states the same flaw as a verifiability failure: the CA's certificate "is not made with the controlling keypairs of the identifier but made with keypairs controlled by the CA," giving "evidence of authenticity of the assignment... but not evidence of the veracity of the mapping" (KERI spec §Overcoming existing security overlay flaws, L81).

**The reframing.** "The identifier is the root of trust" (keri-primer.md §1.3). An AID is self-certifying — cryptographically derived from its own controlling keys — so its authenticity "can be verified without any external authority" by replaying its KEL (`cr-ad-trust.md` §4). There is no authority to vouch for it because the mathematics vouches for it. Asking "who is the CA" is like asking who notarizes a hash: the question presumes an administrative layer the design deletes.

### 2.2 "The strength of the system is the rigor of the CA's vetting."

**The framing.** PKI experts locate assurance in how carefully the issuer vets applicants. The reflex is to evaluate KERI by asking how rigorously *its* issuers vet.

**Why it is a category error.** It targets the wrong locus of risk. "*Certificate authorities aren't the ones that choose or manage the keys in certs.* Holders of certs do that. It's the key management of *holders* that's the ubiquitous locus of the risk" (x509-prob.md §Governance). The CA vets an applicant once; thereafter the security of every certificate depends on the holder's opaque, unauditable key custody — the "missile silo" guarded by "one opaquely managed secret" (x509-prob.md §Governance). All the CA machinery "guarantees... is that someone provided a public key before the certificate was created" (x509-prob.md §Governance).

**The reframing.** KERI moves assurance into *observable key management*: pre-rotation, weighted multisig, witnessing, and anchoring are all declared in the public KEL and are continuously verifiable. "KERI's real innovation in multisig is less about inventing and more about exposing: multisig is optional and infinitely variable, but defining and following policy about it is required" (keri-primer.md §2.4). The right question is not "how good is the vetting" but "what does the key-state history actually show, and can I replay it myself."

### 2.3 "Renew the credential / rotate to a new certificate."

**The framing.** Certificates expire and are renewed; a compromised key is handled by issuing a fresh, unrelated certificate.

**Why it is a category error.** It conflates identity with privilege. "Identity means *sameness*: the thing that holds constant across contexts" (wtbo.md §1); "An organization incorporated in 1975 doesn't renew its identity every ninety days" (`cr-ad-trust.md` §1). X.509's mandatory Validity field means "Evidence of identity expires by design, not by necessity" (`cr-ad-trust.md` §1). Renewal, moreover, "proves less than it appears": it "demonstrates that a CA is willing to re-assert a binding, not that the underlying key was rotated, that the old key was retired, or that any meaningful change in key management occurred" (wtbo.md §1). Re-issuing after compromise "is essentially the same as starting over by creating a brand-new independent mapping" (KERI spec, L83), with "no cryptographically Verifiable way to link the new... key(s) to the prior" (KERI spec, L83).

**The reframing.** A transferable AID persists across every key change: "The identifier string remains constant even as the keys change... Identity survives key rotation" (keri-primer.md §2.1). Rotation is a *linked* event in the KEL, cryptographically chained to the prior state, not a fresh unrelated artifact. "Renewing an *identity* is a non-sequitur" (x509-prob.md §Lifespans). The dynamic thing that *should* expire — a privilege, a role grant — is carried by a separate ACDC, not by the identity itself.

### 2.4 "Pin the key / pin the certificate for continuity."

**The framing.** To get continuity across a connection, pin the key you saw last time.

**Why it is a category error / the tell.** In 2026 Google Cloud advised customers *not* to pin certificates because pinning "will cause your application to break during routine certificate rotations" (x509-prob.md §Prerotation). That advice is itself the tell: "there is no cryptographic thread joining the old key to the new one, so a relying party that pinned the old key pinned nothing durable — the only continuity on offer is the CA's say-so" (x509-prob.md §Prerotation; wtbo.md §1). The industry's own guidance concedes that X.509 continuity is administrative, not cryptographic.

**The reframing.** "Prerotation is exactly what would let a relying party commit to a durable cryptographic anchor *and* survive the rotation" (x509-prob.md §Prerotation). A relying party pins the *AID* — which is stable across all rotations — and follows the KEL forward; the durable anchor and rotation survival are the same fact. Notably, the fix here is to "trust *more* administrative anchors, not fewer" in PKI, versus KERI's single cryptographic anchor (wtbo.md §1).

### 2.5 "Trust ultimately bottoms out somewhere administrative anyway."

**The framing.** All trust chains end at some human authority; KERI just moves the humans around.

**Why it is a category error.** The claim is about *where* the chain bottoms out, and the answer is genuinely different in kind. "CT's chain of assurance bottoms out in administrators... KERI's bottoms out in mathematics: the self-certifying identifier derives from the initial public key, and the KEL's validity can be checked by anyone who replays its hash chain, without querying any authority" (wtbo.md §3). This is not rhetorical: the KEL replay requires no trusted third party at any step.

**The reframing.** Trust bottoms out in the controller's custody of its own keys plus the soundness of the hash and signature primitives — assumptions A1 (cryptographic soundness) and the controller's key secrecy — and nothing else (`background.md` §4.6). Governance and reputation still matter for *veracity* (see §9), but the *authenticity* chain is closed cryptographically. A reviewer should insist on this distinction: KERI does not claim to abolish human judgment, only to remove it from the authentication path.

### 2.6 "Publishing the same AID at several well-knowns strengthens the AID binding."

**The framing.** Corroboration across independent sources makes a binding stronger. This is the reflex behind multi-perspective domain validation, DNS CAA checks, and the ordinary advice to look a fingerprint up in a second place — and it fires hard on KERI's OOBA pattern, where a controller publishes the same AID at two or more `/.well-known/oobi/{aid}` URLs on independently controlled namespaces. The outsider reads agreement across the namespaces as evidence about the identifier.

**Why it is a category error.** The binding was never in the well-knowns to be strengthened. **[N]** The KERI specification states the limit itself, and states it as a limit: "This pattern does not change the trust model of an OOBI", because "the AID binding produced by resolution is still cryptographically verified through KERI in the usual way", and "The multi-factor arrangement governs only whether the recipient is willing to bootstrap from the OOBIs at all" (KERI spec §OOBI with MFA, L2838 @`fbdd4a615`; present verbatim on `v1.1` too). This is the §2.5 error in a new costume: administrative corroboration reasserting itself where a cryptographic anchor already closes the chain. An OOBI's worst case was never a false binding — "an OOBI may be part of a DDOS attack but not as part of a service endpoint cache poison attack" (§OOBI Forwarding, L2831) — so agreement across namespaces cannot improve a property that resolution verifies unconditionally.

**The reframing.** OOBA is a **willingness-to-bootstrap** control, and the thing it multiplies is the attacker's cost of *denying or flooding* discovery, not the confidence in what discovery returns. The independence requirement makes this legible: it is required of the delivery channel and not merely of the namespace — "Each well-known OOBI URL is delivered to the recipient through a channel whose compromise is independent of the others" (L2838) — so two URLs in one email are one factor, which is a statement about channels, not about identifiers. The tell to catch is any sentence in which the count of well-knowns appears as an input to an authenticity judgment. Note also that the recipient's threshold has no encoding anywhere and no owner in the protocol, deliberately: the controller declares its witness threshold in its KEL because that threshold is about accountability, and declares nothing about `wurls` because this one is about the recipient's own willingness.

---

## 3. Revocation, CRL, OCSP, and phone-home tells

### 3.1 "How does KERI revoke — where is the CRL / OCSP responder?"

**The framing.** Revocation is a separate subsystem: a list you download (CRL) or an endpoint you query at verification time (OCSP).

**Why it is a category error.** There is no separate revocation layer to point at. Key state "lives in the KEL" and is "continuously current"; a revoked or abandoned identifier is signaled *inside the log itself* by rotating to a null next-key list (`cr-ad-trust.md` §2, §4; KERI spec, L340). Worse, the outsider's model is actively criticized: OCSP "requires the client to query a central responder for every validation, creating a privacy leak (the CA knows every site you visit)," and when the responder is offline browsers "fail open," so "The system is most vulnerable precisely when it is most needed" (keri-primer.md §1.1; wtbo.md §2). CRLs are "heavy, bandwidth-intensive... scale poorly" (keri-primer.md §1.1).

**The reframing.** For key state, revocation is just the current head of the replayed KEL. For credential status, KERI uses a **TEL (Transaction Event Log)** whose state is anchored in the issuer's KEL, checked "without privacy leaks or 'fail open' risks" (`cr-ad-trust.md` §3). The ground truth is even sharper than the prose: the reference verifier, on encountering a revoked credential, does *not* raise — it logs and continues so it can "save a revoked credential"; revocation is a TEL *state transition* (`Ilks.rev`/`brv`), queried from the TEL, not a delete or a blocklist (`vdr/verifying.py:129-132`, notes 09 §4).

### 3.2 "A registry / status endpoint is consulted at verification time."

**The framing.** Verification legitimately reaches out to an authority to confirm current status.

**Why it is a category error.** Any verification-time callback reintroduces exactly the runtime trust dependency that end-verifiability exists to eliminate. "A registry consulted at verification time is a phone-home in disguise" (`sda.md` §7). The ACDC spec builds the rejection into its architecture: the **Observer/Registrar split** lets a Validator check an ACDC's status "without exposing a point of validation (PoV)" and syncs on state changes rather than at presentation — "no forced phone home validation" (ACDC spec §TEL Registrars and Observers, L1693). This is a direct, named rejection of the OCSP/CRL model.

**The reframing.** "Verification must succeed from the credential and key-state alone, and any registry or log is an issuance-time and audit-time convenience, never a verification-time dependency" (`sda.md` §7). Applied design corroborates: a download URL in a credential is "phone-home by another name... and creates an availability chokepoint," which is why SEDI commits an image by digest and has the holder carry the bytes rather than linking to a resolvable location (`sedi-id/index.md` §Image). The tell to watch for in a deployment review is any credential field that resolves to a live endpoint at verification time.

### 3.3 "Certificate Transparency already solved this."

**The framing.** Append-only public logs plus monitors give detection; KERI is reinventing CT.

**Why it is a partial truth that becomes a category error.** The corpus is explicit that CT and KERI share DNA — both are "fundamentally detection-oriented. Neither prevents a bad actor" (wtbo.md §3), both use append-only hash-chained structures and signed receipts. But CT "is a detection mechanism, not a prevention mechanism; fraudulent certificates may be usable for a time" and, decisively, it "redistributes administrative trust rather than eliminating it" (keri-primer.md §1.1; wtbo.md abstract). The ultimate arbiter of CT remains "a handful of browser vendors" with "immediate, global effect... no formal appeals process" (wtbo.md §1, Note [b]). "The result is not a decentralized trust hierarchy. It is a more elaborate one" (`cr-ad-trust.md` §2).

**The reframing.** KERI keeps CT's detection orientation but changes *what detection bottoms out in*. "Unlike certificate transparency, KERI enables the detection of Duplicity in the Key state via nonrepudiable cryptographic proofs of Duplicity, not merely the detection of inconsistency... that MAY or MAY NOT be duplicitous" (KERI spec, L85). The witness/watcher split is the CT analogue (witnesses ≈ CT logs, watchers ≈ monitors), but a KERI watcher makes "an observation — surfacing cryptographic evidence," whereas a browser root program makes "an enforcement decision... with immediate global consequences" (wtbo.md §4). Detection without re-centralized enforcement is the distinction; a reviewer who says "just use CT" has missed the re-centralization critique.

---

## 4. Blockchain / consensus / global-ordering tells

### 4.1 "You need a ledger / global consensus / total ordering."

**The framing.** Decentralized identity needs a blockchain so that everyone agrees on one history.

**Why it is a category error.** Global total ordering across identifiers is an *explicit non-goal* (`background.md` §1.3). The reasoning is precise: key events are "idempotent authorization operations as opposed to non-idempotent account balance decrement or increment operations. Total or global ordering may be critical for non-idempotency, whereas local ordering may be sufficient for idempotency" (KERI spec §KAWA insight, L1836). Because "the controller is the sole source of truth for the creation of any and all key events, it alone, is sufficient to order its own key events" (KERI spec, L1836). "KERI rejects the need for global consensus regarding identity. Instead, it uses microledgers called key event logs (KELs)" (keri-primer.md §2). Del Giudice-background readers who "interpret 'not duplicity-resistant' as a criticism" are "Misunderstanding KERI as 'weaker than a blockchain' when it solves a different problem" (`dg-c03-claude.md` §6).

**The reframing.** Each AID has its own microledger; "Event 5 for Identifier A must come after Event 4 for Identifier A, but it has no required ordering relative to Event 5 for Identifier B" (keri-primer.md §2). This yields horizontal scaling, cross-jurisdiction ease, and decayed hacking incentives (a breach is scoped to one identifier). Where a ledger is ever used it is only a last-resort tiebreaker in the total-compromise case, requiring "minimal use of a distributed consensus ledger" (KERI spec, L1888). The reference implementation embodies this: recovery *forks* the KEL and keeps the disputed branch visible (`eventing.py:3143-3149`, notes 09 §4) — the opposite of a single globally-agreed chain.

### 4.2 "Anchoring signatures in time sounds like a blockchain."

**The framing.** To prove when a signature was made you need a total order, hence a chain.

**Why it is a category error.** The anchoring requirement is strictly weaker than a ledger. "We don't need to know the relative order of two signing events — only how any one event relates to its key state. That means no total ordering, and no cumbersome consensus algorithm... no permissioning problem, no big central *anything* in the sky, no scale or performance bottlenecks, and no regulatory problems with data locality, privacy, or erasure" (was.md §Solution). KERI implements it with "tiny, identifier-specific files called KELs... and TELs" that anchor the hashes of signed events (was.md §Solution).

**The reframing.** Anchoring establishes the position of a signature *relative to its own identifier's key-state history*, which is all that is needed to defeat the retrograde attack (see §11). "Sounds like blockchain" is a lazy tell precisely because it assumes the strong property (global order) when only the weak one (per-identifier order) is required.

### 4.3 "Immutability requires a chain."

**The framing.** Tamper-evidence and immutability are blockchain properties.

**Why it is a category error.** A SAID gives tamper-evident content-addressing and immutability with no ledger and no consensus: "a SAID will verify if and only if its encompassing serialization has not been mutated, which makes the content immutable" (CESR spec §SAID, L1196). CESR is "a streaming format, not a chain" (notes 02 §15).

**The reframing.** Immutability is a property of a cryptographic commitment, not of a distributed agreement protocol. "A Merkle inclusion proof establishes placement in a history. A SAID establishes identity of content" (acdc-and-mtc.md §3.2) — different proof obligations, only one of which needs a chain.

### 4.4 "But then how do you honor the right to be forgotten?"

**The framing.** A shared immutable ledger and GDPR erasure are fundamentally incompatible, so KERI must have the same problem.

**Why it is a category error.** KERI's "non-intertwined trust bases" mean "a given identifier's data may be erased and truly forgotten" (keri.one homepage). Because KELs are per-identifier microledgers, "'forgetting' an identifier requires a hard fork of the entire chain" only on a blockchain; in KERI a user can delete "their specific Key Event Log... without disrupting the global ecosystem" (keri-primer.md §3.5). And ACDC payloads are held off-chain: the KEL stores only anchors (hashes), so deleting the payload "leaves an irreversible hash; identity history intact, personal data removed" (keri-primer.md §3.5).

**The reframing.** RUN replaces CRUD: "there is no Delete. Instead of Delete, Peers Nullify" — but naive total erasure "exposes the data controller to a replay attack of erased data," so a nullified record is kept as an invalidity marker while its confidential payload is discarded (KERI spec §RUN off the CRUD, L2870, L2927). Erasure is a first-class outcome by construction, not a fatal contradiction.

---

## 5. OAuth / OIDC / SAML / IAM / perimeter / federation tells

### 5.1 "Authentication precedes authorization as one indivisible login."

**The framing.** A user logs in once (auth), gets a session/token, and is thereafter authorized (authz) by presenting that token — the sentry-at-the-gate model.

**Why it is a category error.** This is "a natural consequence of a perimeter-oriented mindset... all the way back to... a sentry challenged someone approaching the gate" (ASAAU Appendix). The perimeter re-challenge is satisfied merely by producing "a token that the sentry gave them," and internal challengers "don't do any deep checking of their own... because the token is too lossy to support deep checking anyway. The token is thus faster but less safe and far more opaque than verification at the perimeter" (OS §1). The named technologies — "IAM, SAML, OAuth, OIDC, LDAP, AD, API keys — are mostly embodiments of perimeter security" (OS §1).

**The reframing.** Zero-trust: "assume everything — outside OR inside the perimeter — is unsafe until proven otherwise" (OS §1). Every request is independently signed and verified at every hop; there is no "trust after entry" (GOC §2). Authentication and authorization are *partially dissociated* into **Attribute-Based Authorization**: "someone can receive permission if they can prove certain characteristics, even if a sentry does not (yet, or maybe ever) know who they are" (ASAAU Appendix). The voting-booth example (prove citizenship, not identity) and the pharmacy example (any licensed doctor may browse; authenticate only when accountability attaches) show authz preceding auth.

### 5.2 "Use a bearer token / session / API key to call the service."

**The framing.** Hold a bearer credential; possession is authorization.

**Why it is a category error.** A bearer token is "a signet ring handed out for an errand": "Possession of an API key... makes the holder indistinguishable from the account it belongs to, free to do anything that account can" (`sda.md` §1). It is opaque, replayable, long-lived, and exfiltratable from the server. The applied doctrine is categorical: "We do not use sessions, cookies, tokens, JWTs, OAuth, OIDC, SAML, or any similar technologies to secure calls" (ASAAU item 0 / GOC §2).

**The reframing.** Identity is an AID; proof is a *fresh signature per request* over the method, path, resource header, and a timestamp (RFC 9421 message signatures) (GOC §2; notes 10 §7a). "A stolen header set can't be replayed against a different method/path, and there is no long-lived secret to exfiltrate from the server" (notes 10 §4). The signet-ring/errand distinction is the doctrine: "The key authorizes an act; the ring authorizes a person to stand in your place" — never hand over the ring for an errand (`sda.md` §1).

**The boundary, which runs in both directions and must be stated whenever this row is used.** The signature is better than a bearer token in two respects a token cannot match: the stolen header set is scoped to **one method and path pair**, and to **one key state**. It is not better in the respect an outsider will assume, because **neither side of the channel enforces freshness**, and on that one pair the captured request therefore replays indefinitely. **[K]** In KERIA at `7e685edaa`, `Signify-Timestamp` is folded into the signed byte string alongside every other covered field and is never parsed into a datetime — `fromIso8601` does not appear in `authing.py` at all, and the file's only two time calls are outbound stamps. The RFC-9421 `expires` and `nonce` params are appended to the signature-params string, so they are cryptographically bound, but `expires` is never compared to a clock and there is **no replay cache**: nothing in `src/keria` stores a seen nonce (notes 10 §2). **[K]** signify-ts at `ffba8406e` is the same on the client half — `authing.ts` folds `input.expires` into the params string and never compares it, and its ESSR path checks only that a timestamp is *present*, which is a presence check and not a freshness check (notes 10 §2). What the signature buys is therefore **request integrity and origin authentication, not replay protection**, and what retires a stolen header set is **key rotation, not expiry**. The fields needed to enforce freshness are present and signed, so enforcement would be a verifier change with no wire change — which is a reason not to read this as a design flaw, and not a reason to read "the fields exist" as "the protocol resists replay."

### 5.3 "The server is trusted infrastructure; the cloud holds my keys."

**The framing.** A cloud agent, KMS, or HSM-as-a-service holds and uses your private keys and is the authority (custodial-wallet / cloud-KMS mental model).

**Why it is a category error.** In the KERIA/Signify architecture the cloud agent "never has access to the decryption keys" and holds "only the public keys and blake3 hash of the next keys" in cleartext (signify-ts README; notes 10 §2). "Agents... don't have the secrets of the client" (keria README). The custodian is "a blind store + relay, not a signer." Inverting the usual asymmetry, the *client authenticates the server*: the agent signs every response, and the client rejects a response "from a different remote agent" or one whose signature fails (`clienting.ts:240-255`).

**The reframing.** "Signing at the edge": key generation and event signing happen on the client; the cloud does event *storage* (encrypted) and *validation* only (signify-ts README; notes 10 §1). Externally the agent is "just another KERI node relaying edge-signed CESR" and "contributes no authority to the controller's events" (notes 10 §4). A cloud agent adding authority is the CA/federation prior reasserting itself.

### 5.4 "Federation decentralizes."

**The framing.** Centralization is cured by federating — a hierarchy of trust domains.

**Why it is a category error.** KERI people see federation as compounding the disease, not curing it. Centralization "provides a locus for abuse, and creates silos. This is typically solved by aggressive federation (centralization hierarchies)," and "When you combine these 'solutions', you get the worst of all worlds, not the best" (OS §1). Trust registries get the same verdict: "a band aid; they just move the centralization back to a different level of the architecture" (x509-prob.md).

**The reframing.** Decentralization comes from self-certifying roots plus chaining, not from federated hierarchies. In the vLEI graph "A verifier receiving an employee's credential can traverse the chain back to GLEIF without consulting a trust registry. The entire graph is self-certifying" (acdc-vc-diff.md §Real-World Validation). Chaining "eliminates the need for trust registries" (x509-prob.md).

### 5.5 "Secure the pipe (VPN/TLS) and the data inside is safe."

**The framing.** Transport-layer security (TLS/VPN) protects data end to end.

**Why it is a category error.** "The walls of a pipe may be a secure perimeter, but every place where a pipe ends is a gap"; a realistic routed path has "at least 8" joints where "data is siphoned off, trust rules change, or trust input data changes while holding rules constant" (ASAAU §3.6). This is not hypothetical: SSL-visibility appliances deliberately MITM TLS, and eIDAS reforms "appear to be planning legislation that allows the same attack to be carried out by national governments" (ASAAU §3.6). And "Secure pipes protect data in motion, but not data at rest" (ASAAU §3.6).

**The reframing.** "Move Security with the Data, Not the Transport" (GOC §8) — sign (and where needed encrypt) the payload itself, so authenticity travels with the data through every joint. This is message-level security (IETF MLS) and ToIP's Trust Spanning Protocol, not transport-level. The honest caveat, which a reviewer should preserve: KERI deployments still keep TLS for cheap defense-in-depth, but "do not expend massive effort guaranteeing that our secure pipes are perfectly leak-proof" (ASAAU §3.6).

---

## 6. SD-JWT / W3C-VC / DID "decentralized" drift tells

This family is the subtlest, because the outsiders here believe they are *already* doing decentralized identity. The KERI position is that SD-JWT, W3C-VC, and most DID methods imported PKI/OAuth assumptions and thereby re-created centralization one level up while losing fidelity.

### 6.1 "A credential is a signed envelope (paired signature)."

**The framing.** A verifiable credential is data plus a `proof` block; the signature travels with the container because the format says so (W3C-VC `proof`, JWT bundle, X.509 `tbsCertificate` + `signature`).

**Why it is a category error.** A *paired* signature binds to the container context and only to the current verification moment. ACDCs are not directly signed at all: they are "bound to the Issuer's Key State... and the Issuer's Key State is signed. This enables the Key State of the Issuer to change independently of the ACDC state" (ACDC spec §Binding to Key State, L1673). The explicit contrast: in schemes "where the credentials are signed directly... a key rotation forces all the credentials signed with a given set of keys to be revoked; otherwise, a key compromise would enable the compromiser to issue... forged [credentials]" (ACDC spec, L1675).

**The reframing.** ACDCs use **anchored signatures**: a provable KEL association independent of container context. Validity is judged against "the issuer key state AS OF its KEL anchor's sequence position, not current key state or wall-clock" (keripy-knowledge invariant H1; primer §3.3). NIST SP 800-102 is the grounding: a signed message "provides no assurance that the private key was used to sign the message at that time" (primer §3.3). Anchoring removes that ambiguity without an external timestamp authority.

**The citation to hand an outsider, and two guards on it.** The Dossier specification swept its own text for this exact conflation and now states the correction more flatly than the ACDC spec does. **[N]** "A dossier is not a signed document. The issuer does not compute a signature over the dossier ACDC and attach that signature to it as proof of authenticity" (Dossier spec §How a Dossier Is Issued: Anchoring, Not Attached Signatures, L13-14 @`b9227753c`); "The signature exists on the anchoring key event, not on the dossier. What binds the issuer to the dossier is the anchor: a commitment to the dossier's SAID" (L27-28). The schemas carry it too, which is the useful part for an implementer: an endorsement "is authenticated by anchoring... It is not signed and carries no attached signature" (`schemas/endorsement.json` `description`, L5). It is the better citation for an outsider than the ACDC spec's §Binding to Key State because it argues from key rotation and log properties rather than from ACDC internals: an attached signature can be checked "only against the key that produced it, and nothing in the signature itself establishes when it was made" (L32-34), so "once that key is rotated or compromised, a verifier has no way to distinguish a signature made while the key was authoritative from one made afterward" (L34-36). Two guards, because a reviewer who arrives at this row from the slogan will over-read it. First, **the partition is drawn on lifespan, not on artifact kind**: the same spec says "key events are signed, and so are the short-lived transactional objects... Dossiers, endorsements, and other ACDCs are anchored" (L45-55), so "ACDCs are never signed" overstates the doctrine and misstates its reason. Second, **an attached signature is explicitly permitted in the ephemeral case** — a dossier that "lives only for the duration of a single interaction, and that will never be verified after the issuer's next key rotation, MAY be authenticated by an attached signature" (L59-62) — guarded by the sentence that makes the permission safe: "A verifier MUST NOT treat an attached signature as equivalent to an anchor when evaluating a dossier as of any referenceTime other than the present" (L77-79). The doctrine is about what survives a rotation, not about which bytes may carry a signature.

### 6.2 "DIDs already solved decentralized issuance."

**The framing.** DIDs create indirection — issue to an identifier, not a key — so holder key rotation is handled; the problem is solved.

**Why it is a category error.** They solved *half* the problem. "Evidence is also *issued by* an identifier... If the issuer updates their identifier, old evidence is invalidated" — "This risk is poorly understood in SSI circles" (x509-prob.md §Much better alternatives). Worse, "*most DIDs, including crowd favorites like did:web, can only be resolved to the current key state*," so historical actions are unprovable unless the method supports `versionId`/`versionTime`, which most lack (was.md §Mitigation 3). An issuer key compromise then "invalidates all the evidence they have ever created" — "the driver's license bureau whose recover-from-breach plan required all current license holders to come back to the office" (was.md).

**The reframing.** A transferable AID resolves to key state *at any point in time* via KEL replay, so issuer-side rotation does not invalidate historical evidence. "AIDs can be transformed to DIDs, but the opposite transformation is typically impossible" (sdjwt-acdc.md §2.2) — the AID is the richer, lossless form. This is the RAW-vs-JPEG doctrine: keep the lossless ACDC authoritative and *generate* a VC when an ecosystem needs one; "once you've chosen a lossy format as your primary evidence, you cannot reconstruct what you've lost" (acdc-vc-diff.md §Lossless vs. Lossy).

### 6.3 "SD-JWT gives you selective disclosure and issuer flexibility."

**The framing.** SD-JWT is a standard, flexible, standalone token supporting selective disclosure and any identifier type.

**Why it is a category error.** SD-JWTs are standalone envelopes, so they "will need registries of trusted issuers... centralized, governed, and managed for scale," which "reinforce[s] boundaries between verticals" (sdjwt-acdc.md §2.4). They sign a *key*, not an identifier (`kid` points at the key), so "*tokens are only designed to be evaluated against current key state*. If keys change, all existing tokens become invalid" (sdjwt-acdc.md §2.3). And `iat` is self-asserted (sdjwt-acdc.md §2.3). Identifier flexibility, far from a virtue, "makes it much more difficult to predict or enforce security properties" (sdjwt-acdc.md §2.2). "OAuth2 and OIDC and SD-JWTs use JWTs as tokens; they inherit the same limitation" (was.md §Mitigation 3).

**The reframing.** ACDCs "prove the bona fides of issuers by chaining to other ACDCs" instead of registries (sdjwt-acdc.md §2.4); they anchor to a *rotating identifier's key state*, not a static key; and they mandate AID issuers so security properties are predictable. Even the term is corrected: "selective disclosure" has "a long and unpleasant history in financial regulation, where it refers to... illegal behavior"; KERI prefers "graduated disclosure" (sdjwt-acdc.md §1).

### 6.4 "Canonicalize the JSON (JCS / JSON-LD) so the signature is stable."

**The framing.** To hash a credential, normalize its JSON with a canonicalization algorithm (JCS, or JSON-LD's URDNA2015).

**Why it is a category error.** `{"a":1,"b":2}` and `{"b":2,"a":1}` "are semantically identical but have different cryptographic hashes," and JCS "normalization logic is brittle" (keri-primer.md §4.1). In JSON-LD "this fragility has led to 'term redefinition' vulnerabilities, where the meaning of a signed credential can be altered without invalidating the signature" (keri-primer.md §4.1, citing W3C vc-data-integrity issue #272; acdc-vc-diff.md §Loss 6). And `@context` URLs "cause link rot" (acdc-vc-diff.md §Loss 6).

**The reframing.** KERI/ACDC canonicalization is **insertion order** — "The natural canonical ordering for such mappings is insertion order" — and lexicographic ordering is called "un-natural," forcing "oddly-labeled fields... merely to ensure that the lexicographic ordering matches a given logical ordering" (CESR spec §Order-Preserving Data Structures, L1250-1252). Schemas are referenced "by its cryptographic content, not its location" (a SAID), so "there is no link that can rot" (acdc-vc-diff.md §Loss 6). A reviewer who reaches for JCS is importing exactly the fragility KERI designed out.

### 6.5 "A self-referential identifier can't be cryptographically bound / a UUID is fine."

**The framing.** A content identifier must live *outside* the content (you can't hash a thing that contains its own hash); a UUID is a perfectly good identifier.

**Why it is a category error.** The SAID dummy-derivation transcends the "can't be self-referential" assumption: fill the id field with dummy characters, digest, then overwrite (CESR spec §Generation and Verification Protocols, L1200-1206). And an identifier that is self-referential but *not* cryptographically bound "is a security vulnerability" — "Anyone can place such an identifier inside some other serialization and claim that the other serialization is the correct serialization" (CESR spec §SAID discussion, L1194) — which is precisely the plain-`id`/UUID failure mode. "The problem with a UUID is that it has no relationship to the data" (keri-primer.md §3.2).

**The reframing.** A SAID is both self-referential *and* bound, so "An ACDC is not a mutable document; it is a crystallized fact" (keri-primer.md §3.2). "An AID is a self-certifying identifier (SCID)," not a "domain name, which is rent-seeking text, or a UUID, which is arbitrary entropy" (primer §2.1).

---

## 7. "Security means invulnerability / prevention / finality" tells

This cluster is the one the security-analysis corpus treats as the single most dangerous, because it is invisible to the reviewer holding it.

### 7.1 "A secure system prevents forks / equivocation."

**The framing.** Security means preventing entire classes of attack (forks, conflicting histories), typically via consensus.

**Why it is a category error.** "KERI, as specified, adopts a survivability-oriented security model" (`standard-analysis.md` §0). "KERI is explicitly not designed around invulnerability" (`background.md` §4.5.1). Forks and equivocation by malicious controllers are "*anticipated disturbances*, not protocol failures" (`background.md` §4.5.1). The named failure mode: "Failure to align the evaluator's objective function with KERI's stated survivability-oriented goals risks category errors that systematically mischaracterize KERI's security properties" (`background.md` §4.5.1). The canonical analogy: criticizing KERI for not preventing malicious-controller duplicity "is analogous to criticizing a smoke detector for not preventing fires" (`dg-c02-claude.md` §5).

**The reframing.** Security is a gestalt of "invulnerability, detectability, evidence preservation, recoverability, and mission-level continuity under disturbance" (`standard-analysis.md` §0). "Detection (rather than prevention) allows KERI to operate with low latency while ensuring that any dishonesty is provable" (keri-primer.md §2.6). The correct question is "not 'can duplicity occur?' — it can — but 'how quickly is it detected, and what happens when it is?'... a deployment question, not a protocol question" (wtbo.md §5).

### 7.2 "Not duplicity-resistant? Then it's broken."

**The framing.** The thesis line "KERI is therefore not duplicity-resistant but only duplicity-evident" reads as an admission of weakness.

**Why it is a category error.** Whether it is a criticism "depends entirely on reading of 'resistant.' If 'resistant'=prevention, the statement is accurate/faithful; if 'resistant'=detection+response (survivability), the phrasing *understates* KERI's model. The word 'only' subtly imports an invulnerability bias" (`dg-c03-claude.md` §2, §5). "No criticism survives objective-function alignment" when KERI is evaluated as survivability-oriented (`dg-c03-claude.md`).

**The reframing.** "It doesn't try to make duplicity impossible — that would require global consensus... It makes duplicity *provable and attributable*" (wtbo.md §4). Duplicity by a controller is "potentially completely self-destructive with respect to the identifier" — a detected fork is "fatal to the reputation of the identifier" (KERI spec, L1842; keri-primer.md §2.6). Evident-and-fatal is a *stronger* deterrent posture than the outsider's resistant-but-opaque one, not a weaker one.

### 7.3 "All validators must converge on one truth (finality)."

**The framing.** A correct system reaches finality — every validator agrees on a single history.

**Why it is a category error.** "KERI does not guarantee global convergence" (`background.md` §7.4.2); "Permanent divergence is an allowed outcome" (`background.md` §7.4.4). Validators "do not share state by default," "May have disjoint trust relationships," and "May never interact directly" (`background.md` §7.1). Safety is redefined: "Safety in KERI means: Validators do not accept *invalid* histories" — it "does not mean validators agree on a single history" (`background.md` §7.5.1). Crucially, divergence is a *protocol-level property*, "permitted even with observers present," not merely a deployment artifact (`dg-c03-claude.md` §3).

**The reframing.** Correctness is *local to a validator* and observer-dependent; "a valid KERL is not necessarily unique" (`00-lens.md` claim 2). Importing blockchain-finality expectations is, "in the security model's own words, a category error" (`00-lens.md` claim 2). A reviewer expecting finality is measuring against a property KERI deliberately declines to provide because providing it would require the global consensus KERI rejects.

### 7.4 "A threshold of witnesses gives global safety."

**The framing.** If M-of-N witnesses agree, the event is globally safe.

**Why it is a category error.** "Agreement thresholds do not imply global safety" (`background.md` §4.7). KAWA's consistency property "is the strongest KAWA property and is *conditional*. It does not hold if the controller is malicious" (`background.md` §5.6, P2). A malicious controller "can simply run its own witnesses" (thesis via `background.md` §8.2). "KAWA alone determines *local durability*. Observers determine *global detectability*" (`background.md` §5.9).

**The reframing.** Witness agreement is a *per-controller, local* second-factor structure named the **Threshold Of Accountable Duplicity** — literally "threshold of accountable duplicity," not Byzantine finality (`eventing.py:1945`, notes 09 §4). Global detectability is a separate, *optional* observer-layer property (assumptions A8-A11, "None of A8-A11 are enforced by KERI," `background.md` §6.4). Conflating the two is how a threshold gets mistaken for finality.

### 7.5 "If a proof assumes an honest controller, it's insecure against dishonest ones."

**The framing.** Del Giudice's strongest results assume an honest controller, so KERI requires honest controllers.

**Why it is a category error.** The honest-controller premise is "a proof-technique simplification, NOT a KERI deployment requirement... Removing it does not break KERI's security — it shifts the focus from prevention to detection and recovery" (`dg-c06-claude.md` §3, §5). Observer mechanisms are "explicitly excluded from Del Giudice's formal analysis" yet "central to KERI's security model" (`background.md` §8.3). Malicious controllers "trigger detection, not failure" (`dg-c06-claude.md`).

**The reframing.** Verifiers assume *nothing* about controller honesty: "Protection against a fully malicious controller" is an explicit non-goal handled by the observer layer, not by the KAWA proofs (`background.md` §1.3, §2.1). A reviewer must distinguish "the proofs' scope" from "the protocol's model" — the corpus's meta-pattern is that every apparent weakness resolves to a deliberate non-goal, a proof-scope limitation, or a deployment-maturity gap (`dg-c06` note; notes 07 §8).

---

## 8. Role-confusion tells: witness, watcher, backer, agent

### 8.1 "A witness is a CA / a blockchain validator / a notary."

**The framing.** The witness vouches for the identity or participates in consensus.

**Why it is a category error.** "A witness makes no such assertion... A witness simply stores and serves events" (keri-primer.md §2.6). "Witnesses make no assertion about identity — they don't claim 'this key belongs to this entity.'... That is a fundamentally different role than a CA" (wtbo.md §4). The trust model is inverted from a CA's: "witnesses are assumed to be potentially malicious" (keri-primer.md §2.6). The ground truth: a registry may even have *zero* backers (`vdr/eventing.py:89`, notes 09 §4).

**The reframing.** A witness is a controller-designated, non-transferable AID that provides availability plus duplicity *accountability* — a per-controller threshold/second-factor structure, not a consensus node (`eventing.py:3051-3057`, notes 09 §2). The normative constraint that witnesses "MUST be non-transferable" so a validator can verify receipts directly (KERI spec, L353; `background.md` §2.3) is part of *KERI-as-specified*, not a discretionary simplification.

### 8.2 "A watcher enforces / can distrust an identifier."

**The framing.** The detection layer has teeth — like a browser root program distrusting a CA.

**Why it is a category error.** "A KERI watcher that detects duplicity is making an observation — surfacing cryptographic evidence that the relying party confirms independently," whereas a browser vendor distrusting a CA is "making an enforcement decision... with immediate global consequences" (wtbo.md §4). "Watchers cannot unilaterally 'distrust' an identifier... The worst a dishonest watcher can do is stay silent about duplicity it has seen" (wtbo.md §4). "Observers increase *visibility*, not *control*" (`background.md` §6.6).

**The reframing.** Watchers, jurors, and judges cleanly separate detection, evidence-preservation, and policy-adjudication so "no single observer both detects AND rules" (notes 07 §5). The relying party keeps the enforcement decision. The default and recommended pattern is a *local resolver* — an in-process watcher in the verifier's own stack querying multiple witnesses — so "the verifier trusts its own code," and depending only on a shared "super watcher" "is undesirable, as it encourages centralization" (wtbo.md §5).

### 8.3 "A witness can serve a delegate's KEL, so it vouches for the delegation."

**The framing.** If a witness serves a delegated AID's events, the delegation is thereby validated.

**Why it is a category error.** "A witness is NOT a watcher. A witness may serve a delegate's KEL without the delegator's seal/KEL; a validator must independently obtain the delegator's KEL (OOBI) before validating" (keripy-knowledge invariant D3; landmine L4). "Witnesses store/serve, they do not vouch for cross-AID anchors" (`31-landmines.md` L4). A delegated event is authorized *only* by a seal in the *delegator's* KEL (keripy-knowledge invariant D1).

**The reframing.** Delegation is cooperative and two-sided: the delegatee's `dip`/`drt` references the delegator, and the delegator anchors a seal to it — "Both MUST participate" (KERI spec §Cooperative Delegation, L1610). A validator must OOBI the delegator independently; treating a witness as having done that work is a role-boundary violation the code explicitly warns against (landmine L4, open twins #1317/#846).

### 8.4 "`DID` means the delegator vouches for all its delegatees."

**This row is unlike the others in the chapter, and the difference is stated first because it is load-bearing.** Its refutation is **[N1.1]**-only. A reviewer may press this framing as a question; they may not yet be told they are wrong on the standardizing line's authority.

**The framing.** The `DID` (Delegate-Is-Delegator) configuration trait says a delegated AID may be treated as its delegator. The outsider reads that as underwriting, and reads underwriting as transitive — the delegator vouches for the delegatee, and therefore for whatever the delegatee goes on to delegate. This is the X.509 path-validation reflex in a new field name: in PKI a CA's signature does propagate down the subtree, and a reviewer who grew up on chain-building will supply that propagation here without noticing they supplied it.

**Why it is a category error, in the half that is safe to assert.** **[N]** `DID` has no specified *consequence* on either branch. Both say a validator **may** treat the AIDs as equivalent; neither says what a validator MUST or MUST NOT do with the equivalence — not whether a signature under the delegatee's key state satisfies a policy written against the delegator's AID, not whether the equivalence survives the delegatee's own rotations, not what happens when the delegator later revokes the delegation. So "vouches" asserts something no specification text supports **in either direction**. It is not that the trait means less than the outsider thinks; it is that the trait's operational meaning is an open gap, and a critique or a design that leans on a reading of it — broad or narrow — is leaning on nothing. That much holds on the standardizing line today.

**The half that is not yet normative.** **[N1.1]** On `v1.1` the one-sentence trait acquires a nine-sentence rationale that forecloses the transitive reading explicitly: "The assertion is granular and applies only to the delegation relationship established by the event in which it appears", and "It says nothing about any Delegatees that the Delegatee may itself delegate" — rather, "each such delegation makes or withholds the assertion in its own delegated inception event" (KERI spec §Configuration traits field, v1.1 L381 @`3753f3797`). The same rewrite grounds the trait's warrant in cooperative delegation rather than in a new mechanism: the delegator already approves the `dip` by anchoring a seal, and "the Delegator thereby also consents to the appearance of the `DID` config trait in that event." **[N]** `main` at `fbdd4a615` carries none of this — one sentence, one table row, no placement rule and no granularity language.

**So the broad reading is reasonable from the standardizing line, and that is why this belongs in the chapter rather than being quietly corrected.** The honest statement to a reviewer is: the transitive reading will be wrong, on the evidence of the branch most likely to become the next standard, and it is not wrong yet. Two further facts keep it unsettled. `v1.1` also makes `DID` `dip`-only — it "MUST NOT appear in a non-delegated Inception, `icp` event" — while `main`'s own worked example places it in exactly that position, so the branches disagree about placement as well as about scope. And no worked example on either branch shows the trait in the position `v1.1` prescribes, so an implementer has no serialization to check against. Whether `main`'s example is a defect the rewrite is fixing, or the two branches genuinely disagree about what `DID` means, is not something the corpus has a source for.

### 8.5 "The observer layer is KEL discovery / caching, and a 'super watcher' is a bigger cache."

**The framing.** Watchers, jurors and judges exist to make KELs findable and queryable at scale — a CDN or a read replica sitting in front of the witnesses. On that reading the three names are three points on one feature curve, and "super" marks whichever end of it has the most features.

**Why it is a category error.** Discovery in KERI is already solved, and solved somewhere else entirely: an OOBI is deliberately untrusted — "a KERI OOBI by itself is considered insecure with respect to KERI" — and KERI "does not, therefore, need its own dedicated discovery network; OOBIs with URLs will do" (KERI spec, L2633, L2635) **[N]**. The observer layer is not what fills that gap. Samuel Smith made the objection directly, against a draft KID that had described watchers as "a convenient way to centralize how state is *queried*": "The watcher, judge, and jurors each play distinct important roles in the KERI security posture of a validator[;] they are not merely discovery mechanisms for KELs[,] so having amnesia about why their roles are distinct is going to be problematic" (WebOfTrust/kids#1, 2023-11-05) **[P]**. The roles are held apart precisely so that "no single observer both detects AND rules" (notes 07 §5); a cache has no such structure to preserve, so the infrastructure reading quietly discards it. It also demotes the honest limits chapter 02 §9 records — O1 detection "may be delayed or incomplete," O2 "Proof does not imply remediation," and observers supply no "Guaranteed detection... Automatic resolution... Enforcement" whatsoever (`background.md` §6.5, §6.6) — from security properties into performance caveats, which is the register in which a reviewer will then fail to take them seriously.

**The reframing.** Watcher, juror and judge are three *security* roles — detection, evidence-preservation, policy-adjudication — deliberately separated, and "super" is a statement about the **scope** of KELs one of them covers, not about extra features, so super jurors and super judges are as coherent as super watchers (chapter 02 §9; kids#1) **[P]**. Query convenience may be a by-product of running one at scale; it is never the reason the role exists. The reviewer's discipline is the same one `8.3` enforces one boundary further down: ask which role a component actually performs before accepting the noun it is labelled with.

---

## 9. Semantic tells: authorship, authenticity, meaning, aliases

### 9.1 "A signature means the signer authored / asserts the content."

**The framing.** To sign is to claim authorship or to assert the truth of what is signed.

**Why it is a category error.** "People often treat a signature as if it were a claim of authorship. That is sometimes true. But it is not what signatures *are* in general" (`sign-author.md`). "A signature is evidence that a signing mechanism ran" (`sign-author.md`); meaning comes from role, ceremony, policy, or protocol. Cryptographic systems "inherited a bias to assume signing was an assertion of authorship from early message-signing use cases" (`who-sign.md`). UNCITRAL's Model Law lists intent-to-be-bound, endorsement, association, and attestation-of-presence as distinct signature meanings.

**The reframing.** "Asking [who is signing] is insightful. Expecting a single, clean answer is usually a mistake" — control, authority, responsibility, and attribution "overlap but do not coincide" (`who-sign.md`). Applied: a dossier issuer's signature "does not necessarily attest to the veracity of the claims within the evidence, but rather to the integrity and composition of the collection" (dossier §Role of the Issuer). A **citation** ACDC "MUST NOT be construed as an endorsement" (`citation/index.md`).

### 9.2 "Cryptographic verification proves the claim is true."

**The framing.** A verified credential means its contents are true.

**Why it is a category error.** Authenticity and veracity are "orthogonal." "Judgments about authenticity can — if managed very carefully — be reduced to an objective mathematical computation, whereas judgments about veracity inherently require subjective assessments of reputation" (authenticity-vs-veracity.md §Independence). The ACDC validation algorithm — "fetching key state, verifying a signature, testing revocation, and comparing data and structure to a schema" — "can prove that an issuer remains committed to a citation — but only the interaction context... plus governance... establishes what proposition is true" (`citation/index.md`).

**The reframing.** KERI proves *who said it and that it wasn't tampered with*, not *whether it is true*. A notary "witnesses the authenticity of your affidavit, but makes no commitment as to its veracity" (authenticity-vs-veracity.md). A reviewer who treats a green checkmark as a truth oracle has collapsed the two axes.

### 9.3 "Automate the whole verification, including the final trust decision."

**The framing.** If verification is cryptographic, automate it end to end.

**Why it is a category error.** "The gap between proved and guessed is the gap a man-in-the-middle attacker lives in" (`oia.md` §Proved versus guessed). "Introducing is not the same thing as proving there is no man in the middle. We will automatically introduce. We won't automatically prove" (MA §7).

**The reframing.** "Automate the introduction. Automate the proof where you can. But never automate the verification of the proof" (`oia.md`). A human "weighs that evidence and decides it is good enough to trust *this* party, for *this* purpose, now." Structurally, deployments encode the distinction in a `{caveat}` field ("?" = unverified vs "(verified)"), because "Confusing guesses with something that's been verified... is the very attack surface that hackers exploit" (MA §4).

### 9.4 "An alias / petname is an identifier."

**The framing.** A human-friendly name can be used in logic, cached, and parsed for meaning.

**Why it is a category error.** "Treat an alias as an identifier and you get collisions; cache it... and you get staleness; parse a stranger's alias for meaning and you get an attack surface" (`oia.md`). "An alias must never be parsed for meaning by anyone but its creator" (`oia.md`). The applied rule is shouted in source: "ALIASES ARE NOT UNIQUE, AND THEY CAN CHANGE OVER TIME. THEY MUST NEVER BE PARSED FOR MEANING, AND THEY MUST NOT BE TREATED AS IDENTIFIERS" (MA §2).

**The reframing.** "It is globally unique AIDs that MUST be used in all system logic" (HWGA step 9). An alias is "a memory aid, not evidence." A reviewer should flag any logic that keys on a display name.

### 9.5 "Multisig means it's an organization; one key is enough for org identity."

**The framing.** Single-signature suffices for an organization's identity, and multisig ≈ organization.

**Why it is a category error.** "It is not a generally true equivalence that multi-sig = org. Some orgs consist of only one person, so their AIDs are single-sig" (HWGA). And single-key org identity is a millennia-old anti-pattern: multi-attestation for high stakes appears in "Code of Hammurabi law 7, Deuteronomy 19:15, double-entry accounting"; "why are we imagining... it's safe to use the single-signature mechanism of X509 certs as the only gate on unlocking the entire reputation of modern corporations?" (x509-prob.md §One key isn't realistic). In X.509 multisig governance "is not knowable or verifiable by the public... Hackers thrive on opacity" (keri-primer.md §2.4).

**The reframing.** "Multisig is optional and infinitely variable, but defining and following policy about it is required" — KERI's innovation "is less about inventing and more about exposing," publishing fractionally-weighted thresholds directly in the KEL (keri-primer.md §2.4). "Opaque control collapses meaningful distinctions" (`who-sign.md`).

---

## 10. Data-modeling and disclosure tells

### 10.1 "Bundle all the claims into one big credential, then selectively disclose."

**The framing.** A credential carries many claims; privacy comes from a fancy selective-disclosure crypto layer over the bundle.

**Why it is a category error.** "Many non-ACDC verifiable credentials provide bundled credentials because there is no other way to associate the attributes... These bundled credentials could be refactored into a graph of ACDCs. Each... separately disclosable and verifiable thereby obviating the need for Selective Disclosure" (ACDC spec §Selective Disclosure annex, L2739). And over-investing in cryptographic unlinkability is "an exercise in diminishing returns" because "there is no cryptographic mechanism that precludes statistical correlation among a set of colluding Verifiers" (ACDC spec §Bulk-issued, L2785).

**The reframing.** Chaining reduces the need for exotic selective-disclosure crypto; graduated disclosure ("disclose enough to enable more disclosure") uses only "digests and digital signatures or anchors," satisfying "minimally sufficient means" (ACDC spec §Graduated Disclosure, L1747; §Basic selective disclosure, L686). Where statistical linkability is the real threat, the answer is **Contractually Protected Disclosure** (chain-link confidentiality) plus independent-AID bulk issuance — legal "strings attached" plus technical measures — not more cryptography alone (ACDC spec, L1790, L2887).

### 10.2 "A compact / SAID-only credential is private."

**The framing.** If a block is elided to its SAID, its contents are hidden.

**Why it is a category error.** A public (no top-level `u`) ACDC is still rainbow-attackable from its SAID plus schema: "an adversary may be able to reconstruct the block contents merely from the SAID... and the Schema... using a rainbow or dictionary attack" (ACDC spec §UUID Fields, L89). Compact form "only provides compactness, not privacy" (ACDC spec §Targeted Public-attribute, L501).

**The reframing.** Privacy requires a high-entropy blinding factor (`u`) so "the cardinality of the power set allowed by the schema is at least as great as the entropy of the SAID digest algorithm" (ACDC spec, L89). A reviewer who equates compaction with confidentiality has missed the blinding requirement.

### 10.3 "Dereference the schema `$schema`/`$id` to validate."

**The framing.** Schema validation fetches and runs the schema the URL points to.

**Why it is a category error.** Dynamic schema references enable a **schema-revocation attack** (change the resource → invalidate every ACDC using it) and a **semantic-malleability attack** (shift the semantics so the ACDC still validates but downstream behavior changes) (ACDC spec §Static Schema, L196-198). Dereferencing `$schema` for validation code "would be an attack vector" (ACDC spec §Schema dialect, L226).

**The reframing.** "All Schemas MUST be static, i.e., Schemas MUST be SADs and therefore verifiable against their SAIDs" (ACDC spec, L200). `$id` is a bare SAID; the validator controls the tooling dialect. The applied corpus enforces this: "`$id` is a SAID... Never invent or hand-patch a SAID" (`bakobo/schema/KNOWLEDGE_TRANSFER.md`).

### 10.4 "Wrap or ingest a foreign credential (X.509, W3C-VC, mDL) as a native root of trust."

**The framing.** Import foreign credentials directly into the trust graph.

**Why it is a category error.** "Direct reference to non-ACDC material without a wrapper is NOT RECOMMENDED, as it places an untenable burden on the verifier to parse and validate an arbitrary foreign format, understand its lifecycle, and locate its revocation mechanism" (dossier §Incorporating Evidence). Foreign VCs belong as "*derivative artifacts* wrapped/bridged, not as native roots of trust" (notes 05 §5).

**The reframing.** Bridge, don't adopt: a designated bridging party verifies the foreign credential per its native rules and issues a **Foreign Artifact ACDC** attesting "I verified this on date X per policy Y" — which "transforms the problem of verifying a foreign format into the problem of trusting the attestation of the bridging party" (dossier §3). Trust is explicit and issuer-scoped (fields like `art_posture` and `rev_latency`), "not systemic" (`faa/index.md`). This is the "not-a-CA" interop stance: KERI bridges other ecosystems rather than becoming one of them.

### 10.5 "I2I / edge operators do multi-hop authority reasoning."

**The framing.** The `I2I` edge operator performs chain-of-authority evaluation.

**Why it is a category error — and a prose/machine gap.** **[K]** I2I is enforced as plain AID string equality and nothing more: the issuer of this ACDC must equal the issuee of the node it points to (`if op == 'I2I' and issuer != farIssuee: return None`, `vdr/verifying.py:478-479` @`b8f60166b`), which is the entirety of the check — an equality of qb64 AID strings, with no chain-of-authority reasoning beyond it. That has been true across every commit the corpus has pinned, and it is what makes "the operator does multi-hop authority reasoning" a genuine outsider tell rather than a claim about one release.

**The support for this row was restated on 2026-09-15; the row itself did not change.** The accurate statement of the operator family at `b8f60166b` is this: of **five** recognized unary operators (`UnaryOps = ('I2I', 'NI2I', 'DI2I', 'E1E', 'NOT')`, `vdr/verifying.py:41`), **I2I and E1E are enforced, NI2I is by construction a no-op binding check, and DI2I and NOT are recognized-but-unimplemented and fail closed with `ValidationError`**; the edge `s` constraint is now enforced, with the far node required to *satisfy* the declared schema rather than match it; and the operator is still silently inferred when `o` is absent. Two corrections inside that. **The exception DI2I raises is `ValidationError`, not `NotImplementedError`**, and the difference is doctrinal rather than cosmetic: the unimplemented operators are named in the table *on purpose*, because "they are listed so they fail closed diagnosably instead of being dropped and silently defaulting" (`vdr/verifying.py:38-39`), and the exception choice is deliberate too, because "escrowing would promise a retry that can never succeed" (L445). An earlier reading of this row as "it will crash if exercised" had the mechanism backwards: it refuses, by design. And **the family is five, not four** — `E1E` is the fifth, present in the ACDC specification's `v1.1` branch (**[N1.1]**, §Edge L1206 @`2362e48a1`) and absent from `main`, where the unary table has four rows.

**The reframing.** The doctrinal meaning of `I2I` (issuer-to-issuee same-holder binding) is real and useful — "it is what distinguishes 'Alice presenting *her own* credentials' from 'two credentials that merely share an AID'" (`sedi-present-age-portrait/index.md`) — but multi-hop authority is assembled by the recursive edge walk, not by any one operator. `E1E` sharpens the point rather than blunting it, because it is an identity relation and not a delegative one: **[N1.1]** "Unlike `I2I` and `DI2I`, which are delegative Operators... `E1E` is an identity relation between the two ACDCs' Issuee AIDs" (ACDC spec §Edge, L1223 @`2362e48a1`), which makes it *less* authority-like than the operator an outsider already over-read. This is the bridge to §12: believe the schema and the prose about what an edge *means*, but verify against the code what the verifier actually *does* — and, as §12 now records, verify the code's comments about the spec the same way.

---

## 11. The one attack you must be able to name: the retrograde attack

A reviewer who cannot articulate the retrograde attack will mistake KERI's most important structural feature (anchored, sequenced signatures) for gratuitous complexity — so it earns its own section as the deepest anti-pattern KERI corrects.

**The outsider prior.** A digital signature, on its own, is strong evidence of who signed and that the content is intact.

**Why that is dangerous.** "By themselves, digital signatures are much weaker evidence than casual thinkers might imagine," because they are "difficult to sequence relative to a compromise or revocation event" (was.md intro). If an attacker *ever* obtains a key, they can forge evidence "that looks like it originated in the past, *forever*" — and this remains possible "even if she rotates or revokes K before Malfoy steals it" (was.md §Retrograde attack). The backdating window "has no end point." X.509, JWTs, OAuth2, OIDC, SD-JWTs, and current-key-state-only DIDs (did:web) all "embrace this limitation — you can ask whether one is valid *now*... but you can't ask whether it was valid a week ago" (was.md §Mitigation 3). All three intuitive mitigations fail: contextual clues are unreliable, retroactive revocation is "dangerous and foolish" and lets the signer repudiate their own acts, and "verify against current key state only" makes after-the-fact audits impossible (was.md §Mitigations 1-3).

**The KERI reframing.** Anchored signatures: "Keep tamper-evident records that can prove how a given signing event relates in time to changes in the associated key state" (was.md §Solution). Validity is judged against key state "AS OF its KEL anchor's sequence position, not current key state or wall-clock" (keripy-knowledge invariant H1). Then "once Alice rotates her key, Malfoy's attack window closes forever," and "An analysis of an anchored signature will produce the same result no matter when it happens" (was.md §Conclusion). The ground truth: `Tever.verifyAnchor` does `db.kels.getLast(pre, on=seqner.sn)` then asserts the anchored event's SAID matches — "the anchor must be the issuer KEL event at exactly that sn" (keripy-knowledge invariant H1; `vdr/eventing.py`). NIST SP 800-102 is the external grounding (primer §3.3). *And the load-bearing caveat for a reviewer:* the credential `Verifier` may not re-run this anchor check (landmine L15, HIGH, flagged as a recon hypothesis) — so the defense is real at the TEL-event layer but should be confirmed at the credential-presentation layer.

---

## 12. The master reflex: verify the code, distrust the prose

Everything above concerns priors an outsider brings *to* KERI. This final discipline concerns a prior a reviewer might bring *about KERI's own implementations* — namely, that the elegant prose is faithfully realized in the code. It often is; sometimes it is not. The single most valuable habit for an adversarial reviewer of this codebase is to **check what the code actually enforces before believing the prose.**

The keripy contributor knowledge base states this as a worldview claim: "every externally supplied event, signature, key, receipt, or credential is *hostile input until verified*... 'looks well-formed' is not 'is authorized'" (`00-lens.md` claim 3). But it applies reflexively to the prose *about* the code, too. The documented prose/machine gaps are concrete and load-bearing:

- **`DI2I` is documented but unimplemented.** **[K]** At `b8f60166b` it raises `ValidationError` carrying "DI2I validation is not implemented" (`vdr/verifying.py:450-452`), and the IPEX leaf evaluator independently returns an unsatisfied edge for it (`acdc/ipexing.py:776-777`). A repo-wide search returns only those two rejection sites plus the two tables that name it. The gap survives; the mechanism is a deliberate closed door, not a crash.
- **Credential anchor re-validation may be missing** at the presentation layer, undermining the retrograde defense the prose celebrates (landmine L15, HIGH — and hedged by its own author as a recon hypothesis, which is how it should be carried).
- **Witness receipting waits for ALL witnesses, not TOAD** — "the spec rule; keripy's `WitnessReceiptor` currently waits for ALL witnesses instead — that is a defect, not the invariant" (`30-invariants.md` F2; landmine L9).
- **Pre-rotation verification can go permissive** on a digest-code mismatch, "silently excluded from threshold satisfaction rather than failing closed — weakening the pre-rotation check (the firewall)" (landmine L6, HIGH).
- **A new CESR code registered in one table but not its shadow tables** "round-trips as primitive but invisible to SAID derivation... fails late and silently" (landmine L5). The discipline is permanent; the urgency that used to be attached to it is not. See the note below.

Two of those bullets used to say something this chapter no longer says, and the retraction is more instructive than the bullets were. **Edge-operator grouping (`&&`/`||`), DAG acyclicity and `NI2I` chaining were listed here as "read but not enforced"** on the authority of landmines L16/L17. That is superseded as of keripy `b8f60166b`. **[K]** The boolean-combinator vocabulary was never keripy's model in the first place — the operators are unary and per-edge — and m-ary grouping is now genuinely implemented in the V2 IPEX path (`EdgeGroupOps = ("AND", "OR")`, defaulting to AND, reduced at `acdc/ipexing.py:903`), where an empty group is malformed rather than vacuously true. The code moved *toward* the prose while the citation stood still. That is the same failure this section warns about, pointing the other way, and it is why a reviewer should date a prose/machine gap rather than assert it.

**And the reflex is bidirectional, which is the sharpening this section needed.** A code comment about a specification is exactly as much a piece of prose as a specification's claim about code, and deserves the same treatment. The live example: keripy's own operator table is annotated **[K]** "E1E is a keripy extension not yet in the spec's normative operator table" (`vdr/verifying.py:40` @`b8f60166b`), tracing the idea to a discussion rather than to spec text. That is true of the standardizing line, where `E1E` occurs zero times — and **false of `v1.1`**, where **[N1.1]** the operator is defined with its own table row and a paragraph distinguishing it from the delegative operators (ACDC spec §Edge, L1206 and L1223 @`2362e48a1`). A reviewer who trusted the comment would conclude that `E1E` has no specification behind it at all, and would be wrong in a way that matters for tiering: it is not `[K]`-only, it is `[K]` plus `[N1.1]`, which is a different claim about how likely it is to survive. Trusting a code comment about a spec is the same error as trusting spec prose about code, and it is the harder one to catch, because a comment sits next to the code it describes and inherits the code's credibility without having earned it.

**The shadow-table discipline stands; the urgency attached to it does not.** The landmine is written as advice about work in flight — "The Falcon PR must touch every shadow table" — and that framing is now wrong in a way worth stating, because nothing is blocked when nothing has been written. **[K]** keripy at `b8f60166b` has **no post-quantum codes at all**: a search of `src/` for FN-DSA, ML-DSA, SLH-DSA, Dilithium, Falcon, SPHINCS, Kyber and ML-KEM returns only the `falcon` **web framework**, and `src/keri/core/` has zero matches. The knowledge base is candid about why: its own plan defers the flagship work behind an unresolved question — which of two conflicting in-repo Falcon design documents is canonical — and neither design has landed. So keep the discipline and drop the deadline: a digest, key or signature code registered only in `MatterCodex` and `Matter.Sizes`, and not in `Saider.Digests`, `Serder.Digests` and the relevant `*Dex` sets, will round-trip as a primitive while being invisible to SAID derivation, and will fail late and silently. That will be true of whatever PQ codes eventually arrive, and it is true today of any new code at all. A reviewer should also refuse the adjacent overstatement: **[N]** the CESR specification's `main` at `bad6edd84` carries **zero** post-quantum codes — no FN-DSA, no FIPS reference, none of `1AAQ`/`1AAR`/`2AAA` — and everything CESR says about post-quantum on the standardizing line is the hash firewall of pre-rotation. The code table is **[N1.1]** work on `v1.1` at `65fd7518b`, and **no shipped implementation carries it**; the only implementation anywhere is an unmerged branch on a personal fork, which is not `[K]` and must never be cited as evidence about the ecosystem.

**A staleness warning attaches to every citation of the knowledge base in this section.** The KB is pinned at `9489ac9bd`, and its own declared code baseline is keripy `60ab9e08` — **493 commits behind** `b8f60166b`, against a version string that has moved from `2.0.0-dev6` to `2.1.0-dev1`. Its banner that all twenty landmines still hold was verified at that baseline, and **can no longer be repeated unqualified**: L16 and L17 are known to be superseded (above), which is one counterexample, and the remaining eighteen are neither confirmed nor refuted at the current pin. The KB remains a good map of where behavior lives and a good catalogue of the shapes a defect takes. It is not, at this distance, evidence about what keripy does today — for that, cite keripy at a named commit. The reflex this whole section teaches applies to the KB as readily as to any other prose, and the corpus has been slower to apply it there because the KB is written in the register of someone who has already applied it.

The corresponding *reviewer* discipline is the KB's pre-change checklist, reframed as a critique checklist: **Whose authority?** (any external trust dependency is a violation of the root-of-trust claim). **Adversarial input?** (is this input verified or merely parsed?). **Which invariant does this guard protect?** — "Can't name it? Assume it's load-bearing." **External contract?** (wire codes, sizes, field order, SAID derivation, version strings are external contracts — a change that passes keripy's own tests but diverges from the spec is a *defect*, because it "silently breaks interop," `00-lens.md` claim 5). **Anchor-relative?** (judge a signature against the anchor's key state, not "now"). And a corollary from claim 6: "do not 'simplify away' a guard you don't fully understand; treat an unexplained check as protecting an invariant until proven otherwise" — because "Complexity is load-bearing" (`00-lens.md` claim 6; wtbo.md Note [d]).

The reason this reflex is *the* master shibboleth: KERI's guarantees are real but conditional, and the conditions live partly in the spec's assumptions and partly in whether the code honors them. A reviewer who reads only the prose will over-credit the system; a reviewer who reads only the code will miss the intent that tells them which discrepancies are bugs versus design. The insider move is to hold both — "graph = fast structure; disk artifacts = ground truth; use both, trust accordingly."

---

## 13. Quick-reference: the tell → the reframing

For rapid triage during a review, the recurring tells and their one-line corrections:

- **"Who's the trusted authority/CA?"** → The identifier is the root of trust; replay the KEL, no authority (keri-primer.md §1.3; `cr-ad-trust.md` §4).
- **"Revoke the cert / where's the CRL/OCSP?"** → Key state lives in the KEL; credential status is an anchored TEL state, no phone-home (ACDC spec, L1693; `cr-ad-trust.md` §2).
- **"Consult the registry at verify time."** → "A registry consulted at verification time is a phone-home in disguise" (`sda.md` §7).
- **"You need a blockchain / global order / consensus / finality."** → Per-identifier local ordering suffices; global ordering is an explicit non-goal (KERI spec, L1836; `background.md` §1.3).
- **"Renew / rotate to a new cert."** → Identity is sameness; a transferable AID persists across rotation (keri-primer.md §2.1; `cr-ad-trust.md` §1).
- **"Bearer token / session / API key."** → Fresh per-request signature over an AID; no long-lived server secret. Scoped to one method+path and one key state, where a token is scoped to neither — but neither side enforces freshness, so on that pair it replays until a rotation (GOC §2; `sda.md` §1; KERIA @`7e685edaa`, signify-ts @`ffba8406e`).
- **"Federation decentralizes."** → Federation re-centralizes; chaining to self-certifying roots decentralizes (OS §1; acdc-vc-diff.md).
- **"Secure the pipe (TLS/VPN)."** → Move security with the data (MLS/TSP), not the transport (ASAAU §3.6).
- **"Sign the credential (paired signature)."** → Anchor to key state. The partition is lifespan, not artifact kind: "The signature exists on the anchoring key event, not on the dossier" (Dossier spec @`b9227753c`, L27-28; ACDC spec, L1673).
- **"DIDs/SD-JWTs already do this."** → They verify against current key state only and re-introduce issuer registries (was.md §Mitigation 3; sdjwt-acdc.md §2.3-2.4).
- **"Canonicalize the JSON (JCS/JSON-LD)."** → Insertion order, not lexicographic; schema by SAID, not URL (CESR spec, L1250; acdc-vc-diff.md §Loss 6).
- **"A UUID / plain `id` is fine."** → A self-referential-but-unbound id is a substitution vulnerability; use a SAID (CESR spec, L1194).
- **"Security = preventing forks."** → Survivability, not invulnerability; "a smoke detector doesn't prevent fires" (`background.md` §4.5.1; `dg-c02-claude.md` §5).
- **"Not duplicity-resistant = broken."** → Duplicity-evident and fatal-to-reputation is the stronger deterrent (wtbo.md §4; KERI spec, L1842).
- **"Everyone converges on one truth."** → Permanent divergence is allowed; safety ≠ agreement (`background.md` §7.4-7.5).
- **"A witness is a CA / validator."** → A witness stores and serves, makes no identity assertion, is assumed possibly malicious (keri-primer.md §2.6; `eventing.py:1945`).
- **"A watcher enforces."** → A watcher observes; the relying party enforces (wtbo.md §4).
- **"The observer layer is discovery / caching."** → Discovery is OOBIs, untrusted by design; watcher/juror/judge are three security roles held apart, and "super" names scope, not features (KERI spec L2633-2635; WebOfTrust/kids#1 **[P]**; ch. 02 §9).
- **"A signature = authorship/truth."** → A signature is evidence a mechanism ran; authenticity ≠ veracity (`sign-author.md`; authenticity-vs-veracity.md).
- **"Publish the AID at two well-knowns to strengthen the binding."** → OOBA governs willingness to bootstrap, not authenticity; it "does not change the trust model of an OOBI" (KERI spec, L2838).
- **"`DID` means the delegator vouches for its delegatees' delegatees."** → No specified consequence on either branch; **[N1.1]** "It says nothing about any Delegatees that the Delegatee may itself delegate" (KERI spec v1.1, L381).
- **"The prose says the code does X."** → Verify, in both directions and with a date. `DI2I` fails closed with `ValidationError`, not unimplemented-by-crash; receipting waits for all witnesses; and a code comment about a spec is prose too — keripy calls `E1E` a non-spec extension, which is false of `v1.1` (`vdr/verifying.py:40` @`b8f60166b`; ACDC spec v1.1, L1206; landmines L9/L15).

---

## 14. Load-bearing assumptions and honest residuals

A reviewer inoculated against outsider tells must not swing to the opposite failure of treating every KERI reframing as unassailable. The reframings above are correct *within KERI's stated objective function*, but several rest on assumptions a reviewer is entitled to probe, and a few outsider critiques survive the reframing intact.

**The reframings are conditional on:** cryptographic soundness (A1); the controller keeping pre-rotation keys secret (compromise of *both* current and pre-rotated keys is "catastrophic and unrecoverable" — the identifier must be abandoned, `00-lens.md` claim 4; wtbo.md §5); and, for the detection story, the *optional* observer layer (A5, A8-A11 — "None of A8-A11 are enforced by KERI," `background.md` §6.4). The detection-not-prevention posture is only as good as the watcher/observer infrastructure actually deployed, and "A KERI deployment without robust watchers and governance is not a secure system" (`cr-ad-trust.md` §5).

**The genuinely surviving residuals** — the outsider critiques that do *not* dissolve on reframing — are, per the security-analysis corpus, all about ecosystem maturity, never about the protocol: the observer/watcher infrastructure is immature; the "super watcher" pattern (as at GLEIF) reintroduces "a centralized trust dependency that KERI was designed to avoid" (`cr-ad-trust.md` §5; DG-C05); the formal literature is thin (the strongest analysis is "a 2025 ETH Zürich Master's thesis... not peer-reviewed," wtbo.md §5); and KERI lacks the legal standing (eIDAS) X.509 enjoys — "a gap of legal recognition, not of technical capability" (wtbo.md Note [c]). KERI's advocates frame these as "constraints of *youth*, not of *architecture*" (wtbo.md §6) — which is itself a claim a reviewer should treat as an assertion to be tested against trajectory, not a proven fact.

**A residual sharpened this pass: the trusted-third-party relaxation is two concessions, not one.** The corpus has long recorded the first. In the presentation-registry origin document, a Verifier that requires a key rotation as part of a presentation is conceded to "violate[] the maxim that security not be dependent on a trusted third party", justified on the grounds that the harm is localized and "the party most likely to be harmed is the Verifier… which provides incentives for them to protect themselves" **[P]**. The second is sharper, has never been written down here, and attaches to the very mechanism offered as the answer to the first. A presentation registry gives the Issuee **[P]** "an Issuer-Verifier-protected mechanism to detect compromise of its signing keys" — which is to say it requires an Issuer that is a different party and does not collude, *and* a Verifier that actually enforces, since "The verifier then enforces the protection by not accepting presentations (grant messages) that are not so anchored". The mechanism offered as Issuee self-protection is therefore two-party-dependent at both ends. Neither concession is an oversight and both are stated plainly by their author; the point is that a reviewer pressing KERI on third-party dependence is entitled to both, and that the answer to the first one does not escape the critique. Note the tier: this is **[P]** throughout — a design in two discussions with no implementation and several unsettled questions, whose substance belongs to the presentation-registry chapter, not here. The shibboleth table has no row for it, deliberately. A framing cannot be an outsider tell while the insiders are still arguing about what the thing is called.

**A provenance residual that bears on this corpus's own method, and on how much weight any adversarial review carries.** One of the papers in the corpus retracted a claim about its own review process in this window. An earlier version described its analysis as having had "two independent adversarial expert reviews, one in vision science, one in security usability"; the current version corrects that to say those passes "were conducted by AI models prompted to argue from a named lens, not by human domain experts", and adds that "They are a structured way to attack one's own assumptions, not independent validation" (`m-glance.md` §1). A sibling paper made the same move, restating itself as "theoretically motivated, adversarially self-reviewed, and empirically untested" (`amp-diff.md` §6.3). The generalization is uncomfortable and is stated here because it applies inward as well as outward: an adversarial review run by AI personas arguing from named lenses is a structured self-attack, and reporting it as independent validation is a provenance error of exactly the kind the tier markers exist to prevent. This corpus's own panels are that kind of exercise. Their output is worth what a disciplined self-attack is worth, which is not nothing — and it does not license any claim that survived one of them being treated as externally checked.

**An unresolved disagreement inside the corpus's own doctrine, which is why it is here and not in the table.** §9.3 gives the rule that the final verification step is never automated, and the paper it rests on offers eyeball comparison of an identifier visualization as the honest way for a human to take that step. A second paper, revised in this window, concludes that casual eyeball comparison of such a visualization is not marginally weak against an adversary who has ground offline but "is broken" — and that a seeded commit-and-reveal walk is therefore "a requirement, not an enhancement" wherever an adversary is in scope (`amp-diff.md` §4.3.9). The first paper has not been revised to match, and neither acknowledges the other. A reviewer should know the disagreement exists before relying on either. It is deliberately **not** a shibboleth row: "compare the identifier by eye" is not an outsider tell, because the insider source recommends it, and the paper that would refute it describes itself as empirically untested. That is a live question in the doctrine, not a category error to catch.

The disciplined reviewer, then, holds two things at once: the outsider tells in §§2-11 are category errors that should be caught and reframed, *and* the residuals in this section are legitimate and should be pressed. Confusing the two — dismissing a real maturity critique as a category error, or accepting a category error as a real critique — is the failure mode this entire section exists to prevent. The tell that a reviewer has internalized the doctrine is not that they praise KERI, but that they can state, for any given critique, whether it survives objective-function alignment — and cite why.
