# MarkCraft 动效穷尽式审计 · 对标 Apple 交互动画

> 审计基准：`emilkowalski-skills/improve-animations`（八大类目 + AUDIT.md 规则目录）+
> `emilkowalski-skills/apple-design`（WWDC *Designing Fluid Interfaces* 原则）+ `macos-design-guidelines`
> 审计时间：2026-09-14 · 基线 commit：`075821f` · 范围：全仓 `src/**`（18 个含动效的 CSS 文件 + 13 个指针手势 TSX）
> 姿态：只读审计，不改源码。产出「问题表 + 机会表 + 可执行计划」。

---

## 一、Recon — 动效现状地图

### 1.1 技术栈
| 项 | 实况 |
| --- | --- |
| 框架 | Vite 5 + React 18 + TS |
| 动效载体 | **纯 CSS**（`transition` + `@keyframes`），无 Framer Motion / GSAP / react-spring |
| 手势 | 原生 Pointer Events + `setPointerCapture`（13 处），rAF 惯性循环（WheelPicker） |
| Token 单源 | `src/aurora/styles/tokens.css §11` |

### 1.2 动效 Token（`tokens.css`）
```
时长：--mc-dur-micro 100 / fast 180 / base 280 / slow 420 / lazy 500ms
曲线：--mc-ease-spring  (0.22,1,0.36,1)
      --mc-ease-in      (0.32,0,0.67,0)     退出加速
      --mc-ease-out     (0.23,1,0.32,1)     ★ Apple 丝滑总开关
      --mc-ease-mac     (0.32,0.72,0,1)     ★ iOS 抽屉曲线
      --mc-ease-in-out  (0.4,0,0.2,1)
      --mc-ease-linear  linear
```
**评级：A+。** 与 AUDIT.md 推荐值**逐字吻合**（`(0.23,1,0.32,1)` 正是 Emil 的 `--ease-out`；
`(0.32,0.72,0,1)` 正是 `--ease-drawer`）。四档时长分层（即时/标准/从容/上限）语义清晰。

### 1.3 人格定位
**桌面端生产力工具**（VS Code / macOS / IDE 范式）→ 动效应**克制、精准、快**。
「从容层 420ms」的存在合理（modal/视图切换），但**不得外溢到高频交互**。

### 1.4 频率地图
| 层级 | 表面 | 现况 |
| --- | --- | --- |
| **100+/天** | ⌘K 命令面板、侧栏切换、视图切换、FileTree 行 hover、工具栏 | 命令面板**有 200ms 入场**（需商榷） |
| **数十/天** | 按钮 hover/按压、列表项、滚轮鼓 | 按压反馈覆盖不全 |
| **偶尔** | Modal、Toast、Dropdown、右键菜单、抽屉 | 标准动画，质量高 |
| **罕见** | Welcome tile 入场（60ms stagger） | 唯一 delight 位 |

---

## 二、Audit — 八类目逐项结论

### ✅ 已达标（无需改动，列出以证明审计完整）

