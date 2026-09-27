#!/usr/bin/env bash
# Status / doctor / setup for the preview → check → push loop.
# Makefile stays thin; branching lives here (see AGENTS.md).

set -euo pipefail

BLUE=$(tput setaf 4 2>/dev/null || true)
GREEN=$(tput setaf 2 2>/dev/null || true)
YELLOW=$(tput setaf 3 2>/dev/null || true)
RED=$(tput setaf 1 2>/dev/null || true)
BOLD=$(tput bold 2>/dev/null || true)
DIM=$(tput dim 2>/dev/null || true)
RESET=$(tput sgr0 2>/dev/null || true)

WANT_HUGO="0.158.0"
WANT_NAME="ufo2mstar"
WANT_EMAIL="ufo2mstar@gmail.com"
ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
# Prefer the real binary `make setup` drops here over a broken mise shim.
export PATH="$ROOT/bin:$PATH"

ok()   { printf "  ${GREEN}●${RESET}  %s\n" "$*"; }
warn() { printf "  ${YELLOW}○${RESET}  %s\n" "$*"; }
bad()  { printf "  ${RED}✗${RESET}  %s\n" "$*"; }
dim()  { printf "  ${DIM}     %s${RESET}\n" "$*"; }

branch() { git branch --show-current; }

# A hugo that actually runs (mise shims without a version look like they're on PATH).
hugo_bin() {
  local cand ver
  for cand in "$ROOT/bin/hugo" "$(command -v hugo 2>/dev/null || true)"; do
    [ -n "$cand" ] && [ -x "$cand" ] || continue
    ver=$("$cand" version 2>/dev/null || true)
    if echo "$ver" | grep -qi hugo; then
      printf '%s' "$cand"
      return 0
    fi
  done
  return 1
}

draft_files() {
  grep -rl --include='index.md' -E '^draft[[:space:]]*=[[:space:]]*true' content 2>/dev/null || true
}

draft_count() {
  draft_files | grep -c . || true
}

ahead_behind() {
  local up
  up=$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true)
  if [ -z "$up" ]; then
    echo "no-upstream"
    return
  fi
  git rev-list --left-right --count "$up"...HEAD | awk '{print $1" "$2}'
}

