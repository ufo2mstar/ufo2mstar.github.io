# AGENTS.md - orientation for this repo

> Entry point for any AI agent (Cursor, Claude, Ellie, future self) working in this repo. If you're reading this for the first time in a session, start here before touching anything else.

## What this is

Personal blog at [ufo2mstar.github.io](https://ufo2mstar.github.io/). Hugo + Blowfish theme. Mid-migration from a legacy Jekyll site (still live on `master` branch).

Content goal: turn years of accumulated thoughts into published articles - an online portfolio of ideas. Optimize the workflow for low friction between "I want to write something" and "it's live".

## Repo map (one glance)

```
content/blog/<year>/<slug>/index.md   Posts as page bundles. URL: /blog/YYYY/MM/DD/<slug>/
content/{about,_index}.md             Top-level pages
config/_default/*.toml                Hugo config, split by concern (see "Config" below)
data/                                 YAML data files consumed by shortcodes (e.g. more.yaml → link cards)
layouts/shortcodes/                   Custom shortcodes (datalinkcards, etc.)
layouts/partials/                     Custom Blowfish theme overrides (re-diff if upstream theme updates)
themes/blowfish/                      Theme as git submodule - DO NOT edit in-place
static/                               Files served verbatim at site root (robots.txt, favicons, standalone HTML apps)
docs/authoring-reference.md           Shortcode examples, emoji, YouTube, KaTeX - everything you can do in a post
tools/jekyll_to_hugo.py               One-shot converter, removable after migration
Makefile                              All workflows. Run `make` (no args) to list.
.cursor/plans/                        Active plans. Migration plan is the source of truth for what's next.
.cursor/, .specstory/, .personal/     Local-only, gitignored.
```

## Dev server

The user runs `make serve` in a persistent terminal outside the agent session. Don't spin up your own. If `localhost:1313` doesn't respond, ask Naren to start it - don't run `make serve` yourself.

## Workflows

### Writing a new post

```bash
make new POST=my-thought              # creates content/blog/<current-year>/my-thought/index.md
# edit the file - set title, date, categories, tags. Leave draft = true while drafting.
make serve                            # localhost:1313, hot reload, drafts visible
# when ready: flip draft = false (or delete the line)
make publish MSG="post: my thought"   # add + commit + push
```

The post is live ~45s after push (once the Pages workflow is wired - see migration plan N4/N5).

### Previewing changes

```bash
make serve         # dev server, includes drafts (-D), hot reload
make build         # one-shot to ./public/, no minify
make build-prod    # production build with minify (what CI will run)
make clean         # nuke public/, resources/, .hugo_build.lock if things wedge
make config-dump   # print fully-merged config (defaults + theme + ours)
```

If `make serve` starts returning 500s on every URL after a config edit, kill it and restart - the dev server can wedge on bad config reloads. `hugo config` from the CLI is a good way to verify config health independent of the dev server.

### Publishing a post

```bash
make status                  # what's about to be committed
make check                   # pre-push gate (frontmatter + strict build + internal links)
make publish MSG="..."       # add -A + commit + push to origin/main
```

Or do it manually with `git add` + `git commit` + `git push` if you want to stage selectively (often the right call - see "Commit conventions").

### Pre-push checks (`make check`)

Four layers, fail-fast in order:

1. `check-frontmatter` - every post has required keys (`title`, `date`, `slug`, `categories`, `tags`, `summary`), `slug` matches folder name, `date` is ISO and matches the year folder. Drafts are flagged but not failed (use `python3 tools/check_frontmatter.py --strict-drafts` to fail on them).
2. `check-build` - clean `hugo --minify --printPathWarnings`. Fails on `ERROR`/`FATAL`. Filters known-noise unused-template warnings from the Blowfish theme; if a warning survives the filter, investigate it. Note: shortcodes like `datalinkcards` use Hugo's `errorf` to fail the build if their backing data files are missing or empty.
3. `check-content` - smoke-tests rendered HTML pages for expected content. Auto-discovers every `datalinkcards` shortcode usage, reads the backing YAML, and verifies each entry's title appears in the rendered page. Catches silent rendering failures where a shortcode produces empty output without erroring.
4. `check-links` - parses every built `*.html` under `public/`, resolves all internal `<a href>` and `<img src>`. Fails on any unresolved internal ref. External links skipped (run `make check-links-external` for that - slow + flaky).

Implementation: `tools/check_frontmatter.py`, `tools/check_content.py`, and `tools/check_links.py`, all stdlib-only Python. Add new checks here as patterns emerge.

### Migrating a legacy post (until N2 is done)

```bash
make list-legacy-posts                      # what's still on master:_posts/
make peek-post POST=2018-01-24-reco_cs_fundamentals   # view without checking out master
make migrate-dry ONLY=<substr>              # preview the conversion
make migrate ONLY=<substr>                  # write it
make migrate FORCE=1                        # re-convert even if target exists
```

After bulk migration is done, this whole `##@ Migration` section of the Makefile + `tools/jekyll_to_hugo.py` can be deleted in one commit.

## Conventions

### Post front matter (TOML)

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

- `slug` must match the folder name. Set it explicitly so URL stays stable even if the folder is renamed.
- `categories` and `tags` keep original case (`Thoughts`, not `thoughts`).
- `draft = true` shows in `make serve` (-D), excluded from `make build-prod`.

### URL structure

`/blog/YYYY/MM/DD/<slug>/` - matches the legacy Jekyll permalink so old links keep working. Configured in `config/_default/permalinks.toml`. Don't change without redirects.

### Config file naming (subtle)

Hugo auto-scopes `config/_default/<basename>.toml` under the top-level key matching the basename. So `params.toml` contents go under `[params]`, `menu.toml` under `[menu]`, etc. **Strip the matching prefix from any examples copied from upstream Hugo/Blowfish docs.** `hugo.toml` is the one exception - it's not auto-scoped. See the inline header comment in each config file.

### Markdown extensions

- `goldmark.unsafe = true` - raw HTML (iframes, divs) passes through. Personal blog tradeoff.
- `goldmark.passthrough` - preserves `\,` and `\;` LaTeX spacing commands. Required for KaTeX posts.
- KaTeX-using posts must include `{{< katex >}}` shortcode in the body (NOT a front matter param).
- Emoji shortcodes (`:rocket:`) work via `enableEmoji = true`.
- Full shortcode catalog with copy-paste examples: `docs/authoring-reference.md`.

### Commit conventions

- Personal blog, no ticket prefix needed. Lead with a verb.
- One logical change per commit. Smaller is better.
- Bullet body for non-trivial commits, one bullet per logical sub-change, no trailing periods.
- Examples:
  - `post: friendship limits and dunbar`
  - `chore: switch color scheme to slate`
  - `fix: broken katex in dunbar post`
  - `feat: add archives index page`
- The user prefers incremental commits without re-asking each time. Push still requires explicit ask.

### Theme overrides

Custom partial overrides live in `layouts/partials/header/components/{desktop,mobile}-menu.html` (added the `newTab` menu param). If Blowfish theme is updated, re-diff against upstream and re-apply.

Never edit `themes/blowfish/` in-place - it's a submodule. Override by mirroring the path under `layouts/`.

### Submodule

Blowfish is a git submodule. Anyone cloning needs `--recurse-submodules` or theme files won't be there. The CI workflow handles this with `submodules: recursive`.

### Shell gotcha

`rm` is aliased to `rm -i` in the user's shell. For non-interactive deletes in scripts use `/bin/rm -f`.

## Where to find things

- **What's next on the migration:** `.cursor/plans/hugo_migration_next_steps.plan.md` - source of truth for staged work, decisions, and known gotchas.
- **All available commands:** `make` (no args). The Makefile is intentionally thin - each target is a one-line wrapper around the actual command, optimized for muscle memory and discoverability.
- **What's currently in effect:** `make config-dump`.
- **Legacy site:** `master` branch (still serving prod) + `legacy-jekyll` tag (permanent marker).
- **Legacy post source:** `origin/source:_posts/` (not on `master` either).

## Why Python for `tools/`

Hugo is Go, but the repo's actual working language is markdown + TOML. Tools under `tools/` (`check_frontmatter.py`, `check_links.py`, `jekyll_to_hugo.py`) are stdlib-only Python because:

- Short scripts: each is <300 lines, no need for compile/build steps
- Zero install footprint: Python 3 ships on macOS and on the Ubuntu CI runners
- ~Half the LOC of equivalent Go for the same behavior (no `go.mod`, no error-return ceremony, no struct definitions for one-shot data)

Trigger to swap to Go (or to off-the-shelf binaries like `lychee`, `htmltest`): a script grows past ~300 lines, needs concurrency at scale, or needs to ship as a redistributable binary. None of the current tools are close to that line.

## Migration patterns worth remembering

Three lessons from the Hugo migration that generalize:

- **Atomic cutover with frozen rollback.** Master branch + `legacy-jekyll` tag = a 60s revert path via Settings -> Pages -> Source. Cheap insurance, made the whole cutover feel safe enough to actually do. Pattern: when migrating any live system, freeze the old version on a tag/branch you can re-promote in seconds before touching the new one.
- **Test harness as a forcing function.** Built `make check` (frontmatter + strict build + internal links). First run found a real bug (`/resume.html` -> `/resume/` in `share_birthday_mashup`). Pattern: on any accumulated codebase, the harness pays for itself day one - don't wait until "after content is in" to add validation.
- **Don't pre-engineer for hypothetical flexibility.** Picked direct GA4 over GTM because the GA4 -> GTM migration is ~10 lines of partial override if it ever matters. Pattern: when migration cost between two options is small, ship the simpler one and migrate when there's a real second use case, not before.

## Working with Ellie on this repo

> This section is a placeholder for the workflow we want to build. Update as it crystallizes.

Goal: Ellie helps capture, draft, and refine post ideas with the same low-friction loop she uses for the vault.

Sketch (to validate):

1. **Capture:** "ellie, new post idea: <one-liner>" -> Ellie creates `content/blog/<year>/<slug>/index.md` with `draft = true`, fills in front matter from the one-liner, drops the seed thought into the body. No commit yet.
2. **Draft:** "ellie, expand the dunbar post" -> Ellie reads the draft, asks 2-3 sharpening questions, writes a next pass. Iterate in-place.
3. **Refine:** "ellie, prep the dunbar post for publish" -> Ellie does a final read, flags weak claims, suggests title/summary tweaks, lists the categories/tags, asks if draft should flip to false.
4. **Publish:** Naren runs `make publish MSG="..."` himself (commits and pushes are explicit, never automated).

Constraints to respect:
- Never auto-commit. Drafts stay local until Naren says ship.
- Don't over-format. The voice of these posts is Naren's, not Ellie's. Light suggestions > heavy rewrites.
- Use page bundles (`content/blog/<year>/<slug>/index.md`), never flat files.
- One post = one folder. If a post grows images, they live alongside `index.md` in the bundle.

When the workflow is real, factor it out into `~/.claude/skills/ellie-blog/SKILL.md` and link it from here.
