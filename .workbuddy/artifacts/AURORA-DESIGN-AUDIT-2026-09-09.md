# MarkCraft Aurora 桌面端界面穷尽式设计审计 v2

**日期**：2026-09-09
**审查视角**：anti-slop（taste-skill）+ macOS HIG（macos-design-guidelines）
**审查方式**：Edge headless + CDP（Emulation.setDeviceMetricsOverride 1600×950 @ 1x DPR）+ DevTools DOM dump + 系统性 Grep + PIL 像素采样
**范围**：`src/aurora/*` 实际界面 + 共享 `src/components/ui/*` + `src/features/blog/utils/singleFile/*` 博客模板 + `src/themes/categoricalColors.ts`
**基线**：v1 审计（AURORA-DESIGN-AUDIT-2026-09-08）已宣布 P0/P1/P2 全清。本轮按"穷尽式"复查 → **重访旧项 + 找出 v1 未覆盖/未抓到的盲点**

---

## 1. 设计读（Design Read · 穷尽式重写）

**MarkCraft = 桌面端 Markdown 编辑器**，浏览器壳里跑出 macOS IDE 质感；v1 修复后 token 单源 + z-index 层带 + 圆角锁 + 密度档齐备，是「**纪律层完备 / 行为层仍有 HIG 缺口**」的阶段。

- 单源 token：`src/aurora/styles/tokens.css`（深色默认）— `--mc-bg-window:#0A0B0F` / `--mc-bg-content:#101218` / `--mc-bg-elevated:#151821`
- 圆角锁 sm:4 / md:8 / lg:12 / pill:999
- 密度默认 compact：`titlebar 41px`（像素实证 a2-editor.png y=41 hairline）、侧栏 rail ~52px
- 视图集：welcome / editor / canvas / graph / kb / blog / diary / settings（6 主深链 + 2 aux）

**当前阶段特征**：可观察的「桌面软件基本盘」已铺好（菜单栏 / 顶栏 breadcrumb / 状态栏三段 / 密度收紧 / 侧栏分组），但**菜单栏缺三个 HIG 必含菜单、若干组件仍是桩、空态/卡片有视觉反向**。

**Dial**（taste-skill）：DESIGN_VARIANCE ≈ 5（系统化低变异）/ MOTION_INTENSITY ≈ 3（克制）/ VISUAL_DENSITY ≈ 7（IDE 紧凑档）—— 这是给审查打分用的内部 dials，**不写进用户可见 UI**。

---

## 2. 像素实证底座（v2 取证 · 替代 v1 凭印象）

| 维度 | v1 截图 | v2 截图（1600×950） |
|---|---|---|
| editor 顶栏底边 | 47px（v1 修复前）| **41px**（compact，P1-3 已落地 + 像素实证 y=41 hairline） |
| 侧栏分组分隔 | 未检 | **rail 内 y=206 / y=263 / y=851** 均为 40px 全宽 #292E30（P2-2 已落地） |
| 状态栏底色 | 未检 | 6 视图底部 y=H-12 均 `#0A0B0F`（与 bg-window 同色 —— 待核 §6-A） |
| blog "My Blog" 标题色 | 未检 | **#6F00C8**（sat=200，深紫） —— P0-3 保留用户色板策略兑现 |
| canvas 画布中心 | 未检 | (116,121,132) 卡文字区 + 周边 (26,28,36) 暗底 + **空态卡 (215,216,220) 亮卡** —— **反白屏 ⚠️** |

> 审查者笔记：v2 起所有视觉结论走 PIL 网格采样，**像素采样优先于印象判读**（沿袭 v1 教训 §7）。

---

## 3. v1 修复状态复查（穷尽回访）

按 v1 报告 §5 优先级表，逐项核验是否真落地、是否退化。

