import { describe, it, expect } from 'vitest'
import { inferRelationType } from './relationInfer'
import { RELATION_TYPES } from '../theme/canvasTheme'

describe('relationInfer 关系推断（对齐 RELATION_TYPES.id，修复 P1-1）', () => {
  it('五类中文语义映射到明确 id，且不再回落到不存在的 id', () => {
    expect(inferRelationType('这个观点反驳了')).toBe('refute')
    expect(inferRelationType('反对这种说法')).toBe('refute')
    expect(inferRelationType('依据如下')).toBe('support')
    expect(inferRelationType('因为天气原因')).toBe('support')
    expect(inferRelationType('因此得出结论')).toBe('derive')
    expect(inferRelationType('类似的情况')).toBe('relate')
    expect(inferRelationType('导致失败')).toBe('ref')
    expect(inferRelationType('普通句子')).toBe('ref')
  })

  it('所有推断结果都存在对应 RELATION_TYPES 条目（修复前 related/cause 不存在）', () => {
    const ids = RELATION_TYPES.map((r) => r.id)
    const samples = ['反驳', '支持', '衍生', '相关', '因果', '导致', '默认', '', 'however', 'therefore']
    for (const s of samples) {
      const id = inferRelationType(s)
      expect(ids, `ctx="${s}" → ${id}`).toContain(id)
    }
  })

  it('反驳/支撑/衍生/相关四类获得非灰语义色（引用本身为灰）', () => {
    const color = (id: string) => RELATION_TYPES.find((r) => r.id === id)?.color
    expect(color(inferRelationType('反驳'))).toBe('#EF4444')
    expect(color(inferRelationType('支持'))).toBe('#10B981')
    expect(color(inferRelationType('衍生'))).toBe('#8B5CF6')
    expect(color(inferRelationType('相关'))).toBe('#06B6D4')
  })
})
