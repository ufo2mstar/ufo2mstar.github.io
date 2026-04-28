function ensureContainer() {
  let el = document.getElementById('qs-toast-container');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'qs-toast-container';
  el.className = 'fixed bottom-4 right-4 flex flex-col gap-2 z-[100] pointer-events-none';
  document.body.appendChild(el);
  return el;
}

const tone = {
  info:    { bg: 'bg-slate-700/95',    border: 'border-slate-600',     icon: 'info'        },
  success: { bg: 'bg-emerald-700/95',  border: 'border-emerald-600',   icon: 'check-circle'},
  error:   { bg: 'bg-rose-700/95',     border: 'border-rose-600',      icon: 'alert-circle'},
};

export function toast(message, opts = {}) {
  const { type = 'info', duration = 2400 } = opts;
  const t = tone[type] || tone.info;
  const el = document.createElement('div');
  el.className = `pointer-events-auto flex items-center gap-2 ${t.bg} ${t.border} border text-white text-sm px-3 py-2 rounded-md shadow-lg backdrop-blur transition-all duration-200 translate-x-2 opacity-0`;
  el.innerHTML = `<i data-lucide="${t.icon}" class="w-4 h-4 shrink-0"></i><span></span>`;
  el.querySelector('span').textContent = message;
  ensureContainer().appendChild(el);
  if (window.lucide) window.lucide.createIcons({ attrs: { class: 'w-4 h-4 shrink-0' } });
  requestAnimationFrame(() => {
    el.classList.remove('translate-x-2', 'opacity-0');
  });
  setTimeout(() => {
    el.classList.add('opacity-0', 'translate-x-2');
    setTimeout(() => el.remove(), 220);
  }, duration);
}
