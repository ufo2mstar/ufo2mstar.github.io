---
layout: post
comments: true
title:  "Idea: Mermaid, for sequence diagrams"
date: 2017-04-17
categories: [Idea]
tags: [Tips, Tool, Mermaid, Javascript]
excerpt: an awesome tool for quickly JS-ing sequence diagram (among other graphs)
mathjax: false
mermaid: true
---
* content
{:toc}

{% mermaid %}
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
{% endmermaid %}