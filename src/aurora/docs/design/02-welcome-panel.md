# 02 · 欢迎页（Welcome）规范

> 对应 `panels/welcome/WelcomePanel.tsx` + `styles/panels/welcome.css`。
> C 线重新设计：**L1 Launchpad v2**（中性启动器，首页不谈写作/文档，进去才是各模块）。
> 视觉：去玻璃 / 去极光辉光 / 去渐变 logo / 唯一 accent 收口（§18 桌面原生基线）。

## 1. 布局结构

`PageFrame`（侧栏 active=`欢迎页`，状态栏 `⌘K 命令面板`；P1-4 起不显示版本号——版本归属欢迎页脚 + 设置 About）。主内容 `.aurora-welcome__container`（max-width 920，居中单列）：

- **品牌行** `.aurora-welcome__brand-bar`：logo（字面 `M`，accent 实色方块）+ `MarkCraft` 标题。
- **人情味问候** `.aurora-welcome__greeting`：按时段问候 + 真实使用天数 + 真实连续天数。
- **主区** `.aurora-welcome__launchpad`（左大右小非对称 flex）：
  - 左大卡 `.aurora-welcome__hero`：编辑器 = 上次停留（`getRecentFiles()[0]` 作「继续《…》」；无则「新建笔记」）。
  - 右 2×3 网格 `.aurora-welcome__tiles`：日记 / 知识库 / 白板 / 博客 / 设置 / 搜索（搜索 = 命令面板）。
- **页脚** `.aurora-welcome__version` = `Markcraft v2.0.0 · Aurora`。

## 2. 人情味问候（真实数据，零假 affordance）

- `getUsageDays()`：首启日存 `localStorage['markcraft.firstLaunch']`，之后每日自增（安装年龄）。
- `computeStreak(valid)`：从今天(或昨天)往前数 `recentFilesManager` 中 `lastOpened` 有活动的连续天数（真实连续使用天数）。
- `greetingByHour(hour)`：凌晨好 / 早上好 / 中午好 / 下午好 / 晚上好。
- 显示名取自 `useUserProfile()` 的昵称（`userDisplayName`，空则回退「用户」），与侧栏头像、账户设置同源。

## 3. 模块网格 + 导航

- `MODULE_TILES`（5 项）：`calendar 日记 / knowledge 知识库 / canvas 白板 / blog 博客 / settings 设置`，点击 `handleNav(label)` → `resolveAuroraNav` → 路由 id。
- 搜索 tile：点击 `openCommandPalette()`（非 nav）。
- 左大卡 `handleOpenLatest`：有最近文档 → `openFile(id)` + `nav('编辑器')`；无 → `handleNewNote`（真实 `createFile` + `nav('编辑器')`）。
- 全部可点元素 `role=button` + `tabIndex=0` + `Enter` 键触发（键盘可达）。

## 4. 图标 / 字体 / 动效

- 图标来自 `components/ui/Icon`（`edit/calendar/knowledge/canvas/blog/settings/search`），品牌标志为字面 `M`（非图标组件）。
- 字号：hello 34 / usage 18（硬编码 px，配合 `--mc-text-*` 色）；tile-label 14 / 大卡标题 22。
- 动效（CSS，无自动播放）：tile `hover` 抬起 3px + accent 描边 + 底色微亮；`:focus-visible` accent 焦点环；大卡 hover 描边加深。无玻璃 / 无辉光 / 无渐变（§18）。

## 5. 已删除 / 纪律

- 旧 Phase 2 右栏（4 KPI + `.aurora-editor__empty-dash` 365 天热力图，`useDashboardData`）**已彻底删除**——正是被否的「企业后台」味。
- 死组件 `QuickStartCard.tsx` **已退役**（仅旧欢迎页用过）。
- 底部「每日模板」提示条（写作 nudges）**已删除**——欢迎页不谈写作。
- 零假 affordance：使用天数 / 连续天数均为真实派生数据；首页无「文档 / 笔记 / 写」字眼。
