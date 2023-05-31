import React, { ForwardedRef } from 'react';
import { Milkdown, useEditor } from '@milkdown/react';
import { createEditor } from './editor';
import 'katex/dist/katex.css';
import {
  usePluginViewFactory,
  useWidgetViewFactory,
  useNodeViewFactory
} from '@prosemirror-adapter/react';
import { replaceAll } from '@milkdown/utils';
import { useSlash } from './plugins/slash-menu';
import { MilkdownRef } from './MilkdownEditor';
import { AppBar, Toolbar } from '@mui/material';
import ToolbarButtons from './ToolbarButtons';

type Props = {
  content: string; // Content;
  milkdownRef: ForwardedRef<MilkdownRef>;
  readOnly?: boolean;
  dark?: boolean;
  onChange?: (markdown: string, prevMarkdown: string | null) => void;
  onFocus?: () => void;
  lightMode?: boolean;
  currentFolder?: string;
};

// export type MilkdownRef = { update: (markdown: string) => void };
const UseMilkdownEditor: React.FC<Props> = ({
  content,
  milkdownRef,
  readOnly,
  onChange,
  onFocus,
  dark,
  lightMode,
  currentFolder
}) => {
  const slash = useSlash();
  const nodeViewFactory = useNodeViewFactory();
  const widgetViewFactory = useWidgetViewFactory();
  const pluginViewFactory = usePluginViewFactory();
  // const [loading, md] = useLazy(content);

  const { get, loading } = useEditor(
    root => {
      //, renderReact) => {
      /*const nodes = gfm
                    .configure(link, { view: renderReact(TSLink) })
                    .configure(image, { view: renderReact(TSImage) });*/
      return createEditor(
          nodeViewFactory,
        pluginViewFactory,
        widgetViewFactory,
        slash,
        root,
        content,
        readOnly,
        // nodes,
        onChange,
        onFocus,
        lightMode
      );
    },
    [readOnly, content, onChange, onFocus]
  );

  React.useImperativeHandle(milkdownRef, () => ({
    update: (markdown: string) => {
      // if (!editorReady || !editorRef.current) return;
      if (loading) return;
      const editor = get();
      if (!editor) return;
      editor.action(replaceAll(markdown));
      /*editor.action(ctx => {
            const view = ctx.get(editorViewCtx);
            const parser = ctx.get(parserCtx);
            const doc = parser(markdown);
            if (!doc) return;
            const state = view.state;
            view.dispatch(
              state.tr.replace(
                0,
                state.doc.content.size,
                new Slice(doc.content, 0, 0)
              )
            );
          });*/
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

  /*
      function hasURLProtocol(url: any) {
        return (
          url.startsWith('http://') ||
          url.startsWith('https://') ||
          url.startsWith('file://') ||
          url.startsWith('data:') ||
          url.startsWith('ts://?ts') ||
          url.startsWith('ts:?ts')
        );
      }

      function isExternalLink(url: any) {
        return url.startsWith('http://') || url.startsWith('https://');
      }

      // @ts-ignore
      const isWeb = window.isWeb;
      //https://github.com/Saul-Mirone/milkdown/blob/main/examples/react/component/milkdown/index.tsx

      const TSLink: React.FC<{ children: ReactNode }> = ({ children }) => {
        const { node } = useNodeCtx();

        const href = node.attrs.href;
        // title={node.attrs.title}
        const isExternal = isExternalLink(href);

        const clickLink = (evt: any) => {
          evt.preventDefault();

          let path;
          if (!hasURLProtocol(href)) {
            // const workFolder = currentFolder || window.fileDirectory;
            // path =
            //   (isWeb ? '' : 'file://') +
            //   workFolder +
            //   '/' +
            //   encodeURIComponent(node.attrs.href);
            path = encodeURIComponent(href);
          } else {
            path = href;
          }

          window.parent.postMessage(
            JSON.stringify({
              command: 'openLinkExternally',
              link: path
            }),
            '*'
          );
        };
        return readOnly ? (
          <a href="#" title={href} onClick={clickLink}>
            {children}
            {isExternal && <>&nbsp;⧉</>}
          </a>
        ) : (
          <a href="#">{children}</a>
        );
      };

      const TSImage: React.FC<{ children: ReactNode }> = ({ children }) => {
        const { node } = useNodeCtx();
        let path;
        if (!hasURLProtocol(node.attrs.src)) {
          // @ts-ignore
          const workFolder = currentFolder || window.fileDirectory;
          path = (isWeb ? '' : 'file://') + workFolder + '/' + node.attrs.src;
        } else {
          path = node.attrs.src;
        }

        return <img src={path} alt={node.attrs.alt} title={node.attrs.title} />;
      };*/

  /* React.useEffect(() => {
        if (loading) return;
        const editor = get();
        if (!editor) return;

        try {
          editor.action(ctx => {
            ctx
              .get(themeManagerCtx)
              .switch(ctx, dark ? nordDark : nordLight)
              .then(() => console.log('theme switched ' + dark));
          });
        } catch (ex) {
          console.error('Switch theme', ex);
        }
      }, [loading, dark]); */

  return (
    <React.Fragment>
      <AppBar position="fixed">
        <Toolbar>
          <ToolbarButtons />
        </Toolbar>
      </AppBar>
      <Milkdown />
    </React.Fragment>
  );
};

export default UseMilkdownEditor;
