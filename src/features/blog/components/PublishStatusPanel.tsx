/**
 * P1-3 发布状态 / 系列 / 本地留痕面板
 *
 * 展示本次生成结果中文章的状态分布（草稿/待发布/已发布）、
 * 系列聚合概览，以及「发布后本地留痕」时间线（仅本地 localStorage，不上云）。
 */
import { useEffect, useMemo, useState } from 'react'
import type { BlogPost } from '../templates'
import { SectionLabel, useStudioTheme } from './StudioControls'
import { statusLabel, type PostStatus } from '../services/postStatus'
import { getPublishLog, clearPublishTrace, type PublishTraceEntry } from '../services/publishTrace'
import { useLanguage } from '@stores/LanguageStore'

const STATUS_ORDER: PostStatus[] = ['published', 'pending', 'draft']

const STATUS_COLOR: Record<PostStatus, string> = {
  published: '#34d399',
  pending: '#fbbf24',
  draft: '#94a3b8',
}

export interface PublishStatusPanelProps {
  /** 本次生成结果中的全部文章（含草稿/待发布/已发布） */
  posts?: BlogPost[]
}

export default function PublishStatusPanel({ posts }: PublishStatusPanelProps) {
  const { isDark } = useStudioTheme()
  const { t, language } = useLanguage()
  const lang = language === 'zh' ? 'zh' : 'en'
  const [trace, setTrace] = useState<PublishTraceEntry[]>([])

  // 读取本地发布留痕
  useEffect(() => {
    setTrace(getPublishLog())
  }, [posts])

  const stats = useMemo(() => {
    const counts: Record<PostStatus, number> = { published: 0, pending: 0, draft: 0 }
    const seriesMap = new Map<string, number>()
    for (const p of posts || []) {
      const s: PostStatus = p.status || 'published'
      counts[s] += 1
      if (p.series) seriesMap.set(p.series, (seriesMap.get(p.series) || 0) + 1)
    }
    const series = [...seriesMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
    return { counts, series, total: (posts || []).length }
  }, [posts])

  const muted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)'
  const faint = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)'
  const cardBg = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'

  if (!posts || posts.length === 0) return null

  return (
    <div>
      <SectionLabel>{t.blogCss.publishStatusTitle}</SectionLabel>

      {/* 状态分布 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
        {STATUS_ORDER.map(s => (
          <div
            key={s}
            style={{
              padding: '8px 6px', borderRadius: 10, background: cardBg, border: `1px solid ${cardBorder}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: STATUS_COLOR[s], fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
              {stats.counts[s]}
            </div>
            <div style={{ fontSize: 9, color: muted }}>{statusLabel(s, lang)}</div>
          </div>
        ))}
      </div>

      {/* 系列聚合概览 */}
      {stats.series.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: faint, marginBottom: 4 }}>{t.blogCss.publishSeries}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {stats.series.map(s => (
              <div
                key={s.name}
                style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 999, background: cardBg,
                  border: `1px solid ${cardBorder}`, color: muted,
                }}
                title={t.blogCss.publishSeriesItem.replace('{name}', s.name).replace('{count}', String(s.count))}
              >
                📚 {s.name} · {s.count}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 本地发布留痕 */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 10, color: faint }}>{t.blogCss.publishTrail}</div>
          {trace.length > 0 && (
            <button
              onClick={() => { clearPublishTrace(); setTrace([]) }}
              style={{
                fontSize: 9, color: faint, background: 'transparent', border: 'none',
                cursor: 'pointer', textDecoration: 'underline', padding: 0,
              }}
            >
              {t.blogCss.publishClear}
            </button>
          )}
        </div>
        {trace.length === 0 ? (
          <div style={{ fontSize: 10, color: faint, lineHeight: 1.6, padding: '4px 0' }}>
            {t.blogCss.publishEmpty}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflow: 'auto' }}>
            {trace.slice(0, 12).map(e => (
              <div
                key={e.slug}
                style={{
                  fontSize: 10, padding: '6px 8px', borderRadius: 8, background: cardBg,
                  border: `1px solid ${cardBorder}`, display: 'flex', flexDirection: 'column', gap: 2,
                }}
              >
                <div style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.title}
                </div>
                <div style={{ fontSize: 9, color: faint, fontFamily: "'JetBrains Mono', monospace" }}>
                  {new Date(e.publishedAt).toLocaleString()}
                  {e.series ? ` · 📚 ${e.series}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
