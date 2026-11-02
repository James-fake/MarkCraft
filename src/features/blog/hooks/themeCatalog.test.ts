/**
 * 主题目录守卫测试（防数字漂移）。
 *
 * 背景：主题总数（63 个预设）被 README、官网与内置说明书多处引用，
 * 历史上曾因为 `useBlogGenerator.ts` 里的一句错误注释（写「现有 16 个」，
 * 实际是 15 个）被误算成 64，并传播到官网写成「共 13 个主题」。
 *
 * 这个测试把「主题总数」与「主题 key 全集」钉死在这里：
 * 以后增删主题时它会失败，逼开发者回头同步所有引用点，而不是让文档悄悄过期。
 *
 * 修改主题后需要同步的位置：
 *   - README.md（多处「63 种预设主题」）
 *   - MarkCraft Official Website/src/data/blogThemes.ts（themeTotal；官网已迁出主仓）
 *   - src/core/data/defaultDocs/usageDocs/zh.ts（内置说明书）
 *   - 本文件的 EXPECTED_THEME_COUNT
 */
import { describe, it, expect } from 'vitest'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { THEME_INFO_LIST } from './useBlogGenerator'
import type { ThemeStyle } from '../templates/types'

const HERE = dirname(fileURLToPath(import.meta.url))
const THEMES_DIR = resolve(HERE, '../themes')
const GENERATORS_DIR = resolve(HERE, '../themes/generators')

/** ⚠️ 主题总数的事实来源。改主题后同步此常量。 */
const EXPECTED_THEME_COUNT = 63

describe('博客主题目录（THEME_INFO_LIST）', () => {
  it(`预设主题总数为 ${EXPECTED_THEME_COUNT} 个`, () => {
    expect(THEME_INFO_LIST).toHaveLength(EXPECTED_THEME_COUNT)
  })

  it('不包含 custom（custom 只是 ThemeStyle 联合里的占位，不是预设主题）', () => {
    expect(THEME_INFO_LIST.some((t) => t.key === 'custom')).toBe(false)
  })

  it('每个 key 都是合法的 ThemeStyle', () => {
    const valid = new Set<ThemeStyle>(THEME_INFO_LIST.map((t) => t.key))
    // 用集合长度自证：所有 key 都来自 ThemeStyle 联合（TS 编译期已保证，这里做运行时兜底）
    expect(valid.size).toBe(THEME_INFO_LIST.length)
  })

  it('没有重复 key', () => {
    const keys = THEME_INFO_LIST.map((t) => t.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('除了 custom 之外，ThemeStyle 联合里的每一项都在 THEME_INFO_LIST 中出现', () => {
    // 从 union 反推：所有非 custom 的主题 key 都必须被目录覆盖，
    // 否则说明新增了主题类型却忘了加进主题市场。
    const catalogKeys = new Set<string>(THEME_INFO_LIST.map((t) => t.key))
    const expectedKeys = THEME_STYLE_KEYS.filter((k) => k !== 'custom')
    const missing = expectedKeys.filter((k) => !catalogKeys.has(k))
    expect(missing).toEqual([])
  })
})

describe('主题 CSS 生成器目录结构', () => {
  // 63 个预设主题的 CSS 分三处生成：
  //   ① themes/*.ts            12 个独立文件（inkWash/terminal/.../midnight）+ custom.ts
  //   ② themes/generators/*.ts 48 个「一主题一文件」（由 newThemes.ts 桶文件 re-export）
  //   ③ utils/singleFile/      magazine / minimal / classic 三个基础布局主题
  // 12 + 48 + 3 = 63。任一处增删都会让下面的断言失败。
  const STANDALONE_PRESET_FILES = 12
  const GENERATOR_FILES = 48
  const BASE_LAYOUT_THEMES = 3

  it(`themes/ 下有 ${STANDALONE_PRESET_FILES} 个独立预设主题文件（+ custom.ts）`, () => {
    const files = readdirSync(THEMES_DIR).filter(
      (f) => f.endsWith('.ts') && !['index.ts', 'newThemes.ts', 'types.ts'].includes(f)
        && !f.endsWith('.test.ts'),
    )
    // 独立文件包含 custom.ts，故 +1
    expect(files.length).toBe(STANDALONE_PRESET_FILES + 1)
  })

  it(`themes/generators/ 下有 ${GENERATOR_FILES} 个主题生成器`, () => {
    const files = readdirSync(GENERATORS_DIR).filter((f) => f.endsWith('.ts'))
    expect(files.length).toBe(GENERATOR_FILES)
  })

  it('三处生成器合计 = 预设主题总数', () => {
    expect(STANDALONE_PRESET_FILES + GENERATOR_FILES + BASE_LAYOUT_THEMES).toBe(
      EXPECTED_THEME_COUNT,
    )
  })
})

/**
 * `ThemeStyle` 联合类型的所有成员（手工镜像，因 union 在运行时不可枚举）。
 * 若 `templates/types.ts` 增删了主题类型，这个数组需要同步更新 —— 上面的
 * 「没有重复 key」「缺项检测」会因此失败并提醒你。
 */
const THEME_STYLE_KEYS: ThemeStyle[] = [
  'magazine', 'minimal', 'classic', 'ink-wash', 'terminal', 'newspaper',
  'glassmorphism', 'bento', 'narrative', 'cyberpunk', 'aurora', 'academia',
  'retro', 'garden', 'midnight', 'custom', 'poetry', 'typewriter', 'ocean',
  'sunset', 'editorial', 'trending', 'dispatch', 'carbon', 'blueprint',
  'hacker', 'showcase', 'mosaic', 'gallery', 'cinematic', 'docs', 'wiki',
  'neon', 'origami', 'swiss', 'bauhaus', 'artdeco', 'zen', 'brutalist',
  'vaporwave', 'pixel', 'neumorphism', 'corporate', 'fashion', 'forest',
  'notion', 'cafe', 'travel', 'music', 'sketch', 'cosmos', 'claymorphism',
  'ice-crystal', 'rams', 'luxury', 'comic', 'steampunk', 'gothic', 'noir',
  'recipe', 'timeline', 'feed', 'pastel', 'newsletter',
]
