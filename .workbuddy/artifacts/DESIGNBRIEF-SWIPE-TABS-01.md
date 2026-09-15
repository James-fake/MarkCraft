# DesignBrief · 内容区左右滑动切换功能 Tab

> 版本 v1.0 · 2026-09-14 · 状态：待实施
> 范围：博客工作室 / 白板 / 知识库详情页 / 设置页 四个面板的**顶栏功能 Tab**
> 交付分级：P0（共享手势层 + 三面板接入）· P1（白板特例方案）· P2（润色与无障碍）

---

## 0. 需求原文与确认

> 「现在要求继续优化，现在优化的博客功能、白板功能、知识库详细页面、设置页面的顶栏的功能切换 tab，支持左右滑动，你懂我意思吗？」

经确认：

| 决策项 | 结论 |
| --- | --- |
| 交互形态 | **内容区滑动切 Tab**（跟手拖拽 + 松手吸附），**同时保留点击 tab 直接跳** |
| 覆盖范围 | **四个面板全部** |

---

## 1. 竞品与平台调研结论

| 来源 | 结论 | 采纳 |
| --- | --- | --- |
| SwiftUI `TabView` macOS 文档 | macOS 默认渲染为 **SegmentedControl**；`.page` 滑动风格「swipe gesture isn't as natural with a mouse」，**官方建议桌面不要强推 `.page`** | ✅ **滑动必须是可选增强，点击/键盘仍是主路径** |
| SwiftUI `TabView` 手势冲突提示 | `TabView(.page)` 嵌在滚动容器内 → **垂直滚动与水平翻页互相误触** | ✅ 需方向锁（方向判定后锁定轴） |
| slip.js（成熟滑动列表库） | 水平位移 > **20px** 才判定滑动；`minimumSwipeVelocity = 1 px/ms`；`minimumSwipeTime = 110ms` | ✅ 阈值基线 |
| Hammer.js | 内容浏览类建议 **提高阈值到 20–30px 减少误触**；`swipe.velocity = 0.3 px/ms` | ✅ 取 20px 起步 / 松手速度 0.3 px/ms |
| React Native Screen Transitions | `gestureResponseDistance` 像素阈值 + `gestureVelocityImpact` 0.3（速度权重）；`snapVelocityImpact` 0.1（更"刻意"更 iOS） | ✅ 速度权重取低值，避免鼠标小幅快甩误翻页 |
| Android 手势实践 | 距离阈值 100–200px / 速度阈值 100–300px/s；**方向过滤 `|dx| > |dy|` 才认水平** | ✅ 方向过滤必做 |

**核心洞察**：桌面端（鼠标/触控板）与移动端（手指）的手势语义差异很大。鼠标拖拽在桌面几乎只用于**选择文本/拖拽对象**，用在切 Tab 上属于「非典型」。因此本方案定为：

> **滑动是加速器，不是唯一入口。** 点击 tab、`⌘K`、键盘方向键全部保留，滑动只是「更顺手时可以用」。

---

## 2. 四面板现状差异（接入点尽调）

| 面板 | 文件 | Tab 容器 | 内容区容器 | 状态 | 特殊约束 |
| --- | --- | --- | --- | --- | --- |
| 博客工作室 | `panels/blog/BlogPanel.tsx` | `.aurora-blog__tabs`（3 组）+ `.aurora-blog__subseg`（组内次级） | `.aurora-blog__stage` | `activeGroup` + `panel` | **双层 tab 结构**；已有 `setPointerCapture` 拖拽表头范式（行 1218–1239） |
| 知识库详情 | `panels/kb/KbPanel.tsx` | `.aurora-kb-subbar-tabs`（7 tab） | `.aurora-kb-content` | `useState<KbTab>` | 内容层部分 tab 自带滚动容器（`aurora-kb-tabfill`） |
| 设置页 | `panels/settings/SettingsPanel.tsx` | `.aurora-settings__nav-tabs`（9 tab） | `.aurora-settings__content` | `activeCategory` | **9 个 tab 横向溢出**（需滚动），内容区垂直滚动长 |
| 白板 | `panels/canvas/CanvasSidebarPanel.tsx` | `.aurora-csp__tabs`（**在左侧浮层**） | `.aurora-csp__body`（窄面板） | `tab` | ⚠️ **Tab 不在顶栏、在主区左浮层；主区为 Excalidraw 全屏绘图面** |

**关键差异**：前三个面板的 Tab **本身就在横向排列的顶栏**里，滑动语义自然（左滑=下一个）。白板完全相反 —— Tab 在一列**竖排窄面板**里，横滑手势区（主区）属于 Excalidraw。

---

## 3. 交互规范

### 3.1 手势判定状态机

