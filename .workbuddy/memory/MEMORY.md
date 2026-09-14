# MarkCraft · Aurora 项目记忆（精简）

## 项目定位
Vite5+React18+TS；编辑内核 CodeMirror6+TipTap3；白板 Excalidraw(canvas-v2)；Dexie/IndexedDB。dev 端口 **5174**：
`node node_modules/vite/bin/vite.js --port 5174 --host`。入口 `index.html(#aurora-root)` → `src/aurora/aurora-main.tsx`
（真实 `#view=` 路由）。**Aurora = 项目实际运行界面**（非演示壳）。

## Aurora 铁律（每次操作前通读）
针对 `src/aurora/`：
1. 实际界面定位：Aurora 即真实界面。
2. 禁增：功能边界 = 真实已有功能，不虚构。
3. 视觉按 `styles/tokens.css` 的 `--mc-*` token；文档镜像界面实况。
4. 归属：UI 落 `src/aurora/`；`src/features/*` 是状态/逻辑层（被 Aurora 消费），可改但遵循 D4 单一数据源
   （与 Aurora 重复的工具统一 import 真实模块，不平行 mock）。`src/components/ui` 可直接 import。
5. 跨层协作：Aurora → features/stores → 基础设施，依赖只向下，0 反向依赖。

## 关键坑（防回归 · 只列铁律，案例见每日日志）
- Path depth：panels 引 features/stores/types 需 `../../../`；components/ui·app 仅 `../../`。
- 新类必须同批交付 CSS；BEM 名两端字面一致。
- z-index 层带单源 = `tokens.css §14`；Modal 单源 = `@components/ui/Modal`(sm/md/lg=360/440/640)；
  基础控件 Button/Confirm/Switch 走 `@components/ui/*`。
- 同文件多处 Edit 必须串行；改完 grep 核验。日志 append-only。
- **布局属性越权**：迁 features 组件入 Aurora 时，**颜色 token 之外，position/inset/z-index 同样会越权重生效**，
  复位时三类同时设 + `contain:paint`。契约测试 `src/aurora/panels/kb/kbPanelLayout.test.ts`。
- **拖拽闭包陷阱**：`mouseup` 监听是拖拽开始时注册的闭包，落盘读 state 拿到的是旧值 → 必须 `widthRef.current`。
- **指针捕获吞 click**：`<svg>` 上 `setPointerCapture` 后子节点 `click`/`dblclick` 被重定向到捕获元素 → 子元素交互挂 **pointerup**
  （`NODE_CLICK_SLOP = 4px` 区分拖拽）；`onPointerDown` 只处理主键（`e.button !== 0` return）；
  「点空白清空选中」靠**手势来源标记**区分，不能只看 `e.target === svg`。
- **视图上下文单源** = `useAuroraShell.nav` 的 param→params 映射表（canvas→canvasId / kb→kbId / **blog→kbId**）：
  新增带上下文跳转必须登记，漏一行 = 参数静默丢失。
- **沙箱删除劫持**：`rm`/`rmSync`/`Remove-Item` 都被转回收站，单次 190ms 与文件数无关。**唯一可靠解 = robocopy 镜像法**：
  `mkdir _empty && robocopy _empty <目标> /MIR /NFL /NDL /NJH /NJS /NP /R:0 /W:0`（exit 0–7 都算成功），再 `rmdirSync` 空根。
  别再 `rm -rf .edge-*`（必失败且白等）。

## 测试铁律
- 严禁同时 vi.mock TagIndexStore 与 LinkIndexStore（循环依赖静默崩溃）；改真实 Provider 包裹。
- **jsdom 不实现指针捕获重定向** → 凡「拖拽里用 setPointerCapture」的组件，真机节点 `onClick` 收不到事件
  （click 被重定向到捕获元素）；用 `fireEvent.click` 是**假路径**（全绿但真机无反应）。测这类交互必须走
  `pointerdown → pointerup`；jsdom `PointerEvent` 缺失 → 退化为 `Event`（不带 button/clientX）→ 测试需用 `MouseEvent`
  承载同名指针事件才有属性。
