# Markcraft（Aurora UI）一致性修复方案 · 实施级

- **配套审查报告**：`AUDIT-ui-consistency-2026-09-02.md`（同一目录）
- **基线令牌权威源**：`src/aurora/styles/tokens.css`（§127 自述单来源）
- **执行原则**：单轮单 scope、每轮结束经 `tsc` + 5174 截图 + 相关面板烟雾测试守门；改动只走 `var(--mc-*)`，禁新增硬编码；不引入用户未点名的新框架/依赖。
- **交付性质**：本文件为「修复方案」（做什么、怎么改、改到哪一行、如何验证），不含代码执行。确认后按轮次 A→D 推进。

---

## 0. 前置校验（开第一轮之前必做）

执行任何修复前，先确认两件会影响全局判定的事：

1. **`src/styles/tokens.css` 是否被构建链路引用**
   - 已知它被两处 `@import`：`src/index.css:9`、`src/aurora/aurora-main.tsx:13`（且位于 `aurora-main.tsx:5` 引入权威 tokens 之后 → 冲突变量 cascade 胜出）。
   - 先 `grep -rn "styles/tokens.css" src tailwind.config.*` 确认 `tailwind.config.js` 没有以该 CSS 文件为 token 源；若 tailwind 从该文件读值，迁移源到 `src/aurora/styles/tokens.css`（两者在**删除冲突项后**空间/半径/字号等价），否则 tailwind 工具类会随源切换跳变。
2. **`--mc-density-scale` / `--mc-density` 是否有人消费**
   - 已查：`src/styles/tokens.css:38/39/46` 定义，`src/styles/tokens.css:43` 仅注释提及；全仓**无任何 `calc(... var(--mc-density-scale))` 消费者**。真实密度系统走 `html[data-density="comfortable"]` 由各模块 CSS 自行覆盖（见 `tiptap.css` / `kb-ui.css` / `canvasTheme.ts` / `base.css`）。
   - 结论：该密度块是**死代码**，删除无回退风险。

---

## 1. 四轮路线图与依赖

| 轮次 | 覆盖审计项 | 目标 | 阻断关系 |
|---|---|---|---|
| **A** | P0-1 | 令牌正本：删旧 `tokens.css`，单一真相 | 必须先做，否则 B/D 的「统一值」会随冲突源跳变 |
| **B** | P0-2 · P1-4 · P2-2 · P2-5 | 颜色 / 半径 / 字体族 / `!important` 收敛 | 依赖 A |
| **C** | P0-3 · P1-1 · P1-2 · P1-3 | 按钮体系统一 + 列表发丝化 + 弹层归一 | 依赖 A（令牌名稳定） |
| **D** | P1-5 · P1-6 · P2-1 · P2-3 · P2-4 | 字号标度 + 动效 token 化 + 行高 + 内联 style | 依赖 A/B/C |

---

## 2. 轮次 A — 令牌正本（P0-1）

**目标**：让 `src/aurora/styles/tokens.css` 成为全仓唯一 `--mc-*` 真相源。

**步骤**

1. 删除两处旧引用：
   - `src/index.css:9` `@import './styles/tokens.css';` → 整行删除。
   - `src/aurora/aurora-main.tsx:13` `import '../styles/tokens.css' // 真实原语（spacing / radius / font）` → 整行删除（保留 `:5` 的 `./styles/tokens.css` 权威引入）。
2. 删除文件 `src/styles/tokens.css`（其 spacing/font/radius 与权威冲突；density 块为死代码，见 §0-2）。
3. 应急兜底（仅当发现遗漏引用时）：若某模块确实需要旧 `space-5:20px` 的观感，在对应 CSS 局部用 `var(--mc-space-8)`（32）或 `var(--mc-space-6)`（16）显式表达，**不要**复活旧文件。

**完成后验证**
- `tsc --noEmit` = 0。
- `grep -rn "var(--mc-font-base)\|var(--mc-space-5)" src` 全仓解析值应统一为 `13px` / `12px`（无 14px / 20px 跳变）。
- 5174 截图：设置 / 编辑器 / 知识库三处，确认正文字号、控件内边距与审查前「紧凑基线」一致（间距会变紧，属预期对齐修复）。
- 烟雾测试：`SettingsPanel.smoke` + `EditorPanel.smoke` + `KbManagePanel.smoke` 全绿。

