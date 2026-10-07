# 博客工作室（Blog Studio）界面重构方案

> 调研驱动 + 现有代码诊断 + 完整重构规格。定位：Calm Premium 设计语言家族第五成员。
> 输出日期：2026-08-10 · UI Designer

---

## 0. 现有代码结构与样式诊断（先诊断，后方案）

### 0.1 现状结构（基于 `src/features/blog/` 实际代码）

| 层级 | 文件 / 节点 | 结构 |
|------|-------------|------|
| 外壳 | `BlogStudio.tsx` | `position:fixed; inset:0; zIndex:300` 全屏覆盖层。结构 = 顶栏(44px) + 主区(IconSidebar 52px + 滑动 Sidebar 300px + Preview 画布) |
| 图标栏 | `components/IconSidebar.tsx` | 6 个工具按钮：style/color/content/features/css/export，**每个独立 accent 色** |
| 左面板 | `components/LeftPanel.tsx` → `panels/{Style,Color,Content,Features,Css}Panel` | 滑动式二级面板（width 0↔300），含 section 头(accent 点+大写标题)+accent 线+滚动内容 |
| 共享组件 | `components/StudioControls.tsx` | `StudioInput/Select/Toggle/Chip/Button/SectionLabel`，硬编码 rgba + `#a78bfa` 焦点环 |
| 顶部 | `BlogStudio.tsx` 顶栏 | 仅 "MarkCraft Studio" 字标(weight 300) + 文档计数 chip + 关闭按钮 |
| 预览 | `BlogStudio.tsx` Preview 区 | device 工具条(desktop/tablet/mobile) + iframe 预览；空态 = 徽章+标题+渐变 CTA+3 模板卡+流程提示 |
| 主题 | `BlogStudio.tsx` `tk` 对象 + `ThemeStyleProvider` | **自创**暗色变量：bg `#08080c`、surface `rgba(10,10,16,.95)`、text `#e4e4e7`、accent `#a78bfa` |

### 0.2 具体问题点（编号，供改造对照）

- **P1 · 六色彩虹强调色**：6 个面板各用一种 hue（紫 `#a78bfa`/粉 `#f472b6`/蓝 `#38bdf8`/橙 `#fb923c`/绿 `#34d399`/黄 `#fbbf24`）。这与项目 Calm Premium「单一 accent `#5B7CFA`、语义色只表状态」完全冲突，是"视觉层次混乱"的根因。2026 趋势（dev.to/thekitbase）明确：**"彩色图标墙已死"——单 accent + 颜色仅表状态（红=错、绿=健康）**。
- **P2 · 自创暗色变量，未接 `--mc-*`**：`tk` 对象与 `StudioControls` 全用硬编码 rgba，bg `#08080c` 比外壳 page `#0E0F17` 更黑、text `#e4e4e7` 与外壳 text1 `#E6E8EF` 不一致。暗色下工作室与桌面壳其余界面（仪表盘/日记/知识图谱/白板）**视觉割裂、无统一层级语言**。
- **P3 · 信息架构错位**：配置工具（style/color/features/css）被放在**一级图标栏**，而真正的"博客工作台"核心——**文章/手稿库（content list）**——被埋成 6 个工具之一。内容管理不是首要表面，反而是样式控制。
- **P4 · 角色不清**：工作室本质是"Markdown→静态站点生成器 + 实时预览"，但无任何**源 Markdown 编辑区**。用户问的"编辑区"当前不存在——只有配置面板，靠改配置重新生成整站。需澄清"源编辑 / 站点配置 / 实时预览"三者在界面中的边界。
- **P5 · 顶栏信息稀薄**：无当前编辑对象标题、无保存/发布状态、无主操作入口（仅关闭）。专业工具顶栏应承载标题+状态+主 CTA。
- **P6 · 空态元素堆砌**：徽章 + 标题 + 副文案 + 紫粉渐变 CTA + 3 张模板卡 + 流程提示，5 类元素纵向堆叠，无单一焦点，渐变 CTA 与面板色竞争。
- **P7 · 魔法数字、无 token 化**：`StudioControls` 所有组件写死 `rgba(...)` 与 `#a78bfa` 焦点环；明暗靠每个组件 `isDark ? ... : ...` 分支，已漂移（亮色 bg `#f5f5f0` 暖调，与外壳中性不一致）。无法一处改全局。
- **P8 · 圆角语言不一致**：散见 6/8/10/12/13/14/20(capsule)；外壳 token 仅 6/8/12 三档，杂值 13/14 显碎。
- **P9 · 可访问性缺口**：① 图标按钮无 `aria-label`（仅 hover tooltip，键盘用户无名）；② 全组件无 `:focus-visible` 环（键盘焦点不可见）；③ 文字对比度：`textMuted rgba(255,255,255,.35)` 在小字 ≈3:1 临界、`.2` 不达标；④ device 切换是裸 `<button>` 而非 `role="tablist"`/`aria-pressed`；⑤ 点击预览 iframe 直接关面板（`onClick` 关 activePanel），易误触。
- **P10 · 动效无降级**：spring `cubic-bezier(.34,1.56,.64,1)` 与 `0 0 8px accent60` 辉光装饰，全无 `prefers-reduced-motion` 守卫。
- **P11 · 预览 device 框不一致**：desktop 全幅无框、白底 iframe 贴在近黑 bg 上刺眼；tablet/mobile 才给假三圆点标题栏——同页两种框语言。