- **几何/坐标类断言必须等稳态**：冷启动索引异步填充期采快照会假失败；先「连续两次快照一致」再采样。
- 命令：`node_modules/vitest/vitest.mjs run [pattern]`；tsc `node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`。

## git
远端 `https://gitee.com/James-fake/markcraft.git`（公开，master 跟踪 origin/master）。沙箱推/拉需令牌：
`git -c credential.helper= push/pull/fetch <带令牌URL>`。⚠️ 沙箱怪癖：`git fetch` 不落盘 → 兜底
`printf '<hash>\n' > .git/refs/remotes/origin/master`。`.workbuddy` 仅 `memory/` 与 `artifacts/` 入库。
⚠️ **PortableGit 真实路径**（不在 `C:/Program Files/PortableGit`）：
`/c/Users/HJN/.workbuddy/binaries/PortableGit/versions/1.2.0/{cmd,usr/bin,mingw64/bin}`。
bash 每条命令内联 `export PATH="<PortableGit版本目录>/{cmd,usr/bin,mingw64/bin}:/c/Users/HJN/.workbuddy/binaries/node/versions/22.22.2-3:/c/Windows/System32"`。

### 🚨 git 操作铁律（2026-09-14 事故后新增）
- **绝对禁止在单条 bash 里跑 `git stash`**（含 `stash` + `stash pop` 组合）。SIGTERM 会让对象库处于半写状态，
  沙箱下损坏面极大（本次丢了几乎全部 `.pack`，832 缺失 blob）。要暂存改动 → `git diff > x.patch` 或复制文件。
- **robocopy 在 Git Bash 下必须 `MSYS_NO_PATHCONV=1` + 反斜杠 Windows 目标路径**，否则 exit 16（fatal）。
  exit 0–7 都算成功（1=有复制 2=有删除 3=1+2）。
- **对象库诊断顺序**：`ls .git/refs/` → `git cat-file -t <commit>` → `ls .git/objects/pack/`（**有没有 .idx 却无 .pack**）
  → 逐层 `ls-tree <commit>:<path>` 定位缺失树。
- **远端 master 可能远落后本地**（本次落后 40+ 提交，只有 3 个初始提交）——不能假定远端有近期工作。
  重建法：备份损坏 `.git` → robocopy 清空 → `git init` → `core.autocrlf=false` → `add -A` → commit（以工作树为准）。
  提交对象常可读 → 先跑父链回溯落盘历史备查（本次抢救 43 条 → `.workbuddy/artifacts/git-history-salvage.txt`）。

## 视觉/审计方法论（2026-09 起）
- 布局类故障判定靠**几何**不靠印象：CDP 读 `getBoundingClientRect` + `elementFromPoint`（命中测试前先清残留弹层）。
- CSS 双 token 源冲突：让 tokens.css 接管基础变量、退役冲突文件。**注意第二形态：dev server 模块缓存**——
  磁盘已清空但 Vite 仍返回旧 CSS，必须**重启 dev server** 才能验证。
- CDP 验证铁律：断言 token 直读 `getComputedStyle(documentElement).getPropertyValue('--mc-*')`，不能只看动画名。
- 用户直觉≠根因：先直陈代码根因，不附和直觉描述。
- **CDP 注入式比真建链省事**：要把新组件的视觉跑出来验证时，直接 inline HTML 用相同类名注入页面，CSS 已被真实项目加载，
  渲染结果与真实组件**完全一致**（类名一致即命中所有规则）。原本要做的「建 KB + 归集 + 进详情」真实流程常因依赖链
  副作用卡死，注入式 1 分钟出图。容器固定 `position:fixed; inset:24px; z-index:99999` 避免被 app DOM 遮挡。

## 动效语言（2026-09-11 定稿 · 2026-09-14 审计复核）
- 快慢分层：⚡即时层 100–160ms（hover/按压）／🚶标准层 150–250ms（tooltip/下拉/右键菜单）／🛋从容层 320–500ms（modal/抽屉/视图内容淡入/toast/侧栏折叠）。
- token 单源 = `tokens.css §11`：`--mc-dur-micro/fast/base/slow`、`--mc-ease-out`（0.23,1,0.32,1）、
  `--mc-ease-mac`（iOS 抽屉曲线）、`--mc-ease-in`（modal 退场 180ms）。
