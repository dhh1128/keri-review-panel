# 04 — CESR & the Wire

## Thesis

CESR (Composable Event Streaming Representation) is not a serialization convenience layered on top of KERI; it is the external interop contract that makes the whole stack verifiable at all. Its single defining property is *text-binary concatenation composability* — the guarantee that any set of self-framing primitives concatenated in the text domain can be converted en masse to binary and back with zero loss and zero re-parsing (CESR spec §Composability, L5; §SAD Path Signatures, L1396). Everything an adversarial reviewer needs to understand about "the wire" follows deductively from that one property plus one arithmetic fact — that 24 is the least common multiple of Base64's 6 bits per character and a byte's 8 bits (CESR spec §Conversions, L196). From those two roots come the sizing math, the code-table taxonomy, the count/group codes, the version strings, the cold-start tritet discipline, and the crypto-agility mechanism by which a post-quantum algorithm claims an unused code slot without desynchronizing a parser that predates it. The recurring reviewer error is to treat CESR as "just Base64 with type tags," to reach for `=` padding or JCS-style lexicographic canonicalization, or to assume the encoding is an implementation detail a maintainer may simplify freely. Each of those is a wire-interop defect that keripy's own test suite will not catch, because the failure is in an *external* contract with keria, signify-ts, and every other implementation on the network (keripy-knowledge `00-lens.md` claim 5; `30-invariants.md` §A).

This section separates what the spec and the reference implementation *enforce* (well-established) from what is reserved, in flux, or a known landmine (uncertain/contested), and flags where a claim rests on a load-bearing assumption.

---

## 1. What CESR fundamentally is, and the priors it corrects

CESR is a **dual text-binary encoding format whose unique property is text-binary concatenation composability** (CESR spec §SAD Path Signatures, L1396; §Composability, L5). This is the root claim; the rest of the format is derived from it.

Three corrections to outsider priors are worth stating at the top, because they are the tells of someone who has not read the spec:

- **CESR is not crypto-only.** "The CESR protocol... is not limited to merely encoding Cryptographic Primitives but any primary data type (numbers, text, datetimes, lists, maps) may be encoded in a composable way" (CESR spec §Abstract Domain representations, L11). Reviewers who model CESR as "a signature envelope" miss that it is a *general primary-datatype* encoding.
- **CESR is not naive Base64.** Standard Base64 pads each individual conversion to a multiple of 4 characters, which yields only "one-way composability" — primitives are separable but not losslessly round-trippable *en masse* (CESR spec §Text Code Size, L252; L95; L139). Convert a concatenation of raw binary values through naive Base64 and bits from two adjacent primitives can land in a single text character (L184), destroying the boundaries. CESR therefore **forbids the `=` pad character entirely** "because all CESR-encoded Primitives are composable" (§Concrete Domain representations, L93). If a proposal reaches for `=`, it has already lost composability.
- **The encoding is an external interop contract, not an implementation detail.** Compliance is normative: "All compliant encoded Primitives MUST be Composable. All compliant encoded Primitives MUST be self-framing" (§Composability, L5); "All compliant implementations MUST support the transformations between all three domains" (§Transformations, L31). keripy is a *reference* implementation whose intent layer is exogenous — the spec itself. "A change that passes keripy's own tests but diverges from the spec/wire format is a defect, because it silently breaks interop" (keripy-knowledge `00-lens.md` claim 5).

The design aesthetic is **minimally-sufficient strength, no waste**: "there is minimally sufficient cryptographic strength and more cryptographic strength just wastes computation and bandwidth" (§Compact fixed-size codes, L446). 128 bits of entropy is the accepted floor; the compact tables deliberately exclude weak suites (Annex A, L782). And the format is **text-first for humans, binary-only for compactness**: "A primary design goal of CESR is to select an encoding approach that provides high usability, readability, or human friendliness in the 'T' domain... The 'B' domain's purpose is merely to provide convenient compactness at scale" (§Stable Framing Codes, L202).

CESR was developed *for* KERI ("CESR was developed for the KERI protocol," §SAID, L1186) and is the encoding substrate beneath KERI, ACDC, and TSP. But the composability contract is protocol-agnostic; the genus/version mechanism (§8 below) is exactly what lets one encoding serve many protocols.

---

## 2. The three domains and the six transformations

CESR defines three representations of any primitive (§Abstract Domain representations, L11):

- **Text domain 'T'** — streamable Base64 text.
- **Binary domain 'B'** — streamable binary.
- **Raw domain 'R'** — non-streamable binary, represented as a *two-tuple* `(code, raw)`: the text derivation code plus the unqualified raw bytes. Cryptographic operations happen here: "The actual use of Cryptographic Primitives happens in the 'R' domain using the raw binary element of the `(code, raw)` pair" (L11).

