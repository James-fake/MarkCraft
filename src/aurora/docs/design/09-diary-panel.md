# 09 · 日记（Diary）规范

> 对应 `panels/diary/*` + `styles/panels/diary.css`。
> 数据全部接入真实 `src/features/*`（`collectDiaryEntries` / `moods` / `updateFileContent` / `onThisDay` / `findOrCreateDailyFolder` / `makeExcerpt` / `countWords`），无 mock。

## 1. 两栏时间线流（B 方向定稿）

- **左栏（整屏编辑器）`.dv2-editor-col`**：
  - 顶部**水平日期头**：`今天` accent 小标 + `M月D日 周X` + `· Y` + 右侧「记录心情」按钮（非今天时显示「回到今天」）。
  - 下方**合并块** `.dv2-editor-block`：轻量格式栏 `.dv-format-bar`（DiaryFormatToolbar，内联 SVG 图标，**栏内水平居中**）+ 真实 `TiptapEditor` + 极简底部状态行 `.dv2-editor-foot`（**最左字数统计** `{liveWords} 字`（切换日期同步当前条目 `words`、编辑中由 `onEditorChange` 经 `countWords(md)` 实时更新）+ 右侧**保存状态指示** `.dv2-save`：圆点 + 文案。**状态语义（2026-08-31）**：`save.status: 'saved' | 'error'`；`saved` → 圆点 `var(--mc-success)` 绿色、文案「已保存 HH:MM」；`error` → 圆点 `var(--mc-danger)` 红色、文案「未保存」。`onEditorChange` 用 try/catch 包裹 `writeDiary`，成功置 `saved`、抛错置 `error`（数据层 `updateFileContent`/`createFile` 为同步 `setState` 不抛错，`error` 为安全网）。草稿态附「开始写…」提示）。切换日记以 `key={focusDate}` 重挂载，内容/cursor 不串台。**单一格式栏铁律**：`DiaryPanel` 挂载 `TiptapEditor` 时传 `showToolbar={false}` + `showStatusBar={false}`，关闭 Tiptap 内置的 `WysiwygToolbar` 与状态栏，日记界面只保留自身 `DiaryFormatToolbar` 这一个格式栏，杜绝双工具栏冲突、也避免内置栏沿用旧编辑器视觉。**底部三按钮已移除（2026-08-31）**：原底部「情绪 / 打开 / 删除」按钮与删除确认弹层（`deleteNode`）已删，编辑区下方不再有操作按钮；记录心情改由日期头「记录心情」按钮承载，删除日记请走文件管理器。
  - **进入即编辑态（无空态 CTA）**：当日/该日无日记时不再显示「写这篇日记」空态按钮，左列直接挂载空白 `TiptapEditor`，用户落键即写。首次输入经 `writeDiary(date, md)` 直接 `createFile(日记夹, YYYY-MM-DD.md, md, openAfterCreate=false)` 落盘（**不走模板、不切走当前文件**），后续输入写回同一文件；store 刷新后 `fileId` 翻转时 `useTiptapContentSync` 对「值未变」跳过重置，cursor 不跳。草稿块 `.dv2-editor-block--draft` 用虚线边框区分，底部显示「开始写今天的第一篇日记 / 该日还没有日记」提示。
- **右栏（常驻侧栏）`.dv2-side-col`**（宽度 320px，垂直堆叠）：
  - **常驻 mini 月历** `DiaryMiniCalendar`：**字数热力图**（accent 透明度 5 档 `is-heat-1`~`is-heat-5`，字数越多格越深；`heatLevel()` 阈值 150/400/800/1500 字），今天=accent 描边、选中=实色；底部含「少→多」图例；‹/› 切换月份；hover 某日→回调父级弹浮窗，click→`setFocusDate` 载入左列编辑器。
  - **悬停浮窗** `.dv2-popover-wrap`（在流内，展开时把「那年今日 / 每日一问」平滑顶下 0.26s，移开回弹）：显示当日 日期·心情色点·字数·2 行摘要 + 「查看 →」；空日→「写这篇 →」。
  - **那年今日** `.dv2-otd`：复用 `onThisDay`，显示同年月日历史日记 excerpt + 「查看 →」。
  - **每日一问** `.dv2-daily-q`：`.dv-daily-q__text` = `DAILY_PROMPTS[promptIdx]`，「换一个」按钮（`pickPromptIdx` + localStorage 记忆）。
- **模态**（保留真实交互，`createPortal`）：心情选择器（22 种心情 / 3 类，语义色，非 emoji）。（删除确认弹层已于 2026-08-31 随底部「删除」按钮移除而退役，删除日记改走文件管理器。）

## 2. 默认状态

`focusDate` = 今天（若今天有日记）否则最新一条；`hoveredDate=null`；`moodOpen/confirmOpen=false`。

## 3. 图标 / 动效

- 图标统一走 `src/aurora/icons.tsx`（lucide 式线性描边）+ DiaryFormatToolbar 内联 SVG；**禁 emoji 作 UI 图标**。心情用语义色点（`--mc-success`/`--mc-danger`/`--mc-warning`，去紫），不用彩色 emoji 渲染页面 chrome。
- 浮窗/侧栏过渡：`max-height 0.26s ease` + `opacity`；tile/hover 用 `background/color 0.12–0.15s`。

## 4. 纪律（§18 桌面原生基线）

- 扁平暗色（`--mc-bg-elevated`/`content`）、发丝分隔（`--mc-border-subtle`）、圆角 4/8/12；唯一 accent `#7C8CFF` 仅收口于 浮窗描边 / 每日一问入口 / 今天描边 / 选中。
- 无玻璃、无渐变、无紫辉光、无假 affordance（统计项若可点必真跳转）。

## 5. 未实现 / 范围外（本面板）

- 旧「3D 滚轮 / 弹层月历 / 情绪环形图 / 全年热力图 / KPI 条 / 本月复盘弹层」已退役（2026-08-31，B 重设计）；其真实数据接入保留。
- 多 entry/日：当前数据模型为「每日一篇」（`collectDiaryEntries` 按日期去重），时间线流按此渲染。
