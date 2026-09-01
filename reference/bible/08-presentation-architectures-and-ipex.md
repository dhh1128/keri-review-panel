# Presentation Architectures & the IPEX Disclosure Model

> **Staleness warning — read this before you rely on anything below.**
>
> This chapter covers the fastest-moving, least-settled area of the KERI/ACDC design
> space. Between 2026-07-25 and 2026-08-19 the presentation model was revised five times
> in public, twice in ways that superseded earlier proposals outright, and the pace has
> not slowed. This chapter is a synthesis as of **2026-08-25**; it is our best current
> reading, not a stable reference.
>
> **Before you build an argument on it, scan for newer intel.** In order of cost:
> WebOfTrust/keripy discussion [#1627](https://github.com/WebOfTrust/keripy/discussions/1627)
> and its comment stream, which is where the architecture-level thinking lands; then
> [#1613](https://github.com/WebOfTrust/keripy/discussions/1613), which its author has
> revised in place at least five times (v1.0 → v1.5) *without* changing the post date, so
> a version you read last week may not be the version there now; then the comment streams
> of the open keripy and `kswg-acdc-specification` PRs listed in §14, where the settled
> answers to several questions below are recorded only as review comments.
>
> Two specific traps. First, **a discussion body is a moving target** — cite the quote,
> not the line, and re-read before you rely. Second, **normative status flipped recently
> for a large block of this material**: Disclosure Paths and the `dp` field were prose in
> a discussion in July and are normative in the ACDC v1.1 branch as of August. Check which
> side of that line a claim sits on before repeating this chapter's tier markers.

**Thesis.** An ACDC presentation is not the disclosure of a credential. It is the
disclosure of a *directed acyclic graph* of credentials, normalized so that the graph has
exactly one source node — the origin — and negotiated by naming paths into that graph
rather than by naming attributes. That single structural commitment is what lets ACDC
absorb the other verifiable-credential architectures as special cases: a one-node DAG is a
portable data lake, and a bespoke origin node with N edges is a credential soup that has
been converted into something cryptographically rigid. Everything hard about ACDC
presentation follows from a second observation, which the graph structure does *not*
answer: a DAG commits to *data*, and a presentation must also establish *who is
presenting, right now, and with what authority*. That is the authentication-factor
problem, and it is where the current design is least settled — freshness (KRAM),
multiple endorsement, anchoring (`ax`), tethering, and presentation registries are all
answers to it, all proposed within the last six weeks, and none of them normative in any
specification today. This chapter separates the three tiers rigorously, because the
single most common error in this area is quoting a design discussion as though it were
the spec.

## 0. How to read this chapter: three tiers, marked

Every substantive claim below carries one of three tier markers. They are not decoration;
they are the point of the chapter.

- **[N]** — **Normative.** In the text of a published specification branch. Cited to
  `§Section` plus a quoted span. A validator that ignores it is non-conformant.
- **[P]** — **Proposed.** Stated in a GitHub discussion, a draft PR, or a maintainer
  comment, and not in any spec. May be well-reasoned and may be where things are heading;
  is not binding on anyone, and in several cases below has already been superseded once.
- **[K]** — **keripy behavior.** What the reference implementation does at
  `upstream/main` @`42db8991b` (2026-08-25). Note that **[K]** is frequently *neither*
  **[N]** nor **[P]** — it is sometimes ahead of the spec, sometimes behind it, and
  occasionally at odds with both.

Where the tiers disagree, this chapter says so rather than reconciling them. A claim with
no marker is this chapter's own synthesis and should be treated as the weakest kind of
evidence here.

Source revisions pinned for this chapter: ACDC spec `v1.1` branch @`6a2a89c` (2026-08-25);
KERI spec `main` @`be618e7` (2026-08-23); Dossier spec @`6037adf` (2026-08-12); keripy
`upstream/main` @`42db8991b` (2026-08-25). Line numbers are hints; the quoted spans are
the durable anchor (see the citation-durability convention in `keri-doctrine.md`).

## 1. The four presentation architectures

The taxonomy is from discussion #1627, "ACDC Presentation Architectures" (SmithSamuelM,
2026-08-19). It is a framing document rather than a proposal for most of its length, and
the framing is useful independent of whether one accepts its conclusions. **[P]**

**Portable Datalake.** One document, nested blocks, all attributes about one subject from
one issuer; the holder discloses a subset at presentation time, often by checking boxes
against an array. This is mDoc/mDL and mainstream W3C VC. Its advantage is simplicity.
Its named disadvantages: it cannot express delegation or a delegation chain; everything
must come from exactly one issuer, "Not one root-of-trust with a distributed set of
hierarchically delegated Issuers, but one and only one Issuer"; the issuer must pull from
every relevant database to issue it, so the architecture pushes issuers toward exactly the
consolidated data lake that maximizes breach blast radius; and reissuance is forced at the
periodicity of the most rapidly changing attribute in the document.

**Credential Soup.** Attributes drawn from several credentials, potentially several
issuers and several issuees, assembled at presentation time. This was Sovrin's model. It
permits issuer-side database partitioning and reissuance tuned to each attribute's
dynamism. Its costs are that presentation negotiation becomes ambiguous (an attribute may
be sourced from any of several credentials), that each distinct source needs its own fresh
proof of control, that proving several issuee AIDs represent the same party needs a
mechanism the soup does not supply, and that a soup "cannot support delegation in any
normative secure way. At least not as a cryptographically verifiable data structure."

**Verifiable DAG.** ACDC's default. Edges carry properties, each node is separably
authenticable, and each edge carries a cryptographic digest of the node it points to. The
consequence: "A verifiable cryptographic commitment to the origin ACDC of that DAG is a
verifiable commitment to every node in the DAG," giving the graph Merkle-tree-like
properties. Typically only the issuer or issuee of the *origin* needs a fresh
authentication factor. Delegation is native. Forgery "must be in totality, and not
piecemeal," where a soup can be forged piecemeal. The costs are verification complexity
and a reissuance cascade discussed in §11.

**DAG Soup.** Several disconnected DAGs presented in one exchange, each with its own
origin, requiring a multiply-endorsed grant. Most general, most complex, and the subject
of #1627's only concrete proposal (§10).

**The load-bearing claim of the taxonomy** is that ACDC subsumes the other two: "the ACDC
DAG, as a special case, can mimic either a portable data lake or a credential soup as
needed." A single ACDC with a selectively disclosable aggregate section is a portable data
lake. A bespoke origin ACDC with N edges is a credential soup that has been given a
verifiable spine. This is well-supported by the normative structure in §2-§3 and is, in
this chapter's judgment, the strongest argument in #1627.

## 2. The normalized structure: one DAG, one origin

This is the structural commitment everything else rests on, and it is **[N]** as of the
v1.1 branch.

An ACDC is not a node; it is a *graph fragment*. "It consists of a near-side node and that
node's outgoing Edges, which its Edge Section contains. An ACDC holds no Edges incoming to
its own node, only outgoing ones; its incoming Edges belong to other fragments" (ACDC
§Disclosure Paths → DAG of ACDCs, ~L1815). A source node "has no incoming Edges. It MUST
either have no Edges at all or only outgoing Edges."

