const DEBOUNCE_MS = 120;

export function mountRuntime(descriptor, mountEl) {
  const state = initState(descriptor);
  const els = {};

  const container = document.createElement('div');
  container.className = 'space-y-5 max-w-3xl mx-auto';

  if (descriptor.title) {
    const h = document.createElement('h2');
    h.className = 'text-xl font-semibold text-slate-100';
    h.textContent = descriptor.title;
    container.appendChild(h);
  }
  if (descriptor.description) {
    const p = document.createElement('p');
    p.className = 'text-sm text-slate-400 -mt-3';
    p.textContent = descriptor.description;
    container.appendChild(p);
  }

  for (const ctrl of (descriptor.controls || [])) {
    container.appendChild(buildControl(ctrl, state, els, scheduleRun));
  }

  const errorBar = document.createElement('div');
  errorBar.className = 'text-xs text-rose-400 min-h-[1rem] font-mono';
  container.appendChild(errorBar);

  mountEl.replaceChildren(container);

  const transform = typeof descriptor.transform === 'function'
    ? descriptor.transform
    : (() => ({}));

  let timer = null;
  function scheduleRun() {
    if (descriptor.trigger === 'manual') return;
    clearTimeout(timer);
    timer = setTimeout(runLogic, DEBOUNCE_MS);
  }

  function runLogic() {
    try {
      const result = transform({ ...state });
      errorBar.textContent = '';
      if (!result || typeof result !== 'object') return;

      for (const [k, v] of Object.entries(result)) {
        if (k.endsWith('Language')) continue;
        if (k.startsWith('_')) continue;
        state[k] = v;
        const el = els[k];
        if (!el) continue;
        const next = String(v ?? '');
        if (el.value !== next) el.value = next;
      }
    } catch (e) {
      errorBar.textContent = 'Runtime error: ' + e.message;
    }
  }

  runLogic();

  return { state, destroy: () => { clearTimeout(timer); } };
}

function initState(d) {
  const s = {};
  for (const c of (d.controls || [])) s[c.id] = c.default ?? '';
  return s;
}

function controlLabel(ctrl) {
  if (!ctrl.label || ctrl.type === 'button') return null;
  const lbl = document.createElement('label');
  lbl.className = 'block text-xs uppercase tracking-wider font-medium text-slate-400 mb-1.5';
  lbl.textContent = ctrl.label;
  return lbl;
}

function copyButton(getText) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'flex items-center gap-1 text-xs text-slate-400 hover:text-slate-100 transition px-2 py-1 rounded hover:bg-white/5';
  btn.innerHTML = '<i data-lucide="copy" class="w-3.5 h-3.5"></i><span>copy</span>';
  btn.title = 'Copy to clipboard';
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(getText());
      btn.querySelector('span').textContent = 'copied';
      btn.querySelector('i')?.setAttribute('data-lucide', 'check');
      if (window.lucide) window.lucide.createIcons();
      setTimeout(() => {
        btn.querySelector('span').textContent = 'copy';
        btn.querySelector('i')?.setAttribute('data-lucide', 'copy');
        if (window.lucide) window.lucide.createIcons();
      }, 900);
    } catch {
      btn.querySelector('span').textContent = 'failed';
    }
  });
  return btn;
}

function buildControl(ctrl, state, els, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-1.5';

  const headerRow = document.createElement('div');
  headerRow.className = 'flex items-center justify-between';
  const lbl = controlLabel(ctrl);
  if (lbl) headerRow.appendChild(lbl); else headerRow.appendChild(document.createElement('div'));

  let getText = () => state[ctrl.id] ?? '';
  if (ctrl.copyable) headerRow.appendChild(copyButton(() => getText()));
  if (lbl || ctrl.copyable) wrap.appendChild(headerRow);

  let el;
  switch (ctrl.type) {
    case 'textarea': {
      el = document.createElement('textarea');
      el.rows = ctrl.rows || 4;
      el.spellcheck = false;
      el.className = 'w-full bg-slate-950 border border-slate-700 rounded-md p-3 text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 resize-y';
      if (ctrl.placeholder) el.placeholder = ctrl.placeholder;
      if (ctrl.readonly) el.readOnly = true;
      el.value = state[ctrl.id] ?? '';
      el.addEventListener('input', () => { state[ctrl.id] = el.value; onChange(); });
      els[ctrl.id] = el;
      wrap.appendChild(el);
      break;
    }
    case 'code': {
      el = document.createElement('textarea');
      el.rows = ctrl.rows || 8;
      el.spellcheck = false;
      el.className = 'w-full bg-slate-950 border border-slate-700 rounded-md p-3 text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 resize-y';
      if (ctrl.placeholder) el.placeholder = ctrl.placeholder;
      if (ctrl.readonly) el.readOnly = true;
      el.value = state[ctrl.id] ?? '';
      el.addEventListener('input', () => { state[ctrl.id] = el.value; onChange(); });
      els[ctrl.id] = el;
      wrap.appendChild(el);
      break;
    }
    case 'input': {
      el = document.createElement('input');
      el.type = ctrl.inputType || 'text';
      el.className = 'w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500';
      if (ctrl.placeholder) el.placeholder = ctrl.placeholder;
      if (ctrl.readonly) el.readOnly = true;
      el.value = state[ctrl.id] ?? '';
      el.addEventListener('input', () => { state[ctrl.id] = el.value; onChange(); });
      els[ctrl.id] = el;
      wrap.appendChild(el);
      break;
    }
    case 'select': {
      el = document.createElement('select');
      el.className = 'w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500';
      for (const opt of (ctrl.options || [])) {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        el.appendChild(o);
      }
      el.value = state[ctrl.id] ?? '';
      el.addEventListener('change', () => { state[ctrl.id] = el.value; onChange(); });
      els[ctrl.id] = el;
      wrap.appendChild(el);
      break;
    }
    case 'button': {
      el = document.createElement('button');
      el.type = 'button';
      el.className = 'inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-md text-sm transition';
      el.textContent = ctrl.label || 'Run';
      el.addEventListener('click', () => onChange());
      els[ctrl.id] = el;
      wrap.appendChild(el);
      break;
    }
    default: {
      const div = document.createElement('div');
      div.className = 'text-sm text-rose-400 font-mono';
      div.textContent = `Unknown control type: ${ctrl.type}`;
      wrap.appendChild(div);
    }
  }

  if (window.lucide) window.lucide.createIcons();
  return wrap;
}
