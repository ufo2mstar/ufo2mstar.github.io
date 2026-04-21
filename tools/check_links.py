#!/usr/bin/env python3
"""Check internal links and image refs in the built site.

Reads every *.html under public/, extracts <a href> and <img src>, and verifies
each internal reference resolves to a real file in public/. External links
(http/https) are skipped by default; pass --external to check them too.

Exits 1 on any broken internal reference. Stdlib-only.

Usage: python3 tools/check_links.py [--external] [--public PATH]
"""

from __future__ import annotations

import argparse
import html.parser
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]


class RefCollector(html.parser.HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.refs: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        d = dict(attrs)
        if tag == "a" and d.get("href"):
            self.refs.append(("href", d["href"]))
        elif tag == "img" and d.get("src"):
            self.refs.append(("src", d["src"]))


# Schemes we never check (not URLs we can fetch).
NON_FETCHABLE_SCHEMES = ("mailto", "tel", "javascript", "data", "sms", "ftp")

# Hosts known to bot-block HEAD requests; checking them produces 403/405 noise
# regardless of whether the URL is actually live. Add here as new noise emerges.
NOISY_HOSTS = (
    "twitter.com",
    "x.com",
    "t.co",
    "linkedin.com",
    "www.linkedin.com",
    "facebook.com",
    "www.facebook.com",
)


def is_external(url: str) -> bool:
    p = urllib.parse.urlparse(url)
    return p.scheme in ("http", "https")


def is_noisy(url: str) -> bool:
    p = urllib.parse.urlparse(url)
    return p.hostname in NOISY_HOSTS


def resolve_internal(public: pathlib.Path, page: pathlib.Path, ref: str) -> pathlib.Path | None:
    """Return the resolved file path for an internal ref, or None if it doesn't exist.

    Hugo emits clean URLs like /blog/2017/08/19/foo/ that map to .../foo/index.html.
    """
    p = urllib.parse.urlparse(ref)
    target = p.path
    if not target or target.startswith("#"):
        return page
    if target.startswith("/"):
        rel = target.lstrip("/")
        candidate = public / rel
    else:
        candidate = (page.parent / target).resolve()

    if candidate.is_dir() or str(candidate).endswith("/"):
        candidate = candidate / "index.html"
    if not candidate.suffix:
        idx = candidate / "index.html"
        if idx.exists():
            return idx
    if candidate.exists():
        return candidate
    return None


UA = "Mozilla/5.0 (compatible; link-check/1.0)"


def _try(url: str, method: str, timeout: float) -> tuple[int | None, str | None]:
    req = urllib.request.Request(url, method=method, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, None
    except urllib.error.HTTPError as e:
        return e.code, None
    except Exception as e:
        return None, str(e)


def check_external(url: str, timeout: float = 8.0) -> str | None:
    """Return None if the URL is reachable, else a short error string.

    HEAD first; if the server responds 403/405 (some sites refuse HEAD),
    retry with GET. Treat 2xx and 3xx as success.
    """
    status, err = _try(url, "HEAD", timeout)
    if status is not None and status < 400:
        return None
    if status in (403, 405, 501) or err is not None:
        status2, err2 = _try(url, "GET", timeout)
        if status2 is not None and status2 < 400:
            return None
        if status2 is not None:
            return f"HTTP {status2}"
        return err2
    return f"HTTP {status}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--public", default=str(REPO_ROOT / "public"))
    ap.add_argument("--external", action="store_true", help="also check http(s) links (slow, flaky)")
    ap.add_argument("--include-noisy", action="store_true", help="don't skip known bot-blocked hosts (twitter, linkedin, ...)")
    args = ap.parse_args()

    public = pathlib.Path(args.public).resolve()
    if not public.exists():
        print(f"public/ not found at {public} - run `make build` first", file=sys.stderr)
        return 1

    pages = sorted(public.rglob("*.html"))
    if not pages:
        print("no HTML files found", file=sys.stderr)
        return 1

    broken_internal: list[tuple[pathlib.Path, str]] = []
    broken_external: list[tuple[pathlib.Path, str, str]] = []
    seen_external: dict[str, str | None] = {}
    n_internal = n_external = n_skipped = 0

    for page in pages:
        c = RefCollector()
        c.feed(page.read_text(encoding="utf-8", errors="replace"))
        for _, ref in c.refs:
            ref = ref.strip()
            if not ref or ref.startswith("#"):
                continue
            scheme = urllib.parse.urlparse(ref).scheme
            if scheme in NON_FETCHABLE_SCHEMES:
                continue
            if is_external(ref):
                if not args.external:
                    continue
                if not args.include_noisy and is_noisy(ref):
                    n_skipped += 1
                    continue
                n_external += 1
                if ref not in seen_external:
                    seen_external[ref] = check_external(ref)
                err = seen_external[ref]
                if err:
                    broken_external.append((page, ref, err))
            else:
                n_internal += 1
                if resolve_internal(public, page, ref) is None:
                    broken_internal.append((page, ref))

    print(
        f"scanned {len(pages)} pages, {n_internal} internal refs, "
        f"{n_external} external refs ({n_skipped} skipped as noisy)"
    )

    if broken_internal:
        print(f"\nBROKEN INTERNAL ({len(broken_internal)}):")
        for page, ref in broken_internal:
            print(f"  {page.relative_to(public)}  ->  {ref}")

    if broken_external:
        print(f"\nBROKEN EXTERNAL ({len(broken_external)}):")
        for page, ref, err in broken_external:
            print(f"  {page.relative_to(public)}  ->  {ref}  ({err})")

    if broken_internal:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