**A 轮完成判据**：全仓仅 `src/aurora/styles/tokens.css` 一个 `:root` 定义 `--mc-*`；无 `@import` 旧文件。

---

## 3. 轮次 B — 颜色 / 半径 / 字体族 / `!important` 收敛

### B-1 错误 accent 兜底（P0-2，不随主题切换的 bug）
| 文件:行 | 现状 | 改为 |
|---|---|---|
| `blog.css:1104` `1105` | `#4c8bf5` | `var(--mc-accent)` |
| `canvas.css:2753` `2754` | `#4c8bf5` | `var(--mc-accent)` |
| `kb.css:840` | `#4c8bf5` | `var(--mc-accent)` |

> 注：改后 accent 取极光蓝紫 `#7C8CFF`，随主题联动（旧值 `#4c8bf5` 是固定亮蓝，在暗/亮主题都不变，属真实缺陷）。

### B-2 反色文本 `#fff` → `--mc-text-inverse`
| 文件:行 | 现状 |
|---|---|
| `shell.css:58` `237` `369` `947` `1035` | `#fff` |
| `components.css:62` `113` `306`（及 `.aurora-btn--primary`/`--danger` 内 `#ffffff`） | `#ffffff` / `#ffffff` |
| `editor.css:112` | `#C4B5FD` → `var(--mc-accent-text)` |
| `components.css:277` | `#101218` → `var(--mc-bg-content)` |

### B-3 偏离半径（P1-4 → sm4 / md8）
权威：`--mc-radius-sm:4` `--mc-radius-md:8` `--mc-radius-lg:12`。替换表（以 grep 复核为准）：

| 文件 | 行 | 字面 | 改为 |
|---|---|---|---|
| `shell.css` | 232 | 7px | `var(--mc-radius-sm)` |
| `shell.css` | 53, 667 | 6px | `var(--mc-radius-sm)` |
| `settings.css` | 169, 333, 357, 377, 419 | 6px | `var(--mc-radius-sm)` |
| `editor.css` | 120, 433, 938 | 3px | `var(--mc-radius-sm)` |
| `tiptap.css` | 188, 505, 684 …（~18 处） | 6px | `var(--mc-radius-sm)` |
| `blog.css` | 551, 571, 600, 932, 974 | 3px | `var(--mc-radius-sm)` |
| `mermaid.css` | 1057 | 10px | `var(--mc-radius-md)` |
| `blog.css:1098` `shell.css:298` `kb.css:824` | `var(--mc-radius-sm, 3px)` | 去掉过时 `3px` fallback → `var(--mc-radius-sm)` |

### B-4 字体族绕过（P2-2）
| 文件:行 | 现状 | 改为 |
|---|---|---|
| `graph.css:741` `765` | `font-family: ui-monospace…` | `var(--mc-font-mono)` |
| `src/styles/base.css:178` | `'Inter',…` | `var(--mc-font-sans)` |

### B-5 `!important` 掩盖弹层背景（P2-5）
| 文件:行 | 现状 | 改为 |
|---|---|---|
| `editor.css:2170-2178` `2410-2429` `2448-2449` | `rgba(21,24,33,.96) !important` | `var(--mc-bg-elevated)`（移除 `!important`） |
| `mermaid.css:1227` `1231` | `rgba(59,130,246,1) !important` | `var(--mc-info)` |

> 注：`--mc-bg-elevated` 是 `#151821`，与原 `rgba(21,24,33,.96)≈#151821` 视觉等价，去 `!important` 后改用真实 token，主题联动恢复。

**B 轮验证**：`tsc`=0；`grep -rn "#4c8bf5\|#fff\b\|border-radius: *[0-9]px" src/aurora src/components` 应仅剩审计表外的零星项；5174 截图确认 accent 颜色统一、弹层背景不再硬编码、圆角观感一致；`SettingsPanel.smoke` + `EditorPanel.smoke` 全绿。

---

## 4. 轮次 C — 按钮体系统一 + 列表发丝化 + 弹层归一

