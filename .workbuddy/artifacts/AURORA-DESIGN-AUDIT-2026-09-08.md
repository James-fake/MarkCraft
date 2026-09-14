# MarkCraft Aurora 桌面端界面设计审计

**日期**：2026-09-08
**审查视角**：anti-slop（taste-skill / design-taste-frontend）+ macOS HIG（macos-design-guidelines）
**审查方式**：Edge headless 截图（8 视图，1600×950）+ DevTools HMR + CSS 实测下发验证
**范围**：`src/aurora/*` 实际界面 + `src/styles/*` token 双源

---

## 1. 设计读（Design Read）

**MarkCraft = 桌面端 Markdown 编辑器**，转型自 Web UI，目标范式 = VS Code / macOS IDE / Git 客户端等成熟桌面软件。

- 单源 token：`src/aurora/styles/tokens.css`（深色体系，`--mc-bg-window:#0A0B0F` ... `--mc-bg-content:#101218`），圆角 sm:4 / md:8 / lg:12 / pill:999，accent 极光蓝紫 `#7C8CFF`
- 桌面外壳：顶栏 48px / 侧栏 200px / 底栏 28px / 窗口控制 46px（tokens.css §12）
- 视图集：welcome / editor / canvas / kb / graph / blog / dashboard / settings / diary

**核心矛盾**：token 与命名空间纪律已建立（z-index §14、圆角 §9、z 层带统一），但**渲染层与设计意图严重脱节** —— 截图实测与代码层证据共同证明。

---

## 2. 致命问题（P0，必须修）

### P0-1 · 主题系统失效 — 用户「深色模式」期望被反向呈现

| 维度 | 内容 |
|---|---|
| **用户口述** | 「我现在 Markcraft 是在深色模式下，但编辑区域是蓝色的」 |
| **截图实情** | 8 张视图全部浅色背景（#F2F3F7 ~ #F7F8FA） |
| **代码根因** | `src/stores/SettingsStore.tsx:82` 默认 `theme: 'light'`；`src/styles/desktop-chrome.css:81-89` `[data-theme="light"] { --mc-bg-app: #F7F8FA }` 主导 |
| **派生** | 用户感受的「编辑区是蓝色」= 浅色背景 + base.css slate-900 蓝色 accent + Graph 浅蓝紫 综合形成的「不像深色桌面软件该有的样子」 |
| **修复** | (a) `SettingsStore.theme` 默认值改 `'dark'`；(b) tokens.css 接管 `--mc-bg-app` 为 `--mc-bg-window`（让 `[data-theme="light"]` 单独覆盖亮色值） |

### P0-2 · Graph 视图整片浅蓝紫背景 — 用户「蓝色」感受的直接来源

| 维度 | 内容 |
|---|---|
| **截图** | 双链图谱视图背景呈浅蓝紫调（~RGB 230-235 + 蓝紫底色），与其它视图浅灰白不一致 |
| **根因** | GraphPanel 画布 2D 渲染背景色未走 token（`#aurora-root` 兜底只管 DOM 背景，canvas 内部仍吃硬编码） |
| **触犯** | taste-skill 9.A Lila Rule（AI Blue glow 违例）+ macOS HIG 9.4 Dark Mode 不一致 |
| **修复** | GraphPanel 画布背景显式使用 `var(--mc-bg-window)`，撤除硬编码 slate 浅蓝 |

### P0-3 · Blog 视图严重 AI-Tell 紫粉渐变模板

| 维度 | 内容 |
|---|---|
| **截图** | 强紫粉渐变背景 / 超大圆角卡片 / 装饰圆环 / 紫色 eyebrow「PERSONAL BLOG」/「FEATURED」/ 渐变标题「My Blog」/ 浮层阴影 |
| **触犯** | taste-skill 4.2 Lila Rule + 4.7 装饰元素过多 + 9.A 紫粉违例 + 圆角锁违例 |
| **修复** | BlogPanel 重建 hero 视觉：撤除紫粉渐变与装饰圆环，统一 token；卡片圆角 ≤ 8px；eyebrow 改 mc-text-tertiary 灰色不用紫色；撤除「01」「FEATURED」装饰编号 → ✅ 已落地（2026-09-08），见 §5 修复记录 |

