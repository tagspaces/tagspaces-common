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

    // noinspection OverlyComplexFunctionJS,FunctionWithMultipleReturnPointsJS
    const handleClick = (
      ctx,
      view: EditorView,
      pos: number,
      node: Node
      // nodePos: number,
      // event: MouseEvent,
      // direct: boolean
    ) => {
      // event.preventDefault();
      if (mode === 'preview') {
        const nodes = findChildrenByMark(node, linkSchema.type(ctx));
        if (nodes.length > 0) {
          //&& nodes[0].node.marks.length > 0) {
          const node = nodes.find(n => n.node.marks.length > 0);
          const mark = node?.node.marks.find(
            ({ type }) => type === linkSchema.type(ctx)
          );
          //const mark = node?.node.marks.find(mark => mark.type.name === 'link');
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
            ctx.update(editorViewOptionsCtx, prev => ({
              ...prev,
              editable: () => mode === 'active',
              handleClickOn: (view: EditorView, pos: number, node: Node) =>
                handleClick(ctx, view, pos, node)
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
