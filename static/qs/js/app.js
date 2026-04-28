import { mountRuntime } from './runtime.js';
import { download, loadFromFile, loadFromUrl, saveLast, loadLast } from './storage.js';

const SEED_URL = 'scripts/format-converter.qs.json';

const els = {
  previewMount:   document.getElementById('qs-preview-mount'),
  codeSchema:     document.getElementById('qs-code-schema'),
  codeLogic:      document.getElementById('qs-code-logic'),
  codeError:      document.getElementById('qs-code-error'),
  tabPreview:     document.getElementById('qs-tab-preview'),
  tabCode:        document.getElementById('qs-tab-code'),
  panePreview:    document.getElementById('qs-pane-preview'),
  paneCode:       document.getElementById('qs-pane-code'),
  sidebar:        document.getElementById('qs-sidebar'),
  sidebarBody:    document.getElementById('qs-sidebar-body'),
  sidebarToggle:  document.getElementById('qs-sidebar-toggle'),
  loadDemo:       document.getElementById('qs-load-demo'),
  openFile:       document.getElementById('qs-open-file'),
  saveFile:       document.getElementById('qs-save-file'),
  settingsBtn:    document.getElementById('qs-settings-btn'),
  settingsModal:  document.getElementById('qs-settings-modal'),
  settingsClose:  document.getElementById('qs-settings-close'),
  generateBtn:    document.getElementById('qs-generate-btn'),
};

let descriptor = null;
let runtime = null;

function mountPreview() {
  if (runtime?.destroy) runtime.destroy();
  els.previewMount.innerHTML = '';
  if (!descriptor) return;
  runtime = mountRuntime(descriptor, els.previewMount);
}

function refreshCodeView() {
  if (!descriptor) return;
  const { logic, ...schema } = descriptor;
  els.codeSchema.value = JSON.stringify(schema, null, 2);
  els.codeLogic.value = logic || '';
  els.codeError.textContent = '';
}

function setActive(d) {
  descriptor = d;
  saveLast(d);
  refreshCodeView();
  mountPreview();
}

function activateTab(name) {
  const isPreview = name === 'preview';
  for (const [tab, active] of [[els.tabPreview, isPreview], [els.tabCode, !isPreview]]) {
    tab.classList.toggle('text-blue-400', active);
    tab.classList.toggle('border-b-2', active);
    tab.classList.toggle('border-blue-400', active);
    tab.classList.toggle('text-gray-400', !active);
  }
  els.panePreview.style.display = isPreview ? 'block' : 'none';
  els.paneCode.style.display = isPreview ? 'none' : 'flex';
}
els.tabPreview.addEventListener('click', () => activateTab('preview'));
els.tabCode.addEventListener('click', () => activateTab('code'));

let codeTimer;
function onCodeEdit() {
  clearTimeout(codeTimer);
  codeTimer = setTimeout(() => {
    try {
      const schema = JSON.parse(els.codeSchema.value);
      const logic = els.codeLogic.value;
      const fn = new Function('return (' + logic + ')')();
      if (typeof fn !== 'function') throw new Error('Logic must be a function expression');
      const next = { ...schema, logic };
      els.codeError.textContent = '';
      descriptor = next;
      saveLast(descriptor);
      mountPreview();
    } catch (e) {
      els.codeError.textContent = e.message;
    }
  }, 300);
}
els.codeSchema.addEventListener('input', onCodeEdit);
els.codeLogic.addEventListener('input', onCodeEdit);

const SB_KEY = 'qs:sidebar-collapsed';
function setSidebar(collapsed) {
  els.sidebar.classList.toggle('w-1/3', !collapsed);
  els.sidebar.classList.toggle('w-12', collapsed);
  els.sidebarBody.style.display = collapsed ? 'none' : 'flex';
  els.sidebarToggle.textContent = collapsed ? '\u203A' : '\u2039';
  els.sidebarToggle.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  try { localStorage.setItem(SB_KEY, collapsed ? '1' : '0'); } catch {}
}
els.sidebarToggle.addEventListener('click', () => {
  setSidebar(!els.sidebar.classList.contains('w-12'));
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

els.loadDemo.addEventListener('click', async () => {
  try { setActive(await loadFromUrl(SEED_URL)); }
  catch (e) { alert('Failed to load demo: ' + e.message); }
});
els.openFile.addEventListener('click', async () => {
  try { setActive(await loadFromFile()); }
  catch (e) { if (e.message !== 'No file selected') alert('Failed to load file: ' + e.message); }
});
els.saveFile.addEventListener('click', () => {
  if (descriptor) download(descriptor);
});
els.generateBtn.addEventListener('click', () => {
  alert('Generate UI is coming in v2 (LLM hookup). For now, edit the script in Code View or load a demo.');
});

(async function boot() {
  const last = loadLast();
  if (last) { setActive(last); return; }
  try { setActive(await loadFromUrl(SEED_URL)); }
  catch (e) { console.error('Failed to load default script', e); }
})();
