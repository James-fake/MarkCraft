# 03 · 编辑器（Editor）规范

> 对应 `panels/editor/*` + `styles/panels/editor.css`。已换芯（D8）：数据来自真实 store（`FileStore` / `useAppLogic` 自动保存等）；布局经 **v7 边缘悬停召唤面板**（2026-08-31，取代范式重构 A 活动栏式）。

## 1. 外壳与状态栏

`PageFrame`（侧栏 active=`编辑器`）：
- `breadcrumbs`：`项目 / 设计文档 / Aurora.md`
- 状态栏左：保存点 + `1,234 词` + `UTF-8`；右：`第 11 行` + `Markdown` + 可点击 `⌘K 命令面板`。

## 2. 工具栏结构（极简整治 · 2026-09-01）

单行（并入标签栏同一行，不新增一行；整治前为「源码/所见即所得/预览 三个散按钮 + 发布 + 知识库」挤在右侧，按钮过多种乱、不工整）：

- **EditorToolbar**：左 = 多文件标签栏（`AuroraTabs`，`flex:1`）；右（最右）= **视图切换按钮组**（轨道 `var(--mc-bg-pressed)` + 发丝描边 + active 项 `var(--mc-bg-elevated)` + 轻微投影）：`源码`(`code`) / `预览`(`eye`) 两个独立窗格按钮 + `所见即所得`(`edit`) 内核按钮。切换语义为用户确认的 **4 态循环**：源码/预览各自独立开合、二者同开 = 双屏（左源码右预览）；`源码`/`预览` 任一窗格可见即高亮（**双屏时两者同亮**，这是分段控件互斥单选表达不了的复合态，故不采用 segmented）。状态机：纯源码(A) ⇄ 纯预览(C) 独占互切，双屏(B)下点某窗格 = 收起该窗格转入独占；即点「源码」：A→C / B→C / C→B，点「预览」：A→C / B→A / C→A。`⌘K` 的 `view.togglePreview` 经命令桥 `togglePreview` 复用同状态机；`wysiwyg` 下源码/预览按钮置灰（`is-muted`）但可点，点击即切回对应源码视图。
- **发布 / 知识库移出顶栏**：不再常驻顶栏抢位，改走 ⌘K 命令面板（`editor.publish` / `editor.addToKb`），复用 EditorPanel 内部 `handlePublish` / `openKbMenu`（经 `EditorCommandBridge` 命令桥触达），保证低频操作仍可达、顶栏只留高频视图切换。此外，**右键点击标签栏任一标签**，弹出菜单亦含「发布为博客」「加入知识库」两项（传入该标签对应 `fileId`，可作用于非激活文件），作为 ⌘K 之外的右键入口。

## 3. 编辑区布局（v7 · 边缘悬停召唤面板 · 2026-08-31）

`.aurora-editor__layout` 为 `flex row`，三个子区：**左缘 hoverzone（7px）** + **主编辑区（flex:1）** + **右缘 hoverzone（7px）**。两侧栏默认隐藏，**进入即纯编辑区（进入即写）**；顶栏无文件/大纲切换按钮、无活动栏。

- **边缘悬停滑入**：鼠标靠到编辑区左/右缘，对应 hoverzone 的 `.aurora-editor__edge` 感应条亮起、浮层 `.aurora-editor__overlay`（264px）从缘侧滑入并覆盖于编辑区之上（**不挤压编辑区重排**）；鼠标移出浮层即收起。
- **图钉常驻**：浮层头部「图钉 `pin`」按钮将面板钉成常驻浮层（`.is-pinned`，缘侧留发丝 accent 指示线）；再点取消钉住。
- **FileTree（左浮层）**：由左缘 hover / `⌘B` 召唤；浮层自带 head（标题「文件」+ pin + 收起），故 FileTree 自带顶部条经 `hideTopbar` 隐藏。数据来自真实 `FileStore`，在浮层内自适应铺满（264px）。
- **RightSidebar（Inspector，右浮层）**：由右缘 hover / `⌘⇧O` 召唤（`activeTab="outline"` + `forceExpand` 恒展开）；4 Tab 见 §4。
- 主编辑区：真实 `EditorLayout`（D8 换芯），四种渲染：源码（带行号）/ 预览 / 所见即所得 / 分屏（源码 + 预览，含分隔条）。

> 范式重构 A（48px 活动栏 `ActivityBar`）已于 2026-08-31 退役删除：根因是缘侧/顶栏按钮过多、不工整、变扭；v7 以「边缘悬停 + 图钉」取代，符合 macOS HIG 侧栏可折叠范式（侧栏显隐不往顶栏塞按钮）。

> 旧「两行工具栏（EditorFormatToolbar）」已退役：格式栏由 `TiptapEditor` 自带 + 日记 `DiaryFormatToolbar` 承担，编辑器顶栏仅保留 `EditorToolbar`（多文件标签栏 + 视图分段控件）。

## 4. 右 Inspector（5 个 Tab）

`大纲 / 反链 / 脚注 / 写作助手 / 洞察`：
- 大纲：11 条 mock 大纲项（可折叠）。
- 反链：3 条；脚注：3 条。
- 写作助手：大纲 6 / 润色 2 / 关键词 6（含 应用/复制、重新分析 `refresh`）。
- 洞察：3 条提示。

> ⚠️ 规范未含"评论""属性" Tab（已明确排除）；`.aurora-properties__*` CSS 为死代码，无组件渲染。

## 5. 浮层

- **FloatingToolbar**：选区绑定；工具 `B I U S | H " </> | 🔗`。⚠️ 工具为文字标签而非图标组件；链接用裸 emoji `🔗`。
- **SlashCommandPopup**：14 条命令 / 3 组。⚠️ 图标为裸 emoji/unicode（`📊🧠∑🔖▦─</>📚🔗↩📄📅🔙`），绕过图标系统；且 `slashVisible` 默认 `false`、**无任何控件将其置 true** → 当前不可达，仅 `GoToLine`（⌘G）可达。
- **GoToLineDialog**：文本输入 + `取消`/`跳转`（校验 1..总行数）。

## 6. 键盘

`⌘/Ctrl+G` 打开 GoToLine；`⌘/Ctrl+B` 切换文件树浮层（pin 切换显隐）；`⌘/Ctrl+⇧+O` 切换 Inspector（检查器）浮层。选区通过 `window.getSelection` 获取（真实内核）。

## 7. 图标 / 动效 / 字号

- 图标来自 `icons.tsx`（`chevron/code/eye/split/bold/italic/strike/link/check/layers/search/filePlus/folderPlus/clock/shield/refresh/alert` 等）。✅ `SlashCommandPopup` 已统一至 Icon 集（2026-08-26）；⚠️ `FloatingToolbar` 仍用 emoji（链接🔗等），为 P2 待清理项。
- 动效：光标闪烁 1s、浮层 `float-in`、文件树宽度过渡。
- 字号当前**硬编码 px**（mode-btn 13 / source 14/22 / preview 15/28 / outline 12 / inspector 11 等），未统一到 `--mc-font-*`。

## 8. 未实现 / 范围外（本面板）

- **无禅模式/专注模式触发**：`.aurora-editor--zen` CSS 存在但从未应用（幻影）。
- 无分享 / 导出按钮；无主题切换 / 最大化 / 设置齿轮；无撤销重做；无工具栏内搜索替换。
- "已保存"为静态文案，无手动保存按钮；斜杠补全不可达（见 §5）；Inspector 缺"评论/属性"Tab。
