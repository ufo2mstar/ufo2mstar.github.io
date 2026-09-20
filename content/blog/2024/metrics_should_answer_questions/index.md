+++
date = '2024-04-17'
title = 'Metrics Should Answer Questions'
categories = ['Thoughts']
tags = ['Observability', 'Metrics', 'Dashboard', 'Engineering']
summary = 'A metric that does not answer a question is decoration. Dashboards, alerts, and the four-panel shape I keep coming back to for any server that takes traffic.'
draft = true
+++

# Start from the question

A metric that doesn't answer a question is decoration. I've added plenty of those. They look busy. They don't help at 2am.

This sits under the same job as the rest of <a href="/blog/2024/04/16/get_to_the_root_cause/">observability</a>: get to the root cause fast. Metrics are the pulse check. They tell you *whether* it's sick, and roughly *where*. Logs and traces do the rest.

Two modes, both real:

- **Passive** - you look when something feels off. Troubleshooting.
- **Active** - the system taps you on the shoulder. Alerting.

CI that auto-ships is only honest once feature flags, alerts, and tests are actually in shape. Otherwise you're automating the deployment of surprises.

# Metric tenets

1. **Consistency.** Same names, same units, across services. Can I grep a metric name and trust it means the same thing everywhere?
2. **Relevance.** Each metric earns its keep against health or performance. If I deleted it, would anyone notice during an incident?
3. **Completeness.** The critical path is covered. Not every function. The path.
4. **Tagging.** I can slice by the dimensions that actually change the story - environment, endpoint, status, caller. Without tags, a metric is a blob.
5. **Prefer default metrics over custom ones.** The runtime, the framework, the broker already emit useful stuff. Custom metrics are a cost and a maintenance tax. The question before emitting one: why isn't a default enough here?

That last one is the one I have to keep repeating to myself. Custom feels like control. Mostly it's a second, worse, naming scheme.

# Dashboard tenets

A dashboard has one job: **immediate understanding of system state.**

1. **Clarity.** Can I grasp health in a few seconds, without a legend archaeology session?
2. **Purpose-driven.** It answers specific questions that other dashboards don't. "Overview of everything" is how you get a wall of charts nobody uses.
3. **Consistent.** Related systems look like related systems. Uniform visuals are how troubleshooting becomes muscle memory.
4. **Hierarchical.** High-level first, then filters and drill-downs. Don't make me open six tabs to go from "something's wrong" to "this endpoint on this pod."
5. **Informative.** Enough to act. Not so much that I stop seeing. Bias slightly toward more information - a legend with min/max/avg/count saves a click - but the first screen still has to parse.
6. **Automated.** If adding a service means hand-clicking a dashboard together, the dashboard will rot the week after the next rename. Templates. Code. The same pipeline that ships the service ships the picture of the service.

Stage and prod should look the same, on purpose. A dashboard that only exists in prod is a dashboard you've never practiced reading.

# Alerting tenets

1. **Actionability.** An on-call engineer knows what to *do*, not just that a number moved.
2. **Relevance.** Thresholds match how bad the thing actually is. A p99 blip that self-clears is not a page.
3. **Noise reduction.** If it doesn't need a human right now, it isn't an alert. It's a chart. Alert fatigue is how real pages get ignored.
4. **Routing.** The people who can fix it are the people who get it. Not the whole company Slack, not a dead email list.
5. **Continuous improvement.** Incidents feed back into the rules. If the page didn't help, change the page. Cadence, or after every messy night. Both work. Neither is "we'll get to it."

# The four-panel for anything that serves traffic

This is the shape I want on every server/API dashboard. Four panels, each with a question baked in.

**Traffic**
- Total requests: what's the load?
- Total success: how many are we actually handling?
- Success %: what proportion is working?

**Errors**
- Count by failure reason: what's actually breaking?
- Failure %: how much of traffic is that?

**Latency**
- p50: typical.
- Average, optionally, sitting next to p50: how skewed are we? If average is running away from median, you have a tail.
- p90 / p99: the slow slice. p99 is usually the SLO one.
- Max: worst case. Useful. Don't alert off it unless you like being awake.

**Saturation**
- CPU, memory, replica count, container health. Are we about to be the bottleneck, or are we already there?

Viz that matches the data: bars for counters (throughput, errors), lines for gauges (latency, utilization), area for percentages (success/fail). Don't get cute.

# Queues need a different panel

Anything that consumes a stream - a queue, a log, a broker - lies if you only look at the HTTP four-panel. The questions change:

- **Queue depth.** How many are waiting? A depth that only goes up means you're losing.
- **Processing rate vs arrival rate.** Catching up, or falling behind?
- **Throughput.** Messages per second. The raw "are we doing work."
- **Worker utilization.** High and stuck usually means scale. High and healthy can just mean you sized it right.
- **Lag time.** How long does a message sit before anyone touches it?
- **Oldest message age.** The one that tells you a consumer died at 3am and nobody noticed.
- **Back pressure.** Are we pushing back, or pretending we can take infinite load?

Same viz instincts: lines for depth/lag/age, bars for rate/throughput, area for utilization, a dumb colored indicator for back pressure. You want to *see* "falling behind," not compute it.

# SLIs, SLOs, the boring necessary bit

Pick a few. Not twenty.

For a gateway: availability and p95 latency are the SLIs. An SLO a notch tighter than whatever you promised outside. Error rate as a third if errors are the thing that actually hurts.

For notifications: delivery success and time-from-event-to-send. The SLO is "almost all of them, almost immediately." The SLA you tell other people can be looser. That's the point of the gap.

For a processor sitting on a queue: availability, time-from-queue-to-done, and a queue-depth cap. Throughput as a KPI, not an SLO - doing more work is nice, finishing work on time is the promise.

If a metric doesn't map to one of those, it's probably a custom vanity number. See tenet 5.

<!-- TODO: Naren - if you want one concrete "this dashboard lied to me" story, this is the spot. The four-panel and the queue panel are the portable takeaway even without it. -->
