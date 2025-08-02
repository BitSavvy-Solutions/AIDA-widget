import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  define: {
    // Replace process.env.NODE_ENV in the browser build
    'process.env.NODE_ENV': JSON.stringify('production'),
    // Add fallbacks for other process references
    'process.env': JSON.stringify({}),
    'process.platform': JSON.stringify(''),
    'process.versions': JSON.stringify({})
  },
  plugins: [
    react(),
    {
      name: 'copy-index-html',
      closeBundle() {
        // Ensure build directory exists
        const buildDir = path.resolve(__dirname, 'build');
        if (!existsSync(buildDir)) {
          mkdirSync(buildDir, { recursive: true });
        }
        
        // Copy index.html to build directory
        copyFileSync(
          path.resolve(__dirname, 'index.html'),
          path.resolve(buildDir, 'index.html')
        );
        console.log('✓ Copied index.html to build directory');
      }
    }
  ],
  build: {
    outDir: 'build',
    lib: {
      entry: path.resolve(__dirname, 'src/main.jsx'),
      name: 'AidaWidget',
      fileName: (format) => `aida-widget.${format}.js`,
      formats: ['umd'],
    },
    minify: false,
    sourcemap: true,
    rollupOptions: {
      // Bundle all dependencies to avoid browser compatibility issues
      external: [], // Empty means include everything
    }
  },
});