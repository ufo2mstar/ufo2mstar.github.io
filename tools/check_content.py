#!/usr/bin/env python3
"""Smoke-test rendered HTML pages for expected content.

Catches silent rendering failures: shortcodes that produce empty output,
data files that aren't loaded, templates that swallow errors quietly.

Rules are declared in content_rules() — each rule is a page path under
public/ and a list of strings that MUST appear in the rendered HTML.
If any expected string is missing, the check fails.

Also validates that every data/*.yaml file referenced by a datalinkcards
shortcode actually exists and has at least one entry.

Stdlib-only. Usage: python3 tools/check_content.py [--public PATH]
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]


def content_rules() -> list[tuple[str, list[str]]]:
    """Return (page_path_under_public, [expected_strings]).

    Add a new entry whenever you create a data-driven or shortcode-heavy page.
    The strings should be stable content that proves the dynamic part rendered.
    """
    rules: list[tuple[str, list[str]]] = []

    # Auto-generate rules from data files referenced by datalinkcards shortcodes
    content_root = REPO_ROOT / "content"
    data_root = REPO_ROOT / "data"

    for md_file in content_root.rglob("*.md"):
        text = md_file.read_text(encoding="utf-8", errors="replace")
        for m in re.finditer(r'\{\{<\s*datalinkcards\s+"(\w+)"\s*>\}\}', text):
            data_key = m.group(1)
            data_file = data_root / f"{data_key}.yaml"
            if not data_file.exists():
                continue

            # Figure out the URL path for this content file
            page_path = _content_to_public_path(md_file, content_root)
            if not page_path:
                continue

            expected = _titles_from_yaml(data_file)
            if expected:
                rules.append((page_path, expected))

    return rules


def _content_to_public_path(md_file: pathlib.Path, content_root: pathlib.Path) -> str | None:
    """Map a content file to its public/ output path."""
    rel = md_file.relative_to(content_root)
    parts = list(rel.parts)

    if parts[-1] == "index.md":
        parts = parts[:-1]
    elif parts[-1].endswith(".md"):
        parts[-1] = parts[-1][:-3]

    return "/".join(parts) + "/index.html" if parts else "index.html"


def _titles_from_yaml(path: pathlib.Path) -> list[str]:
    """Extract title values from a simple YAML list-of-dicts without PyYAML."""
    titles = []
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^-\s+title:\s+(.+)$", line)
        if m:
            titles.append(m.group(1).strip().strip("'\""))
    return titles


def check_page(public: pathlib.Path, page_path: str, expected: list[str]) -> list[str]:
    """Return list of missing strings for a given page."""
    full = public / page_path
    if not full.exists():
        return [f"page not found: {page_path}"]
    html = full.read_text(encoding="utf-8", errors="replace")
    return [s for s in expected if s not in html]


def check_data_files() -> list[str]:
    """Verify every datalinkcards reference points to a real, non-empty data file."""
    errs: list[str] = []
    content_root = REPO_ROOT / "content"
    data_root = REPO_ROOT / "data"

    for md_file in content_root.rglob("*.md"):
        text = md_file.read_text(encoding="utf-8", errors="replace")
        for m in re.finditer(r'\{\{<\s*datalinkcards\s+"(\w+)"\s*>\}\}', text):
            data_key = m.group(1)
            data_file = data_root / f"{data_key}.yaml"
            rel_md = md_file.relative_to(REPO_ROOT)
            if not data_file.exists():
                errs.append(f"{rel_md}: references data/{data_key}.yaml which does not exist")
            elif data_file.stat().st_size == 0:
                errs.append(f"{rel_md}: data/{data_key}.yaml is empty")
            else:
                titles = _titles_from_yaml(data_file)
                if not titles:
                    errs.append(f"{rel_md}: data/{data_key}.yaml has no entries with 'title'")
    return errs


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--public", default=str(REPO_ROOT / "public"))
    args = ap.parse_args()
    public = pathlib.Path(args.public).resolve()

    failed = 0

    # Phase 1: data file integrity (no build needed)
    data_errs = check_data_files()
    if data_errs:
        print("DATA FILE ERRORS:")
        for e in data_errs:
            print(f"  - {e}")
        failed += len(data_errs)

    # Phase 2: rendered content smoke tests (requires public/)
    if not public.exists():
        print(f"\npublic/ not found at {public} — skipping rendered content checks")
        print("(run 'make check-build' first to generate public/)")
        return 1 if failed else 0

    rules = content_rules()
    if not rules:
        print("no content rules generated (no datalinkcards shortcodes found)")
        return 1 if failed else 0

    for page_path, expected in rules:
        missing = check_page(public, page_path, expected)
        if missing:
            failed += len(missing)
            print(f"FAIL {page_path}")
            for s in missing:
                print(f"     missing: {s!r}")
        else:
            print(f"  ok {page_path} ({len(expected)} expected strings found)")

    if failed:
        print(f"\n{failed} content check(s) failed")
    else:
        print(f"\nall content checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
