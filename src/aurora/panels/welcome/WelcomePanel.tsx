import { useCallback, useState, useEffect, useMemo, type CSSProperties } from 'react'
import { PageFrame } from '../../components/shell/PageFrame'
import { useCommandPalette } from '../../components/command-palette/CommandPaletteContext'
import { Icon } from '../../icons'
import { resolveAuroraNav, AURORA_SIDEBAR_GROUPS } from '../aurora-nav'
import { useFileManager } from '@stores/FileStore'
import { useUserProfile, userDisplayName } from '@stores/UserProfileStore'
import { findNode } from '@core/files/fileTree'
import {
  getRecentFiles,
  subscribeRecentFiles,
  type RecentFileEntry,
} from '@core/files/recentFiles'
import '../../styles/panels/welcome.css'

/**
 * Aurora 欢迎页面板（C 线重新设计 · L1 Launchpad v2）
 *
 * 定位：中性启动器 —— 首页不谈写作/文档，进去才是各模块（L1 方向，已拍板）。
 * 视觉：去玻璃 / 去极光辉光 / 去渐变 logo / 唯一 accent 收口（§18 桌面原生基线）。
 * 结构（左大右小非对称）：
 *   - 品牌行：logo + MarkCraft
 *   - 人情味问候：按时段问候 + 真实使用天数(localStorage 首启日) + 真实连续天数(recentFiles 活动派生)
 *   - 左大卡：编辑器 = 上次停留（取 getRecentFiles()[0] 作「继续《…》」；无则新建）
 *   - 右 2×3 网格：日记/知识库/白板/博客/设置/搜索(命令面板)
 * welcome 为 aux 视图（nav('welcome') / Ctrl+1 打开，不可 #view 深链），验证用 jsdom 烟雾测试。
 */
export interface WelcomePanelProps {
  /** 导航回调 */
  nav?: (id: string) => void
  /** Toast 回调 */
  toast?: (msg: string) => void
  /** 打开模板弹窗（复用真实 TemplateInsertModal；不传时回退到新建空白笔记） */
  onUseTemplate?: () => void
}

const FIRST_LAUNCH_KEY = 'markcraft.firstLaunch'

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** 真实使用天数：首启日存 localStorage，之后每日自增（安装年龄） */
function getUsageDays(): number {
  try {
    let v = localStorage.getItem(FIRST_LAUNCH_KEY)
    if (!v) {
      v = new Date().toISOString()
      localStorage.setItem(FIRST_LAUNCH_KEY, v)
    }
    const first = new Date(v).getTime()
    if (Number.isNaN(first)) return 1
    return Math.floor((Date.now() - first) / 86_400_000) + 1
  } catch {
    return 1
  }
}

