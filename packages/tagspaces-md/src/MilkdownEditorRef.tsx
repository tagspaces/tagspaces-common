import React, { ForwardedRef } from 'react';
import { Milkdown } from '@milkdown/react';
import { useInstance } from '@milkdown/react';
import { replaceAll } from '@milkdown/utils';
import { MilkdownRef } from './MilkdownEditor';
import { useSetDarkMode } from './providers/DarkModeProvider';
import { EditorStatus, editorViewCtx } from '@milkdown/core';

type Props = {
  milkdownRef: ForwardedRef<MilkdownRef>;
};

const MilkdownEditorRef: React.FC<Props> = ({ milkdownRef }) => {
  const [loading, getEditor] = useInstance();
  const setDarkMode = useSetDarkMode();

  React.useEffect(() => {
    // autofocus editor https://github.com/orgs/Milkdown/discussions/843
    if (loading) {
      return;
    }
    const editor = getEditor();
    if (!editor) {
      return;
    }
    editor.ctx.get(editorViewCtx).dom.focus();
  }, [loading]);

  React.useImperativeHandle(milkdownRef, () => ({
    update: (markdown: string) => {
      const editor = getEditor();
      if (loading || !editor || editor.status !== EditorStatus.Created) return;
      editor.action(replaceAll(markdown));
    },
    setDarkMode: (isDarkMode: boolean) => {
      setDarkMode(isDarkMode);
    }
    // https://github.com/Saul-Mirone/milkdown/issues/204#issuecomment-985977031
    /*isEqualMarkdown: (prev: string, next: string) => {
          if (loading) return;
          const editor = get();
          if (!editor) return;
          return editor.action(ctx => {
            const parser = ctx.get(parserCtx);
            const prevDoc = parser(prev)?.toJSON();
            const nextDoc = parser(next)?.toJSON();
            console.log(JSON.stringify(prevDoc));
            console.log(JSON.stringify(nextDoc));
            return JSON.stringify(prevDoc) === JSON.stringify(nextDoc);
          });
        }*/
  }));

  return <Milkdown />;
};

export default MilkdownEditorRef;
