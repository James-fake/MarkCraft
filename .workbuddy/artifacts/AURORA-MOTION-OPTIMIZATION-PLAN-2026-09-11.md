# MarkCraft Aurora「macOS 从容丝滑」动效优化方案

> 日期：2026-09-11 · 方法论：emilkowalski-skills（apple-design + animate + RECIPES）× 前置审计 MOTION-AUDIT-2026-09-11.md
> 性质：实施方案（DesignBrief）。本轮未改源码，等待确认后按批次执行。
> 前置：动效穷尽式审查已完成（总评 7/10，P0×2/P1×3/P2×4），本方案 = 审计 findings 的落地参数表 + 用户新方向「Apple 式从容」的全局升级。

---

## 1. 理念转译：三个关键词 → 技术契约

用户原话：「慢慢、懒懒、但又很丝滑的切换动画效果，像 macOS / Apple 应用」。

这不是「全部变慢」，而是 Apple 的**快慢分层**——微交互快到无形，空间过渡从容有分量。WWDC《Designing Fluid Interfaces》的原话：响应必须即时，但大位移值得「被看见地」发生。

| 关键词 | Apple 语义 | 技术契约 |
|---|---|---|
| **慢慢 / 懒懒** | 从容的分量感（weight）——重要空间过渡值得 300–500ms | modal / drawer / 视图切换 / 浮层：**320–500ms**（animate 官方授权区间 Modals 200–500ms）；微交互（hover/按压）**保持 100–160ms 不变**——懒是节奏，不是迟钝 |
| **丝滑** | 强减速曲线 + 只走合成器 + 永可打断 | 全站升级强 ease-out `cubic-bezier(0.23,1,0.32,1)`；大浮层用 iOS 抽屉曲线 `cubic-bezier(0.32,0.72,0,1)`；只动 transform/opacity；transition 优先（可中断） |
| **像 Apple** | 空间一致性 + 材质感 | 进出同路径（出更快）；popover 从触发器浮现（origin-aware）；「materialize, don't just fade」——backdrop 与 panel 一起动 |

**快慢分层总表**（全站心智模型，一次定死）：

| 层 | 场景 | 时长 | 曲线 |
|---|---|---|---|
| ⚡ 即时层 | hover、按压、颜色 | 100–160ms | 强 ease-out |
| 🚶 标准层 | dropdown、tooltip、tab、小浮层 | 150–250ms | 强 ease-out / ease |
| 🛋 从容层（本方案主战场） | modal、视图切换、overlay v7、toast、侧栏 | 320–500ms | **--mc-ease-mac**（iOS 抽屉曲线） |

---

## 2. Token 层改造（单点杠杆，先行）

原则：**扩展现有 `--mc-*` 体系，不平行发明**（animate Hard Rule 3）。全部改动集中在 `src/aurora/styles/tokens.css` §11。

| # | Token | Before | After | Why |
|---|---|---|---|---|
| T1 | `--mc-ease-out` | `cubic-bezier(0.33,1,0.68,1)`（弱，≈原生 ease-out） | **`cubic-bezier(0.23,1,0.32,1)`**（Emil 强曲线） | 108 处消费全部是入场/hover 用途，强曲线在每个场景都更丝滑——一个值的改动 = 全站质感升级。注释由「退出」改「进入/悬停（减速入场）」 |
| T2 | 新增 `--mc-ease-mac` | — | **`cubic-bezier(0.32,0.72,0,1)`** | iOS/macOS sheet & drawer 官方曲线（RECIPES `--ease-drawer` 同值）；前段快后段长尾，即「从容但丝滑」的物理来源。注释「Apple 从容曲线：大浮层/视图过渡」 |
| T3 | 新增 `--mc-dur-lazy` | — | **`500ms`** | 从容层上限：抽屉级大浮层。注释「Apple 从容级：drawer/大 sheet」 |
| T4 | `--mc-dur-slow` | 420ms 注释「大过渡」 | 420ms，注释改「从容层标准：modal/视图切换」 | 数值恰在授权区间，语义重定义 |
| T5 | `--mc-ease-in` | 死 token + 注释反（「进入」） | 注释改「退出/离场（加速离场）」 | P2-4 修正，供出场消费 |

