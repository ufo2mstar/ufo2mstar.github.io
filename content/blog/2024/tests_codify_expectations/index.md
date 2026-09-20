+++
date = '2024-04-20'
title = 'Tests Codify Expectations'
categories = ['Thoughts']
tags = ['Testing', 'Engineering', 'Programming']
summary = 'Code says what it does. Tests say what it should do. Comments, if you need them, say why. A testing shape I keep coming back to: unit, narrow integration, broad integration - and why most of the confidence lives in the middle.'
draft = true
+++

# What tests are for

Code says what it does.
Tests say what the code should do.
Comments can say why it was done that way.

That's the whole philosophy, and it is older than any framework. When I write a test I'm recording an expectation. It clarifies my own thinking in the moment. It tells future-me (and everyone else) what this thing was *meant* to do. And it is the safety net that makes refactoring feel like refactoring instead of Russian roulette.

Keep them simple. Simple tests are the ones that still work as documentation six months later. Fancy tests are the ones nobody wants to fix when they go red.

This is the pre-req I keep putting under <a href="/blog/2024/04/16/get_to_the_root_cause/">observability</a>. Observability is how you find out production drifted. Tests are how you refuse to ship the drift.

# The units being tested

Most of the systems I work on are the same two shapes:

- A **server** - handlers at the edge, request in, response out.
- A **worker** - something pulling from a queue or a schedule, doing a job.

Plus the leftover pile: scripts, SQL, one-off jobs. Those count. They just don't get a framework around them for free.

Inside a processor the layers tend to look like: the service that owns the use case, the bits that map data, the clients that talk to other systems, the persistence, the config. Test at the layer where a **decision** lives. A mapper that copies fields is not a decision. A mapper that drops malformed input is.

<!-- TODO: this is the 2024 version of a question I chewed on harder later - see content/blog/2026/what-tests-should-guard. When both are out of draft, link them. The later post is the litmus; this one is the strategy. -->

# Tenets

1. **Fast and reliable.** They finish in a timeframe that doesn't make people skip them. They don't flap. A flaky test is a test you will start ignoring, which is worse than no test.
2. **Readable and maintainable.** A new person can change one without a scavenger hunt. Patterns stay consistent so the next test is copy-shape, not copy-paste-and-pray.
3. **Appropriate coverage.** The mix is the point. Lots of unit, a solid band of narrow integration, a thin strip of broad/E2E. Not a pyramid drawn on a slide and then inverted in CI.
4. **Informative.** Failure messages say *what*. I can reproduce it locally. "expected true, got false" is a missing assertion message, not a test.
5. **Isolated.** Unit and narrow-integration tests don't need the rest of the universe running. If they do, they're a different kind of test and should be honest about it.

# Three kinds, on purpose

**Unit.** One function, or a small cluster that wants a name. Happy path and the edges. Table-driven when the cases are the same shape with different numbers. This is where most of the edge-case combinatorics live, because the setup is cheap.

**Narrow integration.** Components talking to each other *inside* one service. External world is stubbed at the boundary. Mixed scenarios, the awkward cases that are painful to set up as a pure unit and dishonest to wait for E2E to stumble into. Repeatable because the system-under-test is yours.

**Broad integration / E2E.** Cross-service. Happy path, mostly. Run periodically, or as a sanity check, not on every commit. These are how you notice "the contract between us and them drifted." They are also how you burn an afternoon on someone else's staging flake. Budget them accordingly.

Narrow tests give you coverage and isolation. Broad tests give you the system-shaped behaviors narrow tests will lie about (or never see). Broad tests also false-negative more - too many moving parts. Narrow tests false-positive more on "the whole system" questions, because they never asked those questions. Use both. Don't pretend either is complete.

CI runs unit + narrow, every time. Broad runs on a slower cadence. `integration` as a build tag, not a cute synonym. Names that say what they are: `Test_*`, `TestInteg_*`. Subtests so a table isn't a wall. Stub the boundary; don't mock every noun. Behavior, not implementation.

# A shape I like

```go
func TestMyFunction(t *testing.T) {
	t.Run("HappyPath", func(t *testing.T) {
		t.Run("TableTest", func(t *testing.T) {
			// cases: name, in, out
		})
	})
	t.Run("ErrorCases", func(t *testing.T) {
		// the terminal failures
	})
	t.Run("EdgeCases", func(t *testing.T) {
		// only the ones that earn a name
	})
}
```

That's enough structure. Happy, error, edge. Tables where the variance is data. Nothing clever.

# The nits that keep coming up

**Stubs over mocks,** most of the time. Stubs are data. Mocks are behavior-verification, and they couple you to *how* the collaborator was called. Save that for the rare case where the interaction *is* the spec.

**Complexity is a test smell and a code smell.** Cyclomatic hot spots are where tests get gnarly because the code got gnarly. Refactor the code. Don't celebrate a 40-case table that exists because nobody split the function.

**Golden files / JSON fixtures** for fat payloads. Readable. Diffable. Less setup soup in the test body.

**Sunset the strategy.** After a paradigm shift - new runtime, new style of service, new "we don't do it that way anymore" - the old mix is probably wrong. Put a date on revisiting it. Status quo is not a tenet.

# So what

A test that doesn't add a constraint, or that nobody can fix when it fails, is slowing you down. The question I want in my head while writing one: will someone understand what this code is *supposed* to do, six months from now, from this file alone?

If yes, keep it. If no, it's noise wearing a `Test` prefix.

<!-- TODO: Naren - the original had diagrams for "test breakup" and "wire improvements" that didn't survive the export. If those still exist, dropping a simplified version here would help; otherwise this post stands on the three-kinds split. -->
