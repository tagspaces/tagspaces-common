import { CmdKey, editorViewCtx } from '@milkdown/core';
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
    if (loading || !editor) {
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
    <div className="hidden">
      <div role="tooltip" ref={tooltipRef}>
        <Box sx={{ width: '100%', maxWidth: 360, backgroundColor: 'gray' }}>
          {/* bgcolor: 'background.paper'*/}
          <List component="nav" aria-label="main mailbox folders">
            <ListItemButton
              selected={activeItemIndex === 0}
              onClick={() => onCommandClick(wrapInHeadingCommand.key, 1)}
            >
              <ListItemIcon>H1</ListItemIcon>
              <ListItemText primary="Large Heading" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 1}
              onClick={() => onCommandClick(wrapInHeadingCommand.key, 2)}
            >
              <ListItemIcon>H2</ListItemIcon>
              <ListItemText primary="Medium Heading" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 2}
              onClick={() => onCommandClick(wrapInHeadingCommand.key, 3)}
            >
              <ListItemIcon>H3</ListItemIcon>
              <ListItemText primary="Small Heading" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 3}
              onClick={() => onCommandClick(createCodeBlockCommand.key)}
            >
              <ListItemIcon>
                <CodeIcon />
              </ListItemIcon>
              <ListItemText primary="Code Block" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 4}
              onClick={() => onCommandClick(turnIntoTextCommand.key)}
            >
              <ListItemIcon>
                <FormatClearIcon />
              </ListItemIcon>
              <ListItemText primary="Normal text" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 5}
              onClick={() => onCommandClick(insertTableCommand.key)}
            >
              <ListItemIcon>
                <CodeIcon />
              </ListItemIcon>
              <ListItemText primary="Insert Table" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 6}
              onClick={() => onCommandClick(insertMathCommand.key)}
            >
              <ListItemIcon>
                <CodeIcon />
              </ListItemIcon>
              <ListItemText primary="Add math" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 7}
              onClick={() => onCommandClick(insertDiagramCommand.key)}
            >
              <ListItemIcon>
                <SchemaIcon />
              </ListItemIcon>
              <ListItemText primary="Add diagram" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 8}
              onClick={() => onCommandClick(wrapInBulletListCommand.key)}
            >
              <ListItemIcon>
                <CodeIcon />
              </ListItemIcon>
              <ListItemText primary="Bullet list" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 9}
              onClick={() => onCommandClick(wrapInOrderedListCommand.key)}
            >
              <ListItemIcon>
                <CodeIcon />
              </ListItemIcon>
              <ListItemText primary="Ordered list" />
            </ListItemButton>
            <ListItemButton
              selected={activeItemIndex === 10}
              onClick={() => onCommandClick(insertHrCommand.key)}
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