> T1 风险控制：曲线同向（都是减速），整体效果是「更柔和的长尾」，无场景会变怪；不满意可单点回滚该值。

---

## 3. 分场景方案（含审计 findings 落地参数）

### 3.1 视图切换——【整屏版已回退 → 内容区版已落地，2026-09-11 当日两轮】

> **第一轮（整屏 · 已回退）**：本节原方案（`.aurora-view` 包裹 + `aurora-view-in`）实施后用户立即反馈
> 「每次切换到不同功能的界面，Markcraft 整体都会闪一下」。根因：`PageFrame`（含 **MenuBar + Sidebar**）
> 在各面板内部渲染，因此 `.aurora-view` 包裹的是**整屏**——其 420ms `opacity 0 → 1` 淡入会让菜单栏、
> 侧栏、内容区一起从全透明浮现。结论：**桌面应用的外壳不应随视图切换重绘**；该版已回退
> （移除 `.aurora-view` 包裹与 `aurora-view-in` keyframes）。其余批次（token / reduced-motion /
> 弹层家族 / overlay / 按压反馈 / stagger）不受影响，全部保留。
>
> **第二轮（内容区 · 已落地 · 用户要求「按方案继续实施」后执行）**：即原「备选」路径，见下。

#### 3.1.1 落地版：仅内容区从容浮现（外壳完全静止）

**位置**：`src/aurora/styles/shell.css`（`.aurora-content__body` + `@keyframes aurora-content-in`）
+ `tokens.css` reduce 块新增一条 selector。**零 TS 改动**——不包 `key`，内容区元素随面板切换
自然重挂载，动画即自动重放。

| Before | After | Why |
|---|---|---|
| 面板一帧闪换（瞬时） | `.aurora-content__body { animation: aurora-content-in var(--mc-dur-slow) var(--mc-ease-mac) both }`，keyframes 仅 `opacity 0 → 1` | 只圈**内容区**：TitleBar/MenuBar/Sidebar/StatusBar 完全静止 → 结构上不可能「整体闪」；420ms 从容层 + `--mc-ease-mac` 前快后柔长尾 |
| （原方案）fade + `translateY(10px)` | **不动 transform**，只走 opacity | ① transform 建立包含块，会让面板内 `position: fixed` 浮层（右键菜单 / dock 浮层）误定位，或被 `.aurora-content` 的 `overflow: hidden` 裁切；② 大子树图层提升在 Chromium 下导致动画期间文字重栅格化发虚（编辑器小字最敏感） |
| — | 底色零跳变 | 面板根容器与 `.aurora-content` 同底色（均 `--mc-bg-content`）→ 淡化期间露出的底色完全同色，**不存在任何底色闪变**，只有内容柔和浮现 |
| — | reduce 下降级 `mc-rm-fade` + `--mc-dur-slow` 减半（210ms） | 可达性随行（animate Hard Rule 4）：退化后仍是纯 crossfade |

**验证**（CDP **14/14** · 脚本 `.workbuddy/cdp-viewfade-verify.mjs`）：
- 外壳五件套（`.aurora-page` / `.aurora-titlebar` / `.aurora-menubar` / `.aurora-sidebar` / `.aurora-statusbar`）
  `animation-name: none`，且整段动画中 `opacity` **恒为 1**；
- 内容区挂 `aurora-content-in`（`0.42s` / `cubic-bezier(0.32, 0.72, 0, 1)`），rAF 采样 62 帧**单调升**
  （实测序列 `0 → .095 → .205 → .336 → .494 → .651 → .756 → .821`，前快后柔）；
- 连续切换两次均重放；reduce 模拟下为 `mc-rm-fade` + `0.21s`；
- 截图：`viewfade-mid.png`（中途帧：外壳完整、内容半透明）/ `viewfade-graph.png` / `viewfade-canvas.png`。

**手感单点调节**：嫌 420ms 偏慢 → 改用 `var(--mc-dur-base)`（280ms）；嫌淡入感偏强 →
keyframes 的 `from` 改 `opacity: .6`（即「极轻 opacity 增量」）。

### 3.2 Modal——弹层家族的 Apple 化（审计 P0-2）

**位置**：`components.css:926-948` + `Modal.tsx`（本期零 JS 改动，纯 CSS 入场）。

