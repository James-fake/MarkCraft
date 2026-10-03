/**
 * 共享 UI 基元文案注入回归（第十九批续）
 * ------------------------------------------------------------
 * 契约：`components/ui` 属 L2 基础层，**禁止** import stores / locales
 * （见《MarkCraft_解耦实施方案_2026-09-17.md》§2.2 允许依赖矩阵）。
 * 因此基元文案由本目录的装配层读取语言包后注入 `UiLabelsProvider`。
 *
 * 本文件锁三件事：
 *  1. 未注入 / zh：基元回落中文默认值（不因接 Provider 而白屏或丢文案）；
 *  2. en：RealProviders 注入英文，Modal / ConfirmProvider / ErrorBoundary 三处生效；
 *  3. 分层：基元内部只有自持 context，不依赖 stores —— 由「zh 默认值仍可用」间接佐证
 *     （若基元直接读 stores，本文件的 zh 用例将不再走默认值路径）。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from '@components/ui/Modal'
import ErrorBoundary from '@components/ui/ErrorBoundary'
import { useConfirm } from '@components/ui/ConfirmProvider'
import { DEFAULT_UI_LABELS } from '@components/ui/UiLabels'
import { zh } from '@locales/zh'
import { RealProviders } from '../RealProviders'

const LANG_KEY = 'markcraft-language'

function Boom(): React.ReactElement {
  throw new Error('boom')
}

/** 触发命令式确认框（ConfirmProvider 在 RealProviders 内） */
function ConfirmTrigger() {
  const { confirm } = useConfirm()
  return (
    <button onClick={() => void confirm({ message: '确认删除？' })}>open-confirm</button>
  )
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('共享 UI 基元文案注入', () => {
  it('防漂移：components/ui 自持默认值与 locales/zh.uiLabels 逐键同值', () => {
    // 分层要求 components/ui 不可 import locales，故中文默认值只能自持一份；
    // 二者一旦漂移，未接 Provider 的场景（如独立 createRoot）会与正式界面文案不一致。
    expect(DEFAULT_UI_LABELS).toEqual(zh.uiLabels)
  })

  it('zh（默认）：Modal 关闭按钮回落中文默认值', () => {
    render(
      <RealProviders>
        <Modal isOpen onClose={() => {}} title="标题" />
      </RealProviders>,
    )
    expect(screen.getByLabelText('关闭')).toBeTruthy()
  })

  it('en：RealProviders 注入英文 —— Modal 关闭按钮变 Close', () => {
    localStorage.setItem(LANG_KEY, 'en')
    render(
      <RealProviders>
        <Modal isOpen onClose={() => {}} title="Title" />
      </RealProviders>,
    )
    expect(screen.getByLabelText('Close')).toBeTruthy()
  })

  it('en：确认对话框按钮变 OK / Cancel（调用方未传文案时走注入值）', () => {
    localStorage.setItem(LANG_KEY, 'en')
    render(
      <RealProviders>
        <ConfirmTrigger />
      </RealProviders>,
    )
    fireEvent.click(screen.getByText('open-confirm'))
    expect(screen.getByText('OK')).toBeTruthy()
    expect(screen.getByText('Cancel')).toBeTruthy()
  })

  it('en：ErrorBoundary 面板文案变英文（类组件经 Consumer 读取）', () => {
    // 故意抛错会触发 React 的错误边界日志，静音以免污染测试输出
    vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.setItem(LANG_KEY, 'en')
    render(
      <RealProviders>
        <ErrorBoundary name="TestModule">
          <Boom />
        </ErrorBoundary>
      </RealProviders>,
    )
    expect(screen.getByText(/This module hit an error/)).toBeTruthy()
    expect(screen.getByText('Retry')).toBeTruthy()
    expect(screen.getByText('Export log')).toBeTruthy()
  })
})
