import { useEffect, useState } from 'react'
import { Icon } from '../../icons'
import { useKbStore } from '@stores/useKbStore'
import { useToast } from '@components/ui/ToastProvider'
import { useLanguage } from '@stores/LanguageStore'

/**
 * Aurora 辅助 Tab（发布 / 归集）
 *
 * 2026-09-13 需求：右栏检查器「辅助」Tab 原有的三个分区（写作辅助 / 成稿核查 / 粘贴为脚注）
 * 整体退役，替换为作用在**当前笔记**上的两项动作：
 *   1. 发布为博客 —— 交给博客面板按「单篇」发布（待发布清单里只留这一篇）；
 *   2. 添加到知识库 —— 就地在其下方展开「现有知识库列表」供选择：已归集的库显示勾选，
 *      再点一次即移出；列表尾部提供「新建知识库并关联」。
 *
 * 数据单一来源（D4）：知识库列表、归集关系一律走 useKbStore（kbList / addFile / removeFile /
 * getKbsContainingFile / createKb），不维护平行 mock；归集判定与知识库详情页同口径。
 *
 * 视觉：桌面端侧栏语言 —— 行式动作 + 发丝分隔 + 就地展开的缩进列表，无卡片、无 pill、无大留白。
 */
export interface AuroraPublishProps {
  /** 目标笔记 id（右栏作用于当前激活笔记；⌘K 命令可指定其它笔记） */
  fileId: string | null
  /** 目标笔记文件名（展示 + 新建知识库默认命名） */
  fileName?: string
  /** 知识库列表展开态（受控：⌘K 命令面板可远程召唤展开） */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 发布为博客：把目标笔记交给博客面板（单篇发布） */
  onPublish?: (fileId: string) => void
}

