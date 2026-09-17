# DESIGNBRIEF · 交互动效审查：退场（收回）缺失收口

- 日期：2026-09-17
- 范围：`src/aurora/**` 全部浮层与折叠表面
- 方法论：emilkowalski-skills（`find-animation-opportunities` 四问门控 + `apple-design` 流体原则）
- 用户诉求：「入场很好，**收回没有动画**，不够 Apple」+「审查还有哪里缺失交互动态」

---

## §1 Recon（动效现状基线）

### 1.1 技术栈与单源
- React 18 + **纯 CSS**（无 Framer Motion / GSAP / React Spring）。动画 = `animation` 关键帧 + `transition`。
- 时长单源：`tokens.css §11` → `--mc-dur-micro 100ms` / `fast 180ms` / `base 280ms` / `slow 420ms` / `lazy 500ms`
- 曲线单源：`--mc-ease-spring` / `in`（加速离场）/ `out`（强减速入场）/ `mac`（Apple 抽屉曲线）/ `in-out` / `linear`
- reduced-motion：`tokens.css §379–390` 统一把时长减半，并提供 `mc-rm-fade`（入）/ `mc-rm-fade-out`（出）

### 1.2 已经做对的三个范例（本次改造的范式来源）
| 表面 | 机制 | 证据 |
|---|---|---|
| **Modal** | `phase: open→exiting→closed` 相位机 + `data-exiting` + `MODAL_EXIT_MS=180` 后卸载 | `src/components/ui/Modal.tsx:36,67–82,145`；`components.css:1019–1046` |
| **Toast** | `exiting: true` + `TOAST_EXIT_MS` 后 filter 移除 | `src/components/ui/ToastProvider.tsx:135–136` |
| **侧栏分组折叠** | `grid-template-rows: 0fr↔1fr` + opacity **双向过渡**（真·常驻 DOM） | `shell.css:432–445`；`Sidebar.tsx` |

> 结论：**本仓已经有「不对称进出场」的正确范式，缺的不是标准，是覆盖面。**

---

## §2 核心缺陷（根因）

**浮层族全部是 `{open && createPortal(...)}` / `{isOpen && …}` 的条件渲染 —— 关闭即瞬时卸载。**

CSS 只有 `-in` 关键帧、没有 `-out`，JS 也没有「先播退场、再卸载」的相位机。
于是：**入场动画 180ms 播得很漂亮，关闭是硬切**（0ms 消失）。这正是用户说的「收回没有动画」。

这是一次**对称性缺口**，不是「动画不够多」。修法 = 给已有入场补上镜像收场，**不新增装饰动画**。

---

## §3 机会表（按杠杆排序 · 已过四问门控）

| # | 表面 | 现状（证据） | 目的 | 频率 | 建议动效 |
|---|---|---|---|---|---|
| **P0-1** | 菜单栏菜单（文件/编辑/视图…） | `MenuBar.tsx:349` `{isOpen && …}`；`components.css:425` `aurora-dropdown-in` | 空间一致性 | 偶发（tens/day） | 退场 `aurora-dropdown-out` **100ms** `--mc-ease-in`，`translateY(0→-4px)` + opacity，`pointer-events:none` |
| **P0-2** | 工具栏下拉 ×4（列表/更多/两版标题） | `ListDropdown.tsx:70`、`MoreDropdown.tsx:82`、`SourceHeadingDropdown.tsx:126`、`WysiwygHeadingDropdown.tsx:56` 均 `{open && createPortal}` | 空间一致性 | 偶发 | 同 P0-1（复用同一 `-out` 关键帧与相位机） |
| **P0-3** | 右键菜单族 ×5（白板/文件树/大纲/检视面板/Dock 更多） | `canvas.css:1355,1557`、`editor.css:874,1712` `aurora-menu-in`；消费者 `CanvasContextMenu.tsx:99`、`FileTree.tsx:560,584`、`AuroraOutline.tsx:328`、`CanvasInspectorPanel.tsx:87`、`CanvasDock.tsx:278` | 空间一致性 | 偶发 | 退场 `aurora-menu-out` **100ms**，`scale(1→0.97)` + opacity，保持各自 `transform-origin`（从光标原路缩回） |
| **P0-4** | 滚轮选择器（AuroraSelect / DateWheel / NumberWheel / OptionWheel / ScrollNumber） | `components.css:780` `aurora-wheel-in`；`AuroraSelect.tsx:161` `if (!open \|\| !rect) return null` | 空间一致性 | 偶发 | 退场 `aurora-wheel-out` **100ms**，`translateY(0→-4px) scale(1→0.98)` |
| **P1-5** | 面板悬浮侧栏（白板浏览/检视、编辑器文件栏、图谱导航） | `canvas.css:97`、`editor.css:1010`、`graph.css:54` 均 `aurora-overlay-in 420ms`；消费者 `CanvasPanel.tsx:606,727`、`EditorPanel.tsx:733`、`GraphPanel.tsx:1114` | 空间一致性（同侧滑出） | 偶发 | 退场 `aurora-overlay-out-left/--right` **180ms** `--mc-ease-in`，`translateX(0→∓10px)`（**镜像入场路径**，与 Modal 入 420→出 180 的比例一致） |
| **P1-6** | Dock 浮动菜单 | `canvas.css:1692` `aurora-dock-float-in` | 空间一致性 | 偶发 | 退场 `aurora-dock-float-out` 100ms，`translate: 0 0 → 0 8px`（回落 dock） |
| **P2-7** | `.aurora-tooltip` + `aurora-tooltip-in` | `components.css:644–670`，**全仓 TSX 零消费者** | — | — | **不是动效问题，是死代码**：ui/Tooltip 走 `mc-tooltip`。建议清理或接线，勿先动画 |

