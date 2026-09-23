+++
date = '2026-06-13'
title = 'What Tests Should Guard'
categories = ['Thoughts']
tags = ['Testing', 'Engineering', 'Philosophy', 'Programming']
summary = 'A test that compares a function to itself proves nothing. That tautology sent me down a rabbit hole on what tests are actually for, and where the line sits on testing private code.'
draft = true
+++

# A test that guards nothing

I was cleaning up a mapper test and found this line:

```go
assert.Equal(t, nzUUID(testLeadID), nzUUID(testLeadID))
```

Same function. Same input. Both sides. It passes. It will always pass. It would pass if `nzUUID` returned garbage, as long as it returned the *same* garbage twice. The test asserts that a deterministic function is deterministic, which I already knew.

Easy to delete and move on. But it nagged at me, because the thing it was *trying* to do - confirm that a UUID parses and round-trips - is a real behavior worth pinning. The fix was to assert against something the function doesn't get to define:

```go
got := nzUUID(testLeadID)
assert.NotNil(t, got)
assert.Equal(t, testLeadID, got.String())
```

Now the test has an opinion the implementation can't satisfy by accident.

<!-- TODO: maybe tighten this opener - the code is doing a lot of work, want to make sure the "asserts against something the function doesn't define" idea lands clean -->

# The question underneath

`nzUUID` is a private function. Unexported, lives next to the mapper it serves. And the higher-level mapper test - the one that builds a full `Lead` and diffs it against an expected object - already exercises `nzUUID` on the happy path. So why test the private function at all?

That's the actual question. Not "was the assertion bad" (it was), but: if the higher-level test already walks through some of these branches, do the lower-level private tests earn their place? Is it fine for some branches to be covered up top and some only down low?

There are a few camps here, and I don't think they're all wrong.

# The case against testing privates

The purist position: test through the public surface only. Privates are implementation. The moment you write a test against `nzUUID`, you've nailed that function in place. Tomorrow you want to inline it into the mapper, or rename it, or fold three helpers into one - and now you're editing test files for a change that didn't alter a single observable behavior.

Tests should be a safety net for *behavior*, the argument goes, not a cast around *structure*. Every test against a private is a small bet that the private will keep existing. Make enough of those bets and refactoring stops feeling free.

<!-- TODO: Naren - this is the strongest version of the against case I can make. Do you buy it? Where does it overreach? -->

There's a real cost they're pointing at. I've felt it - the test suite that screams on a rename even though nothing broke. That's not coverage, that's friction wearing a coverage costume.

# The case for testing privates

The other camp - the one I lean toward - says the unit of value isn't "public vs private", it's **branch coverage that constrains intent**.

`nzUUID` has three branches: empty string returns nil, malformed string returns nil, valid string parses and returns a pointer. Three decisions. If those three behaviors matter - and they do, because the whole point of the function is to drop bad input rather than crash - then I want three test cases that say so by name.

The happy-path mapper test covers exactly one of those branches. The other two - empty and malformed - are invisible from up top unless I construct a full lead with a deliberately broken UUID, which is a lot of ceremony to exercise one `if`. And worse: that coverage is *incidental*. Nobody decided to test the malformed case. It just happened to ride along. The day someone adds a new mapper that skips the nil guard, the gap opens silently and no test goes red.

A focused test on the private function makes the contract explicit and durable. It survives whoever calls the function next.

# The litmus test I keep coming back to

Here's how I decide whether a test is guarding intent or just guarding structure:

> If I deleted the function's body and had to rewrite it from the test cases alone, would I reproduce the same behavior?

If yes, the test captured the intent. Delete the implementation, the tests still describe what you wanted, and any correct re-implementation makes them pass again. That's the property I actually care about. The test isn't married to *how* the function works - it's married to *what it decides*.

If no - if the test only passes because of how the code happens to be shaped - then it's testing implementation detail, and it'll fight you on every refactor.

By that test, `nzUUID` deserves its three cases. They describe three decisions, and a from-scratch rewrite would have to honor all three. Something like a one-liner wrapper around `strings.ToUpper` does not - there's no decision to guard, so a dedicated test is just noise.

# So the rule isn't about visibility

That reframes the whole thing. "Don't test privates" was always a proxy for "don't test trivial mechanical glue". The visibility of the function is the wrong axis. The right axis is: **does this thing make a decision?**

- Branching, fallback, error handling, normalization -> worth a test, public or private.
- Pure field-wiring, delegation, a rename of someone else's call -> not worth its own test; the integration path covers it for free.

Test at the narrowest scope where a real decision lives. Branch coverage is the constraint, and the constraint is what carries the developer's intent forward after the developer is gone.

<!-- TODO: Naren - the back half might want a concrete table or the actual mapper.go function list (nz, nzUUID, parseTime, toStatus, toLob, toBrand, toStatusReason) showing which earn a test and which don't. I have that breakdown from our session if you want it in. -->

# The part I'm still chewing on

The honest tension: the litmus test tells you what *can* be guarded well, not how much coverage you *should* chase. 100% branch coverage on glue code is a waste. 60% on decision-heavy code is a hole. The number was never the goal - it's whether each branch that survives makes a decision worth defending.

<!-- TODO: this ending is close but might be one beat too tidy. The "so what" should probably sit with the discomfort rather than resolve it. Naren to gut-check the landing. -->
