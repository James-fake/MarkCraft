/**
 * P1-5 本地写作辅助面板
 *
 * 常驻于编辑器右侧（大纲列内，位于 NoteContextPanel 之后），基于纯函数 writingAid
 * 提供四项实时辅助：
 *  - 标题建议（首个 # 标题 / 首行纯文本）+ slug
 *  - 大纲（ATX 标题层级列表，可点击行号定位）
 *  - 启发式润色建议（本地规则，不联网，可一键复制润色后全文）
 *  - 焦点关键词（#标签 加权 + 词频，可复制）
 *
 * 诚实本地处理原则：所有计算均在前端完成，UI 顶部显著标注「本地处理 · 不上云」，
 * 不使用任何远程 / AI / 云端服务（符合 MEMORY.md 模块坑约束）。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '@stores/LanguageStore'
import {
  extractKeywords,
  extractOutline,
  polishText,
  suggestTitleAndSlug,
} from '../writingAid'
import type { PolishReasons } from '../writingAid'

function truncate(s: string, n: number): string {
  return s && s.length > n ? `${s.slice(0, n)}…` : s || ''
}

export interface WritingAidPanelProps {
  /** 当前笔记正文（来自编辑器 localContent） */
  content: string
  /** 点击「应用」将建议标题写回编辑器 */
  onApplyTitle?: (title: string) => void
}

