import { useMemo } from 'react';

type UseGoogleSlidesHrefProps = {
  href?: string;
};

export const useGoogleSlidesHref = ({ href }: UseGoogleSlidesHrefProps) => {
  const iframeUrl = useMemo(() => {
    if (!href) {
      return null;
    }
    return `window.parent.postMessage(
        JSON.stringify({
          command: 'openLinkExternally',
          link: ${href}
        }),
        '*'
    )`
  }, [href]);

  return iframeUrl;
};
