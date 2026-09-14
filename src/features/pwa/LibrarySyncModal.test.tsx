import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LibrarySyncModal from './LibrarySyncModal'
import { MergeResult } from './librarySync'

const makeFile = (name: string, text: string) =>
  ({ name, text: async () => text }) as unknown as File

function renderModal(overrides: Partial<React.ComponentProps<typeof LibrarySyncModal>> = {}) {
  const onExport = vi.fn()
  const onImportFile = vi.fn<[File], Promise<MergeResult>>()
    .mockResolvedValue({ merged: [], added: 1, updated: 2, skipped: 3, total: 6 })
  const onClose = vi.fn()
  render(
    <LibrarySyncModal isOpen onExport={onExport} onImportFile={onImportFile} onClose={onClose} {...overrides} />
  )
  return { onExport, onImportFile, onClose }
}

describe('LibrarySyncModal', () => {
  it('点击「导出库」触发 onExport', () => {
    const { onExport } = renderModal()
    fireEvent.click(screen.getByText(/导出库/))
    expect(onExport).toHaveBeenCalledTimes(1)
  })

  it('选择备份文件后展示合并摘要', async () => {
    const { onImportFile } = renderModal()
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [makeFile('lib.json', '{"type":"markcraft-library","files":[]}')] } })
    expect(onImportFile).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.getByText(/新增/)).toBeTruthy()
    })
    expect(screen.getByText(/1/)).toBeTruthy()
  })

  it('导入失败展示错误', async () => {
    const onImportFile = vi.fn<[File], Promise<MergeResult>>()
      .mockRejectedValue(new Error('不是有效的 MarkCraft 库备份文件'))
    renderModal({ onImportFile })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [makeFile('bad.json', 'nope')] } })
    await waitFor(() => {
      expect(screen.getByText(/不是有效的/)).toBeTruthy()
    })
  })
})
