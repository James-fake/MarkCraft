# MarkCraft 桌面原生设计基线（§18）

> **定位**：MarkCraft / Aurora 界面所有 UI 工作的**守门标准（Gate Standard）**。
> 任何面板、组件、样式、动效的新增或修改，落地前先过 §18.12 的「入站闸门」。
> 本文档是**可执行规范**，不是审美宣言——每条都锚定真实 token（`src/aurora/styles/tokens.css`）与已落地的历史轮次。

---

## 0. 来源与提炼方法

本文档由三套设计 skill 收敛而来，按桌面原生编辑器的语境做了**取舍与本地化**：

| 来源 skill | 核心贡献 | 在本基线中的角色 |
|---|---|---|
| `macos-design-guidelines`（Apple HIG for Mac） | 菜单栏/窗口/工具栏/侧栏/键盘/指针/可达性 | **架构与交互语法**基线（§3 §9 §10） |
| `taste-skill` + `minimalist-skill`（Leonxlnx 反 AI 味） | AI-slop 反模式、极简编辑风、硬禁令 | **视觉与反模式**基线（§4 §11） |
| `emil-design-eng`（Emil Kowalski 设计工程） | 动效决策框架、组件打磨、不可见细节 | **动效与组件**基线（§7 §8） |

**本地化判读（重要，避免网关误伤）**：
- 项目是**深色桌面原生主题**，token 已定型。基线不推翻既有 token，只固化纪律。
- `--mc-accent: #7C8CFF`（极光蓝紫）是**刻意保留的品牌主色**，**不禁用**。被禁的是「品牌色之外的紫」：装饰渐变/辉光、分类数据色中的紫粉（已在 B / markdown 去紫轮清零）。
- taste 的「禁 Inter」是网页 landing 语境；项目已落 `Inter` 语义字号体系，本轮**不翻案**，收成「系统原生栈 + 语义字号 + 不裸写 font-size」纪律（§5）。

---

## 1. 设计语言一句话定义

> **精致材质 · 通透层次 · 桌面原生** —— 像 VS Code / macOS / 成熟 IDE 那样：紧凑信息密度、键盘优先、发丝分隔、语义色驱动，零 Web 堆砌感、零 AI 紫辉光。

---

## 2. 八条基线总览

| # | 基线 | 一句话纪律 |
|---|---|---|
| §3 | 架构 | 窗口 chrome 固定，导航走侧栏，动作进工具栏/subbar，弹层走统一 Modal |
| §4 | 色彩 | 一切色值走 `--mc-*` 语义 token；分类色单来源；品牌 accent 保留、其外之紫禁绝 |
| §5 | 字体 | 系统原生栈 + 语义字号（`--mc-font-*`）；代码走 mono；禁止裸写 font-size |
| §6 | 间距·圆角·密度 | 8px 间距基准；圆角三档单来源；默认高密度 |
| §7 | 动效 | 频率决策优先；UI 动效 <300ms、ease-out、仅 transform/opacity；键盘动作不动画 |
| §8 | 组件·动作语法 | 按钮有按压缩放；危险动作右置分隔；无假 affordance；单主入口；无 FAB/占位按钮 |
| §9 | 桌面交互 | 键盘优先 + 右键菜单 + 拖拽 + hover + 多选；桌面原生而非移动移植 |
| §10 | 可达性 | reduced-motion / reduced-transparency / 对比度 / 图标标签 四必过 |

---

## 3. 架构基线（macOS HIG 本地化）

