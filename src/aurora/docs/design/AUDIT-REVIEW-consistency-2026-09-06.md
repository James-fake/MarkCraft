# Markcraft（Aurora UI）全界面一致性复审报告 · 2026-09-06

- **审查性质**：设计优化完成后的**系统性复审**（对 2026-09-02 审计与 A–D 修复轮次的验收核对 + 增量取证）
- **配套文档**：`AUDIT-ui-consistency-2026-09-02.md`（首轮审计）/ `REMEDIATION-ui-consistency-2026-09-02.md`（修复方案与落地记录）
- **权威基线**：`src/aurora/styles/tokens.css` v2.0 + `docs/MarkCraft-Desktop-Native-Baseline.md`（§18 Gate Standard）+ REMEDIATION §6「黄金标准」
- **审查范围**：`src/aurora/styles/**`（13 文件约 1.2 万行）+ `src/aurora/` 面板组件 + 共享层 `src/components/ui/ui.css`（`mc-*` 旧体系）+ 内嵌 `features` 弹层（KB / 迁移 / PWA / 模板 / 文件管理）
- **取证方法**：四路并行逐行比对 token 权威值 + 人工抽验关键点（未定义 token、禁色、双体系消费链均已逐一 grep/read 复核）。**行号以当前文件为准，修复前请先 grep 复核**。

---

## 0. 一句话结论

**统一设计规范是存在的**（§18 + tokens v2.0 + 黄金标准），且 09-02 四轮**部分落地**（令牌正本、focus-visible 群补、backlinks 选中态已确实生效）；但**代码执行与规范之间仍有大段差距**——旧 `mc-*` 组件体系并未废弃、而是与 Aurora 体系**双轨并存并出现在同一界面上**；另存在 5 类「引用未定义 token」的功能性缺陷、约 300 处裸字号、18 处 `transition:all`、1 处被明令禁用的粉红色残留。**方向统一，执行未收口。**

---

## 1. 规范现状核对（先回答「有无统一设计规范」）

**已有且应作为唯一权威的规范**（无需从零提炼，但需增补条款）：

| 规范文件 | 内容 | 状态 |
|---|---|---|
| `src/aurora/styles/tokens.css` v2.0 | 色板 / 字号 / 间距 / 圆角 / 阴影 / 动效 / 尺寸全套 `--mc-*` | ✅ 单来源（旧 `src/styles/tokens.css` 已于 09-02 删除） |
| `docs/MarkCraft-Desktop-Native-Baseline.md`（§18） | 色彩/字体/间距/圆角/动效/组件/桌面交互/可达性 + 硬禁令 + 入站闸门 | ✅ 现行 |
| `REMEDIATION…2026-09-02.md` §6 | 「黄金标准」唯一取值表（半径/accent/反色/按钮/列表/弹层/字号/字重/动效/行高） | ✅ 现行，需随本报告增补 |

**规范缺位条款**（本报告第 6 节提出 v1.1 增补）：共享控件**单体系收敛策略**（`mc-*` vs `aurora-*` 去留拍板）、`--mc-border-*`/`--mc-shadow-*` 命名清单、**代码内联高亮语义色 token**、**圆角 token 禁止复用为间距/字号**、跨层（features 弹层）主题映射纪律。

---

## 2. 09-02 A–D 修复轮次 · 落地核对表（验收结果）

| 轮次承诺 | 验证结果 | 证据 |
|---|---|---|
| A · 删除旧 `src/styles/tokens.css`、统一令牌源 | ✅ **已落地** | 全仓仅剩 `src/aurora/styles/tokens.css` 一个 token 文件 |
| B · `#4c8bf5` 错误 accent 清除 | ✅ **已落地** | 全仓无 `#4c8bf5` 命中（CSS 域） |
| C · `.mc-btn` 废弃、统一 `.aurora-btn` | ❌ **未落地** | `.mc-btn` 仍在 `components/ui/Button.tsx` 全量使用，features 30+ 弹窗消费（见 §3-A） |
| C · focus-visible 群补 | ✅ **已落地** | `components.css:35-45` 群组选择器一次补齐 11 个自建按钮家族 |
| C · 博客卡片行改发丝行 | ⚠️ **部分** | 09-02 所述行号区域已改，但博客相关区仍存卡片化样式（见 §3-D 备注） |
| C · backlinks 选中态补齐 | ✅ **已落地** | `editor.css:1718 .aurora-backlinks__item.is-selected` |
| D · 动效/字号 token 化 | ❌ **大面积未落地** | `transition:all` 18 处、裸字号约 300 处仍在（见 §3-E/H） |

