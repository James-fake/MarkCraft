import { useEffect, useRef, useState, useCallback } from 'react'
import { Icon } from '../../components/ui'
import { useLanguage } from '../../stores/LanguageStore'
import { useKbStore } from '../../stores/useKbStore'
import { HistoryIcon } from './HistoryIcon'
import type { ThemeType } from '@features/themes/useTheme'

/**
 * 编辑器模式工具栏（P4-4 自 EditorLayout 拆出）：
 * 源码/所见即所得/分屏三态切换 + 返回日记/今日笔记 + 加入知识库（自持下拉）
 * + 版本历史 + 主题/语言切换。
 * KB picker 的状态闭合块（展开态、外部点击关闭、状态提示自动消失、加入处理）整体随迁——
 * 原先这些状态只被工具栏 JSX 消费，拆出后 EditorLayout 不再持有镜像状态。
 */
interface EditorModeToolbarProps {
  editorMode: 'source' | 'wysiwyg'
  showSource: boolean
  showPreview: boolean
  focusMode: boolean
  isDiary?: boolean
  language: 'zh' | 'en'
  theme: ThemeType
  activeFileId: string | undefined
  onToggleSource: () => void
  onTogglePreview: () => void
  /** 模式切换（EditorLayout#handleSwitchEditorMode：flush + 历史快照 + 150ms 过渡） */
  onSwitchEditorMode: (mode: 'source' | 'wysiwyg') => void
  onOpenDailyNote?: () => void
  onBackToDiary?: () => void
  onOpenVersionHistory?: () => void
  isVersionHistoryOpen?: boolean
  onToggleTheme: () => void
  onToggleLanguage: () => void
}