### P0-4 · 圆角系统与锁定值不一致

| 维度 | 内容 |
|---|---|
| **锁定值** | tokens.css §9：`--mc-radius-sm:4 / md:8 / lg:12 / pill:999`，注释明确「禁止 6px 以上非窗口裸圆角（AI-slop）」 |
| **截图违例** | kb 空态按钮 ~8-10px / canvas 空态卡 ~10-12px / blog 大卡片 ~16-24px / diary heatmap 卡 ~10px |
| **修复** | 全局 grep `border-radius:.*px` 用 token 名替换，删除 `.aurora-*` 类硬编码 px 半径 |

---

## 3. 严重问题（P1）

### P1-1 · macOS HIG §1.1 菜单栏缺失
- 顶栏仅 logo + 应用名 + 窗口控制；缺 File / Edit / View / Window / Help
- Mac 用户首启动即找菜单栏，缺失 = 体感不像桌面软件
- **修复**：AuroraShell 顶栏左侧加菜单结构 + ⌘1-⌘9 视图切换快捷键提示 → ✅ ㊱ 已落地（独立菜单行五组真实命令）；用户嫌「独立 28px 行效果不佳、浪费垂直空间」→ ✅ ㊲ v2 并入标题栏（图标 + MarkCraft 右侧，间距 ≈20px，命令面板入口迁右插槽）

### P1-2 · 顶栏缺文档上下文（HIG §2.4）
- 编辑器视图时顶栏仍只显示应用名，没有 breadcrumb / 当前文档名 / 修改圆点
- **修复**：顶栏嵌入 breadcrumb（库/文件夹/文件名）+ 编辑态圆点 → ✅ ㊳ 已落地（菜单后 hairline 分区 + 分段箭头；编辑器面包屑改为完整文件夹链回溯；`tab.isDirty` 真实未保存态 → 文件名前 accent 圆点；末级加粗、祖先 hover/可点；无 breadcrumbs 面板不渲染分区线）

### P1-3 · 信息密度偏轻（不适合 IDE 类桌面软件）
- 整体 VISUAL_DENSITY ~3（taste-skill 标准）；用户偏好 VS Code 类高密度
- 截图：编辑器主面板 90% 空白，列表 3 项用大行高
- **修复**：列表/树行高 24-28px，主面板默认承载分屏/大纲等次级面板 → ✅ ㊶ 已落地：
  - **根因四层**：(1) `PageFrame` 硬编码 `data-density="comfortable"` 占住属性 → (2) `densityStore` 顶层广播仅 `useDensitySetting` 调用时通过 useEffect 跑（Settings 面板未挂载时 store 模块**根本不 import**）→ (3) `aurora-main` 启动路径未 import store → (4) `src/styles/desktop-chrome.css:154-161` :root 块定义 chrome 尺寸 token（48/28/200/60/280/36），与 tokens.css compact 块**同 specificity 但后加载覆盖**——grep 验证 chrome 尺寸消费方 100% 在 aurora/，desktop-chrome.css 此段是**纯死代码**
  - **修根**：(a) PageFrame 删硬编码 + (b) aurora-main 启动路径 `import '@stores/densityStore'` 触发顶层广播 + (c) desktop-chrome.css 整段注释保留回滚余地
  - **token 化收紧**：tokens.css 新增 12.1 块（`--mc-sidebar-item-h` 32 / `--mc-list-item-h` 28 / `--mc-list-item-cozy-h` 40 / `--mc-filetree-item-h` 24 / `--mc-inspector-tab-h` 28 / `--mc-toolbar-btn-h` 24），扩展 `[data-density='compact']` 块覆盖全部 chrome + 12.1 紧凑值（titlebar 42 / statusbar 24 / sidebar 180 / font-base 12 / line-height 18 / space-4 6 / space-5 8 / space-6 12 / space-8 20），新增 `[data-density='comfortable']` 块反向放大（48/28/200/13/20/8/12/16/24/40/32/48/28/32/28）
  - **CSS 改硬编码为 token**：shell.css `.aurora-sidebar-item` 40→`var(--mc-sidebar-item-h)`、`.aurora-sidebar__user` 40→token、`.aurora-inspector__tabs` 32→token、brand 56→48；components.css `.aurora-list-item` 32→`var(--mc-list-item-h)`、`--cozy` 40→`var(--mc-list-item-cozy-h)`；移除 shell.css 旧的 [data-density='compact'] 硬编码 26px 覆盖（让 token 接管）
  - **默认 compact**：densityStore 启动即广播 → 全站默认高密度（VS Code 级），用户切 comfortable 时反向放大
  - **像素实证**（headless Edge + PIL）：顶栏 **47px → 41px（Δ -6px）**；侧栏图标整体上移 6-10px；chrome 整体节省 10px → 主体内容区多出半行可用高度
  - **验证**：tsc=0、14 文件 73/73（shell+6面板 smoke + densityStore + blog/kb/canvas 密度相关测试）
  - **未做（保留决策）**：(a) 审计原图第二条「主面板默认承载分屏/大纲」属独立布局重构（EditorPanel 拆分），与密度收紧无关，可作 P1-7/后续任务独立处理；(b) `desktop-chrome.css` L154-161 注释而非物理删除——保留回滚余地，下次类似冲突时再统一物理清理