> 结论：**A/B 及「样式层群补」类改动落地；凡涉及「组件层迁移 / 全仓批量替换」的承诺（C-1 双按钮、D-1 字号、D-2 动效）基本未执行**，或执行后又有新代码漂移。

---

## 3. 分类问题清单（按影响与优先级排序）

### P0-A · 双组件体系并存（界面内直接可见的不一致）—— 本轮最严重

| # | 界面 / 场景 | 元素 | 当前取值 | 应有取值 | 位置 |
|---|---|---|---|---|---|
| A1 | Aurora 弹窗按钮（Confirm/Settings/About） | 按钮 | `.aurora-btn`：**h24/28/32**、radius sm4、主色 accent | —（基准） | `aurora/components/ui/Button.tsx` + `components.css:9-137` |
| A1b | features 弹窗（CreateFileModal / MigrateWizard / QuickCaptureModal / TemplateInsertModal / ErrorBoundary / InputModal / features Confirm） | 按钮 | `.mc-btn`：**h30/36/42**、radius **md8**、`--primary` 兜底 **#3b82f6 蓝**（非 accent） | 统一 `.aurora-btn` 体系 | `components/ui/Button.tsx` + `ui.css:96-168` |
| A2 | 同一 `mc-btn` 组件内主色分裂 | 按钮 | `--primary`=蓝 `#3b82f6`；`--brand`=accent `#7C8CFF`，同组件两种"主色" | 仅 accent 一种主色 | `ui.css:140-168` |
| A3 | 弹窗（Modal）双体系 | 模态 | aurora 侧 `.aurora-modal`（elevated/lg/popover）；features 侧 `.mc-modal`：bg `var(--mc-bg-panel,#1e293b)`（**token 未定义→蓝黑**）、标题 16px/700、accent 竖条 `#3b82f6`、header padding 20/24 | 全走 aurora Modal | `ui.css:225-278` vs `components.css .aurora-modal` |
| A4 | 输入框 / 空态双体系 | 控件 | `.mc-input` h36/radius md8/蓝 focus；`.mc-emptystate` 72px 圆形图标 + **亮色残留** `#1f2937/#6b7280/#9ca3af`（`--es-*` 局部变量） | 统一 aurora-input / aurora 空态 | `ui.css:180-201/310-355` |
| A5 | Toast | 通知 | Aurora 实际走 `.aurora-toast`（已 token 化 ✅）；`ui.css` 的 `.mc-toast`（`#1e293b` 底、`#ef4444/#22c55e/#3b82f6` 左条）**无消费者** | 删除 `.mc-toast` 死代码 | `ui.css:16-52`（死代码） |

> 触发场景：Aurora 壳内点「确认/删除/创建」→ 由 features 提供的对话框以 **36px 蓝按钮、蓝黑弹层** 呈现，与 Aurora 的 28px accent 按钮同屏并存。这是用户最可能感知到的"不统一"。

### P0-B · 引用未定义 token（渲染失效 / 兜底即硬编码）

| # | 位置 | 未定义 token | 后果 | 应改为 |
|---|---|---|---|---|
| B1 | `editor.css:2724/2748/2788` | `--mc-border-secondary` | 边框色无效 | `--mc-border-medium` |
| B2 | `editor.css:2731` | `--mc-border-primary` | 边框色无效 | `--mc-border-strong` |
| B3 | `editor.css:2805` | `--mc-border-tertiary` | 边框色无效 | `--mc-border-subtle` |
| B4 | `components.css:793` | `--mc-border` | 滚轮浮层边框无效 | `--mc-border-medium` |
| B5 | `components.css:794` | `--mc-shadow-lg`（兜底 hex） | 阴影退化硬编码 | `--mc-shadow-popover` |
| B6 | `canvas.css:2207/2222/2294` | `--mc-shadow-modal` | **弹层无阴影**（无兜底） | `--mc-shadow-popover`（或入 token） |
| B7 | `canvas.css:2757` | `--mc-ease-standard`（兜底 ease） | 缓动退化 | `var(--mc-ease-out)` |
| B8 | `canvas.css:1633/1634` | `--cv-card-border` / `--cv-radius-lg` | 跨命名空间引用，未定义则失效 | 改 `--mc-*` 或本地变量 |
| B9 | `kb-ui.css:9-32` 全链 | `--kb-*: var(--cv-*, #3b82f6/#6366f1/…)` | KB 内嵌 features 组件主题映射兜底为**旧蓝**，与 accent 不一致 | 映射到 `--mc-*` |

