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
    '@milkdown/ctx',
    '@milkdown/transformer',
    '@milkdown/utils',
    '@milkdown/kit',
    '@milkdown/preset-commonmark',
    '@prosemirror-adapter/react',
    '@emotion/react',
    '@emotion/styled',
    '@mui/icons-material',
    '@mui/material',
    'react',
    'react-dom',
    'remark-directive'
  ],
  treeshake: true
});
