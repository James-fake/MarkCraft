# Markcraft · Aurora UI 审计看板（合并版 · 待落板）

> **状态**：Ardot 连接器本轮回合中再度断开（`MCP error -32000: Connection closed`），画布合并暂无法执行。
> **用法**：v3 看板（全站审计 §一–§十一，`https://ardot.tencent.com/file/720198516368158`）保留不动；本文件为**合并落板增量**——补齐 §十一 行 4–8，并追加弹窗弹层专项 §十二–§十七。Ardot 重连后，按本文件原样落板即可（行卡片沿用 v3 §十一 样式：frame + 彩色 Dot + 文本，bg `rgb(23,26,33)` / 描边 `rgb(42,46,56)` / 圆角 4 / 文本 `rgb(156,163,174)` / 12.5px / 行高 18）。

---

## §十一 按钮位置（补全行 4–8，行 1–3 已在画布）

- 🔴 **假 affordance（点了没去向）**：知识库概览 5 个 KPI 整块 `onClick=toast('查看 X')`（`KbPanel.tsx:159`）；日记「今日心情」KPI 可点(644)而其余 KPI 不可点——同一条 KPI 带可点性还不统一。建议：统计项默认不可点，要导航则整条统一真跳转，否则去掉指针态。
- 🔴 **同一动作多入口分散**：日记「记录心情」有 3 个入口——KPI 项(644)、编辑器工具栏「情绪」(699)、情绪分布区(492-515)；知识库「查看完整图谱」嵌在卡片标题右侧(246)。建议：每动作单一主入口，其余去重/降级。
- 🔴 **博客工作室「可甩动」浮动面板 + 六色彩 Tab**：功能面板是拖拽浮层、抓表头甩动切贴边（`BlogPanel.tsx:1017-1040`）无固定停靠位；6 个 Tab 各一硬编码强调色(49-56)——彩虹标签栏（SaaS tell）。建议：面板改可停靠固定侧栏(左/右)，Tab 统一单一 `--mc-accent`，参考设置页 Tab 结构。
- 🟠 **占位按钮摆设、动作无实义**：博客子栏「打开」(`BlogPanel.tsx:1013`)仅 `toast('在新标签打开预览')`、与设备切换并排却无真实行为；知识库来源提示条「查看全部笔记」浮在顶部(974-977)。建议：占位按钮接通真实行为或移除，不摆设。
- 🟢 **参照范本**：设置页(`SettingsPanel.tsx:115-157`)顶部 Tab 子栏 + 内容区 + 头部搜索框，动作位置稳定可预期——这是全站应统一采用的「动作编排语法」。

---

## §十二 弹窗弹层专项 · 架构风险（原弹窗看板 §一）

- **外壳手写玻璃栈**：`src/aurora/components/ui/Modal.tsx`、命令面板、白板浮层，自写 `div + backdrop-filter:blur + --mc-accent-glow`，吃 `tokens.css` 玻璃 token。
- **`dv-*` 旧命名栈**：`src/aurora/panels/diary/DiaryPanel.tsx` 与 `DiaryCalendar.tsx` 的 5 个 `dv-overlay/dv-modal`，DiaryViewer 遗留下来的旧皮，最像「点完按钮弹出旧界面」。
- **真实库栈**：`src/components/ui` 的 Modal/Popover/Toast/Confirm，由 `RealProviders` 挂载。
- **根因**：一次 restyle 改的是看得见的外壳，三套叠层各自为政，临时浮层最易被漏。

---

## §十三 弹窗弹层专项 · 三套栈对照（原 §二）

- **Aurora 手写玻璃栈** → `Modal.tsx` / `command-palette.css` / canvas 浮层 → 自写 `blur` + 紫辉光。
- **`dv-*` 旧命名栈** → `DiaryPanel` / `DiaryCalendar` → DiaryViewer 旧皮（restyle 前）。
- **真实库栈** → `src/components/ui` → `RealProviders` 挂载（唯一该保留的栈）。

---

## §十四 弹窗弹层专项 · 逐类审查清单（原 §三，13 项）

