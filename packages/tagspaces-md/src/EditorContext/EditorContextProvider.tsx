import {
  Editor as MilkdownEditor,
  rootCtx,
  defaultValueCtx,
  editorViewOptionsCtx, remarkStringifyOptionsCtx
} from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { clipboard } from '@milkdown/plugin-clipboard';
import { emoji } from '@milkdown/plugin-emoji';
import { history } from '@milkdown/plugin-history';
import { EditorView } from 'prosemirror-view';
import { trailing } from '@milkdown/plugin-trailing';
import { useEditor, UseEditorReturn } from '@milkdown/react';
import { createContext, useMemo } from 'react';
import { Node } from '@milkdown/prose/model';
import { findChildrenByMark } from '@milkdown/prose';
import { linkSchema } from '@milkdown/preset-commonmark';

import { useCommonmarkPlugin } from './hooks/useCommonmarkPlugin/useCommonmarkPlugin';
import { useGfmPlugin } from './hooks/useGfmPlugin/useGfmPlugin';
import { useListenerPlugin } from './hooks/useListenerPlugin';
import { useMathPlugin } from './hooks/useMathPlugin';
import { useMenuBarPlugin } from './hooks/useMenuBarPlugin';
import { usePrismPlugin } from './hooks/usePrismPlugin';
import { useSlashPlugin } from './hooks/useSlashPlugin';
import { useUploadPlugin } from './hooks/useUploadPlugin/useUploadPlugin';
import { useTextEditorContext } from '../TextEditorContext/useTextEditoContext';
import '@milkdown/theme-nord/style.css';
import { useDiagramPlugin } from './hooks/useDiagramPlugin';
import { useTaskList } from './hooks/useTaskList';

/*function isExternalLink(url: any) {
    return url.startsWith('http://') || url.startsWith('https://');
  }*/
function hasURLProtocol(url: any) {
  // noinspection OverlyComplexBooleanExpressionJS
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('file://') ||
    url.startsWith('data:') ||
    url.startsWith('ts://?ts') ||
    url.startsWith('ts:?ts')
  );
}

type EditorContextData = {
  editor: UseEditorReturn | null;
};

export const EditorContext = createContext<EditorContextData>({
  editor: null
});

type EditorContextProviderProps = {
  children: React.ReactNode;
  onChange: (markdown: string, prevMarkdown: string) => void;
  onFocus: () => void;
  debounceChange?: number;
  lightMode?: boolean;
  defaultMarkdownValue: string;
};

export const EditorContextProvider: React.FC<EditorContextProviderProps> = ({
  children,
  onChange,
  onFocus,
  debounceChange,
  defaultMarkdownValue,
  lightMode
}) => {
  const { mode } = useTextEditorContext();

  const commonmarkPlugin = useCommonmarkPlugin();
  const gfmPlugin = useGfmPlugin();
  const mathPlugin = useMathPlugin();
  const taskList = useTaskList();
  const uploadPlugin = useUploadPlugin();
  const diagramPlugins = useDiagramPlugin();
  const slashPlugin = useSlashPlugin();
  const prismPlugin = usePrismPlugin();
  const menuBarPlugin = useMenuBarPlugin();
  const listenerPlugin = useListenerPlugin({
    onChange,
    onFocus,
    debounceChange
  });

  // noinspection OverlyComplexFunctionJS,FunctionWithMultipleReturnPointsJS
  const handleClick = (
    view: EditorView,
    pos: number,
    node: Node
    // nodePos: number,
    // event: MouseEvent,
    // direct: boolean
  ) => {
    // event.preventDefault();
    if (mode === 'preview') {
      const nodes = findChildrenByMark(node, linkSchema.type());
      if (nodes.length > 0) {
        //&& nodes[0].node.marks.length > 0) {
        const node = nodes.find(n => n.node.marks.length > 0);
        const mark = node?.node.marks.find(mark => mark.type.name === 'link');
        const href = mark?.attrs.href; //marks[0].node.marks[0].attrs.href;
        // const isExternal = isExternalLink(href);
        let path;
        if (hasURLProtocol(href)) {
          path = href;
        } else {
          path = encodeURIComponent(href);
        }
        window.parent.postMessage(
          JSON.stringify({
            command: 'openLinkExternally',
            link: path
          }),
          '*'
        );
        // alert('click on mark:' + marks[0].node.marks[0].attrs.href);
      }
      return true;
    }
    return false;
  };

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
            editable: () => mode === 'active',
            handleClickOn: handleClick
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
        .use(taskList);

      if (!lightMode) {
        editor
          .use(listenerPlugin)
          .use(gfmPlugin)
          .use(prismPlugin)
          .use(history)
          .use(uploadPlugin)
          .use(diagramPlugins)
          .use(mathPlugin)
          .use(slashPlugin)
          .use(trailing)
          .use(emoji)
          .use(clipboard)
          .use(menuBarPlugin);
      }
      return editor;
    },
    [
      mode,
      commonmarkPlugin,
      defaultMarkdownValue,
      listenerPlugin,
      menuBarPlugin,
      gfmPlugin,
      mathPlugin,
      diagramPlugins,
      onChange,
      slashPlugin,
      uploadPlugin,
      prismPlugin
    ]
  );

  const context = useMemo(() => ({ editor }), [editor]);

  return (
    <EditorContext.Provider value={context}>{children}</EditorContext.Provider>
  );
};
