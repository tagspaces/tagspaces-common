import { EditorStatus } from '@milkdown/core';
import { TooltipProvider } from '@milkdown/plugin-tooltip';
import { linkSchema } from '@milkdown/preset-commonmark';
import { TextSelection } from '@milkdown/prose/state';
import { usePluginViewContext } from '@prosemirror-adapter/react';
import { useEffect, useRef, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';

import { useHyperlinkAttrs } from './hooks/useHyperlinkAttrs';
import { useTextEditorContext } from '../../TextEditorContext/useTextEditoContext';
import { useSelectedMarkPosition } from '../../hooks/useSelectedMarkPosition';
import LinkDialog from '../dialogs/LinkDialog';
import { useMilkdownInstance } from '../../hooks/useMilkdownInstance';
import { useTheme } from '@mui/material';

export const LinkTooltip: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const tooltipProvider = useRef<TooltipProvider>();
  const [text, setText] = useState('');

  const { editor, loading } = useMilkdownInstance();
  const { view, prevState } = usePluginViewContext();
  const { textEditorMode } = useTextEditorContext();
  const { getSelectedMarkPosition } = useSelectedMarkPosition();
  const theme = useTheme();

  const { href } = useHyperlinkAttrs();
  const [isLinkModalOpened, setLinkModalOpened] = useState<boolean>(false);

  useEffect(() => {
    if (
      ref.current &&
      !tooltipProvider.current &&
      !loading &&
      editor &&
      editor.status === EditorStatus.Created
    ) {
      const provider = new TooltipProvider({
        content: ref.current,
        tippyOptions: {
          zIndex: 30,
          arrow: true,
          placement: 'bottom',
          theme: theme.palette.mode
        },
        shouldShow: view => {
          if (loading || !editor || editor.status !== EditorStatus.Created) {
            return false;
          }
          const { ctx } = editor;
          const { selection } = view.state;

          const linkPosition =
            ctx && getSelectedMarkPosition(view, linkSchema.type(ctx));

          if (selection instanceof TextSelection && linkPosition) {
            setText(linkPosition.text);
            return true;
          }

          return false;
        }
      });

      tooltipProvider.current = provider;
    }

    return () => {
      tooltipProvider.current?.destroy();
    };
  }, [editor, getSelectedMarkPosition, textEditorMode, loading]);

  useEffect(() => {
    tooltipProvider.current?.update(view, prevState);
  });

  if (textEditorMode === 'preview') {
    return null;
  }

  return (
    <div style={{ display: 'none' }}>
      <div
        ref={ref}
        className="flex items-center rounded-full border-2 bg-gray-50 dark:border-gray-900"
        /*style={{
          display: 'flex',
          alignItems: 'center',
          padding: 6,
          backgroundColor: 'gray',
          borderRadius: 8,
          fontSize: 10
        }}*/
      >
        <span style={{ paddingLeft: 10 }}>{href}</span>
        {isLinkModalOpened && (
          <LinkDialog
            open={isLinkModalOpened}
            onClose={() => setLinkModalOpened(false)}
            text={text}
            href={href}
            isEditMode={true}
          />
        )}

        <IconButton
          aria-label="edit"
          onClick={() => setLinkModalOpened(true)}
          size="small"
        >
          <EditIcon />
        </IconButton>
      </div>
      {/*<LinkModal
          editable
          {...{ text, href }}
          handler={({ onOpen }) => (
            <ButtonStyled oval onClick={onOpen} space="small">
              <Icon icon="edit" fill={colors.white} />
            </ButtonStyled>
          )}
        />
        <AnchorStyled
          {...{ href }}
          target="_blank"
          variant="button"
          space="small"
          oval
        >
          <Icon icon="export" />
        </AnchorStyled>
      </LinkTooltipStyled>  */}
    </div>
  );
};
