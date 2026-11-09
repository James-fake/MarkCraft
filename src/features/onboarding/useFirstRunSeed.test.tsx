import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ReactNode } from 'react'
import { renderHook } from '@testing-library/react'
import { LanguageProvider } from '@stores/LanguageStore'
import type { FileNode } from '../../types/fileManager'
import { readSeedRecord, writeSeedRecord } from './firstRun'
import { useFirstRunSeed } from './useFirstRunSeed'

/**
 * 首启播种的三条闸门（任一不满足都不建文件）：
 * 1. 权威树已水合；2. 从未跑过；3. 用户自己还没有笔记。
 * 另外验证：老用户只落「跳过」标记，不塞文件；重复渲染不会重复播种。
 */
const wrapper = ({ children }: { children: ReactNode }) => <LanguageProvider>{children}</LanguageProvider>

const emptyRoot: FileNode = { id: 'root', name: 'root', type: 'folder', children: [] }

const rootWithUserNote: FileNode = {
  id: 'root',
  name: 'root',
  type: 'folder',
  children: [{ id: 'f1', name: '我的笔记.md', type: 'file', content: 'hi' }],
}

function run(deps: { hydrated?: boolean; rootFolder?: FileNode }) {
  const createFile = vi.fn(() => 'doc-1')
  const view = renderHook(
    () =>
      useFirstRunSeed({
        hydrated: deps.hydrated ?? true,
        rootFolder: deps.rootFolder ?? emptyRoot,
        createFile,
      }),
    { wrapper },
  )
  return { createFile, view }
}

beforeEach(() => {
  localStorage.clear()
})

describe('useFirstRunSeed', () => {
  it('空库首启：写一篇欢迎笔记，不自动打开标签', () => {
    const { createFile } = run({})
    expect(createFile).toHaveBeenCalledTimes(1)
    const [parentId, name, content, openAfterCreate] = createFile.mock.calls[0] as unknown as [
      string,
      string,
      string,
      boolean,
    ]
    expect(parentId).toBe('root')
    expect(name).toBe('欢迎使用 MarkCraft')
    expect(content).toContain('# 欢迎使用 MarkCraft')
    expect(openAfterCreate).toBe(false)
    expect(readSeedRecord()?.docId).toBe('doc-1')
  })

  it('老用户（已有笔记）：不建文件，只落「跳过」标记', () => {
    const { createFile } = run({ rootFolder: rootWithUserNote })
    expect(createFile).not.toHaveBeenCalled()
    const rec = readSeedRecord()
    expect(rec).not.toBeNull()
    expect(rec?.docId).toBe('')
  })

  it('已跑过：即使库是空的也不再播种（用户删掉欢迎笔记后不复活）', () => {
    writeSeedRecord('deleted-doc')
    const { createFile } = run({})
    expect(createFile).not.toHaveBeenCalled()
  })

  it('未水合：不写入（否则落在随后被丢弃的幽灵节点上）', () => {
    const { createFile } = run({ hydrated: false })
    expect(createFile).not.toHaveBeenCalled()
    expect(readSeedRecord()).toBeNull()
  })

  it('重复渲染不重复播种', () => {
    const { createFile, view } = run({})
    view.rerender()
    view.rerender()
    expect(createFile).toHaveBeenCalledTimes(1)
  })

  it('英文界面用英文文件名与内容', () => {
    localStorage.setItem('markcraft-language', 'en')
    const { createFile } = run({})
    const [, name, content] = createFile.mock.calls[0] as unknown as [string, string, string]
    expect(name).toBe('Welcome to MarkCraft')
    expect(content).toContain('# Welcome to MarkCraft')
  })
})
