import {
  footnoteDefinitionSchema,
  footnoteReferenceSchema,
  gfm
} from '@milkdown/preset-gfm';
import { $view } from '@milkdown/utils';
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

export const useGfmPlugin = () => {
  const pluginViewFactory = usePluginViewFactory();
  const nodeViewFactory = useNodeViewFactory();
  const widgetViewFactory = useWidgetViewFactory();

  const gfmPlugins: MilkdownPlugin[] = useMemo(() => {
    return [
      gfm,
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
