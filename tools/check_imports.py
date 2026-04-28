#!/usr/bin/env python3
"""Flag unused imports in tools/*.py.

Catches the class of bug where a tool imports a third-party module
(e.g. PyYAML) it doesn't actually use. Such an import works locally if
the dep happens to be installed system-wide, but fails on a clean CI
Python with ModuleNotFoundError. Linting at the source level catches
it regardless of what's installed where.

Stdlib-only. Usage: python3 tools/check_imports.py
"""

from __future__ import annotations

import ast
import pathlib
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
TOOLS = REPO_ROOT / "tools"


def unused_imports(path: pathlib.Path) -> list[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))

    imports: dict[str, int] = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                name = alias.asname or alias.name.split(".")[0]
                imports[name] = node.lineno
        elif isinstance(node, ast.ImportFrom):
            if node.module == "__future__":
                continue
            for alias in node.names:
                if alias.name == "*":
                    continue
                imports[alias.asname or alias.name] = node.lineno

    used: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            used.add(node.id)
        elif isinstance(node, ast.Attribute):
            n: ast.AST = node
            while isinstance(n, ast.Attribute):
                n = n.value
            if isinstance(n, ast.Name):
                used.add(n.id)

    return [
        f"{path.relative_to(REPO_ROOT)}:{lineno}: '{name}' imported but unused"
        for name, lineno in sorted(imports.items(), key=lambda kv: kv[1])
        if name not in used
    ]


def main() -> int:
    errs: list[str] = []
    for py in sorted(TOOLS.glob("*.py")):
        errs.extend(unused_imports(py))
    if errs:
        for e in errs:
            print(e, file=sys.stderr)
        return 1
    print(f"no unused imports in {TOOLS.relative_to(REPO_ROOT)}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
