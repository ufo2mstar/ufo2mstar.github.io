#!/usr/bin/env python3
"""Check blog post slug hygiene.

Reports:
  1. Posts where front matter `slug` is redundant (matches folder name)
  2. Posts where `slug` differs from folder name (intentional override?)
  3. Folders using dashes (convention is underscores)

Exits 1 if any issues found (usable in `make check` pipeline).

Optionally fixes:
  --fix-slugs    Remove redundant `slug` lines from front matter
  --fix-dashes   Rename folders that use dashes to use underscores

Stdlib-only. Usage:
  python3 tools/check_slugs.py              # check (report + exit code)
  python3 tools/check_slugs.py --fix-slugs  # remove redundant slug fields
  python3 tools/check_slugs.py --fix-dashes # rename dash folders to underscores
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
BLOG_ROOT = REPO_ROOT / "content" / "blog"


def parse_frontmatter_fields(text: str) -> dict[str, str]:
    """Extract raw key=value pairs from TOML front matter."""
    m = re.match(r"\+\+\+\s*\n(.*?)\n\+\+\+\s*\n", text, re.DOTALL)
    if not m:
        return {}
    out = {}
    for line in m.group(1).splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        key, _, val = s.partition("=")
        key = key.strip()
        val = val.strip().strip("'\"")
        out[key] = val
    return out


def has_dashes(name: str) -> bool:
    return "-" in name


def to_underscores(name: str) -> str:
    return name.replace("-", "_")


def remove_slug_line(text: str) -> str:
    """Remove the slug = '...' line from front matter."""
    return re.sub(r"\n\s*slug\s*=\s*['\"].*?['\"]\s*\n", "\n", text, count=1)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--fix-slugs", action="store_true", help="remove redundant slug fields from front matter")
    ap.add_argument("--fix-dashes", action="store_true", help="rename dash-separated folders to underscores")
    args = ap.parse_args()

    posts = sorted(BLOG_ROOT.glob("*/*/index.md"))
    if not posts:
        print(f"no posts found under {BLOG_ROOT}", file=sys.stderr)
        return 1

    redundant_slugs: list[pathlib.Path] = []
    differing_slugs: list[tuple[pathlib.Path, str, str]] = []
    dash_folders: list[pathlib.Path] = []
    no_slug: list[pathlib.Path] = []

    for p in posts:
        folder = p.parent.name
        text = p.read_text(encoding="utf-8")
        fm = parse_frontmatter_fields(text)

        if "slug" not in fm:
            no_slug.append(p)
        elif fm["slug"] == folder:
            redundant_slugs.append(p)
        else:
            differing_slugs.append((p, folder, fm["slug"]))

        if has_dashes(folder):
            dash_folders.append(p)

    # --- Report ---
    total = len(posts)
    print(f"Scanned {total} posts under {BLOG_ROOT.relative_to(REPO_ROOT)}/\n")

    if no_slug:
        print(f"  Already clean (no slug field): {len(no_slug)}")
        for p in no_slug:
            print(f"    {p.parent.relative_to(REPO_ROOT)}")
        print()

    if redundant_slugs:
        print(f"  Redundant slug (matches folder, safe to remove): {len(redundant_slugs)}")
        for p in redundant_slugs:
            print(f"    {p.parent.relative_to(REPO_ROOT)}")
        print()

    if differing_slugs:
        print(f"  SLUG DIFFERS from folder (needs decision): {len(differing_slugs)}")
        for p, folder, slug in differing_slugs:
            print(f"    {p.parent.relative_to(REPO_ROOT)}")
            print(f"      folder: {folder}")
            print(f"      slug:   {slug}")
        print()

    if dash_folders:
        print(f"  Folders with dashes (could rename to underscores): {len(dash_folders)}")
        for p in dash_folders:
            folder = p.parent.name
            print(f"    {p.parent.relative_to(REPO_ROOT)} -> {to_underscores(folder)}")
        print()

    # Summary
    pct_redundant = (len(redundant_slugs) / total * 100) if total else 0
    print(f"Summary: {len(redundant_slugs)}/{total} ({pct_redundant:.0f}%) have redundant slug fields")
    print(f"         {len(dash_folders)}/{total} use dashes in folder name")
    if differing_slugs:
        print(f"         {len(differing_slugs)} have slug != folder (review manually)")

    # --- Fixes ---
    if args.fix_slugs and redundant_slugs:
        print(f"\n--- Removing redundant slug from {len(redundant_slugs)} posts ---")
        for p in redundant_slugs:
            text = p.read_text(encoding="utf-8")
            new_text = remove_slug_line(text)
            p.write_text(new_text, encoding="utf-8")
            print(f"  fixed: {p.relative_to(REPO_ROOT)}")

    if args.fix_dashes and dash_folders:
        print(f"\n--- Renaming {len(dash_folders)} dash-folders to underscores ---")
        for p in dash_folders:
            old_dir = p.parent
            new_name = to_underscores(old_dir.name)
            new_dir = old_dir.parent / new_name
            if new_dir.exists():
                print(f"  SKIP (target exists): {old_dir.name} -> {new_name}")
                continue
            old_dir.rename(new_dir)
            print(f"  renamed: {old_dir.name} -> {new_name}")
            new_index = new_dir / "index.md"
            text = new_index.read_text(encoding="utf-8")
            fm = parse_frontmatter_fields(text)
            if "slug" in fm and fm["slug"] == old_dir.name:
                new_text = remove_slug_line(text)
                new_index.write_text(new_text, encoding="utf-8")
                print(f"    also removed now-stale slug from front matter")

    has_issues = bool(redundant_slugs or differing_slugs or dash_folders)
    if args.fix_slugs or args.fix_dashes:
        return 0
    return 1 if has_issues else 0


if __name__ == "__main__":
    sys.exit(main())