### C-1 废弃第二个「共享 Button」（P1-1）
- `src/components/ui/ui.css:104-168` 的 `.mc-btn`（高度 30/36/42、半径 md8 违例「控件≤sm」）→ **废弃**。
- 其消费者（Confirm / CreateFileModal）改为 `.aurora-btn .aurora-btn--md`（高度 28、半径 sm4，符合纪律）。
- 保留 `src/aurora/styles/components.css:9-134` 的 `.aurora-btn` 为唯一共享按钮；**删除 `.aurora-btn--pill`（components.css:132）** 胶囊变体（反胶囊偏好）。

### C-2 统一焦点环（P0-3，键盘可达性回退）
- 抽取共享工具类（写进 `components.css` 顶部）：
  ```css
  .aurora-focus-ring:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--mc-bg-content), 0 0 0 3px var(--mc-accent);
  }
  ```
  （规则源自现有 `.aurora-btn:focus-visible`，components.css:29-32）
- 给以下自建按钮家族补 `.aurora-focus-ring`（或 `:focus-visible` 复用同规则）：
  `.aurora-kb-btn`(kb.css:117)、`.aurora-settings__btn`(settings.css:428)、`.aurora-graph__topbar-btn`(graph.css:648)、`.aurora-view-toolbar__btn`(canvas.css:806)、`.aurora-aid__btn`(editor.css:640)、`.aurora-filetree__confirm-btn`(editor.css:986)、`.dv-btn`(diary.css:535)、`.dv-format-bar__btn`、`.aurora-blog-seg__btn`(blog.css)、`.aurora-titlebar__breadcrumb-btn`（已有，复查即可）。
- 方形图标按钮统一改 `.aurora-btn--icon`（aspect-ratio:1，components.css:126）替代各 `width/height` 硬编码家族。

### C-3 列表发丝化（P1-2）
- `blog.css:629` `.aurora-blog-doc` 与 `blog.css:687` `.aurora-blog-list-item`：移除 `background:var(--mc-bg-content)` + `1px 边框`，改为透明底 + `:hover { background: var(--mc-bg-hover) }`，与全站发丝行对齐。
- 行高/内边距对齐 `--mc-space-*` 与 `--mc-radius-sm`。

### C-4 弹层归一（P1-3）
| 文件:行 | 现状 | 改为 |
|---|---|---|
| `command-palette.css:23` `29` | 背景 `var(--mc-bg-content)`；阴影 `0 24px 64px rgba(0,0,0,.5)` 过重 | 背景 `var(--mc-bg-elevated)`；阴影 `var(--mc-shadow-popover)` |
| `components.css:442` `.aurora-dropdown` | `rgba(21,24,33,.8)` | `var(--mc-bg-elevated)` |
| `components.css:528` `.aurora-tooltip` | 背景 `rgba(21,24,33,.8)`；半径 `6px` | `var(--mc-bg-elevated)`；`var(--mc-radius-sm)` |
| `editor.css:944` `969` ctxmenu / `kb.css:750` | 背景 `var(--mc-bg-elevated)`（已对）；半径 6px → sm | 仅半径收敛 |
| 选中态 token 名分裂 | `--mc-accent-soft` vs `--mc-accent-bg` | 统一用 `--mc-accent-soft`（`--mc-accent-bg` 已在 tokens.css:52 指向它，可保留别名但文档统一引用 soft） |
| `editor.css:1673` `.aurora-backlinks__item` | 缺选中态 | 补 `&.is-selected { background: var(--mc-accent-soft) }` |

**C 轮验证**：`tsc`=0；`grep -rn "#4c8bf5\|\.mc-btn\|aurora-btn--pill" src` 应清零；键盘 Tab 走查（5174）确认各面板按钮/列表项有焦点环；`EditorPanel.smoke`（含右栏 tab 用例）全绿；截图确认博客列表、弹层、选中态统一。

---

## 5. 轮次 D — 字号 / 动效 / 行高 / 内联 style

### D-1 间隙字号回退最近 token（P1-5）
权威标度：xs11 / sm12 / base13 / md14 / lg16 / xl20 / 2xl28。替换表（节选，以 grep 复核）：