1. **窗口 chrome 固定**：标题栏 `--mc-titlebar-h`(48) / 状态栏 `--mc-statusbar-h`(28) / 工具栏 `--mc-toolbar-h`(36) 由外壳承载；**面板导航/分段/操作按钮禁止塞进标题栏**，放各自子栏（segmented 控件：轨道 `bg-pressed` + 激活 `bg-elevated` + 阴影）。
2. **导航走侧栏**：主导航在左侧栏 `--mc-sidebar-w`(200) / 收起 `--mc-sidebar-collapsed-w`(60)，可折叠、状态持久化。禁止汉堡菜单、禁止底部 iOS 式 tab bar。
3. **动作进工具栏 / subbar**：主创建动作固定在页面头部操作区或详情页 subbar 右侧（对齐 KbPanel 详情页语法）。**禁止把主动作埋进需滚动才见的卡片末尾**（A1 已落实）。
4. **弹层走统一 Modal**：所有对话框走 `src/aurora/components/ui/Modal.tsx`，禁止各面板手搓 `createPortal` 模态（P1.5 已落实）。
5. **弹层遮罩零玻璃**：Modal 遮罩用 `rgba(0,0,0,.5)` scrim + 淡入，**禁止 backdrop-filter blur**（① 已落实）。侧栏/弹层/popover 的材质 blur 是桌面原生，保留（`.material-sidebar/.material-popover/.material-hud`）。
6. **多窗口 / 可缩放**：桌面端预期可多窗口、自由缩放、记住窗口状态（路线图战略：项目向桌面端软件转型）。

---

## 4. 色彩基线

### 4.1 语义 token 单来源（铁律）
- 所有色值**必须**引用 `tokens.css` 的 `--mc-*`，**禁止硬编码 hex**（含 rgba 必须用 `--mc-*-soft` 等语义变量）。
- **禁止引用未定义的 token**（fallback 永远生效 = 等于硬编码，P0.3 根因）。
- 色板层级：背景 7 级 `--mc-bg-*` / 文本 5 级 `--mc-text-*` / 图标 4 级 `--mc-icon-*` / 边框 4 级 `--mc-border-*` / 语义色 success/warning/danger/info 各含 `-soft`/`-text`。

### 4.2 品牌 accent —— **保留，不禁用**
- `--mc-accent: #7C8CFF` 是刻意保留的品牌主色，用于选择/强调/激活/链接/聚焦光晕。
- **仅允许通过 `--mc-accent*` 系列引用**，禁止在别处另写 `#7C8CFF` 或同色紫。
- 若未来要做「全站 re-theme」换掉主色，属独立大动作，需单独拍板，**不在本基线自动范围**。

### 4.3 分类色板 —— 单来源 + 去紫味（已落 D4 / B / markdown 去紫）
- 文件类型色、图谱分组色集中在 `src/aurora/themes/categoricalColors.ts`（`FILE_TYPE_META` / `GROUP_COLORS`），各面板 `import` 复用，**禁止面板内联双写**（D4 已落实）。
- 八类文件色现已**零紫零粉、两两可区分**：
  `folder #FBBF24` / `markdown #3B82F6` / `canvas #14B8A6` / `image #4ADE80` / `pdf #F87171` / `template #22D3EE` / `daily #FB923C` / `unknown #6B7280`。
- 图谱六分组色同样零紫零粉（第 5 色蓝、第 6 色 teal，来自 B 轮）。
- **新增分类色必须入 `categoricalColors.ts`**，且不得引入紫(`#8B5CF6`)/粉(`#EC4899`)/原 AI 紫(`#A78BFA`)/原 daily 粉(`#F472B6`)。

### 4.4 语义色使用
- 状态用 `--mc-success/-warning/-danger/-info`；文字态用对应 `*-text`；背景态用对应 `*-soft`。
- 危险动作视觉：文字/描边走 `--mc-danger*`，不与中性动作平铺（§8.2）。

---

## 5. 字体基线

- **字体栈**：`--mc-font-sans: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif`（系统原生优先，跨平台回退）；代码 `'JetBrains Mono', 'Fira Code', 'Consolas', monospace`。
- **语义字号**：仅用 `--mc-font-xs(11)/sm(12)/base(13)/md(14)/lg(16)/xl(20)/2xl(28)`，**禁止裸写 `font-size`**。
- **行高**：配套 `--mc-line-height-*`，正文 `--mc-line-height-base`(20)。
- **反模式**：禁止在界面里随机换 display 字体、禁止纯黑 `#000` 正文（用 `--mc-text-primary #E8ECF4`）、禁止 emoji 作图标（走 `src/aurora/icons.tsx` 的 `Icon.*`）。

