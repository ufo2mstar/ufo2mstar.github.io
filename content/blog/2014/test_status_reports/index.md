+++
date = '2014-11-14'
title = 'FedEx Day 2014: Killing the Daily Test Status Email'
categories = ['Idea', 'Reco']
tags = ['Hackathon', 'Testing', 'Automation', 'Dashboard', 'RubyOnRails', 'JavaScript']
summary = "A 24-hour FedEx Day project from late 2014: replace the daily manual QA status email with a live dashboard backed by a central test-results database. Posting the artifact - video, project notes, and full transcript - so it doesn't only live in YouTube view counts."
draft = false
+++

## Why I'm posting this now

This is a small artifact from late 2014 - a 24-hour FedEx Day hackathon at work where a few of us built a proof-of-concept test status dashboard. There's a video of the demo I uploaded back then.

A lot of what we proposed - push test results into a central store, make the daily status report a live filterable view, drill from a red dot back to a failing scenario - is the kind of thing that's now table stakes in any half-decent CI/observability setup. In 2014, on this team, we were mailing out an Excel sheet every morning. The gap between those two states is the interesting part.

## The video

{{< youtube qhlLEZPUlQY >}}

## What we built (in 24 hours)

**The problem.** QA status reports were compiled manually into a spreadsheet and emailed out daily. It was a hangover from when scripts lived in QC and the export was one click. With a real automation framework underneath, the manual step had become slow, error-prone, and a chore for whoever owned the email that week. The tables themselves weren't fun to read either.

**The solution.** A central database that test runs push into directly, plus a small web dashboard on top of it. No more daily email. You go to the dashboard and slice the data however you want.

**How it worked.**

- Automated scripts pushed scenario-level results (title, pass/fail, environment, state, timestamp, eventually scenario steps) into a central DB sitting on a machine in Plaza 2.
- The dashboard was a Rails app talking to that DB, with a plain JavaScript front end making AJAX calls and rendering with Google Charts.
- You could filter by state, environment, date range. Long-term trends popped out: a sudden cluster of failures across multiple states meant a service had probably just gone down.
- During the demo, an iPad regression suite from the previous night actually showed exactly that pattern - a clean break from Connecticut to Maryland that was a downstream service falling over, not a test bug.

The whole thing was a proof-of-concept. The point wasn't the polish, it was that the data model and the dashboard could obviously absorb a lot more once the pipe existed.

## What we wanted to do next

From the closing slides:

- Tag results with work request numbers, story cards, releases - so you could ask "what's the regression health of release X?" instead of "how did the team do this week?"
- Tag by intent (regression vs continuous improvement) so the dashboard could segment the views.
- More chart types - pie, line, comparison - and customizable tables.
- Export the filtered view back to Excel so the people who wanted the email could still get something email-shaped.
- Point a regression suite at production for fast P0 triage. Same pipeline, different environment - the dashboard wouldn't know the difference.

Most of these are easy in retrospect because the spine - results in one place, queryable - was the hard part, and we'd already built it.

## What I'd say about it now, twelve years later

The lesson that travels is small: the moment you have *any* automation producing structured output, the daily status email is already a smell. You're paying a person to do an ETL job that the machine wants to do for free, and you're losing the granularity along the way (the email tells you "92% pass" - the database can tell you which 8%).

The other thing I notice rewatching this: the architecture is laughably modest (one VM, a Rails app, Google Charts) and that's exactly why it shipped in a day. There was no "let's pick an observability platform" meeting. The team had a problem on Monday, a working dashboard on Tuesday, and useful conversations with stakeholders on Wednesday. I want to remember that ratio.

---

## Appendix: full transcript

YouTube's auto-generated transcript doesn't tag speakers, so I've broken it into logical speaker blocks based on the conversation flow.

**[00:00:02] Cameraman:**
Okay, action.

**[00:00:09] Naren - Introduction:**
Yesterday's FedEx Day went very well. I got the opportunity to see the facets of actually managing a project, and I think I did a fair job of:

