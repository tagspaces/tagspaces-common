import { Ctx } from '@milkdown/ctx';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { useMemo } from 'react';
import { useDebounce } from '../../hooks/useDebounce';

type UseListenerPluginProps = {
  onChange: (markdown: string, prevMarkdown?: string) => void;
  onFocus?: () => void;
  debounceChange?: number;
};

export const useListenerPlugin = ({
  onChange,
  onFocus,
  debounceChange = 0
}: UseListenerPluginProps) => {
  const { debounce: onChangeDebounced } = useDebounce({
    callback: onChange,
    wait: debounceChange
  });

  const listenerPlugin = useMemo(
    () =>
      [
        listener,
        (ctx: Ctx) => () => {
          ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
            onChangeDebounced(markdown);
          });

          ctx.get(listenerCtx).focus(() => {
            if (onFocus) {
              onFocus();
            }
          });
        }
      ].flat(),
    [onChangeDebounced]
  );

  return listenerPlugin;
};
