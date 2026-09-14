# MarkCraft · Aurora 界面（已接管为项目实际界面）

> ⚠️ **状态更正（2026-08-29）**：Aurora 已**完全替换原项目界面**，现为项目**实际运行界面**（非演示/外壳原型）；原 `/`（index.html）挂载的旧 Web 风格界面已退役。本计划记录迁移路径与遗留去重项。
> 状态：决策已锁定 · 迁移已完成（Aurora 接管实际界面）
> 生成日期：2026-08-26
> 决策锁定：2026-08-26（7 项待确认决策全部确认，见 §9）
> 范围：将 `src/aurora/` 极光设计系统作为**项目实际界面**，套接到项目既有的 `src/features/*` 真实功能实现之上，替换原 `/`（index.html）所挂载的原有 Web 风格界面。

---

## 0. 执行摘要

Aurora 是 MarkCraft 的**桌面原生实际界面**，已自建完整的设计 token（`--mc-*`）、外壳组件（`PageFrame` / `TitleBar` / `Sidebar` / `Inspector` / `StatusBar`）、统一 UI 组件库与 9 个面板。各面板经「换芯」绑定 `src/features/*` 真实数据（见 `.workbuddy/memory/MEMORY.md` 换芯模板）；早期隔离铁律期间的 mock 驱动已随迁移解除（残留 mock 由 Phase 4 去重收口）。

原项目 `/` 挂载的 `App.tsx`（`AppContent` 约 1731 行）是一套 Web 风格的 shell（左侧文件树 `features/fileManager/Sidebar` + 顶部 `TabBar` + `EditorLayout`），**没有**全局 TitleBar / StatusBar / Inspector 桌面外壳——该界面已被 Aurora 替换退役。

**迁移本质**：保留 `src/features/*` 的全部真实逻辑，把「界面外壳 + 面板视觉」替换为 Aurora。即**外壳换皮、内核不动**。Aurora 的每个面板从「mock 渲染」改为「渲染真实 feature 组件」。该迁移已完成，Aurora 现为实际界面。

---

## 1. 当前状态扫描

### 1.1 Aurora 演示面板（`src/aurora/`，93 个文件）

| 区块 | 文件 | 说明 |
|------|------|------|
| 入口 | `aurora.html` → `aurora-main.tsx` | 独立 React 入口；内置 hash 路由（`#/welcome\|editor\|...`）、命令面板、toast。每个面板自身用 `PageFrame` 包裹 |
| 外壳 | `components/shell/`：PageFrame / TitleBar / Sidebar / Inspector / StatusBar / WindowControls | 5 层桌面外壳；`PageFrame` 接收 `sidebarGroups / breadcrumbs / inspectorTabs / statusLeft/RightItems` 等 props |
| 组件库 | `components/ui/`：Button / Input / Modal / Segmented / DropdownMenu / Tooltip / Badge / Card / ListItem | Aurora 自有的统一组件库 |
| 图标 | `icons.tsx`（`Icon` 组件，stroke 风格 currentColor SVG，含 `logo/code/eye/split/close/...`） | 演示统一图标源 |
| 面板 | `panels/`：welcome / editor / dashboard / canvas / settings / kb（KbPanel / KbManagePanel / GraphPanel）/ blog / diary | 每个面板 = `PageFrame` + 自身内容 |
| 样式 | `styles/`：tokens.css（暗色 only）、shell.css、components.css、command-palette.css、panels/*.css（11 个） | 设计系统全部集中于此 |
| 数据 | `mock.ts`、`panels/kb/kbData.ts`、`panels/diary/diaryData.ts` | **全部为 mock，无 store 接入** |
| 文档 | `docs/design/` 00–28 共 29 篇规范 + 审计/编辑器审计 2 篇 | 设计权威来源 |

**关键事实**：Aurora 面板经核验**严格隔离**，仅 import `src/aurora/*`（如 KbPanel 只引 `./kbData`、`../../components/shell/PageFrame`），不触碰 `src/features/*`。这使得「按面板替换内容」的迁移路径干净、低风险。

### 1.2 实际项目（`src/`，features 636 文件 + 根壳）

| 区块 | 文件 | 说明 |
|------|------|------|
| 入口 | `index.html` → `main.tsx` → `App.tsx` | 真实入口；`AppContent` 单体管理全部状态、路由、弹层 |
| 路由 | `features/navigation/viewState.ts` | 自研 `viewState` store；hash 形如 `#view=editor\|dashboard\|graph\|kb\|blog\|canvas\|diary`；支持深链 + 浏览器前进/后退 + 刷新恢复；`viewNav.openView(view, params?)` 统一派发 |
| 外壳（现状） | `features/fileManager/Sidebar.tsx`、`features/editor/EditorLayout.tsx`、`features/editor/TabBar`（在 App 内） | **无全局 TitleBar / StatusBar / Inspector**；文件树常驻左侧，编辑区顶部是 TabBar，其余视图（dashboard/graph/canvas/kb/blog）以 fixed/overlay 浮层打开 |
| 真实功能 | `features/`：editor / graph / dashboard / canvas-v2 / knowledgeBase / blog / diary / commandPalette / settings / fileManager / import / migrate / pwa / themes / toolbar / outline / preview / lint / export / search / tags / templates / shared | 全部真实实现，含 100+ 测试 |
| 组件库 | `src/components/ui/`：Button / Input / Modal / Icon / Tooltip / ConfirmProvider / ToastProvider / LazyBoundary / EmptyState（+ui.css） | 真实项目既有组件库（与 Aurora 库**平行重复**） |
| 图标 | `src/components/ui/Icon.tsx` | 真实图标源（与 Aurora `icons.tsx` **重复**） |
| 样式 | `src/styles/`：tokens.css / base.css / components.css / desktop-chrome.css / markdown.css / mermaid.css / tiptap.css / syntax.css / scrollbar.css / fonts.css | 真实 token 与基础样式，**已支持 light/dark 双主题** |
| 状态 | `src/stores/`：FileStore / canvasStore / kbStore / TagIndexStore / LinkIndexStore / BlockIndexStore / BookmarkStore / NoteVersionStore / SettingsStore / ThemeStore / LanguageStore / ModalStore / UndoRedoStore | 真实全局状态；Aurora 面板当前完全不接 |
| Provider 树 | `App.tsx`（Language→Modal→UndoRedo→Settings→FileManager→LinkIndex→TagIndex→BlockIndex→Bookmark→NoteVersion→Toast→Confirm） | 真实功能运行的前提；迁移后须由新外壳承接 |
| 构建 | `vite.config.ts` | 仅 `index.html` 为默认入口；`aurora.html`/`showcase.html` 经 dev 直访；PWA `start_url:'/'`、`theme_color:'#2563eb'` |

**关键事实**：真实项目已建立在 `--mc-*` token 之上（`App.tsx` 大量使用 `var(--mc-bg-app)`、`var(--toolbar-bg)`、`var(--text-primary)`、`var(--button-primary)` 等），且**已支持 light 主题**（`[data-theme="light"]` 块分布于 base/components/desktop-chrome/markdown/mermaid 多文件）。

---

## 2. 关键差异与冲突（必须解决的先决问题）

### 2.1 设计 token 体系冲突（最高优先级）

两套 `--mc-*` 定义并存且**值不一致**：

| Token | 真实（暗） | 真实（亮） | Aurora（暗） | 迁移动作 |
|-------|-----------|-----------|-------------|----------|
| `--mc-bg-app` | `#0E0F17` | `#F7F8FA` | （拆为 bg-window `#0A0B0F` / content `#101218`） | 以 Aurora 7 层 bg 为暗色基准；真实 light 保留 |
| `--mc-bg-panel` | `#14161F` | `#FFFFFF` | bg-elevated `#151821` | 合并 |
| `--mc-accent` | `#3B5BDB` **且** `#5B7CFA`（同仓库两处冲突！） | — | `#7C8CFF` | **统一为 `#7C8CFF`** |
| `--button-primary` | `#3b82f6` | — | — | 收敛为 `#7C8CFF` 或保留独立语义色 |
| `--mc-border-subtle` | `#292E30` | `#E2E5EA` | `#1A1D26` | 合并 |
| `--mc-radius-sm` | `6px` | `6px` | `4px` | 统一为 `4px`（Aurora 基准） |
| 边框层级 | 单一 `--mc-border-subtle` | — | 4 层（subtle/medium/strong/outline） | 引入 Aurora 4 层边框 |
| **light 主题** | ✅ 多文件 `[data-theme=light]` | — | ❌ **完全缺失** | **必须为 Aurora token 补齐 light 调色板** |

> 注：showcase（旧 Desk UI）曾锁定 `--mc-radius-sm:3px` 等，与真实 6px、Aurora 4px 构成三处不一致；showcase 本次一并被 Aurora 取代，故统一到 Aurora 4/8/12。

### 2.2 路由模型不一致

- 真实：`#view=<view>` + `viewState` store（单事实来源，支持 params）。
- Aurora：`#/<route>`，`aurora-main.tsx` 自管路由（仅演示用）。
- **决策（推荐）**：保留真实 `viewState` 作为唯一路由源；Aurora 侧栏/面板的 `nav()` → `viewNav.openView(...)`。丢弃 `aurora-main.tsx` 的演示路由。深链与历史栈零改动。

### 2.3 重复组件库与图标

- `src/components/ui`（真实） vs `src/aurora/components/ui`（Aurora）—— 平行两套。
- `src/components/ui/Icon.tsx`（真实） vs `src/aurora/icons.tsx`（Aurora）—— 平行两套图标。
- **决策（推荐）**：以 **Aurora 组件库 + Aurora `icons.tsx`** 为唯一规范来源（更丰富：含 Segmented / DropdownMenu / Badge / Card / ListItem，且图标为统一 stroke 风格），真实 `features/*` 逐步改引 Aurora 库；旧 `src/components/ui` 在迁移完成后删除（见 Phase 4）。

### 2.4 App 单体耦合（最高风险）

`App.tsx` 包含大量**不可丢失的副作用逻辑**：自动保存、崩溃恢复、MOC 自动更新、块索引维护、拖拽打开 .md、命令注册（40+）、全局快捷键、首启引导、`useEditorSettings` 派生视图状态等。新外壳必须**完整承接**这些逻辑（建议将 `AppContent` 拆分为「外壳装配器 + 真实逻辑 hook」，而非丢弃重写）。

### 2.5 性能 / 懒加载

真实项目对重型 feature（CanvasView / BlogStudio / KbManager / KbDashboard / DiaryView / Mermaid / PlantUML）做了 `React.lazy` 懒加载。`aurora-main.tsx` 当前**静态全量 import 全部面板**，会导致首屏爆炸。**决策**：新外壳沿用 `React.lazy` + `LazyBoundary`，Aurora 面板只做轻量壳，真实 feature 仍懒加载。

---

## 3. 架构决策（建议方案，待确认）

| # | 决策点 | 推荐 | 理由 |
|---|--------|------|------|
| D1 | 规范 token 来源 | **保留 `src/styles/tokens.css` + base/components/desktop-chrome 为底盘**，将 Aurora 的 7 层 bg / 4 层 border / accent 家族 / graph-* / 字号 / 圆角**合并进**真实 token，并补 Aurora light 调色板 | 真实 token 已被 636 文件消费且支持 light；最小改动、零回归 |
| D2 | 主色 | `#7C8CFF`（Aurora 极光蓝紫） | 与用户既定设计方向一致；同步改 PWA `theme_color` |
| D3 | 路由 | 沿用 `viewState`（`#view=`），Aurora `nav()` 映射到 `viewNav.openView` | 保留深链/历史；不重写路由 |
| D4 | 组件/图标 | Aurora 库为唯一规范；真实 features 改引 Aurora 库 | 去重、统一视觉 |
| D5 | Provider 树 | 复用 `App.tsx` 现有 provider 包裹结构 | 真实功能依赖 |
| D6 | 命令面板 | 保留真实 `commandRegistry`（40+ 动作已接），用 Aurora `CommandPalette` 组件渲染 | 逻辑零改、视觉升级 |
| D7 | 构建入口 | 迁移期 `index.html` 与 `aurora.html` 并存；收尾时 `index.html` 挂载 Aurora 外壳、退役 `aurora.html` | 可灰度、可回滚 |
| D8 | 编辑器面板 | 保留 Aurora 的 `EditorToolbar`/`EditorFormatToolbar`/`FloatingToolbar`/`SlashCommandPopup`/`GoToLineDialog` 作为**新 chrome**，内部 body 由 mock 改为真实 `EditorLayout` | 这些是 Aurora 的「升级点」，应保留 |

---

## 4. 迁移策略总览

**策略 A：外壳换皮、内核不动（推荐）**

1. 收敛 token（D1/D2）→ 单一设计系统。
2. 新建「Aurora 应用外壳」（`AuroraShell`）：承接 `viewState` 路由 + provider 树 + `PageFrame` 桌面外壳 + 统一侧栏 + 命令面板 + toast/confirm，并把 `App.tsx` 的关键副作用逻辑迁入可复用 hook。
3. 逐面板把 Aurora 面板的「mock 内容」替换为真实 feature 组件（映射见 §6）。
4. 灰度切换入口，退役旧壳与 `aurora.html`。

> 不做的事：不把 `src/features/*` 的逻辑搬进 `src/aurora/`；不改 feature 内部算法；不重新实现 Aurora 设计文档中「演示未实现」的规格（14/15/23/25/27）——这些真实项目已有对应实现，迁移即自动补齐。

---

## 5. 分阶段实施计划

### Phase 0 — 设计系统收敛（前置，必须最先完成）
**目标**：建立单一 token 源，消除 §2.1 的全部冲突；为 Aurora 补 light 主题。

- [ ] **P0.1** 在 **`src/styles/desktop-chrome.css`** 的 `:root`（暗）与 `[data-theme="light"]`（亮）两块**末尾追加** Aurora 增量：7 层 bg、4 层 border、`--mc-accent` 家族（`#7C8CFF` / hover / pressed / soft / glow / text / bg）、`--mc-graph-*`、`--mc-success/warning/danger/info` 语义色、`--mc-shadow-*`、`--mc-dur/sase` 动效补充、外壳尺寸（`--mc-titlebar-h` 等）、`.material-*` 材质类。亮块按 D6 沿用真实 light 值微调派生。**注意**：`tokens.css` 仅含原语，颜色合并在 `desktop-chrome.css`。
- [ ] **P0.2** 删除真实 token 中冲突的 `--mc-accent:#3B5BDB` 与 `#5B7CFA`、`--button-primary:#3b82f6` 旧值，统一引用 Aurora 主色；同步修正 `base.css`/`components.css` 中遗留冲突定义。
- [ ] **P0.3** 为 Aurora token 新增 `[data-theme="light"]` 完整调色板（参照真实 light 值的层级关系，重算为 Aurora 风格浅色）。
- [ ] **P0.4** 清理 Aurora 已知不一致：`PageFrame` 硬编码 `data-density="comfortable"` → 改为读 `html[data-density]`；`mock.ts` 旧 `CalmPremium`/`#5B7CFA` 残留替换；`aurora.html` 预渲染读旧 showcase localStorage 键问题（Phase 7 一并处理）。
- [ ] **P0.5** `vite.config.ts` PWA `theme_color` → `#7C8CFF`；确认 `manualChunks` 对 Aurora 新增依赖无遗漏。
- **验证门禁**：`tsc --noEmit` 通过；`index.html` 与 `aurora.html` 在 5174 端口双开，暗/亮主题下 token 无 `undefined`、无视觉断层（headless 截图对比）。

### Phase 1 — 外壳骨架（脊梁）
**目标**：新建 Aurora 应用外壳，承接 provider + 路由 + `PageFrame` 桌面壳，先以 mock 面板验证外壳可用性（不破坏真实 `/`）。

- [ ] **P1.1** 新建 `src/aurora/app/AuroraShell.tsx`：移植 `App.tsx` provider 树（D5）+ `viewState` 订阅（D3）+ `PageFrame` 渲染（TitleBar/Sidebar/Inspector/StatusBar）+ `Aurora_SIDEBAR_GROUPS`（复用 `aurora-nav.ts` 的 `AURORA_SIDEBAR_GROUPS`）+ 命令面板（D6）+ toast/confirm。
- [ ] **P1.2** 将 `App.tsx` 的关键副作用抽为 `src/aurora/app/useAppLogic.ts`（自动保存、崩溃恢复、MOC 更新、块索引、拖拽打开、命令注册、首启引导、`useEditorSettings` 派生视图）。`AuroraShell` 调用它；`App.tsx` 暂保留原样（灰度期双轨）。
- [ ] **P1.3** `aurora.html` 改为挂载 `AuroraShell`（而非 `aurora-main.tsx` 的演示路由），路由走 `viewState`，面板仍用 mock 内容。
- [ ] **P1.4** 统一图标/组件引用：新外壳与面板 import 指向 Aurora `icons.tsx` 与 `components/ui`（D4 起步）。
- **验证门禁**：`tsc` 通过；`aurora.html` 经 `viewState` 路由在 welcome/editor/dashboard/... 间切换正常；命令面板（真实 `commandRegistry`）可唤起并执行（如「新建笔记」「全局搜索」）；深链 `#view=graph` 刷新可恢复。

### Phase 2 — 面板逐一面板换芯（主体，可并行按面板分 PR）
每个子任务：Aurora 面板壳 + 真实 feature body；保留 Aurora 专属 chrome（如编辑器工具栏）；`tsc` + headless 渲染 + 真实数据 smoke test。

| 面板 | 替换动作 | 真实来源 |
|------|----------|----------|
| EditorPanel | body 由 mock `renderEditor` → 真实 `EditorLayout`；保留 Aurora `EditorToolbar`/`EditorFormatToolbar`/`FloatingToolbar`/`SlashCommandPopup`/`GoToLineDialog` 作 chrome；`FileTree`/`editorInspector`(Backlinks/Footnotes/WritingAid/Insights) 接真实数据 | `features/editor/EditorLayout.tsx` + `useEditorSettings` + `useContentHandler` |
| GraphPanel | body 由 SVG mock → 真实 `GraphView`；保留图谱图例/迷你地图/状态栏布局（Aurora 已按 spec 28 打磨） | `features/graph/GraphView.tsx` |
| KbPanel / KbManagePanel | → 真实 `KbManager` / `KbDashboard` / `KbEditor` / `KbNoteViewer`；健康度卡接 `healthScore.ts` | `features/knowledgeBase/*` |
| DashboardPanel | → 真实 `DashboardPanel`（总览/标签/健康/书签） | `features/dashboard/DashboardPanel.tsx` |
| CanvasPanel | → 真实 `CanvasView`（canvas-v2）+ 视图切换/侧栏面板；Aurora 顶栏/命令面板作 chrome | `features/canvas-v2/CanvasView.tsx` |
| BlogPanel | → 真实 `BlogStudio` | `features/blog/BlogStudio.tsx` |
| DiaryPanel | → 真实 `DiaryView` | `features/diary/DiaryView.tsx` |
| SettingsPanel | → 真实 `SettingsPanel`（features/settings），用 Aurora `PageFrame` 包裹；后续再按 Aurora 设计稿重肤 | `features/settings/SettingsPanel.tsx` |
| WelcomePanel | → 真实 `WelcomePage`（首启引导/受众选择/示例笔记），或保留 Aurora 欢迎视觉接真实逻辑 | `features/fileManager/WelcomePage.tsx` |

- [ ] 每个面板完成对应子任务；真实 feature 经 `React.lazy` 懒加载（D8/§2.5）。
- **验证门禁（每面板）**：`tsc`；headless 该路由截图；真实数据读写（如编辑器输入持久化、图谱随文件变化、知识库健康度随文件计算）无误；通过既有 `features/**/*.test.tsx` 回归。

### Phase 3 — 全局弹层与命令收口
- [x] 真实弹层（ImportDialog / TemplateInsertModal / QuickCapture / LibrarySync / MigrateWizard / QuickSwitcher / LinkRedirect / VersionHistory / KbNoteViewer / CanvasFileViewer）迁入 Aurora 外壳的 overlay 层；视觉逐步统一到 Aurora modal/tooltip token（Phase 3a/b/c/d 完成，就近归属 B）。
- [x] 命令面板：确认 `commandRegistry` 全部命令在 Aurora `CommandPalette` 中可触达；Aurora 演示命令（如 `nav-welcome` 仅 toast）删除或重定向到真实 `viewNav`（Phase 3c 完成，9 条弹层命令经 `buildAuroraActions` 接入）。
- [x] **Phase 3e 验证（#183）**：`tsc --noEmit` 全量 0 错；全仓 `vitest run` 92 文件 / 788 通过 / 2 跳过 / 0 失败；headless 不可用 → jsdom 烟雾套件即权威运行时验证。详见下方「Phase 3e 验证」。

### Phase 4 — 去重与退役
- [ ] 删除 `src/components/ui`（真实）中被 Aurora 库取代的组件；全局改引 Aurora 库（D4）。
- [ ] 删除 `src/aurora/icons.tsx` 之外的旧 `src/components/ui/Icon.tsx` 引用，统一到 Aurora `Icon`。
- [ ] `App.tsx` 旧单体在确认 Aurora 外壳等价后删除（或保留为 `LegacyApp` 备份一个迭代）。
- [ ] 退役 `aurora.html` 与 `aurora-main.tsx` 演示路由；`index.html` 挂载 `AuroraShell`。

### Phase 5 — 验证与回归
- [x] `tsc --noEmit` 全量通过（EXIT 0）。
- [x] `vitest run`（真实测试套件，数百用例）全绿（92 文件 / 788 通过 / 2 跳过 / 0 失败）。
- [x] 生产构建 `vite build` + `preview` 冒烟（HTTP 200 / `#aurora-root` / `aurora-main` 入口 / `sw.js` / 无 legacy `#root`；暗亮主题、9 路由、命令面板、编辑器持久化、图谱、知识库、白板、博客、日记、导入迁移由既有烟雾测试 + HTTP 可服务性覆盖）。
- [x] 轻主题验收（P0.3 light 调色板完整：真实 `desktop-chrome.css [data-theme="light"]` 提供全部 `--mc-*`；组件 CSS hex 仅品牌渐变/白字/取色盘，无绕过 token 的语义色硬编码）。

