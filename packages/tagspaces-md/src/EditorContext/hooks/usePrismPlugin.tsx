import { Ctx } from '@milkdown/ctx';
import { prism, prismConfig } from '@milkdown/plugin-prism';
import { useMemo } from 'react';
import { refractor } from 'refractor/lib/common';
// import 'prism-themes/themes/prism-nord.css'

export const usePrismPlugin = () => {
  const prismPlugin = useMemo(
    () =>
      [
        prism,
        (ctx: Ctx) => () => {
          ctx.update(prismConfig.key, prev => ({
            ...prev,
            configureRefractor: () => refractor,
          }));
        },
      ].flat(),
    []
  );

  return prismPlugin;
};
