# QuickScript Descriptor Schema

A QuickScript is a single ES module that default-exports a descriptor object.
The runtime renders the controls, calls `transform()` on input changes (or button click), and writes results back to the controls.

This doc is the contract: the v2 LLM hookup uses it as the system prompt for generating `.qs.js` files. It is also the human authoring reference.

## Top-level shape

```js
export default {
  id:          'kebab-case-id',
  title:       'Human Title',
  description: 'One-line teaser.',          // optional
  trigger:     'live' | 'manual',           // optional, see below
  controls:    [ /* see Control types */ ],
  transform:   (state, helpers) => result,  // sync or async
  tests:       [ /* optional */ ],
};
```

### Field reference

- `id` - kebab-case identifier. Used as filename (`<id>.qs.js`) and storage key.
- `title` - shown in the preview header.
- `description` - shown under the title.
- `trigger` - when to call `transform`:
  - `'live'` (default for sync) - debounced (~120ms) on every control change.
  - `'manual'` (default for async) - only on explicit `button` click.
- `controls` - ordered list of UI controls (inputs and outputs).
- `transform` - pure logic. See contract below.
- `tests` - optional declarative test cases.

If `transform` is `async`, the runtime defaults `trigger` to `'manual'` and shows a "Running..." status while a fetch is in flight. Setting `trigger: 'live'` on an async transform is allowed but logs a console warning - every keystroke fires a request.

## Control types

Every control must have `id` (matches a key in `state`). Most have `label`. Output-only controls set `readonly: true`.

### `input`

Single-line text/number input.

```js
{ type: 'input', id: 'query', label: 'Identifier',
  default: '', placeholder: 'octocat', inputType: 'text' }
```

Fields: `default`, `placeholder`, `inputType` (`'text' | 'number' | 'email' | ...`), `readonly`.

### `textarea`

Multi-line plain text editor (CodeMirror, no syntax highlighting).

```js
{ type: 'textarea', id: 'input', label: 'Input',
  rows: 4, copyable: true, placeholder: 'Paste here...' }
```

Fields: `rows`, `copyable`, `readonly`, `placeholder`, `default`.

### `code`

Multi-line code editor with syntax highlighting.

```js
{ type: 'code', id: 'output', label: 'Output',
  language: 'json', rows: 12, readonly: true, copyable: true }
```

Fields: `language` (`'text' | 'json' | 'javascript'`), `rows`, `readonly`, `copyable`, `default`.

The language can be changed at runtime by returning `<id>Language: 'json'` from `transform`.

### `select`

Options chooser. Renders as segmented buttons if `options.length <= 6`, otherwise as a dropdown. Force with `display: 'segmented' | 'dropdown'`.

```js
{ type: 'select', id: 'op', label: 'Operation', default: 'base64-encode',
  options: [
    { value: 'base64-encode', label: 'B64 - encode' },
    { value: 'base64-decode', label: 'B64 - decode' },
  ] }
```

### `button`

Triggers `transform()` on click. Required for `trigger: 'manual'` scripts.

```js
{ type: 'button', id: 'go', label: 'Fetch' }
```

## Transform contract

Signature:

```js
transform(state, helpers) => result | Promise<result>
```

- `state` - shallow copy of all control values, keyed by control `id`. Read-only by convention.
- `helpers` - object with sandboxed utilities:
  - `helpers.fetch(url, opts)` - see Helpers below.
- `result` - object whose keys map to control `id`s. Each value is written back via the matching adapter:
  - Plain key `output: '...'` -> `setValue('...')` on control `output`.
  - Suffixed key `outputLanguage: 'json'` -> `setLanguage('json')` on the same control.
  - Keys starting with `_` are ignored (reserved for internal/debug data).

Async transforms can `await fetch(...)` directly. The runtime tracks an incrementing token and discards results from stale runs (e.g. user clicked "Fetch" again before the first request finished).

### Errors

Any thrown error is caught and rendered in the status bar as `Runtime error: <message>`. Prefer returning a user-friendly error string in the output control over throwing.

## Helpers

### `helpers.fetch(url, opts)`

Async, returns parsed JSON. Adds a 10-second timeout, friendly errors on HTTP failures, and an `Accept: application/json` header by default.

```js
const data = await fetch('https://api.github.com/users/octocat');
// or with options:
await fetch(url, { method: 'POST', headers: { ... }, body: { ... }, timeout: 5000 });
```

Throws on non-2xx responses with `HTTP <status> <statusText> - <message>`.
Throws on network failure or timeout.

## Tests

Optional `tests` array. Each test runs `transform` with a state override and asserts on the output.

```js
tests: [
  { name: 'description of behavior',
    state: { /* overrides over control defaults */ },
    expect: { output: 'expected value' } },
],
```

### Match modes

`expect[field]` can be:

- A literal value - deep equality check (`{ output: 'hello' }`).
- A `RegExp` - string match (`{ output: /^hello/ }`).
- An object `{ regex: /pattern/ }` - same as RegExp.
- An object `{ contains: 'substring' }` - `String.includes` check.

### Async tests

For tests that exercise an async `transform` using `helpers.fetch`, provide `mockFetch`:

```js
{ name: 'user lookup',
  state: { kind: 'user', query: 'octocat' },
  mockFetch: (url, opts) => {
    if (!url.endsWith('/users/octocat')) throw new Error('unexpected url');
    return { login: 'octocat', name: 'The Octocat' };
  },
  expect: { output: { contains: '"login": "octocat"' } } },
```

`mockFetch` may return a value (auto-awaited) or a Promise. If absent and the transform calls `fetch`, the test fails with `test attempted real fetch - provide mockFetch`.

## Authoring checklist

When writing or generating a new `.qs.js`:

1. `id` is kebab-case and matches the filename.
2. Every control has a unique `id`.
3. `transform` returns an object whose keys are valid control `id`s.
4. Async transforms include a `button` control (so the manual trigger has something to click).
5. Tests cover the happy path and at least one edge case (empty input, error case).
6. No raw `fetch()` - always use `helpers.fetch` so tests can mock it.

## Examples

See `static/qs/scripts/format-converter.qs.js` for a sync example, and `static/qs/scripts/github-metadata.qs.js` for an async example with mocked tests.
