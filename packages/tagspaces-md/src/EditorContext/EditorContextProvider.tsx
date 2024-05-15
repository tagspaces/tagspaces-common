import {
  Editor as MilkdownEditor,
  rootCtx,
  defaultValueCtx,
  editorViewOptionsCtx
} from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { clipboard } from '@milkdown/plugin-clipboard';
import { emoji } from '@milkdown/plugin-emoji';
import { history } from '@milkdown/plugin-history';
import { EditorView } from 'prosemirror-view';
import { trailing } from '@milkdown/plugin-trailing';
import { cursor } from '@milkdown/plugin-cursor';
import { useEditor, UseEditorReturn } from '@milkdown/react';
import { createContext, useEffect, useMemo, useRef } from 'react';
import { Node } from '@milkdown/prose/model';

import { useCommonmarkPlugin } from './hooks/useCommonmarkPlugin/useCommonmarkPlugin';
import { useGfmPlugin } from './hooks/useGfmPlugin/useGfmPlugin';
import { useListenerPlugin } from './hooks/useListenerPlugin';
import { useMathPlugin } from './hooks/useMathPlugin';
import { useMenuBarPlugin } from './hooks/useMenuBarPlugin';
//import { usePrismPlugin } from './hooks/usePrismPlugin';
import { useSlashPlugin } from './hooks/useSlashPlugin';
import { useUploadPlugin } from './hooks/useUploadPlugin/useUploadPlugin';
import { useTextEditorContext } from '../TextEditorContext/useTextEditoContext';
import '@milkdown/theme-nord/style.css';
import { useDiagramPlugin } from './hooks/useDiagramPlugin';
import { useTaskList } from './hooks/useTaskList';
import { handleClick } from './utils';
import { useBlockPlugin } from './hooks/useBlockPlugin';

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
  excludePlugins?: Array<string>;
  defaultMarkdownValue: string;
};

export const EditorContextProvider: React.FC<EditorContextProviderProps> = ({
  onFocus,
  children,
  onChange,
  debounceChange,
  defaultMarkdownValue,
  excludePlugins
}) => {
  const { mode } = useTextEditorContext();
  const isEditable = useRef(mode === 'active');

  const gfmPlugin = useGfmPlugin();
  const mathPlugin = useMathPlugin();
  const taskList = useTaskList();
  const uploadPlugin = useUploadPlugin();
  const diagramPlugins = useDiagramPlugin();
  const slashPlugin = useSlashPlugin();
  const commonmarkPlugin = useCommonmarkPlugin();
  //const prismPlugin = usePrismPlugin();
  const menuBarPlugin = useMenuBarPlugin();
  const blockPlugin = useBlockPlugin();
  const listenerPlugin = useListenerPlugin({
    onChange,
    onFocus,
    debounceChange
  });

  function isExcluded(pluginName) {
    if (excludePlugins) {
      if (excludePlugins.includes(pluginName)) {
        return true;
      }
    }
    return false;
  }

  const editor = useEditor(
    root => {
      const editor: MilkdownEditor = MilkdownEditor.make()
        .config(ctx => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, defaultMarkdownValue);
          /* ctx.set(remarkStringifyOptionsCtx, {
            // some options, for example:
            bullet: '*',
            fences: true,
            incrementListMarker: false,
          });*/

          ctx.update(editorViewOptionsCtx, prev => ({
            ...prev,
            attributes: {
              class: 'mx-auto'
            },
            editable: () => isEditable.current,
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
        .use(taskList)
        .use(listenerPlugin)
        .use(blockPlugin)
        .use(cursor)
        //.use(prismPlugin)
        .use(history)
        .use(trailing)
        .use(emoji)
        .use(clipboard);

      if (!isExcluded('menu')) {
        editor.use(menuBarPlugin);
      }
      if (!isExcluded('slash')) {
        editor.use(slashPlugin);
      }
      if (!isExcluded('math')) {
        editor.use(mathPlugin);
      }
      if (!isExcluded('diagrams')) {
        editor.use(diagramPlugins);
      }
      if (!isExcluded('upload')) {
        editor.use(uploadPlugin);
      }
      return editor;
    },
    [
      commonmarkPlugin,
      defaultMarkdownValue,
      listenerPlugin,
      menuBarPlugin,
      gfmPlugin,
      mathPlugin,
      diagramPlugins,
      onChange,
      slashPlugin,
      uploadPlugin
      //prismPlugin
    ]
  );

  useEffect(() => {
    isEditable.current = mode === 'active';
  }, [isEditable, mode]);

  const context = useMemo(() => ({ editor }), [editor]);

  return (
    <EditorContext.Provider value={context}>{children}</EditorContext.Provider>
  );
};
