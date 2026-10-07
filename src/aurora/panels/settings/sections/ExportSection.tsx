import { useSettings } from '@stores/SettingsStore'
import { getExportStylePresets } from '@features/export/exportStyleManager'
import { AuroraSelect } from '@components/ui/AuroraSelect'
import { useSettingsQuery } from '../settingsSearch'
import { useLanguage } from '@stores/LanguageStore'

/**
 * 导出设置分组 —— 接真实 useSettings()
 * 映射真实 AppSettings 的 Export / Diagram 区字段：
 * - defaultExportFormat: 'html' | 'pdf' | 'docx' | 'markdown'
 * - defaultExportStyle: string（导出样式预设 id，见导出模块 exportStyleManager）
 * - plantumlEndpoint: string（留空则图表降级为代码块）
 */
export function ExportSection({ query }: { query?: string; toast?: (msg: string) => void }) {
  const { settings, updateSetting } = useSettings()
  const { t } = useLanguage()
  const X = t.settingsExport
  const { q, match } = useSettingsQuery(query)
  const stylePresets = getExportStylePresets({
    defaultName: t.exportKit.styleDefaultName,
    defaultDesc: t.exportKit.styleDefaultDesc,
    academicName: t.exportKit.styleAcademicName,
    academicDesc: t.exportKit.styleAcademicDesc,
    technicalName: t.exportKit.styleTechName,
    technicalDesc: t.exportKit.styleTechDesc,
    minimalName: t.exportKit.styleMinimalName,
    minimalDesc: t.exportKit.styleMinimalDesc,
    importedDesc: t.exportKit.styleImportedDesc,
  })

  const hasAny = !q || [
    [X.defaultFormat, X.defaultFormatDesc],
    [X.defaultStyle, X.defaultStyleSearchDesc],
    [X.plantuml, X.plantumlDesc],
  ].some(([l, d]) => match(l, d))
  if (!hasAny) return null

  return (
    <div>
      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">{X.sectionTitle}</div>
        {match(X.defaultFormat, X.defaultFormatDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{X.defaultFormat}</div>
              <div className="aurora-settings__item-desc">{X.defaultFormatDesc}</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel={X.defaultFormat}
                value={settings.defaultExportFormat}
                onChange={(v) => updateSetting('defaultExportFormat', v)}
                options={[
                  { value: 'html', label: 'HTML' },
                  { value: 'pdf', label: 'PDF' },
                  { value: 'docx', label: 'Word (DOCX)' },
                  { value: 'markdown', label: 'Markdown' },
                ]}
              />
            </div>
          </div>
        )}
        {match(X.defaultStyle, X.defaultStyleSearchDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{X.defaultStyle}</div>
              <div className="aurora-settings__item-desc">{X.defaultStyleDesc}</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel={X.defaultStyle}
                value={settings.defaultExportStyle}
                onChange={(v) => updateSetting('defaultExportStyle', v)}
                options={stylePresets.map(p => ({ value: p.id, label: p.name }))}
              />
            </div>
          </div>
        )}
      </div>

      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">{X.chartSection}</div>
        {match(X.plantuml, X.plantumlDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{X.plantuml}</div>
              <div className="aurora-settings__item-desc">
                远程 SVG 渲染地址；留空则禁用远程渲染，图表降级为代码块
              </div>
            </div>
            <div className="aurora-settings__item-control">
              <input
                type="text"
                className="aurora-settings__text"
                placeholder="https://www.plantuml.com/plantuml"
                value={settings.plantumlEndpoint}
                onChange={e => updateSetting('plantumlEndpoint', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
