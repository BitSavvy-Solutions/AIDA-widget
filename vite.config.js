import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const config = {
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
          if (!existsSync(buildDir)) {
            mkdirSync(buildDir, { recursive: true });
          }
          
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
      // ✅ MODIFIED: Enable minification for production builds.
      // Vite's default is 'esbuild', which is very fast.
      minify: mode === 'production' ? 'esbuild' : false,
      sourcemap: false, 
      rollupOptions: {
        external: [],
      }
    },
  };

  if (mode !== 'production') {
    config.resolve = {
      alias: {
        'react-dom$': 'react-dom/profiling',
        'scheduler/tracing': 'scheduler/tracing-profiling',
      },
    };
  }
  
  return config;
});