| 类目 | 证据 | 结论 |
| --- | --- | --- |
| **物理性/原点** | 全仓 **0 处 `scale(0)`**；dropdown `scale(0.97)`、modal `scale(0.96)`、toast `scale(0.98)`、command `scale(0.98)` | ★ 完全符合 AUDIT §3 |
| **Modal 居中豁免** | `components.css:987` `transform-origin: center` + 注释说明理由 | ★ 正确，**不作为问题上报** |
| **弹出层原点感知** | `aurora-menu-in` 单源关键帧，消费者各自声明 `transform-origin`（光标/触发器） | ★ 符合 Apple §7 anchored origins |
| **进出不对称** | modal 入 420ms `ease-mac` / 出 180ms `ease-in`；`EXIT_MS` 对齐，`pointer-events:none` | ★ 精确实现「出更快」 |
| **ease-in 使用** | 仅 `--mc-ease-in` 用于**退场**（正确用法）+ cursor-blink 的 `ease-in-out`（装饰脉冲，合法） | ★ **无任何 UI 入场误用 ease-in** |
| **手势 1:1 + 捕获** | WheelPicker：`setPointerCapture` + `startOffset` 尊重抓取偏移 + `cancelRaf` 抓住即停 | ★ 符合 Apple §2 直接操纵 |
| **速度交接** | WheelPicker 记录 `lastY/lastT` 逐帧速度，`onPointerUp` 按 `Math.abs(vel)<0.05` 分支：慢放吸附 / 快滑注入 `velRef` 惯性滑行 | ★ 符合 Apple §5 velocity handoff |
| **边界软回弹** | WheelPicker 非 loop 模式允许 `minOff-40 / maxOff+40` 过冲后 `animateTo` 归位 | ★ 符合 Apple §9 rubber-banding |
| **可中断性** | Toast 入场 keyframes / **出场 transition**（`data-exiting` 反向），注释明确「可中断、同路径、出更快」 | ★ 符合 AUDIT §4 |
| **Reduced-motion 架构** | `tokens.css §RM`：时长减半 + `mc-rm-fade`/`mc-rm-fade-out` 双关键帧（出入分开）+ `* { animation-iteration-count: 1 }` + stagger 归零 | ★★ **超规格**，含退场专用 fade（比多数生产代码更严谨） |
| **材质化** | modal scrim 200ms 先暗 / panel 320ms 后入（`materialize, don't just fade`） | ★ 符合 Apple §12 |
| **Stagger** | `welcome.css:199` `animation-delay: calc(var(--i,0) * 60ms)`，落在 30–80ms 推荐带 | ★ 符合 AUDIT §7 |
| **性能纪律** | `transition: all` 仅 10 处（且多数在 `src/styles/*` 旧层）；`will-change` 仅 2 处精准使用 | ★ 基本良好 |

### ⚠️ 问题表（按 leverage = 影响 ÷ 成本 排序）

| # | 严重度 | 类目 | 位置 | 问题 | 修复摘要 |
| --- | --- | --- | --- | --- | --- |
| **1** | **HIGH** | 无障碍 | 全仓 CSS（312 处 `:hover`，**0 处 `@media (hover:hover)`**） | 悬停动效未做指针类型门控。触屏/触摸板误触会触发「假 hover」并残留；`--mc-dur-*` 的位移型 hover 在触屏上是错误的反馈 | 全局加 `@media (hover: hover) and (pointer: fine)` 包裹组；位移型 hover 优先门控 |
| **2** | **HIGH** | 性能 | `shell.css:436` `transition: grid-template-rows`；`blog.css:176` `transition: left` + `will-change: left`；`canvas.css:939/1062` `transition: height/width`；`editor.css:1140` `transition: width` | 动画**布局属性**（非 transform/opacity）→ 触发 layout+paint+composite。`blog.css` 的 `left` 尤其明显：浮层停靠应用 `transform: translateX()` 才上合成器 | `left`→`transform: translateX()`；柱状图 `height`→`scaleY` + `transform-origin: bottom`；侧栏 `width` 属结构性权衡（见计划） |
| **3** | **MEDIUM** | 目的/频率 | `command-palette.css:31-38` | ⌘K 命令面板有 `200ms` 入场（`translateY(-12px) scale(0.98)`）。AUDIT §1 定为 **100+/天 → 永不动画**（Raycast 是零动画的正解） | 移除面板位移动画，仅保留 overlay 极短淡入（或全删）；见计划 03 |
| **4** | **MEDIUM** | 物理性/反馈 | 44 处 `:active` 覆盖 228 处 `:hover`（`components.css` 主按钮 `:active` **只改背景色，无 scale**） | 按压反馈不统一：`kb-btn` 有 `scale(0.97)`，`aurora-btn--primary` 无。AUDIT §3 要求可按压元素统一 `scale(0.97)` + `160ms ease-out` | 补主按钮族 `:active { transform: scale(0.97) }` + 相应 transition |
| **5** | **LOW** | 性能/一致性 | `src/styles/markdown.css:174` `all 0.15s ease`；`mermaid.css` 7 处 `transition: all` | 旧层遗留 `transition: all`，动画未意图属性 | 收敛为显式属性列表 |
| **6** | **LOW** | 一致性 | `blog.css:176` `--mc-ease-spring`；`kb.css:328` 裸 `300ms ease-out` | 曲线/时长的零星旁路（`--mc-dur-base` 是 280ms，`300ms` 是硬编码） | 归一为 token |

