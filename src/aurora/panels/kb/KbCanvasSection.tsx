import { useState, useEffect, useCallback } from 'react'
import { Icon } from '../../icons'
import { useKbStore } from '@stores/useKbStore'
import { useLanguage } from '@stores/LanguageStore'
import { getCanvasList, createCanvas, type CanvasListItem } from '@features/canvas-v2'
import type { KnowledgeBase } from '@stores/kbTypes'

// 关联白板区块（P1 白板串联）：列出知识库关联白板，可打开 / 取消关联 / 新建并关联 / 关联已有
// 打通 知识库 ↔ 白板：canvasIds 僵尸字段复活，双向回跳
export function KbCanvasSection({
  kb,
  nav,
  toast,
  onKbChanged,
}: {
  kb: KnowledgeBase
  nav?: (id: string, param?: string) => void
  toast?: (msg: string) => void
  /**
   * 关联关系写入后的回写动作（由 KbPanel 注入：重新 loadKb 并 setKb）。
   * 有了它，新增/取消关联即刻反映到列表与顶部 KPI，无需刷新页面。
   */
  onKbChanged?: () => Promise<void>
}) {
  const kbStore = useKbStore()
  const { t } = useLanguage()
  const kc = t.kbCanvas
  const [canvasNames, setCanvasNames] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [candidates, setCandidates] = useState<CanvasListItem[]>([])

  // 解析已关联白板的名称（canvasIds → getCanvasList 名称）
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const list = await getCanvasList()
        const map: Record<string, string> = {}
        for (const c of list) if (kb.canvasIds.includes(c.id)) map[c.id] = c.name
        // 🚨 不做整表替换：列表里查不到的（刚创建、尚未入列表的）项保留乐观命名，
        // 否则新关联的白板会被覆盖成「未命名白板」闪一下（2026-09-27 实测）。
        if (alive) setCanvasNames((prev) => {
          const next = { ...map }
          for (const id of kb.canvasIds) if (!next[id] && prev[id]) next[id] = prev[id]
          return next
        })
      } catch {
        /* 名称解析失败按空处理 */
      }
    })()
    return () => { alive = false }
  }, [kb.canvasIds])

  const handleOpenCanvas = useCallback((id: string) => {
    nav?.('canvas', id)
  }, [nav])

  const handleUnlink = useCallback(async (id: string) => {
    setBusy(true)
    try {
      await kbStore.removeCanvas(kb.id, id)
      // 即时移除本地名称缓存，随后由回写驱动列表刷新
      setCanvasNames((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      await onKbChanged?.()
      toast?.(kc.unlinked)
    } catch (err) {
      toast?.(kc.unlinkFailed.replace('{msg}', (err as Error).message))
    } finally {
      setBusy(false)
    }
  }, [kb.id, kbStore, onKbChanged, toast, kc])

  const handleCreateAndLink = useCallback(async () => {
    setBusy(true)
    try {
      const doc = await createCanvas(kc.canvasDocName.replace('{name}', kb.name))
      // 乐观命名：先落到名称缓存，避免回写完成前列表闪一下「未命名白板」
      setCanvasNames((prev) => ({ ...prev, [doc.id]: doc.name }))
      await kbStore.addCanvas(kb.id, doc.id)
      await onKbChanged?.()
      toast?.(kc.created.replace('{name}', doc.name))
    } catch (err) {
      toast?.(kc.createFailed.replace('{msg}', (err as Error).message))
    } finally {
      setBusy(false)
    }
  }, [kb.id, kb.name, kbStore, onKbChanged, toast, kc])

  // 「关联已有」选择器：展开时拉全量白板列表，排除本库已关联项；关联成功后 kb.canvasIds
  // 变化驱动本 effect 重算，刚关联的那块自动从候选里消失（可连续关联多块）。
  useEffect(() => {
    if (!pickerOpen) return
    let alive = true
    ;(async () => {
      try {
        const list = await getCanvasList()
        if (alive) setCandidates(list.filter((c) => !kb.canvasIds.includes(c.id)))
      } catch {
        if (alive) setCandidates([])
      }
    })()
    return () => { alive = false }
  }, [pickerOpen, kb.canvasIds])

  const handleLinkExisting = useCallback(async (c: CanvasListItem) => {
    setBusy(true)
    try {
      setCanvasNames((prev) => ({ ...prev, [c.id]: c.name }))
      await kbStore.addCanvas(kb.id, c.id)
      await onKbChanged?.()
      toast?.(kc.linked.replace('{name}', c.name))
    } catch (err) {
      toast?.(kc.linkFailed.replace('{msg}', (err as Error).message))
    } finally {
      setBusy(false)
    }
  }, [kb.id, kbStore, onKbChanged, toast, kc])

  return (
    <div className="aurora-kb-canvas">
      <div className="aurora-kb-canvas__head">
        <span className="aurora-kb-canvas__title">{kc.title.replace('{n}', String(kb.canvasIds.length))}</span>
        <div className="aurora-kb-canvas__head-actions">
          <button className="aurora-kb-btn aurora-kb-btn--sm" onClick={handleCreateAndLink} disabled={busy}>
            <Icon.plus size={14} /> {kc.newAndLink}
          </button>
          <button
            className="aurora-kb-btn aurora-kb-btn--sm aurora-kb-btn--ghost"
            onClick={() => setPickerOpen((v) => !v)}
            disabled={busy}
          >
            {pickerOpen ? kc.collapse : kc.linkExisting}
          </button>
        </div>
      </div>
      {pickerOpen && (
        <div className="aurora-kb-canvas__picker">
          {candidates.length === 0 ? (
            <div className="aurora-kb-canvas__picker-empty">
              {kc.emptyCandidates}
            </div>
          ) : (
            candidates.map((c) => (
              <button
                key={c.id}
                className="aurora-kb-canvas__pick"
                onClick={() => handleLinkExisting(c)}
                disabled={busy}
              >
                <span className="aurora-kb-canvas__pick-name"><Icon.canvas size={14} /> {c.name}</span>
                <span className="aurora-kb-canvas__pick-meta">{kc.elementUnit.replace('{n}', String(c.cardCount))}</span>
              </button>
            ))
          )}
        </div>
      )}
      {kb.canvasIds.length === 0 ? (
        <div className="aurora-kb-canvas__empty">
          {kc.emptyHint}
        </div>
      ) : (
        <div className="aurora-kb-canvas__list">
          {kb.canvasIds.map((id) => (
            <div key={id} className="aurora-kb-canvas__item">
              <span className="aurora-kb-canvas__name"><Icon.canvas size={14} /> {canvasNames[id] ?? kc.unnamedCanvas}</span>
              <div className="aurora-kb-canvas__actions">
                <button className="aurora-kb-btn aurora-kb-btn--sm" onClick={() => handleOpenCanvas(id)}>{kc.open}</button>
                <button className="aurora-kb-btn aurora-kb-btn--sm aurora-kb-btn--ghost" onClick={() => handleUnlink(id)} disabled={busy}>{kc.unlink}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
