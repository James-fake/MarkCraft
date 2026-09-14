# Markcraft（Aurora UI）全界面一致性审查报告

- **审查日期**：2026-09-02
- **审查范围**：`src/aurora/` 全部面板 + 共享层 `src/components/ui/` + 全局样式 `src/aurora/styles/**` + 主题令牌 `src/styles/tokens.css` 与 `src/aurora/styles/tokens.css`
- **审查方法**：四维并行静态审计（令牌/控件/表面/字体+动效），对照 `src/aurora/styles/tokens.css` 权威令牌与设计文档基线逐处核对，全部给出 `file:line`。未改动任何代码（本次为审查交付，修复清单见第 8–9 节，待确认后另开轮次执行）。
- **严重级别约定**：P0 = 系统性根因 / 破坏主题联动 / 无障碍回退；P1 = 明显的跨面板视觉不一致；P2 = 局部打磨。

---

## 0. 一句话结论

界面**整体方向统一**（桌面原生、发丝分隔、非卡片化、token 化底色），但**存在一处系统性根因 + 四类离散漂移**：

1. **P0 根因**：存在两份 `tokens.css`，权威文件（`src/aurora/styles/tokens.css`）自述为单来源，但 `src/styles/tokens.css` 仍被加载且**反向定义了字号（`--mc-font-base`/`--mc-font-md` 互为颠倒）与间距标度**——这是全站字号/间距漂移的源头。
2. 按钮体系：两个「共享 Button」互相矛盾，约 30 个面板内自建按钮家族，高度 24–42px 离散、`focus-visible` 几乎全面缺失。
3. 列表：博客列表用「卡片行」（带边框+实心底）与其余发丝行冲突，呈 web 感。
4. 弹层：背景 token（`--mc-bg-elevated` vs `--mc-bg-content`）、阴影（命令面板 `0 24px 64px` 过重非 token）、半径 6px 散落未统一。
5. 字体/动效：15/18/22px 间隙档高频出现；动效时长/缓动大量硬编码 `150ms ease` 等，未走 `--mc-dur-*`/`--mc-ease-*`。

> ⚠️ **关于圆角基线的更正**：工作记忆中「`showcase.css` 圆角 3/4/6」与 `DESIGN.md §16.6` 已过期。当前权威文件 `src/aurora/styles/tokens.css:133-136` 实为 **sm 4 / md 8 / lg 12 / pill 999**，且纪律明确要求「控件≤sm、禁止 6px 以上非窗口裸圆角」。本报告一律以该权威值为基线。

---

## 1. 总览评分卡

| 维度 | 一致性 | 主要问题计数 | 最高级别 |
|---|---|---|---|
| 设计令牌 / 主题 | ⚠️ 中 | 2 份 token 源冲突；~60 处硬编码色/半径 | **P0** |
| 按钮 / 交互控件 | ❌ 偏弱 | 2 共享 Button 矛盾；~30 自建家族；focus 缺失 | **P0** |
| 列表 / 弹层 / 模态 | ⚠️ 中 | 卡片行冲突；弹层背景/阴影不统一；6px 散落 | **P1** |
| 字体 / 动效 | ⚠️ 中 | 间隙档字号；动效硬编码 ~40 处 | **P1** |

---

## 2. P0 根因：双 `tokens.css` 冲突（必须先修）

| 文件 | 角色 | 关键差异 |
|---|---|---|
| `src/aurora/styles/tokens.css` | **权威单来源**（:127 自述） | `--mc-font-base:13px; --mc-font-md:14px`；`--mc-space-5:12px; -6:16px`（8px 基准） |
| `src/styles/tokens.css` | 陈旧副本，仍被加载 | `--mc-font-md:13px; --mc-font-base:14px`（**颠倒**）；`--mc-space-5:20px; -6:24px`（**不同标度**） |