---

## §4 拒绝清单（REQUIRED · 明确「不该动」的地方）

| 位置 | 考虑过但拒掉的理由 |
|---|---|
| **命令面板**（`commandPaletteNoAnim.test.ts` 守卫） | **键盘驱动、100+/天** → 四问第 1 问直接出局。Raycast/Spotlight 无开合动画，这是最优解。已有测试锁死，不动。 |
| **视图切换** `aurora-content-in`（`shell.css:946`） | 已是 09-11 定稿的从容层方案（420ms + `ease-mac` 纯 opacity，避开文字重栅格化）。**不重新讨论已定决策**。 |
| **Toast 退场** | 已经对称（`exiting` + `TOAST_EXIT_MS`）。无需动作。 |
| **Modal 退场** | 已经对称（相位机 + `data-exiting`）。本次仅作为范式引用。 |
| **FileTree / Outline 的展开收起** | **高频导航（tens/day）+ 桌面端惯例**：VS Code 文件树展开是瞬时的，加了反而拖慢。按频率门控拒绝。 |
| **Tooltip 的 hover-out** | hover 移出即时消失是**正确行为**（残留会阻碍视线）。且 `.aurora-tooltip` 无消费者。 |
| **`.aurora-welcome-tile-in` 的退场** | 欢迎页是常驻页面、不卸载，无需退场。 |
| **图表 / 数据视图的入场动画** | 用户在读数据，装饰性运动是阻碍。 |

---

## §5 实施方案（规格级 · 可直接执行）

### 5.1 新增共享原语 `usePresence`（对齐 Modal 相位机，单源化）

`src/aurora/hooks/usePresence.ts`

```ts
// 把 Modal.tsx 内联的 phase 机抽成共享原语，供全部浮层复用。
// 语义：open=true → mounted && !exiting；open=false → exiting（仍在 DOM）→ exitMs 后 unmount。
export type PresencePhase = 'open' | 'exiting' | 'closed'

export function usePresence(open: boolean, exitMs: number) {
  const [phase, setPhase] = React.useState<PresencePhase>(open ? 'open' : 'closed')
  React.useEffect(() => {
    if (open) { setPhase('open'); return }          // 重新打开 = 打断退场（可中断）
    setPhase((p) => (p === 'open' ? 'exiting' : p)) // 初始即 closed 的不要误入 exiting
  }, [open])
  React.useEffect(() => {
    if (phase !== 'exiting') return
    const t = window.setTimeout(() => setPhase('closed'), exitMs)
    return () => window.clearTimeout(t)
  }, [phase, exitMs])
  return { mounted: phase !== 'closed', exiting: phase === 'exiting' }
}
```

消费端改为：

```tsx
const { mounted, exiting } = usePresence(open, EXIT_MS)
// ...
{mounted && createPortal(
  <div className="aurora-dropdown" data-exiting={exiting || undefined} /* … */ />,
  document.body,
)}
```

