import { useWidgetViewContext } from '@prosemirror-adapter/react';
import React from 'react';

export const HeadingAnchor = () => {
 /* const { spec = {} } = useWidgetViewContext();
  const { level = 0, id = '' } = spec;
  const hashes = Array(level).fill('#').join('');*/

  return (
    <a
      href={`#`}
      onClick={() => alert('test')}
      className="text-sky-500 mr-2 no-underline"
    >
      test
    </a>
  );
};