---

## 6. 间距 · 圆角 · 密度基线

- **间距 8px 基准**：`--mc-space-1..12`（2/4/6/8/12/16/24/32/48）。控件内距 ≥ `--mc-space-4`(8)，组间距 `--mc-space-6`(16)，大区块 `--mc-space-8`(24)。
- **圆角三档单来源（★权威）**：`--mc-radius-sm(4)` 控件 / `--mc-radius-md(8)` 容器·面板 / `--mc-radius-lg(12)` 窗口·弹层 / `--mc-radius-pill(999)` 胶囊。**禁止任何文件另起 `--mc-radius*` 或异名裸 px 圆角**（P0.2/P0.4 已收口）；禁止 6px 以上非窗口裸圆角（AI-slop）。
- **密度**：默认常规；`[data-density='compact']` 已落更紧凑变量（标题栏 42、侧栏 180、正文 12）。信息密度高，反对大留白/卡片化 Web 风。

---

## 7. 动效基线（emil 设计工程）

### 7.1 频率决策（先问「该不该动」）
| 频次 | 决策 |
|---|---|
| 100+ 次/天（快捷键、命令面板开关、tab 切换） | **不动画**。Raycast 级工具开合零动画即最优 |
| 数十次/天（hover、列表导航） | 去除或大幅削弱 |
| 偶发（Modal、抽屉、Toast） | 标准动画 |
| 罕见（首次引导、庆祝） | 可加 delight |

### 7.2 时长与缓动
- **UI 动效 <300ms**：按钮反馈 100–160ms、tooltip/popover 125–200ms、下拉 150–250ms、Modal 200–500ms。
- **缓动**：进入/退出用 `--mc-ease-out`（`cubic-bezier(0.33,1,0.68,1)`）；屏内位移用 `--mc-ease-spring`；**禁止 `ease-in`**（起始慢、显得迟钝）；**禁止 `transition: all`**（列具体属性）。
- **入场不从 `scale(0)`**：从 `scale(0.95)` + `opacity:0` 起（真实物体不会凭空出现）。
- **popover 从触发点缩放**（`transform-origin` 指向源），**Modal 保持居中**（不锚定触发点）。

### 7.3 性能与可中断
- **仅动画 `transform` / `opacity`**（跳 layout/paint，跑 GPU）。
- 高频触发元素（Toast、状态切换）用 **CSS transition 而非 keyframes**（可中断、可重定向；keyframes 从零重启）。
- 按钮按压缩放用 `:active { transform: scale(0.97) }` + `transition: transform 160ms ease-out`。

### 7.4 降动（已在 tokens.css:231 全局守卫）
- `@media (prefers-reduced-motion: reduce)` 全局把 `animation/transition-duration` 压到 `0.01ms`（保留 opacity/color 渐变助理解，移除位移/形变）。
- 任何新动效必须在此媒体查询下「仍可理解」，不得依赖运动传达关键信息。

---

## 8. 组件与动作语法基线

### 8.1 按钮反馈（emil）
- 所有可按压元素：`:active` 加 `transform: scale(0.97)`（0.95–0.98 微缩），即时反馈「界面听见了你」。
- 主操作视觉强调（实色 / accent），次级 ghost，危险 danger 红。

### 8.2 危险动作分隔（A2 已落实）
- 删除等危险动作**右置 + 分隔**（subbar 用 `subbar-sep` 推最右；底栏用 `toolbar__sep`），不与中性动作平铺。
- 危险按钮用 `--mc-kb-btn--danger` / `dv-ghost-btn--danger` 语义类，不靠位置暗示。

### 8.3 禁止假 affordance（A3 已落实）
- 不可点的统计/KPI/标签**不要**做成 `cursor:pointer` + `onClick→toast`。纯展示就去掉指针与点击。
- 若元素可点，必须接**真实行为**（跳转/筛选/打开），不弹「查看 X」占位 toast。

