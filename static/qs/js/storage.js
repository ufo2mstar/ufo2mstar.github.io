const KEY_SRC = 'qs:last-src';
let lastBlobUrl = null;

function importDescriptor(url) {
  return import(/* @vite-ignore */ url).then(mod => {
    if (!mod.default) throw new Error('Module must `export default` a descriptor');
    return mod.default;
  });
}

export async function loadFromUrl(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status + ' loading ' + url);
  const source = await r.text();
  return loadFromSource(source);
}

export async function loadFromSource(source) {
  if (lastBlobUrl) URL.revokeObjectURL(lastBlobUrl);
  const blob = new Blob([source], { type: 'text/javascript' });
  lastBlobUrl = URL.createObjectURL(blob);
  const descriptor = await importDescriptor(lastBlobUrl);
  return { descriptor, source };
}

export function loadFromFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.js,.qs.js,text/javascript';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = async () => {
        try { resolve(await loadFromSource(String(reader.result))); }
        catch (e) { reject(new Error('Invalid module: ' + e.message)); }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
    input.click();
  });
}

export function download(filename, source) {
  const blob = new Blob([source], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

function indent(src, n) {
  const pad = ' '.repeat(n);
  return src.split('\n').map((l, i) => i === 0 ? l : pad + l).join('\n');
}

export function descriptorToSource(d) {
  const dataPart = { ...d };
  delete dataPart.transform;
  const dataJson = JSON.stringify(dataPart, null, 2);
  const fnSrc = (d.transform || function (s) { return {}; }).toString();
  const withoutClose = dataJson.replace(/\n\}$/, '');
  return `export default ${withoutClose},\n  transform: ${indent(fnSrc, 2)}\n};\n`;
}

export function saveLastSource(src) { try { localStorage.setItem(KEY_SRC, src); } catch {} }
export function loadLastSource()    { try { return localStorage.getItem(KEY_SRC); } catch { return null; } }
