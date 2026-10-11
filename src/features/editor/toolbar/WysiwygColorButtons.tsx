import { useState, useEffect, useRef, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { createPortal } from 'react-dom'
import WysiwygToolbarButton from '@features/editor/toolbar/WysiwygToolbarButton'
import useDropdownPosition from '@features/editor/toolbar/useDropdownPosition'
import { useLanguage } from '@stores/LanguageStore'
import { getShortcutLabel } from '@features/editor/toolbar/ShortcutManager'
import { useSettings } from '@stores/SettingsStore'
import { HIGHLIGHT_UI_COLORS, HIGHLIGHT_COLOR_OPTIONS, isHighlightColor, type HighlightColor } from '@features/editor/extensions/HighlightMark'
import { UNDERLINE_COLORS, UNDERLINE_COLOR_OPTIONS, isUnderlineColor } from '@features/editor/extensions/UnderlineColor'

/**
 * 高亮 / 下划线「split button」调色板（P4-3 自 WysiwygToolbar 抽离）。
 *
 * 每个按钮完全自包含：开合状态、锚点 refs、useDropdownPosition、外部点击关闭、
 * 「记住上次颜色」（SettingsStore 持久化）与选色/取消逻辑均在本文件内；
 * 主工具栏只渲染 <HighlightColorButton editor={...} /> / <UnderlineColorButton editor={...} />。
 *
 * JSX 逐字保留自原文件（含 portal 浮层的缩进）——portalOverlayBasis.test 的
 * scope 锚点（underlineMenuRef / highlightMenuRef 片区）按字面匹配本文件。
 */

export function UnderlineColorButton({ editor }: { editor: Editor | null }) {
  const { t } = useLanguage()
  const { settings, updateSetting } = useSettings()
  const [underlineDropdownOpen, setUnderlineDropdownOpen] = useState(false)
  // split button：主按钮应用「上次颜色」，右侧小箭头开调色板。锚点 = 整个包裹层（主按钮 + 箭头）。
  const underlineWrapRef = useRef<HTMLDivElement>(null)
  const underlineMenuRef = useRef<HTMLDivElement>(null)
  // 下拉面板经 createPortal 挂到 body（position:fixed）—— 若留在工具栏内会因
  // 容器 overflow:hidden 被裁掉，表现为「点下划线按钮没任何反应」（面板其实挂载了但不可见）。
  // 🚨 align:'center' = 调色板**水平居中于按钮、挂在正下方**（需求）。必须同时给 panelRef：
  // 面板实际宽 ≠ 估算值，用估算值居中会整体左偏。
  const underlinePos = useDropdownPosition(underlineDropdownOpen, underlineWrapRef, {
    align: 'center',
    panelRef: underlineMenuRef,
  })
  // 下划线默认「跟随正文」（auto）—— 与用户对「加下划线」的默认预期一致：只加线、不改字色
  const lastUnderlineColor: string = isUnderlineColor(settings.lastUnderlineColor) ? settings.lastUnderlineColor : 'auto'

  // 下划线调色板的外部点击关闭（同样须排除面板自身，否则点色块会先卸载面板）
  useEffect(() => {
    if (!underlineDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (
        underlineWrapRef.current && !underlineWrapRef.current.contains(e.target as Node) &&
        underlineMenuRef.current && !underlineMenuRef.current.contains(e.target as Node)
      ) {
        setUnderlineDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [underlineDropdownOpen])

  /** 下划线主按钮：对选区应用/切换「上次颜色」（当前已是该色则取消下划线） */
  const applyLastUnderlineColor = useCallback(() => {
    if (!editor) return
    const currentColor = editor.getAttributes('underline').color
    if (currentColor === lastUnderlineColor) {
      editor.chain().focus().unsetUnderline().run()
    } else {
      editor.chain().focus().unsetUnderline().setMark('underline', { color: lastUnderlineColor }).run()
    }
  }, [editor, lastUnderlineColor])

  /** 下划线调色板选色：应用该色并写回「上次颜色」（同一色再点 = 取消下划线） */
  const applyUnderlineColor = useCallback((color: string) => {
    if (!editor) return
    const currentColor = editor.getAttributes('underline').color
    if (currentColor === color) {
      editor.chain().focus().unsetUnderline().run()
    } else {
      editor.chain().focus().unsetUnderline().setMark('underline', { color }).run()
    }
    updateSetting('lastUnderlineColor', color)
    setUnderlineDropdownOpen(false)
  }, [editor, updateSetting])

  if (!editor) return null

  return (
    <>
      <div ref={underlineWrapRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {/* 主按钮：对选区应用/切换「上次颜色」（默认「跟随正文」） */}
        <WysiwygToolbarButton
          onClick={applyLastUnderlineColor}
          title={`${t.toolbar.underline} · ${lastUnderlineColor === 'auto' ? '跟随正文' : lastUnderlineColor} (${getShortcutLabel('format.underline') || (navigator.platform.includes('Mac') ? '⌘U' : 'Ctrl+U')})`}
          active={editor.isActive('underline')}
        >
          <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '14px', textDecoration: 'underline' }}>U</span>
            {/* 「上次颜色」指示条：auto 用正文色（currentColor），一眼看出主按钮会用什么颜色 */}
            <span
              data-ul-last={lastUnderlineColor}
              style={{
                position: 'absolute',
                left: '0px',
                right: '0px',
                bottom: '-4px',
                height: '3px',
                borderRadius: '2px',
                backgroundColor: lastUnderlineColor === 'auto'
                  ? 'currentColor'
                  : (UNDERLINE_COLORS[lastUnderlineColor] || 'currentColor'),
                pointerEvents: 'none',
              }}
            />
          </span>
        </WysiwygToolbarButton>
        {/* 调色板开关（小箭头）：点开「跟随正文 + 16 色」面板 */}
        <button
          type="button"
          onClick={() => setUnderlineDropdownOpen(v => !v)}
          title="选择下划线颜色"
          aria-label="选择下划线颜色"
          aria-haspopup="true"
          aria-expanded={underlineDropdownOpen}
          onMouseDown={(e) => e.preventDefault()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '12px',
            height: 'auto',
            alignSelf: 'stretch',
            padding: 0,
            marginLeft: '-3px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            color: 'inherit',
            opacity: 0.65,
          }}
        >
          <svg style={{ width: '8px', height: '8px' }} viewBox="0 0 10 6" fill="currentColor" aria-hidden="true">
            <path d="M0 0l5 6 5-6z" />
          </svg>
        </button>
        {underlineDropdownOpen && createPortal(
          // 锚定浮层：复用 aurora 单源基底（材质/边框/圆角/阴影/z-index 1000 全由 .aurora-dropdown 承担）。
          // portal 到 body 已脱离 #aurora-root，内部只引用全局 --mc-* token，不得用 --editor-*。
          <div ref={underlineMenuRef} className="aurora-dropdown" style={{
            position: 'fixed',
            top: `${underlinePos.top}px`,
            left: `${underlinePos.left}px`,
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 20px)',
            gap: '7px',
            padding: '8px',
          }}>
            {/* 「跟随正文」：跨满一行，避免在 8 列色块网格里显得像第 17 个色块 */}
            <div
              onClick={() => applyUnderlineColor('auto')}
              title="跟随正文颜色"
              data-ul-auto="true"
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '20px',
                cursor: 'pointer',
                paddingBottom: '5px',
                marginBottom: '2px',
                borderBottom: '1px solid var(--mc-border-subtle)',
              }}
            >
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'underline',
                color: editor.isActive('underline', { color: 'auto' }) ? 'var(--mc-accent-text)' : 'inherit',
              }}>A</span>
              <span style={{ fontSize: '11px', opacity: 0.75 }}>跟随正文</span>
            </div>
            {UNDERLINE_COLOR_OPTIONS.filter(color => color !== 'auto').map(color => (
              <div
                key={color}
                onClick={() => applyUnderlineColor(color)}
                data-ul-color={color}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: UNDERLINE_COLORS[color],
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  border: editor.isActive('underline', { color }) ? '2px solid var(--mc-accent)' : '2px solid var(--mc-border-medium)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.18)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                title={color}
              />
            ))}
          </div>,
          document.body,
        )}
      </div>
    </>
  )
}

