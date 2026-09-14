import { useState } from 'react'
import { useSettings } from '@stores/SettingsStore'
import { useFileManager } from '@stores/FileStore'
import { exportWorkspaceZip } from '@features/export/backupService'
import { Switch } from '@components/ui/Switch'
import { useConfirm } from '@components/ui/ConfirmProvider'
import { useSettingsQuery } from '../settingsSearch'

/**
 * 数据设置分组 —— 接真实 useSettings()
 * 映射真实 AppSettings 的 View / 数据区字段：
 * - outlineVisible: boolean（编辑器大纲可见性）
 * - resetSettings()：恢复全部设置为默认（真实实现，见 SettingsStore）
 * - 一键导出：F1 数据主权 —— 文件树导出为真实 .md 目录 ZIP（含图片）
 */
export function DataSection({ query, toast }: { query?: string; toast?: (msg: string) => void }) {
  const { settings, updateSetting, resetSettings } = useSettings()
  const { rootFolder } = useFileManager()
  const [exporting, setExporting] = useState(false)
  const { confirm } = useConfirm()
  const { q, match } = useSettingsQuery(query)
  const toastFn = toast

  const hasAny = !q || [
    ['显示大纲', '开启后，编辑器右侧检查器展示当前文档的标题大纲'],
    ['导出为 .md 目录备份', '将全部笔记导出为真实 Markdown 目录'],
    ['恢复默认设置', '将所有设置项重置为出厂默认值'],
  ].some(([l, d]) => match(l, d))
  if (!hasAny) return null

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const result = await exportWorkspaceZip(rootFolder)
      toastFn?.(`已导出 ${result.fileCount} 个文件 · ${result.assetCount} 张图片` + (result.missingImages.length ? ` · ${result.missingImages.length} 张缺失` : ''))
    } catch {
      toastFn?.('导出失败，请稍后重试')
    } finally {
      setExporting(false)
    }
  }

  const handleReset = async () => {
    const ok = await confirm({
      title: '恢复默认设置',
      message: '确定将所有设置恢复为默认值？此操作不可撤销，且不影响笔记内容。',
      variant: 'danger',
      confirmText: '恢复默认',
    })
    if (ok) resetSettings()
  }

  return (
    <div>
      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">视图与大纲</div>
        {match('显示大纲', '开启后，编辑器右侧检查器展示当前文档的标题大纲') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">显示大纲</div>
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
        <div className="aurora-settings__section-title">数据管理</div>
        {match('导出为 .md 目录备份', '将全部笔记导出为真实 Markdown 目录') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">导出为 .md 目录备份</div>
              <div className="aurora-settings__item-desc">
                将全部笔记导出为真实 Markdown 目录（ZIP），图片放入 assets/ 并以相对路径引用，可用任意编辑器打开；含 README 说明与 manifest 元数据
              </div>
            </div>
            <div className="aurora-settings__item-control">
              <button
                type="button"
                className="aurora-settings__shortcut-action"
                disabled={exporting}
                onClick={handleExport}
              >
                {exporting ? '导出中…' : '一键导出'}
              </button>
            </div>
          </div>
        )}
        {match('恢复默认设置', '将所有设置项重置为出厂默认值') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">恢复默认设置</div>
              <div className="aurora-settings__item-desc">
                将所有设置项重置为出厂默认值（不影响笔记内容）
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
