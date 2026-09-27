import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { existsSync, statSync, createReadStream, mkdirSync, readdirSync, copyFileSync } from 'fs'
import { join, extname, dirname, basename, resolve } from 'path'

// Batch B 解耦整合：路径别名（消除 ../../../ 深相对引用）
// ⚠️ Phase 0（2026-09-17）新增 @core → src/core（L1 领域基础能力层）。
// ⚠️ 别名表在本仓共 **4 处**：tsconfig.json / vite.config.ts / vitest.config.ts /
// vite.smoke.config.ts —— 新增别名必须**四处同改**。只改前两处会出现
// 「dev 正常但 vitest 报错」这类只在特定链路上暴露的失败（Phase 1 首次引用 @core
// 时真实踩过：20 个测试文件在导入期崩溃）。契约测试 src/aliasSync.test.ts 看守。
const SRC = resolve(process.cwd(), 'src')
const alias = {
  '@core': join(SRC, 'core'),
  '@features': join(SRC, 'features'),
  '@stores': join(SRC, 'stores'),
  '@aurora': join(SRC, 'aurora'),
  '@components': join(SRC, 'components'),
  '@services': join(SRC, 'services'),
  '@utils': join(SRC, 'utils'),
  '@hooks': join(SRC, 'hooks'),
  '@locales': join(SRC, 'locales'),
  '@styles': join(SRC, 'styles'),
  '@workers': join(SRC, 'workers'),
  '@src': SRC,
}

/**
 * 本地化 Excalidraw 运行时资源（vendor chunk / 字体 / wasm）。
 *
 * 背景：@excalidraw/excalidraw 在浏览器端通过 webpack public path
 *   `__webpack_require__.p = window.EXCALIDRAW_ASSET_PATH || 'https://unpkg.com/@excalidraw/excalidraw@x/dist/'`
 * 异步加载资源。默认走 unpkg.com。一旦离线 / 防火墙 / 浏览器跟踪防护（如 Edge
 * Tracking Prevention 拦截 unpkg 的 localStorage）拦截该域名，vendor chunk 会
 * ChunkLoadError 失败，导致 Excalidraw 无法初始化、白板工具栏全部无响应。
 *
 * 解决：index.html 已设 window.EXCALIDRAW_ASSET_PATH='/excalidraw-assets/'。
 * 本插件在 dev / preview 用中间件把 node_modules 中的 Excalidraw dist 暴露到
 * /excalidraw-assets/，并在 build 时拷贝到产物 dist/excalidraw-assets/，从而彻底
 * 去掉对 unpkg 的运行时依赖（同源、零外网）。
 */
/**
 * 处理沙箱 safe-delete 守卫对 Excalidraw 资源的破坏。
 *
 * 某些运行环境下（沙箱文件守卫）会把 npm 安装后本应保留的文件重命名为
 * `<name>.DELETE.<hash>` 而非真正删除。Excalidraw 的字体（Virgil / Assistant /
 * Cascadia 等 .woff2）因此被改名，导致 EXCALIDRAW_ASSET_PATH 指向的字体请求 404、
 * Vite SPA fallback 返回 index.html，进而字体解码失败 → Excalidraw 文本测量异常 →
 * updateWysiwygStyle 同步递归（Maximum call stack size exceeded）→ 白板全部工具失效。
 *
 * 本模块在 dev/build 启动时把 `.DELETE.<hash>` 文件还原为干净文件名，并在资源服务
 * 中间件中对仍带后缀的文件做兜底解析，从而彻底恢复字体加载。
 */
// 形如 `Virgil.woff2.DELETE.5dd2f9ff...` → 干净名 `Virgil.woff2`
const DELETE_RE = /^(.+)\.DELETE\.[a-f0-9]{8,}$/

// 把目录下所有 `<name>.DELETE.<hash>` 文件复制为干净文件名（不动原文件，创建新文件避免触发删除守卫）
function healDeletedFiles(dir: string) {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) { healDeletedFiles(full); continue }
    const m = entry.name.match(DELETE_RE)
    if (m) {
      const cleanPath = join(dir, m[1])
      if (!existsSync(cleanPath)) {
        try { copyFileSync(full, cleanPath) } catch { /* 忽略单文件失败 */ }
      }
    }
  }
}

