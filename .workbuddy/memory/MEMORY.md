# MarkCraft · Aurora 记忆（铁律only；案例见 `memory/YYYY-MM-DD.md`，专题见 `artifacts/DESIGNBRIEF-*.md`）

## 定位
Vite5+React18+TS；CodeMirror6+TipTap3；白板 Excalidraw；Dexie/IndexedDB。dev 端口 **5174**：
`node node_modules/vite/bin/vite.js --port 5174 --host`。入口 `src/aurora/aurora-main.tsx`（真实 `#view=` 路由）。
**Aurora = 真实运行界面**。战略：网页 UI → **桌面端软件范式**（窗口 chrome／命令菜单／密度／键盘优先）。

## Aurora 铁律（`src/aurora/`）
① Aurora 即真实界面；② 禁增功能（边界 = 真实已有能力）；③ 视觉只用 `styles/tokens.css` 的 `--mc-*`；
④ UI 落 `src/aurora/`，`src/features/*` 是逻辑层（D4 单一数据源），`src/components/ui` 可直接 import；
⑤ 依赖只向下，**0 反向依赖**。

## 关键坑（防回归）
- **Path depth**：panels→features/stores 用 `../../../`；components/ui·app 用 `../../`。
- 新类**必须同批交付 CSS**；同文件多处 Edit**必须串行**，改完 grep 核验。
  ⚠️ 并行 Edit 同一文件 = **后写覆盖先写、静默丢改动**，症状是 `tsc` 报自相矛盾组合（「声明未使用」+「找不到该名称」）。
  **跨文件可并行，同文件绝不可**。改完必须逐文件 grep 核验关键行，不能只信 Edit 返回 success。
- 单源：z-index = `tokens.css §14`；Modal = `@components/ui/Modal`；Button/Confirm/Switch = `@components/ui/*`。
- **布局属性越权**：迁 features 组件入 Aurora 时 position/inset/z-index 同样越权生效 → 复位须三类同设 + `contain:paint`。
- **拖拽闭包陷阱**：监听闭包在拖拽开始时注册 → 落盘必须读 `xxxRef.current`（读 state = 旧值）。
- **指针捕获吞 click**：子元素交互挂 **pointerup**（`NODE_CLICK_SLOP=4px` 区分拖拽）。
- **视图上下文单源** = `useAuroraShell.nav` 的 param→params 映射表（canvas→canvasId / kb→kbId / blog→kbId）；
  漏登记 = 参数静默丢失。侧栏「设置」在**默认收起的「更多」分组**里。
- **React 17+ `onWheel` 是 passive** → `preventDefault()` 无效；拦横滚只能靠 CSS `touch-action`/`overscroll-behavior-x`。
- **「改 CSS 不改 JS」双向陷阱** → 契约测试**两侧同断言**且断言 `getBoundingClientRect()` **落点**。
- **改任何东西前先验证「有真实承载者」**：类名 → TSX 引用数、组件 → import 点；零引用 = 死代码。
- **滚动显隐用「常驻 DOM + 类折叠」**（条件渲染 → 高度跳变 → 伪滚动 → 自激振荡闪烁）；「列表往上滑」= `scrollTop` **减小**。
- **内联 `transition` 残留**：瞬时落位后必须 `void el.offsetWidth; el.style.transition=''`。
- 动效只动 **transform/opacity**；永不用 `scale(0)`（起手 0.96/0.97）；进出不对称「出更快」。
- **`AuroraSelect` 触发器（button）与展开后的浮层（dialog）共用同一个 `aria-label`** → 退场窗口内两者同时在 DOM，
  `getByLabelText` 会报多元素；取触发器一律 `getByRole('button', { name })`。
- **自定义滚轮/浮层把「原生元素常驻 DOM」的假设打破**：原生 `<select>` 的 `<option>` 恒在 DOM，
  `AuroraSelect` 只在展开时挂载选项 → 断言选项文案必须先展开（并把「底层 value 是否仍是裸关键字」一并断言）。
- **外壳会污染面板测试的全局查询**：`RealProviders` 一并渲染菜单栏 → 面板内同名文案（「编辑」「删除」）
  必须限定作用域（`within(.aurora-kb-subbar-actions)`），否则 `getByText` 多元素假红。
- **`COMMAND_CATALOG` 全量 ≠ 命令面板条数**：`visible:()=>false` 的命令（窗口菜单：最小化/缩放/全部移至最前）
  是**菜单专属**，仅由 MenuBar 的 `MENUS` 渲染。断言「一条不丢」按**可见子集**逐 id 对齐，别用裸计数。
