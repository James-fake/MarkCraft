/**
 * 浮层退场动效契约（动效审计 P0/P1 · 对称性收口）
 * ------------------------------------------------------------
 * 事故背景（用户报障）：「点击列表显示的动画很好，但是列表**收回**的动画就没有，不够 Apple」。
 * 根因：浮层族一律 `{open && createPortal(...)}` —— 关闭即瞬时卸载，CSS 里只有 `-in` 关键帧。
 *
 * 本文件把「进出对称」从口头约定升级为可执行断言：
 *  1. **镜像**：每个 `-out` 关键帧必须与配对的 `-in` 逐字反演
 *     （`-in` 的 `from` ≡ `-out` 的 `to`，`-in` 的 `to` ≡ `-out` 的 `from`）——
 *     即「沿入场原路退回」，这是空间一致性的定义，不是审美偏好；
 *  2. **可交互性**：[data-exiting] 规则必须 pointer-events:none，否则幽灵浮层继续吞点击；
 *  3. **时长分层**：浮层 100ms（--mc-dur-micro）/ 面板浮层 180ms（--mc-dur-fast），且用 --mc-ease-in；
 *  4. **无 scale(0)**：全仓防回退（RECIPES 铁律，起手 0.96/0.97）；
 *  5. **reduced-motion 登记**：退场选择器必须进 mc-rm-fade-out 名单 ——
 *     否则降级模式下会被 mc-rm-fade（**淡入**）劫持，退场变成「淡入再消失」的闪跳；
 *  6. **消费者接线**：每个表面都必须真的挂上 data-exiting（CSS 做对了但 TSX 没接 = 白干）。
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve, join } from 'path'
import { describe, it, expect } from 'vitest'

const STYLE_ROOT = resolve(__dirname)
const REPO_ROOT = resolve(__dirname, '../../..')

function collectCss(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...collectCss(p))
    else if (name.endsWith('.css')) out.push(readFileSync(p, 'utf-8'))
  }
  return out
}

/** 全量 Aurora CSS 拼接（关键帧单源跨文件，故必须合并后再断言） */
const ALL = collectCss(STYLE_ROOT).join('\n')
/**
 * 剥注释后的 CSS —— 断言必须走这一份。
 * 本仓注释里大量引用选择器名（如「关键帧单源 = components.css 的 aurora-menu-in」），
 * 裸 `indexOf`/宽松正则会先命中注释，产生假阳性。
 */
const CSS = ALL.replace(/\/\*[\s\S]*?\*\//g, '')

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 声明块归一：拆声明 → 排序 → 拼接（对书写顺序/缩进不敏感） */
const normalize = (decls: string) =>
  decls
    .split(';')
    .map((d) => d.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .sort()
    .join('; ')

/** 取 `@keyframes <name>` 的整个块体 */
const keyframe = (name: string): string => {
  const m = CSS.match(new RegExp(`@keyframes\\s+${esc(name)}\\s*\\{([\\s\\S]*?)\\n\\}`))
  return m ? m[1] : ''
}

/** 取关键帧块内 from / to 的声明 */
const stop = (name: string, key: 'from' | 'to'): string => {
  const m = keyframe(name).match(new RegExp(`\\b${key}\\s*\\{([^}]*)\\}`))
  return m ? normalize(m[1]) : ''
}

/**
 * 取某选择器所在规则的声明块。选择器必须**在规则首**（行首、可带缩进），
 * 后续只能是 `,` 或 `{` —— 否则 `.aurora-editor__overlay` 会误匹配到
 * `.aurora-editor__overlay--right` / `.aurora-editor__overlay-body`。
 */
const ruleBody = (selector: string): string => {
  const m = CSS.match(
    new RegExp(`(?:^|\\n)[ \\t]*${esc(selector)}[ \\t]*(?:,[^{}]*)?\\{([^}]*)\\}`),
  )
  return m ? m[1] : ''
}

/** 取 `[data-exiting='true']` 变体的规则声明块 */
const exitRuleBody = (baseSelector: string): string => {
  const selector = `${baseSelector}[data-exiting='true']`
  const re = new RegExp(
    `(?:^|\\n)[ \\t]*${esc(selector)}[ \\t]*(?:,[^{}]*)?\\{([^}]*)\\}`,
    'g',
  )
  const bodies: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(CSS))) bodies.push(m[1])
  // 同一选择器可能命中两处：真实退场规则（components/canvas/...）与
  // tokens.css reduced-motion 里的 `animation-name: mc-rm-fade-out` 覆盖。
  // 取带完整 `animation:` 简写的那条（rm 覆盖只有 `animation-name:`）。
  return bodies.find((b) => /(?:^|[\s;])animation:/.test(b)) ?? bodies[0] ?? ''
}