/** 真实连续使用天数：从今天(或昨天)往前数有活动(打开过文件)的连续天数 */
function computeStreak(files: RecentFileEntry[]): number {
  const days = new Set(files.map((f) => dayKey(f.lastOpened)))
  if (days.size === 0) return 0
  const d = new Date()
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1)
  let streak = 0
  while (days.has(dayKey(d.getTime()))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function greetingByHour(hour: number): string {
  if (hour < 5) return '凌晨好'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const min = 60_000
  const hr = 3_600_000
  const day = 86_400_000
  if (diff < min) return '刚刚'
  if (diff < hr) return `${Math.floor(diff / min)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hr)} 小时前`
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** 右栏 5 个模块入口（搜索单列在网格外，走命令面板） */
const MODULE_TILES = [
  { icon: 'calendar', label: '日记', nav: '日记' },
  { icon: 'knowledge', label: '知识库', nav: '知识库' },
  { icon: 'canvas', label: '白板', nav: '白板' },
  { icon: 'blog', label: '博客', nav: '博客' },
  { icon: 'settings', label: '设置', nav: '设置' },
] as const

export function WelcomePanel({ nav }: WelcomePanelProps) {
  const { rootFolder, createFile, openFile } = useFileManager()
  const { openCommandPalette } = useCommandPalette()

  const [files, setFiles] = useState<RecentFileEntry[]>(() => getRecentFiles())
  useEffect(() => subscribeRecentFiles(() => setFiles(getRecentFiles())), [])
  const [usageDays, setUsageDays] = useState(1)
  useEffect(() => {
    setUsageDays(getUsageDays())
  }, [])

  // 仅显示文件库中仍存在的文档（recentFiles 可能残留已删除项）
  const valid = useMemo(
    () => files.filter((f) => findNode(rootFolder, f.fileId)),
    [files, rootFolder],
  )
  const latest = valid[0]
  const streak = useMemo(() => computeStreak(valid), [valid])

  const now = new Date()
  const hello = greetingByHour(now.getHours())
  const weekday = WEEKDAYS[now.getDay()]
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`

  // 人情味：欢迎问候使用用户设置的昵称（空则回退「用户」）
  const profile = useUserProfile()
  const displayName = userDisplayName(profile)

  const handleNav = useCallback(
    (id: string) => {
      nav?.(resolveAuroraNav(id))
    },
    [nav],
  )

  const handleNewNote = useCallback(() => {
    createFile(rootFolder.id, '未命名笔记.md', '', true)
    handleNav('编辑器')
  }, [createFile, rootFolder.id, handleNav])

  const handleOpenLatest = useCallback(() => {
    if (!latest) {
      handleNewNote()
      return
    }
    openFile(latest.fileId)
    nav?.(resolveAuroraNav('编辑器'))
  }, [latest, openFile, nav, handleNewNote])

  const handleTile = useCallback(
    (tileNav?: string) => {
      if (tileNav) handleNav(tileNav)
      else openCommandPalette()
    },
    [handleNav, openCommandPalette],
  )

  return (
    <PageFrame
      sidebarGroups={AURORA_SIDEBAR_GROUPS}
      sidebarActiveId="欢迎页"
      onSidebarSelect={handleNav}
      statusRightItems={[
        { content: '⌘K 命令面板', clickable: true, onClick: () => openCommandPalette() },
      ]}
    >
      <div className="aurora-welcome">
        <div className="aurora-welcome__container">
          {/* 品牌头部：紧凑实色，去玻璃 / 去极光 / 去渐变 logo */}
          <div className="aurora-welcome__brand-bar">
            <div className="aurora-welcome__brand-icon">M</div>
            <div className="aurora-welcome__brand-title">MarkCraft</div>
          </div>

          {/* 人情味问候（真实数据） */}
          <div className="aurora-welcome__greeting">
            <div className="aurora-welcome__hello">
              {hello}，{displayName}
            </div>
            <div className="aurora-welcome__usage">
              这是你使用 MarkCraft 的第{' '}
              <span className="aurora-welcome__usage-num">{usageDays}</span> 天 · {weekday} ·{' '}
              {dateStr}
            </div>
            {streak > 0 && (
              <div className="aurora-welcome__streak">已连续使用 {streak} 天</div>
            )}
          </div>

          {/* 主区：左大卡（编辑器=上次停留）+ 右 2×3 模块网格 */}
          <div className="aurora-welcome__launchpad">
            <div
              className="aurora-welcome__hero"
              role="button"
              tabIndex={0}
              onClick={handleOpenLatest}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleOpenLatest()
              }}
            >
              <div>
                <div className="aurora-welcome__hero-meta">
                  <Icon.edit size={18} />
                  <span>上次停留</span>
                </div>
                <div className="aurora-welcome__hero-title">编辑器</div>
                <div className="aurora-welcome__hero-sub">
                  {latest
                    ? `继续《${latest.fileName.replace(/\.md$/i, '')}》· ${formatRelativeTime(latest.lastOpened)}`
                    : '开始你的第一篇笔记'}
                </div>
              </div>
              <div className="aurora-welcome__hero-cta">
                {latest ? '继续编辑' : '新建笔记'} →
              </div>
            </div>

            <div className="aurora-welcome__tiles">
              {MODULE_TILES.map((t, ti) => {
                const TileIcon = Icon[t.icon]
                return (
                  <div
                    key={t.label}
                    className="aurora-welcome__tile"
                    style={{ '--i': ti } as CSSProperties}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleTile(t.nav)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTile(t.nav)
                    }}
                  >
                    <TileIcon size={22} />
                    <span className="aurora-welcome__tile-label">{t.label}</span>
                  </div>
                )
              })}
              <div
                className="aurora-welcome__tile"
                style={{ '--i': MODULE_TILES.length } as CSSProperties}
                role="button"
                tabIndex={0}
                onClick={() => handleTile(undefined)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTile(undefined)
                }}
              >
                <Icon.search size={22} />
                <div className="aurora-welcome__tile-foot">
                  <span className="aurora-welcome__tile-label">搜索</span>
                  <span className="aurora-welcome__tile-kbd">⌘K</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 版本号 */}
        <div className="aurora-welcome__version">MarkCraft v2.0.0 · Aurora</div>
      </div>
    </PageFrame>
  )
}
