# KRAM & Request Authentication

**Thesis.** KERI signs everything, and a signature over an unordered message is a bearer token: whoever captures it can replay it. Key events are immune to this by construction — a sequence number and a prior digest give every key event its place in a total order — but the six *non-key-event* message types that carry all of KERI's supporting traffic (`qry`, `rpy`, `pro`, `bar`, `xip`, `exn`) have no such ordering, and therefore no built-in replay protection. KRAM is the mechanism that supplies it. Its design commitment is that replay protection must be **non-interactive**: no challenge, no nonce round trip, no session, because a challenge-response doubles the packet count and reintroduces a synchronous channel into a protocol family built for asynchronous public networks. In place of interaction, KRAM uses a datetime stamp read against *the receiver's* clock — so the sender cannot lie about time — plus, in its full form, a monotonic cache keyed per message. Those two supply the two properties every replay defence needs, timeliness and uniqueness.

Two facts about KRAM's status matter more than any detail of its design, and they pull in opposite directions. It is **absent from every KERI specification**; and it is **substantially implemented in keripy**, to a 2,200-line module with a 5,700-line test suite. The gap between those is where every open question in this chapter lives.

## 0. How to read this chapter: three tiers, marked

Same convention as the presentation chapter, and it does more work here because one tier is nearly empty.

- **[N]** — **Normative.** In the text of a published specification branch. **For KRAM this tier is empty**, and §5 documents the one near-miss.
- **[P]** — **Proposed.** In Sam's KRAM whitepaper (`SmithSamuelM/Papers`, `whitepapers/kram.md`, v0.7.6) or in a keripy discussion. Note that the whitepaper is a different animal from a discussion post: it is a maintained, versioned, implementation-directive design spec that names Python modules and LMDB tables, and keripy is visibly built from it. It is still not binding on anyone outside keripy.
- **[K]** — **keripy behavior** at `upstream/main` @`4df8e4a8` (2026-09-01); `src/keri/core/kraming.py` @`fe161709` (2026-08-20).

Unmarked claims are this chapter's synthesis. Sources are mined in `raw/15-kram.md`.

## 1. What problem KRAM solves, and why not the obvious alternatives

