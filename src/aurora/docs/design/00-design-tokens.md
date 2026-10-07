# 00 · Aurora 设计系统总纲与 Token 规范

> 本文档是 Aurora 面板演示的**唯一权威设计基线**，内容严格对应当前 `src/aurora/` 演示代码的实际实现。所有颜色、字号、间距、圆角、壳层尺寸、命名均以代码中的 `styles/tokens.css`、`styles/*.css`、`components/*`、`icons.tsx` 为准。凡真实项目没有的功能，本文档不予描述。

## 1. 设计语言定位

- **名称**：极光（Aurora）
- **关键词**：精致材质 · 通透层次 · 桌面原生
- **目标范式**：VS Code / macOS / 成熟桌面软件的原生美学——发丝分隔线、非卡片化、信息密度高、键盘优先。**明确反对**网页化堆叠、胶囊 pill、大留白、过度圆角。

## 2. 色彩 Token（`:root`，来自 `tokens.css`）

| 类别 | Token | 值 | 用途 |
|---|---|---|---|
| 背景 | `--mc-bg-window` | `#0A0B0F` | 窗口最底层 |
| | `--mc-bg-sidebar` | `#0D0F15` | 侧栏基础色 |
| | `--mc-bg-content` | `#101218` | 内容区实色 |
| | `--mc-bg-elevated` | `#151821` | 浮层/卡片 |
| | `--mc-bg-hover` | `#1A1D28` | 悬停态 |
| | `--mc-bg-pressed` | `#1F2330` | 按下态 |
| | `--mc-bg-selected` | `#252A38` | 选中行背景 |
| 文本 | `--mc-text-primary` | `#E8ECF4` | 主文本 |
| | `--mc-text-secondary` | `#9AA3B5` | 次级文本 |
| | `--mc-text-tertiary` | `#6B7280` | 三级/占位符 |
| | `--mc-text-disabled` | `#4A5060` | 禁用态 |
| 图标 | `--mc-icon` | `#C8CFDD` | 主图标 |
| | `--mc-icon-strong` | `#E8ECF4` | 强调图标 |
| | `--mc-icon-muted` | `#6B7280` | 弱化图标 |
| | `--mc-icon-active` | `#7C8CFF` | 选中图标 |
| 边框 | `--mc-border-subtle` | `#1A1D26` | 细微分隔 |
| | `--mc-border-medium` | `#262B3B` | 常规边框 |
| | `--mc-border-strong` | `#3A4055` | 聚焦边框 |
| | `--mc-border-outline` | `#0D0F15` | 外描边 |
| 强调 | `--mc-accent` | `#7C8CFF` | 主色 |
| | `--mc-accent-hover` | `#9AA7FF` | 悬停 |
| | `--mc-accent-pressed` | `#6B7CE6` | 按下 |
| | `--mc-accent-soft` | `rgba(124,140,255,0.18)` | 选中背景 |
| | `--mc-accent-glow` | `rgba(124,140,255,0.40)` | 聚焦光晕 |
| | `--mc-accent-text` | `#A5B4FF` | 文字强调色 |
| | `--mc-accent-bg` | `var(--mc-accent-soft)` | **激活态背景/焦点环（见 §8 说明）** |
| 语义 | `--mc-success/-warning/-danger/-info` | `#4ADE80/#FBBF24/#F87171/#60A5FA` | 语义色（含 `-soft`/`-text` 变体） |

> ✅ **§8 已解决**（2026-08-26）：`--mc-accent-bg` 已在 `tokens.css` 第 51 行声明为 `var(--mc-accent-soft)`，前述透明/不可见问题已修复。

## 3. 字体系统

- 无衬线：`--mc-font-sans: 'Inter','Segoe UI',system-ui,-apple-system,sans-serif`
- 等宽：`--mc-font-mono: 'JetBrains Mono','Fira Code','Consolas',monospace`
- 字号档：`xs 11 / sm 12 / base 13 / md 14 / lg 16 / xl 20 / 2xl 28`（`--mc-font-*`）
- 行高档：`xs 16 / sm 18 / base 20 / md 22 / lg 24 / xl 28 / 2xl 36`（`--mc-line-height-*`）

## 4. 间距 / 圆角 / 阴影

- 间距（8px 基准）：`--mc-space-1..12` = `2/4/6/8/12/16/24/32/48px`
- 圆角三档：`--mc-radius-sm 4 / md 8 / lg 12 / pill 999`
- 阴影三层：`--mc-shadow-panel / --mc-shadow-popover / --mc-shadow-inset`

## 5. 动效

- 时长：`--mc-dur-micro 100 / fast 180 / base 280 / slow 420 ms`
- 缓动：`--mc-ease-spring / -in / -out / -linear`
- 尊重系统 `prefers-reduced-motion`（全局降级）

## 6. 壳层尺寸（桌面 chrome 固定值）

| Token | 值 | 说明 |
|---|---|---|
| `--mc-titlebar-h` | `48px` | **实际运行时为 48px**（此前文档写 38px，以代码为准） |
| `--mc-statusbar-h` | `28px` | 状态栏高 |
| `--mc-sidebar-w` | `200px` | 侧栏展开宽 |
| `--mc-sidebar-collapsed-w` | `60px` | 侧栏折叠宽（仅图标） |
| `--mc-inspector-w` | `280px` | 右 Inspector 宽 |
| `--mc-wincontrol-w` | `46px` | 窗口控制区宽 |
| `--mc-toolbar-h` | `36px` | 工具栏高 |

## 7. 材质（class，非变量）

| Class | 背景 | 模糊 | 用途 |
|---|---|---|---|
| `.material-solid` | `var(--mc-bg-content)` | 无 | 内容区/编辑器 |
| `.material-sidebar` | `rgba(13,15,21,0.72)` | `blur(24px)` | 侧栏/导航 |
| `.material-popover` | `rgba(21,24,33,0.80)` | `blur(36px)` | 右键菜单/下拉/Tooltip/命令面板 |
| `.material-hud` | `rgba(13,15,21,0.65)` | `blur(48px)` | 浮动工具/Toast |

## 8. 密度与可达性

- `[data-density='compact']`：titlebar 42 / statusbar 24 / sidebar 180 / 字号 12 / 间距收紧。
- 滚动条：8px 极光风格（`tokens.css` 已定义）。
- 焦点环使用 `--mc-accent-bg`（见 §2 待办）。

## 9. 命名规范

- **Token**：`--mc-[category]-[level]`（如 `--mc-bg-elevated`、`--mc-text-secondary`）。
- **组件/面板类**：BEM 风格 `aurora-<area>__<element>` / `aurora-<area>--<modifier>`（如 `aurora-graph__minimap`、`aurora-settings__nav--center`）。新增组件必须同批交付对应 CSS，否则整页退回浏览器默认外观。
- **图标**：全部来自 `src/aurora/icons.tsx`（`Icon` 组件，`IconName` 类型，共 172 个，1.5 描边、`currentColor`、`viewBox 0 0 24 24`）。**禁止**裸 emoji、禁止手写内联 `<svg>` 装饰图标；白板视图内的连线/画布 `<svg>` 属功能性，不在此限。

## 10. 范围声明

本规范仅覆盖 Aurora 演示中**实际存在**的界面。以下类型的内容不在本文档范围内：导出面板、版本历史、专注/禅模式、写作助手、快速切换器、搜索替换、斜杠补全、编辑器上下文面板、编辑器工具组件、文件管理器、全局搜索、模板库、主题市场、导入向导——这些功能在当前演示中未实现，其旧规范文档已移除。