```
pointerdown
  │  记录 startX/startY, t0, 锁定 axis = 'undecided'
  ▼
pointermove
  │  dx = clientX - startX ; dy = clientY - startY
  │  若 axis === 'undecided':
  │     |dx| > 8 && |dx| > |dy| * 1.2  → axis = 'horizontal'（抢占，setPointerCapture）
  │     |dy| > 8 && |dy| > |dx| * 1.2  → axis = 'vertical'  → abort（放行原生滚动）
  │     |dx| < 8 && |dy| < 8           → 保持 undecided（消除点击抖动）
  │  若 axis === 'horizontal':
  │     若当前是首/末 tab 且方向越界 → 位移 × 0.28（橡胶阻尼）
  │     offset = clamp(dx, -W, +W)  → translateX
  ▼
pointerup / pointercancel
  │  velocity = dx / (t - t0)  (px/ms)
  │  passed = |dx| > W * 0.32 || (|velocity| > 0.3 && |dx| > 20)
  │  若 passed 且目标 tab 存在 → 切 tab + 吸附动画
  │  否则 → 回弹（吸附回原位）
```

### 3.2 参数表（冻结值）

| 参数 | 值 | 依据 |
| --- | --- | --- |
| `DIRECTION_SLOP` | `8px` | 与项目已有 `NODE_CLICK_SLOP = 4px` 同族；8px 适配鼠标抖动 |
| `DIRECTION_RATIO` | `1.2` | 参考 Android 方向过滤，偏保守避免误判 |
| `SNAP_PERCENT` | `0.32` | 约 1/3 屏宽；低于 iOS 的 0.5（鼠标拖拽行程短） |
| `FLICK_VELOCITY` | `0.3 px/ms` | Hammer.js / RN 双源一致 |
| `FLICK_MIN_DISTANCE` | `20px` | slip.js 阈值 |
| `EDGE_RESISTANCE` | `0.28` | 首末 tab 越界阻尼系数（仅视觉，不产生切换） |
| 拖拽期过渡 | `transition: none` | 跟手必须零延迟 |
| 吸附时长 | `var(--mc-dur-base)` = 280ms | 标准层 |
| 吸附曲线 | `var(--mc-ease-out)` | 进出场统一快出慢收 |
| 回弹时长 | `var(--mc-dur-fast)` = 180ms | 「出更快」——失败手势快速归位 |

### 3.3 与横向滚动内容的冲突处理

知识库「笔记」「依赖」「MOC」等 tab 内部可能有横向滚动条。规则：

> **指向可横向滚动的祖先节点时，不启动手势**。
> 判定：`pointerdown` 时沿 `event.target` 向上找最近的 `scrollWidth > clientWidth + 4` 且 `overflow-x` ∈ `{auto, scroll}` 的元素；命中则本手势直接放弃。

这与 RN Screen Transitions 的「Only activates at left/right scroll edges」同源，但实现更简单（整块让出）。

### 3.4 边界行为

- **首 tab 继续右滑 / 末 tab 继续左滑** → 橡胶阻尼跟随（×0.28），松手回弹，**不循环**（不做无限轮播，桌面语境易迷失）。
- 吸附失败时**不得**中途落到第三个 tab —— 一次手势最多移动 ±1 个 tab。

---

## 4. 面板接入方案

### 4.1 共享层（P0）

新建 `src/aurora/hooks/useSwipeTabs.ts`：

```ts
export type SwipeAxis = 'x' | 'y'

export interface UseSwipeTabsOptions {
  /** 当前索引（受控，与面板 tab 状态单源） */
  index: number
  /** 总数 */
  count: number
  /** 切换回调（面板自己 setState） */
  onIndexChange: (next: number) => void
  /** 手势主轴：x = 横滑（设置/知识库/博客），y = 纵滑（白板左栏 tab 行） */
  axis?: SwipeAxis            // default 'x'
  /** 是否启用（白板等处可按需关闭） */
  enabled?: boolean
  /** 触控板 wheel 路径开关（需面板确知自身可消费 deltaX 时才开） */
  wheel?: boolean             // default true
}

export interface UseSwipeTabsResult {
  /** 绑到内容区根节点（或白板的 tab 行容器） */
  bind: {
    onPointerDown: (e: React.PointerEvent) => void
    onWheel: (e: React.WheelEvent) => void
  }
  /** 拖拽偏移量（px），渲染层直接 write 到 style */
  offsetRef: React.RefObject<number>
  /** 当前是否在跟手（供 CSS 加 is-swiping 类） */
  dragging: boolean
}
```

**设计约束（对齐项目铁律）**：

1. **位移写入走 ref + 直接改 `style.transform`，不走 React state** —— 避免每帧 re-render（对齐 GraphPanel 的性能纪律）。
2. `pointerup` 落盘读值必须用 `offsetRef.current`，**不能读 state 闭包旧值**（项目已知坑：拖拽闭包陷阱）。
3. **不用 `setPointerCapture`** —— 项目铁律「指针捕获吞 click」：捕获到容器会让内部按钮全部收不到 click。**改为在 `document` 上注册 `pointermove`/`pointerup`**（拖拽开始注册、结束移除）。
4. 只处理主键：`if (e.button !== 0) return`。
5. 触摸设备用 `touch-action: pan-y`（x 轴模式）/ `pan-x`（y 轴模式）让浏览器代管正交轴滚动，避免 `preventDefault` 全禁。

### 4.2 接入点（逐面板）