- 半径（sm4/md8/lg12）两文件现已一致，不冲突。
- 字号 `base`/`md` 颠倒会导致：引用 `var(--mc-font-base)` 的组件在两种入口下分别渲染 14px / 13px，行高与对齐错乱。
- 间距标度不同（12/16 vs 20/24）会让同一「padding: var(--mc-space-5)」在两处差 8px。

**建议**：以 `src/aurora/styles/tokens.css` 为唯一真相，把 `src/styles/tokens.css` 中**确有独特价值**的条目（如 density 广播 `html[data-density]` 逻辑）下沉或 re-export，然后删除旧文件全部 `--mc-*` 定义，避免重复定义。

---

## 3. 维度一 · 设计令牌与主题

### 3.1 偏离半径（应统一到 sm4/md8/lg12；pill 仅胶囊）
散落的非标半径（节选，权威为 4/8/12）：

| 文件 | 行 | 值 | 应改 |
|---|---|---|---|
| `shell.css` | 232 | 7px | sm |
| `shell.css` | 53, 667 | 6px | sm |
| `settings.css` | 169, 333, 357, 377, 419 | 6px | sm |
| `editor.css` | 120, 433, 938 | 3px | sm |
| `tiptap.css` | 188, 505, 684…（~18 处） | 6px | sm |
| `blog.css` | 551, 571, 600, 932, 974 | 3px | sm |
| `mermaid.css` | 1057 | 10px | md |

> 注：`blog.css:1098 / shell.css:298 / kb.css:824` 写 `var(--mc-radius-sm, 3px)`，fallback `3px` 暴露作者仍按旧 3px 心智，应改为 `var(--mc-radius-sm)`（去掉过时 fallback）。

### 3.2 硬编码颜色（应走 `--mc-*` token）
高频问题：`#fff` 未走 `--mc-text-inverse`；**`#4c8bf5` 错误 accent 兜底**出现在 `blog.css:1104/1105`、`canvas.css:2753/2754`、`kb.css:840`——该值不随主题切换，是明显 bug。

| 文件 | 行 | 字面 | 应改 |
|---|---|---|---|
| `shell.css` | 58, 237, 369, 947, 1035 | `#fff` | `--mc-text-inverse` |
| `components.css` | 62, 113, 306 | `#ffffff` | `--mc-text-inverse` |
| `components.css` | 277 | `#101218` | `--mc-bg-content` |
| `blog.css` | 1104, 1105 | `#4c8bf5` | `--mc-accent` |
| `canvas.css` | 2753, 2754 | `#4c8bf5` | `--mc-accent` |
| `kb.css` | 840 | `#4c8bf5` | `--mc-accent` |
| `editor.css` | 112 | `#C4B5FD` | `--mc-accent-text` |
| `mermaid.css` | 1227, 1231 | `rgba(59,130,246,1) !important` | `--mc-info` |

### 3.3 内联 style 绕过 token
`AuroraShell.tsx:382` `color:'#fff'`；`aurora-main.tsx:63` `borderRadius:8, padding:24`；`CanvasInspectorPanel.tsx` 多处 `style={{padding:12}}`；`ShortcutsSection.tsx:102` `padding:'40px 0'`（web 式大留白）。

### 3.4 `!important` 掩盖不一致
`editor.css:2170-2178 / 2410-2429 / 2448-2449` 用 `!important` + 硬编码 `rgba(21,24,33,.96)` 强制弹层背景，绕开 `--mc-bg-elevated`；`styles/components.css:68-85`、`mermaid.css:1227/1231` 硬编码语义色 `!important`。

---

## 4. 维度二 · 按钮与交互控件

### 4.1 两个「共享 Button」互相矛盾
| 组件 | 文件 | 高度 | 半径 | 说明 |
|---|---|---|---|---|
| `.mc-btn` | `src/components/ui/ui.css:104-168` | 30/36/42 | **md 8px** | 仅 Confirm/CreateFileModal 用；半径违反令牌纪律「控件≤sm」 |
| `.aurora-btn` | `src/aurora/styles/components.css:9-134` | 24/28/32 | sm 4px | Aurora 主用；但保留 `pill` 变体（`components.css:132`），违背反胶囊偏好 |

