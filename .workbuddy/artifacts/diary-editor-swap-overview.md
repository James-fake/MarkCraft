# 日记编辑器换芯（方案 B · 只取内核）· 实施概览

> 执行日期：2026-08-28 · 范围：`src/aurora/panels/diary/`
> 决策：日记右栏升级为真实 TipTap/Markdown 编辑核心，仅保留编辑区 + 轻量格式工具栏，不引入 EditorLayout 大右栏/分屏/大纲。

## 改动清单

| 文件 | 改动 |
|---|---|
| `src/aurora/panels/diary/DiaryPanel.tsx` | 引入 `TiptapEditor`+`TiptapEditorHandle`+`DiaryFormatToolbar`；删除内联 `draft` 草稿态与重置 effect；`onEditorChange` 改为受控 `(md)=>updateFileContent(...)`+保存态；右栏 `<textarea>` 替换为 `<TiptapEditor key={focusedEntry.id} value onChange fileId livePreview={false}>`；新增 `editor` state（rAF 重试取 `getEditor()` 上抛供工具栏） |
| `src/aurora/panels/diary/DiaryFormatToolbar.tsx` | **新建**：10 个格式按钮（加粗/斜体/删除线/标题/无序列表/有序列表/引用/代码块/行内代码/链接），经 `editor.chain().focus().toggleX().run()` 驱动；订阅 transaction/selectionUpdate 同步 `is-active` 高亮 |
| `src/aurora/styles/panels/diary.css` | 删 textarea 专属 `.dv-editor__content`；`.dv-editor` 改承载 TipTap 容器；新增 `.dv-format-bar` + ProseMirror token 样式 |
| `src/aurora/panels/diary/DiaryPanel.smoke.test.tsx` | 新增 2 个用例：textarea 已移除；有日记时渲染真实 TiptapEditor 核心 + 格式栏（验证 R1 脱离 EditorLayout 独立挂载） |

## 关键设计点
- **数据流统一**：删内联 draft，`key={focusedEntry.id}` 强制切日记重挂载，内容/光标不串台；`onChange(md)` 即时写回真实文件 + 保存态指示。
- **隔离铁律**：仅改 Aurora `src/aurora/panels/diary/`；跨层引用 `src/features/editor/TiptapEditor` 属 Phase 2/4 迁移授权（与 EditorPanel 一致），真实 `src/features/diary/` 未触碰。
- **专注感保留**：不含大纲/分屏/版本历史/链接预览；格式栏为编辑区上方独立一行，与现有 `dv-toolbar`（情绪/打开/删除）并存不重叠。

## 验证结果
- `tsc --noEmit`：**0 错误**
- `vitest run DiaryPanel.smoke`：**4/4 通过**（Dexie IndexedDB missing 警告良性；jsdom 下 `createFile` 走内存/localStorage 回退，`focusedEntry` 正常渲染，证实 TiptapEditor 脱离 EditorLayout 可独立挂载）

## 建议手动验证（方案验证第 3 步）
启动 dev server（端口 5174）→ 打开日记面板 →
1. 已有日记显示富文本渲染（标题/列表/加粗）
2. 选中文字点格式工具栏按钮生效、激活态高亮
3. 输入后切到另一天再切回，内容正确不串台
4. 刷新后内容已持久化
