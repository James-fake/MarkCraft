/**
 * AuroraTabs · **瞬态（预览）标签对标签栏不可见**（回归锁）
 * ============================================================================
 * 背景（用户需求 2026-09-22，第二轮）：
 *   内置「使用文档」只能从知识库点进去看，**不能变成编辑器里一个被打开 / 被记住的文档**。
 *   FileStore 把这类文件开成 `isTransient` 标签（承载 activeFileId → 内容 → 只读简介页这条链路），
 *   标签栏必须对它视而不见。
 *
 * 为什么这条过滤值得单独锁（而不是「反正简介页下工具栏根本不渲染」）：
 *   标签栏渲染与否取决于 `isUsageDoc`（EditorPanel 的条件渲染）。**万一那条判据出问题**
 *   （判定口径回退 / 文件夹改名 / 条件被误删），兜底行为只有两种可能：
 *     · 有本过滤 → 说明书顶多回到「完整编辑器」，不会被当成一个已打开的文档列在标签栏；
 *     · 无本过滤 → 写死的说明书**出现在用户的标签栏里**，且带「关闭标签 ×」——
 *       正是需求点名要禁止的「变成编辑器里一个被打开的文档」。
 *   故这里直接对 AuroraTabs 单测：**不看 EditorPanel 的条件渲染**，只看「给了含瞬态标签的
 *   store 状态，标签栏渲染出什么」。
 *
 * 同时锁住空判据：只剩瞬态标签时必须整体不渲染（否则会出现一条空标签栏，
 * 且 `if (tabs.length === 0) return null` 的原有空态判据同时失效）。
 */
import React from 'react'
import { render, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeAll } from 'vitest'
import { RealProviders } from '../../providers/RealProviders'
import { useFileManager } from '@stores/FileStore'
import { AuroraTabs } from './AuroraTabs'
import { USAGE_DOC_FOLDER, USAGE_DOC_ALL } from '@core/data/defaultDocs/usageDocs/zh'

const PLAIN_NOTE = '标签栏对照笔记.md'
const BUILTIN_NAME = USAGE_DOC_ALL[0].fileName

type FileApi = ReturnType<typeof useFileManager>
let api: FileApi | null = null
function CaptureApi() { api = useFileManager(); return null }

async function renderTabs() {
  api = null
  const r = render(
    <RealProviders>
      <CaptureApi />
      <AuroraTabs />
    </RealProviders>,
  )
  await waitFor(() => expect(api?.hydrated).toBe(true))
  return r
}

/** 打开内置使用文档首篇（→ 瞬态标签） */
async function openBuiltinDoc() {
  const docs = (api!.rootFolder.children ?? []).find((c) => c.name === USAGE_DOC_FOLDER)!
  const builtin = (docs.children ?? []).find((c) => c.type === 'file' && c.name === BUILTIN_NAME)!
  await act(async () => { api!.openFile(builtin.id) })
  return builtin.id
}

/** 打开「我的笔记」下的一篇普通笔记（→ 永久标签） */
async function openPlainNote() {
  const notes = (api!.rootFolder.children ?? []).find((c) => c.name === '我的笔记')!
  const existing = (notes.children ?? []).find((c) => c.name === PLAIN_NOTE)
  let id = existing?.id ?? ''
  if (!id) {
    await act(async () => { id = api!.createFile(notes.id, PLAIN_NOTE, '# 普通笔记\n\n正文。', false) })
  }
  await act(async () => { api!.openFile(id) })
  return id
}

describe('AuroraTabs：瞬态标签对标签栏不可见', () => {
  beforeAll(() => {
    (window as unknown as Record<string, unknown>).indexedDB = (window as unknown as Record<string, unknown>).indexedDB || {}
  })

  it('① store 里有 2 个标签（其一瞬态），标签栏只渲染那篇普通笔记', async () => {
    const { container } = await renderTabs()
    const noteId = await openPlainNote()
    const builtinId = await openBuiltinDoc()

    // 先证「store 里确实两者都在、且激活的是瞬态那篇」——否则下面的「只渲染 1 个」可能是别的原因
    expect({
      tabCount: api!.tabs.length,
      hasTransient: api!.tabs.some((t) => t.isTransient),
      activeIsBuiltin: api!.getActiveFileId(),
    }).toEqual({ tabCount: 2, hasTransient: true, activeIsBuiltin: builtinId })

    // 标签栏：只渲染普通笔记那一枚，且不含关闭该瞬态标签的入口
    const rendered = [...container.querySelectorAll('.aurora-tab')].map((e) => e.getAttribute('title'))
    expect(rendered).toEqual([PLAIN_NOTE])
    expect(container.querySelectorAll('.aurora-tab__close')).toHaveLength(1)
    expect(container.textContent ?? '').not.toContain('开始使用')
    expect(noteId).toBeTruthy()
  })

  it('② 只剩瞬态标签时：标签栏整体不渲染（不得出现空条）', async () => {
    const { container } = await renderTabs()
    await openBuiltinDoc()

    expect(api!.tabs.length).toBe(1)
    expect(api!.tabs[0].isTransient).toBe(true)
    expect(container.querySelector('.aurora-tabs')).toBeNull()
    expect(container.querySelectorAll('.aurora-tab')).toHaveLength(0)
  })

  // ★ 对照组：证明过滤是条件式的 —— 普通标签照常渲染（含关闭入口）
  it('③ 对照组 · 普通笔记：标签栏照常列出，行为与过滤前一致', async () => {
    const { container } = await renderTabs()
    await openPlainNote()

    const rendered = [...container.querySelectorAll('.aurora-tab')].map((e) => e.getAttribute('title'))
    expect(rendered).toEqual([PLAIN_NOTE])
    expect(container.querySelectorAll('.aurora-tab__close')).toHaveLength(1)
  })
})
