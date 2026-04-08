import { useNodeViewContext } from '@prosemirror-adapter/react';
import { useMemo } from 'react';
import { IconButton } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { Matcher } from '../../utils/Matcher';
import { useTextEditorContext } from '../../TextEditorContext/useTextEditoContext';
import clsx from 'clsx';

const options = [
  {
    value: 'r',
    label: 'R'
  },
  {
    value: 'python',
    label: 'Python'
  },
  {
    value: 'c',
    label: 'C'
  },
  {
    value: 'java',
    label: 'Java'
  },
  {
    value: 'javascript',
    label: 'JavaScript'
  },
  {
    value: 'json',
    label: 'JSON'
  }
];

export const CodeBlockNode: React.FC = () => {
  const { textEditorMode } = useTextEditorContext();
  //const { onSuccessNotification } = useNotification();
  const { contentRef, selected, node, setAttrs } = useNodeViewContext();

  const onCopyClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    //onSuccessNotification('Code snippet copied to clipboard!');
    navigator.clipboard.writeText(node.textContent);
  };

  const onLanguageChange = (event: SelectChangeEvent) => {
    setAttrs({ language: event.target.value as string });
  };

  const value = useMemo(
    () =>
      options.find(option => option.value === node.attrs.language)?.value ||
      'text',
    [node]
  );
  const label = useMemo(
    () => options.find(option => option.value === value)?.label || 'Text',
    [value]
  );

  return (
    <div
      className={clsx(
        selected ? 'ProseMirror-selectednode' : '',
        'not-prose my-4 rounded bg-gray-200 p-5 shadow dark:bg-gray-800'
      )}
    >
      <div
        contentEditable="false"
        suppressContentEditableWarning
        className="mb-2 flex justify-between"
      >
        {Matcher(textEditorMode)
          .match('active', () => (
            <Select
              style={{ minWidth: 150 }}
              labelId="select-lang-label"
              id="select-lang"
              value={value}
              label="Select Language"
              onChange={onLanguageChange}
            >
              {options.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          ))
          .match('preview', () => <div>{label}</div>)
          .get()}
        <IconButton
          size="large"
          edge="start"
          color="inherit"
          aria-label="menu"
          sx={{ mr: 2 }}
          onClick={onCopyClick}
        >
          <ContentCopyIcon />
        </IconButton>
      </div>
      <pre spellCheck={false} className="!m-0 !mb-4">
        <code ref={contentRef} />
      </pre>
    </div>
  );
};
/*
const CodeBlockNodeContainerStyled = styled.div`
  margin: ${pxToRem(16)} 0;
  padding: ${pxToRem(16)};
  font-size: ${pxToRem(16)};
  line-height: ${pxToRem(22)};
  background-color: ${props => props.theme.colors.lightAzure};
  border: 1px solid ${props => props.theme.colors.azure};
  border-radius: ${pxToRem(8)};

  * {
    font-family: ${props => props.theme.fonts.secondary};
  }
`;

const CodeBlockNodeActionsStyled = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${pxToRem(16)};
`;

const CopyTextStyled = styled.span`
  margin-left: ${pxToRem(5)};
`;

const LanguageLabelStyled = styled.span`
  padding: ${pxToRem(7)} ${pxToRem(12)};
  background-color: ${props => props.theme.colors.azure};
  border-radius: ${pxToRem(8)};
`;

const CopyButtonStyled = styled(Button)`
  &:hover,
  &:focus {
    background-color: ${props => props.theme.colors.secondaryGrey};
  }
`;*/
