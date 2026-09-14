import React from 'react'
import { logger } from '@utils/logger'
import { Button } from '@components/ui'

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

  private handleExportLog = () => {
    const lines = [
      'MarkCraft 错误报告',
      `模块：${this.props.name}`,
      `时间：${new Date().toISOString()}`,
      '',
      `错误信息：${this.state.error?.message ?? ''}`,
      '',
      '错误堆栈：',
      this.state.error?.stack ?? '',
      '',
      '组件堆栈：',
      this.state.componentStack ?? '',
    ]
    try {
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `markcraft-error-${Date.now()}.txt`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      /* 导出失败静默忽略 */
    }
  }

  render() {
    if (this.state.hasError) {
      const title = this.props.errorTitle || `${this.props.name} 运行出错`
      const retry = this.props.retryText || '重试'
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
            该模块出现异常，但不会影响其它功能。你可以重试恢复，或导出错误日志反馈给开发者。
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <Button variant="primary" onClick={this.handleReset}>
              {retry}
            </Button>
            <Button variant="secondary" onClick={this.handleExportLog}>
              导出日志
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
              <summary style={{ cursor: 'pointer' }}>技术详情</summary>
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
