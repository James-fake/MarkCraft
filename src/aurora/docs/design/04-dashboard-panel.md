# 04 · 仪表盘（Dashboard）规范

> 对应 `panels/dashboard/DashboardPanel.tsx` + `styles/panels/dashboard.css`。数据 100% mock，无 store 接入。

## 1. 布局结构

`PageFrame`（侧栏 active=`仪表盘`，状态栏右：`数据更新于 10 分钟前`）。主内容：页头（标题 `仪表盘` + 副标题）→ 12 列 Bento 网格，3 个固定行（KPI / 主图 / 指标）。

## 2. 区块清单

- **KPI 行（4 卡）**：`file/总字数`、`spark/连续写作`、`book/笔记总数`、`tag/标签数`。可点击 → toast。
- **写作趋势**：30 根 mock 柱状条（随机）+ "今日"高亮。
- **标签分布**：8 条标签条（`#工作…#项目`）。
- **最近活动**：6 行时间线（`dangerouslySetInnerHTML` 渲染）。
- **写作习惯**：12×7=84 热力图单元格，4 级强度。

## 3. 交互

- KPI 卡点击 → toast。
- 写作趋势表头 `月 ▾` 为**装饰文字，无处理器**；标签分布 `全部 →`、最近活动 `查看全部 →` 为文字链接 → toast。
- 热力图单元格仅 hover 态，无真实 `<button>/<select>` 逻辑。

## 4. 图标 / 动效 / 字号

- 图标全部来自 `icons.tsx`（`file/spark/book/tag/chart/calendar`）。无 emoji、无内联 svg。
- 动效：柱状条 `height` 300ms 弹性过渡；标签条填充宽度过渡；热力图 hover 背景。无入场动画。
- 字号当前**硬编码 px**（title 16 / subtitle 12 / KPI value 28 / change 12 / xaxis 10 / tag 12 / timeline 11-12 等），未统一到 `--mc-font-*`。

## 5. 未实现 / 范围外（本面板）

- 无功能性时间范围控件（`月 ▾` 为 inert）；无设置/筛选/导出/搜索/Tab/添加组件。
- 无主题切换；除 toast/点击外卡片无深层交互；无数据源选择器或刷新按钮（状态栏"更新于 10 分钟前"为静态）。
