import { Box, CssBaseline, IconButton } from '@mui/material';
import { commandsCtx } from '@milkdown/core';
import { redoCommand, undoCommand } from '@milkdown/plugin-history';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import {
  insertImageCommand,
  toggleEmphasisCommand,
  toggleStrongCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand
} from '@milkdown/preset-commonmark';
import ChecklistIcon from '@mui/icons-material/Checklist';
import AddLinkIcon from '@mui/icons-material/AddLink';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import { toggleStrikethroughCommand } from '@milkdown/preset-gfm';
import FormatStrikethroughIcon from '@mui/icons-material/FormatStrikethrough';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import React, { useState } from 'react';
import { useInstance } from '@milkdown/react';
import LinkDialog from './components/dialogs/LinkDialog';

const ToolbarButtons: React.FC = () => {
  const [loading, editor] = useInstance();
  const [isLinkModalOpened, setLinkModalOpened] = useState<boolean>(false);

  return (
    <>
      <AppBar position="sticky">
        <Toolbar>
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
              editor()
                .ctx.get(commandsCtx)
                .call(toggleStrikethroughCommand.key);
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
          {/*<IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="check-list"
            sx={{ mr: 2 }}
            onClick={() => {
              editor().ctx.get(commandsCtx).call(insertTaskListCommand.key);
            }}
          >
            <ChecklistIcon />
          </IconButton>*/}
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={() => {
              setLinkModalOpened(true);
              /*editor().ctx.get(commandsCtx).call(insertImageCommand.key, {
                title: 'title',
                src: 'http://test',
                alt: 'test'
              });*/
            }}
          >
            <AddLinkIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <LinkDialog
        open={isLinkModalOpened}
        onClose={() => setLinkModalOpened(false)}
        /*onSubmit={payload => {
          editor().ctx.get(commandsCtx).call(insertImageCommand.key, payload);
        }}*/
        isEditMode={false}
      />
    </>
  );
};

export default ToolbarButtons;
