import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const isExtension = mode === 'extension';

  const config = {
    define: {
      // Treat extension mode as production for React optimizations
      'process.env.NODE_ENV': JSON.stringify(isExtension ? 'production' : mode),
      'process.env': JSON.stringify({}),
      'process.platform': JSON.stringify(''),
      'process.versions': JSON.stringify({})
    },
    plugins: [
      react(),
      // Only run the custom copy plugin for the standard UMD build
      !isExtension && {
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
    ].filter(Boolean), // Filter out false values if isExtension is true
    build: {
      // Output to build-extension for the Chrome extension, keep build for UMD
      outDir: isExtension ? 'build-extension' : 'build',
      emptyOutDir: true,
      minify: (mode === 'production' || isExtension) ? 'esbuild' : false,
      sourcemap: true,
    },
  };

  if (isExtension) {
    // ✅ EXTENSION MODE: Build as a standard web app using extension.html
    config.build.rollupOptions = {
      input: {
        extension: path.resolve(__dirname, 'extension.html')
      }
    };
  } else {
    // ✅ STANDARD MODE: Build as an embeddable UMD library
    config.build.lib = {
      entry: path.resolve(__dirname, 'src/main.jsx'),
      name: 'AidaWidget',
      fileName: (format) => `aida-widget.${format}.js`,
      formats: ['umd'],
    };
    config.build.rollupOptions = {
      external: [],
    };
  }

  if (mode !== 'production' && !isExtension) {
    config.resolve = {
      alias: {
        'react-dom$': 'react-dom/profiling',
        'scheduler/tracing': 'scheduler/tracing-profiling',
      },
    };
  }
  
  return config;
});