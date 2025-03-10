import { gfm } from '@milkdown/preset-gfm';
import { $command } from '@milkdown/utils';
import {
  useNodeViewFactory,
  usePluginViewFactory,
  useWidgetViewFactory
} from '@prosemirror-adapter/react';
import { useMemo } from 'react';
import type { MilkdownPlugin } from '@milkdown/ctx';
import { listItemSchema } from '@milkdown/preset-commonmark';

/// A command to insert taskList.
export const insertTaskListCommand = $command(
  'InsertTaskList',
  ctx => () => (state, dispatch) => {
    if (!dispatch) return true;

    const { tr } = state;

    const node = listItemSchema.type(ctx).createAndFill({ checked: false });
    if (!node) return true;

    dispatch(tr.replaceSelectionWith(node, true));
    return true;
  }
);

export const useGfmPlugin = () => {
  const pluginViewFactory = usePluginViewFactory();
  const nodeViewFactory = useNodeViewFactory();
  const widgetViewFactory = useWidgetViewFactory();

  const gfmPlugins: MilkdownPlugin[] = useMemo(() => {
    return [gfm, insertTaskListCommand].flat();
  }, [nodeViewFactory, pluginViewFactory, widgetViewFactory]);

  return gfmPlugins;
};
