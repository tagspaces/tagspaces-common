import React from 'react';
import { MilkdownProvider } from '@milkdown/react';
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/react';
import UseMilkdownEditor from './UseMilkdownEditor';

type Props = {
  content: string; // Content;
  readOnly?: boolean;
  dark?: boolean;
  onChange?: (markdown: string, prevMarkdown: string | null) => void;
  onFocus?: () => void;
  lightMode?: boolean;
  currentFolder?: string;
};

const MilkdownEditor: React.FC<Props> = props => {
  return (
    <MilkdownProvider>
      <ProsemirrorAdapterProvider>
        <UseMilkdownEditor {...props} />
      </ProsemirrorAdapterProvider>
    </MilkdownProvider>
  );
};

export default MilkdownEditor;
