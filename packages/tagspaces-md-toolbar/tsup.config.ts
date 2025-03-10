import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true, // This enables declaration file generation
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: true,
  external: [
    '@milkdown/core',
    '@milkdown/prose',
    '@milkdown/react',
    '@emotion/react',
    '@emotion/styled',
    '@mui/icons-material',
    '@mui/material',
    '@prosemirror-adapter/react',
    'react',
    'react-dom'
  ],
  treeshake: true
});