| Before | After | Why |
|---|---|---|
| overlay + panel 一帧闪现 | overlay：`animation: fade-in 200ms var(--mc-ease-out)`（scrim 先暗下来）；panel：`animation: aurora-modal-in var(--mc-dur-slow) var(--mc-ease-mac) both`，from `{ opacity:0; transform: scale(0.96) }`，`transform-origin: center`（modal 豁免 origin-aware） | RECIPES Modal 配方 Apple 化：scale(0.96)「生长感」绝不 scale(0)；scrim 与 panel 一起动 = 「一个表面到达」（materialize）；从容层 |
| （P2 收口批补）**关闭瞬间消失** | `Modal.tsx` 引入 `phase: open → exiting → closed`，关闭后保留 DOM 播 **180ms** 反向动画（`--mc-dur-fast` + `--mc-ease-in` 加速离场）再卸载；`[data-exiting]` 下 `pointer-events: none` | 原方案只做了入场 → 「精雕入场 + 硬切收场」的割裂。Apple 的进出不对称是**出更快**（420ms 强减速进 / 180ms 加速出），不是「出=0」。同时 `--mc-ease-in` 死 token 由此获得首个正当消费者 |

### 3.3 Toast——Sonner 式人格化慢速（审计 P1-2）

**位置**：`toast.css:32,57-66` + `ToastProvider.tsx`（退出需 JS 两段式卸载）。

| Before | After | Why |
|---|---|---|
| 入场 280ms keyframes + 硬切消失 | **transition 化**：默认态 `{ opacity:0; transform: translateY(12px) }`，`[data-mounted]` 归位，`transition: opacity 400ms ease, transform 400ms ease`；出场 `[data-exiting]` 反向 200ms ease | RECIPES Toast 原文：Sonner 的优雅 partly 来自 **400ms ease 略慢于常规 UI**——toast 慢是人格，这正是「懒」的合法案例；transition 可中断（连发安全）；进出同路径、出更快 |
| （P2 收口批补 · MO-1）**多 toast 并存时栈重排瞬移** | `ToastProvider` 加 **FLIP**：`useLayoutEffect` 比对条目 `getBoundingClientRect().top`，对位移项设反向 `translateY(dy)` + `transition: none`，下一帧释放 → 由 toast.css 既有 `transition: transform 180ms` 接住。跳过：新条目（无历史坐标）、`[data-exiting]`（自有反向 transition）、入场动画进行中（inline transform 会被 animation 覆盖） | 容器**底边锚定**意味着 FIFO 出栈与锚点同侧 → 位移在数学上不可避免（底部锚 + 先入先出 ⇒ 至少一侧必然移动），必须补偿而非靠布局规避。选 FLIP 而非 `column-reverse` 是因为后者只消除「新增」位移却把「移除」位移变成必然，且会反转最新在顶的视觉语义。无外部依赖，jsdom 下 rect 全 0 自动跳过（单测 `ToastProvider.flip.test.tsx` 用假布局表覆盖三条分支） |

### 3.4 Tooltip——快而不糙（审计 P1-3）

**位置**：`ui.css`（.mc-tooltip）+ `Tooltip.tsx:38,100-112`。

| Before | After | Why |
|---|---|---|
| 硬切出现；每次等 150ms | `.mc-tooltip` 补 `animation: aurora-tooltip-in 125ms var(--mc-ease-out)`（scale 0.97→1，复用 components.css:629 keyframes，加 `transform-origin` 按 placement）；TSX 加 skip-on-subsequent：hide 后 500ms 内再 show 则延迟归零 | RECIPES Tooltip 配方原文「Once one tooltip is open, neighbours open instantly」——扫过工具栏不重等；125ms 即时层下限，慢是给 tooltip 的延迟不是给动画 |

### 3.5 Dropdown / 弹出菜单族——origin-aware（审计 P2-2）

**位置**：`components.css:418-430`（MenuBar 下拉）+ **P2 收口批扩展**：`.aurora-canvas-ctxmenu` / `.aurora-filetree__ctxmenu` / `.aurora-outline__ctxmenu` / `.aurora-cip__menu` / `.aurora-dock__float`。

