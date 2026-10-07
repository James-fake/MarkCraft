// P0#3 中央视图状态机（无第三方依赖，自研轻量 store）
// 单一事实来源：互斥主视图（编辑器 / 仪表盘 / 日记 / 白板 / 图谱 / 知识库 / 博客工作室）。
// 三入口（侧边栏 / 命令面板 / 快捷键）统一经 viewNav.openView 派发；
// 通过 URL hash 实现深链 + 浏览器前进/后退 + 刷新恢复。
import { useSyncExternalStore } from 'react'

export type MainView =
  | 'editor'
  | 'diary'
  | 'canvas'
  | 'graph'
  | 'kb'
  | 'blog'

export interface ViewStateShape {
  view: MainView
  params?: Record<string, string>
}

const HASH_PREFIX = '#view='
const VALID_VIEWS: MainView[] = ['editor', 'diary', 'canvas', 'graph', 'kb', 'blog']

type Listener = () => void
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((l) => l())
}

function initialView(): MainView {
  try {
    if (typeof location !== 'undefined' && location.hash.startsWith(HASH_PREFIX)) {
      const name = location.hash.slice(HASH_PREFIX.length) as MainView
      if (VALID_VIEWS.includes(name)) return name
    }
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('markcraft_blog_studio') === '1') {
      return 'blog'
    }
  } catch {
    /* ignore */
  }
  return 'editor'
}

let state: ViewStateShape = { view: initialView() }

function writeHash() {
  try {
    if (typeof location === 'undefined') return
    // 不要覆盖白板分享链接
    if (location.hash.startsWith('#canvas-share=')) return
    const next = HASH_PREFIX + state.view
    if (location.hash !== next) {
      history.pushState(null, '', next)
    }
  } catch {
    /* ignore */
  }
}

function openView(view: MainView, params?: Record<string, string>) {
  state = { view, params }
  emit()
  writeHash()
}

function closeView() {
  openView('editor')
}

function setParams(params: Record<string, string>) {
  state = { view: state.view, params: { ...state.params, ...params } }
  emit()
}

export const viewNav = {
  openView,
  closeView,
  setParams,
  getState: () => state,
  subscribe(l: Listener) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}

export function useViewState(): ViewStateShape {
  return useSyncExternalStore(viewNav.subscribe, viewNav.getState, viewNav.getState)
}

// 浏览器前进/后退 / hash 变化时，从 URL 还原视图
export function handleHashChange(): void {
  try {
    if (typeof location === 'undefined') return
    if (location.hash.startsWith(HASH_PREFIX)) {
      const name = location.hash.slice(HASH_PREFIX.length) as MainView
      if (VALID_VIEWS.includes(name) && name !== state.view) {
        state = { view: name }
        emit()
      }
    } else if (state.view !== 'editor') {
      state = { view: 'editor' }
      emit()
    }
  } catch {
    /* ignore */
  }
}