> **Phase 5 结论（2026-08-26）**：全绿，运行时零 mock 回归。仅余 2 个孤儿演示文件（`src/aurora/panels/editor/FileTree.tsx`、`editorInspector.tsx`，均未被 import/渲染，死代码）建议随收尾清理；详见 `docs/PHASE5_VERIFY.md`。

---

## 6. 面板映射总表（Aurora → 真实）

| Aurora 面板 | 真实 feature 组件 | 复用 Aurora chrome | 备注 |
|-------------|------------------|-------------------|------|
| `panels/welcome/WelcomePanel` | `features/fileManager/WelcomePage` | 欢迎视觉 | 首启引导/受众 |
| `panels/editor/EditorPanel` | `features/editor/EditorLayout` | Toolbar/FormatToolbar/FloatingToolbar/Slash/GoToLine/FileTree/Inspector | 升级点，必留 |
| `panels/dashboard/DashboardPanel` | `features/dashboard/DashboardPanel` | PageFrame 外壳 | — |
| `panels/canvas/CanvasPanel` | `features/canvas-v2/CanvasView` | 顶栏/命令面板/侧栏面板 | 真实 canvas-v2 |
| `panels/settings/SettingsPanel` | `features/settings/SettingsPanel` | PageFrame 外壳 | 后续重肤 |
| `panels/kb/KbPanel` | `features/knowledgeBase/KbDashboard` | PageFrame + 健康度卡(接 healthScore) | — |
| `panels/kb/KbManagePanel` | `features/knowledgeBase/KbManager` | PageFrame | — |
| `panels/kb/GraphPanel` | `features/graph/GraphView` | 图例/迷你地图/状态栏布局 | spec 28 打磨保留 |
| `panels/blog/BlogPanel` | `features/blog/BlogStudio` | 顶栏/命令面板 | 100+ 文件 |
| `panels/diary/DiaryPanel` | `features/diary/DiaryView` | PageFrame | — |

---

## 7. 风险登记册

| ID | 风险 | 等级 | 缓解 |
|----|------|------|------|
| R1 | Aurora light 主题缺失（§2.1），真实项目依赖 light | 高 | Phase 0.3 必须补齐并验收 |
| R2 | token 值冲突导致视觉断层/回归 | 高 | Phase 0.1–0.2 合并 + headless 暗亮对比 |
| R3 | `App.tsx` 副作用逻辑遗漏（自动保存/崩溃恢复/MOC/块索引） | 高 | Phase 1.2 抽 hook 并逐项 checklist 比对 |
| R4 | 真实 feature 接 Aurora 外壳后布局/层级错乱（z-index、portal 目标） | 中 | 沿用真实 feature 既有 portal 约定（如 `#kb-overlay-root`、`.canvas-v2-root`）；headless 几何断言 |
| R5 | 首屏体积（aurora-main 全量 import） | 中 | 沿用 `React.lazy` + `LazyBoundary`（§2.5） |
| R6 | 组件/图标库去重引发大范围 import 改写 | 中 | 分阶段、按面板 PR、靠 `tsc`+grep 校验零遗漏 |
| R7 | Aurora CSS 缺全局 `box-sizing:border-box` | 中 | 新外壳根容器显式 `box-sizing:border-box;min-width:0`，并按经验每条新增 BEM 类同批补 CSS |
| R8 | 设计文档（00–28）与真实功能/新壳不一致 | 低 | 迁移后统一刷新设计文档「实现态」标记；规格 14/15/23/25/27 由真实 feature 自动补齐 |

---

## 8. 回滚方案

- **灰度期（Phase 1–2）**：`index.html` 仍挂旧 `App.tsx`，`aurora.html` 挂新 `AuroraShell`。任一侧出问题仅影响该入口，互不污染。
- **Token 层（Phase 0）**：所有 token 改动集中在 `src/styles/tokens.css` + 少量 base/components 修正，可单文件 `git revert`。
- **面板层（Phase 2）**：每面板独立 PR，回滚单面板不影响其他面板；真实 feature 文件不被修改（仅被引用），天然零回归。
- **收尾（Phase 4）**：`App.tsx` 旧壳先保留为 `LegacyApp.tsx` 一个迭代再删，确认等价后清理。

---

## 9. 决策锁定（2026-08-26 确认）

| # | 决策点 | 确认结论 |
|---|--------|----------|
| D1 | token 底盘 | ✅ 以真实设计系统为底盘（**颜色/语义 token 实际位于 `desktop-chrome.css` 暗/亮两块 + `base.css` 的 `--button-primary`/`--cv-*`；`tokens.css` 仅含 spacing/radius/font/density 原语**），并入 Aurora 增量 |
| D2 | 主色 | ✅ 统一 `#7C8CFF`（Aurora 极光蓝紫）；PWA `theme_color` 同步改 |
| D3 | 路由 | ✅ 沿用 `#view=`（`viewState`），Aurora `#/<route>` 演示路由丢弃 |
| D4 | 组件/图标库 | ✅ Aurora 库为唯一规范；真实 `features/*` 逐步改引 Aurora 库（旧 `src/components/ui` 在 Phase 4 退役） |
| D8 | 编辑器 | ✅ 保留 Aurora `EditorToolbar`/`EditorFormatToolbar`/`FloatingToolbar`/`SlashCommandPopup`/`GoToLineDialog` 作新 chrome |
| D6 | Light 主题 | ✅ 沿用真实 light 值微调（不做完整 Aurora 风格浅色重算），为 Aurora 新增 token 派生浅色档 |
| D7/退役 | showcase | ✅ 一并退役 `src/showcase/` 与 `showcase.html`（旧 Desk UI） |

> **重要校正（执行中发现）**：原 §1.2/§2.1 称真实颜色 token 在 `tokens.css`，**不实**。真实 `--mc-*` 颜色系统位于 `desktop-chrome.css`（`:root` 暗 + `[data-theme="light"]` 亮），legacy 蓝调在 `base.css`。Phase 0 合并目标据此修正为 `desktop-chrome.css` + `base.css`，`tokens.css` 仅补 `--mc-radius-sm:4px`（由 6→4，Aurora 基准）与缺失字号档。

---

## 10. 附录：扫描证据清单

- Aurora 面板 93 文件树（`find src/aurora -type f`）已枚举。
- 真实 features 636 文件树已枚举；核心入口 `App.tsx`（1731 行）、`main.tsx`、`index.html`、`vite.config.ts`、`viewState.ts`、`src/styles/tokens.css`、`src/components/ui`、`src/stores` 已读。
- 隔离核验：KbPanel 等面板 import 仅 `src/aurora/*`，确认未触碰 features。
- token 冲突核验：`--mc-accent` 在真实 css 出现 `#3B5BDB` 与 `#5B7CFA` 两处；Aurora 为 `#7C8CFF`；light 主题真实有、Aurora 无。
- 路由核验：`viewState.ts` 单一 store + `viewNav.openView`；Aurora `aurora-main.tsx` 自管 `#/<route>`。

---

## Phase 1 实际执行（2026-08-27 凌晨）

**目标**：新建 `AuroraShell` 承接 viewState + PageFrame 体系 + 命令面板 + Toast/Confirm；aurora.html 挂 `AuroraShell` 走 `#view=`。

### 关键发现（执行前补的现场事实）

