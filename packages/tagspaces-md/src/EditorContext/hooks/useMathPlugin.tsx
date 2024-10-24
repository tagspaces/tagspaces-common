import { math, mathBlockSchema } from '@milkdown/plugin-math';
import { setBlockType } from '@milkdown/prose/commands';
import { $command } from '@milkdown/utils';
import { useNodeViewFactory } from '@prosemirror-adapter/react';
import { useMemo } from 'react';

// import { MathNode } from '../../../components/MathNode/MathNode';
import { Plugin } from '../../types/plugins';

export const insertMathCommand = $command(
  'InsertMathCommand',
  ctx => (value?: string) => setBlockType(mathBlockSchema.type(ctx), { value })
);

export const useMathPlugin = (): Plugin => {
  const nodeViewFactory = useNodeViewFactory();

  const mathPlugin = useMemo(
    () =>
      [
        math,
        insertMathCommand
        /*$view(mathBlockSchema.node, () =>
          nodeViewFactory({
            component: MathNode,
            stopEvent: () => true,
          })
        ),*/
      ].flat(),
    [nodeViewFactory]
  );

  return mathPlugin;
};
