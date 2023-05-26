import { IconButton } from '@mui/material';
import { commandsCtx } from '@milkdown/core';
import { redoCommand, undoCommand } from '@milkdown/plugin-history';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import {
  toggleEmphasisCommand,
  toggleStrongCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand
} from '@milkdown/preset-commonmark';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import { toggleStrikethroughCommand } from '@milkdown/preset-gfm';
import FormatStrikethroughIcon from '@mui/icons-material/FormatStrikethrough';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import React from 'react';
import { useInstance } from '@milkdown/react';

const ToolbarButtons: React.FC = () => {
  const [loading, editor] = useInstance();

  return (
    <>
      <IconButton
        size="large"
        edge="start"
        color="inherit"
        aria-label="menu"
        sx={{ mr: 2 }}
        onClick={() => {
          editor().ctx.get(commandsCtx).call(undoCommand.key);
        }}
      >
        <UndoIcon />
      </IconButton>
      <IconButton
        size="large"
        edge="start"
        color="inherit"
        aria-label="menu"
        sx={{ mr: 2 }}
        onClick={() => {
          editor().ctx.get(commandsCtx).call(redoCommand.key);
        }}
      >
        <RedoIcon />
      </IconButton>
      <IconButton
        size="large"
        edge="start"
        color="inherit"
        aria-label="menu"
        sx={{ mr: 2 }}
        onClick={() => {
          editor().ctx.get(commandsCtx).call(toggleStrongCommand.key);
        }}
      >
        <FormatBoldIcon />
      </IconButton>
      <IconButton
        size="large"
        edge="start"
        color="inherit"
        aria-label="menu"
        sx={{ mr: 2 }}
        onClick={() => {
          editor().ctx.get(commandsCtx).call(toggleEmphasisCommand.key);
        }}
      >
        <FormatItalicIcon />
      </IconButton>
      <IconButton
        size="large"
        edge="start"
        color="inherit"
        aria-label="menu"
        sx={{ mr: 2 }}
        onClick={() => {
          editor().ctx.get(commandsCtx).call(toggleStrikethroughCommand.key);
        }}
      >
        <FormatStrikethroughIcon />
      </IconButton>
      <IconButton
        size="large"
        edge="start"
        color="inherit"
        aria-label="menu"
        sx={{ mr: 2 }}
        onClick={() => {
          editor().ctx.get(commandsCtx).call(wrapInBulletListCommand.key);
        }}
      >
        <FormatListBulletedIcon />
      </IconButton>
      <IconButton
        size="large"
        edge="start"
        color="inherit"
        aria-label="menu"
        sx={{ mr: 2 }}
        onClick={() => {
          editor().ctx.get(commandsCtx).call(wrapInOrderedListCommand.key);
        }}
      >
        <FormatListNumberedIcon />
      </IconButton>
      <IconButton
        size="large"
        edge="start"
        color="inherit"
        aria-label="menu"
        sx={{ mr: 2 }}
        onClick={() => {
          editor().ctx.get(commandsCtx).call(wrapInBlockquoteCommand.key);
        }}
      >
        <FormatQuoteIcon />
      </IconButton>
    </>
  );
};

export default ToolbarButtons;