- **Modal** — `src/aurora/components/ui/Modal.tsx`（遮罩 `blur(4px)`，header/body/footer 三段，Esc 关闭）。
- **Confirm** — `src/aurora/app/ConfirmProvider.tsx`（基于 Aurora Modal，`danger` 变体）。
- **CommandPalette** — `src/aurora/styles/command-palette.css`（遮罩 `blur(8px)`、面板 `blur(40px) saturate(120%)`、`0 0 0 1px rgba(124,140,255,0.1)` 紫辉光、`border-radius:12px`——AI-slop 最重）。
- **CanvasCommandPalette** — `src/aurora/panels/canvas/CanvasCommandPalette.tsx`（`canvas.css:2075` `.aurora-cmdk blur(28px)`）。
- **CanvasContextMenu** — `src/aurora/panels/canvas/CanvasContextMenu.tsx`（`canvas.css:215-220 blur(36px)`）。
- **CanvasDock** — `src/aurora/panels/canvas/CanvasDock.tsx`（L300/355/392/404 多菜单）。
- **CanvasListMenu** — `src/aurora/panels/canvas/CanvasListMenu.tsx`（L150/207 `linear-gradient(135deg,#7C8CFF,#A78BFA)` 紫渐变封面、L244 portal）。
- **FileTree** — `src/aurora/panels/editor/FileTree.tsx`（L508/532 ctxmenu + 删除确认）。
- **AuroraOutline** — `src/aurora/panels/editor/AuroraOutline.tsx`（L311 ctxmenu）。
- **Diary `dv-*` ×4** — `DiaryPanel.tsx`（L745/787/819/848 四个 `dv-overlay`：心情选择 / 删除确认 / 那年今日 / 月度复盘）。
- **DiaryCalendar** — `DiaryCalendar.tsx`（L163 `dv-cal-modal`，由 L558 📅 emoji 按钮触发）。
- **Toast** — `src/components/ui` Toast（`RealProviders` 挂载，吃玻璃 token）。
- **Inspector + Tooltip** — `components.css` 残留死 CSS `.aurora-tooltip` / `.aurora-dropdown`（L69/73 按钮 `linear-gradient` + glow）。

---

## §十五 弹窗弹层专项 · 最高危旧界面（原 §四，P0 六项）

- **① `DiaryPanel.tsx`** — 4 个 `dv-*` 弹层（心情选择 / 删除确认 / 那年今日 / 月度复盘）。
- **② `DiaryCalendar.tsx`** — `dv-cal-modal`，📅 emoji 按钮触发，旧皮最明显。
- **③ `styles/command-palette.css`** — 紫辉光 + 12px 圆角 + 玻璃，AI-slop 最重。
- **④ `CanvasListMenu.tsx`** — 紫渐变封面 `linear-gradient(135deg,#7C8CFF,#A78BFA)`。
- **⑤ `KbPanel.tsx`** — 手写 `.aurora-kb-modal-mask` 绕过 Modal 组件。
- **⑥ `styles/canvas.css`** — 重复实现 `.aurora-modal blur(28px)`，与 `Modal.tsx` 两套代码。

---

## §十六 弹窗弹层专项 · 桌面原生修复原则（原 §五，7 条）

- **去玻璃**：`backdrop-filter:blur` 一律改实色遮罩 / 面板。
- **去紫辉光**：移除所有 `--mc-accent-glow` 外发光。
- **去渐变 / 去胶囊 / 去 emoji**。
- **圆角压回 4–6px** 桌面范围。
- **发丝分隔 + 实色 hover**，取消悬浮抬升。
- **叠层收口**：所有弹窗 / 确认 / 命令面板 / 右键菜单 / 浮层统一进一套真实库组件，不再分散手写。
- **emoji 控件改为图标 / 文字按钮**。

---

## §十七 弹窗弹层专项 · 优先级（原 §六）

- **P0**：`DiaryPanel dv-* 4 弹层` / `DiaryCalendar` / `command-palette` / `CanvasListMenu` / `KbPanel` 手写模态 / `canvas.css` 重复 Modal。
- **P1**：`CanvasCommandPalette` / `CanvasContextMenu` / `CanvasDock` / `FileTree` / `AuroraOutline` 玻璃浮层去玻璃化。
- **P2**：`Toast` / `Inspector` / `Tooltip` 死 CSS 清理、emoji 改图标。