export function HighlightColorButton({ editor }: { editor: Editor | null }) {
  const { t } = useLanguage()
  const { settings, updateSetting } = useSettings()
  const [highlightDropdownOpen, setHighlightDropdownOpen] = useState(false)
  // split button：主按钮应用「上次颜色」，右侧小箭头开调色板。锚点 = 整个包裹层（主按钮 + 箭头）。
  const highlightWrapRef = useRef<HTMLDivElement>(null)
  const highlightMenuRef = useRef<HTMLDivElement>(null)
  // 下拉面板经 createPortal 挂到 body（position:fixed）—— 若留在工具栏内会因
  // 容器 overflow:hidden 被裁掉，表现为「点高亮按钮没任何反应」（面板其实挂载了但不可见）。
  // 🚨 align:'center' = 调色板**水平居中于按钮、挂在正下方**（需求）。必须同时给 panelRef：
  // 面板实际宽 225px ≠ 估算值 180px，用估算值居中会整体左偏 ~22px。
  const highlightPos = useDropdownPosition(highlightDropdownOpen, highlightWrapRef, {
    align: 'center',
    panelRef: highlightMenuRef,
  })
  // 「记住上次颜色」：单一数据源 = SettingsStore.lastHighlightColor（持久化到 markcraft_settings）
  const lastColor: HighlightColor = isHighlightColor(settings.lastHighlightColor) ? settings.lastHighlightColor : 'yellow'

  // Close highlight dropdown on outside click (must also exclude the panel itself,
  // otherwise clicking a color swatch unmounts the panel before its onClick fires)
  useEffect(() => {
    if (!highlightDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (
        highlightWrapRef.current && !highlightWrapRef.current.contains(e.target as Node) &&
        highlightMenuRef.current && !highlightMenuRef.current.contains(e.target as Node)
      ) {
        setHighlightDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [highlightDropdownOpen])

  /** 主按钮：对选区应用/切换「上次颜色」（选区当前已是该色则取消） */
  const applyLastHighlightColor = useCallback(() => {
    if (!editor) return
    const currentColor = editor.getAttributes('highlight').color
    if (currentColor === lastColor) {
      editor.chain().focus().unsetHighlight().run()
    } else {
      editor.chain().focus().unsetHighlight().setHighlight({ color: lastColor }).run()
    }
  }, [editor, lastColor])

  /** 调色板选色：应用该色并写回「上次颜色」（同一色再点 = 取消高亮） */
  const applyHighlightColor = useCallback((color: HighlightColor) => {
    if (!editor) return
    const currentColor = editor.getAttributes('highlight').color
    if (currentColor === color) {
      editor.chain().focus().unsetHighlight().run()
    } else {
      editor.chain().focus().unsetHighlight().setHighlight({ color }).run()
    }
    updateSetting('lastHighlightColor', color)
    setHighlightDropdownOpen(false)
  }, [editor, updateSetting])

  if (!editor) return null

  return (
    <>
      <div ref={highlightWrapRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {/* 主按钮：对选区应用/切换「上次颜色」 */}
        <WysiwygToolbarButton
          onClick={applyLastHighlightColor}
          title={`${t.toolbar.highlight} · ${lastColor} (${getShortcutLabel('format.highlight')})`}
          active={editor.isActive('highlight')}
        >
          <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {/* 「上次颜色」指示条：主按钮会用什么颜色，一眼可见 */}
            <span
              data-hl-last={lastColor}
              style={{
                position: 'absolute',
                left: '0px',
                right: '0px',
                bottom: '-4px',
                height: '3px',
                borderRadius: '2px',
                backgroundColor: HIGHLIGHT_UI_COLORS[lastColor] || HIGHLIGHT_UI_COLORS.yellow,
                pointerEvents: 'none',
              }}
            />
          </span>
        </WysiwygToolbarButton>
        {/* 调色板开关（小箭头）：点开 16 色网格 */}
        <button
          type="button"
          onClick={() => setHighlightDropdownOpen(v => !v)}
          title="选择高亮颜色"
          aria-label="选择高亮颜色"
          aria-haspopup="true"
          aria-expanded={highlightDropdownOpen}
          onMouseDown={(e) => e.preventDefault()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '12px',
            height: 'auto',
            alignSelf: 'stretch',
            padding: 0,
            marginLeft: '-3px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            color: 'inherit',
            opacity: 0.65,
          }}
        >
          <svg style={{ width: '8px', height: '8px' }} viewBox="0 0 10 6" fill="currentColor" aria-hidden="true">
            <path d="M0 0l5 6 5-6z" />
          </svg>
        </button>
        {highlightDropdownOpen && createPortal(
          // 同上：复用 aurora 单源基底 + 全局 --mc-* token。
          <div ref={highlightMenuRef} className="aurora-dropdown" style={{
            position: 'fixed',
            top: `${highlightPos.top}px`,
            left: `${highlightPos.left}px`,
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 20px)',
            gap: '7px',
            padding: '8px',
          }}>
            {HIGHLIGHT_COLOR_OPTIONS.map(color => (
              <div
                key={color}
                onClick={() => applyHighlightColor(color)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: HIGHLIGHT_UI_COLORS[color],
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  border: editor.isActive('highlight', { color }) ? '2px solid var(--mc-accent)' : '2px solid var(--mc-border-medium)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.18)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                title={color}
              />
            ))}
          </div>,
          document.body,
        )}
      </div>
    </>
  )
}