### P1-4 · 状态栏零碎混杂
- 截图：左「已保存 / 已保存 13:48」混排；右「沪ICP备 / Aurora v2.0.0」违和（营销页元素入桌面软件）
- **修复**：严格三段（左 = 文档状态 / 中 = 视图统计 / 右 = 网络），移除营销字符串 → ✅ ㊵ 已落地：
  - **保存态改为「文档型面板专属」**：`StatusBar.savedState` 默认 `undefined`（此前默认 `'saved'` 导致欢迎/设置/白板等无文档页左端出现伪「已保存」）；`PageFrame` 同步去掉默认值
  - **编辑器保存态接真实数据**：`savedState={activeFileId ? (activeTabDirty ? 'unsaved' : 'saved') : undefined}`——与顶栏未保存圆点同源 `tab.isDirty`，打字即变「未保存」、自动保存后熄灭；空态（无活动文件）不渲染保存态与字数统计
  - **版本号移出状态栏**：welcome/settings 右端 `Aurora v2.0.0` 删除（版本信息仍驻欢迎页脚 `MarkCraft v2.0.0 · Aurora` + 设置 About `v2.0.0 (Aurora)`，符合「版本号只在 About/页脚」的桌面惯例）；「沪ICP备」早已不在源码
  - 清理 8 个非文档面板硬编码 `savedState="saved"`（welcome/settings/blog/diary/graph/kbmanage/kbpanel/canvas）
  - 状态栏左右容器空时整体隐藏（组件层）
- 同步镜像：`docs/design/02-welcome-panel.md`、`05-canvas-panel.md` 状态栏描述
- 新增 `StatusBar.smoke.test.tsx` 5 条（未传 savedState 无伪保存 / saved/unsaved 点色 / 保存态置最前带分隔 / 空容器隐藏）；tsc=0、11 测试文件 75/75

### P1-5 · blog 视图顶部 6 个 tab 无分组
- 「样式 / 配色 / 内容 / 功能 / CSS / 导出」一字排开
- 信息架构弱：应折叠为「主题 / 数据 / 高级」二级
- **修复**：折叠为 2-3 个 tab + segmented control 次级 → ✅ ㊷ 已落地（2026-09-08）：
  - 6 个平级 tab 折叠为 3 分组（**主题**=样式/配色 · **数据**=内容/功能 · **高级**=CSS/导出），子面板功能不增不减
  - 组内次级 segmented（`.aurora-blog__subseg`）：无轨道底、文本为主、与主 tab 间发丝线分区，视觉权重低一级
  - 交互：同组再点 = 浮层收/展（保留「专注预览」）；切组 = 落到组内首个子面板并展开；次级点击 = 切子面板并展开
  - 单一状态源：`activeGroup` 由 `panel` 派生，无平行 group state
  - 像素实证：子栏 42px（compact）、组 tab 28px（`--mc-inspector-tab-h`）、次级按钮 24px、轨道 34px

