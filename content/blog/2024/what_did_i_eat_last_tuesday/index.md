+++
date = '2024-04-18'
title = 'What Did I Eat Last Tuesday'
categories = ['Thoughts']
tags = ['Observability', 'Logging', 'Engineering', 'Excel']
summary = 'Logs are how a system remembers. The quality of that memory is the difference between a video replay and a shrug. A few tenets I keep using to decide whether a line deserves to exist.'
draft = true
+++

# Dinner last Tuesday

What did I have for dinner last Tuesday?

Worst: try to remember. Long gone.

Ok: the calorie-tracker entry. A number, maybe a name. Thin.

Better: the photo I posted of the plate.

Best: a video replay. Glasses on, the whole meal sitting there, inspectable.

That's logging. Brains are great at forgetting unimportant things. Machines are supposed to be better. The quality of the snapshot is the quality of the retroactive inspection. Metrics and traces will tell you *that* something happened, and maybe *where*. Logs are the narrative - the closest thing we have to "run this line again in a debugger," without actually having the debugger.

If there were no constraints, we'd ask the system any question and get an answer. Until then, we snapshot the state that *mattered*, at the places where actions happen.

This is the log-shaped slice of <a href="/blog/2024/04/16/get_to_the_root_cause/">get to the root cause</a>.

# What to snapshot

To replay an action you need:

1. **Inputs**
2. **Outputs**
3. **Significant Intermediate Action results** - SIAs. The decision points. Not every assignment. The forks.

Simple plumbing and mapping are rarely the suspect. Skip them. The infinite permutations of *data* are usually what you're hunting. A fat transformation, a policy decision, a call to someone else's API - those get a line. A field copy does not.

# Tenets

Each one is a question I try to ask before I leave a log in the code.

1. **Purpose-driven.** What critical information does this line give me that metrics or traces don't? If the answer is "it prints that we entered the function," delete it.
2. **Structured and consistent.** Same field names, same shape. Familiarity is how you query at speed. Custom fields are how you lose an hour because this service called it `trace_id` and that one called it `tid`.
3. **The right level, at the right place.** Fatal / Error / Warn / Info / Debug. **Error only at terminal points.** An intermediate failure doesn't know it'll fail the whole request - that's a Warn. If you want Error to mean "this request is dead," then **Fatal is the one that means the process is dead.** Mixing those up is how "error rate" becomes a useless number.
4. **Context travels with the line.** Trace IDs, span IDs, the IDs of the thing you're processing. The *last* log in a method should already have everything from above. If you've gotten all the way down to the action, you shouldn't have to hop to three other lines to reconstruct why. `With()` exists for this.
5. **Density without a flood.** Enough to see the story. Not a line per function in a hot loop. Hierarchy, when you need more: the message itself, then extra fields, then extra lines. In that order. Don't skip to line 4 because line 1 was lazy.
6. **Actionable, and only if a metric can't do it.** Logs as alerts are for compound cases - several fields, a story a single counter can't see. If a metric alert would have done the job, use the metric. Logs are expensive and easy to drown in.

# Over-logging and under-logging

Under-logging is easy to spot: gaps in the story of a single trace. You follow the ID and the plot just... stops. That's a miss.

Over-logging is sneakier. Every function logs. Cost climbs. Signal dies. You have a million lines and still can't see the decision.

The minimum viable output: if a function has one job, observing that job is the line. Not the plumbing around it. Internal steps stay quiet unless they're the complexity. External calls get a line - that's where other people's failures live.

We won't get this right on the first pass. Fine. A step in the right direction beats a perfect standard nobody applies. Wrong direction shows up fast if you iterate. That's the whole trick.

# A line that does nothing

```
04-20-2024 Error Failed Calling DependencyX
```

No ID. No input. No output. No status. "Error" for something that might have been retried two layers up. Unsearchable except by the English sentence, which will drift the next time someone rephrases it.

A useful version of that line has a time, a level that's honest, a trace ID, the dependency name as a field, the operation, the input that matters, what came back (or didn't), and enough of the error to grep. Structured. One payload you can act on.

# Table over JSON

Humans thrive on tabular data. The world runs on Excel. I say that as someone who spent time in banking, and as someone who knows Excel is accidentally [Turing complete](https://www.cs.odu.edu/~zeil/cs390/latest/Public/turing-complete/index.html). Your log UI should look like a table first. JSON is the verbose search, not the overview. Trace IDs are what turn that table into a single-threaded story.

# Approaches, if you like labels

Different code shapes log differently. Same snapshot rules.

- **Functional:** inputs and outputs of the functions that matter.
- **Procedural:** the sequence of steps, when the sequence *is* the story.
- **Object-oriented:** state changes and the calls that caused them. Less natural in Go. Still a real shape.
- **Aspect-oriented:** logging injected at the edges so business code stays clean. Magic. Sometimes the right magic.

I don't care which label you use. I care that the line exists because a decision happened, and that I can find it later.

<!-- TODO: Naren - the original had two internal search UIs as the "see, tables work" demo. If you want a public screenshot of a generic table-shaped log view, park it in the bundle. Otherwise the Excel beat carries it. -->
