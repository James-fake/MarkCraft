import { test as base, expect, type Page } from '@playwright/test'

/**
 * 真机诊断收集器：把控制台 error 与未捕获异常都收起来。
 *
 * 「全真测试」的价值一半在于「跑通」，另一半在于「把真实运行时的报错抓出来」——
 * jsdom 单测里被桩掉的 API（canvas / IndexedDB / matchMedia）在真机上出问题会直接进这里。
 */
export interface Diagnostics {
  consoleErrors: string[]
  pageErrors: string[]
  /** 与本项目已知环境噪音无关的真实错误（过滤后） */
  realErrors: string[]
}

/** 已知噪音：与本应用无关的第三方 / 环境提示，不应算作失败。 */
const NOISE = [
  /favicon/i,
  /Download the React DevTools/i,
  /ResizeObserver loop/i,
  /was preloaded using link preload/i,
]

export const test = base.extend<{ diag: Diagnostics }>({
  diag: async ({ page }, use) => {
    const diag: Diagnostics = { consoleErrors: [], pageErrors: [], realErrors: [] }
    const push = (list: string[], text: string) => {
      list.push(text)
      if (!NOISE.some((re) => re.test(text))) diag.realErrors.push(text)
    }
    page.on('console', (msg) => {
      if (msg.type() === 'error') push(diag.consoleErrors, msg.text())
    })
    page.on('pageerror', (err) => push(diag.pageErrors, err.message))
    await use(diag)
  },
})

/** 主视图 id（走 `#view=` 深链） */
export type MainView = 'editor' | 'diary' | 'canvas' | 'graph' | 'kb' | 'blog'

/** aux 视图（不在 hash 里，靠侧栏 / 快捷键进入） */
export type AuxView = 'welcome' | 'settings'

/**
 * 跳转到主视图（走 URL hash 深链，最稳）。
 * 深链会绕过首启欢迎页。
 */
export async function gotoView(page: Page, view: MainView, params?: Record<string, string>) {
  const qs = params ? '&' + new URLSearchParams(params).toString() : ''
  await page.goto(`/#view=${view}${qs}`)
  await waitForAppReady(page)
}

/** 跳转到 aux 视图（welcome / settings）：welcome 走默认首页，settings 走快捷键。 */
export async function gotoAuxView(page: Page, view: AuxView) {
  if (view === 'welcome') {
    await page.goto('/')
  } else {
    await page.goto('/#view=editor')
    await waitForAppReady(page)
    await page.keyboard.press('Control+4') // SIDEBAR_ORDER[3] = settings
  }
  await waitForAppReady(page)
}

/** 等待应用真正挂载完成（#aurora-root 有子节点，且开屏层已退场）。 */
export async function waitForAppReady(page: Page) {
  await page.waitForFunction(
    () => {
      const root = document.getElementById('aurora-root')
      return !!root && root.childElementCount > 0
    },
    undefined,
    { timeout: 30_000 },
  )
  // 开屏层（首启才有）退场后移除；不在时立即通过
  await page
    .locator('#mc-splash')
    .waitFor({ state: 'detached', timeout: 15_000 })
    .catch(() => {})
}

/**
 * 跳过首启开屏动画（除「启动链路」专项用例外，其余用例都用它提速）。
 * 必须在 goto 之前调用（addInitScript 在导航前注入）。
 */
export async function skipSplash(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('mc-splash-seen', '1')
    } catch {
      /* ignore */
    }
  })
}

export { expect }