### 8.4 单主入口（A4 已落实）
- 同一语义动作（如「记录心情」）收敛为**唯一主入口**，其余入口移除或降为次要，避免动作语义分散。

### 8.5 禁止 FAB / 占位按钮（桌面原生）
- **禁止 Material 风浮动操作按钮（FAB）**：主动作进工具栏/subbar/行内（§3.3）。
- **禁止占位摆设按钮**：子栏「打开」必须接真实行为（如 `handleOpenPreview` 导出 iframe 在新标签打开），不通 `toast` 占位（A6 已落实）。

### 8.6 弹层固定停靠
- 可拖拽面板必须有**约束停靠**（左/右贴边 + 甩动吸附），禁止无约束自由悬浮（A5 已落实：BlogPanel 浮动面板）。

---

## 9. 桌面交互基线（macOS HIG）

- **键盘优先**：所有鼠标可达动作都有键位；主操作 Cmd+字母，次级 Cmd+Shift/Option，视图控制 Cmd+Ctrl（§3 工具栏/侧栏快捷键）。Esc 取消/关闭弹层；Return 触发默认按钮；Delete 删选中；Space 快速预览。
- **右键上下文菜单**：所有可交互元素提供右键菜单（重命名/复制/删除…），危险项用 destructive 角色。
- **拖拽**：内容可拖拽重排、跨容器移动、从外部导入；拖拽越过边界用阻尼而非硬停。
- **hover 态**：所有可交互元素有可见 hover（按钮高亮、行选中指示）；hover 动画包 `@media (hover:hover) and (pointer:fine)`。
- **多选**：列表/表格支持 Cmd+Click 非连续、Shift+Click 范围选择。
- **光标语义**：可点→pointer、文本→I-beam、可拖→grab、边缘→resize。

---

## 10. 可达性基线

- **reduced-motion**：§7.4 全局守卫；新动效不得依赖运动传达关键信息。
- **reduced-transparency**：若引入半透明材质，须在系统开启「降低透明度」时回退实色（侧栏 `.material-sidebar` 等桌面原生材质保留，但新增材质要考虑回退）。
- **对比度**：自定义色须满足 Increase Contrast 偏好；语义 token 已分级，禁止用 `--mc-text-tertiary` 作正文主色。
- **图标标签**：所有纯图标工具栏项/图片按钮必须有 `aria-label` / 可访问性标签（VoiceOver 可读懂上下文，不只「trash」）。
- **焦点序**：Tab 在控件间移动、方向键在列表/表格内导航，无键盘陷阱。

---

## 11. 硬禁令清单（项目定制 AI-slop 反模式）

| 禁 | 说明 / 已落轮次 |
|---|---|
| ❌ 品牌色之外的紫（`#A78BFA`/`#8B5CF6`/`#EC4899`/`#F472B6` 等） | 装饰渐变/辉光/分类数据色；B + markdown 去紫已清零 |
| ❌ AI 紫渐变 / 紫辉光作 chrome 装饰 | P3 已清 |
| ❌ 纯黑 `#000` / 纯白大面积 hero 实色块 | 用 `--mc-bg-*` / `--mc-text-*` |
| ❌ emoji 作 UI 图标 | 走 `Icon.*`；P3 已清 |
| ❌ 硬编码 hex / 引用未定义 token | 一切走 `--mc-*`；P0.3 根因 |
| ❌ 面板内联双写分类色 | 入 `categoricalColors.ts`；D4 已落实 |
| ❌ 另起 `--mc-radius*` / 异名裸 px 圆角 | 圆角三档单来源；P0.2/P0.4 已收口 |
| ❌ pill(999) 用于大容器/面板/主按钮 | 仅胶囊按钮/标签 |
| ❌ 弹层遮罩 backdrop-filter blur | 用 scrim；① 已清 |
| ❌ FAB 浮动操作按钮 | 主动作进工具栏/subbar/行内 |
| ❌ 汉堡菜单 / 底部 iOS tab bar | 侧栏 + 工具栏 + 文档 tab |
| ❌ 占位/假按钮（toast 摆设、假 affordance KPI） | A3/A6 已清 |
| ❌ `transition: all` / `scale(0)` 入场 / `ease-in` on UI / 时长 >300ms | emil 动效纪律；§7 |
| ❌ 动画键盘高频动作（100+/天） | §7.1 |
| ❌ 各面板手搓 `createPortal` 模态 | 走统一 Modal；P1.5 已落实 |
| ❌ 大留白 / 卡片化 Web 堆砌风 | 高密度桌面原生；反对 |