### P0-C · 颜色纪律违反（§4/§11）

| # | 界面 | 元素 | 当前 | 应有 | 位置 |
|---|---|---|---|---|---|
| C1 | 编辑器（代码高亮） | 行内 code / 预览 code | **`#F472B6`（§11 明令禁用的旧 daily 粉）** | 新增 code 语义色或 `--mc-accent-text` | `editor.css:117/238` |
| C2 | 全站按钮/开关/图标反色 | 反色文本 | `#fff`/`#ffffff` 约 20 处（blog:374/484/548/593/604、kb:465/469、diary:543-544、editor:1004/2059、canvas:1109/1192/1674/2236/2312、settings:470、shell:168、comp:1162/1225…） | `var(--mc-text-inverse)` | 各文件（grep `#fff\b`） |
| C3 | 各面板 accent 派生背景 | 徽标/选中/光环 | 裸 `rgba(124,140,255,α)` 约 20 处（kb:59-60/250/455、canvas:1114/1589-1591、graph:56-57/106、editor:459-460/500、welcome:96-228…） | `--mc-accent-soft` / `--mc-accent-glow` / `color-mix()` | 各文件 |
| C4 | 语义色变体 | 徽标/状态 | 裸 `rgba(74,222,128,…)` `rgba(251,191,36,…)` `#34d399` 等 | `--mc-success/-warning/-danger/-info` 及 `-soft/-text` | editor:589-591/718-727、comp:1097-1112、ui.css:34-36/160-161 |
| C5 | KB 迷你图谱 vs 知识图谱 | 节点配色 | `kb.css:383-385` 裸 `#5ad19a/#e6b450/#6fa8ff`，与 tokens 已定义的 `--mc-graph-file/tag/folder` **不同值** | 引用 `--mc-graph-*` | kb.css |
| C6 | 图谱节点/光晕 | 图谱 | `graph.css` 约 14 处裸 rgba（渐变/光点/背景） | `--mc-graph-*` / `--mc-accent-glow` | graph.css |
| C7 | Windows 关闭钮 | 危险红 | `shell.css:167-172` `#E81123/#C4101D` | 抽 `--mc-danger-winclose` token（OS 惯例色，保留但入 token） | shell.css |

### P1-D · 圆角纪律（§6：控件 sm4 / 容器 md8 / 窗口弹层 lg12）

| # | 类型 | 当前 | 位置（代表） |
|---|---|---|---|
| D1 | **控件误用 md(8)**（应 sm4） | `.mc-btn`/`.mc-input`（ui.css:112/189）、`.dv-btn`（diary:537）、日记若干 8px 裸值（diary:86/317/370/400/519）、`.aurora-switch`（comp:1207）、editor `__newfile` 组、canvas Dock（canvas:351） | diary/kb 输入与按钮最集中 |
| D2 | **裸 px 圆角**（应 token） | `0 2px 2px 0`/`2px` 指示条与角标（editor:159/343/933/1376/2125/2456、shell:481/689、comp:368/387、canvas:1170/1581/2102-2104/2660、graph:326/573、blog:219）、welcome kbd **5px**（welcome:229）、`999px`（diary:36→pill） | 全部收敛 `var(--mc-radius-sm)`（指示条可注释保留 2px） |
| D3 | **50% 圆点/头像**（应 pill 语义化） | `border-radius:50%` 约 25 处（graph/blog/canvas/diary） | `var(--mc-radius-pill)` |
| D4 | 档位误用 | `.aurora-insight__card` 面板内小卡用 lg12（editor:712） | 降 `md` |
| D5 | 便签/主题卡片色 | `canvas.css:416-428` 8 组裸 pastel 渐变（sticky 主题色） | 入 `categoricalColors` 风格单来源或本地 CSS 变量（裁决项） |

