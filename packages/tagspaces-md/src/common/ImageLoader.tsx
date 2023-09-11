import { styled, StyledComponentProps } from '@mui/material/styles';
import { Loader, LoaderSize } from './Loader';

type ImageLoaderProps = {
  isLoading?: boolean;
  children?: React.ReactNode;
  className?: string;
  loaderSize?: LoaderSize;
  loaderWidth?: number;
  loaderHeight?: number;
};

export const ImageLoader: React.FC<ImageLoaderProps> = ({
  children,
  isLoading = true,
  loaderSize = 'large',
  className = '',
  loaderWidth = 300,
  loaderHeight = 300
}) => (
  <ImageContainerStyled
    {...{ className }}
    loading={isLoading}
    loaderHeight={loaderHeight}
    loaderWidth={loaderWidth}
  >
    <LoaderStyled size={loaderSize} loading={isLoading} />
    {children}
  </ImageContainerStyled>
);

interface ImageContainerProps extends StyledComponentProps {
  loading: boolean;
  loaderWidth: number;
  loaderHeight: number;
}

const ImageContainerStyled = styled('div')<ImageContainerProps>(
  ({ theme, loaderWidth, loaderHeight }) => ({
    position: 'relative',
    backgroundColor: theme.palette.background.default,
    //width: loaderWidth,
    //height: loaderHeight
  })
);

const LoaderStyled = styled(Loader)`
  position: absolute;
  inset: 0;
`;