| 面板 | 绑定容器 | index 映射 | 备注 |
| --- | --- | --- | --- |
| 设置 | `.aurora-settings__content` | `CATEGORIES.findIndex(c => c.id === activeCategory)` | 9 个 tab 数最多，收益最大 |
| 知识库 | `.aurora-kb-content` | `TABS.findIndex(t => t.id === tab)` | 需排除 `aurora-kb-tabfill` 内横滚 |
| 博客 | `.aurora-blog__stage` | **映射 `PANEL_GROUPS` 的组内 items**（次级 tab），组间不跨越 | 双层结构 → 只滑**当前组内**的子面板，跨组必须点 tab |
| 白板 | 见 §4.3 | — | 冲突，需特例 |

**博客为何只滑组内**：跨组会同时改变两个状态（group + panel），动画目标不唯一，且组间语义跳跃大（主题 ↔ 高级）。只滑组内 = 动画语义单一、可预测。

### 4.3 白板特例（P1 · 已拍板 D1 = 方案 A）

**冲突事实**：白板主区是 Excalidraw 绘图面。水平拖拽 = 画布平移（Space+拖 / 中键拖 / 触控板双指横滑），在此处劫持横滑**必然破坏绘图体验**。

**已采纳方案 A**：

| 项 | 实现 |
| --- | --- |
| 手势绑定 | `.aurora-csp__tabs`（左栏 **tab 行容器**，非 body 滚动区） |
| 手势轴 | **纵向**（`|dy| > |dx| * 1.2` 才认） |
| 主绘图区 | **零改动** —— Excalidraw 平移/绘制完全不受影响 |
| 为什么不用 body | body 是 `overflow-y: auto` 滚动容器，纵向劫持会破坏面板内滚动 → 绑到不滚动的 tab 行上 |
| 语义 | tab 竖排 → 上滑 = 下一个 tab，同轴自然 |

> 保留后续升级可能：若日后要主区横滑，以「浮层展开态」为门控叠加，不影响本方案。

### 4.4 `prefers-reduced-motion` 降级

| 状态 | 默认 | reduced-motion |
| --- | --- | --- |
| 跟手位移 | 直接跟随 | **保留**（跟手是用户主动操作，属"必要动效"） |
| 吸附动画 | 280ms `--mc-ease-out` | **120ms**（从容层减半，非归零） |
| 回弹动画 | 180ms | **90ms** |
| 目标面板内容切换 | 现有视图淡入 | 保持现有降级（`mc-rm-fade`） |

**铁律对齐**：项目定义「reduced-motion 是更少更柔非归零」，跟手位移不归零符合该原则。

---

## 5. 视觉反馈

拖拽中内容区跟随移动时，需要让用户感知「这是个可翻的页面」：

1. **内容区跟手位移**：`transform: translate3d(dx, 0, 0)`，仅 transform（可合成，不触发 layout）。
2. **相邻边缘露出**：位移超过 12px 后，当前内容区轻微降低不透明度（`1 → 0.96`，随位移线性），并在尾部显现相邻页痕迹。
   - 简化实现：内容区加 `box-shadow` 内侧阴影，随 `|dx|` 增大（0 → 8px），暗示"底下还有一页"。
3. **Tab 指示器联动**：拖拽过程中，顶栏 tab 的下划线/背景**按位移比例插值**移动到目标 tab（`progress = |dx| / W`）—— 让顶栏成为"进度条"。
4. **不新增任何新的动画类名** —— 复用 `tokens.css` 已有 `--mc-dur-*` / `--mc-ease-*`；指示器插值在 JS 中用 ref 写 `style.transform: translateX(px)`。

---

## 6. 验收标准（CDP 真机断言清单）

| # | 断言 | 方法 |
| --- | --- | --- |
| 1 | 横滑 1 屏 → tab 从 A 切到 B | `Input.dispatchMouseEvent` 序列（down → 多段 move → up），读 `aria-selected` |
| 2 | 横滑 < 32% 且慢速 → 回弹，tab 不变 | 同上，位移 120px@慢速 |
| 3 | 横滑 < 32% 但快速甩（> 0.3px/ms）→ 切换 | 位移 60px 但 100ms 内完成 |
| 4 | 首 tab 右滑 → 有位移但松手回弹，tab 不变 | 几何断言 + `aria-selected` 不变 |
| 5 | 纵向拖拽 → 不触发手势，页面正常滚动 | 断言 `scrollTop` 变化且 tab 不变 |
| 6 | 点击 tab → 仍然立即切换（点击路径未被劫持） | 断言 tab 内按钮 click 可达 |
| 7 | 内容区内的按钮 click 仍可达（无 pointer capture 吞事件） | 断言按钮 `onClick` 触发 |
| 8 | 横向滚动容器内拖拽 → 不触发切 tab | 知识库笔记 tab 内断言 |
| 9 | `prefers-reduced-motion` 下吸附时长减半 | 读 `getAnimations()[0].effect.getTiming().duration` |
| 10 | 跟手期间无 JS long task / 帧间隔 p95 < 20ms | PerformanceObserver + 帧采样 |

另配 **vitest 契约测试** `src/aurora/hooks/useSwipeTabs.test.ts`（纯逻辑层，不需要真机）：

