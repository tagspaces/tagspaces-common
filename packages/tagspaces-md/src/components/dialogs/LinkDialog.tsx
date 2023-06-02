import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
//import i18n from '-/services/i18n';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

interface Props {
  open: boolean;
  onClose: (clearSelection?: boolean) => void;
  text: string;
  href: string;
}

function LinkDialog(props: Props) {
  const onClose = () => {
    props.onClose();
  };

  const { open } = props;
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

      </DialogContent>
      <DialogActions>
        <Button data-tid="cancelTagsMultipleEntries" onClick={() => onClose()}>
          Cancel
          {/*{i18n.t('core:cancel')}*/}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LinkDialog;