### 4.2 自建按钮家族（约 30 个，节选）
`.aurora-kb-btn`(kb.css:117)、`.aurora-blog-btn`(blog.css:367)、`.aurora-settings__btn`(settings.css:428)、`.aurora-graph__topbar-btn`(graph.css:648)、`.aurora-view-toolbar__btn`(canvas.css:806)、`.aurora-aid__btn`(editor.css:640)、`.aurora-filetree__confirm-btn`(editor.css:986)、`.dv-btn`(diary.css:535) ……

### 4.3 对比矩阵（节选）
| 家族 | 高度 | 半径 | hover | focus-visible |
|---|---|---|---|---|
| `.aurora-btn`（共享） | 28 | sm | 变体 | ✅ |
| `.mc-btn`（共享） | 36 | md(违例) | 变体 | ✅ |
| `.aurora-kb-btn` | 28 | sm | bg-hover | ❌ |
| `.aurora-settings__btn` | 28 | sm | bg-hover | ❌ |
| `.aurora-view-toolbar__btn` | 30 | sm | bg-hover | ❌ |
| `.aurora-aid__btn` | 26 | sm | bg-hover | ❌ |
| `.dv-btn` | ~33 | **8px** | — | ❌ |
| `.dv-format-bar__btn` | 28 | **6px** | bg-pressed | ❌ |
| `.aurora-blog-seg__btn` | 28 | **3px** | bg-hover | ❌ |

### 4.4 关键不一致
- **高度离散** 24 / 26 / 28 / 30 / 32 / 33 / 36 / 42，无统一桌面控件高度（建议定 28 默认、24 紧凑、32 大）。
- **`focus-visible` 几乎全面缺失**：仅 `.aurora-btn`、`.mc-btn`、`.aurora-titlebar__breadcrumb-btn` 及 editor 格式条覆盖有键盘焦点环；其余自建家族键盘可达性回退 → **P0 无障碍问题**。
- **重复可合并**：约 10 个「secondary 描边按钮」与约 5 个「ghost 按钮」、约 14 个「方形图标按钮」各自为政，应统一到 `.aurora-btn--secondary / --ghost / .aurora-icon-btn`。
- **`pill` 变体残留**（`components.css:132`），违背反胶囊偏好。

---

## 5. 维度三 · 列表 / 弹层 / 模态 / 表格

### 5.1 列表行对比（节选）
| 表面 | 行高 | hover | 选中 | 卡片? |
|---|---|---|---|---|
| `.aurora-list-item`(components.css:312) | 32 | bg-hover | accent-soft | 否 |
| `.aurora-sidebar-item`(shell.css:432) | 40 | bg-hover | accent-soft+左条 | 否 |
| `.aurora-filetree__item`(editor.css:911) | 30 | bg-hover | accent-soft+左条 | 否 |
| `.aurora-outline__row`(editor.css:1451) | 26 | bg-hover | accent-soft | 否 |
| `.aurora-settings__nav-tab`(settings.css:33) | 32 | bg-hover | accent-bg | 否 |
| `.aurora-blog-doc`(blog.css:629) | ~34 | **bg-content+1px边框** | — | **是(卡片行)** |
| `.aurora-blog-list-item`(blog.css:687) | ~36 | **bg-content+1px边框** | — | **是(卡片行)** |
| `.aurora-backlinks__item`(editor.css:1673) | ~32 | bg-hover | **缺失** | 是(带边框) |
| `.aurora-command__item`(command-palette.css:117) | 40 | accent-bg | accent-bg | 否(半径6px) |

> 全站**无真实 `<table>`**（grep 无匹配），数据均用 flex 行/卡片呈现，无需表格样式统一。

