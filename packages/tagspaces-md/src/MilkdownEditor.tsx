import React from 'react';
import { MilkdownProvider } from '@milkdown/react';
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/react';

import 'katex/dist/katex.min.css';

import { EditorContextModeProvider } from './EditorContext/EditorContextModeProvider';
import { TextEditorContextProvider } from './TextEditorContext/TextEditorContextProvider';
import MilkdownEditorRef from './MilkdownEditorRef';
import { DarkModeProvider } from './providers/DarkModeProvider';
import { SearchDialogContextProvider } from './components/dialogs/SearchDialogContextProvider';

export interface MilkdownRef {
  update: (markdown: string) => void;
  setDarkMode: (isDark: boolean) => void;
  openSearchDialog: () => void;
}
export type MilkdownEditorMode = 'description' | 'extension';

interface Props {
  content: string; // Content;
  readOnly?: boolean;
  //dark?: boolean;
  onChange?: (markdown: string, prevMarkdown: string | null) => void;
  onFocus?: () => void;
  lightMode?: boolean;
  excludePlugins?: Array<string>;
  currentFolder?: string;
  mode?: MilkdownEditorMode;
  query?: string;
}

const MilkdownEditor = React.forwardRef<MilkdownRef, Props>(
  (
    { readOnly, mode, content, onChange, onFocus, currentFolder, ...rest },
    ref
  ) => {
    return (
      <TextEditorContextProvider
        mode={mode}
        textEditorMode={readOnly ? 'preview' : 'active'}
        currentFolder={currentFolder}
      >
        <MilkdownProvider>
          <SearchDialogContextProvider>
            <ProsemirrorAdapterProvider>
              <EditorContextModeProvider
                defaultMarkdownValue={content}
                onChange={onChange}
                onFocus={onFocus}
                {...rest}
              >
                <DarkModeProvider>
                  <MilkdownEditorRef milkdownRef={ref} />
                </DarkModeProvider>
              </EditorContextModeProvider>
            </ProsemirrorAdapterProvider>
          </SearchDialogContextProvider>
        </MilkdownProvider>
      </TextEditorContextProvider>
    );
  }
);

export default MilkdownEditor;
