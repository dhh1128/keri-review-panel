# 12 — Confidentiality and Secure Messaging {#confidentiality}

## Thesis {#thesis}

KERI's core makes no promise about who can read a message or see that two parties are talking; [chapter 06, section 4](06-governance-ecosystems-and-interop.md#layered-privacy) defers that to SPAC and TSP, and this chapter is where the deferral lands. The answer is a priority order and a construction. The order is authenticity, confidentiality, then the best privacy those allow, because Sam Smith argues the first two can be won outright while privacy can only be defended at a cost. The construction is ESSR, encrypt-sender-sign-receiver, applied between autonomic identifiers rather than long-term public keys: the sender's identifier goes inside the ciphertext, the receiver's under the signature, and each party's keys come from its key event log, so the binding survives rotation. Privacy is built on top from contexts partitioned so that the context, not the identifier, is what an observer correlates; contexts nested and routed through intermediaries; and, for data already shared, legal accountability rather than concealment.

Privacy is not confidentiality: KERI's authors use the surveillance meaning, who talked to whom. Cryptographic unlinkability is not the goal; they argue contextual re-identification defeats it and it costs accountability. And in ToIP's Trust Spanning Protocol, authenticity and confidentiality are cryptographic while metadata privacy depends on intermediaries, and timing, size and frequency survive every mechanism.

## Status {#status}

Almost everything is [proposal]: whitepapers and decks in Sam Smith's Papers repository, 2021 to August 2026, several saying they are his opinion ("In my opinion", SPAC paper > PAC Trilemma, L11 @b47f21597). The PAC trilemma is posited, not proved. Apart from TSP sentences marked [spec], nothing in sections [1](#trade-space), [2](#vocabulary), [3](#effective-privacy), [5](#contexts) or [7](#sustainable-privacy) is in any specification. Three things reached further:

