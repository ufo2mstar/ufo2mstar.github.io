const KEY = 'qs:last';

export function download(descriptor) {
  const json = JSON.stringify(descriptor, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (descriptor.id || 'script') + '.qs.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

export function loadFromFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.qs.json,application/json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = () => {
        try { resolve(JSON.parse(reader.result)); }
        catch (e) { reject(new Error('Invalid JSON: ' + e.message)); }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
    input.click();
  });
}

export async function loadFromUrl(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status + ' loading ' + url);
  return await r.json();
}

export function saveLast(descriptor) {
  try { localStorage.setItem(KEY, JSON.stringify(descriptor)); } catch {}
}

export function loadLast() {
  try {
    const v = localStorage.getItem(KEY);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}