suggest_next() {
  local b dirty drafts ab behind ahead
  b=$(branch)
  dirty=$(git status --porcelain)
  drafts=$(draft_count)
  ab=$(ahead_behind)
  behind=${ab%% *}
  ahead=${ab##* }

  if ! hugo_bin >/dev/null; then
    printf "${YELLOW}make setup${RESET}  ${DIM}(hugo extended %s not runnable yet)${RESET}\n" "$WANT_HUGO"
    return
  fi
  if [ "$b" != "main" ]; then
    printf "${YELLOW}make check${RESET}  then PR into ${BOLD}main${RESET}  ${DIM}(don't publish from %s)${RESET}\n" "$b"
    return
  fi
  if [ -n "$dirty" ]; then
    printf "${YELLOW}make check${RESET}  then  ${BLUE}make publish MSG=\"post: …\"${RESET}  ${DIM}(flip draft=false first if shipping)${RESET}\n"
    return
  fi
  if [ "$ab" != "no-upstream" ] && [ "${ahead:-0}" != "0" ]; then
    printf "${YELLOW}make push${RESET}  ${DIM}(already committed; check + push main + watch Actions)${RESET}\n"
    return
  fi
  if [ "$ab" != "no-upstream" ] && [ "${behind:-0}" != "0" ]; then
    printf "${YELLOW}git pull${RESET}  ${DIM}(origin/main is ahead)${RESET}\n"
    return
  fi
  if [ "${drafts:-0}" != "0" ]; then
    printf "${BLUE}make preview${RESET}  ${DIM}(%s draft(s) stay local until draft=false)${RESET}\n" "$drafts"
    return
  fi
  printf "${BLUE}make draft POST=slug${RESET}  ${DIM}then make preview${RESET}\n"
}

cmd_status() {
  local brief=${1:-}
  local b dirty n_dirty drafts ab behind ahead
  b=$(branch)
  dirty=$(git status --porcelain)
  n_dirty=$(printf '%s\n' "$dirty" | grep -c . || true)
  drafts=$(draft_count)
  ab=$(ahead_behind)
  behind=${ab%% *}
  ahead=${ab##* }

  if [ "$brief" = "--brief" ]; then
    printf "  ${DIM}now${RESET}  %-8s" "$b"
    if [ -n "$dirty" ]; then
      printf "  ${YELLOW}%s dirty${RESET}" "$n_dirty"
    else
      printf "  ${GREEN}clean${RESET}"
    fi
    if [ "$ab" != "no-upstream" ]; then
      [ "${ahead:-0}" != "0" ] && printf "  ${YELLOW}↑%s${RESET}" "$ahead"
      [ "${behind:-0}" != "0" ] && printf "  ${YELLOW}↓%s${RESET}" "$behind"
    fi
    printf "  ${DIM}%s drafts${RESET}\n" "$drafts"
    printf "  ${DIM}next${RESET} "; suggest_next
    return
  fi

  echo ""
  printf "${BOLD}You are here${RESET}  ${DIM}preview → check → push${RESET}\n"
  echo ""
  printf "  ${BOLD}%-10s${RESET} %s" "branch" "$b"
  if [ "$b" = "main" ]; then
    printf "  ${DIM}(live deploys from here)${RESET}\n"
  else
    printf "  ${YELLOW}WIP — PR into main, don't make publish${RESET}\n"
  fi

  if [ "$ab" = "no-upstream" ]; then
    printf "  ${BOLD}%-10s${RESET} ${YELLOW}no upstream${RESET}\n" "sync"
  else
    printf "  ${BOLD}%-10s${RESET} " "sync"
    if [ "${ahead:-0}" = "0" ] && [ "${behind:-0}" = "0" ]; then
      printf "${GREEN}up to date${RESET} with origin/%s\n" "$b"
    else
      [ "${ahead:-0}" != "0" ] && printf "${YELLOW}%s ahead${RESET} " "$ahead"
      [ "${behind:-0}" != "0" ] && printf "${YELLOW}%s behind${RESET} " "$behind"
      echo
    fi
  fi

  printf "  ${BOLD}%-10s${RESET} " "dirty"
  if [ -z "$dirty" ]; then
    printf "${GREEN}clean${RESET}\n"
  else
    printf "${YELLOW}%s file(s)${RESET}\n" "$n_dirty"
    git status -sb | sed 's/^/           /'
  fi

  printf "  ${BOLD}%-10s${RESET} %s  ${DIM}(draft=true; excluded from build-prod / live)${RESET}\n" "drafts" "$drafts"
  printf "  ${BOLD}%-10s${RESET} " "next"
  suggest_next
  echo ""
}

cmd_doctor() {
  local failed=0
  local bin ver ident email

  echo ""
  printf "${BOLD}Doctor${RESET}  ${DIM}prereqs for preview → push${RESET}\n"
  echo ""

  ident=$(git config user.name || true)
  email=$(git config user.email || true)
  if [ "$ident" = "$WANT_NAME" ] && [ "$email" = "$WANT_EMAIL" ]; then
    ok "git author  $ident <$email>"
  else
    bad "git author  ${ident:-unset} <${email:-unset}>  (want $WANT_NAME <$WANT_EMAIL>)"
    dim "make setup   # locks author on this repo only"
    failed=1
  fi

  if bin=$(hugo_bin); then
    ver=$("$bin" version 2>/dev/null || true)
    if echo "$ver" | grep -qi extended; then
      ok "hugo        $ver"
      echo "$ver" | grep -q "$WANT_HUGO" || \
        warn "CI pins Hugo extended ${WANT_HUGO}  ${DIM}(make setup installs that pin)${RESET}"
    else
      bad "hugo        not extended  ($ver)"
      dim "make setup"
      failed=1
    fi
    dim "$bin"
  else
    bad "hugo        not runnable (mise shim without a pin looks like this)"
    dim "make setup   # Hugo extended ${WANT_HUGO} → ./bin/hugo"
    failed=1
  fi

  if [ -f themes/blowfish/theme.toml ] || [ -f themes/blowfish/hugo.toml ]; then
    ok "theme       themes/blowfish  (submodule present)"
  else
    bad "theme       themes/blowfish missing"
    dim "make setup   # git submodule update --init --recursive"
    failed=1
  fi

  if command -v python3 >/dev/null 2>&1; then
    ok "python3     $(python3 --version 2>&1)"
  else
    bad "python3     not on PATH  (make check needs it)"
    failed=1
  fi

  if command -v gh >/dev/null 2>&1; then
    if gh auth status >/dev/null 2>&1; then
      ok "gh          authenticated  (make push can watch Actions)"
    else
      bad "gh          installed but not logged in"
      dim "gh auth login    # scopes: repo, workflow, read:org"
      failed=1
    fi
  else
    bad "gh          not on PATH  (make push can't watch the deploy)"
    dim "install GitHub CLI, then: gh auth login"
    failed=1
  fi

  echo ""
  if [ "$failed" -ne 0 ]; then
    printf "${RED}make setup${RESET}  ${DIM}then make doctor again${RESET}\n"
    echo ""
    return 1
  fi
  printf "${GREEN}ready.${RESET}  ${DIM}make preview${RESET}  →  ${DIM}make check${RESET}  →  ${DIM}make publish MSG=\"…\"${RESET}\n"
  echo ""
}

install_hugo() {
  local dest="$ROOT/bin/hugo"
  local ver src url tmp os arch asset

  mkdir -p "$ROOT/bin"
  if [ -x "$dest" ]; then
    ver=$("$dest" version 2>/dev/null || true)
    if echo "$ver" | grep -q "$WANT_HUGO" && echo "$ver" | grep -qi extended; then
      ok "hugo        already $WANT_HUGO extended  ($dest)"
      return 0
    fi
  fi

  if command -v mise >/dev/null 2>&1; then
    dim "mise install hugo-extended@${WANT_HUGO}"
    (cd "$ROOT" && mise trust .mise.toml >/dev/null 2>&1 || true && MISE_YES=1 mise install)
    src="$HOME/.local/share/mise/installs/hugo-extended/${WANT_HUGO}/hugo"
    if [ -x "$src" ]; then
      ln -sfn "$src" "$dest"
    fi
  fi

  if [ ! -x "$dest" ] || ! "$dest" version 2>/dev/null | grep -q "$WANT_HUGO"; then
    os=$(uname -s | tr '[:upper:]' '[:lower:]')
    arch=$(uname -m)
    case "$arch" in
      x86_64) arch=amd64 ;;
      aarch64|arm64) arch=arm64 ;;
    esac
    case "$os" in
      linux)  asset="hugo_extended_${WANT_HUGO}_${os}-${arch}.tar.gz" ;;
      darwin) asset="hugo_extended_${WANT_HUGO}_darwin-universal.tar.gz" ;;
      *) bad "unsupported OS $os — install Hugo extended ${WANT_HUGO} yourself"; return 1 ;;
    esac
    url="https://github.com/gohugoio/hugo/releases/download/v${WANT_HUGO}/${asset}"
    dim "download $url"
    tmp=$(mktemp -d)
    curl -fsSL "$url" -o "$tmp/hugo.tgz"
    tar -xzf "$tmp/hugo.tgz" -C "$tmp" hugo
    mv "$tmp/hugo" "$dest"
    chmod +x "$dest"
    rm -rf "$tmp"
  fi

  ver=$("$dest" version 2>/dev/null || true)
  if echo "$ver" | grep -q "$WANT_HUGO" && echo "$ver" | grep -qi extended; then
    ok "hugo        $ver"
    dim "$dest"
  else
    bad "hugo        install failed  ($ver)"
    return 1
  fi
}

