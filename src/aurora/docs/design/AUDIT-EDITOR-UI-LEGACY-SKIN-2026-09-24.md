# 编辑器界面「旧皮肤」穷尽审计报告

- 日期：2026-09-24
- 范围：`src/features/editor/**`、`src/aurora/panels/editor/**`、`src/components/ui/**`、编辑器相关 6 个样式表
- 扫描面：**209 个文件**（已排除 `*.test.*` 与 `docs/`）
- 方法：静态源码级穷尽扫描 + 逐文件判据分层（可复算，见 §10）
- 结论：**12 个浮层 + 1 个子模块仍是旧皮肤**；根因不是「颜色写错」，而是两类**结构性逃逸**，外加 1 个横向污染。

---

## 0. 一句话结论

| 类别 | 数量 | 本质 |
|---|---|---|
| **A · portal 逃出 `#aurora-root`** | 11 个浮层 | 浮层里用的旧变量**必然**静默回落到 `base.css` 旧 palette |
| **B · 自持皮肤（从未接入 token）** | 3 个浮层 | 整层 Tailwind / 内联字面量，与主题系统零耦合 |
| **C · 子模块越界** | 1 个（`mindmapTemplates.tsx`） | 渲染在上轮刚修好的浮层内部，宿主干净而子模块仍旧 |
| **D · 横向污染：品牌强调色被写成 Tailwind blue-500** | 约 45 个文件 | `#3b82f6` / `rgba(59,130,246,·)` 绕过 `--mc-accent` |
| **E · z-index 魔数越界** | 11 处 | 内联 `9999/10000/100000` 覆盖基底单源层级带 |

> ⚠️ 上一轮修复（`a8177ad`）只覆盖了 `MindmapPopover.tsx` 宿主文件本身，**未覆盖它 import 的子模块** —— 这正是 §4·C 的漏网项。

---

## 1. 权威基线（判据必须先立后判）

### 1.1 变量三层

| 层 | 位置 | 作用 |
|---|---|---|
| L1 权威 token | `src/aurora/styles/tokens.css` `:root`（第 10–240 行） | `--mc-*` 定义处 |
| L2 运行时覆盖 | `src/styles/desktop-chrome.css` 第二层 `:root`（20/74/165/189） | **后者赢** → 运行时真值以此为准（`--mc-accent: #5B7CFA`） |
| L3 旧 palette | `src/styles/base.css` `:root`（6–76 深色 slate）/ `[data-theme="light"]`（93–136 浅色） | 旧蓝系 / 旧 slate |

### 1.2 重映射清单（唯一救命机制）

`tokens.css:497–519` 把 **21 个**旧变量在 `#aurora-root` 作用域内重映射为 `--mc-*`：

```
--app-bg --sidebar-bg --tab-bg --tab-active-bg --toolbar-bg
--editor-bg --editor-text --editor-border
--preview-bg --preview-text --preview-border
--line-number-bg --line-number-color --line-number-border
--code-block-bg --code-block-text --code-bg
--katex-background --katex-color --blockquote-bg --titlebar-bg
```

**不在清单里的旧变量，在作用域外就是裸的旧值** —— 例如 `--hover-bg`（仅定义在 `.aurora-editor` 内，`editor.css:2465`）、`--code-block-bg`（`base.css:33` = `#0d1117`）。

> 反直觉但重要：`--button-primary`（`base.css:25` = `var(--mc-accent)`）在 `:root` 解析，**全局一致、不是隐患** —— 审计中必须把它与真隐患区分开，否则会误报一大批。

### 1.3 单源基底类

| 类 | 语义 | 定义 |
|---|---|---|
| `.aurora-dropdown` | 锚定浮层（下拉/弹出菜单） | `components.css:410` → `--mc-bg-elevated` + `--mc-border-medium` + `--mc-radius-md` + `--mc-shadow-popover` + **z-index 1000** |
| `.aurora-modal-overlay` | 阻断模态 | `components/ui/Modal.tsx:141` |
| `.material-popover` | 右键菜单 / 命令面板 | `tokens.css:280` + `desktop-chrome.css:260`（登记于 `00-design-tokens.md:82`） |

### 1.4 z-index 层级带（单源 · `tokens.css:242–261`）

