import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',  // Entry file of your library
      name: 'MyLibrary',      // Global name of your library
      fileName: 'my-library', // File name of the output
      formats: ['es', 'cjs', 'umd'] // Output formats
    },
    rollupOptions: {
      external: [], // External dependencies that you don't want to bundle
      output: {
        globals: {
          // For UMD build, provide global variable names for external dependencies
        }
      }
    }
  },
  plugins: [dts()],
});