The normalization: "An issuance or presentation exchange discloses a single DAG of
connected ACDC graph fragments. That DAG MUST have exactly one source node, called the
origin node." And where the material to be conveyed is not already connected, "a DAG MUST
be formed by issuing a bespoke ACDC whose node is the origin, with Edges chaining back to
every other ACDC the exchange includes" (~L1815-1821). **[N]**

Two consequences an adversarial reviewer should hold onto.

First, **the origin is a source, not a root of authority**, and these run in opposite
directions. Edges point near→far and carry a digest of the far node, so authority flows
*toward* the origin from the far nodes, while commitment flows *from* the origin to
everything reachable. #1627 uses "root of the DAG" for the far-side, deepest node — "if a
given ACDC is the root of the DAG, and that ACDC's attributes change and it must be
reissued, then every branch that sinks into the ACDC must be reissued" — which is the
correct *cascade* direction but the opposite end of the graph from the *origin*. The
terms "origin" and "root" name opposite ends here. Anyone reading #1627 alongside the spec
should translate rather than assume.

Second, **the DAG is well-ordered and therefore linearizable**. Field maps inside an ACDC
MUST be insertion-ordered, arrays are ordered, and each Edge Section is an ordered field
map, so "A well-ordered DAG with a single source node linearizes into a unique,
reproducible order" (§Ordering, ~L1829). Breadth-first from the origin is the chosen
order, "because in some applications, such as a dossier using joint issuance, the
joint-issued ACDCs fall together in breadth-first order and scatter in depth-first."
This reproducibility is what lets `dp` identify an ACDC by position rather than by SAID
(§4), which is in turn what keeps a disclosure request from introducing correlators of its
own.

## 3. The bespoke origin ACDC

A bespoke (disclosure-specific) ACDC is issued by the Discloser, for one exchange,
specifically to become the origin. It is **[N]** and has been for some time: "A given
Discloser issues its own bespoke ACDC referencing some other ACDC via an Edge. This means
that the normal validation logic and tooling for a chained ACDC can be applied without
complicating the presentation exchange logic" (ACDC §Disclosure-specific (Bespoke) Issued
ACDCs, ~L2061). The spec names the rich-presentation use directly: it "effectively enables
a type of rich presentation or combined disclosure where multiple ACDCs MAY be referenced
by edges in the bespoke ACDC... without requiring any new tooling."

Its two standard jobs are to carry presentation-specific contractual terms in its rule
section — the spec's worked example carries an anti-assimilation clause and a
one-time-purpose clause (~L2069-2114) — and to name the Disclosee as its Issuee, so that
"Signing the agreement to the offer of that bespoke ACDC consummates a contract between the
named Issuer and the named Issuee."

**#1627 adds a third job and a name for it: the bespoke origin as *recipe*.** **[P]** The
argument is that a set of unchained ACDCs issued by one root-of-trust to one issuee — the
SEDI shape, State → citizen — looks like a soup but is a degenerate one, since "All the
ingredients came from the same cupboard." A bespoke origin with one edge per ingredient
converts it into a DAG at presentation time. The origin "does not need to be anchored or
use a registry, so it's simple... It merely needs to be signed and have attached
signatures because it's a one-time use ACDC."

The interoperability move is the interesting part: **the bespoke ACDC is one-time-use but
its schema is not.** "The schema of the bespoke ACDC, however, is not one-time use. It acts
as a permanent recipe for the soup... an EGF can define the schema of the bespoke ACDC for
all its seminal use cases." Since type-is-schema and the schema SAID is a
cryptographic commitment, an EGF-published recipe schema gives tooling a fixed target
without fixing the instances.

**A correction that matters, because the sentence will be quoted.** #1627 justifies the
edge operator on a recipe edge as follows: "the Issuer of the origin ACDC (recipe) is the
Issuee of the ACDCs on the far side of each of its edges. Therefore, each edge from the
recipe ACDC can use the I2I edge operator." That is right, and it is exactly the `I2I`
relation (§5). The restatement immediately following it — "the Issuer of the recipe is the
citizen AID, and the Issuer of all the far node ACDCs is also the citizen AID" — is wrong:
the far nodes are issued by the State and the citizen is their *Issuee*. The first
sentence is the correct one; the second contradicts it and would, if implemented, describe
a set of self-issued credentials.

## 4. Disclosure paths: the `dp` field

`dp` is how a disclosure is *requested*. It became normative in the v1.1 branch after
evolving through discussions #1542 → #1512 → #1549. This is the single largest block of
material that changed tier recently. **[N]**

**It is not an ACDC field.** "The `dp` field is not an ACDC field. It appears in the
messages that negotiate a disclosure, not in the ACDCs that are disclosed. It is therefore
not reserved as an ACDC field label" (§Disclosure Paths, ~L1811). This matters for §10.

**Shape.** The value is "a list of tuples... of the form
`(ACDCSchemaSAID, PathPrefix, [paths])`," one tuple per ACDC of the DAG, and "In a
serialization that has no distinct tuple type, such as JSON, each tuple MUST be
represented as a three-element array" (~L1881). The three-element form is the settled one;
a two-element form appears in #1549's body and was superseded by its own comment stream on
2026-08-04.

