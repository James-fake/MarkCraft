import { useSettings } from '@stores/SettingsStore'
import type { AppSettings } from '@stores/SettingsStore'
import { Switch } from '@components/ui/Switch'
import { AuroraSelect } from '@components/ui/AuroraSelect'
import { useSettingsQuery } from '../settingsSearch'
import { ScrollNumberInput } from '@components/ui/ScrollNumberInput'
import { useLanguage } from '@stores/LanguageStore'

/**
 * 编辑器设置分组 —— 接真实 useSettings()
 * 仅暴露真实 AppSettings 中的编辑器字段；
 * 不实现真实代码无对应 key 的字段（showLineNum / wordWrap / insertSpaces / previewOnRight / syncScroll / editorFont）。
 */
export function EditorSection({ query }: { query?: string; toast?: (msg: string) => void }) {
  const { settings, updateSetting } = useSettings()
  const { t } = useLanguage()
  const E = t.settingsEditor
  const { q, match } = useSettingsQuery(query)

  const hasAny = !q || [
    [E.defaultMode, E.defaultModeDesc],
    [E.spellCheck, E.spellCheckDesc],
    [E.smartPunct, E.smartPunctDesc],
    [E.indent, E.indentDesc],
    [E.pairBrackets, ''],
    [E.pairQuotes, ''],
    [E.pairMarkdown, ''],
    [E.maxWidth, E.maxWidthDesc],
    [E.tabWidth, E.tabWidthDesc],
    [E.codeLang, E.codeLangDesc],
  ].some(([l, d]) => match(l, d))
  if (!hasAny) return null

  return (
    <div>
      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">{E.editTitle}</div>
        {match(E.defaultMode, E.defaultModeDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{E.defaultMode}</div>
              <div className="aurora-settings__item-desc">{E.defaultModeDesc}</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel={E.defaultMode}
                value={settings.editorMode}
                onChange={(v) => updateSetting('editorMode', v as AppSettings['editorMode'])}
                options={[
                  { value: 'source', label: E.source },
                  { value: 'wysiwyg', label: E.wysiwyg },
                ]}
              />
            </div>
          </div>
        )}
        {match(E.spellCheck, E.spellCheckDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{E.spellCheck}</div>
              <div className="aurora-settings__item-desc">{E.spellCheckDesc}</div>
            </div>
            <div className="aurora-settings__item-control">
              <Switch checked={settings.spellCheck} onChange={v => updateSetting('spellCheck', v)} />
            </div>
          </div>
        )}
        {match(E.smartPunct, E.smartPunctDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{E.smartPunct}</div>
              <div className="aurora-settings__item-desc">{E.smartPunctDesc}</div>
            </div>
            <div className="aurora-settings__item-control">
              <Switch checked={settings.smartPunctuation} onChange={v => updateSetting('smartPunctuation', v)} />
            </div>
          </div>
        )}
        {match(E.indent, E.indentDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{E.indent}</div>
              <div className="aurora-settings__item-desc">{E.indentDesc}</div>
            </div>
            <div className="aurora-settings__item-control">
              <Switch checked={settings.paragraphIndent} onChange={v => updateSetting('paragraphIndent', v)} />
            </div>
          </div>
        )}
        {match(E.pairBrackets, '') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{E.pairBrackets}</div>
            </div>
            <div className="aurora-settings__item-control">
              <Switch checked={settings.autoPairBrackets} onChange={v => updateSetting('autoPairBrackets', v)} />
            </div>
          </div>
        )}
        {match(E.pairQuotes, '') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{E.pairQuotes}</div>
            </div>
            <div className="aurora-settings__item-control">
              <Switch checked={settings.autoPairQuotes} onChange={v => updateSetting('autoPairQuotes', v)} />
            </div>
          </div>
        )}
        {match(E.pairMarkdown, '') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{E.pairMarkdown}</div>
            </div>
            <div className="aurora-settings__item-control">
              <Switch checked={settings.autoPairMarkdown} onChange={v => updateSetting('autoPairMarkdown', v)} />
            </div>
          </div>
        )}
      </div>

      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">{E.typoTitle}</div>
        {match(E.maxWidth, E.maxWidthDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{E.maxWidth}</div>
              <div className="aurora-settings__item-desc">{E.maxWidthDesc}</div>
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
        {match(E.tabWidth, E.tabWidthDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{E.tabWidth}</div>
              <div className="aurora-settings__item-desc">{E.tabWidthDesc}</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel={E.tabWidth}
                value={String(settings.tabSize)}
                onChange={(v) => updateSetting('tabSize', Number(v))}
                options={[
                  { value: '2', label: E.spacesCount.replace('{n}', '2') },
                  { value: '4', label: E.spacesCount.replace('{n}', '4') },
                  { value: '8', label: E.spacesCount.replace('{n}', '8') },
                ]}
              />
            </div>
          </div>
        )}
        {match(E.codeLang, E.codeLangDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{E.codeLang}</div>
              <div className="aurora-settings__item-desc">{E.codeLangDesc}</div>
            </div>
            <div className="aurora-settings__item-control">
              <input
                type="text"
                className="aurora-settings__text"
                placeholder={E.codeLangPlaceholder}
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
