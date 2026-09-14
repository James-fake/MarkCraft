# MarkCraft Aurora 桌面端界面 · 穷尽式审计 v2 优化实施方案

**日期**：2026-09-09
**依据**：`AURORA-DESIGN-AUDIT-2026-09-09.md`（v2 审计报告）
**目标**：从「渲染层合规」推进到「行为层 HIG 全集合规」——补齐 macOS HIG §1/§5 行为缺口，消除剩余暗色不一致与桩实现。
**交付形式**：逐批串行、单 scope 推进、每批截图/像素验证后签字（沿用既有工作流）。

---

## 0. 设计基线（权威值 · 所有改动以此为准）

| 维度 | 权威值 | 来源 |
|---|---|---|
| 主题默认 | `settings.theme = 'dark'`（P0-1 已落地） | `src/stores/SettingsStore.tsx` |
| 单源 token | `src/aurora/styles/tokens.css`（深色默认） | `--mc-bg-window:#0A0B0F` / `--mc-bg-content:#101218` / `--mc-bg-elevated:#151821` |
| 圆角锁 | sm:4 / md:8 / lg:12 / pill:999 | tokens.css §9（禁止 6px 以上裸圆角） |
| 密度默认 | compact（titlebar 41px / sidebar rail ~52px） | tokens.css `[data-density='compact']` |
| 命令单源 | `commandRegistry` + `COMMAND_CATALOG`（静态元数据） + `auroraActions`（壳内 action） | `src/features/commandPalette/*`、`src/aurora/app/auroraActions.ts` |
| 菜单渲染 | `src/aurora/components/shell/MenuBar.tsx`（读 `commandRegistry.getById(id).shortcut` 渲染右侧 accelerator） | — |
| 验证三件套 | `tsc --noEmit` = 0 → `vitest run` 全绿 → headless + PIL 像素采样 | 沿用 v1/v2 |

> ⚠️ **已裁决的两个战略决策（用户拍板）**
> 1. **P0-A = 完整 HIG 三菜单**（App / Edit / Window 全补，非最小可行）。
> 2. **P0-B = 自定义退出确认弹窗**（⌘Q 触发桌面风「退出 MarkCraft」确认；Web 壳下先试 `window.close()` 并说明限制）。

---

## 1. 优先级路线图（12 项 · 与 v2 §8 对齐）

| 批次 | 优先级 | 项 | 影响面 | 核心改动文件 | 预估 |
|---|---|---|---|---|---|
| ① | **P0-A** | 菜单栏补 App / Edit / Window | 全局 chrome | `MenuBar.tsx` / `commandCatalog.ts` / `auroraActions.ts` | ~70 行 |
| ② | **P0-B** | ⌘Q/⌘W/⌘N/⌘S 注册 + 退出弹窗 | 全局键位 | `AuroraShell.tsx` / `useKeyboardShortcuts` / 新增 `QuitModal` | ~50 行 |
| ③ | **P1-A** | canvas 空态亮卡 → 暗色一致 | canvas 视图 | `ExcalidrawCanvas.tsx` + `canvas.css` 兜底 | ~15 行 |
| ④ | **P1-B** | 菜单项 accelerator 渲染 + ⌘ 符号归一 | 全局菜单 | `commandCatalog.ts` / `MenuBar.tsx` | ~25 行 |
| ⑤ | **P2-A** | WindowControls 桩真实化 | 顶栏 chrome | `TitleBar.tsx` / `AuroraShell.tsx` / `WindowControls.tsx` | ~30 行 |
| ⑥ | **P2-B** | 状态栏底色实底化 + 上边发丝 | 状态栏 | `shell.css` | ~4 行 |
| ⑦ | **P2-C** | blog 默认色板 violet 复核 | blog 视图 | `src/features/blog/utils/singleFile/*` | 配置核查 |
| ⑧ | **P3-A** | Inspector `width` prop 真正应用 | 右栏组件 | 右栏 Inspector 组件 | ~10 行 |
| ⑨ | **P3-B** | CommandPalette 双副本归一 | 架构债 | `CommandPalette.tsx` ×2 | 视差异 |
| ⑩ | **P3-C** | categoricalColors token 化 | 主题色板 | `tokens.css` + `categoricalColors.ts` | ~25 行 |
| ⑪ | **P3-D** | sidebar avatar 真实首字母 | 侧栏 | `Sidebar.tsx`（已接 profile） | 低优先 |
| ⑫ | **P3-E** | Increase Contrast 备选 | a11y | `tokens.css` + `shell.css` | ~20 行 |

**执行顺序**：①→②→③→④ 为 P0/P1 硬骨头（用户首启动体感）；⑤→⑦ 为 P2 行为/视觉补强；⑧→⑫ 为 P3 架构与 a11y 收尾。每批独立验证、独立提交。