### P1-6 · canvas 视图顶部 4 个 tab 同样问题
- 「白板 / 思维导图 / 看板 / 时间轴」
- **修复**：同上或改 segmented control → ✅ ㊷ 已落地（2026-09-08）：4 视图为平级视图、分组不适用，保留 segmented 形态并接入密度体系 —— `.aurora-ctop` 48px→46px + `[data-density='compact']` 42px（与 blog 子栏一致）；视图按钮 30px→`var(--mc-inspector-tab-h)`；`--mc-inspector-tab-h` 注释扩为「Tab / segmented 行高」单源。像素实证：ctop 42px、按钮 28px

### P1-7 · graph 视图底部图例 chip 信息密度低
- chip 用 mc-graph-* 颜色圆点 + 文字，对比度低
- **修复**：图例改 `border-left: 2px solid var(--mc-graph-X); padding-left: 6px` 桌面范式，移除外层 chip 容器 → ✅ ㊸ 已落地（2026-09-08）：左栏图例 + 底部状态栏（统计 + 图例）三处统一 —— 节点项 = 2px 色阶 hairline tick（span 直挂 lg-* 类，撤圆点 `<i>`），连线项保留 solid/dashed 线样 swatch（映射画布线形）；文字 tertiary→secondary 提对比度。⚠️ 旧规则 `.lg-* { background: … }` 会命中新挂类的 span 染整段文字，已随替换清除

---

## 4. 改进项（P2）

### P1.5 · 白板首帧闪烁（用户实机反馈，非审计初版发现）
- **现象**：进入白板功能界面在深/浅色模式都闪一下白 → 变回灰色；深色更刺眼。
- **根因（代码侦查 + bundle 实证）**：Excalidraw 0.17 `viewBackgroundColor` 默认 `COLOR_PALETTE.white`，主画布背景由 `renderScene` 内的 `fillRect` 绘制在 `<canvas>` 像素层（CSS 无法覆盖）。我们注入暗色（#0D0F15）走 `handleAPI` 的 rAF 调 `engine.loadDocument → api.updateScene` 才生效；挂载首帧 Excalidraw 内部 theme 同步也是异步。→ mount 到 rAF 注入之间有 1~2 帧白色画布。
- **修复**：✅ ㊸ 已落地（2026-09-08 夜）
  - `ExcalidrawCanvas` 加 `booted` 门闸：host `opacity: booted ? 1 : 0; transition: opacity 140ms ease-out`；handleAPI rAF#1 写场景 + onReady，rAF#2 才亮出——让 Excalidraw 用注入的暗色 viewBackgroundColor 完成重绘后首帧即暗。
  - 卸载 `aliveRef` 守卫防止 setState 警告。
  - Aurora `canvas.css` `.aurora-canvas__viewport` 加 `background: #0D0F15`——门闸透明期不漏出 chrome 暗底反衬。
- **像素证据**：warm profile + 早期/稳态双截（budget 2200/9000ms）逐像素相同，画布区 100% (13,15,21) = #0D0F15，无白帧泄漏；修复前稳态 76.9 万像素 (223,224,229) 白残留。tsc=0，canvas smoke 7/7，全仓 vitest 770/1fail(预存 blogCssRefs)/2 skip=基线。
- **回归修复（2026-09-08 夜）** ✅ ㊹：白板 boote 门闸在 StrictMode（aurora-main `<StrictMode>`）dev double-mount 下把 aliveRef 钉死 → 用户实机出现「白板不可用 + 空态引导消失」。三处加固：(1) aliveRef effect body 重置 `true` 兼容 double-mount；(2) `loadDocument` try/catch 异常降级空白画布不阻断 ready；(3) booted 1500ms `setTimeout` 兜底防 rAF 链任何卡死。headless 实测空态引导、Dock、缩放、Aurora 侧栏全套恢复，tsc=0，canvas smoke 4/4。控制台 `Permissions policy violation: unload is not allowed` 是 useAppLogic S6 beforeunload 在受限 iframe 文档下被 permission policy 静默拦截的纯 warning，与本批无关。

