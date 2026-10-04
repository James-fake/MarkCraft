import { useEffect, useMemo, useState } from 'react'
import type { DiaryEntry } from '@features/diary'
import { parseYMD, daysInMonth } from '@features/diary'
import { useLanguage } from '@stores/LanguageStore'

const pad = (n: number) => String(n).padStart(2, '0')

/** 字数→热力等级（0=无日记，1~5=字数越多格越深）；accent 透明度梯度与 diary.css 的 is-heat-* 配套 */
const HEAT_LEVELS = [0, 0.14, 0.26, 0.40, 0.56, 0.72]
function heatLevel(words: number): number {
  if (words <= 0) return 0
  if (words < 150) return 1
  if (words < 400) return 2
  if (words < 800) return 3
  if (words < 1500) return 4
  return 5
}

interface DiaryMiniCalendarProps {
  entries: DiaryEntry[]
  focusDate: string
  todayStr: string
  onSelect: (date: string) => void
  onHover: (date: string | null) => void
}

/**
 * DiaryMiniCalendar —— 常驻 mini 月历（B 时间线流右栏）
 * - 周一起始网格；字数热力图（accent 透明度 5 档，字数越多格越深）、今天=accent 描边、选中=实色
 * - hover 某日 → 回调父级弹出「当日日记」浮窗（卡在「那年今日」上方）
 * - click 某日 → setFocusDate 把那天载入左列整屏编辑器
 * 复用真实日期工具 daysInMonth，不平行 mock。
 */
export function DiaryMiniCalendar({ entries, focusDate, todayStr, onSelect, onHover }: DiaryMiniCalendarProps) {
  const { t } = useLanguage()
  const WEEKDAYS = [
    t.diary.weekday.mon, t.diary.weekday.tue, t.diary.weekday.wed,
    t.diary.weekday.thu, t.diary.weekday.fri, t.diary.weekday.sat, t.diary.weekday.sun,
  ]
  const { y: fy, m: fm } = parseYMD(focusDate)
  const [view, setView] = useState<{ y: number; m: number }>({ y: fy, m: fm })

  // 跟随选中日：点击「那年今日 / 浮窗查看」跳转其他月份时，月历自动定位到该月
  useEffect(() => {
    setView({ y: fy, m: fm })
  }, [fy, fm])

  const dayWords = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entries) {
      // collectDiaryEntries 已按日期去重，这里取该日字数
      if (!map.has(e.date)) map.set(e.date, e.words)
    }
    return map
  }, [entries])

  const { y, m } = view
  const first = new Date(y, m - 1, 1)
  const lead = (first.getDay() + 6) % 7 // 周一=0
  const total = daysInMonth(y, m)
  const cells: (string | null)[] = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push(`${y}-${pad(m)}-${pad(d)}`)

  const shift = (delta: number) => {
    let ny = y
    let nm = m + delta
    if (nm < 1) { nm = 12; ny-- }
    else if (nm > 12) { nm = 1; ny++ }
    setView({ y: ny, m: nm })
  }

  return (
    <div className="dv2-cal" role="grid" aria-label={t.diary.calAria}>
      <div className="dv2-cal__head">
        <button className="dv2-cal__nav" onClick={() => shift(-1)} aria-label={t.diary.prevMonth}>‹</button>
        <span className="dv2-cal__title">{t.diary.calTitle.replace('{y}', String(y)).replace('{m}', String(m))}</span>
        <button className="dv2-cal__nav" onClick={() => shift(1)} aria-label={t.diary.nextMonth}>›</button>
      </div>
      <div className="dv2-cal__week">
        {WEEKDAYS.map((w) => (
          <span key={w} className="dv2-cal__wday">{w}</span>
        ))}
      </div>
      <div className="dv2-cal__grid">
        {cells.map((date, i) => {
          if (!date) return <span key={`b${i}`} className="dv2-cal__cell is-blank" />
          const words = dayWords.get(date) ?? 0
          const level = heatLevel(words)
          const isToday = date === todayStr
          const isFocus = date === focusDate
          const cls = [
            'dv2-cal__cell',
            level > 0 ? `is-heat-${level}` : '',
            isToday ? 'is-today' : '',
            isFocus ? 'is-focus' : '',
          ].filter(Boolean).join(' ')
          return (
            <button
              key={date}
              className={cls}
              role="gridcell"
              aria-label={date}
              onMouseEnter={() => onHover(date)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(date)}
            >
              {Number(date.slice(8, 10))}
            </button>
          )
          })}
      </div>
      <div className="dv2-cal__legend">
        <span className="dv2-cal__legend-label">{t.diary.heatLess}</span>
        <span className="dv2-cal__legend-grad">
          {HEAT_LEVELS.slice(1).map((a, i) => (
            <i key={i} style={{ background: `color-mix(in srgb, var(--mc-accent) ${a * 100}%, transparent)` }} />
          ))}
        </span>
        <span className="dv2-cal__legend-label">{t.diary.heatMore}</span>
      </div>
    </div>
  )
}
