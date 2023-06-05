import React from 'react';
import { MilkdownProvider } from '@milkdown/react';
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/react';

import { Milkdown } from '@milkdown/react';
import 'katex/dist/katex.min.css';

import { EditorContextProvider } from './EditorContext/EditorContextProvider';
import { TextEditorContextProvider } from './TextEditorContext/TextEditorContextProvider';
import MilkdownEditorRef from './MilkdownEditorRef';

export interface MilkdownRef {
  update: (markdown: string) => void;
}

interface Props {
  content: string; // Content;
  readOnly?: boolean;
  dark?: boolean;
  onChange?: (markdown: string, prevMarkdown: string | null) => void;
  onFocus?: () => void;
  lightMode?: boolean;
  currentFolder?: string;
}

const MilkdownEditor = React.forwardRef<MilkdownRef, Props>(
  ({ readOnly, content, onChange, currentFolder, ...rest }, ref) => {
    return (
      <TextEditorContextProvider mode={readOnly ? 'preview' : 'active'} currentFolder={currentFolder}>
        <MilkdownProvider>
          <ProsemirrorAdapterProvider>
            <EditorContextProvider
              defaultMarkdownValue={content}
              onChange={onChange}
              {...rest}
            >
              <MilkdownEditorRef milkdownRef={ref} />
            </EditorContextProvider>
          </ProsemirrorAdapterProvider>
        </MilkdownProvider>
      </TextEditorContextProvider>
    );
  }
);

export default MilkdownEditor;
