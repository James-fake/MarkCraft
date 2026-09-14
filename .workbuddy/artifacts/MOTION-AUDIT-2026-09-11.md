# MarkCraft Aurora 动效与交互穷尽式审查报告

> 审计日期：2026-09-11 · 方法论：emilkowalski-skills（improve-animations + find-animation-opportunities + emil-design-eng + animate）
> 性质：**只读审计，未改动任何源码**。所有 findings 均已逐条到源码行号复核确认（Hard Rule: Never present a finding you haven't confirmed）。
> 审计范围：`src/aurora/styles/**`（tokens/shell/components/toast/command-palette/panels 全部 CSS）+ `src/aurora/**` 关键 TSX + `src/components/ui/**` 共享控件。逐文件 sweep + 全站 keyframes/transition/:active/@media 全量 grep。

---

## 0. 总评

动效成熟度：**中上（7/10）**。

- ✅ token 体系完整（`--mc-dur-micro/fast/base/slow` × `--mc-ease-spring/in/out/in-out/linear`），`--mc-ease-out` 被 100+ 处正确消费；
- ✅ 出现了三个高质量局部：命令面板（强曲线 + 自带 reduced-motion）、DateWheelPicker（Apple 级圆柱滚轮）、边缘召唤 v7（hover-intent 220/180ms）；
- ❌ 系统性短板集中在**三处**：① 全局 reduced-motion 一刀切归零（可达性）；② 弹层家族（Modal/Tooltip/toast 退场）动画缺失或不对称——与命令面板、overlay v7 的高水准形成「同 app 两种手感」；③ `:active` 按压反馈覆盖不均（25 处有 / 7 处关键控件无）。
- 全站 stagger 零使用、`transform-origin` 零使用；`left/width` layout 属性动画 4 处（3 处属可接受例外，1 处 switch 应改 translateX）。

---

## 1. Findings（按优先级 P0→P3，每条含 Before/After）

### P0-1 全局 reduced-motion 一刀切归零（可达性 · HIGH）

**位置**：`src/aurora/styles/tokens.css:324-329`

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**问题**：把全部动效压到 0.01ms，等价于「没有动效」。Emil 原则：reduced-motion 用户要的是**更少更柔，不是归零**——前庭系统敏感的是位移/视差/弹簧/缩放，而 opacity 交叉淡化（crossfade）不引发不适，应当保留。当前方案同时消灭了 hover 反馈、状态确认等所有「非位移类」动效，体验劣化。

| Before | After | Why |
|---|---|---|
| `*` 全选择器 0.01ms 归零，全站反馈被 nuke | 退役全局块；改为逐层覆盖：`--mc-dur-*` 在 reduce 下重映射（micro/fast 保持 100/180ms，base/slow 减半），并对 `.aurora-overlay-in`、`aurora-dropdown-in`、`aurora-toast-in`、`aurora-command-in` 等位移入场逐个降级为纯 opacity crossfade（120ms ease-out），scale/translate 分量移除 | 保留可理解的反馈，剔除位移/弹簧； Emil：「Reduce motion ≠ no motion」 |

**改动面**：tokens.css 一处 + 约 8 个 keyframes 消费点加局部 override。一次性收益，全站受益。

---

### P0-2 Modal 硬切出现/消失（弹层家族 · MEDIUM-HIGH）

**位置**：`src/components/ui/Modal.tsx:113-118`（`if (!isOpen) return null` 直挂 portal，无 mounted 过渡）+ `src/aurora/styles/components.css:926-948`（`.aurora-modal-overlay` / `.aurora-modal` 均无 animation 定义）

**问题**：Modal 是删除确认、新建知识库、版本历史等**高注意力**交互的载体，当前出现=一帧闪现。同一 app 里命令面板有精心调校的 `aurora-command-in`（200ms `cubic-bezier(0.16,1,0.3,1)`）、dropdown 有 180ms spring——弹层家族手感割裂。modal 居中缩放入场是 Emil 框架明确豁免 origin-aware 的场景（scale from center 合法）。

| Before | After | Why |
|---|---|---|
| overlay + panel 一帧闪现 | overlay: `animation: fade-in 150ms ease-out`（纯 opacity）；panel: `animation: modal-in 200ms var(--mc-ease-spring)`（opacity 0→1 + scale 0.97→1，**居中、不用位移**）| modal 豁免 origin-aware；scale(0.97) 起步而非 0——「生长感」而不突兀；200ms < 300ms 快门限 |