Composability is a property of **T and B only**; R is the special domain where the math is applied but not streamed. There are six transformations, one per ordered pair — `T(B)`, `B(T)`, `T(R)`, `R(T)`, `B(R)`, `R(B)` — and full circuits are possible, e.g. `R -> T(R) -> T -> B(T) -> B -> R(B) -> R` (§Transformations between Domains, L17-31, L40).

The interop payoff is precise and load-bearing: **`T(B)` is naive Base64 encode and `B(T)` is naive Base64 decode**, so "CESR Primitives are compatible with existing Base64 (RFC-4648) tooling"; only R↔T and R↔B need new code (§Text Code Size, L266). This is what lets a JSON-embedded CESR value be handled by ordinary Base64 libraries. The reference implementation makes this literal: a primitive is `composable` iff `len(qb64b) % 4 == 0 and len(qb2) % 3 == 0 and encodeB64(qb2) == qb64b and decodeB64(qb64b) == qb2` (keripy `core/coring.py:1285-1294`). That method *is* the composability contract, executable.

---

## 3. Composability — the core invariant and the 24-bit backbone

**Definition (well-established):** "An encoding has Composability when any set of Self-Framing concatenated Primitives expressed in either the Text domain or Binary domain may be converted as a group to the other Domain and back again without loss" (§Composability, L5). Formally, `T(B)` and `B(T)` are jointly concatenation-composable iff `T(cat(b[k])) = cat(T(b[k]))` and `B(cat(t[k])) = cat(B(t[k]))` for all k — "the transformation of a set (as a whole) of concatenated Primitives is equal to the concatenation of the set of individually transformed Primitives" (§Concatenation composability property, L70-73). The invariant is total: "Each and every Primitive or Count Code group of primitives MUST satisfy the Concatenation Composability property" (L73).

**Self-framing is the mechanism that makes de-concatenation possible.** A parser reads the first character (T) or byte (B), indexes a lookup table, and thereby learns exactly how many remaining characters/bytes belong to this primitive: "The self-framing property of the primitives enables de-concatenation" (L87); "This makes the Primitive self-framing" (§Examples of pre-padding, L358). There are no delimiters and no ambiguity — the type code carries the length. keripy enforces this at parse dispatch: `_exfil` reads `first = qb64b[:1]`, and routes on it — a leading `-` is a count code, `_` is an op code, anything else indexes the `Hards` table (`core/coring.py:1401-1413`).

### 3a. The 24-bit alignment rule (the arithmetic backbone)

**INVARIANT:** "all Primitives MUST be aligned on 24-bit boundaries to satisfy the Composability property" (§Conversions, L198). 24 = LCM(6, 8) — the least common multiple of Base64's 6 bits per character and a byte's 8 bits (L196). This single fact forces:

- every **B-domain** primitive length to be an integer multiple of **3 bytes** (a *triplet*);
- every **T-domain** primitive length to be an integer multiple of **4 Base64 characters** (a *quadlet*) (L198).

The **pad-size formula** is `ps = (3 - (N mod 3)) mod 3`, where `N` is the raw length in bytes (§Text Code Size, L264). The double modulo is not a stylistic flourish; it maps `0->0, 1->2, 2->1`, and "simplifying" it breaks triplet alignment (keripy-knowledge `30-invariants.md` A4). The number of leading pre-pad zero *bytes* equals the number of trailing pad *characters* for the same N (L260). Pad size then selects code size: pad 0 -> code length `4M`, pad 1 -> `4M+1`, pad 2 -> `4M+2` (§Example of pad size computation, L276-280).

The reference implementation carries this arithmetic verbatim in `Matter._infil`: for fixed-size primitives `ps = (3 - ((rs + ls) % 3)) % 3`, with an assertion that `ps == cs % 4` and that the Sizes table guarantees `cs % 4 != 3` and `fs % 4 == 0` (keripy `core/coring.py:1333-1342`). `Matter._rawSize` recovers raw length as `(((fs - cs) * 3 // 4) - ls)` — and the comment "Order of ops matters (`*3//4` before `- ls`)" is a documented landmine: reorder it and you desync (keripy `core/coring.py:891`; keripy-knowledge `30-invariants.md` A5). These are the invariants A1-A5: `fs % 4 == 0`, `cs % 4 != 3`, `(ls + rs) % 3 == 0`, `ls ∈ {0,1,2}`, and the raw-length equality (`30-invariants.md` §A).

### 3b. Mid-padding — a deliberate "never do it the other way"

Two ways exist to reach 24-bit alignment: (1) post-pad trailing `=` characters, as naive Base64 does; or (2) **pre-pad leading zero bytes to the raw before conversion** ("lead bytes"). CESR chose (2): "all CESR primitives MUST employ mid-padding as defined" (§Code characters and lead bytes, L234). The term "lead bytes" is used deliberately instead of "pad" to avoid confusion, and the count of lead bytes (pre-conversion) equals the count of pad characters (post-conversion) (L226). The consequence is that any zero padding lands in the *middle* of the primitive — after the type code, before the value — which keeps the value right-aligned and readable (§Stable value encoding, L214). keripy's `_infil` implements exactly this: it prepends `ps + ls` zero bytes, encodes, then skips the first `ps` characters so that when the full code is prepended the total length is `fs` with the pad bits sitting as zeros in the interior (keripy `core/coring.py:1349`).

