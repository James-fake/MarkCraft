# 20 · 白板侧栏与 Inspector 面板规范

> 对应 `panels/canvas/CanvasSidebar.tsx` 与 `CanvasInspector.tsx`。

## 1. 左 Sidebar（CanvasSidebar，5 Tab）

默认 `tab='outline'`。头部 `chevronLeft` 折叠按钮。

| Tab | 图标 | 内容 |
|---|---|---|
| 大纲 | `list` | 搜索框 + 层级树（前 3 根、其余子）；行含箭头/色点/pin/标题/子数/externalLink/star |
| 反链 | `link` | 未选元素→"请选中一张卡片查看反链"；已选→2 入链 + 1 出链（硬编码 `backlinksFor`） |
| 标签 | `tag` | AND/OR + 6 标签（重要/待办/想法/参考资料/设计/紧急，含 count）+ 清除筛选 |
| 历史 | `history` | 5 条记录按 今天/昨天/更早 分组；恢复(undo)/删除(close)、保存版本、清空 |
| 小地图 | `frame` | `<canvas>` 248×200 绘制元素矩形 + 硬编码视口框 `strokeRect(40,60,90,70)`；滚轮缩放 + range 滑杆 |

## 2. 右 Inspector（CanvasInspector，6 Tab）

| Tab | 图标 | 内容 |
|---|---|---|
| 属性 | `settings` | 6 色板 + 字号 + 对齐三按钮 + X/Y/宽/高/旋转 + 文本 textarea + 锁定/可见 Switch + 删除元素 |
| 图层 | `layers` | 按 order 降序；眼/锁 + 类型图标 + 名称 + `grip`；HTML5 拖拽重排 |
| 筛选 | `filter` | AND/OR + 6 标签 chips + 5 类型 checkbox + 3 状态 radio + 清除全部 |
| 收藏 | `star` | list/grid 切换（默认 grid） |
| 推荐 | `sparkle` | 3 条硬编码 AI 推荐 + 查看更多推荐 |
| 搜索 | `search` | 输入框实时过滤 elements |

## 3. 已知桩 / 不一致（本规范范围外）

- `OutlineRow` 的 `pinned`/`hasFile` 永不为真（id 不匹配）→ pin/文件链接图标永不出现。
- `visible/locked` 未传入 `CanvasFreeView` → 隐藏/锁定仅改图标，元素照常渲染/可拖。
- **筛选 Tab 不参与画布元素过滤** → 标签/类型/状态筛选对画布无效。
- 属性面板：字号 `defaultValue={14}` 无 onChange；旋转 `value={0} readOnly`；对齐三按钮无 onClick。
- 筛选状态 radio `onChange={() => null}`；`filter.status` 声明为 `as const` 无法变更。
- 无 onClick 的按钮：推荐"添加到画布/不感兴趣/查看更多"；反链"+链接"、标签"+新建"、大纲 more/refresh；分享"邀请/导出/member more"；看板列"更多"。
- ⚠️ 图标：右对齐误用 `alignCenterV`（应为 `alignRight`，但 `icons.tsx` 无此导出）；`diamond` 映射到 `target`。
