export default {
  id: 'format-converter',
  title: 'Format Converter',
  description: 'Encode, decode, and prettify text between common formats.',
  trigger: 'live',

  controls: [
    { type: 'select',   id: 'op',     label: 'Operation', default: 'base64-decode',
      options: [
        { value: 'base64-encode', label: 'B64 - encode' },
        { value: 'base64-decode', label: 'B64 - decode' },
        { value: 'url-encode',    label: 'URL - encode' },
        { value: 'url-decode',    label: 'URL - decode' },
        { value: 'json-prettify', label: 'JSON - prettify' },
        { value: 'json-deflate',  label: 'JSON - deflate' },
      ]
    },
    { type: 'textarea', id: 'input',  label: 'Input',  rows: 4,  copyable: true, placeholder: 'Paste here...' },
    { type: 'code',     id: 'output', label: 'Output', rows: 12, language: 'text', copyable: true, readonly: true },
  ],

  transform(s) {
    const input = s.input || '';
    const jsonOps = new Set(['json-prettify', 'json-deflate']);
    try {
      let output;
      switch (s.op) {
        case 'base64-encode': output = btoa(unescape(encodeURIComponent(input))); break;
        case 'base64-decode': output = decodeURIComponent(escape(atob(input))); break;
        case 'url-encode':    output = encodeURIComponent(input); break;
        case 'url-decode':    output = decodeURIComponent(input); break;
        case 'json-prettify': output = JSON.stringify(JSON.parse(input), null, 2); break;
        case 'json-deflate':  output = JSON.stringify(JSON.parse(input)); break;
        default: output = '';
      }
      return { output, outputLanguage: jsonOps.has(s.op) ? 'json' : 'text' };
    } catch (e) {
      return { output: 'Error: ' + e.message, outputLanguage: 'text' };
    }
  },

  tests: [
    { name: "base64 encode 'hello world'",  state: { op: 'base64-encode', input: 'hello world' },        expect: { output: 'aGVsbG8gd29ybGQ=' } },
    { name: "base64 decode 'aGVsbG8gd29ybGQ='", state: { op: 'base64-decode', input: 'aGVsbG8gd29ybGQ=' }, expect: { output: 'hello world' } },
    { name: 'url-encode escapes spaces',    state: { op: 'url-encode', input: 'hello world & friends' }, expect: { output: 'hello%20world%20%26%20friends' } },
    { name: 'url-decode round-trips',       state: { op: 'url-decode', input: 'hello%20world%20%26%20friends' }, expect: { output: 'hello world & friends' } },
    { name: 'json-prettify',                state: { op: 'json-prettify', input: '{"a":1,"b":[2,3]}' },  expect: { output: '{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}' } },
    { name: 'json-deflate',                 state: { op: 'json-deflate',  input: '{\n  "a": 1,\n  "b": [2, 3]\n}' }, expect: { output: '{"a":1,"b":[2,3]}' } },
  ],
};
