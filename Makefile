# Makefile for ufo2mstar.github.io (Hugo site)
#
# Content-first day-to-day (this is what you usually need):
#   make draft POST=my_thought   # new draft bundle under content/blog/<year>/
#   make preview                 # localhost:1313 with drafts (-D)
#   make check                   # pre-push gate (frontmatter + build + links)
#   # when ready to ship (Naren only): flip draft=false, then
#   make publish MSG="post: my thought"
#
# Run `make` (no args) to see all targets.
# Each target is a thin wrapper - muscle memory + discoverability, not abstraction.
#
# Branches / publish:
#   - Hugo source + Actions deploy: `main` (live site is Hugo via GitHub Pages Actions)
#   - Legacy Jekyll freeze: `master` + tag `legacy-jekyll` (rollback only; do not edit for content)
#   - WIP drafts: feature branches (e.g. bloggy/*). Prefer PR into main; do not force-push main.
#
# History:
#   - Site scaffolded with `hugo new site . --force --format=toml` on orphan `main`.
#   - Theme: Blowfish (git submodule under themes/blowfish).
#   - Legacy Jekyll frozen on `master` + `legacy-jekyll` tag.

.DEFAULT_GOAL := help

# ---- Help ----------------------------------------------------------------

help: ## Show this help (default target)
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage: make \033[36m<target>\033[0m\n\nContent-first recipe:\n  make draft POST=slug && make preview && edit markdown && make check\n  # ship only when ready: draft=false, then make publish MSG=\"post: ...\"\n"} \
	  /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2 } \
	  /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' $(MAKEFILE_LIST)

##@ Author (content)

draft: ## Create a draft post bundle. Usage: make draft POST=my_thought
	@$(MAKE) --no-print-directory new POST="$(POST)"

new: ## Same as draft. Usage: make new POST=my_thought (underscores preferred)
	@test -n "$(POST)" || (echo "ERROR: pass POST=slug, e.g. make draft POST=hello_world" && exit 1)
	@slug=$$(echo "$(POST)" | tr '-' '_'); \
	  if [ "$$slug" != "$(POST)" ]; then echo "Note: normalized POST '$(POST)' -> '$$slug' (underscores)"; fi; \
	  hugo new "content/blog/$$(date +%Y)/$$slug/index.md"; \
	  echo "Created: content/blog/$$(date +%Y)/$$slug/index.md (draft=true)"

new-page: ## Create a top-level page. Usage: make new-page PAGE=resume
	@test -n "$(PAGE)" || (echo "ERROR: pass PAGE=name, e.g. make new-page PAGE=resume" && exit 1)
	hugo new content/$(PAGE).md
	@echo "Created: content/$(PAGE).md"

##@ Preview / build

preview: ## Alias for serve - draft-aware local preview
	@$(MAKE) --no-print-directory serve

serve: ## Dev server with hot reload, including drafts (localhost:1313)
	hugo server -D --navigateToChanged

build: ## Build static site to ./public/ (no minify, fast; excludes drafts)
	hugo

build-prod: ## Production build with minification (excludes drafts)
	hugo --minify

clean: ## Remove generated artifacts
	rm -rf public resources .hugo_build.lock

config-dump: ## Print the fully-merged Hugo config (defaults + theme + ours)
	@hugo config

# Preview the legacy Jekyll site locally for visual diffing against Hugo.
# Master holds pre-built HTML; materialize as worktree at _legacy/.
serve-legacy: _legacy ## Serve legacy Jekyll freeze (master) on localhost:4000
	@echo "Legacy site (master) at http://localhost:4000/  (Ctrl+C to stop)"
	@cd _legacy && python3 -m http.server 4000

_legacy:
	@echo "Setting up _legacy/ worktree from origin/master..."
	@git fetch origin master
	@git worktree add _legacy origin/master

refresh-legacy: ## Pull latest master into _legacy/ worktree
	@test -d _legacy || (echo "no _legacy worktree - run 'make serve-legacy' first" && exit 1)
	@git fetch origin master
	@git -C _legacy reset --hard origin/master

clean-legacy: ## Remove the _legacy/ worktree
	@git worktree remove --force _legacy 2>/dev/null || /bin/rm -rf _legacy
	@git worktree prune

##@ Check (run before push / PR)

# `make check` is the pre-push gate: build cleanly, validate front matter,
# verify internal links resolve. External links are NOT checked by default
# (slow + flaky). Run `make check-links-external` separately if you want.

check: check-imports check-frontmatter check-slugs check-taxonomies check-build check-content check-links ## Run all checks (imports + frontmatter + slugs + taxonomies + build + content + links)
	@echo "\nAll checks passed."

check-imports: ## Flag unused imports in tools/ (catches accidental third-party deps)
	@python3 tools/check_imports.py

check-frontmatter: ## Validate every post's front matter (no build needed)
	@python3 tools/check_frontmatter.py

check-slugs: ## Check for redundant slug fields and dash-separated folder names
	@python3 tools/check_slugs.py

check-taxonomies: ## Validate categories/tags against allowlist, auto-add genuinely new terms
	@python3 tools/check_taxonomies.py --fix

# Strict build: fail on any ERROR, surface real WARN lines, but filter out
# Blowfish theme noise (unused shortcodes we don't reference). If hugo prints
# a warning that survives the filter, you should investigate it.
check-build: ## Hugo build with strict flags; fails on errors, surfaces real warnings
	@$(MAKE) clean >/dev/null
	@hugo --minify --printPathWarnings 2>&1 | tee /tmp/hugo-build.log | \
	  grep -vE 'Template /(_shortcodes/(forgejo|gallery|gist|gitea|github|gitlab|huggingface|icon|keyword|keywordlist|lead|list|ltr|mdimporter|mermaid|rtl|screenshot|swatches|tab|tabs|timeline|timelineitem|typeit|video|youtubelite)|llms\.txt|simple|terms)\.html is unused' || true
	@! grep -E '^(ERROR|FATAL)' /tmp/hugo-build.log >/dev/null

check-content: ## Smoke-test that data-driven pages render expected content
	@test -d public || (echo "no public/ - run 'make check-build' first" && exit 1)
	@python3 tools/check_content.py

check-links: ## Verify internal links/images resolve in built site (requires public/)
	@test -d public || (echo "no public/ - run 'make check-build' first" && exit 1)
	@python3 tools/check_links.py

check-links-external: ## Also check external (http/https) links - slow and flaky
	@test -d public || (echo "no public/ - run 'make check-build' first" && exit 1)
	@python3 tools/check_links.py --external

##@ Publish (main only; prefer PR unless shipping)

status: ## Show what would be committed
	git status -sb

publish: ## Stage all, commit with MSG, push origin/main, watch Actions. Usage: make publish MSG="post: foo"
	@test -n "$(MSG)" || (echo "ERROR: pass MSG=\"...\"" && exit 1)
	@echo "NOTE: live site deploys from main via GitHub Actions (Hugo). master is legacy Jekyll freeze only."
	git add -A
	git commit -m "$(MSG)"
	@$(MAKE) --no-print-directory _push-and-watch

push: check ## Validate locally, push origin/main, watch GitHub Actions until green
	@$(MAKE) --no-print-directory _push-and-watch

_push-and-watch:
	@./tools/push-and-watch.sh

##@ Migration (one-time, removable after content is in)

# Pull a Jekyll post from master without switching branches.
# Usage: make peek-post POST=2018-01-24-reco_cs_fundamentals
peek-post: ## View a Jekyll post from master. Usage: make peek-post POST=2018-01-24-name
	@test -n "$(POST)" || (echo "ERROR: pass POST=YYYY-MM-DD-slug" && exit 1)
	@git show master:_posts/$(POST).md

list-legacy-posts: ## List all Jekyll posts on origin/source
	@git ls-tree -r --name-only origin/source -- _posts | sort

# Bulk-convert Jekyll posts (origin/source:_posts) to Hugo page bundles.
migrate-dry: ## Dry-run converter; prints to stdout. Vars: ONLY=substr
	@python3 tools/jekyll_to_hugo.py --dry-run $(if $(ONLY),--only $(ONLY))

migrate: ## Convert Jekyll posts to Hugo bundles. Vars: ONLY=substr FORCE=1
	@python3 tools/jekyll_to_hugo.py $(if $(ONLY),--only $(ONLY)) $(if $(FORCE),--force)

##@ Reference (do not run; documents one-time setup commands)

ref-init: ## (no-op) How the site was initially scaffolded
	@echo "# This is a reference, not meant to run. Commands used:"
	@echo "git checkout --orphan main          # new branch with no parent"
	@echo "git rm -rf --cached . && \\"
	@echo "  git clean -fd -e .gitignore -e .personal -e .cursor -e .specstory -e .vscode"
	@echo "hugo new site . --force --format=toml   # --force tolerates non-empty dir"
