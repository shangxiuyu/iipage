import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Electron 主进程和预加载脚本的构建配置
export default defineConfig({
  build: {
    outDir: 'dist-electron',
    lib: {
      entry: {
        main: path.resolve(__dirname, 'electron/main.ts'),
        preload: path.resolve(__dirname, 'electron/preload.ts'),
      },
      formats: ['cjs'],
      fileName: (format, entryName) => `${entryName}.cjs`,
    },
    rollupOptions: {
      external: ['electron', 'path', 'fs', 'url', 'crypto'],
      output: {
        entryFileNames: '[name].cjs',
        format: 'cjs',
      },
    },
    emptyOutDir: false,
    minify: false,
    ssr: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
});