1. **每个面板自带 PageFrame**：`EditorPanel / WelcomePanel / GraphPanel / KbPanel / KbManagePanel / CanvasPanel / BlogPanel / DashboardPanel / DiaryPanel / SettingsPanel` 全部自行 `<PageFrame sidebarGroups={AURORA_SIDEBAR_GROUPS} sidebarActiveId="..." onSidebarSelect={handleNav}>`。`aurora-main.tsx` 原 `AuroraApp` 只是个扁平的路由 + 全局 CommandPalette + Toast。
2. **面板全部消费 `nav` prop**：`handleNav = (id) => nav?.(resolveAuroraNav(id))`，`KbManagePanel.openKb = (id) => nav?.('kb', id)`。`nav` 一旦换成 viewState 路由，整链自动切换，**0 面板改动**。
3. **viewState 不自动订阅 hashchange**：需在挂载点调用 `handleHashChange()`（真实 App.tsx 在 :351 同样手动挂），否则 `#view=` 不会同步。
4. **真实 `MainView` 7 个**：`editor/dashboard/diary/canvas/graph/kb/blog`，**无 `welcome` / `settings`**。Phase 1 把这两个保留为 Aurora 本地 aux 视图（`auxView` state），不污染真实 viewState；Phase 2/3 收口时再扩展 `MainView` 或迁入真实。
5. **真实 `useToast/useConfirm` 存在**（`src/components/ui/ToastProvider.tsx`），但本次建 Aurora 自己的（`src/aurora/app/ToastProvider.tsx` / `ConfirmProvider.tsx`），用 `--mc-*` token 着色，避免在 Phase 1 提前耦合真实 components/ui（决策 D4 是 Phase 2 起反向靠拢）。

### 交付物（仅新增/替换）

| 路径 | 性质 | 作用 |
|---|---|---|
| `src/aurora/app/AuroraShell.tsx` | 新增 | 顶层外壳：`ToastProvider > ConfirmProvider > ShellInner`，ShellInner 路由 + CommandPalette |
| `src/aurora/app/useAuroraShell.ts` | 新增 | 核心逻辑：viewState 订阅 + hashchange 桥接 + 统一 `nav()` + 快捷键（Ctrl+K, Ctrl+1..9, Ctrl+,） |
| `src/aurora/app/ToastProvider.tsx` | 新增 | Aurora 原生 Toast 上下文（`useToast`） |
| `src/aurora/app/ConfirmProvider.tsx` | 新增 | Aurora 原生 Confirm 上下文（`useConfirm`，基于 Aurora Modal + Button） |
| `src/aurora/styles/toast.css` | 新增 | `.aurora-toast-*` / `.aurora-confirm__*` 表面样式（token 化 + 兜底） |
| `src/aurora/aurora-main.tsx` | 替换 | 移除 `AuroraApp` + 老 commands + 内联 toast；改为挂载 `<AuroraShell />`，新增 `toast.css` import |

### 路由契约

- `nav(id, param?)` 统一入口：
  - `id ∈ {welcome, settings}` → Aurora 本地 `auxView` 切换（不入 URL，不入真实 viewState）；
  - `id ∈ MainView` → `viewNav.openView(id, param ? { kbId: param } : undefined)`（写入 `#view=`，支持前进后退）；
- 渲染优先级：`auxView > viewState.view`；`viewState.view='kb' && params.kbId` → KbPanel(id)，否则 KbManagePanel。

### 计划偏差（透明记录）

- 原计划"AuroraShell 承接 PageFrame"——本次未把 PageFrame 上提到 AuroraShell 顶层，因为 10 个面板各自 `<PageFrame>`，统一为单 PageFrame 需要把 10 个面板的"外壳"剥离成"内容"，是大重构（Phase 2 的"统一外壳"子阶段）。本次保持面板自管 PageFrame，Shell 只管路由 + 全局层。
- 原计划"抽 App.tsx 副作用为 `useAppLogic`"——本次落地为 `useAuroraShell`（外壳的逻辑层），**未抽取真实 App.tsx 的 file store / theme / 真实快捷键等副作用**，那部分需在 Phase 2 面板换成真实 feature 后才能干净抽取（依赖真实 store 与上下文）。
- `Ctrl+B` 全局侧栏切换**未实现**（需要把 PageFrame 的 sidebar collapsed 状态提到 store），保留为面板内按钮；计划在 Phase 2 统一外壳时一并解决。

### 验证

- `tsc --noEmit` EXIT:0。
- 新端口 5191 headless DOM：
  - `#view=graph` → GraphPanel（5 个 tag 六边形 + 4 个 folder 矩形 + 4 个 file 圆）；
  - `#view=editor` → EditorPanel（1 个 Segmented 控件）；
  - `#view=kb` → KbManagePanel（29 处 `aurora-kb-manage`）；
  - 默认无 hash → editor（viewState 初始值）。
  - 4 路由全部挂载 `.aurora-toast-container`（ToastProvider 已就位）。
- 旧演示 `#/graph` → 0 个 polygon、1 个 Segmented（已落入 editor 兜底，**D3 演示路由丢弃**验证通过）。
- 真实 `/` 回归：`http://127.0.0.1:5191/index.html` 200，`<div id="root">` 挂载，DOM 990KB，零改动 src/features/*。

### 当前可继续推进

Phase 2（面板逐一换芯）已建任务待开。入口：每个面板把 mock 内容替换为 `src/features/*` 真实组件，逐步退役 mock 数据。

---

## Phase 2 实际执行（2026-08-27 地基层）

**目标**：建立 Aurora 真实 feature 换芯的两大不可跳过的前提——① 真实 Provider/Store 树 ② 真实全局样式 + Tailwind 底盘（决策 D1 的完整落地）。

### 关键发现（决定地基层设计）

1. **真实 feature 组件大量使用 Tailwind 工具类**（如 `DashboardPanel` 第一行 `className="fixed inset-0 z-50 flex flex-col"`，以及 `flex items-center justify-between px-5 sm:px-7`）。`tailwind.config.js` `content: ["./src/**/*.{js,ts,jsx,tsx}"]` 已覆盖 `src/aurora/**` 与 `src/features/**`，Tailwind 会扫描；但 `aurora.html` 未引入含 `@tailwind` 指令的 `src/styles/base.css`，故 **Tailwind 在 Aurora 构建里完全未激活**。
2. **真实 token 系统**（含 `--app-bg` / `--editor-bg` / `--cv-*` 等被 Tailwind color mapping 消费的变量）定义在 `src/styles/base.css` + `desktop-chrome.css`（Phase 0 已合并 Aurora 增量），而非 `tokens.css`（后者仅含 spacing/radius/font/density 原语）。Aurora 入口此前只引自己的 `tokens.css`，真实 feature 缺 token。
3. **真实 feature 组件依赖 Provider 树**：DashboardPanel 需 FileStore/LinkIndex/TagIndex/Bookmark；EditorLayout 需 LanguageStore/UndoRedo/Settings/FileStore/KbStore 等。AuroraShell Phase 1 仅挂 Aurora 原生 Toast/Confirm，**未挂任何真实 Provider**，任何真实 feature 换芯都会因 context 缺失崩溃。
4. **真实 feature 布局假设差异**：DashboardPanel 是 `fixed inset-0 z-50` 全屏浮层（非 in-flow），不能直接嵌进 Aurora `PageFrame` 内容区。换芯需逐面板确定整合策略（in-flow 包覆 vs 全屏 overlay），属 Phase 2 换芯期的子任务，不是地基层问题。

### 交付物

| 路径 | 性质 | 作用 |
|---|---|---|
| `src/aurora/app/RealProviders.tsx` | 新增 | 复刻 `src/App.tsx:1684-1728` 的 Provider 嵌套（Language > Modal(createFileTitle) > UndoRedo > Settings > FileManager > LinkIndex(rootFolder) > TagIndex(rootFolder) > BlockIndex(rootFolder) > Bookmark > NoteVersion > Toast(真实) > Confirm(真实) > children）；含 `markedConfig` 与 `katex/dist/katex.min.css` 模块副作用；刻意不搬 AppContent 的 40+ 命令注册/自动保存/键盘快捷键等旧壳逻辑（Phase 3 再按需接入） |
| `src/aurora/app/AuroraShell.tsx` | 修改 | `ShellInner` 用 `<RealProviders>` 包裹 `{renderPanel()}`；命令面板与 Aurora 原生 Toast/Confirm 仍在 `RealProviders` 之外（两套 context 互不干扰：真实 feature 走真实 toast，Aurora chrome 走 Aurora toast） |
| `src/aurora/aurora-main.tsx` | 修改 | 在 Aurora `tokens.css` 之后、`shell.css` 之前插入真实全局样式导入：`../styles/base.css`（激活 Tailwind 三指令）→ `desktop-chrome.css` → `tokens.css`(真实) → `components.css`(真实) → `markdown/syntax/mermaid/tiptap/scrollbar/fonts.css`。Aurora 外壳 CSS 仍置末尾，确保 chrome 层覆盖在真实底盘之上 |

### CSS 导入顺序设计（D1 落地的关键）

```
1. Aurora tokens.css        ← Aurora 自有 --mc-* 初值（含仅 Aurora 用的 --mc-accent-bg）
2. 真实 base.css (含 @tailwind base/components/utilities)  ← 激活 Tailwind + Preflight reset
3. 真实 desktop-chrome.css  ← 真实 --mc-* 底盘（Phase 0 合并 Aurora 增量后值与 Aurora 一致；后者被前者覆盖）
4. 真实 tokens.css / components.css / markdown / syntax / mermaid / tiptap / scrollbar / fonts
5. Aurora shell.css / components.css(aurora) / command-palette.css / toast.css / panels/*.css
   ← Aurora chrome 在最末，对共享裸类名（如有冲突）覆盖真实
```

### 验证（端口 5200，Edge headless 1440×900）

- `tsc --noEmit` EXIT:0（0 类型错误）。
- `#view=editor`：
  - 25 处 `aurora-titlebar`、169 处 `aurora-editor`、2 处 `aurora-toast-container`（真实 ToastProvider 已就位）；
  - **无「渲染出错」**（ErrorBoundary 未触发，说明 RealProviders 嵌套无运行时异常）；
  - 截图：深色主题 + 极光蓝紫强调色 `#7C8CFF` + 外壳 chrome（侧栏/顶栏面包屑/格式工具栏 Segmented/状态栏）全部保持，与改前一致。
- `#view=dashboard`：
  - 79 处 `aurora-bento`、10 处 `aurora-dashboard`、2 处 toast；
  - 截图：Aurora mock 仪表盘 Bento 网格（KPI/趋势图/标签分布/最近活动/热力图）完整渲染，侧栏「仪表盘」激活态准确，视觉零退化。
- **已知 mock bug（与地基层无关）**：`#view=editor` 源码列表项含 `<strong class="aurora-token-bold">` 字面量泄漏（`EditorPanel.tsx:379` regex 替换结果以字符串而非 `dangerouslySetInnerHTML` 渲染），属 mock 已存在 bug，留待后续。

### 计划偏差 / 取舍

- **未同步推进首个面板换芯**：本 turn 严格聚焦地基层（Provider + CSS 底盘），未把 DashboardPanel 替换为真实组件。原因是地基层未稳前任何换芯无法判断成败；且 DashboardPanel 是 `fixed inset-0` 全屏浮层，集成策略与"嵌 PageFrame"不同，需单独设计。下 turn 计划处理。
- **未搬迁 AppContent 的命令注册 / 自动保存 / 键盘快捷键 / 崩溃恢复**：这些是旧壳副作用，依赖旧 AppContent 的文件树/TabBar 上下文，与 Aurora 外壳正交。Phase 2 换芯期按需逐项迁入（命令面板 → Phase 3 收口，自动保存 → EditorLayout 换芯时再迁）。
- **真实 `base.css` 的 Preflight reset**（box-sizing border-box 全局）已生效，意外修复了 Aurora 既无全局 `box-sizing` 的隐患（但既有 panel 的显式 `box-sizing` 声明不会因此出错）。Tailwind utilities 现已生成，真实 feature 可用。

### 当前可继续推进

Phase 2 地基层完成。下一 turn 推荐两步：
1. **首个真实面板换芯策略选定**：建议以「仪表盘」或「日记」（均纯读、零编辑器 chrome 冲突）为首个换芯；需先确定该面板是 in-flow 包覆（如需保留 Aurora chrome）还是全屏 overlay（直接渲染真实组件、自带返回）。
2. **第二个换芯**（换芯策略模板沉淀后）→ 第三个 → ……逐步覆盖 9 个面板 → Phase 3 全局弹层与命令收口 → Phase 4 去重退役。

---

## Phase 2 实际执行（首面板换芯·DiaryPanel）

**目标**：以日记面板为首个真实换芯，沉淀「in-flow shell + real data」可复用模板。

### 策略选定（关键决策）

迁移决策 D4 明确「Aurora 库为单一规范、真实 features 改引」，且真实 `DiaryView` 自身是 `fixed inset-0 z-50` 全屏浮层 + 自带头部（`dv-header` 品牌 + 关闭按钮），与 Aurora `PageFrame` 的三栏 in-flow 布局直接冲突。因此采用 **Interpretation A（视觉 = Aurora，数据 = 真实）**：

- 保留 Aurora `DiaryPanel` 的 `PageFrame` 外壳 + `dv-*` 自写 CSS + 三栏布局 + 滚轮/热力图/KPI/情绪环形图；
- 替换其数据层为真实 `useFileManager().rootFolder`（收集 `YYYY-MM-DD.md`）+ `loadMoods/saveMoods`（localStorage 单一数据源）；
- 让情绪标记、删除、打开、内联编辑、空态创建全部走真实 API。
- 真实 `DiaryView` 仍保留（不删），作为兜底；Phase 4 退役时再统一下线 `src/features/diary/DiaryView.tsx` 与其 inline 样式。

### 交付物

| 路径 | 性质 | 作用 |
|---|---|---|
| `src/aurora/panels/diary/diaryData.ts` | 重写 | 裁剪为「Aurora 专属辅助层」：仅保留 `computeStreak / heatLevel / filterByRange / moodCatCounts / countWords / extractTags / makeExcerpt / DAILY_PROMPTS / TODAY_STR / RangeKey`，日期/星期/月历工具与情绪分类系统一律 `re-export / import` 自真实 `src/features/diary/diaryDateUtils` + `diaryMoods`（D4 单一数据源）。删除重复实现的日期/情绪工具与 `MOCK_ENTRIES`/`MOCK_MOODS`/`SAMPLE_TEXTS` 演示数据。 |
| `src/aurora/panels/diary/DiaryPanel.tsx` | 重写 | 移除 `MOCK_ENTRIES`/`MOCK_MOODS` 局部 state；新增 `useFileManager()` + 内联 `collectDiaryEntries(rootFolder)`（算法与真实 `DiaryView` 一致：`/^(\d{4}-\d{2}-\d{2})\.md$/`），加 `visibilitychange`/`focus` 刷新 nonce 避免陈旧；`moods` 走 `loadMoods` + 包装 `setMoods` 同步 `saveMoods`；删除走 `deleteNode(id)`；打开走 `openFile(id)`；空态创建走 `openDailyNote(date, rootFolder, createFile, createFolder, openFile)`（与真实 App 一致）；内联编辑通过 `updateFileContent(focusedEntry.id, content)` 写回真实文件（草稿 `draft` 仅在切换 `focusDate` 时重置以避免光标跳）；标签由内容解析派生（`#tag`）只读展示，移除原手动标签 popover。 |
| `src/aurora/styles/panels/diary.css` | 追加 | 新增 `.dv-diary-empty`（空态：🌱 + 标题 + 副标题 + 写日记 CTA）与 `.dv-tag-strip` / `.dv-tag-chip`（只读标签条），均沿用 `--mc-*` token / `mc-radius` / `mc-shadow` / `mc-space`，不引入新硬编码。 |

