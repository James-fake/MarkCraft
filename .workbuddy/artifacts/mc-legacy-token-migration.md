# MarkCraft · Legacy Token → CalmPremium 迁移范式（P5）

> 桌面范式全量铺开的设计系统收口规范。由 P4 收口后启动，目标：把 PWA 时代的旧 token 体系系统化迁移到 CalmPremium `--mc-*` 设计契约（DESIGN.md + `src/styles/desktop-chrome.css`）。
> 作者：UI Designer（WorkBuddy 智能设计助手）｜日期：2026-08-11

---

## 0. 范围与策略

- **审计结论**：legacy token 唯一名称仅 **6 种**（`--app-bg` / `--app-text` / `--sidebar-bg` / `--sidebar-text` / `--sidebar-border` / `--sidebar-active-bg`），横跨约 50 个文件、200+ 处引用。迁移本质是「6 种 token 名的纯引用重命名」。
- **策略（非破坏性）**：逐文件重命名引用，**保留** legacy 定义（base.css / ThemeManager 注入）不动——其他未迁移文件仍依赖，共存避免视觉分裂。单文件可独立回滚。
- **不属于本轮**：`--cv-*`（白板 canvas-v2 独立主题系统，另议）、`--kg-*`（图谱专用）、`--toolbar-*`（需另建映射）、`--button-primary`（按钮色，单独议题）。

---

## 1. 映射表（已验证 ✅）

| Legacy token | 暗色值 | 亮色值 | → CalmPremium | 暗色值 | 亮色值 | 语义 |
|---|---|---|---|---|---|---|
| `--app-bg` | #0f172a | #ffffff | `--mc-bg-app` | #0E0F17 | #F7F8FA | 应用画布底色 |
| `--app-text` | #e2e8f0 | #0f172a | `--mc-text-primary` | #E6E8EF | #1A1D24 | 主文本 / 标题 |
| `--sidebar-bg` | #1e293b | #f8fafc | `--mc-bg-panel` | #14161F | #FFFFFF | 侧栏 / 面板表面 |
| `--sidebar-text` | #cbd5e1 | #475569 | `--mc-text-secondary` | #8A8F9C | #5A606E | 次级文本 / 非激活图标 |
| `--sidebar-border` | #334155 | #e2e8f0 | `--mc-border-subtle` | #292E30 | #E2E5EA | 面板描边 |
| `--sidebar-active-bg` | 运行时注入（蓝/棕/青 0.08–0.15） | — | `--mc-accent-soft` | rgba(91,124,250,0.16) | rgba(59,91,219,0.12) | 激活高亮背景 |

**注**：`--sidebar-active-bg` 定义在 `src/features/themes/ThemeManager.ts`（L43/62/81，运行时 JS 注入，随主题变蓝/棕/青调），不在 CSS 定义。语义=激活项高亮背景，映射 `--mc-accent-soft` 完全对齐。