export function EditorModeToolbar({
  editorMode,
  showSource,
  showPreview,
  focusMode,
  isDiary,
  language,
  theme,
  activeFileId,
  onToggleSource,
  onTogglePreview,
  onSwitchEditorMode,
  onOpenDailyNote,
  onBackToDiary,
  onOpenVersionHistory,
  isVersionHistoryOpen,
  onToggleTheme,
  onToggleLanguage,
}: EditorModeToolbarProps) {
  const { t } = useLanguage()
  const { kbList, activeKb, addFile, loadActiveKb } = useKbStore()

  // 「加入知识库」下拉菜单
  const [showKbPicker, setShowKbPicker] = useState(false)
  const [kbPickerStatus, setKbPickerStatus] = useState<{ type: 'success' | 'info' | 'error'; msg: string } | null>(null)
  const kbPickerRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    if (!showKbPicker) return
    const handleClick = (e: MouseEvent) => {
      if (kbPickerRef.current && !kbPickerRef.current.contains(e.target as Node)) {
        setShowKbPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showKbPicker])

  // 状态提示自动消失
  useEffect(() => {
    if (!kbPickerStatus) return
    const timer = setTimeout(() => setKbPickerStatus(null), 2500)
    return () => clearTimeout(timer)
  }, [kbPickerStatus])

  // 加入知识库处理
  const handleAddToKb = useCallback(async (kbId: string, kbName: string) => {
    if (!activeFileId) {
      setKbPickerStatus({ type: 'error', msg: language === 'zh' ? '请先打开一个文件' : 'Open a file first' })
      return
    }
    // 检查是否已在当前库
    const kb = activeKb
    if (kb && kb.id === kbId && kb.fileIds.includes(activeFileId)) {
      setKbPickerStatus({ type: 'info', msg: language === 'zh' ? `该文件已在「${kbName}」中` : `Already in ${kbName}` })
      setShowKbPicker(false)
      return
    }
    try {
      await addFile(kbId, activeFileId)
      setKbPickerStatus({ type: 'success', msg: language === 'zh' ? `已加入「${kbName}」` : `Added to ${kbName}` })
    } catch (err) {
      console.error('[EditorLayout] 加入知识库失败:', err)
      setKbPickerStatus({ type: 'error', msg: language === 'zh' ? '加入失败，请重试' : 'Failed, try again' })
    }
    setShowKbPicker(false)
  }, [activeFileId, activeKb, addFile, language])

  // 切换下拉菜单时重新加载 activeKb（避免过期判断）
  const handleToggleKbPicker = useCallback(() => {
    if (!showKbPicker && activeKb) {
      void loadActiveKb(activeKb.id)
    }
    setShowKbPicker(prev => !prev)
  }, [showKbPicker, activeKb, loadActiveKb])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      padding: '4px 12px',
      backgroundColor: 'var(--editor-bg)',
      borderBottom: '1px solid var(--editor-border)',
    }}>
      {(() => {
        const isWysiwyg = editorMode === 'wysiwyg'
        // 源码/预览按钮高亮：当前处于源码模式且对应面板已显示
        const sourceActive = !isWysiwyg && showSource
        const previewActive = !isWysiwyg && showPreview
        const wysiwygActive = isWysiwyg

        const baseBtnStyle: React.CSSProperties = {
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 400,
          border: '1px solid transparent',
          backgroundColor: 'transparent',
          color: 'var(--editor-text)',
          opacity: 0.6,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }

        const activeStyle = (active: boolean): React.CSSProperties => active ? {
          fontWeight: 600,
          border: '1px solid var(--button-primary, #3b82f6)',
          backgroundColor: 'var(--mc-accent-soft)',
          color: 'var(--button-primary, #3b82f6)',
          opacity: 1,
        } : {}

        const renderBtn = (
          key: string,
          label: string,
          iconName: string,
          active: boolean,
          disabled: boolean,
          onClick: () => void,
        ) => {
          const style = { ...baseBtnStyle, ...activeStyle(active) }
          if (disabled) style.opacity = 0.3
          return (
            <button
              key={key}
              onClick={disabled ? undefined : onClick}
              disabled={disabled}
              style={style}
              onMouseEnter={(e) => { if (!active && !disabled) e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={(e) => { if (!active && !disabled) e.currentTarget.style.opacity = '0.6' }}
            >
              <Icon name={iconName} size={14} />
              {label}
            </button>
          )
        }

        return (
          <>
            {renderBtn('source', t.editorMode.source, 'code', sourceActive, false, () => {
              // WYSIWYG 模式下点击源码：先切回源码模式，再显示源码面板
              if (isWysiwyg) {
                onSwitchEditorMode('source')
                onToggleSource()
              } else {
                onToggleSource()
              }
            })}
            {renderBtn('wysiwyg', t.editorMode.wysiwyg, 'eye', wysiwygActive, false, () => {
              onSwitchEditorMode(isWysiwyg ? 'source' : 'wysiwyg')
            })}
            {renderBtn('preview', t.editorMode.split, 'split', previewActive, false, () => {
              // WYSIWYG 模式下点击预览：先切回源码模式，再显示预览面板
              if (isWysiwyg) {
                onSwitchEditorMode('source')
                onTogglePreview()
              } else {
                onTogglePreview()
              }
            })}
            <div style={{ flex: 1 }} />
            {isDiary && onBackToDiary && renderBtn('backToDiary', language === 'zh' ? '返回日记' : 'Back to Diary', 'arrowLeft', false, false, onBackToDiary)}
            {onOpenDailyNote && renderBtn('dailyNote', language === 'zh' ? '今日笔记' : 'Daily Note', 'calendar', false, false, onOpenDailyNote)}
            {/* 加入知识库按钮 + 下拉选择菜单 */}
            <div ref={kbPickerRef} style={{ position: 'relative' }}>
              <button
                onClick={handleToggleKbPicker}
                className="flex items-center gap-1 transition-all"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 400,
                  border: showKbPicker
                    ? '1px solid var(--button-primary, #3b82f6)'
                    : '1px solid transparent',
                  backgroundColor: showKbPicker
                    ? 'var(--mc-accent-soft)'
                    : 'transparent',
                  color: showKbPicker
                    ? 'var(--button-primary, #3b82f6)'
                    : 'var(--editor-text)',
                  opacity: showKbPicker ? 1 : 0.6,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { if (!showKbPicker) { e.currentTarget.style.opacity = '0.9' } }}
                onMouseLeave={(e) => { if (!showKbPicker) { e.currentTarget.style.opacity = '0.6' } }}
                title={language === 'zh' ? '将当前文档加入知识库' : 'Add to Knowledge Base'}
              >
                <Icon name="library" size={14} />
                {language === 'zh' ? '加入知识库' : 'Add to KB'}
              </button>
              {showKbPicker && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    minWidth: '220px',
                    backgroundColor: 'var(--editor-bg, #fff)',
                    border: '1px solid var(--editor-border, #e5e7eb)',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 1000,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '6px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--editor-text)',
                      opacity: 0.6,
                      borderBottom: '1px solid var(--editor-border, #e5e7eb)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {language === 'zh' ? '选择知识库' : 'Select KB'}
                  </div>
                  <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    {kbList.length === 0 ? (
                      <div
                        style={{
                          padding: '12px 10px',
                          fontSize: '12px',
                          color: 'var(--editor-text)',
                          opacity: 0.5,
                          textAlign: 'center',
                        }}
                      >
                        {language === 'zh' ? '暂无知识库，请先创建' : 'No KB yet, create one first'}
                      </div>
                    ) : (
                      kbList.map(kb => {
                        // 检查文件是否已在该库（基于 activeKb 判断仅限当前激活库，其他库需点击后判断）
                        const isCurrentActive = activeKb?.id === kb.id
                        const isAlreadyIn = isCurrentActive && activeFileId && activeKb?.fileIds.includes(activeFileId)
                        return (
                          <button
                            key={kb.id}
                            onClick={() => handleAddToKb(kb.id, kb.name)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              width: '100%',
                              padding: '8px 10px',
                              fontSize: '12px',
                              color: 'var(--editor-text)',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--mc-accent-soft)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {kb.name}
                            </span>
                            {isAlreadyIn && (
                              <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: 8, flexShrink: 0 }}>
                                {language === 'zh' ? '已加入' : 'Added'}
                              </span>
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
            {!focusMode && onOpenVersionHistory && (
              <button
                onClick={onOpenVersionHistory}
                className="flex items-center gap-1 transition-all"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 400,
                  border: isVersionHistoryOpen
                    ? '1px solid var(--button-primary, #3b82f6)'
                    : '1px solid transparent',
                  backgroundColor: isVersionHistoryOpen ? 'var(--mc-accent-soft)' : 'transparent',
                  color: 'var(--editor-text)',
                  opacity: isVersionHistoryOpen ? 1 : 0.85,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { if (!isVersionHistoryOpen) e.currentTarget.style.opacity = '1' }}
                onMouseLeave={(e) => { if (!isVersionHistoryOpen) e.currentTarget.style.opacity = '0.85' }}
                title={language === 'zh' ? '版本历史' : 'Version History'}
                aria-label={language === 'zh' ? '版本历史' : 'Version History'}
              >
                <HistoryIcon size={14} />
                {language === 'zh' ? '版本历史' : 'History'}
              </button>
            )}
            {/* 操作状态提示 */}
            {kbPickerStatus && (
              <div
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  color: kbPickerStatus.type === 'success'
                    ? '#16a34a'
                    : kbPickerStatus.type === 'error'
                      ? '#dc2626'
                      : 'var(--editor-text)',
                  backgroundColor: kbPickerStatus.type === 'success'
                    ? 'rgba(22, 163, 74, 0.1)'
                    : kbPickerStatus.type === 'error'
                      ? 'rgba(220, 38, 38, 0.1)'
                      : 'rgba(128, 128, 128, 0.1)',
                }}
              >
                {kbPickerStatus.msg}
              </div>
            )}
            <button
              onClick={onToggleTheme}
              className="flex items-center justify-center transition-colors duration-200"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid transparent',
                cursor: 'pointer',
                opacity: 0.6,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.08)'; e.currentTarget.style.opacity = '1' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.opacity = '0.6' }}
              aria-label={theme === 'dark' ? t.previewExtra.switchToLight : t.previewExtra.switchToDark}
              title={theme === 'dark' ? t.previewExtra.switchToLight : t.previewExtra.switchToDark}
            >
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fbbf24' }}>
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--mc-accent)' }}>
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <button
              onClick={onToggleLanguage}
              className="flex items-center justify-center transition-colors duration-200"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid transparent',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--editor-text)',
                opacity: 0.6,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.08)'; e.currentTarget.style.opacity = '1' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.opacity = '0.6' }}
              title={language === 'zh' ? t.app.switchToEnDesc : t.app.switchToZhDesc}
            >
              {language === 'zh' ? 'EN' : '中'}
            </button>
          </>
        )
      })()}
    </div>
  )
}
