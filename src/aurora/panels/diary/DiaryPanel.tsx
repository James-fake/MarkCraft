import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import type { Editor as TiptapEditorType } from '@tiptap/react'
import { Modal } from '@components/ui/Modal'
import { useLanguage } from '@stores/LanguageStore'
import { Button } from '@components/ui/Button'
import { PageFrame } from '../../components/shell/PageFrame'
import { useCommandPalette } from '../../components/command-palette/CommandPaletteContext'
import { Icon } from '../../icons'
import { resolveAuroraNav, buildAuroraSidebarGroups } from '../aurora-nav'
import { DiaryFormatToolbar } from './DiaryFormatToolbar'
import { DiaryMiniCalendar } from './DiaryMiniCalendar'
// —— 日记换芯（方案 B）：接入真实 TipTap 编辑核心，统一富文本能力 ——
import TiptapEditor, { TiptapEditorHandle } from '@features/editor/TiptapEditor'
import '../../styles/panels/diary.css'
import { useFileManager } from '@stores/FileStore'
import { findOrCreateDailyFolder } from '@features/fileManager/DailyNoteManager'
import type { FileNode } from '@src/types/fileManager'
import {
  type DiaryEntry,
  parseYMD,
  onThisDay,
} from '@features/diary'
import {
  MOODS,
  MOOD_CAT_LABEL,
  MOOD_CAT_LABEL_EN,
  type MoodKey,
  type MoodCat,
  type MoodStore,
  loadMoods,
  saveMoods,
  moodKeysOf,
  primaryMood,
  toggleMood,
} from '@features/diary'
import {
  countWords,
  extractTags,
  makeExcerpt,
  DAILY_PROMPTS,
  DAILY_PROMPTS_EN,
  TODAY_STR,
  pickPromptIdx,
  loadPromptIdx,
  savePromptIdx,
} from './diaryData'

interface DiaryPanelProps {
  nav?: (id: string) => void
  toast?: (msg: string) => void
}

const fmtHM = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

// Aurora 日记情绪语义色（B 去紫收口：mix 不再复用 features 层 violet）
const MOOD_SEMANTIC_COLOR: Record<MoodCat, string> = {
  pos: 'var(--mc-success)',
  neg: 'var(--mc-danger)',
  mix: 'var(--mc-warning)',
}

