import { createContext, useMemo } from 'react';
import { useBase64File } from '../hooks/useBase64File';

export type TextEditorMode = 'preview' | 'active';

type TextEditorContextData = {
  mode: TextEditorMode;
  currentFolder?: string;
  stickyOnMenu: number;
  onFileUpload: (file: File) => Promise<string>;
  onFileValidation?: (file: File | null) => boolean;
  inputAcceptedFormats: string;
};

export const TextEditorContext = createContext<TextEditorContextData>({
  mode: 'preview',
  stickyOnMenu: 10,
  onFileUpload: () => Promise.resolve(''),
  inputAcceptedFormats: '',
  onFileValidation: () => true
});

export type TextEditorContextProviderProps = {
  mode: TextEditorMode;
  currentFolder?: string;
  children: React.ReactNode;
  stickyOnMenu?: number;
  onFileUpload?: (file: File) => Promise<string>;
  onFileValidation?: (file: File | null) => boolean;
  inputAcceptedFormats?: string;
};

export const TextEditorContextProvider = ({
  mode,
  children,
  stickyOnMenu = 10,
  onFileUpload,
  onFileValidation,
  inputAcceptedFormats = '*'
}: TextEditorContextProviderProps) => {
  const { getBase64 } = useBase64File();

  const context = useMemo(
    () => ({
      mode,
      stickyOnMenu,
      onFileUpload: onFileUpload || getBase64,
      onFileValidation,
      inputAcceptedFormats
    }),
    [
      mode,
      onFileUpload,
      getBase64,
      stickyOnMenu,
      onFileValidation,
      inputAcceptedFormats
    ]
  );

  return (
    <TextEditorContext.Provider value={context}>
      {children}
    </TextEditorContext.Provider>
  );
};
