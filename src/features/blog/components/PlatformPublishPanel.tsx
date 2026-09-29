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

const PLATFORMS: Array<{ key: PublishPlatform; label: string; hint: string }> = [
  { key: 'wechat', label: '公众号', hint: '清洗后的 HTML，直接粘贴进公众号编辑器' },
  { key: 'substack', label: 'Substack', hint: 'Markdown 原文，粘贴进 Substack 编辑器' },
  { key: 'mdx', label: 'MDX', hint: 'MDX 兼容 Markdown，供 Next.js / Docusaurus 使用' },
  { key: 'hugo', label: 'Hugo', hint: 'frontmatter + 正文，放入 content/posts/' },
  { key: 'astro', label: 'Astro', hint: 'frontmatter + 正文，放入 src/content/' },
]

/** 由文章或源文件构造候选项（导出后供测试复用） */
// eslint-disable-next-line react-refresh/only-export-components -- 纯函数与唯一消费组件同文件聚合，非跨组件共享
export function buildCandidates(
  posts: BlogPost[] | undefined,
  selectedMdFiles: Array<{ name: string; content: string }>,
  author?: string,
): Candidate[] {
  if (posts && posts.length > 0) {
    return posts.map((p, i) => ({
      key: `${p.slug || 'post'}-${i}`,
      label: p.title || p.slug || `文章 ${i + 1}`,
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
  const toast = useToast()
  const [platform, setPlatform] = useState<PublishPlatform>('wechat')
  const [articleKey, setArticleKey] = useState<string>('')

  const candidates = useMemo(
    () => buildCandidates(posts, selectedMdFiles, author),
    [posts, selectedMdFiles, author],
  )

  const active = candidates.find(c => c.key === articleKey) || candidates[0]
  const exported = useMemo(() => computeExport(active, platform), [active, platform])
  const needsHtml = platform === 'wechat' && !active?.html

  const muted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)'
  const faint = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)'

  const handleCopy = async () => {
    if (!exported) return
    try {
      await navigator.clipboard.writeText(exported.content)
      toast.show(`已复制「${PLATFORMS.find(p => p.key === platform)?.label}」格式内容`, 'success')
    } catch {
      toast.show('复制失败，请改用下载', 'error')
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
    toast.show(`已下载 ${exported.filename}`, 'success')
  }

  return (
    <div>
      <SectionLabel>平台适配导出</SectionLabel>

      {candidates.length === 0 ? (
        <div style={{ fontSize: 11, color: faint, lineHeight: 1.7, padding: '8px 0' }}>
          请先在「内容」面板中选择要发布的文档。
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
                label={p.label}
                active={platform === p.key}
                onClick={() => setPlatform(p.key)}
              />
            ))}
          </div>

          <div style={{ fontSize: 10, color: faint, lineHeight: 1.6 }}>
            {PLATFORMS.find(p => p.key === platform)?.hint}
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
              公众号需要渲染后的 HTML：请先点击上方「生成」，再回到这里导出。当前将退化为 Markdown 原文。
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
            {(exported?.content || '').slice(0, 600) || '（空内容）'}
            {(exported?.content.length || 0) > 600 ? '…' : ''}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <StudioButton label="复制" onClick={handleCopy} variant="secondary" fullWidth />
            <StudioButton label={`下载 ${exported?.filename || ''}`} onClick={handleDownload} variant="secondary" fullWidth />
          </div>
        </div>
      )}
    </div>
  )
}