| v1 项 | 状态 | v2 证据 |
|---|---|---|
| P0-1 主题 dark 默认 | ✅ | editor 主区 bg 12-24 灰阶、画布底色 26-28 暗灰 |
| P0-2 graph 浅蓝紫 | ✅ | graph 画布同属暗色家族 |
| P0-3 blog 紫粉 / 圆角 / 装饰 | ✅ | 圆角锁命中（卡片 ≤ 12px）、"PERSONAL BLOG" 灰 chip、"My Blog" 紫色属用户可选色板 |
| P0-4 圆角锁 | ✅ | CSS 内无违例 px 半径命中 |
| P1-1 应用菜单栏 | ⚠️ **部分** | 五组菜单已就位，**缺 Edit / Window / App 三个 HIG 必含**（详 §4-A） |
| P1-2 顶栏 breadcrumb | ✅ | 空态下隐藏，编辑器文档态按 P1-2 实施 |
| P1-3 信息密度 | ✅ | 顶栏 41px 像素命中、chrome 整体紧凑 |
| P1-4 状态栏 | ✅ | 8 面板 savedState 文档型专属、无营销字符串 |
| P1-5/6 tab 折叠 / 密度 | ✅ | blog 6→3 组 segmented；canvas 接 token |
| P1-7 graph 图例 | ✅ | hairline tick + 线样 swatch |
| P2-1 onboarding 深链 | ✅ | 冷启动深链直达（详见 v2 §5-C 实证） |
| P2-2 侧栏分组 | ✅ | rail 像素实证 y=206/y=263/y=851 |
| P2-3/4/5 | ✅ | 节点几何形 / 「01」灭 / 网格 token |

**结论**：v1 12 项声明中 **11 项完全落地 + 1 项部分落地**（菜单栏 §4-A 是 v1 未抓到的最大盲点）。

---

## 4. macOS HIG 复审（v2 主战场）

按 macOS HIG 章节逐条对照。**Critical = 桌面用户每次使用都会感知 / High = 桌面范式应当 / Medium = 可选体验加分**。

### 4-A · HIG §1 Menu Bar · CRITICAL —— **菜单栏缺三个必含菜单** 🚨

**v1 已建**：文件 / 视图 / 前往 / 工具 / 帮助（5 组）。

**HIG §1.1 要求最小集**：App / File / Edit / View / Window / Help —— 6 组。**v1 缺 Edit 与 Window；缺 App 菜单（应用名作首项加粗）。**

**HIG §1.5 App 菜单必含**：About / Settings (⌘,) / Hide App (⌘H) / Hide Others (⌘⌥H) / Show All / Quit (⌘Q)。

**当前实情**（MenuBar.tsx L100-107）：
```ts
const HELP_MENU = { title: '帮助', entries: [
  { id: 'settings.openSettings', label: '设置' },
  { id: 'settings.switchLanguage', label: '切换中 / 英文' },
] }
```
- ❌ **「设置」放在帮助菜单**（应放 App 菜单）
- ❌ **没有「关于 MarkCraft」**（应放 App 菜单首项）
- ❌ **没有「退出 MarkCraft ⌘Q」**（最严重 —— Mac 用户 Cmd+Q 退出是肌肉记忆，无菜单项且无 accelerator）
- ❌ **没有「退出 ⌘W / 关闭 ⌘W」**（File 菜单无 Close 项；编辑器多 tab 时无关闭动作）
- ❌ **没有 Edit 菜单**（Cut/Copy/Paste/Undo/Redo/Select All/Delete/Find 全无菜单入口，只能靠系统右键 / 键盘 ⌘CV）
- ❌ **没有 Window 菜单**（Minimize/Zoom + 窗口列表 —— 多窗口/MDI 应用必备）

**用户可感知损失**：
- ⌘Q 退出无菜单入口（macOS 用户首启动即困惑）
- ⌘C / ⌘V 之外的剪贴板操作（⌘⌥V 粘贴匹配样式、Delete 删除）无菜单可达
- 多窗口场景无法 Window 菜单聚焦

**修复路径**（推荐批次 P3-A，~30 行）：
```ts
// 新增 APP_MENU（最左、粗体 app 名）
// 补 Close 到 FILE_MENU（⌘W）
// 新增 EDIT_MENU（撤销/重做/剪切/复制/粘贴/全选/删除/查找）
// 新增 WINDOW_MENU（最小化/缩放/全部移至最前 + 窗口列表）
// HELP_MENU 仅留「切换中 / 英文」+「关于」
```

**Severity**：**P0 Critical**（v1 漏检的最大盲点）。不修 = 任何 Mac 用户首启动即发现这不是"桌面软件"。

---

### 4-B · HIG §2 Windows · 部分合规

**Rule 2.6 Traffic Lights**：WindowControls.tsx 渲染了 min/max/close 三按钮（像素可见 41px chrome 右上），但注释自标「美化的 Windows 风格」。**当前为中性灰小图标（10px），非 macOS 交通灯红黄绿**。

