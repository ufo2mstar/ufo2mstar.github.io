+++
date = '2026-02-20'
title = 'Introducing Ellie: A new agent for DeepWorker'
slug = 'new-personal-aissistant'
categories = ['DeepWorker']
tags = ['AI', 'Agents', 'DeepWorker']
summary = 'A concept sketch for a personal AI assistant built around review cadences - daily, weekly, monthly, quarterly - rather than one-off chats.'
draft = true
+++

# The problem I was trying to solve

Most days end with a vague sense that things happened. Meetings, Slack threads, a couple of MRs, a half-formed idea I told myself I'd come back to. By Friday I can't tell you what mattered. By month-end I can't tell you what I learned.

The usual fixes - journaling apps, OKR docs, a dozen tabs of half-filled templates - all share the same flaw: they're storage, not thinking. They wait for me to bring the discipline. I don't, reliably. Nobody does.

Ellie is my attempt at the other thing: an AI assistant that isn't waiting to be asked, doesn't dump a wall of summary at me, and is structured around **the cadence at which review actually pays off**.

## In comes the AIssistant

A persona plus a set of workflows. A warm, opinionated chief-of-staff who knows my context. The workflows are short, named rituals that run at fixed cadences and produce one artifact each.

That's the whole concept. The interesting part is the cadence map.

## The cadence map

Here's the rhythm. Each entry is a named flow. The point isn't the names - it's that there's a deliberate beat for each horizon, and each beat produces one focused artifact rather than ten generic ones.

### Daily

- **Morning startup.** Reads yesterday's leftover items, recent activity, anything I brain-dumped overnight. Produces today's short list - five to seven items, time-estimated, sorted by what's actually due. Pushes back if I've sketched a 12-hour day.
- **Evening shutdown.** Reads what I checked off, what I didn't, and what came up. Updates the backlog. Captures lessons worth keeping. Closes the day so tomorrow can start clean.
- **Thoughts capture.** A low-friction inbox for half-formed ideas during the day. No formatting, no questions back. Things get triaged later, not in the moment.
- **Meeting digest.** Takes a transcript and produces a structured summary - decisions, action items, who said what. Optionally a Slack-ready debrief for the team.

### Weekly

- **Refine.** Mid-week or end-of-week. Reviews the backlog with fresh eyes, prunes what's gone stale, sequences what's next. Prepares the week ahead.
- **Review.** A reflective pass. Not a status report. What pattern emerged this week? What did I avoid? What surprised me? Produces something I can actually re-read in six months.

### Monthly

- **Carryover.** End of month. Archives the current backlog, seeds next month's with what's still alive. Forces a small rotation - what graduated, what got abandoned, what crossed over.
- **Monthly review.** Same structure as weekly, longer arc. The questions are different at this scale - "what am I building toward?" replaces "what shipped this week?"

### Quarterly and annual

- **Quarterly review.** Goal alignment check. Bigger zoom-out. The flow is the same shape as the weekly and monthly versions, just with bigger questions and more ruthless pruning.
- **Annual review.** Once a year. The corpus from twelve months of weeklies is the raw material. The point isn't to summarize it - it's to notice what the year actually was, which is almost never what I'd have predicted in January.

### Per-session

- **Harvest.** At the end of any working session with the assistant - extract the patterns, voice shifts, and lessons that came up in the conversation itself. Folds back into the persona over time. The assistant gets a little better at knowing me with each session.

## Why cadences, not "ask me anything"

The default mode for AI assistants is open chat. You ask, it answers. That's fine for one-off questions, but it's terrible for self-review. You don't get better at self-review by being available; you get better by sitting down at predictable intervals to do specific work.

Cadences are the forcing function. The assistant's job is to make showing up at the cadence cheap - cheap enough that I actually do it - and to make the artifact useful enough that I don't dread it.

Three properties fall out of this:

1. **Each flow has one job.** Morning isn't reflection. Reflection isn't planning. Planning isn't archiving. Conflating them produces mush.
2. **Each flow produces one artifact.** A briefing, a refined backlog, a review note, a meeting summary. Files I can grep. Not a chat log I'll never re-read.
3. **The cadences nest.** Daily feeds weekly feeds monthly feeds quarterly. The annual review is just the quarterly one with more material. Nothing's invented at the top - it's all aggregation of small honest entries underneath.

## Why a persona, not just scripts

You could build all of this with cron jobs and templates. People do.

What you'd lose is the part that actually carries me through a bad week: an assistant that notices when the third week in a row had no deep work, and says so. That pushes back when the plan doesn't add up. That matches energy when something landed well, and acknowledges drag when it didn't.

The persona isn't decoration. It's what makes the cadence sustainable across the months when motivation is low and the backlog is ugly. A neutral status report doesn't survive that. A thinking partner does.

## What this post is and isn't

This is the concept. It's deliberately quiet on the wiring - which models, which storage layout, which prompts, which guardrails. Those are real engineering choices and I'll write them up separately when each one is settled enough to be useful to someone else.

If you're building something similar, the takeaway I'd offer is: **start with the cadence, not the tooling.** Pick the four or five horizons that actually matter to you, define the artifact each one produces, and only then decide what software does the work. The shape of the system is the cadence map. Everything else is implementation detail.

<!-- TODO: link to follow-up posts as they get written - probably one on the persona/voice design, one on the file/vault structure, one on the model-routing and cost discipline -->