**Reviewer takeaway:** the padding-and-alignment math is the *most fragile surface in the entire stack*. Because CESR is self-framing (read code -> look up length -> read bytes), a parser that predates a miscomputed size does not throw — it silently mis-frames the next primitive and desyncs the rest of the stream. keripy-knowledge names this the "Falcon-critical layer" and warns that a "simplification" of the double-modulo or the order-of-operations "breaks triplet/quadlet alignment and desyncs parsers silently" (`30-invariants.md` §A; `31-landmines.md` A4/A5 summary). Any PR touching `Matter.Sizes`, `_infil`, `_rawSize`, or `composable` is touching an external contract, not internal code.

---

## 4. Stable framing codes — the usability doctrine

Two stability invariants govern how a type code behaves as the value changes.

**Stable type coding (INVARIANT):** "The type portion of all compliant prepended Framing Codes MUST be stable in the Text domain" — "the leading characters that determine the type do not change when any other portion of the primitive changes" (§Stable type encoding, L202-206). The type comes first, consumes a fixed integral number of T-domain characters (L210), and never shares information bits with the length or value in any single T-domain character. Stability is imposed on **T, not B**, and the choice is deliberate: binary parsers handle bit-fields and shifts trivially, but text parsers only see whole characters, "another reason to impose a stability constraint on the 'T' domain type coding instead of the 'B' domain" (L208).

**Stable value coding (INVARIANT):** "the value portion of any primitive MUST be right aligned" (§Stable value encoding, L216). This makes small numbers legible — decimal `0, 1, 2` map to Base64 `A, B, C` (L214).

**Each code table is keyed by the first character:** "Each code table MUST be uniquely indicated by the first character of the type code in the 'T' domain" (§Multiple code table approach, L240). There is one integrated parse-and-convert table: read the type selector, and you know how to parse and convert the rest (L238). keripy realizes this with the `Hards`/`Bards` dictionaries of hard-code sizes keyed by the T-domain and B-domain selector respectively (keripy-knowledge `20-crosswalk.md`; keripy `core/coring.py:1406`).

---

## 5. The multiple-code-table design and crypto agility

### 5a. Why multiple tables

A single one-size-fits-all table would either waste characters on popular codes or run out of room for rare future ones. CESR resolves this with **multiple tables, each optimized differently** (§Multiple code table approach, L238). The "sweet spots" are the two cryptographic common cases: **32-byte raw** (pad 1 -> a 1-character code) and **64-byte raw** (pad 2 -> a 2-character code) — EdDSA/ECDSA keys, 256-bit digests, 512-bit signatures (§Compact fixed-size codes, L450-474). The optimized 1- and 2-character tables target these so the most common primitives carry the least framing overhead.

### 5b. Code table selectors

Of the 64 Base64 characters, only 12 are needed as table selectors, leaving 52 for single-character type codes in the default table — 13 tables total (§Code table selectors, L476-487):

- `-` = Count Code table selector (MUST).
- `_` = Op Code table selector (MUST, reserved/TBD).
- `[A-Z, a-z]` = single-character type codes (default table, 52 codes, pad size 1).
- `[0-9]` = selectors for the other 10 tables.
- "The first character of any Primitive MUST be either a selector or a 1-character code type" (L484).

### 5c. How a new algorithm claims an unused slot without desyncing old parsers

This is the crypto-agility mechanism, and it is the reason the encoding survives algorithm turnover. **The derivation/type code encodes the crypto suite**, and adding a new suite means adding a new *entry* (a previously-unused code point) in a table. Because framing is purely a function of the code -> length lookup, a parser that does not recognize the new code still frames the stream correctly for every primitive it *does* know — "The CESR derivation code enables cryptographic digest algorithm agility... Each serialization may use a different cryptographic digest algorithm as indicated by its derivation code. This provides interoperable future-proofing" (§SAID, L1186). The primer states the operational rule as three steps a non-upgraded parser follows regardless: **"Read Code -> Lookup Length -> Read Bytes"** (keri-primer §4.2, via raw/05 L155).

The load-bearing assumption here is subtle and worth flagging: an old parser frames the stream correctly *only if the new code's sizing entry does not collide with, and does not alter, the size interpretation of any code the old parser already knows*. Agility is "read code, look up length" — but the old parser looks the length up in its *own* table. A new fixed-size code in a table region the old parser treats as variable-size (or vice versa) would desync. This is why the compact-table entry policy is disciplined (Annex A, L782: first-needed-first-entered, ≥128-bit strength required) and why the reference implementation's shadow-table rule exists (§5e).

### 5d. Backward-compatibility semantics of adding codes

The spec is explicit and asymmetric (§Protocol genus/version codes, L618-622):

