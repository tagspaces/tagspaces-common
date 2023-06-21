import { useNodeViewContext } from '@prosemirror-adapter/react';
import mermaid from 'mermaid';
import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDarkMode } from '../providers/DarkModeProvider';

export const Diagram: FC = () => {
  const { node, setAttrs, selected } = useNodeViewContext();
  const code = useMemo(() => node.attrs.value, [node.attrs.value]);
  const id = node.attrs.identity;
  const codePanel = useRef<HTMLDivElement>(null);
  const darkMode = useDarkMode();
  const rendering = useRef(false);

  const renderMermaid = useCallback(async () => {
    const container = codePanel.current;
    if (!container) return;

    if (code.length === 0) return;
    if (rendering.current) return;

    mermaid.initialize({
      startOnLoad: false,
      darkMode,
      theme: darkMode ? 'dark' : 'default'
    });
    rendering.current = true;
    const { svg, bindFunctions } = await mermaid.render(id, code);
    rendering.current = false;
    container.innerHTML = svg;
    bindFunctions?.(container);
  }, [code, darkMode, id]);

  useEffect(() => {
    requestAnimationFrame(() => {
      renderMermaid();
    });
  }, [renderMermaid]);

  return <div ref={codePanel} />;
};
