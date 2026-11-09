import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Batch B 解耦整合：路径别名，与 tsconfig.json paths 保持一致
const SRC = resolve(process.cwd(), 'src')
const alias = {
  // ⚠️ 别名表在本仓共 **4 处**：tsconfig.json / vite.config.ts / vitest.config.ts /
  // vite.smoke.config.ts。新增别名必须四处同改 —— 否则会出现「dev 正常但 vitest 报错」
  // 这类只在测试期暴露的失败（Phase 1 首次引用 @core 时真实踩过：20 个测试文件导入期崩溃）。
  // 契约测试 src/aliasSync.test.ts 看守这一点。
  '@core': resolve(SRC, 'core'),
  '@features': resolve(SRC, 'features'),
  '@stores': resolve(SRC, 'stores'),
  '@aurora': resolve(SRC, 'aurora'),
  '@components': resolve(SRC, 'components'),
  '@services': resolve(SRC, 'services'),
  '@utils': resolve(SRC, 'utils'),
  '@hooks': resolve(SRC, 'hooks'),
  '@locales': resolve(SRC, 'locales'),
  '@styles': resolve(SRC, 'styles'),
  '@platform': resolve(SRC, 'platform'),
  '@src': SRC,
}

// 沙箱专用开关：仅当宿主注入了 CodeBuddy fs 钩子环境变量时，才把这两个开关传给 vitest worker
// （worker 不继承 shell env，故必须走 test.env）。普通 CI / 本机没有该钩子 → 不注入，
// 仓库保持干净，也不会把「关闭 safe-delete 保护」固化到所有人的测试运行里。
const sandboxEnv =
  process.env.CODEBUDDY_BROKERED_FS_HOOK_ENABLED || process.env.CODEBUDDY_SAFE_DELETE_ENABLED
    ? { CODEBUDDY_BROKERED_FS_HOOK_ENABLED: '0', CODEBUDDY_SAFE_DELETE_ENABLED: '0' }
    : undefined

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    env: sandboxEnv,
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/components/**', 'src/utils/**', 'src/features/**', 'src/stores/**', 'src/services/**', 'src/hooks/**']
    }
  }
})
