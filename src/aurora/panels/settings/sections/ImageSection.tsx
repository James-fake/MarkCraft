import { useSettings } from '@stores/SettingsStore'
import type { AppSettings } from '@stores/SettingsStore'
import { Switch } from '@components/ui/Switch'
import { AuroraSelect } from '@components/ui/AuroraSelect'
import { useSettingsQuery } from '../settingsSearch'

/**
 * 图片设置分组 —— 接真实 useSettings()
 * 映射真实 AppSettings 的 Image 区字段：
 * - imageHostType: 'none' | 'picgo' | 'custom'
 * - useRelativeImagePath: boolean
 * - imageHostPicgoPath / imageHostCustomUrl / imageHostCustomToken：图床配置
 */
export function ImageSection({ query }: { query?: string; toast?: (msg: string) => void }) {
  const { settings, updateSetting } = useSettings()
  const { q, match } = useSettingsQuery(query)

  const hasAny = !q || [
    ['图床类型', '粘贴或拖入图片时使用的上传目标'],
    ['使用相对图片路径', '插入图片时保存相对于笔记文件的路径'],
    ['PicGo 上传命令路径', 'PicGo 可执行文件或上传命令的完整路径'],
    ['自定义图床上传地址', '接收 POST 上传的接口地址'],
    ['鉴权 Token', '上传接口所需的鉴权令牌'],
  ].some(([l, d]) => match(l, d))
  if (!hasAny) return null

  return (
    <div>
      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">图片上传</div>
        {match('图床类型', '粘贴或拖入图片时使用的上传目标') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">图床类型</div>
              <div className="aurora-settings__item-desc">
                粘贴或拖入图片时使用的上传目标；选择「无」则仅以本地路径插入
              </div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel="图床类型"
                value={settings.imageHostType}
                onChange={(v) => updateSetting('imageHostType', v as AppSettings['imageHostType'])}
                options={[
                  { value: 'none', label: '无（本地路径）' },
                  { value: 'picgo', label: 'PicGo' },
                  { value: 'custom', label: '自定义图床' },
                ]}
              />
            </div>
          </div>
        )}
        {match('使用相对图片路径', '插入图片时保存相对于笔记文件的路径') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">使用相对图片路径</div>
              <div className="aurora-settings__item-desc">
                插入图片时保存相对于笔记文件的路径，便于整体迁移
              </div>
            </div>
            <div className="aurora-settings__item-control">
              <Switch
                checked={settings.useRelativeImagePath}
                onChange={v => updateSetting('useRelativeImagePath', v)}
              />
            </div>
          </div>
        )}
        {settings.imageHostType === 'picgo' && match('PicGo 上传命令路径', 'PicGo 可执行文件或上传命令的完整路径') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">PicGo 上传命令路径</div>
              <div className="aurora-settings__item-desc">PicGo 可执行文件或上传命令的完整路径；留空则使用系统 PATH 中的 picgo</div>
            </div>
            <div className="aurora-settings__item-control">
              <input
                type="text"
                className="aurora-settings__text"
                placeholder="picgo upload"
                value={settings.imageHostPicgoPath}
                onChange={e => updateSetting('imageHostPicgoPath', e.target.value)}
              />
            </div>
          </div>
        )}
        {settings.imageHostType === 'custom' && (
          <>
            {match('自定义图床上传地址', '接收 POST 上传的接口地址') && (
              <div className="aurora-settings__item">
                <div className="aurora-settings__item-info">
                  <div className="aurora-settings__item-label">自定义图床上传地址</div>
                  <div className="aurora-settings__item-desc">接收 POST 上传的接口地址（必填）</div>
                </div>
                <div className="aurora-settings__item-control">
                  <input
                    type="text"
                    className="aurora-settings__text"
                    placeholder="https://your-cdn.com/upload"
                    value={settings.imageHostCustomUrl}
                    onChange={e => updateSetting('imageHostCustomUrl', e.target.value)}
                  />
                </div>
              </div>
            )}
            {match('鉴权 Token', '上传接口所需的鉴权令牌') && (
              <div className="aurora-settings__item">
                <div className="aurora-settings__item-info">
                  <div className="aurora-settings__item-label">鉴权 Token</div>
                  <div className="aurora-settings__item-desc">上传接口所需的鉴权令牌（如有）</div>
                </div>
                <div className="aurora-settings__item-control">
                  <input
                    type="text"
                    className="aurora-settings__text"
                    placeholder="选填"
                    value={settings.imageHostCustomToken}
                    onChange={e => updateSetting('imageHostCustomToken', e.target.value)}
                  />
                </div>
              </div>
            )}
            {!settings.imageHostCustomUrl.trim() && match('自定义图床上传地址', '') && (
              <div className="aurora-settings__item-hint">请填写上传地址后再使用自定义图床</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
