function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === 'object') {
    const ak = Object.keys(a), bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    return ak.every(k => deepEqual(a[k], b[k]));
  }
  return false;
}

function evalCheck(actual, expected) {
  if (expected instanceof RegExp) {
    return { pass: typeof actual === 'string' && expected.test(actual), kind: 'regex' };
  }
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    if ('regex' in expected) {
      const re = expected.regex instanceof RegExp ? expected.regex : new RegExp(expected.regex);
      return { pass: typeof actual === 'string' && re.test(actual), kind: 'regex' };
    }
    if ('contains' in expected) {
      return { pass: typeof actual === 'string' && actual.includes(expected.contains), kind: 'contains' };
    }
  }
  return { pass: deepEqual(actual, expected), kind: 'equals' };
}

function wrapMockFetch(mock) {
  if (typeof mock !== 'function') return null;
  return async (url, opts) => {
    const v = mock(url, opts);
    return v && typeof v.then === 'function' ? await v : v;
  };
}

export async function runTests(descriptor) {
  const tests = descriptor.tests || [];
  const execute = typeof descriptor.execute === 'function'
    ? descriptor.execute
    : descriptor.transform;
  if (typeof execute !== 'function') {
    return { compileError: 'descriptor must export an `execute` function', results: [] };
  }

  const defaults = {};
  for (const c of (descriptor.controls || [])) defaults[c.id] = c.default ?? '';

  const results = [];
  for (const t of tests) {
    try {
      const input = { ...defaults, ...(t.state || {}) };
      const fetchImpl = wrapMockFetch(t.mockFetch) || (() => { throw new Error('test attempted real fetch - provide mockFetch'); });
      const raw = execute(input, { fetch: fetchImpl });
      const out = (raw && typeof raw.then === 'function' ? await raw : raw) || {};
      const cleanOut = {};
      for (const [k, v] of Object.entries(out)) {
        if (k.endsWith('Language') || k.startsWith('_')) continue;
        cleanOut[k] = v;
      }
      const expected = t.expect || {};
      const checks = Object.entries(expected).map(([k, v]) => {
        const r = evalCheck(cleanOut[k], v);
        return { field: k, expected: v, actual: cleanOut[k], pass: r.pass, kind: r.kind };
      });
      results.push({ name: t.name || '(unnamed)', input, output: cleanOut, checks, pass: checks.every(c => c.pass), error: null });
    } catch (e) {
      results.push({ name: t.name || '(unnamed)', input: t.state || {}, error: e.message, checks: [], pass: false });
    }
  }

  return { results, compileError: null };
}

export async function renderTests(descriptor, mountEl) {
  const { results, compileError } = await runTests(descriptor);
  mountEl.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'max-w-3xl mx-auto space-y-4';

  if (compileError) {
    const err = document.createElement('div');
    err.className = 'p-3 rounded border border-rose-800 bg-rose-950/40 text-rose-300 text-sm';
    err.textContent = 'Logic compile error: ' + compileError;
    wrap.appendChild(err);
    mountEl.appendChild(wrap);
    return { passed: 0, failed: 0, total: 0 };
  }

  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  const userEditable = new Set();
  for (const c of (descriptor.controls || [])) {
    if (!c.readonly && c.type !== 'button') userEditable.add(c.id);
  }

  const summary = document.createElement('div');
  summary.className = 'flex items-center justify-between';
  summary.innerHTML = `
    <div>
      <h2 class="text-lg font-semibold text-slate-100">Tests</h2>
      <p class="text-xs text-slate-400">Declared in <code class="text-slate-300">descriptor.tests</code></p>
    </div>
    <div class="flex items-center gap-3 text-sm">
      <span class="px-2.5 py-1 rounded-md bg-emerald-900/40 border border-emerald-800 text-emerald-300">${passed} pass</span>
      <span class="px-2.5 py-1 rounded-md ${total - passed > 0 ? 'bg-rose-900/40 border border-rose-800 text-rose-300' : 'bg-slate-800 border border-slate-700 text-slate-400'}">${total - passed} fail</span>
      <span class="text-slate-500">/ ${total}</span>
    </div>
  `;
  wrap.appendChild(summary);

  if (total === 0) {
    const empty = document.createElement('div');
    empty.className = 'p-6 rounded-md border border-dashed border-slate-700 text-center text-sm text-slate-500';
    empty.textContent = 'No tests defined. Add a `tests` array to the descriptor in Code View.';
    wrap.appendChild(empty);
    mountEl.appendChild(wrap);
    return { passed, failed: 0, total };
  }

  for (const r of results) {
    const card = document.createElement('div');
    card.className = `rounded-md border ${r.pass ? 'border-emerald-900/60 bg-emerald-950/20' : 'border-rose-900/60 bg-rose-950/20'} overflow-hidden`;

    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5 transition';
    head.innerHTML = `
      <i data-lucide="${r.pass ? 'check-circle-2' : 'x-circle'}" class="w-4 h-4 ${r.pass ? 'text-emerald-400' : 'text-rose-400'}"></i>
      <span class="text-sm font-medium text-slate-100 flex-1 truncate">${escapeHtml(r.name)}</span>
      <i data-lucide="chevron-down" class="w-4 h-4 text-slate-500 transition-transform"></i>
    `;
    const body = document.createElement('div');
    body.className = 'hidden border-t border-white/5 bg-slate-950/40 p-3 space-y-2';

    const displayInput = filterToKeys(r.input, userEditable);
    if (Object.keys(displayInput).length > 0) {
      body.appendChild(inputBlock(displayInput));
    }

    if (r.error) {
      const e = document.createElement('div');
      e.className = 'text-xs text-rose-300 font-mono';
      e.textContent = 'Error: ' + r.error;
      body.appendChild(e);
    } else {
      for (const c of r.checks) {
        body.appendChild(checkRow(c));
      }
    }

    head.addEventListener('click', () => {
      const open = !body.classList.contains('hidden');
      body.classList.toggle('hidden', open);
      head.querySelector('[data-lucide="chevron-down"]')?.classList.toggle('rotate-180', !open);
    });

    if (!r.pass) body.classList.remove('hidden');

    card.appendChild(head);
    card.appendChild(body);
    wrap.appendChild(card);
  }

  mountEl.appendChild(wrap);
  if (window.lucide) window.lucide.createIcons();
  return { passed, failed: total - passed, total };
}

