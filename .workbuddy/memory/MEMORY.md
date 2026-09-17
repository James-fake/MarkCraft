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
- **但「零 import」≠「不进包」**：桶（`components/ui/index.ts`）里的 `export { Input }` 会让
  `Input.tsx`（及其 `import './ui.css'`）被任何 `from '.../components/ui'` **连带挂进模块图**
  （dev 不做 tree-shaking）→ 真机 `style[data-vite-dev-id]` 实测 ui.css 照样下发。
  **判死代码看依赖图可达性，不看 import 计数。**
- **判死必须先排除「模板拼接」**：`` `aurora-btn--${size}` `` / `` `aurora-modal--${size}` `` /
  `` `aurora-toast--${t.kind}` `` → 字面量 `aurora-btn--sm` 从不出现，纯字面量扫描会**误判活类为死**。
  扫描器分三档（A 高危 / B 疑似动态 / C 仅测试引用），`scan.mjs`；前缀抽取**只取最后一个空白分隔词**
  （整段当前缀会含空格 → 永不命中 → 假阳性）。判死清单**逐族人工复核后才可删**。
  **批 2 补厚三层（缺任一层都会错，且错的方向不同）**：
  ③ 模板前缀**必须来自 `className` 上下文**（反引号前 120 字符含 `className|classList|clsx|cn(|class=`）——
    否则 `stores/kbTypes.ts:94` 的 ID 生成器 `` return `kb-${Date.now()}-${rand}` `` 会把**整个 `kb-*` 命名空间
    （66 类）伪装成「动态」**，掩盖 56 个真死类。批 1 没踩到纯属运气（`aurora-`/`mc-` 恰无裸前缀生成器）。
  ④ **库命名空间必须豁免**（一律在 node_modules 实锤，不靠猜）：hljs 作用域后缀（`core.js:122`
    `` scopeToCSSClass = (n,{prefix}) => n.replace('.','_') + '_'.repeat(i+1) `` → `language_`/`function_`/`class_`）／
    TipTap（`is-editor-empty` Placeholder、`selectedCell`/`column-resize-handle`/`tableWrapper`/`resize-cursor` Table）／
    Excalidraw（`layer-ui__wrapper`/`Tooltip__label`/`dropdown-menu`）／KaTeX（`minner`/`katex-display`）／tldraw（`.tl-*`）。
    ⚠️ **反向坑**：`katex-inline-wrapper`/`katex-display-wrapper` 是**活类**（`shared/utils/mathRenderer.ts` 生成），
    只长得像库类 → 豁免必须**精确匹配** `^katex$|^katex-(display|html|mathml|version|error)$`，**别写 `/^katex/`**。
  ⑤ **可达性**：文件不在入口 import 闭包内 → 那是**「孤儿文件」不是「死类」**，处置方式完全不同（整文件 vs 成员级）。
  ⑥ 超串陷阱有**第三形态**：**死类是活类的真前缀**（`.tiptap-math-inline` 死 vs `-katex` 活；
    `.lint-marker` 死 vs `lint-line-marker` 活；`.hover-bg` 死 vs `var(--hover-bg)` 是 **CSS 变量**不是类）。
- **「清剿清单」守卫测试的双锚点**：CSS 用 `\.name(?![a-zA-Z0-9])`（尾部拒字母数字、允许 `_`/`-` 即 BEM 后代）；
  代码用 `(?<![\w-])name(?![a-zA-Z0-9])`（**无前导点**，否则漏检 `className="mc-tooltip"`）。
  尾部写 `\b` 会漏 `name__arrow`（`_` 是词字符）；完全不约束尾部会误伤 `.aurora-tooltips`。
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
- **判「删没删」用集合差，不用 diff 行数**：大段删除会让 `git diff -U0` 把**未删除**的相邻行报成 `-`
  （实测 `@keyframes aurora-blog-shimmer/-spin` 被报「已删」实则仍在、且被活规则引用）。
  正解 `git show HEAD:<f>` 与工作区各抽类名 → `comm`。