- 方向判定：`dx=30,dy=2` → horizontal；`dx=2,dy=30` → vertical
- 阈值：`dx=20` 不动；`dx=21` 动
- 吸附：`dx = 0.4W` 且慢速 → 通过；`dx = 0.2W` 且慢速 → 回弹
- 甩掷：`dx = 0.2W` + 速度 0.5px/ms → 通过
- 边界：`index=0` 右滑 → `onIndexChange` 不被调用
- 单步约束：`dx = 1.6W` → 只移动 1 个 tab

---

## 7. 决策记录（2026-09-14 已拍板）

| # | 决策 | 结论 | 影响 |
| --- | --- | --- | --- |
| D1 | 白板面板的手势轴 | ✅ **A：左栏纵向滑动切 Tab** —— 手势绑在 `.aurora-csp__body`，上滑=下一个 tab；主绘图区零改动 | 白板手势轴为 **Y 轴**，其余三面板为 X 轴 → hook 需支持 axis 配置 |
| D2 | 博客是否允许跨组滑动 | 不允许，只滑组内次级 tab | 博客接入走 `activeGroup.items` 索引 |
| D3 | 首/末 tab 是否循环 | 不循环 | 越界阻尼 + 回弹 |
| D4 | 触控板双指横滑 | ✅ **支持** —— 鼠标拖拽 + 触控板 `wheel deltaX` **两条路径都做** | hook 需增 wheel 路径 + 节流锁 |

> **D4 实现要点**：触控板双指横滑产生 `wheel` 事件的 `deltaX`。桌面真正"左右滑动"的直觉来自这里，鼠标拖拽是少数派。
> - 累积 `deltaX`，同方向累加；`|acc| > WHEEL_SNAP_THRESHOLD (≈60px)` 触发切 tab。
> - **节流锁**：一次扫动只允许切一次 —— 切换后设 `cooldownUntil = now + 400ms` 并清空累积量，防止惯性滚动连跳多 tab。
> - 方向反转时**立即清空累积量**（动量反向不该累加）。
> - 需 `e.preventDefault()` 阻止触控板后撤导航（仅当本面板确实消费了该 deltaX 时）。
> - 停止 120ms 无新事件则视为一次扫动结束，清空累积量。

### D1 拍板后的白板最终形态（实施期修正）

⚠️ **尽调修正**：DesignBrief v1.0 曾描述白板 tab 为「竖排」，**实为误判**。
核实 `canvas.css:1185`：`.aurora-csp__tabs { display: flex; align-items: center; }`，
6 个 tab 是**横排**的（每个 tab 内部图标在文字上方竖排，但 tab 之间横向排列）。

修正后的方案（比原方案 A 更好）：

| 项 | 实现 |
| --- | --- |
| 手势绑定 | `.aurora-csp__tabs`（**横排 tab 行本身**） |
| 手势轴 | **`axis='x'`（横向）** —— 与另外三个面板完全一致，横排 tab → 横滑 |
| 主绘图区 | **零改动** —— Excalidraw 平移/绘制完全不受影响 |
| 位移目标 | `targetRef` 指向 `.aurora-csp__body`(内容区)，位移落在内容上而非 tab 行 |
| 为什么不绑 body | `.aurora-csp__body` 是 `overflow-y: auto` 滚动容器，但它是**内容区**；<br>手势绑到 tab 行可保证「用户明确意图切 tab」时才触发 |
| 排除 | tab 行在浮层内，浮层收起时不渲染 → 天然禁用 |

> 结论：白板不需要「纵向手势」这个特例，`axis='x'` 即可，**四面板手势轴统一**。

---

## 8. 实施顺序

| 阶段 | 内容 | 交付 |
| --- | --- | --- |
| P0-1 | 建 `useSwipeTabs` hook + 纯逻辑契约测试 | hook 单源 |
| P0-2 | 接入设置页（tab 最多，收益最大） | 截图验证 |
| P0-3 | 接入知识库详情页 | 截图验证 |
| P0-4 | 接入博客（组内次级） | 截图验证 |
| P1-1 | 白板方案（按 D1 决策） | 截图验证 |
| P1-2 | 触控板 `wheel deltaX` 路径 | CDP 验证 |
| P1-3 | Tab 指示器按位移插值联动 | 截图验证 |
| P2 | CDP 10 项断言 + 全量回归 + 提交 | 收口 |

**每阶段结束必须**：`tsc --noEmit` 干净 → 契约测试绿 → 全量 vitest 不回退（基线 906 passed / 3 failed / 2 skipped）→ CDP 截图。

---

## 9. 风险登记

| 风险 | 等级 | 缓解 |
| --- | --- | --- |
| 劫持鼠标拖拽导致文本无法选择 | HIGH | 仅在 `.aurora-*-content` 根节点绑定；`pointerdown` 若命中文档内容可编辑区则让出 |
| 白板绘图体验被破坏 | HIGH | 采用方案 A（Axis 走左栏），主绘图区零改动 |
| 拖拽期每帧 re-render 掉帧 | MEDIUM | ref + 直接写 style，不经 React state |
| jsdom 无法测指针捕获重定向 | MEDIUM | 逻辑全部抽到纯函数，真机交互走 CDP |
| 与面板内横滚容器冲突 | MEDIUM | `pointerdown` 时向上探测横滚祖先，命中即放弃 |
| 设置页 9 tab 横向溢出 | LOW | 切 tab 时可 `scrollIntoView({ block:'nearest', inline:'center' })` |