function excalidrawLocalAssets(): any {
  const srcDir = join(process.cwd(), 'node_modules/@excalidraw/excalidraw/dist')
  let outDir = join(process.cwd(), 'dist')
  const mimeTypes: Record<string, string> = {
    '.js': 'text/javascript', '.mjs': 'text/javascript', '.cjs': 'text/javascript',
    '.css': 'text/css',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/opentype',
    '.json': 'application/json', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.wasm': 'application/wasm',
  }

  const serveFrom = (rootDir: string) => (req: any, res: any, next: any) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
      const filePath = join(rootDir, urlPath)
      if (!filePath.startsWith(rootDir)) return next() // 防目录穿越
      let realPath: string | undefined
      if (existsSync(filePath) && statSync(filePath).isFile()) {
        realPath = filePath // 干净文件名优先
      } else {
        // 兜底：同目录下寻找 `<base>.DELETE.<hash>` 文件并作为干净资源返回
        const dir = dirname(filePath)
        const base = basename(filePath)
        if (existsSync(dir)) {
          const hit = readdirSync(dir).find((f: string) => f.startsWith(base + '.DELETE.'))
          if (hit) realPath = join(dir, hit)
        }
      }
      if (realPath) {
        const mime = mimeTypes[extname(realPath).toLowerCase()] || 'application/octet-stream'
        res.setHeader('Content-Type', mime)
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        createReadStream(realPath).pipe(res)
        return
      }
    } catch { /* fallthrough */ }
    next()
  }

  // 拷贝时剥离 .DELETE.<hash> 后缀，保证产物 dist 内资源名干净
  const copyDir = (from: string, to: string) => {
    if (!existsSync(from)) return
    mkdirSync(to, { recursive: true })
    for (const entry of readdirSync(from, { withFileTypes: true })) {
      const s = join(from, entry.name)
      const cleanName = entry.name.replace(DELETE_RE, '$1')
      const d = join(to, cleanName)
      if (entry.isDirectory()) copyDir(s, d)
      else if (entry.isFile()) { mkdirSync(join(to, '..'), { recursive: true }); copyFileSync(s, d) }
    }
  }

  return {
    name: 'excalidraw-local-assets',
    // 记录构建解析后的真实 outDir（默认 dist），使资源拷贝与 outDir 保持一致
    configResolved(config: any) {
      outDir = join(process.cwd(), config.build.outDir || 'dist')
    },
    configureServer(server: any) {
      // dev 启动时还原干净字体（若守卫再次重命名，serveFrom 的兜底仍可解析）
      try { healDeletedFiles(srcDir) } catch { /* ignore */ }
      server.middlewares.use('/excalidraw-assets', serveFrom(srcDir))
    },
    configurePreviewServer(server: any) {
      const previewDir = join(outDir, 'excalidraw-assets')
      try { healDeletedFiles(previewDir) } catch { /* ignore */ }
      server.middlewares.use('/excalidraw-assets', serveFrom(previewDir))
    },
    closeBundle() {
      try { healDeletedFiles(srcDir) } catch { /* ignore */ }
      copyDir(srcDir, join(outDir, 'excalidraw-assets'))
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    excalidrawLocalAssets(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      cleanupOutdatedCaches: true,
      manifest: {
        name: 'MarkCraft',
        short_name: 'MarkCraft',
        description: 'Markdown 编辑器 · 写作与目标管理',
        theme_color: '#7C8CFF',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // E2：排除 Excalidraw 运行时资源，避免 SW 预缓存导致体积爆炸与字体 404 循环
        globIgnores: ['**/excalidraw-assets/**'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // 主入口 chunk 约 2.8 MB，vendor-excalidraw 分包约 9.13 MB，均超过 workbox 默认 2 MiB 预缓存上限。
        // 离线可用性依赖这些 chunk 被预缓存，因此上调到 12 MiB（留足 Excalidraw 分包余量）。
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
      },
    }),
  ],
  // 为 @excalidraw/excalidraw 提供 process.env：其入口在浏览器端引用
  // process.env.IS_PREACT / NODE_ENV，否则进入白板会抛 "process is not defined"。
  // ⚠ 必须替换「完整表达式」process.env.NODE_ENV，而不是只替换 process.env——
  // 后者会把 process.env 替换成一个字符串字面量，导致 .NODE_ENV 访问变成 undefined，
  // 使 Excalidraw 走错 dev/prod 分支（文本测量不收敛 → updateWysiwygStyle 死循环）。
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
    'process.env.IS_PREACT': JSON.stringify('false'),
  },
  resolve: {
    alias,
  },

  server: {
    // 禁用缓存，确保浏览器（特别是 Edge）始终加载最新代码
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          // 大体量 / 易成首屏瓶颈的依赖独立分包，压低主入口 chunk
          if (id.includes('excalidraw')) return 'vendor-excalidraw'
          if (id.includes('pdfjs-dist')) return 'vendor-pdfjs'
          if (id.includes('mermaid')) return 'vendor-mermaid'
          if (id.includes('marked') || id.includes('dompurify')) return 'vendor-marked'
          if (id.includes('katex')) return 'vendor-katex'
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'vendor-tiptap'
          if (id.includes('@codemirror')) return 'vendor-codemirror'
          // 其它第三方库交由 Rollup 默认合并
        },
      },
    },
  },
}))