// ─────────────────────────────────────────────────────────────
// 1. 镜像：-in 与 -out 逐字反演
// ─────────────────────────────────────────────────────────────
const MIRRORS: [string, string][] = [
  ['aurora-dropdown-in', 'aurora-dropdown-out'],
  ['aurora-dropdown-in-up', 'aurora-dropdown-out-up'],
  ['aurora-menu-in', 'aurora-menu-out'],
  ['aurora-wheel-in', 'aurora-wheel-out'],
  ['aurora-overlay-in', 'aurora-overlay-out'],
  ['aurora-overlay-in-right', 'aurora-overlay-out-right'],
  ['aurora-dock-float-in', 'aurora-dock-float-out'],
]

describe('进出场关键帧必须镜像（沿入场原路退回）', () => {
  for (const [inName, outName] of MIRRORS) {
    it(`${inName} ↔ ${outName}`, () => {
      expect(keyframe(inName), `${inName} 关键帧缺失`).not.toBe('')
      expect(keyframe(outName), `${outName} 关键帧缺失`).not.toBe('')

      // 起点必须等于终点的反演：入场从哪起手，退场就回到哪
      expect(stop(outName, 'to'), `${outName} 的 to 必须等于 ${inName} 的 from`).toBe(
        stop(inName, 'from'),
      )
      // 静止态必须是同一形态（二者都描述「完全可见」）
      expect(stop(outName, 'from'), `${outName} 的 from 必须等于 ${inName} 的 to`).toBe(
        stop(inName, 'to'),
      )
    })
  }

  it('退场关键帧绝不使用 scale(0)（RECIPES：起手 0.96/0.97）', () => {
    for (const [, outName] of MIRRORS) {
      expect(keyframe(outName)).not.toMatch(/scale\(\s*0\s*\)/)
    }
  })
})

// ─────────────────────────────────────────────────────────────
// 2. 退场规则：pointer-events + 时长分层 + 曲线
// ─────────────────────────────────────────────────────────────
const POPOVER_EXITS = [
  '.aurora-dropdown',
  '.aurora-canvas-ctxmenu',
  '.aurora-cip__menu',
  '.aurora-filetree__ctxmenu',
  '.aurora-outline__ctxmenu',
  '.aurora-wheel-popover',
  '.aurora-dock__float',
  '.aurora-graph__ctx',
  '.aurora-graph__menu',
]

const OVERLAY_EXITS = [
  '.aurora-canvas__overlay',
  '.aurora-editor__overlay',
  '.aurora-graph__overlay',
]

describe('退场规则齐备（pointer-events / 时长 / 加速曲线）', () => {
  for (const sel of [...POPOVER_EXITS, ...OVERLAY_EXITS]) {
    it(`${sel}[data-exiting='true'] 声明完整`, () => {
      const body = exitRuleBody(sel)
      expect(body, `${sel} 缺少 [data-exiting='true'] 退场规则`).not.toBe('')
      // 退场期间不得再拦截点击，否则「看得见撤不掉」的幽灵浮层会吞掉后续交互
      expect(body).toContain('pointer-events: none')
      // Apple「出更快」：退场用加速曲线
      expect(body).toContain('var(--mc-ease-in)')
      expect(body).toMatch(/animation:.*forwards/)
    })
  }

  it('浮层退场 = 100ms（--mc-dur-micro），面板浮层 = 180ms（--mc-dur-fast）', () => {
    for (const sel of POPOVER_EXITS) {
      expect(exitRuleBody(sel), `${sel} 应走即时层`).toContain('var(--mc-dur-micro)')
    }
    for (const sel of OVERLAY_EXITS) {
      expect(exitRuleBody(sel), `${sel} 应走快速层`).toContain('var(--mc-dur-fast)')
    }
  })

  it('面板浮层退场与入场构成不对称比例（入 420ms 从容层 → 出 180ms）', () => {
    for (const sel of OVERLAY_EXITS) {
      expect(ruleBody(sel)).toContain('var(--mc-dur-slow)')
    }
  })
})

// ─────────────────────────────────────────────────────────────
// 3. 全仓无 scale(0)
// ─────────────────────────────────────────────────────────────
describe('全局铁律', () => {
  it('Aurora CSS 全仓不存在 scale(0)（剥注释后断言，避免命中注释里的反例说明）', () => {
    const stripped = ALL.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(stripped).not.toMatch(/scale\(\s*0\s*\)/)
  })
})

