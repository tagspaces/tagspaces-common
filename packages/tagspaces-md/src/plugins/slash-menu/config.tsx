import { commandsCtx, editorViewCtx } from '@milkdown/core';
import { Ctx, MilkdownPlugin } from '@milkdown/ctx';
import { slashFactory } from '@milkdown/plugin-slash';
import {
    createCodeBlockCommand,
    insertHrCommand,
    toggleStrongCommand, wrapInBulletListCommand,
    wrapInHeadingCommand, wrapInOrderedListCommand
} from '@milkdown/preset-commonmark';
import { ReactNode } from 'react';
import CodeIcon from '@mui/icons-material/Code';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import { ListItemIcon, ListItemText } from '@mui/material';
import { insertTableCommand } from '@milkdown/preset-gfm';

type ConfigItem = {
  renderer: ReactNode;
  onSelect: (ctx: Ctx) => void;
};

const removeSlash = (ctx: Ctx) => {
  // remove slash
  const view = ctx.get(editorViewCtx);
  view.dispatch(
    view.state.tr.delete(
      view.state.selection.from - 1,
      view.state.selection.from
    )
  );
};

export const slash = slashFactory('slashMenu'); //satisfies MilkdownPlugin[];

export const config: Array<ConfigItem> = [
  {
    onSelect: (ctx: Ctx) =>
      ctx.get(commandsCtx).call(wrapInHeadingCommand.key, 1),
    renderer: (
      <>
        <ListItemIcon>H1</ListItemIcon>
        <ListItemText primary="Large Heading" />
      </>
    )
  },
  {
    onSelect: (ctx: Ctx) =>
      ctx.get(commandsCtx).call(wrapInHeadingCommand.key, 2),
    renderer: (
      <>
        <ListItemIcon>H2</ListItemIcon>
        <ListItemText primary="Medium Heading" />
      </>
    )
  },
  {
    onSelect: (ctx: Ctx) =>
      ctx.get(commandsCtx).call(wrapInHeadingCommand.key, 3),
    renderer: (
      <>
        <ListItemIcon>H3</ListItemIcon>
        <ListItemText primary="Small Heading" />
      </>
    )
  },
  {
    onSelect: (ctx: Ctx) =>
      ctx.get(commandsCtx).call(createCodeBlockCommand.key),
    renderer: (
      <>
        <ListItemIcon>
          <CodeIcon />
        </ListItemIcon>
        <ListItemText primary="Code Block" />
      </>
    )
  },
  {
    onSelect: (ctx: Ctx) => ctx.get(commandsCtx).call(insertTableCommand.key),
    renderer: (
      <>
        <ListItemIcon>
          <CodeIcon />
        </ListItemIcon>
        <ListItemText primary="Insert Table" />
      </>
    )
  },
    {
    onSelect: (ctx: Ctx) => ctx.get(commandsCtx).call(wrapInBulletListCommand.key),
    renderer: (
      <>
        <ListItemIcon>
          <CodeIcon />
        </ListItemIcon>
        <ListItemText primary="Bullet list" />
      </>
    )
  },
    {
    onSelect: (ctx: Ctx) => ctx.get(commandsCtx).call(wrapInOrderedListCommand.key),
    renderer: (
      <>
        <ListItemIcon>
          <CodeIcon />
        </ListItemIcon>
        <ListItemText primary="Ordered list" />
      </>
    )
  },
  {
    onSelect: (ctx: Ctx) => ctx.get(commandsCtx).call(insertHrCommand.key),
    renderer: (
      <>
        <ListItemIcon>
          <HorizontalRuleIcon />
        </ListItemIcon>
        <ListItemText primary="Divider" />
      </>
    )
  }
].map(item => ({
  ...item,
  onSelect: (ctx: Ctx) => {
    removeSlash(ctx);
    item.onSelect(ctx);
  }
}));
