# 07 · 命令面板（Command Palette）规范

> **P3-B 归一（2026-09-10）**：白板本地副本 `panels/canvas/CanvasCommandPalette.tsx` 已删除，全应用单一实现 = `components/command-palette/CommandPalette.tsx`（详见 `01 §7`）。

## 1. 单一实现（components/command-palette/CommandPalette.tsx）

`CommandItem[]` 注入；打开聚焦、按 `group` 分组（`CategoryLabels` 中文标题）、子串匹配（title/description/group/keywords 的 `includes`）+ 标题子序列容错、键盘 ↑/↓/Enter/Esc、执行 `action()` 后 `onClose`。附加能力：最近使用置顶（`commandHistory`，仅对注入的 commands 生效，跨面板自然隔离）、文件搜索分组（`fileItems` prop）、底部快捷键提示。不自带 ⌘K 全局快捷键，需调用方接线。

## 2. 两条接线（单一组件，两处消费）

- **主壳（AuroraShell）**：命令来源 = `commandRegistry`/`commandCatalog` 单一数据源，经 `commandAdapter` 映射为 `CommandItem[]`，覆盖文件/app/edit/window 等全局命令。
- **白板（CanvasPanel）**：`⌘/Ctrl+K` 打开；引擎动作（视图切换/工具/撤销重做/适应缩放/便签）在面板内本地构造为 `CommandItem[]`（`canvas.*` 命名空间，分组 view/tools/edit/file）——engine 为面板局部实例，不入全局 registry；「打开白板列表」联动 `CanvasListMenu`。
- 旧 `.aurora-cmdk` 命令面板样式已删（`canvas.css`）；`.aurora-cmdk` 容器/搜索/Esc 类仍保留，供 `CanvasListMenu` 复用。

## 3. 交互

- 打开方式：主壳 `⌘/Ctrl+K`（useKeyboardShortcuts）；白板内 `⌘/Ctrl+K`（CanvasPanel 键盘处理）。
- 搜索为子串 + 子序列匹配；键盘 ↑/↓ 移动、Enter 执行、Esc 关闭；点击项执行后关闭。

## 4. 未实现 / 范围外

- 无命令分组折叠；无模糊拼音搜索（子序列已覆盖漏字容错）。
- 白板引擎命令未入全局 registry（engine 生命周期局部；如需全局化需 engine 服务化，暂不做）。