---

## 10. 与项目既有铁律的一致性核对

| 铁律 | 本方案 |
| --- | --- |
| 只动 transform/opacity | ✅ 位移只用 `transform`；暗示阴影用 `box-shadow`（可合成） |
| 永不用 scale(0) | ✅ 无 scale |
| 进出不对称「出更快」 | ✅ 吸附 280ms / 回弹 180ms |
| 外壳永不参与视图切换动画 | ✅ 只动**内容区**，MenuBar/Sidebar/StatusBar/顶栏 tab 行本身不动（指示器只做位移不透明度） |
| 100+/天 键盘交互零动画 | ✅ 滑动不改变键盘/点击路径 |
| token 单源 `tokens.css §11` | ✅ 全部引用 `--mc-dur-*` / `--mc-ease-*`，不新增裸值 |
| 新类必须同批交付 CSS | ✅ 拖拽态类名 `is-swiping` 与 CSS 同批 |
| 单一数据源 | ✅ hook 不持有 tab 状态，索引由面板传入 |

---

## 11. 修订记录 R3（2026-09-15）：主反馈改为「整排 tab 跟手」

### 11.1 用户第三次反馈与实测定位

> 「在 tab 栏本身内横滑的效果还是没有显示出来，我要的效果鼠标按住 tab 方框左或右可以滑动」

R2 已把手势挂到 tab 栏（**能识别**），但**视觉上等于没动** —— 这是本轮的关键认知：
**"手势识别" ≠ "用户看得见"**。探针 `artifacts/probe-swipe-drag-amplitude.mjs` 实测：

| 拖动 | 手势 | 内容层位移 | tab 方块位移 | 松手 |
| --- | --- | --- | --- | --- |
| 按住方块慢拖 150px | ✅ 识别 | 25.2px | **0.7px** | ❌ 不切换 |
| 快速甩 150px | ✅ 识别 | 25.2px | **0.7px** | ❌ 不切换 |
| 大幅拖 420px | ✅ 识别 | 25.2px | **2.0px** | ❌ 不切换 |

两个坏点都在**参数**（绑定无问题）：
1. 方块位移 = `--swipe-progress × 6px`，`progress = offset / 内容区宽(1358px)` → `0.11 × 6 = 0.7px`；
2. 松手阈值 = 内容区宽 × 32% = **435px** → 鼠标慢拖/快甩都够不到，**永远不切换**。

### 11.2 修订后的规范（覆盖 §3.2 参数表 / §5 视觉反馈）

| 项 | 旧（R2 及以前） | **新（R3 现行）** |
| --- | --- | --- |
| 位移承载者 | 内容层（≤18px 钳制） | **tab 栏内层轨道**（`__nav-track` / `__subseg-track` / `__tabs-track` / `__subbar-track`） |
| 位移映射 | `toVisualOffset` 钳 18px | `mapStripOffset(raw, slot)`：一个槽距内**严格 1:1**，越界增益 `0.18`，硬顶 `1.25 × 槽距` |
| 松手阈值 | `size × 32%`（内容区宽） | **半个槽距**（设置页 37.5px）→「拖过一半就切」 |
| `--swipe-progress` 归一化 | `offset / 内容区宽`（最大仅 ~0.3） | **`shift / 槽距`**（±1 = 满格）→ 边缘压暗真正可见 |
| 内容层位移 | 18px（主反馈） | 22px 钳制（硬顶 30.8 < 40px 内边距，首字不裁）→ **降级为呼应** |
| 博客位移目标 | `panelOpen ? 浮层内容体 : undefined` | **常驻轨道**（浮层收起时也看得见跟手） |
| 跟手期视觉 | 方块轻微跟随 | 轨道跟手 + 栏体 `overflow` 裁剪 + **两端 12/14px 渐隐遮罩**（否则方块硬切在边界上） |

**槽距取「平均」**（首末中心距 / (n-1)）：逐对相邻距会因方块宽 70/82 不等，导致**反向拖动时限幅突跳**。

### 11.3 与 §10 铁律的一致性（需显式说明）

§10 原写「外壳永不参与视图切换动画 …… 顶栏 tab 行本身不动」。**R3 让 tab 行跟手位移，属用户明确要求**（
经 AskUserQuestion 三选一确认「整排 tab 跟手滑」）。解释口径：
- 铁律约束的是**视图切换动画**（页面级淡入淡出 / 面板整体平移），防「整体闪一下」；
- R3 动的是**用户直接操作下的跟手反馈**（active gesture feedback）—— 手指按着才动，松手即归位（`--mc-dur-fast` 过渡），
  与工具栏按压 `scale(0.97)`、switch 拇指位移同属一类，不改变视图层的动画体系；
- 位移仍只走 `transform`，只引用 `tokens.css §11` token，**不新增裸值**。

### 11.4 验收标准补充（覆盖 §6 第 2/3 条）