---

## 2. 逐批详细实施方案

### 批次 ① P0-A · 菜单栏补齐 App / Edit / Window（CRITICAL） ✅ 已落地 2026-09-09

**现状**：`MenuBar.tsx` 现有 `FILE / VIEW / GO / TOOLS / HELP` 五组。「设置」错误置于帮助菜单；无 App/Edit/Window；无关于/退出/撤销重做/剪贴板/查找入口。

**根因**：P1-1（历史批）只补了「五组 + commandRegistry 接入」，未对齐 HIG §1.1（App/File/Edit/View/Window/Help 最小集）与 §1.5（App 菜单必含 About/Settings/Hide/Quit）。

**方案（完整 HIG）**：

**A. 新增 `APP_MENU`（最左、应用名加粗）** —— 在 `MenuBar.tsx` `MENUS` 数组首位插入：
```
const APP_MENU: AuroraMenu = {
  title: 'MarkCraft',
  entries: [
    { id: 'app.about', label: '关于 MarkCraft' },
    { id: 'settings.openSettings', label: '设置', /* ⌘, 已由 catalog 持有 */ },
    '---',
    { id: 'app.hide', label: '隐藏 MarkCraft', /* ⌘H */ },
    { id: 'app.hideOthers', label: '隐藏其他', /* ⌘⌥H */ },
    { id: 'app.showAll', label: '显示全部' },
    '---',
    { id: 'app.quit', label: '退出 MarkCraft', /* ⌘Q */ },
  ],
}
```
- `app.about` action → `nav('settings', 'about')`（需确认 SettingsPanel 接受 `about` initialCategory；否则 `nav('settings')` 后滚动到关于区）。
- `app.hide/hideOthers/showAll`：**Web 限制**——无真实隐藏窗口能力。action 降级为 `window.blur()`（仅让出焦点，不破坏体验），菜单项照 HIG 结构保留（Mac 用户期望在此处看到）。代码注释标注 Web 限制。
- `app.quit` action → 见批次②（打开退出确认弹窗）。

**B. 新增 `EDIT_MENU`**（紧随 APP 之后，置于 VIEW 之前）：
```
const EDIT_MENU: AuroraMenu = {
  title: '编辑',
  entries: [
    { id: 'edit.undo', label: '撤销', shortcut 见 catalog },
    { id: 'edit.redo', label: '重做' },
    '---',
    { id: 'edit.cut', label: '剪切' },
    { id: 'edit.copy', label: '复制' },
    { id: 'edit.paste', label: '粘贴' },
    { id: 'edit.selectAll', label: '全选' },
    '---',
    { id: 'edit.delete', label: '删除' },
    { id: 'edit.find', label: '查找', /* ⌘F */ },
  ],
}
```
- 撤销/重做：`runInEditor(() => cmdBridge.current.undo?.())` / `redo?.()`（复用 `auroraActions` 已有的 `runInEditor` 模式；非编辑器视图下先跳编辑器）。
- 剪切/复制/粘贴/全选/删除：Web 下依赖浏览器原生（聚焦可编辑区时 ⌘X/⌘C/⌘V/⌘A/Delete 天然生效）。菜单项 action = `document.execCommand('cut'|'copy'|'paste'|'selectAll')` 兜底（对 input/contenteditable/CodeMirror 有效，deprecated 但功能可用）；非可编辑焦点时 `execCommand` 静默无副作用。
- 查找：`edit.find` → `runInEditor(() => cmdBridge.current.find?.())`（编辑器内部查找）；非编辑器视图先跳编辑器。

**C. 新增 `WINDOW_MENU`**（置于 HELP 之前）：
```
const WINDOW_MENU: AuroraMenu = {
  title: '窗口',
  entries: [
    { id: 'window.minimize', label: '最小化', /* ⌘M */ },
    { id: 'window.zoom', label: '缩放' },
    '---',
    { id: 'window.bringAllToFront', label: '全部移至最前' },
  ],
}
```
- `window.minimize/zoom`：Web 下映射到与顶栏交通灯同一套 handler（见批次⑤：minimize→无真实最小化可降级为 `window.blur()`；zoom→`document.documentElement.requestFullscreen()` 切换）。
- `window.bringAllToFront`：单窗口 Web 应用无窗口列表，action 为 no-op（保留菜单结构）。

**D. `MENUS` 重排**：
```ts
const MENUS: AuroraMenu[] = [APP_MENU, FILE_MENU, EDIT_MENU, VIEW_MENU, GO_MENU, TOOLS_MENU, WINDOW_MENU, HELP_MENU]
```
- `HELP_MENU` 仅留「切换中 / 英文」（移除「设置」，已迁 App 菜单）。
- `FILE_MENU` 补 `{ id: 'file.close', label: '关闭', /* ⌘W */ }`（见批次②）。

