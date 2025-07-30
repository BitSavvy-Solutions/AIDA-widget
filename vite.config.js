import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    // Build as a library
    lib: {
      entry: path.resolve(__dirname, 'src/main.jsx'),
      name: 'AidaWidget', // The global variable name in the UMD build
      fileName: (format) => `aida-widget.${format}.js`,
      formats: ['umd'], // Universal Module Definition - works everywhere
    },
    // Don't minify for easier debugging of the output script initially
    minify: false,
  },
});