import { commandsCtx, EditorStatus, editorViewCtx } from '@milkdown/core';
import { imageSchema } from '@milkdown/preset-commonmark';
import { useNodeViewContext } from '@prosemirror-adapter/react';
import React, { useState } from 'react';
import { styled, StyledComponentProps } from '@mui/material/styles';

import { Image } from '../../../common/Image';
import { useIsNodeSelected } from '../../../hooks/useIsNodeSelected';
import { useMilkdownInstance } from '../../../hooks/useMilkdownInstance';
import { useToggler } from '../../../hooks/useToggler';
import { pxToRem } from '../../../styles/utils';
import { useTextEditorContext } from '../../../TextEditorContext/useTextEditoContext';
import ImageDialog from '../../dialogs/ImageDialog';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { IconButton } from '@mui/material';

export const ImageNode: React.FC = () => {
  const [imageProperties, setImageProperties] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });
  const { currentFolder, textEditorMode } = useTextEditorContext();
  const { isSelected } = useIsNodeSelected({ nodeType: imageSchema.type });

  const [isImageModalOpened, setImageModalOpened] = useState<boolean>(false);
  const { node, contentRef, setAttrs } = useNodeViewContext();
  const { attrs } = node;
  const { editor, loading } = useMilkdownInstance();
  const lightboxState = useToggler();

  const onImageRemove = () => {
    if (loading || !editor || editor.status !== EditorStatus.Created) {
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
      url &&
      (url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('file://') ||
        url.startsWith('data:') ||
        url.startsWith('ts://?ts') ||
        url.startsWith('ts:?ts'))
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
  return (
    <ImageNodeContainerStyled ref={contentRef} isSelected={isSelected}>
      {path && (
        <>
          <ImageStyled
            src={path}
            onClick={lightboxState.on}
            onLoad={onImageLoad}
            {...{ alt, title }}
          >
            {isLoading => (
              <>
                {textEditorMode === 'active' && !isLoading && (
                  <div style={{ maxHeight: 40 }}>
                    <IconButton
                      size="small"
                      edge="start"
                      color="default"
                      onClick={() => setImageModalOpened(true)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      edge="start"
                      color="default"
                      onClick={() => onImageRemove()}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </div>
                  /*<ImageEditorModal
                    imageHeight={imageProperties.height}
                    imageWidth={imageProperties.width}
                    {...{ onImageRemove, onImageEdit, alt, title }}
                  />*/
                )}
              </>
            )}
          </ImageStyled>
          <ImageDialog
            open={isImageModalOpened}
            onClose={() => setImageModalOpened(false)}
            href={path}
            text={title}
            isEditMode={true}
          />
          {/*<Lightbox
            src={path}
            onOpen={lightboxState.on}
            isOpen={lightboxState.state}
            onClose={lightboxState.off}
          />*/}
        </>
      )}
    </ImageNodeContainerStyled>
  );
};
interface ImageNodeContainerStyledProps extends StyledComponentProps {
  isSelected?: boolean;
}
const ImageNodeContainerStyled = styled('div')<ImageNodeContainerStyledProps>(
  ({ theme, isSelected }) => ({
    position: 'relative',
    display: 'inline-flex',
    marginBottom: pxToRem(16),
    // outlineOffset: pxToRem(2),
    // outline: pxToRem(2) + ' solid',
    transition: 'outline-color 0.2s ease-in',
    backgroundColor: isSelected ? theme.palette.primary.light : 'transparent'
  })
);

const ImageStyled = styled(Image)`
  cursor: pointer;
  transition: opacity 0.1s ease-in;

  &:hover {
    opacity: 0.9;
  }
`;