---

## 1. 设计风格定位与整体调性

**定位：Studio Editorial / 编辑工作室** —— Calm Premium 家族第五成员，与
- 仪表盘 *Calm Premium Bento*、日记 *Calm Sanctuary*、知识图谱 *Neural Atlas*、白板 *Studio Canvas*
**同源异情绪**：复用 `--mc-*` 暗色 token，但更"内容优先、编辑感、专业克制"。

**调性关键词**
- 暗色优先（dark-first，flash-free）、单强调色、用**字重与留白**建立层级（而非彩色与边框）
- 最小 chrome：1px 边框代投影、克制圆角、等宽字体承载数据
- 与项目战略方向一致：桌面端软件范式（窗口 chrome、键盘优先、信息密度、可折叠导航）

**与现有风格的对立（明确改什么）**
> 六色 → 单色；紫粉渐变 → 中性强调；自创变量 → `--mc-*`；配置前置 → 内容前置；堆砌空态 → 单焦点。

---

## 2. 色彩方案与字体层级规范

### 2.1 色彩（全部映射到 `--mc-*`，新增 blog-studio 层仅做语义别名）

| 角色 | Token | 暗色值 | 说明 |
|------|-------|--------|------|
| 页面底 | `--mc-page` | `#0E0F17` | 与外壳一致（替换旧 `#08080c`） |
| 表面（面板/卡） | `--mc-surface` | `#1A1C24` | |
| 内层（检查器/库） | `--mc-panel` | `#14161F` | |
| 边框 | `--mc-border` | `#292E30` | 1px 优先 |
| 文字 1 | `--mc-text-1` | `#E6E8EF` | 标题/正文 |
| 文字 2 | `--mc-text-2` | `#8A8F9C` | 次要 |
| 文字 3 | `--mc-text-3` | `#5A5F6B` | 禁用/极弱 |
| **主强调** | `--mc-accent` | `#5B7CFA` | **唯一装饰色，全页 ≤2–3 处** |
| 成功 | `--mc-success` | `#1FA45C` | 已发布/健康 |
| 警告 | `--mc-warning` | `#E0A23B` | 草稿/待处理 |
| 危险 | `--mc-danger` | `#E5564B` | 错误/删除 |

- **语义色只表状态**：文章状态 chip（草稿=warning / 已发布=success / 错误=danger）、发布结果、校验——绝不做装饰。
- **强调色收敛**：检查器 tab、主 CTA、选中环用 `--mc-accent`；其余一律中性。
- 亮色模式（若启用）：page `#F7F8FA` / surface `#FFFFFF` / panel `#F1F3F7` / border `#E6E8EC` / text1 `#1A1C24` / text2 `#5A5F6B` / accent 同 `#5B7CFA`。

### 2.2 字体层级

| 用途 | 字体 | 字号 | 字重 | 行高 |
|------|------|------|------|------|
| UI 文本 / 标签 | Inter（中文 PingFang/微软雅黑） | 12 / 13 | 500 | 1.4 |
| 小节标题 | Inter | 11 | 700 | uppercase·字距 .08em |
| 大标题（顶栏对象名） | Inter | 14–16 | 600 | 1.3 |
| 数据/字数/KB | JetBrains Mono / Fira Code | 11–13 | 500 | — |
| 生成博客正文（预览内） | Inter/系统 | 16–18 | 400 | 1.7（measure ≤720，uipotion 规范） |
| 生成博客标题（预览内） | Inter | 32–48 | 700–800 | 1.2 |

> 设计语言：层级靠**字重 + 字号 + 文字色阶**建立，不靠颜色（呼应 minimalist dashboard 趋势）。

---

## 3. 设计令牌定义（间距 / 圆角 / 阴影 / 动效）

