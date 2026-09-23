# ufo2mstar.github.io

Personal blog (**Hugo + Blowfish**). Live site: https://ufo2mstar.github.io/

Legacy Jekyll freeze lives on the `master` branch and the `legacy-jekyll` tag (rollback only). Day-to-day content work is on `main`.

## Content-first recipe

```bash
make draft POST=my_thought   # content/blog/<year>/my_thought/index.md (draft=true)
make preview                 # http://localhost:1313 (includes drafts)
# edit the markdown; leave draft=true until ready
make check                   # frontmatter + build + links
# when Naren says ship: set draft=false, then either
#   PR into main, or
make publish MSG="post: my thought"   # commit + push main + watch Actions
```

Run `make` for the full target list. Author orientation for agents: `AGENTS.md`. Shortcode examples: `docs/authoring-reference.md`.

Hugo version used in CI: **0.158.0 extended** (see `.github/workflows/deploy.yml`).
