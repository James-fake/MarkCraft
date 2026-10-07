import { useState, useEffect } from 'react'
import { PageFrame } from '../../components/shell/PageFrame'
import { useCommandPalette } from '../../components/command-palette/CommandPaletteContext'
import { Icon } from '../../icons'
import { resolveAuroraNav, buildAuroraSidebarGroups } from '../aurora-nav'
import { formatKbTime } from './kbData'
import { useFileManager } from '@stores/FileStore'
import { useLanguage } from '@stores/LanguageStore'
import { getKbList, createKb } from '@stores/kbStore'
import { KbCreateModal } from './KbCreateModal'
import type { KnowledgeBaseListItem } from '@stores/kbTypes'
import '../../styles/panels/kb.css'

/**
 * Aurora 知识库管理面板（第一页面，演示）
 *
 * 对齐项目实际功能（src/features/knowledgeBase/components/KbManager.tsx，真实可交互）：
 * 知识库列表 + 新建/导入统一弹窗（含模板与外部导入 Obsidian / Notion / 网页剪藏）。
 * 点击某个知识库进入其详细页（KbPanel，路由 #/kb/<id>）。
 *
 * 数据层（2026-08-26 换芯）：列表面板改为读取真实 getKbList()（IndexedDB）；
 * 「新建知识库」接真实 createKb（创建同名文件夹 + 存储文档）；导入动作因真实项目
 * 实现位于 src/features/knowledgeBase/import/ 且未在 Aurora 外壳内接线，保留 toast 提示
 * （不虚构数据，符合禁增铁律）。
 *
 * 入口收敛：主创建动作固定进页面头部操作区（对齐 KbPanel 详情页 subbar 右侧动作语法），
 * 空态补同款居中按钮，统一走 KbCreateModal 弹窗；列表项末尾不再埋「新建」磁贴，避免主操作漂移。
 */

export interface KbManagePanelProps {
  nav?: (id: string, param?: string) => void
  toast?: (msg: string) => void
}

export function KbManagePanel({ nav, toast }: KbManagePanelProps) {
  const { createFolder } = useFileManager()
  const { openCommandPalette } = useCommandPalette()
  const { t } = useLanguage()
  const kp = t.kbPanel
  const [kbList, setKbList] = useState<KnowledgeBaseListItem[]>([])
  const [modalOpen, setModalOpen] = useState(false)

  // 加载真实知识库列表
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const list = await getKbList()
        if (alive) setKbList(list)
      } catch {
        if (alive) setKbList([])
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const handleNav = (id: string) => nav?.(resolveAuroraNav(id))

  const openKb = (id: string) => nav?.('kb', id)

  const refresh = async () => {
    try {
      setKbList(await getKbList())
    } catch {
      /* 静默降级 */
    }
  }

  const handleModalCreate = async (name: string, desc: string): Promise<boolean> => {
    try {
      await createKb(name.trim(), desc.trim(), createFolder)
      await refresh()
      toast?.(kp.createdToast.replace(String.raw`{name}`, name.trim()))
      return true
    } catch (err) {
      toast?.(kp.createFailedToast.replace(String.raw`{msg}`, (err as Error).message))
      return false
    }
  }

  const totalFiles = kbList.reduce((s, k) => s + k.fileCount, 0)
  const totalCanvases = kbList.reduce((s, k) => s + k.canvasCount, 0)

  return (
    <PageFrame
      sidebarGroups={buildAuroraSidebarGroups(t)}
      sidebarActiveId="knowledge"
      onSidebarSelect={handleNav}
      breadcrumbs={[kp.breadcrumbRoot]}
      statusLeftItems={[
        { content: kp.statusKbCount.replace(String.raw`{n}`, String(kbList.length)) },
        { content: kp.statusTotalNotes.replace(String.raw`{n}`, String(totalFiles)) },
        { content: kp.statusTotalCanvases.replace(String.raw`{n}`, String(totalCanvases)) },
      ]}
      statusRightItems={[{ content: kp.statusLocal }, { content: t.cmdPalette.aria + ' ⌘K', clickable: true, onClick: () => openCommandPalette() }]}
    >
      <div className="aurora-kb-manage">
        {/* 顶部标题行 */}
        <header className="aurora-kb-manage__header">
          <div className="aurora-kb-manage__heading">
            <div className="aurora-kb-manage__titles">
              <h1 className="aurora-kb-manage__title">
                {kp.manageTitle}
                <span className="aurora-kb-manage__count">{kbList.length}</span>
              </h1>
            </div>
          </div>
          {/* 右上角主创建按钮：仅在有知识库时显示；空态下隐藏，避免与空态引导重复 */}
          {kbList.length > 0 && (
            <div className="aurora-kb-manage__actions">
              <button type="button" className="aurora-kb-btn aurora-kb-btn--primary" onClick={() => setModalOpen(true)}>
                <Icon.plus size={14} /> {kp.newKb}
              </button>
            </div>
          )}
        </header>

        {/* 列表 / 空状态 */}
        {kbList.length === 0 ? (
          <div className="aurora-kb-manage__empty">
            <div className="aurora-kb-manage__empty-ico"><Icon.book size={30} /></div>
            <p className="aurora-kb-manage__empty-title">{kp.emptyManageTitle}</p>
            <p className="aurora-kb-manage__empty-sub">{kp.emptyManageSub}</p>
            <button
              type="button"
              className="aurora-kb-btn aurora-kb-btn--primary aurora-kb-manage__empty-btn"
              onClick={() => setModalOpen(true)}
            >
              <Icon.plus size={15} /> {kp.newKb}
            </button>
          </div>
        ) : (
          <div className="aurora-kb-manage__list">
            {kbList.map((kb) => (
              <article
                key={kb.id}
                className="aurora-kb-kbcard"
                onClick={() => openKb(kb.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') openKb(kb.id) }}
              >
                <span className="aurora-kb-kbcard__ico"><Icon.knowledge size={18} /></span>
                <div className="aurora-kb-kbcard__body">
                  <div className="aurora-kb-kbcard__name">{kb.name}</div>
                  <div className={`aurora-kb-kbcard__desc${kb.description ? '' : ' is-empty'}`}>
                    {kb.description || kp.noDescription}
                  </div>
                </div>
                <div className="aurora-kb-kbcard__meta">
                  <span><b>{kb.fileCount}</b> {kp.metaFiles}</span>
                  <span><b>{kb.canvasCount}</b> {kp.metaCanvases}</span>
                  <span className="aurora-kb-kbcard__time">{formatKbTime(kb.updatedAt, t)}</span>
                </div>
              </article>
            ))}

          </div>
        )}
      </div>

      {/* 新建 / 导入统一弹窗 */}
      <KbCreateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        toast={toast}
        onCreate={handleModalCreate}
      />
    </PageFrame>
  )
}