---

## 12. 入站闸门（Pre-flight Gate）— 每次 UI PR 前自检

改任何 Aurora 界面前，逐条过；任一不过则先修再提。

| # | 闸门项 | 判据 |
|---|---|---|
| 1 | 色值走 token | 无新增硬编码 hex；无未定义 token 引用 |
| 2 | 分类色单来源 | 新文件/分组色入 `categoricalColors.ts`；无紫粉 |
| 3 | 圆角合规 | 仅 `--mc-radius-sm/md/lg/pill`；无裸 px 圆角 |
| 4 | 字号语义 | 仅 `--mc-font-*`；无裸 `font-size` |
| 5 | 动效合规 | 仅 transform/opacity；<300ms；ease-out；非键盘高频 |
| 6 | 降动守卫 | 新动效在 reduced-motion 下仍可理解 |
| 7 | 危险分隔 | 删除等危险动作右置+分隔，不平铺 |
| 8 | 无假 affordance | 可点元素接真实行为；不可点去指针 |
| 9 | 单主入口 | 同语义动作无多入口分散 |
| 10 | 无 FAB/占位 | 主动作在工具栏/subbar；无 toast 摆设按钮 |
| 11 | 弹层统一 | 对话框走 `Modal`；遮罩无 blur |
| 12 | 交互桌面化 | 键盘可达 + 右键菜单 + hover + 拖拽（按需） |
| 13 | 可达性 | 图标有 label；对比度达标；焦点序合理 |
| 14 | 反模式扫描 | 过 §11 硬禁令清单，零命中 |

---

## 13. 与历史轮次映射（已落点，基线即其固化）

| 轮次 | 落点 | 固化进基线 |
|---|---|---|
| P0–P3 / ① | 紫辉光、按钮渐变、语义色、圆角分档、弹层去玻璃、reduced-motion、emoji→图标 | §4.1 §4.4 §6 §7.4 §11 |
| P1.5 | 手搓模态→统一 Modal | §3.4 §11 |
| P4 | 孤儿 CSS / 退役组件去重 | §3.4（结构归一） |
| D4 | 分类色单来源 | §4.3 |
| A（按钮位置编排） | 主创建进头部、危险分隔、去假 affordance、单入口、浮动面板停靠、去占位 | §3.3 §8.2 §8.3 §8.4 §8.5 §8.6 |
| B + markdown 去紫 | canvas/daily/图谱/markdown 分类色去紫味 | §4.2 §4.3 §11 |

---

## 14. 维护约定

- **token 单来源**：任何 `--mc-*` 新增/修改只在 `tokens.css`；消费端只引用。
- **改基线走评审**：本文档（§18）的增删改需显式拍板，不在普通 UI PR 里顺手改。
- **新增面板先过闸门**：§12 是 PR 模板的必勾项；模板位置 `.github/PULL_REQUEST_TEMPLATE/ui.md`（任何 `src/aurora/` 改动 PR 必勾）。
- **文档镜像实况**：界面删功能 → 本文档同步删；界面加功能 → 先在 §18 落纪律再加代码。

---

*基线版本：v1.0（2026-08-30 由 macos + taste/minimalist + emil 三 skill 提炼，锚定 tokens.css v2.0 与 Aurora 历史收口轮次）。*
