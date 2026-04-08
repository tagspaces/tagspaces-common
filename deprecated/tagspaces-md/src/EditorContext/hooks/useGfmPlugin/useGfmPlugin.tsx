import {
  footnoteDefinitionSchema,
  footnoteReferenceSchema,
  gfm
} from '@milkdown/preset-gfm';
import { $command, $view } from '@milkdown/utils';
import {
  useNodeViewFactory,
  usePluginViewFactory,
  useWidgetViewFactory
} from '@prosemirror-adapter/react';
import { useMemo } from 'react';
import type { Ctx, MilkdownPlugin } from '@milkdown/ctx';
import {
  tableSelectorPlugin,
  TableTooltip,
  tableTooltip,
  tableTooltipCtx
} from '../../../components/gfm/TableWidget';
import { FootnoteDef, FootnoteRef } from '../../../components/gfm/Footnote';
import { listItemSchema } from '@milkdown/preset-commonmark';

/// A command to insert taskList.
export const insertTaskListCommand = $command(
  'InsertTaskList',
  ctx => () => (state, dispatch) => {
    if (!dispatch) return true;

    const { tr } = state;
    //const { from } = selection;

    const node = listItemSchema.type(ctx).createAndFill({ checked: false });
    if (!node) return true;

    dispatch(tr.replaceSelectionWith(node, true));
    /*dispatch(
          tr.setNodeMarkup(from, undefined, { ...node.attrs, checked: false })
        );
        dispatch(tr.insertText('- [ ] ', from));*/

    return true;
  }
);

export const useGfmPlugin = () => {
  const pluginViewFactory = usePluginViewFactory();
  const nodeViewFactory = useNodeViewFactory();
  const widgetViewFactory = useWidgetViewFactory();

  const gfmPlugins: MilkdownPlugin[] = useMemo(() => {
    return [
      gfm,
      insertTaskListCommand,
      tableTooltip,
      tableTooltipCtx,
      (ctx: Ctx) => async () => {
        ctx.set(tableTooltip.key, {
          view: pluginViewFactory({
            component: TableTooltip
          })
        });
      },
      $view(footnoteDefinitionSchema.node, () =>
        nodeViewFactory({ component: FootnoteDef })
      ),
      $view(footnoteReferenceSchema.node, () =>
        nodeViewFactory({ component: FootnoteRef })
      ),
      tableSelectorPlugin(widgetViewFactory)
    ].flat();
  }, [nodeViewFactory, pluginViewFactory, widgetViewFactory]);

  return gfmPlugins;
};