cmd_setup() {
  local failed=0

  echo ""
  printf "${BOLD}Setup${RESET}  ${DIM}one-shot: identity, hugo %s, theme, gh credentials${RESET}\n" "$WANT_HUGO"
  echo ""

  git config user.name "$WANT_NAME"
  git config user.email "$WANT_EMAIL"
  ok "git author  $WANT_NAME <$WANT_EMAIL>  ${DIM}(this repo only)${RESET}"

  dim "git submodule update --init --recursive"
  git submodule update --init --recursive
  if [ -f themes/blowfish/theme.toml ] || [ -f themes/blowfish/hugo.toml ]; then
    ok "theme       themes/blowfish"
  else
    bad "theme       submodule missing after update"
    failed=1
  fi

  install_hugo || failed=1

  chmod +x "$ROOT/tools/"*.sh 2>/dev/null || true

  if command -v gh >/dev/null 2>&1; then
    if gh auth status >/dev/null 2>&1; then
      gh auth setup-git
      ok "gh          token wired into git  ${DIM}(https push + Actions watch)${RESET}"
    else
      bad "gh          not logged in — this is the one interactive step"
      dim "gh auth login"
      dim "  GitHub.com → HTTPS → login → scopes include repo + workflow"
      failed=1
    fi
  else
    bad "gh          not installed"
    dim "https://cli.github.com/  then: gh auth login"
    failed=1
  fi

  echo ""
  if [ "$failed" -ne 0 ]; then
    printf "${RED}setup incomplete.${RESET} fix the ✗ items, then ${BLUE}make setup${RESET} again.\n"
    echo ""
    return 1
  fi
  printf "${GREEN}setup complete.${RESET}\n"
  cmd_doctor
}

usage() {
  echo "usage: tools/site.sh status [--brief] | doctor | setup"
  exit 2
}

case "${1:-}" in
  status) shift; cmd_status "${1:-}" ;;
  doctor) cmd_doctor ;;
  setup)  cmd_setup ;;
  *) usage ;;
esac
