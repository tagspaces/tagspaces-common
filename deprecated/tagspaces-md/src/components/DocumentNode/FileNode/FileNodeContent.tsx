import { styled } from '@mui/material/styles';
import { pxToRem } from '../../../styles/utils';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

type FileNodeContentProps = {
  name: string;
  children: React.ReactNode;
};

export const FileNodeContent: React.FC<FileNodeContentProps> = ({
  name,
  children
}) => {
  return (
    <>
      <WrapperStyled>
        <IconContainerStyled>
          <InsertDriveFileIcon />
          {/*<Icon icon="document" />*/}
        </IconContainerStyled>
        <NameStyled>{name}</NameStyled>
      </WrapperStyled>
      {children}
    </>
  );
};

/*export const FileNodeRemoveButtonStyled = styled(Button)`
  pointer-events: none;
  opacity: 0;
  transition: 0.1s ease-in;

  &:hover {
    background-color: #eeefee;
  }
`;*/

const WrapperStyled = styled('div')`
  display: flex;
  align-items: center;
  gap: ${pxToRem(8)};
  overflow: hidden;
`;

const IconContainerStyled = styled('div')`
  display: flex;
  padding: ${pxToRem(7)};
  border-radius: ${pxToRem(4)};
  background-color: #f6f6f6;
  border: 1px solid #d6d6d6;
`;

const NameStyled = styled('div')`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
`;