- "Any addition of a new code to the code table is backward-breaking in at least one direction... New implementations with the new codes can accept streams from old implementations, but old ones will break if they receive the new ones" (L618).
- **Major change** = "a code's meaning changes" -> increment MAJOR version -> breaks *both* directions (L620).
- **Minor change** = "a code is added to a table" -> increment MINOR -> breaks only new-sender->old-receiver; a new receiver still handles old streams (L622).

There is deliberately far more minor room than major (4096 minor per major), because additive extension is the common case and meaning-change is meant to be rare. This is the honest, unglamorous truth an adversarial reviewer should hold: crypto agility is *not* "any parser can read anything." It is "a new algorithm is a minor version bump that old parsers can detect and reject cleanly, and new parsers can accept both." Old-receiver + new-code = a controlled, detectable break, not a silent misread — *provided* the sizing math is correct.

### 5e. The reference-implementation trap: shadow tables

Ground truth from keripy adds a critical operational caveat the spec does not spell out. A digest/key/signature code does **not** live in only one table. Registering a new code in `MatterCodex` + `Matter.Sizes` alone makes it round-trip as a primitive but leaves it *invisible* to SAID derivation and prefix validation — it "fails late and silently" (keripy-knowledge `31-landmines.md` L5). A correct addition must also touch `Saider.Digests`, `Serder.Digests`, and the relevant `*Dex` sets (`PreDex`, `DigDex`, `SmallVrzDex`/`LargeVrzDex`); a code comment near `coring.py:460` literally says "when add new to DigCodes update Saider.Digests and Serder.Digests." As of 2.0-dev this extends to `BodyUniversalCodex` (`BUDex`) plus `Counter.BUCodes` for CESR-native body framing (`31-landmines.md` L5; `08-keripy-kb` §A9). keripy-knowledge calls getting the code-table entry and sizing math exactly right "the highest-risk surface in the flagship" (`00-lens.md` claim 8). This is the single most important sentence for a reviewer of any Falcon/PQ PR.

### 5f. Post-quantum agility in practice (partly in flux)

