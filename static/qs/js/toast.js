function ensureContainer() {
  let el = document.getElementById('qs-toast-container');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'qs-toast-container';
  el.className = 'fixed bottom-4 right-4 flex flex-col gap-2 z-[100] pointer-events-none max-w-md';
  document.body.appendChild(el);
  return el;
}

const tone = {
  info:    { bg: 'bg-slate-700/95',    border: 'border-slate-600',     icon: 'info'        },
  success: { bg: 'bg-emerald-700/95',  border: 'border-emerald-600',   icon: 'check-circle'},
  error:   { bg: 'bg-rose-700/95',     border: 'border-rose-600',      icon: 'alert-circle'},
};

export function toast(message, opts = {}) {
  const { type = 'info' } = opts;
  const isError = type === 'error';
  const duration = opts.duration ?? (isError ? 0 : 2400);
  const sticky = duration <= 0;
  const t = tone[type] || tone.info;

  if (isError) console.error('[qs] ' + message);

  const el = document.createElement('div');
  el.className = `pointer-events-auto flex items-start gap-2 ${t.bg} ${t.border} border text-white text-sm px-3 py-2 rounded-md shadow-lg backdrop-blur transition-all duration-200 translate-x-2 opacity-0`;
  el.innerHTML = `
    <i data-lucide="${t.icon}" class="w-4 h-4 shrink-0 mt-0.5"></i>
    <span class="flex-1 break-words whitespace-pre-wrap"></span>
  `;
  el.querySelector('span').textContent = message;

  if (sticky) {
    const actions = document.createElement('div');
    actions.className = 'flex items-center gap-0.5 shrink-0 -mr-1 -mt-0.5';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'p-1 rounded hover:bg-white/15 transition';
    copyBtn.title = 'Copy message';
    copyBtn.innerHTML = '<i data-lucide="copy" class="w-3.5 h-3.5"></i>';
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(message);
        const icon = copyBtn.querySelector('i');
        icon?.setAttribute('data-lucide', 'check');
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
          icon?.setAttribute('data-lucide', 'copy');
          if (window.lucide) window.lucide.createIcons();
        }, 900);
      } catch {}
    });
    actions.appendChild(copyBtn);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'p-1 rounded hover:bg-white/15 transition';
    closeBtn.title = 'Dismiss';
    closeBtn.innerHTML = '<i data-lucide="x" class="w-3.5 h-3.5"></i>';
    closeBtn.addEventListener('click', () => dismiss());
    actions.appendChild(closeBtn);

    el.appendChild(actions);
  }

  ensureContainer().appendChild(el);
  if (window.lucide) window.lucide.createIcons();
  requestAnimationFrame(() => {
    el.classList.remove('translate-x-2', 'opacity-0');
  });

  function dismiss() {
    el.classList.add('opacity-0', 'translate-x-2');
    setTimeout(() => el.remove(), 220);
  }

  if (!sticky) setTimeout(dismiss, duration);
}