/* 从文件树收集真实日记条目（YYYY-MM-DD.md），算法与 features/diary 工具一致 */
function collectDiaryEntries(root: FileNode | null): DiaryEntry[] {
  const entries: DiaryEntry[] = []
  const walk = (node: FileNode) => {
    if (node.type === 'file') {
      const m = /^(\d{4}-\d{2}-\d{2})\.md$/.exec(node.name)
      if (m) {
        const content = node.content || ''
        entries.push({
          id: node.id,
          date: m[1],
          content,
          title: m[1],
          excerpt: makeExcerpt(content),
          words: countWords(content),
          tags: extractTags(content),
        })
      }
    }
    node.children?.forEach(walk)
  }
  if (root) walk(root)
  const seen = new Set<string>()
  return entries
    .filter((e) => (seen.has(e.date) ? false : (seen.add(e.date), true)))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function DiaryPanel({ nav }: DiaryPanelProps) {
  /* ---------- 真实运行环境（Phase 2 地基：RealProviders 已注入 FileManager/Modal 等） ---------- */
  const { rootFolder, createFile, createFolder, updateFileContent } = useFileManager()
  const { openCommandPalette } = useCommandPalette()
  const { t, language } = useLanguage()
  const isZh = language === 'zh'
  const D = t.diary
  /** 情绪标签按界面语言取（数据层 label/labelEn 双语） */
  const moodLabel = (m: { label: string; labelEn: string }) => (isZh ? m.label : m.labelEn)

  /* ---------- 真实日记条目：从文件树收集，回前台/聚焦时刷新避免陈旧 ---------- */
  const [refreshNonce, setRefreshNonce] = useState(0)
  useEffect(() => {
    const refresh = () => setRefreshNonce((n) => n + 1)
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- nonce: refreshNonce 为可见性/聚焦时强制重扫日记目录的失效闸（collectDiaryEntries 为读取型函数）
  const entries = useMemo(() => collectDiaryEntries(rootFolder), [rootFolder, refreshNonce])
  const entryMap = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries])

  /* ---------- 真实情绪：localStorage 单一数据源（loadMoods/saveMoods） ---------- */
  const [moods, setMoodsState] = useState<MoodStore>(loadMoods)
  const setMoods = useCallback((updater: MoodStore | ((prev: MoodStore) => MoodStore)) => {
    setMoodsState((prev) => {
      const next = typeof updater === 'function' ? (updater as (p: MoodStore) => MoodStore)(prev) : updater
      saveMoods(next)
      return next
    })
  }, [])

  const defaultFocus = useMemo(() => {
    if (entryMap.has(TODAY_STR)) return TODAY_STR
    return entries[0]?.date ?? TODAY_STR
  }, [entryMap, entries])

  /* ---------- 选择态 ---------- */
  const [focusDate, setFocusDate] = useState<string>(defaultFocus)
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  // 浮窗收起延迟（hover-intent）：鼠标从日期格移向浮窗途中（离开格）不立即消失，
  // 留出约 HOVER_CLOSE_MS 的窗口移动到浮窗细读；进入浮窗取消收起，离开浮窗再启动收起延迟。
  const HOVER_CLOSE_MS = 300
  const hoverCloseTimer = useRef<number | null>(null)
  const handleHover = useCallback((date: string | null) => {
    if (hoverCloseTimer.current) {
      window.clearTimeout(hoverCloseTimer.current)
      hoverCloseTimer.current = null
    }
    if (date == null) {
      hoverCloseTimer.current = window.setTimeout(() => {
        hoverCloseTimer.current = null
        setHoveredDate(null)
      }, HOVER_CLOSE_MS)
    } else {
      setHoveredDate(date)
    }
  }, [])
  // 卸载时清理挂起的收起定时器，避免卸载后 setState
  useEffect(() => () => {
    if (hoverCloseTimer.current) window.clearTimeout(hoverCloseTimer.current)
  }, [])
  const { y: fy, m: fm, d: fd } = parseYMD(focusDate)
  const focusedEntry = entryMap.get(focusDate) ?? null
  const weekday = t.diary.weekday[WEEKDAY_KEYS[new Date(focusDate + 'T00:00:00').getDay()]]

  /* ---------- 真实编辑核心接线（方案 B）：用 TiptapEditor 替换 textarea ---------- */
  const tiptapRef = useRef<TiptapEditorHandle>(null)
  const [editor, setEditor] = useState<TiptapEditorType | null>(null)
  useEffect(() => {
    let raf = 0
    let tries = 0
    const grab = () => {
      const ed = tiptapRef.current?.getEditor() ?? null
      if (ed) {
        setEditor(ed)
        return
      }
      if (tries++ < 12) raf = requestAnimationFrame(grab)
      else setEditor(null)
    }
    grab()
    return () => cancelAnimationFrame(raf)
  }, [focusDate])

  /* ---------- 交互态 ---------- */
  const [promptIdx, setPromptIdx] = useState(loadPromptIdx())
  const [moodOpen, setMoodOpen] = useState(false)
  const [save, setSave] = useState<{ status: 'saved' | 'error'; time: string }>({ status: 'saved', time: fmtHM() })
  const [liveWords, setLiveWords] = useState(0)
  /** 草稿态：日期→已创建文件 id（首篇落盘后、store 刷新前的过渡窗口内复用，避免重复建文件） */
  const draftIdsRef = useRef<Map<string, string>>(new Map())

  /* 字数统计：切换日期/条目时同步为当前条目字数；编辑中由 onEditorChange 实时更新 */
  useEffect(() => { setLiveWords(focusedEntry?.words ?? 0) }, [focusedEntry])

  /* ---------- 派生 ---------- */
  const focusedMoodKeys = moodKeysOf(focusDate, moods)
  const onThisDayList = useMemo(() => onThisDay(entries, focusDate), [entries, focusDate])
  const onThisDayCard = onThisDayList[0] ?? null
  const hoveredEntry = hoveredDate ? entryMap.get(hoveredDate) ?? null : null

  /* ---------- 每日一问 ---------- */
  const switchPrompt = useCallback(() => {
    setPromptIdx((i) => {
      const n = pickPromptIdx(i)
      savePromptIdx(n)
      return n
    })
  }, [])

  /* ---------- 情绪选择器 ---------- */
  const openMood = useCallback(() => setMoodOpen(true), [])
  const toggleMoodKey = useCallback(
    (key: MoodKey) => {
      setMoods((prev) => {
        const next = { ...prev }
        const list = toggleMood(moodKeysOf(focusDate, prev), key)
        if (list.length) next[focusDate] = list
        else delete next[focusDate]
        return next
      })
    },
    [focusDate, setMoods],
  )
  const confirmMood = useCallback(() => setMoodOpen(false), [])

  /* ---------- 编辑落盘：已有条目直接写回；无条目（当天还没写）首次输入即建文件并落盘 ---------- */
  const writeDiary = useCallback(
    (date: string, md: string) => {
      const existing = entryMap.get(date)
      if (existing) {
        updateFileContent(existing.id, md)
        return
      }
      // 过渡窗口：首篇已建文件但 store 尚未刷新，复用同一 id 继续写回，避免重复建文件
      const draftedId = draftIdsRef.current.get(date)
      if (draftedId) {
        updateFileContent(draftedId, md)
        return
      }
      // 直接进入编辑态：首次输入即创建当天日记（空模板、不切走当前文件），内容同步落盘
      const folderId = findOrCreateDailyFolder(rootFolder, createFolder)
      const newId = createFile(folderId, `${date}.md`, md, false)
      if (newId) {
        draftIdsRef.current.set(date, newId)
      } else {
        // 必须抛出：调用方靠 try/catch 判定成败，静默返回会让 UI 显示“已保存”而内容并未落盘
        throw new Error(`Failed to create diary file: ${date}.md`)
      }
    },
    [entryMap, rootFolder, createFile, createFolder, updateFileContent],
  )

  const onEditorChange = useCallback(
    (md: string) => {
      try {
        writeDiary(focusDate, md)
        setLiveWords(countWords(md))
        setSave({ status: 'saved', time: fmtHM() })
      } catch {
        setSave({ status: 'error', time: fmtHM() })
      }
    },
    [focusDate, writeDiary],
  )

  const handleNav = (id: string) => nav?.(resolveAuroraNav(id))

  /* 浮窗「查看」→ 载入那天的编辑器并收起浮窗 */
  const viewHovered = useCallback(
    (date: string) => {
      setFocusDate(date)
      setHoveredDate(null)
    },
    [],
  )

  const hoveredMood = hoveredDate ? primaryMood(hoveredDate, moods) : null
  const hoveredMoodColor = hoveredMood ? MOOD_SEMANTIC_COLOR[hoveredMood.cat] : undefined

  return (
    <PageFrame
      sidebarGroups={buildAuroraSidebarGroups(t)}
      sidebarActiveId="diary"
      onSidebarSelect={handleNav}
      breadcrumbs={[D.breadcrumb]}
      statusLeftItems={[{ content: D.breadcrumb }, { content: D.countUnit.replace('{n}', String(entries.length)) }]}
      statusRightItems={[{ content: TODAY_STR }, { content: t.welcome.cmdPalette, clickable: true, onClick: () => openCommandPalette() }]}
    >
      <div className="dv2-root">
        {/* ============ 左栏：整屏编辑器（日期头 + 合并格式栏/编辑区） ============ */}
        <section className="dv2-editor-col">
          <div className="dv2-date-header">
            {focusDate === TODAY_STR && <span className="dv2-today-tag">{D.today}</span>}
            <span className="dv2-date-main">{D.dateFormat.replace('{fm}', String(fm)).replace('{fd}', String(fd)).replace('{wd}', weekday)}</span>
            <span className="dv2-date-year">· {fy}</span>
            {focusDate !== TODAY_STR && (
              <button className="dv2-link-btn" onClick={() => setFocusDate(TODAY_STR)}>{D.backToToday}</button>
            )}
            <button className="dv2-mood-btn" onClick={openMood}>
              <Icon.smile size={13} /> {D.recordMood}
            </button>
          </div>

          {focusedEntry ? (
            <div className="dv2-editor-block">
              <DiaryFormatToolbar editor={editor} />
              <TiptapEditor
                key={focusDate}
                ref={tiptapRef}
                value={focusedEntry.content}
                onChange={onEditorChange}
                fileId={focusedEntry.id}
                livePreview={false}
                showToolbar={false}
                showStatusBar={false}
              />
              <div className="dv2-editor-foot">
                <span className="dv2-wordcount">{D.wordsUnit.replace('{n}', String(liveWords))}</span>
                <div className={`dv2-save${save.status === 'error' ? ' is-error' : ''}`}>
                  <span className="dot" />
                  {save.status === 'error' ? D.unsaved : D.savedAt.replace('{time}', save.time)}
                </div>
              </div>
            </div>
          ) : (
            <div className="dv2-editor-block dv2-editor-block--draft">
              <DiaryFormatToolbar editor={editor} />
              <TiptapEditor
                key={focusDate}
                ref={tiptapRef}
                value=""
                onChange={onEditorChange}
                livePreview={false}
                showToolbar={false}
                showStatusBar={false}
              />
              <div className="dv2-editor-foot">
                <span className="dv2-wordcount">{D.wordsUnit.replace('{n}', String(liveWords))}</span>
                {focusDate === TODAY_STR ? (
                  <span className="dv2-draft-hint">{D.firstEntryHint}</span>
                ) : (
                  <span className="dv2-draft-hint">{D.emptyDateHint.replace('{date}', focusDate)}</span>
                )}
                <div className={`dv2-save${save.status === 'error' ? ' is-error' : ''}`}>
                  <span className="dot" />
                  {save.status === 'error' ? D.unsaved : D.savedAt.replace('{time}', save.time)}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ============ 右栏：常驻月历 + 悬停浮窗 + 那年今日 + 每日一问 ============ */}
        <aside className="dv2-side-col">
          <DiaryMiniCalendar
            entries={entries}
            focusDate={focusDate}
            todayStr={TODAY_STR}
            onSelect={setFocusDate}
            onHover={handleHover}
          />

          <div
            className={'dv2-popover-wrap' + (hoveredDate ? ' is-open' : '')}
            onMouseEnter={() => handleHover(hoveredDate)}
            onMouseLeave={() => handleHover(null)}
          >
            <div className="dv2-popover">
              {hoveredEntry ? (
                <>
                  <div className="dv2-popover__date">
                    {D.dateFormat.replace('{fm}', String(parseYMD(hoveredEntry.date).m)).replace('{fd}', String(parseYMD(hoveredEntry.date).d)).replace('{wd}', t.diary.weekday[WEEKDAY_KEYS[new Date(hoveredEntry.date + 'T00:00:00').getDay()]])}
                  </div>
                  <div className="dv2-popover__meta">
                    {hoveredMoodColor && <span className="dv2-dot" style={{ background: hoveredMoodColor }} />}
                    <span>{hoveredMood ? moodLabel(hoveredMood) : D.noMood} · {D.wordsUnit.replace('{n}', String(hoveredEntry.words))}</span>
                  </div>
                  <div className="dv2-popover__excerpt">{makeExcerpt(hoveredEntry.content)}</div>
                  <button className="dv2-popover__view" onClick={() => viewHovered(hoveredEntry.date)}>{D.view}</button>
                </>
              ) : (
                <div className="dv2-popover__empty">
                  <span>{D.noEntryThisDay}</span>
                  {hoveredDate && (
                    <button className="dv2-popover__view" onClick={() => { setFocusDate(hoveredDate); setHoveredDate(null) }}>{D.writeThis}</button>
                  )}
                </div>
              )}
            </div>
          </div>

          {onThisDayCard && (
            <div className="dv2-otd">
              <div className="dv2-otd__title">{D.onThisDay.replace('{y}', String(parseYMD(onThisDayCard.date).y))}</div>
              <div className="dv2-otd__excerpt">{onThisDayCard.excerpt}</div>
              <button className="dv2-otd__view" onClick={() => setFocusDate(onThisDayCard.date)}>{D.view}</button>
            </div>
          )}

          <div className="dv2-daily-q">
            <div className="dv2-daily-q__label">{D.dailyQ}</div>
            <div className="dv2-daily-q__text">{(isZh ? DAILY_PROMPTS : DAILY_PROMPTS_EN)[promptIdx]}</div>
            <button className="dv2-daily-q__switch" onClick={switchPrompt}><Icon.refresh size={12} /> {D.switchOne}</button>
          </div>
        </aside>
      </div>

      {/* ============ 情绪选择器弹层（共享 Modal 壳，行为/视觉与全站弹窗一致） ============ */}
      <Modal
        isOpen={moodOpen}
        onClose={() => setMoodOpen(false)}
        title={D.pickMood}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMoodOpen(false)}>
              {D.cancel}
            </Button>
            <Button variant="primary" onClick={confirmMood}>
              {D.confirmCount.replace('{n}', String(focusedMoodKeys.length))}
            </Button>
          </>
        }
      >
        {(['pos', 'neg', 'mix'] as const).map((cat) => (
          <div key={cat}>
            <div className="dv-mood-picker__category-title" style={{ color: MOOD_SEMANTIC_COLOR[cat] }}>
              {(isZh ? MOOD_CAT_LABEL : MOOD_CAT_LABEL_EN)[cat]}
            </div>
            <div className="dv-mood-picker__grid">
              {MOODS.filter((mm) => mm.cat === cat).map((mm) => {
                const sel = focusedMoodKeys.includes(mm.key)
                return (
                  <div
                    key={mm.key}
                    className={`dv-mood-picker__item${sel ? ' is-selected' : ''}`}
                    onClick={() => toggleMoodKey(mm.key)}
                  >
                    <span className="em">{mm.emoji}</span>
                    <span className="nm">{moodLabel(mm)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </Modal>

    </PageFrame>
  )
}
