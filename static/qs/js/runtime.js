import { createEditor } from './editor.js';

const DEBOUNCE_MS = 120;

export function mountRuntime(descriptor, mountEl) {
  const state = initState(descriptor);
  const adapters = {};

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
    container.appendChild(buildControl(ctrl, state, adapters, scheduleRun));
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
        if (k.startsWith('_')) continue;
        if (k.endsWith('Language')) {
          const id = k.slice(0, -'Language'.length);
          adapters[id]?.setLanguage?.(v);
          continue;
        }
        state[k] = v;
        adapters[k]?.setValue(v);
      }
    } catch (e) {
      errorBar.textContent = 'Runtime error: ' + e.message;
    }
  }

  runLogic();

  return {
    state,
    destroy: () => {
      clearTimeout(timer);
      for (const a of Object.values(adapters)) a.destroy?.();
    },
  };
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

function buildControl(ctrl, state, adapters, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-1.5';

  const headerRow = document.createElement('div');
  headerRow.className = 'flex items-center justify-between';
  const lbl = controlLabel(ctrl);
  if (lbl) headerRow.appendChild(lbl); else headerRow.appendChild(document.createElement('div'));

  const adapter = mkAdapter(ctrl, state, onChange);
  adapters[ctrl.id] = adapter;

  if (ctrl.copyable) headerRow.appendChild(copyButton(() => adapter.getValue()));
  if (lbl || ctrl.copyable) wrap.appendChild(headerRow);

  wrap.appendChild(adapter.host);

  if (window.lucide) window.lucide.createIcons();
  return wrap;
}

function mkAdapter(ctrl, state, onChange) {
  switch (ctrl.type) {
    case 'textarea':
    case 'code':    return mkEditorAdapter(ctrl, state, onChange);
    case 'input':   return mkInputAdapter(ctrl, state, onChange);
    case 'select':  return pickSelectAdapter(ctrl, state, onChange);
    case 'button':  return mkButtonAdapter(ctrl, onChange);
    default:        return mkErrorAdapter(ctrl);
  }
}

function mkEditorAdapter(ctrl, state, onChange) {
  const host = document.createElement('div');
  host.className = 'w-full bg-slate-950 border border-slate-700 rounded-md overflow-hidden focus-within:border-blue-500';
  const rows = ctrl.rows || (ctrl.type === 'code' ? 8 : 4);
  const language = ctrl.type === 'code' ? (ctrl.language || 'text') : 'text';
  const editor = createEditor({
    parent: host,
    value: state[ctrl.id] ?? '',
    language,
    readOnly: !!ctrl.readonly,
    fillHeight: false,
    height: (rows * 20 + 16) + 'px',
    onChange: (next) => { state[ctrl.id] = next; onChange(); },
  });
  return {
    host,
    setValue: (v) => editor.setValue(String(v ?? '')),
    getValue: () => editor.getValue(),
    setLanguage: (name) => editor.setLanguage(name),
    destroy: () => editor.destroy(),
  };
}

function mkInputAdapter(ctrl, state, onChange) {
  const el = document.createElement('input');
  el.type = ctrl.inputType || 'text';
  el.className = 'w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500';
  if (ctrl.placeholder) el.placeholder = ctrl.placeholder;
  if (ctrl.readonly) el.readOnly = true;
  el.value = state[ctrl.id] ?? '';
  const handler = () => { state[ctrl.id] = el.value; onChange(); };
  el.addEventListener('input', handler);
  return {
    host: el,
    setValue: (v) => { const next = String(v ?? ''); if (el.value !== next) el.value = next; },
    getValue: () => el.value,
    destroy: () => el.removeEventListener('input', handler),
  };
}

function pickSelectAdapter(ctrl, state, onChange) {
  const opts = ctrl.options || [];
  const segmented = ctrl.display === 'segmented'
    || (ctrl.display !== 'dropdown' && opts.length <= 6);
  return segmented
    ? mkSegmentedAdapter(ctrl, state, onChange)
    : mkDropdownAdapter(ctrl, state, onChange);
}

function mkSegmentedAdapter(ctrl, state, onChange) {
  const host = document.createElement('div');
  host.className = 'qs-segmented';
  host.setAttribute('role', 'radiogroup');
  if (ctrl.label) host.setAttribute('aria-label', ctrl.label);

  const buttons = new Map();
  const setActive = (v) => {
    for (const [val, btn] of buttons) btn.dataset.active = String(val === v);
  };

  for (const opt of (ctrl.options || [])) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'qs-seg-btn';
    b.textContent = opt.label;
    b.dataset.active = String(state[ctrl.id] === opt.value);
    b.addEventListener('click', () => {
      state[ctrl.id] = opt.value;
      setActive(opt.value);
      onChange();
    });
    buttons.set(opt.value, b);
    host.appendChild(b);
  }

  return {
    host,
    setValue: (v) => { state[ctrl.id] = v; setActive(v); },
    getValue: () => state[ctrl.id] ?? '',
    destroy: () => {},
  };
}

function mkDropdownAdapter(ctrl, state, onChange) {
  const el = document.createElement('select');
  el.className = 'w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500';
  for (const opt of (ctrl.options || [])) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    el.appendChild(o);
  }
  el.value = state[ctrl.id] ?? '';
  const handler = () => { state[ctrl.id] = el.value; onChange(); };
  el.addEventListener('change', handler);
  return {
    host: el,
    setValue: (v) => { const next = String(v ?? ''); if (el.value !== next) el.value = next; },
    getValue: () => el.value,
    destroy: () => el.removeEventListener('change', handler),
  };
}

function mkButtonAdapter(ctrl, onChange) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-md text-sm transition';
  el.textContent = ctrl.label || 'Run';
  const handler = () => onChange();
  el.addEventListener('click', handler);
  return {
    host: el,
    setValue: () => {},
    getValue: () => '',
    destroy: () => el.removeEventListener('click', handler),
  };
}

function mkErrorAdapter(ctrl) {
  const host = document.createElement('div');
  host.className = 'text-sm text-rose-400 font-mono';
  host.textContent = `Unknown control type: ${ctrl.type}`;
  return { host, setValue: () => {}, getValue: () => '', destroy: () => {} };
}
