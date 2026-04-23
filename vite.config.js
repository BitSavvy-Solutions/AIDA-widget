import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  return {
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env': JSON.stringify({}),
      'process.platform': JSON.stringify(''),
      'process.versions': JSON.stringify({})
    },
    plugins: [
      react(),
      {
        name: 'copy-index-html',
        closeBundle() {
          const buildDir = path.resolve(__dirname, 'build');
          if (!existsSync(buildDir)) mkdirSync(buildDir, { recursive: true });
          copyFileSync(path.resolve(__dirname, 'index.html'), path.resolve(buildDir, 'index.html'));
          console.log('✓ Copied index.html to build directory');
        }
      }
    ],
    build: {
      outDir: 'build',
      lib: {
        entry: path.resolve(__dirname, 'src/main.jsx'),
        name: 'AidaWidget',
      },
      minify: mode === 'production' ? 'esbuild' : false,
      sourcemap: false,
      rollupOptions: {
        // This tells Rollup to output multiple files
        output: [
          {
            format: 'es',
            entryFileNames: 'aida-widget.es.js',
            preserveModules: false, // Set to false to bundle into one file
          },
          {
            format: 'umd',
            entryFileNames: 'aida-widget.umd.js',
            name: 'AidaWidget',
            inlineDynamicImports: true, // Required for UMD
          }
        ]
      }
    }
  };
});