**改动面**：components.css 加 2 个 keyframes + 2 行 animation（Modal.tsx 零改动）。退出动画可选做（退出应更快 ~120ms，但需要 JS 配合延迟卸载，建议一期只做入场）。

---

### P1-1 7 处关键控件缺 `:active` 按压反馈（一致性 · MEDIUM）

**位置**（grep 全部为空，已复核）：
- `.aurora-menubar__item`（MenuBar 顶栏菜单）
- `.aurora-kb-btn` 基础类 + `--danger` 变体（仅 `--primary` 有 ：active，kb.css:477）
- `.aurora-editor__overlay-close` / `.aurora-graph__overlay-close`（本批 v7 overlay 的收起钮/图钉）
- `.aurora-rightbar__tab` / `.aurora-csp__tab`（右栏 tab 组）
- `.aurora-sidebar__toggle`（侧栏收展钮）

**问题**：全站已有 25 处 `:active` 惯例（wincontrol shell.css:271、sidebar-item:572、btn 五变体 components.css:87-158 等），但这 7 个**每天被点几十次**的高频控件反而没有——同一 app 内按压手感不一致。

| Before | After | Why |
|---|---|---|
| 按下无任何视觉响应 | 统一补 `:active { transform: scale(0.97); }`（tab 类按钮改 `translateY(0.5px)` + bg-pressed，避免行高抖动），transition 走已有 hover 规则 | scale(0.97) 是 Emil 按压反馈标准值；与现有 25 处惯例对齐；零 token 新增 |

---

### P1-2 toast 只进不出 + keyframes 用于瞬发队列（不对称 · MEDIUM）

**位置**：`src/aurora/styles/toast.css:32`（仅 `animation: aurora-toast-in 280ms ease-out`）+ `:57-66`（keyframes 定义）；全文件无 exit 动画。

**问题**：① 连续操作时 toast 连发，消失是**硬切**（组件直接卸载）——进出不对称，出比进更突兀；② toast 属 rapidly-triggered UI，Emil 框架要求用 **transition（可中断）而非 keyframes（不可中断）**；③ 无 delay-then-dismiss 时栈内其余 toast 的位置跳变。

| Before | After | Why |
|---|---|---|
| 进：280ms keyframes；出：硬切 | 进出场统一改 data-state 驱动的 **transition**：默认 `opacity:0; transform: translateY(8px)`，`[data-state='open']` 时归位，`transition: opacity 180ms var(--mc-ease-out), transform 180ms var(--mc-ease-out)`；出场用同一条曲线直接反向（出可 ~120ms） | transitions 可被新 toast 打断重定向；进出对称且出更快（Emil 时序不对称原则）；ToastProvider 需配合两段式卸载（mounted→exiting→remove） |

**改动面**：toast.css 重写动画段 + ToastProvider.tsx 增加退出中间态（约 20 行）。

---

### P1-3 共享 Tooltip 硬切 + 双源不一致（MEDIUM）

**位置**：`src/components/ui/Tooltip.tsx:38`（`delay = 150` ✓ 正确）+ `:100-112`（`visible` 直挂 portal，出现硬切）；对照 `src/aurora/styles/components.css:621-634` `.aurora-tooltip` 有 `aurora-tooltip-in`（scale 0.95→1, 180ms, ease-out）。

**问题**：① 同一 app 两套 tooltip：Aurora 内部 `.aurora-tooltip` 有入场动画，共享 `Tooltip.tsx` 用的 `.mc-tooltip`（ui.css）没有——不一致；② 无 **skip-on-subsequent**：扫过格式栏一排按钮时每个都重新等 150ms，应「首次等待、连续浏览即时显示」（Emil tooltip 篇标准模式：上一次 tooltip 关闭后 N 秒内再触发，延迟归零）。

| Before | After | Why |
|---|---|---|
| `.mc-tooltip` 硬切出现；每个触发点都等 150ms | `.mc-tooltip` 补 `animation: aurora-tooltip-in 180ms var(--mc-ease-out)`（复用现有 keyframes）；Tooltip.tsx 增加模块级 `lastHideAt` ref——hide 后 500ms 内再 show 则跳过 delay | 复用已有动画曲线零新增 token；skip-on-subsequent 是工具栏密集 hover 的标准解法 |

---

### P2-1 switch thumb 用 `left` layout 属性动画（性能 · MEDIUM）

**位置**：`src/aurora/styles/components.css:1056-1057`（`transition: left 200ms var(--mc-ease-spring)`）+ `:1068-1070`（`--on` 状态 `left: 18px`）

