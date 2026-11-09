/**
 * WYSIWYG 输入延迟探针（阶段 0 埋点，仅开发态生效）。
 *
 * 用途：把「每键击」拆成 getHTML / htmlToMarkdown / lint / pushHistory 四段，
 * 累积后输出 P50/P95，避免凭直觉优化掉占比最小的那一段。
 *
 * 生产态：所有函数都是 no-op（由调用方用 `import.meta.env.DEV` 守卫，rollup 可 tree-shake）。
 */
export interface KeyStrokeSample {
  getHtmlMs: number
  toMdMs: number
  lintMs: number
  pushMs: number
  /** 本次键击是否触发了序列化（阶段 2 防抖后会大量为 false） */
  serialized: boolean
}

const MAX_SAMPLES = 500
const samples: KeyStrokeSample[] = []
let serializedCount = 0
let totalCount = 0

export function recordKeyStroke(s: KeyStrokeSample): void {
  // 生产态守卫：未构建进 DEV 时直接 no-op（rollup tree-shake 一并移除），
  // 即便有调用方漏加守卫也不会污染生产运行。
  if (!import.meta.env.DEV) return
  samples.push(s)
  if (samples.length > MAX_SAMPLES) samples.shift()
  totalCount++
  if (s.serialized) serializedCount++
  // 每 100 次键击输出一次汇总，避免日志刷屏
  // eslint-disable-next-line no-console -- 仅开发态每 100 次键击输出一次汇总
  if (totalCount % 100 === 0) console.debug('[tiptap-perf]', summarize())
}

export interface PerfSummary {
  count: number
  serializeRate: string
  totalP50: number
  totalP95: number
  toMdP50: number
  lintP50: number
  pushP50: number
}

/** 汇总最近样本（也供单测直接断言） */
export function summarize(): PerfSummary {
  if (samples.length === 0) {
    return { count: 0, serializeRate: '0%', totalP50: 0, totalP95: 0, toMdP50: 0, lintP50: 0, pushP50: 0 }
  }
  const percentile = (arr: number[], p: number): number => {
    if (arr.length === 0) return 0
    const sorted = [...arr].sort((a, b) => a - b)
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
  }
  const totals = samples.map((s) => s.getHtmlMs + s.toMdMs + s.lintMs + s.pushMs)
  return {
    count: totalCount,
    serializeRate: `${((serializedCount / Math.max(1, totalCount)) * 100).toFixed(1)}%`,
    totalP50: percentile(totals, 0.5),
    totalP95: percentile(totals, 0.95),
    toMdP50: percentile(samples.map((s) => s.toMdMs), 0.5),
    lintP50: percentile(samples.map((s) => s.lintMs), 0.5),
    pushP50: percentile(samples.map((s) => s.pushMs), 0.5),
  }
}

/** 测试用：清空累积数据 */
export function resetPerfProbe(): void {
  samples.length = 0
  serializedCount = 0
  totalCount = 0
}