**E. 命令注册（两处）**：
1. `COMMAND_CATALOG` 增加 `app.*` / `edit.*` / `window.*` / `file.close` 静态元数据（含 `shortcut` 字段，见批次④符号规范）。
2. `auroraActions.ts` 增加对应 action（quit→批次②；undo/redo/find→cmdBridge；cut/copy/paste/selectAll/delete→`document.execCommand` 兜底；hide/minimize/zoom/bringAllToFront→Web 降级）。

**验证**：tsc=0；`MenuBar` 渲染断言 8 组菜单存在；headless 截 8 视图菜单栏像素，确认 App/Edit/Window 三菜单标题可见、下拉无空白项；Esc/方向键导航仍通。

> **落地记录（2026-09-09）**：8 组菜单已就绪（MarkCraft/文件/编辑/视图/前往/工具/窗口/帮助）。同时补齐 `EditorCommandBridge`/`EditorLayoutHandle`/`TiptapEditorHandle`/`CodeMirrorEditorHandle` 的 `undo/redo/find/deleteSelection/openSearch` 出口，使编辑菜单命令真正触达双内核（源码 CM6 / 所见即所得 Tiptap），非桩实现。降级命令（app.hide/hideOthers/showAll、window.minimize/bringAllToFront）标记 `visible:()=>false` 仅留菜单、不进命令面板；app.quit 暂为 `window.close()`+toast 兜底，**批次②将升级为自定义退出确认弹窗**。`tsc` 与 `vite build` 均通过；本沙箱 vitest 运行器整体异常（连未改动的 TitleBar/stats 测试均报 "No test suite found"/"reading 'on'"），非本次改动所致，待运行器恢复后回归。

---

### 批次 ② P0-B · ⌘Q/⌘W/⌘N/⌘S 注册 + 自定义退出弹窗（CRITICAL） ✅ 已落地 2026-09-09

**现状**：`useKeyboardShortcuts`（AuroraShell 调用）仅绑了 ⌘, / ⌘K / ⌘P / ⌘F(globalSearch) / ⌘S(save) 等部分键；**⌘Q / ⌘W / ⌘N / ⌘Z/⌘⇧Z / ⌘A / ⌘X/⌘C/⌘V 未在应用层注册**。菜单项即便补了，按快捷键也「按了没反应」。

**根因**：HIG §5.1 要求的最小键位集未全量接入应用级 keydown 拦截；Web 壳下 `window.close()` 不可靠，故此前回避 ⌘Q。

**方案**：

**A. 扩展 `useKeyboardShortcuts` 或 AuroraShell 内新增全局 keydown**：
- `⌘N` / `Ctrl+N` → `file.newFile`（preventDefault，避免浏览器新窗口）。
- `⌘W` / `Ctrl+W` → `file.close` 语义：编辑器视图下调 `cmdBridge.current.closeFile?.()`（若无，则 `nav('welcome')`）；Web 无法关窗，行为 = 关闭当前文档/返回欢迎，注释标注限制。
- `⌘Q` / `Ctrl+Q` → 打开 **退出确认弹窗 `QuitModal`**（见下）；preventDefault。
- `⌘F` / `Ctrl+F` → 编辑器内查找（`edit.find`，runInEditor）；preventDefault 避免浏览器查找栏。
- `⌘Z` / `⌘⇧Z`：编辑器聚焦时由 CodeMirror/Tiptap 原生处理，**应用层不抢**（避免双触发）；仅在非可编辑焦点时兜底调用 `edit.undo/redo`。
- `⌘A/⌘X/⌘C/⌘V`：浏览器原生在可编辑区生效，**应用层不拦截**（保持默认）；菜单项结构已在批次①补齐。

**B. 新增 `QuitModal` 组件**（共享 Modal 单源 `src/components/ui/Modal.tsx`，size=sm）：
- 触发：`app.quit` 菜单项 + ⌘Q。
- 内容：标题「退出 MarkCraft」+ 说明「当前为 Web 外壳，关闭将退出此标签页／浏览器窗口」+ 主按钮「退出」+ 次按钮「取消」。
- 「退出」action：`try { window.close() } catch {}`；若 `window.closed` 仍为 false（多数浏览器），则 `document.documentElement.requestFullscreen?.()` 退出全屏 + 提示用户手动关闭标签页（或导航到 about:blank）。不强制破坏数据（自动保存已在 S1 覆盖）。
- 层级：`Modal` 单源 size sm，z-index 走 modal 带（9980）；Esc 关闭。

**C. `file.close` / `app.quit` 的 action 注册**：同批次① E。

**验证**：tsc=0；vitest 加 2 条（⌘Q 打开 QuitModal / ⌘N 触发 newFile）；headless 实按 ⌘Q 截得 QuitModal 像素（暗色卡片、主按钮 accent）；⌘N 新建后视图切 editor 且文件树 +1。

