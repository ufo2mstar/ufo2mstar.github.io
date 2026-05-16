#!/usr/bin/env python3
"""Validate categories and tags against an allowlist.

Every category and tag in a post's front matter must appear in
tools/allowed_taxonomies.yaml. Auto-sorts the allowlist file
(case-insensitive) on every run so you can add terms anywhere.

With --fix, unknown terms that have no close match (not a typo)
are auto-added to the allowlist. Terms with a close match still
fail so you can decide whether it's a typo or intentionally new.

Exits 1 on any unknown term (after fix attempts). Stdlib-only.

Usage: python3 tools/check_taxonomies.py [--fix]
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
BLOG_ROOT = REPO_ROOT / "content" / "blog"
ALLOWLIST_PATH = REPO_ROOT / "tools" / "allowed_taxonomies.yaml"


def parse_toml_frontmatter(text: str) -> dict | None:
    m = re.match(r"\+\+\+\s*\n(.*?)\n\+\+\+\s*\n", text, re.DOTALL)
    if not m:
        return None
    body = m.group(1)
    out: dict = {}
    for line in body.splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if "=" not in s:
            continue
        key, _, val = s.partition("=")
        key = key.strip()
        val = val.strip()
        if val.startswith("[") and val.endswith("]"):
            inner = val[1:-1].strip()
            if not inner:
                out[key] = []
            else:
                items = [
                    p.strip().strip('"').strip("'")
                    for p in re.split(r",(?=(?:[^\"']*[\"'][^\"']*[\"'])*[^\"']*$)", inner)
                ]
                out[key] = [i for i in items if i]
        elif val.startswith('"') and val.endswith('"'):
            out[key] = val[1:-1]
        elif val.startswith("'") and val.endswith("'"):
            out[key] = val[1:-1]
        elif val.lower() in ("true", "false"):
            out[key] = val.lower() == "true"
        else:
            out[key] = val
    return out


def parse_and_sort_allowlist(path: pathlib.Path) -> dict[str, list[str]]:
    """Parse the YAML allowlist, auto-sort each section, rewrite if changed."""
    raw = path.read_text(encoding="utf-8")
    lines = raw.splitlines()

    # Collect header comments (before first key)
    header: list[str] = []
    sections: list[tuple[str, list[str]]] = []
    current_key: str | None = None
    current_items: list[str] = []

    for line in lines:
        stripped = line.strip()
        if current_key is None and sections == [] and (not stripped or stripped.startswith("#")):
            header.append(line)
            continue
        if not line.startswith(" ") and stripped.endswith(":") and not stripped.startswith("#"):
            if current_key is not None:
                sections.append((current_key, current_items))
            current_key = stripped[:-1]
            current_items = []
        elif current_key is not None and stripped.startswith("- "):
            current_items.append(stripped[2:].strip())
    if current_key is not None:
        sections.append((current_key, current_items))

    result: dict[str, list[str]] = {}
    needs_write = False
    for key, items in sections:
        sorted_items = sorted(items, key=str.lower)
        if items != sorted_items:
            needs_write = True
        result[key] = sorted_items

    if needs_write:
        out: list[str] = header[:]
        for key, items in sections:
            out.append("")
            out.append(f"{key}:")
            for item in result[key]:
                out.append(f"  - {item}")
        out.append("")
        path.write_text("\n".join(out), encoding="utf-8")
        print(f"  auto-sorted {path.relative_to(REPO_ROOT)}")

    return result


def closest_match(term: str, allowed: set[str]) -> str | None:
    """Return the closest allowed term if edit distance <= 2, else None.

    Short terms (<= 3 chars) need an exact-case-insensitive near-miss to be
    useful suggestions; the edit-distance-2 radius is too wide for them
    (TV matches AI, Kids matches Tips).
    """
    threshold = 1 if len(term) <= 4 else 2
    best, best_dist = None, threshold + 1
    for candidate in allowed:
        d = _edit_distance(term.lower(), candidate.lower(), best_dist)
        if d < best_dist:
            best, best_dist = candidate, d
    return best


def _edit_distance(a: str, b: str, cutoff: int) -> int:
    if abs(len(a) - len(b)) >= cutoff:
        return cutoff
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a):
        curr = [i + 1] + [0] * len(b)
        for j, cb in enumerate(b):
            curr[j + 1] = min(
                prev[j + 1] + 1,
                curr[j] + 1,
                prev[j] + (0 if ca == cb else 1),
            )
        if min(curr) >= cutoff:
            return cutoff
        prev = curr
    return prev[len(b)]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--fix",
        action="store_true",
        help="auto-add genuinely new terms (no close match) to the allowlist",
    )
    args = ap.parse_args()

    if not ALLOWLIST_PATH.exists():
        print(f"allowlist not found: {ALLOWLIST_PATH.relative_to(REPO_ROOT)}", file=sys.stderr)
        return 1

    allowed = parse_and_sort_allowlist(ALLOWLIST_PATH)
    allowed_cats = allowed.get("categories", [])
    allowed_tags = allowed.get("tags", [])

    failed = 0
    cat_set = set(allowed_cats)
    tag_set = set(allowed_tags)
    auto_added_cats: set[str] = set()
    auto_added_tags: set[str] = set()

    posts = sorted(BLOG_ROOT.glob("*/*/index.md"))
    if not posts:
        print(f"no posts found under {BLOG_ROOT}", file=sys.stderr)
        return 1

    for p in posts:
        fm = parse_toml_frontmatter(p.read_text(encoding="utf-8"))
        if fm is None:
            continue

        errs: list[str] = []
        for cat in fm.get("categories", []):
            if cat not in cat_set:
                hint = closest_match(cat, cat_set)
                if args.fix and not hint:
                    auto_added_cats.add(cat)
                    cat_set.add(cat)
                else:
                    msg = f"unknown category: '{cat}'"
                    if hint:
                        msg += f" (did you mean '{hint}'?)"
                    errs.append(msg)

        for tag in fm.get("tags", []):
            if tag not in tag_set:
                hint = closest_match(tag, tag_set)
                if args.fix and not hint:
                    auto_added_tags.add(tag)
                    tag_set.add(tag)
                else:
                    msg = f"unknown tag: '{tag}'"
                    if hint:
                        msg += f" (did you mean '{hint}'?)"
                    errs.append(msg)

        rel = p.relative_to(REPO_ROOT)
        if errs:
            failed += 1
            print(f"FAIL {rel}")
            for e in errs:
                print(f"     - {e}")
        else:
            print(f"  ok {rel}")

    if auto_added_cats or auto_added_tags:
        _write_additions(allowed, auto_added_cats, auto_added_tags)
        all_added = sorted(auto_added_cats | auto_added_tags, key=str.lower)
        print(f"\n  auto-added to allowlist: {', '.join(all_added)}")

    total = len(posts)
    print(f"\n{total - failed}/{total} posts ok ({failed} failed)")
    if failed:
        print(f"\nTo fix: add the term to {ALLOWLIST_PATH.relative_to(REPO_ROOT)} (sorted), or correct the typo")
    return 1 if failed else 0


def _write_additions(
    allowed: dict[str, list[str]],
    new_cats: set[str],
    new_tags: set[str],
) -> None:
    """Insert new terms into the allowlist YAML, keeping it sorted."""
    raw = ALLOWLIST_PATH.read_text(encoding="utf-8")
    lines = raw.splitlines()

    header: list[str] = []
    sections: list[tuple[str, list[str]]] = []
    current_key: str | None = None
    current_items: list[str] = []

    for line in lines:
        stripped = line.strip()
        if current_key is None and sections == [] and (not stripped or stripped.startswith("#")):
            header.append(line)
            continue
        if not line.startswith(" ") and stripped.endswith(":") and not stripped.startswith("#"):
            if current_key is not None:
                sections.append((current_key, current_items))
            current_key = stripped[:-1]
            current_items = []
        elif current_key is not None and stripped.startswith("- "):
            current_items.append(stripped[2:].strip())
    if current_key is not None:
        sections.append((current_key, current_items))

    out: list[str] = header[:]
    for key, items in sections:
        merged = set(items)
        if key == "categories":
            merged |= new_cats
        elif key == "tags":
            merged |= new_tags
        out.append("")
        out.append(f"{key}:")
        for item in sorted(merged, key=str.lower):
            out.append(f"  - {item}")
    out.append("")
    ALLOWLIST_PATH.write_text("\n".join(out), encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
