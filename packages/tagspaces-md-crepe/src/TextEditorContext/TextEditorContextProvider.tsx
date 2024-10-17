import { createContext, useMemo } from 'react';
import { useBase64File } from '../hooks/useBase64File';
import { MilkdownEditorMode } from '../MilkdownEditor';

export type TextEditorMode = 'preview' | 'active';

type TextEditorContextData = {
  textEditorMode: TextEditorMode;
  mode: MilkdownEditorMode;
  currentFolder?: string;
  stickyOnMenu: number;
  onFileUpload: (file: File) => Promise<string>;
  onFileValidation?: (file: File | null) => boolean;
  inputAcceptedFormats: string;
};

export const TextEditorContext = createContext<TextEditorContextData>({
  textEditorMode: 'preview',
  mode: 'extension',
  stickyOnMenu: 10,
  onFileUpload: () => Promise.resolve(''),
  inputAcceptedFormats: '',
  onFileValidation: () => true
});

export type TextEditorContextProviderProps = {
  textEditorMode: TextEditorMode;
  mode: MilkdownEditorMode;
  currentFolder?: string;
  children: React.ReactNode;
  stickyOnMenu?: number;
  onFileUpload?: (file: File) => Promise<string>;
  onFileValidation?: (file: File | null) => boolean;
  inputAcceptedFormats?: string;
};

export const TextEditorContextProvider = ({
  textEditorMode,
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
      textEditorMode,
      mode,
      stickyOnMenu,
      onFileUpload: onFileUpload || getBase64,
      onFileValidation,
      inputAcceptedFormats
    }),
    [
      textEditorMode,
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