- [spec] in CESR: the ESSR wrapper and payload count codes and the X25519 sealed-box and HPKE-Base cipher codes are in the master table on `main` and `v1.1` ([section 9](#wire)).
- [spec], experimental, outside the KERI suite: ToIP's Trust Spanning Protocol adopts ESSR by name, with SPAC's nesting, routing and relationship forming ([section 10](#tsp-spec)). Its status line reads "Experimental Implementor's Draft Rev 3 with Errata (September 30, 2026)" (TSP spec, L4 @5599b4556). TSP comes from a different working group and accepts KERI AIDs among other identifiers.
- [code] in keripy, narrowly: one ESSR send path and SPAC's payload-type tag ([section 11](#implementation)). keripy has ESSR, not TSP.

Conference captions are cited for intent only. Sam co-authors the SPAC papers and TSP, so their agreement is not independent corroboration.

## 1. The trade space: authenticity and confidentiality before privacy {#trade-space}

### The PAC trilemma {#pac-trilemma}

[proposal] "One can have any two of the three (privacy, authenticity, confidentiality) at the highest level but not all three." (SPAC paper > PAC Trilemma, L13 @b47f21597). Strong authenticity is non-repudiation, which links you: "Transitive value transfer will violate complete privacy." (PAC deck, slide 9 @b47f21597). The same deck defines strong privacy as "un-correlated interactions over unbounded time and space" and weak privacy as "un-correlated interactions over bounded time and space" (PAC deck, slide 12 @b47f21597).

The wording has two forms. Beside "at the highest level", the 2021 deck also has "to the same degree" (PAC deck, slide 2 @b47f21597), which the 2025 deck applies to an interaction: "An interaction between two parties may be two of the three, private, authentic, and confidential to the same degree" (Seven Privacies deck, slide 8 @b47f21597). The first bounds the corner of the trade space, the second every symmetric point inside it, and no source reconciles them ([question 1](#open-questions)).

### Priority is not layering {#priority-not-layering}

[proposal] The priority is ToIP's, adopted by Sam: "one should start with high authenticity, then high confidentiality, and then as high as possible privacy" (SPAC paper > PAC Trilemma, L17 @b47f21597). It is not the order of layers in a message: "the ordering of the ToIP design goals w.r.t. authenticity, confidentiality, and privacy may be different from the ordering of layers" (SPAC paper > PAC Trilemma, L31 @b47f21597). A reviewer who infers that the signature must be innermost has made that conflation; ESSR signs on the outside.

### Cold war and hot war {#cold-hot-war}

[proposal] "Authenticity and confidentiality are like a cold war." Strong cryptography is cheap, so "there need be no casualties in this cold war" (SPAC paper > Cold War versus Hot War, L116 @b47f21597). In privacy every routing identifier is a correlation surface against unbounded adversaries, so "In the hot war of privacy, we have to Pareto optimize protection mechanisms." (L128). The objective is the paper's subtitle: "The Best Privacy Possible Given the Strongest Authenticity and Confidentiality" (SPAC paper, L3 @b47f21597). It is a design objective, not a theorem, and it assumes the cold-war cryptography really is cheap and sufficient, leaving weakness only "in the strength of the key management of the associated key pairs" (L116), KERI's home ground ([chapter 03, section 5](03-key-management-and-identifier-lifecycle.md#pre-rotation)).

## 2. Vocabulary: privacy, confidentiality, metadata privacy {#vocabulary}

### Who versus what {#who-versus-what}

[proposal] Sam's definitions have been stable since 2021: "Privacy is primarily about control over the disclosure of who participated in the conversation (non-content meta-data = identifiers)." "Confidentiality is primarily about control over the disclosure of what (content data) was said in the conversation and to whom it was said (partitioning)." (SPAC deck, slide 10 @b47f21597). The paper extends who to "conversation (interaction) identifiers" (SPAC paper > PAC Trilemma, L48 @b47f21597), which is why interaction identifiers are a privacy problem in [section 6](#interaction-identifiers).

Of the ToIP definition of privacy (a receiver honoring the sender's expectations about shared data) and the surveillance definition (the correlatability of public metadata), the paper picks the second: "for the purposes of protocol design the definitions of confidentiality and privacy that are most suitable are the surveillance definitions" (SPAC paper > Privacy and Confidentiality, L78 @b47f21597). The first returns in [section 7](#accountability), answered by contract.

[spec] TSP names the split, and its vocabulary is the one to use with the wider community: protection of envelope metadata "is termed metadata privacy, differentiating it from the narrower understanding of privacy" (TSP spec > Authenticity, Confidentiality, and Metadata Privacy, L105 @5599b4556).

### The three-party exploitation model {#three-parties}

[proposal] The model is the ACDC specification's ([chapter 06, section 4](06-governance-ecosystems-and-interop.md#three-party-model)), with two refinements. Privacy toward a third party "is protected if the 3rd party has no knowledge of the identifiers used by the 1st and 2nd parties" (SPAC paper > Three-Party Exploitation Model, L142 @b47f21597). And "An intermediary may be considered a 1st, 2nd, or 3rd party depending on how and by whom it is trusted or not." (L140): an intermediary trusted by both ends is a second party to the routing metadata and a third party to the content. Protection from third parties is cryptographic and structural, from second parties contractual ([section 7](#accountability)), and across contexts technical ([section 5](#contexts)).

### The drift toward "confidential" {#confidential-drift}

[proposal] Since 2023 Sam's vocabulary has moved toward confidential. A January 2026 fragment gives the strongest statement in the corpus of why second-party protection cannot be technical: "once shared, there is no technology that by itself protects the first party's interests" (Confidential data fragment > Three-Party Model, L11 @b47f21597). The 2025 deck's taxonomy: "Information that is not-shared = private (one party data)" and "Information that is shared with restrictions = confidential" (Seven Privacies deck, slide 13 @b47f21597). The deck never enumerates seven privacies; reading its Combinations slide's seven states as the title's seven is an inference this chapter does not adopt ([question 9](#open-questions)).

## 3. Effective privacy and the threat ranking {#effective-privacy}

### Exploitation, not correlation {#exploitation-not-correlation}

[proposal] "Protection against exploitation via correlation provides a more gentle trade space than mere protection against correlation." (SPAC paper > Effective Privacy, L103 @b47f21597). Protection against correlation as such never ends, since "One can always play the equivalent of a trump card" (SPAC paper > Cold War versus Hot War, L122 @b47f21597), so the target becomes exploitable correlation and the goal effective privacy, the earliest written form of the editor's 2026 goal of decorrelation ([chapter 06, section 4](06-governance-ecosystems-and-interop.md#decorrelation)). The assumption is explicit and attackable: state actors are out of scope, because "to attempt state-actor proof mitigations would likely take us down rabbit holes that we can never return from" (SPAC paper > Exploiters, L155 @b47f21597). Every privacy property in this chapter is stated against identity thieves and data aggregators, not an adversary watching every link.

### Identity theft first {#identity-theft-first}

[proposal] Identity theft ranks ahead of aggregation: "The internet is broken primarily because of identity theft." (SPAC deck, slide 62 @b47f21597), on an unmeasured argument about adoption sequence. Its remedy is authentication: "any step that has strong authentication with individually signed requests for authorization will stop the attack from proceeding" (SPAC paper > Mitigations, L195 @b47f21597); signed requests are [chapter 09](09-kram-and-request-authentication.md#problem)'s subject, and the escalation attack it stops is [chapter 13, section 3](13-authority-authorization-and-agents.md#rpea)'s.

SPAC's own place is narrower than its name: "protection from 2nd party aggregators may be best provided by higher layer protocols that provide contractually protected disclosure" (SPAC paper > Summary Threats and Mitigations, L256 @b47f21597).

## 4. ESSR: authenticated encryption between identifiers {#essr}

### The building blocks {#building-blocks}

[proposal] The SPAC baseline was chosen for adoptability, "only highly adoptable, well-proven, cryptographic operations from broadly supported libraries" (SPAC paper > Adoptability via Dumb Crypto, L323 @b47f21597), pre-quantum only. Signing is libsodium Ed25519, chosen for strong unforgeability where "the popular ECDSA signature scheme only has the weaker EUF-CMA" (SPAC paper > Best Authenticity, L331 @b47f21597); encryption is the libsodium sealed box, an IND-CCA2 scheme with "the end-only viewability of asymmetric public key encryption" (SPAC paper > Best Confidentiality, L351 @b47f21597)., properties relayed from literature not read here.

[spec] TSP reverses the baseline. "TSP implementations MUST support HPKE-Base mode as defined in this document." (TSP spec > Hybrid Public Key Encryption (HPKE), L993 @5599b4556), and of the sealed box, "implementors SHOULD consider migrating to the HPKE option specified in this document. We MAY remove this option in the future." (TSP spec > Libsodium Sealed Box, L1052 @5599b4556). The paper's reason for the sealed box, that RFC 9180 implementations were "not yet broadly available" (L359), has aged. TSP also adds post-quantum ML-DSA-65 and an ML-KEM-768/X25519 hybrid (TSP spec > HPKE PQ and PQ/T Algorithms, L1048 @5599b4556).

### Why neither encryption nor encrypt-then-sign suffices {#encrypt-then-sign}

[proposal] "IND-CCA2, by itself, is insufficient to provide strong authenticity of the ciphertext." (SPAC paper > Best Confidentiality, L361 @b47f21597). Signing the ciphertext opens another forgery: "An attacker can strip the signature and resign the ciphertext with the attacker's key but has never seen the plaintext of the cipher." (SPAC paper > Best Combined Authenticity and Confidentiality, L366 @b47f21597). The fix binds the receiver's key under the signature and "bind the sender's public key inside the ciphertext" (L366): ESSR, "Encrypt Sender's key and then Sign Receiver's key" (SPAC paper > Modified ESSR, L370 @b47f21597), from Jee Hea An's 2001 analysis (IACR ePrint 2001/079). Of four unforgeability notions, "Simply using the encrypt then sign approach provides TUF-PTXT, TUF-CTXT, and RUF-CTXT but not RUF-PTXT." (SPAC paper > Modified ESSR, L372 @b47f21597), and ESSR provides all four: otherwise a malicious receiver may find another plaintext and key pair producing the signed ciphertext.

[spec] TSP restates the result: "No naive composition of public-key encryption and signature achieves authenticated encryption in the public-key setting." (TSP spec > Cryptographic Algorithms, L957 @5599b4556). The paper's appendix goes further, "The ESSR framework basically tells us that there is really only one secure approach to mixing encryption with signatures." (SPAC paper > Appendix: Using Crypto in a way that is Too-Clever-By-Half, L1165 @b47f21597), which is Sam's generalization, not An's result. An's paper was not read, so the property table is relayed twice through authors invested in ESSR ([question 2](#open-questions)).

### Identifiers in place of keys {#aids-not-keys}

[proposal] KERI binds identifiers rather than keys: "We apply ESSR to KERI by modifying the basic ESSR approach to support unbounded-term identifiers by replacing the sender's long-term public key with its AID" (SPAC paper > Baseline KERI ESSR, L388 @b47f21597), and the receiver's likewise, with current keys from each KEL. A long-term key is abandoned within a NIST cryptoperiod, taking its reputation with it (SPAC paper > Unbounded-Term AIDs instead of Long-Term Public Keys, L266 @b47f21597); with an AID, "If the provided message is using stale keys for a given AID the associated cryptographic operations will fail against the current key state" (L274). The encryption key may be "cryptographically derived from the signing public key" (L272), as keripy does ([section 11](#implementation)).

[spec] TSP adopts the substitution: "TSP binds VIDs where ESSR binds public keys.", and a binding to a VID "survives rotation of the keys behind it, where a binding to a public key would not." (TSP spec > Cryptographic Algorithms, L959 @5599b4556). It states the cost the paper does not: "TSP provides no means to establish which key state was current when a signature was made" (TSP spec > Security and Privacy Considerations > Binding of identifiers, L1480 @5599b4556), so ESSR's argument, which fixes the receiver's key at signing, is rebuilt by composition, concluding "No scheme specified here admits a collision meeting these constraints." (L1482). That is the specification's argument, not a cited proof, and the place a cryptographer should press.

For KERI the cost is sharper. KERI fixes which key state was current by anchoring ([chapter 03, section 11](03-key-management-and-identifier-lifecycle.md#as-of-anchor)), and an ESSR message is anchored in no log, so the as-of-anchor defense against the retrograde attack does not reach it; a receiver later holding a retired key is limited only by the composition argument. Anchoring a digest of each message in the sender's KEL would restore the defense at a key event per message ([question 10](#open-questions)).

### Variants, and what each gives up {#essr-variants}

[proposal] "Any variation from the full ESSR policy may make a security trade-off induced by removing one of its protections." (SPAC paper > KERI ESSR Summary, L435 @b47f21597).

- Plaintext-sourceless. Dropping the plaintext copy of the sender's AID, which lets a firewall verify before decrypting, means "DDOS or firewall protection (security) could be traded for not exposing the sender's AID (privacy)" (SPAC paper > Plaintext Sourceless Variant, L401 @b47f21597), recoverable where "a given receiver AID, is only used for one given sender AID" (L407).
- Sourceless. Removing the sender from the ciphertext too "still exposes the receiver to an attack when the approved sender is malicious" (SPAC paper > Sourceless Variant, L411 @b47f21597).
- Destinationless. The paper argues the receiver's AID can sometimes go, since "an attacker can't purport any plaintext to have been encrypted to a different key pair other than the one that appears in the receiver's KEL" (SPAC paper > Destinationless Variant, L421 @b47f21597), and concludes only that a malicious receiver "may not gain any appreciable advantage" (L423). This is the weakest-supported claim in the ESSR material ([question 7](#open-questions)).

Replay is open in the base construction. The paper offers rejecting stale-key messages, which does nothing within one key state, or anchoring a digest in the sender's KEL (SPAC paper > Replay Attack Protection, L431 @b47f21597). TSP puts freshness above itself, in "the layer that understands what its messages mean" (TSP spec > Security and Privacy Considerations, L1473 @5599b4556); for KERI that is KRAM ([chapter 09](09-kram-and-request-authentication.md#problem)), whose normative status is empty ([chapter 09, section 5](09-kram-and-request-authentication.md#normative-status)).

### End-only viewability {#end-only-viewability}

[proposal] The confidentiality principle is the dual of end-verifiability ([chapter 01, section 4](01-foundations-and-worldview.md#end-verifiability)): "If the edges (ends) are secure, then the security of the middle doesn't matter." (SPAC paper > End-Verifiabilty and End-Only-Viewability, L282 @b47f21597). The authenticity overlay underwrites it, because "the encryption key state must be securely attributable to the intended identifier for confidentiality to work" (TSP deck, slide 15 @b47f21597). One property is unique to this paper, first-party non-viewability: a sealed box's sender cannot decrypt it, so a party can encrypt to a destination or an isolated part of itself and delete the plaintext. "This is the zero-trust principle of encrypted-at-rest, not merely encrypted-in-motion." (SPAC paper > Appendix: 1st Party Non-Viewability, L1175 @b47f21597). It is the mechanism behind [chapter 07, section 5.5](07-shibboleths-and-anti-patterns.md#secure-pipe).

### DDoS efficiency constrains nesting {#ddos-efficiency}

[proposal] "Any protocol that requires decryption in order to make a drop decision can only make that drop decision at the edge host" (SPAC paper > DDOS Protection Efficiency, L1135 @b47f21597), and "multiplying nesting layers directly impacts DDOS efficiency" (L1133); hence the outer signature over plaintext in full ESSR. So the nesting of [section 6](#nesting-routing) is not free; its depth is a security trade.

## 5. Relationships, contexts and partitions {#contexts}

### The formal definitions {#context-definitions}

[proposal] The SPAC privacy model's core definitions (SPAC paper > Relationships > Basics, L471-L485 @b47f21597):

- "A cryptonym is a cryptographically derived pseudonym with at least 128 bits of entropy in the derivation." (L471)
- "A relationship is a pairing of two AIDs, one each from a different controller." (L473), bidirectional or one-way.
- "Two different AIDs are by themselves uncorrelated in an information-theoretic security sense" (L474).
- "A context is a set of events." (L475), and "A partition is a set of contexts with mutually disjoint relationships." (L478), whose members "may be correlatable due to other information associated with any pair of contexts" (L480).
- "The secure attributability of an AID, together with its perfect correlatability within a context, enables secure reputational trust" (L482).

[spec] TSP carries the identifier half: VIDs must be "cryptographically non-correlatable in an information-theoretic security context" (TSP spec > Cryptographic Non-Correlation, L152 @5599b4556).

### The context is the correlator {#context-correlates}

An AID lets anyone who sees it link every interaction in which it appears, but two different AIDs carry nothing that links them, so an analyst connecting one party's separate relationships works from what surrounds the identifiers. The written support is L474 and L480; Sam's slogan is "It is the context that is the supercorrelator not the identifiers." (KERIConf26 caption, Samuel Smith, SPAC & TSP, 14:00). A reviewer who calls an AID a stable correlator is right within a context and wrong in general, and the design wants the first: "We want perfect correlation within a context so that we have accountability." (KERIConf26 caption, Samuel Smith, SPAC & TSP, 16:27). The same reasoning underlies [chapter 06, section 4](06-governance-ecosystems-and-interop.md#participation-not-correlation)'s ruling that participation is not correlation. The boundary is L480: contexts remain correlatable by timing, size, address and behavior, and the partition removes only the identifier ([section 10](#tsp-limits)).

### Out-of-band authentication {#ooba}

[proposal] Any secure protocol "requires at least one out-of-band-authentication (OOBA) factor in order to protect against a man-in-the-middle (MITM) attack" (SPAC paper > OOB Setup, L573 @b47f21597), and the same factor answers cheap pseudonymity: "Requiring an OOBA factor for any given identifier makes that identifier relatively expensive." (L577). It does not create a cryptographic binding the AID lacked ([chapter 07, section 2.6](07-shibboleths-and-anti-patterns.md#multiple-well-knowns)).

### Two meanings of OOBI {#oobi-overload}

The SPAC paper's OOBI is a reputable introduction inside an authenticated relationship: "We call this an Out-Of-Band-Introduction (OOBI) because the reputable relationship authentication was established Out-Of-Band with respect to the new relationship." (SPAC paper > Relationship Formation Protocol, L651 @b47f21597). KERI's OOBI is a discovery URL carrying no trust ([chapter 01, section 4](01-foundations-and-worldview.md#discovery-vs-trust)). TSP avoids the collision: an introduction "conveys a VID and nothing more" until verified (TSP spec > Security and Privacy Considerations > Introductions, L1564 @5599b4556).

## 6. Nesting and routing {#nesting-routing}

### Five steps from direct to private {#five-steps}

[proposal] The paper builds its protocol in five steps, each with a verdict on the deck.

1. Direct ESSR, IP addresses in the clear: "Strongly Authentic and Confidential but not Private" (SPAC deck, slide 36 @b47f21597).
2. A business relationship wrapped in the ciphertext of a communication relationship, so "No 3rd party observer can view that there is a relationship" (SPAC paper > Direct Protocol as Wrapper, L630 @b47f21597): "Somewhat Private".
3. Relationship formation, where an existing relationship introduces a new one ([section 5](#oobi-overload)).
4. One shared intermediary, which sees which AIDs relate but never content, and holds them "only ever in memory." (SPAC paper > One Shared Intermediary, L699 @b47f21597): "Mostly Private". Both ends must trust it, and its network provider can correlate timing and size.
5. Non-shared intermediaries, one per end, so "An attacker has to get that by successfully attacking both C and D." (SPAC paper > Discussion, L792 @b47f21597), with routing tables signed at rest: "Very Private".

A final step nests a third relationship inside the routed one, hiding it "from not just 3rd parties but also the 2nd party trusted intermediaries" (SPAC paper > Cross Relationship Context Interaction Contexts, L865 @b47f21597), and the deck drops the qualifier: "Strongly Authentic and Confidential and Private" (SPAC deck, slide 44 @b47f21597). That unqualified verdict should not be accepted as stated. It holds against identifier correlation, not against timing and size analysis by an observer of more than one hop, which step 4's own limits admit ([section 10](#tsp-limits)).

### Routing split between two halves {#dead-drop}

[proposal] "The non-shared intermediary protocols above use a combination of both source vector routing and table routing." (SPAC paper > Combined Source Vector and Table Routing as Dead Drop, L1045 @b47f21597). The sender carries part of the route and the far intermediary's table supplies the rest, acting as "a dead drop controlled by the far-side destination" (L1049).

### Interaction identifiers {#interaction-identifiers}

[proposal] The SAID of a nonce-salted first message makes an interaction identifier "cryptographically universally unique to a given interaction" (SPAC paper > iSAIDs as IIDs, L813 @b47f21597), and putting it inside the ciphertext makes the interaction as private as its relationship: "if the relationship context is private, then any of its interaction contexts are also private (QED)" (SPAC paper > Privacy by Isolating Interaction Contexts, L827 @b47f21597). The inference is sound; its premise is what [section 10](#tsp-limits) qualifies.

### Multisig is a sketch {#multisig-sketch}

[proposal] For a multi-key receiver the ciphertext "must appear as a list of ciphertexts" (SPAC paper > Multi-sig Extension, L1057 @b47f21597). Nothing else specifies this, and keripy encrypts to the first key only ([section 11](#implementation)), so confidential messaging to a multisig group ([chapter 03, section 7](03-key-management-and-identifier-lifecycle.md#multisig)) is open.

## 7. Sustainable privacy {#sustainable-privacy}

### The time value of information {#time-value}

[proposal] "In general, privacy dissipates over time." (SPAC paper > Time Value of Information, L1064 @b47f21597). But correlated information loses value too, so there is "a sweet spot for sustainable privacy protection that is governed by the time constant of the time value of exploitable correlation" (L1066), and partitioned contexts reset the clock: "Once a context has become leaky, however, a new isolated context can be created that restarts the clock on time value correlatability." (L1068). The argument is qualitative: no source estimates a time constant for any market, so "sustainably protectable indefinitely" (L1068) is a conditional whose condition is unmeasured ([question 3](#open-questions)).

### Covert, not clandestine {#covert-clandestine}

[proposal] A covert operative has a cover identity and survives; "a given clandestine operation is unsustainable long-term." (SPAC paper > Sustainable Management of Contexts, L1084 @b47f21597), and internet privacy tools have tended to be clandestine. The prescription: "Nest clandestine contexts inside covert contexts" (SPAC deck, slide 51 @b47f21597). The model has a herd requirement: users who use an intermediary only for what they hide "make the mere use of C itself a correlatable signal" (L1086). A covert intermediary is only as good as its legitimate traffic, which no protocol supplies.

### The contextual linkability attack {#contextual-linkability}

[proposal] Selective disclosure is undone by "a set of non-selectively disclosed attributes obtained from the context of the disclosure that is sufficient to re-identify the discloser" (SPAC paper > Contextual Linkability Re-identification Attack, L1101 @b47f21597), which the verifier controls: "Correctly understood, selective disclosure is a naive form of K-anonymity performed by the discloser (presenter)." (L1104). The legal half should be cited in its 2026 form, which is normative rather than a statement of law: selective disclosure "should not provide a safe harbor", and "Unfortunately, current regulatory policy does not respect this distinction." (Sustainable Privacy > 2.3, p. 5 @b47f21597).

The 2026 paper adds two arguments. Unlinkable ZKP disclosure has a security cost, an undetectable impersonation of a compromised issuer ([chapter 07, section 10.1](07-shibboleths-and-anti-patterns.md#bundled-credentials-detectability)), and a cryptoperiod limit: "at most, a bare ZKP VC can be used only for applications with a VC lifespan of no more than two years" (Sustainable Privacy > 2.4, p. 7 @b47f21597), where a KEL-anchored ACDC survives rotation ([chapter 05, section 1](05-acdc-and-verifiable-data.md#what-an-acdc-is)).

### Accountability as the remedy {#accountability}

[proposal] For data shared with a second party, "the only sustainable privacy protection mechanism" is "some form of contractually protected disclosure" (Sustainable Privacy > 3.1, p. 8 @b47f21597), now including the duty of data loyalty: "The 2nd party data holder must act as a loyal agent of the 1st party." (Sustainable Privacy > 4, p. 10 @b47f21597). Consent is not the mechanism, because "the act of consent can be easily socially engineered against the best interests of the consenter" (same page). The sharpest form is a charge against unlinkability: "Cryptographic un-linkability defeats legal, contractual, and economic accountability" (Seven Privacies deck, slide 26 @b47f21597).

Without the contractual layer of [chapter 06, section 4](06-governance-ecosystems-and-interop.md#contractual-layer), the other two cannot hold for shared data. ACDC carries the contract through [chapter 05, section 8](05-acdc-and-verifiable-data.md#contractual-disclosure) and IPEX's agree and admit ([chapter 06, section 4](06-governance-ecosystems-and-interop.md#agree-binds)). The conceded weakness ([chapter 07, section 14](07-shibboleths-and-anti-patterns.md#residuals)) applies: accountability rests on courts and regulators the protocol does not supply, varies by jurisdiction, and reaches only a second party that can be found. Against an anonymous third party it is empty, which is why sections [4](#essr) to [6](#nesting-routing) exist.

## 8. Bulk-issuance privacy in the 2026 decks {#bulk-issuance-privacy}

[proposal] The mechanics of bulk issuance are in [chapter 05, section 9](05-acdc-and-verifiable-data.md#bulk-issuance); the April 2026 IIW decks add its link to this chapter's model. "Each member of a bulk-issued set has a unique AID with unique keys derived using an HDKey algorithm" (Bulk privacy deck, slide 18 @b47f21597), so each member can live in its own context. "Placeholder updates provide herd privacy wrt correlation to date time of actual state changes" (Bulk privacy deck, slide 23 @b47f21597), the registry form of covert traffic and of [chapter 05, section 9](05-acdc-and-verifiable-data.md#bulk-updates)'s bulk updates. The deck also prefers a sparse Merkle tree predicate proof to a ZKP because it preserves detectability of issuer compromise ([chapter 05](05-acdc-and-verifiable-data.md#age-smt-proposal)).

## 9. The wire {#wire}

### The SPAC and TSP envelope in CESR {#cesr-envelope}

[proposal] The SPAC paper's CESR appendix and a TSP CESR paper specify one wrapper. Tunneled messages "are encoded as sniffable CESR streams" (SPAC paper > Appendix: CESR Implementation, L1191 @b47f21597), so KERI and ACDC messages ride inside unchanged. The plaintext head is uniform "so that the head contains no correlatable metadata besides the source and destination AIDs" (SPAC paper > Head, L1207 @b47f21597). The wrapper is `-E##` (`--E#####` large), the payload group `-Z##`, and a body beginning with `-` is a plaintext group, anything else a cipher primitive (SPAC paper > Determining if the payload field value is a ciphertext CESR primitive or a plaintext CESR group, L1549 @b47f21597). The native payload types are `CTL`, `HOP`, `RFI`, `RFA`, `RFD`, `PAD` and `SCS` (SPAC paper > SPAC Payload Types, L1246-L1254 @b47f21597); control payloads carry a pad field "to pad the total packet size to some desired minimum length" (SPAC paper > Padding Control Message Payloads, L1265 @b47f21597).

### What is in the CESR specification {#cesr-codes}

[spec] The master table has "| `-E##` | ESSR wrapper signable up to 4,095 quadlets/triplets |" (CESR spec > Universal Code table genus/version codes that do not allow genus/version override, L842 @bad6edd84; L850 @65fd7518b) and the payload group "ESSR (TSP) Payload `version+messagtype+...` up to 4,095 quadlets/triplets" (CESR spec > Master code table for genus/version `-_AAACAA` (KERI/ACDC protocol stack Version 2.00), L939 @bad6edd84; L947 @65fd7518b; "messagtype" sic), with the X25519 sealed-box (`4C` to `9AAE`) and HPKE-Base (`4F` to `9AAF`) cipher codes (L1028-L1051 @bad6edd84).

### Where the papers and the specifications diverge {#wire-divergences}

- Identifier encoding. The TSP CESR paper has an open mode, where "all VIDs must be either URNs or DIDs encoded as variable-length CESR UTF-8 byte strings" (TSP CESR paper > VID fields in Open Mode, L17 @b47f21597), and a closed mode with bare AIDs. TSP has no closed mode and a syntax rule its own KERI example breaks ([section 10](#tsp-vid-syntax)).
- The version field. SPAC uses `0OSPACAABCAA`, the TSP CESR paper `YTSP_AAB`, and TSP `YTSP-AAC`, version 0.2 (TSP spec > TSP Envelope Encoding, L1130 @5599b4556).
- The hop-list code. SPAC's prose says "The hop list group code is `-K##`." (SPAC paper > Hop Payload, L1377 @b47f21597), but its tables, the TSP paper and the specification use `-J##`, with `-K##` for the tail's indexed signatures. The prose is a defect ([question 5](#open-questions)).
- The `4F` code. CESR has "HPKE Base cipher bytes of QB2 plaintext" (CESR spec > Master code table for genus/version `-_AAACAA` (KERI/ACDC protocol stack Version 2.00), L1046 @bad6edd84); SPAC has "HPKE Base cipher bytes of sniffable stream plaintext" (SPAC paper > Ciphertext Body, L1316 @b47f21597). Two payloads under one code, and TSP does not say which it means. By [chapter 04, section 12](04-cesr-and-the-wire.md#interop-risks)'s rule this is a finding ([question 6](#open-questions)).

## 10. What the TSP specification settles {#tsp-spec}

### Shape and status {#tsp-shape}

[spec], with [Status](#status)'s caveats. TSP is identifier-agnostic: a KERI AID is one example VID beside `did:webs`, `did:webvh` and `did:peer` (TSP spec > Examples, L206 @5599b4556). It requires separate rotation authority for public VIDs (TSP spec > VID General Requirements, L144 @5599b4556), defines no rotation of its own, and lists as recovery limits pre-commitment to next keys, delegation, and first-seen recording, KERI's three defenses without naming KERI (TSP spec > Security and Privacy Considerations > Limits, L1511 @5599b4556). "The metadata privacy protections are achieved by nested TSP messages and routed messages through intermediaries." (TSP spec > Authenticity, Confidentiality, and Metadata Privacy, L107 @5599b4556), the two SPAC mechanisms.

### ESSR with HPKE-Base {#tsp-hpke}

[spec] Under HPKE-Base, "the binding of the ciphertext to the sender identity required by the ESSR construction is provided by the associated data `aad`" (TSP spec > HPKE-Base Mode, L1010 @5599b4556), and the in-payload sender field defaults to a null VID (L1041); under the sealed box it stays mandatory (TSP spec > Sealed Box, L1102 @5599b4556). Whether associated-data binding gives receiver unforgeability of plaintext in An's sense is the specification's own argument ([section 4](#aids-not-keys)), with a fallback from "the payload check alone" (TSP spec > Binding of identifiers, L1482 @5599b4556).

### Routing and relationship forming {#tsp-routing}

[spec] Routed mode follows SPAC's non-shared-intermediary design, typically source, its intermediary, the destination's intermediary, destination (TSP spec > Metadata Privacy in Routed Mode, L464 @5599b4556). The last hop uses a VID the destination chose, so "an intermediary cannot oblige its clients to re-establish their routing information with every correspondent" (L469). Relationship forming is mandatory before application traffic, which SPAC did not require (TSP spec > Direct Relationship Forming, L714 @5599b4556), and "The most private option is to remain silent." (L734).

### What TSP says it does not do {#tsp-limits}

[spec] TSP states its limits:

- No forward secrecy: "TSP does not provide forward secrecy: an adversary that has recorded earlier messages and later obtains the decryption key can read them." (TSP spec > Security and Privacy Considerations > Limits, L1515 @5599b4556). Rotation protects the future, not the recorded past.
- Metadata privacy is not cryptographic: "Metadata privacy and availability in routed mode are not among them." (TSP spec > What An Intermediary Is Trusted For, L1558 @5599b4556), "them" being the properties that need no judgment about an operator.
- "Timing, size, and frequency survive encryption, nesting, and routing alike." (TSP spec > What Remains Observable, L1527 @5599b4556). TSP does not batch, reorder or delay, so an endpoint "needs to know what its intermediaries actually do" (L1527).
- Non-retention is "not enforced by any mechanism in TSP; it is a commitment by the operator." (TSP spec > What An Intermediary Is Trusted For, L1554 @5599b4556), which is what SPAC's "only ever in memory" becomes.
- A dropping intermediary "cannot be distinguished by the sender from one that has not yet delivered it" (TSP spec > What An Intermediary Is Trusted For, L1556 @5599b4556).
- "A verified VID is an identifier that can be relied upon consistently, not an identity." (TSP spec > Introductions, L1566 @5599b4556), [chapter 07, section 9](07-shibboleths-and-anti-patterns.md#semantic-tells)'s authenticity-veracity line for channels.

A design that claims metadata privacy without naming its intermediaries, their fan-out and their padding claims a property the specification says it cannot deliver alone.

### The VID syntax conflict {#tsp-vid-syntax}

[spec] TSP requires "that the VID format be either compliant DID format [[ref:DID]] or compliant URN format [[ref:RFC8141]]" (TSP spec > VID Syntax, L158 @5599b4556), while its example says "An AID is not a DID; it is used directly" (TSP spec > Examples, L206 @5599b4556). A bare AID in an envelope therefore violates the syntax rule unless carried as a URN or `did:webs`. Sam co-authors both texts, so this is a question for him ([question 4](#open-questions)).

## 11. What is implemented {#implementation}

### keripy: one ESSR send path {#keripy-essr}

[code] keripy at `927c0cb87` has a `keri.spac` package with one primitive: `PayloadTypes = PayloadTypage(HOP='HOP', RFI='RFI', RFA='RFA', RFD='RFD', SCS='SCS')` (keripy spac/payloading.py, module level, L15 @927c0cb87), omitting `CTL` and `PAD`. `StreamPoster`'s ESSR option, for mailbox delivery, sends a plaintext that is a SPAC `SCS` payload with an always-empty pad: "bext field can be randomized to reduce correlation based on packet size, empty for now" (keripy app/forwarding.py, StreamPoster._chunk, L317 @927c0cb87). `_essrWrapper` derives the receiver's X25519 key from its first current signing key, seals with the libsodium sealed box, and signs an outer `exn` on `/essr/req` naming both ends, `modifiers=dict(src=hab.pre, dest=ctrl)`, with a digest of the ciphertext (keripy app/forwarding.py, StreamPoster._essrWrapper, L408-L430 @927c0cb87).: ESSR in shape.

Four boundaries apply. The wrapper is a KERI v1 `exn`, not `-E##`, though keripy defines `ESSRWrapperGroup: str = '-E'` (keripy core/counting.py, L210 @927c0cb87). Only the first key is used, so a multisig receiver gets one ciphertext. There is no receive handler: the `Exchanger` checks the ciphertext digest, raising "essr diger={diger.qb64} is invalid against content" (keripy peer/exchanging.py, Exchanger.processEvent, L337 @927c0cb87), and `Manager.decrypt` can open a sealed box (keripy app/keeping.py, Manager.decrypt, L1431 @927c0cb87), but nothing routes `/essr/req` to decrypt and dispatch. And there is no routing, relationship forming, padding message or HPKE. keripy implements direct-mode ESSR to a mailbox and none of sections [5](#contexts) and [6](#nesting-routing).

### Deployments, by status only {#deployments}

[practice] Conference speakers reported ESSR beyond keripy, unverified against code: Veridian's KERIA fork tunneling client-to-agent traffic for over a year, with agent-to-agent streams in basic TSP form, not upstream (Fergal O'Connor, Signify Security Architecture); a healthKERI gateway wrapping transactions in ESSR, not adopted for lack of interoperability; and plugin-to-service traffic per Phil Feairheller. The KERIA pull request named was not located ([question 8](#open-questions)).

### A proposed use for TSP inside KERI {#tsp-in-keri}

[proposal] Sam suggests an authorizer could answer a downstream authorizee's signed query by "attaching the unblinded state to a TSP protected response" (keripy GitHub > #1082, body created 2025-08-17 and last edited 2026-04-27, https://github.com/WebOfTrust/keripy/discussions/1082), the clearest written statement of where TSP sits in the KERI stack: beside ACDC and KRAM, carrying the second-party disclosures blinded state keeps from third parties ([chapter 05, section 9](05-acdc-and-verifiable-data.md#blindable-state)).

## 12. Open questions {#open-questions}

1. Which form of the PAC trilemma is current, "at the highest level" or "to the same degree"? They make different claims ([section 1](#pac-trilemma)).
2. An's paper (IACR ePrint 2001/079) is unread here, so the four-property table is relayed through interested parties ([section 4](#encrypt-then-sign)).
3. No source estimates a correlation time constant for any market ([section 7](#time-value)).
4. Must a bare KERI AID be wrapped as a URN or DID under TSP? ([section 10](#tsp-vid-syntax)).
5. SPAC's `-K##` hop-list code contradicts its own tables and the specification, probably a typo ([section 9](#wire-divergences)).
6. Does `4F` carry QB2 plaintext or a sniffable stream? ([section 9](#wire-divergences)).
7. Is the destinationless ESSR variant sound? ([section 4](#essr-variants)).
8. Where is the ESSR receive path? Until the KERIA change named in the talks is read, ESSR is implemented, in inspectable code, on the send side only ([section 11](#keripy-essr)).
9. What are the seven privacies of the Seven Privacies deck? ([section 2](#confidential-drift)).
10. Do the authors acknowledge that ESSR messages lose the as-of-anchor defense? ([section 4](#aids-not-keys)).

## Sources {#sources}

- Bulk privacy deck — Samuel M. Smith, Bulk Issuance Privacy (IIW, April 2026), and its companion Bulk Issuance Synergy with Data Loyalty. SmithSamuelM/Papers, presentations/BulkIssuancePrivacy.pdf and presentations/BulkIssuanceSynergyDataLoyalty.pdf, master @`b47f21597` (2026-08-11), both added `b8cc11a` (2026-04-30). Quoted from the extracted text in `.ignored/papers-text/`; the extraction loses fi and ff ligatures, and no quote here crosses a damaged word. Mined in raw/17.
- CESR spec — Composable Event Streaming Representation (CESR) specification, Trust Over IP. trustoverip/kswg-cesr-specification, spec/spec-body.md, `main` @`bad6edd84` (2026-08-28) and `v1.1` @`65fd7518b` (2026-08-26); read 2026-10-15 for the ESSR count codes and cipher codes only. Mined in raw/17.
- Confidential data fragment — Samuel M. Smith, ACDC Affordances for Confidential (Sensitive) Data Protection and Management, an undated fragment. SmithSamuelM/Papers, whitepapers/ACDCConfidentialDataManagement.md, master @`b47f21597`, last touched `6fa71dd` (2026-01-16). Mined in raw/17.
- KERIConf26 caption — edited auto-captions of the KERI Conference 2026 talks (Lehi, Utah, April 2026), keri-foundation/CONF26-subtitles, subtitles/*.fixed.srt @`006042d`; this chapter quotes Samuel Smith, SPAC & TSP, at times read from the caption file on 2026-10-15. Near-wording only, quoted for intent and framing, never for a design detail; see raw/14 section 0. The deployment reports in [section 11](#deployments) come from the raw/14 and raw/17 summaries of other talks and are not quoted. Mined in raw/14 and raw/17.
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