// ─────────────────────────────────────────────────────────────
// 4. reduced-motion：退场选择器必须登记进 mc-rm-fade-out
// ─────────────────────────────────────────────────────────────
describe('prefers-reduced-motion 降级不劫持退场', () => {
  const fadeOutIdx = ALL.indexOf('animation-name: mc-rm-fade-out !important;')
  /** mc-rm-fade-out 那条规则的选择器列表（前一条规则结束 → 本声明之间） */
  const exitSelectorList =
    fadeOutIdx === -1 ? '' : ALL.slice(ALL.lastIndexOf('}', fadeOutIdx), fadeOutIdx)

  it('mc-rm-fade-out 名单存在（降级模式有专门的退场淡化）', () => {
    expect(fadeOutIdx).toBeGreaterThan(-1)
    expect(exitSelectorList).not.toBe('')
  })

  for (const sel of [...POPOVER_EXITS, ...OVERLAY_EXITS]) {
    it(`${sel} 已登记（否则退场会被 mc-rm-fade 淡入劫持 → 闪跳）`, () => {
      expect(exitSelectorList).toContain(`${sel}[data-exiting='true']`)
    })
  }
})

// ─────────────────────────────────────────────────────────────
// 5. 消费者接线：CSS 做对了但 TSX 没接 = 白干
// ─────────────────────────────────────────────────────────────
const CONSUMERS: [string, string][] = [
  ['src/aurora/components/shell/MenuBar.tsx', '菜单栏七组下拉'],
  ['src/features/editor/toolbar/ListDropdown.tsx', '工具栏·列表下拉'],
  ['src/features/editor/toolbar/WysiwygHeadingDropdown.tsx', '工具栏·WYSIWYG 标题下拉'],
  ['src/features/editor/toolbar/groups/SourceHeadingDropdown.tsx', '工具栏·源码标题下拉'],
  ['src/features/editor/toolbar/groups/MoreDropdown.tsx', '工具栏·更多下拉'],
  ['src/aurora/panels/canvas/CanvasContextMenu.tsx', '白板右键菜单'],
  ['src/aurora/panels/canvas/CanvasPanel.tsx', '白板右键菜单宿主 + 左右悬浮栏'],
  ['src/aurora/panels/canvas/CanvasInspectorPanel.tsx', '检视面板下拉'],
  ['src/aurora/panels/canvas/CanvasDock.tsx', 'Dock 四类浮层'],
  ['src/aurora/panels/editor/FileTree.tsx', '文件树右键菜单'],
  ['src/aurora/panels/editor/AuroraOutline.tsx', '大纲右键菜单'],
  ['src/aurora/panels/editor/EditorPanel.tsx', '编辑器左右悬浮栏'],
  ['src/aurora/panels/kb/GraphPanel.tsx', '图谱导航浮层 + 节点菜单 + 导出下拉'],
  ['src/components/ui/AuroraSelect.tsx', '滚轮选择器（AuroraSelect）'],
  ['src/components/ui/ScrollNumberInput.tsx', '滚轮选择器（数字）'],
  ['src/components/ui/DateWheelInput.tsx', '滚轮选择器（日期）'],
]

describe('消费者必须真的接上相位机（两侧同断言）', () => {
  for (const [rel, label] of CONSUMERS) {
    it(`${label} → ${rel}`, () => {
      // 🧩 P2-3 拆分适配：GraphPanel 的浮层 JSX 已拆至 graph/ 子模块 ——
      //    契约断言的是「接线存在」而非「文件位置」，扫描面 = 宿主 + 同目录拆分模块拼接。
      const candidates = rel.endsWith('GraphPanel.tsx')
        ? [rel, 'src/aurora/panels/kb/graph/GraphSidebar.tsx', 'src/aurora/panels/kb/graph/GraphOverlays.tsx', 'src/aurora/panels/kb/graph/GraphCanvasArea.tsx']
        : [rel]
      const src = candidates.map((f) => readFileSync(resolve(REPO_ROOT, f), 'utf-8')).join('\n')
      expect(src, `${rel} 未接入 usePresence`).toMatch(/usePresence(Value)?/)
      expect(src, `${rel} 未透出 data-exiting`).toContain('data-exiting')
    })
  }

  it('相位机单源 = src/components/ui/usePresence.ts（共享中性层，features 不得反向依赖 aurora）', () => {
    const hook = readFileSync(resolve(REPO_ROOT, 'src/components/ui/usePresence.ts'), 'utf-8')
    expect(hook).toContain('export function usePresence')
    expect(hook).toContain('export function usePresenceValue')
    expect(hook).toContain('export const POPOVER_EXIT_MS = 100')
    expect(hook).toContain('export const OVERLAY_EXIT_MS = 180')
  })
})
