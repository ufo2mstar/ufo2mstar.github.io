import { mountRuntime } from './runtime.js';
import { download, loadFromFile, loadFromUrl, saveLast, loadLast } from './storage.js';
import { createEditor } from './editor.js';
import { renderTests, runTests } from './tests.js';
import { toast } from './toast.js';

const SEED_URL = 'scripts/format-converter.qs.json';

const els = {
  previewMount:   document.getElementById('qs-preview-mount'),
  testsMount:     document.getElementById('qs-tests-mount'),
  testsBadge:     document.getElementById('qs-tests-badge'),
  runTests:       document.getElementById('qs-run-tests'),
  schemaHost:     document.getElementById('qs-editor-schema'),
  logicHost:      document.getElementById('qs-editor-logic'),
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
};

let descriptor = null;
let runtime = null;
let activeTab = 'preview';

const schemaEditor = createEditor({
  parent: els.schemaHost,
  value: '',
  language: 'json',
  onChange: () => onCodeEdit(),
});
const logicEditor = createEditor({
  parent: els.logicHost,
  value: '',
  language: 'javascript',
  onChange: () => onCodeEdit(),
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

let updatingFromCode = false;

function refreshCodeView() {
  if (!descriptor) return;
  updatingFromCode = true;
  const { logic, ...schema } = descriptor;
  schemaEditor.setValue(JSON.stringify(schema, null, 2));
  logicEditor.setValue(logic || '');
  els.codeError.textContent = '';
  updatingFromCode = false;
}

function setActive(d, opts = {}) {
  const { announce = true } = opts;
  descriptor = d;
  saveLast(d);
  refreshCodeView();
  els.scriptTitle.textContent = d.title || d.id || 'Untitled';
  document.title = `QuickScript - ${d.title || d.id || 'Untitled'}`;
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
els.runTests.addEventListener('click',   () => { if (descriptor) { activateTab('tests'); refreshTestsBadge(); }});

let codeTimer;
function onCodeEdit() {
  if (updatingFromCode) return;
  clearTimeout(codeTimer);
  codeTimer = setTimeout(() => {
    try {
      const schema = JSON.parse(schemaEditor.getValue());
      const logic = logicEditor.getValue();
      const fn = new Function('return (' + logic + ')')();
      if (typeof fn !== 'function') throw new Error('Logic must be a function expression');
      const next = { ...schema, logic };
      els.codeError.textContent = '';
      descriptor = next;
      saveLast(descriptor);
      els.scriptTitle.textContent = next.title || next.id || 'Untitled';
      mountPreview();
      refreshTestsBadge();
      if (activeTab === 'tests') renderTests(descriptor, els.testsMount);
    } catch (e) {
      els.codeError.textContent = e.message;
    }
  }, 300);
}

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
  download(descriptor);
  toast('Saved ' + (descriptor.id || 'script') + '.qs.json', { type: 'success' });
});
els.generateBtn.addEventListener('click', () => {
  toast('Generation arrives in v2. Edit code or load a demo for now.', { type: 'info' });
});
els.avatarBtn.addEventListener('click', () => setModal(true));

(async function boot() {
  const last = loadLast();
  if (last) { setActive(last, { announce: false }); return; }
  try { setActive(await loadFromUrl(SEED_URL), { announce: false }); }
  catch (e) {
    console.error('Failed to load default script', e);
    toast('Could not load default script', { type: 'error' });
  }
})();
