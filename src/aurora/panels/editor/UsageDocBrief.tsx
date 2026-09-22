import ErrorBoundary from '@components/ui/ErrorBoundary'
import Preview from '@features/preview/Preview'
import type { ThemeType } from '@features/themes/useTheme'
import { useLanguage } from '@stores/LanguageStore'

/**
 * 内置「使用文档」的只读简介页（2026-09-22 用户需求）
 * ==========================================================================
 * 需求原话：「点开使用文档笔记后…虽仍处于编辑区域，但需呈现为简洁的简介页面…
 *          仅保留阅读该简介内容所需的必要元素。」
 *
 * 本组件只负责**内容区**：编辑器的 chrome 裁剪（隐藏左栏文件列表、标签栏、
 * 编辑模式选择框、格式工具条、右栏检查器）由 `EditorPanel` 按 isUsageDoc 条件渲染完成
 * —— 把「裁什么」留在外壳、把「呈现什么」收在这里，两侧职责不重叠。
 *
 * 为什么复用 `features/preview/Preview`（而不是另写一份 markdown 渲染）：
 *   · 单一渲染源（D4）：它消费的正是 `useMarkdownRenderer` 产出的 HTML，
 *     与编辑器预览窗格是同一份内容、同一套排版（`.markdown-preview`），
 *     样式与代码块复制/折叠、滚动按钮等阅读辅助一并继承，不必平行维护。
 *   · HTML 已由上游产出并在此再经 DOMPurify 净化（Preview 内），不新增注入面。
 *
 * ⚠️ `Preview` 会**无条件**给正文里的图片挂「删除」按钮（`.preview-image-delete-btn`，
 *    仅在点击时才判 onDeleteImage 是否存在）。简介页是只读场景，本处**不传**
 *    onDeleteImage，并在 styles/panels/editor.css 的 `.aurora-brief` 作用域内显式隐藏该按钮
 *    —— 双保险，避免只读页里出现任何删除入口。
 */
export interface UsageDocBriefProps {
  /** `useMarkdownRenderer` 产出的 HTML */
  html: string
  theme: ThemeType
  /** 文档名（含 .md），用于无障碍标题 */
  title: string
  fileId?: string
}

export function UsageDocBrief({ html, theme, title, fileId }: UsageDocBriefProps) {
  const { t } = useLanguage()
  return (
    <div
      className="aurora-brief"
      role="article"
      aria-label={title.replace(/\.md$/i, '')}
      data-usage-doc-brief="true"
    >
      <ErrorBoundary
        name="UsageDocBrief"
        errorTitle={t.errorBoundary.previewError}
        retryText={t.errorBoundary.retry}
      >
        <Preview content={html} theme={theme} fileId={fileId} />
      </ErrorBoundary>
    </div>
  )
}

export default UsageDocBrief