| Before | After | Why |
|---|---|---|
| `translateY(-4px)` 固定向下，180ms spring | 保留向下基线，时长升 `var(--mc-dur-fast)` 180ms、曲线改 `var(--mc-ease-out)`（新强曲线）；新增 `.aurora-dropdown--up { animation-name: aurora-dropdown-in-up }`（translateY(4px) 起步）供未来向上弹出复用 | Apple §7 空间一致性：菜单从触发方向浮现；MenuBar 主路径零改动 |
| （P2 收口批补）**右键菜单/检查器下拉/dock 浮层全部零动效**——一帧砸出 | 新增关键帧 `aurora-menu-in`（**单源 = components.css:453**）：`opacity 0 + scale(0.97)` → 归位，`var(--mc-dur-fast)` + 强 ease-out + `transform-origin: top left`（光标处「长出」）。dock 浮层另用 `aurora-dock-float-in`：**独立 `translate` 属性**承载位移（与自带 `transform: translateX(-50%)` 定位各走通道，互不覆盖）；dock 更多菜单原点 `bottom right`（从按钮长出） | 方案 §3.5 只覆盖了 MenuBar 下拉，而**右键菜单才是桌面端最高频弹层**；原点感知正是「从触发处生长」价值的最大兑现面。180ms 标准层（指针驱动，守恒约束 §4.2 不得进从容层）。reduced-motion 下降级 `mc-rm-fade`（去 scale） |

### 3.6 overlay v7 浮层统一升级（编辑器/白板/双链图谱）

**位置**：`editor.css` / `canvas.css` / `graph.css` 三处 `aurora-overlay-in` 消费点。

| Before | After | Why |
|---|---|---|
| 280ms `--mc-ease-spring` + translateX(-8px) | **320ms `--mc-ease-mac`** + translateX(-10px)（各文件本地 keyframes 同步改参） | 浮层=侧向抽屉，正是 drawer 曲线的本体场景；三处参数一致（本批 v7 统一成果不回退） |

### 3.7 侧栏折叠——width 动画的曲线升级

**位置**：`shell.css:311,652`（左栏）+ `panels/editor.css`（右栏，P2 收口批纳入）。

| Before | After | Why |
|---|---|---|
| width 280ms ease-spring | `width var(--mc-dur-slow) var(--mc-ease-mac)` | 折叠=水平抽屉；width 是被容忍的 layout 例外（accordion 条款），长曲线让大位移「有分量」；accordion 官方建议短时长，但侧栏是全高面板、非内容折叠，取从容层中值 |
| （P2 收口批）**右栏仍是 280ms `--mc-ease-spring`** | 与左栏统一 `var(--mc-dur-slow) var(--mc-ease-mac)` | 同一「侧栏折叠」语义两个曲线，属 §3.7 未贯彻到底；`.is-resizing` 拖拽态仍 `transition: none`（跟手优先，不回退） |

### 3.8 按压反馈七控件补齐（审计 P1-1）——即时层纪律

**位置**：MenuBar item / kb-btn 基础+danger / 双 overlay-close / rightbar·csp tab / sidebar__toggle，共 7 类。

| Before | After | Why |
|---|---|---|
| 按下无响应 | `:active { transform: scale(0.97); }` + 基础 `transition: transform 160ms var(--mc-ease-out)`；tab 类用 `translateY(0.5px)` 防行高抖动 | RECIPES Button press 原方（Apple §1：反馈在 pointer-down 即时层，**永不慢化**）；与全站 25 处惯例对齐 |

### 3.9 全局 reduced-motion 重建（审计 P0-1）——Apple 三信号

**位置**：`tokens.css:324-329`。

| Before | After | Why |
|---|---|---|
| `* { duration: 0.01ms !important }` 全归零 | 退役全局块；`@media (prefers-reduced-motion: reduce)` 内：① `--mc-dur-*` 重映射（micro/fast 保留，base/slow 减半）② 各入场 keyframes 的 transform 分量置 none 仅留 opacity ③ **infinite 脉冲**（kg-node-pulse/timeline-pulse）显式停闪、保留静态高亮 | apple-design §14：cross-fade 替代位移/spring，「更少更柔非归零」；同时满足 animate Hard Rule 4 |

### 3.10 其他落地项（审计 P2 随批）