- 🚨 **回写文件必须保真换行符**：本仓混用（`blog.css`/`components.css` 是 **CRLF**，`canvas/editor.css` 是 LF，无 `.gitattributes`、
  `core.autocrlf=false`）。脚本用 `split('\n')`+`join('\n')` 回写 CRLF 文件 → **整文件 diff**（`1/120` 变 `1157/1276`）。
  正解：探 `raw.includes('\r\n')` → 拆 `/\r?\n/` → 回写原 EOL。核对也**不能比 CR 计数**（删行后 CR 自然变少 → 假警报），
  要按「CR==LF ⇒ CRLF」判**风格**再逐文件比 HEAD。

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
- **新探针必须跑一次「HEAD 阳性对照」**：把目标源文件临时还原到 HEAD（**先 `cp` 备份**）再跑同一条探针，
  若目标检查项**全部正确报「仍在」**，才证明正式跑的「零命中」不是探针自身失效导致的**假绿**。
  还原后复核：内容 md5（`tr -d '\r'` 归一后）一致 + `git diff --numstat` 回到原值。（批 1 清剿实测 16/16 正确报「仍残留」。）
- 「零错误」要**逐视图归属**：全程累计会把「某视图报错」掩盖成看不出落点。做法：每次 navigate 前后取 `errors.length` 切片。
  ⚠️ 首次/冷 profile 与二次/热 profile 的错误集**不同**（首启引导、`unload` Permissions-Policy 等）；
  判「是否本次引入」靠 A/B，不靠直觉。
- ⚠️ **同 profile 二次启动会失败**（上一实例未退净 → 新实例挂到旧会话，`CDP not ready`）。
  解：`cp -r <profile> <新名>` 后用副本启动（保留 localStorage）。另：`&` 之后 shell **会丢 PATH**（`grep/sleep: command not found`）→
  后台启动后**重新 export PATH**，或把输出重定向到文件、另起一次调用读。

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
- vitest **1314 passed / 0 failed / 2 skipped**（112 文件全绿），tsc 干净。**已无预存失败**
  （09-17 清剿：三项全是「测试契约跟不上实现演进」，非产品 Bug —— `commandWiring` 窗口命令 `visible:false`
  属菜单专属；`KbPanel.smoke` 的 `getByText('编辑')` 撞上菜单栏同名顶级菜单 → 收敛到 `.aurora-kb-subbar-actions`；
  `blogCssRefs` 因 `KeyframeEditor` 换 `AuroraSelect` 滚轮→选项不再常驻 DOM，改为展开后再验）。
- 二级栏已三面板同源（kb / blog / ctop = 52px，真机几何取证通过），见上「关键坑」。
- tooltip 平行遗留**已清剿**（`.aurora-tooltip` + `.mc-tooltip` + `Tooltip.tsx` + `.mc-lazy-*`，
  净 −273 行；守卫 `styles/deadCssPurge.test.ts` 28 例；真机取证零回归）。唯一悬停提示机制 = 原生 `title=`。
- 死代码存量方案见 `artifacts/DESIGNBRIEF-DEADCSS-01.md §6`（量化工具 `.workbuddy/deadcss-impact.mjs`）。
  A 档 **183 类 / 1359 行** = 已扫 CSS(12499 行) 的 **10.9%**。
  **⚠️ 「5 处父活子死混合块」是错的（已推翻）**：源于 `includes` 子串假阳性（`aurora-kanban__card` 含 `aurora-kanban`）
  → 判死**一律走 token 边界** `/(?<![\w-])((?:aurora|mc)-[a-zA-Z0-9_-]+)/g`，重判后**混合块 = 0**。
