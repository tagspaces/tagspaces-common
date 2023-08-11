import { styled } from '@mui/material/styles';
import { Image, ImageStyled } from './Image';

type LightboxProps = {
  src: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export const Lightbox: React.FC<LightboxProps> = ({ src, ...rest }) => {
  return (
    /*<ControlledModalStyled {...rest}>*/
    <LightboxImageStyled {...{ src }} />
    /*</ControlledModalStyled>*/
  );
};

const LightboxImageStyled = styled(Image)`
  height: 100%;
  width: 100%;

  @media (min-width: 700px) {
    width: auto;
    height: auto;
  }
`;
