import React, { useRef, useState } from 'react';
import { commandsCtx, EditorStatus, editorViewCtx } from '@milkdown/core';
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
import { useTextEditorContext } from '../../TextEditorContext/useTextEditoContext';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { onFileUpload, onFileValidation } = useTextEditorContext();

  function getTitle() {
    if (props.text) {
      return props.text;
    }
    // get FromSelection
    if (editor && !loading && editor.status === EditorStatus.Created) {
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

  function handleFileInputChange(selection: any) {
    const target = selection.currentTarget;
    const file = target.files[0];
    onFileUpload(file).then(base64src =>
      editor.ctx.get(commandsCtx).call(insertImageCommand.key, {
        title: file.name,
        src: base64src,
        alt: file.name
      })
    );
    onClose();
    target.value = null;
  }

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
        <Button
          data-tid="browseTID"
          onClick={() => {
            fileInputRef.current.click();
          }}
          size="small"
          color="primary"
        >
          Or Browse...
        </Button>
        <input
          style={{ display: 'none' }}
          ref={fileInputRef}
          accept="image/*"
          type="file"
          onChange={handleFileInputChange}
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
