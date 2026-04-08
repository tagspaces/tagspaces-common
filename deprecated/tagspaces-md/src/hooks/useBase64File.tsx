import { useCallback } from 'react';

export const useBase64File = () => {
  const getBase64 = useCallback(async (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = function () {
        const resultFile = reader.result;
        if (!resultFile) {
          reject('Empty file');
        } else if (typeof resultFile === 'string') {
          resolve(resultFile);
        }
      };
      reader.onerror = function (error) {
        reject(error);
      };
    });
  }, []);

  return { getBase64 };
};
