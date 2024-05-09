import { CmdKey, EditorStatus, editorViewCtx } from '@milkdown/core';
import { insertDiagramCommand } from '@milkdown/plugin-diagram';
import CodeIcon from '@mui/icons-material/Code';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import SchemaIcon from '@mui/icons-material/Schema';
import FormatClearIcon from '@mui/icons-material/FormatClear';
import { useInstance } from '@milkdown/react';
import { useRef } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { useCallEditorCommand } from '../../hooks/useCallEditorCommand';
import { useSlashProvider } from './hooks/useSlashProvider';
import { insertTableCommand } from '@milkdown/preset-gfm';
import {
  createCodeBlockCommand,
  insertHrCommand,
  turnIntoTextCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand
} from '@milkdown/preset-commonmark';
import { insertMathCommand } from '../../EditorContext/hooks/useMathPlugin';

export const Slash = () => {
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [loading, getEditor] = useInstance();
  const { onCallCommand } = useCallEditorCommand();

  const { keyboardListRefs, activeItemIndex } = useSlashProvider({
    tooltipRef
  });

  const onRemoveSlash = () => {
    const editor = getEditor();
    if (loading || !editor || editor.status !== EditorStatus.Created) {
      return;
    }

    editor.action(ctx => {
      const view = ctx.get(editorViewCtx);
      const { state } = view;
      const { selection } = state;

      view.dispatch(state.tr.delete(selection.from - 1, selection.from));
    });
  };

  const onCommandClick = <T,>(command: CmdKey<T>, payload?: T | undefined) => {
    onRemoveSlash();
    onCallCommand(command, payload);
  };

  return (
    <div style={{ display: 'none' }}>
      <div
        role="tooltip"
        ref={tooltipRef}
        className="bg-gray-50 dark:bg-gray-900"
      >
        <Box sx={{ width: '100%', maxWidth: 360 }}>
          {/* bgcolor: 'background.paper'*/}
          <List component="nav" aria-label="main mailbox folders">
            <ListItemButton
              selected={activeItemIndex === 0}
              onMouseDown={e => {
                onCommandClick(wrapInHeadingCommand.key, 1);
                e.preventDefault();
              }}
            >
              <ListItemIcon>H1</ListItemIcon>
              <ListItemText primary="Large Heading" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 1}
              onMouseDown={e => {
                onCommandClick(wrapInHeadingCommand.key, 2);
                e.preventDefault();
              }}
            >
              <ListItemIcon>H2</ListItemIcon>
              <ListItemText primary="Medium Heading" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 2}
              onMouseDown={e => {
                onCommandClick(wrapInHeadingCommand.key, 3);
                e.preventDefault();
              }}
            >
              <ListItemIcon>H3</ListItemIcon>
              <ListItemText primary="Small Heading" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 3}
              onMouseDown={e => {
                onCommandClick(createCodeBlockCommand.key);
                e.preventDefault();
              }}
            >
              <ListItemIcon>
                <CodeIcon />
              </ListItemIcon>
              <ListItemText primary="Code Block" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 4}
              onMouseDown={e => {
                onCommandClick(turnIntoTextCommand.key);
                e.preventDefault();
              }}
            >
              <ListItemIcon>
                <FormatClearIcon />
              </ListItemIcon>
              <ListItemText primary="Normal text" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 5}
              onMouseDown={e => {
                onCommandClick(insertTableCommand.key);
                e.preventDefault();
              }}
            >
              <ListItemIcon>
                <CodeIcon />
              </ListItemIcon>
              <ListItemText primary="Insert Table" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 6}
              onMouseDown={e => {
                onCommandClick(insertMathCommand.key);
                e.preventDefault();
              }}
            >
              <ListItemIcon>
                <CodeIcon />
              </ListItemIcon>
              <ListItemText primary="Add math" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 7}
              onMouseDown={e => {
                onCommandClick(insertDiagramCommand.key);
                e.preventDefault();
              }}
            >
              <ListItemIcon>
                <SchemaIcon />
              </ListItemIcon>
              <ListItemText primary="Add diagram" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 8}
              onMouseDown={e => {
                onCommandClick(wrapInBulletListCommand.key);
                e.preventDefault();
              }}
            >
              <ListItemIcon>
                <CodeIcon />
              </ListItemIcon>
              <ListItemText primary="Bullet list" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 9}
              onMouseDown={e => {
                onCommandClick(wrapInOrderedListCommand.key);
                e.preventDefault();
              }}
            >
              <ListItemIcon>
                <CodeIcon />
              </ListItemIcon>
              <ListItemText primary="Ordered list" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 10}
              onMouseDown={e => {
                onCommandClick(insertHrCommand.key);
                e.preventDefault();
              }}
            >
              <ListItemIcon>
                <HorizontalRuleIcon />
              </ListItemIcon>
              <ListItemText primary="Divider" />
            </ListItemButton>
          </List>
        </Box>
      </div>
    </div>
  );
};