| # | 断言 | 方法 |
| --- | --- | --- |
| R3-1 | 按住 tab 方块拖 150px → 轨道位移 **≥ 30px** | 跟手期读 `DOMMatrixReadOnly(getComputedStyle(track).transform).m41`；契约测试 `tabBarSwipeBinding` 同断言 |
| R3-2 | 内容层位移恒 **≤ 32px**（不得露出空白/裁首字） | 同上读内容层 |
| R3-3 | 松手后轨道的**内联** transform 必须被清空 | 否则会盖住 CSS 归位过渡 |
| R3-4 | 松手阈值 = 半个槽距（不再按容器宽） | `decideSnap({ thresholdPx })` 单测 + 真机 `通用→外观` |

### 11.5 实测结果（CDP@9444）

- 设置页：按住「用户/通用」方块拖 150px → 轨道 **-88.5px**（= 75 + 75×0.18，与映射公式吻合）、内容层 -30.8px、
  进度 -1、松手切换 ✅；小拖 60px → **-60px（严格 1:1）** ✅；反向右拖 → +88.5px ✅。
- 博客工作室：轨道 -48.5px ✅ 切换 ✅。
- ⚠️ **CDP 覆盖不到的两条**：白板左栏是 hover 打开的 overlay、知识库需先建库 → 空库时 tab 栏不渲染。
  这两条以 jsdom 集成测试兜底（真渲染 + 真 pointer 轨迹 + 轨道位移断言），**不作端到端结论**。

### 11.6 实现位置

- 纯逻辑：`hooks/swipeTabsCore.ts`（`mapStripOffset` / `averageSlot` / `decideSnap.thresholdPx` / `toVisualOffset(raw, clamp?)`）
- 扩展点：`hooks/useSwipeTabs.ts`（`visualMapper` / `snapThresholdPx`，向后兼容）
- 共享层：`hooks/tabStripSwipe.ts`（`measureTabCenters` / `createTabStripMotion`）
- 接入：`panels/{settings,kb,blog,canvas}/*` + `styles/panels/{settings,kb,blog,canvas}.css`
- 测试：`hooks/tabStripSwipe.test.ts`(22) / `styles/swipeTabBarSurface.test.ts`(44) / `panels/settings/tabBarSwipeBinding.test.tsx`(12)
- 提交：`bf70cf8`

---

## 12. 修订记录 R4（2026-09-15）：选中态「搬家」为独立滑块（Apple 分段控件）

### 12.1 用户第四次反馈（R3 被否）

> 「第一，内容区域。不要。滑动只有。功能tab栏中的功能tab进行滑动。你知不知道apple的产品？它的工具栏。是可以进行滑动的。
> 也就是说。摁住这个功能tab。就有一个显示一个方块的感觉，然后可以进行一个滑动。而且工具tab栏。也是不需要进行滚动的」

R3 让**整排 tab 一起跟手位移**，但用户要的是 **Apple 分段控件**：动的是那条**方块**，文字**不该动**。
R3 的方向（让位移"看得见"）是对的，**承载者**错了 —— 位移不该由文字承担。

### 12.2 定案形态（AskUserQuestion 用户答「对了」）

| # | 规格 | 说明 |
| --- | --- | --- |
| 1 | **常驻滑块（thumb）** 压在选中项上 | 不是"按住才浮起"，静止态就在 |
| 2 | 按住任一 tab 横拖 → **只有滑块跟手滑** | 1:1 跟手，可越界（橡胶阻尼） |
| 3 | **tab 文字一个像素都不动** | 文字不参与任何位移、内联样式不被写 |
| 4 | **内容区一个像素都不动** | 无位移、无 `is-swiping`、无 `--swipe-progress` |
| 5 | 松手滑块**过渡吸到最近 tab** | 拖过一半即切（按真实中心距算） |
| 6 | **栏不滚动** | `scrollLeft` 恒 0；`overflow:hidden`，删掉 kb 的 `overflow-x:auto` |

### 12.3 关键实现决策

1. **选中态承载者迁移**（本轮核心）：激活底色/下划线**从 tab 自身搬到 thumb**；tab 只留文字色 + 字重
   （hover 只对**未选中**项生效，避免与滑块抢视觉）。
2. **滑块位置 = 基准定位 + 手势位移，合成到同一个 `transform`**：
   拆成两段（松手时基准重算 + 位移清零）会产生"基准跳变 + 位移归零"的视觉裂缝。
3. **`snapThresholdPx` = 该方向真实中心距的一半**（非平均槽距）—— 槽距 72–75px 但方块宽不等 70/82，
   用平均值会让"拖过一半就切"与视觉不符。
4. **`manualOffset: true`**：`useSwipeTabs` 不再碰 DOM，只回调 `onOffsetChange(raw)` / `onSettle(targetIndex)`；
   位移与落位全部由 `createTabStripThumb` 负责。
5. **白板走「下划线滑块」**（`height:2px; bottom:0`），沿用全站 `.aurora-csp__tab` 同源下划线语言，其余三栏用圆角块。
6. ⚠️ **`transition:none` 残留坑**：瞬时落位（首帧 / ResizeObserver）若把 `style.transition='none'` 留在元素上，
   会**永久压住 CSS 过渡** → 之后点击/松手落位全变瞬移。瞬时分支必须
   `apply(); void el.offsetWidth; el.style.transition = ''` 恢复。

