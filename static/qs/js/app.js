import { mountRuntime } from './runtime.js';
import { download, loadFromFile, loadFromUrl, loadFromSource, saveLastSource, loadLastSource } from './storage.js';
import { renderTests, runTests } from './tests.js';
import { createEditor, THEMES, getActiveTheme, setActiveTheme } from './editor.js';
import { toast } from './toast.js';

const LIBRARY = [
  { id: 'format-converter', title: 'Format Converter', icon: 'repeat',   url: 'scripts/format-converter.qs.js' },
  { id: 'github-metadata',  title: 'GitHub Metadata',  icon: 'git-branch', url: 'scripts/github-metadata.qs.js' },
];
const DEFAULT_SCRIPT_ID = 'format-converter';

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
  libraryList:    document.getElementById('qs-library-list'),
  libraryRail:    document.getElementById('qs-library-rail'),
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

async function refreshTestsBadge() {
  const { results, compileError } = await runTests(descriptor || {});
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
els.runTests.addEventListener('click', async () => {
  if (!descriptor) return;
  activateTab('tests');
  await refreshTestsBadge();
  await renderTests(descriptor, els.testsMount);
  const { results, compileError } = await runTests(descriptor);
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

async function loadScript(entry) {
  try { setActive(await loadFromUrl(entry.url)); }
  catch (e) { toast(`Failed to load ${entry.title}: ${e.message}`, { type: 'error' }); }
}

function renderLibrary() {
  if (els.libraryList) {
    els.libraryList.innerHTML = '';
    for (const entry of LIBRARY) {
      const btn = document.createElement('button');
      btn.className = 'w-full inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-200 hover:bg-white/5 transition border border-transparent hover:border-slate-700';
      btn.innerHTML = `<i data-lucide="${entry.icon}" class="w-4 h-4 text-slate-400"></i><span class="text-left">${entry.title}</span>`;
      btn.addEventListener('click', () => loadScript(entry));
      els.libraryList.appendChild(btn);
    }
  }
  if (els.libraryRail) {
    els.libraryRail.innerHTML = '';
    for (const entry of LIBRARY) {
      const btn = document.createElement('button');
      btn.className = 'qs-rail-btn';
      btn.title = entry.title;
      btn.innerHTML = `<i data-lucide="${entry.icon}" class="w-5 h-5"></i>`;
      btn.addEventListener('click', () => loadScript(entry));
      els.libraryRail.appendChild(btn);
    }
  }
  if (window.lucide) window.lucide.createIcons();
}
renderLibrary();

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
  const seed = LIBRARY.find(e => e.id === DEFAULT_SCRIPT_ID) || LIBRARY[0];
  try { setActive(await loadFromUrl(seed.url), { announce: false }); }
  catch (e) {
    console.error('Failed to load default script', e);
    toast('Could not load default script', { type: 'error' });
  }
})();
