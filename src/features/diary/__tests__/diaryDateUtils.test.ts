import { describe, it, expect } from 'vitest'
import {
  fmtDate,
  daysInMonth,
  addMonths,
  addDays,
  clampDay,
  buildMonthGrid,
  rangeBetween,
  onThisDay,
  buildYearGrid,
  parseDateQuery,
  type DiaryEntry,
} from '../diaryDateUtils'

const mkEntry = (date: string, extra: Partial<DiaryEntry> = {}): DiaryEntry => ({
  id: date,
  date,
  content: '',
  title: date,
  excerpt: '',
  words: 10,
  tags: [],
  ...extra,
})

describe('fmtDate', () => {
  it('使用本地时区分量格式化，补零', () => {
    expect(fmtDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(fmtDate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('daysInMonth（闰年边界）', () => {
  it('平年二月 28 天', () => {
    expect(daysInMonth(2025, 2)).toBe(28)
    expect(daysInMonth(2026, 2)).toBe(28)
  })
  it('闰年二月 29 天', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2000, 2)).toBe(29)
  })
  it('大月 31 / 小月 30', () => {
    expect(daysInMonth(2026, 1)).toBe(31)
    expect(daysInMonth(2026, 4)).toBe(30)
  })
})

describe('addMonths（跨年安全）', () => {
  it('12 月 +1 → 次年 1 月', () => {
    expect(addMonths(2026, 12, 1)).toEqual({ y: 2027, m: 1 })
  })
  it('1 月 -1 → 上年 12 月', () => {
    expect(addMonths(2026, 1, -1)).toEqual({ y: 2025, m: 12 })
  })
  it('多个月偏移', () => {
    expect(addMonths(2026, 11, 3)).toEqual({ y: 2027, m: 2 })
  })
})

describe('addDays（跨月/闰年）', () => {
  it('普通跨月', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('闰年 2 月 29 日', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01')
  })
  it('年末跨年', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('clampDay', () => {
  it('将越界日收敛到当月最大天数', () => {
    expect(clampDay(2026, 2, 31)).toBe(28)
    expect(clampDay(2024, 2, 31)).toBe(29)
    expect(clampDay(2026, 1, 15)).toBe(15)
  })
})

describe('buildMonthGrid', () => {
  it('生成按周分组的网格，总数为 7 的倍数，非空格数=当月天数', () => {
    const grid = buildMonthGrid(2026, 7) // 31 天
    const flat = grid.flat()
    expect(flat.length % 7).toBe(0)
    expect(flat.filter(d => d !== null).length).toBe(31)
  })
  it('首日前的空格数 = 该月 1 号的星期（周日为 0）', () => {
    const firstDow = new Date(2026, 6, 1).getDay()
    const grid = buildMonthGrid(2026, 7)
    const flat = grid.flat()
    const leadingNulls = flat.slice(0, 7).filter(d => d === null).length
    expect(leadingNulls).toBe(firstDow)
  })
  it('二月网格正确收敛天数（2026 平年 28 天）', () => {
    const grid = buildMonthGrid(2026, 2)
    expect(grid.flat().filter(d => d !== null).length).toBe(28)
  })
})

describe('rangeBetween', () => {
  it('含闭区间，顺序输入', () => {
    expect(rangeBetween('2026-01-01', '2026-01-03')).toEqual([
      '2026-01-01', '2026-01-02', '2026-01-03',
    ])
  })
  it('逆序输入自动纠正', () => {
    expect(rangeBetween('2026-01-03', '2026-01-01')).toEqual([
      '2026-01-01', '2026-01-02', '2026-01-03',
    ])
  })
})

describe('onThisDay', () => {
  const entries = [
    mkEntry('2026-07-30'),
    mkEntry('2025-07-30'),
    mkEntry('2024-07-30'),
    mkEntry('2026-07-29'),
  ]
  it('返回同月同日、不同年的日记，近→远排序', () => {
    const res = onThisDay(entries, '2026-07-30').map(e => e.date)
    expect(res).toEqual(['2025-07-30', '2024-07-30'])
  })
  it('排除自身日期', () => {
    const res = onThisDay(entries, '2024-07-30')
    expect(res.find(e => e.date === '2024-07-30')).toBeUndefined()
  })
})

describe('buildYearGrid', () => {
  it('12 行 × 31 列，平年二月 29 号后为空', () => {
    const grid = buildYearGrid([mkEntry('2026-02-14')], {}, 2026)
    expect(grid.length).toBe(12)
    expect(grid[1].length).toBe(31) // 二月
    expect(grid[1][27]).not.toBeNull() // 2-28
    expect(grid[1][28]).toBeNull() // 2-29 不存在
    expect(grid[1][29]).toBeNull() // 2-30
    const cell = grid[1][13] as { date: string } | null
    expect(cell?.date).toBe('2026-02-14')
  })
})

describe('parseDateQuery（自然语言，本地规则）', () => {
  const now = new Date(2026, 6, 30) // 2026-07-30
  it('今天', () => {
    expect(parseDateQuery('今天', now, []).date).toBe('2026-07-30')
  })
  it('昨天', () => {
    expect(parseDateQuery('昨天', now, []).date).toBe('2026-07-29')
  })
  it('去年今天', () => {
    expect(parseDateQuery('去年今天', now, []).date).toBe('2025-07-30')
  })
  it('YYYY年M月', () => {
    expect(parseDateQuery('2026年3月', now, []).date).toBe('2026-03-01')
  })
  it('YYYY/M 数字格式', () => {
    expect(parseDateQuery('2026/3', now, []).date).toBe('2026-03-01')
  })
  it('非法月份返回错误', () => {
    expect(parseDateQuery('2026年13月', now, []).error).toBeTruthy()
  })
  it('无法识别返回错误', () => {
    expect(parseDateQuery('你好世界', now, []).error).toBeTruthy()
  })
})
