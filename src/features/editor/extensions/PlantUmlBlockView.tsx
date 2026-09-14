import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useSettings } from '@stores/SettingsStore'
import { buildPlantUmlUrl, ensurePlantUmlWrapper } from '../../shared/utils/plantumlEncoder'

type RenderState = 'idle' | 'loading' | 'ok' | 'failed'

/**
 * E3：PlantUML 图表块视图。
 *
 * 渲染策略（与预览层一致）：
 *  1. 端点可用 → 用 <img> 请求远程 SVG（img 不受 CORS 限制，公共端点最稳）。
 *  2. 加载失败 / 端点为空 → 降级为可读代码块，绝不吞掉用户内容。
 * 双击进入代码编辑，失焦或 Esc 退出。
 */
export default function PlantUmlBlockView({ node, updateAttributes, selected }: NodeViewProps) {
  const codeAttr = (node.attrs.code as string) || ''
  const { settings } = useSettings()
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(codeAttr)
  const [state, setState] = useState<RenderState>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setEditValue(codeAttr) }, [codeAttr])

  const src = buildPlantUmlUrl(ensurePlantUmlWrapper(codeAttr), settings.plantumlEndpoint)

  // 源码或端点变化时重置渲染状态
  useEffect(() => { setState(src ? 'loading' : 'failed') }, [src])

  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing])

  const enterEdit = useCallback(() => {
    setEditValue(codeAttr)
    setEditing(true)
  }, [codeAttr])

  const exitEdit = useCallback(() => {
    setEditing(false)
    updateAttributes({ code: editValue })
  }, [editValue, updateAttributes])

  const degraded = state === 'failed' || !src

  return (
    <NodeViewWrapper>
      <div
        data-type="plantUmlBlock"
        data-code={codeAttr}
        className="tiptap-plantuml-block"
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
        onDoubleClick={(e) => { e.stopPropagation(); if (!editing) enterEdit() }}
      >
        {editing ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={exitEdit}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Escape') { e.preventDefault(); exitEdit() }
            }}
            spellCheck={false}
            style={{
              width: '100%',
              minHeight: 140,
              resize: 'vertical',
              border: '1px solid var(--editor-border)',
              borderRadius: 6,
              padding: 10,
              fontFamily: 'var(--code-font-family, monospace)',
              fontSize: 13,
              lineHeight: 1.6,
              background: 'var(--editor-bg, transparent)',
              color: 'var(--editor-text, inherit)',
              outline: 'none',
            }}
          />
        ) : degraded ? (
          <div>
            <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>
              {src ? 'PlantUML 渲染失败，已降级显示源码（双击编辑）' : 'PlantUML 端点未配置，显示源码（双击编辑）'}
            </div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6 }}>
              <code>{codeAttr}</code>
            </pre>
          </div>
        ) : (
          <div style={{ textAlign: 'center', minHeight: 40 }}>
            {state === 'loading' && (
              <span style={{ fontSize: 12, opacity: 0.6 }}>🌱 Rendering...</span>
            )}
            <img
              src={src}
              alt="PlantUML diagram"
              onLoad={() => setState('ok')}
              onError={() => setState('failed')}
              style={{
                maxWidth: '100%',
                display: state === 'ok' ? 'inline-block' : 'none',
              }}
            />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}
