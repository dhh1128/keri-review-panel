# Provenance markers {#legend}

Vendored from keri-bible docs/house-style.md by sync-reference.sh; edit it there.

A marker says what kind of evidence a claim rests on. Each kind answers a different question, so the markers are not a ranking, and only `[spec]` says what conformance requires. A claim carries the marker of the evidence it actually has and never borrows a stronger kind, even when a specification editor makes it in a discussion; changing a marker needs new evidence at a named commit. Older text sometimes calls a marker's kind its tier. A marker is written plain, with no bold and no code span.

- `[spec]`, normative. The text is in the line of a specification that the community is actively standardizing, its `main` branch.
- `[spec-next]`, forward branch. The text is in a specification's `v1.1` branch and not in `main`. It is new thinking that is likely, not certain, to become normative, and it binds nobody today.
- `[code]`, implemented. An implementation (keripy unless named otherwise) behaves this way at a named commit. Code is evidence about code, not about what the specification requires.
- `[proposal]`, proposed. A design stated in a discussion, issue, pull request, whitepaper or code on an unmerged branch, and in no specification. However confident its author, it binds nobody.
- `[practice]`, vendor or deployment practice. What one organization's product, service, schema set or deployment does. Evidence of how the doctrine survives contact with practice; never evidence of what KERI is. It covers deployment evidence and applied schema sets such as bakobo/schema.
- `[architect]`, Sam Smith in his own voice outside a specification: keri.one, his conference talks, and personal communications. It carries his intent, which is often exactly what a reviewer needs, and it is not normative.

Unmarked text has one meaning everywhere. A specification citation with no marker is to that specification's standardizing line, and so means `[spec]`. A claim with neither a marker nor a citation is the chapter's own synthesis, the weakest kind of evidence in it.

Code that exists only on an unmerged fork is a proposal made in code, so it is cited as `[proposal]`, with the fork, branch and commit in the locator. Older raw notes call this `[K-fork]`.