### P2-1 · onboarding 在 headless / 无 localStorage 设备始终弹
- **修复**：✅ ㊺ 已落地（2026-09-09）：根因是 S11（useAuroraShell）与 AudienceOnboarding（AuroraShell）**两道门闸都只查 seen flag、不认深链** → 首访携带 `#view=blog` 时被 S11 改写到 welcome 视图、又被受众引导模态盖顶（headless 实测 42% 遮罩）。提纯 `shouldAutoOpenWelcome()` 纯函数（seen 已设 / URL 含 `#view=` / sessionStorage 恢复博客工作室 → false），S11 与 `showAudience` 统一消费。冷启动深链实测直达目标视图、无模态盖顶。新增 `useAuroraShell.test.ts` 6 条固化（首启 true；seen/深链/博客恢复 各自 false）。
- **验证**：tsc=0、vitest 26/26（定向）、全仓 776/1fail(预存 blogCssRefs)/2skip = 基线。

### P2-2 · 侧栏 8 个 icon 无视觉分组
- **修复**：✅ ㊺ 已落地（2026-09-09）：展开态本已有「工作区 / 发布 / 更多」三段组标题；补齐**收起态书脊（默认形态）**的组间发丝分隔 —— `.aurora-sidebar--collapsed .aurora-sidebar__group + .aurora-sidebar__group { border-top: 1px solid var(--mc-border-subtle) }`。hover tooltip 已由 SidebarItem 原生 `title={label}` 提供。
- **像素实证**：headless rail x6..56 扫描，两处分隔行 y=206 / y=263 均为 40px 全宽 #292E30（注：dark 作用域下 desktop-chrome.css:28 覆盖 `--mc-border-subtle`，#1A1D26 仅 tokens.css :root 基线值）。
- ⚠️ 踩坑：初版用 `::before` 绝对定位伪元素（top:-4px 居中于 8px gap），rail 内扫描无像素 → 伪元素未画出；改 `border-top` 元素盒方案即中。

### P2-3 · graph 节点图标语言不统一
- 正圆 + emoji 文件符混搭
- **修复**：统一圆形 + 内部 stroke 区分类型，移除 emoji 层 → ✅ 已落地（核验于 2026-09-09）：GraphPanel 节点渲染现为**纯几何形语言**——tag=六边形 polygon、folder=圆角矩形 rect(rx=4)、file/current=circle，无任何 emoji 层（grep + p156-graph.png 像素双重证实）。本项在审计截图之后已被节点渲染演进覆盖，审计文档滞后，标 ✅ 结项。

### P2-4 · blog「01」「FEATURED」装饰性编号
- 触犯 taste-skill 9.F section-number eyebrows 违例
- **修复**：撤除「01」装饰；「FEATURED」改为 mc-text-tertiary 灰色 chip → ✅ 已落地（核验于 2026-09-09）：classicThemeCssCards.ts `.featured-number { display:none }`（桌面端 01 已灭）、`.featured-deco/deco-circle/diamond/dot { display:none }`、`.featured-badge` 灰底灰字 chip（transparent bg + secondary text + 1px border），与 P0-3 修复记录一致。残留仅 mobile @media（`.featured-number{font-size:4em}` 未续 display:none）——Aurora 为桌面应用、mobile 分支不参与渲染，不阻塞。

### P2-5 · canvas 网格线对比度弱
- 浅色背景上灰点网格 ~ #E5E7EB
- **修复**：网格线用 mc-border-medium → ✅ 已落地（核验于 2026-09-09）：`.aurora-canvas` 双层 dot 网格已 token 化（小格 `--mc-border-subtle` 1px @20px + 大格 `--mc-border-medium` 1.5px @100px，canvas.css L14-28）；原「浅色灰点 #E5E7EB」问题由 P0-1 暗色默认消除。Excalidraw 场景内部网格为库 canvas 像素层渲染（CSS 无法覆盖），不属 Aurora 可控面。

---

## 5. 优先级表 / 修复路线

| 优先级 | 项 | 影响面 | 预估代码量 |
|---|---|---|---|
| P0-1 | SettingsStore.theme 默认 'dark' + body var 接管 | 全局 chrome | ~6 行 |
| P0-2 | Graph 画布背景走 token | graph 视图 | ~20 行 |
| P0-3 | Blog 视图紫粉渐变撤除 + 重建 | blog 视图 | ✅ 已修复（2026-09-08） |
| P0-4 | 全局圆角 token 化扫描 | 全局 | ✅ 已修复（2026-09-08） |

