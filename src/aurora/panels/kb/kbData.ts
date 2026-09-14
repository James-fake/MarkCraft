/**
 * Aurora 知识库演示共享工具
 *
 * 数据层（2026-08-26 换芯）已移除 MOCK_KBS / getKbById 等写死 mock 常量，
 * 列表与详情改由真实 getKbList() / loadKb()（src/features/stores/kbStore）驱动。
 * 此处仅保留纯展示工具：封面渐变（按 id 派生）与时间格式化。
 */

// 封面渐变：复用真实 getKbGradient（D4 单一数据源，不维护平行实现）
// 视觉随真实项目色板（KB_CARD_GRADIENTS），与 KbManager 卡片一致
export { getKbGradient as coverGradient } from '@features/knowledgeBase'

export function formatKbTime(ts: number): string {
  const d = new Date(ts)
  const diff = Date.now() - ts
  if (diff < 1000 * 60 * 60) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 1000 * 60 * 60 * 24) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 1000 * 60 * 60 * 24 * 30) return `${Math.floor(diff / 86400000)} 天前`
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