### 12.4 与 §10 铁律的一致性（**§11.3 的解释口径作废**）

R4 比 R3 **更贴近**铁律：位移只发生在 thumb 上，**tab 文字、内容区、栏滚动全部归零** ——
外壳（含 tab 行本身）彻底不参与动画，不需要 §11.3 那样为"tab 行位移"做例外说明。

### 12.5 验收标准（覆盖 §6 与 §11.4）

| # | 断言 | 方法 |
| --- | --- | --- |
| R4-1 | 静止态 thumb 与激活 tab **Δx ≤ 1.5px 且 Δw ≤ 1.5px** | 真机 `getBoundingClientRect` 对比 |
| R4-2 | 按住拖动 → **thumb 位移 ≥ 30px** | 跟手期读 thumb rect.x 差值 |
| R4-3 | 跟手期 **所有 tab 的 left 指纹 + 内联 style 指纹均不变** | 逐 tab 取 `rect.x` 序列与 `getAttribute('style')` 序列 |
| R4-4 | 内容层 `rect.x` 与内联 transform **均不变** | 逐字比较（**不可 `?? 0`**：元素缺失会误判成"动了"） |
| R4-5 | 栏 `scrollLeft` 在 rest/mid/after 三态恒 **0** | 同上 |
| R4-6 | 松手后 thumb 落点与**新**激活 tab 的 x 对齐（≤1.5px） | 松手后重查激活项 |

契约测试两侧同断言（CSS + JSX）：`styles/swipeTabBarSurface.test.ts`。

### 12.6 实测结果（CDP@9445，**四面板全部通过**）

| 面板 | 滑块Δ | 文字不动 | 内容不动 | 落位 | 切换 | 不滚 | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 设置页 | 68px | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 通过 |
| 博客工作室 | 49px | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 通过 |
| 白板侧栏 | 47px | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 通过 |
| 知识库 | 65px | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 通过 |

- R3 遗留的「知识库 CDP 覆盖不到」**已解除**：探针内 `ensureKbOpen()` 走真实建库链路
  （空态「新建知识库」→ 填名 → **限定在 `.aurora-kb-modal` 内**点「创建知识库」→ 回列表点卡片进详情）。
  ⚠️ 踩坑：提交按钮**不能用宽正则** `/创建|新建/` —— modal 走 portal 渲染在 body 末尾，
  宽正则会先命中页面底层的「新建知识库」按钮，点了个无效按钮（表现为"点了没反应"）。
- 落位精确到 0.0px；静止态宽度差 1.0px 属亚像素取整（阈值 1.5px 内）。

### 12.7 实现位置

- 共享纯逻辑：`hooks/tabStripSwipe.ts`（`createTabStripThumb` → `{ handleOffset, snapThresholdPx, place }`；
  `mapStripOffset` / `measureTabBox`（轨道 padding box 坐标系）/ `measureTabCenters`；滑块**不计入** tab 量取）
- React 壳：`hooks/useTabStripThumb.ts`（`{ trackRef, thumbRef, bind, dragging }`；首帧/选中变化 `useLayoutEffect` 落位 +
  `ResizeObserver` 瞬时落位）
- 接入：`panels/settings/SettingsPanel.tsx`、`panels/kb/KbPanel.tsx`、`panels/blog/BlogPanel.tsx`、`panels/canvas/CanvasSidebarPanel.tsx`
- 样式：`styles/panels/{settings,kb,blog,canvas}.css`（各栏 `position:relative` 轨道 + `position:absolute` thumb；
  `[data-swiping]` 时 thumb `transition:none` + 栏 `cursor:grabbing`）
- 测试：`hooks/tabStripSwipe.test.ts`(26) / `panels/settings/tabBarSwipeBinding.test.tsx`(22) / `styles/swipeTabBarSurface.test.ts`(~50)
- 探针：`artifacts/probe-swipe-thumb.mjs`（量"谁动了谁没动"）
- 已废弃（勿回退）：R3 的 `createTabStripMotion` / 轨道位移 / `visualMapper` / 边缘压暗 / `--swipe-progress`

---

## 13. 修订记录 R5（2026-09-15）：修正切换方向 —— **位移方向 = 目标方向**

### 13.1 用户反馈

> 「现在在 tab 栏中功能的 tab 可以滑动了，但是滑动的方向不对，往右滑动 tab 就去到左侧，向左滑动 tab 就去到右侧」

### 13.2 根因：两半语义被拆开

R1–R4 沿用的是**内容区翻页（Content-Pan）**的符号约定：
`向左拖 = 内容向左移动 = 露出右边的页 = 下一个 tab`。
因此 `swipeTabsCore.ts` 里三处都写着 `const nextSign = -1`。

但 R4 之后，承担选中态的是一条**滑块（选中指示器）**。指示器的语义是：
**它跟手滑到哪，就必须选中哪。** 于是同一个手势被两套语义各解释一半：