**硬约束**
- `EXIT_MS` 必须与 CSS 动画时长**逐字对齐**（Modal 既有约定：`MODAL_EXIT_MS = 180` 对应 `--mc-dur-fast`）。
- 浮层 `EXIT_MS = 100`（对应 `--mc-dur-micro`）；面板浮层 `EXIT_MS = 180`（对应 `--mc-dur-fast`）。
- 退场期间必须 `pointer-events: none`（Modal 既有做法），否则幽灵浮层继续吞点击。
- **可中断**：`usePresence` 在 `open` 回到 true 时立即回 `open`，退场中途被重新打开不会跳变。

### 5.2 CSS 补出退场关键帧（`components.css` / `canvas.css` / `editor.css` / `graph.css`）

统一形态：`[data-exiting='true']` + `animation: <xxx-out> <dur> var(--mc-ease-in) forwards`（**加速离场 = Apple「出更快」**），`transform` **镜像入场路径**，**绝不 scale(0)**。

```css
/* 关键帧与入场一一镜像（同路径反演 = 空间一致性） */
@keyframes aurora-dropdown-out    { to { opacity: 0; transform: translateY(-4px); } }
@keyframes aurora-dropdown-out-up { to { opacity: 0; transform: translateY(4px); } }
@keyframes aurora-menu-out        { to { opacity: 0; transform: scale(0.97); } }
@keyframes aurora-wheel-out       { to { opacity: 0; transform: translateY(-4px) scale(0.98); } }
@keyframes aurora-overlay-out-left  { to { opacity: 0; transform: translateX(-10px); } }
@keyframes aurora-overlay-out-right { to { opacity: 0; transform: translateX(10px); } }
@keyframes aurora-dock-float-out  { to { opacity: 0; translate: 0 8px; } }

/* 使用（以 dropdown 为例；其余同构） */
.aurora-dropdown[data-exiting='true'] {
  animation: aurora-dropdown-out var(--mc-dur-micro) var(--mc-ease-in) forwards;
  pointer-events: none;
}
.aurora-menu[data-exiting='true']      { animation: aurora-menu-out var(--mc-dur-micro) var(--mc-ease-in) forwards;       pointer-events: none; }
.aurora-wheel-popover[data-exiting='true'] { animation: aurora-wheel-out var(--mc-dur-micro) var(--mc-ease-in) forwards;   pointer-events: none; }
.aurora-canvas__overlay[data-exiting='true'] { animation: aurora-overlay-out-left var(--mc-dur-fast) var(--mc-ease-in) forwards;  pointer-events: none; }
.aurora-canvas__overlay--right[data-exiting='true'] { animation-name: aurora-overlay-out-right; }
```

- `--mc-ease-in` 已是「退出/离场（加速离场）」语义 token（`tokens.css:175`），语义与实现一致。
- reduced-motion 由 `tokens.css §11` 统一减半生效，无需各处重复声明；退场若需纯淡出，走既有 `mc-rm-fade-out`。

### 5.3 消费者改造清单（共 6 类 / 16 处）
| 类 | 文件 | 改动 |
|---|---|---|
| 菜单栏 | `aurora/components/shell/MenuBar.tsx` | `isOpen` → `usePresence`，`aurora-dropdown` 加 `data-exiting` |
| 工具栏下拉 | `features/toolbar/ListDropdown.tsx`、`groups/MoreDropdown.tsx`、`groups/SourceHeadingDropdown.tsx`、`WysiwygHeadingDropdown.tsx` | 同上 |
| 右键菜单 | `panels/canvas/CanvasContextMenu.tsx`、`CanvasDock.tsx`、`CanvasInspectorPanel.tsx`、`panels/editor/FileTree.tsx`、`AuroraOutline.tsx` | 同上（`aurora-menu`） |
| 滚轮 | `components/ui/AuroraSelect.tsx`、`DateWheelPicker.tsx`、`DateWheelInput.tsx`、`NumberWheelPicker.tsx`、`OptionWheelPicker.tsx`、`ScrollNumberInput.tsx` | `return null` → `usePresence` 门控 |
| 面板浮层 | `panels/canvas/CanvasPanel.tsx`、`panels/editor/EditorPanel.tsx`、`panels/kb/GraphPanel.tsx` | `leftShown/rightShown` → 加退场相位（**注意**：hover 关闭 + `scheduleLeftClose` 已有延迟，退场需与 `cancelLeftClose` 重新打开协调） |
| Dock | `panels/canvas/CanvasDock.tsx` | `moreOpen` → `usePresence` |

