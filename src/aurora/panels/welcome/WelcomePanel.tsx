import { useCallback, useState, useEffect, useMemo, type CSSProperties } from 'react'
import { PageFrame } from '../../components/shell/PageFrame'
import { useCommandPalette } from '../../components/command-palette/CommandPaletteContext'
import { Icon } from '../../icons'
import { BrandLogo } from '../../components/BrandLogo'
import { resolveAuroraNav, buildAuroraSidebarGroups } from '../aurora-nav'
import { useFileManager } from '@stores/FileStore'
import { useLanguage } from '@stores/LanguageStore'
import { useUserProfile, userDisplayName, isBirthdayToday } from '@stores/UserProfileStore'
import { findNode } from '@core/files/fileTree'
import {
  getRecentFiles,
  subscribeRecentFiles,
  type RecentFileEntry,
} from '@core/files/recentFiles'
import { readSeedRecord } from '@features/onboarding/firstRun'
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

/** 按时段返回问候文案键（文案在 t.welcome，随界面语言切换） */
function greetingKeyByHour(hour: number): 'greetingNight' | 'greetingMorning' | 'greetingNoon' | 'greetingAfternoon' | 'greetingEvening' {
  if (hour < 5) return 'greetingNight'
  if (hour < 12) return 'greetingMorning'
  if (hour < 14) return 'greetingNoon'
  if (hour < 18) return 'greetingAfternoon'
  return 'greetingEvening'
}

/** 右栏 5 个模块入口（搜索单列在网格外，走命令面板）；labelKey 为 t.welcome 键，nav 为内部路由 id（中文，勿译） */
const MODULE_TILES = [
  { icon: 'calendar', labelKey: 'tileDiary', nav: '日记' },
  { icon: 'knowledge', labelKey: 'tileKnowledge', nav: '知识库' },
  { icon: 'canvas', labelKey: 'tileCanvas', nav: '白板' },
  { icon: 'blog', labelKey: 'tileBlog', nav: '博客' },
  { icon: 'settings', labelKey: 'tileSettings', nav: '设置' },
] as const

