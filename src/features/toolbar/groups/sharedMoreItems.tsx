import type { MoreDropdownItem } from './MoreDropdown'
import type { Translations } from '@src/types/translations'

interface SharedMoreItemsParams {
  t: Translations
  onInsertInlineMath?: () => void
  onInsertBlockMath?: () => void
  onOpenMindmap: () => void
  onInsertFootnote?: () => void
  // 知识链接组（由 Slash 命令迁移而来，2026-08-28 触发收敛）
  onInsertWikilink?: () => void
  onInsertLinkTemplate?: () => void
  onInsertRelated?: () => void
  onInsertBackindex?: () => void
  onInsertToday?: () => void
  onInsertBacklinks?: () => void
  onOpenFrontMatter?: () => void
  onOptimizeImages?: () => void
  onOpenFile?: () => void
  onSaveAs?: () => void
  onPrint?: () => void
  onToggleAutocomplete?: () => void
  autocompleteEnabled?: boolean
  /** 打开模板选择器（Aurora 注入；传入才在更多菜单显示「使用模板」） */
  onUseTemplate?: () => void
}

/**
 * 生成两个工具栏共用的"更多菜单"项。
 * 打印、自动补全已对称加入两个工具栏。
 * 专注模式 / 打字机模式已移至设置面板和专注模式工具栏，不再在此菜单暴露。
 * 知识链接组（维基链接/参考文献模板/相关笔记/反向索引/今日笔记/反向链接列表）
 * 由 Slash 命令迁移而来，两模式共享同一组菜单项。
 */
export function buildSharedMoreItems({
  t,
  onInsertInlineMath,
  onInsertBlockMath,
  onOpenMindmap,
  onInsertFootnote,
  onInsertWikilink,
  onInsertLinkTemplate,
  onInsertRelated,
  onInsertBackindex,
  onInsertToday,
  onInsertBacklinks,
  onOpenFrontMatter,
  onOptimizeImages,
  onOpenFile,
  onSaveAs,
  onPrint,
  onToggleAutocomplete,
  autocompleteEnabled,
  onUseTemplate,
}: SharedMoreItemsParams): MoreDropdownItem[] {
  const leading: MoreDropdownItem[] = []
  if (onUseTemplate) {
    leading.push({
      label: t.toolbar.useTemplate || '使用模板',
      icon: (
        <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      action: () => onUseTemplate(),
    })
    leading.push({ separator: true, label: '', icon: <></>, action: () => {} })
  }
  return [
    ...leading,
    {
      label: t.toolbar.inlineMath || '行内公式',
      icon: <span style={{ fontSize: '12px', fontFamily: "'Fira Code', 'Consolas', monospace", fontWeight: 700 }}>ƒ(x)</span>,
      action: () => onInsertInlineMath?.(),
    },
    {
      label: t.toolbar.blockMath,
      icon: <span style={{ fontSize: '14px', fontFamily: "'Fira Code', 'Consolas', monospace", fontWeight: 700 }}>∑</span>,
      action: () => onInsertBlockMath?.(),
    },
    {
      label: t.toolbar.mindmap || '图表',
      icon: (
        <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
        </svg>
      ),
      action: onOpenMindmap,
    },
    { separator: true, label: '', icon: <></>, action: () => {} },
    {
      label: t.toolbar.footnote || '脚注',
      icon: (
        <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
      action: () => onInsertFootnote?.(),
    },
    { separator: true, label: '', icon: <></>, action: () => {} },
    // ── 知识链接组（由 Slash 命令迁移） ──
    {
      label: t.toolbar.wikilink || '维基链接',
      icon: <span style={{ fontSize: '12px', fontFamily: "'Fira Code', 'Consolas', monospace", fontWeight: 700 }}>[[ ]]</span>,
      action: () => onInsertWikilink?.(),
    },
    {
      label: t.toolbar.referenceTemplate || '参考文献模板',
      icon: (
        <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      action: () => onInsertLinkTemplate?.(),
    },
    {
      label: t.toolbar.relatedNotes || '相关笔记',
      icon: (
        <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      action: () => onInsertRelated?.(),
    },
    {
      label: t.toolbar.backindex || '反向索引',
      icon: (
        <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      ),
      action: () => onInsertBackindex?.(),
    },
    {
      label: t.toolbar.todayLink || '今日笔记',
      icon: (
        <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      action: () => onInsertToday?.(),
    },
    {
      label: t.toolbar.backlinks || '反向链接列表',
      icon: (
        <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h10M4 14h16M4 18h10" />
        </svg>
      ),
      action: () => onInsertBacklinks?.(),
    },
    { separator: true, label: '', icon: <></>, action: () => {} },
    {
      label: t.toolbar.frontMatter,
      icon: (
        <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      action: () => onOpenFrontMatter?.(),
    },
    { separator: true, label: '', icon: <></>, action: () => {} },
    {
      label: t.toolbar.optimizeImage || '优化图片',
      icon: (
        <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
      action: () => onOptimizeImages?.(),
    },
    {
      label: t.toolbar.openFile || '打开文件',
      icon: (
        <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      action: () => onOpenFile?.(),
    },
    {
      label: t.toolbar.saveAs || '另存为',
      icon: (
        <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
      ),
      action: () => onSaveAs?.(),
    },
    { separator: true, label: '', icon: <></>, action: () => {} },
    {
      label: t.toolbar.print || '打印',
      icon: (
        <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
      ),
      action: () => onPrint?.(),
    },
    {
      label: t.toolbar.autocomplete || '自动补全',
      icon: (
        <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      action: () => onToggleAutocomplete?.(),
      type: 'toggle' as const,
      checked: autocompleteEnabled,
    },
  ]
}