> **落地记录（2026-09-09）**：
> - `AuroraModalId` 扩 `'quit'`；`app.quit` action 改为 `modalOpen('quit')`（真正 `window.close()` 逻辑下沉到 AuroraShell 的 `handleQuitConfirm`：先 `modalClose('quit')` → 尝试 `window.close()` → 若 `window.closed` 仍为 false（Web 外壳多数浏览器静默拒绝），退出全屏并 `toast` 引导手动关闭，诚实不伪造）。
> - `useKeyboardShortcuts` 新增 `onNewFile/onCloseFile/onQuit/onFind/onUndo/onRedo`，keydown 注册 ⌘N/⌘W/⌘Q/⌘F(plain)/⌘Z·⌘⇧Z：`preventDefault` 拦截浏览器默认（新窗口/关窗/浏览器查找栏）；⌘Z 仅在非可编辑焦点兜底（编辑器聚焦交 CodeMirror/Tiptap 原生 undo，避免双触发）；⌘A/⌘X/⌘C/⌘V 不拦截（原生在可编辑区生效）。
> - 新增 `src/aurora/components/shell/QuitModal.tsx`：共享 Modal 单源（size=sm，modal 层带 9980，Esc/遮罩关闭），标题「退出 MarkCraft」+ Web 外壳说明 + 危险主按钮「退出」/幽灵次按钮「取消」，纯呈现、确认逻辑由注入回调承担。
> - `AuroraShell` 接线：注入 6 个快捷键 handler（统一走 `auroraActions` 同一动作源，与菜单命令一致）、渲染 `QuitModal`、定义 `handleQuitConfirm`。
> - 新增 `src/hooks/useKeyboardShortcuts.test.tsx`（6 条：⌘Q/⌘N/⌘W/⌘F 与 ⌘⇧F 分流/⌘Z 可编辑 vs 非可编辑兜底）。
> - 验证：tsc=0；vite build 退出 0（全模块图打包通过，含 QuitModal 与新导入）；本沙箱 vitest 运行器仍整体异常（同批次①，非本次改动），单元测试待运行器恢复后补跑。

---

### 批次 ③ P1-A · canvas 空态亮卡 → 暗色一致（CRITICAL） ✅ 已落地 2026-09-10

> ⚠️ **根因再修正（2026-09-10 实机 CDP + 位图取证）**：本节最初判断「useTheme→getTheme().type 回落 light」**不成立**——实测默认 dark 下 `useTheme()` 正确返回 dark，Excalidraw 亦挂上 `theme--dark`。真正根因是 **Excalidraw 暗色模式的 CSS 反色管线**：`.excalidraw.theme--dark` 定义 `--theme-filter: invert(93%) hue-rotate(180deg)` 并应用于 `.excalidraw__canvas`；而本引擎场景是「暗色直出」创作（`CanvasEngine.loadDocument` 注入 `viewBackgroundColor=#0D0F15` + 浅色笔迹 #94a3b8/#6366f1），暗位图再被反色滤镜反转成亮色（实测 #0D0F15 → #DFE0E5 ≈ 审计采样的 (215,216,220)）。修复 = 宿主内 `filter: none !important`（light 模式无滤镜不受影响）。

**审计原判**：`.aurora-canvas__empty` 亮卡。

**实测修正（重要）**：Aurora 的 `.aurora-canvas__empty-inner` **已用 `var(--mc-bg-elevated)`（暗 #151821）**，本身合规。审计采到的亮卡 `(215,216,220)` 是 **Excalidraw 库自身渲染的 light 主题 UI 浮层**（其空态提示/帮助卡未跟随应用暗色）。

**根因**：`src/features/canvas-v2/engine/ExcalidrawCanvas.tsx:266` 默认 `theme = 'light'`；`CanvasPanel.tsx:648` 传 `theme={theme}`（来自 `useTheme()`）。`useTheme()` 从 `settings.theme` 经 `getTheme().type` 推导——**该推导链在部分主题 id 下可能回落到 `'light'`**，导致 Excalidraw 收到 light。

**方案（双保险）**：
1. **主修**：`ExcalidrawCanvas` 不再依赖间接推导，直接读应用的真实生效主题：
   ```ts
   // ExcalidrawCanvas.tsx
   const appTheme = (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark') ? 'dark' : 'light'
   // 用 appTheme 替代外部传入的 theme（或保留 prop 但缺省读 appTheme）
   ```
   同时 `CanvasPanel` 改用 `settings.theme` 推导的确定值（或干脆移除 prop、内部读 `dataset.theme`），消除 `getTheme().type` 回落风险。
