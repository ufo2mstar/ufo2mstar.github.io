import { mountRuntime } from './runtime.js';
import { download, loadFromFile, loadFromUrl, loadFromSource, saveLastSource, loadLastSource } from './storage.js';
import { renderTests, runTests } from './tests.js';
import { createEditor, THEMES, getActiveTheme, setActiveTheme } from './editor.js';
import { toast } from './toast.js';

const SEED_URL = 'scripts/format-converter.qs.js';

const els = {
  previewMount:   document.getElementById('qs-preview-mount'),
  testsMount:     document.getElementById('qs-tests-mount'),
  testsBadge:     document.getElementById('qs-tests-badge'),
  runTests:       document.getElementById('qs-run-tests'),
  sourceHost:     document.getElementById('qs-source-editor'),
  codeError:      document.getElementById('qs-code-error'),
  tabPreview:     document.getElementById('qs-tab-preview'),
  tabCode:        document.getElementById('qs-tab-code'),
  tabTests:       document.getElementById('qs-tab-tests'),
  panePreview:    document.getElementById('qs-pane-preview'),
  paneCode:       document.getElementById('qs-pane-code'),
  paneTests:      document.getElementById('qs-pane-tests'),
  sidebar:        document.getElementById('qs-sidebar'),
  sidebarToggle:  document.getElementById('qs-sidebar-toggle'),
  loadDemo:       document.getElementById('qs-load-demo'),
  railLoadDemo:   document.getElementById('qs-rail-load-demo'),
  openFile:       document.getElementById('qs-open-file'),
  saveFile:       document.getElementById('qs-save-file'),
  settingsBtn:    document.getElementById('qs-settings-btn'),
  settingsModal:  document.getElementById('qs-settings-modal'),
  settingsClose:  document.getElementById('qs-settings-close'),
  generateBtn:    document.getElementById('qs-generate-btn'),
  avatarBtn:      document.getElementById('qs-avatar-btn'),
  scriptTitle:    document.getElementById('qs-script-title'),
  settingsTheme:  document.getElementById('qs-settings-theme'),
};

let descriptor = null;
let source = '';
let runtime = null;
let activeTab = 'preview';

let codeTimer;
const sourceEditor = createEditor({
  parent: els.sourceHost,
  value: '',
  language: 'javascript',
  fillHeight: true,
  onChange: (next) => {
    clearTimeout(codeTimer);
    codeTimer = setTimeout(async () => {
      try {
        const result = await loadFromSource(next);
        els.codeError.textContent = '';
        setActive(result, { announce: false, syncEditor: false });
      } catch (e) {
        els.codeError.textContent = e.message;
      }
    }, 300);
  },
});

function mountPreview() {
  if (runtime?.destroy) runtime.destroy();
  els.previewMount.innerHTML = '';
  if (!descriptor) return;
  runtime = mountRuntime(descriptor, els.previewMount);
}

function refreshTestsBadge() {
  const { results, compileError } = runTests(descriptor || {});
  const failed = results.filter(r => !r.pass).length;
  const total = results.length;
  if (compileError || total === 0) {
    els.testsBadge.style.display = 'none';
    return;
  }
  els.testsBadge.style.display = 'inline-block';
  els.testsBadge.textContent = `${total - failed}/${total}`;
  els.testsBadge.className = `text-xs px-1.5 py-0.5 rounded-full font-mono leading-none ${failed === 0 ? 'bg-emerald-900/40 text-emerald-300' : 'bg-rose-900/40 text-rose-300'}`;
}

function setActive({ descriptor: d, source: src }, opts = {}) {
  const { announce = true, syncEditor = true } = opts;
  descriptor = d;
  source = src;
  saveLastSource(src);
  if (syncEditor) sourceEditor.setValue(src);
  els.codeError.textContent = '';
  els.scriptTitle.textContent = d.title || d.id || 'Untitled';
  document.title = `QuickScripts - ${d.title || d.id || 'Untitled'}`;
  mountPreview();
  refreshTestsBadge();
  if (activeTab === 'tests') renderTests(descriptor, els.testsMount);
  if (announce) toast(`Loaded "${d.title || d.id}"`, { type: 'success' });
}

