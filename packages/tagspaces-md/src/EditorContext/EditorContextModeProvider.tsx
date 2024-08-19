import { useEffect } from 'react';
import { EditorContextProvider } from './EditorContextProvider';
import { LightEditorContextProvider } from './LightEditorContextProvider';
import { useSearchDialogContext } from '../components/dialogs/useSearchDialogContext';

type EditorContextProviderProps = {
  onFocus?: () => void;
  children: React.ReactNode;
  onChange: (markdown: string, prevMarkdown: string) => void;
  debounceChange?: number;
  lightMode?: boolean;
  excludePlugins?: Array<string>;
  defaultMarkdownValue: string;
  query?: string;
};

export const EditorContextModeProvider: React.FC<EditorContextProviderProps> =
  ({ lightMode, query, children, ...rest }) => {
    const { openSearchDialog } = useSearchDialogContext();

    useEffect(() => {
      if (query) {
        openSearchDialog(query);
      }
    }, []);

    if (lightMode) {
      return (
        <LightEditorContextProvider {...rest}>
          {children}
        </LightEditorContextProvider>
      );
    }
    return <EditorContextProvider {...rest}>{children}</EditorContextProvider>;
  };
