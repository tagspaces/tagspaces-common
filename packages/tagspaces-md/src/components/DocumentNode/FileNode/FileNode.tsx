import { EditorStatus, editorViewCtx } from '@milkdown/core';
import { styled } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNodeViewContext } from '@prosemirror-adapter/react';
import DownloadIcon from '@mui/icons-material/Download';

import { FileNodeContent } from './FileNodeContent';
import { useFileName } from './hooks/useFileName';
import { useMilkdownInstance } from '../../../hooks/useMilkdownInstance';
import { pxToRem } from '../../../styles/utils';
import { Matcher } from '../../../utils/Matcher';
import { useTextEditorContext } from '../../../TextEditorContext/useTextEditoContext';
import { IconButton } from '@mui/material';

export const FileNode: React.FC = () => {
  // const { colors } = useTheme();
  const { node } = useNodeViewContext();
  const { editor, loading } = useMilkdownInstance();

  const { textEditorMode } = useTextEditorContext();

  const { attrs } = node;

  const { src } = attrs;

  const { name } = useFileName({ src: src });

  const onFileRemove = () => {
    if (loading || !editor || editor.status !== EditorStatus.Created) {
      return;
    }

    editor.action(ctx => {
      const view = ctx.get(editorViewCtx);
      const { state } = view;

      view.dispatch(state.tr.deleteSelection());
    });
  };

  return (
    <>
      {Matcher(textEditorMode)
        .match('active', () => (
          <ActiveContainerStyled>
            <FileNodeContent {...{ name }}>
              <IconButton
                title={'delete'}
                aria-label="delete"
                onClick={onFileRemove}
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            </FileNodeContent>
          </ActiveContainerStyled>
        ))
        .match('preview', () => (
          <PreviewContainerStyled href={src} download={name} target="_blank">
            <FileNodeContent {...{ name }}>
              <IconButton title={'download'} aria-label="download" size="small">
                <DownloadIcon />
              </IconButton>
              {/*<Button oval color="secondary" variant="text" space="small">
                <Icon icon="download" />
              </Button>*/}
            </FileNodeContent>
          </PreviewContainerStyled>
        ))
        .get()}
    </>
  );
};
const containerStyles = `
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${pxToRem(16)};
  padding: ${pxToRem(12)} ${pxToRem(16)};
  gap: ${pxToRem(16)};
  border: 1px solid #D6D6D6;
  border-radius: ${pxToRem(6)};
  transition: 0.1s ease-in;
  cursor: pointer;
`;

const ActiveContainerStyled = styled('div')`
  ${containerStyles}
`;

const PreviewContainerStyled = styled('a')`
  ${containerStyles}
`;