| 文件:行 | 字面 | 归位 |
|---|---|---|
| `shell.css:59` `command-palette.css:73` `diary.css:122/229/504` `graph.css:614` | 15px | `var(--mc-font-md)` 或 `var(--mc-font-lg)` |
| `editor.css:215` `1912` `kb.css:258` | 18px | `var(--mc-font-lg)` / `var(--mc-font-xl)` |
| `canvas.css:1349` | 22px | `var(--mc-font-xl)` / `var(--mc-font-2xl)` |
| `editor.css:2457` | 13.5px | `var(--mc-font-base)` / `var(--mc-font-md)` |
| `editor.css:2174` | 11.5px `!important` | `var(--mc-font-xs)` / `var(--mc-font-sm)` |
| `diary.css:338…415` | 12.5px | `var(--mc-font-sm)` / `var(--mc-font-base)` |
| `blog.css:929` `editor.css`/`canvas.css` 多处 | 9–10px | `var(--mc-font-xs)` |

### D-2 动效走 token（P1-6）
权威：`--mc-dur-micro:100` `--mc-dur-fast:180` `--mc-dur-base:280` `--mc-dur-slow:420`；`--mc-ease-spring/in/out/linear`。替换表（节选）：

| 文件:行 | 现状 | 改为 |
|---|---|---|
| `components.css:543` | `150ms ease-out` | `--mc-dur-micro var(--mc-ease-out)` |
| `command-palette.css:31` | `200ms cubic-bezier(.16,1,.3,1)` | `--mc-dur-base var(--mc-ease-spring)` |
| `toast.css:32` | `200ms ease-out` | `--mc-dur-base var(--mc-ease-out)` |
| `editor.css:554/567/607…` | `150ms ease` | `--mc-dur-fast var(--mc-ease-out)` |
| `diary.css:61/151/260` | `0.12/0.15/0.26s ease` | token（统一毫秒写法） |
| `graph.css:124` | `2s ease-in-out infinite` | `--mc-dur-slow var(--mc-ease-in-out)`（或加 `--mc-ease-in-out` token） |
| `canvas.css:407` vs `:660` | `180ms var(--mc-ease-spring)` vs `150ms ease-out`（同组件不一致） | 统一 `--mc-dur-fast var(--mc-ease-spring)` |
| `base.css:181` | `0.3s ease` | `--mc-dur-base var(--mc-ease-out)` |

> 若 `--mc-ease-in-out` 不存在，在 `tokens.css` §11 补 `--mc-ease-in-out: cubic-bezier(0.4,0,0.2,1)`（标准进出）。

### D-3 字重 / 行高 / 内联 style（P2-1/3/4）
| 项 | 位置 | 改 |
|---|---|---|
| `font-weight:650` | `kb.css:446` | `600` 或 `700` |
| 行高裸写 | 全仓 `1.2~1.6` / 无单位 | 引 `--mc-line-height-*`（xs16…2xl36） |
| 内联 style 绕过 | `AuroraShell.tsx:382` `color:'#fff'`；`aurora-main.tsx:63` `borderRadius:8, padding:24`；`CanvasInspectorPanel.tsx` 多处 `padding:12`；`ShortcutsSection.tsx:102` `padding:'40px 0'`（web 大留白） | 抽为 class（如 `.aurora-shortcuts` `padding: var(--mc-space-8) 0`），改用 token |

**D 轮验证**：`tsc`=0；`grep -rn "15px\|18px\|22px\|150ms ease\|0.3s ease" src/aurora` 应清零（或仅剩审计表外合理项）；5174 截图确认字号观感统一、动效手感一致；全面板烟雾测试回归。

---

## 6. 统一规范基线（收口后的黄金标准）