### P1-E · 字号与行高（规模最大：全站约 300 处裸 font-size）

| # | 类型 | 统计 / 代表 | 修正 |
|---|---|---|---|
| E1 | 裸 `font-size: Npx` | editor 65 · canvas 90+ · graph 15 · comp/shell/palette/toast/welcome 49 · diary/kb/blog/settings 87 ≈ **300 处** | 全部改 `var(--mc-font-*)`（xs11/sm12/base13/md14/lg16/xl20/2xl28） |
| E2 | **越界值**（档外） | comp wheel **15px**（comp:853）、welcome **34px**（welcome:72）、settings **32/24px**（settings:218/471）、canvas **22px**（canvas:1349）、editor **13.5/11.5px**、diary **12.5px**、kb **10.5px**×2、blog **9px** | 归位最近档；34/32px 若确需可入 token 体系而非裸值 |
| E3 | **radius token 误作字号/间距** | `canvas.css` 命令面板区：`font-size: var(--mc-radius-md)`（=8px！canvas:2210/2217）、`gap/padding: var(--mc-radius-md)`（canvas:2197-2224 约 15 处）、editor/canvas 其它区亦混用 | 全改 `--mc-space-*` / `--mc-font-*`；**纪律：radius token 禁止复用作几何值** |
| E4 | 行高未 token | `line-height: 1.2~1.6` 全仓裸写 | 引 `--mc-line-height-*` |

### P1-F · 阴影 / 弹层表面 / 焦点

| # | 类型 | 现状 → 应改 | 位置 |
|---|---|---|---|
| F1 | 裸 rgba 阴影约 35 处 | → `--mc-shadow-panel/popover/inset` | editor:849/1085/1090/1338/2750、kb:104/636、blog:115、graph…、comp 22 处 |
| F2 | 弹层背景三态并存 | bg-content（canvas cmdk/ctx、ui mc-modal）· bg-elevated · 裸 `rgba(21,24,33,…)`（editor/graph 遗留）→ **统一 bg-elevated** | 09-02 P1-3 承诺未全清 |
| F3 | 焦点环 | `focus-visible` 已群补于 11 个按钮家族（✅）；**但仍缺**：各 icon 方形按钮、命令面板项、`mc-*` 体系、无 class 的原生 button 样式 | 抽查补齐（grep `:focus-visible` 未见处） |

### P1-G · 尺寸 / 间距体系（同义控件横向对照）

| 控件语义 | 各面板实际取值 → 建议统一 |
|---|---|
| 次按钮高度 | 共享 aurora 28 · kb 28 · settings 28 · diary format 28 · filetree action 30 · canvas view 30/32 · blog 32 · **diary `.dv-btn` ~33(自适应)** · **canvas Dock 36** · **mc-btn 36/42** → 定 28(默认)/24(紧凑)/32(大)；图标钮 28 |
| 头部/子栏高度 | editor filetree topbar 36 / outline header 36 / editor overlay-head 34 / canvas overlay-head 34 / kb·blog subbar 46 / settings nav 48 → 按「工具栏 36 / 面板头 34-36 / 详情头 44-48」归类入 token |
| 列表行高 | 26（outline）/28（props）/30（filetree）/32（list-item/emptyfiles/ctxmenu）/34（kb-menu）/36-40（command/sidebar）→ 按层级定 26-30-32 三档 |
| 间距 | 非 8 基档约 180 处；高频 `10px`(~60) `14px` `18px` `9px` `7px` `5px` `3px` → 收敛 `--mc-space-*`；hoverzone 7px 等专用值入 token 并注释 |
| 内边距语义 | 多处 `padding: 0 10px` 输入/按钮（应 `--mc-space-3`6 或 `--mc-space-4`8 统一） | 

### P1-H · 动效（§7：<300ms、ease-out/spring、禁 transition:all）

