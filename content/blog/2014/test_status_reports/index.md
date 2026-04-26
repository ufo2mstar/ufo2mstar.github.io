+++
date = '2014-11-14'
title = 'FedEx Day 2014: Killing the Daily Test Status Email'
slug = 'test_status_reports'
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

**[00:00:02] Cameraman / Room:**
okay action

**[00:00:09] Speaker 1 (Introduction):**
Yesterday's FedEx Day went very well.
I got the opportunity of seeing the facets of actually managing a project you know i think i did a fair job of:
1. assembling a great team of talented developers 
2. and all the other things that good manager will do like you know:
3. sporting a tensed look while meeting the one day deadline and 
4. you know having 1 on 1s, 
5. and approving clarity time-sheets!

Okay so about this project, I had the wonderful opportunity (or terrible misfortune - depending on whom you asked for) of working on the testing status request recently, and realized that this can be done a little bit - especially since we are doing automation anyway!
So hence this project and my awesome team will talk about it!! :)

**[00:00:55] Speaker 2 (The Problem):**
so uh you can see here this is um how we're currently doing our testing status reports we have this spreadsheet and this is kind of like a relic of when we exported i mean we kept our scripts in qc and exported everything into here it was a great process back then because everything was in qc you just click a button and there you go but today with our automation frameworks this is kind of a a hassle to do and it's oftentimes it can be really inaccurate and um a little bit slow as well and it requires somebody to compile an email and send it out every day so it can easily add up to a lot of time spent on it also the tables you know they're not the greatest to interpret but um so our solution will let ren talk about it

**[00:01:48] Speaker 3 ("Ren" - the solution concept):**
so basically like um i kind of felt that like in the reports like it doesn't exactly like correlate with what we are like doing in automation so basically like i just wanted to like start pumping data into like one sort of central db and like maybe one day lego scoping that we like put all those together and we actually like generate reports and like basically this is a proof of concept and yeah so

**[00:02:09] Speaker 4 (live demo & architecture):**
so uh let's take a look at the actual tool now so you get whereas the old way you kind of received an excel spreadsheet it was pushed out to you may or may not be interested in it this way you can go to this dashboard here we've set up and kind of generate your own daily report in whatever way you want to look at so this is real data coming from the renter's team by state this is a number of tests executed past and failed uh just from yesterday we can break it down by state we can break it down by environment we can go back farther so maybe i want to you know be kind of a long-term trend i can go back 30 days and you know the trends really start to jump out so now something's going on in kentucky i can break it down i can say okay this it or st what's going on and sort of generate data on the fly like that right now this is just kind of a single report um my state this may or may not be interesting to everyone obviously in the future we could do you know you could easily imagine having a work request number by team by app any sort of way to slice it and basically it'd be pretty simple to build up this dashboard like that. right so if we go back um that kind of architecture diagram in the previous slide i'll move back to here so all the testers when they're running their automation we we put in this is just on the renter's team right now would very easily be extended they there's it's just it compiles the results of that scenario that test sends it out to a database which is sitting actually on a computer over in plaza 2 um and then this sort of test dashboard right here is actually an app sitting on my computer so they're talking back and forth we're talking to maya just talking to the database and getting the data back

**[00:03:55] Audience member:**
so do you guys manually update that database

**[00:03:59] Speaker 3 ("Ren"):**
automation already so yeah um

**[00:04:01] Speaker 4 (live demo continued):**
and actually if you if you look at this results right here this was we ran our ipex progression last night so these are all the results from our ipad comparison and you can see i can't really point to it starting at connecticut to maryland it appears that the service went down and we had a lot of fails so you can really get a good overview just in the past day you know we know we did this let's look at it and get a real quick snapshot of potentially what happened

**[00:04:30] Speaker 3 ("Ren"):**
actually what you're seeing here is just a minute fraction about what we actually have in the database we collect like pretty much like all the information

**[00:04:40] Speaker 4 (live demo wrap-up):**
so yeah hopefully that gives the idea kind of snapshot of the health of your applications and like i said we could extend this to work request number to story card number any any way you want to look at it basically dynamic so talk about the next steps

**[00:04:48] Speaker 5 (next steps):**
yeah our next steps i mean like they were saying you can put pretty much anything up there uh right now is just what we were able to get accomplished yesterday but you could really start looking at stuff you know compare work requests you don't necessarily even have to do pass fail you can say for each one of those cards in the word request these these were accomplished these many scenarios were read for this um story card release you can even look at hopefully what we're going to do is put you can just look at certain tags like look at regression or look at continuous improvement and and then you can also you have more options for viewing the data is what we want to implement which would be like pie charts line graphs tables comparison charts uh whatever you can build with the data

**[00:05:35] Speaker 6 (conclusion & call for feedback):**
yeah also and what would you like to see hopefully when we get this out to more teams we'll be able to see a lot more innovation coming from it we'd also like to get some feedback from the business you know what kind of stats would you like to see but yes as you have seen this delicious application can be used in so many different ways amongst the end of our presentation any questions or suggestions

*The remainder of the recording is an open Q&A about drill-down capabilities, front-end stack, pointing the suite at production, and exporting filtered views to Excel, with the team members answering interchangeably.*
