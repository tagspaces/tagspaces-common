import React, { useState } from 'react';
import { useMilkdownInstance } from '../../hooks/useMilkdownInstance';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import SearchIcon from '@mui/icons-material/Search';
//import i18n from '-/services/i18n';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import { Button, InputAdornment } from '@mui/material';
import { TextSelection } from '@milkdown/prose/state';
import { EditorView } from '@milkdown/prose/view';
import { EditorStatus, editorViewCtx } from '@milkdown/core';
import Paper, { PaperProps } from '@mui/material/Paper';
//import Draggable from 'react-draggable';

interface Props {
  open: boolean;
  onClose: () => void;
  openDialog: (txt?: string) => void;
  searchTxt?: string;
}

function SearchDialog(props: Props) {
  const { editor, loading } = useMilkdownInstance();

  const { open, onClose, openDialog, searchTxt } = props;
  const [searchText, setSearch] = useState(searchTxt || '');
  const [replaceMode, setReplaceMode] = useState(false);
  const [replaceText, setReplaceText] = useState('');
  //   const searchRef = useRef<HTMLInputElement>(null);

  /*  const onClose = () => {
    props.onClose();
  };*/

  function searchAndSelect(view: EditorView, searchText: string) {
    const { state } = view;
    const { selection } = state;
    let { from, to } = selection;

    // Search from the current selection to the end
    if (searchFromSelection(view, searchText, from, to)) {
      return;
    }

    // If not found, searchText from the start of the document
    if (searchFromStart(view, searchText)) {
      return;
    }

    alert('Text not found.');
  }

  function searchFromSelection(
    view: EditorView,
    searchText: string,
    from: number,
    to: number
  ): boolean {
    const { state, dispatch } = view;
    const { doc } = state;
    let tr = state.tr;
    let found = false;

    doc.descendants((node, pos) => {
      if (found || !node.isText) return;

      if (pos >= from) {
        const text = node.text!;
        const index = text.indexOf(searchText, pos === from ? to - pos : 0);

        if (index !== -1) {
          const start = pos + index;
          const end = start + searchText.length;

          // Select the found text
          tr = tr.setSelection(TextSelection.create(doc, start, end));
          tr = tr.scrollIntoView();
          view.focus();

          found = true;
        }
      }
    });

    if (found) {
      dispatch(tr);
    }

    return found;
  }

  function searchFromStart(view: EditorView, searchText: string) {
    const { state, dispatch } = view;
    const { doc } = state;
    let tr = state.tr;
    let found = false;

    doc.descendants((node, pos) => {
      if (found || !node.isText) return;

      const text = node.text!;
      const index = text.indexOf(searchText);

      if (index !== -1) {
        const start = pos + index;
        const end = start + searchText.length;

        // Select the found text
        tr = tr.setSelection(TextSelection.create(doc, start, end));
        tr = tr.scrollIntoView();
        view.focus();

        found = true;
      }
    });

    if (found) {
      dispatch(tr);
    }

    return found;
  }

  function searchAndReplace(
    view: EditorView,
    searchText: string,
    replaceText: string
  ) {
    const { state, dispatch } = view;
    let { tr } = state;

    // Track total offset caused by replacements
    let accumulatedOffset = 0;

    state.doc.descendants((node, pos) => {
      if (node.isText) {
        const text = node.text!;
        let startIndex = 0;

        while ((startIndex = text.indexOf(searchText, startIndex)) !== -1) {
          const from = pos + startIndex + accumulatedOffset;
          const to = from + searchText.length;

          tr = tr.replaceWith(from, to, state.schema.text(replaceText));
          // Update offset for subsequent replacements
          accumulatedOffset += replaceText.length - searchText.length;
          startIndex += searchText.length;
        }
      }
    });

    if (tr.docChanged) {
      dispatch(tr);
    }

    // Restore the selection
    const selection = TextSelection.create(tr.doc, tr.selection.from);
    tr = tr.setSelection(selection);
    view.focus();
  }

  /*function DraggablePaper(props: PaperProps) {
        return (
            <Draggable
                handle="#draggable-dialog-title"
                cancel={'[class*="MuiDialogContent-root"]'}
            >
                <Paper {...props} />
            </Draggable>
        );
    }*/
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperComponent={Paper}
      BackdropProps={{ style: { backgroundColor: 'transparent' } }}
      keepMounted
      scroll="paper"
      aria-labelledby="draggable-dialog-title"
    >
      <DialogTitle id="draggable-dialog-title">
        {replaceMode ? 'Search and replace' : 'Search'}
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
          // @ts-ignore
          overflowY: 'overlay',
          overflowX: 'hidden'
        }}
      >
        <Paper
          component="form"
          sx={{
            p: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            width: 400
          }}
        >
          <IconButton
            sx={{ p: '10px' }}
            aria-label="menu"
            onClick={() => setReplaceMode(!replaceMode)}
          >
            <MenuIcon />
          </IconButton>
          <TextField
            sx={{ ml: 1, flex: 1 }}
            margin="dense"
            fullWidth={true}
            value={searchText}
            label="Search"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setSearch(event.target.value);
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="start searching"
                    onClick={() => {
                      if (
                        editor &&
                        !loading &&
                        editor.status === EditorStatus.Created
                      ) {
                        const { ctx } = editor;
                        if (ctx) {
                          try {
                            onClose();
                            const view = ctx.get(editorViewCtx);
                            searchAndSelect(view, searchText);
                            openDialog(searchText);
                          } catch (e) {
                            console.debug('searchAndSelect', e);
                          }
                        }
                      }
                    }}
                    size="large"
                  >
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Paper>
        {replaceMode && (
          <TextField
            sx={{ flex: 1 }}
            margin="dense"
            fullWidth={true}
            value={replaceText}
            label="Replace"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setReplaceText(event.target.value);
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    data-tid="replaceAllTID"
                    onClick={() => {
                      if (
                        editor &&
                        !loading &&
                        editor.status === EditorStatus.Created
                      ) {
                        const { ctx } = editor;
                        if (ctx) {
                          try {
                            const view = ctx.get(editorViewCtx);
                            searchAndReplace(view, searchText, replaceText);
                          } catch (e) {
                            console.debug('searchAndSelect', e);
                          }
                        }
                      }
                    }}
                  >
                    Replace All
                  </Button>
                </InputAdornment>
              )
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default SearchDialog;
