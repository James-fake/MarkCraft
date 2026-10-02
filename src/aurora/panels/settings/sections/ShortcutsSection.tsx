import { useState, useCallback, useMemo } from 'react'
import { useLanguage } from '@stores/LanguageStore'
import {
  getAllBindings,
  setShortcut,
  resetShortcut,
  resetAllShortcuts,
  checkConflict,
  ShortcutBinding,
} from '@features/editor/toolbar/ShortcutManager'
import ShortcutRecorder from '@features/settings/ShortcutRecorder'
import { Button } from '@components/ui/Button'
import { useSettingsQuery } from '../settingsSearch'
import { Icon } from '../../../icons'

const CATEGORY_ORDER: ShortcutBinding['category'][] = ['format', 'file', 'view', 'edit', 'insert']
const CATEGORY_LABELS: Record<ShortcutBinding['category'], string> = {
  format: '格式',
  file: '文件',
  view: '视图',
  edit: '编辑',
  insert: '插入',
}

/**
 * 快捷键设置分组 —— 接真实 ShortcutManager
 * 渲染真实绑定、支持录制 / 单条重置 / 全部重置 / 冲突提示。
 */
export function ShortcutsSection({ query }: { query?: string; toast?: (msg: string) => void }) {
  const [bindings, setBindings] = useState(getAllBindings())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const { q } = useSettingsQuery(query)
  // 全局搜索优先；未提供时回退到快捷键页自身搜索框
  const term = q.length ? q : search.trim().toLowerCase()

  const refreshBindings = useCallback(() => setBindings(getAllBindings()), [])

  const handleRecord = useCallback((id: string, key: string) => {
    const conflict = checkConflict(key, id)
    if (conflict) {
      // 冲突：仅提示，不写入、不关闭录制态，保留用户修改机会
      setConflictWarning(`快捷键冲突：${conflict}`)
      return
    }
    setConflictWarning(null)
    setShortcut(id, key)
    setEditingId(null)
    refreshBindings()
  }, [refreshBindings])

  const handleResetOne = useCallback((id: string) => {
    resetShortcut(id)
    setConflictWarning(null)
    refreshBindings()
  }, [refreshBindings])

  const handleResetAll = useCallback(() => {
    resetAllShortcuts()
    setConflictWarning(null)
    refreshBindings()
  }, [refreshBindings])

  const { language } = useLanguage()
  const labelOf = (b: { label: string; labelEn: string }) => (language === 'en' ? b.labelEn : b.label)

  const filtered = useMemo(() => {
    const grouped = CATEGORY_ORDER.reduce<Record<string, (typeof bindings)[number][]>>((acc, cat) => {
      acc[cat] = bindings.filter(b => b.category === cat)
      return acc
    }, {})
    if (!term) return grouped
    const result: Record<string, (typeof bindings)[number][]> = {}
    for (const cat of CATEGORY_ORDER) {
      const items = (grouped[cat] || []).filter(b => b.label.toLowerCase().includes(term) || b.labelEn.toLowerCase().includes(term))
      if (items.length) result[cat] = items
    }
    return result
  }, [bindings, term])

  const hasResults = CATEGORY_ORDER.some(cat => (filtered[cat] || []).length > 0)

  return (
    <div>
      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">快捷键</div>
        <div className="aurora-settings__section-desc">应用内所有可用的键盘快捷键，点击「编辑」可重新录制</div>
        <div className="aurora-settings__shortcuts-search">
          <input
            type="text"
            className="aurora-settings__select"
            style={{ width: '100%', height: 32, padding: '0 12px' }}
            placeholder="搜索快捷键..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {conflictWarning && (
        <div className="aurora-settings__shortcut-conflict">{conflictWarning}</div>
      )}

      {!hasResults && (
        <div className="aurora-settings__shortcut-empty">
          没有找到匹配的快捷键
        </div>
      )}

      {CATEGORY_ORDER.map(cat => {
        const items = filtered[cat]
        if (!items || items.length === 0) return null
        return (
          <div key={cat} className="aurora-settings__shortcut-group">
            <div className="aurora-settings__shortcut-group-title">{CATEGORY_LABELS[cat]}</div>
            {items.map(b => (
              <div key={b.id} className="aurora-settings__shortcut-item">
                <span className="aurora-settings__shortcut-label">{labelOf(b)}</span>
                <span className="aurora-settings__shortcut-keys">
                  {editingId === b.id ? (
                    <ShortcutRecorder
                      onRecord={key => handleRecord(b.id, key)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : b.editable === false ? (
                    <span className="aurora-settings__shortcut-locked" title="此快捷键由编辑器内部处理，暂不可自定义"><Icon.lock size={12} /></span>
                  ) : (
                    <>
                      {b.currentKey.split('+').map((k, ki) => (
                        <span key={ki} className="aurora-settings__shortcut-key">{k}</span>
                      ))}
                      <button className="aurora-settings__shortcut-action" onClick={() => { setEditingId(b.id); setConflictWarning(null) }}>编辑</button>
                      <button className="aurora-settings__shortcut-action" onClick={() => handleResetOne(b.id)}>↺</button>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        )
      })}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <Button size="sm" variant="secondary" onClick={handleResetAll}>重置全部快捷键</Button>
      </div>
    </div>
  )
}
