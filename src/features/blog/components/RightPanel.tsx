import { BlogDesignConfig, formatSize } from '../hooks/useBlogGenerator'
import { byteLength } from '@utils/byteLength'
import { BlogGenerationResult } from '../blogGenerator'
import { useLanguage } from '@stores/LanguageStore'
import { SectionLabel, useStudioTheme } from './StudioControls'
import { useLabels } from './panels/shared'
import DeployPanel from './DeployPanel'
import PlatformPublishPanel from './PlatformPublishPanel'
import PublishStatusPanel from './PublishStatusPanel'
import { useDensity, scaleGap } from '@hooks/useDensity'

interface ExportPanelProps {
  designConfig: BlogDesignConfig
  result: BlogGenerationResult | null
  isGenerating: boolean
  isDownloading: boolean
  error: string | null
  handleGenerate: () => void
  handleDownloadFolder: () => void
  handleDownloadSingleFile: () => void
  selectedMdFiles: Array<{ name: string; content: string }>
  mdFiles: Array<{ name: string; content: string }>
  totalWordCount: number
  totalSize: number
}

// File type icon colors
const FILE_COLORS: Record<string, { bg: string; color: string }> = {
  html: { bg: 'rgba(167,139,250,0.08)', color: '#a78bfa' },
  css:  { bg: 'rgba(56,189,248,0.08)',  color: '#38bdf8' },
  js:   { bg: 'rgba(250,204,21,0.08)',  color: '#facc15' },
  json: { bg: 'rgba(52,211,153,0.08)',  color: '#34d399' },
  other:{ bg: 'rgba(128,128,128,0.08)', color: 'rgba(128,128,128,0.7)' },
}

function getFileType(path: string) {
  const ext = path.split('.').pop() || ''
  return FILE_COLORS[ext] || FILE_COLORS.other
}

