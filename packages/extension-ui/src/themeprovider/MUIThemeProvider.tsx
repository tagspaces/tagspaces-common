import { useState, useMemo, FC, ReactNode } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { ColorModeContext } from './ColorModeContext';
//import { amber, deepOrange, grey } from "@mui/material/colors";

const getDesignTokens = mode => ({
  palette: {
    mode
    /* ...(mode === "light"
      ? {
          // palette values for light mode
          primary: amber,
          divider: amber[200],
          text: {
            primary: grey[900],
            secondary: grey[800],
          },
        }
      : {
          // palette values for dark mode
          primary: deepOrange,
          divider: deepOrange[700],
          background: {
            default: deepOrange[900],
            paper: deepOrange[900],
          },
          text: {
            primary: "#fff",
            secondary: grey[500],
          },
        }), */
  }
});
const MUIThemeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      // If window object is not available (like during server-side rendering)
      return 'light';
    }
    // @ts-ignore
    if (window.theme) {
      // @ts-ignore
      return window.theme;
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'));
      },
      setMode
    }),
    []
  );

  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default MUIThemeProvider;
