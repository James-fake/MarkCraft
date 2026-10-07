/**
 * KbExportMenu 测试 - 验证导出菜单的彩色 emoji 已替换为统一线性图标，
 * 并校验关闭与导出交互。
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { KbExportMenu } from './KbExportMenu'
import type { KnowledgeBase } from '@stores/kbTypes'
import type { FileNode } from '@src/types/fileManager'

// 隔离轻量依赖：store / portal 根 / 实际导出函数
vi.mock('../../../stores/useKbStore', () => ({
  useKbStore: () => ({ addExportRecord: vi.fn().mockResolvedValue(undefined) }),
}))
vi.mock('./kbOverlayRoot', () => ({
  getKbOverlayRoot: () => document.body,
}))
vi.mock('../export/sharePackager', () => ({
  exportKbPackage: vi.fn().mockResolvedValue(new Blob(['x'])),
}))
vi.mock('../export/staticSiteExporter', () => ({
  exportStaticSite: vi.fn().mockResolvedValue(new Blob(['x'])),
}))
vi.mock('../export/documentExporter', () => ({
  exportPdf: vi.fn().mockResolvedValue(undefined),
  exportEpub: vi.fn().mockResolvedValue(new Blob(['x'])),
  exportMarkdown: vi.fn().mockResolvedValue(new Blob(['x'])),
}))

const kb = { id: 'kb1', name: '测试知识库' } as unknown as KnowledgeBase
const files: FileNode[] = []

beforeEach(() => {
  // 清空上一测试残留的 portal 节点；jsdom 未实现下载 API，注入桩避免崩溃
  document.body.innerHTML = ''
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: vi.fn(() => 'blob:mock'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: vi.fn(),
  })
})

describe('KbExportMenu 图标统一', () => {
  it('渲染 5 个导出选项且不再使用彩色 emoji', () => {
    render(<KbExportMenu kb={kb} files={files} onClose={() => {}} />)
    expect(screen.getByText('知识库分享包')).toBeTruthy()
    expect(screen.getByText('静态站点导出')).toBeTruthy()
    expect(screen.getByText('PDF 导出')).toBeTruthy()
    expect(screen.getByText('EPUB 导出')).toBeTruthy()
    expect(screen.getByText('Markdown 合并导出')).toBeTruthy()

    const forbidden = ['📦', '🌐', '📄', '📖', '📝']
    forbidden.forEach(e => expect(document.body.textContent).not.toContain(e))
  })

  it('点击关闭按钮触发 onClose', () => {
    const onClose = vi.fn()
    render(<KbExportMenu kb={kb} files={files} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('关闭'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('点击 PDF 导出调用 exportPdf 并提示成功', async () => {
    const { exportPdf } = await import('../export/documentExporter')
    render(<KbExportMenu kb={kb} files={files} onClose={() => {}} />)
    fireEvent.click(screen.getByText('PDF 导出'))
    await waitFor(() => expect(exportPdf).toHaveBeenCalled())
    expect(screen.getByText('PDF 导出导出成功')).toBeTruthy()
  })

  it('点击知识库分享包调用 exportKbPackage 并提示成功', async () => {
    const { exportKbPackage } = await import('../export/sharePackager')
    render(<KbExportMenu kb={kb} files={files} onClose={() => {}} />)
    fireEvent.click(screen.getByText('知识库分享包'))
    await waitFor(() => expect(exportKbPackage).toHaveBeenCalled())
    expect(screen.getByText('知识库分享包导出成功')).toBeTruthy()
  })
})
