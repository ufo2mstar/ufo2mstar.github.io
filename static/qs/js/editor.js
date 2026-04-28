const langModes = {
  javascript: { name: 'javascript' },
  js:         { name: 'javascript' },
  json:       { name: 'javascript', json: true },
  text:       { name: 'null' },
  plain:      { name: 'null' },
};

function modeFor(language) {
  return langModes[language] || langModes.text;
}

function ensureCM() {
  if (!window.CodeMirror) {
    throw new Error('CodeMirror script tag failed to load. Check network and CDN availability.');
  }
}

export function createEditor({ parent, value = '', language = 'text', readOnly = false, onChange }) {
  ensureCM();
  const cm = window.CodeMirror(parent, {
    value: String(value ?? ''),
    mode: modeFor(language),
    theme: 'material-darker',
    lineNumbers: true,
    lineWrapping: true,
    readOnly: readOnly ? 'nocursor' : false,
    indentUnit: 2,
    tabSize: 2,
    smartIndent: true,
    viewportMargin: Infinity,
    extraKeys: { Tab: (cmInst) => cmInst.replaceSelection('  ', 'end') },
  });
  setTimeout(() => cm.refresh(), 0);
  if (onChange) cm.on('change', () => onChange(cm.getValue()));
  return {
    view: cm,
    getValue: () => cm.getValue(),
    setValue(v) {
      const cur = cm.getValue();
      const next = String(v ?? '');
      if (cur === next) return;
      cm.setValue(next);
    },
    setLanguage(lang) {
      cm.setOption('mode', modeFor(lang));
    },
    focus: () => cm.focus(),
    refresh: () => cm.refresh(),
    destroy() {
      const wrap = cm.getWrapperElement();
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    },
  };
}