| 类别 | Token | 值 | 备注 |
|------|-------|----|------|
| 间距 | `--mc-space-{1,2,3,4,5,6,8}` | 4/8/12/16/20/24/32 | 复用既有，4px 基 |
| 圆角 | `--mc-radius-sm/md/lg` | 8 / 10 / 12 | **三档统一**，废除 13/14 杂值；芯片 18–20(capsule) |
| 阴影 | `--mc-shadow-sm/md` | 0 1px 2px / 0 4px 6px 10% 黑 | 仅 elevation 用；普通容器用 1px border |
| 描边 | `--mc-border` | 1px `#292E30` | 默认分隔方式 |
| 动效 | `--mc-ease` | `cubic-bezier(.25,.46,.45,.94)` | 150ms 微反馈 / 300ms 面板 |
| 强调辉光 | — | **禁用** | 移除紫粉 `0 0 8px accent60` 装饰，改中性描边 |

> BlogStudio 内联 `tk` 与 `StudioControls` 硬编码 rgba 全部迁移为上述 token 引用；明暗不再逐组件分支，由 `--mc-*` 变量自动切换。

---

## 4. 页面布局结构与组件拆分

### 4.1 新结构：三区工作台的修正 IA

```
┌──────────────────────────────────────────────────────────────┐
│ 顶栏 (48)  对象名 · 面包屑      [保存状态]   发布▾  主题  关闭  │
├──────────┬───────────────────────────────────────┬────────────┤
│ 手稿库    │  预览舞台                              │ 检查器     │
│ (280,可折)│  device条(桌面/平板/手机)              │ (300,可折) │
│          │  ┌─────────────────────────────────┐  │  tab:      │
│ 搜索      │  │       实时预览 iframe           │  │  外观      │
│ ───────  │  │  (居中·device 框统一)           │  │  颜色      │
│ 文章列表  │  └─────────────────────────────────┘  │  内容      │
│ ·标题     │  状态条: 生成中/已发布/错误 + KB 数   │  特性      │
│ ·状态chip │                                        │  自定义CSS  │
│ ·日期/字数│                                        │  发布      │
│ [+ 新建]  │                                        │            │
└──────────┴───────────────────────────────────────┴────────────┘
```

### 4.2 组件清单

| 组件 | 来自 | 责任 |
|------|------|------|
| `StudioTopBar` | 重做 `BlogStudio` 顶栏 | 对象名+面包屑 / 保存状态点 / 发布▾菜单 / 主题切换 / 关闭 |
| `ManuscriptLibrary` | **新增**（替换 content 面板为一级） | 搜索 + 文章列表(标题/状态 chip/日期/字数) + 新建；可折叠至图标 |
| `PreviewStage` | 重做 Preview 区 | device 工具条(`role=tablist`) + 统一 device 框预览 + 底部状态条 |
| `InspectorTabs` | **新增**（合并 6 面板为 tab） | 单强调 tab：外观/颜色/内容/特性/自定义CSS/发布；随选中文章 |
| 基础控件 | `StudioControls` 全量重写 | `StudioInput/Select/Toggle/Chip/Button/SectionLabel` 改用 `--mc-*` token，去 `#a78bfa`、去辉光、加 focus-visible |

### 4.3 各区域要点

- **顶栏**：左=当前站点/文章名（无选中则"博客工作室"）+ 面包屑；中=自动保存状态（点状+「已保存」/「保存中…」）；右=发布▾（部署平台菜单）、主题、关闭。主操作集中此处。
- **手稿库（一级）**：解决 P3——把"内容"提升为首要表面。列表项含标题、状态 chip（语义色）、日期、字数；支持搜索、新建、选中联动检查器。
- **预览舞台**：device 切换统一为 `role="tablist"` + `aria-pressed`；desktop/tablet/mobile **同一框语言**（均给细边框 + 圆角，仅尺寸差），消除 P11 刺眼白底。底部状态条显示生成态/发布态/体积。
- **检查器（tab 化）**：解决 P1——6 面板变 6 个 tab，**统一 accent**，内容随手稿库选中项。空态单 CTA（加载示例 / 选择文章）。

---

## 5. 关键交互与动效设计要点

- **tab 切换**：内容淡入 150ms（`--mc-ease`），无滑动；选中态=accent 下划线/左条。
- **面板折叠**：内容库/检查器可折叠至图标（icon-only 持久化 localStorage），符合 2026 可折叠侧栏标准。
- **hover 微反馈**：按钮/列表项 150ms 背景过渡，无位移堆叠；禁用紫粉辉光。
- **保存状态**：自动保存后 toast/状态点，避免误关丢失。
- **发布流程**：发布▾ → 平台子菜单 → 进度（生成中→上传中→完成），状态条与 toast 双反馈。
- **联动**：手稿库选中 → 检查器加载该文配置 → 预览刷新。
- **空态**：单一焦点 CTA（「载入示例文章」或「新建手稿」），去除渐变与模板卡堆砌（P6）。
- **reduced-motion**：所有动效包 `@media (prefers-reduced-motion: reduce)` 降级为 0ms；辉光装饰直接移除（P10）。