2. **CSS 兜底（belt-and-suspenders）**：在 `canvas.css` 追加对 Excalidraw 浅色浮层的强制暗化（对齐既有 `.aurora-canvas__viewport--behind` 覆盖范式）：
   ```css
   /* Excalidraw 库层自绘浮层在暗色下强制 token 化（防主题回落漏网） */
   .excalidraw .ToolIcon,
   .excalidraw .dropdown-menu,
   .excalidraw .popover,
   .excalidraw [class*='welcome'] { /* 若库暴露欢迎卡类 */
     background: var(--mc-bg-elevated) !important;
     color: var(--mc-text-primary) !important;
   }
   ```
   > 注：Excalidraw 类名需以实机 DOM 核对（headless 截 `.excalidraw` 子树 dump），上述为占位选择器，实施时按真实 class 收敛。

**验证**：tsc=0；headless 进 canvas 空态，PIL 采样原亮卡区 (x=700..900, y=400..500) 须 = `(21,24,33)` 档（bg-elevated 暗）而非 `(215,216,220)`；切换 light/dark 均一致。

> **落地记录（2026-09-10）**：
> - `excalidraw-hide-ui.css`：新增 `.excalidraw-canvas-host .excalidraw__canvas { filter: none !important }` 关闭 Excalidraw 暗色反色管线（真正修复）；补齐 `.welcome-screen` 外层包装隐藏；补 `[data-theme='dark']` 限定对库自绘浮层（Tooltip 等）强制 token 暗化的兜底网（不影响 light 模式、不触碰绘图画布）。
> - `ExcalidrawCanvas.tsx`：theme 改由 `<html data-theme>` 单一数据源解析（`applyTheme` 同步写入），传入 prop 仅作无 document 环境兜底——消除 `useTheme→getTheme(id).type` 在个别主题 id 下的回落风险（纵深防御，非本次主因）。
> - 验证（CDP + PIL 实证）：`.excalidraw` 挂 `theme--dark`、appState `viewBackgroundColor=#0D0F15`/`theme=dark`；位图取样本暗 (13,15,21)，反色滤镜致屏幕呈 (223,224,229)——滤镜关闭后屏幕采样 = **(13,15,21)** 精确达标；全图亮像素 1981/2432 → **5/2432**（剩余为菜单栏文字反锯齿）；空态卡 `--mc-bg-elevated` 暗色正常。tsc=0、vite build 退出 0。
> - 取证截图：`.workbuddy/tmp/shots/plan3-canvas.png`（修复前亮）、`plan3-canvas-fixed.png`（修复后暗）。

---

### 批次 ④ P1-B · 菜单项 accelerator 渲染 + ⌘ 符号归一（MEDIUM） ✅ 已落地 2026-09-10

**现状**：`MenuBar.tsx:263,290` 已读 `commandRegistry.getById(id).shortcut` 渲染右侧；但 `COMMAND_CATALOG` 中多数命令（尤其新增的 edit/app/window/file.close）**未填 `shortcut`**，且已有 shortcut 用 `"Ctrl+S"` 字面，Mac 用户期望 `⌘S`。

**方案**：
1. **补 `shortcut` 字段**：在 `COMMAND_CATALOG` 为以下命令填值（与批次①② action 一致）：
   - `app.quit` → `Ctrl+Q`（Mac 显示 ⌘Q）
   - `app.hide` → `Ctrl+H`；`app.hideOthers` → `Ctrl+Alt+H`
   - `file.close` → `Ctrl+W`
   - `file.newFile` → `Ctrl+N`
   - `edit.undo` → `Ctrl+Z`；`edit.redo` → `Ctrl+Shift+Z`
   - `edit.cut` → `Ctrl+X`；`edit.copy` → `Ctrl+C`；`edit.paste` → `Ctrl+V`；`edit.selectAll` → `Ctrl+A`；`edit.find` → `Ctrl+F`
   - `window.minimize` → `Ctrl+M`
2. **⌘ 符号归一**：在 `MenuBar.tsx` 加 `formatShortcut(shortcut)` 辅助：Mac 平台（`navigator.platform` 含 `Mac` 或 `userAgent` 含 `Mac`）将 `Ctrl→⌘` / `Alt→⌥` / `Shift→⇧` / `Meta→⌘`；Windows/Linux 保留 `Ctrl`/`Alt`/`Shift`。下拉右侧 `shortcut && <span>{formatShortcut(shortcut)}</span>`。
3. **避免与浏览器键位冲突**：`shortcut` 仅作显示；真实拦截在批次②的 keydown（统一用 `metaKey`/`ctrlKey` 跨平台判定）。

**验证**：tsc=0；headless 截菜单下拉，确认 App/Edit/Window 各条目右侧均有 ⌘/Ctrl 符号、无空白；Mac UA 下显示 ⌘。