export function WelcomePanel({ nav }: WelcomePanelProps) {
  const { rootFolder, createFile, openFile } = useFileManager()
  const { openCommandPalette } = useCommandPalette()
  const { t, language } = useLanguage()

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

  // 首启播种的欢迎笔记：仅在「还没打开过任何文档」时接管左大卡。
  // 它是真实文件（不是演示浮层），用户在编辑器里改一个字就真的改到了自己的笔记。
  const seedNode = useMemo(() => {
    const rec = readSeedRecord()
    if (!rec?.docId) return null
    const node = findNode(rootFolder, rec.docId)
    return node && node.type === 'file' ? node : null
  }, [rootFolder])
  const heroIsSeed = !latest && Boolean(seedNode)
  const heroFileId = latest?.fileId ?? seedNode?.id ?? null

  // 人情味：欢迎问候使用用户设置的昵称（空则回退「用户」）
  const profile = useUserProfile()
  const displayName = userDisplayName(profile)

  const now = new Date()
  // 生日当天换一句问候 —— 这是生日字段唯一的消费方，档案卡上的承诺由此兑现
  const isBirthday = isBirthdayToday(profile.birthday)
  const hello = isBirthday ? t.welcome.birthdayGreeting : t.welcome[greetingKeyByHour(now.getHours())]
  // 日期/星期随界面语言本地化（Intl 单源，无需键位）
  const localeTag = language === 'en' ? 'en-US' : 'zh-CN'
  const weekday = now.toLocaleDateString(localeTag, { weekday: 'long' })
  const dateStr = now.toLocaleDateString(localeTag, { year: 'numeric', month: 'long', day: 'numeric' })

  // 相对时间（随语言）：刚刚 / n 分钟前 / n 小时前 / n 天前
  const formatRelativeTime = useCallback((ts: number): string => {
    const diff = Date.now() - ts
    const min = 60_000
    const hr = 3_600_000
    const day = 86_400_000
    if (diff < min) return t.welcome.agoNow
    if (diff < hr) return t.welcome.agoMinutes.replace('{n}', String(Math.floor(diff / min)))
    if (diff < day) return t.welcome.agoHours.replace('{n}', String(Math.floor(diff / hr)))
    if (diff < 7 * day) return t.welcome.agoDays.replace('{n}', String(Math.floor(diff / day)))
    return new Date(ts).toLocaleDateString(localeTag, { month: 'long', day: 'numeric' })
  }, [t, localeTag])

  const handleNav = useCallback(
    (id: string) => {
      nav?.(resolveAuroraNav(id))
    },
    [nav],
  )

  const handleNewNote = useCallback(() => {
    createFile(rootFolder.id, t.welcome.untitledNote, '', true)
    handleNav('编辑器')
  }, [createFile, rootFolder.id, handleNav, t])

  const handleOpenLatest = useCallback(() => {
    if (!heroFileId) {
      handleNewNote()
      return
    }
    openFile(heroFileId)
    nav?.(resolveAuroraNav('编辑器'))
  }, [heroFileId, openFile, nav, handleNewNote])

  const handleTile = useCallback(
    (tileNav?: string) => {
      if (tileNav) handleNav(tileNav)
      else openCommandPalette()
    },
    [handleNav, openCommandPalette],
  )

  return (
    <PageFrame
      sidebarGroups={buildAuroraSidebarGroups(t)}
      sidebarActiveId="welcome"
      onSidebarSelect={handleNav}
      statusRightItems={[
        { content: t.welcome.cmdPalette, clickable: true, onClick: () => openCommandPalette() },
      ]}
    >
      <div className="aurora-welcome">
        <div className="aurora-welcome__container">
          {/* 品牌头部：紧凑实色，去玻璃 / 去极光 / 去渐变 logo */}
          <div className="aurora-welcome__brand-bar">
            <BrandLogo size={42} className="aurora-welcome__brand-icon" />
            <div className="aurora-welcome__brand-title">MarkCraft</div>
          </div>

          {/* 人情味问候（真实数据） */}
          <div className="aurora-welcome__greeting">
            <div className="aurora-welcome__hello">
              {hello}，{displayName}
            </div>
            <div className="aurora-welcome__usage">
              {usageDays > 1
                ? t.welcome.usageDaysLine.replace('{n}', String(usageDays))
                : t.welcome.firstRunHint}
              {' · '}{weekday} · {dateStr}
            </div>
            {streak > 0 && (
              <div className="aurora-welcome__streak">{t.welcome.streakDaysLine.replace('{n}', String(streak))}</div>
            )}
            {isBirthday && (
              <div className="aurora-welcome__streak">{t.welcome.birthdayLine}</div>
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
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenLatest() }
              }}
            >
              <div>
                <div className="aurora-welcome__hero-meta">
                  <Icon.edit size={18} />
                  <span>{heroIsSeed ? t.welcome.firstRunHeroMeta : t.welcome.lastStayed}</span>
                </div>
                <div className="aurora-welcome__hero-title">{t.welcome.heroEditor}</div>
                <div className="aurora-welcome__hero-sub">
                  {latest
                    ? t.welcome.continueDoc.replace('{name}', latest.fileName.replace(/\.md$/i, '')) + ' · ' + formatRelativeTime(latest.lastOpened)
                    : heroIsSeed
                      ? t.welcome.firstRunHeroSub
                      : t.welcome.startFirstNote}
                </div>
              </div>
              <div className="aurora-welcome__hero-cta">
                {latest
                  ? t.welcome.continueEdit
                  : heroIsSeed
                    ? t.welcome.firstRunOpenDoc
                    : t.welcome.newNoteCta} →
              </div>
            </div>

            <div className="aurora-welcome__tiles">
              {MODULE_TILES.map((tile, ti) => {
                const TileIcon = Icon[tile.icon]
                return (
                  <div
                    key={tile.nav}
                    className="aurora-welcome__tile"
                    style={{ '--i': ti } as CSSProperties}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleTile(tile.nav)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTile(tile.nav) }
                    }}
                  >
                    <TileIcon size={22} />
                    <span className="aurora-welcome__tile-label">{t.welcome[tile.labelKey]}</span>
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
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTile(undefined) }
                }}
              >
                <Icon.search size={22} />
                <div className="aurora-welcome__tile-foot">
                  <span className="aurora-welcome__tile-label">{t.welcome.searchTile}</span>
                  <span className="aurora-welcome__tile-kbd">⌘K</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </PageFrame>
  )
}
