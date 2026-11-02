/**
 * PWA template — generates manifest.json and Service Worker for blog
 */

import { BlogConfig } from './types'

/**
 * Generate manifest.json content for PWA
 */
export function generateManifestJson(config: BlogConfig): string {
  return JSON.stringify({
    name: config.siteTitle,
    short_name: config.siteTitle,
    start_url: './',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#e74c3c',
    icons: [],
  }, null, 2)
}

/**
 * Generate Service Worker (sw.js) content for PWA
 *
 * ⚠️ 缓存策略两个关键点（2026-11-02 实测教训）：
 * 1. CACHE_NAME 必须每次生成时变化（按构建时间戳）——写死 'v1' 时，重新部署后
 *    sw.js 字节不变 → 浏览器判定无需更新 → 旧 SW 永远用 cache-first 吐旧 HTML，
 *    用户即使重新部署也一直看到旧站点。
 * 2. 页面导航请求必须网络优先——纯 cache-first 只适合静态资源，HTML 走它会让
 *    「重新部署后仍显示旧内容」成为必然。导航失败回退缓存，保住离线能力。
 */
export function generateServiceWorker(files: string[]): string {
  // 预缓存清单用相对路径（相对 sw.js 所在的站点根）：带前导 / 的根绝对路径
  // 在项目页部署（xxx.github.io/repo/）下会 404，导致 addAll 失败、SW 装不上
  const assetsList = files.map(f => `'${f}'`).join(',\n    ')
  // 毫秒 + 随机后缀：同一毫秒内两次生成也要不同（保证每次部署 sw.js 字节必变）
  const buildId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  return `const CACHE_NAME = 'markcraft-blog-${buildId}';
const ASSETS = [
    ${assetsList}
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  // 页面导航：网络优先，成功则回写缓存；离线时回退缓存
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  // 静态资源：缓存优先
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
});
`
}

/**
 * Generate the manifest link and SW registration script for HTML head
 *
 * @param rootPrefix 页面到站点根的相对前缀（'' / '../' / '../../'）。
 *   原实现硬编码根绝对路径 /manifest.json、/sw.js —— 用户页（xxx.github.io）可用，
 *   项目页（xxx.github.io/repo/）会 404；改为相对路径后两种部署形态都正确。
 */
export function getPwaHeadTags(_config: BlogConfig, rootPrefix = ''): string {
  return `<link rel="manifest" href="${rootPrefix}manifest.json">
<meta name="theme-color" content="#e74c3c">`
}

/**
 * Generate the Service Worker registration script for HTML body
 */
export function getPwaRegistrationScript(rootPrefix = ''): string {
  return `<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('${rootPrefix}sw.js').catch(function(err) {
      console.log('SW registration failed: ', err);
    });
  });
}
</script>`
}
