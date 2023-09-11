import { math, mathBlockSchema } from '@milkdown/plugin-math';
import { setBlockType } from '@milkdown/prose/commands';
import { $view, $command } from '@milkdown/utils';
import { useNodeViewFactory } from '@prosemirror-adapter/react';
import { useMemo } from 'react';

import { Plugin } from '../../types/plugins';
import { listItemSchema } from '@milkdown/preset-commonmark';
import { TaskListItem } from '../../components/TaskListItem';

/*export const insertMathCommand = $command(
  'InsertMathCommand',
  (ctx) => (value?: string) => setBlockType(mathBlockSchema.type(ctx), { value })
);*/

export const useTaskList = (): Plugin => {
  const nodeViewFactory = useNodeViewFactory();

  const tasksPlugin = useMemo(
    () =>
      [
        $view(listItemSchema.node, () =>
          nodeViewFactory({ component: TaskListItem })
        )
      ].flat(),
    [nodeViewFactory]
  );

  return tasksPlugin;
};