| # | 类型 | 位置 |
|---|---|---|
| H1 | `transition: all` 18 处 | blog.css 10 处（344/371/543/662/719/853/876/895/970/995）+ graph.css 8 处（263/286/303/357/500/596/660/699） |
| H2 | 时长 >300ms | canvas dash 400ms/600ms（1379/1502）；循环类 blog shimmer 1.1s / spin 0.9s / graph pulse 2s 可保留但时长走 `--mc-dur-*` |
| H3 | 裸 `ease`/`150ms ease` | editor 多处、canvas 160ms ease（2049）、kb 140ms → `var(--mc-ease-out)` + `--mc-dur-*` |
| H4 | 同组件内不一致 | canvas Dock hover 态混用 spring/ease-out | 统一 spring |

---

## 4. 09-02「黄金标准」执行率速览（供验收）

| 黄金标准条款 | 执行率 | 备注 |
|---|---|---|
| 令牌单来源 | ✅ ~100% | 旧文件已删 |
| accent 单来源、禁 #4c8bf5 | ✅ ~100% | 但 `#F472B6` 残留 2 处（新发现的漏网禁色） |
| 反色文本 `--mc-text-inverse` | ⚠️ ~70% | `#fff` 约 20 处未清 |
| 唯一按钮 `.aurora-btn` | ❌ ~40% | `.mc-btn` 双轨并存 |
| 列表发丝化 | ✅ ~90% | backlinks 选中态已补 |
| 弹层单规范 | ⚠️ ~60% | bg 三态仍在、`--mc-shadow-modal` 3 处无效 |
| 字号单标度 | ❌ ~35% | 约 300 处裸字号 |
| 动效单语言 | ❌ ~50% | 18 处 `transition:all` 未清 |

---

## 5. 修正路线（按优先级串行，每轮独立 commit + tsc + 相关 smoke 守门）

- **R1 · 功能缺陷清零（P0-B）**：~~替换全部未定义 token 引用（editor 5 处、components 2 处、canvas 6 处、kb-ui 映射链）~~ → **✅ 已落地（2026-09-06）**：editor.css `--mc-border-secondary/primary/tertiary`→`medium/strong/subtle`；components.css 滚轮浮层 `--mc-border`→`medium`、`--mc-shadow-lg`→`popover`；canvas.css `--mc-shadow-modal`×3→`popover`、`--mc-ease-standard`→`ease-out`、`--cv-card-border/--cv-radius-lg`→`--mc-border-medium/--mc-radius-lg`；kb-ui 映射链经核实 Aurora 内嵌已被 `.aurora-kb.kb-shell` 复合选择器重映射至 `--mc-*`（独立 KbManager 仅测试消费，无实界面影响）。验证：`tsc`=0 + 附录 grep 清零。
- **R2 · 双体系收敛（P0-A）**：~~需用户拍板~~ → **✅ 已拍板并落地（2026-09-06，见 §7 落地记录）**：features 层整体消费 Aurora UI——共享组件（Button/Modal/Input/EmptyState/ToastProvider）保留 API、改输出 `.aurora-btn/.aurora-modal/.aurora-input/.aurora-toast` class（`ui.css` 的 `mc-btn/mc-modal/mc-input/mc-field/mc-toast/mc-titlebar/:root 自造变量` 段全删）；`.mc-emptystate` 亮色残留改名 `aurora-emptystate` 并 token 化。
- **R3 · 禁色/反色/语义色收敛（P0-C）**：`#F472B6`→code 语义色；`#fff`→`--mc-text-inverse`；accent/语义 rgba→token 或 `color-mix()`；kb 迷你图谱引 `--mc-graph-*`。
  - **✅ 已落地（2026-09-06）**：tokens 新增 `--mc-code/--mc-code-soft/--mc-code-text`（替代禁粉 #F472B6，editor 2 处 + 预览 code）；`--mc-danger-winclose/-pressed`（shell 关闭钮）；`--mc-font-display/--mc-font-hero`（展示级字号）。`#fff`→`--mc-text-inverse` 全量收敛（color/控件滑块/勾选；blog 预览 iframe 内容白底按语义保留）；accent/语义 rgba 113 处 → `--mc-accent-soft` 类 token 或 `color-mix(in srgb, var(--mc-*) N%, transparent)`；kb 迷你图谱节点 fill/stroke 对齐 `--mc-graph-*`；CanvasInspectorPanel 便签默认色 `#8B5CF6`（禁 AI 紫）→ `#F59E0B` 与其余 4 处新建便签路径统一。附录禁色 grep 清零。
