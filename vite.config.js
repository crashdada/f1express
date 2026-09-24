import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import packageJson from './package.json'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storagePath = path.resolve(__dirname, 'storage');

function copyRecursive(src, dst) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(dstPath, { recursive: true });
      copyRecursive(srcPath, dstPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-f1-storage',
      configureServer(server) {
        server.middlewares.use('/data', express.static(storagePath));
        server.middlewares.use('/photos', express.static(path.join(storagePath, 'photos')));
      }
    },
    {
      name: 'bundle-f1-storage-runtime-data',
      closeBundle() {
        const sourceDbPath = path.join(storagePath, 'f1.db');
        const bundledDbPath = path.resolve(__dirname, 'dist', 'f1.db');
        const bundledDataDir = path.resolve(__dirname, 'dist', 'data');
        const runtimeJsonFiles = [
          'schedule_2026.json',
          'results_2026.json',
          'drivers_2026.json',
          'teams_2026.json',
          'substitutes_2026.json'
        ];
        if (!fs.existsSync(sourceDbPath)) {
          throw new Error(`Missing storage database: ${sourceDbPath}`);
        }

        const stats = fs.statSync(sourceDbPath);
        if (stats.size === 0) {
          throw new Error(`Storage database is empty: ${sourceDbPath}`);
        }

        fs.copyFileSync(sourceDbPath, bundledDbPath);
        console.log(`Bundled storage database into dist/f1.db (${stats.size} bytes)`);

        fs.mkdirSync(bundledDataDir, { recursive: true });
        for (const filename of runtimeJsonFiles) {
          const sourcePath = path.join(storagePath, filename);
          const targetPath = path.join(bundledDataDir, filename);

          if (!fs.existsSync(sourcePath)) {
            throw new Error(`Missing runtime dataset: ${sourcePath}`);
          }

          fs.copyFileSync(sourcePath, targetPath);
          const fileStats = fs.statSync(targetPath);
          if (fileStats.size === 0) {
            throw new Error(`Bundled runtime dataset is empty: ${targetPath}`);
          }
          console.log(`Bundled runtime dataset into dist/data/${filename} (${fileStats.size} bytes)`);
        }

        const sourcePhotosDir = path.join(storagePath, 'photos');
        const bundledPhotosDir = path.resolve(__dirname, 'dist', 'photos');
        if (fs.existsSync(sourcePhotosDir)) {
          fs.mkdirSync(bundledPhotosDir, { recursive: true });
          copyRecursive(sourcePhotosDir, bundledPhotosDir);
          const photoCount = fs.readdirSync(bundledPhotosDir, { recursive: true }).length;
          console.log(`Bundled photos directory into dist/photos (${photoCount} files)`);
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components')
    }
  },
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(packageJson.version),
    '__APP_VERSION__': JSON.stringify(packageJson.version)
  },
  server: {
    fs: {
      strict: false
    },
    proxy: {
      '/api': 'http://localhost:8001'
    }
  },
  optimizeDeps: {
    exclude: ['sql.js']
  },
  assetsInclude: ['**/*.db', '**/*.wasm'],
  test: {
    testTimeout: 10000,
  }
})
