import React from 'react'
import { logger } from '@utils/logger'
import { platform } from '@platform'
import { Button } from '@components/ui'
import { UiLabelsContext } from './UiLabels'
import type { UiLabels } from './UiLabels'

interface Props {
  children: React.ReactNode
  name: string
  errorTitle?: string
  retryText?: string
}

interface State {
  hasError: boolean
  error: Error | null
  componentStack?: string
}

/**
 * 模块级错误兜底。
 * 设计目标（对应诊断报告 P0 #4）：任一重型模块崩溃时不再连累整页白屏，
 * 而是展示用户友好的错误页（隐藏技术堆栈、提供「重试 / 导出日志」），
 * 且不影响其它模块正常运行。
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, componentStack: undefined }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, componentStack: undefined }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error(`ErrorBoundary:${this.props.name}`, error, errorInfo)
    this.setState({ componentStack: errorInfo.componentStack ?? undefined })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, componentStack: undefined })
  }

  private handleExportLog = (ui: UiLabels) => {
    const lines = [
      ui.errReportTitle,
      ui.errModule.replace(String.raw`{name}`, this.props.name),
      ui.errTime.replace(String.raw`{t}`, new Date().toISOString()),
      '',
      ui.errMessage.replace(String.raw`{msg}`, this.state.error?.message ?? ''),
      '',
      ui.errStack,
      this.state.error?.stack ?? '',
      '',
      ui.errComponentStack,
      this.state.componentStack ?? '',
    ]
    try {
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
      // 经平台层落盘：浏览器 = 触发下载；桌面端 = 原生保存对话框。失败静默（错误面板自身不应再抛错）
      void platform.saveBlob(blob, `markcraft-error-${Date.now()}.txt`).catch(() => {})
    } catch {
      /* 导出失败静默忽略 */
    }
  }

  render() {
    // 类组件不能用 hook：经 Consumer 读取 components/ui 自持文案（未注入时回落中文默认值）
    return (
      <UiLabelsContext.Consumer>
        {(ui) => this.renderWithLabels(ui)}
      </UiLabelsContext.Consumer>
    )
  }

  private renderWithLabels(ui: UiLabels) {
    if (this.state.hasError) {
      const title = this.props.errorTitle || ui.errTitle.replace(String.raw`{name}`, this.props.name)
      const retry = this.props.retryText || ui.retry
      return (
        <div
          role="alert"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            padding: 24,
            textAlign: 'center',
            background: 'var(--mc-bg-app, #0f172a)',
            color: 'var(--text-primary, #e5e7eb)',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--button-primary-bg, rgba(59,130,246,0.12))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--button-primary, #3b82f6)',
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            !
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-secondary, #94a3b8)',
              maxWidth: 420,
              lineHeight: 1.5,
            }}
          >
            {ui.errDesc}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <Button variant="primary" onClick={this.handleReset}>
              {retry}
            </Button>
            <Button variant="secondary" onClick={() => this.handleExportLog(ui)}>
              {ui.exportLog}
            </Button>
          </div>
          {this.state.error?.message && (
            <details
              style={{
                marginTop: 8,
                maxWidth: 560,
                textAlign: 'left',
                fontSize: 12,
                color: 'var(--text-secondary, #94a3b8)',
              }}
            >
              <summary style={{ cursor: 'pointer' }}>{ui.techDetails}</summary>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: 6, margin: 0 }}>
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
