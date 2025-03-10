import type { FC } from 'react';

import { Crepe, CrepeFeature } from '@milkdown/crepe';
import { Milkdown, useEditor } from '@milkdown/react';

import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import { useMenuBarPlugin, useGfmPlugin } from '../src';

const markdown = `# Milkdown React Crepe

> You're scared of a world where you're needed.

This is a demo for using Crepe with **React**.`;

export const MilkdownEditor: FC = () => {
  const menuBarPlugin = useMenuBarPlugin();
  const gfmPlugin = useGfmPlugin();

  useEditor(root => {
    const crepe = new Crepe({
      root,
      defaultValue: markdown,
      features: { [Crepe.Feature.Toolbar]: true }
    });
    crepe.editor.use(gfmPlugin);
    crepe.editor.use(menuBarPlugin);
    return crepe;
  }, []);

  return <Milkdown />;
};