function activateTab(name) {
  activeTab = name;
  els.tabPreview.dataset.active = String(name === 'preview');
  els.tabCode.dataset.active    = String(name === 'code');
  els.tabTests.dataset.active   = String(name === 'tests');
  els.panePreview.style.display = name === 'preview' ? 'block' : 'none';
  els.paneCode.style.display    = name === 'code'    ? 'flex'  : 'none';
  els.paneTests.style.display   = name === 'tests'   ? 'block' : 'none';
  if (name === 'tests' && descriptor) renderTests(descriptor, els.testsMount);
}
els.tabPreview.addEventListener('click', () => activateTab('preview'));
els.tabCode.addEventListener('click',    () => activateTab('code'));
els.tabTests.addEventListener('click',   () => activateTab('tests'));
els.runTests.addEventListener('click', () => {
  if (!descriptor) return;
  activateTab('tests');
  refreshTestsBadge();
  renderTests(descriptor, els.testsMount);
  const { results, compileError } = runTests(descriptor);
  if (compileError) { toast('Tests: compile error', { type: 'error' }); return; }
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  if (total === 0) toast('No tests defined', { type: 'info' });
  else if (passed === total) toast(`Tests: ${passed}/${total} passed`, { type: 'success' });
  else toast(`Tests: ${passed}/${total} passed (${total - passed} failed)`, { type: 'error' });
});

{
  const groups = { dark: [], light: [], other: [] };
  for (const [key, def] of Object.entries(THEMES)) {
    (groups[def.variant] || groups.other).push([key, def]);
  }
  const labels = { dark: 'Dark', light: 'Light', other: 'Other' };
  for (const variant of ['dark', 'light', 'other']) {
    if (!groups[variant].length) continue;
    const og = document.createElement('optgroup');
    og.label = labels[variant];
    for (const [key, def] of groups[variant]) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = def.label;
      og.appendChild(opt);
    }
    els.settingsTheme.appendChild(og);
  }
}
els.settingsTheme.value = getActiveTheme();
els.settingsTheme.addEventListener('change', () => {
  setActiveTheme(els.settingsTheme.value);
  toast(`Theme: ${THEMES[els.settingsTheme.value].label}`, { type: 'info' });
});

const SB_KEY = 'qs:sidebar-collapsed';
function setSidebar(collapsed) {
  els.sidebar.dataset.collapsed = String(collapsed);
  els.sidebar.style.width = collapsed ? '56px' : '280px';
  els.sidebarToggle.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  try { localStorage.setItem(SB_KEY, collapsed ? '1' : '0'); } catch {}
}
els.sidebarToggle.addEventListener('click', () => {
  setSidebar(els.sidebar.dataset.collapsed !== 'true');
});
setSidebar(localStorage.getItem(SB_KEY) === '1');

function setModal(open) {
  els.settingsModal.style.display = open ? 'flex' : 'none';
}
els.settingsBtn.addEventListener('click', () => setModal(true));
els.settingsClose.addEventListener('click', () => setModal(false));
els.settingsModal.addEventListener('click', (e) => {
  if (e.target === els.settingsModal) setModal(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setModal(false);
});

async function loadDemoNow() {
  try { setActive(await loadFromUrl(SEED_URL)); }
  catch (e) { toast('Failed to load demo: ' + e.message, { type: 'error' }); }
}
els.loadDemo.addEventListener('click', loadDemoNow);
els.railLoadDemo?.addEventListener('click', loadDemoNow);

els.openFile.addEventListener('click', async () => {
  try { setActive(await loadFromFile()); }
  catch (e) { if (e.message !== 'No file selected') toast('Failed to load: ' + e.message, { type: 'error' }); }
});
els.saveFile.addEventListener('click', () => {
  if (!descriptor) return;
  const filename = (descriptor.id || 'script') + '.qs.js';
  download(filename, source);
  toast('Saved ' + filename, { type: 'success' });
});
els.generateBtn.addEventListener('click', () => {
  toast('Generation arrives in v2. Edit code or load a demo for now.', { type: 'info' });
});
els.avatarBtn.addEventListener('click', () => setModal(true));

(async function boot() {
  const last = loadLastSource();
  if (last) {
    try { setActive(await loadFromSource(last), { announce: false }); return; }
    catch (e) { console.warn('stored source failed to load, falling back to seed', e); }
  }
  try { setActive(await loadFromUrl(SEED_URL), { announce: false }); }
  catch (e) {
    console.error('Failed to load default script', e);
    toast('Could not load default script', { type: 'error' });
  }
})();