| 项 | 位置 | 参数 |
|---|---|---|
| Switch thumb | components.css:1056 | `transition: transform 320ms var(--mc-ease-mac)`，`--on` 时 `translateX(16px)`（与 hover scale 合并声明）——开关慢下来正是「懒」的最小样本 |
| 侧栏组折叠 | Sidebar.tsx + shell.css | `grid-template-rows 0fr→1fr 250ms var(--mc-ease-out)` + opacity（P2-3 从备忘转落地，Apple 抽屉语义） |
| Welcome tiles stagger | welcome.css | `fadeIn 420ms var(--mc-ease-mac)` + `animation-delay: calc(var(--i) * 60ms)`，仅 opacity+6px 上浮（RECIPES stagger 30-80ms，4-6 tile；首启场景= delight 预算） |
| 进度条/仪表 | canvas.css:939,1062 | 保持（低频例外） |
| （P2 收口批）硬编码时长 token 化 | editor.css（`0.24s/0.18s/180ms`×4）、welcome.css:124、canvas.css:325,1870 | 全部改用 `var(--mc-dur-*)` + `var(--mc-ease-out)`；唯一保留的裸值是 command-palette.css:125（§4.1 冻结区）。`0.24s → --mc-dur-base`（与组折叠同档）、`0.18s → --mc-dur-fast`、`100ms → --mc-dur-micro` |
| （P2 收口批）文件树删除确认弹层 | editor.css `.aurora-filetree__confirm*` + FileTree.tsx | 与共享 Modal 同语言：scrim `aurora-fade-in 200ms` + panel `aurora-modal-in`（生长）；关闭走 `dismissConfirm()` 两段式 → 180ms 反向动画后才卸载（`data-exiting`） |
| （P2 收口批）reduced-motion 细化 | tokens.css reduce 块 | 新增消费者纳入降级清单；**退场必须走 `mc-rm-fade-out`**（沿用 `mc-rm-fade` 会「淡入再消失」闪跳）；welcome tile 的 stagger `animation-delay: 0s`（降级后内容立即可见） |

---

## 4. 守恒约束——这些永不慢化（频率门控红线）

1. **命令面板开关**（100+/天）：维持现状（其动画已达标且轻），永不加长；
2. **hover/按压/颜色**：即时层 100–160ms 封顶，本方案任何 batch 不得触碰；
3. **键盘操作路径**（⌘P/⌘O/⌘F 弹层）：同上；
4. **文件树/大纲导航 hover**：维持 micro；
5. **:active 反馈**：160ms 铁律，与「从容层」无关；
6. **视图切换**（2026-09-11 补充）：外壳（MenuBar/Sidebar/StatusBar）**永不参与**视图切换动画——
   PageFrame 在各面板内渲染，任何包住整屏的动画都会造成「整体闪一下」。切换保持瞬时。

「懒」的预算全部花在 **低频高注意力** 场景：视图切换、modal、toast、抽屉、开关。这正是 Apple 的分配方式。

---

## 5. 实施批次（P0→P3，每批独立验证）

| 批次 | 内容 | 改动面 | 验证 |
|---|---|---|---|
| **P0-A Token 三件套** | T1–T5（tokens.css 单文件） | tokens.css | 全站 tsc + vitest 回归 + 截图对比（曲线变柔） |
| **P0-B reduced-motion 重建** | §3.9 | tokens.css + 7 个 keyframes 消费点 | 模拟 reduce 截图 + 现有可达性检查 |
| **P1-A 视图切换** | §3.1.1 ★ | shell.css + tokens.css（零 TS） | CDP 14/14：外壳恒 1 / 内容区 rAF 淡化序列单调 / 连切重放 / reduce 降级 + 三截图 |
| **P1-B 弹层家族** | §3.2–3.5 | components.css / toast.css / ui.css / Tooltip.tsx / ToastProvider.tsx | Modal/Tooltip/Toast vitest + CDP 弹层截图 |
| **P2 杂项收口** | §3.6–3.8 + 3.10 | editor/canvas/graph/shell.css + 7 控件 | :active grep 清单核验 + 浮层三截图 |
| **P3 可选点缀** | §3.10 stagger | welcome.css | 首启截图 |
| **P2 收口批（第二轮）** | §3.2 退场 / §3.3 MO-1 / §3.5 菜单族 / §3.7 右栏 / §3.10 卫生 | Modal.tsx、ToastProvider.tsx、FileTree.tsx、components/canvas/editor/welcome/tokens.css + 新增 FLIP 单测 | CDP **30/30**（`cdp-menu-motion-verify.mjs`）+ vitest **786 passed**（3 预存）+ 截图 |

