import { useSettings } from '@stores/SettingsStore'
import { getExportStylePresets } from '@features/export/exportStyleManager'
import { AuroraSelect } from '@components/ui/AuroraSelect'
import { useSettingsQuery } from '../settingsSearch'

/**
 * 导出设置分组 —— 接真实 useSettings()
 * 映射真实 AppSettings 的 Export / Diagram 区字段：
 * - defaultExportFormat: 'html' | 'pdf' | 'docx' | 'markdown'
 * - defaultExportStyle: string（导出样式预设 id，见导出模块 exportStyleManager）
 * - plantumlEndpoint: string（留空则图表降级为代码块）
 */
export function ExportSection({ query }: { query?: string; toast?: (msg: string) => void }) {
  const { settings, updateSetting } = useSettings()
  const { q, match } = useSettingsQuery(query)
  const stylePresets = getExportStylePresets()

  const hasAny = !q || [
    ['默认导出格式', '导出笔记时使用的默认文件格式'],
    ['默认导出样式', '导出时套用的外观主题标识'],
    ['PlantUML 渲染端点', '远程 SVG 渲染地址'],
  ].some(([l, d]) => match(l, d))
  if (!hasAny) return null

  return (
    <div>
      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">导出</div>
        {match('默认导出格式', '导出笔记时使用的默认文件格式') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">默认导出格式</div>
              <div className="aurora-settings__item-desc">导出笔记时使用的默认文件格式</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel="默认导出格式"
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
        {match('默认导出样式', '导出时套用的外观主题标识') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">默认导出样式</div>
              <div className="aurora-settings__item-desc">导出时套用的外观主题（与导出对话框样式列表一致）</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel="默认导出样式"
                value={settings.defaultExportStyle}
                onChange={(v) => updateSetting('defaultExportStyle', v)}
                options={stylePresets.map(p => ({ value: p.id, label: p.name }))}
              />
            </div>
          </div>
        )}
      </div>

      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">图表渲染</div>
        {match('PlantUML 渲染端点', '远程 SVG 渲染地址') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">PlantUML 渲染端点</div>
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
