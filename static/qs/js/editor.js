import { basicSetup } from 'codemirror';
import { EditorView } from '@codemirror/view';
import { EditorState, Compartment, Annotation } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';

const SET_VALUE = Annotation.define();

function langExt(name) {
  if (name === 'javascript' || name === 'js') return javascript();
  if (name === 'json') return json();
  return [];
}

function fillTheme(fillHeight) {
  return EditorView.theme({
    '&': fillHeight ? { height: '100%' } : {},
    '.cm-scroller': { fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: '12.5px', lineHeight: '1.55' },
    '.cm-content': { padding: '8px 0' },
  });
}

export function createEditor({ parent, value = '', language = 'text', readOnly = false, fillHeight = true, onChange = null }) {
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
        oneDark,
        EditorView.lineWrapping,
        langC.of(langExt(language)),
        fillTheme(fillHeight),
        EditorView.editable.of(!readOnly),
        EditorState.readOnly.of(readOnly),
        updateListener,
      ],
    }),
  });

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
    destroy: () => view.destroy(),
  };
}