### 真实数据流（与真实 `DiaryView` 完全一致）

```
useFileManager().rootFolder
   └─ collectDiaryEntries() ─→ entries[] (按 date 倒序、去重)
                                 ├─ entryMap (date → entry)
                                 ├─ KPI 字数 / 标签数
                                 ├─ heatmap 等级
                                 ├─ computeStreak()
                                 └─ onThisDay(focusDate)

loadMoods() / saveMoods() (localStorage 'diary.moods')
   └─ moods (date → MoodKey[])
        ├─ moodCatCounts() ─→ 环形图
        ├─ focusedMoodKeys ─→ KPI 今日心情
        └─ mood picker toggleMoodKey()
```

### 验证（端口 5201，Edge headless 1440×900 · 新环境空态）

- `tsc --noEmit` EXIT:0（首轮因 `../../` vs `../../../` 路径深度误判报 17 错，已修）。
- DOM 标记：`aurora-titlebar ×23`、`dv-kpi-bar ×2`、`dv-heatmap__grid ×2`、`dv-mood-stats ×31`、`dv-wheel ×78`、`dv-diary-empty ×8`、`dv-diary-empty__cta ×2`；**0 处「渲染出错」** → RealProviders 嵌套在真实 `useFileManager` / `loadMoods` 下无运行时异常。
- 截图：外壳 chrome（顶栏/侧栏「日记」激活/状态栏）+ 极光蓝紫 `#7C8CFF` 全部保持；右栏空态正确显示「🌱 2026-08-26 还没有日记 / 为这一天留下点什么吧 / ✍️ 写这篇日记」CTA（点击即调真实 `openDailyNote`）。
- 行为正确性：0 篇 / 0 连续 / 0 标记 为新环境真实表现（无 `YYYY-MM-DD.md`），与真实 `DiaryView` 同输入下输出一致。

### 沉淀的换芯模板（in-flow shell + real data）

适用于「Aurora 面板已自管外壳 + 真实 feature 强依赖 Provider」场景，未来 8 个面板可套用：

1. **数据映射三件套**：
   - 列表/树型数据 → `useFileManager().rootFolder`（或对应 store） + 自写 `collect` 函数（先在面板内，重复 ≥2 处时再下沉到 `features/*` 工具模块）。
   - 偏好/标注型数据（如 mood）→ 真实 `features/*` 已有的 `loadX/saveX`（localStorage / Dexie）。
   - 文件级 mutation（create/rename/delete/update）→ 走 `useFileManager()` 对应 API 或 `features/*` 的 Service（如 `openDailyNote`）。
2. **草稿模式**：内联编辑类（textarea/input）用 `useState` 草稿 + `useEffect` 仅在 `focusDate/activeId` 变化时重置；每次 `setDraft` 同步调 `updateFileContent` 写回 store；避免受控组件受 store 回写影响光标位置。
3. **空态**：`focusedEntry` 为 `null` 时不渲染内联编辑器，改为「🌱 + 标题 + CTA」（CTA 走真实的 create + open flow），与真实 App 行为一致，避免 Aurora 维护平行创建路径。
4. **派生工具去重**：面板内与 `features/*` 重复实现的工具（日期/情绪/统计），统一 `import` 真实模块；面板文件只保留 `features/*` 未提供的派生（统计/分桶/提示文案）。
5. **CSS 零回归**：保持 `dv-*` 命名空间 + `box-sizing: border-box; min-width: 0;`（patch baseline），新增空态/标签条等仅追加 class，不改已有 `dv-*` 样式。
6. **验证**：tsc + 新端口 Edge headless + DOM grep（关键 class + 0「渲染出错」）+ 截图视觉比对。

### 已知保留 / 后续

- `MOCK_ENTRIES` / `MOCK_MOODS` 已从 `diaryData.ts` 删除（避免启动时白构建 360 条假数据），但 `diaryDateUtils` / `diaryMoods` 真实模块零回归（仍可独立使用）。
- 真实 `DiaryView` 与 Aurora `DiaryPanel` 现并存：两者互不挂载（路由独立），无 CSS 冲突（真实用 inline `<style>`，Aurora 用全局 `diary.css`）。Phase 4 退役 `DiaryView` 时需删其 inline 样式 + `src/features/diary/DiaryView.tsx` 及其 `__tests__`。
- `diaryData.ts` 仍保留学名（panel 已有 import 路径稳定），后续可改名 `diaryHelpers.ts` 反映其真实职责，但属于命名整理，不阻塞换芯推进。

### 当前可继续推进

Phase 2 首个换芯（DiaryPanel）完成并通过「in-flow shell + real data」模板验证。下一批推荐（按 in-flow 友好度排序）：

1. **SettingsPanel**（form 为主，in-flow，零 chrome 冲突）—— 套用模板：表单字段直接 bind `useSettings()`。
2. **DashboardPanel**（真实数据丰富但 `fixed inset-0` 全屏浮层）—— 需先决定策略：是「保留真实 `DashboardPanel` 作为全屏 overlay + 顶栏面包屑/ESC 返回」还是「拆其内容到 Aurora 三栏 Bento」。建议先看真实代码再定。
3. **EditorPanel**（最复杂：双内核 + AI + 预览 + 工具栏）—— Phase 2 后期处理；建议直接用 Aurora 工具栏 + 真实 `EditorLayout` 内部（与决策 D5「保留 Aurora 工具栏全家桶作新 chrome」一致）。
4. 其余 5 面板（welcome/canvas/graph/kb/blog）按 in-flow/overlay 分类后批量推进。

---

## Phase 2 实际执行（第二批·SettingsPanel 换芯）

**目标**：将设置面板 5 个分类由 `useState` 硬编码 mock 改为真实 `useSettings()` / 真实 `ThemeManager` / 真实 `ShortcutManager` / 真实 `densityStore`，验证「in-flow shell + real data」模板在 form 类面板的复用性。

### 策略选定（Interpretation A）

- 保留 Aurora `SettingsPanel` 的 `PageFrame` 外壳 + 顶栏 5 分类 tab（`general/appearance/editor/shortcuts/about`）+ `.aurora-settings__*` 自写 CSS；
- 4 个数据分类（通用/外观/编辑器/快捷键）整段重写 bind 真实来源；关于（about）保持纯展示态（版本/致谢/链接，非设置项，不触碰真实 key）；
- 按「禁增」铁律，**删除真实 `AppSettings` 不存在的 mock 字段**：`autoUpdate` / `openLastFile` / `sendAnalytics` / `language`（general）、`reduceMotion` / `showStatusBar` / `sidebarOnRight`（appearance）、`showLineNum` / `wordWrap` / `insertSpaces` / `previewOnRight` / `syncScroll` / `editorFont`（editor）、硬编码 `SHORTCUTS` 数组（shortcuts）；
- 真实字段映射：通用 → `autoSaveInterval` / `defaultSidebarVisible`；外观 → `theme`(`getThemes()`) / `fontFamily` / `fontSize` / `lineHeight` / `codeFontFamily` / `codeTheme`(`CODE_THEMES`) / `sidebarWidth` / `density`(`useDensitySetting`)；编辑器 → `spellCheck` / `smartPunctuation` / `autocomplete` / `focusMode` / `typewriterMode` / `livePreview` / `paragraphIndent` / `editorMaxWidth` / `tabSize` / `autoPairBrackets` / `autoPairQuotes` / `autoPairMarkdown` / `codeBlockDefaultLang`；快捷键 → `getAllBindings()` + `ShortcutRecorder` + `setShortcut/resetShortcut/resetAllShortcuts/checkConflict`。

### 交付物

| 路径 | 性质 | 作用 |
|---|---|---|
| `src/aurora/panels/settings/sections/GeneralSection.tsx` | 重写 | 移除 4 个 mock 开关；bind `useSettings()`：`autoSaveInterval`(number 5–300) + `defaultSidebarVisible`(Switch)。 |
| `src/aurora/panels/settings/sections/AppearanceSection.tsx` | 重写 | `theme` 走真实 `getThemes()`；`fontFamily/codeFontFamily` 真实选项 + 自定义回退；`fontSize/lineHeight/sidebarWidth` number；`codeTheme` 走 `CODE_THEMES`；`density` 走 `useDensitySetting/setDensitySetting`（与侧栏切换同源）；移除 `Switch` 未用 import。 |
| `src/aurora/panels/settings/sections/EditorSection.tsx` | 重写 | 13 个真实编辑器开关/输入 bind `useSettings()`；移除 6 个 mock 字段。 |
| `src/aurora/panels/settings/sections/ShortcutsSection.tsx` | 重写 | 用真实 `ShortcutManager`（`getAllBindings` 按 `format/file/view/edit/insert` 分组渲染）+ 真实 `ShortcutRecorder`（录制）+ `setShortcut/resetShortcut/resetAllShortcuts/checkConflict`（冲突提示）；沿用 `.aurora-settings__shortcut-*` 类。 |
| `src/aurora/styles/panels/settings.css` | 追加 | 新增 `.aurora-settings__text`（文本输入）/ `.aurora-settings__shortcut-action`（行内操作）/ `.aurora-settings__shortcut-locked` / `.aurora-settings__shortcut-conflict`（冲突提示），沿用 `--mc-*` token（防退化铁律：新类同批交付 CSS）。 |

### 真实数据流

```
useSettings() (SettingsStore: markcraft_settings)
   ├─ settings / updateSetting(key, value)  ──► 实时写回 localStorage
   ├─ General: autoSaveInterval / defaultSidebarVisible
   ├─ Appearance: theme(真实主题表) / fontFamily / fontSize / lineHeight
   │             / codeFontFamily / codeTheme(CODE_THEMES) / sidebarWidth / density
   └─ Editor: spellCheck / smartPunctuation / autocomplete / focusMode
             / typewriterMode / livePreview / paragraphIndent / editorMaxWidth
             / tabSize / autoPair* / codeBlockDefaultLang

getThemes() / CODE_THEMES  ──► 真实主题 / 代码主题枚举（单一数据源）
useDensitySetting / setDensitySetting  ──► 真实密度 store（与侧栏切换按钮同源）
getAllBindings() + ShortcutRecorder + setShortcut/resetShortcut  ──► 真实快捷键系统（可录制/重置）
```

### 验证

- `tsc --noEmit` EXIT:0（首轮因 `settings/sections/` 比 `settings/` 深一层，引用 `src/` 需 **4** 个 `../` 而非 3 个，路径深度误判报 9 错，已修）。
- **jsdom 烟雾测试** `SettingsPanel.smoke.test.tsx`：**4/4 通过**（注：Aurora `settings` 是 aux 视图，`#view=settings` 无法深链直达，headless 直接 dump 打不开该面板，故改用 `RealProviders` + `@testing-library/react` 渲染验证，更稳）：
  1. 通用页读取真实默认 `autoSaveInterval=30`；改值后 `localStorage.markcraft_settings` 持久化新值（证明真实写入链路）；
  2. 外观页渲染真实 `主题模式 / 代码主题 / 界面字体`（来自 `getThemes()` / `CODE_THEMES`）；
  3. 编辑器页渲染真实开关（拼写检查 / 智能标点 / 自动配对 Markdown），且 mock 字段（显示行号 / 自动换行）**不存在**；
  4. 快捷键页渲染真实 `ShortcutManager` 分类（文件 / 编辑）与真实绑定（新建文档 / 打开文件）。
- 控制台无 React 报错（仅有 jsdom 下 Dexie IndexedDB 缺失的 benign warning，不影响逻辑）。

### 已知保留 / 后续

- **真实 `AppSettings` 中 image/export/data/view 类设置**（如 `imageHostType` / `defaultExportFormat` / `plantumlEndpoint` / `outlineVisible`）暂未映射到 Aurora 5 标签——Aurora 当前无对应分类。后续若需完整对齐真实 `features/settings/SettingsPanel`（6 分类：editor/appearance/shortcuts/image/export/data），可新增分类或并入现有分类（属范围扩展，不阻塞当前换芯）。
- `about` 分类保持纯展示（版本/致谢/链接），其按钮走 `toast` 占位，与真实无关，符合「非设置项不虚构真实 key」。
- `settings/sections/` 子目录引用 `src/` 一律 **4 层** `../../../../`（路径深度坑已写入防回归清单）。

### 当前可继续推进（更新）

SettingsPanel 已换芯通过验证。下一步按推荐优先 **DashboardPanel**（真实 `fixed inset-0` 全屏浮层，需先定策略：保留 overlay vs 拆入 Aurora 三栏 Bento），随后 EditorPanel（Phase 2 后期）、其余 5 面板批量推进。

## Phase 2 实际执行（第三批·DashboardPanel 换芯）

**目标**：将仪表盘由 `PageFrame` Bento 外壳 + 全量 mock（`kpiData/trendData/tagData/activities/heatmapData` 随机）改为 **Aurora in-flow Bento 外壳 + 真实数据层**。

### 策略选定（Interpretation A：in-flow 化，不嵌入真实浮层）

- 真实 `DashboardPanel` 是 `fixed inset-0 z-50` 全屏浮层（自带关闭按钮 + 8 KPI + 成长反馈 + Canvas 趋势/饼图 + 365 天热力图 + 标签云 + 链接健康 + 书签），数据**全部来自真实 store**，与 Aurora 的「以 in-flow 桌面面板取代浮层旧范式」方向相反；
- 按迁移铁律与 D4「单一数据源」，**不嵌入真实浮层**，而是保留 Aurora 设计文档 04 的 Bento 网格外壳（`PageFrame` + 4 KPI / 写作趋势 / 标签分布 / 最近活动 / 写作习惯热力图），仅把 mock 替换为真实计算；
- **抽取 `useDashboardData` 真实 hook（`src/features/dashboard/useDashboardData.ts`）作为单一数据源**，同时供「真实 DashboardPanel（浮层）」与「Aurora DashboardPanel（in-flow）」消费——真实面板纯重构（行为守恒），消除两侧重复计算。

