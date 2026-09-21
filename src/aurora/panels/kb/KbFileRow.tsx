// 库内文件行 —— 笔记 Tab / 概览「最近活动」/ 依赖分析 三处共用。
//
// 为什么必须共用（2026-09-21 报障根因）：
//   这三处此前是**各自手写的同款 div**：同一类名 `.aurora-kb-recent__item`、
//   同样的文件图标 + 文件名 + 时间。外观靠类名共享，但**交互能力靠三份手写代码各自维护** ——
//   于是「笔记 Tab」有 onClick / role / tabIndex，「概览 · 最近活动」却是纯 div：点了毫无反应。
//   而进库默认落在「概览」Tab，用户看到的正是那份哑列表 → 表现为
//   「点击知识库中的笔记没有跳转编辑器，而是停在知识库详情页」。
//   行抽成单一组件后，**外观与交互能力绑在一起走**，不会再各自漂移。
//
// 设计约束：
//   · 只有**确有** onSelect 时才加 `.is-interactive` / role / tabIndex ——
//     绝不为纯展示行伪造可点暗示（否则又造出一个「看着可点、点了没反应」的哑行）。
//   · Enter 与 Space 都要能触发（桌面应用行内按钮的键盘惯例）。
import { Icon } from '../../icons'
import { formatKbTime } from './kbData'
import type { FileNode } from '@src/types/fileManager'

export interface KbFileRowProps {
  file: FileNode
  /** 提供后该行才成为可交互行（点击 / 回车 / 空格触发）；缺省为纯展示行 */
  onSelect?: (id: string) => void
  /** 可交互行的悬浮提示（如「在编辑器中打开」），省略时按文件名兜底 */
  hint?: string
}

export function KbFileRow({ file, onSelect, hint }: KbFileRowProps) {
  const interactive = !!onSelect
  return (
    <div
      className={`aurora-kb-recent__item${interactive ? ' is-interactive' : ''}`}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      title={interactive ? hint ?? `打开「${file.name}」` : undefined}
      onClick={interactive ? () => onSelect?.(file.id) : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect?.(file.id)
              }
            }
          : undefined
      }
    >
      <div className="aurora-kb-recent__icon"><Icon.file size={14} /></div>
      <div className="aurora-kb-recent__body">
        <div className="aurora-kb-recent__title">{file.name}</div>
        <div className="aurora-kb-recent__sub">{formatKbTime(file.updatedAt)}</div>
      </div>
    </div>
  )
}