- **R4 · 字号与 radius-token 误用（P1-E 中 E3/E2 优先）**：~~先清 `font-size:var(--mc-radius-md)` 等语义错乱，再批量 token 化裸字号~~ → **✅ 已落地（2026-09-06）**：E3 radius-token 误作几何值 40 处清零（canvas 命令面板/检查器/列表区为主，padding/gap/margin/尺寸改 `--mc-space-*`，font-size 归位）；E2 越界字号 11 处归位（10.5→xs、滚轮 15→md、头像 32/24→display/xl、欢迎 34→hero）；E1 裸字号 359 处全量 token 化（11/12/13/14/16/20/28px→`--mc-font-*`），仅剩 SVG viewBox 内 3.4px 与 em 相对字号合理保留。
- **R5 · 圆角/间距/阴影收口（P1-D/F/G）**：裸 px 圆角→token、控件 md→sm、非基档间距归位、阴影引 token。
  - **✅ 主体已落地（2026-09-06）**：diary 控件类（mood-btn/date-main/format-bar__btn/dv-btn/confirm 等）md8→sm4，容器（editor-block/cal/otd/daily-q）保留 md，999px→pill token；Dock 图标按钮 md→sm；insight 小卡 lg→md；welcome kbd 5px→sm + 边框 token 化；阴影浮层收敛（cards/sticky→panel、kb-menu→popover、激活凸起→inset 语义）。2px 指示条/迷你几何与 50% 圆形（头像/开关/圆点）按视觉正确保留。
- **R6 · 动效（P1-H）**：18 处 `transition:all` 拆具体属性，>300ms 归一。
  - **✅ 已落地（2026-09-06）**：blog 10 + graph 8 处 `transition:all` 展开为五属性标准列表（bg/color/border/box-shadow/transform）；140/160ms→`--mc-dur-fast`，400/600ms 大过渡→`--mc-dur-slow`，均走 `--mc-ease-*` token。附录 `transition: all` grep 清零。
- 每轮验证沿用 09-02 门禁矩阵：`tsc` + 5174 截图 + 相关面板 smoke。

---

## 6. 规范增补（黄金标准 v1.1 提案，供 §18 评审）

| 条款 | 内容 |
|---|---|
| 6.1 共享控件单体系 | 界面内**只允许一套**共享 Button/Modal/Input/EmptyState；features 层组件一律消费 Aurora 体系（组件可保留名、样式统一），禁 `mc-*` 与 `aurora-*` 双轨 |
| 6.2 命名空间白名单 | 边框仅 `--mc-border-subtle/medium/strong/outline`；阴影仅 `--mc-shadow-panel/popover/inset`（如确需 modal 级阴影，在 tokens 定义 `--mc-shadow-modal` 而非消费端自造）；禁 `--mc-border-secondary/primary/tertiary/-lg/modal` 等自造名 |
| 6.3 radius token 语义 | `--mc-radius-*` **仅用于圆角**；间距一律 `--mc-space-*`、字号一律 `--mc-font-*`，禁止 radius token 复用为几何值（font-size/padding/gap） |
| 6.4 代码内联语义色 | 行内 code/标记/高亮等 Markdown 语义色建立 `--mc-code*` 系列（替代 `#F472B6`），入 tokens.css 供编辑器/预览/博客共用 |
| 6.5 反色与强调派生 | 反色文本仅 `--mc-text-inverse`；accent 派生背景/光环仅 `--mc-accent-soft/-glow` 或 `color-mix(var(--mc-accent), transparent N%)`，禁裸 rgba |
| 6.6 图谱/分类色 | 迷你图谱/图谱/文件色全部引用 `--mc-graph-*` 与 `categoricalColors.ts` 单来源 |
| 6.7 循环动效 | 循环类动画（脉冲/闪烁/shimmer）时长入 `--mc-dur-*`，并接受 reduced-motion 下减速 |
| 6.8 验收机制 | §12 入站闸门增补 grep 自检命令（见附录），使「承诺落地」可机器验收 |

---

## 附录 · 复核命令（复跑验证本报告结论）

