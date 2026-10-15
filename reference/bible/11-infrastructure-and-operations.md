# 11 — Infrastructure and Operations {#infrastructure}

## Thesis {#thesis}

KERI's infrastructure is separated control over shared data. The controller designates a witness pool that promulgates its key event log; each validator chooses, and may keep secret, a watcher pool that confirms what it is shown; and one layer up, an issuer's registrar serves transaction event logs to observers that verifiers control. The specification fixes that split and little else: who controls which pool, KAWA's threshold arithmetic, the controller's duty to propagate events so a validator cannot be eclipsed, witnesses as a second authentication factor, and discovery by untrusted OOBIs. How many witnesses, where they run, who runs them, whether a witness doubles as a mailbox, and how many watchers a validator consults are arguments in talks and papers or one vendor's choices, and this chapter keeps those apart. Its central argument, implied by the arithmetic though not stated: KAWA's bounds count independent faults, so a pool whose witnesses share an operator, cloud, region or codebase is smaller than it looks, and the defence against eclipse lives in the breadth and independence of watchers, not the geography of witnesses. As of October 2026, witnesses are productized, watchers detect duplicity among one identifier's witnesses but do not share what they see, registrars and observers have just appeared, and several things said about them in talks are not yet true of the code.

## Status {#status}

Most of this chapter is not normative, and it marks each claim. The [spec] material is the KERI specification's `main` at `fbdd4a615`: the role split, KAWA's inequality, witness-as-second-factor, the eclipse obligation, the watcher incentive and confidentiality text, and OOBI discovery. The specification has no mailbox, no pool size beyond KAWA's inequality, and no geography, vendor or hosting guidance. The rest is [proposal] (Sam Smith's papers, decks and GitHub comments), [code] (keripy at `927c0cb87` and the KERI Foundation's packages, only where code was read), [practice] (vendor READMEs, product rules, a website, and what vendors said), the model-authored analysis corpus, and conference captions quoted only for intent. Vendor repositories were read at the pins in Sources; [section 13](#landscape) is the most likely to be stale.

## 1. Separated control over shared data {#separated-control}

### What the specification fixes {#role-split}

[spec] "The controller chooses how the witnesses are hosted." (KERI spec > Indirect exchange via witnesses and watchers, L43 @fbdd4a615), while the watcher pool "is under the ultimate control of the AID's event validator. To clarify, it is not under the control of the AID's controller." (L45). The witnesses form "a highly available and secure promulgation network for that AID" (L43), and the watchers "a highly available and secure confirmation network" (L47). The security content of both roles is [chapter 02, sections 8 and 9](02-security-model-and-threat-posture.md#observer-layer).

### Where the split came from {#split-lineage}

[proposal] Sam's 2020 Trust Bases deck: "Shared data = good, shared control = bad." and "KERI = separated control over shared data." (Trust Bases deck, p. 38 @b47f21597). It justifies the split as a trade: separation "may provide better decentralization, more flexibility, better scalability, lower cost, higher performance, and more privacy at comparable security." (same). The deck does not claim separation makes KERI secure; end-verifiability does that. In 2026 Sam put the corollary as "KERI doesn't exist without infrastructure." (KERIConf26 caption, Samuel Smith, State of the KERI Suite, 35:37).

### Witnesses are not watchers, in operation {#roles-in-operation}

[proposal] The commonest operational error is letting a relying party rely on a witness's view ([chapter 02, section 9](02-security-model-and-threat-posture.md#witnesses-as-watchers)). Sam's rule: "An event should not be Seeable by a second party unless a watcher can see it, not if a witness can see it." (keripy GitHub > #1559, comment of 2026-07-31, R-008, https://github.com/WebOfTrust/keripy/issues/1559#issuecomment-5138781953). A product that ships witnesses and no watchers has shipped the promulgation half of KERI's infrastructure and none of the confirmation half.

## 2. Registrars and observers: the split one layer up {#registrar-observer}

An issuer's registrar holds its TELs; a verifier's observer fetches and verifies them, and the verifier asks its observer, not the issuer. The mechanism is [chapter 05, section 9](05-acdc-and-verifiable-data.md#registries), and issuee-controlled registrars are [chapter 10, section 6](10-presentation-registries.md#governance-split).

### What the KERI Foundation published in October 2026 {#kf-registrar-observer}

[practice] `kf-observer` (2026-10-08) "is the ACDC counterpart of a watcher. Watchers serve KELs; this process serves TELs." (kf-observer README > kf-observer, L8 @d6368aef9), and `kf-registrar` (2026-10-09) "the ACDC counterpart of a witness." (kf-registrar README > kf-registrar, L7 @bf14eac4d). The observer requires "Wallets and verifiers must not talk to the registrar — they talk to an observer (anti-correlation). For SEDI, observers are not optional." (kf-observer README > kf-observer, L9). It checks each TEL event against the issuer's KEL and "stores a verified copy" (L5), leaving the issued-or-not check to the verifier (kf-observer README > Trust boundary), so the verifier depends on its data, not its verdict.

### Two departures from the witness and watcher pattern {#registrar-departures}

Both are this chapter's reading of READMEs, not of code. First, the relationship is permissioned by the issuer: the registrar's external port is "authenticated with KRAM and restricted to configured observer AIDs" (kf-registrar README > Dual HTTP, L24 @bf14eac4d). Any watcher may query any witness, but an observer may query only registrars that list it, so a verifier's choice of observer is bounded by every relevant issuer's allow-list; nothing read says how a verifier obtains one all its issuers will serve. Second, a TEL has no availability layer: "There is no registrar pool, no TEL receipts" (L27). Integrity rests on KEL anchors; availability rests on one registrar, a single point of failure.

## 3. The five Ws: a map, not an architecture {#five-ws}

[practice] Wallet, witness, watcher, web and wizard are the KERI Foundation's organizing frame, in no specification: it aims to build One-click KERI "through the 5 W's: Wallet, Witness, Watcher, Web, and Wizard." (KF profile > Why?, L7 @68a0d8883). Sam wrote that the Foundation "got funding to support open infrastructure (5Ws) as a public utility" (CESR spec GitHub > #165, comment of 2026-03-19) [proposal]. Witness and watcher are specification roles; web is, in Thomas Mayfield's gloss, OOBI discovery plus transports; wizard has no protocol content. The services page's gloss "Watchers – validation of authoritative key state" (keri.foundation services page, fetched 2026-10-15) is wrong in KERI's terms, because a watcher reports and only the relying party decides ([chapter 07, section 8.2](07-shibboleths-and-anti-patterns.md#watcher-enforcement)). The frame's useful content is a standard to hold vendors to: "Each of these five roles are independently operated, independently verified and uniquely can be independently replaced." (KERIConf26 caption, Thomas Mayfield, KERI Infrastructure and the 5 W's, 10:56).

## 4. Witness pools: arithmetic, sizing, diversity {#witness-pools}

### What is normative {#kawa-arithmetic}

[spec] KAWA fixes the arithmetic and nothing else: "at most one sufficient agreement occurs or none at all" provided "at most F* = N-M of the witnesses are potentially unavailable and at most F < M is duplicitous" (KERI spec > Immunity and Availability, L1866 @fbdd4a615). Its bounds and the toad discipline are [chapter 02, section 7](02-security-model-and-threat-posture.md#immunity-constraint). The specification says nothing about where witnesses run, who runs them, or how many is enough, so the diversity doctrine below has no normative text behind it; the specification's one use of common-mode is about reserve rotation keys, not witnesses (KERI spec > Reserve Rotation, L1503 @fbdd4a615).

### The common-mode argument {#common-mode}

Sam's argument exists only at a conference: "if your witnesses all come from the same vendor, the vendor is a common mode failure source." (KERIConf26 caption, Samuel Smith, State of the KERI Suite, 40:17). A vendor agrees: "we tell our customers, you can't just get your witnesses from us." (KERIConf26 caption, Thomas Mayfield, KERI Infrastructure and the 5 W's, 31:23, Phil Feairheller in the Q&A). The derivation is this chapter's synthesis: KAWA's bounds count faulty witnesses as separate faults, which assumes they fail separately, so N witnesses sharing an operator, cloud, region or codebase have an effective size of one against that cause. One model-authored analyst says the same: "if witnesses are all hosted by the same cloud provider or operated by the same organization, correlated failures become likely." (dg-c01-claude.md > 7. Pragmatic CISO's Operational Plausibility Notes, L199 @149fa6c35).

Diversity defends against faulty witnesses, not against the controller who chooses them: "Witness sets are controller-chosen" (background.md > 4.4.3 Witness Misbehavior, L340-341 @149fa6c35). A malicious controller can run every witness, and the defence there is the validator's watchers ([section 7](#watchers)). A 2019 deck makes the related point that a known validator set is a censorship target (Censorship Resistance deck, p. 4 @b47f21597) [proposal]; a witness pool is published in the KEL and so is known.

### How many witnesses: there is no normative number {#pool-size}

- One or four, relayed secondhand from Sam: "It was either one or four cuz he says when you have three or four as your signing threshold for witnesses you can't be eclipsed" (KERIConf26 caption, Evan Asawaka, Mobile Wallet, 21:55); "three or four" is almost certainly "three of four". Do not attribute it to Sam in public without the video.
- [practice] The Foundation's boot service hardcodes it: "witness profile is `1-of-1` or `3-of-4`" (kf-boot README > Product Rules, L164 @14c8f616e).
- [practice] GLEIF runs five (KERIConf26 caption, Evan Asawaka, Mobile Wallet, 21:17); no governance framework read gives witness-count guidance.
- [practice] healthKERI lets the user choose N per region.

At 3-of-4, F* = 1, so one witness may be down, and F < M tolerates a duplicitous witness that 1-of-1 (F = 0) cannot.

### Placement as deployed {#placement}

[practice] The Foundation's guide titles single-host "Single Host (not very practical)" (kf-boot setup guide > Set up kf-boot on Ubuntu 24.04, L1 @14c8f616e), and of co-located witnesses Ryan Hansen said "We would not say do that in production. It doesn't really give you much help." (KERIConf26 caption, Ryan Hansen, Witnesses and Watchers, 9:02). healthKERI runs four regions, "We have New York, Frankfurt, Singapore, and Sydney." (KERIConf26 caption, Phil Feairheller, Infrastructure for Security, 26:36), but region diversity is not operator diversity: four regions of one vendor are one common-mode source. Procurement pushes the same way; of Utah, "They need multiple vendors and the way we synchronize with each other is the KERI protocol." (KERIConf26 caption, Thomas Mayfield, KERI Infrastructure and the 5 W's, 30:57). The only multi-vendor pool demonstrated in the sources is a desktop wallet rotating witnesses from two provider plugins onto one AID (raw/18 section 3.4). The ledger-backed alternative, the backer, is [chapter 03, section 9](03-key-management-and-identifier-lifecycle.md#backers); no deployed ledger-backed witness network was found.

## 5. Witnesses as an authentication factor {#second-factor}

### The normative pattern {#second-factor-spec}

[spec] A witness pool is a threshold structure when "each witness only accepts local events that are protected by a unique authentication factor in addition to the controller's signatures on the event", so an attacker must "compromise not merely the controller's set of private key(s) but also the unique second factor on each of a threshold number of witnesses" (KERI spec > Validator Roles and Event Locality, L1764 @fbdd4a615). keripy's version is [chapter 03, section 9](03-key-management-and-identifier-lifecycle.md#local-vs-remote).

### The instances {#second-factor-instances}

[code] keripy ships the client: the receipting doer takes a "map of witness AIDs to (time,auth) tuples for providing TOTP auth for witnessing" (keripy app/agenting.py, Receiptor.receipt, L62 @927c0cb87). raw/18 attributes this docstring to `WitnessReceiptor`; it belongs to `Receiptor.receipt`. Phil Feairheller says he added the feature for healthKERI. [practice] The Foundation's witness requires it: "Before the witness will receipt events, the controller must register its AID with two-factor authentication" (witness-hk developer guide > Step 7: Authenticate with TOTP, L172 @39e1c3fc7).

### The reason given, and the trade nobody named {#second-factor-trade}

The stated rationale was avoiding vendor lock-in, not security: "we thought that was more vendor lock-in than we really were comfortable with, so we went with this one-time password solution." (KERIConf26 caption, Phil Feairheller, Infrastructure for Security, 25:50). Per-witness codes being "really onerous" (27:16), healthKERI offers one code for all of an AID's witnesses [practice]. On this chapter's analysis, one code collapses the specification's "unique authentication factor" per witness into a single factor for the whole pool; whether that is an acceptable instance is open.

## 6. Eclipse attacks: two meanings {#eclipse}

### The specification's eclipse: isolating a validator {#eclipse-validator}

[spec] A dead attack must reach a validator before the original event does, and the obligation falls on the controller: "a controller MUST propagate the event sufficiently widely enough that the attacker cannot eclipse all components, such as Watchers, that the validator may consult." (KERI spec > Non-establishment Dead-attack, L1638 @fbdd4a615). For establishment events, "This may be very difficult given a sufficiently widespread watcher network." (KERI spec > Establishment Dead-attack, L1652). The defender's asymmetry is [chapter 02, section 9](02-security-model-and-threat-posture.md#ambient-detection). raw/18 cites L1652 as the non-establishment case; it sits under Establishment Dead-attack.

### The vendor's eclipse: reaching the witnesses {#eclipse-witness}

[practice] Vendors use eclipse for the reachability of a witness pool: "So, someone would immediately now have to attack four different places around the world to eclipse" (KERIConf26 caption, Phil Feairheller, Infrastructure for Security, 30:55). That is not the specification's sense. Witnesses are the controller's infrastructure, which a validator may never consult, and isolating a validator from witnesses yields a forged history only with the controller's keys. Geographic spread of witnesses does not satisfy the propagation obligation.

### What is missing {#eclipse-gaps}

The specification gives no propagation target, no watcher count, and no guidance on choosing watchers to make an eclipse expensive. Watcher breadth and independence is where the defence lives, and all of it is [practice]. Any discovery network that can withhold a validator's copy of the original KEL is an eclipse tool ([section 10](#keridemlia)).

## 7. Watchers as deployed {#watchers}

### The normative frame, and a tension inside it {#watcher-frame}

[spec] "Watchers are not explicitly managed by key events." so a validator's watchers "MAY be kept confidential and, therefore, unknown to potential attackers." (KERI spec > Indirect exchange via witnesses and watchers, L45 @fbdd4a615). And "Watchers have a strong incentive to share all the KELs they watch." (L49), since first-seen "strongly incentivizes both parties to support a widespread low-latency global network of watchers and watcher pools that share their first-seen KELs." (same). The two pull apart in operation: a shared network a validator subscribes to learns which identifiers each subscriber watches. No source resolves this.

### What vendors built {#vendor-watchers}

[practice] healthKERI moved from rented per-customer watchers to a pooled network on Sam's advice — "He said it's no more secure giving them VMs inside of our infrastructure than if I just created a global watcher network." (KERIConf26 caption, Phil Feairheller, Infrastructure for Security, 33:24) — assigning "We do four watchers. So, pick them at random, one in each region." (KERIConf26 caption, Phil Feairheller, Infrastructure for Security, 36:38). The Foundation's boot service requires that "one hosted watcher is required before onboarding completes" (kf-boot README > Product Rules, L169 @14c8f616e): one watcher, hosted by the operator that allocates the witness pool. Veridian announced watcher services for the second half of 2026 (KERIConf26 caption, Thomas Mayfield, KERI Infrastructure and the 5 W's, 8:12). A vendor-run global watcher network is the scope concentration of [chapter 02, section 9](02-security-model-and-threat-posture.md#super-scope): a privacy and concentration cost, not an integrity one, while the relying party verifies what it is given.

### What the open watcher code does {#watopnet}

[code] The Foundation's watcher, `watopnet`, which depends on its witness package, "Detects even, behind, ahead, and duplicitous conditions" by fetching each witness's key state (watcher-hk watopnet/app/watching.py, Sentinal docstring, L811-812 @9be717f8a), and on duplicity logs that "witnesses have a duplicitous event" and returns (Sentinal.watch, L968). A search of `src/` at that pin for `gossip`, `peer` and `share` finds no watcher-to-watcher exchange and no evidence publication. So it detects duplicity among one identifier's witnesses but does not share first-seen KELs, does not act as a juror, and cannot see a fork shown to a different audience through channels those witnesses never saw. These are maturity facts at a pin, and the concrete content of the concession that observability infrastructure is immature ([chapter 07, section 14](07-shibboleths-and-anti-patterns.md#residuals)).

### Local watchers {#local-watchers}

[spec] A validator "MAY use its own watcher pool to watch its own witness pool of the AID that it itself controls" (KERI spec > Indirect exchange via witnesses and watchers, L45 @fbdd4a615). The 2026 closing panel proposed it for ordinary users: "you should have a local watcher that is informing your wallet of any changes to your key state that you didn't source" (KERIConf26 caption, panel, What KERI allows us to do that we couldn't before, 24:18). kf-boot excludes "local watcher or sidecar behavior" from its scope (kf-boot README > Scope, L50 @14c8f616e).

### Failure modes and incentives {#watcher-failure-modes}

Observer degradation in general is [chapter 02, section 9](02-security-model-and-threat-posture.md#core-but-optional). The analysts add "Inconsistent polling frequencies (watchers check weekly instead of continuously)" and "Alert fatigue (evidence of duplicity exists but is not acted upon)" (dg-c02-claude.md > 7. Pragmatic CISO's Operational Plausibility Notes, L132-134 @149fa6c35), and "Running watchers has costs but diffuse benefits; free-rider problems likely" (dg-c05-claude.md > 7. Pragmatic CISO's Operational Plausibility Notes, L175 @149fa6c35), citing no evidence. The free-rider point runs against the specification's incentive argument, and the open watcher's lack of sharing is at least consistent with it.

## 8. Validator policy and operational posture {#validator-policy}

### The rule {#acceptance-rule}

The specification's MUST NOT trust on evidence of duplicity, and the open question of how the analysis corpus's looser acceptance and fork-handling statements square with it, are [chapter 02, section 10](02-security-model-and-threat-posture.md#validator-policy). An operator should implement the specification's rule as the default, as the analysts recommend: "Reject identifiers on detection of duplicity (fail-closed)" (dg-c03-claude.md > 7. Pragmatic CISO's Operational Plausibility Notes, L238 @149fa6c35).

### The analysts' notes, sorted against doctrine {#ciso-notes}

The six dg-c0X analyses end with notes that are "explicitly non-normative and does not assess protocol correctness" (dg-c01-claude.md > 7. Pragmatic CISO's Operational Plausibility Notes, L187 @149fa6c35), model-generated and uncited. Where they pull against doctrine, doctrine wins.

Consistent with doctrine:

- "Treat controller compromise as inevitable and design for graceful degradation." (dg-c01-claude.md > 7, L195), the survivability objective as an operating rule.
- "Provide strong default thresholds in tooling." (L211), and validators may refuse weak thresholds as local policy.
- "Deploy watcher infrastructure as a first-class operational concern." (L238)
- Custody of next keys: "Attackers who obtain current keys frequently have broader access (credential stores, backups, build pipelines), making pre-rotation key security questionable." (dg-c04-claude.md > 7.1 Deployment Reality of Recovery Rotation Scenarios, L150). The firewall assumes next keys are kept apart ([chapter 02, section 5](02-security-model-and-threat-posture.md#pre-rotation-firewall)), so next-key material must not live in any store, backup or pipeline that holds current signing keys.

In conflict with doctrine:

- Recovery escrow, "Controllers registering recovery intentions with trusted third parties before compromise" (dg-c04-claude.md > 7.4 Operational Mitigations, L176): pre-rotation already is the sealed recovery commitment ([chapter 07, section 2.1](07-shibboleths-and-anti-patterns.md#trusted-authority)).
- "Publish authoritative KELs for high-stakes identifiers (e.g., root authorities)" (dg-c03-claude.md > 7, L235): a publisher can make a KEL available, not authoritative; its authority is its signatures.
- "Governance is not optional" (L259): defensible as a deployment requirement for high-stakes use, wrong as a protocol requirement.

Policy options with limits, on this chapter's reading: accepting only recent recovery rotations (dg-c04-claude.md > 7.4, L177) is permissible local policy that rejects a legitimate late recovery, and no time window appears in the recovery rules ([chapter 03, section 10](03-key-management-and-identifier-lifecycle.md#recovery-rotation)). The claim that "Higher M values make recovery rotation harder to execute maliciously (but also harder to execute legitimately)" (L175) looks mistaken: rotation authority comes from the pre-committed keys, so M changes receipting fault tolerance, not who can rotate.

## 9. Mailboxes {#mailboxes}

### Not a specification concept {#mailbox-status}

The specification has no mailbox on either branch (raw/18 section 9.1). A mailbox is store-and-forward for a controller that is not always online, and in KERIA "An agent functions as a mailbox." while "the agent is not a witness. The agent is not a watcher." (KERIConf26 caption, Kent Bull, KERIA Tutorial, 8:09 and 19:17). The agent's custody boundary is [chapter 03, section 12](03-key-management-and-identifier-lifecycle.md#keria-signify).

### The conflation, and its history {#mailbox-conflation}

Practitioners call bundling mailboxes into witnesses an accident: "because of an artifact of accident of history, witnesses in the beginning of GLEIF's implementation of the the KERI spec, witnesses and mailboxes were combined." (KERIConf26 caption, Kent Bull, KERIA Tutorial, 7:15). He added that "HealthKERI actually did witnesses the right way in the sense that it's only a witness." (same, 7:08). Phil Feairheller called the belief that offline messages go to witnesses "a common misconception" (KERIConf26 caption, Evan Asawaka, Mobile Wallet, 19:53, in the Q&A), and said healthKERI had bundled them "simply because we were moving very fast and had nowhere else to hang them" and has "since moved away from that." (same, 19:57 and 20:05) [practice].

[code] keripy has a separate `mailbox` role (keripy kering.py, Rolage, L378-380 @927c0cb87), but `setupWitness` builds a `Mailboxer` into every witness (keripy app/indirecting.py, setupWitness, L62), and `MailboxDirector` defaults to `witnesses=True` (L513), so its `addPollers` will "add mailbox pollers for every witness for this prefix identifier" (L621). By default a witness is a mailbox and a client polls its witnesses as mailboxes.

### The open witness still bundles one {#witness-hk-mailbox}

The Foundation's witness, healthKERI's donated code, still gives each witness "its own non-transferable KERI identifier (Hab), its own keystore, and its own mailbox." (witness-hk developer guide > Architecture, L245-246 @39e1c3fc7) [practice], and serves `mbx` queries as a server-sent event stream (witness-hk witopnet/app/indirecting.py, HttpEnd.on_post, L280-284) [code]. So "moved away from that" is true of healthKERI's product but not of the open code at its pin; whether the mailbox is vestigial is a question for a maintainer.

### Why the separation matters {#mailbox-separation}

This chapter's reconstruction, which no source argues: a witness is designated in the KEL, so it is public and tied to the AID, while a mailbox holds inbound traffic. Bundling lets the infrastructure published for key-state availability see who messages the controller and when, the metadata that ESSR and SPAC protect ([chapter 12](12-confidentiality-and-secure-messaging.md)). It also couples two availability requirements that should be sized separately.

## 10. Discovery {#discovery}

The separation of discovery from trust is [chapter 01, section 4](01-foundations-and-worldview.md#discovery-vs-trust), bootstrap configuration is [chapter 06, section 6](06-governance-ecosystems-and-interop.md#bootstrap-buckets), and why observers are not a discovery service is [chapter 07, section 8.5](07-shibboleths-and-anti-patterns.md#observer-not-cache).

### OOBIs with URLs will do {#oobis-will-do}

[spec] "KERI does not, therefore, need its own dedicated discovery network; OOBIs with URLs will do." (KERI spec > Out-Of-Band-Introduction (OOBI), L2635 @fbdd4a615). "Percolating intermediaries do not need to be trusted." (KERI spec > SPED (Speedy Percolated Endpoint Discovery), L2843). A self (blind) OOBI lets a controller's witness AIDs appear only in its KEL, not in every bootstrap configuration (KERI spec > Self (Blind) OOBI (SOOBI), L2827), and a hostile OOBI's worst case is bounded: "an OOBI may be part of a DDOS attack but not as part of a service endpoint cache poison attack." (KERI spec > OOBI Forwarding, L2831).

### Bootstrap the controller, then redirect {#oobi-bootstrap}

[proposal] For long, for example post-quantum, witness AIDs, Sam: "Ultimately what the User cares about iOut of Band is to be given the controller AID of interest not its witness AIDs" (CESR spec GitHub > #165, comment of 2026-03-19, R-011, https://github.com/trustoverip/kswg-cesr-specification/pull/165#issuecomment-4090031232), and "The service endpoint in that bootstrap OOBI serves up the service endpoints of the witnesses (essentially a redirect)." (same). So a published introduction, QR code or link, should name the controller AID and serve witness endpoints behind it, so a change of witnesses never stales it.

### Percolation, as first argued {#percolation}

[proposal] The 2021 Percolation deck: "Discovery becomes an availability not a security problem." (Percolation deck, p. 3 @b47f21597). Its defence against discovery eclipse, "User permissioning means honest nodes self-isolate dishonest-nodes." (p. 2), is a theoretical claim, not a demonstrated property. It also says percolated discovery "Replaces or Augments User Permissioned DHT" and "Watcher Network may provide super Nodes for aggregated discovery if desirable" (p. 4), which is compatible with watchers not being discovery mechanisms as their security role. [practice] The Foundation's boot service verifies itself by percolated discovery, so "clients do not need preinstalled boot-server inception material" (kf-boot README > Transport And Auth, L95-97 @14c8f616e), over KRAM-authenticated `exn` ([chapter 09, section 1](09-kram-and-request-authentication.md#problem)).

### KERIdemlia: the boundary case {#keridemlia}

[proposal] KERIdemlia (2021, Ryan W. West and Sam Smith) prototyped a Kademlia DHT that "stores key state for identifiers, which maps identifiers to witness identifiers and witness identifiers to witness IP addresses" (KERIdemlia paper, p. 1 @b47f21597), from a design in the 2020 Trust Bases deck (p. 52), and claims "Keridemlia may serve as an end-verifiable replacement for DNS." (p. 3). Its prototype did not complete the verification its design rests on (p. 8). Its write path "only allows signed, verified data to be published to the network, discarding all unverified data." (p. 1). It stores key state, not the KEL, and still sends the client to a witness because "a malicious Keridemlia node could publish false KES data to mislead clients" (p. 8), bounding attacks "to only dropping data entries or denying service." (p. 8). The specification chose OOBIs with URLs, and keripy at `927c0cb87` has no `kademlia` or `dht`; it was superseded in practice, not rejected.

On this chapter's analysis, a DHT fits KERI's rule that what an OOBI leads to "MUST be verified by some other mechanism" (KERI spec > Out-Of-Band-Introduction (OOBI), L2629) as one more untrusted source. But the paper omits the two attacks that matter: eclipse and Sybil attacks on the DHT, where dropping entries is exactly a dead attack's precondition ([section 6](#eclipse)), and lookup privacy, since a global DHT reveals which AIDs a querier resolves. A discovery network is admissible only as an untrusted availability layer and never as the only path, and availability of first-seen history is itself part of KERI's security.

## 11. Software and hosting {#software-hosting}

### The premises the software is written against {#zero-trust-computing}

[proposal] keripy and the Foundation's services run on hio, Sam's structured-concurrency runtime, whose premises are "The network is always hostile, internally & externally; Locality is not trustworthy." and "Data is signed/encrypted in motion and at rest." (Hio deck, p. 60 @b47f21597). That is about network position; the specification's local event is earned by supervision or authentication ([section 5](#second-factor-spec)), so the two are consistent.

### Concurrency, and logging key-state fetches {#hio-rulings}

[proposal] "Multiple doers running in a single process are only logically parallel. They are still sequential within the one process." (keripy GitHub > #855, comment of 2025-12-03, R-010, https://github.com/WebOfTrust/keripy/issues/855#issuecomment-3607600921), though "HIO now supports multiprocessing." (same). And "Whenever you create a cue to get keystate, also do a logger.info so that someone watching the logs can do analytics on missing keystate." (keripy GitHub > #1323, review of 2026-03-12, R-070, https://github.com/WebOfTrust/keripy/pull/1323#pullrequestreview-3939540930). Missing key state is the first signal of unreachable witnesses or an isolated validator, so this logging rule has a security reading.

### Deployment stack, and the unexplained container objection {#deployment-stack}

[practice] The Foundation's stack is Python 3.14, libsodium, Falcon, nginx terminating TLS, and Circus under systemd (kf-boot setup guide @14c8f616e; witness-hk Ansible README > Architecture @39e1c3fc7), with the boot service private and the witness and watcher public ("the boot server is private. So it's not publicly accessible.", KERIConf26 caption, Keanu Pahio, KERI Development and Deployment, 6:59); of the boot host, "Keep on localhost in production." (witness-hk README > witopnet-sample.sh, L176 @39e1c3fc7).

Sam's objection to containers is relayed, not argued: "Sam's pretty adamant that there's some major security concerns about that approach." (KERIConf26 caption, Ryan Hansen, Witnesses and Watchers, 12:17). No source states the concerns. The Foundation's witness repository carries a container build and Helm chart on a `v1.3.6` branch (`272ded4d3`), not on `main`. Its Ansible pilot runs "run-keripy-witness.sh → keri runWitness(...)" (witness-hk Ansible README > Architecture, L14 @39e1c3fc7), which reads as keripy's built-in witness rather than `witopnet`; that was not checked.

## 12. Running a witness: what the reference code does {#witness-code}

[code] The open witness serves one controller: a provisioned witness holds a "list of controller AIDs this witness serves (currently one)." (witness-hk witopnet/core/witnessing.py, Witness docstring, L471 @39e1c3fc7). Nothing in the specification requires that; the reasons are a vendor's (isolation, simple scaling), and "currently one" marks a present choice. No source argues a privacy rationale. And keripy's receiptor waits for every witness rather than the threshold, so one witness down can block receipting ([chapter 02, section 8](02-security-model-and-threat-posture.md#witnesses)); an operator sizing for F* = 1 does not yet get the benefit from the reference client.

## 13. The KERI Foundation and the vendor landscape, as of 2026-10-15 {#landscape}

### What exists {#landscape-exists}

[practice] The Foundation's open witness (`witness-hk`, package `witopnet`), watcher (`watcher-hk`, `watopnet`) and boot service (`kf-boot`) derive from healthKERI's donated code: "HealthKERI had developed Locksmith wallet, watchers and witnesses for their proprietary products." (KERIConf26 caption, Samuel Smith, State of the KERI Suite, 43:33); the desktop wallet is `locksmith`; `kf-registrar` and `kf-observer` are new ([section 2](#kf-registrar-observer)). The older `keri-foundation/observer` and `keri-foundation/registrar` repositories are still one-line placeholders, and raw/14's statement that neither service exists describes those two. Onboarding allocates a witness pool and a hosted watcher, then the wallet rotates its AID onto the pool (kf-boot README > Onboarding Flow @14c8f616e).

### What is promised {#landscape-promised}

Hosted test networks, "we'll be providing some witness and watcher networks on our own servers so that people who want to test it out can test it out" (KERIConf26 caption, Samuel Smith, State of the KERI Suite, 44:04), were not checked. One-click KERI was promised in 2024 within a year, "we hope to finish One-click-KERI in a year" (KF profile > When?, L23 @68a0d8883), and restated in April 2026 as "One click, it'll install KERI infrastructure for you." (KERIConf26 caption, Samuel Smith, State of the KERI Suite, 41:22). Per-ecosystem deployment recommendations were expected from the Foundation and not found. Jay Alexander Elliot's case for keeping wallet and provider plugins separate is the Foundation's openness claim: without that boundary, "the system may still look open on paper, but it becomes less open in practice" (KERIConf26 caption, Jay Alexander Elliot, Open KERI Infrastructure, 1:27).

### What does not hold {#landscape-does-not-hold}

Both package READMEs give `pip install witopnet` and `pip install watopnet` (witness-hk README > From PyPI, L34 @39e1c3fc7; watcher-hk README > From PyPI, L43 @9be717f8a), and PyPI returned 404 for both on 2026-10-14 and 2026-10-15. The services page says "That’s why we certify all code offered." (keri.foundation services page, fetched 2026-10-15); no certification process or list was found. Its FAQ explains its separate repositories: "The KERI Foundation decided to maintain its own repositories to focus more on further maturing the KERISuite" (keri.foundation FAQ > 3. Projects, fetched 2026-10-15).

## 14. What is established, what is contested, and open questions {#established-contested}

### Established {#established}

The role split, KAWA's inequality, the controller's propagation duty with watcher breadth as its defence, and witnesses as a thresholded second factor are normative; pool size, placement and operator are not. Discovery is untrusted and needs no network of its own. The specification has no mailbox.

### Contested or unresolved {#contested}

The diversity doctrine is synthesis from KAWA's independence assumption, carried only in captions and a model-authored analysis. The one-or-four recommendation is secondhand. Sam's container objection is hearsay with no stated reason. The vendor sense of eclipse is not the specification's.

### Open questions {#open-questions}

1. Is the per-witness mailbox in `witness-hk` vestigial ([section 9](#witness-hk-mailbox))?
2. What are Sam's security concerns about containerized deployment ([section 11](#deployment-stack))?
3. Does any watcher share first-seen KELs or duplicity evidence, as the specification's incentive argument assumes ([section 7](#watopnet))?
4. How does a confidential watcher set coexist with a vendor's shared watcher network ([section 7](#watcher-frame))?
5. Is one TOTP code across an AID's witnesses an acceptable instance of the per-witness factor ([section 5](#second-factor-trade))?
6. Does one witness per controller have a written privacy rationale, or is it purely operational ([section 12](#witness-code))?
7. Why does the registrar allow-list observers, and how does a verifier get an observer every relevant issuer will serve ([section 2](#registrar-departures))?
8. Which witness does the `witness-hk` Ansible pilot deploy ([section 11](#deployment-stack))?
9. Will the vLEI governance frameworks or the Foundation publish witness-count guidance ([section 4](#pool-size))?
10. Was KERIdemlia ever evaluated against DHT eclipse, Sybil attacks or lookup privacy ([section 10](#keridemlia))?

## Sources {#sources}

- background.md — KERI: Canonical Background for Security Analysis (v0), keri-security-analysis corpus, this project's own analytical model and never [spec]. WebOfTrust/keri-security-analysis, background.md, @149fa6c35 (2026-04-23), the repository's only commit. Quotes drop the source's markdown emphasis. Mined in raw/07 section 13.
- Censorship Resistance deck — Censorship Resistance of Permissioned Ledgers, Survivability Analysis, Phil Windley and Samuel M. Smith, IIW Fall 2019. SmithSamuelM/Papers, presentations/CensorshipResistance_IIW_2019_B.pdf, master @b47f21597; pages are PDF pages (raw/18's slide 3 is page 4). Mined in raw/18.
- CESR spec GitHub — Sam Smith's comment of 2026-03-19 on trustoverip/kswg-cesr-specification pull request #165 (R-011), read from the API cache of 2026-10-14 (`.ignored/sam-rulings-cache/`), preserving his typing ("iOut"). [proposal]. Mined in raw/21.
- dg-c01-claude.md to dg-c06-claude.md — model-authored analyses, keri-security-analysis corpus, @149fa6c35 (2026-04-23), cited only from their non-normative section 7 (Pragmatic CISO's Operational Plausibility Notes). Mined in raw/07 section 13.8.
- Hio deck — Hierarchical Asynchronous Coroutines and I/O, Samuel M. Smith. SmithSamuelM/Papers, presentations/Hio.web.pdf, master @b47f21597; pages are PDF pages. [proposal]. Mined in raw/18.
- KERI spec — Key Event Receipt Infrastructure (KERI) specification, Trust Over IP. trustoverip/kswg-keri-specification, spec/spec-body.md, main @fbdd4a615 (2026-08-28); the absence of "mailbox" was checked on main and on v1.1 @3753f3797 by raw/18. Mined in raw/01 and raw/18.
- KERIConf26 caption — hand-corrected auto-captions of the KERI Conference 2026 talks (2026-04-22 to 23), keri-foundation/CONF26-subtitles @006042d (2026-10-04). Quoted as the captions read, for intent and framing only; times are cue starts. Where a quote comes from a Q&A after someone else's talk, the locator names the talk and the text names the speaker. Mined in raw/14 and raw/18.
- KERIdemlia paper — WIP: Keridemlia White Paper, Ryan W. West and Samuel M. Smith, 2021. SmithSamuelM/Papers, whitepapers/keridemlia.pdf, master @b47f21597. Quotes checked against an OCR of an unreadable text layer. [proposal]. Mined in raw/18.
- keripy — the KERI reference implementation, WebOfTrust. WebOfTrust/keripy, main @927c0cb87 (2026-10-10): src/keri/app/indirecting.py, src/keri/kering.py, src/keri/app/agenting.py. Mined in raw/18.
- keripy GitHub — Sam Smith's comments in WebOfTrust/keripy: issue #1559 (2026-07-31, R-008), issue #855 (2025-12-03, R-010) and pull request #1323 (2026-03-12, R-070), read from the API cache of 2026-10-14. [proposal]. Mined in raw/21.
- keri.foundation services page and FAQ — https://keri.foundation/about/services/ and https://keri.foundation/faq/, fetched 2026-10-15; the fetch date is the pin. [practice]. Mined in raw/18.
- KF profile — the KERI Foundation's GitHub organization profile. keri-foundation/.github, profile/README.md, @68a0d8883 (2024-07-20). [practice]. Mined in raw/18.
- kf-boot README and kf-boot setup guide — keri-foundation/kf-boot, README.md and setup-guide.md, main @14c8f616e (2026-09-11). Product rules are vendor policy. [practice]. Mined in raw/18.
- kf-observer README — keri-foundation/kf-observer, README.md, main @d6368aef9 (2026-10-08). README only. [practice]. Mined in raw/18.
- kf-registrar README — keri-foundation/kf-registrar, README.md, main @bf14eac4d (2026-10-09). README only. [practice]. Mined in raw/18.
- Percolation deck — Invasion Percolation Discovery, OOBIs, Spanning Trust Layer, Samuel M. Smith, IIW 2021 B. SmithSamuelM/Papers, presentations/KERI_Percolation_OOBI.web.pdf, master @b47f21597; pages are PDF pages. [proposal]. Mined in raw/18.
- Trust Bases deck — Verifiable Trust Bases, Renewing the Web of Trust, version 2.53, Samuel M. Smith, 2020-10-20. SmithSamuelM/Papers, presentations/KERIVerifiableTrustBases.web.pdf, master @b47f21597; pages are PDF pages. [proposal]. Mined in raw/18.
- watcher-hk — the KERI Foundation's watcher, package `watopnet`. keri-foundation/watcher-hk, main @9be717f8a (2026-09-25), README.md and src/watopnet/app/watching.py. README claims are [practice]; src/ is [code]. Mined in raw/18.
- witness-hk — the KERI Foundation's witness, package `witopnet`, healthKERI's donated code. keri-foundation/witness-hk, main @39e1c3fc7 (2026-09-29), README.md, docs/developer-guide.rst, ansible/README.md, src/witopnet/core/witnessing.py and src/witopnet/app/indirecting.py; branch `v1.3.6` at `272ded4d3` (2026-09-28) for its container files. README and guide claims are [practice]; src/ is [code]. Mined in raw/18.