- **二级栏高度 = `--mc-subbar-h`（tokens.css §12，52px）+ 内缩 `--mc-subbar-pad-x`（14px）**，
  三面板同源：`.aurora-kb-subbar` / `.aurora-blog__subbar` / `.aurora-ctop`。**不参与密度切换**
  （密度差异由栏内控件的 `--mc-inspector-tab-h` 承担）。⚠️ **栏高会被复制进派生偏移**
  （`blog__panelzone.top`、`subbar-right.right`）→ 改栏高必须同改，且一律用 `var()`，禁止魔法数。
- ⚠️ **`densityStore` 默认广播 `compact`**（非 comfortable）→ 排查「实际渲染值」时先确认密度档：
  只读声明值会把 42 当成 46。**新写的守卫/契约断言必须先做「负向验证」**（注入回归看是否真报红）再用。

## 测试铁律
- 严禁同时 `vi.mock` TagIndexStore 与 LinkIndexStore（循环依赖静默崩溃）→ 用真实 Provider 包裹。
- **jsdom 不实现指针捕获重定向** → 一律 `pointerdown → pointerup`；jsdom 无 `PointerEvent` → 用 `MouseEvent` 承载。
- **几何断言等稳态**；jsdom `getBoundingClientRect` 全 0 → 必须打桩（`stubGeometry`）。
- **CSS「无某声明」断言先剥注释**；「全仓无残留消费者」须排除 `docs[\\/]design`、`.test.tsx?$`。
- 静态断言锚点用**带引号的完整字面量**（裸类名 `indexOf` 会先命中注释）。
- **末段速度采样被 jsdom dt≈0 放大** → 「期望不切换」用例须**真实慢速**（每步 sleep 300ms）+ 位移 < 20px。
- 读文件断言用 `readFileSync(resolve(__dirname, ...))`。
- **jsdom 缺的 API 统一补 `src/setupTests.ts`**（`ResizeObserver`/`Path2D`/`scrollIntoView`/`elementFromPoint`/`matchMedia`）；
  缺 `matchMedia` 会让 `CssPanel` 挂载即崩 —— 症状是**某用例"切到末格"时才炸**（切「高级」组才渲染 CssPanel）。
- ⚠️ tsconfig **不含** `*.test.*` → tsc 干净 ≠ 测试文件无类型错，测试必须实跑。
- 命令：`node node_modules/vitest/vitest.mjs run [pattern]`；`node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`。

## git / 沙箱
PortableGit `/c/Users/HJN/.workbuddy/binaries/PortableGit/versions/1.2.0/{cmd,usr/bin,mingw64/bin}`；
bash 每条内联 `export PATH="<三目录>:/c/Users/HJN/.workbuddy/binaries/node/versions/22.22.2-3:/c/Windows/System32"`。
- 远端 `gitee.com/James-fake/markcraft.git`；推送 `git -c credential.helper= push "https://<user>:<token>@gitee.com/James-fake/markcraft.git" master`。
- ⚠️ push 后 `origin/master` 不更新 → `printf '%s\n' "$(git rev-parse master)" > .git/refs/remotes/origin/master` 再验 `0 0`。
- 🚨 **禁止在单条 bash 里跑 `git stash`**（SIGTERM 半写对象库 → 丢 `.pack`）。要暂存 → `git diff > x.patch`。
- 工作区可能被外部清空 → `git restore --source=HEAD --worktree -- <路径>`；判删除状态必须用
  `git -c core.quotepath=false status --porcelain`（shell `[ -e ]` 因中文名转八进制误判）。**频繁提交是唯一防线**。
- **删除劫持**：`rm`/`Remove-Item` 转回收站 → robocopy 镜像法（`/MIR`、相对路径、**别拼 `"$PROJ\\$d"`**），
  镜像后自检 `find <目标> -type f | wc -l` 为 0。`.workbuddy` 仅 `memory/`、`artifacts/` 入库。

## CDP 验证（细节在 skill `cdp-ui-interaction-verify`）
- **Edge 必须与脚本同一次「前台」bash 启动**；须新 profile。布局判定靠**几何**（CSS px）。
  ⚠️ **`rm -rf <profile> && mkdir && msedge ... &` 会静默不启动 Edge**（`rm` 转回收站 exit≠0 → `&&` 断裂）→
  脚本只报 `CDP not ready`。**解：别删 profile，换新目录名**。
- 三陷阱：① `.aurora-audience`（fixed 全屏）吞指针 → 先 dismiss；② **窗口激活吞最早几次鼠标事件**（唤醒点击 + 重试）；
  ③ 无焦时合成按键打不进（改走真实鼠标点侧栏）。就绪判据用 `.aurora-sidebar-item`；深链 `#view=` 只认**启动 URL**。