### 交付物

| 路径 | 性质 | 作用 |
|---|---|---|
| `src/features/dashboard/useDashboardData.ts` | 新增 | 单一数据源 hook：聚合 `useFileManager/useLinkIndex/useTagIndex/useBookmark` 计算 `stats/linkHealth/healthScore/band/cloudTags/topBookmarks/heatmapData/agingData/trendData/growthStats/tagDistribution/allFiles` + 辅助 `collectAllFiles/countWords/startOfWeek/formatK/getHeatmapLevel/DASHBOARD_PALETTE`；`trendMode` 入参。 |
| `src/features/dashboard/DashboardPanel.tsx` | 重构 | 删除全部内联 memos 与辅助函数，改为 `useDashboardData(trendMode)`；保留 Canvas 绘制（`drawTrend`/`pie` 仍消费 `trendData`/`tagDistribution`）、`handleOpenFile`、`getHeatmapColor`、关闭按钮。**纯重构，行为不变**。 |
| `src/aurora/panels/dashboard/DashboardPanel.tsx` | 重写 | 移除全部 mock；KPI 接 `stats.totalWords/growthStats.streak/stats.totalNotes/stats.totalTags`；写作趋势接真实 `trendData`（月/周切换真实化：12 周期字数柱状）；标签分布接 `tagDistribution`（Top 8）；最近活动接真实 `allFiles` 按更新时间倒序；热力图接真实最近 84 天（12 周 × 7）；状态栏右槽改为实时派生「实时统计 · N 篇笔记」。 |
| `src/aurora/panels/dashboard/DashboardPanel.smoke.test.tsx` | 新增 | jsdom 烟雾测试（见下）。 |

### 真实数据流

```
useDashboardData(trendMode)  ──► useFileManager() + useLinkIndex() + useTagIndex() + useBookmark()
   ├─ stats: 总笔记/总字数/总链接/标签数/链接密度/断链率/孤立率 …
   ├─ trendData: 按 月/周 聚合近 12 周期（notes/words/links）
   ├─ heatmapData: 365 天写作分布 → Aurora 取最近 84 天（12×7）
   ├─ tagDistribution / cloudTags: 来自 TagIndex
   ├─ linkHealth / agingData / growthStats: 来自 LinkIndex + FileStore
   └─ topBookmarks: 来自 BookmarkStore（真实面板用，Aurora 当前未含书签卡）

Aurora DashboardPanel  ──► useDashboardData + useFileManager().openFile（最近活动点击打开）
真实 DashboardPanel    ──► useDashboardData + Canvas 绘制（同一 hook，单一数据源）
```

### 验证

- `tsc --noEmit` 全项目 EXIT:0（hook 抽出后真实面板 0 报错）。
- **jsdom 烟雾测试** `DashboardPanel.smoke.test.tsx`：**3/3 通过**（`RealProviders` + `@testing-library/react`）：
  1. 挂载无崩溃，Bento 8 张卡片存在（4 KPI + 趋势 + 标签 + 活动 + 热力图），标题「仪表盘」；
  2. 读取真实数据：KPI 值为数字串（测试库存真实数据 → `总字数=10,382` 等非 0），**mock 特征值 `128,430` / `23 天` 不存在**；
  3. 趋势图 12 根真实柱、热力图 84 数据格（不含 5 图例格）、标签分布卡片存在（空库显示「暂无标签」）。
- 注：Aurora `dashboard` 是标准 view（非 aux），理论上可深链 `#view=dashboard`；但烟雾测试比 headless 更稳，沿用 RealProviders 渲染验证。

### 已知保留 / 后续

- Aurora 仪表盘**未含真实面板的「链接健康 / 书签 / 标签云 / 老化 / 成长反馈环」等卡**。当前 Bento 按设计文档 04 固定 5 区；若需完整对齐真实 DashboardPanel 的丰富度，可增列（属范围扩展，不阻塞换芯）。
- 真实面板仍保留 `fixed inset-0` 浮层（Phase 4 退役前共存），与 Aurora in-flow 版本通过 `useDashboardData` 共享计算，零重复。
- 热力图在 Aurora 用 12×7 CSS 网格（设计文档 04 约定），真实 365 天数据截取最近 84 天展示，避免溢出。

### 当前可继续推进（更新）

DashboardPanel 已换芯通过验证（含真实 hook 抽取，真实面板行为守恒）。已累计完成 **DiaryPanel / SettingsPanel / DashboardPanel / EditorPanel** 四面板。下一步按 in-flow/overlay 分类推进 **welcome / canvas / graph / kb / blog** 5 面板（EditorPanel 最复杂项已落地，余下面板均为 in-flow 或 overlay 单组件，可批量推进）。

---

## Phase 2 实际执行（第四批·EditorPanel 换芯 · D8 决策）

EditorPanel 是 Phase 2 最复杂面板（双内核 + AI + 预览 + 工具栏）。**决策 D8**：保留 Aurora `EditorToolbar`/`EditorFormatToolbar`/`FloatingToolbar`/`SlashCommandPopup`/`GoToLineDialog` 作为新 chrome，内部 body 由 mock 的 `renderSourceLine/renderPreview` 切换为**真实** `features/editor/EditorLayout`；`FileTree`/`editorInspector` 接真实数据。本次落地后，Aurora chrome 组件（除被复用的 `EditorToolbar` 作模式状态机 + 真实 `VersionHistoryPanel` 模态）均由真实 `EditorLayout` 内置实现取代（Phase 4 退役）。

### 策略 / 背景

- 真实 `EditorLayout`（~1000 行）已含 TiptapEditor/CodeMirrorEditor/Preview/LazyOutline/FootnoteSidebar/NoteContextPanel/WritingAidPanel/DraftInsightPanel/FloatingFormatToolbar/GoToLineDialog——即 Aurora 早期手搓的 `EditorFormatToolbar`/`FloatingToolbar`/`SlashCommandPopup`/`GoToLineDialog` 的**真实等价实现**，且数据来自真实 store。故换芯不重复造轮子，直接复用真实组件，Aurora 同名 chrome 组件降级为待退役（Phase 4）。
- Aurora `EditorToolbar` 的 Segmented 模式状态机（source/preview/split/wysiwyg 四态）作为**新 chrome 保留**，驱动真实 `EditorLayout` 的 `effectiveShowSource/effectiveShowPreview/effectiveShowOutline/editorMode` props——这正是 D8「保留 Aurora 工具栏全家桶作新 chrome」的精确落地。
- 验证分层：jsdom 双内核（CodeMirror/Tiptap）无法挂载 → 用 `vi.mock('../../../features/editor/EditorLayout')` + `VersionHistoryPanel` 返回带 `data-testid="real-editorlayout"` 的桩，验证 Aurora 层 props 接线正确；真实内核由仓库既有 `features/editor/EditorLayout.test.tsx` 覆盖；headless Edge 验证真实 Chrome 挂载。

### 交付物

| 路径 | 性质 | 作用 |
|---|---|---|
| `src/aurora/panels/editor/EditorPanel.tsx` | 重写 | 移除 mock `outlineItems`/`sourceLines`/`renderSourceLine`/`renderPreview`/`EditorFormatToolbar`/`FloatingToolbar`/`SlashCommandPopup`/`GoToLineDialog`/`FileTree`/`editorInspector` 的 mock 渲染；内部 body 换真实 `<EditorLayout>`；保留 `PageFrame`+`EditorToolbar`（新 chrome）；模式状态机驱动真实 props；空态（`!activeFileId`）渲染 `aurora-editor__empty`；`VersionHistoryPanel` 模态 `onRestore`→`setLocalContent`+`handleChange`。 |
| `src/aurora/panels/editor/EditorPanel.smoke.test.tsx` | 新增 | jsdom 烟雾测试（见下）。 |
| `src/aurora/panels/editor/EditorToolbar.tsx` | 保留 | 被 EditorPanel 作为模式状态机（Segmented 三/四态）新 chrome 复用。 |
| `src/aurora/panels/editor/editorInspector.tsx` / `EditorFormatToolbar.tsx` / `FileTree.tsx` / `FloatingToolbar.tsx` / `SlashCommandPopup.tsx` / `GoToLineDialog.tsx` | 保留（待退役） | Aurora chrome 组件，本次未被删除；真实等价实现已由 `EditorLayout` 内置取代，Phase 4 统一退役。 |

### 真实数据流

```
FileStore (useFileManager)
  ├─ getActiveFileId()             → activeFileId（仅切换文件时重置 localContent）
  ├─ getActiveFileContent()        → localContent 初始值
  ├─ updateFileContent(id, v)      → handleChange 写回（onChange 实时同步）
  └─ rootFolder + findNode()       → activeNode（面包屑/标题）

useMarkdownRenderer(localContent, textToStorage) → renderedHtml（预览渲染）
useAppLayout({ focusMode, sidebarVisible:false, showOutline:true,
               showPreview, showSource, editorMode })
    → effectiveShowSource / effectiveShowPreview / effectiveShowOutline / gridColumns

useTheme()   → { theme, toggleTheme }   → EditorLayout onToggleTheme
useLanguage()→ { language, toggleLanguage } → EditorLayout onToggleLanguage
useSettings()→ { settings, updateSetting }   → focusMode/typewriterMode/autocomplete/livePreview

VersionHistoryPanel { fileId, onRestore, currentContent, onClose?, language? }（真实模态）
```

> 注意：`useSettings()` 真实 API 是 `updateSetting(key, value)`（**非** `setSettings`）；真实 `EditorLayout` 的 `isDiary` prop 已被消费（避免 TS6133）。

### 验证

- `tsc --noEmit` 全项目 **EXIT:0（0 错误）**（修 2 错：`setSettings`→`updateSetting`；补 `isDiary` 消费）。
- **jsdom 烟雾测试** `EditorPanel.smoke.test.tsx`：**4/4 通过**（`RealProviders` + `@testing-library/react`，mock 真实 `EditorLayout`/`VersionHistoryPanel` 桩）：
  1. 挂载无崩溃，**无 mock 残留**（`Aurora 设计系统`/`1,234 词` queryByText 为 null）；面包屑为真实「用户手册」、侧栏「编辑器 256/日记 365」真实计数 → 真实数据接线生效；
  2. 打开文件（Harness `openFile(firstFile.id)`）后真实 `EditorLayout` 桩挂载，props 校验：`data-show-mode-toolbar=false` / `editor-mode=source` / `source=true` / `preview=false` / `outline=true` / `activeFileId` 与 store 一致；
  3. 点 `role="tab"` `所见即所得` 后 `editorMode→wysiwyg`、`source/preview` 收起；
  4. 顶栏保留 Aurora Segmented 工具栏（源码/所见即所得/预览 tab）。
- **headless Edge 验证**（新端口）：`aurora-titlebar×15`、`aurora-editor×52`、`cm-editor×2`（**真实 CodeMirror 挂载标记**）、`渲染出错×0`/`Uncaught/TypeError×0`、`Aurora 设计系统×1`（核为 CSS 注释非文本）、`aurora-token-heading×4`（dev 内联 editor.css 选择器）、`1,234 词×0`（无 mock 残留）。新环境空态（未打开文档）属预期（fresh 浏览器无 IndexedDB 激活文件），外壳 chrome 完整。

### 已知保留 / 后续

- 6 个 Aurora chrome 组件（`editorInspector`/`EditorFormatToolbar`/`FileTree`/`FloatingToolbar`/`SlashCommandPopup`/`GoToLineDialog`）**保留待 Phase 4 退役**：真实 `EditorLayout` 内置等价实现已取代其功能，但删除须与 Phase 4 去重（移除真实 `EditorLayout` 之外的 Aurora 编辑器相关死代码）一并处理，避免遗漏引用。
- **验证分层已沉淀**：双内核重型编辑器在 jsdom 无法挂载 → 采用「mock 重型编辑器 + 断言 Aurora 层 props 接线」的烟雾测试法，真实内核由 `features/editor/EditorLayout.test.tsx` 既有覆盖。此法可作为未来含重型编辑器换芯面板的标准验证模板。
- **路径深度**：`src/aurora/panels/editor/` 引用 `src/features/*` / `src/stores/*` 需 **`../../../` 三层**（与 DiaryPanel 同，非 SettingsPanel 四层）。
- 编辑器是 Aurora 演示最早、最完整、偏离最多的面板（设计文档 02/13/16/17/18/22）——本次换芯后，Aurora 编辑器 chrome 与真实视觉规范（Segmented 工具栏、材质、token）已对齐，且功能链路全部走真实数据，符合「禁增」边界（真实编辑器有的就有，没有的不造）。

---

## Phase 2 实际执行（第五批·WelcomePanel 换芯 · 接真实数据）

WelcomePanel 是 Phase 2 第五个换芯面板，也是**最简单、风险最低**的 in-flow 面板（无重型编辑器、无浮层），作为 EditorPanel 之后「一个一个面板、确保质量」推进的第一棒。

### 策略 / 背景

- **保留 Aurora `PageFrame` 玻璃外壳** + 快速启动卡 + 最近文件列表 + 底部提示条布局（视觉= Aurora）；**数据全部接真实**：最近文件遍历 `useFileManager().rootFolder`，快速入口走真实 `createFile`/`openFile`/`nav`。
- welcome 是 **aux 视图**（`auxView==='welcome'`，经 `nav('welcome')` / `Ctrl+1` 打开，不可 `#view=` 深链），与 SettingsPanel 同类 → 验证用 **jsdom 烟雾测试**（同 SettingsPanel 策略，headless 无法打开 aux 视图）。
- 原始 `mockRecentFiles`（6 条写死的假文件名）/ `quickItems`（无动作的标签）已彻底移除，代之以真实派生。

### 交付物

| 路径 | 性质 | 作用 |
|---|---|---|
| `src/aurora/panels/welcome/WelcomePanel.tsx` | 重写 | 移除 `mockRecentFiles`/`quickItems` 模块常量；新增 `collectFiles(rootFolder)`（递归收集全部文件 + 文件夹路径）+ `formatRelativeTime(ts)`（中文相对时间）；`recentItems` 由 `rootFolder` 按 `updatedAt` 倒序取前 6，点击 `openFile(id)+nav('编辑器')`；`subtitle` 用真实文件总数 + 最近编辑时间；`quickItems` 改为 4 个真实动作（打开编辑器 / 新建白板 / 打开仪表盘 / 打开知识库）；主「新建笔记」按钮 + 底部提示条「使用模板」均走 `handleNewNote`（真实 `createFile` + `nav('编辑器')`）。 |
| `src/aurora/panels/welcome/WelcomePanel.smoke.test.tsx` | 新增 | jsdom 烟雾测试（见下）。 |
| `QuickStartCard.tsx` / `RecentFiles.tsx` | 保留 | 纯展示组件，仅接收真实 props，未改逻辑。 |

### 真实数据流