**Why a list and not a field map** — this is the design decision most directly at stake in
§10: "A list of tuples is used rather than a field map keyed by Schema SAID so that a
Schema SAID MAY appear more than once. Two ACDCs of the same type, that is, of the same
Schema SAID, MAY appear in one DAG, and a field map could not tell them apart" (~L1883).

**Path syntax.** A path beginning with `/` is DAG-absolute, rooted at the origin's top
level; one that does not is ACDC-relative. Edge traversal MUST be DAG-absolute and begins
`/e`; the hop across an edge to the far ACDC is written with the virtual component `_`,
so `/e/reports/project/_/a/author` descends the origin's edge section to the `project`
edge, hops, and lands on the far ACDC's `a/author` (§Traversing Edges, ~L1843). The
`n` field label is not a path component; `_` stands for the traversal `n` designates.

**Node vs leaf — the hammer and the scalpel.** A path ending in `/` designates a whole
node and "the full expansion of every branch beneath it"; a path ending in a non-empty
component designates one leaf "together with whatever nodes along its branch are needed to
validate the SAIDs on that branch. It requires no sibling branch" (~L1855-1861). The
top-level `d/` therefore designates a whole ACDC.

**Prefix factoring.** The prefix is the DAG-absolute route to the ACDC the tuple names; it
"MUST be either the empty string or a DAG-absolute path that both begins and ends with the
path delimiter." Effective path is prefix ⧺ entry with nothing inserted, and "An entry of
a path list MUST NOT begin with the path delimiter," which makes the concatenation always
well-formed (§Path Prefix, ~L1885-1897). With a non-empty prefix, an empty entry `""`
designates the whole named ACDC; with an empty prefix it designates nothing, and `d/` is
the shortest way to say "the whole of this one."

**Ordering, and when it stops being sufficient.** Elements MUST appear in breadth-first
order and "The zeroth element MUST represent the origin node ACDC" (§Identifying Each
Tuple's ACDC, ~L1899). Where prefixes are non-empty, position is not what identifies a
tuple, and the list "MAY omit any ACDC from which nothing is requested." The ordering is
required anyway, on the grounds that any party generating `dp` must linearize the DAG to
walk it. The exception that forces explicit prefixes: where a schema makes an edge or
edge-group optional, "a party that knows only the Schema cannot generate a total ordering,
because a node the Schema allows may be absent from the DAG as issued," so every element
after the zeroth MUST carry a non-empty prefix.

**Placement.** "where a `dp` field appears in an `apply` or `offer`, it MUST appear in
that message's query section, `q`, and not in its attribute section, `a`" (§Disclosure
Paths in `apply` and `offer`, ~L2013). The reasoning is the ReST analogy the `exn` message
shape already encodes — route is the path, `q` is the query string, `a` is the body, and a
request for disclosure is a query. **`dp` appears in `apply` and `offer` only. It does not
appear in a `grant`.**

**Solicited response.** An empty list `[]` in an answering message means "the same paths
the message it answers asked for"; a differing or unsolicited message MUST NOT carry an
empty list (~L1915).

**Aggregate-section pathing** is the one genuinely special case. Blinded blocks are array
elements whose offsets a Disclosee does not know, so a path MAY name a block by its
uniquely labeled field: `A/over21` and `A/1/over21` designate the same closure. The
shorthand designates *the block*, not the field, and closes over all of it. It cannot
reach into nested sub-blocks — `A/over21/issued` "MUST be rejected when expanded" — on the
grounds that partial disclosure inside selective disclosure is an anti-pattern, and "a
Schema that calls for it is better rewritten as a DAG of ACDCs" (~L1921-1931).

**[K]** keripy implements none of this. `grep` for `'dp'` across `src/keri/` returns
nothing; `src/keri/acdc/ipexing.py` builds `apply`/`offer`/`agree`/`grant`/`admit` with no
disclosure-path concept. The construct exists in the spec and in worked examples
(`tests/acdc/`) that hand-build the `q` block through `exchange(modifiers=...)`.

## 5. Edges, operators, and edge groups

The presentation model leans on the edge layer in two places: `I2I` closes the bespoke
recipe (§3), and every proposal to signal multiple endorsement *in the ACDC* rather than
in the exchange message is a proposal for a new edge-group operator (§8).

**Block discrimination [N].** "An Edge MUST contain a node, `n` field. An Edge-group MUST
NOT have a node, `n` field" (§Block Types, ~L1065). The Edge Section is itself the
top-level edge-group. Edge-groups nest to arbitrary depth. Reserved labels are
`[d, u, o, w]` for a group and `[d, u, n, s, o, w]` for an edge.

**Unary operators [N]** (§Operator `o` field, ~L1196). `I2I` (near issuer MUST be far
issuee — the delegation link, and the default for a targeted far node); `NI2I` (relaxes
it; default for untargeted); `DI2I` (near issuer MUST be far issuee *or a delegated AID
of* far issuee); `E1E` (near *issuee* MUST equal far *issuee*, "an identity relation
between the two ACDCs' Issuee AIDs [that] places no constraint on either ACDC's Issuer
AID"); `NOT` (inverts far-node validity). `o` may be a list, and "When multiple unary
Operators appear in the list, and there is a conflict between Operators, the latest
Operator among the conflicting Operators in the list takes precedence."

**M-ary operators [N]** on an edge-group: `AND` (default), `OR`, `NAND`, `NOR`, `AVG`,
`WAVG`. "When the Operator, `o`, field is missing in an Edge-group block, the default
value for the Operator, `o`, field MUST be the `AND` Operator" (~L1120).

**The operator-token namespace has no registry, and two specs are now writing into it.**
The Dossier spec @`6037adf` defines four further m-ary edge-group operators for joint
issuance — `MxN`, `RMxN`, `MxQ`, `RMxQ` — "placed in the operator field (`o`) of an edge
group within the dossier's edges block, following ACDC operator conventions" (§Threshold
Operators, ~L364-372). They do not collide with the ACDC set or with the proposed `ME`,
but nothing *prevents* a collision, and #1555 itself flags the risk in passing ("need to
confirm no collisions"). Any argument that pivots away from edge operators toward
exchange-message fields (§10) should weigh this: the operator namespace is a shared,
unmanaged resource across at least two specifications.

