import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'],
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // 保持图标文件的原始名称
          if (assetInfo.name && assetInfo.name.includes('assets/icons/')) {
            return 'assets/icons/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
})