**问题**：`left` 每帧触发 layout+paint，违反「只动 transform/opacity」硬规则。这是全站唯一一处交互动画真正违反该规则（sidebar `width`:shell.css:311、blog `left`:176 属低频大位移/拖拽直接操纵例外，dashboard 进度条 420ms 属低频仪表）。虽然 18px 小控件性能损耗可忽略，但作为共享 UI 单源应做正确示范。

| Before | After | Why |
|---|---|---|
| `transition: left 200ms` + `left: 2px/18px` | thumb 恒定 `left: 2px`，`transition: transform 200ms var(--mc-ease-spring)`；`--on` 时 `transform: translateX(16px)` | transform 走合成器；交互曲线不变；hover 的 `scale(1.1)`（:1061）需合并进同一 transform 声明（`translateX(16px) scale(1.1)`）避免互相覆盖 |

---

### P2-2 `aurora-dropdown-in` 无 origin-aware（LOW）

**位置**：`src/aurora/styles/components.css:418-430`——`translateY(-4px)` 固定向下浮现，无 `transform-origin`。

**现状影响面**：唯一消费者是 MenuBar（向下弹，方向恰好正确）。但作为共享动画，任何向上/侧向弹出的复用都会反向（如未来 ctx menu 或 select 复用）。AuroraSelect 的 `aurora-wheel-popover` 已另走 `aurora-wheel-in`（:742，180ms ease-out），不受影响。

| Before | After | Why |
|---|---|---|
| 固定 `translateY(-4px)` 向下 | 落点在触发器下方时保持现状；向上弹出时改 `translateY(4px)`（由使用方按 placement 加 modifier 类，如 `.aurora-dropdown--up { animation-name: aurora-dropdown-in-up }`） | popover 应从触发方向浮入（origin-aware）；MenuBar 主路径零改动 |

---

### P2-3 侧栏组折叠内容硬切（LOW，桌面惯例可接受）

**位置**：`src/aurora/components/shell/Sidebar.tsx:60,99-129`（`collapsedGroups` 条件渲染）；caret 旋转已有过渡（shell.css:418 ✓）。

**判定**：VS Code 的资源管理器组折叠同样是瞬时的——桌面范式不惩罚这个。仅当折叠区高度大、后续内容跳动明显时才值得做 `grid-template-rows: 0fr→1fr` 200ms 过渡。**列为可选**，不建议优先。

---

### P2-4 动效 token 卫生：`--mc-ease-in` 死 token + 注释语义反（LOW）

**位置**：`src/aurora/styles/tokens.css:174-175`

```css
--mc-ease-in:      cubic-bezier(0.32, 0, 0.67, 0);  /* 进入 */   ← 零消费，且注释错
--mc-ease-out:     cubic-bezier(0.33, 1, 0.68, 1);  /* 退出 */   ← 被 108 处消费于「入场/hover」，注释也错
```

**问题**：ease-in 是**加速**曲线，语义用途是「退出」（离场时加速离开）；ease-out 是**减速**曲线，用于「进入」（入场减速停靠）。两行注释正好写反。`--mc-ease-in` 当前零消费，未来有人按注释取用必然误用。

| Before | After | Why |
|---|---|---|
| 注释反置 + 死 token | 注释改为「`--mc-ease-in: 退出/离场加速`」「`--mc-ease-out: 进入/悬停减速`」；`--mc-ease-in` 保留待 P1-2 toast 出场消费（出场用 ease-in 加速离开，语义即通） | token 是全站契约，注释即文档；顺手让死 token 变成活契约 |

---

### P3（备忘，不排队）

- **视图切换（AuroraShell.tsx:64-93）硬切**：属桌面软件惯例（VS Code activity 切换无动画），**维持现状**（详见 Part 2 Rejected #1）。
- **shell.css:311/652 侧栏折叠 `width` spring**：低频大位移，VS Code 同款，可接受例外。
- **canvas.css:939,1062 进度条 width/height 420ms spring**：仪表盘低频，可接受例外。
- **kg-node-pulse / aurora-timeline-pulse（graph.css:192 / canvas.css:755）infinite 脉冲**：状态指示灯语义合理；注意两者已被 reduced-motion 全局块覆盖——执行 P0-1 时需为 infinite 脉冲显式降级（reduce 下停闪但保留高亮态，不能靠 0.01ms 变相常亮高频闪烁）。

---

## 2. Missed Opportunities（走 Gate 四问筛选，仅 2 条过闸）

Gate 四问：交互频率？现有方案已可用？动效是否揭示因果关系？空间模型是否连续？

