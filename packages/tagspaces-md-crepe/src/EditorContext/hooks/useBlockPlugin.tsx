import { Ctx, MilkdownPlugin } from '@milkdown/ctx';
import { usePluginViewFactory } from '@prosemirror-adapter/react';
import { useMemo } from 'react';

import { block } from '@milkdown/plugin-block';
import { BlockView } from '../../components/BlockView';

export const useBlockPlugin = () => {
  const pluginViewFactory = usePluginViewFactory();

  const blockPlugins: MilkdownPlugin[] = useMemo(() => {
    return [
      block,
      (ctx: Ctx) => () => {
        ctx.set(block.key, {
          view: pluginViewFactory({
            component: BlockView
          })
        });
      }
    ].flat();
  }, [pluginViewFactory]);

  return blockPlugins;
};
