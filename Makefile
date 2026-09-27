# Makefile for ufo2mstar.github.io (Hugo site)
#
# `make` (no args) is the interface — daily loop, copy-paste commands, next step.
# `make help-all` lists every target. Thin wrappers: muscle memory, not abstraction.
#
# Live site: Hugo from `main` via GitHub Actions Pages.
# Legacy Jekyll freeze: `master` + tag `legacy-jekyll` (rollback only).
# WIP: bloggy/* branches; PR into main. Never force-push main.

.DEFAULT_GOAL := help

BLUE   := $(shell tput setaf 4 2>/dev/null)
GREEN  := $(shell tput setaf 2 2>/dev/null)
YELLOW := $(shell tput setaf 3 2>/dev/null)
BOLD   := $(shell tput bold 2>/dev/null)
DIM    := $(shell tput dim 2>/dev/null)
RESET  := $(shell tput sgr0 2>/dev/null)

# `make setup` drops a real hugo into ./bin so recipes work even when the
# mise shim is present but not pinned. CI installs Hugo itself.
export PATH := $(CURDIR)/bin:$(PATH)

.PHONY: help help-all setup draft new new-page preview serve build build-prod clean \
	config-dump serve-legacy refresh-legacy clean-legacy check check-imports \
	check-frontmatter check-slugs check-taxonomies check-build check-content \
	check-links check-links-external status doctor publish push peek-post \
	list-legacy-posts migrate-dry migrate ref-init

# ---- Help ----------------------------------------------------------------

help:
	@printf '\n$(BOLD)%s$(RESET)  $(DIM)·  Hugo + Blowfish  ·  %s$(RESET)\n' \
		"ufo2mstar.github.io" "$$(git branch --show-current 2>/dev/null || echo '?')"
	@printf '\n$(BOLD)Daily loop$(RESET)  $(DIM)setup → preview → check → live$(RESET)\n'
	@printf '  $(BLUE)%-40s$(RESET) %s\n' 'make setup' 'first clone: hugo extended, theme, git author, gh credentials'
	@printf '  $(BLUE)%-40s$(RESET) %s\n' 'make draft POST=my_thought' 'new bundle under content/blog/<year>/  (draft=true)'
	@printf '  $(BLUE)%-40s$(RESET) %s\n' 'make preview' 'http://localhost:1313  drafts on, hot reload'
	@printf '  $(DIM)%-40s$(RESET) %s\n' '# edit the markdown' 'leave draft=true until you mean to ship'
	@printf '  $(BLUE)%-40s$(RESET) %s\n' 'make check' 'gate: imports, frontmatter, slugs, taxonomies, build, links'
	@printf '  $(BLUE)%-40s$(RESET) %s\n' 'make publish MSG="post: my thought"' 'check + commit + push main + watch Actions'
	@printf '\n  $(DIM)already committed?$(RESET)  $(BLUE)make push$(RESET)     check + git push origin main + watch\n'
	@printf '  $(DIM)where am I?$(RESET)         $(BLUE)make status$(RESET)   branch, dirty, drafts, next command\n'
	@printf '  $(DIM)machine ok?$(RESET)         $(BLUE)make doctor$(RESET)   hugo extended, theme, git author, gh\n'
	@printf '\n$(BOLD)Daily$(RESET)\n'
	@printf '  $(BLUE)%-16s$(RESET) %s  $(DIM)hugo + theme + git author + gh auth setup-git$(RESET)\n' 'setup' 'one-shot machine bootstrap'
	@printf '  $(BLUE)%-16s$(RESET) %s\n' 'draft' 'make draft POST=slug'
	@printf '  $(BLUE)%-16s$(RESET) %s  $(DIM)hugo server -D --navigateToChanged$(RESET)\n' 'preview' 'localhost:1313 including drafts'
	@printf '  $(BLUE)%-16s$(RESET) %s  $(DIM)tools/check_*.py + hugo --minify$(RESET)\n' 'check' 'must pass before any push'
	@printf '  $(BLUE)%-16s$(RESET) %s\n' 'status' 'you-are-here + suggested next command'
	@printf '  $(BLUE)%-16s$(RESET) %s\n' 'doctor' 'prereqs (hugo / submodule / identity / gh)'
	@printf '  $(BLUE)%-16s$(RESET) %s  $(DIM)git push origin main && gh run watch$(RESET)\n' 'push' 'check, then push + watch deploy'
	@printf '  $(BLUE)%-16s$(RESET) %s  $(DIM)git add -A && git commit && push$(RESET)\n' 'publish' 'check + commit MSG + push + watch'
	@printf '\n$(DIM)Everything else (build, migrate, legacy Jekyll):  make help-all$(RESET)\n'
	@echo ""
	@./tools/site.sh status --brief

