#!/usr/bin/env python3
"""Convert Jekyll posts (origin/source:_posts/) to Hugo page bundles.

Reads posts directly from `git show origin/source:_posts/<file>` so master/source
don't need to be checked out. Emits to content/blog/<slug>/index.md.

Conversion rules (validated against the hand-converted primer_git post):

Front matter (Jekyll YAML -> Hugo TOML):
    layout         -> drop
    comments       -> drop; insert TOML TODO marker comment instead
    title          -> title = "..."
    date           -> YAML `date` first (Jekyll's source of truth for the URL date), normalized to
                      ISO YYYY-MM-DD via stdlib strptime against a small set of known formats
                      ('Apr 22, 2016', 'January 9, 2015, 7:08 PM', etc). Falls back to the
                      filename date only if the YAML date is missing or unparseable.
    categories     -> categories = ["..."]
    tags           -> tags = ["..."]
    excerpt        -> summary = "..."
    mathjax: true  -> prepend `{{< katex >}}` shortcode to body (Blowfish renders KaTeX
                      only when this shortcode is present on the page)
    permalink      -> drop (covered by global [permalinks] config)
    +slug          -> add explicitly from filename

Body transforms:
    - Drop the `* content\n{:toc}` Kramdown TOC marker
    - Strip `{% comment %} ... {% endcomment %}` blocks (and any liquid inside)
    - Drop bare `{{ site.base_url }}` and `{{ site.baseurl }}` (paths already absolute)
    - Replace the one-off `{{"/about" | prepend: ... }}` with `/about`
    - Leave reference-style links, raw HTML (iframes), emoji shortcodes alone
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

POST_FNAME_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})-(.+)\.md$")
COMMENT_BLOCK_RE = re.compile(r"\{%\s*comment\s*%\}.*?\{%\s*endcomment\s*%\}", re.DOTALL)
SITE_BASEURL_RE = re.compile(r"\{\{\s*site\.base_?url\s*\}\}")
LIQUID_ABOUT_RE = re.compile(
    r"""\{\{\s*["']/about["']\s*\|\s*prepend:\s*site\.baseurl\s*\|\s*prepend:\s*site\.url\s*\}\}"""
)
TOC_MARKER_RE = re.compile(r"^\*\s+content\s*\n\{:toc\}\s*\n?", re.MULTILINE)


def list_legacy_posts(ref: str) -> list[str]:
    out = subprocess.check_output(
        ["git", "ls-tree", "-r", "--name-only", ref, "--", "_posts"],
        text=True,
    )
    return sorted(p for p in out.splitlines() if p.endswith(".md"))


def read_legacy_post(ref: str, path: str) -> str:
    return subprocess.check_output(["git", "show", f"{ref}:{path}"], text=True)


def split_frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---"):
        raise ValueError("post is missing YAML front matter")
    parts = text.split("---", 2)
    if len(parts) < 3:
        raise ValueError("malformed front matter (no closing ---)")
    raw_fm, body = parts[1], parts[2]
    fm: dict[str, str] = {}
    for line in raw_fm.splitlines():
        line = line.rstrip()
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        fm[key.strip()] = value.strip()
    return fm, body.lstrip("\n")


def parse_yaml_list(value: str) -> list[str]:
    """Parse a YAML inline list like `[Tips, Git, "Foo Bar"]` into Python list."""
    s = value.strip()
    if not (s.startswith("[") and s.endswith("]")):
        return [s.strip().strip('"').strip("'")] if s else []
    inner = s[1:-1].strip()
    if not inner:
        return []
    items = []
    for raw in inner.split(","):
        items.append(raw.strip().strip('"').strip("'"))
    return items


def toml_string(value: str) -> str:
    """Escape a string for a TOML basic-string literal."""
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def toml_string_list(items: list[str]) -> str:
    return "[" + ", ".join(toml_string(i) for i in items) + "]"


def build_frontmatter(fm: dict[str, str], slug: str, date: str) -> str:
    out: list[str] = ["+++"]

    title = fm.get("title", "").strip()
    if title.startswith('"') and title.endswith('"'):
        title = title[1:-1]
    elif title.startswith("'") and title.endswith("'"):
        title = title[1:-1]
    out.append(f"title = {toml_string(title)}")

    out.append(f"date = {date}")

    out.append(f"slug = {toml_string(slug)}")

    if "categories" in fm:
        cats = parse_yaml_list(fm["categories"])
        if cats:
            out.append(f"categories = {toml_string_list(cats)}")

    if "tags" in fm:
        tags = parse_yaml_list(fm["tags"])
        if tags:
            out.append(f"tags = {toml_string_list(tags)}")

    if "excerpt" in fm:
        excerpt = fm["excerpt"].strip().strip('"').strip("'")
        if excerpt:
            out.append(f"summary = {toml_string(excerpt)}")

    out.append(
        "# Legacy Jekyll post had `comments: true`; re-enable in N6 once Giscus partial is wired up."
    )
    out.append("+++")
    return "\n".join(out) + "\n"


def needs_katex(fm: dict[str, str]) -> bool:
    return fm.get("mathjax", "").strip().lower() == "true"


# Date formats observed in legacy posts. ISO first, then freeform.
_DATE_FORMATS = (
    "%Y-%m-%d",
    "%Y-%m-%d %H:%M:%S",
    "%b %d, %Y",
    "%B %d, %Y",
    "%B %d, %Y, %I:%M %p",
)


def normalize_yaml_date(raw: str) -> str | None:
    """Normalize a freeform YAML date string to ISO YYYY-MM-DD, or None if unparseable."""
    s = raw.strip().strip('"').strip("'")
    if not s:
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def resolve_date(fm: dict[str, str], filename_date: str) -> str:
    """Jekyll prefers the YAML date over the filename date when both are present
    and parseable. Fall back to the filename date only if YAML is missing or
    in an unrecognized format."""
    yaml_iso = normalize_yaml_date(fm.get("date", ""))
    return yaml_iso or filename_date


def transform_body(body: str) -> str:
    body = COMMENT_BLOCK_RE.sub("", body)
    body = TOC_MARKER_RE.sub("", body)
    body = LIQUID_ABOUT_RE.sub("/about", body)
    body = SITE_BASEURL_RE.sub("", body)
    body = "\n".join(line.rstrip() for line in body.splitlines()) + "\n"
    return body.lstrip("\n")


def convert(text: str, slug: str, filename_date: str) -> tuple[str, str]:
    """Returns (rendered_post_text, resolved_iso_date). The resolved date is
    returned so the caller can pick the right `<year>/` output folder."""
    fm, body = split_frontmatter(text)
    date = resolve_date(fm, filename_date)
    body = transform_body(body)
    if needs_katex(fm):
        body = "{{< katex >}}\n\n" + body
    return build_frontmatter(fm, slug, date) + "\n" + body, date


def slug_from_filename(fname: str) -> tuple[str, str, str]:
    """Return (full_match, slug, iso_date). Filename date is canonical because
    Jekyll's permalinks are derived from it; the YAML `date` field may be
    freeform (e.g. 'Apr 22, 2016') which TOML can't parse."""
    m = POST_FNAME_RE.match(Path(fname).name)
    if not m:
        raise ValueError(f"unexpected post filename: {fname!r}")
    iso_date = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    return m.group(0), m.group(4), iso_date


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ref", default="origin/source", help="git ref holding _posts/ (default: origin/source)")
    ap.add_argument("--out", default="content/blog", help="output dir (default: content/blog)")
    ap.add_argument("--dry-run", action="store_true", help="print to stdout, do not write files")
    ap.add_argument(
        "--only",
        action="append",
        default=[],
        help="convert only matching post filename(s); repeatable. Match is substring.",
    )
    ap.add_argument(
        "--force",
        action="store_true",
        help="overwrite existing index.md (default: skip if file exists)",
    )
    args = ap.parse_args()

    out_root = Path(args.out)
    posts = list_legacy_posts(args.ref)
    if args.only:
        posts = [p for p in posts if any(s in p for s in args.only)]
    if not posts:
        print("No posts matched.", file=sys.stderr)
        return 1

    written = skipped = 0
    for path in posts:
        _, slug, filename_date = slug_from_filename(path)
        try:
            converted, resolved_date = convert(
                read_legacy_post(args.ref, path), slug, filename_date
            )
        except Exception as e:
            print(f"FAIL {path}: {e}", file=sys.stderr)
            continue

        year = resolved_date.split("-")[0]
        target = out_root / year / slug / "index.md"

        if args.dry_run:
            print(f"\n===== {path} -> {target} =====")
            print(converted)
            continue

        if target.exists() and not args.force:
            print(f"SKIP {target} (exists; pass --force to overwrite)")
            skipped += 1
            continue

        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(converted)
        print(f"WROTE {target}")
        written += 1

    if not args.dry_run:
        print(f"\nDone. wrote={written} skipped={skipped} total={len(posts)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
