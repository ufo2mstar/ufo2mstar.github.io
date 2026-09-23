# AGENTS.md - orientation for this repo

> Entry point for any AI agent (Cursor, Claude, Ellie, future self) working in this repo. If you're reading this for the first time in a session, start here before touching anything else.

## What this is

Personal blog at [ufo2mstar.github.io](https://ufo2mstar.github.io/). Hugo + Blowfish theme. **Live site is Hugo**, deployed from `main` via GitHub Actions Pages. Legacy Jekyll is frozen on `master` + tag `legacy-jekyll` (rollback only).

Content goal: turn years of accumulated thoughts into published articles - an online portfolio of ideas. Optimize the workflow for low friction between "I want to write something" and "it's live". Day-to-day: edit markdown drafts; ignore process beyond `make draft` / `make preview` / `make check`.

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
make draft POST=my_thought            # creates content/blog/<current-year>/my_thought/index.md (draft=true)
# edit the file - fill title, categories, tags, summary. Keep draft = true while drafting.
make preview                          # localhost:1313, hot reload, drafts visible (alias: make serve)
make check                            # before any PR/push
# when Naren says ship: flip draft = false (or delete the line), then PR or:
make publish MSG="post: my thought"   # add + commit + push origin/main + watch Actions
```

Prefer underscores in folder slugs (`my_thought`, not `my-thought`). `make draft`/`make new` auto-normalize dashes to underscores. The post is live ~45s after a green deploy from `main`.

### Previewing changes

```bash
make preview       # preferred alias: drafts (-D), hot reload on :1313
make serve         # same as preview
make build         # one-shot to ./public/, no minify (excludes drafts)
make build-prod    # production build with minify (what CI runs)
make clean         # nuke public/, resources/, .hugo_build.lock if things wedge
make config-dump   # print fully-merged config (defaults + theme + ours)
```

If `make serve`/`preview` starts returning 500s on every URL after a config edit, kill it and restart - the dev server can wedge on bad config reloads. `hugo config` from the CLI is a good way to verify config health independent of the dev server.

For remote preview (Cloudflare tunnel / similar), keep using local `make preview` and expose :1313 outside this Makefile - do not commit tunnel tokens.

### Publishing a post

```bash
make status                  # what's about to be committed
make check                   # pre-push gate (frontmatter + strict build + internal links)
make publish MSG="..."       # add -A + commit + push to origin/main + watch deploy
```

Safe path today: **Hugo on `main` via Actions** -> https://ufo2mstar.github.io/. Do **not** push content to `master` (Jekyll freeze). Prefer a PR into `main` for draft/WIP branches; use `make publish` only when intentionally shipping. Or `git add` + `git commit` + `git push` selectively (often the right call - see "Commit conventions"). Authors: ufo2mstar only - never Bloggy/assistant names.

### Pre-push checks (`make check`)

Four layers, fail-fast in order:

1. `check-frontmatter` - every post has required keys (`title`, `date`, `categories`, `tags`, `summary`), `date` is ISO and matches the year folder. Flags any `slug` field as redundant (directory name controls the URL). Drafts are flagged but not failed (use `python3 tools/check_frontmatter.py --strict-drafts` to fail on them).
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
categories = ['Thoughts']
tags = ['Foo', 'Bar']
summary = '1-2 sentence teaser shown on listing pages.'
draft = false
+++
```

- **No `slug` field.** The directory name is the slug. Hugo's `:slugorcontentbasename` permalink token reads it directly from the folder name - no front matter duplication needed. `check_frontmatter.py` will flag any `slug` field as redundant.
- `categories` and `tags` keep original case (`Thoughts`, not `thoughts`).
- `draft = true` shows in `make serve` (-D), excluded from `make build-prod`.

### URL structure

`/blog/YYYY/MM/DD/<folder-name>/` - the directory name IS the slug. Hugo's `:slugorcontentbasename` reads it from the folder, no front matter field needed. Matches the legacy Jekyll permalink so old links keep working. Configured in `config/_default/permalinks.toml`. Don't change without redirects.

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
- **Live site:** Hugo from `main` via `.github/workflows/deploy.yml` (GitHub Pages Actions). Repo default branch may still show as `master` in GitHub settings - ignore for content; do not cut over Settings without an explicit ask.
- **Legacy site:** `master` branch + `legacy-jekyll` tag (freeze / rollback only).
- **Legacy post source:** `origin/source:_posts/` (not on `master` either).

## Why Python for `tools/`

Hugo is Go, but the repo's actual working language is markdown + TOML. Tools under `tools/` (`check_frontmatter.py`, `check_links.py`, `jekyll_to_hugo.py`) are stdlib-only Python because:

- Short scripts: each is <300 lines, no need for compile/build steps
- Zero install footprint: Python 3 ships on macOS and on the Ubuntu CI runners
- ~Half the LOC of equivalent Go for the same behavior (no `go.mod`, no error-return ceremony, no struct definitions for one-shot data)

Trigger to swap to Go (or to off-the-shelf binaries like `lychee`, `htmltest`): a script grows past ~300 lines, needs concurrency at scale, or needs to ship as a redistributable binary. None of the current tools are close to that line.

## Makefile recipes vs `tools/` scripts

Decision rule, no need to re-debate:

- **Inline in the Makefile**: 1-3 line recipes, single command + maybe a guard. The Makefile is intentionally thin (muscle memory + discoverability).
- **Extract to `tools/<name>.sh` (or `.py`)**: anything with a loop, conditional branching, multi-step logic, or non-trivial error handling. Makefile target becomes a one-line `@./tools/<name>.sh` wrapper.

Why not a separate `scripts/` dir: `tools/` already houses helper scripts; mixing `.sh` and `.py` there is fine until there's enough shell to feel cluttered (rough threshold: ~5 files). Migration when that happens is `git mv` + Makefile path updates.

Why not Go for shell-replacement scripts: same reasoning as the Python section above. Bash for orchestration, Python for parsing/validation, Go only if it grows past those niches.

Examples following this rule:
- `tools/push-and-watch.sh` - extracted from `_push-and-watch` because it polls GitHub Actions with a retry loop
- `tools/check_*.py` - all extracted because they parse files / validate structure

## Migration patterns worth remembering

Three lessons from the Hugo migration that generalize:

- **Atomic cutover with frozen rollback.** Master branch + `legacy-jekyll` tag = a 60s revert path via Settings -> Pages -> Source. Cheap insurance, made the whole cutover feel safe enough to actually do. Pattern: when migrating any live system, freeze the old version on a tag/branch you can re-promote in seconds before touching the new one.
- **Test harness as a forcing function.** Built `make check` (frontmatter + strict build + internal links). First run found a real bug (`/resume.html` -> `/resume/` in `share_birthday_mashup`). Pattern: on any accumulated codebase, the harness pays for itself day one - don't wait until "after content is in" to add validation.
- **Don't pre-engineer for hypothetical flexibility.** Picked direct GA4 over GTM because the GA4 -> GTM migration is ~10 lines of partial override if it ever matters. Pattern: when migration cost between two options is small, ship the simpler one and migrate when there's a real second use case, not before.

## Working with Bloggy / agents on this repo

Goal: Naren narrates in chat; the agent drafts markdown so he stays focused on content, not process.

Day-to-day loop:

1. **Capture / draft:** Agent creates or edits `content/blog/<year>/<slug>/index.md` with `draft = true` (prefer `make draft POST=slug`). Sniper edits. No em dashes in posts.
2. **Preview:** Prefer preview URLs. Local: `make preview` (Hugo `-D`). Optional Cloudflare tunnel in a separate terminal - never commit tunnel credentials.
3. **Check:** `make check` before asking for a PR/push.
4. **Ship:** Only when Naren says ship - flip `draft = false`, open/merge PR to `main` (or he runs `make publish`). Live publish is Actions on `main`, not `master`.

Constraints:
- Commits as **ufo2mstar <ufo2mstar@gmail.com>** only - never Bloggy or any assistant name.
- Never force-push `main`. Do not destroy WIP branches (`bloggy/*`, etc.).
- Do not merge draft WIP branches or publish drafts unless asked.
- Use page bundles (`content/blog/<year>/<slug>/index.md`), never flat files.
- One post = one folder; images live alongside `index.md` in the bundle.
- Voice stays Naren's. Light suggestions > heavy rewrites.
