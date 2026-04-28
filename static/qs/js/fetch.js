const DEFAULT_TIMEOUT_MS = 10000;

export async function qsFetch(url, opts = {}) {
  const { timeout = DEFAULT_TIMEOUT_MS, headers, method = 'GET', body } = opts;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { Accept: 'application/json', ...(headers || {}) },
      body: body && typeof body !== 'string' ? JSON.stringify(body) : body,
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(t);
    if (e.name === 'AbortError') throw new Error(`Request timed out after ${timeout}ms: ${url}`);
    throw new Error(`Network error: ${e.message}`);
  }
  clearTimeout(t);

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; }
  catch { data = text; }

  if (!res.ok) {
    const detail = (data && typeof data === 'object' && data.message) ? data.message : (typeof data === 'string' ? data.slice(0, 200) : '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${detail ? ' - ' + detail : ''}`);
  }
  return data;
}