| 环节 | 行为 | 各自是否自洽 |
| --- | --- | --- |
| `mapStripOffset` → 滑块位移 | 鼠标向左 → 滑块**向左**跟手 | ✅（这就是"跟手"） |
| `decideSnap` → 目标索引 | 位移为负 → `index + 1`（**右侧**） | ❌ 与滑块所在处相反 |

结果：滑块向左滑到左边那个 tab 上面，松手却把选中项设成它的**右邻居** →
滑块在松手瞬间**弹回右侧**。用户看到的正是"往右滑动 tab 却去到左侧"。

### 13.3 修订内容

**单源规则：位移方向 = 目标方向**（x 轴向右为 `+` → 下一个；y 轴向下为 `+` → 下一个）。

| 文件 | 位置 | 改动 |
| --- | --- | --- |
| `hooks/swipeTabsCore.ts` | `applyEdgeResistance` | `nextSign: -1 → +1`（越界阻尼方向同步） |
| `hooks/swipeTabsCore.ts` | `decideSnap` | `nextSign: -1 → +1`（吸附目标方向） |
| `hooks/swipeTabsCore.ts` | `stepWheel` | `nextSign: -1 → +1`（触控板与拖动同向） |
| `hooks/tabStripSwipe.ts` | `distanceOf` | `cs[offset <= 0 ? idx+1 : idx-1]` → `cs[offset < 0 ? idx-1 : idx+1]`（阈值/限幅取的是同一方向的相邻项） |

⚠️ **`mapStripOffset`（滑块位移映射）不动** —— 它本来就是跟手的、正确的；
错的只是"松手后把位移翻译成目标索引"这一步。**滑块往哪滑就选中哪**是唯一自洽解。

### 13.4 验收标准（新增）

| # | 断言 | 方法 |
| --- | --- | --- |
| R5-1 | **向右**拖一格 → 激活 index **+1** | 探针 `probe-swipe-direction.mjs`；jsdom 用 `dragRight` |
| R5-2 | **向左**拖一格 → 激活 index **-1** | 同上（双向闭环：拖过去再拖回来） |
| R5-3 | 拖动中滑块位移与鼠标**同号** | 对比 `thumb.getBoundingClientRect().x` 差值符号 |
| R5-4 | 松手后滑块落点 = 新激活 tab 的 x（≤1.5px） | 同 R4-6 |

### 13.5 实测结果（CDP@9445 · **8/8 通过**）

每条栏做**双向**拖拽（向右 → 期望 +1，再向左 → 期望回到起点）：

| 面板 · 方向 | 起始 → 期望 | 实得 | 滑块Δ | 落位 | 文字不动 |
| --- | --- | --- | --- | --- | --- |
| 设置页 · 向右 | 1 → 2 | **2** ✅ | +68 | ✅ | ✅ |
| 设置页 · 向左 | 2 → 1 | **1** ✅ | −68 | ✅ | ✅ |
| 博客工作室 · 向右 | 0 → 1 | **1** ✅ | +48.6 | ✅ | ✅ |
| 博客工作室 · 向左 | 1 → 0 | **0** ✅ | −48.5 | ✅ | ✅ |
| 白板侧栏 · 向右 | 4 → 5 | **5** ✅ | +47.1 | ✅ | ✅ |
| 白板侧栏 · 向左 | 5 → 4 | **4** ✅ | −47 | ✅ | ✅ |
| 知识库 · 向右 | 0 → 1 | **1** ✅ | +65 | ✅ | ✅ |
| 知识库 · 向左 | 1 → 0 | **0** ✅ | −65 | ✅ | ✅ |

四面板落位均精确到 **Δ0.0px**。

### 13.6 测试同步，以及顺带修掉的一个隐性缺陷

- 方向断言全部反向：`tabBarSwipeBinding.test.tsx` 的 `dragLeft(dist)` → `dragRight(dist)`
  （轨迹 `600 + dist`，目标仍是 `startIdx + 1`）；`useSwipeTabs.test.ts` 的
  `applyEdgeResistance` / `decideSnap` / `stepWheel` 期望值随之互换。
- **顺带发现的隐性缺陷**（不是本次改动引入，只是被方向反转暴露）：
  `useSwipeTabsReact.test.ts` 的「内容区宽度作为吸附基准」用例，原先依赖
  **首 tab 左滑越界**来"碰巧"得到"不切换"的结论。方向反转为向右后越界护栏不再生效，
  暴露出**末段速度采样的时序敏感**：同步连发 `pointermove` 时 `dt ≈ 0`，
  `computeEndVelocity` 被算成极大值 → 误判为甩掷 → 断言失败。
  该用例已改为**真实慢速拖**（每步 300ms，末段速度 ≈0.17 px/ms < 0.3），
  使它真正只验证「阈值按内容区宽度而非 tab 栏宽度算」这一件事。
- 全仓 **1100 passed / 3 failed（同源预存）/ 2 skipped**；`tsc --noEmit` 干净。

### 13.7 教训（给后续 tab 类手势）

**"位移保号"与"目标取反"不能同时存在于一条链路上。** 一旦选中态的承载者是
跟随手指的元素（滑块 / 指示器 / 下划线），就没有"翻页语义"的容身之地：
指示器位置即真相，目标索引必须由**位移符号**直接决定，而不是由"内容移动方向"推。
