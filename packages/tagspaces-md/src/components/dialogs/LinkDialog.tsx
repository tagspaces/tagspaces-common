import React, { useState } from 'react';
import { useInstance } from '@milkdown/react';
import { editorViewCtx } from '@milkdown/core';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
//import i18n from '-/services/i18n';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { useEditorLinkActions } from '../../hooks/useEditorLinkActions';

interface Props {
  open: boolean;
  isEditMode: boolean;
  onClose: (clearSelection?: boolean) => void;
  text: string;
  href: string;
}

function LinkDialog(props: Props) {
  const [, getEditor] = useInstance();
  const [title, setTitle] = useState(props.text);
  const [link, setLink] = useState(props.href);
  const { open, isEditMode } = props;
  const { getLinkCreationTransaction, getLinkUpdateTransaction } =
    useEditorLinkActions();

  const onClose = () => {
    props.onClose();
  };

  const onHandleSubmit = () => {
    const editor = getEditor();
    if (editor) {
      editor.action(ctx => {
        const view = ctx.get(editorViewCtx);
        if (isEditMode) {
          const updateTransaction = getLinkUpdateTransaction(view, {
            href: link,
            text: title
          });
          if (updateTransaction) {
            view.dispatch(updateTransaction);
          }
        } else {
          view.dispatch(
            getLinkCreationTransaction(view, {
              href: link,
              text: title
            })
          );
        }
        onClose();
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      keepMounted
      scroll="paper"
      PaperComponent={Paper}
      aria-labelledby="draggable-dialog-title"
    >
      <DialogTitle id="draggable-dialog-title">
        Link Dialog
        <IconButton
          title={'close'}
          aria-label="close"
          tabIndex={-1}
          style={{
            position: 'absolute',
            right: 5,
            top: 5
          }}
          onClick={onClose}
          size="large"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        style={{
          minHeight: 330,
          paddingTop: 10,
          // @ts-ignore
          overflowY: 'overlay',
          overflowX: 'hidden'
        }}
      >
        <TextField
          margin="dense"
          fullWidth={true}
          value={title}
          label="Title"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setTitle(event.target.value);
          }}
        />
        <TextField
          margin="dense"
          fullWidth={true}
          value={link}
          label="Link URL"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setLink(event.target.value);
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button data-tid="cancelLink" onClick={() => onClose()}>
          Cancel
        </Button>
        <Button
          data-tid="saveLink"
          onClick={() => {
            onHandleSubmit();
            onClose();
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LinkDialog;
