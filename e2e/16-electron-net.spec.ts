import { test, expect } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { join } from 'node:path'
import type { AddressInfo } from 'node:net'

/**
 * 16 · 主进程网络代理（P6 集成）
 *
 * 验证 `window.markcraft.net.fetch` → IPC → **主进程 fetch** 这条链路成立 —— 它是
 * 「解 CORS」的关键：渲染进程是 Chromium（跨域被拦），主进程是 Node（不受限）。
 *
 * 用**本地 HTTP 服务器**做目标，测试完全确定性（不依赖外网）：服务器记录收到的
 * method/headers/body，回显 JSON；另有 `/slow` 端点不响应，用来验证主进程超时。
 *
 * 前置：`npm run electron:compile`。
 */

const MAIN_MJS = join(process.cwd(), 'out/main/index.mjs')

let app: ElectronApplication
let win: Page
let server: Server
let port = 0
let received: { method?: string; headers?: Record<string, unknown>; body?: string } = {}

test.setTimeout(120_000)

test.beforeAll(async () => {
  server = createServer((req, res) => {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      if (req.url === '/slow') return // 永不响应 → 触发主进程超时
      received = { method: req.method, headers: req.headers as Record<string, unknown>, body }
      res.writeHead(200, { 'content-type': 'application/json', 'x-server': 'markcraft-e2e' })
      res.end(JSON.stringify({ ok: true, echo: body }))
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => {
    port = (server.address() as AddressInfo).port
    resolve()
  }))

  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && k !== 'ELECTRON_RUN_AS_NODE') env[k] = v
  }
  env.MARKCRAFT_DISABLE_GPU = '1'
  env.MARKCRAFT_NO_SANDBOX = '1'

  app = await electron.launch({ args: [MAIN_MJS], env })
  win = await app.firstWindow()
  await win.waitForFunction(() => {
    const root = document.getElementById('aurora-root')
    return !!root && root.childElementCount > 0
  }, undefined, { timeout: 60_000 })
})

test.afterAll(async () => {
  await app?.close()
  await new Promise<void>((r) => server.close(() => r()))
})

test.describe('主进程网络代理（P6 集成）', () => {
  test('preload 暴露 net.fetch', async () => {
    const has = await win.evaluate(() => typeof window.markcraft?.net?.fetch === 'function')
    expect(has).toBe(true)
  })

  test('POST 请求经主进程发出，服务器收到 method/headers/body，响应可读', async () => {
    const result = await win.evaluate(async (p: number) => {
      const res = await window.markcraft!.net.fetch({
        url: `http://127.0.0.1:${p}/echo?x=1`,
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-test': 'markcraft' },
        bodyText: JSON.stringify({ hello: 'world' }),
      })
      return {
        status: res.status,
        server: res.headers['x-server'],
        body: new TextDecoder().decode(res.body),
      }
    }, port)

    expect(result.status).toBe(200)
    expect(result.server).toBe('markcraft-e2e')
    expect(JSON.parse(result.body)).toEqual({ ok: true, echo: '{"hello":"world"}' })
    // 服务器侧确实收到了请求
    expect(received.method).toBe('POST')
    expect(received.headers?.['x-test']).toBe('markcraft')
    expect(received.body).toBe('{"hello":"world"}')
  })

  test('超时 → 主进程 abort 并回 NET_TIMEOUT 标记', async () => {
    const err = await win.evaluate(async (p: number) => {
      try {
        await window.markcraft!.net.fetch({ url: `http://127.0.0.1:${p}/slow`, timeoutMs: 400 })
        return 'NO_ERROR'
      } catch (e) {
        return e instanceof Error ? e.message : String(e)
      }
    }, port)
    expect(err).toContain('NET_TIMEOUT')
  })
})
