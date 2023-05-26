import React from 'react';
import { MilkdownProvider } from '@milkdown/react';
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/react';
import UseMilkdownEditor from './UseMilkdownEditor';

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

const MilkdownEditor = React.forwardRef<MilkdownRef, Props>((props, ref) => {
  return (
    <MilkdownProvider>
      <ProsemirrorAdapterProvider>
        <UseMilkdownEditor milkdownRef={ref} {...props} />
      </ProsemirrorAdapterProvider>
    </MilkdownProvider>
  );
});

export default MilkdownEditor;