依赖关系：P0-A 是全部后续批次的地基（曲线/时长单源）；P1-A/B 可并行；P2/P3 无依赖。**建议首轮只做 P0-A + P1-A**——token 杠杆 + 视图切换直接命中「macOS 切换感」的 80% 观感，验证手感后再放量。

---

## 5.1 第二轮收口：方案未覆盖面（2026-09-11 晚）

首轮六批落盘后做了**落地核验**，发现方案自身留下的四处缺口（均为「方案只覆盖了一半」而非新需求）：

| # | 缺口 | 为何算缺口 | 处置 |
|---|---|---|---|
| 1 | **右键菜单族零动效** | §3.5 的 origin-aware 只落在 MenuBar 下拉，而右键菜单是桌面端最高频弹层（canvas / 文件树 / 大纲 / 检查器下拉 / dock 浮层共 5 处一帧砸出） | `aurora-menu-in` 单源关键帧 + 5 处消费；dock 浮层用独立 `translate` 通道避开定位 `transform` |
| 2 | **Modal 无退场** | §3.2 明确「本期零 JS 改动，纯 CSS 入场」→ 精雕入场配硬切收场，违背本方案 §1「进出同路径、出更快」 | `phase` 状态机 + 180ms `--mc-ease-in` 反向动画（顺带让死 token 复活） |
| 3 | **MO-1 toast 栈重排未真正落地** | 审计 Part 2 标注「随 P1-2 一并解决」，但首轮只做了进出场 transition；且原方案的理由「flex + 子项 transform transition 自然获得重排动画」**技术上不成立**（flex 重排不走 transform） | FLIP：`useLayoutEffect` 比对视口顶坐标 → 反向补偿 + 下一帧释放；三条跳过分支有单测 |
| 4 | **右栏折叠曲线未随 §3.7** | §3.7 只改了左栏（shell.css:311/652），右栏仍 280ms spring，同语义两曲线 | 统一 `--mc-dur-slow` + `--mc-ease-mac` |

**顺带根治的隐蔽缺陷**：CDP 探针实测 `--mc-dur-fast` 解析为 **150ms**（≠ tokens.css 的 180ms）。根因不是磁盘文件——`desktop-chrome.css` 早已清空——而是**长跑 dev server 的模块缓存**仍返回修复前版本：Vite 未对被改动的 CSS 模块失效缓存，浏览器拿到的始终是旧 CSS。**重启 server 后** `[F2]` 四项 token 断言（dur-fast 180 / dur-slow 420 / ease-out 强曲线 / ease-mac）全部转绿。
→ **教训**：改 token 后必须**重启 dev server** 再验证，`?direct` 请求正常 ≠ 模块管道正常；CDP 断言要直接读 `getComputedStyle(document.documentElement)` 的 token 值，而不是只看动画名。

**第二轮验证**：`tsc` PASS ／ CDP **30/30**（菜单族 4 处 × 动画名/时长/曲线/原点、dock 浮层独立 translate 通道、Modal 进出双向 + `pointer-events:none`、6 条关键帧单源、4 项 token 单源、reduce 三项降级、结构存在性）／ vitest **786 passed / 3 failed**（3 项均为首轮前既存：commandWiring 45vs48、KbPanel「编辑」双匹配、blogCssRefs）／ 新增 `ToastProvider.flip.test.tsx` 3 例。

## 6. Feel-check（代码定不了、须上手验证的）

- `--mc-ease-mac` 在 420ms 下的「分量」是否贴合直觉——以 2× 慢放逐帧看视图切换；
- toast 400ms 与栈内重排的配合（RECIPES 原文：无公式，调到对为止，次日fresh eyes 复看）；
- 视图切换 10px 上浮在 4K 缩放下的观感（可能需要 8px）；
- Modal scale(0.96) 起点在大尺寸 lg(640) 与小尺寸 sm(360) 上的均衡。

---

*本方案与 MOTION-AUDIT-2026-09-11.md 配套：审计负责「有什么问题」，本方案负责「往哪个手感修」。确认批次后执行。*
