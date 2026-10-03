import { useState } from 'react'
import { useSettings } from '@stores/SettingsStore'
import { useFileManager } from '@stores/FileStore'
import { exportWorkspaceZip } from '@features/export/backupService'
import { Switch } from '@components/ui/Switch'
import { useConfirm } from '@components/ui/ConfirmProvider'
import { useSettingsQuery } from '../settingsSearch'
import { useLanguage } from '@stores/LanguageStore'

/**
 * 数据设置分组 —— 接真实 useSettings()
 * 映射真实 AppSettings 的 View / 数据区字段：
 * - outlineVisible: boolean（编辑器大纲可见性）
 * - resetSettings()：恢复全部设置为默认（真实实现，见 SettingsStore）
 * - 一键导出：F1 数据主权 —— 文件树导出为真实 .md 目录 ZIP（含图片）
 */
export function DataSection({ query, toast }: { query?: string; toast?: (msg: string) => void }) {
  const { settings, updateSetting, resetSettings } = useSettings()
  const { t } = useLanguage()
  const D = t.settingsData
  const { rootFolder } = useFileManager()
  const [exporting, setExporting] = useState(false)
  const { confirm } = useConfirm()
  const { q, match } = useSettingsQuery(query)
  const toastFn = toast

  const hasAny = !q || [
    [D.outline, D.outlineDesc],
    [D.exportMd, D.exportMdDesc],
    [D.resetDefaults, D.resetDesc],
  ].some(([l, d]) => match(l, d))
  if (!hasAny) return null

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const result = await exportWorkspaceZip(rootFolder)
      toastFn?.(D.exportDone.replace('{files}', String(result.fileCount)).replace('{assets}', String(result.assetCount)) + (result.missingImages.length ? D.exportMissing.replace('{n}', String(result.missingImages.length)) : ''))
    } catch {
      toastFn?.(D.exportFailed)
    } finally {
      setExporting(false)
    }
  }

  const handleReset = async () => {
    const ok = await confirm({
      title: D.resetTitle,
      message: D.resetMessage,
      variant: 'danger',
      confirmText: D.resetConfirm,
    })
    if (ok) resetSettings()
  }

  return (
    <div>
      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">{D.outlineSection}</div>
        {match(D.outline, D.outlineDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{D.outline}</div>
              <div className="aurora-settings__item-desc">
                开启后，编辑器右侧检查器展示当前文档的标题大纲
              </div>
            </div>
            <div className="aurora-settings__item-control">
              <Switch
                checked={settings.outlineVisible}
                onChange={v => updateSetting('outlineVisible', v)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">{D.dataSection}</div>
        {match(D.exportMd, D.exportMdDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{D.exportMd}</div>
              <div className="aurora-settings__item-desc">
                {D.exportMdLongDesc}
              </div>
            </div>
            <div className="aurora-settings__item-control">
              <button
                type="button"
                className="aurora-settings__shortcut-action"
                disabled={exporting}
                onClick={handleExport}
              >
                {exporting ? D.exporting : D.oneClickExport}
              </button>
            </div>
          </div>
        )}
        {match(D.resetDefaults, D.resetDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{D.resetDefaults}</div>
              <div className="aurora-settings__item-desc">
                {D.resetLongDesc}
              </div>
            </div>
            <div className="aurora-settings__item-control">
              <button
                type="button"
                className="aurora-settings__shortcut-action"
                onClick={() => handleReset()}
              >
                恢复默认
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