> **修复记录（P0-1/P0-2/P0-4）**：
> - P0-1 ✅：`SettingsStore.tsx:82` theme `'light'`→`'dark'`；`base.css:179` `var(--mc-bg-app)`→`var(--mc-bg-window)`（变量名错误，body var 此前永远 fallback 失败）。像素采样验证 avg RGB 242→11。
> - P0-2 ✅：随 P0-1 消解（graph 画布本就走 token，浅蓝紫是 `[data-theme="light"]` 覆盖派生）。
> - P0-4 ✅：真实渲染违例清零 —— pwa LibrarySync/QuickCapture 模态壳 18px→`var(--mc-radius-lg)`；templates Discovery/Insert 模态壳+顶部条 20px→lg；blog CssEditor 折叠面板 10px→8px；versionHistory `.vh-btn` 6px→`var(--mc-radius-sm)`；KbPanel 摘除零消费的 `kb-ui.css` 死 import。复扫确认 aurora 全域 css 仅 4/8/12/999 + 亚元素 2px；canvas/tiptap/diary 圆角全部合规。残留仅 `kb-ui.css`（`.kb-*` 老类零 Aurora DOM）死样式裸值 9-18px，待该文件整体退役批处理。验证：tsc=0、vitest 755/1(预存)/2 与基线一致。
> - P0-3 ✅：**magazine 模板**（默认 `themeStyle`，老 `htmlTemplate.ts` + `classicThemeCssBase.ts` + `classicThemeCssCards.ts`）AI-slop 收尾。13 处 CSS 改造：
>   - `body::before/::after` 紫粉大圆环背景 → `display:none`（整页紫粉渐变消失）
>   - `.hero-left::before` 160×160 装饰圆环 → `content:none`
>   - `.hero-label` "Personal Blog" 紫底紫字 → 透明背景 + 灰边 + 灰字；撤除 `::before` 紫圆点 + 动画
>   - `.hero-title span` 渐变文字（warm/rose/violet 三档含紫端）→ **㉟ 收敛为 warm→cool 两档同族渐变**（初版曾降为 `color:inherit` 纯墨色，用户反馈「标题变黑、切配色不变」后按「同色系收敛渐变」拍板修正，随配色联动且无紫粉端）
>   - `.hero-right`（垂直装饰 vline + 竖排 vlabel）→ `display:none`
>   - `.hero-divider .diamond` 紫菱形 → 灰 6px
>   - `--radius: 16px → 8px`、`--radius-sm: 10px → 4px`（圆角 token 收 8/4 规范档，所有 magazine 卡片自动合规）
>   - `.featured-badge` "Featured" 紫块 → 灰底灰字 chip
>   - `.featured-number` "01" 装饰大字 → `display:none`
>   - `.featured-deco` + `.deco-circle/diamond/dot` 4 个装饰元素 → 全部 `display:none`
> - 范围说明：60+ 新主题（aurora/cyberpunk/glassmorphism/bento 等）走 `newThemeTemplate.ts`，原本就简洁无装饰，本批未动。**色板（`--accent-warm/rose/violet`）保留**——用户色板可换紫/蓝/绿/暖灰等，不强制中性。
> - **视觉验证受限**：headless 截图被 onboarding 模态覆盖（fresh profile 无 localStorage），需用户本地浏览器验收。
> - 验证：tsc=0、blog 模块 vitest 181/1(预存 blogCssRefs)/=基线一致。
> - 残留（未动·P1 范围）：templates 两个模态顶部 `linear-gradient` 绿紫粉/紫粉黄渐变装饰条 + Featured 圆角——属 P1 桌面 chrome 收尾。
| ~~P1-1~~ | ~~顶栏菜单栏结构~~ | 顶栏 | ✅ ㊱ + ㊲（独立行 → 并入标题栏） |
| ~~P1-2~~ | ~~顶栏 breadcrumb~~ | 顶栏 + editor | ✅ ㊳（hairline 分区 + 文件夹链 + 未保存圆点） |
| P1-3 | 信息密度收紧 | 全局 | 散落调整 |
| ~~P1-4~~ | ~~状态栏三段整理~~ | 状态栏 | ✅ ㊵（保存态文档型专属 + 版本号移出状态栏 + 8 面板硬编码清理） |
| ~~P1-5/6~~ | ~~tab 折叠为 segmented~~ | blog / canvas | ✅ ㊷（blog 6→3 组+次级 segmented；canvas 接密度 token） |
| ~~P1-7~~ | ~~graph 图例改 hairline~~ | graph 视图 | ✅ ㊸（tick + 线样，三处统一） |
| ~~P2-1~~ | ~~onboarding 深链/跳过~~ | 首启门闸 | ✅ ㊺（shouldAutoOpenWelcome 纯函数 + 双门闸统一 + 6 条单测） |
| ~~P2-2~~ | ~~侧栏分组 + 分隔线~~ | 侧栏书脊 | ✅ ㊺（collapsed 组间 border-top 发丝，像素实证 y206/y263） |
| ~~P2-3~~ | ~~graph 节点 emoji~~ | graph 视图 | ✅ 已由节点演进覆盖（几何形语言，核验结项） |
| ~~P2-4~~ | ~~blog「01」/「FEATURED」~~ | blog 模板 | ✅ 已由 P0-3 覆盖（核验结项） |
| ~~P2-5~~ | ~~canvas 网格对比度~~ | canvas 背景 | ✅ 已 token 化 + P0-1 暗色默认消除（核验结项） |