The Falcon (FN-DSA) work *is* the designed-in agility being exercised. FN-DSA keys and signatures use fixed-length encodings per FIPS 206: pubkeys `1AAQ` (FN-DSA-512, 897 B raw / 1200 qb64) and a 1-char code (FN-DSA-1024, 1793 B / 2392); signatures zero-padded to a fixed max, `1AAR` (FN-DSA-512, 666 B / 892) and a 1-char code (FN-DSA-1024, 1280 B / 1708); seeds `c`/`d` (both 32 B / 44) (§Post-Quantum Security, L1514). A compact AID from an FN-DSA key is formed by applying an existing digest code (e.g. `E` Blake3-256) to the pubkey — context determines meaning (L1514). **Uncertain/in-flux flag:** the spec marks post-quantum operations as an open GitHub issue (#14, L559) and notes PQ primitives are "being introduced in successive updates" — not all present. A reviewer should treat the specific PQ code assignments as provisional, while treating the *mechanism* (new entry, minor bump, disciplined sizing) as settled.

---

## 6. Sizing math and the table taxonomy

There are two major raw-primitive kinds, **fixed-length** and **variable-length**, plus count-code, genus/version, opcode, and context-specific tables (§Table types, L493-499).

### Fixed-length raw-size tables (§L503-531)

- **1-char table** (`[A-Z, a-z]`): 52 codes, pad size 1 — the 32-byte sweet spot.
- **2-char table** (selector `0`): 64 codes, pad size 2 — the 64-byte sweet spot.
- **Large fixed** (selectors `1`/`2`/`3` = 0/1/2 lead bytes): 4-char codes, 3 type characters -> `64**3 = 262,144` codes each. The selector "implicitly encodes the number of lead bytes."

### Variable-length raw-size tables (§L533-577)

Size is measured in **quadlets** (4 T-chars) / **triplets** (3 B-bytes) — the 24-bit unit. T count = size × 4 chars; B count = size × 3 bytes.

- **Small variable** (selectors `4`/`5`/`6` = 0/1/2 lead): 4-char code = selector + 1 type + 2 size chars. 64 types; size up to `64**2 - 1 = 4095` quadlets = 16,380 chars / 12,285 bytes.
- **Large variable** (selectors `7`/`8`/`9` = 0/1/2 lead): 8-char code = selector + 3 type + 4 size chars. `262,144` types; size up to `64**4 - 1 = 16,777,215` quadlets = 67,108,860 chars / 50,331,645 bytes. The first 62 entries mirror the small-variable types so a value can use the shorter 4-char code when it is small.

### Parse-part vocabulary (§L718-778)

The parser flow is: first-char selector -> hard size (`hs`) -> extract hard chars -> index the parse-size table -> get remaining sizes -> extract/convert. The same table works in the B domain (each size counted in sextets, not chars) (L720). The part labels are worth memorizing because they appear throughout keripy: `hs` hard size, `ss` soft size, `os` other size, `ms` main size (`ss - os`), `cs` code size (`hs + ss`), `vs` value size, `fs` full size (`hs + ss + vs`), `ls` lead size, `ps` pad size, `rs` raw size, `bs` binary size (`ls + rs`) (L765-778). In keripy these live in `Sizage = namedtuple("Sizage", "hs ss xs fs ls")` and `Matter.Sizes` (keripy `core/coring.py:681`; keripy-knowledge `20-crosswalk.md`). A code with `fs is None` is variable-sized (`SmallVrzDex`/`LargeVrzDex`); a fixed code has an integer `fs` and satisfies `fs % 4 == 0` (keripy `core/coring.py:888, 997-999`).

**Special-value codes.** Some fixed-size codes carry their value *inside* the code's soft/size part (compact tags and versions); the raw part MAY be empty (§L660). keripy models this as `_special`: a code is special when `fs is not None and ss > 0` (keripy `core/coring.py:934-945`; invariant A6: special soft implies fixed size).

---

## 7. Count / group framing codes (grouping and pipelining)

**Count Codes (a.k.a. Group Codes) count quadlets/triplets in a group — never primitives.** "always counts the number of quadlets/triplets in the group not the number of primitives" (§Count Code tables, L591). This is a recurring correction: reviewers reach for "number of items," but the count is in 24-bit units precisely so the group can be skipped without parsing its contents. Count codes enable pipelining (multiplex/demultiplex), core-affinity offloading, and hierarchical group-of-groups composition (§Count or Group Framing Codes, L362; §Composability, L7).

A count code is itself a composable primitive with **no raw value, only its text code**; pad size is always 0, and its length is a multiple of 4 chars / 3 bytes (L364, L591). keripy encodes this as invariant A7: for counters `hs + ss == fs` always — count codes carry no padding, and the soft encodes the quadlet/triplet count via `intToB64` (`30-invariants.md` A7; keripy `core/counting.py:Counter`).

**Domain-invariant count (INVARIANT):** because the count is in quadlets/triplets (both 24 bits), "the count value is invariant between 'T' and 'B' Domains... MUST be the number of Quadlets in the 'T' domain and the number of Triplets in the 'B' domain" (L581). This lets a parser "extract the number of characters/bytes in a group from the Stream without parsing the group's contents; it is therefore pipeline-able" (L583). "Each element in content of a Count Code group MUST be aligned on a 24-bit boundary. Thus the only elements allowed in the contents of a Count Code group are other primitives or groups" (L591).

Nested selectors: the first selector is always `-`. The second character being a letter `[A-Z, a-z]` means a single-char count code (52 total); a numeral, `-`, or `_` selects a secondary table (L594). The **small count table** is `-` + type letter + 2 size chars = 4 chars, counting 0-4095 (§Small Count Code table, L599). The **large count table** is `--` + 1 type + 5 size chars = 8 chars, 64 types, counting 0 to `64**5 - 1 = 1,073,741,823` — groups up to ~4.29e9 chars / 3.22e9 bytes (§Large Count Code table, L605).

In keripy these *are* the attachment doctrine: `-A` ControllerIdxSigs, `-B` WitnessIdxSigs, `-C` NonTransReceiptCouples, `-D`/`-N` TransReceiptIdxSigGroups, `-E` FirstSeenReplayCouples, `-F` TransIdxSigGroups, `-G` SealSourceCouples (the anchoring couple), `-I` SealSourceTriples, `-L` PathedMaterialQuadlets, `-Z` ESSRPayloadGroup — everything quadlet-aligned (keripy `core/counting.py:58-78`; raw/09 §8). The counter codes differ across `Vrsn_1_0` and `Vrsn_2_0` (`CounterCodex_1_0`/`_2_0`), which is exactly why the genus/version code (§8) has to precede them.

---

## 8. The protocol genus/version code — versioning the tables themselves

This is the piece outsiders most often miss: there is a code whose job is not to carry data or count anything, but to **switch which code tables the parser uses**. "A protocol genus and version code itself MUST NOT provide a count of the following Quadlets or triplets but MUST modify the protocol genus and Version of all the following Count Codes" (§Protocol genus/version table, L609).

**Format `-_GGGVVV`** (8 chars): `-_` selector, `GGG` = 3-char genus (`262,144` possible genera), `VVV` = version where the first `V` is major and the last two are minor. `CAA` = 2.00, `CAQ` = 2.16; up to 64 majors × 4096 minors (§Protocol genus/version codes, L615). The KERI/ACDC genus codes are `-_AAABAA` (v1.00) and `-_AAACAA` (v2.00) (L865-866).

**Purpose is twofold** (L611): (1) it lets one CESR encoding serve different protocols/stacks, each with its own code tables; (2) it versions the tables for a given protocol. "The only table that all protocols MUST share (i.e., has identical values) is the protocol genus and version table" — all small/large count tables must share the *universal* count codes, but everything else MAY vary by protocol.

**Scope/override rule (INVARIANT).** A genus/version code applies to the following count codes at top level *until another genus/version code appears*, or inside a special enclosing count-code group. Only three universal *overrideable* enclosing count codes permit an embedded genus/version override (L609). And the override fires only in the right position: "the parser MUST only treat the genus/version count code, especially as an override, when it appears as the first count code within the framed material of an overrideable universal count code. Otherwise, there MUST be no special override meaning" (§Universal genus/version override, L816). Inside a *list* (universal but non-overrideable), a genus/version code as the first element has no override semantics (L818). keripy carries the genus/version awareness in `GenusCodex`/`GenDex` mapping genera to code tables (keripy `core/counting.py:24-44`; raw/09 §8).

**Reviewer takeaway:** the genus/version code is the crypto-agility and multi-protocol mechanism made explicit at the *table* level, above the per-code mechanism of §5. A new protocol or a table revision is not a new magic byte scattered through the stream — it is a single genus/version primitive whose scope is well-defined and whose override positions are tightly constrained. Ambiguity here is a downgrade/confusion surface, which is why the override position is normatively pinned.

---

## 9. Version strings — framing the interleaved non-native serializations

CESR must interleave with three non-native serializations, and here the framing device is not a count code but a **Version String**.

**A CESR parser MUST support three interleaved non-CESR serializations: JSON, CBOR, MGPK** (§Performant resynchronization, L388). For those, the framing device is a Version String as the **first field, label `v` (lowercase)** — the regex target that yields serialization type and total size (§Version String field, L1131, L1135).

**v2 format `PPPPMmmGggKKKKBBBB.`** — 19 chars, five parts (L1137): `PPPP` protocol (`KERI`, `ACDC`), `Mmm` protocol major/minor (base-64 numeric), `Ggg` CESR genus-table version, `KKKK` serialization kind (`JSON`|`CBOR`|`MGPK`|`CESR`), `BBBB` total length in Base64 (inclusive), then a `.` terminator. Max size `64**4 = 16,777,216` chars; larger payloads chain via SAIDs (L1156). The terminator's purpose is forward-compatibility: it lets a future version change the version-string size while keeping the field regex-extractable (L1158). Note the subtlety flagged in the spec: `Mmm`/`Ggg`/`BBBB` are "base-64 *numerical* notation" — a positionally-weighted base-64 number where `A`=0 and `_`=63 — *not* "a string encoded in Base64" (L1152). Mis-reading that is a parsing bug.

**v1 legacy `PPPPvvKKKKllllll_`** — 17 chars: `vv` two-char hex major/minor, `llllll` length in lowercase hex, `_` terminator. v2 implementations MUST support v1 to verify 1.XX events (§Legacy Version 1.XX, L1164-1180).

keripy makes all of this concrete. The regexes are `VER2FULLSPAN = 19` / `VER1FULLSPAN = 17`, with `VEREX2` matching `[A-Z]{4}` protocol + version + `[A-Z]{4}` kind + size + `.` terminator, and `VEREX = VEREX2 | VEREX1` compiled into `Rever` (keripy `kering.py:39-61`). The combined regex is *why* a single parser can sniff either version — it tries v2 first, falls back to v1.

**CESR-native field maps carry no embedded version string.** They use `-G##`/`--G#####` count codes for map-ness and size; the unique start bits (§10) mean no regex version string is needed. A native map instead has a *protocol version field* (protocol + version, not size/kind). In memory an implementation may inject a placeholder `v` with kind `CESR` so re-serialization knows to emit native CESR, but "there is no normative indication that the in-memory object was deserialized from a CESR native field map" (L1154). This is a real gotcha for round-trip fidelity across implementations.

---

## 10. Streaming, cold start, and the eight tritets

**The cold-start problem:** after a cold start, a parser looks for framing info; ambiguity leads to confusion and a forced re-cold-start (TCP: close/reopen; UDP: ack/nack). "Good cold start re-synchronization is essential to robust performant Stream processing" — the goal is to resync by skipping to the next well-defined boundary, not by flushing buffers (§Cold start Stream parsing problem, L380-384).

The solution is a **BOM-analogue on the first three bits of the first byte**. The start bits for text-CESR, binary-CESR, JSON, CBOR, and MGPK "MUST be mutually distinct" (§Performant resynchronization, L390), giving a UTF-BOM-like ability to tell text vs binary domain from the first tritet. The eight cases (§Top-level Stream Starting Tritets, L411-420):

- `0b000` — Annotated 'T' domain (whitespace LF/CR/tab all start `000`)
- `0b001` — CESR 'T' Count Code — char `-`
- `0b010` — CESR 'T' Op Code — char `_`
- `0b011` — JSON — `{` (0x7b)
- `0b100` — MGPK FixMap
- `0b101` — CBOR Map (Major Type 5)
- `0b110` — MGPK Map16/Map32
- `0b111` — CESR 'B' domain Count Code or Op Code

The assignment is not arbitrary: JSON/CBOR/MGPK map objects consume tritets `011,100,101,110`, leaving `000,001,010,111` free; Base64 `-` (0x2d, tritet `001`) and `_` (0x5f, tritet `010`) fit the free T-domain slots, and their binary forms (positions 62/63) land at `0b111` to mark the B domain (L392-404). **INVARIANT:** "Each Stream MUST start (restart) with one of eight cases" (§Stream parsing rules, L427).

The reference implementation is a near-verbatim mirror. `ColdCodex` enumerates exactly these eight: `AnB64=0o0, CtB64=0o1, OpB64=0o2, JSON=0o3, MGPK1=0o4, CBOR=0o5, MGPK2=0o6, CtOpB2=0o7`, and `sniff(ims)` computes `tritet = ims[0] >> 5` and dispatches to `msg`/`txt`/`bny`/`ano` status (keripy `kering.py:240-325`). The docstring even carries the worked example `bytearray([0x2d, 0x5f])[0] >> 5 == 0o1`.

**The parse formula.** Examine the first tritet -> select one of the eight. If a count code, the rest of the code carries what is needed to parse the group. If JSON/CBOR/MGPK, "the mapping's first field MUST be a Version String" providing type and length for regex extraction (L438). The spec calls this "an extremely compact and elegant Stream parsing formula" (L442).

**Interleaving rule (INVARIANT):** non-native serializations may be interleaved with native CESR **only at the top level** of a stream. "This is NOT true for non-native serializations nested inside CESR groups." When nested, "a non-native CESR serializations MUST be encoded as a CESR primitive and then enclosed in a special count code for non-native messages" (§Interleaved non-CESR serializations, L374-376). Nesting raw JSON inside a count-code group without wrapping it is a wire defect.

---

## 11. SAID — the content-address that lives inside its own content

SAIDs are where CESR's encoding contract meets KERI's integrity model, and the interaction is load-bearing enough to restate here in wire terms (fuller treatment belongs to the SAID/integrity section).

A **SAID (Self-Addressing Identifier)** is "a special type of content-addressable identifier based on an encoded cryptographic digest that is self-referential" — embedded *inside* the very serialization it identifies (§SAID, L1184). A naive content-address cannot be self-referential (putting a digest inside the thing you are digesting changes the digest), which is why SAID uses a **dummy-fill derivation**: copy the SAID out, replace the field with dummy `#` characters (ASCII 0x23, chosen because it is *not* a valid Base64 char) sized to the exact full digest length, compute the digest of the dummied serialization using the algorithm named by the code, CESR-encode it to the same total length, and compare (§Generation and Verification Protocols, L1200-1206). Because the encoded digest is the same length as the dummy fill, the surrounding byte offsets never move — the wire framing is preserved. keripy implements this in `Saider._derive`/`verify`: `sad[label] = Dummy * Matter.Sizes[code].fs`, digest, inject back, and on verify re-derive and compare `qb64b`, failing closed on any exception (keripy `core/coring.py:4058-4160`; `Dummy = "#"` "must not be a valid Base64 char," `coring.py:3949`).

Two points matter for the wire contract specifically:

- **A SAID MUST be a CESR primitive** with a prepended derivation code (L1186, L1192) — so digest agility (§5) applies to content addresses directly. Change the digest algorithm, change the code, keep the framing.
- **Field ordering is insertion order, not lexicographic.** "The crucial consideration in SAID generation is reproducibility. This requires the ordering and sizing of fields in the serialization to be fixed" (L1246), and "The natural canonical ordering for such mappings is insertion order" (§Order-Preserving Data Structures, L1250). This is a *pointed rejection* of JCS-style lexicographic canonicalization: lexicographic ordering "appears un-natural" and forces "oddly-labeled fields... merely to ensure that the lexicographic ordering matches a given logical ordering" (L1250-1252). Modern languages preserve insertion order natively (Python 3.6+ dict, JS ES6 Map), so "there is no need for any canonical serialization but natural insertion order" (L1256). An outsider who assumes KERI canonicalizes like JOSE/JWS is wrong at the wire level, and a re-ordering "cleanup" silently changes every SAID.

---

## 12. Why the encoding is an external interop contract — and the highest-risk surfaces

The through-line of this section is that **CESR is a contract with other implementations, and keripy's tests do not test that contract** — they test keripy. keria, signify-ts, and any conforming stack must agree byte-for-byte on: code-table entries and sizing, field names and order, SAID derivation, version strings, and count codes. "A change that passes keripy's own tests but diverges from the spec/wire format is a defect, because it silently breaks interop... CESR code-table entries and sizing, field names and order, SAID derivation, version strings, count codes are external contracts" (keripy-knowledge `00-lens.md` claim 5).

The ranked list of **desync/downgrade surfaces** an adversarial reviewer should probe first:

1. **Sizing arithmetic in the primitive tables** (`Matter.Sizes`, `_infil`, `_rawSize`, `composable`). The double-modulo pad formula, the `cs % 4 != 3` and `fs % 4 == 0` invariants, and the `*3//4`-before-`-ls` order of operations. A wrong entry desyncs every downstream primitive silently because the format is self-framing. keripy-knowledge calls this "the highest-risk surface in the flagship" (`00-lens.md` claim 8; `30-invariants.md` §A; keripy `core/coring.py:880-1356`).
2. **Shadow-table completeness when adding a code.** Registering only in `MatterCodex` + `Sizes` round-trips as a primitive but is invisible to SAID/prefix validation and fails late/silently. Must also touch `Saider.Digests`, `Serder.Digests`, the `*Dex` sets, and (2.0) `BUDex`/`Counter.BUCodes` (keripy-knowledge `31-landmines.md` L5).
3. **The genus/version override position.** The override fires only as the first count code inside an overrideable universal count code; anywhere else it has no special meaning (CESR §Universal genus/version override, L816-818). A parser that honors it elsewhere, or a producer that emits it in the wrong position, creates a table-selection confusion — a downgrade vector.
4. **Version-string parsing, base-64-number vs base64-string.** `Mmm`/`Ggg`/`BBBB` are positionally-weighted base-64 *numbers*, not Base64-encoded strings (CESR §L1152); the `.`/`_` terminators and the 19-vs-17 span disambiguate v2 from v1 (keripy `kering.py:39-61`). A lenient or wrong regex reads the wrong length and mis-frames the message.
5. **Cold-start tritet handling.** All eight starting cases must be distinguished on the first three bits; a parser that mishandles the annotated (`000`) or B-domain (`111`) case, or that does not treat interleaving as top-level-only, cannot resynchronize (CESR §L411-427; keripy `kering.py:240-325`).
6. **Additive-code direction asymmetry (downgrade honesty).** A new code is a *minor* bump: new receivers accept old streams, old receivers *break cleanly* on the new code — a detectable rejection, not a silent misread (CESR §L618-622). A design that tries to make old parsers silently *accept* an unknown new code is smuggling a downgrade; the correct behavior is a clean version-gated reject.
7. **Indexed-signature code switch at index ≥ 63.** A group with more than 63 keys switches the `Siger` encoding (`Ed25519_Crt_Sig` -> `Ed25519_Big_Crt_Sig`); consumers that do not handle the "big" indexed codes will reject (keripy-knowledge `31-landmines.md` L14). A latent interop cliff for large multisig.

**What is well-established vs. contested.** Well-established and enforced in both spec and code: composability, the 24-bit alignment math, mid-padding, stable framing, count-codes-count-quadlets, the genus/version format and scope, the version-string formats, and the eight-tritet cold start. Uncertain or in-flux: the Op Code table is explicitly reserved/TBD (`_` selector, CESR L628, L948) — a whole stream-processing capability is gestured at but unspecified; the post-quantum code assignments are "being introduced in successive updates" with an open issue (#14, L559); and several large-variable/context tables are structurally defined but not exhaustively populated (raw/02 §Gaps). Minor source typos noted but non-doctrinal: the `6A` table text says "pad size of 0" while its header says 2 lead bytes (L553), and a `-S#####` large code is missing a leading `-` (L926) — both read as source typos, not design intent (raw/02 §Gaps).

**Load-bearing assumption to flag explicitly:** the crypto-agility guarantee ("old parsers frame the stream correctly around a code they do not know") holds *only* because sizing is a pure function of the code and because a new code occupies a genuinely unused slot whose size-class the old parser does not otherwise depend on. It is not an unconditional "any parser reads any stream" promise; it is "a disciplined additive extension that old parsers reject cleanly and new parsers accept," resting entirely on the sizing math being exactly right (CESR §L618-622; keripy-knowledge `00-lens.md` claim 8). That single dependency is why the sizing tables sit at the top of the risk list.

---

## 13. Summary for the adversarial reviewer

CESR earns its complexity. Every construct maps to a concrete requirement: composability -> lossless en-masse T<->B conversion; 24-bit alignment -> the LCM of Base64 and byte widths; mid-padding -> readable right-aligned values with no `=`; stable framing -> parseability by whole-character text parsers; count codes -> pipelining without content parsing; genus/version codes -> multi-protocol and table versioning; version strings -> framing the three interleaved non-native serializations; the eight tritets -> deterministic cold-start resynchronization; derivation codes -> crypto agility. The corrections to outsider priors are sharp and defensible: it is *not* naive Base64 (no `=`, true two-way composability), *not* lexicographically canonicalized (insertion order, a deliberate rejection of JCS), *not* a place to nest raw JSON inside groups (top-level interleaving only), and *not* a system where "more crypto strength" is better (128-bit floor, weak suites excluded). The one place a reviewer should push hardest is the sizing math and its shadow tables, because that is where a well-intentioned "simplification" desyncs the entire network silently while keripy's own tests stay green — the definition of a wire-interop defect (keripy-knowledge `30-invariants.md` §A; `00-lens.md` claim 5).
