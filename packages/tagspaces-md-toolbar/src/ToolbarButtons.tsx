import React from 'react';
import { IconButton, styled } from '@mui/material';
import { commandsCtx, editorViewCtx } from '@milkdown/core';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import {
  createCodeBlockCommand,
  listItemSchema,
  toggleEmphasisCommand,
  toggleStrongCommand,
  turnIntoTextCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  linkSchema
} from '@milkdown/preset-commonmark';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import ChecklistIcon from '@mui/icons-material/Checklist';
import AddLinkIcon from '@mui/icons-material/AddLink';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import { toggleStrikethroughCommand, createTable } from '@milkdown/preset-gfm';
import TableChartIcon from '@mui/icons-material/TableChart';
import FormatStrikethroughIcon from '@mui/icons-material/FormatStrikethrough';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import { useMilkdownInstance } from './hooks/useMilkdownInstance';
import { findWrapping } from '@milkdown/prose/transform';
import CodeIcon from '@mui/icons-material/Code';
import { redo, undo } from '@milkdown/prose/history';
import FormatClearIcon from '@mui/icons-material/FormatClear';
import type {
  Command,
  Transaction,
  TextSelection
} from '@milkdown/prose/state';
import type { Attrs, NodeType } from '@milkdown/prose/model';
import { imageBlockSchema } from '@milkdown/kit/component/image-block';
import { linkTooltipAPI } from '@milkdown/kit/component/link-tooltip';

