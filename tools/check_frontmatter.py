#!/usr/bin/env python3
"""Validate front matter of every blog post.

Checks (per content/blog/<year>/<slug>/index.md):
  - TOML front matter delimited by `+++` exists
  - Required keys present: title, date, slug, categories, tags, summary
  - `slug` matches the parent folder name
  - `date` parses as ISO date and matches the year folder
  - `draft` is either absent or false (warn if true; useful for catching
    accidental drafts before publish)
  - Lists (categories, tags) are non-empty

Exits 1 on any failure. Prints a per-post summary.

Stdlib-only. Usage: python3 tools/check_frontmatter.py [--strict-drafts]
"""

from __future__ import annotations

import argparse
import datetime as dt
import pathlib
import re
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
BLOG_ROOT = REPO_ROOT / "content" / "blog"
REQUIRED = ("title", "date", "slug", "categories", "tags", "summary")


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


def check_post(path: pathlib.Path, strict_drafts: bool) -> list[str]:
    errs: list[str] = []
    fm = parse_toml_frontmatter(path.read_text(encoding="utf-8"))
    if fm is None:
        return ["missing or malformed TOML front matter (+++ delimited)"]

    for key in REQUIRED:
        if key not in fm:
            errs.append(f"missing required key: {key}")

    folder = path.parent.name
    if "slug" in fm and fm["slug"] != folder:
        errs.append(f"slug={fm['slug']!r} does not match folder={folder!r}")

    if "date" in fm:
        date_str = str(fm["date"]).strip()
        try:
            d = dt.date.fromisoformat(date_str)
            year_folder = path.parent.parent.name
            if year_folder.isdigit() and int(year_folder) != d.year:
                errs.append(f"date year {d.year} differs from folder year {year_folder}")
        except ValueError:
            errs.append(f"date {date_str!r} is not ISO YYYY-MM-DD")

    for k in ("categories", "tags"):
        if k in fm and isinstance(fm[k], list) and not fm[k]:
            errs.append(f"{k} list is empty")

    if fm.get("draft") is True:
        msg = "draft=true (will be excluded from prod build)"
        if strict_drafts:
            errs.append(msg)
        else:
            print(f"  ! {path.relative_to(REPO_ROOT)}: {msg}")

    return errs


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--strict-drafts",
        action="store_true",
        help="treat draft=true as a failure (default: warn only)",
    )
    args = ap.parse_args()

    posts = sorted(BLOG_ROOT.glob("*/*/index.md"))
    if not posts:
        print(f"no posts found under {BLOG_ROOT}", file=sys.stderr)
        return 1

    failed = 0
    for p in posts:
        errs = check_post(p, args.strict_drafts)
        rel = p.relative_to(REPO_ROOT)
        if errs:
            failed += 1
            print(f"FAIL {rel}")
            for e in errs:
                print(f"     - {e}")
        else:
            print(f"  ok {rel}")

    total = len(posts)
    print(f"\n{total - failed}/{total} posts ok ({failed} failed)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
