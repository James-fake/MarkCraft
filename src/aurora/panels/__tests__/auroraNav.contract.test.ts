import { describe, it, expect } from 'vitest'
import { AURORA_NAV_MAP, AURORA_SIDEBAR_GROUPS, resolveAuroraNav, buildAuroraSidebarGroups } from '../aurora-nav'
import type { SidebarItemProps } from '../../components/shell/SidebarItem'

/**
 * 导航契约测试（i18n 第十六批后新增）
 *
 * 背景：侧边栏导航项的「稳定 id」与「路由 id」是两套命名空间（例：导航 id = knowledge，
 * 路由 id = kb）。各面板通过 `sidebarActiveId` 传导航 id 点亮高亮，点击时通过
 * `resolveAuroraNav(id)` 解析到路由 id。二者一旦不一致，会出现「点不动 / 高亮不亮」的
 * 静默失效。本测试把这条契约钉死。
 */

function allItems(): SidebarItemProps[] {
  return AURORA_SIDEBAR_GROUPS.flatMap((g) => g.items)
}

describe('aurora-nav · 导航 id ↔ 路由 id 契约', () => {
  it('每个导航项都有稳定 id（不随语言变化）', () => {
    for (const it of allItems()) {
      expect(it.id, `导航项 ${it.label} 缺少稳定 id`).toBeTruthy()
    }
  })

  it('导航项 id 唯一', () => {
    const ids = allItems().map((it) => it.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('每个导航 id 都能解析到合法路由 id（不得原样透传）', () => {
    const validRoutes = ['welcome', 'editor', 'diary', 'canvas', 'graph', 'kb', 'blog', 'settings']
    for (const it of allItems()) {
      const route = resolveAuroraNav(it.id as string)
      expect(validRoutes, `导航 id「${it.id}」应解析到合法路由，实际「${route}」`).toContain(route)
    }
  })

  it('knowledge（导航 id）→ kb（路由 id）的关键映射', () => {
    expect(resolveAuroraNav('knowledge')).toBe('kb')
  })

  it('历史中文 label 仍可解析（向后兼容旧入口）', () => {
    expect(resolveAuroraNav('白板')).toBe('canvas')
    expect(resolveAuroraNav('知识库')).toBe('kb')
    expect(resolveAuroraNav('双链图谱')).toBe('graph')
  })

  it('未知值原样返回（交上层处理）', () => {
    expect(resolveAuroraNav('__nope__')).toBe('__nope__')
  })

  it('buildAuroraSidebarGroups(t) 产出与静态结构同 id/同顺序，仅 label 随语言变化', () => {
    const t = {
      nav: {
        groupWorkspace: 'Workspace', groupPublish: 'Publish', groupMore: 'More',
        welcome: 'Welcome', editor: 'Editor', diary: 'Diary', blog: 'Blog',
        canvas: 'Canvas', graph: 'Graph', knowledge: 'Knowledge Base', settings: 'Settings',
        mainNavAria: 'Main navigation', manageAccount: 'Manage account',
        accountHint: '{name}', expandSidebar: 'Expand', collapseSidebar: 'Collapse',
      },
      // 其余键本函数不读取
    } as unknown as Parameters<typeof buildAuroraSidebarGroups>[0]

    const built = buildAuroraSidebarGroups(t)
    expect(built.map((g) => g.id)).toEqual(AURORA_SIDEBAR_GROUPS.map((g) => g.id))
    expect(built.flatMap((g) => g.items.map((i) => i.id)))
      .toEqual(AURORA_SIDEBAR_GROUPS.flatMap((g) => g.items.map((i) => i.id)))
    // label 已按语言解析（非中文兜底）
    expect(built[0].items[0].label).toBe('Welcome')
    expect(built[2].items[1].label).toBe('Graph')
  })

  it('AURORA_NAV_MAP 值域均为合法路由 id', () => {
    const validRoutes = new Set(['welcome', 'editor', 'diary', 'canvas', 'graph', 'kb', 'blog', 'settings'])
    for (const [k, v] of Object.entries(AURORA_NAV_MAP)) {
      expect(validRoutes, `映射 ${k} → ${v} 不是合法路由`).toContain(v)
    }
  })
})
