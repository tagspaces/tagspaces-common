import React from 'react';

import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { cpp } from '@codemirror/lang-cpp';
import { markdown } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { xml } from '@codemirror/lang-xml';
import { java } from '@codemirror/lang-java';
import { json } from '@codemirror/lang-json';
import { less } from '@codemirror/lang-less';
import { php } from '@codemirror/lang-php';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { rust } from '@codemirror/lang-rust';
import { wast } from '@codemirror/lang-wast';
import { sass } from '@codemirror/lang-sass';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting
} from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { EditorState, Extension, Compartment } from '@codemirror/state';
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection
} from '@codemirror/view';

import className from './style.module.css';

const languageModes = {
  h: cpp(),
  c: cpp(),
  clj: cpp(), // todo 'clojure'
  coffee: cpp(), // todo 'coffee'
  cpp: cpp(),
  cs: cpp(),
  css: css(),
  groovy: cpp(), // todo groovy
  haxe: cpp(), // todo haxe
  htm: html(),
  html: html(),
  java: java(),
  js: javascript(),
  ts: javascript(),
  jsm: javascript(),
  json: json(),
  less: less(),
  lua: cpp(),
  markdown: markdown(),
  md: markdown(),
  mdown: markdown(),
  mdwn: markdown(),
  mkd: markdown(),
  ml: cpp(), // todo ocaml
  mli: cpp(), // todo ocaml
  pl: cpp(), // todo perl
  php: php(),
  py: python(),
  rb: cpp(), // todo ruby
  rs: rust(),
  sh: cpp(), // todo sh
  sql: sql(),
  svg: xml(),
  sass: sass(),
  xml: xml(),
  wast: wast()
  //filetype.txt = 'txt';
};

function detectMode(ext) {
  const mode = languageModes[ext];
  if (mode) {
    return mode;
  }
  return undefined;
  // return autoFold(autoMode());
}

let lineNumbersCompartment = new Compartment();

export function makeLineNumbers(showLineNumbers) {
  const v = showLineNumbers ? lineNumbers() : [];
  return lineNumbersCompartment.of(v);
}

const basicSetup: Extension = [
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap
  ])
];

type StateOptions = {
  onChange: (getString: () => string) => void;
  lock: React.MutableRefObject<boolean>;
  dark: boolean;
  editable: boolean;
  value?: string;
  fileExtension?: string;
};

const createCodeMirrorState = ({
  onChange,
  lock,
  dark,
  editable,
  value,
  fileExtension
}: StateOptions) => {
  const mode = detectMode(fileExtension);
  return EditorState.create({
    doc: value,
    extensions: [
      basicSetup,
      //https://github.com/kjk/onlinetool.io/blob/752dc581d6e7f38ddd3b28be1feed65e9de860b1/web/CodeMirrorConfig.js#L12
      makeLineNumbers(true),
      ...(mode !== undefined ? [mode] : []),
      EditorView.updateListener.of(v => {
        if (v.focusChanged) {
          lock.current = v.view.hasFocus;
        }
        if (v.docChanged) {
          const getString = () => v.state.doc.toString();
          onChange(getString);
        }
      }),
      EditorView.theme(
        {
          '&.cm-focused': {
            outline: 'none'
          }
        },
        { dark }
      ),
      // https://github.com/codemirror/codemirror.next/issues/173
      EditorView.editable.of(editable)
    ]
  });
};

type ViewOptions = {
  root: HTMLElement;
} & StateOptions;
const createCodeMirrorView = ({ root, ...options }: ViewOptions) => {
  return new EditorView({
    state: createCodeMirrorState(options),
    parent: root
  });
};

type CodeMirrorProps = {
  value: string;
  onChange: (getString: () => string) => void;
  lock: React.MutableRefObject<boolean>;
  dark: boolean;
  editable: boolean;
  fileExtension?: string;
};
export type CodeMirrorRef = {
  update: (markdown: string) => void;
  toggleLineNumbers: () => void;
};
export const CodeMirror = React.forwardRef<CodeMirrorRef, CodeMirrorProps>(
  ({ value, onChange, lock, dark, editable, fileExtension }, ref) => {
    const divRef = React.useRef<HTMLDivElement>(null);
    const showLNumbers = React.useRef<boolean>(true);
    const editorRef = React.useRef<ReturnType<typeof createCodeMirrorView>>();
    const [focus, setFocus] = React.useState(false);

    React.useEffect(() => {
      if (!divRef.current) return;

      const editor = createCodeMirrorView({
        root: divRef.current,
        onChange,
        lock,
        dark,
        editable,
        value,
        fileExtension
      });
      editorRef.current = editor;

      /*const timer = setInterval(() => {
        editor.focus();
        if(editor.hasFocus) clearInterval(timer);
      }, 500);*/

      return () => {
        // clearInterval(timer);
        editor.destroy();
      };
    }, [onChange, value, lock, dark]);

    React.useImperativeHandle(ref, () => ({
      update: (value: string) => {
        const { current } = editorRef;
        if (!current) return;

        current.setState(
          createCodeMirrorState({
            onChange,
            lock,
            dark,
            editable,
            value
          })
        );
      },
      toggleLineNumbers: () => {
        const { current } = editorRef;
        if (!current) return;
        showLNumbers.current = !showLNumbers.current;
        const v = showLNumbers.current ? lineNumbers() : [];
        current.dispatch({
          effects: lineNumbersCompartment.reconfigure(v)
        });
      }
    }));

    return (
      <div
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        className={className['code'] + (focus ? ' ' + className['focus'] : '')}
      >
        <div ref={divRef} />
      </div>
    );
  }
);
