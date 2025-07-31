import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build', // Change output directory from 'dist' to 'build'
    lib: {
      entry: path.resolve(__dirname, 'src/main.jsx'),
      name: 'AidaWidget',
      fileName: (format) => `aida-widget.${format}.js`,
      formats: ['umd'],
    },
    minify: false,
  },
});