function filterToKeys(obj, allowed) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (allowed.has(k)) out[k] = v;
  }
  return out;
}

function inputBlock(input) {
  const wrap = document.createElement('div');
  wrap.className = 'text-xs font-mono pb-2 mb-1 border-b border-white/5';

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-1';
  header.innerHTML = `<span class="text-slate-500">input</span>`;
  const json = JSON.stringify(input, null, 2);
  header.appendChild(miniCopy(() => json));
  wrap.appendChild(header);

  const pre = document.createElement('pre');
  pre.className = 'text-slate-300 whitespace-pre-wrap break-all leading-snug';
  pre.textContent = json;
  wrap.appendChild(pre);

  return wrap;
}

function checkRow(c) {
  const row = document.createElement('div');
  row.className = `text-xs font-mono ${c.pass ? 'text-emerald-300' : 'text-rose-300'}`;

  const field = document.createElement('div');
  field.className = 'text-slate-400 mb-0.5';
  const kindLabel = c.kind && c.kind !== 'equals' ? ` <span class="text-slate-600">(${c.kind})</span>` : '';
  field.innerHTML = `<span class="text-slate-500">field</span> ${escapeHtml(c.field)}${kindLabel}`;
  row.appendChild(field);

  row.appendChild(valueLine('expected', c.expected));
  row.appendChild(valueLine('actual  ', c.actual));
  return row;
}

function stringifyValue(v) {
  if (v instanceof RegExp) return v.toString();
  if (v && typeof v === 'object' && v.regex) return (v.regex instanceof RegExp ? v.regex : new RegExp(v.regex)).toString();
  if (v && typeof v === 'object' && 'contains' in v) return `contains(${JSON.stringify(v.contains)})`;
  return JSON.stringify(v);
}

function valueLine(label, value) {
  const line = document.createElement('div');
  line.className = 'flex items-start gap-1.5';
  const display = stringifyValue(value);
  line.innerHTML = `<span class="text-slate-500">${label}</span><span class="flex-1 break-all">${escapeHtml(display)}</span>`;
  line.appendChild(miniCopy(() => typeof value === 'string' ? value : display));
  return line;
}

function miniCopy(getText) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'qs-copy-mini';
  btn.title = 'Copy raw value';
  btn.innerHTML = '<i data-lucide="copy" class="w-3 h-3"></i>';
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(getText());
      btn.dataset.copied = 'true';
      btn.querySelector('i')?.setAttribute('data-lucide', 'check');
      if (window.lucide) window.lucide.createIcons();
      setTimeout(() => {
        btn.dataset.copied = 'false';
        btn.querySelector('i')?.setAttribute('data-lucide', 'copy');
        if (window.lucide) window.lucide.createIcons();
      }, 900);
    } catch {}
  });
  return btn;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