### MO-1 toast 栈重排位移（并入 P1-2 实施）
多 toast 并存时新 toast 插入导致栈内其余项**瞬移**。Gate：中频（保存/导出等操作密集时连发）✓；现有方案跳变破坏空间连续性 ✓；位移过渡能建立「队列」心智 ✓。**随 P1-2 的 transition 化一并解决**（容器 flex + 子项 transform transition 自然获得重排动画，无需 FLIP）。

### MO-2 Welcome 首屏 tile 微 stagger（可选，P3）
`welcome.css:209` tiles 无入场编排，4-6 个 tile 同时砸出。Gate：低频（首启/每次进入 welcome）✓；硬切可用但显生硬 ✓；30-60ms/项的 stagger（`animation-delay: calc(var(--i) * 50ms)`）建立「渐进展开」节奏 ✓。**可选**——用户反「网页味」，stagger 需克制（仅 opacity+4px 上浮，禁弹跳）。

### 已否决的机会
- **Tab 指示器共享布局滑动**（AuroraTabs/RightSidebar tab）：当前背景色过渡（components.css:1000）已达标，滑动指示器需 DOM 测量，收益/成本比低。
- **涟漪/水波反馈**：Material 语言，与桌面原生美学冲突（用户明确反对）。
- **视图切换 crossfade**：见 Rejected #1。
- **Excalidraw 内部动效**：第三方 canvas 内核自有体系，不越界。

---

## 3. Rejected Candidates（审计过但不立项）

| # | 候选 | 否决理由 |
|---|---|---|
| 1 | 视图切换淡入（AuroraShell renderPanel） | 频率门控：侧栏导航 50+/天；VS Code/Linear 均瞬时切换；加 100ms fade 每天累计拖慢数十秒且无因果揭示价值。**硬切是正确的桌面范式** |
| 2 | blog panelzone `left` 动画（blog.css:176） | 拖拽直接操纵例外：`.is-dragging` 已正确禁用 transition（:183）跟手、松手 spring 回弹——这是**正面实现**，非 finding |
| 3 | 全局 hover 门控 `@media (hover:hover)` | 全站仅 markdown.css:280 有一个 `hover:none`；Aurora 是桌面外壳无触屏主场景，暂无必要铺开 |
| 4 | Sidebar 折叠过渡 | 见 P2-3，桌面惯例瞬时即可，不排队 |
| 5 | 命令面板动效调参 | 现状 180ms overlay fade + 200ms `cubic-bezier(0.16,1,0.3,1)` + 100ms hover + 自带 reduced-motion——**质量已达标，不动** |

---

## 4. 正面案例（保持并推广）

1. **DateWheelPicker**（`src/components/ui/DateWheelPicker.tsx:29-110`）：rotateX 圆柱曲面（±75°）+ 曲率 scale/opacity/blur 渐隐 + `scrollTo smooth` 惯性吸附——Apple HIG 级实现，共享 UI 层标杆。
2. **命令面板**（command-palette.css）：强曲线轻入场 + 自管 reduced-motion，是弹层家族的目标手感。
3. **边缘召唤 v7**（本批推广至编辑器/白板/双链图谱）：hover-intent 220/180ms + `aurora-overlay-in` 8px fade，浮层零重排。
4. **token 纪律**：`--mc-ease-out` 108 处消费无一误用；`--mc-dur-*` 五档覆盖全部时长诉求。

---

## 5. 建议实施批次

| 批次 | 内容 | 预估改动面 |
|---|---|---|
| **B1（P0）** | reduced-motion 降级方案重写 + Modal 入场动画 | tokens.css / components.css（Modal.tsx 零改动） |
| **B2（P1）** | 7 处 `:active` 补齐 + toast transition 化（含退场）+ Tooltip 动画统一与 skip-on-subsequent | 7 个 CSS 文件 + ToastProvider.tsx + Tooltip.tsx + ui.css |
| **B3（P2）** | switch translateX 化 + dropdown--up modifier + token 注释修正 | components.css + tokens.css |
| **B4（P3 可选）** | welcome tile stagger + 侧栏组折叠过渡 | welcome.css / shell.css + Sidebar.tsx |

每批次独立可验证（截图 + 现有 vitest 套件回归），建议按 B1→B3→B2→B4 或逐条确认执行。**等待用户勾选**哪些 findings 落地后再动手。

---

*审计完。共 sweep 8 轮，grep 全量核验 keyframes 18 个 / transition 60+ 处 / :active 25 处 / reduced-motion 7 文件 / @media(hover) 1 处，逐条 finding 均二次复核行号。*