- ✅ **批 1 死 CSS 已清剿**（净 **−868 行**；守卫 87 例全绿；全量 1314 passed；真机四视图零回归）。
  4 文件：`canvas.css` −653（白板 8 族）／`editor.css` −89（`aurora-token-*`+`aurora-goto-dialog*`）／
  `blog.css` −119（`blog-code/deploy/platform(s)/tree/select`）／`components.css` −7（共享 `<select>` 组内 blog 死成员）。
  **真实删除 = 96 个类名**（HEAD 764 → 668，集合差取证），**100% 落在批 1 族内、族外误删 0**。
  守卫同批交付：`deadCssPurge.test.ts` PURGED 增 15 族 + 1 真删关键帧（`@keyframes aurora-timeline-pulse`）；
  `pointerGating.test.ts` 的 `dead` 数组**拆 A/B 组** —— A 组（批 1 已整族删）升级为「全仓零定义」，
  B 组（`aurora-card--hoverable`／`kb-stat`／`kb-tpl-card` 仍存活于代码）保留弱断言 + 加「诚实绊线」（真删则报红提示迁 A 组）。
  ⚠️ 锚点三处特殊形态：`aurora-blog-platform**s?**`（复数同族）／`aurora-token-` 是**前缀族**（尾部不能挂边界，否则守卫假绿）／
  `.aurora-pen` 尾部拒字母数字（命中 `-path`、不误吃 `pending`）。
- ⚠️ **混合选择器组摘成员时，补 `{` 前必须先剥尾逗号**：否则产出 `.x, {`（非法）→ 浏览器**整条丢弃**，
  活类样式被**静默误杀**（实测 `blog.css` 的 `.aurora-blog-input, .aurora-blog-textarea, {` 让 textarea 基样式失效）。
  删除后必扫：`,\s*\{`／跨行 `,\n{`／独立 `,` 行／括号配平。**判据只能靠"合并规则带声明存活"**（单看类名会漏，
  因为兄弟规则 `::placeholder`/`:focus` 仍留着同一个类名）。
- **不删清单**：B 档 19 条（模板拼接/确认活）、C 档 10 条（仅测试引用）。
- ⚠️ **扫描盲区的真因是「前缀」不是「目录」**：批 1 扫描器类名正则硬要求 `aurora-`/`mc-` 前缀 →
  `src/styles/*`（`.tiptap-*`/`.code-block-*`/`.hover-*`）、`kb-ui.css`（`.kb-*`）、`canvas-v2`（`.cv-*`/`.tl-*`）、
  `versionHistory.css`（`.vh-*`）等**全被挡在正则之外**（12 文件 / 5310 行，且都**有真实 import**）。
  **每引入一个新前缀族，就会再出现一次同样的盲区。**
- ✅ **批 2 已扫完（2026-09-17，只扫不删）**：`artifacts/DESIGNBRIEF-DEADCSS-01.md §7`；
  工具 `.workbuddy/deadcss-batch2.mjs`；原始输出 `.workbuddy/deadcss/batch2-report.log`。
  **死类 124 / ≈860 行**（扫描器口径 126/877，扣 2 条 tldraw 隐藏规则）。成因 4 族占 109：
  `kb-*` 旧代 56（KB 迁 Aurora 后外壳+工具层被 `aurora-kb-*` 取代；现役内嵌组件层 `kb-searchpanel-*`/`kb-modal`/`kb-btn` 仍活）／
  `math-*` 旧代 25（`MathPopover.tsx` 换实现：新 `math-popover-tab-btn`/`-symbol-*`，旧 `math-popover-tabs/title/footer/insert-btn` 废）／
  `.cv-*` 孤儿 19／渲染状态类 10（`mermaid-rendered` 改用 `data-rendered` 属性、行号迁 CM6 内置 gutter `.cm-lineNumbers`、
  `lint-marker`→`lint-line-marker`）。`markdown.css`(466)/`versionHistory.css`(331)/`base.css`/`scrollbar.css`/`fonts.css` **干净**。
- 🚨 **2 个孤儿 CSS（不在入口 import 闭包内）**：`features/canvas-v2/components/canvas.css`（**295 行**，零 import，
  `.cv-*` 零 TS 消费者，`AutoLayoutPanel.tsx` 实际走**内联 style + `var(--cv-*)` 变量**）／
  `src/index.css`（11 行纯 `@import` 聚合器，全仓零引用）。**真实入口只有 `src/aurora/aurora-main.tsx`，项目无 `src/main.tsx`。**
  ⚠️ 连带：`canvasTheme.ts:110` 的 `html[data-density="comfortable"] .cv-pill-btn` 指向孤儿文件里的类 → **恒不生效**（半死状态）。