---

## 6. 响应式适配与可访问性

### 6.1 响应式（桌面优先）
- **≥1280**：三区常驻（库 280 / 舞台 / 检查器 300）。
- **1024–1279**：检查器默认折叠为图标，点击展开为右抽屉。
- **≤768 / 移动**：手稿库转左抽屉；舞台全宽；检查器转底部 sheet。功能不缺失，布局降级。

### 6.2 可访问性（WCAG AA）
- **对比度**：正文 text1 `#E6E8EF` on `#0E0F17` ≈ 15:1；次要 text2 `#8A8F9C` ≈ 5.9:1（达标）；禁用态改用 `#5A5F6B`+降低不透明度而非 .2 透明（修 P9③）。
- **语义标签**：图标按钮加 `aria-label`；device 切换 `role="tablist"`+`aria-pressed`；tab `role="tab"`+`aria-selected`。
- **键盘**：所有可交互元素 `:focus-visible` 显示 2px `--mc-accent` 环（修 P9②）；tab 顺序符合视觉；预览 iframe 点击不再关面板（改独立关闭按钮，修 P9⑤）。
- **触控**：可点目标 ≥44px（顶栏按钮、tab、列表项）。
- **reduced-motion**：全局守卫（修 P10）。
- **动态文案**：状态/空态用 `t.blogStudio.*`（现有 i18n 体系），不硬编码。

---

## 7. 改造优先级与分阶段实施计划

| 阶段 | 内容 | 对应问题 | 风险/收益 |
|------|------|----------|-----------|
| **P0 · 一致性止血**（高收益低风险） | 去六色→单 accent；`tk`+`StudioControls` 全部接 `--mc-*`；bg/text 对齐外壳 | P1/P2/P7 | 改 CSS 变量即可，不掉功能，立刻统一 |
| **P1 · IA 修正** | 拆出 `ManuscriptLibrary` 为一级；`InspectorTabs` 合并 6 面板；顶栏加标题/状态/发布 | P3/P4/P5 | 结构性改动，需重排 BlogStudio 布局 |
| **P2 · 视觉收口** | 圆角三档统一；1px 边框代投影；device 框统一；空态单 CTA | P6/P8/P11 | 纯视觉，低风险 |
| **P3 · 可访问性** | aria-label / focus-visible / tablist / 对比度 / 点击关面板修复 | P9 | 加属性，无布局风险 |
| **P4 · 动效与文档** | reduced-motion 守卫；`StudioControls` 重写；blog-studio token 文档 | P10 | 收尾 |

> 建议顺序 **P0 → P1 → P2 → P3 → P4**。P0 当天可见效；P1 是体验质变点。

---

## 8. 诚实边界与下一步

**画布/原型诚实边界**：Ardot 画布画不出真实阴影/品牌字体/hover 微交互/device 框实时预览/面板折叠动效——这些是视觉真值，在「HTML 高保真原型」或 React 实现阶段落地。

**下一步选项**
- **A｜同步结构层到画布 5:256**（删除旧布局，保留标题栏/侧边栏 chrome，插入新三区结构）——与仪表盘/日记/知识图谱/白板一致
- **B｜HTML 高保真原型**（写实单强调色 + 真实字体 + hover + device 统一框 + 检查器 tab + 发布菜单）
- **C｜React 实现规格**（`--mc-*` 映射 + 组件 props + 状态机 + a11y 清单）

> 建议 **A → B**。确认后我把结构同步到主板帧 5:256。

---

### 附：调研来源要点（2026）
- dev.to/thekitbase《SaaS Dashboard Trends 2026》：**彩色图标墙已死**；暗色优先 + 语义 token + 最小 chrome + 可折叠侧栏 + 单 accent。
- ui-syntax《Minimalist Dashboards》：4/8px 间距、字重建立层级、语义色只表状态、WCAG AA。
- RyuChan / WSLpress / DevLog：浏览器内 写+实时预览+发布、Markdown、暗色跟随、GitHub/Cloudflare/Vercel 部署——印证"源→配置→预览→部署"工作室模型。
- uipotion《Blog Layout》：正文 measure ≤720、标题 32–48/700–800、行高 1.6–1.8——生成博客排版基线。
- designsignal《Dashboard Patterns 2026》：quiet-luxury 动效、用字重/间距传情绪、克制。
