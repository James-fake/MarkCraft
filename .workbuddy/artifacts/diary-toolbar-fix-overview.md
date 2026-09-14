# 日记编辑器工具栏修复概览

## 问题
日记换芯后，右栏出现**双重工具栏**：
- 上层：自建 `DiaryFormatToolbar`（文字按钮 `B/I/S/H`，含义不清、与编辑区融成一片）
- 下层：`TiptapEditor` 内部自带的完整 `wysiwyg-toolbar`（撤销/重做、B/I/U/S、标题下拉、列表、引用、代码、链接、图片、表格、表情等）

这与方案 B「只取内核 + 一个轻量格式栏」的定位冲突，界面冗余拥挤。

## 修复内容

### 1. 隐藏完整 WYSIWYG 工具栏
在 `src/aurora/styles/panels/diary.css` 中，用后代选择器仅对日记面板内的 `TiptapEditor` 实例隐藏自带工具栏：
```css
.dv-editor .tiptap-editor-wrapper > .wysiwyg-toolbar { display: none !important; }
```
不改真实 `features/toolbar`。

### 2. 重做轻量格式工具栏
`src/aurora/panels/diary/DiaryFormatToolbar.tsx`：
- 全部按钮改用内联 SVG 图标
- 分组 + 发丝竖线分隔：文本样式 | 标题 | 列表 | 引用/代码/链接
- 标题按钮改为 H1/H2/H3/paragraph 循环，当前层级用 `Hn` badge 显示
- 保留激活态同步、防失焦、链接 prompt 等行为

### 3. 把格式栏收进编辑区
`src/aurora/panels/diary/DiaryPanel.tsx`：
- 将 `DiaryFormatToolbar` 从 `.dv-editor` 外部移入内部，使其成为编辑区 chrome
- `.dv-editor` 改为 `flex-direction: column`，并增加边框/圆角/背景，形成独立卡片
- 调整 `.tiptap-editor-wrapper` / `.tiptap-wrapper` flex 占比，让编辑区占满剩余高度

### 4. 测试
`src/aurora/panels/diary/DiaryPanel.smoke.test.tsx`：更新格式栏按钮 title 断言。

## 验证
- `tsc --noEmit`：**0 错误**
- `vitest run DiaryPanel.smoke`：**4/4 通过**

## 文件清单
- `src/aurora/panels/diary/DiaryPanel.tsx`
- `src/aurora/panels/diary/DiaryFormatToolbar.tsx`
- `src/aurora/styles/panels/diary.css`
- `src/aurora/panels/diary/DiaryPanel.smoke.test.tsx`
