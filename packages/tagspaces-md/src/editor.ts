import {
  defaultValueCtx,
  Editor,
  editorViewOptionsCtx,
  rootCtx
} from '@milkdown/core';
import type { MilkdownPlugin } from '@milkdown/ctx';
import { clipboard } from '@milkdown/plugin-clipboard';
import { diagram } from '@milkdown/plugin-diagram';
import { emoji } from '@milkdown/plugin-emoji';
import { history } from '@milkdown/plugin-history';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { math } from '@milkdown/plugin-math';
import { prism } from '@milkdown/plugin-prism';
import { nord } from '@milkdown/theme-nord';
import { AtomList } from '@milkdown/utils';
import { block } from '@milkdown/plugin-block';
import { cursor } from '@milkdown/plugin-cursor';
import { slash, SlashView } from './plugins/SlashView';
import { tooltip, TooltipView } from './plugins/TooltipView';

/*const complete =
  (callback: () => void): MilkdownPlugin =>
  () =>
  async ctx => {
    await ctx.wait(EditorViewReady);

    callback();
  };*/

export const createEditor = (
  pluginViewFactory,
  root: HTMLElement | null,
  defaultValue: string,
  readOnly: boolean | undefined,
  // setEditorReady: (ready: boolean) => void,
  nodes: AtomList<MilkdownPlugin>,
  onChange?: (markdown: string, prevMarkdown: string | null) => void,
  onFocus?: () => void,
  lightMode = false
) => {
  const editor: Editor = Editor.make()
    .config(ctx => {
      ctx.set(rootCtx, root);
      ctx.set(defaultValueCtx, defaultValue);
      if (!lightMode) {
        ctx.set(slash.key, {
          view: pluginViewFactory({
            component: SlashView
          })
        });
      }
      ctx.set(tooltip.key, {
        view: pluginViewFactory({
          component: TooltipView
        })
      });
      // ctx.set(editorViewOptionsCtx, { editable: () => !readOnly });
      ctx.update(editorViewOptionsCtx, prev => ({
        ...prev,
        editable: () => !readOnly
      }));
      // ctx.set(listenerCtx, { markdown: onChange ? [onChange] : [] });
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
    // .use(commonmark)
    .use(nodes)
    // .use(gfm)
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

  if (!lightMode) {
    editor.use(cursor).use(block).use(slash);
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
