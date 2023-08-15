import React, { useState } from 'react';
import { commandsCtx, editorViewCtx } from '@milkdown/core';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { useMilkdownInstance } from '../../hooks/useMilkdownInstance';
import {
  insertImageCommand,
  updateImageCommand
} from '@milkdown/preset-commonmark';

interface Props {
  open: boolean;
  isEditMode: boolean;
  onClose: (clearSelection?: boolean) => void;
  text?: string;
  href?: string;
  onSubmit?: (payload: any) => void;
}

function ImageDialog(props: Props) {
  const { editor, loading } = useMilkdownInstance();
  const [title, setTitle] = useState(getTitle());
  const [link, setLink] = useState(props.href);
  const { open, isEditMode } = props;

  function getTitle() {
    if (props.text) {
      return props.text;
    }
    // get FromSelection
    if (editor) {
      const { ctx } = editor;
      if (ctx) {
        try {
          const view = ctx.get(editorViewCtx);
          const { state } = view;
          const { doc, selection } = state;
          const { from, to } = selection;
          return doc.textBetween(from, to);
        } catch (e) {
          console.debug('getTitleFromSelection', e);
        }
      }
    }
    return '';
  }

  const onClose = () => {
    props.onClose();
  };

  const onHandleSubmit = () => {
    if (editor) {
      if (isEditMode) {
        editor.ctx.get(commandsCtx).call(updateImageCommand.key, {
          title: title,
          src: link,
          alt: title
        });
      } else {
        editor.ctx.get(commandsCtx).call(insertImageCommand.key, {
          title: title,
          src: link,
          alt: title
        });
      }
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
        Image Dialog
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
          label="Image URL"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setLink(event.target.value);
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button data-tid="cancelImageTID" onClick={() => onClose()}>
          Cancel
        </Button>
        <Button
          data-tid="saveImageTID"
          onClick={() => {
            if (props.onSubmit) {
              props.onSubmit({
                // title: title,
                src: link,
                title: title
              });
            } else {
              onHandleSubmit();
            }
            onClose();
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ImageDialog;