export function AuroraPublish({ fileId, fileName, open, onOpenChange, onPublish }: AuroraPublishProps) {
  const kbStore = useKbStore()
  const toast = useToast()
  const { t } = useLanguage()
  const EP = t.editorPanel
  const [memberKbs, setMemberKbs] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  // 归集关系随目标笔记变化刷新；展开时再查一次，保证在别处改过的归集关系不残留旧状态
  const { getKbsContainingFile } = kbStore
  useEffect(() => {
    let alive = true
    if (!fileId) {
      setMemberKbs([])
      return
    }
    getKbsContainingFile(fileId)
      .then((ids) => { if (alive) setMemberKbs(ids) })
      .catch(() => { /* 查询失败保持上一次结果，不阻塞使用 */ })
    return () => { alive = false }
  }, [fileId, open, getKbsContainingFile])

  const canAct = !!fileId && !busy

  /** 选择某一知识库：未归集则加入，已归集则移出（勾选式切换，与知识库详情页同语义） */
  const selectKb = async (kbId: string, kbName: string) => {
    if (!fileId || busy) return
    const isMember = memberKbs.includes(kbId)
    setBusy(true)
    try {
      if (isMember) {
        await kbStore.removeFile(kbId, fileId)
        setMemberKbs((prev) => prev.filter((x) => x !== kbId))
        toast.show(`已从「${kbName}」移出`)
      } else {
        await kbStore.addFile(kbId, fileId)
        setMemberKbs((prev) => [...prev, kbId])
        toast.show(`已添加到「${kbName}」`)
      }
    } catch (err) {
      console.error('[AuroraPublish] 归集失败:', err)
      toast.show(EP.opFailed, 'error')
    } finally {
      setBusy(false)
    }
  }

  const createAndLink = async () => {
    if (!fileId || busy) return
    setBusy(true)
    try {
      const name = (fileName || '').replace(/\.md$/i, '').trim() || EP.newKbName
      const created = await kbStore.createKb(name, '')
      if (!created) {
        toast.show(EP.newKbFailed, 'error')
        return
      }
      await kbStore.addFile(created.id, fileId)
      setMemberKbs((prev) => [...prev, created.id])
      toast.show(`已新建「${created.name}」并归入`)
    } catch (err) {
      console.error('[AuroraPublish] 新建知识库失败:', err)
      toast.show(EP.newKbFailed, 'error')
    } finally {
      setBusy(false)
    }
  }

  const memberHint = memberKbs.length > 0 ? EP.joinedCount.replace('{n}', String(memberKbs.length)) : EP.notCollected

  return (
    <div className="aurora-aidpanel">
      {/* 目标笔记上下文：让「发布 / 归集」作用于谁一目了然 */}
      <div className="aurora-aidpanel__file" title={fileName || undefined}>
        <Icon.fileText size={13} />
        <span className="aurora-aidpanel__file-name">{fileName || EP.noNoteOpen}</span>
      </div>

      {/* 分区 1 · 发布 */}
      <div className="aurora-aidpanel__group">
        <div className="aurora-aidpanel__label">{EP.publishLabel}</div>
        <button
          type="button"
          className="aurora-aidpanel__row"
          disabled={!fileId}
          onClick={() => { if (fileId) onPublish?.(fileId) }}
          title={EP.publishOneTitle}
        >
          <Icon.blog size={14} />
          <span className="aurora-aidpanel__row-title">{EP.publishRow}</span>
          <span className="aurora-aidpanel__row-hint">{EP.onlyThis}</span>
        </button>
      </div>

      {/* 分区 2 · 归集 */}
      <div className="aurora-aidpanel__group">
        <div className="aurora-aidpanel__label">{EP.collectLabel}</div>
        <button
          type="button"
          className="aurora-aidpanel__row"
          disabled={!fileId}
          aria-expanded={open}
          aria-controls="aurora-aidpanel-kblist"
          onClick={() => onOpenChange(!open)}
          title={EP.collectTitle}
        >
          <Icon.knowledge size={14} />
          <span className="aurora-aidpanel__row-title">{EP.addToKb}</span>
          <span className="aurora-aidpanel__row-hint">{memberHint}</span>
          <Icon.chevronDown size={13} className={`aurora-aidpanel__caret ${open ? 'is-open' : ''}`} />
        </button>

        {open && (
          <>
            {/* 多选列表（一篇笔记可同时归入多个知识库，故 listbox + aria-multiselectable） */}
            <div
              className="aurora-aidpanel__kblist"
              id="aurora-aidpanel-kblist"
              role="listbox"
              aria-multiselectable="true"
              aria-label={EP.kbListAria}
            >
              {kbStore.kbList.length === 0 ? (
                <div className="aurora-aidpanel__kbempty">{EP.kbEmpty}</div>
              ) : (
                kbStore.kbList.map((kb) => {
                  const isMember = memberKbs.includes(kb.id)
                  return (
                    <button
                      key={kb.id}
                      type="button"
                      role="option"
                      aria-selected={isMember}
                      className={`aurora-aidpanel__kb ${isMember ? 'is-on' : ''}`}
                      disabled={!canAct}
                      onClick={() => void selectKb(kb.id, kb.name)}
                      title={isMember ? EP.memberTitle : EP.addTitle}
                    >
                      <span className="aurora-aidpanel__kb-check">
                        {isMember ? <Icon.check size={12} /> : null}
                      </span>
                      <span className="aurora-aidpanel__kb-name">{kb.name}</span>
                    </button>
                  )
                })
              )}
            </div>
            {/* 「新建并关联」是动作而非选项，放在 listbox 之外，避免污染多选语义 */}
            <button
              type="button"
              className="aurora-aidpanel__kb aurora-aidpanel__kb--new"
              disabled={!canAct}
              onClick={() => void createAndLink()}
            >
              <span className="aurora-aidpanel__kb-check"><Icon.plus size={12} /></span>
              <span className="aurora-aidpanel__kb-name">{EP.newKbAndLink}</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default AuroraPublish
