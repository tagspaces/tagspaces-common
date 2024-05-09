import { BlockProvider } from '@milkdown/plugin-block';
import { useInstance } from '@milkdown/react';
import { usePluginViewContext } from '@prosemirror-adapter/react';
import { useEffect, useRef } from 'react';
import { EditorStatus } from '@milkdown/core';
import { useTextEditorContext } from '../TextEditorContext/useTextEditoContext';

export const BlockView = () => {
  const ref = useRef<HTMLDivElement>(null);
  const tooltipProvider = useRef<BlockProvider>();

  const { mode } = useTextEditorContext();
  const { view } = usePluginViewContext();
  const [loading, getEditor] = useInstance();

  useEffect(() => {
    const div = ref.current;
    if (!loading && div) {
      const editor = getEditor();
      if (editor && editor.status === EditorStatus.Created) {
        if (mode === 'active') {
          tooltipProvider.current = new BlockProvider({
            ctx: editor.ctx,
            content: div
          });
        } else {
          tooltipProvider?.current?.destroy();
        }
      }
    }

    return () => {
      tooltipProvider?.current?.destroy();
    };
  }, [mode, loading, getEditor, ref]);

  useEffect(() => {
    tooltipProvider.current?.update(view);
  });

  return (
    <div className="hidden">
      <div
        ref={ref}
        className="w-6 bg-slate-200 rounded hover:bg-slate-300 cursor-grab"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
          />
        </svg>
      </div>
    </div>
  );
};
