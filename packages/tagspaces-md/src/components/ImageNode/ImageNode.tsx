import { editorViewCtx } from '@milkdown/core';
import { useInstance } from '@milkdown/react';
import { useNodeViewContext } from '@prosemirror-adapter/react';
import { useState } from 'react';
import { useTextEditorContext } from '../../TextEditorContext/useTextEditoContext';

/**
 * @deprecated use DocumentNode instead
 */
export const ImageNode: React.FC = () => {
  const [imageProperties, setImageProperties] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });
  const { currentFolder } = useTextEditorContext();
  //const { isSelected } = useIsNodeSelected({ nodeType: imageSchema.type() });

  const { node, contentRef, setAttrs } = useNodeViewContext();
  const { attrs } = node;
  const [loading, getEditor] = useInstance();

  /*const onImageEdit = ({ alt, title }: ImageEditorFormValues) => {
    setAttrs({ alt, title });
  };*/

  const onImageRemove = () => {
    const editor = getEditor();
    if (loading || !editor) {
      return;
    }

    editor.action(ctx => {
      const view = ctx.get(editorViewCtx);
      const { state } = view;

      view.dispatch(state.tr.deleteSelection());
    });
  };

  const onImageLoad = ({
    currentTarget
  }: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalHeight, naturalWidth } = currentTarget;
    setImageProperties({ width: naturalWidth, height: naturalHeight });
  };

  const alt = attrs.alt || '';
  const title = attrs.title || '';

  function hasURLProtocol(url: any) {
    return (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('file://') ||
      url.startsWith('data:') ||
      url.startsWith('ts://?ts') ||
      url.startsWith('ts:?ts')
    );
  }

  let path;
  if (!hasURLProtocol(attrs.src)) {
    // @ts-ignore
    const workFolder = currentFolder || window.fileDirectory;
    // @ts-ignore
    const isWeb = window.isWeb;
    path =
      (isWeb ? '' : 'file://') +
      (workFolder ? workFolder + '/' : '') +
      attrs.src;
  } else {
    path = attrs.src;
  }

  // return <img src={path} alt={node.attrs.alt} title={node.attrs.title} />*/

  return (
    <div ref={contentRef}>
      {path && <img src={path} onLoad={onImageLoad} alt={alt} title={title} />}
    </div>
  );
};

/*const ImageNodeContainerStyled = styled.div<{ $isSelected: boolean }>`
  position: relative;
  display: inline-flex;
  outline-offset: ${pxToRem(2)};
  outline: ${pxToRem(2)} solid
    ${props =>
      props.$isSelected ? props.theme.colors.lightBlack : 'transparent'};
  transition: outline-color 0.2s ease-in;
`;*/