- 「做没做」必须量**视觉位移像素**；`data-swiping=true` 只证明"识别了"。
- 「看得见」别用 `elementFromPoint`（`pointer-events:none` 不参与命中测试 → **假阴性**）→ 断言 opacity/visibility/背景/面积。
- ⚠️ **拖动中的截图不可信**：窗口不前台时合成被节流，`captureScreenshot` 返回**上一帧** → 拖动只用量数值，截图只证**落位后**。
- **间距/留白断言必须测「文字实际绘制框」**：元素自带 `padding-top` 时其 `top` 不含该 padding →
  会「明明加了 padding 仍测得 gap=2px」的**假阴性**。正解 `Range.selectNodeContents(el)` + `getClientRects()`。
- **改前/改后取证** = 页内注入 override CSS 还原旧值（源文件零改动、状态一致可比），**别写回源码再改回**。
  用户截图坐标**不能直接当 CSS px**：先求截图↔真机偏移量。
- 手势/交互不能靠注入 HTML 验证（需真实 React 绑定）→ 真机拖动或契约测试。合成拖拽要**慢**（末段 <0.3px/ms）才走落点吸附。
- 探针留可复用开关（`ONLY=<面板名>`），别写死全量。

## 动效语言（09-11 定稿，四项全 ✅；细节 `components.css` / `tokens.css §11`）
分层 ⚡100–160／🚶150–250／🛋320–500ms。**外壳（MenuBar/Sidebar/StatusBar）永不参与视图切换动画**。
reduced-motion = 「更少更柔非归零」（时长减半；入场 `mc-rm-fade`、**退场必须 `mc-rm-fade-out`**）。
指针门控只归零**纯位移/缩放型** hover，**复合 transform 必须豁免**。

## 浮层退场动效（09-17 P0+P1 全落地；细节 `artifacts/DESIGNBRIEF-MOTION-EXIT-01.md` §7）
铁律：**浮层关闭必须先播退场、再卸载**（此前 `{open && createPortal}` = 0ms 硬切，是对称性缺口）。
- 单源 = **`@components/ui/usePresence`**：`usePresence(open,exitMs)` / `usePresenceValue(value,exitMs)`
  （对象门控型用后者 —— 退场窗口内 `lastRef` **保留最后一份非空载荷**，否则 `setMenu(null)` 就丢了坐标）。
  ⚠️ **不放 `src/aurora/hooks/`**：`src/features/*` 禁止反向依赖 aurora UI（守卫 `local/no-aurora-ui-import`）；
  `src/components/ui/` 是共享中性层，features 与 aurora 都可向下引用。
- 时长常量 `POPOVER_EXIT_MS=100`（浮层）/ `OVERLAY_EXIT_MS=180`（面板浮层），**必须与 CSS 动画时长逐字对齐**。
- 退场关键帧**与入场逐字镜像**（`-in` 的 `from` ≡ `-out` 的 `to`）＝「沿原路退回」；曲线一律 `--mc-ease-in`；
  `[data-exiting='true']` 规则必带 `pointer-events:none`。消费者写 `data-exiting={exiting || undefined}`。
- ⚠️ **reduced-motion 会劫持退场**：§11 对浮层一律 `animation-name: mc-rm-fade !important`（那是**淡入**）→
  退场选择器**必须逐个登记进 `mc-rm-fade-out` 名单**，否则降级模式下退场 =「淡入再消失」闪跳。已登记 12 个 + 断言守。
- 覆盖 18 处：MenuBar（模块级 `MenuPop` 子组件，`MENUS.map` 内不能调 hook）／工具栏下拉 ×4／右键菜单 ×5／
  滚轮 ×3／面板浮层 ×3／Dock ×4／图谱 ×2。锁死 `styles/motionExit.test.ts`(53) + `ui/usePresence.test.ts`(10)。
- **有意不动**（按频率门控拒绝，勿回退）：命令面板（键盘 100+/天）／FileTree·Outline 展开收起（VS Code 惯例，瞬时才对）／
  Tooltip hover-out／视图切换 `aurora-content-in`（09-11 定稿）／Toast·Modal（已对称）。
- 真机判据：**只读 DOM/CSSOM 数值序列**（动画中截图受合成节流会返回旧帧）—— 存在 ≥3 帧
  「元素仍在 DOM ∧ `data-exiting=true` ∧ 0<opacity<1」才算「退场真在播」。探针 `probe-motion-exit.mjs`（`ONLY=menu|overlay|editorleft`）。
- ⚠️ 编辑器视图**默认空态**，未开文档时 `.aurora-editor__hoverzone--left` 不渲染 → 验 P1-5 首选**图谱视图**
  （`.aurora-graph__hoverzone` 无前置依赖/无锁定态）。

