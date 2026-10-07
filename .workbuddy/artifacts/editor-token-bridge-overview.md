# 编辑器/日记「旧界面设计」根因与 Token 桥接修复（方案 A）

## 根因
Aurora 在 Phase 2「换芯」时**只重涂了外壳 chrome**，编辑器内部件一直原样复用真实组件：

- 主编辑器：`EditorPanel.tsx:413` 嵌真实 `<EditorLayout>`
- 日记：`DiaryPanel.tsx:592` 嵌真实 `<TiptapEditor>`

真实编辑器内部以 `--editor-*` 旧设计变量驱动视觉（定义在 `src/styles/base.css:19-21 / 106-108`，旧 slate 配色 `#0f172a`/`#e2e8f0`/`#334155`）。而 `aurora-main.tsx:11-20` 把真实主题当底盘加载，Aurora 外壳用 `--mc-*`。

结果：同一页两套设计系统并行——**外壳 = 新 Aurora，编辑器内脏 = 旧真实应用**，所以编辑器仍显示旧界面。

## 修复（方案 A · 仅 Token 桥接）
在编辑器作用域内把真实编辑器消费的变量重映射为 Aurora token，编辑内部件无需改动即整体换色（不改 `src/features/*`，符合隔离铁律）。

映射（8 个变量）：

| 旧变量 | 映射为 | 作用 |
|---|---|---|
| `--editor-bg` | `--mc-bg-content` | 书写区/对话框底色 |
| `--editor-text` | `--mc-text-primary` | 文字 |
| `--editor-border` | `--mc-border-subtle` | 发丝分隔/边框 |
| `--editor-font-family` | `--mc-font-sans` | 书写字体 |
| `--editor-font-size` | `15px` | 书写字号 |
| `--editor-line-height` | `1.8` | 书写行距 |
| `--editor-code-font-family` | `--mc-font-mono` | 代码块字体 |
| `--button-primary` | `--mc-accent` | 激活态高亮（极光蓝紫） |

落点：
- `src/aurora/styles/panels/editor.css` → `.aurora-editor { … }`
- `src/aurora/styles/panels/diary.css` → `.dv-editor { … }`（TiptapEditor 挂载点）

## 验证
- `tsc --noEmit` 0 错。
- grep 确认真实编辑器内部仅消费上述变量，桥接全量覆盖；同文件无更靠后规则覆盖（editor.css:2527-2528 既有 `.ProseMirror` 覆盖块映射值一致，不冲突）。

## 遗留（B 方案范畴，本次未做）
经 `createPortal` 渲染到 `body` 的瞬时浮层（若有）不在此作用域，仍可能显示旧色。若要与外壳 100% 一致（含浮层、右栏面板边框圆角、激活态），走 B 方案：在 `.aurora-editor` 作用域对右栏面板/浮动工具栏/模式切换按钮做 Aurora chrome 覆盖。
