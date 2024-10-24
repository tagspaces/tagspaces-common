import { Schema, Node } from '@milkdown/prose/model';
import { useCallback } from 'react';
import { useTextEditorContext } from '../../../TextEditorContext/useTextEditoContext';

//import { useNotification } from '../../../../hooks/useNotification';

export const useUploader = () => {
  // const { onErrorNotification } = useNotification();
  const { onFileUpload, onFileValidation } = useTextEditorContext();

  const uploader = useCallback(
    async (files: FileList, schema: Schema): Promise<Node[]> => {
      try {
        const images: File[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files.item(i);
          if (onFileValidation && !onFileValidation(file)) {
            continue;
          }
          images.push(file as File);
        }

        return await Promise.all(
          images.map(async image => {
            const src = await onFileUpload(image);
            const alt = image.name;
            return schema.nodes.image.createAndFill({
              src,
              alt
            }) as Node;
          })
        );
      } catch (e) {
        console.error(e);
        //onErrorNotification('Something bad happened');
        return [];
      }
    },
    [onFileUpload, onFileValidation]
  );

  return uploader;
};
