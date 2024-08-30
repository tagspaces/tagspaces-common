import { BlockProvider } from '@milkdown/plugin-block';
import { useInstance } from '@milkdown/react';
import { usePluginViewContext } from '@prosemirror-adapter/react';
import { useEffect, useRef } from 'react';
import { EditorStatus } from '@milkdown/core';
import { useTextEditorContext } from '../TextEditorContext/useTextEditoContext';

export const BlockView = () => {
  const ref = useRef<HTMLDivElement>(null);
  const tooltipProvider = useRef<BlockProvider>(undefined);

  const { textEditorMode } = useTextEditorContext();
  const { view } = usePluginViewContext();
  const [loading, getEditor] = useInstance();
  const editor = getEditor();

  useEffect(() => {
    const div = ref.current;
    if (!loading && div) {
      if (editor) {
        // && editor.status === EditorStatus.Created) {
        if (
          textEditorMode === 'active' &&
          tooltipProvider.current === undefined
        ) {
          tooltipProvider.current = new BlockProvider({
            ctx: editor.ctx,
            content: div
          });
          tooltipProvider.current?.update(); //view);
        } else {
          tooltipProvider.current?.destroy();
          tooltipProvider.current = undefined;
        }
      }
    }

    return () => {
      tooltipProvider.current?.destroy();
      tooltipProvider.current = undefined;
    };
  }, [textEditorMode, loading, editor, ref.current]); //

  /*useEffect(() => {
    tooltipProvider.current?.update(view);
  });*/

  return (
    <div className="hidden">
      <div
        ref={ref}
        style={{ width: '1.25rem', height: '1.25rem' }}
        className="relative cursor-grab rounded-full border-2 bg-gray-50 border border-solid border-gray-300 dark:border-gray-900 dark:bg-gray-900"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-5 w-5"
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