### 方向判定（关键）

- **ease-in：零违规**。这是本次审计最意外的结论——业内最常见的 HIGH 级问题在此不存在。
- **scale(0)：零违规**。
- **Reduced-motion：超规格**。三层信号（时长/关键帧/迭代）齐全，且区分出入场 fade。
- 真正的问题集中在：**指针门控（1）**、**布局属性动画（2）**、**高频面板动画（3）**、**按压反馈一致性（4）**。

---

## 三、Missed Opportunities（机会表，附四问 Gate）

| # | 位置 | 现状 | 目的 | 频率 | 建议动效 |
| --- | --- | --- | --- | --- | --- |
| **A1** | 主题市场搜索框（`blog.css`，本日刚交付） | 显隐用 `max-height` 折叠（layout prop） | 防止突兀变化 | 数十次/天 | 保留现逻辑；若优化，`max-height` → `translateY(-100%)` + 容器 `overflow:hidden`（合成器友好）。**降级为非必做**——现方案已验证防闪 |
| **A2** | 主按钮族 `:active` | 仅背景色变化 | 反馈 | 数十次/天 | `transform: scale(0.97)`, `transition: transform 160ms var(--mc-ease-out)`（= 问题 4） |
| **A3** | 空状态 / 首次运行 | 静态 | Delight | 罕见 | **唯一建议的 delight 位**：空状态图标入场可用 `scale(0.96)→1` + opacity，`--mc-dur-slow`。可选 |

**Rejected（明确不动）**：
- FileTree 行 hover（`editor.css`）— **拒绝：数十至 100+/天，已仅用背景色过渡，正确**。
- 视图切换 `aurora-content-in` 420ms 纯 opacity — **拒绝：已是「仅内容区」的克制形态，符合既定收口批决策**。
- 侧栏 `width` 280ms 过渡 — **拒绝：结构性折叠，改 transform 会破坏布局上下文；`width` 是不得已的正确选择**（在计划中只做注释说明，不改）。
- 滚轮鼓惯性 — **拒绝：已符合 Apple §4/§5，无需动**。

---

## 四、总评

**这份动效系统的完成度远超一般生产代码库。** 它已经内化了 Apple *Designing Fluid Interfaces* 的核心要义——
速度交接、软回弹、进出不对称、原点感知、材质化、以及区分出入场的 reduced-motion 降级——并且有注释
记录了每一次权衡的理由（`§3.2` / `§3.5` / RECIPES 引用）。**「是否符合 Apple 交互动画效果」的答案是：核心机制符合，且部分超出。**

残余问题不是「理念缺失」，而是**三点工程收尾**：
1. **指针类型门控**——312 处 hover 无一门控，这是唯一称得上系统性缺陷的一项；
2. **布局属性动画的合成器化**——少数几处 `left`/`height`/`width` 该走 `transform`；
3. **按压反馈的横向一致性**——主按钮族漏了 `scale(0.97)`。

以及一处**理念性删除**：命令面板（100+/天）不该有 200ms 入场。

**预计收益 > 成本**的第一项是 **#1 指针门控**——一次全局收口，消除触屏假 hover，零视觉回归。

---

## 五、执行计划索引

计划文件位于本目录（`.workbuddy/artifacts/`）：

| 计划 | 对应问题 | 严重度 | 状态 |
| --- | --- | --- | --- |
| `MOTION-PLAN-01-hover-gating.md` | #1 指针门控 | HIGH | 待执行 |
| `MOTION-PLAN-02-compositor-props.md` | #2 布局属性合成器化 | HIGH | 待执行 |
| `MOTION-PLAN-03-command-palette.md` | #3 命令面板去动画 | MEDIUM | 待执行 |
| `MOTION-PLAN-04-press-feedback.md` | #4 按压反馈一致性 | MEDIUM | 待执行 |

**推荐执行顺序**：01 → 04 → 02 → 03（先做零风险高收益，再做需验证的合成器化，最后做理念性删除）。
01 与 04 可并行（不同文件段）。
