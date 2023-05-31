import {
  useWidgetViewContext,
  useNodeViewContext
} from '@prosemirror-adapter/react';

import { useGoogleSlidesHref } from './hooks/useGoogleSlidesHref';

export const GoogleSlidesWidget: React.FC = () => {
  const { spec } = useWidgetViewContext();

  const { href } = spec as { href: string };

  const iframeUrl = useGoogleSlidesHref({ href });

  if (!iframeUrl) {
    return null;
  }

  return (
    <a title="testTti" href={iframeUrl} onClick={() => alert(iframeUrl)}>
      tttt
    </a>
  );
};
