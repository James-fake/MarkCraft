/**
 * relationInfer — 从链接上下文文本推断关系类型 id。
 *
 * ⚠️ 约束：返回值必须落在 theme/canvasTheme RELATION_TYPES 的 id 集合内
 * （'ref' | 'support' | 'refute' | 'derive' | 'relate' | 'example'），
 * 否则同步逻辑 find() 会回落到灰色「引用」，丢失语义色。
 * 历史缺陷：曾返回 'related'/'cause'/'reference'（不存在）→ 修复为 'relate'/'ref'。
 */

/** 上下文中文关键词 → 关系 id；未命中 → 'ref'（引用，灰色实线） */
export function inferRelationType(ctx: string): string {
  if (/反驳|反对|refute|但是|然而|不过|却/.test(ctx)) return 'refute'
  if (/支持|佐证|support|因为|证明|依据/.test(ctx)) return 'support'
  if (/衍生|推论|derive|因此|所以|结论/.test(ctx)) return 'derive'
  if (/相关|related|类似|参照/.test(ctx)) return 'relate'
  if (/因果|导致|cause|造成|引发/.test(ctx)) return 'ref'
  return 'ref'
}
