import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const Config: defineConfig = {
  root: 'app',
  plugins: [react()]
};

export default Config;
