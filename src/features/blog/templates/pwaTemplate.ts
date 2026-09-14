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
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#e74c3c',
    icons: [],
  }, null, 2)
}

/**
 * Generate Service Worker (sw.js) content for PWA
 * Uses a simple cache-first strategy
 */
export function generateServiceWorker(files: string[]): string {
  const assetsList = files.map(f => `'/${f}'`).join(',\n    ')
  return `const CACHE_NAME = 'markcraft-blog-v1';
const ASSETS = [
    ${assetsList}
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
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
 */
export function getPwaHeadTags(_config: BlogConfig): string {
  return `<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#e74c3c">`
}

/**
 * Generate the Service Worker registration script for HTML body
 */
export function getPwaRegistrationScript(): string {
  return `<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').catch(function(err) {
      console.log('SW registration failed: ', err);
    });
  });
}
</script>`
}