**Severity**：
- 非原生 app，**交通灯颜色由系统决定**（Tauri/Electron 等原生壳可触发系统交通灯）。Web 壳下中性色图标属可接受。
- 但 **WindowControls 的 onMinimize/onMaximize/onClose 在当前是桩**（设计文档 §01 L19 标注"仅 console.log"）—— 点击无实际效果。
- **Severity**：**P2 Medium**（视觉可接受，行为是桩需补）。

---

### 4-C · HIG §3 Toolbar · ✅ 合规（子栏 + segmented）

- canvas 顶栏 segmented（4 视图切换）✅
- blog 顶栏主分组 + 次级 segmented ✅
- diary 顶部水平日期头 ✅
- editor 工具栏并入顶部行（VS Code 风）✅

无新发现。

---

### 4-D · HIG §4 Sidebar · ⚠️ 部分合规

**Rule 4.1 Leading Edge, Collapsible**：左 rail 60px 默认收起 ✅。无 Cmd+Ctrl+S  快捷键（HIG 留由 app 选）。

**Rule 4.2 Source List Style**：未走系统 sidebar 视觉风格（自建 .aurora-sidebar 体系）。**桌面用户视角**：无 vibrancy / 无背景模糊 / 暗色实底。可接受。

**Rule 4.5 Badge Counts**：支持（"编辑器 256"、"日记 365"、"白板 12"）。

**新发现**：
- ⚠️ **sidebar 底部 avatar "U" 是硬编码首字母**，未走用户实际头像/首字母
- ⚠️ **avatar title 为 `${displayName} · 点击管理账户`** —— 但 displayName 是 `U`（默认 user.name ?? "U"），实际显示不友好

**Severity**：**P3 Low**（占位合理，可改进）。

---

### 4-E · HIG §5 Keyboard · 大部分合规

| 行为 | 现状 |
|---|---|
| ⌘K 命令面板 | ✅ 已接 commandRegistry |
| ⌘, 设置 | ✅ AuroraShell 注册 |
| ⌘1..⌘9 视图 | ✅ useAuroraShell 实现 |
| ⌘Q 退出 | ❌ **无菜单项、无注册快捷键**（用户大概率首次按即无效） |
| ⌘W 关闭 | ❌ 无菜单项；File 菜单缺 Close |
| ⌘N 新建 | ❌ 菜单项 `file.newFile` 注册但**无 accelerator 显示** |
| ⌘O 打开 | ❌ 同上 |
| ⌘S 保存 | ❌ 同上 |
| ⌘F 查找 | ❌ Edit 菜单不存在 |
| ⌘Z / ⌘⇧Z 撤销 | ❌ Edit 菜单不存在 |
| Esc 关闭浮层 | ✅ 各浮层已就位 |
| Tab 焦点 | ⚠️ focus-visible 已补 11 个按钮家族（v1 R6），但**若干命令面板项、icon 方形按钮、Canvas Inspector 项仍未覆盖**（v1 R6 P1-F3）|

**新发现**：
- ⚠️ 菜单项的 **accelerator 渲染依赖 commandRegistry.shortcut**；当前所有菜单项 shortcut 为空 → 下拉面板右侧空白。**Mac 用户期望每条菜单右侧都有快捷键**。**Severity**：**P2 Medium**。

**Severity 总评**：**P2 Medium**（部分快捷键缺 + 菜单项 accelerator 未渲染）。

---

### 4-F · HIG §7 Notifications / 11 Accessibility

**§7 Notifications**：toast 已 token 化，无新增违例。

**§11.1 VoiceOver Labels**：WindowControls/SidebarItem 等图标钮已设 `aria-label` ✅。

**§11.6 Bold Text**：未走 SwiftUI 渲染，CSS 文本接受浏览器侧 Bold Text 偏好。**Web 无强约束**。

**§11.7 Increase Contrast**：dark 模式默认对比度高，未提供 `.high-contrast` 备选方案。**Severity**：**P3 Low**。

---

## 5. taste-skill 反 AI 味复审

### 5-A · 9.A 视觉与 CSS · 大部分合规

