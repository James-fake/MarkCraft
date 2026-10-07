import { Icon } from '../../icons'
import { AuroraTabs } from './AuroraTabs'
import { EditorReturnButton } from './EditorReturnButton'
import { useLanguage } from '@stores/LanguageStore'

/**
 * Aurora 编辑器工具栏 —— 编辑视图切换（叠加式 + 所见即所得）
 *
 * 切换模型（对齐真实 EditorLayout 内核 + 用户确认的 4 态循环）：
 *   - 源码 / 预览：两个独立窗格，各自可开可关，二者同开 = 双屏（左源码、右预览）
 *   - 所见即所得：独立的 TipTap 富文本内核，与源码/预览互斥（进入即单窗格）
 *   - 切换语义（用户确认）：
 *       纯源码(A) ⇄ 纯预览(C) 独占互切；双屏(B)下点某窗格 = 收起该窗格转入独占
 *       —— 点「源码」：A→C, B→C, C→B ；点「预览」：A→C, B→A, C→A
 *     （分段控件是互斥单选，无法表达 B 这个复合态，故用两个窗格按钮 + 一个内核按钮）
 */
export interface EditorToolbarProps {
  /** 当前编辑内核：源码 / 所见即所得 */
  editorMode: 'source' | 'wysiwyg'
  /** 源码窗格是否可见 */
  sourceVisible: boolean
  /** 预览窗格是否可见 */
  previewVisible: boolean
  /** 切换源码窗格（含独占互切 / 双屏中转语义） */
  onToggleSource: () => void
  /** 切换预览窗格（含独占互切 / 双屏中转语义） */
  onTogglePreview: () => void
  /** 切换编辑内核：源码 / 所见即所得 */
  onToggleWysiwyg: () => void
  /** 标签右键菜单「发布为博客」：传入目标文件 fileId，接回真实发布闭环 */
  onPublishFile?: (fileId: string) => void
  /** 标签右键菜单「加入知识库」：传入目标文件 fileId，接回真实 KB 串联 */
  onAddToKbFile?: (fileId: string) => void
  /**
   * 返回来源（2026-09-23 用户需求）：落在**文件标签左侧**的行内首位。
   * 为空串 / undefined 时不渲染 —— 没有来源上下文就没有返回按钮。
   */
  returnLabel?: string
  /** 点返回：回跳到来源视图（规则见 EditorPanel#handleReturnToSource） */
  onReturn?: () => void
}

export function EditorToolbar({
  editorMode,
  sourceVisible,
  previewVisible,
  onToggleSource,
  onTogglePreview,
  onToggleWysiwyg,
  onPublishFile,
  onAddToKbFile,
  returnLabel,
  onReturn,
}: EditorToolbarProps) {
  const { t } = useLanguage()
  const isWysiwyg = editorMode === 'wysiwyg'
  // 高亮：源码/预览窗格各自可见即高亮（双屏时两者同亮）；所见即所得独立高亮
  const sourceActive = !isWysiwyg && sourceVisible
  const previewActive = !isWysiwyg && previewVisible
  const wysiwygActive = isWysiwyg

  return (
    <div className="aurora-toolbar aurora-editor-toolbar">
      {/* 左：多文件标签栏（并入本行，不新增一行；复用真实 FileStore tab API）
          —— 2026-09-23 用户需求：「返回来源」按钮落在**标签左侧**的行内首位。
          为什么不放进 AuroraTabs 内部：标签栏为空（无可见标签）时 AuroraTabs 会整体不渲染，
          返回按钮不能被它一起带走；放在**兄弟位**才能各自独立存亡。
          钉在行内首位也意味着标签横向滚动时它不跟着滚（对齐 VS Code 的前导动作位）。 */}
      <div className="aurora-toolbar__tabs">
        {returnLabel && onReturn && (
          <>
            <EditorReturnButton label={returnLabel} onReturn={onReturn} inline />
            <span className="aurora-editor__tabs-lead-sep" aria-hidden />
          </>
        )}
        <AuroraTabs onPublishFile={onPublishFile} onAddToKbFile={onAddToKbFile} />
      </div>

      {/* 右（最右）：视图切换 —— 两个窗格按钮（源码/预览，可叠加双屏）+ 一个内核按钮（所见即所得） */}
      <div className="aurora-toolbar__modes">
        <div className="aurora-mode-toggles" role="group" aria-label={t.editorToolbar.editorViewAria}>
          <button
            type="button"
            className={`aurora-mode-toggle ${sourceActive ? 'is-active' : ''} ${isWysiwyg ? 'is-muted' : ''}`}
            onClick={onToggleSource}
            aria-pressed={sourceActive}
            title={t.editorToolbar.viewSource}
          >
            <Icon.code size={13} />
            <span>{t.editorPanel.modeSource}</span>
          </button>
          <button
            type="button"
            className={`aurora-mode-toggle ${previewActive ? 'is-active' : ''} ${isWysiwyg ? 'is-muted' : ''}`}
            onClick={onTogglePreview}
            aria-pressed={previewActive}
            title={t.editorToolbar.viewPreview}
          >
            <Icon.eye size={13} />
            <span>{t.editorPanel.modePreview}</span>
          </button>
          <button
            type="button"
            className={`aurora-mode-toggle ${wysiwygActive ? 'is-active' : ''}`}
            onClick={onToggleWysiwyg}
            aria-pressed={wysiwygActive}
            title={t.editorToolbar.viewWysiwyg}
          >
            <Icon.edit size={13} />
            <span>{t.editorPanel.modeWysiwyg}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditorToolbar
