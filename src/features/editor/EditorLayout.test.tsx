import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'

// 捕获编辑器工具栏实际使用的统一图标名，验证 emoji 已迁移至 Icon 体系
const iconNames: string[] = []
vi.mock('../../components/ui', () => ({
  Icon: (props: { name?: string }) => {
    if (props.name) iconNames.push(props.name)
    return React.createElement('svg', { 'data-icon': props.name })
  },
}))

// 隔离所有重型 store（Context/IndexedDB），仅验证工具栏图标接线
vi.mock('../../stores/LanguageStore', () => ({
  useLanguage: () => ({
    t: {
      editorMode: { source: '源码', wysiwyg: '可视化', split: '分屏' },
      previewExtra: { switchToLight: '浅色', switchToDark: '深色' },
      app: { switchToEnDesc: 'EN', switchToZhDesc: '中' },
      errorBoundary: { wysiwygError: '', sourceError: '', previewError: '', outlineError: '', retry: '' },
      editorToolbar: {
        openFileFirst: '请先打开一个文件',
        alreadyInKb: '该文件已在「{name}」中',
        addedToKb: '已加入「{name}」',
        addFailed: '加入失败，请重试',
        backToDiary: '返回日记',
        dailyNote: '今日笔记',
        addToKbTitle: '将当前文档加入知识库',
        addToKb: '加入知识库',
        selectKb: '选择知识库',
        noKbYet: '暂无知识库，请先创建',
        added: '已加入',
        versionHistory: '版本历史',
        historyShort: '版本历史',
        langSwitch: 'EN',
      },
    },
    language: 'zh',
  }),
}))
vi.mock('../../stores/UndoRedoStore', () => ({ useUndoRedo: () => ({ pushHistory: vi.fn() }) }))
vi.mock('../../stores/SettingsStore', () => ({ useSettings: () => ({ settings: { useRelativeImagePath: false } }) }))
vi.mock('../../stores/FileStore', () => ({ useFileManager: () => ({ openFile: vi.fn(), tabs: [] }) }))
vi.mock('../../stores/LinkIndexStore', () => ({ useLinkIndex: () => ({ updateFileIndex: vi.fn() }) }))
vi.mock('../../stores/useKbStore', () => ({
  useKbStore: () => ({ kbList: [], activeKb: null, addFile: vi.fn(), loadActiveKb: vi.fn() }),
}))

// 隔离双内核编辑器与预览，避免在单测中实例化 CodeMirror / TipTap
vi.mock('./TiptapEditor', () => ({ default: () => null }))
vi.mock('./CodeMirrorEditor', () => ({ default: () => null }))
vi.mock('../preview/Preview', () => ({ default: () => null }))

import { EditorLayout } from './EditorLayout'

const baseProps = {
  localContent: '',
  onChange: vi.fn(),
  renderedHtml: '',
  theme: 'dark' as const,
  language: 'zh' as const,
  onToggleTheme: vi.fn(),
  onToggleLanguage: vi.fn(),
  onSwitchEditorMode: vi.fn(),
  onTogglePreview: vi.fn(),
  onToggleSource: vi.fn(),
  onToggleFocusMode: vi.fn(),
  onToggleTypewriterMode: vi.fn(),
  onToggleAutocomplete: vi.fn(),
  onToggleLivePreview: vi.fn(),
  onContentChange: vi.fn(),
  onDeleteImage: vi.fn(),
  activeFileId: undefined,
  gridColumns: '1fr',
  showModeToolbar: true,
  editorMode: 'source' as const,
  effectiveShowSource: false,
  effectiveShowPreview: false,
  effectiveShowOutline: false,
  showSource: false,
  showPreview: false,
  focusMode: false,
  typewriterMode: false,
  autocompleteEnabled: false,
  livePreview: false,
  isDiary: true,
  onBackToDiary: vi.fn(),
  onOpenDailyNote: vi.fn(),
}

beforeEach(() => {
  iconNames.length = 0
})

describe('EditorLayout 工具栏图标统一（阶段5）', () => {
  it('模式工具栏使用统一 Icon 且无 emoji 网页痕迹', () => {
    const { container } = render(<EditorLayout {...baseProps} />)
    // 统一图标应被使用：源码/可视化/分屏/返回日记/今日笔记/加入知识库
    expect(iconNames).toContain('code')
    expect(iconNames).toContain('eye')
    expect(iconNames).toContain('split')
    expect(iconNames).toContain('arrowLeft')
    expect(iconNames).toContain('calendar')
    expect(iconNames).toContain('library')
    // 不应再出现 emoji 象形文字（📝👁📅📚↩ 等网页痕迹）
    expect(container.textContent || '').not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('点击源码按钮触发 onToggleSource 回调（工具栏交互可用）', () => {
    const onToggleSource = vi.fn()
    const { getByText } = render(<EditorLayout {...baseProps} onToggleSource={onToggleSource} />)
    fireEvent.click(getByText('源码'))
    expect(onToggleSource).toHaveBeenCalledTimes(1)
  })
})