> **落地记录（2026-09-10）**：
> - 新增 `src/features/commandPalette/shortcutFormat.ts`（D4 单源）：`IS_MAC` 平台判定 + `formatShortcut`（整串归一：Mac 下 `Ctrl+Shift+N`→`⌘⇧N` 和弦无缝连接、`G M` 序列保留空格、`Ctrl+,`→`⌘,`）+ `normalizeShortcutToken`（命令面板 key-cap token 归一）。**仅作显示**——真实键位判定仍统一在 useKeyboardShortcuts（metaKey/ctrlKey 跨平台），纪律不变。
> - `MenuBar.tsx`：下拉右端 accelerator 与 `title` 悬停提示均经 `formatShortcut` 归一。
> - `commandAdapter.ts`：`parseShortcut` 拆 token 后经 `normalizeShortcutToken` 归一，命令面板与菜单栏共享同一符号单源。
> - `commandCatalog.ts`：补 `file.newFile → Ctrl+N`（批次④清单中唯一缺失项；其余 app.*/edit.*/window.minimize/file.close 等已在批次①随元数据一并落地）。
> - 测试：`commandWiring.test.tsx` 断言更新（newFile→`['Ctrl','N']`；「无 shortcut 降级」用例迁至 `file.newFolder`）；`MenuBar.smoke.test.tsx` 新增 `formatShortcut` 平台归一双用例（vi.resetModules + navigator.platform 模拟 Mac/Win32）。
> - 验证：tsc=0；CDP 实机（Win32）dump 三个下拉全部 accelerator 正确（App：设置 Ctrl+,/隐藏 Ctrl+H/隐藏其他 Ctrl+Alt+H/退出 Ctrl+Q；文件：新建 Ctrl+N/快速记一笔 Ctrl+Shift+N/保存 Ctrl+S/关闭 Ctrl+W；编辑：撤销/重做/剪切/复制/粘贴/全选/查找齐备，`删除` 按设计无快捷键）；截图 `plan4-menu-{app,file,edit}.png`。本沙箱 vitest 运行器仍整体异常（同批次①②③），新增单测待运行器恢复后补跑。

---

### 批次 ⑤ P2-A · WindowControls 桩真实化（MEDIUM） ✅ 已落地 2026-09-10

**现状**：`WindowControls.tsx` 的 `onMinimize/onMaximize/onClose` 仅是 prop 透传；实际接线处（`TitleBar` ← `PageFrame`/chrome）传入的是桩（设计文档标注 `console.log`）。点 × 关不掉、maximize 无反馈。

**方案**：
1. **`AuroraShell` 持有真实 handler**，经 `TitleBar` `onMinimize/onMaximize/onClose` 下发（与批次② QuitModal 共用）：
   - `onClose` → 同 `app.quit`：打开 `QuitModal`。
   - `onMaximize` → `toggleFullscreen()`：复用 `AuroraShell` 已有 `onToggleFullscreen`（`document.documentElement.requestFullscreen()` 切换）；回传 `maximized` 状态（用 `document.fullscreenElement` 反映）。
   - `onMinimize` → Web 无真实最小化：`window.blur()` 降级（注释标注 Web 限制），或 `document.documentElement.requestFullscreen?.()` 退出全屏作为可视「收起」反馈。
2. **`TitleBar` 已透传**（无需改）；确认 `PageFrame` 渲染 `TitleBar` 处传入上述 handler（grep `TitleBar` 消费方，替换桩）。
3. **视觉**：交通灯保持中性灰图标（审计确认 Web 壳下可接受，非 macOS 原生壳不强制红黄绿）。

**验证**：tsc=0；headless 点击 × 截得 QuitModal；点击 maximize 截得 `:fullscreen` 态（标题栏消失/视口铺满）；minimize 不报错、焦点让出。

> **落地记录（2026-09-10）**：
> - **实施位置修正**：方案原设想「AuroraShell 持 handler 经 TitleBar 下发」，实际架构是六个面板（Welcome/Blog/Canvas/Diary/Editor/Settings）各自挂载 `PageFrame`、桩在 `PageFrame.tsx` 的 TitleBar 接线处——故在 PageFrame **单点真实化**（全面板一次受益），不向六面板重复穿线。
> - `PageFrame.tsx`：`onMinimize/onMaximize/onClose` 由 `console.log` 桩改为经 `commandRegistry` 命令单源触发（`window.minimize`→blur 降级、`window.zoom`→Fullscreen 切换、`app.quit`→QuitModal 确认）——与菜单栏/快捷键同一动作源，未注册时静默 no-op（防御注册时序）；删除本地 `maximized` 状态翻转，改为 `fullscreenchange` 监听跟随真实全屏态（用户 F11 亦同步图标）。
> - `WindowControls`/`TitleBar` 纯透传，无需改动；`01-shell-components.md` §1/§5 同步更新（桩警告 → 真实化说明）。
> - **验证（CDP 实机 + 真实鼠标事件 Input.dispatchMouseEvent）**：点 × → QuitModal 弹出（暗色卡、Web 外壳说明、危险主按钮，截图 `plan5-quitmodal.png`）；点最大化 → `document.fullscreenElement=true` 且图标 aria-label 切「还原」（截图 `plan5-maximized.png`）；再点还原 → fullscreen=false 图标回「最大化」；点最小化 → blur 降级无报错。tsc=0。
> - **验证坑**：全新 headless profile 会弹 AudienceOnboarding 首启引导（`.aurora-audience__backdrop` 全页遮罩拦截一切点击）——脚本须先点「开始使用」再验证，属预期应用行为非回归；headless Edge 的 `requestFullscreen` 需真实 user activation，须用 CDP Input 域鼠标事件而非 JS `click()`。

