# QuickScripts - Agent Guide

> For any AI agent working in `static/qs/`. Read this before touching any file here.

## What this is

QuickScripts is a mini browser-based IDE embedded at `/qs/` on the blog. Users write small JavaScript "scripts" — each script is a self-contained descriptor object that declares UI controls and an `execute` function. The runtime mounts the controls, calls `execute` on every state change (or on button press for async scripts), and writes results back to the controls.

## Directory map

```
static/qs/
  index.html              Entry point. No build step — plain ES modules in the browser.
  css/app.css             All styles. Tailwind utility classes + a few custom qs-* classes.
  js/
    app.js                Top-level orchestrator. Owns routing, tab switching, library list.
    runtime.js            Mounts a descriptor: builds controls, calls execute, applies results.
    tests.js              Runs descriptor.tests and renders results.
    storage.js            load/save from URL, file, localStorage; descriptorToSource serializer.
    editor.js             CodeMirror wrapper (syntax highlighting for code controls).
    fetch.js              qsFetch wrapper (rate-limit info, JSON parse, error shaping).
    toast.js              Toast notification helper.
  scripts/
    format-converter.qs.js  Built-in script: B64/URL/JSON encoding.
    github-metadata.qs.js   Built-in script: GitHub REST API lookup.
```

## The script model

A script is a plain ES module that `export default`s a **descriptor object**. The convention is:

1. `// @ts-check` at the top for editor type hints
2. JSDoc `@typedef` for the State shape
3. Named `const controls = [...]`
4. Helper functions (formatters, validators, sub-steps)
5. The `execute` function
6. `const tests = [...]`
7. `export default { ...metadata, controls, execute, tests }` as the last line

### Descriptor fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Kebab-case, unique. Used in URLs (`?script=id`) and the library list. |
| `title` | string | yes | Shown in the sidebar and page title. |
| `description` | string | recommended | Short subtitle shown below the title in the preview. |
| `trigger` | `'live'`\|`'manual'` | no | Defaults to `'live'` for sync, `'manual'` for async. |
| `controls` | Control[] | yes | See Controls section. |
| `execute` | function | yes | See Execute section. |
| `tests` | Test[] | recommended | See Tests section. |

### The `execute` function

```js
/** @param {State} s @param {Services} svc @returns {Result | Promise<Result>} */
function execute(s, svc) { ... }
```

- `s` - snapshot of the current control state: `{ [controlId]: value, ... }`. Shape matches the State typedef.
- `svc` - services injected by the runtime. Currently `{ fetch }` where `fetch(url)` returns a parsed JSON body or throws on error.
- Return an object whose keys match control IDs in the descriptor. The runtime calls `adapter.setValue(result[id])` for each key.
- Special key suffix `Language`: returning `{ outputLanguage: 'json' }` updates the syntax highlighting of the `output` code control.
- Keys starting with `_` are ignored (useful for carrying intermediate data across chained calls in the future).
- Async is fine. The runtime detects `Promise` and shows a running/success/error status bar automatically.

### State typedef pattern

```js
/** @typedef {{ op: string, input: string, output: string }} State */
```

Match the field names to the `id` values of your controls. This gives you autocomplete and inline docs for `s.fieldName` inside `execute`.

### Services typedef pattern

```js
/** @typedef {{ fetch: (url: string) => Promise<any> }} Services */
```

Only needed for scripts that call `svc.fetch`. Sync-only scripts can omit the second param entirely.

## Controls

Each entry in `controls` is a plain object:

```
{ type, id, label, default, ...type-specific options }
```

| Type | Key fields | Notes |
|---|---|---|
| `input` | `placeholder`, `inputType` | Single-line text. |
| `textarea` | `rows`, `placeholder` | Multi-line plain text editor. |
| `code` | `rows`, `language`, `readonly`, `copyable` | CodeMirror editor. Use for structured output. |
| `select` | `options: [{value, label}]`, `display: 'segmented'\|'dropdown'` | Auto-picks segmented for ≤6 options. |
| `button` | `label` | Triggers a manual `execute` run (sets `trigger` to `'manual'`). |

`copyable: true` adds a copy-to-clipboard button in the control header.
`readonly: true` makes the editor/input non-editable (for output fields).

## Tests

```js
const tests = [
  {
    name: 'descriptive name',
    state: { fieldId: value, ... },       // override defaults for this test
    mockFetch: (url) => ({ ...json }),    // only needed if execute calls svc.fetch
    expect: {
      fieldId: 'exact string',            // deepEqual match
      fieldId: { contains: 'substr' },    // substring check
      fieldId: { regex: /pattern/ },      // regex match
    },
  },
];
```

- `state` is merged onto control defaults — only set the fields relevant to the test.
- If `execute` calls `svc.fetch` and no `mockFetch` is provided, the test throws.
- `mockFetch` receives `(url, opts)` and returns the parsed body (not a Response — the runtime wraps it).

## Adding a new built-in script

1. Create `static/qs/scripts/<id>.qs.js` following the structure above.
2. Register it in the `LIBRARY` array at the top of `js/app.js`:
   ```js
   { id: '<id>', title: '<Title>', icon: '<lucide-icon-name>', url: 'scripts/<id>.qs.js' }
   ```
3. No build step needed — changes are live immediately when the dev server is running.

## What the runtime does NOT do

- No bundling, no transpilation. Scripts run verbatim in the browser as ES modules.
- No DOM access from scripts. `execute` is a pure function: inputs → outputs via the returned object.
- No persistent state between runs. Each `execute` call gets a fresh snapshot of the current control state.
- No cross-script communication. Each script is isolated.

## Backward compat

`descriptor.transform` still works — the runtime and test runner fall back to it if `execute` is absent. All new scripts should use `execute`.

## Linting / type checking

Files use `// @ts-check` with JSDoc for in-editor type hints. No TypeScript compilation. If you add new scripts, follow the same pattern: `@typedef` for State, `@param` / `@returns` on `execute`.
