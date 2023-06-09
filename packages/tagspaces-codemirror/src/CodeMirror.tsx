import React from 'react';

import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
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
import { EditorState, Extension } from '@codemirror/state';
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

const basicSetup: Extension = [
  lineNumbers(),
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
};

const createCodeMirrorState = ({
  onChange,
  lock,
  dark,
  editable,
  value
}: StateOptions) => {
  return EditorState.create({
    doc: value,
    extensions: [
      basicSetup,
      markdown(),
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
};
export type CodeMirrorRef = { update: (markdown: string) => void };
export const CodeMirror = React.forwardRef<CodeMirrorRef, CodeMirrorProps>(
  ({ value, onChange, lock, dark, editable }, ref) => {
    const divRef = React.useRef<HTMLDivElement>(null);
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
        value
      });
      editorRef.current = editor;

      return () => {
        editor.destroy();
      };
    }, [onChange, value, lock, dark]);

    React.useImperativeHandle(ref, () => ({
      update: (value: string) => {
        const { current } = editorRef;
        if (!current) return;

        current.setState(
          createCodeMirrorState({ onChange, lock, dark, editable, value })
        );
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
