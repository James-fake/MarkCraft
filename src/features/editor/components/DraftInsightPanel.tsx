/**
 * P2-5 成稿核查面板（编辑器右侧栏）
 * 基于本地启发式 analyzeDraft，给出「信源覆盖 / 绝对化 / 视角单一」提示。
 * UI 顶部标注「本地启发式 · 不上云」，遵守诚实本地处理原则。
 */
import { useMemo, useState } from 'react'
import { analyzeDraft, type DraftHint } from '../draftBlindSpot'

const TYPE_LABEL: Record<DraftHint['type'], string> = {
  source: '信源',
  claim: '表述',
  balance: '视角',
}

export interface DraftInsightPanelProps {
  content: string
}

export default function DraftInsightPanel({ content }: DraftInsightPanelProps) {
  const [expanded, setExpanded] = useState(true)

  const hints = useMemo(() => analyzeDraft(content), [content])

  return (
    <div
      className="flex flex-col min-h-0"
      style={{ borderTop: '1px solid var(--mc-border-subtle)', fontSize: 12 }}
    >
      <button
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        aria-label="切换成稿核查面板"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '8px 12px', background: 'transparent', border: 'none',
          cursor: 'pointer', color: 'var(--editor-text)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.7,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          成稿核查
          <span
            title="本地启发式分析，不上传任何内容"
            style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 0,
              color: '#34d399', background: 'rgba(52,211,153,0.12)',
              border: '1px solid rgba(52,211,153,0.35)', borderRadius: 999, padding: '1px 6px',
              textTransform: 'none',
            }}
          >
            本地启发式 · 不上云
          </span>
        </span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflow: 'auto' }}>
          {hints.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--editor-text)', opacity: 0.4, lineHeight: 1.6 }}>
              内容过短或未发现问题，继续保持。
            </div>
          ) : (
            hints.map((h, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--mc-border-subtle)',
                  background: h.severity === 'warn' ? 'rgba(251,191,36,0.06)' : 'rgba(128,128,128,0.03)',
                }}
              >
                <span
                  style={{
                    fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 2,
                    color: h.severity === 'warn' ? '#fbbf24' : '#a78bfa',
                    border: `1px solid ${h.severity === 'warn' ? 'rgba(251,191,36,0.4)' : 'rgba(167,139,250,0.4)'}`,
                    borderRadius: 999, padding: '1px 6px',
                  }}
                >
                  {TYPE_LABEL[h.type]}
                </span>
                <span style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--editor-text)', opacity: 0.85 }}>
                  {h.message}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
