# 05 · 白板（Canvas / Whiteboard）面板规范

> 对应 `panels/canvas/CanvasPanel.tsx` 及其子组件。视图/侧栏/Inspector/弹层细则见 `19/20/21`。数据全部 mock。

## 1. 外壳与状态栏

`PageFrame`（`CanvasPanel.tsx`）：
- `breadcrumbs`：`['白板', canvasName]`；P1-4 起为无文档型面板，**不传 `savedState`**（白板走自身 autosave 引擎，状态栏不再显示伪「已保存」）
- 状态栏内容（规划）：左 `${elements.length} 个元素`；右 `${zoom}%` + 可点击 `⌘K 命令面板`（待接入）

## 2. DOM 结构

`.aurora-canvas > [CanvasTopbar, .aurora-canvas__row > (.aurora-canvas__hoverzone--left, .aurora-canvas__main, .aurora-canvas__hoverzone--right)]`（row 为水平 flex：左缘 hoverzone | 主内容 | 右缘 hoverzone）。左右栏**不占 in-flow 宽度**：常态仅 7px 边缘感应条（`.aurora-canvas__edge`），鼠标靠边即滑入 280px 浮层（`.aurora-canvas__overlay`，绝对定位覆盖画布之上，不挤压主区重排），与编辑器侧栏交互一致。CanvasTopbar 居中渲染 4 视图的 macOS 分段控件（`.aurora-ctop__switcher`：轨道 recessed `bg-pressed` + 激活项 raised `bg-elevated`+inset 阴影，非 accent 着色）。顶栏高度接密度体系（P1-6）：基准 46px，`[data-density='compact']` 42px（与 blog 子栏一致）；分段项行高 `var(--mc-inspector-tab-h)`。

## 3. 左面板（默认边缘收起，hover 召唤）

- 常态：左缘 7px 感应条（`.aurora-canvas__hoverzone--left` + `.aurora-canvas__edge--left`），鼠标靠边即滑入 280px 浮层（`.aurora-canvas__overlay--left`，`CanvasSidebarPanel` 承载）。
- 浮层头部含「浏览」标题 + 图钉（钉住常驻 `.aurora-canvas__pin.is-on`）+ 收起（`.aurora-canvas__overlay-close`，`chevronLeft`）；未钉住时鼠标移出浮层即自动收起。
- 钉住态在缘侧留 accent 发丝指示线（`.aurora-canvas__hoverzone.is-pinned .aurora-canvas__edge--left`）。
- 默认 `leftHover/leftPinned = false` → 左面板默认收起，不占画布宽度。

## 4. 画布区与缩放

- `.aurora-freewrap` 包裹 `CanvasFreeView`，`onContextMenu` 打开右键菜单。
- 缩放控件 **唯一入口**为右下角 `.aurora-zoom-controls`（`minus` / `{zoom}%` / `plus` / `frame` 适应 / `target` 缩放到选中）。Dock 底部条不再内置缩放簇（已移除，避免与右下角控件重复）。

## 4.1 空态引导与首启锁定

- 仅当 `view==='canvas'` 且「白板整体为空」（自由画布场景无任何未删除图元 **且** 卡片体系 `getCurrentPageShapes()` 也为空）时，居中显示「空白画布」引导卡（`.aurora-canvas__empty`）。
- 引导卡含两个入口按钮：**新建便签**（`addQuickNote`，落点对齐视口左上，创建自由 note-card）+ **文件便签**（钉住并展开左栏、直接打开到「文件」Tab）；卡片底部靠右另有弱强调文字按钮 **跳过，直接开始**（`.aurora-canvas__empty-skip`，`setGuideSkipped(true)`）。
- **首启锁定**（`locked = isCanvasEmpty && !guideSkipped`）：白板整体为空且未跳过时，底部 Dock（`.aurora-dock`）隐藏；左右栏边缘 hover 感应条（`aurora-canvas__hoverzone` 的 `onMouseEnter`）不响应、感应条本身不渲染；顶栏「思维导图 / 看板 / 时间轴」Tab（`aurora-ctop__view--disabled`，`disabled`+`pointer-events:none`）不可点击，仅「画布」Tab 可交互。文件便签按钮是锁定态下唯一 sanctioned 的展开左栏入口（直接钉住到文件列表）。
- 解除锁定的两种路径：① 白板出现任一内容（新建便签 / 拖入或生成的文件便签 / 任意结构化视图节点）→ `isCanvasEmpty` 转 false；② 用户点 **跳过，直接开始** → `guideSkipped` 转 true。两者任一即解除锁定：Dock 出现、hover 召唤恢复、结构化视图可切换。