## 需求 N：tab 栏滑动切 Tab（七轮定稿 ✅）
= **Apple 分段控件**：常驻滑块压选中项；按住 tab 横拖 → **只有滑块跟手，文字/内容区零位移**；栏不滚；
**位移方向 = 目标方向**；**连续滑动**（轨道内 1:1 跨多格，落点最近中心位即目标）。
- 单源 `hooks/{tabStripSwipe,swipeTabsCore,useTabStripThumb}`；**六条栏**：设置 `settings__nav-tabs`／知识库
  `kb-subbar-tabs`／博客组内 `blog__subseg`／博客分组 `blog__tabs`／白板侧栏 `csp__tabs`／白板顶部 `ctop__switcher`
  （用户按「位置」点名，同面板有两条勿混层级；白板侧栏=下划线，其余=圆角块；博客两条 `enabled:true` 常驻）。
- 铁律：滑块位置 = 基准 + 手势位移**合成同一个 transform**（拆两段→松手裂缝）；hook 必传 `dampenOffset`(恒等)
  + `snapDecider`（否则双重阻尼→跨格拖不动）；**位移保号与目标取反不能并存**（`swipeTabsCore` 三处 `nextSign`）。
- ⚠️ 白板顶栏**空白板引导锁定态** `locked = isCanvasEmpty && !guideSkipped` → 手势按设计停用
  （真机前先点「跳过，直接开始」，否则像"手势坏了"）。⚠️ 博客分组拖回原格**不误开浮层**（hook 判 `targetIndex !== index`）。
- 细节 `artifacts/DESIGNBRIEF-SWIPE-TABS-01.md` §12–§15；R1–R3 旧法（内容区滑动／整排轨道位移／`visualMapper`／
  边缘压暗／`--swipe-progress`）**已废弃，勿回退**。

## 知识库详细界面（`panels/kb`）
- 顶部两层 = TitleBar 面包屑 + `.aurora-kb-subbar`（返回 + 库名 + 健康度徽章 + 7 功能 Tab 滑块 + 编辑/发布/删除）。
  2026-09-15：栏高 46 → **52px**、`padding 0 14px`、组内 gap 10（用户报「左上角文字贴顶」）。
- ⚠️ **`.aurora-kb-notes` 顶内边距仅 2px 是「半成品节奏」**：给**自带 `__head` 的笔记 Tab**设计
  （容器 2 + head 12 = 14px 才完整）。**复用它却没有 head** 的 Tab 必让首行文字**贴住 subbar 下沿** →
  此类 Tab 必须自带留白（已落地 `.aurora-kb-notes__lead`，`padding 12px 6px 0`）。
  **新增 Tab 复用 `.aurora-kb-notes` 时，先问"我的 head 在哪"**。
- 7 Tab 首行文字留白基线（Range 实测）：概览 28／笔记 20／搜索 24／问答 16／依赖 16／MOC 18／导出 61px。
- 双向锁死 `panels/kb/kbTopSpacing.test.ts`(8) + `notesTabHeader.test.ts`(8)。
- ⚠️ 知识库空库不渲染 tab 栏、建库后**不自动进详情**要再点卡片；提交按钮选择器须限定 `.aurora-kb-modal` 内。
- 右栏「辅助」Tab = 发布为博客 + 添加到知识库；⌘K/标签右键 = **钉住右栏 + 切辅助 Tab + 展开列表**；
  `setBlogEntryFileId` = 单篇语义；右侧宽度 `fit-content`。

## 当前状态
- vitest **1247 passed / 0 failed / 2 skipped**（111 文件全绿），tsc 干净。**已无预存失败**
  （09-17 清剿：三项全是「测试契约跟不上实现演进」，非产品 Bug —— `commandWiring` 窗口命令 `visible:false`
  属菜单专属；`KbPanel.smoke` 的 `getByText('编辑')` 撞上菜单栏同名顶级菜单 → 收敛到 `.aurora-kb-subbar-actions`；
  `blogCssRefs` 因 `KeyframeEditor` 换 `AuroraSelect` 滚轮→选项不再常驻 DOM，改为展开后再验）。
- 二级栏已三面板同源（kb / blog / ctop = 52px，真机几何取证通过），见上「关键坑」。
- 待决：`--mc-dur-lazy` 处置；`.aurora-tooltip` 死 CSS（`components.css` 零消费者）处置；
  `.aurora-filetree__topbar`(36) / `.aurora-outline__header`(36) 这类「侧栏小标题栏」是否也要统一高度；>30 天旧日志蒸馏。
- ✅ 已推送至 `origin/master` 的历史：`187be15` / `1e08d65` / `988c406`。
  二级栏同源化（本项）**已提交待推送**；Gitee 令牌不入库、不落盘（用户曾贴出令牌，已建议其轮换）。
