import { createContext } from 'react';

export const ColorModeContext = createContext({
  toggleColorMode: () => {},
  setMode: (mode: 'light' | 'dark') => {}
});