- 铁律：只动 transform/opacity；永不用 scale(0)（起手 0.96/0.97）；进出不对称「出更快」；**外壳（MenuBar/Sidebar/StatusBar）
  永不参与视图切换动画**（PageFrame 在各面板内渲染，包整屏必致「整体闪一下」）；reduced-motion 是「更少更柔非归零」——
  从容层时长减半 + 位移型入场降级 `mc-rm-fade`、**退场必须用 `mc-rm-fade-out`**。
- 关键帧单源 = `components.css`（aurora-menu-in/dropdown-in(-up)/modal-in/out/fade-in/out、aurora-dock-float-in）；
  Aurora 全量 CSS 经 `aurora-main.tsx` 静态加载，故无需各面板自带。dock 浮层用**独立 `translate` 属性**承载动画位移。
- **2026-09-14 审计结论（对标 Apple）：核心机制符合且部分超出**——0 处 scale(0)、UI 入场误用 ease-in 零处、
  reduced-motion 三层信号 + 出入场 fade 分设（超规格）；token 值 = AUDIT.md 推荐值逐字吻合。
  四项工程收尾**已全部落地**（见下）。
  **有意保留**：侧栏/右栏 `width` 过渡、`grid-template-rows` 0fr↔1fr 折叠、视图切换 420ms 纯 opacity。
- **动效四项收尾进度**（计划 `.workbuddy/artifacts/MOTION-PLAN-0*.md` + README 索引）：
  - ① 指针门控 ✅ `08685cc`：`tokens.css` `@media (hover: none), (pointer: coarse)` 块，只归零「纯位移/缩放型」hover
    （真实在用类名）；**复合 transform 必须豁免**（`.aurora-switch--on .aurora-switch__thumb` 的 `translateX(16px)`
    是打开态定位、katex `translateX(-50%)` 是居中定位，归零即破）；**死 CSS 不收录**。
    测试 `pointerGating.test.ts` 20 例 + CDP 12 项。
  - ④ 按压反馈 ✅ `36e67ec`：`components.css` 五变体 + `blog.css` 一变体补 `transform: scale(0.97)`；
    基类已含 `transform` 过渡（`--mc-ease-spring`）无需补；`.aurora-btn:disabled` 已有 `pointer-events:none` 天然屏蔽。
    测试 `pressFeedback.test.ts` 14 例 + CDP 19/19。
  - ② 布局属性合成器化 ✅（本批，改动 B 取消）：博客浮层 `left`→`translateX`（`blog.css` + `BlogPanel.tsx:1220`）。
    **改动 B 取消**：目标 `.aurora-dash-bar__fill` 是死 CSS（47 个 `aurora-dash-*` 类名 TSX 零引用），
    `features/dashboard/DashboardPanel.tsx` 也是死组件；真在用的 `GraphPanel` 经 CDP 实测无退化（拖拽期 avg 优于基线）。
    测试 `blogDockTransform.test.ts` 13 例 + CDP 19/19（右贴边 gap=0.00px 几何等价）。
  - ③ 命令面板去 200ms 入场 ✅ `5568ed0`（2026-09-14）：`command-palette.css` 删两处 `animation` +
    两个 `@keyframes`（overlay 180ms 淡入 / panel 200ms translateY(-12px) scale(0.98) 淡入），
    替换为决策注释；reduced-motion 块防御性保留。依据 AUDIT §1「100+/天 → No animation. Ever.」（对标 Raycast）。
    测试 `commandPaletteNoAnim.test.ts` 11 例 + CDP `cdp-verify-command-noanim.mjs` 11/11
    （`animationName=none`、`getAnimations()` 空、0ms vs 250ms 快照逐字段一致、Esc 重开仍零动画）。
- **「改 CSS 不改 JS」陷阱**：位移由 JS 内联样式驱动时（如 `style={{left}}`），只改 CSS 过渡属性会让位移
  **彻底失效**。契约测试须**两侧同断言**；验证须断言 `getBoundingClientRect()` 落点（几何等价性），
  而非只看 `transform` 是否生效。
