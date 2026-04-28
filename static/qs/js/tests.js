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

export function runTests(descriptor) {
  const tests = descriptor.tests || [];
  const transform = descriptor.transform;
  if (typeof transform !== 'function') {
    return { compileError: 'descriptor.transform is not a function', results: [] };
  }

  const defaults = {};
  for (const c of (descriptor.controls || [])) defaults[c.id] = c.default ?? '';

  const results = tests.map(t => {
    try {
      const input = { ...defaults, ...(t.state || {}) };
      const out = transform(input) || {};
      const cleanOut = {};
      for (const [k, v] of Object.entries(out)) {
        if (k.endsWith('Language') || k.startsWith('_')) continue;
        cleanOut[k] = v;
      }
      const expected = t.expect || {};
      const checks = Object.entries(expected).map(([k, v]) => ({
        field: k,
        expected: v,
        actual: cleanOut[k],
        pass: deepEqual(cleanOut[k], v),
      }));
      return { name: t.name || '(unnamed)', input, output: cleanOut, checks, pass: checks.every(c => c.pass), error: null };
    } catch (e) {
      return { name: t.name || '(unnamed)', input: t.state || {}, error: e.message, checks: [], pass: false };
    }
  });

  return { results, compileError: null };
}

export function renderTests(descriptor, mountEl) {
  const { results, compileError } = runTests(descriptor);
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

function checkRow(c) {
  const row = document.createElement('div');
  row.className = `text-xs font-mono ${c.pass ? 'text-emerald-300' : 'text-rose-300'}`;

  const field = document.createElement('div');
  field.className = 'text-slate-400 mb-0.5';
  field.innerHTML = `<span class="text-slate-500">field</span> ${escapeHtml(c.field)}`;
  row.appendChild(field);

  row.appendChild(valueLine('expected', c.expected));
  row.appendChild(valueLine('actual  ', c.actual));
  return row;
}

function valueLine(label, value) {
  const line = document.createElement('div');
  line.className = 'flex items-start gap-1.5';
  line.innerHTML = `<span class="text-slate-500">${label}</span><span class="flex-1 break-all">${escapeHtml(JSON.stringify(value))}</span>`;
  line.appendChild(miniCopy(() => typeof value === 'string' ? value : JSON.stringify(value)));
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
