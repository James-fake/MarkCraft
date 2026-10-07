import { readFileSync, existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * 路径别名「四处同改」契约测试（Phase 1 新增 · 2026-09-17）
 *
 * ## 为什么需要这条测试
 * 本仓的别名表被**复制在 4 处**，彼此没有任何机制保证一致：
 *   1. `tsconfig.json`          `compilerOptions.paths`（键带 `/*` 通配）
 *   2. `vite.config.ts`         dev / build
 *   3. `vitest.config.ts`       测试运行器
 *   4. `vite.smoke.config.ts`   沙箱冒烟构建
 *
 * tsconfig 无法 import JS，所以「单一数据源」在这里做不到；退而求其次用契约测试
 * 把 4 份钉在一起。
 *
 * ## 真实事故（本测试的由来）
 * Phase 1 下沉 `stores/storage` → `core/storage` 时首次引用 `@core`。
 * 当时只按方案纪律⑥改了 `tsconfig.json` + `vite.config.ts` 两处 —— 于是
 * **vitest 解析不到 `@core`，20 个测试文件在导入期直接崩溃**（1499 → 1334 用例）。
 * 更隐蔽的是：Phase 0 加别名时 `tsc` + `vitest` 全绿，但那只是**别名尚无人引用的休眠期**，
 * 绿灯给了「两处就够了」的假信心。
 *
 * ## 断言设计
 * 不只比「键集合」，还比「目标目录」—— 防止出现「键补齐了、值却写错」这种更隐蔽的漂移。
 */

const REPO_ROOT = resolve(__dirname, '..')

/** 各自独立维护一份 `alias` 对象字面量的 JS/TS 配置 */
const JS_CONFIGS = ['vite.config.ts', 'vitest.config.ts', 'vite.smoke.config.ts'] as const
/** 第 4 处：tsconfig 手写 paths（无法复用 JS 表） */
const TS_CONFIG = 'tsconfig.json'

/**
 * 已知悬空别名 —— **诚实绊线，不是豁免**。
 * 历史记录：`@workers` → `src/workers` 曾目录不存在、全仓零引用（源码结构审计 P2 立项），
 * 已于 P5-4（2026-10-02）从四处配置删除并清空本清单 —— 正是本用例设计的收口路径。
 */
const KNOWN_DANGLING = [] as const

/**
 * 剥离 JSONC 注释（逐字符扫描，**尊重字符串字面量**）。
 *
 * ⚠️ 不能用朴素的非贪婪块注释正则：tsconfig 的别名键里本身就含 `/*` 通配
 * （`"@core/*"` / `"@features/*"`…），朴素的「斜杠+星号」匹配会从它开始，
 * 一路吃到**后面 `/* Linting` 那条注释的结束符**，把整个 paths 块连同后续配置
 * 一起吞掉 —— 症状伪装成 JSON.parse 的 "Bad control character in string literal"，
 * 真凶却是「正则处理嵌套语言结构时不分字符串与注释」（实测 60 个 CR 被吃到只剩 30）。
 * 教训与死 CSS 扫描器同一类：**扫描器必须先排除字符串/注释上下文，否则恒真或恒假。**
 */
function stripJsonComments(text: string): string {
  let out = ''
  let inString = false
  let inLineComment = false
  let inBlockComment = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const next = text[i + 1]

    if (inLineComment) {
      if (c === '\n') {
        inLineComment = false
        out += c
      }
      continue
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') {
        inBlockComment = false
        i++
      } else if (c === '\n') {
        out += c // 保留换行，避免把相邻两行粘成一行
      }
      continue
    }
    if (inString) {
      out += c
      if (c === '\\') {
        out += next ?? '' // 保留转义序列
        i++
      } else if (c === '"') {
        inString = false
      }
      continue
    }
    if (c === '"') {
      inString = true
      out += c
      continue
    }
    if (c === '/' && next === '/') {
      inLineComment = true
      i++
      continue
    }
    if (c === '/' && next === '*') {
      inBlockComment = true
      i++
      continue
    }
    out += c
  }
  return out
}

interface AliasEntry {
  key: string
  /** 相对 `src/` 的子目录；空串表示 `src` 本身（`@src`） */
  dir: string
}

