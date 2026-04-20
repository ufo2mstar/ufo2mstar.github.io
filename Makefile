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

build: ## Build static site to ./public/ (no minify, fast)
	hugo

build-prod: ## Build for production with minification
	hugo --minify

clean: ## Remove generated artifacts
	rm -rf public resources .hugo_build.lock

##@ Author

new: ## Create a new post bundle. Usage: make new POST=my-thought
	@test -n "$(POST)" || (echo "ERROR: pass POST=slug, e.g. make new POST=hello-world" && exit 1)
	hugo new content/blog/$(POST)/index.md
	@echo "Created: content/blog/$(POST)/index.md"

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
	@git ls-tree -r --name-only master -- _posts | sort

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
