/**
 * Aurora 面板导航映射
 *
 * 把侧边栏的中文 label 映射到路由 id。
 * 用于 Aurora 面板之间的互相跳转。
 */

import type { SidebarGroup } from '../components/shell/Sidebar'

export const AURORA_NAV_MAP: Record<string, string> = {
  // 欢迎页
  '欢迎页': 'welcome',
  // 编辑器 / 笔记
  '笔记': 'editor',
  '编辑器': 'editor',
  // 白板
  '白板': 'canvas',
  // 设置
  '设置': 'settings',
  // 知识库
  '知识库': 'kb',
  '双链图谱': 'graph',
  '知识图谱': 'graph', // 旧名兼容别名（使用优化⑦ 改名「双链图谱」，防历史入口/搜索命中失效）
  '图谱': 'graph',
  // 博客
  '博客': 'blog',
  // 日记
  '日记': 'diary',
}

/**
 * 全局共享的书脊侧边栏导航（导航分层：核心 → 高频 → 差异化 → 辅助折叠）
 *
 * 所有功能界面统一使用这一份，确保：
 * 1. 项集一致 —— 任意面板都能切换到全部 10 个功能（不再有"缺失功能/进不去"）；
 * 2. 分层一致 —— 核心(编辑器)/高频(日记)常驻，差异化(博客)独立分组，辅助(白板/图谱/知识库)收进可折叠"更多"组；
 * 3. 标签/图标统一 —— 不再出现 笔记/编辑器、book/knowledge、globe/blog 等混乱。
 *
 * 每个面板只通过 `sidebarActiveId` 标记自己对应的项（由 PageFrame 透传给 Sidebar 高亮），
 * 点击由 `onSidebarSelect` 配合 `resolveAuroraNav(label)` 解析到路由 id。
 */
export const AURORA_SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    // 核心层（默认落地） + 高频层（日记）
    title: '工作区',
    items: [
      { icon: 'welcome', label: '欢迎页' },
      { icon: 'edit', label: '编辑器', count: 256 },
      { icon: 'calendar', label: '日记', count: 365 },
    ],
  },
  {
    // 差异化层：博客发布
    title: '发布',
    items: [
      { icon: 'blog', label: '博客' },
    ],
  },
  {
    // 辅助层：可折叠，默认收起；激活项所在组自动展开
    title: '更多',
    collapsible: true,
    defaultCollapsed: true,
    items: [
      { icon: 'square', label: '白板', count: 12 },
      { icon: 'graph', label: '双链图谱' },
      { icon: 'knowledge', label: '知识库' },
      { icon: 'settings', label: '设置' },
    ],
  },
]

/**
 * 根据侧边栏 label 获取路由 id
 * 如果找不到映射，返回原 label（交由上层处理）
 */
export function resolveAuroraNav(label: string): string {
  return AURORA_NAV_MAP[label] ?? label
}