/** 从 `const alias = { ... }` 块里抽取别名键与目标目录（兼容 resolve/join 与直接 `SRC`） */
function readJsAliases(file: string): AliasEntry[] {
  const raw = readFileSync(resolve(REPO_ROOT, file), 'utf8')
  const block = raw.match(/const alias\s*=\s*\{([\s\S]*?)\n\}/)
  if (!block) throw new Error(`未在 ${file} 中找到 \`const alias = { ... }\` 块`)

  const entries: AliasEntry[] = []
  const re = /'(@[\w-]+)'\s*:\s*(?:(?:resolve|join)\(\s*SRC\s*,\s*'([^']+)'\s*\)|SRC)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(block[1])) !== null) {
    entries.push({ key: m[1], dir: m[2] ?? '' })
  }
  return entries
}

/** 读取 tsconfig.json 的 paths 键 */
function readTsAliasKeys(): string[] {
  const raw = readFileSync(resolve(REPO_ROOT, TS_CONFIG), 'utf8')
  const parsed = JSON.parse(stripJsonComments(raw)) as {
    compilerOptions?: { paths?: Record<string, string[]> }
  }
  return Object.keys(parsed.compilerOptions?.paths ?? {})
}

describe('路径别名「四处同改」契约', () => {
  const tables = JS_CONFIGS.map((file) => ({ file, entries: readJsAliases(file) }))
  const [baselineTable] = tables

  it('扫描面自检：确实从每份配置里读到了别名（防空数组假绿）', () => {
    expect(baselineTable.entries.length).toBeGreaterThan(5)
    for (const { file, entries } of tables) {
      expect(entries.length, `${file} 未解析出任何别名`).toBeGreaterThan(5)
    }
  })

  it('三份 JS 配置的别名「键」完全一致', () => {
    const baseline = baselineTable.entries.map((e) => e.key).sort()
    for (const { file, entries } of tables.slice(1)) {
      expect(entries.map((e) => e.key).sort(), `${file} 的别名键与 ${baselineTable.file} 不一致`).toEqual(baseline)
    }
  })

  it('三份 JS 配置的别名「目标目录」也完全一致（防键对值错的隐蔽漂移）', () => {
    const baseline = baselineTable.entries.map((e) => `${e.key}=${e.dir}`).sort()
    for (const { file, entries } of tables.slice(1)) {
      expect(
        entries.map((e) => `${e.key}=${e.dir}`).sort(),
        `${file} 的别名目标与 ${baselineTable.file} 不一致`,
      ).toEqual(baseline)
    }
  })

  it('tsconfig.json 的 paths 与 JS 别名表严格对应（每个别名须同时有裸键与 /* 通配）', () => {
    const expected = baselineTable.entries
      .flatMap((e) => [e.key, `${e.key}/*`])
      .sort()
    expect(readTsAliasKeys().sort()).toEqual(expected)
  })

  it('每个别名的目标目录真实存在', () => {
    const missing: string[] = []
    for (const { key, dir } of baselineTable.entries) {
      if ((KNOWN_DANGLING as readonly string[]).includes(key)) continue
      const target = dir ? resolve(REPO_ROOT, 'src', dir) : resolve(REPO_ROOT, 'src')
      if (!existsSync(target) || !statSync(target).isDirectory()) missing.push(`${key} → ${target}`)
    }
    expect(missing, `存在指向不存在目录的别名：${missing.join(' ; ')}`).toEqual([])
  })

  it('已知悬空别名清单不得静默失真（真被修复则报红，提示同步清空清单）', () => {
    for (const key of KNOWN_DANGLING) {
      const entry = baselineTable.entries.find((e) => e.key === key)
      expect(entry, `已知悬空别名 ${key} 已从配置中消失 → 请同步清空 KNOWN_DANGLING`).toBeDefined()
      const target = resolve(REPO_ROOT, 'src', entry!.dir)
      expect(
        existsSync(target),
        `已知悬空别名 ${key} 的目标目录 src/${entry!.dir} 已存在 → 请从 KNOWN_DANGLING 移除`,
      ).toBe(false)
    }
  })
})
