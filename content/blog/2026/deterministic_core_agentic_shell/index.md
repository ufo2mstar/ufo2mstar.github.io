+++
date = '2026-07-04'
title = 'Deterministic Core, Agentic Shell'
categories = ['Thoughts']
tags = ['AI', 'Agents', 'Determinism', 'LLM', 'Engineering', 'Testing', 'Programming']
summary = 'I asked my agent for the backlog as one checklist. It checked git instead of the plan and found the plan had rotted. That small lie sent me looking for where correctness is supposed to live when a machine writes most of the code.'
draft = true
+++

# The plan had quietly lied to me

I asked a small question. "Give me the whole backlog as one checklist." I wanted a flat list I could squint at over coffee.

The agent didn't read the markdown plan. It read git. And it came back with an awkward little report: half the items marked "in flight" were already shipped, and two entire finished features weren't on the board at all. The map had drifted from the territory while I wasn't looking.

The reason is dumb and structural. I run these builds across parallel sessions. The hand that finishes the work is almost never the hand that updates the plan. Session A lands the feature. Session B, hours later, is still reasoning off a plan that says the feature doesn't exist. Nobody lied on purpose. The prose just went stale the moment the code moved, and prose has no way to notice.

I sat with that longer than the bug deserved. Because it isn't really a bug, but a symptom.

## Prose control flow rots. Every time.

Here's the thing I keep relearning. When the logic that decides *what happens next* lives in prose - a markdown plan, a system prompt, a paragraph of instructions to an agent - it drifts. There is no compiler for a plan. Nothing fails when it goes wrong. It just gets a little more wrong every day until someone reads it closely and winces.

David Khourshid put a name on this in a talk called "Goodbye slop, welcome determinism," and the name stuck in my head. Stop putting your application's control logic inside the AI prompt. Put the AI prompt inside your application's strict control logic. Deterministic core, agentic shell.

The LLM is a fancy utility function trapped in a box. Brilliant at the fuzzy bit - read this audio, name this speaker, summarize this call. Useless as the thing that decides the job is done. You don't let the utility function set the control flow. You call it, you check what it gave you, and *your code* decides the next state.

## I was already doing this. I just didn't have the words.

The funny part is I'd built exactly this shape in my transcription project without ever naming it.

The pipeline has a real state machine. A job goes `queued -> running -> done` or `-> failed`. Whisper and the diarizer live at the very edge of that machine. They return data. They do not get a vote on whether the job succeeded. The model fills in content. The state machine decides what's true.

That's the whole philosophy, sitting in my own repo, and I'd never once said it out loud.

## The bug that started all of it

Rewind to the thing that kicked off the session. A job asked for `diarize: true` - split the transcript by speaker. The backend it landed on couldn't diarize. So the flag got silently dropped, the transcript came back without speakers, and the job reported **success**.

Say that in state-machine terms and it stops being a whoopsie and becomes a real defect: a transition fired while its invariant was false. The job reached `done` without delivering what was asked. `done` is supposed to *mean* something, and here it meant nothing.

And notice what the fix is not. It's not a better prompt. It's not "please try harder to diarize." The fix is to make the illegal transition impossible in code. If you can't honor `diarize: true`, you don't get to reach `done` - you fail, loudly, and you fail *before* the expensive compute, not after burning minutes on a GPU to produce the wrong artifact. Catch the broken promise at the gate, not at the till.

## Two little machines, same idea

So in the same session I ended up building two things, and only afterward did I see they were the same move pointed at two different problems.

One is executable specs that gate correctness. An unmet promise shouldn't be a comment or a `# TODO` or a line in a plan. It should be a failing test, sitting there red. "What's left" stops being something I track by hand and becomes a question the test suite answers. The invariant a user relies on - if you ask for speakers, you get speakers or you get told no - is now a thing the machine holds, not a thing I remember to remember.

The other is a drift checker for the plan itself. Status gets derived from git, never typed by hand. The board can't quietly lie again, because no human is transcribing "done" into it - the tool reads the commits and tells you the truth.

And the tool's own guts ended up mirroring the split it enforces: a pure, tested core that does the real reasoning, wrapped in a thin shell that touches the disk and the network. The philosophy went fractal on me. Deterministic core, agentic shell, all the way down.

## Why this one actually lands for me

I've wanted this for years and never quite pulled it off end to end. State the invariant a user leans on. Make the gap between what I *meant* and what the code *does* visible and mechanical. Let both the plan and the code get checked against ground truth, instead of asserted by a tired human at midnight who's pretty sure it's fine.

The shift is in where trust comes from. It used to be: I trust the AI's output because it looks right, and because when I catch it being wrong it admits fault and apologizes very nicely. That's not trust. That's me squinting at a diff that grows faster than I can read it and signing off out of fatigue.

The other kind: I trust it because a machine that reads every single line stands between generation and landing. The test is unbothered by how confident the prose sounds. The drift checker doesn't care that the plan *says* done. Correctness stops being something a human certifies by vibes and becomes something the system holds itself to.

That's the relief of it. And, honestly, the rigor of it too - the machine is a harsher reviewer than I am at midnight, and it never gets tired. I'll take the harsh reviewer. (This same thread is why I've been chewing on <a href="/blog/2026/06/13/what-tests-should-guard/">what tests should actually guard</a> - a test that just agrees with the code proves nothing; the interesting tests are the ones pinning down a promise.)

<!-- TODO(naren): the cross-link to "what tests should guard" points at /blog/2026/06/13/what-tests-should-guard/ - that post is still a draft and its folder still uses dashes. Confirm its final slug/date before publishing this one, or the link 404s. -->
Let the model be brilliant and fuzzy at the edge. Keep the deciding in code. Bank it.