```
10060 CrashRecovery   10050 Onboarding   10030 ContextMenu（右键）
10001 画布 ctxmenu    10000（预留）       9999  画布 dock 浮层
9980  Modal 阻断模态   9000  Command 搜索浮层
3000  Aurora 共享 Modal 遮罩            1500  编辑器 kb-menu
1000  锚定浮层带（dropdown / lint / tabs ctxmenu）
```
原文纪律：**「禁止随手写 9999/10000 之类的魔数」**。

### 1.5 Tailwind 仍在构建链内（关键前提，已证）

- `base.css:1–3` 有 `@tailwind base/components/utilities`，由 `aurora-main.tsx:15` 引入
- `tailwind.config.js:3–7`：`content: ./src/**/*.{js,ts,jsx,tsx}`、`darkMode: ['class','[data-theme="dark"]']`
- ⇒ 浮层里的 `bg-white dark:bg-gray-800` 等**是生效的真实样式**，不是死字符串。
- ⇒ 且因 `dark:` 绑定 `[data-theme="dark"]`，**两种主题下都不等于 `--mc-*`**（深色 → `#1f2937`，浅色 → `#ffffff`）。

---

## 2. 扫描面（穷尽性证明）

| 项 | 数 |
|---|---|
| 扫描文件 | 209 |
| 含 `createPortal` 的文件 | 24（编辑界面 18） |
| 已用 aurora 单源基底 | 6 |
| **自持旧皮肤（待修）** | **12 + 1 子模块** |
| 作用域内命中旧变量处数 | 46 |
| 裸颜色字面量（全作用域） | 956（其中 255 属 token 定义文件，合法） |

**判据分层**：L1 是否逃出作用域 → L2 是否引用旧变量 → L3 是否自持皮肤 → L4 层级是否越界。

---

## 3. 判定矩阵（全模块）

