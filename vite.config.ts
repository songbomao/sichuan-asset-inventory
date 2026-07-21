import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/sichuan-asset-inventory/',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:7000',
        changeOrigin: true,
      },
      '/SaiApi': {
        target: 'http://localhost:7000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // 转译 ES2020+ 语法（?. / ?? / async 等）以兼容旧版钉钉 WebView 内核，避免白屏
    target: 'es2015',
  },
});
