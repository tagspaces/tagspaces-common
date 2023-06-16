import { useNodeViewContext } from '@prosemirror-adapter/react';
import { useMemo } from 'react';
import { IconButton } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { Matcher } from '../../utils/Matcher';
import { useTextEditorContext } from '../../TextEditorContext/useTextEditoContext';

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
  const { mode } = useTextEditorContext();
  //const { onSuccessNotification } = useNotification();
  const { contentRef, node, setAttrs } = useNodeViewContext();

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
    <>
      <p>
        {Matcher(mode)
          .match('active', () => (
            <Select
              labelId="select-lang-label"
              id="select-lang"
              value={value}
              label="Select Language"
              onChange={onLanguageChange}
            >
              {options.map(option => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
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
      </p>
      <pre>
        <code style={{ textAlign: 'left' }} ref={contentRef} />
      </pre>
    </>
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