| 模块 | 触发入口 | portal | 基底类 | 旧变量 | 自持字面量 | z-index | 判定 |
|---|---|---|---|---|---|---|---|
| `toolbar/ListMenuPopover.tsx` | 列表按钮下拉 | ✅ | ❌ | `--editor-border` + `--hover-bg` | **整层 Tailwind** | 9999 | 🔴 **P0 最严重** |
| `toolbar/EmojiPicker.tsx` | 工具栏 emoji | ✅ | ❌ | `--editor-bg/-border/-text` | 12 hex + 手写阴影 | 10000 | 🔴 P0 |
| `toolbar/WysiwygToolbar.tsx`（下划线调色板） | 下划线按钮 | ✅ | ❌ | `--editor-bg/-border` | 圆角 6px + 手写阴影 | 9999 | 🔴 P0 |
| `toolbar/WysiwygToolbar.tsx`（高亮调色板） | 高亮按钮 | ✅ | ❌ | `--editor-bg/-border` | 同上 | 9999 | 🔴 P0 |
| `toolbar/TableGridSelector.tsx` | 插入表格 | ✅ | ❌ | `--editor-bg/-border/-text` | `rgba(59,130,246,.2)` | 10000 | 🔴 P0 |
| `toolbar/LinkModal.tsx` | 插入链接 | ✅ | ❌ | `--editor-bg/-border/-text` | `#3b82f6` | 10000 | 🔴 P0 |
| `toolbar/ImageModal.tsx` | 插入图片 | ✅ | ❌ | `--editor-bg/-border/-text` | `#3b82f6` | 10000 | 🔴 P0 |
| `GoToLineDialog.tsx` | Ctrl+G | ✅ | ❌ | `--editor-bg/-border/-text` | Tailwind `z-50` | **50** | 🔴 P0 |
| `components/QuickSwitcher.tsx` | Ctrl+P | ✅ | ❌ | — | `#1e1e2e` + 旧蓝 | **100000** | 🔴 P0 |
| `extensions/WikiLinkAutocomplete.tsx` | 输入 `[[` | ✅ | ❌ | — | `#1e1e2e` + `#3b82f6` | 9999 | 🔴 P0 |
| `extensions/WikiLinkHoverPreview.tsx` | 悬停 `[[x]]` | ✅ | ❌ | — | 紫色系 + `#1e1e2e` | 9999 | 🔴 P0 |
| `components/NoteContextPanel.tsx`（悬浮卡） | 悬停笔记引用 | ✅ | ❌ | `--editor-text` | 紫色 `#a78bfa` | 10002 | 🔴 P0 |
| `ImagePreviewModal.tsx` | 点击图片 | ✅ | ❌ | — | **零 className / 零 var** | 9999 | 🟠 P1 |
| `toolbar/mindmapTemplates.tsx`（子模块） | 思维导图浮层内缩略图 | 随宿主 | ❌ | `--editor-border/-text` | `#3b82f6/#60a5fa/#93c5fd` | — | 🔴 **P0·C** |
| `EditorContextMenu.tsx` | 右键菜单 | ✅ | ✅ `material-popover` | — | 内联全 `--mc-*` | 10000/10001 | 🟡 P2（层级） |
| `toolbar/ListDropdown.tsx` | 列表按钮 | ✅ | ✅ `aurora-dropdown` | — | — | **9999** | 🟡 P1（层级） |
| `toolbar/groups/MoreDropdown.tsx` | 更多菜单 | ✅ | ✅ | — | — | **9999** | 🟡 P1 |
| `toolbar/groups/SourceHeadingDropdown.tsx` | 标题下拉 | ✅ | ✅ | — | — | **9999** | 🟡 P1 |
| `toolbar/WysiwygHeadingDropdown.tsx` | 标题下拉 | ✅ | ✅ | — | — | **9999** | 🟡 P1 |
| `toolbar/MathPopover.tsx` | 数学公式 | 否（内联 fixed） | ✅ `math-popover` | — | 仅 CSS hover 旧蓝 | **1000** ✅ | 🟢 **参照实现** |
| `toolbar/MindmapPopover.tsx` | 更多→思维导图 | ✅ | ✅ `aurora-dropdown` | — | — | 继承 1000 ✅ | 🟢 上轮已修 |
| `components/ui/Modal.tsx` | 通用模态宿主 | ✅ | ✅ `aurora-modal-overlay` | — | — | 3000 | 🟢 合规 |
| `panels/editor/FileTree.tsx` / `AuroraOutline.tsx` | 右键 / 大纲菜单 | ✅ | ✅ `aurora-filetree__ctxmenu` 等 | — | — | — | 🟢 合规 |
| `components/ui/{AuroraSelect,DateWheelInput,ScrollNumberInput}.tsx` | 表单控件 | ✅ | ✅ `aurora-wheel-popover` | — | — | — | 🟢 合规 |

---

## 4. 问题清单（按优先级）

### P0-1 · `toolbar/ListMenuPopover.tsx` —— 整层 Tailwind 旧皮肤（最严重）

**证据**（`document.body` 为 portal 目标）

```tsx
// L163-171
<div ref={popoverRef} style={{ position:'fixed', top, left, zIndex: 9999 }}
  className="rounded-lg shadow-xl border border-gray-200 dark:border-gray-700
             min-w-[200px] py-1 bg-white dark:bg-gray-800">
// L181 分隔线
style={{ height:'1px', backgroundColor: 'var(--editor-border)' }}
// L193 悬停
e.currentTarget.style.backgroundColor = 'var(--hover-bg, rgba(59, 130, 246, 0.1))'
```

**为什么必然旧**
1. `bg-white dark:bg-gray-800` → 深色主题下 `#1f2937`（Tailwind gray-800，冷蓝灰），≠ `--mc-bg-elevated`(运行时 `#1A1C24`)、≠ `--mc-border-medium`
2. `var(--editor-border)` 在 portal 里**未定义** → 回落 `base.css:21` = `#334155`（旧 slate）
3. `var(--hover-bg, …)` 在 portal 里**必然**走兜底 → 悬停变旧蓝 `rgba(59,130,246,0.1)`
4. `zIndex: 9999` 越级（属画布 dock 带）

**修法**：根改 `className="aurora-dropdown"`（正向 `--mc-bg-elevated`/`--mc-border-medium`/`--mc-radius-md`/`--mc-shadow-popover`/z-index 1000），行改 `aurora-dropdown__item`（自带 `--mc-accent-soft` 悬停），删全部 Tailwind 类与内联色。与上一轮 `MindmapPopover` 同款模板。

