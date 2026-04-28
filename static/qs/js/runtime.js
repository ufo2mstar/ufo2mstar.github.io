const DEBOUNCE_MS = 120;

export function mountRuntime(descriptor, mountEl) {
  const state = initState(descriptor);
  const els = {};
  const errors = [];

  const container = document.createElement('div');
  container.className = 'space-y-4 max-w-2xl mx-auto';

  if (descriptor.title) {
    const h = document.createElement('h2');
    h.className = 'text-xl font-semibold text-gray-100';
    h.textContent = descriptor.title;
    container.appendChild(h);
  }
  if (descriptor.description) {
    const p = document.createElement('p');
    p.className = 'text-sm text-gray-400';
    p.textContent = descriptor.description;
    container.appendChild(p);
  }

  for (const ctrl of descriptor.controls || []) {
    container.appendChild(buildControl(ctrl, state, els, scheduleRun));
  }

  const errorBar = document.createElement('div');
  errorBar.className = 'text-xs text-red-400 min-h-[1rem]';
  container.appendChild(errorBar);

  mountEl.replaceChildren(container);

  let transform = null;
  try {
    transform = new Function('return (' + (descriptor.logic || 'function(s){return {};}') + ')')();
    if (typeof transform !== 'function') throw new Error('logic did not produce a function');
  } catch (e) {
    errorBar.textContent = 'Logic compile error: ' + e.message;
    return { state, destroy: () => {} };
  }

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
      if (result && typeof result === 'object') {
        for (const [k, v] of Object.entries(result)) {
          state[k] = v;
          const el = els[k];
          if (!el) continue;
          if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.tagName === 'SELECT') {
            if (el.value !== String(v ?? '')) el.value = v ?? '';
          }
        }
      }
    } catch (e) {
      errorBar.textContent = 'Runtime error: ' + e.message;
    }
  }

  runLogic();

  return { state, destroy: () => clearTimeout(timer) };
}

function initState(d) {
  const s = {};
  for (const c of (d.controls || [])) {
    s[c.id] = c.default ?? '';
  }
  return s;
}

function buildControl(ctrl, state, els, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-1';

  if (ctrl.label && ctrl.type !== 'button') {
    const lbl = document.createElement('label');
    lbl.className = 'block text-sm font-medium text-gray-300';
    lbl.textContent = ctrl.label;
    wrap.appendChild(lbl);
  }

  const inner = document.createElement('div');
  inner.className = 'relative';

  let el;
  switch (ctrl.type) {
    case 'textarea':
      el = document.createElement('textarea');
      el.rows = ctrl.rows || 4;
      el.spellcheck = false;
      el.className = 'w-full bg-gray-950 border border-gray-700 rounded p-3 text-sm font-mono text-gray-100 focus:outline-none focus:border-blue-500 resize-y';
      if (ctrl.placeholder) el.placeholder = ctrl.placeholder;
      if (ctrl.readonly) el.readOnly = true;
      el.value = state[ctrl.id] ?? '';
      el.addEventListener('input', () => { state[ctrl.id] = el.value; onChange(); });
      break;
    case 'input':
      el = document.createElement('input');
      el.type = ctrl.inputType || 'text';
      el.className = 'w-full bg-gray-950 border border-gray-700 rounded p-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500';
      if (ctrl.placeholder) el.placeholder = ctrl.placeholder;
      if (ctrl.readonly) el.readOnly = true;
      el.value = state[ctrl.id] ?? '';
      el.addEventListener('input', () => { state[ctrl.id] = el.value; onChange(); });
      break;
    case 'select':
      el = document.createElement('select');
      el.className = 'w-full bg-gray-950 border border-gray-700 rounded p-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500';
      for (const opt of (ctrl.options || [])) {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        el.appendChild(o);
      }
      el.value = state[ctrl.id] ?? '';
      el.addEventListener('change', () => { state[ctrl.id] = el.value; onChange(); });
      break;
    case 'button':
      el = document.createElement('button');
      el.type = 'button';
      el.className = 'bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded text-sm';
      el.textContent = ctrl.label || 'Run';
      el.addEventListener('click', () => onChange());
      break;
    default:
      el = document.createElement('div');
      el.textContent = `Unknown control type: ${ctrl.type}`;
      el.className = 'text-red-400 text-sm';
  }

  els[ctrl.id] = el;
  inner.appendChild(el);

  if (ctrl.copyable && (ctrl.type === 'textarea' || ctrl.type === 'input')) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'absolute top-1.5 right-1.5 px-2 py-0.5 text-xs bg-gray-800 hover:bg-gray-700 rounded text-gray-300 border border-gray-700';
    btn.textContent = 'copy';
    btn.title = 'Copy to clipboard';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(el.value);
        btn.textContent = 'copied';
        setTimeout(() => { btn.textContent = 'copy'; }, 900);
      } catch (e) {
        btn.textContent = 'failed';
        setTimeout(() => { btn.textContent = 'copy'; }, 900);
      }
    });
    inner.appendChild(btn);
  }

  wrap.appendChild(inner);
  return wrap;
}
