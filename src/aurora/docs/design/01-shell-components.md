# 01 · 共享壳层与 UI 组件规范

> 严格对应 `src/aurora/components/shell/*`、`components/ui/*`、`components/command-palette/*` 的当前实现。所有面板通过 `PageFrame` 统一挂载。

## 1. PageFrame（五层外壳）

组成：`TitleBar` → `Body(Sidebar + main + Inspector)` → `StatusBar`。

**Props（`PageFrameProps`）**
- `sidebarGroups?` / `sidebarActiveId?` / `onSidebarSelect?(label)`：书脊导航。统一使用共享常量 `AURORA_SIDEBAR_GROUPS`。
- `defaultSidebarCollapsed?`：**默认 `true`（侧栏默认折叠）**。
- `breadcrumbs?: string[]` / `breadcrumbOnClick?(index)`：面包屑导航（分隔符 `›`；非末项在传入 `breadcrumbOnClick` 时可点击）。
- `inspectorTabs?`：不传则不渲染右 Inspector。`defaultInspectorCollapsed?`（默认 `false`）/ `inspectorCollapsed?`（受控）/ `onInspectorToggle?` / `inspectorClassName?` / `inspectorIconMode?`（默认 `false`）。
- `statusLeftItems?` / `statusRightItems?`：`StatusBarItem[]`（`{content, clickable?, onClick?, title?}`）。
- `savedState?: 'saved'|'unsaved'|'saving'`（默认 `'saved'`）、`showWindowControls?`（默认 `true`）、`brandName?`（默认 `'Markcraft'`）、`blurred?`、`toolbar?`、`children`。
- 侧栏宽度：`collapsed ? var(--mc-sidebar-collapsed-w) : var(--mc-sidebar-w)`。
- 另导出 `Toolbar` 三栏容器（`left/center/right`）。

> ✅ 窗口控制（批次⑤ P2-A 真实化）：`onMinimize/onMaximize/onClose` 经 `commandRegistry` 命令单源触发（`window.minimize`→Web 降级 `window.blur()`、`window.zoom`→Fullscreen 切换、`app.quit`→QuitModal 确认），与菜单栏/快捷键同一动作源；`maximized` 由 `fullscreenchange` 监听跟随真实全屏态（用户 F11 亦同步图标）。

## 2. Sidebar / SidebarItem

- **Sidebar**：`groups?: SidebarGroup[]`（`{title?, items: SidebarItemProps[]}`）、`activeId?`、`onSelect?(label)`、`collapsed?`、`onToggleCollapse?`、`footerContent?`、`sidebarContent?`。
  - 渲染分组标题 + 项；底部用户区（头像取自 `useUserProfile()`：有 `avatarUrl` 显示图、否则首字母）+ 昵称（取自 `userDisplayName`）。
  - 用户区为可点击按钮，经 `useUserAccountNav()` 跳转账户设置（`nav('settings','user')`）。展开 200px / 折叠 60px（仅图标）。
- **SidebarItem**：`icon: IconName`、`label`、`active?`、`count?`、`onClick?`。图标 20px + 文字 + 右侧 count；选中态左侧 accent 指示条 + 柔背景。折叠态仅方形图标。

## 3. StatusBar

- `leftItems?` / `rightItems?`。默认左项：状态点（绿/黄）+ 文字（已保存/未保存/保存中，由 `savedState` 驱动）；右项默认空。
- 项间分隔符为中点 `·`（非竖线）。
- ⚠️ `savedText` 可在 `StatusBarItem` 设置，但 `PageFrame` 未透传（仅传 `savedState`），故自定义文案暂不可由 PageFrame 设置。

## 4. Inspector