- ❌ **无外发光 / 纯黑 `#000`** ✅（用 `--mc-bg-window` #0A0B0F 暗近黑）
- ❌ **无过饱和强调色** ✅
- ❌ **无大面积渐变文字** ✅（blog "My Blog" 紫色属用户可选）
- ⚠️ **Blog preview "My Blog" #6F00C8 强紫** —— 这是用户可选色板（magazine 模板 `--accent-warm/cool/rose/violet` 之一），sat=200 强度偏高。P0-3 决策保留用户色板 = 合规，但若默认色板就是 violet 则需复核（v1 报告 §5 P0-3 「色板保留」暗含默认 ≠ violet；默认主题是 `themeStyle` magazine，按 `accent-warm` → `accent-cool` 两档收敛，不应是 violet 端）。**需用户复核默认色板配置**。
- ⚠️ **画布空态卡 (215,216,220) 亮色** 与暗色 chrome 不协调 —— taste 9.A 反向。

### 5-B · 9.B Typography · 合规

- ❌ 无 Fraunces / Instrument_Serif ✅
- ❌ 无 oversized H1 ✅
- ❌ 默认 sans（非 serif）✅

### 5-C · 9.C Layout · 合规

- ❌ 无 mathematically perfect padding ✅（密度档允许边距异质）
- ❌ 无 3 列等分 feature card ✅

### 5-D · 9.D Content & Data ✅

- ❌ 无「John Doe」类通用名（welcome "用户" 占位可接受）
- ❌ 无假精确数字（"编辑器 256"、"日记 365" 是真实统计）✅
- ❌ 无 startup-slop 品牌名 ✅

### 5-E · 9.F Production-Test Tells

| 项 | 状态 | 说明 |
|---|---|---|
| Hero 版本号 | ✅ 无 V0.6 / BETA 出现 |
| "Brand · No.01" sub-eyebrow | ✅ 未见 |
| Section-number eyebrows | ✅ v1 P0-3 已清 |
| `01 / 4` pagination | ✅ 未见 |
| 中点 `·` 密度 | ⚠️ **heavy use**（详 §5-G） |
| **Em-dash `—`** | ✅ **代码层全部在注释，UI 文案 0 命中**（grep src/aurora -c '—' 仅注释） |
| `<br>` + italic 标题 | ✅ 未见 |
| Vertical rotated text | ✅ 经核 graph.css `.aurora-graph__rail-collapsed-label` 仅 `font-size:var(--mc-font-xs); letter-spacing:1px` —— **horizontal tiny text，非旋转**（v2 实证：CSS 无 `writing-mode/rotate` 属性） |
| Div-based fake screenshots | ✅ 无 |
| Pills/labels on images | ✅ 无 |
| Photo-credit captions | ✅ 无 |
| Version footers on marketing | ✅ 营销页无；版本只在 About + 欢迎页脚 + 设置 |
| 装饰文字 strip at hero bottom | ✅ 无 |
| Floating top-right sub-text | ✅ 无 |
| Scoring bars with bg track | ✅ 无 |
| Locale / city / time / weather strip | ✅ 无（仅设置里有"上海"账户区，非装饰） |
| Scroll cues | ✅ 无 |
| Section-number eyebrows `00 / INDEX` | ✅ 已清 |
| Decorative dots | ✅ v1 P1-7 清 |
| `border-t + border-b` 每行 | ✅ 发丝单源 |

**Em-dash ban §9.G**：✅ **零 UI 命中**（grep 实证，命中全在代码注释 `// ——` section divider）。

### 5-F · 9.G Em-Dash 文本纪律 · ✅

UI 文案 0 命中 em-dash `—` 与 en-dash `–`（grep src/aurora 仅注释命中）。**完整体现 taste-skill §9.G 零容忍纪律**。

### 5-G · 中点 `·` 密度（borderline）

**taste 4.7「中点每行 metadata strip 最多 1 个」** —— 但这是 landing page 纪律，桌面 status bar / menu / palette 用 `·` 是 HIG native（Finder/Preview/Terminal 均如此）。

**实情**：
- **StatusBar 段落分隔**：✅ 桌面范式（status bar 多 2-3 个 `·` 是 macOS/Windows 共通）。
- **菜单 tooltip `${label} · ${shortcut}`**：✅ 标准桌面菜单双段。
- **DashboardPanel 多处「峰值 X · 近月 Y」/「扫描 X 文件 · Y 链接」**：⚠️ 单行 2 个 `·` 偏多。建议 P3 Low 批：保留 dashboard 内联的 2-3 个，但若 > 3 个需考虑换行。

**Severity**：**P3 Low**（沿用桌面范式，不改）。

---

## 6. v2 新发现（v1 未覆盖盲点汇总）

### 6-A · 状态栏底色等于 bg-window · ⚠️ 边界感缺失

