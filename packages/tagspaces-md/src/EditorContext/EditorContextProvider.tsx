import {
  Editor as MilkdownEditor,
  rootCtx,
  defaultValueCtx,
  editorViewOptionsCtx
} from '@milkdown/core';
import { clipboard } from '@milkdown/plugin-clipboard';
import { emoji } from '@milkdown/plugin-emoji';
import { history } from '@milkdown/plugin-history';
import { EditorView } from 'prosemirror-view';
import { trailing } from '@milkdown/plugin-trailing';
import { useEditor, UseEditorReturn } from '@milkdown/react';
import { createContext, useMemo } from 'react';

import { useCommonmarkPlugin } from './hooks/useCommonmarkPlugin/useCommonmarkPlugin';
import { useGfmPlugin } from './hooks/useGfmPlugin/useGfmPlugin';
import { useListenerPlugin } from './hooks/useListenerPlugin';
import { useMathPlugin } from './hooks/useMathPlugin';
import { useMenuBarPlugin } from './hooks/useMenuBarPlugin';
import { useMermaidPlugin } from './hooks/useMermaidPlugin';
import { usePrismPlugin } from './hooks/usePrismPlugin';
//import { useSlashPlugin } from './hooks/useSlashPlugin';
import { useUploadPlugin } from './hooks/useUploadPlugin/useUploadPlugin';
import { useTextEditorContext } from '../TextEditorContext/useTextEditoContext';

type EditorContextData = {
  editor: UseEditorReturn | null;
};

export const EditorContext = createContext<EditorContextData>({
  editor: null
});

type EditorContextProviderProps = {
  children: React.ReactNode;
  onChange: (markdown: string, prevMarkdown: string) => void;
  debounceChange?: number;
  defaultMarkdownValue: string;
};

export const EditorContextProvider: React.FC<EditorContextProviderProps> = ({
  children,
  onChange,
  debounceChange,
  defaultMarkdownValue
}) => {
  const { mode } = useTextEditorContext();

  const gfmPlugin = useGfmPlugin();
  const mathPlugin = useMathPlugin();
  const uploadPlugin = useUploadPlugin();
  const mermaidPlugin = useMermaidPlugin();
  //const slashPlugin = useSlash(); //useSlashPlugin();
  const commonmarkPlugin = useCommonmarkPlugin();
  const prismPlugin = usePrismPlugin();
  const menuBarPlugin = useMenuBarPlugin();
  const listenerPlugin = useListenerPlugin({ onChange, debounceChange });

  /*const handleClick = (
    view: EditorView,
    pos: number,
    node: Node,
    nodePos: number,
    event: MouseEvent,
    direct: boolean
  ) => {
    alert('click');
    return true;
  };*/
  const editor = useEditor(
    root =>
      MilkdownEditor.make()
        .config(ctx => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, defaultMarkdownValue);

          ctx.update(editorViewOptionsCtx, prev => ({
            ...prev,
            editable: () => mode === 'active',
            // @ts-ignore
            // handleClickOn: handleClick
          }));
        })
        .use(commonmarkPlugin)
        .use(listenerPlugin)
        .use(prismPlugin)
        .use(history)
        .use(uploadPlugin)
        .use(mermaidPlugin)
        .use(mathPlugin)
        //.use(slashPlugin)
        .use(trailing)
        .use(emoji)
        .use(clipboard)
        .use(menuBarPlugin)
        .use(gfmPlugin),
    [
      mode,
      commonmarkPlugin,
      defaultMarkdownValue,
      listenerPlugin,
      menuBarPlugin,
      gfmPlugin,
      mathPlugin,
      mermaidPlugin,
      onChange,
      //slashPlugin,
      uploadPlugin,
      prismPlugin
    ]
  );

  const context = useMemo(() => ({ editor }), [editor]);

  return (
    <EditorContext.Provider value={context}>{children}</EditorContext.Provider>
  );
};