**[K] keripy's operator support diverges from the spec in both directions.**
`Verifier.UnaryOps = ('I2I', 'NI2I', 'DI2I', 'E1E', 'NOT')` (`src/keri/vdr/verifying.py:41`).
`E1E` is implemented; `DI2I` and `NOT` are recognized and *fail closed* with a
`ValidationError` rather than escrowing, on the reasoning that a retry cannot make an
unsupported operator supported (`verifying.py:446-452`). There is **no m-ary operator
concept at all**, and the edge-walk at `verifying.py:175` indexes `node["n"]`
unconditionally, as does `Reger.sources` at `src/keri/vdr/eventing.py:2587` — so a nested
edge-group raises `KeyError: 'n'` on both paths. **Every proposal built on edge groups is
therefore unbuildable in keripy today**; PR #1560 is the traversal fix and is open.

One stale comment worth knowing about when reading the code: `verifying.py:40` says "E1E
is a keripy extension not yet in the spec's normative operator table." As of v1.1
@`6a2a89c`, `E1E` *is* in the normative table. The code is right and its comment is
behind.

## 6. Authentication factors: the second problem

The DAG solves data integrity and authority structure. It does not, by itself, establish
that the party sending the presentation controls anything at the moment of sending.
Discussion #1613, "Authentication Factors in IPEX," is the systematic treatment. All of it
is **[P]**; none of it is in any spec.

**Two purposes, never conflated.** Every ACDC in a granted DAG needs an *Issuer*
authentication factor — proof it was authentically issued. The `grant` needs a *Grantor*
authentication factor — fresh proof of control by whoever is presenting. "For a given
ACDC, a Grantor may be the Issuee, Issuer, both, or neither."

**Three factor types, strictly ranked:** registry (TEL) anchor, KEL anchor, bare
signature. The ranking is not stylistic — registry and KEL anchors "enable perpetual
verifiability and detectability of impersonation fraud. Whereas a bare signature does not,"
and a registry anchor additionally carries lifecycle state. The composition rule is
absorption: "when multiple authentication factors are either required or provided for the
same purpose, the highest-preference factor is used, and the others are ignored."

**Bare signatures are ephemeral in a strong sense.** "as soon as the Issuer rotates its
keystate, any ACDCs it issued using a bare signature as the Issuer authentication factor
with a prior keystate become unverifiable and must be reissued. This is only useful for
truly temporary use (ephemeral) ACDCs." This is worth flagging against §3's claim that a
bespoke origin "does not need to be anchored or use a registry": a registryless,
signature-only bespoke origin is disposable by construction, which is fine for a one-time
recipe and is *not* fine if anyone later needs to prove what was presented.

**Vocabulary.** The Discloser sends `offer` and `grant` (Offerer, Grantor); the Disclosee
sends `apply`, `agree`, `admit` (Applicant, Agreent, Admittant). "In common parlance, a
Grantor is a Presentor, and the grant is a presentation." Where several AIDs endorse one
grant, "there is a set of Grantors that each must be uniquely authenticated."

## 7. Freshness: KRAM, and what rests on it

Everything about multiply-endorsed presentation rests on KRAM, so its status matters more
than any other single fact in this chapter.

> **This section is an audit of KRAM's status as it bears on presentation, not an account
> of what KRAM is.** For the mechanism itself — the problem it solves, simple vs full KRAM,
> the monotonic timeliness cache, the v0.7.6 redesign, and its relationship to BADA-RUN —
> see `bible/09-kram-and-request-authentication.md`, which is built from Sam's whitepaper
> rather than from #1613's paraphrase of it. Two claims below are corrected there and are
> marked in place.

**The problem [N-adjacent].** A signature is a bearer token: "Any holder of both the
document and its signature can replay them, and the signature will verify" (#1613). The
KERI spec states the general form and prefers non-interactive mitigation — "Because
non-interactive mitigations are asynchronous, however, they do not have the latency and
scalability limitations of interactive mitigations and are therefore preferred" (KERI
§Replay attack, ~L2878).

**The proposed mechanism [P].** As #1613 describes it, KRAM (KERI Request Authentication
Mechanism) uses "a message SAID `d` field, a sender AID `i` field, a receiver AID `ri`
field, a salty nonce `u` field, and a datetime stamp relative to the receiver's clock `dt`
field." **Corrected — the nonce is not part of KRAM.** The whitepaper builds uniqueness
from monotonic ordering of receiver-clock datetimes, and argues at length that nonce-based
mechanisms are what KRAM replaces; keripy reads `msg.stamp` and never touches `u`. See
`bible/09-kram-and-request-authentication.md` §4, §8. Its properties are otherwise as
stated: one play or none, within a window measured on the *receiver's* clock, so "The
sender cannot therefore lie about the datetime in the message." A same-message replay
inside the window is either ignored or, for a multisig sender, contributes its signature
to an escrow — "This elegantly solves the multi-sig problem without requiring a
pre-protocol to collect signatures. The receiver's KRAM escrow does the signature
collection."

**Three findings about KRAM's actual status, each verified.**

*KRAM is not in the KERI specification.* A search for "KRAM" across KERI spec `main`
@`be618e7` returns nothing in `spec/spec-body.md`. The spec discusses replay attacks and
BADA-RUN at length and never names this mechanism. So the freshness guarantee the entire
multiply-endorsed design depends on is, at the specification layer, absent. (One near-miss,
found later: the rendered v1 artifact carries a *glossary cross-reference* imported from
`trustoverip/kerisuite-glossary`, defining simple KRAM in a single sentence. It is not spec
text, and it describes the variant that cannot support multisig — see
`bible/09-kram-and-request-authentication.md` §5.)

