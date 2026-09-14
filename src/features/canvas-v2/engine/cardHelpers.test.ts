import { describe, it, expect, vi } from 'vitest'
import { getCardTitle, safeNoteName, isValidTitle, syncCardTitleToNote } from './cardHelpers'

describe('getCardTitle（卡片标题提取）', () => {
  it('取首行并去 Markdown 标题符号', () => {
    expect(getCardTitle('# 我的笔记\n\n正文')).toBe('我的笔记')
    expect(getCardTitle('## 二级标题\n正文')).toBe('二级标题')
  })

  it('去列表符/引用符/行内符号装饰', () => {
    expect(getCardTitle('- 项目标题\n正文')).toBe('项目标题')
    expect(getCardTitle('> 引用标题\n正文')).toBe('引用标题')
    expect(getCardTitle('**加粗标题**\n正文')).toBe('加粗标题')
  })

  it('截断 40 字、空串返回空', () => {
    expect(getCardTitle('x'.repeat(60))).toHaveLength(40)
    expect(getCardTitle('')).toBe('')
  })
})

describe('safeNoteName / isValidTitle', () => {
  it('非法字符转 _、空标题回退「未命名笔记」', () => {
    expect(safeNoteName('a/b:c*d?e"f<g>h|i')).toBe('a_b_c_d_e_f_g_h_i')
    expect(safeNoteName('   ')).toBe('未命名笔记')
  })

  it('「空笔记」占位视为无效标题', () => {
    expect(isValidTitle('空笔记')).toBe(false)
    expect(isValidTitle('有效标题')).toBe(true)
    expect(isValidTitle('')).toBe(false)
  })
})

describe('syncCardTitleToNote（C8 卡片标题 → 笔记文件名）', () => {
  const makeOpts = (overrides: Record<string, unknown> = {}) => {
    const renameNode = vi.fn()
    const engine = {
      getShape: (id: string) =>
        id === 's1'
          ? { props: { text: '# 新标题\n正文' } }
          : undefined,
    }
    return {
      engine,
      shapeId: 's1',
      fileId: 'f1',
      syncEnabled: true,
      startTitle: '旧标题',
      renameNode,
      ...overrides,
    }
  }

  it('syncEnabled+fileId 且标题变化 → 改名并返回 true', () => {
    const renameNode = vi.fn()
    const ok = syncCardTitleToNote(makeOpts({ renameNode }))
    expect(ok).toBe(true)
    expect(renameNode).toHaveBeenCalledWith('f1', '新标题.md')
  })

  it('syncEnabled=false 或 fileId 缺失 → 不改名', () => {
    const off = syncCardTitleToNote(makeOpts({ syncEnabled: false }))
    expect(off).toBe(false)
    const noFile = syncCardTitleToNote(makeOpts({ fileId: undefined }))
    expect(noFile).toBe(false)
  })

  it('标题未变化 → 不改名', () => {
    const ok = syncCardTitleToNote(makeOpts({ startTitle: '新标题' }))
    expect(ok).toBe(false)
  })

  it('shape 不存在或文本为空 → 不改名', () => {
    const missing = syncCardTitleToNote(makeOpts({ shapeId: 'none' }))
    expect(missing).toBe(false)
    const empty = syncCardTitleToNote(
      makeOpts({ engine: { getShape: () => ({ props: { text: '' } }) } }),
    )
    expect(empty).toBe(false)
  })
})