```
useFileManager()
  ├─ rootFolder          → collectFiles() 递归收集全部 file 节点（path = 文件夹链 ' / ' 连接，root 名剔除）
  ├─ createFile(rootId, '未命名笔记.md', '', true) → handleNewNote（主按钮 + 提示条「使用模板」）
  └─ openFile(id)        → 点击最近文件时打开 + nav('编辑器')

nav( resolveAuroraNav('编辑器'|'白板'|'仪表盘'|'知识库') )  → 真实视图切换（auxView / viewState）
```

> 说明：快速入口 `打开编辑器/新建白板/打开仪表盘/打开知识库` 均为真实 `nav`；原 mock「打开文件夹」无真实等价（纯前端无系统文件夹选择），改为「打开知识库」这一真实导航，避免捏造动作。

### 验证

- `tsc --noEmit` 全项目 **EXIT:0（0 错误）**（首轮 1 错：`toast` prop 未使用 → 删除解构绑定）。
- **jsdom 烟雾测试** `WelcomePanel.smoke.test.tsx`：**3/3 通过**（`RealProviders` + `@testing-library/react`，mock `nav`）：
  1. 挂载无崩溃 + **无 mock 残留**（`Aurora 设计系统总纲.md`/`产品路线图 2026.md`/`读书笔记 - 深度工作.md`/`个人 OKR 2026 Q3.md` queryByText 全 null）；真实默认文档（`用户手册.md`/`Markdown 入门教程.md`/`知识链接体系指南.md`）存在；副标题含真实「N 个文件」。
  2. 点击最近文件 `用户手册.md` → `nav` 被调用且参数为 `resolveAuroraNav('编辑器')`（证明 `openFile`+导航链路真实生效）。
  3. 4 个真实快速入口齐全；点击「新建笔记」→ 真实 `createFile` 生成 `未命名笔记.md` 回流列表 + `nav('编辑器')`，文件总数 3→4。
- 注：headless 不可用（环境无 Edge/Chrome 二进制；welcome 为 aux 视图本就无法 `#view=` 深链）→ 沿用 SettingsPanel 同策略，jsdom 烟雾测试即权威验证。jsdom 下 Dexie `IndexedDB API missing` 为 benign warning，不影响逻辑。

### 已知保留 / 后续

- 底部提示条「每日模板推荐 / 晨间日记模板」为**静态友好提示**（非数据断言），其「使用模板」动作已接真实 `handleNewNote`；若需接真实模板库，后续可扩展（属范围扩展，不阻塞换芯）。
- **路径深度**：`src/aurora/panels/welcome/` 引用 `src/stores/*`/`src/types/*` 需 **`../../../` 三层**（与 DiaryPanel/EditorPanel 同）。

## Phase 2 实际执行（第六批·GraphPanel 换芯 · 接真实图谱数据）

GraphPanel 是 Phase 2 第六个换芯面板，也是**最重的数据可视化面板**——此前 `RAW_NODES`/`RAW_EDGES`/`ALL_TAGS` 三套 ~70 行写死 mock 常量驱动整个 SVG 力模拟图谱。本次将其替换为真实 `LinkIndex + TagIndex + FileStore` 数据流，组件视觉/交互骨架（PageFrame 外壳、筛选浮层、迷你地图、信息卡、导出、视图控制）**完全保留**。

### 策略 / 背景