*The `u` field KRAM is described as using does not exist on an `exn`.* **This puzzle
probably dissolves** — `u` is #1613's paraphrase, not the whitepaper's mechanism, per the
correction above. The observation about message shapes stands on its own terms and is worth
keeping, so it is recorded unchanged below. The KERI spec fixes
both message shapes exactly: `xip` is `[v, t, d, u, i, ri, dt, r, q, a]` and `exn` is
`[v, t, d, i, ri, x, p, dt, r, q, a]`, and for both, "All are REQUIRED. No other top-level
fields are allowed (MUST NOT appear)" (~L1154, ~L1197). `u` is present on `xip` and
absent on `exn`; the spec says `u` "appears in exchange transaction inception messages to
ensure that the associated transaction ID is also universally unique" (~L963). #1613
describes KRAM as using `u` and as applying "to each `xip` or `exn` individually." For an
`exn` the uniqueness comes from `x` ⧺ `p` chaining instead. This may be a slip in the
prose rather than a design gap, but it is not currently reconcilable as written.

*keripy is further along than the July reading suggested, and the gap has moved.*
**[K]** `Kramer` (`src/keri/core/kraming.py`) is real, exn-aware — its cache-type cascade
is keyed by message ilk and route, `_fetchCacheType(msgType, route)` with "`exn`" named
explicitly (~L282) — and it deliberately distinguishes sender from non-sender
attachments. `_normalizeSenderSeals` "leaves only non-sender triples in ssts for non-auth
forwarding / escrow" (~L386), and `_normalizeCurrentSenderTsgs` notes that "downstream
exn/rpy handling still needs the[m]" (~L448). It is instantiated inside `Kevery`
(`src/keri/core/eventing.py:4176-4178`) and is **default-disabled**: "KRAM enforcement
remains controlled by the provided configuration, defaulting to disabled without one."
**Sharpen that at `upstream/main` @`4df8e4a8` (2026-09-01):** `Kevery.__init__` still takes
`enableKram=False`, but the two runtimes that matter both pass `enableKram=True` —
`src/keri/app/directing.py:470` and `src/keri/app/indirecting.py:76`. Default-disabled is a
fact about the class, not about deployed agents and witnesses.

So KRAM now does exactly what #1613 says it does — passes non-sender endorsements along.
And then `Exchanger.processEvent` throws them away, along with the whole message:

```python
if sender != prefixer.qb64:  # sig not by aid
    ...
    raise MissingSignatureError(msg)
```
(`src/keri/peer/exchanging.py:88-95`.) `peer/exchanging.py` contains no reference to
`kraming` or `Kramer` at all. The July-2026 reading of this gap was "KRAM is not wired to
exn." The accurate August reading is sharper and more actionable: **KRAM is exn-aware and
preserves non-sender endorsements specifically so a downstream handler can use them, and
the downstream handler rejects the message for carrying them.** That is a two-sided gap in
one code path, not an absent feature.

**Tethering [P].** Given multi-endorsement-aware KRAM, #1613 defines a derived property.
The `grant` carries the origin SAID in an origin `o` field, and because the origin commits
to every ACDC in its DAG, "when any Grantor AID appears anywhere in the DAG of ACDCs
originating at the origin ACDC, then we say that that ACDC is *tethered* to the `grant`."
Tethering means only that: fresh proof of control over that AID, wherever it appears.
"Tethering implies no other relationship besides fresh (timely) proof-of-control over an
AID so tethered." Its motivating case is entitlement replay — Bob's movie coupon, where
Cal must know Bob and not the thief Ian is presenting.

Note that the origin `o` field is **[P]** and appears in no spec. Note also that `o` is
already the reserved label for **Operator** throughout the ACDC edge and edge-group
blocks. The two live in different namespaces — an `exn` attribute section versus an ACDC
edge block — so this is an overload rather than a collision, but it is an overload in a
protocol family where `o` otherwise means exactly one thing.

## 8. Multiply endorsed presentation: the proposal that moved

This is the clearest case in the corpus of a design that was superseded, and reading the
superseded version as current is the most likely way to be wrong about it.

**#1555 (2026-07-29) [P, superseded].** Non-sender AIDs attach signature groups (`-X`/`-Y`
for transferable, and seal-source equivalents) to a single `grant`; KRAM's timeliness
extends to them. The signal that endorsement is *required* should live in the ACDC, not
the `exn`, because "An exchange message is relatively simple in comparison to an ACDC.
There is no normative cryptographic commitment in an exchange message to a given schema."
The mechanism: a new M-ary edge-group operator, `ME`, on a bespoke origin, meaning each
far ACDC in the group must be endorsed by its issuee via signatures attached to the grant.
Multi-DAG presentation explicitly out of scope.

**#1556 (2026-07-29) [P].** The companion. The global `I2I` default is a
backward-compatibility accommodation for pre-operator vLEIs, and it fits the new
non-delegative operators badly — an `ME` group would need explicit `NI2I` on every edge.
Proposal: make unary defaults a function of the enclosing m-ary group operator (`ME` group
→ `NI2I` default), and add an `IAND` group whose edges default to `E1E`. Not changing the
global default, which "might break vLEIs in the wild."

**#1613 (2026-08-12, revised to v1.5 on 2026-08-18) [P, current].** Opens by superseding
its predecessor: "As of version 1.1, this discussion supersedes much of the 'Multiply
Endorsed' discussion... This discussion solves for the proxy negotiator for another AID
use case without needing a new edge operator." What it does *not* supersede is `ME` itself
— "It does not supersede the proposal for a new edge operator" — and it explicitly does
not solve "the more generic use cases of a proxy negotiator for multiple other AID nor the
more generic case where multiple simultaneous AIDs are negotiating in concert."

**The motivating case is correlation, not convenience.** "a given controller may use one
AID it controls as a proxy to negotiate on behalf of another AID it controls so that this
other AID is not disclosed until after contractual protection is in place... Only the
first AID needs to participate in the failed negotiation and is the only one exposed by
it." Sam (proxy negotiator) fronts for Bob (coupon issuee); Bob's AID appears for the
first time in the `grant`.

**The processing rule [P].** KRAM validates sender-AID groups and passes non-sender groups
through; "to support multiply endorsed IPEX, the IPEX processor MUST validate all
non-sender endorsements after KRAM." Signatures must verify against the endorser's
*current* key state and satisfy its threshold; seal-source references must be found in the
endorser's KEL against the message SAID; where both are supplied, "the seal source
reference is preferred."