**对比度校验**：新 `--mc-text-secondary` (#8A8F9C) on `--mc-bg-panel` (#14161F) ≈ **5.7:1**，超 WCAG AA 4.5:1（P4 已实测）；accent #5B7CFA on #14161F ≈5.0:1，超 3:1（非文本）。

---

## 2. 迁移范式（标准步骤）

1. **选目标文件**，`Grep pattern="--(app|sidebar)-"` 提取其 legacy 用法与分布。
2. **逐 token 重命名**：对每个 legacy token 用 `Edit replace_all=true` 改引用名（不同 token 互不影响，可并行；同文件多个 Edit 若遇 linter 抢占，重读后补跑失败的那个即可）。
3. **勿动**：`--button-primary`、`--cv-*`、`--kg-*`、`--toolbar-*`、任何 `--mc-*`。
4. **保留 legacy 定义**：base.css 的 `:root`/light 定义、ThemeManager 的运行时注入——**切勿删除**（共存原则）。
5. **验证双关**：
   - `Grep` 目标文件零 `--app-*`/`--sidebar-*` 残留；
   - `tsc --noEmit -p tsconfig.json` → EXIT:0（绝对路径 node：`C:/Users/HJN/.workbuddy/binaries/node/versions/22.22.2/node.exe`）。
6. **可选视觉验证**：dev server 切暗/亮主题核对面板表面与文本对比度。

---

## 3. 全局债务清单（按引用量，推广优先级）

> 数字为审计 count（匹配行数，非精确 token 数），供排期参考。

**编辑器内各侧栏面板（重灾区）**
- GlobalSearch.tsx — 50 / SearchReplace.tsx — 19 / QuickOpen.tsx — 13
- Outline.tsx — 17 / QuickSwitcher.tsx — 5 / NoteContextPanel.tsx — 3
- FootnoteSidebar.tsx — 9 / FootnoteFromClipboard / WritingAidPanel — 3 / DraftInsightPanel — 2 / WritingGoalBar — 2
- SearchReplaceBar.tsx — 6 / FocusModeToolbar.tsx — 5 / EditorLayout.tsx — 1 / BlockBacklinksPanel.tsx — 1
- cm6/useCM6State.ts — 3 / extensions/{LinkHoverPreview,WikiLinkAutocomplete,SlashCommandPopup} — 各 1

**文件管理**
- Sidebar.tsx — 40 ✅已迁（本轮示范） / FileTreeContextMenu.tsx — 17 / LinkHealthPanel.tsx — 18 / TagPanel.tsx — 13 / FileTreeNode.tsx — 5 / FolderSelector.tsx — 5 / CreateFileModal.tsx — 6 / LinkRedirectDialog.tsx — 6

**主题 / 模板 / 导入 / 设置**
- ThemeManager.ts — 13 / ThemeMarketPanel.tsx — 6 / TemplateInsertModal.tsx — 11 / TemplateDiscoveryModal.tsx — 7 / ImportDialog.tsx — 3 / SettingsPanel.tsx — 1

**App 集成层**
- App.tsx — 12（含 crashBackup 弹窗等浮层，除上轮已清的块反链面板外仍待迁）

**样式表 / 其他**
- ui.css — 9+8 / tiptap.css — 14+25 / mermaid.css — 11+30 / base.css — 6+6 / components.css — 3 / versionHistory.css — 11 / DiaryView.tsx — 3 / AboutDialog.tsx — 9 / BookmarkContent.tsx — 11 / DashboardPanel.tsx — 22 / TagCloudContent.tsx — 24 / QuickCaptureModal / LibrarySyncModal / ErrorBoundary 等

---

## 4. 风险与边界

- ✅ 纯引用重命名，**零布局/逻辑改动**，可单文件回滚。
- ⛔ 切勿删除 base.css 的 legacy 定义（共存原则，否则未迁移文件视觉崩坏）。
- ⛔ `--cv-*` 不计入本轮（白板模块独立主题系统，待独立评估）。
- ⚠️ `--sidebar-active-bg` 由 ThemeManager 运行时注入，迁移时只改引用名；其定义留待主题层统一收口。
- ⚠️ 样式表（css）里的 legacy 引用与 tsx 内联引用一视同仁，按同映射表处理。

---

## 5. 已示范（本轮交付）

- **`src/features/fileManager/Sidebar.tsx`**：4 种 legacy（app-text / sidebar-bg / sidebar-border / sidebar-text）全量重命名 → `--mc-*`，零残留，`tsc --noEmit` EXIT:0。
- 它是桌面转型第一视觉接触点（左栏，与书脊 Spine56 相邻），迁移后左右栏视觉语言统一，是范式有效性验证。

---

## 6. 下一步推广建议（待用户拍板节奏）

- **批次 A（高价值低密度）**：AboutDialog、ImportDialog、QuickCaptureModal ✅ 已完成（2026-08-11）；SettingsPanel 因 `ThemeCard` 主题预览卡读旧多主题系统自带 `--sidebar-bg`，排除（见 §7）。
- **批次 B（编辑器侧栏群）**：Outline / QuickSwitcher / FootnoteSidebar / SearchReplaceBar / FocusModeToolbar —— 统一编辑器内面板语言。
- **批次 C（文件管理）**：FileTreeContextMenu / LinkHealthPanel / TagPanel / FileTreeNode / FolderSelector / CreateFileModal。
- **批次 D（搜索核心）**：GlobalSearch / QuickOpen / SearchReplace —— 最大引用量，放最后、每文件单独 tsc。
- **批次 E（样式表）**：ui.css / tiptap.css / mermaid.css / base.css / components.css / versionHistory.css —— 收尾。
- 每批结束跑 `tsc`，全部完成后评估是否清理 base.css legacy 定义（需在确认零引用后）。

---

## 7. 迁移进度日志（实时）

- **示范（P5 奠基）**：`src/features/fileManager/Sidebar.tsx` ✅（4 种 legacy 全迁）
- **批次 A（2026-08-11）**：
  - `src/components/AboutDialog.tsx`（9× `--app-text` → `--mc-text-primary`）✅
  - `src/features/import/ImportDialog.tsx`（2× `--sidebar-border`→`--mc-border-subtle`、1× `--sidebar-text`→`--mc-text-secondary`）✅
  - `src/features/pwa/QuickCaptureModal.tsx`（1× `--sidebar-bg`→`--mc-bg-panel`、2× `--sidebar-border`→`--mc-border-subtle`、2× `--app-text`→`--mc-text-primary`）✅
  - 验证：`tsc --noEmit` EXIT:0；三文件 Grep 零 `--app-*`/`--sidebar-*` 残留。
  - ⚠️ **排除项**：`SettingsPanel.tsx` L207（`ThemeCard` 主题预览卡）读 `theme.cssVariables['--sidebar-bg']`——这是预览旧多主题系统（github 浅色 / sepia / nord）**自身配色**的有意 JS 键读取，改名会破坏预览且语义错位，非散落债。保留，待主题系统统一收口时再议。
- **下一步**：批次 B（编辑器侧栏群：Outline / QuickSwitcher / FootnoteSidebar / SearchReplaceBar / FocusModeToolbar）。
- **批次 B（2026-08-11 晚）**：
  - `src/features/outline/Outline.tsx`（17×：5 `--sidebar-border`→`--mc-border-subtle`、9 `--sidebar-text`→`--mc-text-secondary`、3 `--sidebar-bg`→`--mc-bg-panel`）✅
  - `src/features/editor/components/QuickSwitcher.tsx`（5×：保留 `var(--border-color,#333)` 越界 token；`var(--sidebar-bg,#1e1e2e)`→`var(--mc-bg-panel,#1e1e2e)`、`var(--sidebar-text,#e0e0e0)`/`#888`→`--mc-text-secondary` 同兜底）✅
  - `src/features/editor/components/FootnoteSidebar.tsx`（9×：2 `--sidebar-bg`、2 `--sidebar-border`、5 `--sidebar-text`）✅
  - `src/features/editor/components/SearchReplaceBar.tsx`（6×：2 `--sidebar-bg`、4 `--sidebar-text`；保留 `--toolbar-bg`/`--editor-*`/`--button-primary`/`--button-success` 越界）✅
  - `src/features/editor/FocusModeToolbar.tsx`（5×：2 `--sidebar-bg`、3 `--sidebar-text`；保留 `--editor-*`/`--link-color`/`--button-primary` 越界）✅
  - 验证：`tsc --noEmit` EXIT:0；五文件 Grep 零 `--app-*`/`--sidebar-*` 残留。
  - ⚠️ 越界保留：`--editor-bg`/`--editor-border`/`--editor-text`/`--toolbar-bg`/`--button-primary`/`--button-success`/`--link-color`/`--border-color` 均非 6 种 legacy 范围，按范式「勿动越界 token」保留。
- **下一步**：批次 C（文件管理：FileTreeContextMenu / LinkHealthPanel / TagPanel / FileTreeNode / FolderSelector / CreateFileModal）。
- **批次 C（2026-08-11 晚，紧接 B）**：文件管理群统一 CalmPremium 语言，六文件全 Grep 零残留 + `tsc --noEmit` EXIT:0 ✅
  - `src/features/fileManager/FileTreeContextMenu.tsx`（21×：2 `--sidebar-bg`→`--mc-bg-panel`、4 `--sidebar-border`→`--mc-border-subtle`、11 `--sidebar-text`→`--mc-text-secondary`、2 `--app-text`→`--mc-text-primary`；L263/L277 三元 `var(--button-primary,#3b82f6)` 越界保留）
  - `src/features/fileManager/LinkHealthPanel.tsx`（21×：5 `--sidebar-bg`、4 `--sidebar-border`、12 `--sidebar-text`、8 `--app-text`；保留 `--editor-border` 越界，L579/500/524/603/608）
  - `src/features/fileManager/TagPanel.tsx`（13×：1 `--sidebar-border`、10 `--sidebar-text`、2 带兜底 `var(--sidebar-bg,#fff)`/`var(--sidebar-bg,#1e1e2e)`→`--mc-bg-panel,#...` 保留兜底；`--border-color` 越界保留）
  - `src/features/fileManager/FileTreeNode.tsx`（6×：3 `--sidebar-text`、1 `--sidebar-border`；`--button-primary` L104/L192/L228 越界保留）
  - `src/features/fileManager/FolderSelector.tsx`（9×：1 `--sidebar-bg`、2 `--sidebar-border`、2 `--app-text`、2 `--sidebar-text`；`--editor-bg` L104、`--button-primary` 系列越界保留）
  - `src/features/fileManager/CreateFileModal.tsx`（11×：1 `--sidebar-bg`、2 `--sidebar-border`、4 `--app-text`、3 `--sidebar-text`）
  - 验证：`tsc --noEmit` EXIT:0；六文件 Grep 零 `--app-*`/`--sidebar-*` 残留。
  - ⚠️ 越界保留：`--button-primary`/`--button-primary-hover`/`--editor-border`/`--editor-bg`/`--border-color` 非 6 种 legacy 范围，按范式保留。
- **批次 D（2026-08-11 晚，紧接 C）**：搜索核心群统一 CalmPremium 语言，三文件全 Grep 零残留 + `tsc --noEmit` EXIT:0 ✅
  - `GlobalSearch.tsx`（~47×：--sidebar-bg→--mc-bg-panel 5、--sidebar-border→--mc-border-subtle 10、--sidebar-text→--mc-text-secondary 多、--app-text→--mc-text-primary 8）
  - `QuickOpen.tsx`（~16×：--sidebar-bg→--mc-bg-panel 1、--sidebar-border→--mc-border-subtle 3、--sidebar-text→--mc-text-secondary 多、--app-text→--mc-text-primary 2）
  - `SearchReplace.tsx`（~22×：仅 --sidebar-bg→--mc-bg-panel 8、--sidebar-text→--mc-text-secondary 多；`SearchReplaceBar.tsx` 已在批次 B 处理，不重复）
  - **越界 token 一律保留**：`--button-primary`/`--link-color`/`--toolbar-bg`/`--editor-border`/`--editor-text`/`--button-success`/`#fff` 硬编码条件色 非 6 种 legacy 范围，绝不碰。
- **下一步**：批次 E（样式表收尾：ui.css / tiptap.css / mermaid.css / base.css / components.css / versionHistory.css）。
