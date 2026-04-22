# Makefile for ufo2mstar.github.io (Hugo site)
#
# Run `make` (no args) to see all targets grouped by purpose.
# Each target is a thin wrapper around a single command - the goal is
# muscle memory + discoverability, not abstraction.
#
# History (so future-us remembers what we ran):
#   - Site scaffolded with `hugo new site . --force --format=toml` on the
#     orphan `main` branch. The --force was needed because the dir already
#     had .git, .gitignore, README.md from the orphan init.
#   - Theme: TBD (Blowfish planned, see .cursor/plans/hugo_migration_plan_*).
#   - Legacy Jekyll site frozen on `master` branch + `legacy-jekyll` tag.

.DEFAULT_GOAL := help

# ---- Help ----------------------------------------------------------------

help: ## Show this help (default target)
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage: make \033[36m<target>\033[0m\n"} \
	  /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2 } \
	  /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' $(MAKEFILE_LIST)

##@ Develop

serve: ## Run dev server with hot reload, including drafts (localhost:1313)
	hugo server -D --navigateToChanged

# Preview the legacy Jekyll site locally for visual diffing against the new
# Hugo build. Master branch holds pre-built HTML (Jekyll output committed
# directly), so we just materialize it as a git worktree at _legacy/ and
# serve with python -m http.server. No Ruby/Bundler needed.
#
# Stop the server with Ctrl+C. Refresh master with `make refresh-legacy`.
# Tear down with `make clean-legacy`.
serve-legacy: _legacy ## Serve legacy Jekyll site (master branch) on localhost:4000
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

build: ## Build static site to ./public/ (no minify, fast)
	hugo

build-prod: ## Build for production with minification
	hugo --minify

clean: ## Remove generated artifacts
	rm -rf public resources .hugo_build.lock

config-dump: ## Print the fully-merged Hugo config (defaults + theme + ours)
	@hugo config

##@ Check (run before push)

# `make check` is the pre-push gate: build cleanly, validate front matter,
# verify internal links resolve. External links are NOT checked by default
# (slow + flaky). Run `make check-links-external` separately if you want.

check: check-frontmatter check-build check-links ## Run all checks (frontmatter + strict build + internal links)
	@echo "\nAll checks passed."

check-frontmatter: ## Validate every post's front matter (no build needed)
	@python3 tools/check_frontmatter.py

# Strict build: fail on any ERROR, surface real WARN lines, but filter out
# Blowfish theme noise (unused shortcodes we don't reference). If hugo prints
# a warning that survives the filter, you should investigate it.
check-build: ## Hugo build with strict flags; fails on errors, surfaces real warnings
	@$(MAKE) clean >/dev/null
	@hugo --minify --printPathWarnings 2>&1 | tee /tmp/hugo-build.log | \
	  grep -vE 'Template /(_shortcodes/(forgejo|gallery|gist|gitea|github|gitlab|huggingface|icon|keyword|keywordlist|lead|list|ltr|mdimporter|mermaid|rtl|screenshot|swatches|tab|tabs|timeline|timelineitem|typeit|video|youtubelite)|llms\.txt|simple|terms)\.html is unused' || true
	@! grep -E '^(ERROR|FATAL)' /tmp/hugo-build.log >/dev/null

check-links: ## Verify internal links/images resolve in built site (requires public/)
	@test -d public || (echo "no public/ - run 'make check-build' first" && exit 1)
	@python3 tools/check_links.py

check-links-external: ## Also check external (http/https) links - slow and flaky
	@test -d public || (echo "no public/ - run 'make check-build' first" && exit 1)
	@python3 tools/check_links.py --external

##@ Author

new: ## Create a new post bundle. Usage: make new POST=my-thought (lands in content/blog/<current-year>/)
	@test -n "$(POST)" || (echo "ERROR: pass POST=slug, e.g. make new POST=hello-world" && exit 1)
	hugo new content/blog/$$(date +%Y)/$(POST)/index.md
	@echo "Created: content/blog/$$(date +%Y)/$(POST)/index.md"

new-page: ## Create a top-level page. Usage: make new-page PAGE=resume
	@test -n "$(PAGE)" || (echo "ERROR: pass PAGE=name, e.g. make new-page PAGE=resume" && exit 1)
	hugo new content/$(PAGE).md
	@echo "Created: content/$(PAGE).md"

##@ Publish

status: ## Show what would be committed
	git status -sb

publish: ## Stage all, commit with MSG, push to origin/main. Usage: make publish MSG="post: foo"
	@test -n "$(MSG)" || (echo "ERROR: pass MSG=\"...\"" && exit 1)
	git add -A
	git commit -m "$(MSG)"
	git push origin main
	@echo "Pushed. Live at https://ufo2mstar.github.io/ in ~45s (after Phase 3 cutover)."

##@ Migration (one-time, removable after content is in)

# Pull a Jekyll post from master without switching branches.
# Usage: make peek-post POST=2018-01-24-reco_cs_fundamentals
peek-post: ## View a Jekyll post from master. Usage: make peek-post POST=2018-01-24-name
	@test -n "$(POST)" || (echo "ERROR: pass POST=YYYY-MM-DD-slug" && exit 1)
	@git show master:_posts/$(POST).md

list-legacy-posts: ## List all Jekyll posts on master
	@git ls-tree -r --name-only origin/source -- _posts | sort

# Bulk-convert Jekyll posts (origin/source:_posts) to Hugo page bundles.
# Usage:
#   make migrate-dry                       # print everything to stdout, write nothing
#   make migrate-dry ONLY=primer_git       # dry-run a single post (substring match)
#   make migrate ONLY=2018                 # convert all 2018 posts
#   make migrate FORCE=1                   # overwrite existing index.md files
#   make migrate                           # convert all (skips files that already exist)
migrate-dry: ## Dry-run converter; prints to stdout. Vars: ONLY=substr
	@python3 tools/jekyll_to_hugo.py --dry-run $(if $(ONLY),--only $(ONLY))

migrate: ## Convert Jekyll posts to Hugo bundles. Vars: ONLY=substr FORCE=1
	@python3 tools/jekyll_to_hugo.py $(if $(ONLY),--only $(ONLY)) $(if $(FORCE),--force)

##@ Reference (do not run; documents one-time setup commands)

# These targets are NOT meant to be invoked - they're inert documentation
# of commands we ran during initial setup. Reading the recipe tells you
# exactly what was done and why.

ref-init: ## (no-op) How the site was initially scaffolded
	@echo "# This is a reference, not meant to run. Commands used:"
	@echo "git checkout --orphan main          # new branch with no parent"
	@echo "git rm -rf --cached . && \\"
	@echo "  git clean -fd -e .gitignore -e .personal -e .cursor -e .specstory -e .vscode"
	@echo "hugo new site . --force --format=toml   # --force tolerates non-empty dir"