**One limitation stated plainly, and it is the sharp edge.** A non-sender multisig endorser
gets no help from KRAM's escrow-collects-signatures trick, "therefore, the Grantor must
employ some pre-protocol to collect a threshold-satisfying set of signatures and then
attach them to the grant." The offered mitigation is that a proxy and its principal are the
same controller and can be given matching multisig infrastructure and threshold, in which
case collection happens "serendipitously." That is a real constraint on deployment
topology dressed as a coincidence.

**Multiple endorsement attaches to the `grant` and to nothing else** — "A valid IPEX could
consist of only a `grant` message. This means that multiple endorsements cannot depend on
some combined effect of multiple messages."

**Live co-presence versus durable consent.** `ME`-style endorsement requires every issuee
online and signing at presentation time. It does not cover presentation on behalf of an
*offline* party — a guardian for a dependent, an agent for a traveller. That case closes
under plain `I2I` with a consent ACDC in the middle, and does so today at v2 with no new
operator: `bespoke(issuer=A, issuee=V) --I2I--> consent(issuer=B, issuee=A) --I2I-->
credential(issuer=HA, issuee=B)`. Both links satisfy `I2I`, and A cannot manufacture the
bridge because the middle link demands B be the *issuer* of the consent. These are
complementary halves — live freshness versus durable delegation bounded by revocation —
and conflating them is easy. (Established by measurement, keripy v2, 2026-07-29; see
#1555's comment stream.)

## 9. Anchoring: the `ax` field, presentation registries, origin-AID anchoring

All **[P]**, from #1613.

**The gap `ax` fills.** KRAM proves timeliness but "gives neither party a way to signal to
the IPEX that the relevant messages MUST be perpetually verifiable and hence anchored.
Anchoring via KRAM is solely determined by the set of endorsers at the time the message is
transmitted."

**The field.** `ax` is a boolean in the **attribute `a` section** of `apply`, `offer`, and
`grant`; truthy only if present and `True`. An IPEX may begin with any of those three, so
any of them may carry it. Satisfying it means the Grantor anchors the `grant` and the
Applicant anchors `agree` and `admit`, with an exception where a `grant` arrives without
an enabling `agree`.

Note the placement asymmetry against §4: `dp` is normatively in `q` and never in a
`grant`; `ax` and the origin `o` are proposed for `a` and do appear in a `grant`. Any
proposal that amends all three uniformly has to account for this.

**Why anchor at all.** Anchoring `agree` gives the Discloser perpetually verifiable proof
of agreement before disclosure; anchoring `grant` gives the Disclosee proof of "what was
granted and, as importantly, what was not granted"; anchoring `admit` "removes plausible
deniability regarding the Disclosee's knowledge of the disclosed information and could
trigger safe harbor protections."

**Presentation registries.** Summarized here because they bear on anchoring; treated in
full in `bible/10-presentation-registries.md`, which is built from the concept's origin
document — keripy discussion #1095, *ACDC Issuee Usage Registry*, ten months older than
#1613 and filed under a different name, which is why earlier passes over this corpus
missed it. A registry controlled by the *Issuee*, whose latest
non-vacuous blinded state binds the `grant` SAID. Signalled by the issuer at issuance
through a populated `rd` *and* `i` at the top level of the ACDC's **attribute `a`
section** — note, not the ACDC's own top-level `rd`, which names the ACDC state registry.

Two benefits, and only one is a security property. *Impersonation-fraud detection*: because
the registry's events anchor in the Grantor's KEL, the Grantor can see events it did not
create, and "an imposter that merely compromises the Grantor's signing infrastructure
can't avoid the requirement without also compromising the Issuer." This works **only when
the Issuer differs from the Grantor** — for a self-issued ACDC an imposter with the
signing keys simply issues one that requires nothing. *Correlation resistance*: an
anchored grant whose SAID appears only inside a blinded registry event means "a correlator
walking the Grantor's KEL would not be able to observe it," so the exchange can be
perpetually verifiable without giving a KEL-scanning third party a join key between
Grantor and Grantee.

**#1613 floats restricting `rd`-in-`a` to presentation registries.** The v1 spec also
permits it as a *hidden ACDC state registry*, and #1613 judges that case "potentially
dubious" and suggests forbidding it in v1.1. That question is live and touches the
independent-registry bulk-issuance work directly enough to be worth watching.

**Origin AID anchoring — the resolution.** With multiple Grantors, who must anchor? The
complications are real: in a delegation chain, "Issuee AIDs that are not at the tail (leaf)
of a delegation chain (tree) do not need a fresh proof-of-control"; and a Dossier-style
evidence presentation may name an issuee wholly unrelated to the Discloser. Rather than
enumerate, #1613 picks a rule: "either the sender must anchor the grant or the Issuee or
Issuer of the origin ACDC of the grant must anchor the grant," checked in that order of
priority. This is what lets the sender AID stay absent from the disclosed DAG entirely
while the principal's anchor still satisfies the requirement.

**The layering is explicit and worth preserving in any critique:** the anchoring rule "is a
loose business logic requirement... enforced after the grant passes KRAM and IPEX multiple
endorsement but before other business logic requirements." Cal's coupon rule — that *Bob
specifically* must anchor — is EGF business logic riding above the protocol rule, not a
substitute for it. A grant can pass KRAM, pass multiple endorsement, satisfy `ax`, and
still be refused by the verifier's own policy, and #1613 treats that as correct.

## 10. DAG soup, and the field-map amendment

#1627's only concrete proposal. **[P]**

**The argument for needing it at all.** A bespoke origin converts a soup into a DAG, so
why keep soup? "When the ingredients are sourced from different cupboards, i.e., each have
different Issuee, then the presentation must be multiply endorsed." And the practical
case: presenting several DAGs in parallel in one exchange beats a series of IPEXes, since
"A series of IPEX presentations adds more failure modes, and if the business logic requires
all to complete for processing to continue, now the parties to the exchange have to keep
state across multiple IPEXes. This requires a meta IPEX protocol."

**The pivot away from edge operators.** #1555 put the multi-endorsement signal in the ACDC.
#1627 reconsiders, because anchoring joined the picture: "#1555 predates #1613 which
largely superseded #1555... now a fully multiply endorsed exchange gets more complicated
with respect to anchoring, as there would be more than one effective origin node to which
the anchoring requirement... must be applied. Following down the path of using new edge
operators would require defining yet another edge operator that signaled the anchoring
requirement." Conclusion: "the complications of a combination of multiply-endorsed and
multiply-anchored presentations may flip the trade-space away from using edge operators as
the primary way to signal either or both."

**The amendment.** Each of `dp`, `o`, and `ax` gains a second form. Single DAG: unchanged.
DAG soup: the value "becomes a field map, with a unique informative label for each DAG,"
whose per-label values are respectively the tuple list, the origin SAID, and the boolean.
Its claimed virtue is backward compatibility — "no changes are required to the current
single DAG approach. Therefore, it can be added later when needed."

**Four observations for anyone evaluating this.**

*The labels are not informative; they are a join key.* If `dp`, `o`, and `ax` are all keyed
by the same labels, those labels must agree across three field maps carried in messages
sent by two different parties at different stages of a negotiation. That is a namespace
requiring coordination, not an annotation.

*It reintroduces the shape `dp` was deliberately given up.* The normative reasoning for a
list over a field map is quoted in §4: a map "could not tell... apart" two ACDCs sharing a
schema SAID. The soup form reinstates a map at the outer level, keyed by a
presenter-chosen label instead of a schema SAID. Whether the objection transfers depends
on whether two DAGs can collide the way two same-schema ACDCs can — but the burden of
that argument has not been discharged.

*The three fields do not live in the same place.* `dp` is normatively in `q`, and only in
`apply` and `offer`. `o` and `ax` are proposed for `a`, and both appear in a `grant`. A
DAG-soup `grant` carries `o` labels for DAGs whose existence the `apply` may not have
anticipated, so it is not obvious the label spaces can be made to line up at all.

*The alternative is not ruled out.* One bespoke origin with N edges, plus multiple
endorsement, already presents material with different issuees as a single DAG — that is
`ME`'s exact use case. #1627 asks "is there a need for a DAG Soup?" and answers "it
depends," but the discriminator it gives (different issuees → must be multiply endorsed)
applies equally to both shapes. What DAG soup buys over one bespoke origin plus
multi-endorsement is, as of this writing, unstated.

## 11. The two SEDI recipes, and the reissuance cascade

#1627's applied section. Both are **[P]**; the trade is genuine and is the most decision-
ready material in the discussion.

**Bespoke origin as recipe** (§3). Maximum flexibility. Relationships form only at
presentation time, so "Data changes in each isolated ACDC that cause reissuance do not
trigger a cascade of reissuance of other ACDCs." Cost: a bespoke ACDC per presentation,
and no memorialization — "A bespoke on-the-fly ACDC does not have any ability to
memorialize the state of the graph at the time."

**Chained ontology as recipe.** Pre-build the DAG as a standing labeled property graph, so
that "All presentations are just branches of this master recipe." Edges are non-delegative
(`NI2I` or `E1E`) since the issuee is constant. Simplest tooling; strongest normative
structure for interop. Cost: the cascade — "whenever data changes in the root ACDC or in
ACDCs that lie in upper branches of the graph... then all dependent ACDCs in lower branches
or leaves must be reissued," mitigated by pushing volatile data to the leaves, and by a
*transfer registry* whose state change forward-references a replacement rather than
revoking.

**What is not tradeable.** "secure delegation requires a DAG that represents the authority
structure. A bespoke ACDC can not replace it. The delegation chain is inescapable." So
guardianship and every other genuinely delegative use case needs the delegative DAG
regardless of which recipe style is chosen, and the realistic answer is a combination.

**A tension this chapter has not seen addressed.** Under the ontology recipe you present a
*branch*, and a branch's local source node is not the ontology's origin. But §9's anchoring
rule and §7's tethering are both stated in terms of "the origin ACDC" of the grant. If the
origin is whichever node roots the presented branch, then which party can satisfy `ax`
changes with the branch selected — and if instead the ontology's own source node must
always be the origin, then every presentation drags the whole upper graph along, which is
most of what the ontology approach was supposed to avoid. #1627 does not say which.

## 12. Ground-truth matrix

| Construct | Spec | Proposed in | keripy @`42db8991b` |
|---|---|---|---|
| One DAG, one origin, bespoke origin | **[N]** ACDC v1.1 | #1549 | structural only; no origin concept in IPEX builders |
| `dp` disclosure paths, 3-tuple, `q` section | **[N]** ACDC v1.1 | #1512→#1542→#1549 | **absent** — no `'dp'` in `src/` |
| Path prefix, `_` edge hop, node/leaf closure | **[N]** ACDC v1.1 | #1549 | absent; `Pather` has no edge traversal |
| Unary ops `I2I`/`NI2I`/`DI2I`/`E1E`/`NOT` | **[N]** ACDC v1.1 | — | `I2I`/`NI2I`/`E1E` implemented; `DI2I`/`NOT` fail closed |
| M-ary ops `AND`/`OR`/`NAND`/`NOR`/`AVG`/`WAVG` | **[N]** ACDC v1.1 | — | **none**; edge groups raise `KeyError: 'n'` |
| Dossier ops `MxN`/`RMxN`/`MxQ`/`RMxQ` | **[N]** Dossier | — | absent |
| Edge-group traversal | **[N]** ACDC v1.1 | — | **absent** — PR #1560 open |
| `ME` operator | — | #1555 (not superseded) | absent |
| Group-scoped unary defaults, `IAND` | — | #1556 | absent |
| KRAM freshness | **absent from KERI spec** (glossary xref only) | whitepaper v0.7.6, #934, #1555, #1613 | `Kramer` exists, exn-aware, wired via `Kevery.processMsg`; off by class default, **on** in `directing`/`indirecting` |
| Non-sender endorsement pass-through | — | #1555, #1613 | KRAM preserves them; `Exchanger` **rejects the message** (`exchanging.py:88-95`) |
| Multiply-endorsed IPEX post-processing | — | #1613 | absent |
| Origin `o` field in `grant` | — | #1613 | absent |
| `ax` anchored-exchange field | — | #1613 | absent |
| Presentation registry (`rd`+`i` in `a`) | v1 permits `rd`-in-`a`, purpose ambiguous; nested-`rd` purpose list includes "usage" | #1095 (origin), #1613, #1618 | blindable-registry substrate exists; **no signal recognition, no anchor enforcement** (ch. 10 §7) |
| Tethering | — | #1613 | absent |
| Origin-AID anchoring priority rule | — | #1613 | absent |
| DAG soup / field-map `dp`,`o`,`ax` | — | #1627 | absent |

The shape of that table is the chapter's most important single output: **the normative
column is thick on structure and empty on authentication, and the keripy column is empty
almost throughout.** Presentation architecture is, today, a design conversation with worked
examples attached, not an implemented protocol.

## 13. Open questions and known tensions

Carried forward for anyone building on this chapter. Each is either unanswered in the
sources or answered inconsistently across them.

1. **Where does the multi-endorsement signal live?** #1555 says the ACDC (schema-is-type
   gives a cryptographic commitment an `exn` cannot match). #1627 leans toward the `exn`
   because anchoring would otherwise need a second operator. Both arguments are good and
   they point opposite ways. `ME` is explicitly *not* superseded, so both are live.
