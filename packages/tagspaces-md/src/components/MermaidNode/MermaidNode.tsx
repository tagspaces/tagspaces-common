import { useRef } from 'react';
import { useMermaid } from './hooks/useMermaid';

export const MermaidNode: React.FC = () => {
  const codePanelRef = useRef<HTMLDivElement>(null);

  useMermaid({ codePanelRef });

  return <div ref={codePanelRef} />;
};
