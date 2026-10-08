import { defineConfig, devices } from '@playwright/test'

/**
 * MarkCraft 真机 E2E 配置（全真测试）。
 *
 * 设计要点：
 * - 用系统已安装的 Edge（`channel: 'msedge'`），**无需下载浏览器内核**；
 * - `--no-proxy-server`：本机沙箱设置了 http_proxy，会劫持 localhost 请求（表现为 502），
 *   必须让浏览器直连本地 dev server；
 * - `reuseExistingServer`：本地开发时若 5173 已在跑则直接复用，CI 下则自起；
 * - 串行 + 单 worker：应用是有状态的（IndexedDB / localStorage / 单例 store），
 *   先以稳定为先，后续按需提升并行度。
 */
// 用 127.0.0.1 而非 localhost：Vite 默认只绑 IPv6（::1），而 Playwright 的
// webServer 存活探测与 Node 侧连接优先走 IPv4 —— 用 localhost 会导致探测失败、
// Playwright 误判「服务没起」而自行拉起第二个 dev server（并与之冲突）。
const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e-report/html', open: 'never' }],
    ['json', { outputFile: 'e2e-report/results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // 不录屏：video 需要 ffmpeg 二进制（额外下载），trace 已含 DOM 快照时间线，足够定位问题。
    video: 'off',
    launchOptions: {
      args: ['--no-proxy-server'],
    },
  },
  projects: [
    {
      name: 'msedge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],
  webServer: {
    // --host 127.0.0.1：让服务同时可被 IPv4 回环访问（见上方 BASE_URL 说明），仅绑回环、不对外暴露。
    command: 'npm run dev -- --host 127.0.0.1',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