**Secure attribution is ephemeral [P].** KERI's sign-everything posture means any over-the-wire message with a source AID and an attached signature can be attributed to that AID's controller. But the attribution decays: "Should the key state change between the time of origination and the time of verification, then the verifier can no longer assume the signature as a secure form of attribution because one of the primary reasons for a given controller to change its key state is to recover from key compromise" (keripy discussion [#934](https://github.com/WebOfTrust/keripy/discussions/934) §KRAM). A signed message is therefore "at best, an ephemeral issuance given the dynamic key state of the AID" — good enough to defeat impersonation *at reception*, and no more.

**The division of labor [P].** #934 states the scope in one sentence: "KERI Key Event messages and their associated KELs have built-in ordering mechanisms that are tied to the current key state, so they are self-protecting from replay attacks. However, the generic exchange, query, reply, prod, and bare messages do not have any built-in replay attack protection. For this purpose, the KRAM (KERI Request Authentication Mechanism) was designed." **KRAM is exactly the non-key-event message layer.** If you find yourself asking whether KRAM applies to an `icp` or `rot`, the question is malformed.

**Why not a session, and why not a nonce [P].** #934 enumerates three families of replay protection — authenticated sessions on a synchronous channel, interactive challenge-response, timeliness-ordered authentication — and eliminates the first two: sessions are "precluded for asynchronous networks", and challenge-response "is fundamentally less scalable… since it requires a minimum of two times the message traffic for each message to be authenticated." The whitepaper adds a historical argument: nonce challenge-response is an artifact of an era before network time servers, before cheap CSPRNGs, and before asymmetric signatures were affordable, carried forward by teaching habit rather than analysis. Under KERI's actual assumptions — verified key state, ubiquitous NTP, microsecond clocks, asynchronous public networks — the mechanism to beat is a signed timestamp, and eliminating half the packets is "a huge design win."

This is the same architectural instinct as the rest of KERI: prefer the non-interactive, end-verifiable construction, and pay for it in local state rather than in round trips. The KERI spec makes the parallel argument for data-at-rest in its BADA-RUN treatment — "Because non-interactive mitigations are asynchronous… they do not have the latency and scalability limitations of interactive mitigations and are therefore preferred" (KERI spec §Replay attack) — without ever naming KRAM. **BADA and KRAM are siblings, not the same thing**, and §6 takes up where they collide.

**The general form [P].** "In general replay attack protection imposes some form of timeliness to any signed request and some form of uniqueness to any signed request" (whitepaper §Replay Attack Protection). Everything below is one of those two properties or a resource bound on them.

## 2. Simple KRAM: what is deployed, and why it is not enough

**The mechanism [P].** A message carries a `dt` stamp; the receiver accepts it only if that stamp lies inside a window around the receiver's own current time, `[t-d-m*l, t+d]`, where `d` is clock drift/skew, `l` is average network latency and `m` a small integer. Typical values given: `d = 0.01` s, `l = 1` s, `m = 3`. **No cache.** The security argument is bluntly stated: "This window limits the time during which a replay attack can be mounted… Therefore the protective efficacy of simple KRAM is better the smaller the window."

Because the window is anchored to the *receiver's* clock, "the originator of the message can't lie about time." That inversion is the load-bearing idea, and it survives into full KRAM unchanged.

**Why this is what shipped [P].** #934 is unusually candid: "due to the exigency of limited resources in implementing support for the vLEI, only the most expedient version of KRAM, called simple KRAM, was implemented. This has now become problematic and is largely the root cause of the associated issues and discussions." The surrounding section generalizes it into an account of why KERI components sit at uneven maturity levels — GLEIF delivered the vLEI under real time and budget pressure, "bare-bones features needed for the vLEI became expedient, whereas other features were not."

**The failure: multisig cannot fit through a three-second window [P].** This is the crux of the whole KRAM programme. With a multisig sender, a receiver running simple KRAM has only one workable policy: accept on any one member's signature. But then "the message is not protected by the threshold of the group multi-sig." Escrowing to collect the rest does not rescue it, because "all the to-be escrowed signatures must still arrive within the narrow time window, which means the coordination of the group members must be tight enough to fit in this window." Three humans on three devices do not sign within three seconds. So a multisig `exn` under simple KRAM either abandons its threshold or cannot be sent at all.

**The production workaround, and its cost [P].** "Two-level simple KRAM" is named as "the current supported approach": the over-the-wire `exn` acts as a *wrapper*, single-signed by any one member and subject to KRAM, while an *embedded payload* is separately signed by the group, is not subject to KRAM, and goes into a signature-collecting escrow once the wrapper is through. The whitepaper describes the payload as "a tunneled exchange message… The tunnel is meant to cross through simple KRAM." Every member signs twice, and the escrow must hold partially signed payloads for as long as the group takes to converge. The variant that collects payload signatures *before* sending, via a pre-protocol, is HAMI ([keripy#911](https://github.com/WebOfTrust/keripy/issues/911)).

**Read this as an architectural tell.** A mechanism whose window must be short to be secure, meeting a signing ceremony whose duration is set by humans, produces a tunnel through the security mechanism. Full KRAM's central move is to make the window long *without* making it weak.

## 3. Full KRAM: monotonic caches, and why the window can be long

**The move [P].** Replace "is this timestamp fresh?" with "is this timestamp fresh *and* strictly later than the last one I cached for this sender?" Once a monotonic cache is doing the uniqueness work, the window's job changes completely: "the monotonicity of the cache protects against a replay attack and the time window merely bounds the memory requirements." A window that is only a memory bound can be hours, days or weeks. **That single reallocation of responsibility is what makes multisig workable**, and it is the most important idea in the chapter.

**Window and cache [P].** The window is `[t-d-l, t+d]` on the receiver's clock. Redesign-era example values: `d = 100` ms, short lag `sl = 2` s, long lag `ll = 2` h, exchange lag `xl = 48` h. A cache entry records the message's datetime and the window parameters in force when it was created — so reconfiguring windows never disturbs caches already in flight.

**Retrograde clock protection [P].** A rewound receiver clock would otherwise re-open the window on old messages. Cached entries already refuse them; for everything else, "the receiver persists to durable storage a single timestamp of the latest time it sees. If the network time is even older than the latest saved time, the receiver can refuse to accept messages until the clock catches up."

**Detection, not only prevention [P].** Under the strict policy the receiver answers a given signed request exactly once, which makes a successful interception *visible to the sender*: either no response arrives, or it arrives redirected from a host that is not the responder. This is duplicity-detection reasoning — KERI's signature move — applied to request authentication, and it is worth naming when someone objects that a timing window is weaker than a nonce.

**Granularity is both isolation and parallelism [P].** Cache keys are drawn from the vector `[source AID, message type, route, exchange ID, message ID]`. Finer keys stop interleaved transactions from colliding, and because microsecond timestamps give ~1M monotonic slots per second *per cache entry*, finer keys also raise throughput. The whitepaper's worst case: with `d = 100` ms and zero network latency a sender has roughly 90,000 slots before it runs past the receiver's leading edge and must block; every millisecond of real latency adds 1,000 more. Conclusion: microsecond resolution "is more than adequate for the foreseeable future."

**One rule with teeth [P].** "When using per-transaction ID or per-message ID caching, the window size must be per transaction type, not per transaction ID/message ID, to avoid a cache-prune replay attack." A sender that could name its own window could either exhaust the receiver's memory with an unprunable cache, or open a replay gap at prune time. **Window class is always the receiver's decision.** Any proposal to let a message declare its own freshness budget runs into this.

**Out-of-order is not replay [P].** Asynchronous multipath delivery reorders messages that are not attacks. The whitepaper's answer is structural: interactive transactions self-order because the parties take turns, so use one cache entry per transaction on asynchronous transport, and only pipeline several transactions through one entry on an in-order channel or where the transaction layer retries.

## 4. The v0.7.6 redesign: three authentication types, two window levels, two gap attacks

The whitepaper's front matter is a redesign that supersedes the material behind it, and reading the older sections as current is the easiest mistake to make with this source. Sam's stated motive: "we added a lot of flexibility to allow resource tuning that may be overkill… in hindsight, I think single-key and multi-key controlled identifiers are sufficiently different that a different logic split would benefit."

**Authentication types, chosen by cardinality not threshold [P].** Three: attached seal reference (`asr`), attached signature single-key (`assk`), attached signature multi-key (`asmk`). The split is by "the cardinality of the current key list for the sender AID, not by whether the attached signature(s) satisfy the threshold… because threshold satisfication requires verifying the attached signatures first, which is a much heavier operation than merely counting the elements in the key list." A seal-reference message needs no signature collection at all — the anchoring seal in the sender's KEL already authenticated it — so it takes the short window whatever the key list looks like. When both a seal and signatures are attached, the seal is validated first because it is cheaper; if it validates, the signatures are discarded.

**The payoff:** only `asmk` ever waits. Long windows are confined to the one case that genuinely needs them, so the exposure that a long window represents is not spread across all traffic.

**Two window levels [P].** An inner window per message ID, `[rdt-d-l, rdt+d]`, and for transactioned exchanges an outer window per exchange ID, `[xdt, xdt+xl]`, anchored at the `dt` of the `xip` that opened the transaction. Both must be satisfied. The outer window exists because "a transaction may not advance until a message is authenticated" — without a cap on the transaction as a whole, an exchange cache could never be released.

**Per-message-ID caching has a pleasant side effect [P].** A message's SAID digests its `dt`, so two messages with different datetimes are different message IDs with different caches. Consequently a sender needs no cross-device synchronization to avoid tripping its own monotonicity, and reordered arrivals do not knock each other out. The price is storage: "the lower storage limit required for full KRAM is higher," and window size is the only remaining knob.

**The redesign assumes KERI v2 [P].** Transactioned `exn` requires a non-empty `x`; a v1 `exn` is treated as non-transactioned even when its `p` field chains it to a predecessor.

**Accept lag vs prune lag, and the two gap attacks [P].** Each cache type carries paired lags — `sl/ll/xl` to accept, `psl/pll/pxl` to prune — with prune ≥ accept and typically equal. The pair exists to make *reconfiguration* safe:

- **Gap replay.** A message is accepted, then pruned. The accept window is lengthened. The pruned message is replayed and now falls inside the window with no cache entry left to refuse it.
- **Gap first-play.** A message is rejected as too old and so is never cached. The accept window is lengthened. An attacker submits it as a *first* play. The whitepaper works the case: the sender, seeing no response, reissues identical content with a fresh `dt` and fresh message ID, and the victim suffers the effect twice from two messages that differ only in their timestamp.

The mitigation is a staged change: raise the prune lag immediately, then delay raising the accept lag by `delta = new - old` so any exploitable message ages out first. Decreases are safe and immediate. **Changing the *granularity* of cache types is the unsolved case in the whitepaper** — "This logic has yet to be worked out" — because adding a route-specific type can extend coverage to messages that a shorter-windowed type would have refused.

**Configuration, including a firewall [P].** A `"kram"` dictionary in the HJSON config carries `enabled`, `caches` (prepopulating the cache-type table) and `denials` — a list of `(version, ilk, route-prefix)` triples that behave "like a set of explicit firewall denial rules," where a match *disables* KRAM for that message. Its stated purpose is backward compatibility for pre-KRAM applications and for "message-type-route combinations, such as BADA-RUN endpoints, that conflict with KRAM."

**KEL availability: drop and cue, don't escrow [P].** If the sender's KEL or the specific event is missing, the whitepaper says drop the message and cue a retrieval rather than escrow it, because "the time required to notify and then retrieve the KEL exceeds the KRAM message window, causing the message to be dropped, even after the KEL is retrieved. Which makes moot the use of the escrow." It notes in passing that the existing escrow logic has "a bug… that can cause a loop that repeatedly reescrows."

**DDoS surface [P].** Stripping attachments to force a drop is a weak DoS; stripping and reattaching invalid signatures is stronger; attaching a bogus seal *alongside* valid signatures is an amplification attempt against the receiver's processing budget. The answer is ordering — accept if either authenticator validates, check the cheapest first — with transport encryption as a complementary mitigation.

## 5. Normative status: the tier that is empty

**KRAM is in no KERI specification [N-absent].** A search across `trustoverip/kswg-keri-specification` returns one file, `docs/versions/v1/index.html`, and the hit is not spec text. It is an external cross-reference pulled from `trustoverip/kerisuite-glossary` (declared `external_spec: "keri1"`, `specs.json:26`), and the whole of it is: "All requests from a web client must use KRAM (KERI Request Authentication Method) for replay attack protection. The method is essentially based on each request body needing to include a date time string field in ISO-8601 format that must be within an acceptable time window relative to the server's date time," plus a link to the `WebOfTrust/kram` repo. `spec/spec-body.md` does not mention KRAM. The ACDC and CESR specs do not mention it.

Three things follow, and they are all worth saying out loud.

**The one published definition describes the version that is known to be inadequate.** The glossary defines simple KRAM — a window, no cache — which is precisely the variant #934 says cannot support multisig. An implementer reading the specs and the glossary and nothing else would build the thing the designer has already superseded.

**The name is unstable.** Whitepaper and repo say "Mechanism"; the glossary says "Method." Both circulate. Use "Mechanism."

**Everything load-bearing lives in a personal repo.** `SmithSamuelM/Papers/whitepapers/kram.md` is versioned (v0.7.6), maintained (substantive commits through March 2026) and directive down to Python module names — but it is one person's repository on a `master` branch, with no change-control process, no review gate, and no stable citation. The keripy implementation issue [#937](https://github.com/WebOfTrust/keripy/issues/937) names it as the target of implementation. **A protocol layer that every non-key-event message depends on is specified nowhere that a standards process can reach.** That is the finding an adversarial reviewer will lead with, and it is correct.

## 6. KRAM and BADA-RUN: siblings that cannot both govern a message

Both are non-interactive replay defences; they are not the same mechanism and do not compose silently.

**BADA (Best-Available-Data-Acceptance) [N]** is in the KERI spec, and governs *data at rest*: it guarantees monotonicity of updates to signed data. For KEL-anchored updates, accept if the update's anchor is later in the KEL than the prior's. For signed-but-not-anchored updates, compare key states, later key state wins, and where the key-state location is equal, later datetime wins — with **datetimes relative to the controller's clock** (KERI spec, ~L2887-2918; `raw/01-keri-spec.md` §10).

**KRAM [P]** governs *messages in flight*, with **datetimes relative to the receiver's clock**.

**They disagree on whose clock is authoritative**, which is why a single message cannot be subject to both. The whitepaper resolves it by exclusion rather than reconciliation: BADA-RUN endpoints go in the denials list. **[K]** keripy hard-codes that resolution — `Kramer.OobiDenials` merges denials for `rpy` routes `/end/role` and `/loc/scheme` whenever KRAM is enabled, with the comment that "OOBI endpoint discovery replies rely on BADA acceptance rather than KRAM replay protection" (`kraming.py:98-147`).

The clean statement: **BADA orders what a host stores; KRAM orders what a host accepts off the wire.** OOBI and service-endpoint discovery are BADA's, everything else in the non-key-event set is KRAM's, and the boundary is drawn by configuration rather than by the message shape — which means it is a thing an operator can get wrong.

## 7. What keripy actually does

**[K] The redesign is built, and it tracks v0.7.6 rather than the older strata.** `src/keri/core/kraming.py` is 2,224 lines against a 5,768-line test file. Specifics worth knowing:

- `AuthTypeCodex` defines exactly `asr`/`assk`/`asmk` (`kraming.py:38-51`).
- `Kramer.intake` implements the whitepaper's denials-then-`kramit` shape nearly line for line, prefix-matching a compacted denial string (`kraming.py:963-969`).
- `_fetchCacheType` implements the reduced three-level cascade: `msgType.R.route`, then `msgType`, then a default catchall keyed `"~"` — chosen so it sorts last in LMDB, where the whitepaper says "default" (`kraming.py:276-308`).
- Fourteen KRAM sub-databases (`basing.py:737-856`): cache-type, message cache, transactioned cache, transaction-opener datetimes, partially-signed message/signature/sender-key-state, and one per non-authenticator attachment type.
- Multi-key accumulation detects a mid-collection rotation by comparing a stored `(sn, said)` establishment reference against the current kever, and drops the message if the sender rotated (`kraming.py:1094-1103`).
- The reconfiguration machinery the whitepaper left unfinished exists: `changeConfig`, `reconcileConfig`, `_buildCoverageGraph`, `_computeCoverageDiff`, `_computeWorstCaseDelta`, `_validateCoverage` (`kraming.py:1552-2093`).
- `Pruner` is an hio `Doer` on a 1-second period driving `_pruneMessages` and `_pruneExchanges` (`kraming.py:2162-2221`).

**[K] The `processMsg` consolidation the whitepaper asks for exists.** `Kevery.processMsg` (`eventing.py:4681`) is the single entry point for `qry, rpy, pro, bar, xip, exn`, documented with the whitepaper's three steps in order: AID allow/deny, `self.kramer.intake()`, then message-specific dispatch. `processXip`, `processPro` and `processBar` are stubs (`eventing.py:4816-4826`) — KRAM will authenticate a `xip` and then hand it to a `pass`.

**[K] "Default-disabled" is true of the class and misleading about deployments.** `Kevery.__init__` takes `enableKram=False` (`eventing.py:4136`), so a bare `Kevery` does no KRAM. But `directing.py:470` and `indirecting.py:76` both pass `enableKram=True` — the runtimes that actually run agents and witnesses turn it on. Anyone repeating "KRAM is disabled by default" should say which of those two claims they mean.

**Implementation history [P/K].** [#1302](https://github.com/WebOfTrust/keripy/issues/1302) (closed 2026-03-25) records that PR #1288 landed the core "aligned with the v0.7.5 whitepaper" and lists as remaining gaps the attachment databases, the pruning doer, keystate-retrieval cueing, AID allow/deny, and continued signature collection until the prune window. All of those are present at `upstream/main` today. The implementation is not a sketch; it is close behind a moving specification.

**Two divergences worth checking [K].**

1. **Cache-type route matching is exact; denial route matching is a prefix.** `_fetchCacheType` compares `key == f"{msgType}.R.{route}"` while `intake` uses `md.startswith(d)`. So a cache-type configured for `/end` does *not* govern a message routed `/end/role`, though a denial configured for `/end` does deny it. The whitepaper's "most specific matching" language does not settle which was intended, and the asymmetry is the kind that produces a window silently defaulting to the catchall.
2. **The gap-attack defences assume windows change only through `changeConfig`.** Cache entries store their own parameters at creation precisely so in-flight caches are immune to reconfiguration. That invariant is the hinge of the whole gap-attack argument and deserves an explicit test.

## 8. Where KRAM is load-bearing for other designs

**Multiply-endorsed presentation rests on it entirely** — see `bible/08-presentation-architectures-and-ipex.md` §7-§9. The proposed IPEX design uses KRAM's escrow as the *signature-collection mechanism itself*: a replayed copy of the same message inside the window is not an attack but a contribution, so "This elegantly solves the multi-sig problem without requiring a pre-protocol to collect signatures. The receiver's KRAM escrow does the signature collection" ([keripy#1613](https://github.com/WebOfTrust/keripy/discussions/1613)). That is an elegant reuse, and it means a freshness mechanism is also an availability mechanism: if KRAM's escrow is off or its window is short, group presentation does not merely lose replay protection, it stops working.

**The `ax` anchoring field exists because KRAM's guarantee expires.** #1613's argument for `ax` is that KRAM proves timeliness but "gives neither party a way to signal to the IPEX that the relevant messages MUST be perpetually verifiable and hence anchored." KRAM is a freshness mechanism, not an evidence mechanism; anchoring is what converts a timely exchange into a durable one.

**Tethering is defined in terms of KRAM's guarantee.** An AID appearing anywhere in the disclosed DAG is "tethered" to a grant when KRAM has established fresh proof of control over it — "Tethering implies no other relationship besides fresh (timely) proof-of-control over an AID so tethered."

**A correction to the presentation chapter, on the evidence of the primary source.** That chapter (`bible/08-...` §7) describes KRAM, following #1613, as using "a message SAID `d` field, a sender AID `i` field, a receiver AID `ri` field, a salty nonce `u` field, and a datetime stamp," and then flags a problem: `u` is not a field of an `exn`. **The whitepaper does not build KRAM on a nonce.** Its uniqueness comes from monotonic ordering of receiver-clock datetimes, and its `§Background` is an extended argument that nonce-based mechanisms are the thing KRAM replaces. A salty nonce appears once, in a different role: placed in the `q` modifier block of a transaction's first message to make the *transaction ID* universally unique — and the whitepaper immediately says a unique transaction ID cannot substitute for a timestamp, "because a timestamp is still needed in order to know when any given transaction can be pruned." So the `u`-on-`exn` puzzle is most likely an artifact of #1613's paraphrase rather than a design gap. The keripy implementation reads `msg.stamp` and never touches `u` (`kraming.py:1006-1009`), which is consistent with the whitepaper and not with the paraphrase.

## 9. Open questions

1. **Where does KRAM get a normative home?** It is required for every non-key-event message and specified only in a personal repository. The KERI spec is the obvious candidate; a standalone specification is the alternative.
2. **What is the migration path from simple to full KRAM?** The glossary defines simple; deployments run simple; keripy now implements full; multiply-endorsed presentation needs full. Nothing states what a mixed network does, or how a receiver signals which it enforces.
3. **Is `Signify-Timestamp` enforced anywhere?** **[K]** KERIA's admin interface signs over `Signify-Timestamp` as one of `Authenticater.DefaultFields` (`WebOfTrust/keria` `src/keria/core/authing.py:81`) and stamps responses with `nowIso8601()` (`:180`), but no comparison against the server clock appears in `authing.py`, `httping.py` or `agenting.py` (searched 2026-09-01). The signature *binds* a timestamp; nothing observed *rejects* a stale one. This is a negative search result and so is weaker evidence than a positive finding — but it is the exact shape of simple KRAM minus the window, and it is worth a maintainer's answer.
4. **Who owns the granularity-change gap analysis?** The whitepaper marks it unfinished; keripy implements it. Which is authoritative when they differ?
5. **What happens downstream of `xip`, `pro` and `bar`?** All three pass through KRAM into stubs.
6. **How should an operator choose window classes?** The lag values are security parameters — too long widens the replay surface, too short breaks multisig — and there is no policy guidance anywhere, only example numbers.
7. **Does the `Exchanger` gap in the presentation chapter close here?** KRAM deliberately preserves non-sender endorsements for downstream handlers (`_normalizeSenderSeals`, "leaves only non-sender triples in ssts for non-auth forwarding / escrow"), and `Exchanger.processEvent` still rejects any message carrying a signature not from the sender (`src/keri/peer/exchanging.py:88-95`, verified at `upstream/main` @`4df8e4a8`). Two halves of one code path, still pulling in opposite directions.

**Sources.** `raw/15-kram.md`. Primary: `SmithSamuelM/Papers` `whitepapers/kram.md` v0.7.6 @`67550b47`; keripy discussion [#934](https://github.com/WebOfTrust/keripy/discussions/934); keripy issues [#937](https://github.com/WebOfTrust/keripy/issues/937), [#1302](https://github.com/WebOfTrust/keripy/issues/1302), [#911](https://github.com/WebOfTrust/keripy/issues/911); `WebOfTrust/kram` README (superseded). Code: keripy `upstream/main` @`4df8e4a8` — `src/keri/core/kraming.py`, `src/keri/core/eventing.py:4136-4826`, `src/keri/db/basing.py:737-856`, `src/keri/peer/exchanging.py:88-95`; keria `src/keria/core/authing.py`. Spec: `trustoverip/kswg-keri-specification` `spec/spec-body.md` (KRAM absent), `specs.json:26` (glossary xref).
