import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// 读取前端版本号，给构建产物（JS/CSS）引用追加 ?v=版本号 query，
// 强制钉钉 WebView / CDN 在版本变更时重新拉取最新资源，根治 SPA 缓存导致的旧前端反复加载问题。
function getAppVersion(): string {
  try {
    const f = path.resolve(__dirname, 'src/config/version.ts');
    const txt = fs.readFileSync(f, 'utf-8');
    const m = txt.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
    return m ? m[1] : 'unknown';
  } catch {
    return 'unknown';
  }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'cache-busting-assets',
      transformIndexHtml(html) {
        const v = getAppVersion();
        if (v === 'unknown') return html;
        // 给 /sichuan-asset-inventory/assets/ 下的 .js / .css 引用追加 ?v=版本号
        return html.replace(
          /(href|src)="(\/sichuan-asset-inventory\/assets\/[^"]+\.(?:js|css))"/g,
          (_m, attr: string, url: string) => `${attr}="${url}?v=${v}"`,
        );
      },
    },
  ],
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
