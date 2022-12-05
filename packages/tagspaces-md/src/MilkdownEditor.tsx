import React, { forwardRef, ReactNode } from 'react';
import { editorViewCtx, parserCtx, themeManagerCtx } from '@milkdown/core';
import { EditorRef, ReactEditor, useEditor, useNodeCtx } from '@milkdown/react';
import { Slice } from 'prosemirror-model';

import { createEditor } from './editor';
import { Loading } from './Loading';
import className from './style.module.css';
import { Content, useLazy } from './useLazy';
import { gfm, image, link } from '@milkdown/preset-gfm';
import 'katex/dist/katex.css';
import { nordDark, nordLight } from '@milkdown/theme-nord';
import { replaceAll } from '@milkdown/utils';

type Props = {
  content: Content;
  readOnly?: boolean;
  dark?: boolean;
  onChange?: (markdown: string, prevMarkdown: string | null) => void;
  onFocus?: () => void;
  lightMode?: boolean;
  currentFolder?: string;
};

export type MilkdownRef = { update: (markdown: string) => void };
const MilkdownEditor = forwardRef<MilkdownRef, Props>(
  (
    { content, readOnly, onChange, onFocus, dark, lightMode, currentFolder },
    ref
  ) => {
    // const editorRef = React.useRef<EditorRef>(null);
    // const editorRef = React.useRef({} as EditorRef);
    // const [editorReady, setEditorReady] = React.useState(false);

    const [loading, md] = useLazy(content);

    React.useImperativeHandle(ref, () => ({
      update: (markdown: string) => {
        // if (!editorReady || !editorRef.current) return;
        if (editorLoading) return;
        const editor = getInstance();
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
      },
      // https://github.com/Saul-Mirone/milkdown/issues/204#issuecomment-985977031
      isEqualMarkdown: (prev: string, next: string) => {
        if (editorLoading) return;
        const editor = getInstance();
        if (!editor) return;
        return editor.action(ctx => {
          const parser = ctx.get(parserCtx);
          const prevDoc = parser(prev)?.toJSON();
          const nextDoc = parser(next)?.toJSON();
          console.log(JSON.stringify(prevDoc));
          console.log(JSON.stringify(nextDoc));
          return JSON.stringify(prevDoc) === JSON.stringify(nextDoc);
        });
      }
    }));

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

    // @ts-ignore
    const isWeb = window.isWeb;
    //https://github.com/Saul-Mirone/milkdown/blob/main/examples/react/component/milkdown/index.tsx

    const TSLink: React.FC<{ children: ReactNode }> = ({ children }) => {
      const { node } = useNodeCtx();

      // title={node.attrs.title}

      const clickLink = (evt: any) => {
        evt.preventDefault();

        let path;
        if (!hasURLProtocol(node.attrs.href)) {
          // const workFolder = currentFolder || window.fileDirectory;
          // path =
          //   (isWeb ? '' : 'file://') +
          //   workFolder +
          //   '/' +
          //   encodeURIComponent(node.attrs.href);
          path = encodeURIComponent(node.attrs.href);
        } else {
          path = node.attrs.href;
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
        <a href="#" onClick={clickLink}>
          {children}
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
    };

    const {
      editor,
      getInstance,
      loading: editorLoading
    } = useEditor(
      (root, renderReact) => {
        const nodes = gfm
          .configure(link, { view: renderReact(TSLink) })
          .configure(image, { view: renderReact(TSImage) });
        return createEditor(
          root,
          md,
          readOnly,
          nodes,
          onChange,
          onFocus,
          lightMode
        );
      },
      [readOnly, md, onChange, onFocus]
    );

    React.useEffect(() => {
      if (editorLoading) return;
      const editor = getInstance();
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
    }, [editorLoading, dark]);

    return (
      <div
        style={{ minHeight: readOnly ? 100 : 400 }}
        className={className.editor}
      >
        {loading ? (
          <Loading />
        ) : (
          <ReactEditor /*ref={editorRef}*/ editor={editor} />
        )}
      </div>
    );
  }
);

export default MilkdownEditor;
