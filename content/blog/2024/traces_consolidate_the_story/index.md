+++
date = '2024-04-19'
title = 'Traces Consolidate the Story'
categories = ['Thoughts']
tags = ['Observability', 'Tracing', 'DistributedSystems', 'Engineering']
summary = 'Logs have the context. Traces are how that context becomes a picture: one request, many hops, timing included. OpenTelemetry as the common shape, and a few tenets so the picture stays useful.'
draft = true
+++

# Logs already have most of it

Logging and tracing are intertwined. The context you need for a trace is usually sitting in the logs already: IDs, timings, which hop, what failed.

Traces are how you *see* it. One request, drawn as a tree, across services and network boundaries. Spans nested inside it. The call stack, but honest about the fact that the stack left the process.

That's the third pillar under <a href="/blog/2024/04/16/get_to_the_root_cause/">get to the root cause</a>. Metrics tell you it's sick. Logs tell you what a hop thought it did. Traces tell you where the time went, and which hop dropped the ball.

The OpenTelemetry shape is the one I'd standardize on:

- **Trace ID** - the whole request.
- **Span ID** - this step. A root span at the edge, then a span per hop that matters.

Don't invent a second pair of names for these. Correlation dies the moment one service calls it something cute.

# Sampling is a product decision

You will not keep every trace. That's fine.

**Head-based:** decide at the start. Cheap. Blind to whether the request was interesting.

**Tail-based:** decide at the end, with policy. Keep the errors, keep the slow ones, keep the weird. This is the sampling that actually helps you, and the one that costs more to run.

A fixed 1% of happy traffic plus "always keep failures" is a decent default to argue from. Tune it when the bill or the blind spot gets real.

# Tenets

1. **Comprehensive and contextual.** Does the trace cover the request's life across the services that touched it? Does each span say what it was *for*?
2. **Consistent.** Same names, same tags. Can I jump from this span to the logs and the metrics without a decoder ring?
3. **Performance-focused.** Timings that point at the bottleneck, not just a total. Sampling that still leaves you a picture, without turning every request into a tax.
4. **Selective.** Critical paths, not every getter. Redundant spans are how the waterfall becomes unreadably tall.
5. **Actionable.** Enough detail to diagnose from the trace itself. If I still have to go harvest three other tools, the span attributes are too thin. Alerts off trace data are allowed - same rule as <a href="/blog/2024/04/18/what_did_i_eat_last_tuesday/">logs</a>: only when a metric wouldn't have seen it.

A span that says `GET /foo 200 12ms` and nothing else is a metric wearing a costume. Put the IDs on it. Put the decision on it. Then the picture earns its keep.

<!-- TODO: Naren - this one was the thinnest source (the tracing talk was still "under construction"). If you've since landed a stronger opinion on tail sampling vs always-on errors, or on how wide a trace should be allowed to get, add it. A single screenshot of a good waterfall vs a useless one would carry more than another tenet. -->