- **接管计划前先验证「目标有真实承载者」**（PLAN-01/02 各踩一次）：CSS 类名→TSX 引用数、组件→import 点。
  **零引用 = 死代码，改它=制造维护假象**。判定脚本模式 = 遍历 `src` 下 ts/tsx，`\b<类名>\b` 词边界计数。
  ✅ 已处理：`canvas.css` 两区块 `aurora-dash-*` 死 CSS **已删 367 行**（`9bf8ec0`，2190→1823）；
  ✅ 已处理：`features/dashboard/DashboardPanel.tsx`（723 行）+ `BookmarkContent.tsx`（270 行）死组件
  **已删**（`004d488`，barrel 修剪 + 过时注释/README 同步）。**注意 `useDashboardData` 是活的**
  （`GraphPanel.tsx:12` 经 barrel 消费做链接健康），**勿一并删**。
  ✅ 已处理：`GraphPanel` 每帧 `bump()`（行 735-744）**经量化证明无需优化**——该 rAF 循环有终止条件
  （`alpha<=0.01` 且非拖拽即停），`tick` 仅被 `byId` 消费；A/B 重复采样（`probe-graph-ab.mjs`，5 轮×2 组）
  拖拽期 Δavg=−0.15ms / Δp95=+0.20ms、**零掉帧** → 8 节点规模无劣化。涨到数百节点须重测。
- **性能结论必须靠「多轮 A/B 重复采样」，单次采样会骗人**：GraphPanel 单跑显示拖拽 `p95=37.6/max=62.8`
  看似退化，实为**启动期抖动**；且该次图谱是**空库**（`svgReady` 抢跑，`nodes:0`，测的是空 DOM）。
  正确姿势：① 轮询真实节点数 >0 再采样；② 静置/拖拽各跑 ≥5 轮取**中位数**对照。
  **先量化再动手**——照假设直接改 `bump()` 就是优化不存在的问题。
- **⚠️ 工作区可能被外部清空（2026-09-14 实例）**：曾出现 `src/features/` 下 **473 文件**从磁盘消失、
  仅剩 5 个（`git status` 报 473 条工作区删除，索引完好）。**非 git 操作所致**，疑外部进程/沙箱回收。
  恢复 = `git restore --source=HEAD --worktree -- <路径>`（前提：文件已提交）。
  **血泪教训**：① 判定真实删除状态**必须用 `git -c core.quotepath=false status --porcelain`**，
  不要用 shell 遍历 `[ -e "$f" ]`——**中文文件名会被 bash 转成 `\nnn` 八进制导致误判"缺失"**（曾误报 9 个假缺失）；
  ② 开工/收工前后可跑一次 `git status --porcelain` 体检；③ **频繁提交**是唯一可靠防线，未提交工作无法恢复。
- **CSS `动画/声明` 类断言的两条假失败陷阱**（PLAN-02/03 连续踩）：
  ① 断言「无某声明」必须先在**剥离注释**的文本上判（`css.replace(/\/\*[\s\S]*?\*\//g,'')`），
  否则注释里「原为 200ms」等说明文字自命中；
  ② 断言「全仓无残留消费者」须排除 `docs[\\/]design`、`.test.tsx?$`、测试自身文件，否则自命中。
- **`vh` 单位的 computed 值是像素**：`getComputedStyle().maxHeight` 对 `max-height:70vh` 返回
  `563.5px`（70%×视口高，视口 805px），**非字面 `'70vh'`**。CDP 断言须比 `innerHeight×0.7`（容差 ~1.5px）。
- **CDP 深链须在启动 URL 传入**：`#view=` 由 React state 驱动，挂载后设 `location.hash` 无效（停在欢迎页）。
- **PerformanceObserver longtask 在 headless 不生效**（不抛错但不回调）→ 性能判定必须基于**帧间隔**；
  读取前 `Array.isArray` 兜底，否则 `.slice()` 抛错会污染判定分支（本轮误报过）。

