import { useRef } from 'react';
import { styled } from '@mui/material/styles';

import { ImageLoader } from './ImageLoader';
import { LoaderSize } from './Loader';
import { useToggler } from '../hooks/useToggler';
import { pxToRem } from '../styles/utils';

type ImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  'children'
> & {
  children?: (loading: boolean) => React.ReactNode;
  className?: string;
  loaderWidth?: number;
  loaderHeight?: number;
};

export const Image: React.FC<ImageProps> = ({
  onLoad,
  children,
  className = '',
  loaderHeight = 300,
  loaderWidth = 300,
  ...rest
}) => {
  const loading = useToggler(true);
  const imageRef = useRef<HTMLImageElement>(null);

  //const { onErrorNotification } = useNotification();

  const onError = () => {
    loading.off();
    //onErrorNotification(errorMessages.image.upload);
  };

  const loaderSize: LoaderSize =
    loaderHeight > 150 && loaderWidth > 150 ? 'large' : 'normal';

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    onLoad?.(e);
    loading.off();
  };

  return (
    <ImageLoaderStyled
      {...{ loaderSize, loaderHeight, loaderWidth, className }}
      isLoading={loading.state}
    >
      <>
        <ImageStyled
          ref={imageRef}
          {...rest}
          onLoad={onImageLoad}
          {...{ onError }}
        />
        {typeof children === 'function' && children(loading.state)}
      </>
    </ImageLoaderStyled>
  );
};

export const ImageStyled = styled('img')(() => ({
  aspectRatio: 'auto',
  maxWidth: pxToRem(500),
  maxHeight: pxToRem(500)
}));

export const ImageLoaderStyled = styled(ImageLoader)`
  display: flex;
`;
