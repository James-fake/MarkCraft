import { useCallback, useEffect, useState } from 'react'
import {
  viewNav,
  useViewState,
  handleHashChange,
  type MainView,
} from '../../features/navigation/viewState'

/** 仅 demo 拥有、真实 viewState 尚未建模的两个路由（欢迎页 / 设置）。 */
export type AuxView = 'welcome' | 'settings' | null

/** 书脊顺序（保持稳定，不随侧栏分组折叠变化），用于 Ctrl+数字快捷导航。 */
const SIDEBAR_ORDER: string[] = [
  'welcome',
  'editor',
  'canvas',
  'settings',
  'kb',
  'graph',
  'blog',
  'diary',
]

const STANDARD_VIEWS: MainView[] = ['editor', 'diary', 'canvas', 'graph', 'kb', 'blog']

/**
 * AuroraShell 的核心逻辑 hook（Phase 1 "抽 App.tsx 副作用为逻辑层"的 Aurora 侧对应物）。
 *
 * 职责：
 * 1. 订阅真实 `viewState`（`#view=` 单一事实来源，决策 D3）；
 * 2. 把 Aurora 演示路由（含 welcome/settings 两个 aux 视图）收敛到 `nav()` 统一入口；
 * 3. 监听 hashchange → 同步 viewState（与真实 App.tsx 行为一致）；
 * 4. 全局快捷键：Ctrl/Cmd+K 命令面板、Ctrl/Cmd+1..9 导航、Ctrl/Cmd+, 设置。
 *
 * 注意：从 src/aurora 引入 src/features/viewState 是迁移 Phase 1 的**有意桥接**（决策 D4：
 * Aurora 改为引用真实 features），不再是审计期的隔离违规。
 */
export function useAuroraShell() {
  const { view, params } = useViewState()
  // 首启默认进入主页（欢迎面板 / Launchpad），而非编辑器；
  // 深链（#view=…）与已恢复的博客工作室状态优先于主页（对齐原 S11 首启判定，仅去掉受众选择弹层）。
  const [auxView, setAuxView] = useState<AuxView>(() => {
    try {
      if (typeof location !== 'undefined' && location.hash.startsWith('#view=')) return null
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('markcraft_blog_studio') === '1') return null
    } catch { /* ignore */ }
    return 'welcome'
  })
  const [commandOpen, setCommandOpen] = useState(false)
  /** 打开设置时需定位的分类（头像点击 → 'user'）；无则落到默认分类 */
  const [settingsInitialCategory, setSettingsInitialCategory] = useState<string | null>(null)

  // 订阅 URL hash 变化 + 浏览器前进/后退（popstate）→ viewState
  // （对齐 App.tsx App.tsx:234-243：hashchange 与 popstate 都触发深链还原）
  useEffect(() => {
    const onHash = () => {
      handleHashChange()
      // welcome / settings 是本地 aux 视图，不写入 URL hash；原实现只还原标准视图而
      // 忽略 auxView，导致在 welcome/settings 下按浏览器后退「失灵」（auxView 一直停在
      // settings / 无法退回 welcome）。审查 M4-useAuroraShell。
      // 有 #view= → 标准视图生效，清 aux；无 #view= → 回到初始 aux 默认（welcome）。
      try {
        if (typeof location === 'undefined') return
        // 白板分享链接（#canvas-share=）是独立覆盖层，不动 auxView
        if (location.hash.startsWith('#canvas-share=')) return
        setAuxView(location.hash.startsWith('#view=') ? null : 'welcome')
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('hashchange', onHash)
    window.addEventListener('popstate', onHash)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('popstate', onHash)
    }
  }, [])

  /**
   * 统一导航入口。面板侧栏/命令面板都经此函数跳转：
   * - 'welcome' / 'settings' → 仅在 Aurora 本地 aux 视图切换（真实 viewState 暂无这两个 MainView）；
   * - 其余 7 个标准视图 → 走真实 viewNav.openView（写入 `#view=` 并支持深链/前进后退）。
   */
  const nav = useCallback((id: string, param?: string) => {
    if (id === 'welcome' || id === 'settings') {
      setAuxView(id)
      // 设置视图：param 携带目标分类（如头像点击 → 'user'）；无 param 则复位到默认分类
      if (id === 'settings') setSettingsInitialCategory(param ?? null)
      return
    }
    setAuxView(null)
    if (STANDARD_VIEWS.includes(id as MainView)) {
      // param 语义随视图而定：
      // - canvas → canvasId
      // - kb → kbId
      // - blog → kbId（发布来源知识库：由知识库「发布博客」带入，博客只发布该库内笔记；
      //          无 param 时（侧栏「博客」入口 / 命令面板）博客使用文件列表中的全部笔记）
      // - graph → kbId（图谱范围知识库：由知识库「查看完整图谱」带入，双链图谱只画该库内笔记节点；
      //          无 param 时（侧栏「双链图谱」入口 / 菜单栏 / 命令面板）图谱保持全局）
      let extra: Record<string, string> | undefined
      if (param) {
        if (id === 'canvas') extra = { canvasId: param }
        else if (id === 'kb' || id === 'blog' || id === 'graph') extra = { kbId: param }
        else extra = { id: param }
      }
      viewNav.openView(id as MainView, extra)
    }
  }, [])

  // 全局快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen(true)
        return
      }
      if (mod && e.key === ',') {
        e.preventDefault()
        setAuxView('settings')
        return
      }
      if (mod && /^[1-9]$/.test(e.key)) {
        e.preventDefault()
        const target = SIDEBAR_ORDER[Number(e.key) - 1]
        if (target) nav(target)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nav])

  return { view, params, auxView, commandOpen, setCommandOpen, nav, settingsInitialCategory }
}