1. Assembling a great team of talented developers
2. Sporting a tensed look while meeting the one-day deadline
3. Having 1-on-1s
4. Approving Clarity timesheets (haha, audience interests piqued)

About this project: I had the wonderful opportunity (or terrible misfortune, depending on whom you ask) of working on the testing status report recently, and realized this could be done better - especially since we're doing automation anyway. Hence this project. My awesome team will talk about it.

**[00:00:55] Ryan - The problem:**
You can see here how we're currently doing our testing status reports. We have this spreadsheet - it's a relic of when we kept our scripts in QC and exported everything into here. It was a great process back then because everything was in QC; you just clicked a button and there you go. But today, with our automation frameworks, this is a hassle. It's often inaccurate, a little slow, and it requires somebody to compile an email and send it out every day, which adds up to a lot of time. The tables aren't the greatest to interpret either. So, our solution - I'll let Ren talk about it.

**[00:01:48] Naren - The solution concept:**
I felt the reports didn't really correlate with what we were doing in automation. So I wanted to start pumping data into one central DB, and eventually scope it so we put all of that together and actually generate reports off it. This is a proof of concept.

**[00:02:09] Mark - Live demo and architecture:**
Let's take a look at the actual tool. The old way, you received an Excel spreadsheet pushed out to you - you may or may not have been interested in it. This way, you go to the dashboard we've set up and generate your own daily report however you want to look at it.

This is real data coming from the renter's team, by state - number of tests executed, passed and failed, just from yesterday. We can break it down by state, by environment. We can go back farther: maybe I want a long-term trend, so I go back 30 days, and the trends start to jump out. Something's going on in Kentucky - I can drill in and ask what's happening. Generate data on the fly like that.

Right now this is a single report, by state. That may or may not be interesting to everyone. In the future you could easily imagine slicing by work request number, by team, by app - any way you want. It'd be pretty simple to build up.

Going back to the architecture diagram: when testers run their automation (just the renter's team right now, but easily extended), it compiles the results of each scenario and sends them to a database sitting on a machine in Plaza 2. The dashboard is an app on my computer talking to that DB and pulling the data back.

**[00:03:55] Audience member - Qtn:**
So do you guys manually update that database?

**[00:03:59] Naren and Team - Ans:**
No, it's automated already.

**[00:04:01] Ryan - Live demo continued:**
If you look at the results here - we ran our iPad regression last night, so these are all the results from that. You can see, starting at Connecticut through Maryland, it appears the service went down and we had a lot of fails. You can get a good overview of the past day - we know we did this, let's look at it, get a quick snapshot of what likely happened.

**[00:04:30] Naren - Add:**
What you're seeing here is just a tiny fraction of what we actually have in the database. We collect pretty much all the information.

**[00:04:40] Mark - Live demo wrap-up:**
Hopefully that gives the idea - a snapshot of the health of your applications. As I said, we can extend this to work request numbers, story card numbers, any way you want to look at it. Basically dynamic. Now, next steps.

**[00:04:48] Blake - Next steps:**
Right now this is just what we got done yesterday, but you could really start looking at more. Compare work requests - you don't even have to do pass/fail. You could say, for each card in the work request, these scenarios were accomplished, this many were ready for the story card release. You could look at certain tags - regression, or continuous improvement.

We also want more options for viewing the data: pie charts, line graphs, tables, comparison charts. Whatever you can build with the data.

**[00:05:35] Team - Conclusion and call for feedback:**
When we get this out to more teams, we'll see a lot more innovation coming from it. We'd also like feedback from the business - what kinds of stats would you like to see? This dashboard can be used in many different ways. That's the end of our presentation. Any questions or suggestions?

*The remainder of the recording is an open Q&A about drill-down capabilities, front-end stack, pointing the suite at production, and exporting filtered views to Excel, with team members answering interchangeably.*
