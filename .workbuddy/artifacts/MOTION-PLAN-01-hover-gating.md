# PLAN 01 — 悬停动效指针类型门控（hover gating）

- **严重度**：HIGH（无障碍 + 正确性）
- **基线 commit**：`075821f`
- **预估改动**：1 个文件（`tokens.css`）+ 少量就地包裹
- **依赖**：无
- **风险**：低（纯新增 media query 包裹，不改任何视觉值）

---

## 1. 背景（执行者须知）

MarkCraft 是桌面端编辑器，**主要目标平台是有精确指针（鼠标）的桌面**。但代码库有 312 处 `:hover` 规则，
**0 处**做了指针类型门控。

问题：在触摸屏 / 触摸板 / 触屏笔记本上，点击会触发「假 hover」并在手指离开后**残留 hover 态**。
对于**位移型 hover**（如 `transform: scale()` / `translate()`），这会产生错误的视觉反馈。

Emil Kowalski 的 AUDIT.md §6 明确要求：

```css
@media (hover: hover) and (pointer: fine) {
  .element:hover { transform: scale(1.05); } /* touch fires false hovers on tap */
}
```

**策略选择（重要）**：不要逐条改写 312 处 hover。分两级处理：
- **P0（本计划必做）**：先做**全局兜底**——在 token 层新增一条「触屏下抑制残留 hover 位移」的规则块，
  以最小改动消除最有害的一类（位移型假 hover）。
- **P1（记录，不本研究做）**：长期把新写的 hover 逐步纳入 `@media (hover: hover)` 范式（写入项目约定）。

---

## 2. 精确改动

### 文件：`src/aurora/styles/tokens.css`

在 `§11 动效 token` 区块**之后**、`§RM（prefers-reduced-motion）` 区块**之前**，新增如下区块。
（`tokens.css` 经 `aurora-main.tsx` 静态全量加载，故此处规则对所有 panel 生效。）

```css
/* ============================================================
 * 指针类型门控 · 触屏假 hover 抑制（audit 2026-09-14 #1）
 * - 桌面（hover:hover + pointer:fine）= 完整 hover 体验，本块不生效
 * - 触屏 / 粗糙指针 = 悬停位移归零，避免点击后残留 scale/translate
 * - 只中和「位移型」假 hover；颜色/背景类 hover 无害，保留
 * ========================================================== */
@media (hover: none), (pointer: coarse) {
  /* 位移型 hover 一律归位（触屏不悬停，位移是错误反馈） */
  .aurora-btn:hover,
  .aurora-blog-btn--primary:hover,
  .aurora-kb-btn:hover,
  .aurora-settings__btn:hover,
  .aurora-welcome__tile:hover,
  .aurora-dock__item:hover,
  .aurora-mindmap__node:hover,
  .aurora-csp__fileitem:hover,
  .aurora-command__item:hover {
    transform: none;
  }
}
```

**说明（写给执行者）**：
- 上面选择器列表是「当前用到了位移型 hover 的组件」的**显式枚举**。执行前请先用
  `grep -rnE ":hover[^{]*\{[^}]*transform" src --include=*.css` 复核列表，把**任何遗漏的**含 `transform` 的 hover 选择器补进去。
- ⚠️ **不要**在这一块里写 `*:hover { transform: none }` —— 会误伤手写交互组件的内联样式与手势态。
  枚举法更安全、更可审计。
- 颜色/背景类 hover**不要**加入（`background: var(--mc-bg-hover)` 之类在触屏上无害，且点击反馈有意义）。

---

## 3. 验证

### 3.1 静态
```bash
node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
```
（CSS 改动不影响 tsc，跑一遍确认无附带破坏。）

### 3.2 契约测试（新增，推荐）
在 `src/aurora/panels/blog/themeMarketTypography.test.ts` 同一目录风格下，
新建 `src/aurora/styles/motionGating.test.ts`（或追加到已有 CSS 契约测试文件），断言：

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const tokens = readFileSync('src/aurora/styles/tokens.css', 'utf8')

describe('指针类型门控', () => {
  it('触屏下抑制位移型假 hover', () => {
    expect(tokens).toMatch(/@media \(hover: none\), \(pointer: coarse\)/)
    expect(tokens).toMatch(/\.aurora-btn:hover[\s\S]{0,200}?transform: none/)
  })
  it('不得用通配符 *:hover 归位（避免误伤手势态）', () => {
    expect(tokens).not.toMatch(/\*:hover\s*\{[^}]*transform:\s*none/)
  })
})
```

### 3.3 真机/模拟器 feel-check（必做）
1. 启动 dev server：`node node_modules/vite/bin/vite.js --port 5174 --host`
2. Edge DevTools → **Toggle device toolbar** → 切到触摸模拟（Touch）
3. 逐个点击：主按钮、知识库按钮、欢迎页 tile、dock 图标
4. **预期**：点击后**不残留**缩放/位移；背景色类 hover 仍可短暂出现（无害）
5. 关掉触摸模拟，用鼠标复核：hover 位移**依旧生效**（回归检查）

### 3.4 全量回归
```bash
node node_modules/vitest/vitest.mjs run
```
**基线**：`848 passed / 3 failed / 2 skipped`（3 项为已知：commandWiring 45vs48、KbPanel「编辑」双匹配、blogCssRefs）。
**通过标准**：passed 数 ≥ 848，failed 仍为 3 且失败项名称不变。

---

## 4. 硬性范围边界

- ✅ 允许改：`src/aurora/styles/tokens.css`（新增一个 media 块）、新增测试文件
- ❌ 禁止改：任何组件 TSX、任何既有 hover 规则的**视觉值**、`src/features/**`、`src/components/**`
- ❌ 禁止引入新依赖
- ❌ 禁止把颜色类 hover 一起归零（会削弱桌面端点击反馈）

---

## 5. 完成定义（DoD）

- [ ] `tokens.css` 新增指针门控块，选择器列表经 grep 复核无遗漏
- [ ] 契约测试通过（≥2 例）
- [ ] 触摸模拟下点击无残留位移；鼠标 hover 正常（截图各一张）
- [ ] 全量回归无新增失败
- [ ] 记忆：追加 `.workbuddy/memory/2026-09-14.md`（或当日）一条
