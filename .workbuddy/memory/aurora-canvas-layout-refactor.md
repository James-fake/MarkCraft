# 白板界面布局重构 · 实施总结

> 范围：仅 `src/aurora/`（演示面板），遵守隔离铁律，未触碰 `src/features/*` 真实界面。

## 优化前问题
1. 顶栏 `position:fixed` 脱离主壳坐标系，与编辑器/知识库不一致，需 `+1px` hack 避让书脊。
2. 书脊"最近白板"与内部左栏导航语义重叠。
3. 画布常驻命令栏与已移除的顶栏搜索重复，"顶部双横条"。
4. 信息层级扁平（顶栏 11 项 + 左栏 5 + 右栏 6 + 命令栏 + Dock）。

## 五阶段改动
| 阶段 | 文件 | 改动 |
|------|------|------|
| 1 顶栏回归内容流 | `canvas.css` / `CanvasPanel.tsx` | `.aurora-ctop` 改 `position:relative` 嵌入 `.aurora-canvas__body`；body 改 column + 新增 `.aurora-canvas__row`（left+main 并排）；删 `padding-top:48px` |
| 2 书脊收敛 | `CanvasPanel.tsx` | `sidebarGroups` 仅留"工作区"一组，移除"最近白板"；内部左栏保持规范20 的 5 Tab |
| 3 视图专属工具栏 | `CanvasPanel.tsx` / `canvas.css` | 移除常驻命令栏；新增 `CanvasViewToolbar`/`MindMapToolbar`/`KanbanToolbar`/`TimelineToolbar`/`DashboardToolbar`/`ViewWithToolbar`，五视图各有贴顶工具栏 |
| 4 图层 order 排序 | `CanvasFreeView.tsx` / `CanvasInspector.tsx` / `CanvasPanel.tsx` | `CanvasElement.order` 字段；`reorderLayers` 拖拽重排归一化；图层面板按 order 显示 + HTML5 拖拽；渲染 `zIndex:order+1` |
| 5 材质 token 统一 | `canvas.css` | 新组件复用 `--mc-radius-sm`/`--mc-bg-hover`/`--mc-accent-soft` 等 token |

## 验证结果
- 书脊右沿 61px / 顶栏左沿 61px → gap=0（紧贴不重叠）
- 顶栏 `position: relative`（已嵌入内容流，随书脊/右栏伸缩让位）
- 画布专属工具栏 7 按钮可见；五视图均 toolbar+body 渲染
- 图层面板 6 项全部 `draggable=true`
- `tsc --noEmit` 0 错误；puppeteer 实测 0 console error

## 设计一致性
顶栏、工具栏、HUD 全部走 `.material-*` 视觉语言与 `--mc-*` token，与编辑器/知识库/仪表盘模块的坐标系、间距、密度保持一致。
