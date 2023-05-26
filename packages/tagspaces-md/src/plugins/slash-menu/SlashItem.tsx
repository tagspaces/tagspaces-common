import { Ctx } from '@milkdown/ctx';
import { Instance } from '@milkdown/react';
import { clsx } from 'clsx';
import { FC, ReactNode } from 'react';
import { ListItem, ListItemButton } from '@mui/material';

type SlashItemProps = {
  index: number;
  instance: Instance;
  onSelect: (ctx: Ctx) => void;
  children: ReactNode;
  selected: boolean;
  setSelected: (selected: number) => void;
};

export const SlashItem: FC<SlashItemProps> = ({
  index,
  instance,
  onSelect,
  children,
  selected,
  setSelected
}) => {
  const [loading, getEditor] = instance;

  const onPick = () => {
    if (loading) return;

    getEditor().action(ctx => {
      onSelect(ctx);
    });
  };

  return (
    <ListItemButton
      selected={selected}
      onMouseMove={() => setSelected(index)}
      onClick={e => {
        e.preventDefault();
        onPick();
      }}
    >
      {children}
    </ListItemButton>
  );
};