---

### 批次 ⑥ P2-B · 状态栏底色实底化 + 上边发丝（LOW→P2） ✅ 已落地 2026-09-10

**现状**：`shell.css:810 .aurora-statusbar` 为 `background: rgba(13,15,21,0.72)` + `border-top: 1px solid var(--mc-border-subtle)`。半透明叠暗内容，视觉上与窗口底色趋于一体（审计 §6-A 像素实证底缘 = `#0A0B0F`）。

**方案**：将底色改为实底以明确分层（保留发丝上边线）：
```css
.aurora-statusbar {
  background-color: var(--mc-bg-content); /* 实底，与 bg-window 区分出层级 */
  /* border-top: 1px solid var(--mc-border-subtle); 已存在，保留 */
}
```
> 若产品希望保留毛玻璃质感，可维持 `rgba` 但将 alpha 提到 `0.92` 并加 `border-top` 加粗 1px；推荐实底（最稳，跨模式一致）。

**验证**：tsc=0；headless 截状态栏底缘像素 ≠ 窗口底色（应更亮一档 = `#101218`）；light 模式同理。

---

### 批次 ⑦ P2-C · blog 默认色板 violet 复核（MEDIUM · 配置核查） ✅ 已落地 2026-09-10

**现状**：blog 预览「My Blog」标题 `#6F00C8` 强紫，审计 §5-A 标注「需用户复核默认色板」。当前为某主题 accent 端点。

**方案**：
1. **定位默认**：grep `src/features/blog/utils/singleFile/*`（magazine 模板 `classicThemeCssBase.ts` / `classicThemeCssCards.ts`）的默认 `--accent-*` 取值与 `COLOR_SCHEMES`/`THEME_INFO_LIST` 默认项。
2. **收口默认**：若默认就是饱和 violet 端点，将其改为更收敛的同族色（如 `accent-warm`/`accent-cool`，与 P0-3 收敛策略一致），保留用户可在主题市场切换紫/蓝/绿等；**默认不落在最高饱和 violet**。
3. **不改用户可选色板能力**：仅调整默认值，不删除 violet 选项。

**验证**：tsc=0；headless 进 blog 视图，PIL 采「My Blog」标题色，确认默认非 `#6F00C8` 强紫（或已在用户主动选中的色板内、有出处）；切换配色联动。

---

### 批次 ⑧ P3-A · Inspector `width` prop 真正应用（LOW） ✅ 已落地 2026-09-10

**现状**：设计文档 §01 L38 标注右栏 Inspector `width` prop 已声明但未解构/应用，调用方传 width 被忽略，固定 280px。

**方案**：
1. grep 右栏 Inspector 组件（canvas `CanvasInspectorPanel` / `aurora-cip` 容器）的 `width` 入参，将其解构并应用到根容器 `style={{ width }}`（或 CSS 变量 `--mc-inspector-w`）。
2. 默认值维持 `280px`（与 `.aurora-canvas__overlay` / 既有 280 一致），调用方可覆盖。

**验证**：tsc=0；单测/headless 传 `width={340}` 截得右栏宽度 = 340px。

---

### 批次 ⑨ P3-B · CommandPalette 双副本归一（LOW · 架构债） ✅ 已落地 2026-09-10

**现状**：`src/components/command-palette/CommandPalette.tsx`（主壳层）与 `src/aurora/panels/canvas/CommandPalette.tsx`（canvas 内嵌）疑似双副本。

**方案（先审计后归并）**：
1. diff 两份：若 canvas 版是「嵌入轻量变体」（缺文件搜索/分组），则**提取共享渲染内核**到 `command-palette/CommandPaletteCore.tsx`，两处各包一层（主壳全功能 / canvas 嵌入式）；若功能实质相同，删除 canvas 副本、canvas 直接 import 主壳。
2. 严禁新增第三副本；统一消费 `commandRegistry` 单一数据源（已满足）。