2. **What does DAG soup buy over one bespoke origin plus multiple endorsement?** (§10.)
3. **Under the ontology recipe, which node is "the origin"?** Answering fixes who can
   satisfy `ax` and what tethering covers. (§11.)
4. **Can the field-map labels of `dp`, `o`, and `ax` be made to agree** across messages
   sent by two parties, when `dp` is in `q` on `apply`/`offer` and the others are in `a`
   including on `grant`? (§10.)
5. **What is KRAM's normative home?** It is load-bearing for everything in §7-§9 and is in
   no specification. Does it belong in the KERI spec, an IPEX spec, or neither? (Carried
   forward and expanded in `bible/09-kram-and-request-authentication.md` §5, §9.)
6. ~~**How does KRAM apply to an `exn`, which has no `u` field?**~~ **Resolved**: the `u`
   field is #1613's paraphrase, not KRAM's mechanism. See §7 and
   `bible/09-kram-and-request-authentication.md` §8.
7. **Should `rd` in the attribute section be restricted to presentation registries?**
   #1613 raises it and does not settle it, and the two options have very different blast
   radii. Its *disambiguation* option (EGF declares the purpose; default is presentation
   registry) breaks nothing: a presentation registry needs `rd`+`i` in `a` **and** a
   non-empty top-level `rd`, while the hiding case needs the top-level `rd` absent, so the
   two are already distinguishable. Its *forbid* option — "we might want to forbid using
   the `rd` field in the attribute section for an ACDC state registry" — strikes **method
   2** of the spec's three graduated-disclosure methods for a bulk-issued registry SAID
   ("provide the `rd` field nested inside either the Attribute or Aggregate section",
   ACDC v1.1 §Basic Bulk Issuance Procedure, ~L3049). #1613 justifies the restriction by
   saying the hiding case "is not useful with full independent Registry bulk issuance
   since... there would be no cross correlation even without contractual protection" —
   which the pending `kswg-acdc-specification` #204 rebuts directly: the Registry SAID
   "remains, however, a stable identifier for the copy itself, and hence for the context in
   which that copy is used." Decorrelation across the set does not remove the per-context
   correlator.