const ToolbarButtons: React.FC = () => {
  const { editor } = useMilkdownInstance();
  const mode = 'description';
  const StyledToolbar = styled(Toolbar)(({ theme }) => ({
    minHeight: `30px`,
    //height: `30px`,
    overflowX: 'auto', // Enable horizontal scrolling
    whiteSpace: 'nowrap', // Prevent line breaks in the toolbar
    //justifyContent: 'center',
    //alignItems: 'center',
    backgroundColor: theme.palette.background.default
  }));

  function clearRange(tr: Transaction) {
    const { $from, $to } = tr.selection;
    const { pos: from } = $from;
    const { pos: to } = $to;
    tr = tr.deleteRange(from - $from.node().content.size, to);
    return tr;
  }

  function wrapInBlockType(
    tr: Transaction,
    nodeType: NodeType,
    attrs: Attrs | null = null
  ) {
    const { $from, $to } = tr.selection;

    const range = $from.blockRange($to);
    const wrapping = range && findWrapping(range, nodeType, attrs);
    if (!wrapping) return null;

    return tr.wrap(range, wrapping);
  }

  function addBlockType(
    tr: Transaction,
    nodeType: NodeType,
    attrs: Attrs | null = null
  ) {
    const node = nodeType.createAndFill(attrs);
    if (!node) return null;

    return tr.replaceSelectionWith(node);
  }

  function clearContentAndWrapInBlockType(
    nodeType: NodeType,
    attrs: Attrs | null = null
  ): Command {
    return (state, dispatch) => {
      const tr = wrapInBlockType(clearRange(state.tr), nodeType, attrs);
      if (!tr) return false;

      if (dispatch) dispatch(tr.scrollIntoView());

      return true;
    };
  }

  function clearContentAndAddBlockType(
    nodeType: NodeType,
    attrs: Attrs | null = null
  ): Command {
    return (state, dispatch) => {
      const tr = addBlockType(clearRange(state.tr), nodeType, attrs);
      if (!tr) return false;

      if (dispatch) dispatch(tr.scrollIntoView());

      return true;
    };
  }

  return (
    <>
      <AppBar position={mode === 'description' ? 'sticky' : 'fixed'}>
        <StyledToolbar variant="dense">
          <IconButton
            size="small"
            edge="start"
            color="default"
            aria-label="menu"
            sx={{ mr: 2 }}
            onMouseDown={e => {
              if (editor) {
                const view = editor.ctx.get(editorViewCtx);
                undo(view.state, view.dispatch);
              }
              //editor?.ctx.get(commandsCtx).call(undoCommand.key);
              e.preventDefault();
            }}
          >
            <UndoIcon />
          </IconButton>
          <IconButton
            size="small"
            edge="start"
            color="default"
            aria-label="menu"
            sx={{ mr: 2 }}
            onMouseDown={e => {
              if (editor) {
                const view = editor.ctx.get(editorViewCtx);
                redo(view.state, view.dispatch);
              }
              //editor?.ctx.get(commandsCtx).call(redoCommand.key);
              e.preventDefault();
            }}
          >
            <RedoIcon />
          </IconButton>
          <IconButton
            size="small"
            edge="start"
            color="default"
            aria-label="menu"
            sx={{ mr: 2 }}
            onMouseDown={e => {
              editor?.ctx.get(commandsCtx).call(toggleStrongCommand.key);
              e.preventDefault();
            }}
          >
            <FormatBoldIcon />
          </IconButton>
          <IconButton
            size="small"
            edge="start"
            color="default"
            aria-label="menu"
            sx={{ mr: 2 }}
            onMouseDown={e => {
              editor?.ctx.get(commandsCtx).call(toggleEmphasisCommand.key);
              e.preventDefault();
            }}
          >
            <FormatItalicIcon />
          </IconButton>
          <IconButton
            size="small"
            edge="start"
            color="default"
            aria-label="menu"
            sx={{ mr: 2 }}
            onMouseDown={e => {
              editor?.ctx.get(commandsCtx).call(toggleStrikethroughCommand.key);
              e.preventDefault();
            }}
          >
            <FormatStrikethroughIcon />
          </IconButton>
          <IconButton
            size="small"
            edge="start"
            color="default"
            aria-label="menu"
            sx={{ mr: 2 }}
            onMouseDown={e => {
              editor?.ctx.get(commandsCtx).call(wrapInBulletListCommand.key);
              e.preventDefault();
            }}
          >
            <FormatListBulletedIcon />
          </IconButton>
          <IconButton
            size="small"
            edge="start"
            color="default"
            aria-label="menu"
            sx={{ mr: 2 }}
            onMouseDown={e => {
              editor?.ctx.get(commandsCtx).call(wrapInOrderedListCommand.key);
              e.preventDefault();
            }}
          >
            <FormatListNumberedIcon />
          </IconButton>
          <IconButton
            size="small"
            edge="start"
            color="default"
            aria-label="menu"
            sx={{ mr: 2 }}
            onMouseDown={e => {
              editor?.ctx.get(commandsCtx).call(wrapInBlockquoteCommand.key);
              e.preventDefault();
            }}
          >
            <FormatQuoteIcon />
          </IconButton>
          <IconButton
            size="small"
            edge="start"
            color="default"
            aria-label="menu"
            sx={{ mr: 2 }}
            onMouseDown={e => {
              if (editor) {
                const view = editor.ctx.get(editorViewCtx);
                const { dispatch, state } = view;
                let { tr } = state;
                tr = clearRange(tr);
                const from = tr.selection.from;
                const table = createTable(editor.ctx, 3, 3);
                tr = tr.replaceSelectionWith(table);
                dispatch(tr);

                requestAnimationFrame(() => {
                  const docSize = view.state.doc.content.size;
                  const $pos = view.state.doc.resolve(
                    from > docSize ? docSize : from < 0 ? 0 : from
                  );
                  const selection = TextSelection.near($pos);
                  const tr = view.state.tr;
                  tr.setSelection(selection);
                  dispatch(tr.scrollIntoView());
                });
              }
              //editor?.ctx.get(commandsCtx).call(insertTableCommand.key);
              e.preventDefault();
            }}
          >
            <TableChartIcon />
          </IconButton>
          <IconButton
            size="small"
            edge="start"
            color="default"
            aria-label="menu"
            sx={{ mr: 2 }}
            onMouseDown={e => {
              editor?.ctx.get(commandsCtx).call(turnIntoTextCommand.key);
              e.preventDefault();
            }}
          >
            {' '}
            <FormatClearIcon />
          </IconButton>
          <IconButton
            size="small"
            edge="start"
            color="default"
            aria-label="menu"
            sx={{ mr: 2 }}
            onMouseDown={e => {
              editor?.ctx.get(commandsCtx).call(createCodeBlockCommand.key);
              e.preventDefault();
            }}
          >
            {' '}
            <CodeIcon />
          </IconButton>
          <IconButton
            size="small"
            edge="start"
            color="default"
            aria-label="menu"
            sx={{ mr: 2 }}
            onMouseDown={e => {
              if (editor) {
                const isActive = (mark: MarkType) => {
                  if (!editor.ctx || !selection) return false;
                  const view = editor.ctx.get(editorViewCtx);
                  const {
                    state: { doc }
                  } = view;
                  return doc.rangeHasMark(selection.from, selection.to, mark);
                };

                const view = editor.ctx.get(editorViewCtx);
                const { selection } = view.state;

                if (isActive(linkSchema.type(editor.ctx))) {
                  editor.ctx
                    .get(linkTooltipAPI.key)
                    .removeLink(selection.from, selection.to);
                  return;
                }

                editor.ctx
                  .get(linkTooltipAPI.key)
                  .addLink(selection.from, selection.to);
              }
              e.preventDefault();
            }}
          >
            <AddLinkIcon />
          </IconButton>
          <IconButton
            size="small"
            edge="start"
            color="default"
            aria-label="menu"
            sx={{ mr: 2 }}
            onMouseDown={e => {
              if (editor) {
                const view = editor.ctx.get(editorViewCtx);
                const { dispatch, state } = view;

                const command = clearContentAndAddBlockType(
                  imageBlockSchema.type(editor.ctx)
                );
                command(state, dispatch);
              }
              e.preventDefault();
            }}
          >
            <AddPhotoAlternateIcon />
          </IconButton>
          <IconButton
            size="small"
            edge="start"
            color="default"
            aria-label="menu"
            onMouseDown={e => {
              if (editor) {
                const view = editor.ctx.get(editorViewCtx);
                const { dispatch, state } = view;

                const command = clearContentAndWrapInBlockType(
                  listItemSchema.type(editor.ctx),
                  { checked: false }
                );
                command(state, dispatch);
              }
              //editor?.ctx.get(commandsCtx).call(insertTaskListCommand.key);
              e.preventDefault();
            }}
          >
            <ChecklistIcon />
          </IconButton>
        </StyledToolbar>
      </AppBar>
      {mode !== 'description' && <div style={{ paddingTop: 34 }} />}
    </>
  );
};

export default ToolbarButtons;
