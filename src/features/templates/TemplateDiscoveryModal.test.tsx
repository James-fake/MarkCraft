import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import TemplateDiscoveryModal from './TemplateDiscoveryModal'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { getAllTemplates } from './templateManager'

const makeFile = (name: string, text: string) =>
  ({ name, text: async () => text }) as unknown as File

function renderModal(props: Partial<React.ComponentProps<typeof TemplateDiscoveryModal>> = {}) {
  const onAcquire = vi.fn()
  const onClose = vi.fn()
  const utils = render(
    <ToastProvider>
      <TemplateDiscoveryModal isOpen onAcquire={onAcquire} onClose={onClose} {...props} />
    </ToastProvider>
  )
  return { ...utils, onAcquire, onClose }
}

describe('TemplateDiscoveryModal', () => {
  beforeEach(() => {
    localStorage.clear()
    cleanup()
  })

  it('标题与本地标识可见', () => {
    renderModal()
    expect(screen.getByText(/模板发现/)).toBeTruthy()
    expect(screen.getByText(/本地 · 非强制云/)).toBeTruthy()
  })

  it('默认展示社区模板（周复盘模板）', () => {
    renderModal()
    expect(screen.getAllByText(/周复盘模板/).length).toBeGreaterThan(0)
  })

  it('筛选「社区」只显示社区模板，隐藏内置模板', () => {
    renderModal()
    fireEvent.click(screen.getByText('社区'))
    // 内置模板「会议记录」不应出现
    expect(screen.queryByText('会议记录')).toBeNull()
    // 社区模板仍可见
    expect(screen.getAllByText(/周复盘模板/).length).toBeGreaterThan(0)
  })

  it('点击「获取」社区模板：加入我的模板', () => {
    renderModal()
    const getButtons = screen.getAllByText('获取')
    fireEvent.click(getButtons[0])
    expect(getAllTemplates().map(t => t.id)).toContain('community-weekly-review')
  })

  it('点击「载入」范例：回调收到范例内容', () => {
    const { onAcquire } = renderModal()
    const loadButtons = screen.getAllByText('载入')
    fireEvent.click(loadButtons[0])
    expect(onAcquire).toHaveBeenCalledTimes(1)
    const content = onAcquire.mock.calls[0][0] as string
    expect(content).toContain('本地优先写作')
  })

  it('导入共享模板文件触发导入', async () => {
    const { container } = renderModal()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const payload = {
      type: 'markcraft-template',
      version: 1,
      template: { id: 'shared-y', name: '共享模板Y', icon: '📄', content: '# hi' },
    }
    fireEvent.change(input, { target: { files: [makeFile('shared-y.markcraft-template.json', JSON.stringify(payload))] } })
    // 导入为异步（读取文件），等待落盘（importSharedTemplate 会生成新 id，按名称断言）
    await waitFor(() =>
      expect(getAllTemplates().some(t => t.name === '共享模板Y' && !t.isBuiltIn)).toBe(true)
    )
  })
})