- `tabs: InspectorTab[]`（`{id, label, icon?, content}`）、`defaultTabId?`、`collapsed?`、`onToggle?`、`width?`、`className?`、`iconMode?`。
- 折叠态：32px 竖条（"更多" + `chevronLeft`）。展开态：Tab 栏 + `chevronRight` 收起 + 内容区。`iconMode` 下 Tab 仅图标 + Tooltip 悬停。默认宽 280px。
- `width` prop（P3-A 已实现）：传入时以 inline style 覆盖 token 默认宽（collapsed 折叠态不适用）；未传时保持 280px。

## 5. TitleBar / WindowControls

- **TitleBar**：左侧应用图标（⚠️ 当前硬编码字符 `M`，未用 `Icon.logo`）+ 应用名 + 面包屑；中部 `app-region: drag` 拖拽区；右侧 `WindowControls`。无居中标题槽位（`shell.css` 中旧 `--has-center/__center/__right-extra` 已废弃）。
- **WindowControls**：最小化 / 最大化(可还原) / 关闭；关闭 hover 红 `#E81123`。行为经 `commandRegistry` 命令单源（见 §1 批次⑤注）；交通灯保持中性灰（Web 壳不强制 macOS 原生红黄绿）。
- **MenuBar**（2026-09-10 使用优化①）：七组菜单（文件/编辑/视图/前往/工具/窗口/帮助）。原首组 App 菜单「MarkCraft」（关于/设置/隐藏×3/退出）已整体移除——关于与退出仍经命令面板/交通灯可达（`app.about`/`app.quit` 保留），设置经头像进入；隐藏类命令为 Web no-op 已随菜单删除。

## 6. UI 组件（`components/ui`）

| 组件 | 变体 / 关键 props | 视觉状态 |
|---|---|---|
| `Button` | `variant` primary/secondary/ghost/danger（默认 secondary）；`size` sm/md/lg；`leftIcon/rightIcon/iconOnly/pill` | 默认/hover/pressed/disabled |
| `Badge` | `variant` default/info/success/warning/danger | — |
| `Checkbox` / `Switch` | 同文件实现（`Badge.tsx` 内导出，`index.ts` 导出 `Badge/Checkbox/Switch`） | — |
| `Card` | `title/subtitle/header/footer/hoverable` | — |
| `DropdownMenu` | `items`（`id,label,icon?,shortcut?,disabled?,separator?,onClick?`）、`onSelect`、`width`；纯内容组件，含键盘 ↑/↓/Enter/Esc | — |
| `Input` | `size`、`leftIcon/rightIcon/rightAction`、`error` | 默认/hover/focus/error/disabled |
| `ListItem` | `label/subtitle/icon/meta/actions`、`selected/active`、`density` comfortable/compact/cozy`；另导出 `ListGroupTitle` | — |
| `Modal` | `open`、`title?`、`footer?`、`onClose?`、`closeOnOverlayClick?`（默认 true）、`width?`（默认 480）；Esc 关闭 + 锁滚动 | — |
| `Segmented` | `options`、`value?/defaultValue?/onChange`、`variant` default/accent；滑块弹簧动画 | — |
| `Tooltip` | `content`、`children`（克隆单元素）、`placement` top/bottom、`delay`（默认 500ms），带箭头 | — |

> ⚠️ `Radio` 仅有 CSS（`.aurora-radio*`），无 React 组件，`index.ts` 未导出。

## 7. 命令面板（共享组件）

`components/command-palette/CommandPalette.tsx`：
- Props：`open`、`onClose`、`commands: CommandItem[]`（`{id,title,description?,icon?,group,shortcut?,action}`）。
- **功能完整**：打开聚焦、按 `group` 分组、子串匹配（title/description/group 的 `includes`，非模糊算法）、键盘 ↑/↓/Enter/Esc、执行 `action()` 后 `onClose`。
- ⚠️ **不自带全局快捷键**（如 ⌘K），需调用方接线；无命令注册中心，命令由 `commands` prop 注入。
- ⚠️ 与 `panels/canvas/CommandPalette.tsx` 存在**双副本**，需统一。