> **P0/P1/P2 全层清零**（2026-09-09）：AURORA-DESIGN-AUDIT 全部 P0(1-4) / P1(1-7) / P2(1-5) 修复项落地。残余已知项见 §8 遗留清单。

---

## 6. 综合判断（设计与产品视角）

**当前 Aurora 走「精致/克制/桌面原生」路线是对的**，token 与命名空间纪律已建立（z-index 单源、圆角单源、z 层带），但**渲染层与意图脱节**集中在三块：

1. **桌面原生范式的"硬骨头"没啃** —— 菜单栏、文档标题、状态栏三段、密度收紧，是用户每次使用都会感知的桌面软件基本盘
2. **抗 AI-slop 防线不全** —— Blog/Graph 两视图分别在「紫粉」与「蓝紫」两端踩雷，是 anti-slop 测试必抓的视觉漏洞
3. **主题默认值反用户期望** —— 深色桌面软件默认应是 dark；当前 light 默认让新用户首启动就是浅色，与 tokens 深色 token 体系不符

**关键修正**：用户说「编辑区是蓝色」是**直觉表达**，客观上指向**主题失效 + 双 token 源冲突 + 局部 AI-slop 残留**三个根因的综合体。修复 P0-1（主题默认值 + body var 接管）即可消除最大头的「蓝色」感受，剩余 P0-2/3 是局部精准处理。

---

## 7. 截图证据位置

`.workbuddy/tmp/shots/audit-{home,editor,canvas,kb,blog,graph,diary,welcome}.png`（gitignore，不入库）

---

**审查者笔记**：headless 截图的视觉判读陷阱已两次踩（凭印象判为「深色半透明」跑偏），本报告所有颜色结论均经 PIL `Image.getpixel` 网格采样验证。后续视觉审查应坚持「像素采样优先于印象判读」纪律。

---

## 8. 遗留清单（已知 · 不阻塞）

| 项 | 归属 | 说明 |
|---|---|---|
| P2-3/4/5 的审计文本滞后于代码 | 文档 | 截图期早于节点演进/P0-3 落地，报告正文描述已过时；修复记录（§4）已标注真实状态 |
| blog mobile @media `.featured-number` 未续 display:none | blog 模板 | 桌面应用不渲染 mobile 分支；如需防窄窗导出可补一行 |
| `--mc-border-subtle` 双源（tokens.css #1A1D26 vs desktop-chrome.css dark #292E30） | token | desktop-chrome.css 系 P1-3 已注释的遗留 :root 段同一文件；待桌面 chrome 尺寸段物理删除时一并归并 |
| Excalidraw 内部网格为库 canvas 像素层 | canvas | CSS 不可覆盖；如需改对比度须绕 `updateScene` 或库层，暂不处理 |
| 白板空场景发白 / #121212 vs #0D0F15 差异 | canvas | Excalidraw 空场景 CSS 变量兜底；已记录非阻塞 |