# Authoring reference

Quick-look reference for everything you can do inside a post's markdown. Meant for Naren and any AI agent drafting content.

## Emoji (Slack-style)

Already enabled via `enableEmoji = true` in `hugo.toml`. Use standard shortcodes inline:

```markdown
Great talk :rocket: loved the demo :tada: need to revisit :thinking:
```

Full list: https://www.webfx.com/tools/emoji-cheat-sheet/

Unicode emoji (macOS picker: `Ctrl+Cmd+Space`) also work directly - no shortcode needed.

## YouTube embed

### Default (responsive 16:9, fills container width)

```markdown
{{</* youtube VIDEO_ID */>}}
```

### With autoplay or start time (Blowfish's lite variant, lazy-loads)

```markdown
{{</* youtubeLite id="VIDEO_ID" params="start=120&autoplay=1" */>}}
```

### Custom dimensions (raw HTML - works because `unsafe = true`)

```html
<iframe width="560" height="315"
  src="https://www.youtube.com/embed/VIDEO_ID"
  frameborder="0" allowfullscreen></iframe>
```

For most posts, the default `youtube` shortcode is the right call - it's responsive and works on mobile. Only use raw HTML if you need a specific size.

## Math (KaTeX)

Add the shortcode once anywhere in the post body (not front matter):

```markdown
{{</* katex */>}}
```

Then use LaTeX inline or block:

```markdown
Inline: \( E = mc^2 \)

Block:
$$
\sum_{i=1}^{n} x_i = x_1 + x_2 + \cdots + x_n
$$
```

## Blowfish shortcodes

### Alert (callout box)

```markdown
{{</* alert icon="circle-info" */>}}
This is an informational note.
{{</* /alert */>}}
```

Icon options: `circle-info`, `triangle-exclamation`, `bomb`, `bug`, `fire`, `comment`, etc. (any Blowfish icon name).

### Badge

```markdown
{{</* badge */>}}New{{</* /badge */>}}
```

### Button

```markdown
{{</* button href="/resume/" target="_blank" */>}}View Resume{{</* /button */>}}
```

### Lead (larger intro paragraph)

```markdown
{{</* lead */>}}
This paragraph will render larger as an intro.
{{</* /lead */>}}
```

### Figure (image with caption)

```markdown
{{</* figure src="photo.jpg" alt="Description" caption="Caption text" */>}}
```

### Gallery (multiple images)

```markdown
{{</* gallery */>}}
  <img src="img1.jpg" />
  <img src="img2.jpg" />
{{</* /gallery */>}}
```

### Chart (Chart.js)

```markdown
{{</* chart */>}}
type: 'bar',
data: {
  labels: ['A', 'B', 'C'],
  datasets: [{
    label: 'Count',
    data: [12, 19, 3]
  }]
}
{{</* /chart */>}}
```

### Mermaid (diagrams)

```markdown
{{</* mermaid */>}}
graph LR
  A --> B --> C
{{</* /mermaid */>}}
```

### Tabs

```markdown
{{</* tabs */>}}
  {{</* tab "First" */>}}Content for first tab{{</* /tab */>}}
  {{</* tab "Second" */>}}Content for second tab{{</* /tab */>}}
{{</* /tabs */>}}
```

### Timeline

```markdown
{{</* timeline */>}}
  {{</* timelineItem header="2024" */>}}Something happened{{</* /timelineItem */>}}
  {{</* timelineItem header="2025" */>}}Something else{{</* /timelineItem */>}}
{{</* /timeline */>}}
```

### TypeIt (typing animation)

```markdown
{{</* typeit */>}}
This text will type itself out.
{{</* /typeit */>}}
```

### Icon (inline SVG)

```markdown
{{</* icon "github" */>}} {{</* icon "twitter" */>}} {{</* icon "email" */>}}
```

### Code import (from file)

```markdown
{{</* codeimporter url="https://raw.githubusercontent.com/..." type="go" */>}}
```

### Accordion

```markdown
{{</* accordion */>}}
  {{</* accordionItem header="Click to expand" */>}}Hidden content here{{</* /accordionItem */>}}
{{</* /accordion */>}}
```

## Data-driven link cards

For pages like `/more/` that list external links as styled cards, use the `datalinkcards` shortcode backed by a YAML data file.

### The data file (`data/more.yaml`)

```yaml
- title: Names
  url: /names/
  description: A growing collection of Indian names.
  newtab: true

- title: Resume
  url: /resume/
  description: The formal version.
  newtab: true
```

### In your markdown

```markdown
{{</* datalinkcards "more" */>}}
```

That's it. Add a new card by adding 3-4 lines to the YAML file.

## Standalone HTML pages (no Hugo processing)

Drop files in `static/` and they're served verbatim:

```
static/qs/index.html  ->  https://yourdomain/qs/
static/tools/app.html ->  https://yourdomain/tools/app.html
```

`make serve` picks these up automatically (hot reload works for content, static file changes may need a browser refresh). `make build` copies them to `public/` alongside the generated site.

## Raw HTML in markdown

Enabled via `goldmark.renderer.unsafe = true` in `markup.toml`. Use sparingly - shortcodes are usually cleaner - but available for one-off embeds:

```markdown
<div style="background: #f0f0f0; padding: 1rem;">
  Custom HTML block.
</div>
```

## Front matter reference

```toml
+++
date = '2026-04-21'
title = 'Title with Initial Caps'
slug = 'kebab-case-matches-folder'
categories = ['Thoughts']
tags = ['Foo', 'Bar']
summary = '1-2 sentence teaser shown on listing pages.'
draft = false
+++
```

Required keys: `title`, `date`, `slug`, `categories`, `tags`, `summary`. `slug` must match folder name. See AGENTS.md for full conventions.
