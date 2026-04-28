import { basicSetup } from 'codemirror';
import { EditorView } from '@codemirror/view';
import { EditorState, Compartment, Annotation } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';

const SET_VALUE = Annotation.define();
const THEME_KEY = 'qs:cm-theme';

const lightTheme = EditorView.theme({
  '&': { backgroundColor: '#f8fafc', color: '#0f172a' },
  '.cm-gutters': { backgroundColor: '#f1f5f9', color: '#64748b', border: 'none' },
  '.cm-cursor': { borderLeftColor: '#0f172a' },
  '.cm-activeLine': { backgroundColor: '#e2e8f0' },
  '.cm-activeLineGutter': { backgroundColor: '#e2e8f0' },
  '.cm-selectionBackground, ::selection': { backgroundColor: '#bfdbfe !important' },
  '.cm-line': { caretColor: '#0f172a' },
});

export const THEMES = {
  'one-dark':  { label: 'One Dark',  ext: oneDark },
  'light':     { label: 'Light',     ext: lightTheme },
};
export const DEFAULT_THEME = 'one-dark';

export function getActiveTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v && THEMES[v]) return v;
  } catch {}
  return DEFAULT_THEME;
}

const themeC = new Compartment();
const liveViews = new Set();

export function setActiveTheme(name) {
  if (!THEMES[name]) return;
  try { localStorage.setItem(THEME_KEY, name); } catch {}
  const ext = THEMES[name].ext;
  for (const view of liveViews) {
    view.dispatch({ effects: themeC.reconfigure(ext) });
  }
}

function langExt(name) {
  if (name === 'javascript' || name === 'js') return javascript();
  if (name === 'json') return json();
  return [];
}

function sizeTheme({ fillHeight, height }) {
  const root = fillHeight ? { height: '100%' } : (height ? { height } : {});
  return EditorView.theme({
    '&': root,
    '.cm-scroller': { fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: '12.5px', lineHeight: '1.55', overflow: 'auto' },
    '.cm-content': { padding: '8px 0' },
  });
}

export function createEditor({ parent, value = '', language = 'text', readOnly = false, fillHeight = true, height = null, onChange = null }) {
  const langC = new Compartment();
  const updateListener = EditorView.updateListener.of(u => {
    if (!u.docChanged || !onChange) return;
    if (u.transactions.some(t => t.annotation(SET_VALUE))) return;
    onChange(u.state.doc.toString());
  });

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: value || '',
      extensions: [
        basicSetup,
        themeC.of(THEMES[getActiveTheme()].ext),
        EditorView.lineWrapping,
        langC.of(langExt(language)),
        sizeTheme({ fillHeight, height }),
        EditorView.editable.of(!readOnly),
        EditorState.readOnly.of(readOnly),
        updateListener,
      ],
    }),
  });
  liveViews.add(view);

  return {
    setValue(v) {
      const cur = view.state.doc.toString();
      const next = v ?? '';
      if (cur === next) return;
      view.dispatch({
        changes: { from: 0, to: cur.length, insert: next },
        annotations: SET_VALUE.of(true),
      });
    },
    getValue: () => view.state.doc.toString(),
    setLanguage(name) {
      view.dispatch({ effects: langC.reconfigure(langExt(name)) });
    },
    focus: () => view.focus(),
    destroy: () => { liveViews.delete(view); view.destroy(); },
  };
}