**验证**：tsc=0；vitest 全绿；grep 确认仅一处实质实现 + 包装层；headless 主壳 ⌘K 与 canvas 内嵌命令面板均可用。

---

### 批次 ⑩ P3-C · categoricalColors token 化（LOW） ✅ 已落地 2026-09-10

**现状**：`src/themes/categoricalColors.ts`（glob 未直接命中，实施时先 `grep -rn categoricalColors` 定位真实路径）硬编码 hex（`#FBBF24`/`#3B82F6`/`#14B8A6`… + `GROUP_COLORS` 6 色），未走 `--mc-cat-*` token。违反 v1 P0-4 色板单源纪律；跨模式（紫粉/暖灰/蓝绿）不联动。

**方案**：
1. `tokens.css` 定义 `--mc-cat-{folder,markdown,canvas,image,pdf,template,daily,unknown}` 与 `--mc-cat-group-{1..6}`，分别注入 dark/light 块（dark 用现有暗色家族值，light 用对应明色）。
2. `categoricalColors.ts` 改为引用这些 CSS 变量（运行时 `getComputedStyle` 读，或导出 token 名由消费方经 `var(--mc-cat-x)` 取）；移除硬编码 hex。
3. 消费方（graph 节点色 / 分类标签）同步改 `var(--mc-cat-*)`。

**验证**：tsc=0；headless 切 dark/light，PIL 采 graph 分类色，确认随模式联动；grep 确认源文件无游离 hex 分类色。

---

### 批次 ⑪ P3-D · sidebar avatar 真实首字母（LOW · 已部分就位） ✅ 已落地 2026-09-10

**现状**：`Sidebar.tsx:56-57` 已用 `userDisplayName(profile)` / `userInitial(profile)`，avatar 显示「U」仅因**默认 profile 无 name/avatarUrl**（审计 §4-D 误判为硬编码）。

**方案**：确认 `userInitial` 在无 name 时回退合理（如取邮箱首字母或固定图标）；**默认 profile 补充占位名**（如 `settings` 里 user.name 默认非空或显示应用图标）。低优先，可与批次⑦一并处理默认配置。

**验证**：tsc=0；headless 截侧栏底部 avatar，确认非孤立「U」（有合理首字母或图标）。

---

### 批次 ⑫ P3-E · Increase Contrast 备选（LOW · a11y） ✅ 已落地 2026-09-10

**现状**：dark 默认对比度高，但未提供 `.high-contrast` 备选（HIG §11.7）。

**方案**：
1. `tokens.css` 加 `[data-contrast='high']` 块：提亮 `--mc-text-*`、加粗发丝 `--mc-border-*`、缩小半透明面。
2. 设置面板加「高对比度」开关 → `updateSetting('contrast','high')` → 根容器 `data-contrast`。

**验证**：tsc=0；headless 开高对比，PIL 采文本/发丝色，确认对比度提升；开关可回退。

---

## 3. 验证三件套（每批必跑）

1. **类型**：`node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` → 0 error。
2. **单测**：`node_modules/.bin/vitest run`（聚焦改动模块 + 全仓基线 776/1fail(预存 blogCssRefs)/2skip 不退化）。
3. **像素**：沿用 v2 CDP 脚本（`.workbuddy/tmp/cdp-audit2.js`，`--force-device-scale-factor=1`）+ PIL `Image.getpixel` 网格采样，替代印象判读。

> 每批完成后截图存档 `.workbuddy/tmp/shots/plan-{批次}-{视图}.png`，与审计报告取证同口径。

---

## 4. 风险与回退

| 风险 | 缓解 |
|---|---|
| Excalidraw 类名随版本变，CSS 兜底选择器失效 | 实施时先 dump 实机 `.excalidraw` 子树核对真实 class；主修（读 `dataset.theme`）已保证主题正确，CSS 仅为兜底 |
| ⌘Z/⌘A 应用层抢键与编辑器原生冲突 | 仅非可编辑焦点兜底，编辑器聚焦交原生（批次②明确） |
| `app.hide/showAll/minimize` Web 无真实能力 | action 降级为 `window.blur()`，菜单结构保留，注释标注限制（诚实不伪造） |
| `window.close()` 多数浏览器静默失败 | QuitModal 说明 + 退全屏 + 引导手动关闭（批次②） |
| 双 CommandPalette 归并引入回归 | 先 diff 再抽核，保留主壳全功能，vitest 覆盖两入口 |

---

## 5. 交付清单（本方案产物）

- 本实施方案 MD（`.workbuddy/artifacts/AURORA-OPTIMIZATION-PLAN-2026-09-09.md`）
- 后续执行：按批次①→⑫ 串行推进，每批独立验证后提交；批次①/② 为 P0 硬骨头优先。
- 两决策已锁定：完整 HIG 三菜单 + 自定义退出弹窗。
