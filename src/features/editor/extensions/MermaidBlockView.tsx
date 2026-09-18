import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useEffect, useRef, useState, useCallback } from 'react'
import mermaid from 'mermaid'
import { getCachedSvg, setCachedSvg, initMermaid } from './mermaidCache'
import { useTheme } from '@stores/ThemeStore'
import { livePreviewKey, type LivePreviewState } from './LivePreviewExtension'
import { isMindmapCode, parseMindmapCode } from './mindmap/MindmapParser'
import { locateMindmapNodes } from './mindmap/MindmapLocator'
import MindmapCanvas from './mindmap/MindmapCanvas'
import type { LayoutDirection } from './mindmap/mindmapLayout'
import { extractLayout } from '../toolbar/mindmapUtils'

/** Get layout direction from mindmap code (reads embedded direction marker) */
function getLayoutDirection(code: string): LayoutDirection {
  return extractLayout(code)
}

let renderIdCounter = 0

type EditMode = 'preview' | 'mindmap-edit' | 'code-edit'

export default function MermaidBlockView({ node, updateAttributes, selected, editor, getPos }: NodeViewProps) {
  const codeAttr = (node.attrs.code as string) || ''
  const [editMode, setEditMode] = useState<EditMode>('preview')
  const [editValue, setEditValue] = useState(codeAttr)
  const [initialEditNodeId, setInitialEditNodeId] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)
  const lpEditingRef = useRef(false)
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isVisibleRef = useRef(true)
  const lastCodeRef = useRef('')
  const lastClickTimeRef = useRef(0)
  const lastMouseDownTimeRef = useRef(0)
  const doubleClickHandledRef = useRef(false)
  const { theme } = useTheme()

  useEffect(() => { setEditValue(codeAttr) }, [codeAttr])
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  // IntersectionObserver
  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { isVisibleRef.current = entry.isIntersecting },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Live Preview
  useEffect(() => {
    const updateActive = () => {
      const lpState = livePreviewKey.getState(editor.state) as LivePreviewState | undefined
      if (!lpState || !lpState.enabled) return
      const pos = getPos()
      if (pos === null || pos === undefined) return
      const isActive = pos === lpState.activeNodePos
      if (isActive && editMode === 'preview') {
        lpEditingRef.current = true
        setEditMode(isMindmapCode(codeAttr) ? 'mindmap-edit' : 'code-edit')
        setEditValue(codeAttr)
      } else if (!isActive && editMode !== 'preview' && lpEditingRef.current) {
        lpEditingRef.current = false
        setEditMode('preview')
        updateAttributes({ code: editValue })
      }
    }
    editor.on('selectionUpdate', updateActive)
    return () => { editor.off('selectionUpdate', updateActive) }
  }, [editor, getPos, editMode, codeAttr, editValue, updateAttributes])

  // Render mermaid SVG
  useEffect(() => {
    if (editMode === 'code-edit') return
    if (!previewRef.current) return

    // Always re-render when entering mindmap-edit mode (SVG must be fresh for overlay)
    if (editMode === 'mindmap-edit') {
      lastCodeRef.current = ''
    }

    if (codeAttr === lastCodeRef.current && previewRef.current.querySelector('svg')) return

    if (!codeAttr.trim()) {
      if (mountedRef.current && previewRef.current) {
        previewRef.current.innerHTML = '<span style="opacity:0.3;font-style:italic">空图表块 - 双击编辑</span>'
      }
      return
    }

    if (renderTimerRef.current) clearTimeout(renderTimerRef.current)
    renderTimerRef.current = setTimeout(() => {
      if (!mountedRef.current || !previewRef.current || !isVisibleRef.current) return

      const cached = getCachedSvg(codeAttr)
      if (cached) {
        if (mountedRef.current && previewRef.current) {
          previewRef.current.innerHTML = cached
          lastCodeRef.current = codeAttr
        }
        return
      }

      initMermaid(theme)
      const id = `mermaid-tiptap-${++renderIdCounter}`
      let cancelled = false

      const doRender = async () => {
        try { await mermaid.parse(codeAttr) } catch {
          if (cancelled || !mountedRef.current) return
          try { (mermaid as unknown as { parseError?: unknown }).parseError = undefined } catch {}
          if (mountedRef.current && previewRef.current) {
            previewRef.current.innerHTML = `<div style="padding:0.75rem;color:#e74c3c;background:rgba(231,76,60,0.1);border-radius:0.375rem;font-size:0.8rem;"><strong>图表语法错误</strong></div>`
          }
          return
        }
        try {
          const { svg } = await mermaid.render(id, codeAttr)
          if (cancelled || !mountedRef.current) return
          if (mountedRef.current && previewRef.current) {
            previewRef.current.innerHTML = svg
            setCachedSvg(codeAttr, svg)
            lastCodeRef.current = codeAttr
          }
        } catch {
          if (cancelled || !mountedRef.current) return
          try { (mermaid as unknown as { parseError?: unknown }).parseError = undefined } catch {}
          if (mountedRef.current && previewRef.current) {
            previewRef.current.innerHTML = `<div style="padding:0.75rem;color:#e74c3c;background:rgba(231,76,60,0.1);border-radius:0.375rem;font-size:0.8rem;"><strong>图表渲染错误</strong></div>`
          }
        }
      }
      doRender()
      return () => { cancelled = true }
    }, 300)

    return () => { if (renderTimerRef.current) clearTimeout(renderTimerRef.current) }
  }, [codeAttr, editMode, theme])

  // === Double-click detection via mousedown CAPTURE phase ===
  // ProseMirror's mousedown handler fires BEFORE click events. On the second
  // mousedown of a double-click, ProseMirror steals focus to the editor and
  // sets draggable=true, which prevents our <input> from ever receiving focus.
  // By intercepting mousedown in the CAPTURE phase (before ProseMirror), we can
  // stopPropagation() + preventDefault() to block ProseMirror entirely.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleMouseDownCapture = (e: MouseEvent) => {
      if (editMode !== 'preview') return

      const now = Date.now()
      const timeSinceLast = now - lastMouseDownTimeRef.current
      lastMouseDownTimeRef.current = now

      // Double-click: second mousedown within 400ms
      if (timeSinceLast < 400 && timeSinceLast > 0) {
        lastMouseDownTimeRef.current = 0
        doubleClickHandledRef.current = true

        // CRITICAL: Stop ProseMirror from handling this mousedown.
        // This prevents focus stealing and draggable=true being set.
        e.stopPropagation()
        e.preventDefault()

        if (isMindmapCode(codeAttr)) {
          // Find which mindmap node was clicked
          let clickedNodeId: string | null = null
          const svgContainer = previewRef.current
          if (svgContainer) {
            const root = parseMindmapCode(codeAttr).root
            if (root) {
              const positions = locateMindmapNodes(svgContainer, root)
              const rect = svgContainer.getBoundingClientRect()
              const x = e.clientX - rect.left
              const y = e.clientY - rect.top

              for (const pos of positions) {
                if (x >= pos.x && x <= pos.x + pos.width &&
                    y >= pos.y && y <= pos.y + pos.height) {
                  clickedNodeId = pos.nodeId
                  break
                }
              }
            }
          }

          lpEditingRef.current = false
          setInitialEditNodeId(clickedNodeId)
          setEditMode('mindmap-edit')
          setEditValue(codeAttr)
        } else {
          lpEditingRef.current = false
          setInitialEditNodeId(null)
          setEditMode('code-edit')
          setEditValue(codeAttr)
        }
      }
    }

    // CAPTURE phase: fires before ProseMirror's bubble-phase handler
    el.addEventListener('mousedown', handleMouseDownCapture, true)
    return () => el.removeEventListener('mousedown', handleMouseDownCapture, true)
  }, [editMode, codeAttr])

  // === Double-click detection via click timing (fallback) ===
  // ProseMirror's mousedown handler sets draggable=true on atom nodes,
  // which prevents the browser's native dblclick event from firing.
  // We work around this by detecting double-clicks manually using click timestamps.
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (editMode !== 'preview') return

    // If mousedown handler already processed the double-click, skip
    if (doubleClickHandledRef.current) {
      doubleClickHandledRef.current = false
      lastClickTimeRef.current = 0
      return
    }

    const now = Date.now()
    const timeSinceLastClick = now - lastClickTimeRef.current
    lastClickTimeRef.current = now

    // Double-click detected (two clicks within 400ms)
    if (timeSinceLastClick < 400 && timeSinceLastClick > 0) {
      lastClickTimeRef.current = 0 // Reset to prevent triple-click

      if (isMindmapCode(codeAttr)) {
        // Find which mindmap node was clicked
        let clickedNodeId: string | null = null
        const svgContainer = previewRef.current
        if (svgContainer) {
          const root = parseMindmapCode(codeAttr).root
          if (root) {
            const positions = locateMindmapNodes(svgContainer, root)
            const rect = svgContainer.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top

            for (const pos of positions) {
              if (x >= pos.x && x <= pos.x + pos.width &&
                  y >= pos.y && y <= pos.y + pos.height) {
                clickedNodeId = pos.nodeId
                break
              }
            }
          }
        }

        lpEditingRef.current = false
        setInitialEditNodeId(clickedNodeId)
        setEditMode('mindmap-edit')
        setEditValue(codeAttr)
      } else {
        lpEditingRef.current = false
        setInitialEditNodeId(null)
        setEditMode('code-edit')
        setEditValue(codeAttr)
      }
    }
  }, [editMode, codeAttr])

  // === Edit mode handlers ===
  const enterMindmapEdit = useCallback(() => {
    lpEditingRef.current = false
    setInitialEditNodeId(null)
    setEditMode('mindmap-edit')
    setEditValue(codeAttr)
  }, [codeAttr])

  const enterCodeEdit = useCallback(() => {
    lpEditingRef.current = false
    setInitialEditNodeId(null)
    setEditMode('code-edit')
    setEditValue(codeAttr)
  }, [codeAttr])

  const exitEdit = useCallback(() => {
    lpEditingRef.current = false
    setInitialEditNodeId(null)
    setEditMode('preview')
    updateAttributes({ code: editValue })
  }, [editValue, updateAttributes])

  const handleCodeChange = useCallback((newCode: string) => {
    setEditValue(newCode)
    updateAttributes({ code: newCode })
  }, [updateAttributes])

  const isPreview = editMode === 'preview'
  const isMindmapEdit = editMode === 'mindmap-edit'
  const isCodeEdit = editMode === 'code-edit'
  const isMindmap = isMindmapCode(codeAttr)

  return (
    <NodeViewWrapper>
      <div
        ref={containerRef}
        data-type="mermaidBlock"
        data-code={codeAttr}
        className="tiptap-mermaid-block"
        style={{
          position: 'relative',
          margin: '0.75em 0',
          padding: '12px 16px',
          borderRadius: '8px',
          border: selected
            ? '2px solid var(--button-primary, #3b82f6)'
            : '1px solid var(--editor-border)',
          backgroundColor: 'rgba(127, 127, 127, 0.04)',
          transition: 'border-color 0.15s',
        }}
        onClick={handleClick}
      >
        {/* SVG Preview - always visible except code-edit mode */}
        {editMode !== 'code-edit' && (
          <div style={{ position: 'relative' }} data-mindmap-overlay={isMindmapEdit ? 'true' : undefined}>
            {isMindmap ? (
              <MindmapCanvas
                code={editValue}
                onUpdateCode={handleCodeChange}
                isEditing={isMindmapEdit}
                onExit={exitEdit}
                initialEditNodeId={initialEditNodeId}
                direction={getLayoutDirection(codeAttr)}
                onNodeDoubleClick={(nodeId) => {
                  setInitialEditNodeId(nodeId)
                  setEditMode('mindmap-edit')
                  setEditValue(codeAttr)
                }}
              />
            ) : (
              <div
                ref={previewRef}
                style={{
                  overflowX: 'auto',
                  padding: '4px 0',
                  display: 'flex',
                  justifyContent: 'center',
                  minHeight: '60px',
                }}
              />
            )}
          </div>
        )}

        {/* Code Edit Textarea */}
        {isCodeEdit && (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') exitEdit() }}
            autoFocus
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '8px',
              border: '1px solid var(--editor-border)',
              borderRadius: '4px',
              backgroundColor: 'var(--editor-bg)',
              color: 'var(--editor-text)',
              fontFamily: "'Fira Code', Consolas, monospace",
              fontSize: '14px',
              resize: 'vertical',
              outline: 'none',
            }}
          />
        )}

        {/* Toolbar */}
        <div style={{
          display: 'flex',
          gap: '6px',
          marginTop: '8px',
          justifyContent: isPreview ? 'flex-end' : 'flex-start',
          position: isPreview ? 'absolute' : 'relative',
          top: isPreview ? '4px' : undefined,
          right: isPreview ? '8px' : undefined,
          zIndex: 5,
        }}>
          {isPreview && !isMindmap && (
            <button onClick={enterCodeEdit} style={btnStyle}>
              编辑
            </button>
          )}
          {isMindmapEdit && null}
          {isCodeEdit && (
            <>
              <button onClick={exitEdit} style={{ ...btnStyle, backgroundColor: '#10b981' }}>完成</button>
              {isMindmap && <button onClick={enterMindmapEdit} style={btnStyle}>可视化编辑</button>}
            </>
          )}
        </div>

        {/* Preview mode label */}
        {isPreview && (
          <div style={{
            position: 'absolute', top: '4px', left: '8px',
            fontSize: '10px', opacity: 0.35, color: 'var(--editor-text)',
            pointerEvents: 'none', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {isMindmap ? 'Mindmap' : 'Mermaid'}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '4px 12px',
  fontSize: '12px',
  backgroundColor: 'var(--button-primary, #3b82f6)',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  opacity: 0.85,
}
