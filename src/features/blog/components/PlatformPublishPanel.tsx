/**
 * P0-1 多平台发布适配器 — 用户入口
 *
 * 把当前选中的文章一键转换为公众号 / Substack / MDX / Hugo / Astro 可用的格式，
 * 支持复制到剪贴板或下载文件。本地源文件始终是唯一真相，此处只做「导出适配」。
 * 元数据经 P1-2 的 deriveSeoMeta 推导后交给适配器，缺失的 slug/描述/标签会自动补齐。
 */
import { useMemo, useState } from 'react'
import { parseFrontMatter } from '@utils/frontMatter'
import { deriveSeoMeta, toPublishMeta } from '../services/seoMeta'
import {
  generatePlatformExport,
  type PublishPlatform,
  type PlatformExportResult,
} from '../services/publishAdapters'
import type { BlogPost } from '../templates'
import { SectionLabel, StudioButton, StudioChip, StudioSelect, useStudioTheme } from './StudioControls'
import { useToast } from '@components/ui/ToastProvider'
import { useLanguage } from '@stores/LanguageStore'

export interface PlatformPublishPanelProps {
  /** 已生成站点时的文章列表（含渲染后的 HTML） */
  posts?: BlogPost[]
  /** 未生成站点时的源文件列表 */
  selectedMdFiles: Array<{ name: string; content: string }>
  /** 站点默认作者 */
  author?: string
}

interface Candidate {
  key: string
  label: string
  markdown: string
  html?: string
  meta: ReturnType<typeof toPublishMeta>
}

/**
 * 平台清单：label/hint 走语言包键，UI 侧解析；
 * Substack/MDX/Hugo/Astro 的 label 为品牌名，中英文一致，故直接用固定 label。
 */
type PlatformDef =
  | { key: PublishPlatform; brand: string; hintKey: string }
  | { key: PublishPlatform; labelKey: string; hintKey: string }

const PLATFORMS: PlatformDef[] = [
  { key: 'wechat', labelKey: 'wechatLabel', hintKey: 'wechatHint' },
  { key: 'substack', brand: 'Substack', hintKey: 'substackHint' },
  { key: 'mdx', brand: 'MDX', hintKey: 'mdxHint' },
  { key: 'hugo', brand: 'Hugo', hintKey: 'hugoHint' },
  { key: 'astro', brand: 'Astro', hintKey: 'astroHint' },
]

/** 由文章或源文件构造候选项（导出后供测试复用） */
// eslint-disable-next-line react-refresh/only-export-components -- 纯函数与唯一消费组件同文件聚合，非跨组件共享
export function buildCandidates(
  posts: BlogPost[] | undefined,
  selectedMdFiles: Array<{ name: string; content: string }>,
  author?: string,
  articleFallback: (n: number) => string = n => `Article ${n}`,
): Candidate[] {
  if (posts && posts.length > 0) {
    return posts.map((p, i) => ({
      key: `${p.slug || 'post'}-${i}`,
      label: p.title || p.slug || articleFallback(i + 1),
      markdown: p.rawContent || '',
      html: p.content,
      meta: toPublishMeta(
        deriveSeoMeta(p.rawContent || '', {
          title: p.title,
          slug: p.slug,
          date: p.date,
          description: p.description,
          tags: p.tags,
          categories: p.category ? [p.category] : [],
          coverImage: p.coverImage || p.ogImage,
          draft: p.draft,
          author: p.author,
        }, { author }),
      ),
    }))
  }

  return selectedMdFiles.map((f, i) => {
    const parsed = parseFrontMatter(f.content)
    return {
      key: `${f.name}-${i}`,
      label: f.name.replace(/\.mdx?$/i, ''),
      markdown: parsed.content,
      meta: toPublishMeta(
        deriveSeoMeta(parsed.content, parsed.frontMatter as Record<string, unknown>, {
          fileName: f.name,
          author,
        }),
      ),
    }
  })
}

