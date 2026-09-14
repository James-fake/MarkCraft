/**
 * NoteContextPanel 悬浮预览集成测试（P1-1）
 *
 * 用真实 Provider 链（FileManager + TagIndex + LinkIndex）渲染，验证：
 *  - 反链面板显示引用上下文片段（LinkRecord.context）
 *  - 悬停反链条目弹出 NoteHoverCard 预览卡
 * 不 mock LinkIndex/TagIndex（二者同 mock 有循环依赖，测试铁律）。
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import React from 'react'
import NoteContextPanel from '../NoteContextPanel'
import { LanguageProvider } from '@stores/LanguageStore'
import { ModalProvider } from '@stores/ModalStore'
import { UndoRedoProvider } from '@stores/UndoRedoStore'
import { SettingsProvider } from '@stores/SettingsStore'
import { FileManagerProvider } from '@stores/FileStore'
import { TagIndexProvider } from '@stores/TagIndexStore'
import { LinkIndexProvider } from '@stores/LinkIndexStore'
import type { FileNode } from '@src/types/fileManager'

function makeFile(id: string, name: string, content: string): FileNode {
  return { id, name, type: 'file', content, createdAt: 0, updatedAt: 0 }
}

const A = makeFile('a', 'A.md', 'A 当前笔记正文')
const B = makeFile('b', 'B.md', 'B 的正文引用了 [[A]] 这个目标')
const root: FileNode = { id: 'root', name: 'root', type: 'folder', createdAt: 0, updatedAt: 0, children: [A, B] }

function renderPanel(onOpenNote = () => {}) {
  return render(
    <LanguageProvider>
      <ModalProvider>
        <UndoRedoProvider>
          <SettingsProvider>
            <FileManagerProvider>
              <TagIndexProvider rootFolder={root}>
                <LinkIndexProvider rootFolder={root}>
                  <NoteContextPanel activeFileId="a" onOpenNote={onOpenNote} />
                </LinkIndexProvider>
              </TagIndexProvider>
            </FileManagerProvider>
          </SettingsProvider>
        </UndoRedoProvider>
      </ModalProvider>
    </LanguageProvider>
  )
}

async function waitRebuild(ms = 500) {
  await act(async () => {
    await new Promise(r => setTimeout(r, ms))
  })
}

afterEach(() => {
  cleanup()
})

describe('<NoteContextPanel /> 悬浮预览（真实 Provider）', () => {
  it('反链项显示引用上下文片段', async () => {
    renderPanel()
    await waitRebuild()
    // B 引用 A 的上下文（引用行 ±1 行）会渲染在条目内
    expect(screen.getByText(/B 的正文引用了 \[\[A\]\] 这个目标/)).toBeTruthy()
  })

  it('悬停反链条目弹出笔记预览卡', async () => {
    renderPanel()
    await waitRebuild()

    const item = screen.getByText(/↩ B/)
    fireEvent.mouseEnter(item)
    // NoteHoverCard 显示 B 的摘要内容
    expect(await screen.findByText(/B 的正文引用了/)).toBeTruthy()
  })

  it('预览卡提供打开按钮并跳转', async () => {
    const onOpen = vi.fn()
    renderPanel(onOpen)
    await waitRebuild()

    fireEvent.mouseEnter(screen.getByText(/↩ B/))
    const openBtn = await screen.findByText('打开')
    fireEvent.click(openBtn)
    expect(onOpen).toHaveBeenCalledWith('b')
  })
})