help-all:
	@grep --color=never -hE '^(##@ |[^ .]+: .*?## )' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "} \
			/^##@ / { printf "\n$(BOLD)%s$(RESET)\n", substr($$0, 5) } \
			/:.*?## / { printf "  $(BLUE)%-22s$(RESET) %s\n", $$1, $$2 }'
	@echo ""

##@ Daily (this is the loop)

setup: ## First clone: hugo extended, Blowfish submodule, git author, gh credentials
	@./tools/site.sh setup

draft: ## Create a draft post bundle. Usage: make draft POST=my_thought
	@$(MAKE) --no-print-directory new POST="$(POST)"

new: ## Same as draft. Usage: make new POST=my_thought (underscores preferred)
	@test -n "$(POST)" || (echo "ERROR: pass POST=slug, e.g. make draft POST=hello_world" && exit 1)
	@slug=$$(echo "$(POST)" | tr '-' '_'); \
	  if [ "$$slug" != "$(POST)" ]; then echo "Note: normalized POST '$(POST)' -> '$$slug' (underscores)"; fi; \
	  hugo new "content/blog/$$(date +%Y)/$$slug/index.md"; \
	  echo "Created: content/blog/$$(date +%Y)/$$slug/index.md (draft=true)"; \
	  echo "Next: make preview"

preview: ## Dev server with drafts (localhost:1313). Alias: serve
	@$(MAKE) --no-print-directory serve

serve: ## Same as preview — hugo server -D --navigateToChanged
	hugo server -D --navigateToChanged

check: check-imports check-frontmatter check-slugs check-taxonomies check-build check-content check-links ## Pre-push gate (run this before push / publish)
	@echo ""
	@echo "$(GREEN)All checks passed.$(RESET)  $(DIM)next: make push   or   make publish MSG=\"…\"$(RESET)"

status: ## Branch, dirty files, drafts, suggested next command
	@./tools/site.sh status

doctor: ## Verify hugo extended, theme submodule, git author, gh
	@./tools/site.sh doctor

push: check ## check → git push origin/main → watch GitHub Actions
	@$(MAKE) --no-print-directory _push-and-watch

publish: check ## check → git add -A → commit MSG → push main → watch. Usage: make publish MSG="post: foo"
	@test -n "$(MSG)" || (echo "ERROR: pass MSG=\"...\"" && exit 1)
	@echo "NOTE: live site deploys from main via GitHub Actions (Hugo). master is legacy Jekyll freeze only."
	git add -A
	git commit -m "$(MSG)"
	@$(MAKE) --no-print-directory _push-and-watch

_push-and-watch:
	@./tools/site.sh status --brief
	@./tools/push-and-watch.sh

##@ Author (extras)

new-page: ## Create a top-level page. Usage: make new-page PAGE=resume
	@test -n "$(PAGE)" || (echo "ERROR: pass PAGE=name, e.g. make new-page PAGE=resume" && exit 1)
	hugo new content/$(PAGE).md
	@echo "Created: content/$(PAGE).md"

##@ Preview / build extras

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

##@ Check pieces (also: make check)

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

check-links-external: ## Also check external (http/https) links — slow and flaky
	@test -d public || (echo "no public/ - run 'make check-build' first" && exit 1)
	@python3 tools/check_links.py --external

##@ Migration (one-time, removable after content is in)

peek-post: ## View a Jekyll post from master. Usage: make peek-post POST=2018-01-24-name
	@test -n "$(POST)" || (echo "ERROR: pass POST=YYYY-MM-DD-slug" && exit 1)
	@git show master:_posts/$(POST).md

list-legacy-posts: ## List all Jekyll posts on origin/source
	@git ls-tree -r --name-only origin/source -- _posts | sort

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