---

### P0-2 · `toolbar/EmojiPicker.tsx`

**证据**（L72 portal；L83–86 内联）
`borderRadius: 8`、`boxShadow: '0 4px 16px rgba(0,0,0,0.12)'`、`zIndex: 10000`；另用 `--editor-bg/-border/-text` + 12 处 hex(`#fff #e5e7eb #333 #3b82f6 #666`)。

**修法**：同上换基底；`borderRadius` → `--mc-radius-sm`；`boxShadow` → `--mc-shadow-popover`；z-index → 1000。

### P0-3 · `toolbar/WysiwygToolbar.tsx` 两个调色板（L414 / L553）

**证据**：`border: '1px solid var(--editor-border)'`、`borderRadius: '6px'`、`boxShadow: '0 4px 12px rgba(0,0,0,0.15)'`、`zIndex: 9999`（L424–427 / L563–566）。
**修法**：属锚定浮层 → `aurora-dropdown` + `--mc-shadow-popover` + z 1000。

### P0-4 · `toolbar/TableGridSelector.tsx` / `LinkModal.tsx` / `ImageModal.tsx`（同族三件）

**证据**：三者根均为 `position:fixed; inset:0; zIndex:10000` 的全屏遮罩 + 内联面板；用 `--editor-bg/-border/-text`；`TableGridSelector:67` 用 `rgba(59,130,246,0.2)`，`LinkModal:168`/`ImageModal:138` 用 `var(--button-primary, #3b82f6)`。
**修法**：三者的遮罩+面板应改走共享 `components/ui/Modal`（`aurora-modal-overlay`，z 3000），或至少遮罩用 `--mc-bg-overlay`、面板用 `--mc-bg-elevated`/`--mc-border-medium`/`--mc-radius-md`/`--mc-shadow-popover`，z → 3000。

### P0-5 · `GoToLineDialog.tsx`

**证据**（L48）：`className="fixed inset-0 z-50 flex items-center justify-center"` —— **Tailwind 类 + `z-50`(=50)**，远低于全表最低带 1000；面板用 `--editor-*` + `#3b82f6`。
**修法**：走 `Modal` 共享宿主；至少 z → 3000。

### P0-6 · `components/QuickSwitcher.tsx`（Ctrl+P）

**证据**：z-index **100000**（超出全表天花板 10060）；底色 `#1e1e2e`、悬停 `rgba(59,130,246,0.15)`。
**修法**：命令/搜索浮层应取 **9000**；底色 → `--mc-bg-elevated`。

### P0-7 · `extensions/WikiLinkAutocomplete.tsx`（输入 `[[`）

**证据**：`#1e1e2e`、`#3b82f6`、`rgba(59,130,246,0.15)`、`zIndex: 9999`（L427+）。
**修法**：`aurora-dropdown` + z 1000。

### P0-8 · `extensions/WikiLinkHoverPreview.tsx`（悬停预览）

**证据**：**零 `className`、零 CSS 变量**，全内联 `style`；一套独立紫色体系 `#8b5cf6/#a78bfa/#c4b5fd` + `#1e1e2e` + `#ef4444/#f59e0b/#22c55e`；`zIndex: 9999`。
**修法**：`aurora-dropdown` + `--mc-accent-*`/`--mc-success|warning|danger` 语义色 + z 1000。

### P0-9 · `components/NoteContextPanel.tsx` 悬浮卡

**证据**（L96 `--editor-text`；L248 portal；zIndex 10002 未登记）：紫色 `#a78bfa/#c084fc` + `rgba(128,128,128,·)` 灰系字面量。
**修法**：`aurora-dropdown` + `--mc-accent-text`/`--mc-border-subtle` + z 1000。

### P0-10 · `ImagePreviewModal.tsx`（点击图片）

**证据**：零 className、零变量，全 `rgba(0,0,0,0.85)`/`#fff` 字面量，`zIndex: 9999`。
**判定**：全屏 lightbox 的**深底观感尚可接受**，但属「token 零耦合」+ 层级越界。**修法**：z → 3000（模态带），底色改用 `--mc-bg-overlay` 类 token。

