/**
 * Electron `<webview>` 标签的 JSX 类型声明。
 *
 * 仅在 Electron 渲染进程（`webPreferences.webviewTag: true`）下可用；
 * 用于「关于 → 应用内浏览器视图」（Gitee 仓库 / Issues）。
 * 这里只声明本项目实际用到的属性/方法，避免引入 Electron 的 WebviewTag 全量类型。
 */
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string
        /** 会话分区（隔离 cookie/存储）；本项目用固定分区 */
        partition?: string
        /** 'on' 允许新窗口；本项目不开，交给外部浏览器 */
        allowpopups?: string
        useragent?: string
      }
    }
  }
}

/** `<webview>` 元素上本项目用到的方法（Electron WebviewTag 的子集） */
export interface WebviewElement extends HTMLElement {
  getURL(): string
  canGoBack(): boolean
  goBack(): void
  reload(): void
}

export {}
