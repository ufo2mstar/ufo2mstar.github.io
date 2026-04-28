import { basicSetup } from 'codemirror';
import { EditorView } from '@codemirror/view';
import { EditorState, Compartment, Annotation } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  dracula, cobalt, coolGlow,
  tomorrow, solarizedLight, rosePineDawn, ayuLight,
  // Uncomment to enable; also add to THEMES below.
  // amy, barf, bespin, birdsOfParadise, boysAndGirls,
  // clouds, espresso, noctisLilac, smoothy,
} from 'thememirror';

const SET_VALUE = Annotation.define();
const THEME_KEY = 'qs:cm-theme';

export const THEMES = {
  // Dark
  'one-dark':       { label: 'One Dark',        ext: oneDark,       variant: 'dark'  },
  'dracula':        { label: 'Dracula',         ext: dracula,       variant: 'dark'  },
  'cobalt':         { label: 'Cobalt',          ext: cobalt,        variant: 'dark'  },
  'cool-glow':      { label: 'Cool Glow',       ext: coolGlow,      variant: 'dark'  },
  // Light
  'tomorrow':       { label: 'Tomorrow',        ext: tomorrow,      variant: 'light' },
  'solarized-light':{ label: 'Solarized Light', ext: solarizedLight,variant: 'light' },
  'rose-pine-dawn': { label: 'Rose Pine Dawn',  ext: rosePineDawn,  variant: 'light' },
  'ayu-light':      { label: 'Ayu Light',       ext: ayuLight,      variant: 'light' },
  // Add more by uncommenting the imports above and an entry here:
  // 'amy':              { label: 'Amy',              ext: amy,             variant: 'dark'  },
  // 'barf':             { label: 'Barf',             ext: barf,            variant: 'dark'  },
  // 'bespin':           { label: 'Bespin',           ext: bespin,          variant: 'dark'  },
  // 'birds-of-paradise':{ label: 'Birds of Paradise',ext: birdsOfParadise, variant: 'dark'  },
  // 'boys-and-girls':   { label: 'Boys and Girls',   ext: boysAndGirls,    variant: 'dark'  },
  // 'clouds':           { label: 'Clouds',           ext: clouds,          variant: 'light' },
  // 'espresso':         { label: 'Espresso',         ext: espresso,        variant: 'light' },
  // 'noctis-lilac':     { label: 'Noctis Lilac',     ext: noctisLilac,     variant: 'light' },
  // 'smoothy':          { label: 'Smoothy',          ext: smoothy,         variant: 'light' },
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