### P0-11（类别 C）· `toolbar/mindmapTemplates.tsx` —— 我上轮修复的漏网

**证据**

```tsx
// L88
<line … stroke="var(--editor-border, #475569)" opacity={0.5} />
// L92
<text … fill="var(--editor-text, #e2e8f0)">{children}</text>
// L95-97
const c = '#3b82f6', c2 = '#60a5fa', c3 = '#93c5fd'
// L331-332  fill="#fbbf24"
```

**为什么仍然旧**：该模块渲染在 `MindmapPopover` 的 portal 内部 → `--editor-border/-text` 均未定义 → 连线回落旧 slate、节点色是 Tailwind blue-500 系列，而非 `--mc-accent` (#5B7CFA) / `--mc-border-subtle`。
**修法**：`var(--mc-border-subtle)`、`var(--mc-text-primary)`、节点色 `var(--mc-accent)` + `--mc-accent-text`/`--mc-accent-soft` 分层。
**并且要补测试**：上轮的契约测试 `portalOverlayBasis.test.ts` 只断言宿主文件，**未覆盖被引入的子模块** → 必须把 `mindmapTemplates.tsx` 加入 `OVERLAYS` 扫描面。

---

## 5. P1 · z-index 魔数越界（11 处）

| 文件:行 | 现值 | 语义 | 应取 |
|---|---|---|---|
| `ListMenuPopover.tsx:169` | 9999 | 锚定浮层 | **1000** |
| `WysiwygToolbar.tsx:427 / 566` | 9999 | 锚定浮层 | **1000** |
| `EmojiPicker.tsx:86` | 10000 | 锚定浮层 | **1000** |
| `ListDropdown.tsx:82` | 9999 | 锚定浮层（覆盖基底！） | **1000** |
| `MoreDropdown.tsx:94` | 9999 | 同上 | **1000** |
| `SourceHeadingDropdown.tsx:138` | 9999 | 同上 | **1000** |
| `WysiwygHeadingDropdown.tsx:68` | 9999 | 同上 | **1000** |
| `NoteContextPanel.tsx:248` | 10002 | 锚定浮层 | **1000** |
| `WikiLinkAutocomplete.tsx:427` | 9999 | 锚定浮层 | **1000** |
| `WikiLinkHoverPreview.tsx:237` | 9999 | 锚定浮层 | **1000** |
| `EditorContextMenu.tsx:184` | 10001 | 右键菜单 | **10030** |
| `QuickSwitcher.tsx` | 100000 | 命令浮层 | **9000** |
| `ImagePreviewModal.tsx` | 9999 | 模态 | **3000** |
| `GoToLineDialog.tsx:48` | `z-50`(50) | 模态 | **3000** |

> 注意前 4 行：它们**已经**穿对了 `aurora-dropdown`（颜色合规），却用内联 `zIndex` 把基底的 1000 顶掉 —— 说明层级魔数是**独立于颜色**的一条缺陷轴。`MindmapPopover` 与 `MathPopover` 是唯二没有这个问题的锚定浮层。

---

## 6. P2 · 技术债：作用域内仍在用旧变量（46 处）

这些组件目前渲染在 `#aurora-root` 内，靠 §1.2 的重映射**碰巧正确**：

`EditorLayout.tsx`(22 处裸字面量)、`EditorStatusBar.tsx`、`FrontMatterPanel.tsx`、`BlockBacklinksPanel.tsx`、`VersionHistoryPanel.tsx` + `versionHistory.css`、`SearchReplaceBar.tsx`、`FocusModeToolbar.tsx`、`MarkdownToolbar.tsx`、`WysiwygToolbarButton.tsx`、`components/*Panel`、节点视图族（`CalloutView` `CodeBlockView` `ImageView` `MermaidBlockView` `MathBlockView` `PlantUmlBlockView` `EmbedContentView` `PdfEmbedView` `TocView` `EditableNodeView` `IframeView` `TableContextMenu`）、`cm6/*`。

**为什么不立即修**：现在不坏。**为什么必须记着**：一旦其中任何一个被 portal 化（或移动 DOM 层级），**会立刻翻旧** —— `MindmapPopover` 就是这么翻的。建议以「谁 portal 化谁迁移」为准，不做无差别替换。

---

## 7. 横向缺陷 · 品牌色被写成 Tailwind blue-500

权威强调色 = `--mc-accent`（运行时 `#5B7CFA`）。但编辑界面里大量出现 **`#3b82f6` / `#60a5fa` / `rgba(59,130,246,·)`** 字面量（blue-500/400 系列），在浅色下会呈现明显不同的蓝色相。

- 命中 `#3b82f6|#60a5fa|rgba(59,130,246,·)` 的文件：全仓 71 个，其中编辑界面相关约 45 个
- **悬停态**尤其集中：`mermaid.css:968/994/995`（连我认定的「参照实现」`MathPopover` 的 CSS 也有）、`EditorLayout`、`MarkdownToolbar`、`EditorStatusBar`、`FocusModeToolbar`、`FrontMatterPanel`、`FootnoteSidebar`、`NoteHoverCard`、`ImageView`、`WikiLinkAutocomplete`、`TableGridSelector`、`versionHistory.css`、`useCM6State.ts`、`mindmapTemplates.tsx`

**判据**：
- **裸字面量** → 必然生效 → 真视觉缺陷
- `var(--button-primary, #3b82f6)` 形式的**兜底** → `--button-primary` 在 `:root` 有定义 → **死兜底，不产生视觉问题**（但极具误导性，建议清理）
- `syntax.css` / `markdownHighlight.ts` / `highlightColors.ts` / `base.css` / `desktop-chrome.css` 内的字面量属**合法**（代码高亮主题 / 用户可选色板数据 / token 定义）

---

## 8. 合规参照（照抄即可，不要再发明）

**`toolbar/MathPopover.tsx`** —— 锚定浮层的教科书式实现：

```tsx
<div className="math-popover" style={{ position:'fixed', top, left, zIndex: 1000 }}>
```
- 语义类名，皮肤全在 CSS（`mermaid.css` 用 `--mc-text-primary` / `--mc-radius-sm` / `--mc-dur-fast`）
- **零内联色值、零 hex、零旧变量**
- `zIndex: 1000` 正是层级带规定的锚定浮层值

次优参照：`components/ui/Modal.tsx`（`aurora-modal-overlay`）、`MindmapPopover.tsx`（上轮已修）。

---

## 9. 建议修复批次

| 批次 | 内容 | 理由 |
|---|---|---|
| **批次 1** | P0-1 `ListMenuPopover`（Tailwind 整层） | 面积最大、最像「另一个软件」 |
| **批次 2** | P0-2/3 `EmojiPicker` + `WysiwygToolbar` 两调色板 | 同属工具栏锚定浮层，共用 `aurora-dropdown` 模板，一次改完 |
| **批次 3** | P0-4/5 三件模态 + `GoToLineDialog` → 统一走 `Modal` 宿主 | 同时消掉 z-index 越界 |
| **批次 4** | P0-11 `mindmapTemplates` + 扩充契约测试扫描面 | **闭合上轮漏网**，优先级应提前 |
| **批次 5** | P0-6/7/8/9/10 命令浮层与 wiki/笔记浮层 | 各有独立配色体系，逐个对齐 token |
| **批次 6** | P1 全量 z-index 归带（14 处） | 单点、低风险、可一次提交 |
| **批次 7** | P2 旧变量迁移（**仅随 portal 化进行**） | 避免无差别替换制造风险 |

**建议每批次同步把该模块加入 `portalOverlayBasis.test.ts` 的 `OVERLAYS` 扫描面**（并把扫描扩展到「浮层 import 的子模块」）。

---

## 10. 复算方法

```bash
# 0) 全量矩阵（209 文件，产出 audit-editor-ui-skin.json）——其余脚本依赖它先跑
node .workbuddy/artifacts/audit-editor-ui-skin.cjs

# 1) 仅看 portal 文件细节（remappedVars / hardVars / hex / Tailwind / 魔数）
node .workbuddy/artifacts/audit-editor-ui-skin-detail.cjs

# 2) 抽取每个 portal 的根元素皮肤（className + 内联键）
node .workbuddy/artifacts/audit-editor-ui-skin-roots.cjs

# 3) 颜色字面量分层：裸字面量（必生效）vs var() 死兜底
node .workbuddy/artifacts/audit-editor-ui-skin-literals.cjs
```

判据常量固化在脚本内：`REMAPPED`（§1.2 的 21 项）、`LEGACY_PREFIX`、Tailwind 皮肤类正则、`zIndex` 魔数正则。

---

## 11. 诚实边界（未覆盖 / 存疑）

1. **本轮是静态源码级穷尽**，未对 12 个 P0 浮层逐个做真机 CDP 截图对照。建议对批次 1–4 各做一次真机验证（尤其 `ListMenuPopover` 在深/浅两主题下的差异）。
2. **主题取值依赖运行时**：`data-theme` 由 `ThemeManager.ts:210/246` 写入，深色/浅色两态下 Tailwind 皮肤的**具体色值不同**，但**两态都不等于 `--mc-*`** —— 结论不依赖默认主题。
3. `ImagePreviewModal` / `WikiLinkHoverPreview` 是全自持浮层，**视觉上可能「看起来还行」**；列入清单的理由是「token 零耦合 + 层级越界」，属一致性缺陷而非明显错色。若你希望按「肉眼可见」排序，这两项可降级。
4. 节点视图族（`CalloutView` 等）的 11 处裸 hex（`#3b82f6 #22c55e #f59e0b #ef4444 #06b6d4`）是**语义色板**，在 `#aurora-root` 内可用；是否替换为 `--mc-success|warning|danger` 需先确认与 `--mc-*` 语义色的映射关系，本轮**未擅自判定**。

---

## 12. 执行台账（2026-09-24 同日完成）

按 §9 顺序执行 **批次 4 → 1 → 2 → 3 → 5 → 6**（批次 4 提前，先闭合上轮漏网）。

| 批次 | 状态 | 落点 |
|---|---|---|
| 4 | ✅ | `mindmapTemplates.tsx` 子模块：stroke/fill/缩略图配色 → `--mc-border-strong` / `--mc-text-inverse` / `--mc-accent(-hover/-text)` / `--mc-warning` |
| 1 | ✅ | `ListMenuPopover`：删 Tailwind 整层 + `zIndex:9999` → `aurora-dropdown` + `aurora-dropdown__item` |
| 2 | ✅ | `EmojiPicker`、`WysiwygToolbar` 两调色板（L414/L553）→ 同基底 + `--mc-*` |
| 3 | ✅ | `TableGridSelector` / `GoToLineDialog` / `LinkModal` / `ImageModal` → `aurora-modal-overlay` + `aurora-modal`(+`--sm`)，按钮改 `aurora-btn--sm --secondary/--primary/--ghost/--danger` |
| 5 | ✅ | `QuickSwitcher` → `.aurora-command*`；`WikiLinkHoverPreview` / `WikiLinkAutocomplete` → `aurora-dropdown`；**`NoteHoverCard`（新增发现：跨作用域共享子组件）** → 基底 + `--mc-*`；`NoteContextPanel` 紫字面量/旧变量 → `--mc-accent-text` / `--mc-graph-*`；`ImagePreviewModal` → 新增 `--dim` 遮罩变体 + `.aurora-lightbox__*` |
| 6 | ✅ | 4 个下拉删内联 `9999`；`EditorContextMenu` 10001/10000 → **10030**；`NoteContextPanel`/`CanvasSidebarPanel` 的 `10002` 移除；`QuickSwitcher` `100000` → 9000 |
| 7 | ⏸️ 未做 | P2「作用域内旧变量」46 处 —— 按原计划**仅随 portal 化进行**，仍保持不动 |

### 新增发现（原报告未列）
- 🚨 **第三条缺陷轴：跨作用域共享子组件**。`components/NoteHoverCard.tsx` 被 3 处消费，其中
  `cm6/wikiLinkHoverTooltip.tsx` 用 `createRoot(document.createElement('div'))` 挂 body ——
  既不在 `createPortal` 的搜索结果里，也拿不到 Provider ⇒ **完全逃逸**：
  `background: 'var(--editor-bg, #fff)'` 在暗色主题下渲染成**白卡**。
  该卡同时被 `NoteContextPanel` / `CanvasSidebarPanel` 复用 ⇒ 必须整卡按逃逸标准迁移。
- **单源基底族补全**：原报告只列了 `.aurora-dropdown`，实测另有更贴合的
  `.aurora-modal-overlay`+`.aurora-modal`（z 3000）与 `.aurora-command*`（z 9000，`command-palette.css`）。
- **新增单源件**：`.aurora-modal-overlay--dim`（恒暗遮罩变体）与 `.aurora-lightbox__btn/__stage/__bar`
  （`components.css`，图片灯箱；反色控件走 `color-mix`，两主题可读）。

### 验证链结果
| 项 | 结果 |
|---|---|
| 类型检查 | `tsc --noEmit` exit 0 |
| 全量测试 | **130 文件 / 1738 例通过**（2 skipped） |
| Lint | 本轮 12 文件 **0 error**；20 warning 全为既有 `no-explicit-any`/`exhaustive-deps`/`react-refresh`，非本轮引入 |
| 构建 | `✓ built in 1m 15s`（注：直接 build 会在清空旧 `dist/` 时被沙箱批量删除守卫拦下 ⇒ 用 `--outDir` 新目录复跑，属环境而非代码） |
| 浮层契约守卫 | `portalOverlayBasis.test.ts` 重构为 spec 驱动，**75 例 / 10 浮层 + 层级带**全绿；并做**注入式阳性对照**（塞 `var(--editor-bg)`+`zIndex:9999` → 3 条轴同时报红后还原） |
| 真机 CDP | 无头 Edge 153，`13/13` 通过（见 §12.1） |

### 12.1 真机取证（`http://localhost:5174/`）
探针 `.workbuddy/artifacts/cdp-overlay-verify.cjs`：探针元素**刻意挂在 `document.body`**
（= `#aurora-root` 的兄弟，复现 portal 真实处境），读 CSSOM 真值比对而非抄字面值。

| 断言 | 实测 |
|---|---|
| `.aurora-dropdown` 背景 = `--mc-bg-elevated` | `rgb(26,28,36)` ✅ |
| `.aurora-dropdown` 圆角 = `--mc-radius-md` | `8px` ✅ |
| `.aurora-dropdown` 层级 = 锚定带 | `1000` ✅ |
| `.aurora-dropdown` 边框含 `--mc-border-medium` / 阴影 | `1px solid rgb(38,43,59)` / 已生效 ✅ |
| `.aurora-modal-overlay--dim` 遮罩 / 层级 | `rgba(0,0,0,0.85)` / `3000` ✅ |
| `.aurora-command-overlay` 层级 | `9000` ✅ |
| `.aurora-lightbox__btn` 前景 / 底色 | `rgb(255,255,255)` / `color(srgb 1 1 1 / 0.1)` ✅ |

**⭐ 机制修正（实测证伪原假设）**：原推断「portal 到 body 后 `--editor-*` 未定义 → 落 CSS 兜底」是**错的**。
`base.css` 在 `:root` 就定义了这些变量，值 = **旧 slate**。实测同一变量：

| 位置 | `var(--editor-bg)` 实测 |
|---|---|
| `document.body`（portal 处境） | `rgb(15, 23, 42)` = **#0f172a（旧 slate 指纹）** |
| `#aurora-root` 内 | `rgb(16, 18, 24)` = `--mc-bg-content` 真值 |

⇒ 逃逸**不是**「变量缺失」而是「**静默命中旧值**」：不报错、不崩溃，只是颜色是旧的。
这正是报障「界面是最旧一版 UI」的成因，也说明判据只能是「**同变量在作用域内外取值不同**」。

### 12.2 收尾
- 真机与构建用的 dev server（5174）/ 无头 Edge（9222）已停止，`netstat` 复核端口已释放
  （避免下次 `--strictPort` 启动直接失败）
- 记忆：`.workbuddy/memory/MEMORY.md`（+5 条铁律）、`TOPICS.md`（浮层单源基底族 + 守卫写法）、
  `2026-09-24.md`（批次执行全记录）
- 技能：`ui-legacy-skin-audit` 由「四轴」升级为「五轴」，新增「迁移后上锁（守卫 + 真机取证）」整节
