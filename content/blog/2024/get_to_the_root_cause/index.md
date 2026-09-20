+++
date = '2024-04-16'
title = 'Get to the Root Cause'
categories = ['Thoughts']
tags = ['Observability', 'Engineering', 'Systems', 'Production']
summary = 'Observability has one job: get to the root cause as fast as possible. Metrics, logs, and traces are just the tools. Testing is the thing you do before any of them have to fire.'
draft = true
+++

# One job

Observability has one job: **get to the root cause of a problem as fast as possible.**

That's it. The rest is tooling. Visualization is how you actually get there - a graph you can squint at beats a pile of numbers you have to reconstruct in your head at 2am.

I've sat through plenty of "we have monitoring" setups that still left me hunting. Dashboards existed. Alerts existed. And still, when someone asked "is this thing healthy?", the honest answer was "give me twenty minutes." I want the opposite: being able to answer that question on purpose, from something we built, not from tribal memory.

<!-- TODO: Naren - drop in one lived incident here. The time a dashboard showed the business number while the system was on fire, or the 20-minute hunt. 5-10 lines. That's the particular this post is currently floating above. -->

# Confirming the system is behaving

Monitoring tells you something moved. Observability is supposed to tell you *why*.

There's a sibling failure I keep seeing: confusing **analytics** with observability. Analytics answers "did the business do the thing." Observability answers "did the system do the thing." You can have a beautiful revenue chart and a dying hop underneath it. An outage that doesn't show up on the business dashboard is still an outage. The people paging you don't care that the funnel looks fine.

Related systems should look the same. Familiarity is a feature. If every service's dashboard is a unique snowflake, troubleshooting never becomes second nature - you're decoding a new UI every incident. Standard and emergency operating procedures only work if the picture is repeatable.

# The pillars, and the thing before them

Three pillars, in the order I reach for them:

1. **Metrics** - the pulse. Is it even sick?
2. **Logs** - the narrative. What did this request actually do?
3. **Traces** - the breadcrumbs. Where did the time go, and which hop dropped it?

I wrote each of those up separately: <a href="/blog/2024/04/17/metrics_should_answer_questions/">metrics</a>, <a href="/blog/2024/04/18/what_did_i_eat_last_tuesday/">logs</a>, <a href="/blog/2024/04/19/traces_consolidate_the_story/">traces</a>.

The pre-req sitting under all of them is <a href="/blog/2024/04/20/tests_codify_expectations/">testing</a>. Observability kicks in after something has already gone weird in production. Tests are how you refuse to ship the weird in the first place. Skip that layer and you're paying for very expensive, very late detection.

# What success looks like

A new person on the team can open one dashboard and tell you if the system is healthy. Alerts fire when a human should do something, and stay quiet otherwise. A trace ID takes you from the edge of the request to the hop that failed, without a scavenger hunt across three tools and a Slack thread.

Progress, not perfection. The first dashboard that actually answers a question is more useful than a strategy doc about the dashboard we might build. Ship the picture. Iterate when the picture lies.

<!-- TODO: Naren - the original talk had "step our game so answering 'is it healthy?' isn't an afterthought." If you want this more pointed (or more humble about how far we actually got), tweak the success section. -->
