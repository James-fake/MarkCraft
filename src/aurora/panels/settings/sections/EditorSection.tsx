import { useSettings } from '@stores/SettingsStore'
import type { AppSettings } from '@stores/SettingsStore'
import { Switch } from '@components/ui/Switch'
import { AuroraSelect } from '@components/ui/AuroraSelect'
import { useSettingsQuery } from '../settingsSearch'
import { ScrollNumberInput } from '@components/ui/ScrollNumberInput'

/**
 * 编辑器设置分组 —— 接真实 useSettings()
 * 仅暴露真实 AppSettings 中的编辑器字段；
 * 不实现真实代码无对应 key 的字段（showLineNum / wordWrap / insertSpaces / previewOnRight / syncScroll / editorFont）。
 */
export function EditorSection({ query }: { query?: string; toast?: (msg: string) => void }) {
  const { settings, updateSetting } = useSettings()
  const { q, match } = useSettingsQuery(query)

  const hasAny = !q || [
    ['默认编辑器模式', '新打开笔记时使用的编辑器模式'],
    ['拼写检查', '标记可能的拼写错误'],
    ['智能标点', '自动转换直引号与连字符为排版引号'],
    ['段首缩进', '段落首行自动缩进'],
    ['自动配对括号', ''],
    ['自动配对引号', ''],
    ['自动配对 Markdown', ''],
    ['编辑器最大宽度', '编辑区内容的最大宽度'],
    ['Tab 宽度', '一个 Tab 等于多少个空格'],
    ['代码块默认语言', '新建代码块使用的默认语言'],
  ].some(([l, d]) => match(l, d))
  if (!hasAny) return null

  return (
    <div>
      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">编辑体验</div>
        {match('默认编辑器模式', '新打开笔记时使用的编辑器模式') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">默认编辑器模式</div>
              <div className="aurora-settings__item-desc">新打开笔记时使用的编辑器模式（可在编辑器内随时切换）</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel="默认编辑器模式"
                value={settings.editorMode}
                onChange={(v) => updateSetting('editorMode', v as AppSettings['editorMode'])}
                options={[
                  { value: 'source', label: '源码' },
                  { value: 'wysiwyg', label: '所见即所得' },
                ]}
              />
            </div>
          </div>
        )}
        {match('拼写检查', '标记可能的拼写错误') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">拼写检查</div>
              <div className="aurora-settings__item-desc">标记可能的拼写错误</div>
            </div>
            <div className="aurora-settings__item-control">
              <Switch checked={settings.spellCheck} onChange={v => updateSetting('spellCheck', v)} />
            </div>
          </div>
        )}
        {match('智能标点', '自动转换直引号与连字符为排版引号') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">智能标点</div>
              <div className="aurora-settings__item-desc">自动转换直引号与连字符为排版引号</div>
            </div>
            <div className="aurora-settings__item-control">
              <Switch checked={settings.smartPunctuation} onChange={v => updateSetting('smartPunctuation', v)} />
            </div>
          </div>
        )}
        {match('段首缩进', '段落首行自动缩进') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">段首缩进</div>
              <div className="aurora-settings__item-desc">段落首行自动缩进</div>
            </div>
            <div className="aurora-settings__item-control">
              <Switch checked={settings.paragraphIndent} onChange={v => updateSetting('paragraphIndent', v)} />
            </div>
          </div>
        )}
        {match('自动配对括号', '') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">自动配对括号</div>
            </div>
            <div className="aurora-settings__item-control">
              <Switch checked={settings.autoPairBrackets} onChange={v => updateSetting('autoPairBrackets', v)} />
            </div>
          </div>
        )}
        {match('自动配对引号', '') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">自动配对引号</div>
            </div>
            <div className="aurora-settings__item-control">
              <Switch checked={settings.autoPairQuotes} onChange={v => updateSetting('autoPairQuotes', v)} />
            </div>
          </div>
        )}
        {match('自动配对 Markdown', '') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">自动配对 Markdown</div>
            </div>
            <div className="aurora-settings__item-control">
              <Switch checked={settings.autoPairMarkdown} onChange={v => updateSetting('autoPairMarkdown', v)} />
            </div>
          </div>
        )}
      </div>

      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">字体与排版</div>
        {match('编辑器最大宽度', '编辑区内容的最大宽度') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">编辑器最大宽度</div>
              <div className="aurora-settings__item-desc">编辑区内容的最大宽度（像素）</div>
            </div>
            <div className="aurora-settings__item-control">
              <ScrollNumberInput
                className="aurora-settings__number"
                value={settings.editorMaxWidth}
                min={400}
                max={2000}
                step={50}
                onChange={(n) => { if (!Number.isNaN(n)) updateSetting('editorMaxWidth', Math.min(2000, Math.max(400, n))) }}
              />
            </div>
          </div>
        )}
        {match('Tab 宽度', '一个 Tab 等于多少个空格') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">Tab 宽度</div>
              <div className="aurora-settings__item-desc">一个 Tab 等于多少个空格</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel="Tab 宽度"
                value={String(settings.tabSize)}
                onChange={(v) => updateSetting('tabSize', Number(v))}
                options={[
                  { value: '2', label: '2 空格' },
                  { value: '4', label: '4 空格' },
                  { value: '8', label: '8 空格' },
                ]}
              />
            </div>
          </div>
        )}
        {match('代码块默认语言', '新建代码块使用的默认语言') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">代码块默认语言</div>
              <div className="aurora-settings__item-desc">新建代码块使用的默认语言</div>
            </div>
            <div className="aurora-settings__item-control">
              <input
                type="text"
                className="aurora-settings__text"
                placeholder="留空为自动"
                value={settings.codeBlockDefaultLang}
                onChange={e => updateSetting('codeBlockDefaultLang', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