- ⚠️ **`src/styles/desktop-chrome.css` 是**有意的**第二层 `:root`**：`aurora-main.tsx` 顺序 `:5 tokens.css → :16 desktop-chrome.css`
  → **它后加载、覆盖同名 token**（文件注释明写「仅追加…同名 token 在此覆盖」）。当前 `--mc-accent` 两边同值 `#7C8CFF`
  故**无可见分歧**，但**改 tokens.css:46 不生效** —— 改 accent 必须同时改 `desktop-chrome.css:74`（+ 亮色 `:189`）。
  同文件**已死 token（0 引用）**：「方案 A 桌面转型」契约 `--mc-spine-w`/`--mc-dock-h`/`--mc-dock-radius`/`--mc-rightpanel-*`/`--mc-hover-surface`
  （Spine56/Dock44/RightPanel280 已被 Aurora 外壳取代）。4 个 `.material-*`：`-sidebar`（`FileTree.tsx:309`）/-popover 活，`-solid`/`-hud` 死。
- **单列的「疑似命名错位」（失效样式，非纯死）**：`tiptap.css:456/:470` 给 `.tiptap-math-inline` 定样式，而 DOM 只有
  `EditableNodeView` 的 `editable-node` + 内层 `tiptap-math-inline-katex`（`MathInlineNodeView.tsx:19`）→ 这两条**从未生效**。
  删了无视觉变化；但若是原意给行内公式容器加样式，那是**待修的 bug** → 本轮**不删**，等与作者确认意图。
- **批 2 未删任何东西**。建议切分：2.5-A 两个孤儿文件（≈306 行，最低风险）／2.5-B `mermaid.css` 35 类／
  2.5-C `kb-ui.css` 56 类（**27 处混合块** + **10 类仅测试引用**须先升级断言）／3 其余 11 类／
  3.5 `desktop-chrome.css` 死 token 族 + 覆盖陷阱（属 **token 单源治理**，独立成题）。
- ⚠️ 待升级的测试引用（删前必须处理，否则守卫自红）：`kbDensity.test.ts` 断言 `.kb-topbar/.kb-nav/.kb-nav-item/.kb-content/
  .kb-manage/.kb-row/.kb-btn/.kb-icon-btn`；`pointerGating.test.ts:132` 的 B 组 `kb-stat`/`kb-tpl-card`。
- **批 3 仍待处理（比白板废墟更值的一块）**：`aurora-editor` 23 条死类 = **旧自绘编辑器整套 DOM**
  （`__line*/__source/__wysiwyg/__preview*/__split*/__cursor/__keymap/--zen`；现为 CodeMirror6+TipTap）
  —— 而 `editor.css` 仍是全仓最大样式文件。**需先建 L3 真机 class 挂载采集器**（列活族死分支）。
- ✅ **侧栏「小标题栏」结论 = 不统一**（只给结论、未改）。`.aurora-filetree__topbar` / `.aurora-outline__header` 是
  **面板级**内部标题行（36px + `0 8px 0 12px`，两者**已自洽**），与**视图级**二级栏 52px（`--mc-subbar-h`）**不同层级**；
  提到 52 会白丢侧栏 16px 纵向空间，且侧栏自有密度尺度（`--mc-sidebar-item-h` 32/40）。
  P2 可选（本轮不做）：`height:36px` 的面板标题行在 editor(2)/graph(2)/settings(1) 重复 ~5 处 → 可抽 `--mc-panel-head-h`（属**收敛**非统一）。
- 其他待决：**批 2 已完成（只扫不删，见上）**；下一步 **2.5-A/B/C**（见上切分）或**批 3**（活族死分支，**需先建 L3 真机 class 挂载采集器**）；
  `components/ui` 的 `Input.tsx` / `EmptyState.tsx` 零消费者（但样式经桶间接下发）；`--mc-dur-lazy` 处置；>30 天旧日志蒸馏。
- ✅ 已推送至 `origin/master`：`187be15` / `1e08d65` / `988c406` / `30fc95f` / `3b3e9b2`（tooltip/lazy 清剿）/ `fb219cc`（方案文档）
  / 本轮（批 1 死 CSS 清剿 + 守卫同批 + 方案文档 §6.9 执行记录）。
  Gitee 令牌不入库、不落盘（用户曾贴出令牌，已建议其轮换）。