## 5. Dock 工具条

`.aurora-dock`（底部居中浮层，实心 `bg-elevated`、非玻璃、圆角 `radius-md`）：分组为 `撤销/重做` | `工具组`（选择/拖拽/画笔/橡皮/矩形/椭圆/箭头/文本/便签/标签 共 10 项）| `同步` | `更多▾`。`更多` 弹出菜单含进阶工具（直线/框/图片）、网格吸附、自动布局、自动同步、卡片模板存取。**缩放簇已移除**，缩放统一由右下角 `.aurora-zoom-controls` 承担。

## 6. 右 Inspector（默认折叠）

右栏渲染 `CanvasInspectorPanel`（`.aurora-csp`/`.aurora-cip`）：属性（选中卡片文本/颜色）+ 图层列表，经真实引擎读写。**与左栏完全对称**：右缘 7px 感应条 hover 滑入 280px 浮层（`.aurora-canvas__overlay--right`），头部「检视」标题 + 收起（`.aurora-canvas__overlay-close`，`chevronRight`）+ 图钉；钉住态留右缘 accent 发丝线。默认收起，不占画布宽度。

## 7. 弹层

`CommandPalette` / `CanvasContextMenu` / `CanvasListMenu`（细则见 `21`）。

## 8. 键盘

`⌘/Ctrl+K` 开命令面板；`Delete/Backspace` 删除选中；`Esc` 清 pending + 复位工具 + 关菜单。

## 9. 图标 / 动效

- 图标全部走 `Icon.*`，无裸 emoji（连线 `<svg>` 为功能性，不在此限）。⚠️ 已知：`alignRight` 在 `icons.tsx` 不存在，导致右对齐误用 `alignCenterV`（`CanvasContextMenu`/`CommandPalette`/`CanvasInspector`）；`diamond` 映射到 `target`；`KanbanView` 评论数误用 `Icon.edit`。
- 动效：顶栏视图为 macOS 分段控件（激活项 raised 段，无滑动 indicator）；少量 keyframes + 大量 hover 过渡；便签背景 `color-mix`。

## 10. 未实现 / 范围外（本面板）

- 收藏初值与实际元素 id 不匹配 → 进入时收藏 Tab 为空态；大纲 pin/文件链接图标永不出现；`visible/locked` 未传入视图（隐藏/锁定仅改图标）；筛选 Tab 不参与画布过滤；属性面板字号/旋转/对齐多数无 handler；右键菜单大多数动作为 `toast` 桩；命令面板约 35/44 条命令指向错误占位（如"放大"→export）；顶栏 演示/导出/模板 与 Dock「更多」仅 toast；无撤销/重做栈、无网格开关/背景设置/组合/多选/resize/旋转；死 CSS `.aurora-view-switcher/--view-toolbar/--view-wrap`。

## 11. 子视图（canvas-v2）§18 对齐

3 个结构化子视图（思维导图 / 看板 / 时间轴，实现于 `features/canvas-v2/components/views/*`；令牌 `features/canvas-v2/theme/canvasTheme.ts`）已与 §18 桌面原生基线对齐，使 4 视图视觉一致（自由画布 + 3 子视图）：

