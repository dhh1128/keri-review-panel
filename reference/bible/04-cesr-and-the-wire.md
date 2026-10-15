# 04 — CESR and the Wire {#cesr-wire}

## Thesis {#thesis}

CESR (Composable Event Streaming Representation) is the external interop contract that makes the stack verifiable, not a serialization convenience. Its defining property is text-binary concatenation composability: any set of self-framing primitives concatenated in the text domain converts en masse to binary and back with no loss and no re-parsing (CESR spec > Composability, L5). The rest follows from that property and one arithmetic fact, that 24 is the least common multiple of Base64's 6 bits per character and a byte's 8 bits (CESR spec > Conversions, L196): the sizing math, the code-table taxonomy, count codes, version strings, the cold-start tritets, and the mechanism by which a new algorithm claims an unused code. Treating CESR as Base64 with type tags, reaching for `=` padding or lexicographic canonicalization, or simplifying the encoding as an implementation detail are wire-interop defects that keripy's own tests will not catch, because the contract is with every other implementation (00-lens.md, claim 5).

## Status {#status}

Unmarked claims are [spec], meaning CESR's `main` at `bad6edd84`. The post-quantum code table is [spec-next] on `v1.1` at `65fd7518b`, and an open, unmerged pull request proposes to revert it from that branch ([section 5.7](#pq-in-practice)).

## 1. What CESR fundamentally is, and the priors it corrects {#what-cesr-is}

CESR is a dual text-binary encoding whose unique property is concatenation composability (CESR spec > SAD Path Signatures, L1390). Three outsider priors are wrong.

It is not crypto-only: "The CESR protocol... is not limited to merely encoding Cryptographic Primitives but any primary data type (numbers, text, datetimes, lists, maps) may be encoded in a composable way" (CESR spec > Abstract Domain representations, L11).

It is not naive Base64. Standard Base64 pads each conversion separately, which gives only one-way composability: convert a concatenation of raw values and bits from adjacent primitives land in one character, destroying the boundaries (CESR spec > Text Code Size, L184, L252). CESR forbids the `=` pad character "because all CESR-encoded Primitives are composable" (CESR spec > Concrete Domain representations, L93).

The encoding is an external contract, and compliance is normative: "All compliant encoded Primitives MUST be Composable. All compliant encoded Primitives MUST be self-framing" (CESR spec > Composability, L5).

