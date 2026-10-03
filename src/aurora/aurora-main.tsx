import { StrictMode, Component, useEffect } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
// Aurora 设计系统 Token（Aurora 自有 --mc-* 初值，含仅 Aurora 使用的 --mc-accent-bg 等）
import './styles/tokens.css'

// 桌面密度广播（应用启动即同步 html data-density，避免 Settings 面板未挂载时密度系统未生效）
// 见 P1-3：PageFrame 不再硬编码 data-density，仲裁权交给 <html>，由本 store 在模块顶层写入
import '@stores/densityStore'

// —— 真实全局样式底盘（迁移决策 D1：以真实设计系统为底盘）——
// 必须位于 Aurora 外壳 CSS 之前，使真实 token / Tailwind 工具类成为底盘；
// Aurora 外壳 CSS 在文件末尾（见下），确保 chrome 层在真实底盘之上覆盖。
// 注意 base.css 内含 @tailwind 三指令 → 激活 Tailwind，真实 feature 大量使用工具类。
import '../styles/base.css'
import '../styles/desktop-chrome.css'
import '../styles/components.css' // 真实组件工具类
import '../styles/markdown.css'
import '../styles/syntax.css'
import '../styles/mermaid.css'
import '../styles/tiptap.css'
import '../styles/scrollbar.css'
import '../styles/fonts.css'

// Aurora 外壳样式（置于真实底盘之上，保证 chrome 覆盖）
import './styles/shell.css'
// 通用组件样式
import './styles/components.css'
// 命令面板样式
import './styles/command-palette.css'
// Toast / Confirm 表面样式（Phase 1 外壳骨架）
import './styles/toast.css'
// 各面板样式
import './styles/panels/welcome.css'
import './styles/panels/editor.css'
import './styles/panels/canvas.css'
import './styles/panels/settings.css'
import './styles/panels/kb.css'
import './styles/panels/blog.css'
import './styles/panels/diary.css'

import { AuroraShell } from './app/AuroraShell'

/**
 * Aurora 独立入口
 *
 * 通过 `AuroraShell` 挂载完整桌面界面外壳（PageFrame 由各面板自带）。
 * 路由统一走真实 `viewState`（`#view=`，见 src/features/navigation/viewState），
 * 不再使用演示期 `#/route` hash 路由。
 */

// 错误边界
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error('[Aurora] 渲染崩溃:', error)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 'var(--mc-space-8)', fontFamily: 'system-ui, sans-serif', color: '#cf222e', lineHeight: 1.6 }}>
          <h2 style={{ marginTop: 0 }}>渲染出错</h2>
          <pre style={{ whiteSpace: 'pre-wrap', background: 'rgba(207,34,46,.08)', padding: 'var(--mc-space-5)', borderRadius: 'var(--mc-radius-md)', fontSize: 'var(--mc-font-base)' }}>
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * 首屏衔接：等 React 树挂载 + 首帧合成完成后，通知 index.html 内联开屏层淡出。
 * 用双 rAF 而非单次，确保「已提交」之外还「已合成一帧」，避免淡出时露出未绘制的空白。
 * 开屏层缺失（非首次启动）时静默无操作。
 */
// eslint-disable-next-line react-refresh/only-export-components -- 应用入口文件无导出属有意形态（bootstrap 挂载式），HMR 不适用
function SplashHandoff() {
  useEffect(() => {
    let r1 = 0
    let r2 = 0
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        const s = (window as unknown as { __mcSplash?: { done?: () => void } }).__mcSplash
        if (s && typeof s.done === 'function') s.done()
      })
    })
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
    }
  }, [])
  return null
}

function bootstrap() {
  const el = document.getElementById('aurora-root')
  if (!el) {
    document.body.innerHTML = '<div style="padding:24px;font-family:system-ui;color:#cf222e">找不到 #aurora-root 挂载点</div>'
    return
  }
  createRoot(el).render(
    <StrictMode>
      <ErrorBoundary>
        <SplashHandoff />
        <AuroraShell />
      </ErrorBoundary>
    </StrictMode>,
  )
}

window.addEventListener('error', (e) => {
  console.error('[Aurora] 未捕获错误:', e.error || e.message)
})
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Aurora] 未处理的 Promise 拒绝:', e.reason)
})

/**
 * 启动失败兜底：白屏诊断。
 *
 * React 的 ErrorBoundary 只能捕获「子树渲染期」错误；若失败发生在模块求值、
 * 动态 import 或 bootstrap 之前（例如 chunk 加载失败 / 依赖顶层抛错），
 * 页面会停在纯空白，用户无从判断原因。
 * 这里在启动后延迟检查挂载点：若仍是空的，则渲染一段可读的诊断信息，
 * 把真实错误（首个 window error / unhandledrejection）呈现出来，避免「白屏无解」。
 */
function installBlankScreenGuard() {
  const seen: string[] = []
  const record = (msg: unknown) => {
    const text = msg instanceof Error ? (msg.stack || msg.message) : String(msg)
    if (text && !seen.includes(text)) seen.push(text)
  }
  window.addEventListener('error', e => record(e.error || e.message))
  window.addEventListener('unhandledrejection', e => record(e.reason))

  setTimeout(() => {
    const el = document.getElementById('aurora-root')
    if (el && el.childElementCount === 0) {
      const detail = seen.length
        ? seen.slice(0, 3).join('\n\n')
        : '未捕获到具体错误。可能是资源加载失败（请检查网络/静态资源路径），或浏览器扩展拦截。'
      el.innerHTML =
        '<div style="padding:28px;font-family:system-ui,-apple-system,sans-serif;color:#cf222e;line-height:1.7">' +
        '<h2 style="margin:0 0 12px;font-size:18px">界面启动失败</h2>' +
        '<p style="margin:0 0 12px;color:#57606a">应用未能完成挂载。以下是捕获到的错误信息，可据此定位原因：</p>' +
        '<pre style="white-space:pre-wrap;background:rgba(207,34,46,.08);padding:14px;border-radius:8px;font-size:12px;overflow:auto;max-height:60vh">' +
        detail.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string)) +
        '</pre>' +
        '<button onclick="location.reload()" style="margin-top:8px;padding:8px 16px;border:1px solid #d0d7de;border-radius:6px;background:#fff;cursor:pointer;font-size:13px">重新加载</button>' +
        '</div>'
    }
  }, 4000)
}

installBlankScreenGuard()

bootstrap()