> ⚠️ 面板浮层是**唯一需要小心的一类**：它们由 hover intent + 延迟关闭驱动，退场必须能被 `cancelXxxClose` 打断（`usePresence` 已天然支持）。

### 5.4 契约测试（新增 `src/aurora/styles/motionExit.test.ts`）
1. **每个 `-in` 关键帧都有镜像 `-out`**：扫 CSS，`@keyframes aurora-X-in` ↔ `@keyframes aurora-X-out` 成对（白名单：`aurora-content-in` / `aurora-welcome-tile-in` / `aurora-fade-in`(已有 out) / shimmer/spin/pulse/cursor-blink 等无限循环）。
2. **退场属性齐备**：每个 `.aurora-dropdown|menu|wheel|overlay[data-exiting='true']` 规则含 `pointer-events: none` 与 `var(--mc-ease-in)`。
3. **无 `scale(0)`**：全仓断言（防回退）。
4. **`usePresence` 单测**（`src/aurora/hooks/usePresence.test.ts`）：开→关走 `exiting` 并在 `exitMs` 后 `closed`；退场中途重开回到 `open` 且不跳变；初始 `closed` 不误入 `exiting`。
5. **消费者契约**：每个浮层组件快照/行为断言「关闭后仍渲染 `exitMs` 再卸载」。

### 5.5 验证
- `node node_modules/vitest/vitest.mjs run`（全量，基线 1170 passed / 3 failed 预存）+ `tsc --noEmit`。
- **真机 CDP 录帧**：以探针 `probe-motion-exit.mjs` 打开→关闭菜单，`requestAnimationFrame` 采样 `opacity` 序列，断言「关闭后至少 3 帧 opacity 在 0 与 1 之间」（= 真的在播，不是硬切）。截图仅证落位后（拖动/动画中截图不可信——既有铁律）。
- reduced-motion 分支：CDP `Emulation.setEmulatedMedia` 打开 `prefers-reduced-motion: reduce`，断言仍有过渡但更短。

---

## §6 工作量与优先级建议

| 批次 | 内容 | 收益 | 风险 |
|---|---|---|---|
| **P0**（建议先做） | `usePresence` + 菜单栏/工具栏下拉/右键菜单/滚轮 共 4 类 | **覆盖用户日常最高频的「收回」体感** | 低（纯加相位机 + CSS 镜像关键帧） |
| **P1** | 面板浮层 ×3 + Dock ×1 | 中（面板浮层入场 420ms 很显眼，硬切对比最强） | 中（hover intent 协调） |
| **P2** | `.aurora-tooltip` 死代码清理 | 低（工程卫生） | 低 |

> **最高杠杆单点 = P0-2 工具栏下拉族**：它是用户点击最频繁、入场动画最明显、而收场最生硬的地方。

---

## §7 实施记录（2026-09-17 · P0+P1 一次做完）

### 7.1 落地形态与方案的差异

| 项 | 方案 | 实际 | 原因 |
|---|---|---|---|
| 原语位置 | `src/aurora/hooks/usePresence.ts` | **`src/components/ui/usePresence.ts`** | 方案漏算了分层：`src/features/toolbar/*` 是逻辑层，**禁止反向依赖 aurora UI**（守卫 `local/no-aurora-ui-import`）。`src/components/ui/` 是共享中性层（features 早已在此引 `AuroraSelect` / `ToastProvider`），放这里两侧都能向下引用。 |
| API | 单个 `usePresence` | `usePresence(open)` + **`usePresenceValue(value)`** | `{menu && …}` 型浮层在 `setMenu(null)` 那一刻就丢了坐标 —— 退场无从渲染。`usePresenceValue` 在退场窗口内**保留最后一份非空载荷**（`lastRef`）。 |
| 覆盖面 | 6 类 / 16 处 | 6 类 / 18 处 | recon 补漏：图谱面板的**导出下拉**与**节点右键菜单**此前**连入场都没有**（瞬时出现），与同族 ctxmenu 明显不同步 —— 一并补齐进出双向。 |

### 7.2 新增/改动清单