/** 计算导出结果；无候选项时返回 null */
// eslint-disable-next-line react-refresh/only-export-components -- 纯函数与唯一消费组件同文件聚合，非跨组件共享
export function computeExport(
  candidate: Candidate | undefined,
  platform: PublishPlatform,
): PlatformExportResult | null {
  if (!candidate) return null
  return generatePlatformExport(candidate.markdown, platform, candidate.meta, candidate.html)
}

export default function PlatformPublishPanel({ posts, selectedMdFiles, author }: PlatformPublishPanelProps) {
  const { isDark } = useStudioTheme()
  const { t } = useLanguage()
  const toast = useToast()
  const [platform, setPlatform] = useState<PublishPlatform>('wechat')
  const [articleKey, setArticleKey] = useState<string>('')

  const pp = t.platformPublish

  /** 解析平台展示名：品牌名原样，其余取语言包 */
  const platformLabel = (p: PlatformDef): string =>
    'brand' in p ? p.brand : (pp as unknown as Record<string, string>)[p.labelKey]

  const candidates = useMemo(
    () => buildCandidates(posts, selectedMdFiles, author, n => pp.articleFallback.replace('{n}', String(n))),
    [posts, selectedMdFiles, author, pp.articleFallback],
  )

  const active = candidates.find(c => c.key === articleKey) || candidates[0]
  const exported = useMemo(() => computeExport(active, platform), [active, platform])
  const needsHtml = platform === 'wechat' && !active?.html

  const muted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)'
  const faint = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)'

  const handleCopy = async () => {
    if (!exported) return
    const cur = PLATFORMS.find(p => p.key === platform)
    try {
      await navigator.clipboard.writeText(exported.content)
      toast.show(pp.copied.replace('{platform}', cur ? platformLabel(cur) : platform), 'success')
    } catch {
      toast.show(pp.copyFailed, 'error')
    }
  }

  const handleDownload = () => {
    if (!exported) return
    const blob = new Blob([exported.content], {
      type: exported.filename.endsWith('.html') ? 'text/html;charset=utf-8' : 'text/markdown;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exported.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.show(pp.downloaded.replace('{filename}', exported.filename), 'success')
  }

  return (
    <div>
      <SectionLabel>{pp.title}</SectionLabel>

      {candidates.length === 0 ? (
        <div style={{ fontSize: 11, color: faint, lineHeight: 1.7, padding: '8px 0' }}>
          {pp.emptyHint}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <StudioSelect
            value={active?.key || ''}
            onChange={setArticleKey}
            options={candidates.map(c => ({ value: c.key, label: c.label }))}
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PLATFORMS.map(p => (
              <StudioChip
                key={p.key}
                label={platformLabel(p)}
                active={platform === p.key}
                onClick={() => setPlatform(p.key)}
              />
            ))}
          </div>

          <div style={{ fontSize: 10, color: faint, lineHeight: 1.6 }}>
            {(() => {
              const cur = PLATFORMS.find(p => p.key === platform)
              return cur ? (pp as unknown as Record<string, string>)[cur.hintKey] : undefined
            })()}
          </div>

          {needsHtml && (
            <div
              style={{
                fontSize: 10,
                lineHeight: 1.6,
                padding: '8px 10px',
                borderRadius: 8,
                color: '#fbbf24',
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.2)',
              }}
            >
              {pp.needHtml}
            </div>
          )}

          <div
            style={{
              maxHeight: 140,
              overflow: 'auto',
              padding: '8px 10px',
              borderRadius: 10,
              fontSize: 10,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              color: muted,
              fontFamily: "'JetBrains Mono', monospace",
              background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            {(exported?.content || '').slice(0, 600) || pp.emptyContent}
            {(exported?.content.length || 0) > 600 ? '…' : ''}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <StudioButton label={pp.copy} onClick={handleCopy} variant="secondary" fullWidth />
            <StudioButton label={pp.download.replace('{filename}', exported?.filename || '')} onClick={handleDownload} variant="secondary" fullWidth />
          </div>
        </div>
      )}
    </div>
  )
}
