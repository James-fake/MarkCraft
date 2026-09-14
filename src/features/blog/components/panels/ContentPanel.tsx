import { ContentPanelProps, useLabels } from './shared'
import { SectionLabel, StudioInput, StudioTextarea, StudioSelect, StudioChip, useStudioTheme } from '../StudioControls'
import { useDensity, scaleGap } from '@hooks/useDensity'

export function ContentPanel({ designConfig, handleDesignChange, mdFiles, selectedMdFiles, excludedFiles, setExcludedFiles }: ContentPanelProps) {
  const { t } = useLabels()
  const { isDark } = useStudioTheme()
  const d = isDark
  const density = useDensity()
  const panelGap = scaleGap(14, density)
  const listBorder = d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)'
  const itemBorder = d ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)'
  const dashedBorder = d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)'
  const checkboxBorder = d ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.2)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: panelGap }}>
      <div>
        <SectionLabel>{t.blogStudio.siteTitle}</SectionLabel>
        <StudioInput value={designConfig.siteTitle} onChange={(v) => handleDesignChange('siteTitle', v)} placeholder="My Blog" />
      </div>
      <div>
        <SectionLabel>{t.blogStudio.siteDescription}</SectionLabel>
        <StudioTextarea value={designConfig.siteDescription} onChange={(v) => handleDesignChange('siteDescription', v)} placeholder="A simple static blog" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <SectionLabel>{t.blogStudio.author}</SectionLabel>
          <StudioInput value={designConfig.author} onChange={(v) => handleDesignChange('author', v)} placeholder="Anonymous" />
        </div>
        <div>
          <SectionLabel>{t.blogStudio.language}</SectionLabel>
          <StudioSelect value={designConfig.language} onChange={(v) => handleDesignChange('language', v)}
            options={[{ value: 'zh-CN', label: '中文' }, { value: 'en', label: 'English' }]}
          />
        </div>
      </div>

      {/* Document List */}
      <div style={{ marginTop: 4 }}>
        <SectionLabel>{t.blogStudio.docList}</SectionLabel>
        {mdFiles.length === 0 ? (
          <div style={{
            padding: '24px 0', textAlign: 'center', fontSize: 11, opacity: d ? 0.2 : 0.35,
            border: `1px dashed ${dashedBorder}`, borderRadius: 10,
          }}>
            {t.blogStudio.noMarkdownDocs}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 10, opacity: d ? 0.25 : 0.4, fontFamily: "'JetBrains Mono', monospace" }}>
                {selectedMdFiles.length}/{mdFiles.length}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <StudioChip label={t.blogStudio.selectAll} onClick={() => setExcludedFiles(new Set())} />
                <StudioChip label={t.blogStudio.deselectAll} onClick={() => setExcludedFiles(new Set(mdFiles.map(f => f.name)))} variant="danger" />
              </div>
            </div>
            <div style={{ borderRadius: 10, border: `1px solid ${listBorder}`, overflow: 'hidden' }}>
              {mdFiles.map((file, idx) => {
                const isIncluded = !excludedFiles.has(file.name)
                return (
                  <div key={file.name} style={{
                    padding: '6px 10px',
                    borderBottom: idx < mdFiles.length - 1 ? `1px solid ${itemBorder}` : 'none',
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 11,
                    opacity: isIncluded ? (d ? 0.65 : 0.75) : (d ? 0.25 : 0.4), transition: 'opacity 0.15s ease',
                    background: isIncluded ? 'transparent' : undefined,
                  }}>
                    <button onClick={() => { setExcludedFiles(prev => { const next = new Set(prev); if (next.has(file.name)) next.delete(file.name); else next.add(file.name); return next }) }}
                      style={{
                        width: 16, height: 16, borderRadius: 5,
                        border: isIncluded ? '1.5px solid rgba(167,139,250,0.6)' : `1.5px solid ${checkboxBorder}`,
                        background: isIncluded ? 'rgba(167,139,250,0.15)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', flexShrink: 0, padding: 0, transition: 'all 0.2s ease',
                      }}
                    >
                      {isIncluded && <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                    </button>
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ opacity: 0.35, flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: 10 }}>
                      {file.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