8. **Is a registryless bespoke origin acceptable** as a first-class participant, given
   that a bare-signature issuer factor dies at the issuer's next rotation? (§6, §3.)
9. **Does the operator-token namespace need a registry**, now that ACDC and Dossier both
   write into it and `ME`/`IAND` are proposed? (§5.)
10. **Non-sender multisig endorsers need an out-of-band signature-collection pre-protocol.**
    #1613 acknowledges this and mitigates it only by assuming shared infrastructure. (§8.)

## 14. Sources

**Specifications.** ACDC `v1.1` @`6a2a89c` — §Edge Section (~L1058), §Disclosure Paths
(~L1809), §IPEX (~L1988), §Disclosure-specific (Bespoke) Issued ACDCs (~L2061). KERI
`main` @`be618e7` — `xip`/`exn` message bodies (~L1154, ~L1197), UUID `u` (~L963),
replay/BADA-RUN (~L2876). Dossier @`6037adf` — §Threshold Operators (~L364).

**Discussions** (WebOfTrust/keripy, all by SmithSamuelM unless noted; bodies are revised
in place — quote, don't cite by line): #1512 and #1542 (superseded `dp` precursors); #1549
"Revised Disclosure Paths `dp` field value syntax", incl. the 2026-08-04 three-tuple
comment and the 2026-08-12 exchange settling whole-ACDC paths; #1550 (ward/guardian
authorization); #1555 "Multiply Endorsed Presentation"; #1556 "Unary Edge Operator
Defaults"; #1613 "Authentication Factors in IPEX" (v1.5, 2026-08-18); #1627 "ACDC
Presentation Architectures" (2026-08-19).

**keripy** @`42db8991b` — `src/keri/vdr/verifying.py` (operator dispatch, `UnaryOps`:41,
fail-closed:446-452, edge walk:175); `src/keri/vdr/eventing.py:2587` (`Reger.sources`);
`src/keri/peer/exchanging.py:88-95` (non-sender rejection); `src/keri/core/kraming.py`
(`Kramer`, sender/non-sender normalization ~L379-455); `src/keri/core/eventing.py:4176`
(KRAM wiring, default-disabled); `src/keri/acdc/ipexing.py:345-520` (IPEX builders).

**Open work that will move this chapter** — keripy #1560 (edge-group traversal, the
prerequisite for every group-operator proposal), #1564 (`DI2I`), #1561 (`dp` in the worked
examples), #1530/#1577 (guardianship presentations), #1576 (bulk issuance);
`kswg-acdc-specification` #204, #207. Their comment streams hold settled answers that
exist nowhere else.