## 编辑器右栏「辅助」Tab（2026-09-13 换内容）
- 内容 = 「发布为博客」+「添加到知识库」，组件 `src/aurora/panels/editor/AuroraPublish.tsx`（`aurora-aidpanel__*`）。
- 知识库列表**只有一个家** = 该 Tab（listbox + option + aria-multiselectable，勾选式多选 + 新建并关联），
  数据全走 `useKbStore`。⌘K / 标签右键「加入知识库」的召唤 = **「钉住右栏 + 切辅助 Tab + 展开列表」三连**（三者缺一不可见）。
- `setBlogEntryFileId`(BlogPanel) = **单篇发布语义**：清单只留该篇 + 来源条「单篇发布：<名>」+「查看全部笔记」退出；
  单篇下 `setAllDocs` 必须走 `scopedDocs`。

## 当前状态
- Phase 2 换芯 9/9 完成；Phase 4 退役三批完成。全仓 vitest **895 passed/3 failed/2 skipped /900**
  （3 项预存：commandWiring 45vs48、KbPanel「编辑」双匹配、blogCssRefs）。
  基线滚动：`075821f`=848 → 01 后 868 → 04 后 882 → 02 后 **895**。
- **动效四项收尾 3/4 完成**（详见「动效语言」节）：指针门控、按压反馈、布局属性合成器化（部分）已落地；
  仅余 ⌘K 命令面板去动画待拍板。CDP 验证脚本均在 `.workbuddy/artifacts/`：
  `cdp-verify-pointer-gating.mjs` / `cdp-verify-press-feedback.mjs` / `cdp-verify-blog-dock.mjs` /
  `probe-dash-css.mjs`（死 CSS 判定）/ `probe-graph-real.mjs`（图谱性能）。
- 编辑器右栏「辅助」Tab 已换内容（发布为博客单篇 + 添加到知识库选择列表）。配套修两个 bug：
  浮层壳 264px 截右栏 17px（右侧改 `width:fit-content`）+ 拖拽落盘用 `widthRef.current` 防闭包旧值。
  契约测试 `inspectorOverlayWidth.test.ts` 6 例锁死。
- 知识库详情「笔记 Tab」头部视觉升级（2026-09-14）：标题与计数拆开 / count 是独立徽章（`--mc-radius-sm` 非 pill）/
  head 顶部 4→12px / notes 左右 2→6px / 文件行 7px 4px → 8px 10px。契约测试 `notesTabHeader.test.ts` 8 例锁死。
- 博客工作室「主题市场」文案统一（2026-09-14）：数据源 THEME_STYLE_TAGS 补 fullwidth→通栏/illustration→插画、
  卡片 tag 走 tagLabel 中文映射、名称行整词换行不拆字、描述 line-clamp:2、筛选行首加「分类/风格」微标签。
  契约测试 `themeMarketTypography.test.ts` 12 例；B3 用例加 20s 超时消全量 flake。
- 主题市场筛选改滚轮鼓（2026-09-14 晚，提交 4e19ec5）：分类/风格两组 chip 行换 AuroraSelect（设置页同款滚轮鼓），
  风格由多选收敛为单选（`tag:''`=全部，选项表 THEME_STYLE_FILTER_OPTIONS），契约测试 +6 例（共 18）。
  全量基线 843 passed/3 failed/2 skipped。CDP 坑新增：Edge 须与验证脚本同一次 bash 前台启动（后台 bash 收编子进程）；
  robocopy /MIR 须 `MSYS_NO_PATHCONV=1`（`//MIR` 无效且重定向吞错=假成功）。