export default function WritingAidPanel({ content, onApplyTitle }: WritingAidPanelProps) {
  const { t } = useLanguage()
  const wa = t.writingAid
  const [expanded, setExpanded] = useState(true)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 润色理由是纯函数的形参（writingAid.ts 不触达 React 语言上下文），按语言拼好后传入
  const polishReasons: PolishReasons = {
    fillerWord: wa.reasonFillerWord,
    fillerPhrase: wa.reasonFillerPhrase,
    spaceBeforePunct: wa.reasonSpaceBeforePunct,
    repeatPunct: wa.reasonRepeatPunct,
    extraSpace: wa.reasonExtraSpace,
    doubledChar: wa.reasonDoubledChar,
  }

  const data = useMemo(() => {
    const body = content || ''
    const title = suggestTitleAndSlug(body)
    const outline = extractOutline(body)
    const polish = polishText(body, polishReasons)
    const keywords = extractKeywords(body)
    return { title, outline, polish, keywords }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- polishReasons 由 wa 六键拼成，逐键列入即可稳定
  }, [content, wa.reasonFillerWord, wa.reasonFillerPhrase, wa.reasonSpaceBeforePunct, wa.reasonRepeatPunct, wa.reasonExtraSpace, wa.reasonDoubledChar])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard?.writeText(text)
      setCopiedKey(key)
      if (timerRef.current) clearTimeout(timerRef.current)
      // 1.5s 后自动复位徽标（卸载时由 useEffect 清理定时器，避免延迟 setState 警告）
      timerRef.current = setTimeout(() => {
        setCopiedKey(prev => (prev === key ? null : prev))
      }, 1500)
    } catch {
      /* 复制失败静默降级，不阻塞写作 */
    }
  }

  const copyLabel = (key: string) => (copiedKey === key ? wa.copied : wa.copy)

  return (
    <div
      className="flex flex-col min-h-0"
      style={{ borderTop: '1px solid var(--mc-border-subtle)', fontSize: 12 }}
    >
      {/* 头部（可折叠）+ 诚实本地处理标识 */}
      <button
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        aria-label={wa.toggleAria}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '8px 12px', background: 'transparent', border: 'none',
          cursor: 'pointer', color: 'var(--editor-text)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.7,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {wa.title}
          <span
            title={wa.localOnlyTip}
            style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 0,
              color: '#34d399', background: 'rgba(52,211,153,0.12)',
              border: '1px solid rgba(52,211,153,0.35)', borderRadius: 999, padding: '1px 6px',
              textTransform: 'none',
            }}
          >
            {wa.localOnly}
          </span>
        </span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 320, overflow: 'auto' }}>

          {/* 区块 1 · 标题建议 */}
          <section aria-label={wa.titleSection}>
            <div style={{ fontSize: 10, color: 'var(--editor-text)', opacity: 0.5, marginBottom: 6 }}>
              {wa.titleSection}
            </div>
            {data.title ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 12, color: 'var(--editor-text)' }}>{data.title.title}</div>
                <div style={{ fontSize: 10, color: 'var(--editor-text)', opacity: 0.45 }}>slug: {data.title.slug}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {onApplyTitle && (
                    <button
                      onClick={() => onApplyTitle(data.title!.title)}
                      aria-label={wa.applyAria}
                      style={btnStyle}
                    >
                      {wa.apply}
                    </button>
                  )}
                  <button
                    onClick={() => copy('title', data.title!.slug)}
                    aria-label={wa.copyTitleAria}
                    style={btnStyle}
                  >
                    {copyLabel('title')}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--editor-text)', opacity: 0.4, lineHeight: 1.6 }}>
                {wa.titleEmpty}
              </div>
            )}
          </section>

          {/* 区块 2 · 大纲 */}
          <section aria-label={wa.outlineAria}>
            <div style={{ fontSize: 10, color: 'var(--editor-text)', opacity: 0.5, marginBottom: 6 }}>
              {wa.outline.replace(String.raw`{n}`, String(data.outline.length))}
            </div>
            {data.outline.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--editor-text)', opacity: 0.4 }}>
                {wa.outlineEmpty}
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {data.outline.map((it, i) => (
                  <li
                    key={`${it.line}-${i}`}
                    style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingLeft: (it.level - 1) * 12 }}
                  >
                    <span style={{ fontSize: 9, color: 'var(--editor-text)', opacity: 0.35, minWidth: 28 }}>
                      {wa.lineNum.replace(String.raw`{n}`, String(it.line))}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--editor-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {truncate(it.text, 22)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 区块 3 · 润色建议 */}
          <section aria-label={wa.polishAria}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--editor-text)', opacity: 0.5 }}>
                {wa.polish.replace(String.raw`{n}`, String(data.polish.suggestions.length))}
              </span>
              {data.polish.changed && (
                <button
                  onClick={() => copy('polish', data.polish.polished)}
                  aria-label={wa.copyPolishAria}
                  style={{ ...btnStyle, fontSize: 10, padding: '2px 8px' }}
                >
                  {copyLabel('polish')}
                </button>
              )}
            </div>
            {!data.polish.changed ? (
              <div style={{ fontSize: 11, color: 'var(--editor-text)', opacity: 0.4 }}>
                {wa.polishEmpty}
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.polish.suggestions.map((s, i) => (
                  <li key={i} style={{ fontSize: 10, lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--editor-text)', opacity: 0.55 }}>
                      {truncate(s.from, 18)} → {truncate(s.to, 18) || wa.removed}
                    </span>
                    <div style={{ color: 'var(--editor-text)', opacity: 0.4 }}>{s.reason}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 区块 4 · 焦点关键词 */}
          <section aria-label={wa.keywordAria}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--editor-text)', opacity: 0.5 }}>
                {wa.keyword.replace(String.raw`{n}`, String(data.keywords.length))}
              </span>
              {data.keywords.length > 0 && (
                <button
                  onClick={() => copy('keywords', data.keywords.map(k => k.term).join(', '))}
                  aria-label={wa.copyKeywordAria}
                  style={{ ...btnStyle, fontSize: 10, padding: '2px 8px' }}
                >
                  {copyLabel('keywords')}
                </button>
              )}
            </div>
            {data.keywords.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--editor-text)', opacity: 0.4 }}>
                {wa.keywordEmpty}
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.keywords.map(k => (
                  <span
                    key={k.term}
                    title={wa.weight.replace(String.raw`{n}`, String(k.score))}
                    style={{
                      fontSize: 10, color: 'var(--editor-text)', opacity: 0.8,
                      border: '1px solid var(--mc-border-subtle)', borderRadius: 999,
                      padding: '2px 8px',
                    }}
                  >
                    {k.term} <span style={{ opacity: 0.45 }}>×{k.score}</span>
                  </span>
                ))}
              </div>
            )}
          </section>

        </div>
      )}
    </div>
  )
}

/** 通用小按钮样式（复制 / 应用） */
const btnStyle: React.CSSProperties = {
  textAlign: 'left', padding: '4px 10px', borderRadius: 8,
  border: '1px solid var(--mc-border-subtle)', background: 'transparent',
  cursor: 'pointer', color: 'var(--editor-text)', fontSize: 11,
}
