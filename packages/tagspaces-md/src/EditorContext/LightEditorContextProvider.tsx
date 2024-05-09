import {
  Editor as MilkdownEditor,
  rootCtx,
  defaultValueCtx,
  editorViewOptionsCtx
} from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { EditorView } from 'prosemirror-view';
import { useEditor, UseEditorReturn } from '@milkdown/react';
import { createContext, useMemo } from 'react';
import { Node } from '@milkdown/prose/model';
import { findChildrenByMark } from '@milkdown/prose';
import { linkSchema } from '@milkdown/preset-commonmark';

import { useCommonmarkPlugin } from './hooks/useCommonmarkPlugin/useCommonmarkPlugin';
import { useGfmPlugin } from './hooks/useGfmPlugin/useGfmPlugin';
import { useTextEditorContext } from '../TextEditorContext/useTextEditoContext';
import '@milkdown/theme-nord/style.css';
import { useTaskList } from './hooks/useTaskList';
import { handleClick } from './utils';

/*function isExternalLink(url: any) {
    return url.startsWith('http://') || url.startsWith('https://');
  }*/

type EditorContextData = {
  editor: UseEditorReturn | null;
};

export const EditorContext = createContext<EditorContextData>({
  editor: null
});

type EditorContextProviderProps = {
  onFocus?: () => void;
  children: React.ReactNode;
  onChange: (markdown: string, prevMarkdown: string) => void;
  debounceChange?: number;
  lightMode?: boolean;
  excludePlugins?: Array<string>;
  defaultMarkdownValue: string;
};

export const LightEditorContextProvider: React.FC<EditorContextProviderProps> =
  ({ children, onChange, defaultMarkdownValue }) => {
    const { mode } = useTextEditorContext();

    const gfmPlugin = useGfmPlugin();
    const taskList = useTaskList();
    const commonmarkPlugin = useCommonmarkPlugin();

    const editor = useEditor(
      root => {
        const editor: MilkdownEditor = MilkdownEditor.make()
          .config(ctx => {
            ctx.set(rootCtx, root);
            ctx.set(defaultValueCtx, defaultMarkdownValue);
            ctx.update(editorViewOptionsCtx, prev => ({
              ...prev,
              editable: () => mode === 'active',
              handleClickOn: (view: EditorView, pos: number, node: Node) =>
                handleClick(mode, ctx, view, pos) //, node)
            }));
            //preventDefaultClick
            const observer = new MutationObserver(() => {
              const links = Array.from(root.querySelectorAll('a'));
              links.forEach(link => {
                link.onclick = () => false;
              });
            });
            observer.observe(root, {
              childList: true
            });
          })
          .config(nord)
          .use(commonmarkPlugin)
          .use(gfmPlugin)
          .use(taskList);

        return editor;
      },
      [mode, commonmarkPlugin, defaultMarkdownValue, gfmPlugin, onChange]
    );

    const context = useMemo(() => ({ editor }), [editor]);

    return (
      <EditorContext.Provider value={context}>
        {children}
      </EditorContext.Provider>
    );
  };