export default function ExportPanel({
  designConfig, result, isGenerating, isDownloading, error,
  handleGenerate, handleDownloadFolder, handleDownloadSingleFile,
  selectedMdFiles, mdFiles, totalWordCount, totalSize,
}: ExportPanelProps) {
  const { t } = useLanguage()
  const { themeStyleLabels } = useLabels()
  const { isDark } = useStudioTheme()
  const d = isDark
  const density = useDensity()
  const panelGap = scaleGap(14, density)
  const fileBorder = d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)'
  const fileBg = d ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
  const fileNameColor = d ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.55)'
  const fileSizeColor = d ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.35)'
  const summaryColor = d ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)'
  const separatorColor = d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)'
  const itemBorder = d ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.04)'
  const hoverBg = d ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: panelGap }}>
      {/* ─── Project Stats — Orbital Dashboard ───────────────── */}
      <div>
        <SectionLabel>{t.blogStudio.projectStats}</SectionLabel>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6,
        }}>
          {/* Docs Card */}
          <div style={{
            padding: '10px 8px', borderRadius: 12,
            background: 'rgba(167,139,250,0.05)',
            border: '1px solid rgba(167,139,250,0.1)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -8, right: -8,
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(167,139,250,0.06)',
              filter: 'blur(8px)',
            }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: '#a78bfa', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
              {selectedMdFiles.length}<span style={{ fontSize: 10, opacity: 0.3, fontWeight: 400 }}>/{mdFiles.length}</span>
            </div>
            <div style={{ fontSize: 8, fontWeight: 600, opacity: d ? 0.35 : 0.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {t.blogStudio.docCount}
            </div>
          </div>
          {/* Words Card */}
          <div style={{
            padding: '10px 8px', borderRadius: 12,
            background: 'rgba(244,114,182,0.05)',
            border: '1px solid rgba(244,114,182,0.1)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -8, right: -8,
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(244,114,182,0.06)',
              filter: 'blur(8px)',
            }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: '#f472b6', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
              {totalWordCount.toLocaleString()}
            </div>
            <div style={{ fontSize: 8, fontWeight: 600, opacity: d ? 0.35 : 0.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {t.blogStudio.totalWords}
            </div>
          </div>
          {/* Style Card */}
          <div style={{
            padding: '10px 8px', borderRadius: 12,
            background: 'rgba(56,189,248,0.05)',
            border: '1px solid rgba(56,189,248,0.1)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -8, right: -8,
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(56,189,248,0.06)',
              filter: 'blur(8px)',
            }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', lineHeight: 1, textAlign: 'center' }}>
              {themeStyleLabels[designConfig.themeStyle]}
            </div>
            <div style={{ fontSize: 8, fontWeight: 600, opacity: d ? 0.35 : 0.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {t.blogStudio.style}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Step 1: Generate — Hero CTA ─────────────────────── */}
      <div>
        <SectionLabel>Step 1 · {t.blogStudio.generateBlog}</SectionLabel>
        <div style={{
          fontSize: 11, color: d ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)', lineHeight: 1.5,
          marginBottom: 10, padding: '8px 10px', borderRadius: 8,
          background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.1)',
        }}>
          {t.blogStudio.publishAsWorkHint}
        </div>
        <button
          onClick={() => handleGenerate()}
          disabled={isGenerating || selectedMdFiles.length === 0}
          style={{
            width: '100%', padding: '14px 20px', border: 'none', borderRadius: 14,
            background: (isGenerating || selectedMdFiles.length === 0)
              ? 'rgba(167,139,250,0.08)'
              : 'linear-gradient(135deg, #a78bfa 0%, #c084fc 40%, #f472b6 100%)',
            color: (isGenerating || selectedMdFiles.length === 0)
              ? 'rgba(167,139,250,0.3)'
              : '#fff',
            cursor: (isGenerating || selectedMdFiles.length === 0) ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            position: 'relative', overflow: 'hidden',
            boxShadow: (isGenerating || selectedMdFiles.length === 0)
              ? 'none'
              : '0 4px 20px rgba(167,139,250,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset',
          }}
          onMouseEnter={(e) => {
            if (isGenerating || selectedMdFiles.length === 0) return
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(167,139,250,0.4), 0 0 0 1px rgba(255,255,255,0.15) inset'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = (isGenerating || selectedMdFiles.length === 0)
              ? 'none'
              : '0 4px 20px rgba(167,139,250,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset'
          }}
        >
          {/* Shimmer effect */}
          {!(isGenerating || selectedMdFiles.length === 0) && (
            <div style={{
              position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
              animation: 'shimmer 2.5s ease-in-out infinite',
            }} />
          )}
          {isGenerating ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          ) : (
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          )}
          {isGenerating ? t.blogStudio.generating : t.blogStudio.generateBlog}
          <style>{`
            @keyframes spin { to { transform: rotate(360deg) } }
            @keyframes shimmer { 0% { left: -100%; } 100% { left: 100%; } }
          `}</style>
        </button>
      </div>

      {/* ─── Error — Alert Banner ─────────────────────────────── */}
      {error && (
        <div style={{
          padding: '10px 12px', borderRadius: 10,
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.15)',
          borderLeft: '3px solid rgba(239,68,68,0.5)',
          fontSize: 11, color: 'rgba(239,68,68,0.8)', lineHeight: 1.5,
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      {/* ─── Step 2: Download — Dual Action Cards ─────────────── */}
      {result && (
        <div>
          <SectionLabel>Step 2 · {t.blogStudio.stepDownload}</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {/* Folder Download */}
            <button
              onClick={handleDownloadFolder}
              disabled={isDownloading}
              style={{
                padding: '12px 10px', border: '1px solid rgba(167,139,250,0.12)', borderRadius: 12,
                background: 'rgba(167,139,250,0.04)',
                cursor: isDownloading ? 'wait' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(167,139,250,0.08)'
                e.currentTarget.style.borderColor = 'rgba(167,139,250,0.25)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(167,139,250,0.04)'
                e.currentTarget.style.borderColor = 'rgba(167,139,250,0.12)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'rgba(167,139,250,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: d ? 'rgba(167,139,250,0.7)' : 'rgba(139,92,246,0.85)', letterSpacing: '0.02em' }}>
                {isDownloading ? t.blogStudio.downloading : t.blogStudio.downloadFolder}
              </div>
            </button>
            {/* Single File Download */}
            <button
              onClick={handleDownloadSingleFile}
              disabled={isDownloading}
              style={{
                padding: '12px 10px', border: '1px solid rgba(56,189,248,0.12)', borderRadius: 12,
                background: 'rgba(56,189,248,0.04)',
                cursor: isDownloading ? 'wait' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(56,189,248,0.08)'
                e.currentTarget.style.borderColor = 'rgba(56,189,248,0.25)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(56,189,248,0.04)'
                e.currentTarget.style.borderColor = 'rgba(56,189,248,0.12)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'rgba(56,189,248,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: d ? 'rgba(56,189,248,0.7)' : 'rgba(14,165,233,0.85)', letterSpacing: '0.02em' }}>
                {t.blogStudio.downloadSingleFile}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 3: 平台适配导出（P0-1） ───────────────────────── */}
      <PlatformPublishPanel
        posts={result?.posts}
        selectedMdFiles={selectedMdFiles}
        author={designConfig.author}
      />

      {/* ─── Step 3.5: 发布状态 / 系列 / 本地留痕（P1-3） ─────────── */}
      <PublishStatusPanel posts={result?.posts} />

      {/* ─── Step 4: Deploy ────────────────────────────────────── */}
      {result && <DeployPanel result={result} t={t} />}

      {/* ─── Result Files — File Tree ──────────────────────────── */}
      {result && (
        <div>
          <SectionLabel>{t.blogStudio.generateResult}</SectionLabel>
          {/* Summary bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
            padding: '6px 10px', borderRadius: 8,
            background: fileBg,
            border: `1px solid ${fileBorder}`,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontWeight: 600, color: summaryColor,
            }}>
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75" />
              </svg>
              {result.files.length} {t.blogStudio.files}
            </div>
            <div style={{ width: 1, height: 10, background: separatorColor }} />
            <div style={{ fontSize: 10, color: fileSizeColor, fontFamily: "'JetBrains Mono', monospace" }}>
              {formatSize(totalSize)}
            </div>
          </div>
          {/* File list */}
          <div style={{
            borderRadius: 10,
            border: `1px solid ${fileBorder}`,
            overflow: 'hidden',
          }}>
            {result.files.map((file, idx) => {
              const ft = getFileType(file.path)
              const ext = file.path.split('.').pop()?.toUpperCase() || '?'
              return (
                <div key={file.path} style={{
                  padding: '6px 10px',
                  borderBottom: idx < result.files.length - 1 ? `1px solid ${itemBorder}` : 'none',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'background 0.15s ease',
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = hoverBg}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {/* File type badge */}
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: ft.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 7, fontWeight: 800, color: ft.color,
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '0.02em',
                    flexShrink: 0,
                  }}>
                    {ext}
                  </div>
                  <span style={{
                    fontSize: 10, fontFamily: "'Fira Code', 'Consolas', monospace",
                    color: fileNameColor,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    flex: 1, minWidth: 0,
                  }}>
                    {file.path}
                  </span>
                  <span style={{
                    fontSize: 9, color: fileSizeColor,
                    fontFamily: "'JetBrains Mono', monospace",
                    flexShrink: 0,
                  }}>
                    {formatSize(byteLength(file.content))}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
