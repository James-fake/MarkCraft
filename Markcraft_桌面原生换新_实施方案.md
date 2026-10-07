# Markcraft 桌面原生界面换新 · 实施方案

> 方法：**源文件改（非整体重写）** ｜ 联合 `emilkowalski-skills` + `taste-skill` + `macos-design-guidelines` 三套方法论
> 范围：`src/aurora/`（UI）+ `src/components/ui` + `styles/tokens.css`（地基）｜ 不动 `src/features/*` / `stores/*`
> 边界：不新增业务模块（禁增铁律）；地基级改动换不换壳都受益

---

## 0. 三 Skill 联合操作基线（设计基调）

把三套纪律压成一条 Markcraft 专用的"视觉/交互宪法"，后续所有改动以此为准：

| 维度 | 来自 Skill | Markcraft 落地规则 |
|------|-----------|-------------------|
| 表达方差 | taste-skill 拨盘 | **VARIANCE 3–4**（克制，不随机变异）、**DENSITY 高**（信息密度，桌面原生）、**MOTION 低** |
| AI 味禁令 | taste-skill 硬禁令 | 禁 AI 紫辉光、禁纯黑、禁过饱和、禁胶囊 999px、禁卡片上浮+投影、禁 emoji 控件、禁半截交付 |
| 桌面语法 | macos-design-guidelines | 键盘优先、语义色（双模式自适应）、4–6px 圆角、发丝分隔、hover 实色、Esc 关弹层、popover 锚定来源、reduced-motion、VoiceOver 标签 |
| 动效工程 | emilkowalski-skills | 频率门控（100+/天键盘动作零动画）、入场 ease-out <300ms、只动 transform/opacity、popover 从触发器缩放、modal 居中、绝不 `scale(0)`、随动画交付 reduced-motion |

---

## 1. 范围与边界（铁律锁定）

- **改**：`src/aurora/`（UI 层）、`src/components/ui` + `styles/tokens.css`（地基）
- **不动**：`src/features/*`、`stores/*`（状态/逻辑层，只消费不重建）
- **禁增**：只改已有功能的视觉，不虚构真实不存在的模块
- **不整换**：原地改外壳，非从零重写（"整体换新"是独立未来工程，不在本方案）

---

## 2. 分阶段实施方案

### P0 · 地基收口（全站受益，换不换壳都值）

| 编号 | 改动 | 精确锚点 | 驱动 Skill | 验收 |
|------|------|---------|-----------|------|
| P0.1 | 删 `--mc-accent-glow`，focus 改 1px 实色描边 | `components.css:833` / `:866` | taste(禁紫辉光) + emil(focus 不发光) | 全库无 `accent-glow` 引用 |
| P0.2 | 合并双 `tokens.css`（Aurora 2px vs 全局 4px），定 4px 基准 | `styles/tokens.css` + Aurora 重复 token 文件 | taste(一致性锁) + macos(一致间距网格) | 同名 token 唯一来源；grep 无冲突 |
| P0.3 | 语义色收口，清 8 处硬编码 | `BlogPanel.tsx:49-56`(6彩accent)、`FileTree`/`CanvasSidebarPanel`(文件类型8色)、`GraphPanel GROUP_COLORS`(6色)、`Kb` 节点色、`DiaryPanel.tsx:871`(--mc-status-* 不存在token硬回退)、`settings.css:323/338`(不存在token) | taste(禁硬编码) + macos(Rule 9.3/9.4 语义色) | 所有色走 `--mc-*`；无裸 hex |
| P0.4 | 圆角分档：窗口8 / 卡6 / 按钮4 / 标签4 | welcome 品牌 12px、about logo 18px、mindmap node 10px、mini-graph 10px | taste(反超圆角) + macos(紧凑控件) | 无 >6px 非窗口圆角 |
| P0.5 | 按钮地基去渐变/抬升/光晕 | `components.css` 基础 primary/danger 按钮 | emil(hover 不 lift) + taste(反卡片上浮) | hover = 实色底变化，无 translateY/光晕 |

### P1 · 弹层栈收口（最高杠杆，消 6 高危旧弹窗）

| 编号 | 改动 | 精确锚点 | 驱动 Skill | 验收 |
|------|------|---------|-----------|------|
| P1.1 | 复用/收口单一 Modal·Popover·CommandPalette 于 `src/components/ui`（无则只建一个统一封装，不新增业务模块） | `src/components/ui` | macos(弹层语法) + 战略约束(加固地基) | 全库弹层走同一接口 |
| P1.2 | 三栈 → 一栈：Aurora 手写玻璃 Modal、DiaryPanel `dv-*` 4 弹层、DiaryCalendar 心情选择器、canvas.css 重复 `.aurora-modal` 全部迁真实库 | `createPortal` 13处(Diary5/Canvas5/FileTree2/Outline1)、`canvas.css` | taste(去玻璃) + macos(无自定义chrome) | 无 `backdrop-filter:blur` 非浮层保留处；`dv-*` 命名栈退役 |
| P1.3 | 命令面板：紫辉光+12px+玻璃 → 实色面板（VS Code Cmd+P/Raycast 味），4–6px 圆角 | CommandPalette 组件 | emil(高频入场<200ms ease-out) + taste(禁辉光) | 实色底、无辉光、无玻璃 |
| P1.4 | 弹层动效标准化：modal 居中淡入(opacity+小幅 translateY)、popover 从触发器缩放(transform-origin 锚定)、Esc 关、点外关 | 弹层基元 | emil(popover缩放/modal居中/禁scale(0)/<300ms) + macos(Rule 10.1/10.2) | 入场 <300ms ease-out；popover 锚定；Esc 生效 |
| P1.5 | 右键菜单统一真实库 | FileTree / 白板 / Kb | macos(Rule 1.4 / 6.2 上下文菜单) | 全交互元素有右键菜单 |

