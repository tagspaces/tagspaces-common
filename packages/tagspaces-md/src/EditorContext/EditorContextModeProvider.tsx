import { EditorContextProvider } from './EditorContextProvider';
import { LightEditorContextProvider } from './LightEditorContextProvider';

type EditorContextProviderProps = {
  onFocus?: () => void;
  children: React.ReactNode;
  onChange: (markdown: string, prevMarkdown: string) => void;
  debounceChange?: number;
  lightMode?: boolean;
  excludePlugins?: Array<string>;
  defaultMarkdownValue: string;
};

export const EditorContextModeProvider: React.FC<EditorContextProviderProps> =
  ({ lightMode, children, ...rest }) => {
    if (lightMode) {
      return (
        <LightEditorContextProvider {...rest}>
          {children}
        </LightEditorContextProvider>
      );
    }
    return <EditorContextProvider {...rest}>{children}</EditorContextProvider>;
  };