The design aesthetic is minimally sufficient strength: "there is minimally sufficient cryptographic strength and more cryptographic strength just wastes computation and bandwidth" (CESR spec > Compact fixed-size codes, L446), with a 128-bit floor (CESR spec > Annex A > Code table entry policy, L783). The text domain is primary: "A primary design goal of CESR is to select an encoding approach that provides high usability, readability, or human friendliness in the 'T' domain... The 'B' domain's purpose is merely to provide convenient compactness at scale" (CESR spec > Stable Framing Codes, L202). The genus/version mechanism ([section 8](#genus-version)) lets one encoding serve KERI, ACDC, TSP and other protocols.

## 2. The three domains and the six transformations {#three-domains}

A primitive has three representations (CESR spec > Abstract Domain representations, L11): text 'T' (streamable Base64), binary 'B' (streamable binary), and raw 'R', the non-streamable pair `(code, raw)` where cryptography happens. Composability is a property of T and B. There are six transformations, one per ordered pair, and full circuits such as `R -> T(R) -> T -> B(T) -> B -> R(B) -> R` (CESR spec > Transformations between Domains, L17-31, L40).

`T(B)` and `B(T)` are plain Base64 encode and decode, so "CESR Primitives are compatible with existing Base64 (RFC-4648) tooling"; only R↔T and R↔B need new code (CESR spec > Text Code Size, L266). [code] keripy makes the contract executable: a primitive is `composable` iff `len(qb64b) % 4 == 0 and len(qb2) % 3 == 0 and encodeB64(qb2) == qb64b and decodeB64(qb64b) == qb2` (keripy core/coring.py, L1239-1247 @`b8f60166b`).

## 3. Composability — the core invariant and the 24-bit backbone {#composability}

"An encoding has Composability when any set of Self-Framing concatenated Primitives expressed in either the Text domain or Binary domain may be converted as a group to the other Domain and back again without loss" (CESR spec > Composability, L5). Formally `T(cat(b[k])) = cat(T(b[k]))` and `B(cat(t[k])) = cat(B(t[k]))`, and the invariant is total: "Each and every Primitive or Count Code group of primitives MUST satisfy the Concatenation Composability property" (CESR spec > Concatenation composability property, L73).

Self-framing makes de-concatenation possible. A parser reads the first character or byte, indexes a table, and learns how many characters or bytes belong to the primitive: "The self-framing property of the primitives enables de-concatenation" (L87). There are no delimiters; the type code carries the length. [code] keripy dispatches on the first character: a leading `-` is a count code, `_` an op code, anything else indexes the `Hards` table (keripy core/coring.py, L1350-1362 @`b8f60166b`).

### 3.1 The 24-bit alignment rule (the arithmetic backbone) {#alignment}

"all Primitives MUST be aligned on 24-bit boundaries to satisfy the Composability property" (CESR spec > Conversions, L198). So every B-domain primitive is a multiple of 3 bytes and every T-domain primitive a multiple of 4 characters. The pad size is `ps = (3 - (N mod 3)) mod 3` for raw length `N` (CESR spec > Text Code Size, L264); the double modulo maps `0->0, 1->2, 2->1`, and simplifying it breaks triplet alignment (30-invariants.md, A4). Pad size selects code size: pad 0 takes a code of length `4M`, pad 1 `4M+1`, pad 2 `4M+2` (CESR spec > Example of pad size computation, L276-280).

[code] keripy carries the arithmetic verbatim. `Matter._infil` computes `ps = (3 - ((rs + ls) % 3)) % 3` and raises when `ps != (cs % 4)`, and `Matter._rawSize` recovers raw length as `(((fs - cs) * 3 // 4) - ls)` (keripy core/coring.py, L866-867, L1284-1290 @`b8f60166b`). The order of operations in that expression is load-bearing — the warning is the knowledge base's, not a source comment: "Order of ops matters (`*3//4` before `- ls`)" (30-invariants.md, A5). The invariants are `fs % 4 == 0`, `cs % 4 != 3`, `(ls + rs) % 3 == 0`, `ls ∈ {0,1,2}`, and the raw-length equality (30-invariants.md > A).

### 3.2 Mid-padding — a deliberate "never do it the other way" {#mid-padding}

Alignment can come from trailing `=` characters, as in Base64, or from leading zero bytes prepended to the raw value. CESR chose the second: "all CESR primitives MUST employ mid-padding as defined" (CESR spec > Code characters and lead bytes, L234). The lead bytes equal in number the pad characters they replace (L226), and the zeros land between the type code and the value, which stays right-aligned and readable (CESR spec > Stable value encoding, L214). [code] keripy's `_infil` encodes `bytes([0] * (ps + ls)) + raw` and drops the first `ps` characters (keripy core/coring.py, L1301 @`b8f60166b`).

This is the most fragile surface in the stack. A parser does not throw on a miscomputed size; it mis-frames the next primitive: "Get the sizing math wrong and a parser that predates your code desyncs the entire stream — silently, because CESR is self-framing" (30-invariants.md > A, L31-32).

## 4. Stable framing codes — the usability doctrine {#stable-framing}

"The type portion of all compliant prepended Framing Codes MUST be stable in the Text domain" — "the leading characters that determine the type do not change when any other portion of the primitive changes" (CESR spec > Stable type encoding, L202-206). The type consumes a fixed whole number of characters and never shares a character with length or value. Stability is imposed on T rather than B because text parsers see only whole characters (L208). And "the value portion of any primitive MUST be right aligned" (CESR spec > Stable value encoding, L216), so small numbers stay legible.

"Each code table MUST be uniquely indicated by the first character of the type code in the 'T' domain" (CESR spec > Multiple code table approach, L240): read the selector and you know how to parse the rest. [code] keripy keys its `Hards` and `Bards` size tables by the T-domain and B-domain selector (keripy core/coring.py, L1350-1355 @`b8f60166b`).

## 5. The multiple-code-table design and crypto agility {#code-tables}

### 5.1 Why multiple tables {#why-multiple-tables}

One table would either waste characters on common codes or run out of room for rare ones (CESR spec > Multiple code table approach, L238). The compact tables target the cryptographic sweet spots, 32-byte raw values (pad 1, a one-character code) and 64-byte ones (pad 2, a two-character code), which cover EdDSA and ECDSA keys, 256-bit digests and 512-bit signatures (CESR spec > Compact fixed-size codes, L450-474).

### 5.2 Code table selectors {#table-selectors}

Of 64 Base64 characters, 12 are selectors, leaving 52 one-character type codes in the default table, 13 tables in all (CESR spec > Code table selectors, L476-487): `-` selects count codes, `_` op codes (reserved), `[A-Z, a-z]` are one-character codes with pad size 1, and `[0-9]` select the other ten tables. "The first character of any Primitive MUST be either a selector or a 1-character code type" (L484).

### 5.3 How a new algorithm claims an unused slot, and what an old parser does with it {#unused-slot-agility}

The derivation code names the suite, and a new suite takes a previously unused code: "The CESR derivation code enables cryptographic digest algorithm agility... Each serialization may use a different cryptographic digest algorithm as indicated by its derivation code. This provides interoperable future-proofing" (CESR spec > SAID, L1180).

Every code announces its own length, because the selectors "select a given code table and indicate the number of remaining characters in the text code" (CESR spec > Code table selectors, L484). Only a variable-size code also announces its value's length: in the small variable tables (`4`, `5`, `6`) "the last two characters provide the size of the value as a Base64 encoded integer" (CESR spec > Table types > Small variable-length raw-size tables, L539), and in the large ones (`7`, `8`, `9`) the last four do. The fixed-size tables (one-character codes and selectors `0` to `3`) carry no size characters, so a value's length is known only to a parser whose table lists the type. An unknown variable-size code is skippable in principle; an unknown fixed-size code is not, because the old parser cannot find the next primitive. The specification says the same: "old ones will break if they receive the new ones" (CESR spec > Protocol genus/version codes, L618).

[code] keripy skips neither. `Matter._exfil` raises `UnexpectedCodeError(f"Unsupported code ={hard}.")` on any unknown hard code, variable-size included (keripy core/coring.py, Matter._exfil, L1375 @`80f77b73b`). Inside a counted group the parser drops that group, because "processOneIter already flushed group so do not flush stream" (keripy core/parsing.py, Parser.allParsator, L532-537 @`80f77b73b`); with no enclosing count it runs `del ims[:]  # delete rest of stream to force cold restart` (L539-544). Either way the old receiver loses data it cannot read and does not misread it. Nothing in the specification requires skipping variable-size codes.

A new code is safe only if it takes an unused slot and its sizing entry changes nothing an existing parser knows, hence the entry policy (CESR spec > Annex A > Code table entry policy, L783) and the shadow-table rule ([section 5.5](#shadow-tables)).

### 5.4 Backward-compatibility semantics of adding codes {#backward-compatibility}

The specification is asymmetric (CESR spec > Protocol genus/version codes, L618-622):

- "Any addition of a new code to the code table is backward-breaking in at least one direction... New implementations with the new codes can accept streams from old implementations, but old ones will break if they receive the new ones" (L618).
- A changed meaning is a MAJOR version increment and breaks both directions (L620).
- An added code is a MINOR increment and breaks only a new sender to an old receiver (L622).

There are 4,096 minor versions per major, because additive extension is the common case. Crypto agility is therefore not that any parser reads any stream: a new algorithm is a minor bump that old parsers reject detectably and new parsers accept alongside old streams, provided the sizing math is right.

### 5.5 The reference-implementation trap: shadow tables {#shadow-tables}

A digest, key or signature code lives in several keripy tables. Registered only in `MatterCodex` and `Matter.Sizes`, it round-trips as a primitive but is invisible to SAID derivation and prefix validation, and "fails late and silently" (31-landmines.md, landmine L5). A correct addition also touches `Saider.Digests`, `Serder.Digests` and the relevant `*Dex` sets (`PreDex`, `DigDex`, `SmallVrzDex`/`LargeVrzDex`), and on the 2.0 line `BUDex` and `Counter.BUCodes`. [code] The source says so: "# When add new to DigCodes update Saider.Digests and Serder.Digests class attr" (keripy core/coring.py, L444 @`b8f60166b`).

The knowledge base writes this as advice about a pending Falcon change, and there is none: [code] keripy at `b8f60166b` has no post-quantum code of any kind, a search of `src/keri` for FN-DSA, ML-DSA, SLH-DSA, Dilithium, Falcon, SPHINCS, Kyber and ML-KEM finding only the `falcon` web framework. Its own plan defers the work: "**Prereq:** resolve the two conflicting Falcon spec docs first" (PLAN.md > 7 effort table, L170). The rule is right for whoever writes the first one, and for any new code.

### 5.6 Two allocation rules that turn taste into normative constraint [spec-next] {#allocation-rules}

`v1.1` at `65fd7518b` adds placement rules with no counterpart on `main` (CESR spec > Code table entry policy, L785-791).

The compact tables are scarce: 52 one-character and 64 two-character codes, against 262,144 in each four-character table. Entries there "MUST be reserved for Primitives whose raw size is small enough that a longer code would materially increase the size of the encoded Primitive", so "Post-quantum codes MUST therefore be placed in the four-character fixed tables given by the `1`, `2`, and `3` selectors" (L785).

Which four-character table is arithmetic: "Which of the three four-character fixed tables a given Primitive occupies is not a matter of choice. It is determined by the raw size of the Primitive modulo 3" (L787). A selector encodes lead-byte alignment, not algorithm semantics, and "the Primitives belonging to a single algorithm are commonly distributed across more than one table" (L787): an Ed25519 key is `D`, its signature `0B`. Inferring an algorithm family or security level from a selector reads length arithmetic as taxonomy.

Parameter-set admission is restrictive: "Admitting every variant of an algorithm invites the use of variants that have received little implementation scrutiny" (L791). Only the six SLH-DSA `s` sets get entries, the fast `f` variants being "the wrong trade for a protocol whose signatures are transmitted and archived far more often than they are generated" (L791), which is the specification's reasoning about KERI's traffic and less obviously true for a high-frequency signer.

#### Too much agility is itself a defect {#goldilocks-agility}

The editor's reasons, in the pull request that added the table, are [proposal]. A fixed code chosen by raw size modulo 3 wastes little: "So at worst case there is never more than 2 bytes of overhead no matter the length of the primitive." (CESR spec GitHub > #165, comment of 2026-03-18, R-017, https://github.com/trustoverip/kswg-cesr-specification/pull/165#issuecomment-4085555336), and the fixed code doubles as the dispatch key. Agility has a limit: "There is a saying in crypto. Too much agility is a bad thing. There is a goldilocks amount of agility." (CESR spec GitHub > #165, comment of 2026-03-19, R-018, https://github.com/trustoverip/kswg-cesr-specification/pull/165#issuecomment-4086516133). He preferred fixed-length Falcon signatures because squeezing out bytes "opens the vulnerability for timing attacks and makes downstream uses of the signatures more difficult". And a code names an encoding, never a use: "The CESR code defines the encoding not the usage semantics." (CESR spec GitHub > #165, comment of 2026-03-19, R-019, https://github.com/trustoverip/kswg-cesr-specification/pull/165#issuecomment-4087093269), the one exception being transferable and non-transferable key codes for AIDs. A reviewer arguing that CESR should encode every parameter set, or give a digest a code for its role, is arguing against the editor.

### 5.7 Post-quantum agility in practice — what is actually where {#pq-in-practice}

On the standardizing line there are no post-quantum codes. At `main` `bad6edd84` the specification has no FN-DSA, ML-DSA, SLH-DSA, ML-KEM or FIPS text; Falcon appears once, as a candidate: "Falcon appears to be among the leading candidates with open-source code already available" (CESR spec > Code table entry policy, L783). Its post-quantum story is the pre-rotation hash firewall ([section 11](#said)). Older drafts circulate FN-DSA assignments (`1AAQ`, `1AAR`, and one-character `b`, `c`, `d`, `e`) cited to a Post-Quantum Security section; that text exists only in commit `d35125e61`, reachable from no ref in the repository, and was never on either branch.

[spec-next] `v1.1` at `65fd7518b` adds about 33 primitives for FN-DSA (FIPS 206), ML-DSA (FIPS 204) and SLH-DSA (FIPS 205) in the `1`, `2` and `3` tables. It stacks them on the firewall: "The two mechanisms are complementary, not alternatives; pre-rotation continues to provide defense in depth for whichever signature scheme is in use" (CESR spec > Post-Quantum Cryptographic Primitives, L1553). Every signature code is fixed-size: "Every post-quantum signature code defined in this specification encodes a signature of fixed raw size" (L1555), partly because "A variable-length encoding obliges the parser to consult a length field rather than the code alone" (L1555). The one-character codes `b` to `e` stay unassigned and the allocation rule forbids post-quantum codes there; FN-DSA-1024 keys and signatures and FN-DSA seeds sit at `2AAA` to `2AAD`, while FN-DSA-512 keys and signatures, whose raw sizes are ≡ 0 mod 3, sit at `1AAQ` and `1AAR` (`v1.1` L1021-1022, L1036-1039).

Two absences matter. There is no ML-KEM code: "ML-KEM is a key-encapsulation mechanism rather than a signature scheme; codes for it are not defined here and are left to a later version" (CESR spec v1.1 > Code table entry policy, L789), so CESR has no post-quantum encryption primitive at either pin. And there is no post-quantum indexed signature code ([section 12](#interop-risks), item 7). The placeholder issue #14 for post-quantum operations stands at L559 on both branches.

No shipped implementation carries the table. [code] keripy at `b8f60166b` and signify-ts at `ffba8406e` have no post-quantum codes. The only implementation is an unmerged personal fork, `dhh1128/signify-ts` branch `feat/cesr-pq-codes` at `4ed767b49`, which is [proposal]. It is still the best evidence for [section 5.3](#unused-slot-agility): its parser sizes by table lookup on the code alone — `const sizage = sizes.get(head.slice(0, hs));` (signify-ts fork src/keri/core/parsing.ts, L256 @`4ed767b49`) — and adding all 33 rows needed no parser change.

Pull request trustoverip/kswg-cesr-specification#178, open, unmerged, unreviewed and with no stated reason, proposes to revert the table from `v1.1`. The [spec-next] markers stand, but the table is contested on its own branch. Treat the mechanism as settled and demonstrated, and the codes as forward-branch text that nothing shipped implements.

## 6. Sizing math and the table taxonomy {#sizing-taxonomy}

Raw primitives are fixed-length or variable-length; there are also count-code, genus/version, op-code and context tables (CESR spec > Table types, L493-499).

### 6.1 Fixed-length raw-size tables (CESR spec, L503-531) {#fixed-size-tables}

- One-character table (`[A-Z, a-z]`): 52 codes, pad size 1, the 32-byte sweet spot.
- Two-character table (selector `0`): 64 codes, pad size 2, the 64-byte sweet spot.
- Large fixed tables (selectors `1`/`2`/`3` for 0, 1 or 2 lead bytes): four-character codes, `64**3 = 262,144` each; the selector "implicitly encodes the number of lead bytes."

### 6.2 Variable-length raw-size tables (CESR spec, L533-577) {#variable-size-tables}

Size counts quadlets (four characters) or triplets (three bytes).

- Small variable (selectors `4`/`5`/`6`): a four-character code of selector, type and two size characters; 64 types, up to 4,095 quadlets.
- Large variable (selectors `7`/`8`/`9`): an eight-character code of selector, three type and four size characters; 262,144 types, up to 16,777,215 quadlets. The first 62 types mirror the small table so a short value can use the short code.

### 6.3 Parse-part vocabulary (CESR spec, L718-778) {#parse-parts}

The parser reads the selector, then the hard size `hs`, extracts the hard characters, indexes the size table and extracts the rest; the same table works in the B domain (L720). The part labels recur throughout keripy: `hs` hard, `ss` soft, `os` other, `ms` main (`ss - os`), `cs` code (`hs + ss`), `vs` value, `fs` full (`hs + ss + vs`), `ls` lead, `ps` pad, `rs` raw, `bs` binary (`ls + rs`) (L765-778). [code] keripy holds them in `Sizage = namedtuple("Sizage", "hs ss xs fs ls")` and `Matter.Sizes`; `fs is None` marks a variable-size code, and a fixed code satisfies `fs % 4 == 0` (keripy core/coring.py, L660, L864 @`b8f60166b`). Some fixed codes carry their value in the soft part with an empty raw part (CESR spec, L660), which keripy calls `_special`: `fs is not None and ss > 0` (keripy core/coring.py, L910-918 @`b8f60166b`).

## 7. Count / group framing codes (grouping and pipelining) {#count-codes}

Count codes count quadlets or triplets, never primitives: a count code "always counts the number of quadlets/triplets in the group not the number of primitives" (CESR spec > Count Code tables, L591). That is what lets a group be skipped without parsing it, which enables pipelining, offloading and groups of groups (CESR spec > Count or Group Framing Codes, L362). A count code is a composable primitive with no raw value and pad size 0; [code] in keripy `hs + ss == fs` for every counter (30-invariants.md, A7; keripy core/counting.py, Counter).

The count is the same in both domains: "the count value is invariant between 'T' and 'B' Domains... MUST be the number of Quadlets in the 'T' domain and the number of Triplets in the 'B' domain" (L581). "Each element in content of a Count Code group MUST be aligned on a 24-bit boundary. Thus the only elements allowed in the contents of a Count Code group are other primitives or groups" (L591). After the `-` selector, a letter makes a one-character count code and a numeral, `-` or `_` selects a secondary table (L594); the small table counts to 4,095 (L599), the large `--` table to `64**5 - 1` quadlets (L605).

[code] These are keripy's attachment groups. The v1 codex at `80f77b73b` runs `-A` ControllerIdxSigs, `-B` WitnessIdxSigs, `-C` NonTransReceiptCouples, `-E` FirstSeenReplayCouples, `-F` TransIdxSigGroups, `-G` SealSourceCouples, `-H` TransLastIdxSigGroups, `-I` SealSourceTriples, `-L` PathedMaterialCouples and `-Z` ESSRPayloadGroup, with no `-D` (keripy core/counting.py, L56-76 @`80f77b73b`). The v1 and v2 codices differ, which is why the genus/version code ([section 8](#genus-version)) must precede them.

### 7.1 keripy retires transferable receipts as a wire type and reuses v2 `-N` — ahead of the spec {#receipts-retired}

[code] at `80f77b73b`, from keripy PR #1683, beginning with `9762d6bb4` "retire use of TransReceiptIdxSigGroups group code". `TransReceiptIdxSigGroups` is gone from both of keripy's counter tables; v1 keeps it only as a comment, `#'-D': Cizage(hs=2, ss=2, fs=4),` (keripy core/counting.py, L618), so a v1 `-D` group has nothing to size it. A transferable endorsement now travels as `TransIdxSigGroups` (`-F` in v1, `-X` in v2), routed to the old receipt handler (keripy core/parsing.py, L1412), so a transferable receipt is a role a signature group plays, not a code. Removing v1 `-D` contradicts no specification text, which defines count codes only for v2 (CESR spec, L872), and v2 `-D` (datagram segment) agrees on both sides.

v2 `-N` is a specification-implementation divergence. keripy reassigned it: `NonceSealSingles: str = '-N'  # Nonce Seal Single(s), nonce as sealed data, nonce or dig.` (keripy core/counting.py, L228). Both CESR branches still define `-N##` as "Transferable identifier receipt quadruples pre+snu+dig+sig up to 4,095 quadlets/triplets" (CESR spec, L915 @`bad6edd84`; L923 @`65fd7518b`) [spec]. The editor had proposed re-forming or dropping the old group: "Or we can decide to delete the group." (keripy GitHub > #1450, issue body of 2026-06-23, R-009, https://github.com/WebOfTrust/keripy/issues/1450) [proposal]. The divergence is latent: `NonceSealSingles` is absent from `SealCodex_2_0`, from `Serder.ClanCodes` and from the parser's methods, so keripy cannot parse a `-N` group; but v2 `messagize` frames a `SealNonce` bond as `-N` if a caller passes one (keripy core/eventing.py, L1851, L1859–1860; keripy core/structing.py, L396, L646–652). No `src/keri` caller does, so this is a library capability, read from code and not run.

Typed-digest seals may now carry a nonce: keripy's `SealKind` second element is "d = digest or nonce using custom derivation given by type field (Noncer)" (keripy core/structing.py, L69), while the specification's `-W` row reads "Typed digest seal couples `type+dig`" (L933 @`bad6edd84`). Framing survives, since every value `Noncer` admits is a self-framing primitive, but a verifier that treats the second element as a content digest is wrong about keripy's output.

## 8. The protocol genus/version code — versioning the tables themselves {#genus-version}

A genus/version code switches which code tables the parser uses: "A protocol genus and version code itself MUST NOT provide a count of the following Quadlets or triplets but MUST modify the protocol genus and Version of all the following Count Codes" (CESR spec > Protocol genus/version table, L609). Its format is `-_GGGVVV`: a three-character genus and a version whose first character is major and last two minor, so `CAA` is 2.00; KERI/ACDC use `-_AAABAA` (v1.00) and `-_AAACAA` (v2.00) (CESR spec > Protocol genus/version codes, L615, L865-866). It lets one encoding serve several protocols and versions their tables, and "The only table that all protocols MUST share (i.e., has identical values) is the protocol genus and version table" (L611).

A genus/version code governs the following count codes at top level until the next one, or inside one of three overrideable universal groups, and only in first position: "the parser MUST only treat the genus/version count code, especially as an override, when it appears as the first count code within the framed material of an overrideable universal count code. Otherwise, there MUST be no special override meaning" (CESR spec > Universal genus/version override, L816). Override ambiguity would be a downgrade surface, which is why the position is pinned.

A message's version is permanent and its attachments follow the parser [proposal]: "Key event messages, because they are signed and must be verifiable indefinitely, can't be upgraded.", but "there should be no reason that attachments can't be version 2 even when the message is V1, except when talking to a V1-only parser." (keripy GitHub > #1519, comment of 2026-07-23, R-002, https://github.com/WebOfTrust/keripy/pull/1519#issuecomment-5060786324). Since a v2 key event cannot be converted to v1 and still verify, a v1-only parser is a dead end.

v2 attaches messages instead of embedding them, because "This embedding requires that embedded messages share the same serialization of the embedding message. Which breaks down for v2 with 4 serialization types." (keripy GitHub > #1441, comment of 2026-06-22, R-022, https://github.com/WebOfTrust/keripy/pull/1441#issuecomment-4772533040) [proposal]. [code] keripy's embedding constructor `specialExchange` defaults to v1 JSON (keripy peer/exchanging.py, specialExchange, L801-815 @`80f77b73b`). A v2 design that embeds a message in another's body is reaching for a v1 construct.

## 9. Version strings — framing the interleaved non-native serializations {#version-strings}

A CESR parser must support three interleaved non-native serializations, JSON, CBOR and MGPK (CESR spec > Performant resynchronization, L388), framed by a version string in the first field, `v` (CESR spec > Version String field, L1123, L1125).

The v2 form is `PPPPMmmGggKKKKBBBB.`, 19 characters: protocol, protocol version, genus-table version, serialization kind (`JSON`, `CBOR`, `MGPK`, `CESR`), total length, and a `.` terminator that lets a future version change the string's size (L1131, L1152). `Mmm`, `Ggg` and `BBBB` are "a number expressed as a base 64 number, not a string encoded in Base64", with `A` as 0 and `_` as 63 (L1146); misreading that is a parsing bug. The v1 form `PPPPvvKKKKllllll_` is 17 characters with hex version and length, and v2 implementations must support it to verify 1.XX events (CESR spec > Legacy Version 1.XX string field format, L1156-1174). [code] keripy's `Rever` regex tries v2 then v1 (keripy kering.py, L39-61 @`b8f60166b`).

CESR-native field maps carry no version string; they use `-G` count codes and a protocol version field. An implementation may inject a placeholder `v` in memory, but "there is no normative indication that the in-memory object was deserialized from a CESR native field map" (L1148), a round-trip gotcha across implementations.

## 10. Streaming, cold start, and the eight tritets {#cold-start}

After a cold start a parser must find framing, and ambiguity forces another restart; "Good cold start re-synchronization is essential to robust performant Stream processing" (CESR spec > Cold start Stream parsing problem, L380-384). The first three bits of the first byte act like a byte-order mark: the start bits of text CESR, binary CESR, JSON, CBOR and MGPK "MUST be mutually distinct" (CESR spec > Performant resynchronization, L390). The eight cases (CESR spec > Top-level Stream Starting Tritets, L411-420):

- `0b000` annotated T domain; `0b001` T count code (`-`); `0b010` T op code (`_`); `0b011` JSON (`{`);
- `0b100` MGPK FixMap; `0b101` CBOR map; `0b110` MGPK Map16/Map32; `0b111` B-domain count or op code.

JSON, CBOR and MGPK maps take `011` to `110`, and Base64 `-` and `_` fit the free text slots while their binary forms land at `111` (L392-404). "Each Stream MUST start (restart) with one of eight cases" (CESR spec > Stream parsing rules, L427). [code] keripy's `ColdCodex` enumerates the same eight, and `sniff` dispatches on `ims[0] >> 5` (keripy kering.py, L239-322 @`b8f60166b`).

After the tritet, a count code carries what is needed to parse its group, and for a JSON, CBOR or MGPK map "the mapping's first field MUST be a Version String" (L438). Non-native serializations may interleave with CESR only at top level: "This is NOT true for non-native serializations nested inside CESR groups." Nested ones are wrapped: "a non-native CESR serializations MUST be encoded as a CESR primitive and then enclosed in a special count code for non-native messages" (CESR spec > Interleaved non-CESR serializations, L374-376).

### A failing message tells the sender nothing {#no-failure-oracle}

The editor rules [proposal] that for an internet-facing security service the best practice is "to not inform the caller why a given message sent to the service failed" (keripy GitHub > #1580, comment of 2026-08-07, R-021, https://github.com/WebOfTrust/keripy/pull/1580#issuecomment-5221176507), because error detail, and even a crash that forces a restart, is an oracle: "So the approach is to swallow and log all exceptions, not bubble them up." A caller that needs the exceptions, such as one pre-qualifying its own messages, gets a separate wrapper. This describes keripy's design in Sam's words; the parser was not re-read for it. Granular error responses from a public-facing KERI parser would build the oracle the rule denies.

## 11. SAID — the content-address that lives inside its own content {#said}

A SAID is "a special type of content-addressable identifier based on an encoded cryptographic digest that is self-referential" (CESR spec > SAID, L1178). Derivation fills the SAID field with `#` characters (not a Base64 character) to the digest's full encoded length, digests the serialization with the algorithm the code names, and writes the encoding back; verification repeats this and compares (CESR spec > Generation and Verification Protocols, L1197-1199). Because the encoded digest has the length of the fill, no offset moves. [code] keripy's `Saider` does exactly this and fails closed on any exception (keripy core/coring.py, L3875-3982 @`b8f60166b`). [Chapter 05, section 2](05-acdc-and-verifiable-data.md#saids) carries SAIDs in ACDCs.

A SAID is a CESR primitive with a derivation code (L1180, L1190), so digest agility applies to content addresses. [spec-next] `v1.1` refuses a code for a digest of a post-quantum public key because it "would mix the semantics of a Primitive's use with the semantics of its cryptographic algorithm" (CESR spec v1.1 > Post-Quantum Cryptographic Primitives, L1559 @`65fd7518b`): the code names the algorithm, the context names the role.

Field order is insertion order. "The crucial consideration in SAID generation is reproducibility. This requires the ordering and sizing of fields in the serialization to be fixed" (L1240), and lexicographic ordering "often results in oddly-labeled fields that are so named merely to ensure that the lexicographic ordering matches a given logical ordering" (L1246). Modern languages preserve insertion order, so "there is no need for any canonical serialization but natural insertion order" (L1250). Assuming JOSE-style canonicalization is wrong at the wire, and a reordering cleanup changes every SAID.

## 12. Why the encoding is an external interop contract — and the highest-risk surfaces {#interop-risks}

keripy's tests test keripy, not the contract. KERIA, signify-ts and every conforming stack must agree byte for byte: "a change that passes keripy's own tests but diverges from the spec/wire format is a defect, because it silently breaks interop. CESR code-table entries and sizing, field names and order, SAID derivation, version strings, and count codes are external contracts" (00-lens.md, claim 5, L54-57). That file is marked "STATUS: DRAFT — needs Daniel's endorsement", so its claims are one contributor's distillation, and the specification text each cites is the firmer footing. The surfaces to probe first:

1. Sizing arithmetic (`Matter.Sizes`, `_infil`, `_rawSize`, `composable`): the double-modulo pad, `cs % 4 != 3`, `fs % 4 == 0`, and `*3//4` before `- ls`. A wrong entry desyncs every later primitive silently. The knowledge base calls it "the highest-risk surface in the flagship" (00-lens.md, claim 8, L81).
2. Shadow-table completeness when adding a code ([section 5.5](#shadow-tables)).
3. The genus/version override position (CESR spec > Universal genus/version override, L816-818). Honoring it elsewhere, or emitting it out of position, is a table-selection confusion and a downgrade vector.
4. Version-string parsing: base-64 numbers, not Base64 strings, and the 19- versus 17-character spans (L1146). A lenient regex reads the wrong length.
5. Cold-start tritets: a parser that mishandles `000` or `111`, or interleaves non-native messages below top level, cannot resynchronize (CESR spec, L411-427).
6. Additive-code asymmetry: a design that makes old parsers silently accept an unknown code smuggles a downgrade; the correct behavior is a clean version-gated reject (L618-622).
7. No post-quantum signature can enter an indexed group. The indexed table at `v1.1` (L1109-1131) and on `main` holds only Ed25519, secp256k1 and Ed448 forms, so KERI's indexed groups — controller, witness, transferable — cannot carry an FN-DSA, ML-DSA or SLH-DSA signature, and a post-quantum signature cannot take part in a multisig or a witness receipt. The specification tracks it as issue 171.
8. Indexed signatures switch codes at index 63 (`Ed25519_Crt_Sig` to `Ed25519_Big_Crt_Sig`), and a consumer without the big codes rejects large multisig groups (31-landmines.md, landmine L14, verified at keripy `60ab9e08d`).
9. v2 `-N` has two meanings ([section 7.1](#receipts-retired)). A group whose code means different things to producer and consumer may be parsed wrongly rather than rejected (unverified: no parser was run on one). It is latent, and keripy's emitter can frame a group its own parser cannot read.
10. Sequence numbers are hex. [code] signify-ts at `ffba8406e` built a source-seal `Seqner` from `new Seqner({ sn: parseInt(seal[1].s) })` (signify-ts src/keri/core/eventing.ts, L432), reading hex as decimal, and at `5a174b545` reads `new Seqner({ snh: seal[1].s }).qb64b` (signify-ts eventing.ts, L430; signify-ts#417). The bad attachment would have been well-framed, so framing could not flag it: valid CESR can still be wrong.
11. The Ed448 seed code is a byte short. Both branches define `K`, "Seed of Ed448 private key", with 76 text characters, which holds 56 raw bytes (CESR spec, L961 @`bad6edd84`; L969 @`65fd7518b`). The editor accepts that the key is 57 bytes: "The cryptography library has the raw size of both private and public keys at 57 bytes" (CESR spec GitHub > #175, comment of 2026-09-01, R-020, https://github.com/trustoverip/kswg-cesr-specification/issues/175#issuecomment-5497714395) [proposal]. A 57-byte value has pad size 0 and cannot take a one-character code, so the repair is a new four-character code; until then an implementation that puts an Ed448 seed under `K` truncates it or stores something else. The issue is open.

### Well-established versus contested {#established-vs-contested}

Established in specification and code: composability, 24-bit alignment, mid-padding, stable framing, quadlet counts, the genus/version format and scope, the version strings, and the eight-tritet cold start. Open: the op-code table (`_`) is reserved and unspecified (CESR L628, L948), some large-variable and context tables are not fully populated, and post-quantum codes are absent on `main` and contested on `v1.1`. Two source typos are not doctrine: the `6A` text says "pad size of 0" beside two lead bytes (L553), and a `-S#####` code lacks a leading `-` (L926).

#### The load-bearing assumption {#load-bearing-assumption}

Crypto agility holds because sizing is a pure function of the code and a new code takes a slot whose size class no existing parser depends on. It is "a disciplined additive extension that old parsers reject cleanly and new parsers accept," resting entirely on exact sizing math (CESR spec > Protocol genus/version codes, L618-622; 00-lens.md, claim 8). The fork's parser ([section 5.7](#pq-in-practice)) is evidence that the assumption holds in practice [proposal].

## Sources {#sources}

- 00-lens.md — keripy-knowledge load-bearing claims, a file in keripy-knowledge (see that entry), 00-lens.md, @`9489ac9bd` (2026-07-02). Mined in raw/08.
- 30-invariants.md — keripy-knowledge invariants, a file in keripy-knowledge (see that entry), 30-invariants.md, @`9489ac9bd` (2026-07-02). Mined in raw/08.
- 31-landmines.md — keripy-knowledge landmines, a file in keripy-knowledge (see that entry), 31-landmines.md, @`9489ac9bd` (2026-07-02). Mined in raw/08.
- CESR spec — Composable Event Streaming Representation (CESR) specification, Trust Over IP. trustoverip/kswg-cesr-specification, spec/spec-body.md. main @`bad6edd84` (2026-08-28) for unmarked and [spec] claims; v1.1 @`65fd7518b` (2026-08-26) for [spec-next] claims. The two branches are not ancestor and descendant (their merge base is `7a6adca67`), and nothing read this month states an intent to merge, so [spec-next] text here is likely-but-not-certain future normative text. The earlier pin `d35125e61` is reachable from no ref ([section 5.7](#pq-in-practice)). Mined in raw/02.
- CESR spec GitHub — Sam Smith's comments in trustoverip/kswg-cesr-specification conversations: pull request #165 (comments of 2026-03-18 and 2026-03-19, R-017, R-018, R-019) and issue #175 (comments of 2026-09-01, R-020; issue open on 2026-10-14). Read from the read-only API cache of 2026-10-14 (`.ignored/sam-rulings-cache/`), quotes checked against the cached text. An editor's comment is [proposal] unless the text at a spec pin carries it, and each use here says which. Mined in raw/21.
- keripy — keripy, the KERI reference implementation, WebOfTrust/keripy, src/keri. main @`b8f60166b` (2026-09-14, `__version__` `2.1.0-dev1`) for every [code] claim not stamped otherwise. main @`80f77b73b` (2026-10-01, still `2.1.0-dev1`) for `specialExchange` in [section 8](#genus-version), the count-code and seal claims in [section 7](#count-codes) and [section 7.1](#receipts-retired), and the unknown-code handling in [section 5.3](#unused-slot-agility). keripy `main` is not what KERIA runs: KERIA pins `keri==1.2.14` ([chapter 07, section 12](07-shibboleths-and-anti-patterns.md#main-not-deployed)), so a keripy-main claim is not evidence about a KERIA deployment. Mined in raw/09.
- keripy GitHub — Sam Smith's comments in WebOfTrust/keripy conversations: pull requests #1441 (2026-06-22, R-022), #1519 (2026-07-23, R-002) and #1580 (2026-08-07, R-021), and issue #1450 (body of 2026-06-23, R-009). Read from the read-only API cache of 2026-10-14 (`.ignored/sam-rulings-cache/`), quotes checked against the cached text. [proposal] throughout. Mined in raw/21.
- keripy-knowledge — keripy-knowledge, a distilled contributor knowledge base for keripy, on the orphan branch knowledge of dhh1128/keripy, @`9489ac9bd` (2026-07-02). Its declared code baseline is keripy `60ab9e08d`, 493 commits behind `b8f60166b`; its sizing invariants and shadow-table discipline are used here as rules, not as claims about current keripy behavior. Its banner that all twenty landmines are still present does not hold without qualification, since two are stale (raw/08 F-08H). Mined in raw/08.
- kswg-cesr-specification#178 — trustoverip/kswg-cesr-specification pull request #178, https://github.com/trustoverip/kswg-cesr-specification/pull/178, opened 2026-09-22 by Kor Dwarshuis from branch revert-165-pq, single commit `487fab701`; state read 2026-10-03 (open, unmerged, unreviewed). No raw note mines it.
- PLAN.md — keripy-knowledge plan, a file in keripy-knowledge (see that entry), PLAN.md, @`9489ac9bd` (2026-07-02). Mined in raw/08. Read only in part (the section 7 effort table and the section 9 open decisions).
- signify-ts — signify-ts, the TypeScript Signify client, WebOfTrust/signify-ts, src. main @`ffba8406e` (2026-09-10) for the absence of post-quantum codes in [section 5.7](#pq-in-practice) and the pre-fix `messagize` in item 10 of [section 12](#interop-risks); main @`5a174b545` (2026-09-16) for the fixed `messagize`. Mined in raw/10.
- signify-ts fork — Daniel Hardman's fork of signify-ts, dhh1128/signify-ts, branch feat/cesr-pq-codes, @`4ed767b49` (2026-09-05). Code on an unmerged personal fork, and therefore [proposal]: no implementation anyone else runs behaves this way. The chapter's doctrine does not depend on it. Mined in raw/10.
- signify-ts#417 — WebOfTrust/signify-ts#417, the change that made `messagize` read the source-seal sequence number as hex. Mined in raw/10 (section 11c).