### P2 · 展示页桌面化（外壳内部装修，依"换新"时间表定投入）

| 编号 | 改动 | 精确锚点 | 驱动 Skill | 验收 |
|------|------|---------|-----------|------|
| P2.1 | 欢迎页：删 glass hero + 极光 radial glow + 顶部渐变线 + 12px 品牌圆角 → "最近文档"启动面（列表，访达/VS Code 起始页风） | welcome 页 | taste(反 SaaS 落地页) + macos(列表非落地页) | 无 glow/渐变；首屏为列表 |
| P2.2 | 博客工作室：6彩accent→单 `--mc-accent`；可甩动浮层→可停靠侧栏；渐变封面卡+shimmer→实色；emoji 📚→Lucide | `BlogPanel.tsx:49-56`、工作室浮层 | taste(禁渐变/emoji) + macos(无FAB/停靠) | 单 accent；实色；停靠 |
| P2.3 | 知识库管理：卡片网格 → 列表/表格行（访达/VS Code 资源管理器风） | KbManagePanel | taste(反卡片化) + macos(侧栏+列表) | 列表行，非卡片堆叠 |
| P2.4 | 日记页：emoji 🎲/📅→Lucide+tooltip/aria；假 affordance KPI→真跳转或不可点；"记录心情"3入口→单一主入口 | `DiaryPanel.tsx:531/558/644/699` | macos(稳定命令) + taste(反emoji) | 无 emoji 控件；单入口 |
| P2.5 | KbPanel：手写 Edit/Delete 模态→真实库；emoji 🎨→SVG；KPI 假 affordance 修 | `KbPanel.tsx:159/246/871/492-494` | macos(语义色/稳定命令) + P1 收口 | 模态走真实库；无 emoji |

### P3 · 打磨（编辑器 chrome + a11y + reduced-motion）

| 编号 | 改动 | 精确锚点 | 驱动 Skill | 验收 |
|------|------|---------|-----------|------|
| P3.1 | 编辑器 chrome 微修：大纲竖条渐变→实色；代码 token 紫粉→token 主题；mini-graph 10px→6px | `editor.css:1509` | taste(反渐变) + macos(圆角) | 实色竖条；token 主题色 |
| P3.2 | reduced-motion 全覆盖：graph rAF 力导向、命令面板入场、Toast、blog shimmer+spin、timeline/node-pulse | GraphPanel / Toast / blog / timeline | emil(随交付 reduced-motion) + macos(Rule 11.3) | 开启 reduced-motion 后无装饰动画 |
| P3.3 | a11y：emoji→Lucide+aria-label；增对比度变体；focus 顺序 | 全局图标按钮 | macos(Rule 11.1/11.5/11.7) | VoiceOver 标签齐全；增对比度变体 |
| P3.4 | 图标统一：emoji → Lucide（`lucide-icons/lucide`） | 全局 emoji 控件 | taste(反 emoji) | 无 emoji 作控件 |

---

## 3. 验收闸门（按 Skill 逐项）

- **taste pre-flight**：无 AI 紫、无纯黑、无过饱和、无胶囊/大圆角/卡片上浮、无 emoji 控件、无半截交付。
- **macos checklist**：键盘全导航、hover 态、Esc 关弹层、popover 锚定、语义色双模式、reduced-motion、VoiceOver 标签。
- **emil motion audit**：高频动作零动画、入场 <300ms ease-out、只 transform/opacity、popover 缩放锚定、modal 居中、无 `scale(0)`、reduced-motion 全覆盖。
- **技术门禁**：`tsc --noEmit` = 0；vitest 烟雾测试全绿（遵循 Batch A 测试铁律：**严禁同时 mock TagIndexStore 与 LinkIndexStore**）。

---

## 4. 里程碑与执行顺序

- **M0 · P0 地基**：低风险、全站受益。先合并 tokens、删 glow、语义色、圆角、按钮地基。
- **M1 · P1 弹层收口**：最高杠杆，一次性消 audit 板 §十二–§十七 的 6 高危旧弹窗；建真实库组件 + 迁三栈。
- **M2 · P2 展示页**：确认"整体换新"时间表后再定投入（外壳内部装修，换新临近则降级）。
- **M3 · P3 打磨**：编辑器 chrome + a11y + reduced-motion。

---

## 5. 风险与回退

- 三栈迁移可能短暂回归弹层外观 → **每迁一个弹层即截图验证**（用户偏好：UI 改动一律截图验证）。
- 双 tokens 合并前先 `grep` 确认 Aurora 2px 是否真有唯一依赖，避免误删。
- 严格不动 `features/*`，避免逻辑回归。
- P2 展示页改动若"整体换新"临近，优先保留可复用 tokens/组件，页面级重做降级。

---

## 6. 工具与验证

- 截图验证：每批改动后整页/节点截图核对（现有截图工具）。
- 类型/测试门禁：`tsc` + vitest 烟雾测试。
- 可选：将本方案精炼为一页 Ardot 看板 §十八，与现有审计板打通（待用户定）。