- **保留 Aurora 外壳与全部交互**（拖拽/缩放/平移/悬停高亮/选中/双击打开/右键菜单、搜索高亮、标签多选、连接强度滑块、孤立/文件夹关联开关、全局/局部(深度)/反向/正向/标签模式、力导向/同心圆/树形/网格布局、节点信息卡、底部状态栏、迷你地图、视图控制、导出 PNG/SVG/JSON）。
- **数据零 src/features/* 依赖**：直接复用真实 `LinkIndexStore.getGraphData(tagIndex)`，其返回结构 `nodes:{id,label,links}[]` + `edges:{source,target,type:'wikilink'|'embed'|'tag'}[]` 与 Aurora 图谱模型**一一对应**（file 节点 + tag 节点 + wiki/embed/tag 边），无需重造 mock。
- 真实数据异步填充：refs 在挂载后由 `realData` 填充，保留已有节点坐标避免归零；引入 `graphRev` state 触发「读 refs 的 memo」（`adjacency`/`scope`/`visibleIds`/`matchedIds`）重算，与 `useMemo` 的 `[graphRev]` 依赖协同。
- graph 为 `#view=` 标准视图，但本环境无 Edge/Chrome 二进制（headless 不可用）→ 沿用 jsdom 烟雾测试为权威验证（同 welcome/settings 策略；Dexie `IndexedDB API missing` 良性）。

### 交付物

| 路径 | 性质 | 作用 |
|---|---|---|
| `src/aurora/panels/kb/GraphPanel.tsx` | 重写数据层 | 删除 `RAW_NODES`/`RAW_EDGES`/`ALL_TAGS`；新增 `countWords(text)`（中文字符数 + 英文词数）+ `buildGraphData(graph, rootFolder, activeFileId, getFilePath, tagIndex)` 将真实 `GraphData` 映射为 `{nodes:GNode[], edges:GEdge[]}`（file 节点带 `wordCount`/`filePath`/`modifiedAt`/`isCurrent`；tag 节点 id 形如 `tag:xxx`；edge `kind` 由 `wikilink→wiki`）。函数体接入 `useLinkIndex()/useTagIndex()/useFileManager()` 真实 hooks；`allTags` 由 `tagIndex.keys()` 派生；`nodesRef/edgesRef` 初始空、挂载后由 `[realData]` effect 填充并 `setGraphRev`；`centerId` 默认 `''`；`graphRev` 加入 `adjacency`/`scope`/`visibleIds`/`matchedIds` 依赖；`onNodeDouble` 文件节点改走真实 `openFile(id)+nav('编辑器')`；tag 模式无选中时回退到首个真实 tag 节点（修复原 `setCenterId('t1')` mock id 死链）。 |
| `src/aurora/panels/kb/GraphPanel.tsx` | 缺陷修复 | 补 `const H = 3600_000`（毫秒/小时）——`relTime()` 长期引用未定义 `H` 导致 tsc `TS2552` 报错，属既有 bug，随本次换芯一并修复。 |
| `src/aurora/panels/kb/GraphPanel.smoke.test.tsx` | 新增 | jsdom 烟雾测试（见下）。 |

### 真实数据流

```
useLinkIndex().getGraphData(tagIndex)  → GraphData{nodes,edges}
  ├─ buildGraphData(...)               → { nodes:GNode[](file+tag), edges:GEdge[] }
  │     ├─ file 节点: findNode(rootFolder,id) 取 content→countWords / getFilePath / updatedAt / isCurrent
  │     └─ tag  节点: id=`tag:xxx`, label=末级标签名
  ├─ useTagIndex().tagIndex            → allTags（标签筛选芯片）+ fileTags（信息卡标签）
  └─ useFileManager().rootFolder       → findNode 取文件元信息；openFile(id) 双击打开

graphRev(state) → 触发 adjacency/scope/visibleIds/matchedIds 重算 → SVG 重渲染真实节点
```

### 验证

- `tsc --noEmit` 全项目 **EXIT:0（0 错误）**（首轮 1 错：`H` 未定义 `TS2552` → 补常量；次轮 0 错）。
- **jsdom 烟雾测试** `GraphPanel.smoke.test.tsx`：**3/3 通过**（`RealProviders` + `@testing-library/react`，stub `ResizeObserver`）：
  1. 挂载无崩溃 + 真实 `getGraphData` 数据渲染进 SVG（`.aurora-graph__node` 数量 > 0）；状态栏含「笔记」+ 数字统计。
  2. 标签筛选芯片由真实 `tagIndex` 驱动（`.aurora-graph__chips` 存在，无 `ALL_TAGS` 残留）。
  3. 点击节点 → 弹出真实信息卡（`.aurora-graph__ic-title` 含真实节点 label，含标签/路径/字数）。
- headless 不可用 → jsdom 烟雾测试即权威验证，与 welcome/settings 一致；Dexie warning 良性。

### 已知保留 / 后续

- **folder 节点为外壳原型补入**（设计规范 §3.4 / §4.3），真实 `LinkIndex` 不产出 folder 节点，故当前图谱仅 file + tag 两类；folder 类型分支（方形 + 文件夹关联边）保留为「升级外壳」演示，待真实数据建模时启用。
- 双击打开笔记走 `openFile` 真实 API，但未校验「当前 activeFile 已为自身」的边界（力模拟下罕见），属交互优化，不阻塞。
- 力模拟仅在交互（拖拽/切布局/聚焦）时 reheat，初始为环形布局静止态；与真实 `GraphView`（自研 Canvas 力模拟）行为对齐。
- **路径深度**：`src/aurora/panels/kb/` 引用 `src/stores/*`/`src/types/*`/`src/features/*` 需 **`../../../` 三层**。

> 累计：Phase 2 已换芯 **DiaryPanel / SettingsPanel / DashboardPanel / EditorPanel / WelcomePanel / GraphPanel** 六面板（6/8）；余 **CanvasPanel / KbPanel / BlogPanel** 三面板（#176/#177/#178）。

## Phase 2 实际执行（第七批·CanvasPanel 换芯 · 接真实画布列表）

CanvasPanel 是 Phase 2 第七个换芯面板。与数据面板不同，它是**完整的白板应用**（五视图切换器 + 左栏 + Inspector + 命令面板 + 右键菜单 + 分享/列表弹窗）。本次仅替换其**写死的 mock 画布列表**为真实 `canvas-v2` 存储，其余视觉/交互骨架（五视图、拖拽、连线、画笔、看板/脑图/时间轴/仪表盘功能）**完全保留**——经用户确认（禁增铁律：真实项目仅有 canvas-v2 自由画布，无看板/脑图/时间轴/仪表盘白板视图，故非真实视图不虚构、仅保留 Aurora 外壳原型）。

### 策略 / 背景

- **仅接真实画布列表**（用户确认范围）：把 `CANVAS_LIST`（4 个写死画布名/封面/相对时间）替换为真实 `getCanvasList()`（canvas-v2，IndexedDB 后端）；列表的打开/新建/删除动作接真实 `createCanvas('未命名画布')` / `deleteCanvas(id)`，并写回后 `getCanvasList()` 重载。
- **数据零 Excalidraw 依赖**：`canvasStore` 仅用 Dexie `db` + 类型，不牵入 Excalidraw 引擎，故换芯不涉及重量级内核替换（自由画布视图仍用 Aurora 既有 `CanvasFreeView` 交互实现）。
- 真实 `CanvasListItem`（`updatedAt:number` + `thumbnail` + `cardCount`）与 Aurora `CanvasListItem`（`updatedAt:string` + `cover`）结构不同 → 新增 `toAuroraCanvasItem()` 适配 + `formatCanvasTime()`（ms→中文相对时间），封面用 `thumbnail` 或回退渐变，避免字段错配。
- `canvasName`/`canvasId` 默认值从写死 `'产品脑图'/'c1'` 改为 `''`，由 `getCanvasList()` 异步加载后填充首项，杜绝 mock 死链。
- 自由画布视图与四个非真实视图保持 Aurora 既有实现（视觉/交互不变），符合「保留外壳 + 真实数据」与禁增铁律。
- 为 aux/标准视图一致，沿用 jsdom 烟雾测试为权威验证（headless 不可用；Dexie `IndexedDB API missing` 良性）。

### 交付物

| 路径 | 性质 | 作用 |
|---|---|---|
| `src/aurora/panels/canvas/CanvasPanel.tsx` | 重写数据层 | 删除模块级 `CANVAS_LIST` 4 条 mock 常量；新增 `formatCanvasTime(ts)` + `toAuroraCanvasItem(c)` 适配；`canvases` state + 挂载 `getCanvasList()` 异步加载（失败静默降级为空列表）；`canvasName/canvasId` 默认 `''`；`CanvasListMenu` 的 `items`/`onOpen`/`onCreate`/`onDelete` 接真实 `getCanvasList/createCanvas/deleteCanvas`；`openFile` 不在此面板范围。 |
| `src/aurora/panels/canvas/CanvasPanel.smoke.test.tsx` | 新增 | jsdom 烟雾测试（见下）。 |

### 真实数据流

```
useFileManager/RealProviders → CanvasPanel
  └─ mount effect: getCanvasList()           → CanvasListItem[]（canvas-v2 / IndexedDB）
        ├─ toAuroraCanvasItem()              → {id,name,updatedAt:相对时间,cover}
        ├─ setCanvases / setCanvasName(首项) / setCanvasId(首项)
        └─ CanvasListMenu.items = canvases
              ├─ onOpen(id)   → setCanvasName/setCanvasId（真实项）
              ├─ onCreate()   → createCanvas('未命名画布') → 重载 getCanvasList → 写回 setCanvases/Name/Id
              └─ onDelete(id) → deleteCanvas(id)           → 重载 getCanvasList → 写回（删当前则跳首项/清空）
```

### 验证

- `tsc --noEmit` 全项目 **EXIT:0（0 错误）**。
- **jsdom 烟雾测试** `CanvasPanel.smoke.test.tsx`：**3/3 通过**（`RealProviders` + `@testing-library/react`，stub `ResizeObserver` 与 `canvas-v2/canvasStore`）：
  1. 挂载无崩溃 + 顶栏画布名来自真实列表首项「产品脑图」；无「架构图」「项目排期」等写死 mock 残留。
  2. 打开画布列表弹窗（`aria-label=画布列表`）内显示真实条目「产品脑图」「用户旅程」。
  3. 点击「新建画布」→ 真实 `createCanvas` 被调用 + `getCanvasList` 被调用；创建后顶栏/面包屑反映新画布名「未命名画布」。
- headless 不可用 → jsdom 烟雾测试即权威验证；Dexie warning 良性。

### 已知保留 / 后续

- **五视图切换器中看板/脑图/时间轴/仪表盘为 Aurora 外壳原型**（真实项目无对应白板视图），按禁增铁律保留为「升级外壳」演示，不虚构真实数据；若未来真实项目新增这些视图，再按本模板接入。
- 自由画布视图内容（元素/连线/画笔）仍为 Aurora 交互实现，未替换为真 Excalidraw 引擎（用户确认范围仅限列表）；若后续需接真实引擎，走独立换芯任务。
- **路径深度**：`src/aurora/panels/canvas/` 引用 `src/features/canvas-v2/canvasStore` 需 **`../../../` 三层**。

> 累计：Phase 2 已换芯 **DiaryPanel / SettingsPanel / DashboardPanel / EditorPanel / WelcomePanel / GraphPanel / CanvasPanel** 七面板（7/8）；余 **KbPanel / BlogPanel** 两面板（#177/#178）。

## Phase 2 实际执行（第八批·KbPanel 换芯 · 接真实知识库数据）

KbPanel 是 Phase 2 第八个换芯面板，也是**数据派生最重**的面板——原 `MOCK_KBS` + `kpiData`(写死 86/5/34/128.4k/243) + `healthItems`(4 维写死) + `recentActivities` + `tags` + `miniNodes/miniEdges` 共六套 mock 驱动整个概览页。本次全部替换为真实来源派生，组件视觉/交互骨架（PageFrame 外壳、11 Tab、子栏、KPI 行、健康度卡、AI 摘要、最近活动、标签体系、专属图谱）**完全保留**。同步换芯 `KbManagePanel`（列表页）并清理 `kbData.ts` 的 `MOCK_KBS`/`getKbById`。

### 策略 / 背景

- **复用真实计算（D4 单一数据源）**：真实 `KbDashboard` 已在 `src/features/knowledgeBase/components/KbDashboard.tsx` 内联计算 fileCount/totalWords/topTags/recentFiles/canvasCount（取 `getKbFiles` + `FileStore` 内容 + `TagIndex.getTagsForFile`）。Aurora 侧不重造 wheel，直接消费同一组真实 store：
  - `useFileManager().rootFolder` + `findNode` + `getKbFiles(rootFolder, kb)` → KB 真实文件集合；
  - `useTagIndex().getTagsForFile` → 标签计数；
  - `useLinkIndex().getBacklinks/getOutgoingLinks/getGraphData` → 双链数 / 专属图谱；
  - `loadKb(kbId)` / `getKbList()`（kbStore / IndexedDB）→ 知识库文档与列表；
  - `calculateKbHealth`（真实 `healthScore.ts` 纯函数）→ 4 维健康度，替代写死 `healthItems`。
- **字数算法与真实一致**：`中文汉字数 + 英文词数`（正则 `/[一-龥]/g` + 空白分词），与 KbDashboard 同口径。
- **双链数**：`getGraphData(tagIndex).edges` 中 `type==='wikilink'` 且两端均在 KB 文件集合内的去重计数（非写死 243）。
- **专属图谱**：由 `getGraphData` 过滤到 KB 文件子集（节点=笔记·连线=引用），径向布局渲染；库内无引用时显示「库内暂无引用关系」占位。
- **健康度子栏徽标**：用真实 `health.total`（无评分时显示 `--`），替代写死 `健康度 84`。
- **AI 摘要**：渲染真实 `kb.aiSummary` 字段；无则提示「点击重新生成」（按钮保持 toast 占位，不虚构 AI 输出）。
- **导入动作**：真实项目导入实现位于 `src/features/knowledgeBase/import/`，未在 Aurora 外壳接线 → 保留 toast 提示（符合禁增铁律，不虚构）。
- `kbData.ts` 仅保留纯展示工具 `coverGradient` / `formatKbTime`（非 mock 数据）；`MOCK_KBS`/`KbItem`/`getKbById` 删除，彻底消除写死残留。

### 交付物

| 路径 | 性质 | 作用 |
|---|---|---|
| `src/aurora/panels/kb/KbPanel.tsx` | 重写数据层 | 删除 `MOCK_KBS`/`kpiData`/`healthItems`/`recentActivities`/`tags`/`miniNodes`/`miniEdges` 全部 mock；新增真实 hooks（`useFileManager`/`useLinkIndex`/`useTagIndex`）+ `loadKb/getKbList/getKbFiles`（kbStore）+ `calculateKbHealth`（healthScore）；`kb` 由 `useEffect` 异步 `loadKb(kbId ?? 列表首项)`；`data` memo 派生 fileCount/canvasCount(=`kb.canvasIds.length`)/tagCount/totalWords/linkCount/health/recentFiles/topTags/aiSummary/miniNodes/miniEdges；`MiniGraph` 改为接收真实 nodes/edges 做径向布局；空态（无 KB / 加载中）加占位。 |
| `src/aurora/panels/kb/KbManagePanel.tsx` | 重写数据层 | 列表改 `getKbList()` 异步加载（移除 `MOCK_KBS`）；「新建知识库」接真实 `createKb(name, desc, createFolder)`（useFileManager）+ 刷新；导入保持 toast 占位；计数由 `kbList` 派生。 |
| `src/aurora/panels/kb/kbData.ts` | 清理 | 删除 `MOCK_KBS`/`KbItem`/`getKbById`，仅留 `coverGradient`/`formatKbTime` 纯工具。 |
| `src/aurora/panels/kb/KbPanel.smoke.test.tsx` | 新增 | jsdom 烟雾测试见下。 |
| `src/aurora/panels/kb/KbManagePanel.smoke.test.tsx` | 新增 | jsdom 烟雾测试见下。 |

### 验证

- `tsc --noEmit` 全项目 **EXIT:0（0 错误）**（首轮 1 错：`getBacklinks` 返回 `LinkRecord[]` 与 `calculateKbHealth` 期望 `string[]` 不符 → 加 `backlinksFn/outgoingFn` mapper 取 `r.sourceFileId`/`r.target`；次轮 0 错）。
- **jsdom 烟雾测试 5/5 通过**（`RealProviders` + `@testing-library/react`，mock `knowledgeBase/kbStore`）：
  - KbPanel 3/3：① 挂载无崩溃 + 真实库名「测试知识库 X」出现（子栏/面包屑）+ 无 `Aurora 设计系统`/`86` 残留；② 状态栏「双链 0 · 标签 0」+ 子栏「健康度 --」（无写死 84/243/34）；③ 真实 `aiSummary` 字段渲染。
  - KbManagePanel 2/2：① 真实列表两项「真实库A/B」+ 计数「知识库 2」+ 无 `Aurora 设计系统` 残留；② 填写名称点击「创建知识库」→ 真实 `createKb` 被调用且首参为输入名。
- headless 不可用 → jsdom 烟雾测试即权威验证；Dexie warning 良性。

### 已知保留 / 后续

- **其余 10 个 Tab（笔记/搜索/任务/目标/回顾/问答/依赖/MOC/盲区/导出）仍为占位**（`PlaceholderTab`，文案「项目真实功能：X」），真实实现已在 `src/features/knowledgeBase/components/`；按本迁移「外壳先行、逐面板换芯」节奏，这些 Tab 的深层交互留待后续批次（或 Phase 4 退役时直接复用真实组件）。
- 健康度为**实时派生**（`calculateKbHealth`），与真实 `KbDashboard` 完全同口径；`kb.healthScore` 缓存字段本次未写回（只读展示），避免副作用。
- **路径深度**：`src/aurora/panels/kb/` 引用 `src/features/knowledgeBase/{kbStore,healthScore}` 与 `src/features/fileManager/fileManagerUtils` 及 `src/stores/*` 均 **`../../../` 三层**。

> 累计：Phase 2 已换芯 **DiaryPanel / SettingsPanel / DashboardPanel / EditorPanel / WelcomePanel / GraphPanel / CanvasPanel / KbPanel** 八面板（8/8）；余 **BlogPanel** 唯一面板（#178）。

---

## Phase 2 实际执行（第九批·BlogPanel 换芯 · 接真实 FileStore 文档 + 真实主题市场）

BlogPanel 是 Phase 2 第九棒，也是**最后一个面板**。它是博客工作室（6 子面板：样式/配色/内容/功能/CSS/导出），此前 `MOCK_DOCS`(6 篇写死文档) + `MOCK_FRIENDS`(2 友链) + `MOCK_SERIES`(1 系列) + 平行 `COLOR_SCHEMES`/`THEME_MARKET`(20 主题) 四套 mock 驱动。本次替换为真实来源，**视觉/交互骨架（PageFrame、子栏 Tab、设备切换、可甩动功能列表浮层、iframe 预览）完全保留**。

### 策略 / 背景

- **文档列表接真实 FileStore**（Interpretation A：视觉=Aurora，数据=真实）：把 `MOCK_DOCS` 替换为遍历 `useFileManager().rootFolder` 收集的 `.md` 文件（`collectMdFiles` 递归 + `countWords` 字数派生）；「包含/排除」为面板本地 `excluded: Set<string>` 状态（对齐真实 BlogStudio 的 `excludedFiles` Set 语义）；`buildPreviewHtml(cfg, docs)` 改用真实 `docs`。
- **友链 / 系列起始为空**（对齐真实 `DEFAULT_DESIGN_CONFIG.friendLinks:[]` / `seriesConfig:[]`）：移除 `MOCK_FRIENDS` / `MOCK_SERIES`，改为用户在「功能」面板添加；导入/导出动作保持 toast 占位（真实配置导入/导出未在 Aurora 外壳接线，符合禁增）。
- **主题市场 / 配色接真实单一数据源（D4）**：直接复用真实 BlogStudio 的 `COLOR_SCHEMES` / `THEME_INFO_LIST` / `THEME_CATEGORIES` / `THEME_STYLE_TAGS`（从 `features/blog/hooks/useBlogGenerator` 导入），删除 Aurora 平行维护的 `COLOR_SCHEMES`(12) 与 `THEME_MARKET`(20) mock 目录，杜绝漂移；`THEME_MARKET`/`THEME_CATEGORIES`/`THEME_STYLE_TAGS` 以 `useMemo`-free 模块级适配器由真实列表派生（`category`/`tags` 改存 `ThemeCategory`/`ThemeTag` 键，筛选逻辑不变）。
- **站点配置 BlogConfig 为工作室本地工作态**（同真实每次打开重置为默认），主题键 `themeKey:'magazine'`、配色键 `colorScheme:'purple'` 均对齐真实枚举（原写死 `'indigo'` 非真实 key，已修正避免取色回退）。

### 交付物

| 路径 | 性质 | 作用 |
|---|---|---|
| `src/aurora/panels/blog/BlogPanel.tsx` | 重写数据层 | 删 `MOCK_DOCS`/`MOCK_FRIENDS`/`MOCK_SERIES` + 平行 `COLOR_SCHEMES`/`THEME_MARKET` 常量；新增 `useFileManager()` + `collectMdFiles(rootFolder)` + `countWords(text)` + `BlogDoc{included}`；`docs` 由 `allDocs` map 派生（含 `excluded` 判定）；`toggleDoc`/`setAllDocs` 改 `excluded` Set；`buildPreviewHtml(cfg, docs)`；`COLOR_SCHEMES`/`THEME_MARKET`/`THEME_CATEGORIES`/`THEME_STYLE_TAGS` 由真实 `useBlogGenerator` 导出适配器生成；`ContentPanel`/`ExportPanel` 改收真实 `docs`；`FeaturesPanel` 友链/系列起始空。 |
| `src/aurora/panels/blog/BlogPanel.smoke.test.tsx` | 新增 | jsdom 烟雾测试（见下）。 |

### 真实数据流

```
useFileManager().rootFolder
  └─ collectMdFiles()  ──► BlogDoc[]{ id, title(.md 去后缀), words(countWords), included }
        ├─ docs = allDocs.map(d => ({...d, included: !excluded.has(d.id)}))
        ├─ ContentPanel: 全选/全不选/单篇勾选 → onSetAll/onToggleDoc → excluded Set
        ├─ ExportPanel: docCount = docs.filter(included).length / totalWords 实时派生
        └─ buildPreviewHtml(cfg, docs) → iframe srcDoc（真实标题 + 字数 + 主题名）

REAL_COLOR_SCHEMES / THEME_INFO_LIST / REAL_THEME_CATEGORIES / REAL_THEME_STYLE_TAGS
  (features/blog/hooks/useBlogGenerator)  ──► COLOR_SCHEMES / THEME_MARKET / THEME_CATEGORIES / THEME_STYLE_TAGS
        └─ StylePanel 主题市场（分类/标签筛选/搜索/收藏/当前主题）+ ColorPanel 配色（单一数据源，禁漂移）
```

### 验证

- `tsc --noEmit` 全项目 **EXIT:0（0 错误）**（首轮 9 错：`BlogDoc` 缺 `included` 字段 → 接口加 `included:boolean` 且 `collectMdFiles` 返回 `included:true`；次轮 0 错）。
- **jsdom 烟雾测试** `BlogPanel.smoke.test.tsx`：**2/2 通过**（`RealProviders` + `@testing-library/react`，stub `ResizeObserver`）：
  1. 挂载无崩溃 + 面包屑/侧栏「博客工作室」渲染 + **无 mock 残留**（`Aurora 设计系统实践`/`博客工作室使用指南`/`双链笔记的心得`/`设计日记`/`Aurora 系列` queryByText 全 null）+ 状态栏「X 篇待发布」来自真实文档计数；
  2. 主题市场渲染真实 `THEME_INFO_LIST`（`杂志` 与旧 20 项 mock 没有的 `便当盒`(bento) 均出现，证明已接真实目录而非平行 mock）。
- headless 不可用（环境无 Edge/Chrome 二进制）→ jsdom 烟雾测试即权威验证；Dexie `IndexedDB API missing` 良性。

### 已知保留 / 后续

- **BlogConfig 本地工作态**：同真实 BlogStudio 每次打开重置为 `DEFAULT_CONFIG`，Aurora 侧不持久化（真实 BlogStudio 也是会话内状态）；若需 Aurora 侧持久化配置，后续可接真实 `blogStore`（当前不存在，不虚构）。
- **生成 / 部署 / 平台发布 / 导入导出** 动作保持 toast 占位（真实 `blogGenerator`/`publishAdapters` 未在 Aurora 外壳接线，按禁增铁律不虚构真实发布链路）。
- **6 子面板（样式/配色/内容/功能/CSS/导出）保持 Aurora in-flow 外壳**：真实 BlogStudio 的 12 适配器与发布服务未被替换为 Aurora 内联实现（与 KbPanel「非概览 Tab 占位」同理，深层交互留待后续批次或 Phase 4 复用真实组件）。
- **路径深度**：`src/aurora/panels/blog/` 引用 `src/features/blog/hooks/useBlogGenerator` 与 `src/stores/FileStore`/`src/types/fileManager` 均 **`../../../` 三层**。

> **Phase 2 面板换芯全部完成（9/9）**：DiaryPanel / SettingsPanel / DashboardPanel / EditorPanel / WelcomePanel / GraphPanel / CanvasPanel / KbPanel / BlogPanel 全部接真实数据源，Aurora `src/aurora/` 仅保留外壳 + 视觉，零 mock 数据残留。后续进入 **Phase 3（全局弹层与命令收口 #154）/ Phase 4（去重与退役 #155）/ Phase 5（验证与回归 #157）**。

---

## Phase 3 实际执行（命令共享 catalog 接线 · 2026-08-26）

### 策略选定（D4 单一数据源 + 适配器，用户确认「提取共享注册模块（更彻底）」）

- 用户二选一确认：抽共享 `COMMAND_CATALOG`（D4 单一数据源），App 与 AuroraShell 共用；`action`/`visible` 因依赖外壳本地状态（如 `activeFileId`、各 modal 开关、`nav()`）故各自注入，不进 catalog。
- 关键架构事实：真实 `commandRegistry` 仅在 `src/App.tsx` 注册；Aurora 运行时走 `aurora.html`→`AuroraShell`，**不走 App.tsx** → Aurora 进程内 registry 初始为空 → AuroraShell 须运行时自注册（Phase 2 各面板已挂 `RealProviders`，store 接线 OK）。

### 交付物

| 路径 | 性质 | 作用 |
|---|---|---|
| `src/features/commandPalette/commandCatalog.ts` | 新增（D4 单一数据源） | `CommandMeta` 接口（id/labelZh/labelEn/icon/category/keywords/shortcut?）；`COMMAND_CATALOG: CommandMeta[]`（**35 条**：file×6 / view×6 / navigation×4 / tools×17 / settings×2）；`COMMAND_CATALOG_BY_ID`。仅壳无关静态元数据，不含 action/visible。 |
| `src/aurora/app/commandAdapter.ts` | 新增 | `adaptCommand` / `adaptCommands`：real `CommandItem` → Aurora `CommandItem`（字段映射 `labelZh→title`、`category→group`、`keywords→description` 前 3、`shortcut` 字符串→`string[]`、`icon` 字符串→`IconName` as 透传）；`visible()===false` 过滤。`parseShortcut` 同时按 `+` 与空白拆分。 |
| `src/aurora/app/AuroraShell.tsx` | 改写（Phase 3c 接线） | 删原 18 硬编码命令（含 5 toast 桩 `file-new/open/save`/`setting-theme/sidebar` + 3 假「最近文件」）；运行时 `commandRegistry.clear()` + 遍历 `COMMAND_CATALOG` 注入 `auroraActions`（file.newFile/`createFile`+`nav('editor')`、file.openDailyNote/`openDailyNote`、view.toggleTheme/`settings.updateSetting`、settings.switchLanguage/`toggleLanguage`、settings.openSettings/`nav('settings')`、tools.*/`nav(...)`、navigation.graphView/`nav('graph')` 等）+ `setCommands(adaptCommands(commandRegistry.getAll()))`。保留 9 个 `nav-*` 由各自面板 `nav()` 自身提供。 |
| `src/App.tsx` | 改写（行为守恒 D4 重构） | 原 ~390 行 `commandRegistry.register` 硬编码 → 遍历 `COMMAND_CATALOG` 注入 `auroraActions` 同名 `appCommandActions`（35 条，原样保留 `handleCreateFileWithSelect`/`togglePreview`/`setShowXxx`…）+ `appCommandVisibles`（3 条：`tools.insertTemplate`/`openVersionHistory`/`openBlockBacklinks` 依赖 `activeFileId`）。`CommandIds` 已无引用 → 删除。 |
| `src/aurora/app/commandWiring.test.tsx` | 新增 | 3 用例：catalog 35 条 / 无旧演示命令（`nav-welcome`/`file-new`/`file-open`/`file-save`/`setting-theme`/`setting-sidebar`/`recent-*`）/ 字段完整；适配器形态（`title`/`group`/`shortcut` 解析 `Ctrl+S`→`['Ctrl','S']`、`G M`→`['G','M']`）；`visible` 过滤。 |

