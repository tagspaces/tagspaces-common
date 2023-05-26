import {
  defaultValueCtx,
  Editor,
  editorViewOptionsCtx,
  rootCtx
} from '@milkdown/core';

import { gfm } from '@milkdown/preset-gfm';
import { clipboard } from '@milkdown/plugin-clipboard';
import { diagram } from '@milkdown/plugin-diagram';
import { emoji } from '@milkdown/plugin-emoji';
import { history } from '@milkdown/plugin-history';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { math } from '@milkdown/plugin-math';
import { prism } from '@milkdown/plugin-prism';
import { nord } from '@milkdown/theme-nord';
import { block } from '@milkdown/plugin-block';
import { cursor } from '@milkdown/plugin-cursor';
import { commonmark } from '@milkdown/preset-commonmark';
//import { slash, SlashView } from './plugins/SlashView';
import { tooltip, TooltipView } from './plugins/TooltipView';

export const createEditor = (
  pluginViewFactory: any,
  widgetViewFactory: any,
  slash: any,
  root: HTMLElement | null,
  defaultValue: string,
  readOnly: boolean | undefined,
  // setEditorReady: (ready: boolean) => void,
  // nodes: AtomList<MilkdownPlugin>,
  onChange?: (markdown: string, prevMarkdown: string | null) => void,
  onFocus?: () => void,
  lightMode = false
) => {
  const editor: Editor = Editor.make()
    // .enableInspector()
    .config(ctx => {
      ctx.set(rootCtx, root);
      ctx.set(defaultValueCtx, defaultValue);
      if (!lightMode) {
        slash.config(ctx);
      }
      ctx.set(tooltip.key, {
        view: pluginViewFactory({
          component: TooltipView
        })
      });
      /*ctx.set('link', {
        // Set your link attributes here
        onClick: () => console.log('Link clicked!')
      });*/
      /*ctx.set(linkAttr.key, (mark) => {/!*
            const level = node.attrs.level;
            if (level === 1) return { class: 'text-4xl', data-el-type: 'h1' };
            if (level === 2) return { class: 'text-3xl', data-el-type: 'h2' };
            // ...*!/
            return { class: 'text-4xl', data-el-type: 'link' }
        })*/
      // ctx.set(editorViewOptionsCtx, { editable: () => !readOnly });
      ctx.update(editorViewOptionsCtx, prev => ({
        ...prev,
        editable: () => !readOnly
      }));
      ctx
        .get(listenerCtx)
        .markdownUpdated((ctx, markdown, prevMarkdown) => {
          if (onChange) {
            onChange(markdown, prevMarkdown);
          }
        })
        .focus(ctx => {
          if (onFocus) {
            onFocus();
          }
        });
    })
    .config(nord)
    .use(commonmark)
    // .use(nodes)
    .use(gfm)
    // .use(complete(() => setEditorReady(true)))
    .use(clipboard)
    .use(listener)
    .use(history)
    .use(prism)
    .use(diagram)
    // .use(table)
    .use(tooltip)
    .use(math)
    .use(emoji);
  //.use(linkPlugin(widgetViewFactory));
  // .use(linkPlugin(widgetViewFactory))
  // Add a custom widget view
  /* .use(
      $prose(() => {
        const getAnchorWidget = widgetViewFactory({
          as: 'span',
          component: HeadingAnchor
        });
        return new Plugin({
          props: {
            decorations: state => {
              const widgets: Decoration[] = [];

              state.doc.descendants((node, pos) => {
                if (node.type === headingSchema.type()) {
                  widgets.push(
                    getAnchorWidget(pos + 1, {
                      id: node.attrs.id,
                      level: node.attrs.level,
                      side: -1
                    })
                  );
                }
              });

              return DecorationSet.create(state.doc, widgets);
            }
          }
        });
      })
    );*/

  if (!lightMode) {
    editor.use(cursor).use(block).use(slash.plugins);
  }
  return editor;

  /*Editor.make()
        .config((ctx) => {
            context = ctx;
            ctx.set(rootCtx, root);
            const content = getContent();
            if (content) {
                ctx.set(defaultValueCtx, content);
            }
            ctx.set(listenerCtx, listenerConf); // { markdown: [(x) => console.log(x())] });
            ctx.set(editorViewOptionsCtx, { editable });
        })
        .use(nord)
        .use(nodes)
        // .use(AtomList.create([clickPlugin()]))
        //.use([directiveRemarkPlugin, link])
        .use(commonmark)
        .use(clipboard)
        .use(listener)
        .use(history)
        .use(emoji)
        .use(table)
        .use(math)
        .use(slash)
        .use(tooltip)*/
};
