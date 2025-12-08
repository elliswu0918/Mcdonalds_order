import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 關鍵設定：使用相對路徑，這樣部署到 GitHub Pages (子目錄) 才能正確讀取檔案
  base: './', 
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  }
});