### 5.2 浮层表面对比（节选）
| 表面 | 背景 | 边框 | 阴影 | 半径 |
|---|---|---|---|---|
| `.aurora-modal`(components.css:648) | `--mc-bg-content` | 1px | `--mc-shadow-popover` | lg |
| `.aurora-command`(command-palette.css:23) | `--mc-bg-content` | 1px | **`0 24px 64px rgba(0,0,0,.5)` 过重非 token** | lg |
| `.aurora-dropdown`(components.css:442) | `rgba(21,24,33,.8)` | 1px | `--mc-shadow-popover` | md |
| `.aurora-kb-modal`(kb.css:750) | `--mc-bg-elevated` | 1px | `--mc-shadow-popover` | lg |
| `.aurora-filetree__ctxmenu`(editor.css:944) | `--mc-bg-elevated` | 1px | `--mc-shadow-popover` | md |
| `.aurora-tooltip`(components.css:528) | `rgba(21,24,33,.8)` | 1px | `--mc-shadow-popover` | **6px 非 token** |
| `.aurora-audience__panel`(shell.css:865) | `--mc-bg-content` | 1px | **`0 16px 48px rgba(0,0,0,.3)` 自定义** | lg |

### 5.3 关键不一致
1. **博客列表卡片行**（blog.css:629/687）与全站发丝行冲突 → 统一为透明底 + `bg-hover`。
2. **弹层背景不统一**：`--mc-bg-content` vs `--mc-bg-elevated` vs `rgba(...)` 三套并存 → 浮层统一 `--mc-bg-elevated`。
3. **命令面板阴影过重**（command-palette.css:29）→ 改 `--mc-shadow-popover`。
4. **半径 6px 散落**（tooltip/shortcut-item/command-item/kb）→ 改 `--mc-radius-sm/md`。
5. **选中态 token 名分裂**：`--mc-accent-soft` vs `--mc-accent-bg`（等值但命名分裂）；`backlinks` 缺选中态 → 统一 `--mc-accent-soft` 并补 backlinks。

---

## 6. 维度四 · 字体与动效

### 6.1 字号标度（权威 `tokens.css:97-103`：xs11/sm12/base13/md14/lg16/xl20/2xl28）
高频**间隙档偏离**（既非标度也非档位边界）：

| 文件 | 行 | 值 | 应归 |
|---|---|---|---|
| `shell.css` | 59 | 15px | md/lg |
| `command-palette.css` | 73 | 15px | md/lg |
| `diary.css` | 122, 229, 504 | 15px | md/lg |
| `graph.css` | 614 | 15px | md/lg |
| `editor.css` | 215, 1912 | 18px | lg/xl |
| `kb.css` | 258 | 18px | lg/xl |
| `canvas.css` | 1349 | 22px | xl/2xl |
| `editor.css` | 2457 | 13.5px | base/md |
| `editor.css` | 2174 | 11.5px `!important` | xs/sm |
| `diary.css` | 338…415 | 12.5px | sm/base |
| `blog.css` | 929 | 9px | xs |
| `editor.css`/`canvas.css` | 多处 | 9–10px | xs |

### 6.2 字体族 / 字重
- `graph.css:741/765` 硬编码 `font-family: ui-monospace…` 未走 `--mc-font-mono`。
- `src/styles/base.css:178` body 直接写 `'Inter',…` 未用 `--mc-font-sans`。
- `kb.css:446` `font-weight: 650`（非标准档，渲染不确定）→ 改 600/700。

### 6.3 行高未 token 化
`--mc-line-height-*` 已定义但几乎未被引用，普遍裸写 `1.2~1.6` 或无单位行高。

### 6.4 @keyframes 清单
`aurora-dropdown-in`(components.css:459)、`aurora-tooltip-in`(546)、`aurora-fade-in`(643)、`aurora-modal-in`(662)、`aurora-command-in`(command-palette.css:37)、`aurora-toast-in`(toast.css:57)、`aurora-blog-shimmer`(blog.css:842)、`aurora-blog-spin`(1046)、`kg-node-pulse`(graph.css:126)、`aurora-cursor-blink`(editor.css:173)、`aurora-overlay-in/-right`(editor.css:1082/canvas.css:110)、`aurora-timeline-pulse`(canvas.css:1210)。数量合理、命名规范。

