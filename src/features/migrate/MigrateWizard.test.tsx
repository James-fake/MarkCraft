/**
 * 迁移向导 · 导入同名文件不得覆盖目标文件夹已有节点（回归锁）
 * ------------------------------------------------------------
 * 背景（2026-11-08 审查 M-C-4，数据完整性）：
 *
 * `uniqueName` 只比对**本次批次**已用的名字，没有和目标文件夹**树中已有节点**比对。
 * 导入到非空文件夹时（最常见：同一份 vault 导入两次 —— 向导会再建一个同名顶层文件夹，
 * 两次导入映射到同一条磁盘路径）会产生同名兄弟节点，Vault 模式下写盘时后者静默覆盖
 * 前者，用户磁盘上的原文件内容永久丢失。
 *
 * 本文件锁死：导入前把目标文件夹现有名字预占进 used 集合 → 同名文件自动追加 ` (2)`；
 * 无冲突时文件名保持原样（守卫不误伤）。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import type { FileNode } from '../../types/fileManager'

const h = vi.hoisted(() => ({
  createFile: vi.fn(),
  createFolder: vi.fn(),
  rootFolder: null as unknown as FileNode,
  importObsidianVault: vi.fn(),
  importNotionExport: vi.fn(),
}))

vi.mock('@services/import/externalImporter', () => ({
  importObsidianVault: h.importObsidianVault,
  importNotionExport: h.importNotionExport,
}))

vi.mock('../../stores/FileStore', () => ({
  useFileManager: () => ({
    createFile: h.createFile,
    createFolder: h.createFolder,
    rootFolder: h.rootFolder,
  }),
}))

vi.mock('../../stores/LanguageStore', () => ({
  useLanguage: () => ({
    t: {
      importExternal: {},
      welcome: {
        migrateTitle: '导入已有笔记库',
        migrateDesc: '从 Obsidian / Notion 导入',
        migrateObsidian: 'Obsidian',
        migrateObsidianDesc: '导入 Obsidian 库',
        migrateNotion: 'Notion',
        migrateNotionDesc: '导入 Notion 导出包',
        migrateSelectFile: '选择文件',
        migrateSelectFileHint: '仅支持 .zip',
        migrateImporting: '导入中…',
        migrateDone: '已导入 {n} 篇到「{folder}」',
        migrateAgain: '再导入一次',
        migrateClose: '关闭',
        migrateFailed: '导入失败：{msg}',
        migratePartial: '已导入 {n} 篇到「{folder}」，{failed} 篇失败',
        migrateFolderDefault: '导入的笔记',
      },
    },
  }),
}))

import MigrateWizard from './MigrateWizard'

const T = 1700000000000

function folder(id: string, name: string, children: FileNode[] = []): FileNode {
  return { id, name, type: 'folder', children, createdAt: T, updatedAt: T }
}

function file(id: string, name: string): FileNode {
  return { id, name, type: 'file', content: '', createdAt: T, updatedAt: T }
}

/** 选源 → 选文件，走完整的向导交互 */
async function runImport(fileName: string) {
  render(<MigrateWizard isOpen onClose={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /Obsidian/ }))
  // Modal 走 portal 渲染到 document.body，不在 render 返回的 container 里
  const input = document.body.querySelector('input[type="file"]') as HTMLInputElement
  const zip = new File(['zip'], fileName, { type: 'application/zip' })
  fireEvent.change(input, { target: { files: [zip] } })
  await waitFor(() => expect(h.createFile).toHaveBeenCalled())
}

beforeEach(() => {
  h.createFile.mockReset()
  h.createFolder.mockReset().mockReturnValue('new-folder')
  h.importObsidianVault.mockReset()
  h.importNotionExport.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('MigrateWizard · 与目标文件夹已有节点去重', () => {
  it('目标文件夹已有 a.md（同名历史文件夹）→ 导入的 a.md 自动改名 a (2).md', async () => {
    // 树里已有同名文件夹 vault（上次导入留下的），里面有 a.md
    h.rootFolder = folder('root', '文件管理器', [
      folder('old-vault', 'vault', [file('old-a', 'a.md')]),
    ])
    h.importObsidianVault.mockResolvedValue({
      files: [{ name: 'a.md', path: 'a.md', content: '# 新导入的 a' }],
    })

    await runImport('vault.zip')

    // 修复前：只比对本次批次 → 直接用 'a.md' → Vault 模式覆盖磁盘上的旧 a.md
    expect(h.createFile).toHaveBeenCalledTimes(1)
    expect(h.createFile).toHaveBeenCalledWith('new-folder', 'a (2).md', '# 新导入的 a')
  })

  it('目标文件夹无同名 → 文件名保持原样（守卫不误伤）', async () => {
    h.rootFolder = folder('root', '文件管理器', [
      folder('old-vault', 'vault', [file('old-b', 'b.md')]),
    ])
    h.importObsidianVault.mockResolvedValue({
      files: [{ name: 'a.md', path: 'a.md', content: '# a' }],
    })

    await runImport('vault.zip')

    expect(h.createFile).toHaveBeenCalledWith('new-folder', 'a.md', '# a')
  })

  it('子目录里的同名文件同样与树中已有节点比对', async () => {
    h.rootFolder = folder('root', '文件管理器', [
      folder('old-vault', 'vault', [
        folder('old-sub', 'sub', [file('old-a', 'a.md')]),
      ]),
    ])
    h.createFolder.mockReturnValueOnce('new-folder').mockReturnValueOnce('new-sub')
    h.importObsidianVault.mockResolvedValue({
      files: [{ name: 'a.md', path: 'sub/a.md', content: '# 子目录 a' }],
    })

    await runImport('vault.zip')

    expect(h.createFolder).toHaveBeenCalledWith('new-folder', 'sub')
    expect(h.createFile).toHaveBeenCalledWith('new-sub', 'a (2).md', '# 子目录 a')
  })
})