**新增**
- `src/components/ui/usePresence.ts` —— 相位机单源（`usePhase` 内核 + 两个包装 + `POPOVER_EXIT_MS=100` / `OVERLAY_EXIT_MS=180`）
- `src/components/ui/usePresence.test.ts` —— 10 例
- `src/aurora/styles/motionExit.test.ts` —— 53 例
- `.workbuddy/artifacts/MOTION-EXIT-DEMO.html` —— 可交互对照演示（左「硬切」/ 右「退场」）
- `.workbuddy/probe-motion-exit.mjs`、`.workbuddy/capture-open-state.mjs`

**CSS（退场关键帧 + `[data-exiting='true']` 规则）**
`components.css`（dropdown/menu/wheel）· `canvas.css`（overlay + right / dock-float / ctxmenu / cip-menu）· `editor.css`（editor-overlay + right / filetree / outline ctxmenu）· `graph.css`（graph-overlay / ctxmenu / export-menu）· `tokens.css`（reduced-motion 名单补 12 个退场选择器）

**TSX（18 处消费者接入相位机）**
`MenuBar`（抽出模块级 `MenuPop` 子组件 —— `MENUS.map` 里不能直接调 hook）· 工具栏下拉 ×4 · 右键菜单 ×5 · 滚轮 ×3 · 面板浮层 ×3 · Dock ×4 · 图谱 ×2

### 7.3 三个必须记住的坑

1. **reduced-motion 会劫持退场**。`tokens.css §11` 对 `.aurora-dropdown` 等一律 `animation-name: mc-rm-fade !important` —— 而 `mc-rm-fade` 是**淡入**。退场选择器若不逐个登记进 `mc-rm-fade-out` 名单，降级模式下退场会变成「淡入再消失」的闪跳。已登记 12 个，并有断言守。
2. **`animation` 简写不能替代 `animation-name` 覆盖**。退场规则用 `animation: <name> <dur> <ease> forwards` 设置时长；降级模式只覆盖 `animation-name`（带 `!important`），时长仍取简写里的值（100/180ms）—— 语义正确，无需额外处理。
3. **同文件多处 Edit 必须串行**。本轮两次踩中：并行 Edit 到同一文件时后写覆盖先写，静默丢改动 —— 症状是 `tsc` 报「变量声明未使用 / 找不到名称」这类自相矛盾的组合。**改完必须 grep 核验**，不能只看 Edit 的 success。

### 7.4 验证结果

- **测试**：新增 63 例全绿；全仓 `1233 passed / 3 failed / 2 skipped`。3 项失败 = 既有预存（`commandWiring` / `KbPanel.smoke` / `blogCssRefs`），与本需求无关。
  - 其中 3 项**原有断言**因本次改造而失效，已按新契约加强而非放宽：`MenuBar.smoke` ×2、`GraphPanel.smoke` ×1 —— 从「关闭后立刻为 null」改为「先断言 `data-exiting='true'`（退场真在播）→ 再 `waitFor` 卸载」。**断言更强了**。
- **`tsc --noEmit`**：干净。
- **真机 CDP**（Edge headless @9446，page 内 rAF 采样 opacity / `data-exiting` / `pointer-events`）：

| 场景 | 结果 |
|---|---|
| 菜单栏下拉（P0-1，100ms） | 4 帧 `data-exiting` · 3 帧中间 opacity · 4/4 `pointer-events:none` · 末帧已卸载。曲线 `1 → 0.995 → 0.872 → 0.701` |
| 图谱导航浮层（P1-5，180ms） | 11 帧 · 9 帧中间值 · 11/11 · 末帧已卸载。曲线 `0.993 → 0.977 → 0.947 → 0.898 → 0.826 → 0.726` |
| 编辑器左悬浮栏（P1-5，180ms） | 13 帧 · 9 帧中间值 · 13/13 · 末帧已卸载 |

> **判定方法学**：动画中的截图受合成节流影响会返回旧帧（既有铁律），故本项验证**只读 DOM/CSSOM 数值序列**，不依赖帧快照。「退场真的在播」的判据 = 存在 ≥3 帧「元素仍在 DOM ∧ `data-exiting=true` ∧ 0 < opacity < 1」。

### 7.5 有意不动的部分（复核 §4）

命令面板、FileTree/Outline 展开收起、Tooltip hover-out、视图切换、Toast/Modal、`.aurora-tooltip` 死代码 —— 全部按原计划保持原状，理由见 §4。