### 6.5 动效硬编码（节选，应走 `--mc-dur-*`/`--mc-ease-*`）
| 文件 | 行 | 值 | 应改 |
|---|---|---|---|
| `components.css` | 543 | `150ms ease-out` | `--mc-dur-micro var(--mc-ease-out)` |
| `command-palette.css` | 31 | `200ms cubic-bezier(.16,1,.3,1)` | `--mc-dur-base var(--mc-ease-spring)` |
| `toast.css` | 32 | `200ms ease-out` | `--mc-dur-base var(--mc-ease-out)` |
| `editor.css` | 554, 567, 607… | `150ms ease` | `--mc-dur-fast var(--mc-ease-out)` |
| `diary.css` | 61, 151, 260 | `0.12/0.15/0.26s ease` | token（秒/毫秒混写） |
| `graph.css` | 124 | `2s ease-in-out infinite` | token 时长 |
| `canvas.css` | 1206, 1390, 1513 | `2s / 400ms / 600ms` | token |
| `base.css`(跨) | 181 | `0.3s ease` | `--mc-dur-base var(--mc-ease-out)` |

> 同组件内不一致：`canvas.css:407` 用 `180ms var(--mc-ease-spring)`，而 `:660` 用 `150ms ease-out`。

---

## 7. 统一规范基线建议（收口到单一真相）

1. **令牌单来源**：锁定 `src/aurora/styles/tokens.css`；吸收 `src/styles/tokens.css` 独有逻辑后删除其 `--mc-*` 定义；全仓 `var(--mc-*)` 引用，禁硬编码。
2. **半径纪律**：控件 sm(4) / 容器 md(8) / 窗口·弹层 lg(12)；pill 仅胶囊；清理全部 6px/3px/2px/7px/10px。
3. **按钮单体系**：以 `.aurora-btn` 为唯一共享按钮（高度 24/28/32），废弃 `.mc-btn` 与全部自建家族；补齐 `focus-visible` 环；删除 `pill` 变体。
4. **列表单风格**：全站「透明底 + hover `bg-hover` + 发丝分隔 + 选中 `accent-soft`」；博客卡片行改发丝行；补 backlinks 选中态。
5. **弹层单规范**：背景 `--mc-bg-elevated`、边框 1px、阴影 `--mc-shadow-popover`、半径 lg；命令面板降阴影。
6. **字号单标度**：禁止 15/18/22/13.5/11.5/12.5/9/10px 间隙值，回退到最近 token；`font-weight` 仅 400/500/600/700。
7. **动效单语言**：时长/缓动全部 `--mc-dur-*`/`--mc-ease-*`；统一毫秒写法；`infinite` 脉冲时长走 token。

---

## 8. 优先级修复清单

### P0（系统性 / 破坏性）
| # | 问题 | 位置 | 修复 |
|---|---|---|---|
| P0-1 | 双 tokens.css 字号/间距颠倒 | `src/styles/tokens.css:30-33, 20-23` | 吸收后删除旧 `--mc-*` 定义，统一到 aurora tokens.css |
| P0-2 | `#4c8bf5` 错误 accent 不随主题 | `blog.css:1104/1105, canvas.css:2753/2754, kb.css:840` | → `var(--mc-accent)` |
| P0-3 | 按钮 `focus-visible` 普遍缺失（键盘可达性回退） | `kb.css:117, settings.css:428, graph.css:648, canvas.css:527/572/806, editor.css:815/986/1274, shell.css:600…` | 复用 `components.css:29` 焦点环 |

