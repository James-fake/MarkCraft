# 19 · 白板视图模式（Canvas V2 Views）规范

> 对应 `panels/canvas/views/*`。**4 个视图（1 自由 + 3 子视图）均为真实渲染组件，无 "coming soon" 占位**。

## 1. 自由视图（CanvasFreeView）
- 6 个初始元素（sticky/rect/circle/diamond）+ 3 条贝塞尔连线 SVG + 画笔 polyline。
- 交互：拖动 / 单击选中 / 双击 textarea 编辑 / 点击空白新建 / 两击连线。stage 1400×900 缩放。

## 2. 看板视图（KanbanView）
- 4 列 + 9 张卡片；HTML5 拖放换列；双击改标题；加/删卡；搜索 HUD；按 状态/标签/颜色 分组。

## 3. 脑图视图（MindMapView）
- 7 节点 + SVG 贝塞尔边；指针拖动；双击改名；加子节点/删子树；水平 / 放射（`computeRadial`）布局。

## 4. 时间线视图（TimelineView）
- 5 事件卡 + 刻度/轴/today 标记；水平 / 垂直 两套布局；粒度 年/月/周/日 改变长度与刻度；加/删/改事件。

## 5. 仪表视图（DashboardView）— 已删除（2026-09-01）
- 原「4 统计卡 + 柱状图 + 2 个 conic-gradient 环图 + 进度条 + 活动流 + 热力图」统计仪表盘子视图已整体删除（含 `DashboardView.tsx`、`statsCalculator.ts`、`DashboardStats` 类型）。白板子视图现仅剩 思维导图 / 看板 / 时间轴 3 个，由顶栏分段控件与命令面板切换。

## 6. 已知问题
- 3 个子视图的 `onClose` 均改名为 `_onClose` 且未使用。
- 无撤销/重做栈。
- `KanbanView` 评论数误用 `Icon.edit`。
