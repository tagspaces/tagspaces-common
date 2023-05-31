import { useNodeViewContext } from '@prosemirror-adapter/react';

export const TSLink = () => {
  const {
    contentRef,
    node: { attrs },
    setAttrs
  } = useNodeViewContext();

  const { href = '' } = attrs;

  // setAttrs({ title: 'testing-id'}); //, onClick: 'alert(\'' + href + '\')' });

  return (
    <>
      <span ref={contentRef} style={{ cursor: 'pointer', color: 'green' }} />
    </>
  );
};

/*const TSLink: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { node } = useNodeCtx();

    const href = node.attrs.href;
    // title={node.attrs.title}
    const isExternal = isExternalLink(href);

    const clickLink = (evt: any) => {
        evt.preventDefault();

        let path;
        if (!hasURLProtocol(href)) {
            // const workFolder = currentFolder || window.fileDirectory;
            // path =
            //   (isWeb ? '' : 'file://') +
            //   workFolder +
            //   '/' +
            //   encodeURIComponent(node.attrs.href);
            path = encodeURIComponent(href);
        } else {
            path = href;
        }

        window.parent.postMessage(
            JSON.stringify({
                command: 'openLinkExternally',
                link: path
            }),
            '*'
        );
    };
    return readOnly ? (
        <a href="#" title={href} onClick={clickLink}>
            {children}
            {isExternal && <>&nbsp;⧉</>}
        </a>
    ) : (
        <a href="#">{children}</a>
    );
};*/
