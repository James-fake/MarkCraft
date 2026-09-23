/**
 * Aurora 编辑器 · 「返回来源」按钮（单源）
 *
 * 2026-09-23 用户报障：「从其他功能点击笔记进入编辑界面，顶部会有一个返回按钮，
 * 现在这个位置非常的不合理，要求将它放置到文件打开标签左侧。」
 *
 * 落点由两个容器决定，**按钮本体只有这一份**（避免同款类名/文案/handler 各自漂移 ——
 * 见 kb/KbFileRow 与 kb/MiniGraph 的两次哑节点事故）：
 *   · 有标签行时（常态编辑）：并入标签行首位，落在**文件标签左侧**（`inline`）；
 *   · 无标签行时（内置《使用文档》只读简介页 / 未打开文档的空态）：
 *     退回一条只含该按钮的极简行 —— 那里它是**唯一回跳入口**，不能随版式消失。
 *
 * 语义（回跳规则在调用方 handleReturnToSource）：kb → 该库详情；其它 view + kbId → 该范围图谱；
 * 无 kbId → 该视图默认形态。点一次即清空来源（一次性）。
 */
export interface EditorReturnButtonProps {
  /** 来源显示名（如「甲知识库 · 图谱」/「双链图谱」） */
  label: string
  onReturn: () => void
  /** 行内形态：并入标签行首位（更紧凑、过长省略、悬停浮出全称） */
  inline?: boolean
}

export function EditorReturnButton({ label, onReturn, inline }: EditorReturnButtonProps) {
  const text = `返回 ${label}`
  return (
    <button
      type="button"
      className={`aurora-editor__return${inline ? ' aurora-editor__return--inline' : ''}`}
      onClick={onReturn}
      title={text}
      aria-label={text}
    >
      {/* 箭头与文字分置两个 span：文字那层才好吃 ellipsis（长库名会超出标签行预算） */}
      <span className="aurora-editor__return-arrow" aria-hidden>←</span>
      <span className="aurora-editor__return-text">{text}</span>
    </button>
  )
}

export default EditorReturnButton
