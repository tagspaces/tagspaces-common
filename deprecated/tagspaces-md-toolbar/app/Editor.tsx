import type { FC } from 'react';

import { Crepe } from '@milkdown/crepe';
import { Milkdown, useEditor } from '@milkdown/react';

import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import { useMenuBarPlugin } from '../src';
import { $command } from '@milkdown/utils';
import { listItemSchema } from '@milkdown/preset-commonmark';

const markdown = `# Milkdown React Crepe

> You're scared of a world where you're needed.

This is a demo for using Crepe with **React**.`;

export const MilkdownEditor: FC = () => {
  const menuBarPlugin = useMenuBarPlugin();
  //const gfmPlugin = useGfmPlugin();

  useEditor(root => {
    const crepe = new Crepe({
      root,
      defaultValue: markdown
      /*features: { [Crepe.Feature.Toolbar]: true },*/
    });

    const insertTaskListCommand = $command(
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

    crepe.editor.use([insertTaskListCommand].flat());
    crepe.editor.use(menuBarPlugin);
    return crepe;
  }, []);

  return <Milkdown />;
};
