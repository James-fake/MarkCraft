/**
 * Aurora 面板导航映射
 *
 * 把侧边栏导航项的稳定 id 映射到路由 id。
 * 用于 Aurora 面板之间的互相跳转。
 *
 * 语言无关：id 恒定（不随界面语言变化），显示文案由语言包按 id 解析。
 */

import type { SidebarGroup } from '../components/shell/Sidebar'
import type { Translations } from '@locales/zh'

export const AURORA_NAV_MAP: Record<string, string> = {
  // 欢迎页
  welcome: 'welcome',
  // 编辑器 / 笔记
  editor: 'editor',
  // 白板
  canvas: 'canvas',
  // 设置
  settings: 'settings',
  // 知识库（导航 id = knowledge，路由 id = kb）
  knowledge: 'kb',
  kb: 'kb',
  // 双链图谱
  graph: 'graph',
  // 博客
  blog: 'blog',
  // 日记
  diary: 'diary',
}

/**
 * 兼容旧的中文 label → 路由 id 映射（历史入口/搜索可能仍传中文 label）。
 * 新代码请统一传稳定 id。
 */
const LEGACY_LABEL_MAP: Record<string, string> = {
  欢迎页: 'welcome',
  笔记: 'editor',
  编辑器: 'editor',
  白板: 'canvas',
  设置: 'settings',
  知识库: 'kb',
  双链图谱: 'graph',
  知识图谱: 'graph',
  图谱: 'graph',
  博客: 'blog',
  日记: 'diary',
}

/**
 * 根据侧边栏 id（或历史中文 label）获取路由 id。
 * 找不到映射时返回原值（交由上层处理）。
 */
export function resolveAuroraNav(idOrLabel: string): string {
  return AURORA_NAV_MAP[idOrLabel] ?? LEGACY_LABEL_MAP[idOrLabel] ?? idOrLabel
}

/**
 * 书脊侧边栏导航结构（id 恒定，label 缺省为中文兜底）。
 *
 * ⚠️ 展示层请优先使用 `buildAuroraSidebarGroups(t)`（按语言解析 label / title）。
 * 本静态常量仅用于：无 Provider 的测试渲染、以及需要稳定 id 结构的场景。
 *
 * 分层：核心(编辑器)/高频(日记)常驻，差异化(博客)独立分组，辅助(白板/图谱/知识库)收进可折叠"更多"组。
 */
// 静态结构基准：仅作**语言无关**的 id / 分组 / 顺序基准，供 contract 测试对照
// `buildAuroraSidebarGroups(t)` 使用；生产渲染请走 buildAuroraSidebarGroups（label 随语言）。
// 注：原有 count 角标为写死假数字（editor:256 / diary:365 / canvas:12），与实际数据无关，
// 属误导性展示，已移除（审查 L4-2026-10-07）。
export const AURORA_SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    id: 'workspace',
    title: '工作区',
    items: [
      { id: 'welcome', icon: 'welcome', label: '欢迎页' },
      { id: 'editor', icon: 'edit', label: '编辑器' },
      { id: 'diary', icon: 'calendar', label: '日记' },
    ],
  },
  {
    id: 'publish',
    title: '发布',
    items: [
      { id: 'blog', icon: 'blog', label: '博客' },
    ],
  },
  {
    id: 'more',
    title: '更多',
    collapsible: true,
    defaultCollapsed: true,
    items: [
      { id: 'canvas', icon: 'square', label: '白板' },
      { id: 'graph', icon: 'graph', label: '双链图谱' },
      { id: 'knowledge', icon: 'knowledge', label: '知识库' },
      { id: 'settings', icon: 'settings', label: '设置' },
    ],
  },
]

/**
 * 按当前语言构建侧边栏导航分组（推荐展示层使用）。
 * id 恒定，label / title 走语言包。
 */
export function buildAuroraSidebarGroups(t: Translations): SidebarGroup[] {
  return [
    {
      id: 'workspace',
      title: t.nav.groupWorkspace,
      items: [
        { id: 'welcome', icon: 'welcome', label: t.nav.welcome },
        // 角标原为写死假数字（editor:256 / diary:365 / canvas:12），与实际数据无关，
        // 属误导性展示 —— 一律去掉；需要真实计数时再由调用方传入（审查 M4-aurora-nav）。
        { id: 'editor', icon: 'edit', label: t.nav.editor },
        { id: 'diary', icon: 'calendar', label: t.nav.diary },
      ],
    },
    {
      id: 'publish',
      title: t.nav.groupPublish,
      items: [
        { id: 'blog', icon: 'blog', label: t.nav.blog },
      ],
    },
    {
      id: 'more',
      title: t.nav.groupMore,
      collapsible: true,
      defaultCollapsed: true,
      items: [
        { id: 'canvas', icon: 'square', label: t.nav.canvas },
        { id: 'graph', icon: 'graph', label: t.nav.graph },
        { id: 'knowledge', icon: 'knowledge', label: t.nav.knowledge },
        { id: 'settings', icon: 'settings', label: t.nav.settings },
      ],
    },
  ]
}