### P1（跨面板不一致）
| # | 问题 | 位置 | 修复 |
|---|---|---|---|
| P1-1 | 两个共享 Button 矛盾（高度/半径） | `ui.css:98-112` vs `components.css:9-57` | 统一为 `.aurora-btn` 体系 |
| P1-2 | 博客列表卡片行 vs 发丝行 | `blog.css:629, 687` | 改透明底 + `bg-hover` |
| P1-3 | 弹层背景/阴影不统一 + 命令面板过重阴影 | `command-palette.css:23/29, kb.css:750, editor.css:944/969, components.css:442/528` | 统一 `--mc-bg-elevated` + `--mc-shadow-popover` |
| P1-4 | 半径 6px/3px/2px/7px/10px 散落 | `settings.css, editor.css, tiptap.css, blog.css, mermaid.css, shell.css…` | → `--mc-radius-sm/md` |
| P1-5 | 高频间隙字号 15/18/22/13.5/11.5/12.5/9/10px | 见 6.1 | 回退最近 token |
| P1-6 | 动效时长/缓动硬编码 ~40 处 | `editor.css, canvas.css, shell.css, components.css, diary.css…` | → `--mc-dur-*`/`--mc-ease-*` |

### P2（局部打磨）
| # | 问题 | 位置 | 修复 |
|---|---|---|---|
| P2-1 | `font-weight:650` 非标准 | `kb.css:446` | 600/700 |
| P2-2 | 字体族绕过 token | `graph.css:741/765, base.css:178` | `--mc-font-mono/sans` |
| P2-3 | 行高裸写未 token 化 | 全仓 | 引 `--mc-line-height-*` |
| P2-4 | 内联 style 绕过（padding/borderRadius/#fff） | `AuroraShell.tsx:382, aurora-main.tsx:63, CanvasInspectorPanel.tsx, ShortcutsSection.tsx` | 抽 class + token |
| P2-5 | `!important` 掩盖弹层背景 | `editor.css:2170-2178/2410-2429` | 改真实 token |

---

## 9. 落地路线图（建议分四轮，单轮单 scope）

- **轮次 A — 令牌正本（P0-1）**：合并双 tokens.css，全仓 `grep` 复核 `var(--mc-font-base/md)` 渲染无跳变。阻断一切后续漂移。
- **轮次 B — 颜色/半径收敛（P0-2, P1-4, P2-2/5）**：批量替换 `#4c8bf5`、偏离半径、`!important` 弹层背景；`tsc` + 烟雾测试守门。
- **轮次 C — 按钮与列表统一（P0-3, P1-1/2/3）**：废弃 `.mc-btn` 与自建家族，补 `focus-visible`，博客卡片行改发丝行，弹层背景/阴影归一。
- **轮次 D — 字体与动效收敛（P1-5/6, P2-1/3/4）**：间隙字号回退、动效走 token、行高 token 化、内联 style 抽类。

每轮结束均通过截图（5174）+ `tsc` + 相关面板烟雾测试验证，避免回退。

---

## 10. 附录 · 已审面板清单

| 面板 | 路径 | 本次主要问题 |
|---|---|---|
| Shell / 侧栏 / 标题栏 | `src/aurora/components/shell/*` | 半径 6/7px；`#fff`；focus 缺失 |
| 编辑器（左文件树 / 右检查器 / 格式条） | `src/aurora/panels/editor/*` | 内联 style；`#C4B5FD`；动效硬编码；backlinks 缺选中 |
| 设置 | `src/aurora/panels/settings/*` | 半径 6px；自建按钮；卡片式 shortcut-item |
| 知识库（管理 / 详情） | `src/aurora/panels/kb/*` | `#4c8bf5`；`font-weight:650`；弹层背景 |
| 博客 | `src/aurora/panels/blog/*` | 卡片行；`#4c8bf5`；半径 3px |
| 画布（白板） | `src/aurora/panels/canvas/*` | `#4c8bf5`；自建按钮；动效混写 |
| 图谱 | `src/aurora/panels/graph/*` | 字体族绕过；15px 字号 |
| 日记 | `src/aurora/panels/diary/*` | 半径 8/6px；15/18px 字号；动效秒写 |
| 仪表盘 / 欢迎 / 命令面板 | 对应目录 | 命令面板阴影过重；15px 字号 |

---

*本报告为审查交付，未执行任何代码修改。修复清单与路线图待确认后按轮次推进。*
