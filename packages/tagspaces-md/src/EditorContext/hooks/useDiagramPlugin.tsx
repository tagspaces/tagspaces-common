import {diagram, diagramSchema} from '@milkdown/plugin-diagram';
import {$view} from '@milkdown/utils';
import {useNodeViewFactory} from '@prosemirror-adapter/react';
import {useMemo} from 'react';

import {Plugin} from '../../types/plugins';
import {Diagram} from '../../components/Diagram';

export const useDiagramPlugin = (): Plugin => {
  const nodeViewFactory = useNodeViewFactory();

  return useMemo(() => {
      return [
          diagram,
          $view(diagramSchema.node, () =>
              nodeViewFactory({
                  component: Diagram,
                  stopEvent: () => true
              })
          )
      ].flat();
  }, [nodeViewFactory]);
};
