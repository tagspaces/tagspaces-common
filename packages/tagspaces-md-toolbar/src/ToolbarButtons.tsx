import React from 'react';
import { IconButton, styled } from '@mui/material';
import { commandsCtx } from '@milkdown/core';
import { redoCommand, undoCommand } from '@milkdown/plugin-history';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import {
  createCodeBlockCommand,
  toggleEmphasisCommand,
  toggleStrongCommand,
  turnIntoTextCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand
} from '@milkdown/preset-commonmark';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import ChecklistIcon from '@mui/icons-material/Checklist';
import AddLinkIcon from '@mui/icons-material/AddLink';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import {
  insertTableCommand,
  toggleStrikethroughCommand
} from '@milkdown/preset-gfm';
import TableChartIcon from '@mui/icons-material/TableChart';
import FormatStrikethroughIcon from '@mui/icons-material/FormatStrikethrough';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import { useMilkdownInstance } from './hooks/useMilkdownInstance';
import { insertTaskListCommand } from './hooks/useGfmPlugin';
import CodeIcon from '@mui/icons-material/Code';
import FormatClearIcon from '@mui/icons-material/FormatClear';

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
              editor?.ctx.get(commandsCtx).call(undoCommand.key);
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
              editor?.ctx.get(commandsCtx).call(redoCommand.key);
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
              editor?.ctx.get(commandsCtx).call(insertTableCommand.key);
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
              //setLinkModalOpened(true);
              //todo
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
              //setImageModalOpened(true);
              //todo
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
              editor?.ctx.get(commandsCtx).call(insertTaskListCommand.key);
              /*editor.action(ctx => {
                ctx.get(commandsCtx).call(insertTaskListCommand.key);
              });*/
              //editor.action(callCommand(insertTaskListCommand.key));
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
