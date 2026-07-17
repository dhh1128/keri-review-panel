# Steering note: decentralization purity & the microledger journey

> Source: Daniel Hardman, in-session guidance (2026-07-17). This is HUMAN steering, not a
> mined source. It exists because no single canonical source tells this story cleanly; the
> doctrine's treatment of it must be QC'd against this note and, where the mined sources fall
> short, AUTHORED — sourced where possible (candidate: the KERI spec's KAWA section), and
> flagged as interpretive where it is not directly on the page.

## The thesis this must capture

1. **Blockchains were the original "decentralized" story.** Much of what still calls itself
   "decentralized identity" carries blockchain thinking: a global ledger, global consensus on
   whether/when an event is recorded, "on-chain" as the seat of truth. That mental model is
   pervasive and, in KERI's terms, wrong.

2. **True decentralized architectures share DATA-STRUCTURE ideas with blockchains, but split
   the ledger.** They keep the hash-chained, append-only, tamper-evident log — and then break
   "the one big blockchain in the sky" into **microledgers scattered all over the place**. In
   KERI those microledgers are the per-identifier KELs, replicated/held by **witnesses** and
   **wallets**. There is no single global chain; there are many small ones, each rooted in its
   own identifier.

3. **So KAWA's "consensus" is a different question than blockchain consensus.** This is the
   crux, and the easiest thing to get wrong:
   - Blockchain consensus decides **whether — and in what global order — an event gets
     recorded** (inclusion + total ordering across all participants).
   - In KERI the event is **already recorded** by the controller on its own microledger. KAWA
     does **not** ask "should this be recorded?" It asks: **"is any of the decentralized actors
     trying to fork reality *after the fact*?"**
   - That is **detection of equivocation, not prevention of it** — of a piece with
     survivability-not-invulnerability and detection-not-prevention. Witness agreement gives
     local durability and a fixed point against which a later fork becomes *evident*; it does
     not make forking impossible.

4. **The shibboleth.** Expecting KERI to behave like a blockchain — global ordering, a single
   canonical truth, on-chain consensus, "where's the chain / why no consensus layer?" — is the
   category error. The KERI-correct reframing: **microledgers + duplicity-evidence**, not a
   global ledger + consensus. A reviewer who reaches for blockchain intuitions here will be
   dismissed, with justification.

## Where this must show up in the artifacts

- **bible/01-foundations-and-worldview** — the microledger journey as part of "what
  decentralization actually means" and where the mainstream diverged.
- **bible/02-security-model-and-threat-posture** — KAWA framed as after-the-fact fork
  *detection*, explicitly contrasted with blockchain consensus-on-inclusion.
- **bible/07-shibboleths-and-anti-patterns** — a dedicated row (blockchain/consensus intuition
  → category error → microledger/duplicity-evidence reframing).
- **keri-doctrine.md** — at least one load-bearing claim, plus a shibboleth-table row.

## QC test (apply after the run)

Grep the bible + doctrine for: `microledger`, `blockchain`, `consensus`, `fork`, `global
ordering`, `already recorded`. The passage is adequate only if it makes claim (3) explicitly —
that the event is already recorded and the consensus question is post-hoc fork detection, not
inclusion. If that specific distinction is missing or muddied, AUGMENT.