- 筛选行拉满行宽 + 搜索框滚动显隐（2026-09-14，63cb7f8 → 6e72c04 → 9a5d9b9 → 59b9edd → ccb1245 → 075821f 六轮定稿）：
  滚轮触发器 flex:1 与卡片右缘 0px 对齐。搜索框显隐**终版 = hasLeftTop 回顶显示**：刚进入/重开面板一律收起
  且锚定归顶（即使 st=0 也不显示，「显示」必须由用户主动滚离后回顶触发）；下滑 >12px 置位 hasLeftTop，
  未显示态需 st≤2 且 hasLeftTop 才现身，已显示态 st≤12 维持（滞回防顶端抖动），中途上滑不出现，可循环。
  panelOpen 翻 true 锚定双跑（立即 + 500ms 重跑）清飞入动画期伪滚动污染（取代 500ms 宽限期方案）；
  常驻 DOM + is-hidden 平滑折叠（max-height/opacity/margin/border-width 全收零）、搜索框在滚动容器**外**
  兄弟节点、输入查询滚离仍可见。方向状态机/sticky 吸顶/条件渲染/宽限期全部退役。
  ⚠️ 条件渲染挂载/卸载 → 高度跳变 → 钳制伪滚动 → 自激振荡闪烁，滚动显隐必须常驻 DOM+类折叠。
  ⚠️ CDP 断言时序必须与真机等价：click 后零延迟注入滚动会插队 React passive effect → 假失败。
  契约测试共 27 例；全量 848/3/2。⚠️ 用户语境「列表往上滑动」= scrollTop 减小（回滚）。
- macOS 从容丝滑动效方案六批次 + 第二轮收口批全部落地，CDP 30/30。视图切换 = 仅内容区 opacity 420ms 淡入。
- **需求 N：顶栏功能切换 Tab 支持左右滑动（四面板全量）**（2026-09-14/15 定稿，HEAD `1fe58b8`）：
  共享手势层 = `src/aurora/hooks/swipeTabsCore.ts`（纯逻辑）+ `useSwipeTabs.ts`（React 壳），
  契约测试 `useSwipeTabs.test.ts` **56 例**。四面板：设置（7 tab 内容区）/ 知识库详情（7 tab 内容区）/
  博客浮层（**组内子面板**，不跨组 + `enabled:panelOpen` + 避开 iframe/表头）/ 白板左栏（6 tab **tab 行**，
  避开 Excalidraw 绘图区）。CDP 全通过：设置 7/7 · 知识库 6/6 · 白板 6/6 · 博客 8/8。
  - 手势参数：SLOP 8px / 主副轴比 1.2 / 吸附 32% / 甩掷 0.3px·ms⁻¹ + 最小 20px / 边界阻尼 0.28 /
    **末段速度采样窗 80ms**（`computeEndVelocity`）/ wheel 阈值 60 冷却 400 静默 120。
  - **视觉钳制 `VISUAL_CLAMP=18px`**（远小于 40px 内容内边距，首字永不贴边）+ `::before/::after` 边缘渐变遮罩
    + 顶栏指示器按 `--swipe-progress` 联动。1:1 跟手会推飞内容、72px 会裁字，**18px 是三轮迭代结论**。
  - **甩掷禁用全程均速**（200px/500ms=0.4 会误判）→ 必须末段瞬时速度，已补回归护栏测试。
  - **CDP 探针坐标必须落 tab 中心，不能取 tab 行中心**（6 等分行中心恰在 #2/#3 交界 → mouseup 的
    `click` 会误切 tab = 假失败）。
  - `--swipe-progress` 挂**面板根**（挂 nav-tabs 兄弟层继承不到）；BlogPanel swipe 块必须在 `rootRef` 之后（TDZ）。
- ⚠️ **2026-09-14 仓库重建**：git stash 半途 SIGTERM → 对象库大面积损坏（832 缺失 blob + 多缺失 tree）。
  工作树完好故以工作树为准重建（HEAD `1fe58b8`，956 文件，`git fsck` 零错误）。旧 .git 备份
  `D:/_mc_git_damaged_backup/dot-git`；旧提交历史 `.workbuddy/artifacts/git-history-salvage.txt`（43 条）。
  **远端 master 仅 3 个初始提交，远落后本地**（近期工作从未推送）。铁律见「git」节。
- 待用户决策：`--mc-dur-lazy` 删除或消费；3 项预存测试失败是否排查；defaultDocsZh 帮助文档旧名跟随；
  **是否将重建快照推送远端**（本地领先远端 40+ 提交，推送需令牌）。
- 设计审计 v2（2026-09-09）12 项优化路线（P0×2/P1×2/P2×3/P3×5）；两决策已拍板：完整 HIG 三菜单 + 自定义退出弹窗。
- 战略：网页 UI → 桌面端软件范式（窗口 chrome/命令面板/右键菜单/密度/键盘优先）。