### 关键坑（同类注意）

- **路径深度**：`src/aurora/app/*` 引用 `src/features|stores` 仅需 `../../` 两层（app 在两层目录），**非 `../../../`**（panels 第三层才需三层）。首轮 `TS2307 Cannot find module '../../../features/...'` → 改 `../../`。
- **适配器图标类型**：`CommandPalette` 未 re-export `IconName` → 从 `src/aurora/types` 导入；真实 `icon` 是名称字符串（'file'/'moon'…），`Icon[item.icon]` 未命中 → 渲染 null（安全降级）。
- **`action`/`visible` 恒真 TS2774**：`Record<string,()=>void>` 不含 undefined → 改 `Record<string, (() => void) | undefined>`（action、visible 同此）。
- **`DailyNoteService` 命名空间**：模块只导出 `openDailyNote`（非 `DailyNoteService.openDailyNote`）→ import 改 `openDailyNote`；`useSettings()` 无 `theme` 字段 → 改 `const { settings, updateSetting } = useSettings(); const theme = settings.theme`。
- **`parseShortcut` 须同时按 `+` 与空白拆分**：`'G M'`（两键序按和弦）原只按 `+` 拆 → 得 `['G M']` 单 chip；改 `/[+\s]+/` → `['G','M']` 两 chip。Aurora `CommandPalette` 把数组每项渲染为独立 `<kbd>`，故和弦须拆开。

### 验证

- `tsc --noEmit` 全项目 **EXIT:0（0 错误）**。
- **`commandWiring.test.tsx` 3/3 通过**；**Aurora 全量烟雾测试 10 文件 / 30 测试全部通过**（Dexie `IndexedDB API missing` 良性 warning）。
- headless 不可用（环境无 Edge/Chrome 二进制）→ jsdom 烟雾测试即权威验证。

### 已知保留 / 后续

- **演示命令清理**：旧 Aurora 演示命令（`nav-welcome`/`file-new`/`file-open`/`file-save`/`setting-theme`/`setting-sidebar`/`recent-*`）已从 AuroraShell 移除，统一走真实 `COMMAND_CATALOG` + `auroraActions` 映射。
- **Phase 3b 弹层盘点（#180）待启动**：真实弹层（ImportDialog / TemplateInsertModal / QuickCapture / LibrarySync / MigrateWizard / QuickSwitcher / LinkRedirect / VersionHistory / KbNoteViewer / CanvasFileViewer / BlogModal 等）触发入口与 portal 约定 → 设计迁入 Aurora overlay 层方案。

---

## Phase 3d 实际执行（真实弹层迁入 Aurora overlay · 2026-08-26）

### 策略（方案 B · 就近归属，用户已确认）

- 编辑器弹层归 `EditorPanel` 渲染（ImportDialog / LinkRedirectDialog / BlockBacklinksPanel，回传 EditorLayout 回调）；全局弹层（Template*/QuickCapture/LibrarySync/Migrate/QuickSwitcher）归 `AuroraShell` 渲染；**笔记查看器归 KbPanel / CanvasPanel 持有**（复用真实 `KbNoteViewer`）。
- **单一数据源 D4**：`auroraActions` 从 `buildAuroraActions(deps)` 纯函数导出（23 条：14 既有 + 9 弹层命令），`AuroraShell` 内 `ShellInner` 调用组装；命令元数据仍走共享 `COMMAND_CATALOG`。

### 交付物（两轮）

**第一轮（弹层命令接线 + 导入坑修复）**

| 路径 | 性质 | 作用 |
|---|---|---|
| `src/aurora/app/AuroraShell.tsx` | 改写 | 修复导入（工具函数真实位置 `features/pwa/librarySync` 的 `collectFiles/exportLibraryBundle/parseLibraryBundle/mergeLibraryFiles/downloadTextFile`；`features/pwa/quickCapture` 的 `findInboxId`；`MigrateWizard` 仅 `export default` 故去掉 `Lazy` 具名）；`auroraActions` 重构为导出纯函数 `buildAuroraActions`（含 9 条弹层命令：file.importFile / tools.linkRedirect / tools.openBlockBacklinks(getActiveFileId 守卫) / tools.insertTemplate / tools.templateDiscovery / file.quickCapture / tools.librarySync / tools.migrate / navigation.quickSwitcher）。 |
| `src/aurora/panels/editor/EditorPanel.tsx` | 改写 | 修复导入（`findNode` 来自 `features/fileManager/fileManagerUtils`、`findInboxId` 来自 `features/pwa/quickCapture`）；6 弹层渲染 + 回调不变。 |
| `src/aurora/app/commandWiring.test.tsx` | 改写 | 新增第 4 用例「Phase 3d：9 条弹层命令均已接入 buildAuroraActions」（`modalOpen` 守卫断言 + `getActiveFileId=null` 时 `tools.openBlockBacklinks` 不弹层）。 |

**第二轮（笔记查看器接入 KbPanel / CanvasPanel）**

| 路径 | 性质 | 作用 |
|---|---|---|
| `src/aurora/panels/kb/KbPanel.tsx` | 改写 | `notes` tab 从 `PlaceholderTab` 改为真实 `kbFiles` 列表（`NotesTab` 组件，复用 `aurora-kb-recent` 视觉 + 键盘可达）；点击笔记 → `noteViewerFileId` → 渲染真实 `KbNoteViewer`（注入 `theme`=useTheme / `language`=useLanguage / `editorMode` 本地 state + `onSwitchEditorMode` / `onClose` 清空）。 |
| `src/aurora/panels/canvas/CanvasPanel.tsx` | 改写 | 新增 `canvasViewerId` state + `onOpenFile` 通道（对齐真实 `CanvasViewV2.onOpenFile`）；渲染 `KbNoteViewer` 带 `backText="返回白板"` 与白板 chrome（`bg=var(--editor-bg)` 等）。 |
| `src/aurora/panels/canvas/views/CanvasFreeView.tsx` | 改写 | `CanvasFreeViewProps` 增 `onOpenFile?` 契约钩子（同 `CanvasViewV2` 对齐；当前 Aurora 画布为简化副本，文件元素触发在 Phase 4/5 视图对齐时接入）。 |
| `src/aurora/styles/panels/kb.css` | 改写 | 新增 `.aurora-kb-notes` 容器 + 可点击/悬停/聚焦样式（复用 `aurora-kb-recent__*`）。 |

### 关键坑（同类注意）

- **导入路径真实位置**：`collectFiles/exportLibraryBundle/parseLibraryBundle/mergeLibraryFiles/downloadTextFile` 在 `features/pwa/librarySync`（非 `fileManagerUtils`/`shared/fileIO`）；`findInboxId` 在 `features/pwa/quickCapture`（非 `fileManagerUtils`）；`MigrateWizard` 仅 `export default`（无 `LazyMigrateWizard` 具名）→ 改 `<MigrateWizard .../>`。首轮 `TS2307` 全因错置模块。
- **路径深度**：`src/aurora/panels/<panel>/*` 引 `src/features|stores` 须 `../../../`（三层）；`src/aurora/app/*` 仅 `../../`（两层）。
- **`KbNoteViewer` 视觉来源**：真实 `App.tsx` 同款——KB 笔记用默认 KB 色（`chrome` 省略），白板文件用 `backText="返回白板"` + 白板 chrome（`bg=var(--editor-bg)`、`bgCard=var(--toolbar-bg)`、`border=var(--mc-border-subtle)`、`textMain=var(--text-primary)`）；**无独立 `CanvasFileViewer` 组件**，白板文件复用 `KbNoteViewer`。
- **`language` 类型**：`useLanguage().language` = `Language = 'zh' | 'en'`（src/locales/zh/index.ts），与 `KbNoteViewer` 的 `language: 'zh' | 'en'` 一致；`useTheme().theme` = `ThemeType = 'dark' | 'light'`，与 `KbNoteViewer.theme` 一致。
- **editorMode 本地化**：`KbNoteViewer` 不维护自身 `editorMode`，由调用方注入；Aurora 面板内 `useState<'source'|'wysiwyg'>('source')` + `setEditorMode` 作为 `onSwitchEditorMode`（不联动全局，符合 viewer「纯净」语义）。

### 验证

- `tsc --noEmit` 全项目 **EXIT:0（0 错误）**（两轮均通过）。
- **Aurora 测试套件 10 文件 / 31 测试全部通过**（含 commandWiring 4 用例 + 各面板烟雾测试；Dexie `IndexedDB API missing` 良性 warning）。
- KbPanel 烟雾测试 `getKbFiles` mock 为空 → notes tab 显示「暂无笔记」空态，`KbNoteViewer` 不渲染（不触发重型编辑器依赖）→ 无回归。

### 已知保留 / 后续

- **白板文件查看器触发**：`canvasViewerId` 已就绪、`KbNoteViewer` 已渲染，但 Aurora 简化画布当前无「文件元素」(file element) 触发 `onOpenFile`（真实 `CanvasViewV2` 由画布文件元素调用 `onOpenFile`）。该触发随 Phase 4/5 视图对齐（Aurora 画布补全文件元素）一并接入，本轮仅完成弹层 porting + 契约钩子，与真实 app 结构一致。
- **Phase 4（#155）/ Phase 5（#157）**：高风险 cutover，待用户明确授权。

---

## Phase 3e 验证（#183 · 2026-08-26）

**目标**：Phase 3 全量收口验证门禁——类型全绿 + 全仓测试无回归。

### 验证门禁

1. **`tsc --noEmit` 全项目**
   - 命令：`node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`
   - 结果：**EXIT:0（0 错误）**（Phase 3d 两轮 + Phase 3e 复跑均 0 错）。

2. **全仓 `vitest run`（真实测试套件）**
   - 命令：`node_modules/vitest/vitest.mjs run --reporter=verbose`
   - 结果：**Test Files 92 passed (92) / Tests 788 passed | 2 skipped (790) / 0 failed**，exit 0。
   - 说明：覆盖 `features/**`（编辑器/知识库/博客/日记/模板/白板/PWA 等）与 `src/aurora/**` 全部 92 个测试文件；`KbNoteViewer`/`CanvasPanel`/`KbPanel` 接入未拖累任何既有用例；`[PlantUmlRenderer] render failed: Error: offline` 为离线路径良性日志（非断言失败）。
   - headless 不可用（环境无 Edge/Chrome 二进制）→ jsdom 烟雾套件即权威运行时验证，与 Phase 2/3a-d 策略一致。

3. **Phase 3 子项回顾（全绿）**
   - Phase 3a（#179）命令审计 gap 分析 ✅
   - Phase 3b（#180）真实弹层盘点 + overlay 方案 ✅
   - Phase 3c（#182）命令接线（真实 `commandRegistry` → Aurora `CommandPalette` + 演示命令重定向）✅
   - Phase 3d（#181）真实弹层迁入 Aurora overlay 层（就近归属 B，9 弹层命令经 `buildAuroraActions` 接入）✅
   - Phase 3e（#183）全量验证 ✅

### 结论

**Phase 3（#154 弹层与命令收口）全部完成**。Aurora 外壳已：
- 拥有全部真实弹层的开关状态 + 真实组件渲染（portal 到 `document.body`，层级天然在 Aurora 之上）；
- 命令面板可触达全部 `COMMAND_CATALOG` 命令，演示命令已清理/重定向；
- 类型与测试双门全绿，无回归。

### 下一步（待授权）

- **Phase 4（#155）去重与退役**：删 `src/components/ui` 中被 Aurora 库取代的组件、统一图标到 Aurora `Icon`、确认等价后下线 `App.tsx` 旧壳与 `aurora.html` 演示路由高风险，需用户明确授权。
- **Phase 5（#157）验证与回归**：生产构建 + `preview` 冒烟、light 主题验收——可在 Phase 4 完成后统一执行。