| 类别 | 唯一取值 |
|---|---|
| 半径 | 控件 `var(--mc-radius-sm)`4 · 容器 `var(--mc-radius-md)`8 · 窗口/弹层 `var(--mc-radius-lg)`12 · 仅胶囊 `var(--mc-radius-pill)`999 |
| 强调色 | 一切走 `var(--mc-accent*`)，禁 `#4c8bf5`/`#C4B5FD` 等硬编码 |
| 反色文本 | `var(--mc-text-inverse)`（禁 `#fff`/`#ffffff`） |
| 按钮 | 唯一 `.aurora-btn`（sm24/md28/lg32）+ primary/secondary/ghost/danger/icon；无 pill；全部带 `.aurora-focus-ring` |
| 列表 | 透明底 + `:hover background:var(--mc-bg-hover)` + 发丝分隔 + 选中 `var(--mc-accent-soft)`；无卡片行 |
| 弹层 | 背景 `var(--mc-bg-elevated)` + 1px 边框 + `var(--mc-shadow-popover)` + 半径 lg |
| 字号 | 仅 xs11/sm12/base13/md14/lg16/xl20/2xl28 |
| 字重 | 仅 400/500/600/700 |
| 动效 | 仅 `--mc-dur-*` + `--mc-ease-*`；统一毫秒写法 |
| 行高 | `var(--mc-line-height-*)` |
| 令牌源 | 单文件 `src/aurora/styles/tokens.css` |

---

## 7. 验证门禁矩阵（每轮结束）

| 轮次 | `tsc` | 截图(5174) | 烟雾测试 |
|---|---|---|---|
| A | ✅ | 设置/编辑器/知识库字号间距 | SettingsPanel + EditorPanel + KbManagePanel |
| B | ✅ | accent 统一、弹层背景、圆角 | SettingsPanel + EditorPanel |
| C | ✅ | 按钮/Tab 焦点环、博客发丝行、弹层 | EditorPanel（右栏 tab）+ KbManagePanel + SettingsPanel |
| D | ✅ | 字号观感、动效手感 | 全面板回归 |

> 启动 5174：`cd 项目根 && node node_modules/vite/bin/vite.js --port 5174 --host`（环境须洁净、无残留进程）。本机 agent-browser 在 Windows 沙箱下 Chrome 静默退出，截图若不可用则改以 `tsc` + 烟雾测试 + 逻辑核对兜底，并请用户在 5174 目测。

---

## 8. 风险与回滚

- **A 轮间距跳变**：删旧 `tokens.css` 后 `--mc-space-5` 由 20px→12px，部分面板内边距会变紧（预期对齐修复）；若某面板因此过挤，在**该面板局部**显式用更大 space token，勿复活旧文件。
- **B 轮 accent 变色**：`#4c8bf5`→`--mc-accent`(#7C8CFF) 会改变博客/画布/知识库的强调色观感（更紫），属「随主题联动」的预期修正；若用户想要保留亮蓝，应新增主题 token 而非硬编码。
- **C 轮按钮替换**：`.mc-btn` 消费者若含非 Confirm/CreateFileModal 的隐藏引用，`grep` 全量确认后再删；保留 `.mc-btn` 选择器直至所有消费者迁移完，避免闪烁。
- **`!important` 去除**：editor.css 弹层去 `!important` 后若某上层样式覆盖失败，先查级联而非加回 `!important`。
- **回滚**：每轮在 git 独立 commit，`tsc` 或烟雾测试失败时整轮 `git revert` 不污染其它轮。

---

## 9. 工作量与推进建议

- **A 轮**：~0.5h（删除 + 2 处 import + 验证），风险最低、收益最高，**必须先做**。
- **B 轮**：~2h（批量替换，可用 `Edit` 逐文件；`!important` 3 处需手工核对级联）。
- **C 轮**：~3h（按钮迁移 + focus 环 + 博客列表 + 弹层，涉及 ~10 个文件、需截图走查焦点）。
- **D 轮**：~3h（字号/动效散落 ~40 处 + 内联 style 抽类）。
- **建议**：A→B→C→D 串行；每轮独立 commit + 验证。若时间紧，P0（A+B 的颜色/C 的 focus）优先于 P1/P2 打磨。

---

*本方案为审计报告的配套实施级修复计划。四轮（A→D）已于 2026-09-02 全部落地执行：`tsc --noEmit`=0，Aurora 面板烟雾测试 14 文件 / 89 用例全绿。逐轮改动与守门结果见上方 §2–5 与 `.workbuddy/memory/2026-09-02.md` 的「全界面一致性修复方案落地」节。*