```bash
# 未定义 token（功能缺陷）
grep -rn "var(--mc-border[,)]\|--mc-shadow-modal\|--mc-ease-standard\|--mc-border-secondary\|--mc-border-primary\|--mc-border-tertiary\|var(--cv-\|var(--mc-shadow-lg" src/aurora
# 禁色残留
grep -rn "#F472B6\|#4c8bf5\|#C4B5FD\|#EC4899\|#8B5CF6" src/aurora/styles src/aurora/panels
# 双体系
grep -rln "mc-btn\|mc-modal\|mc-toast" src --include=*.tsx --include=*.css
# 裸字号（约 300 处）
grep -rn "font-size: *[0-9]" src/aurora/styles | wc -l
# radius token 误用
grep -rn "font-size: *var(--mc-radius\|padding[^;]*var(--mc-radius\|gap: *var(--mc-radius" src/aurora/styles
# 动效违规
grep -rn "transition: *all" src/aurora/styles
```

---

## §7 · R2 落地记录（2026-09-06，用户拍板后执行）

**拍板**：features 层弹窗/按钮整体收敛到 Aurora UI 体系（AskUserQuestion 三项全选推荐：①弹窗完全复刻 Aurora；②统一 28px 桌面密度、primary/brand 合一 accent；③Toast 合并单一实现）。

**共享组件改造（保留组件名与全部调用点，改输出 aurora class → features 30+ 弹窗零改动）**：

| 组件 | 改动 | 视觉源 |
|---|---|---|
| `Button.tsx` | `mc-btn*` → `.aurora-btn*`；映射 primary/brand→primary(accent)、subtle→ghost(0 消费)、secondary/ghost/danger 直通；sm24/md28/lg32；block/iconOnly 保留；去 `./ui.css` 依赖 | components.css `.aurora-btn` |
| `Modal.tsx` | `mc-modal*` → `.aurora-modal*`；header 40px+14/600+右上 ✕（自动聚焦跳过 ✕）；accent 竖条弃用；description 移正文 `.aurora-modal__desc`；保留焦点陷阱/aria/ESC/遮罩 | components.css `.aurora-modal*` |
| `Input.tsx` | `mc-input` → `.aurora-input`（28px+accent 环）；wrapper/icon 插槽/error 对齐 aurora 结构；label/hint/error → 补充 `.aurora-field__*` | components.css + ui.css |
| `EmptyState.tsx` | `mc-emptystate` → `aurora-emptystate`（同名 css 段 token 化，删亮色默认；已核实无外层 `--es-*` 覆盖） | ui.css |
| `ToastProvider.tsx` | 以 aurora 实现覆盖（`.aurora-toast` + currentColor + warning + 3000ms）；`aurora/app/ToastProvider` 改 re-export → 双 Context 合一 | toast.css |

**CSS 单源化**：components.css `.aurora-btn` 补 `box-sizing:border-box` + `.aurora-btn--block`；Modal 段补 `.aurora-modal--sm/md/lg`(360/440/640) 与 `.aurora-modal__desc`。ui.css 收缩（~361→~150 行）：删 `.mc-btn/.mc-field/.mc-input/.mc-modal/.mc-toast/.mc-titlebar` 与 `:root` 自造变量段，保留段仅 `.aurora-field*`/`.aurora-emptystate`/`.mc-lazy-*`/`.mc-tooltip`（均已 token 化）。

**验证**：`tsc --noEmit`=0；附录「双体系」grep（`mc-btn|mc-modal|mc-toast`）**清零**，扩展检查 `mc-input|mc-field|mc-emptystate|mc-titlebar` class 亦清零（仅剩 tokens.css 正常 `--mc-titlebar-h` 变量）；Settings/TemplateInsert/TemplateDiscovery/PlatformPublish **42/42**、Editor/Diary/Canvas×2/Kb×3/Blog **51/51** 全绿。

**遗留（可后续）**：aurora/components/ui（自家 Button/Modal）与共享层同 class 双实现并存（无视觉分裂）→ 可 re-export 去重；aurora/app/ConfirmProvider 与 components ConfirmProvider 双 Context 同视觉并存；`.mc-lazy`/`.mc-tooltip` 为死代码 token 化保底（LazyBoundary/Tooltip 无消费者，待确认后删）。

---

*本报告为审查交付。R2 已由用户拍板并落地（见 §7）；R1/R3–R6 按优先级推进。*