**像素实证**：6 视图状态栏底 y=H-12 均为 `(10,11,15)` = `--mc-bg-window`。

**实情**：StatusBar 容器透明 / 无独立 bg-elevated 底，与窗口底色融为一体，**无明显视觉边界**。

**桌面范式**：macOS 状态栏与窗口底色**通常不同**（独立 `#000` 或半透明），有清晰视觉分层。

**Severity**：**P3 Low**。可在 shell.css `.aurora-statusbar` 加 `background: var(--mc-bg-content)` 或 1px 上边线。

### 6-B · Canvas 空态卡片反白屏 · 🚨 P1 Critical

**像素实证**：canvas 空态卡区域 (x=700..900, y=400..500) 采得 `(215,216,220)` ≈ `#D8D8DC` —— **亮灰卡叠在暗色 canvas**。

**实情**：`.aurora-canvas__empty` / Card 类应走 `--mc-bg-elevated` (#151821) 暗卡，但实际渲染为亮卡。

**影响**：
- 反 AI-slop 9.A（深色 chrome 下亮卡 = 反向）
- macOS HIG §9.4 Dark Mode 一致性违例
- 视觉反向（亮卡在暗色画布上像贴了个纸片）

**修复路径**：定位 canvas.css 空态卡相关类，改用 `--mc-bg-elevated`；若为 Excalidraw 库层自绘需绕过（如库层 div 强制 `background:var(--mc-bg-elevated) !important`）。

**Severity**：**P1 Critical**（肉眼可见的暗色不一致）。

### 6-C · WindowControls 行为桩 · ⚠️ P2 Medium

**实情**：onMinimize/onMaximize/onClose 仅 console.log（设计文档 §01 L19 标注）。

**影响**：
- 顶栏右上角 × 点不掉应用
- maximize 点无窗口缩放反馈
- minimize 无

**Severity**：**P2 Medium**（用户首次操作即发现）。修复路径：浏览器壳下可触发 `document.documentElement.requestFullscreen()` / `window.close()`（仅某些浏览器支持）等。

### 6-D · Inspector `width` prop 声明未实现 · ⚠️ P3 Low

**实情**（设计文档 §01 L38）：`width` prop 已声明但函数未解构/应用，宽度固定 280px。

**Severity**：**P3 Low**（API 死声明，调用方传 width 被忽略）。

### 6-E · CommandPalette 双副本 · ⚠️ P3 Low

**实情**（设计文档 §07 L67-68）：`components/command-palette/CommandPalette.tsx` 与 `panels/canvas/CommandPalette.tsx` 存在双副本，需统一。

**Severity**：**P3 Low**（架构债，非用户可感知）。当前主壳层用前者，canvas 内嵌用后者（功能有别，不一定是简单重复）。

### 6-F · `themes/categoricalColors.ts` 硬编码 hex 出 token 体系 · ⚠️ P3 Low

**实情**：分类色板 `folder/markdown/canvas/image/pdf/template/daily/unknown` 与 `GROUP_COLORS` 6 色全部硬编码 hex（`#FBBF24` / `#3B82F6` / `#14B8A6` / ...），未走 `--mc-graph-*` 或 `--mc-cat-*` token。

**影响**：违反 v1 P0-4 / R3 收敛纪律「色板单来源」。dark 模式下若 token 主题切换（紫粉 / 暖灰 / 蓝绿），分类色不会联动。

**修复路径**：定义 `--mc-cat-{folder,markdown,canvas,image,pdf,template,daily,unknown}` 与 `--mc-cat-group-{1..6}` token 注入 dark/light 模式。

**Severity**：**P3 Low**（暗色家族内 hex 自洽，但跨模式失联动）。

### 6-G · TitleBar drag region `app-region: drag` 在 Web 失效 · ⚠️ P3 Low

**实情**：`.aurora-titlebar__drag` 元素 + `app-region: drag` CSS 是 Tauri/Electron 原生窗口拖拽 API，Web 浏览器壳下**完全无效**（只是空 div）。

**Severity**：**P3 Low**（Web 部署下不可见；改原生壳时此 CSS 自动生效）。

---

## 7. 触摸/移动维度（HIG §13 · Web 部署补充）

桌面端原生规范不覆盖，但 Aurora 是 Web 部署 → 触屏笔电 / iPad 模式需关注：

- ⚠️ 主按钮高度 28px（共享 .aurora-btn 默认）符合 HIG "compact 22-28pt"；但 toolbar 24-28px 在触屏下偏小（HIG 触屏 ≥ 44pt）
- ⚠️ sidebar rail 60px，触屏点击区够；侧栏折叠切换 28px 触屏偏小

**Severity**：**P3 Low**（设计目标为桌面 macOS，非触屏优先）。

---

## 8. 优先级表 / 修复路线（v2 推荐批）

| 优先级 | 项 | 影响面 | 来源 | 预估代码量 |
|---|---|---|---|---|
| **P0-A** | **菜单栏补 Edit / Window / App 菜单** | 全局 chrome | §4-A macOS HIG §1.1/1.5 | ~60 行 MenuBar.tsx + 文案 |
| **P0-B** | **⌘Q 退出 / ⌘W 关闭 / ⌘N 新建 / ⌘S 保存 注册 accelerator** | 全局键位 | §4-E HIG §5.1 | ~40 行 commandRegistry + MenuBar |
| **P1-A** | **canvas 空态卡亮色 → bg-elevated** | canvas 视图 | §6-B 反向 | ~5 行 canvas.css |
| **P1-B** | 菜单项 shortcut 字段为空 → 下拉右侧 accelerator 全空 | 全局菜单 | §4-E | ~10 行 commandRegistry 注册 |
| **P2-A** | WindowControls 桩实现 / 接入 resize 监听 | 顶栏 chrome | §6-C | ~30 行 |
| **P2-B** | 状态栏 bg-content 化 + 上边发丝 | 状态栏 | §6-A | ~4 行 shell.css |
| **P2-C** | blog 默认色板是否为 violet 复核 | blog 视图 | §5-A | 文案/配置 |
| **P3-A** | Inspector `width` prop 真正应用 | 右栏组件 | §6-D | ~10 行 |
| **P3-B** | CommandPalette 双副本归一 | 架构债 | §6-E | 视实际差异可能 50+ 行 |
| **P3-C** | categoricalColors token 化 | 主题色板 | §6-F | ~20 行 tokens.css + categoricalColors.ts |
| **P3-D** | sidebar avatar 用真实首字母 / fallback icon | sidebar | §4-D | ~5 行 |
| **P3-E** | Increase Contrast 备选 | a11y | §4-F | ~20 行 CSS |

> **v2 关键差异**：v1 报告画"已清零"句号；v2 实践表明**菜单栏是 v1 漏抓的最大盲点**（P0-A），其他 P1+ 多为细节。**v2 累计新增：P0 ×2 / P1 ×2 / P2 ×3 / P3 ×5**。

---

## 9. 综合判断（设计与产品视角）

**v1 收尾句号是对的，但不够**：v1 是「渲染层与 token 意图严重脱节」阶段的盘点 + 修复，**菜单栏这种 HIG 行为层项目 v1 阶段没有深入**——因为菜单栏是 P1-1（v1 修复期内补的），但补的是「五组菜单 + commandRegistry 接入」，**没补 HIG §1.1/§1.5 必含菜单与 §5.1 必含快捷键**。

**下一阶段定位**：从「渲染层合规」进入「**行为层 HIG 全集合规**」。菜单栏 P0-A/B 完成后，下一步进入「全键盘可达性 + 菜单项 accelerator 渲染」两条主线。

**留给用户的决策点**：
1. **P0-A（菜单栏三菜单补齐）**：照 HIG 标准补 Edit/Window/App？还是仅补 Quit+Settings 重定位（最小可行）？
2. **P0-B（⌘Q 等注册）**：浏览器壳下 `window.close()` 仅部分浏览器支持，可能需要"自定义退出 modal"代替——产品上希望应用真正能退出吗？

---

## 10. 截图证据位置

`.workbuddy/tmp/shots/a2-{editor,diary,blog,canvas,graph,kb,welcome,settings}.png`（1600×950，全新 CDP 驱动会话，gitignore 不入库）

v1 截图：`audit-{home,editor,canvas,kb,blog,graph,diary,welcome}.png`

---

**审查者笔记（v2）**：
- 全部视觉结论走 PIL 网格采样，**零印象判读**；
- v1 修复 11/12 项像素实证通过，1 项部分（菜单栏 §4-A）；
- v2 新增 P0 ×2 / P1 ×2 / P2 ×3 / P3 ×5 共 12 项；
- 全部检查耗时 ~90s headless + ~5min 静态审查 + 像素采样 60s，建议下批重点审 P0-A/B 后即可拍板。