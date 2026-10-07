/**
 * wikiLinkHoverTooltip —— 源码模式（CM6）WikiLink / 嵌入悬浮预览
 *
 * 对标 WYSIWYG 的 WikiLinkHoverPreview：在源码模式中悬停 [[note]] 或 ![[note]]
 * 时弹出 NoteHoverCard 预览卡，保证两模式交互对称。
 *
 * 实现说明：CM6 hoverTooltip 的 create() 由 CM6 管理 DOM 生命周期，脱离 React
 * Provider —— 因此这里渲染「纯展示层」NoteHoverCardView，数据由 useCM6State
 * 在 Provider 内解析好后注入（resolveData）。
 */
import { hoverTooltip } from '@codemirror/view'
import { createRoot } from 'react-dom/client'
import { NoteHoverCardView, type NoteHoverData } from '../components/NoteHoverCard'

export interface WikiLinkHoverDeps {
  /** 解析 [[target]] → 预览数据（由调用方在 React Provider 内实现） */
  resolveData: (target: string) => NoteHoverData
  /** 点击「打开」时回调（可选） */
  openFile?: (fileId: string) => void
}

/** 匹配 [[...]] 或 ![[...]]（支持 # 锚点与 | 管道语法） */
const LINK_RE = /(!?)\[\[([^\]]+)\]\]/g

/**
 * 检测文档某位置是否落在某个 [[...]] / ![[...]] 链接内。
 * 返回 { target, from, to }；不在链接内返回 null。
 */
export function matchWikiLinkAt(lineText: string, relPos: number): { target: string; from: number; to: number } | null {
  LINK_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = LINK_RE.exec(lineText)) !== null) {
    const linkStart = m.index + m[1].length
    const linkEnd = m.index + m[0].length
    // 悬停点需落在目标文本上（[[ 或 ![[ 之后），含边界
    if (relPos < linkStart + 2 || relPos > linkEnd) continue
    const target = m[2].split('|')[0].trim()
    return { target, from: m.index, to: linkEnd }
  }
  return null
}

export function createWikiLinkHoverTooltip(deps: WikiLinkHoverDeps) {
  return hoverTooltip((view, pos) => {
    const line = view.state.doc.lineAt(pos)
    const rel = pos - line.from
    const hit = matchWikiLinkAt(line.text, rel)
    if (!hit) return null

    return {
      pos: hit.from,
      end: hit.to,
      above: true,
      create: () => {
        const dom = document.createElement('div')
        const root = createRoot(dom)
        const data = deps.resolveData(hit.target)
        root.render(
          <NoteHoverCardView
            data={data}
            onOpen={deps.openFile ? (fileId) => deps.openFile!(fileId) : undefined}
          />
        )
        return {
          dom,
          destroy: () => root.unmount(),
        }
      },
    }
  })
}