> **2026-09-17 更新（2.5-A）**：`features/canvas-v2/components/canvas.css`（294 行）已作为**孤儿文件**删除 —— 零 `import`；19 个 `.cv-*` 类零 DOM 消费者（引擎迁移 tldraw→Excalidraw 后改走「内联 style + `var(--cv-*)`」，class 驱动体系整体退役）；`.tl-*` 令牌覆盖随 tldraw 退役失效。
>
> ⚠️ **连带发现（独立决策项，不在本次清剿内）**：本节所记的令牌对齐，其注入选择器在 `canvasTheme.ts` 中是 `.tl-container, .canvas-v2-root` —— **两者均无 DOM**（tldraw 已退役；`.canvas-v2-root` 全仓零消费者）⇒ 该注入**从未生效**。故 `--cv-toolbar-bg` / `--cv-drawer-bg` / `--cv-radius-*` / `--cv-card-shadow*` / `--cv-elev-*` / `--cv-space-*` / `--cv-topbar-h` 等约 25 个变量**全程未定义**，而 `OverlayCards.tsx` 等 8 个文件正以**无 fallback** 的 `var(--cv-*)` 消费它们。实际生效的只有 `styles/base.css:44-68 / 138-162` 定义的那 11 个（`--cv-bg` / `--cv-card-bg` / `--cv-text-*` / `--cv-accent` / `--cv-border` …）。修复需把注入选择器改为 `:root` —— **会改变白板浮层的实际观感**，故单列待决。

- **实心非玻璃**：`--cv-toolbar-bg` / `--cv-drawer-bg` 改为实心 `#171A21`（暗）/`#FFFFFF`（亮）；移除 `--cv-glass-*` 与 `.cv-glass` 玻璃基座；所有 `backdrop-filter` 已去除（tldraw `.tl-toolbar`、`.cv-topbar-group`、`.cv-rail`、`.cv-floating-panel`、AutoLayoutPanel 浮层）。
- **单一 accent**：`--cv-accent` 收敛为 `#7C8CFF`（原 `#818CF8`/`#6366F1`）；tldraw `--color-accent`/`--color-selected` → `#7C8CFF`；移除 `--cv-accent-gradient` 紫辉光；选中态统一用 accent 描边，无紫辉光。
- **圆角 4/8/12**：`--cv-radius-{sm,md,lg,xl}` = `4/8/12/12`；卡片/选中框/标签 chip 的硬编码 `14`/`16`/`999(pill)` 已收敛到 `8`/`12`。
- **去 emoji**：`MindMapView` 🧠→`CanvasIcon.mindmap`、`TimelineView` ⏱→`CanvasIcon.timeline`；卡片色带 `CARD_COLORS_V2` 渐变 `to` 收为与 `from` 同色（扁平）。
- **扁平**：`--cv-card-shadow*` 与 `--cv-elev-*` 归 `none`，选中态改用 `0 0 0 1px` accent 描边。

- **仪表盘子视图已删除（2026-09-01）**：`DashboardView.tsx`、`statsCalculator.ts`、`types.ts` 的 `DashboardStats` 一并移除；顶栏分段控件（`CanvasTopbar`）与命令面板（`CanvasCommandPalette`）的「仪表盘」入口同步移除，白板现余 4 个视图（自由画布 + 思维导图/看板/时间轴）。

- **子视图浮层呈现（2026-09-01，修订）**：进入思维导图/看板/时间轴后，画布不再被整体替换——`ExcalidrawCanvas` 始终作为底层背景挂载，`RealCanvasView` 以浮层叠在其上：`.aurora-canvas__subview-scrim`（**透明**命中层，仅承接点击关闭）包裹 `.aurora-canvas__subview-panel`（**透明**面板，`inset:16px`、圆角 `lg`、发丝边、无阴影），故**背景即画布本身**（画布直接透出，非独立色块）；顶部栏分段控件与左右栏保留，底部 dock 与缩放控件仅在自由画布视图显示；3 个子视图根容器 `position:absolute; inset:0` 容纳于内容区；底层画布在子视图激活时 `pointer-events:none` 仅作背景。退出方式：**点击背景遮罩** 或 **顶栏分段控件切回「画布」**（画布状态常驻、瞬时切换）；子视图右上角「关闭」按钮已移除（2026-09-01）。
