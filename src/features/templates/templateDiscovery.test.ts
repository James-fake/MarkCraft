import { describe, it, expect, beforeEach } from 'vitest'
import {
  getDiscoveryEntries,
  discoverEntryById,
  acquireEntry,
  importDiscoveryFile,
  isCommunityAcquired,
  COMMUNITY_TEMPLATES,
} from './templateDiscovery'
import { BUILTIN_TEMPLATES, BUILTIN_EXAMPLES, getAllTemplates } from './templateManager'

// jsdom 的 File.text() 未实现，用 file-like 对象替代
const makeFile = (name: string, text: string) =>
  ({ name, text: async () => text }) as unknown as File

describe('templateDiscovery', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('getDiscoveryEntries 覆盖内置模板 + 范例 + 社区模板', () => {
    const entries = getDiscoveryEntries()
    expect(entries.length).toBe(
      BUILTIN_TEMPLATES.length + BUILTIN_EXAMPLES.length + COMMUNITY_TEMPLATES.length
    )
    expect(entries.some(e => e.kind === 'builtin-template')).toBe(true)
    expect(entries.some(e => e.kind === 'example')).toBe(true)
    expect(entries.some(e => e.kind === 'community')).toBe(true)
  })

  it('社区模板条目带场景与描述', () => {
    const c = discoverEntryById('community-weekly-review')
    expect(c).toBeDefined()
    expect(c!.kind).toBe('community')
    // badge 已由 kind 派生（展示文案走 t.templates.badge），数据层不再持文案
    expect(c!.scene).toBeTruthy()
    expect(c!.sceneEn).toBeTruthy()
    expect(c!.description).toBeTruthy()
    expect(c!.descriptionEn).toBeTruthy()
  })

  it('acquireEntry 一键获取社区模板：落盘到用户模板', () => {
    const before = getAllTemplates().map(t => t.id)
    expect(before).not.toContain('community-weekly-review')

    const res = acquireEntry('community-weekly-review')
    expect(res.ok).toBe(true)
    expect(res.kind).toBe('community')
    expect(res.template?.id).toBe('community-weekly-review')

    expect(getAllTemplates().map(t => t.id)).toContain('community-weekly-review')
    expect(isCommunityAcquired('community-weekly-review')).toBe(true)
  })

  it('acquireEntry 内置模板：提示可用，不重复落盘', () => {
    const res = acquireEntry('meeting')
    expect(res.ok).toBe(true)
    expect(res.kind).toBe('builtin-template')
    expect(res.template?.id).toBe('meeting')
    // 不应产生新的用户模板
    expect(getAllTemplates().filter(t => !t.isBuiltIn).some(t => t.id === 'meeting')).toBe(false)
  })

  it('acquireEntry 范例：提示可载入', () => {
    const res = acquireEntry('ex-blog-local-first')
    expect(res.ok).toBe(true)
    expect(res.kind).toBe('example')
    // 文案键：'loadReady' → 展示由 t.templates.acquireMsg 解析
    expect(res.messageKey).toBe('loadReady')
  })

  it('acquireEntry 未知 id 返回失败', () => {
    const res = acquireEntry('nope-not-exist')
    expect(res.ok).toBe(false)
  })

  it('importDiscoveryFile 导入共享模板（file-like）', async () => {
    const payload = {
      type: 'markcraft-template',
      version: 1,
      template: { id: 'shared-x', name: '共享模板X', icon: '📄', content: '# 你好' },
    }
    const file = makeFile('shared-x.markcraft-template.json', JSON.stringify(payload))
    const tmpl = await importDiscoveryFile(file)
    expect(tmpl.name).toBe('共享模板X')
    expect(getAllTemplates().map(t => t.id)).toContain(tmpl.id)
  })
})
