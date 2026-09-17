# MarkCraft · Aurora 记忆
铁律 only。案例见 `memory/YYYY-MM-DD.md`，专题细节见 `artifacts/DESIGNBRIEF-*.md`。

## 定位
Vite5+React18+TS；CodeMirror6+TipTap3；白板 Excalidraw（**tldraw 已退役、无依赖**）；Dexie/IndexedDB。
dev 端口 **5174**：`node node_modules/vite/bin/vite.js --port 5174 --host`。
**入口只有 `src/aurora/aurora-main.tsx`（项目无 `src/main.tsx`）**，真实 `#view=` 路由。
**Aurora = 真实运行界面**。战略：网页 UI → **桌面端软件范式**（窗口 chrome／命令菜单／密度／键盘优先）。

## Aurora 铁律（`src/aurora/`）
① Aurora 即真实界面；② 禁增功能（边界 = 真实已有能力）；③ 视觉只用 `styles/tokens.css` 的 `--mc-*`；
④ UI 落 `src/aurora/`，`src/features/*` 是逻辑层（D4 单一数据源），`src/components/ui` 可直接 import；⑤ 依赖只向下，**0 反向依赖**。

## 关键坑（防回归）
- **Path depth**：panels→features/stores 用 `../../../`；components/ui·app 用 `../../`。
- 新类**必须同批交付 CSS**；同文件多处 Edit**必须串行**。并行 Edit 同一文件 = **后写覆盖先写、静默丢改动**，
  症状是 `tsc` 报自相矛盾组合（「声明未使用」+「找不到该名称」）。**跨文件可并行，同文件绝不可**。
  改完**逐文件 grep 核验关键行**，不能只信 Edit 返回 success。
- 单源：z-index = `tokens.css §14`；Modal = `@components/ui/Modal`；Button/Confirm/Switch = `@components/ui/*`。
- ⚠️ **`styles/desktop-chrome.css` 是「有意的」第二层 `:root`**：加载序 `aurora-main.tsx:5 tokens.css → :16 desktop-chrome.css`
  ⇒ 后加载者赢（注释明写「同名 token 在此覆盖」）。当前 `--mc-accent` 两边同值无可见分歧，但**改 tokens.css 不生效**
  → 改 accent 必须同改 `desktop-chrome.css`（含亮色）。已死 token（0 引用）：`--mc-spine-w`/`--mc-dock-h`/`--mc-dock-radius`/`--mc-rightpanel-*`/`--mc-hover-surface`。
- **布局属性越权**：迁 features 组件入 Aurora 时 position/inset/z-index 同样越权生效 → 复位须三类同设 + `contain:paint`。
- **拖拽闭包陷阱**：监听闭包在拖拽开始时注册 → 落盘必须读 `xxxRef.current`（读 state = 旧值）。
- **指针捕获吞 click**：子元素交互挂 **pointerup**（`NODE_CLICK_SLOP=4px` 区分拖拽）。
- **视图上下文单源** = `useAuroraShell.nav` 的 param→params 映射表（canvas→canvasId / kb→kbId / blog→kbId）；漏登记 = 参数静默丢失。侧栏「设置」在**默认收起的「更多」分组**。
- **React 17+ `onWheel` 是 passive** → `preventDefault()` 无效；拦横滚只能靠 CSS `touch-action`/`overscroll-behavior-x`。
- **「改 CSS 不改 JS」双向陷阱** → 契约测试**两侧同断言**且断言 `getBoundingClientRect()` **落点**。
- **滚动显隐用「常驻 DOM + 类折叠」**（条件渲染 → 高度跳变 → 伪滚动 → 自激振荡闪烁）；「列表往上滑」= `scrollTop` **减小**。
- **内联 `transition` 残留**：瞬时落位后必须 `void el.offsetWidth; el.style.transition=''`。
- 动效只动 **transform/opacity**；永不用 `scale(0)`（起手 0.96/0.97）；进出不对称「出更快」。
- **`AuroraSelect` 触发器（button）与浮层（dialog）共用同一 `aria-label`** → 退场窗口内两者同时在 DOM，`getByLabelText` 报多元素；取触发器一律 `getByRole('button', { name })`。
- **`AuroraSelect` 只在展开时挂载选项**（打破原生 `<select>` 的 `<option>` 常驻假设）→ 断言选项文案必须先展开，并一并断言「底层 value 是否仍是裸关键字」。
- **外壳会污染面板测试的全局查询**：`RealProviders` 一并渲染菜单栏 → 面板内同名文案须限定作用域（`within(.aurora-kb-subbar-actions)`）。
- **`COMMAND_CATALOG` 全量 ≠ 命令面板条数**：`visible:()=>false` 的命令是**菜单专属**（仅 MenuBar 的 `MENUS` 渲染）→ 断言「一条不丢」按**可见子集**逐 id 对齐，别用裸计数。
- **二级栏高度 = `--mc-subbar-h`（tokens.css §12，52px）+ 内缩 `--mc-subbar-pad-x`（14px）**，三面板同源（`.aurora-kb-subbar`/`.aurora-blog__subbar`/`.aurora-ctop`）。
  **不参与密度切换**（密度差异由栏内控件的 `--mc-inspector-tab-h` 承担）。⚠️ 栏高**会被复制进派生偏移**（`blog__panelzone.top`、`subbar-right.right`）→ 改栏高必须同改，一律 `var()`，禁魔法数。
- ⚠️ **`densityStore` 默认广播 `compact`**（非 comfortable）→ 排查「实际渲染值」先确认密度档：只读声明值会把 42 当成 46。
  **新写的守卫/契约断言必须先做「负向验证」**（注入回归看是否真报红）再用。

## 死代码判定（判据比清单更重要）
- **判死先验「有真实承载者」**：类名 → TSX 引用数、组件 → import 点。零引用 = 死代码。
- **但「零 import」≠「不进包」**：桶（`components/ui/index.ts`）的 `export { Input }` 会让 `Input.tsx`（及其 `import './ui.css'`）被任何
  `from '.../components/ui'` **连带挂进模块图**（dev 不做 tree-shaking）→ 真机 `style[data-vite-dev-id]` 实测 ui.css 照样下发。**判死看依赖图可达性，不看 import 计数。**
- 🚨 **「零 import」删**文件**，「零消费者」删**成员** —— 不可互替**；且「零 import」必须用**可达性闭包**求：
  `src/index.css` 零引用但它聚合的 9 个文件全在入口里 → **冗余**（删了不改变任何加载）；`canvas-v2/components/canvas.css` 零引用**且**成员零消费者 → **孤儿**（废墟）。
  同是「零 import」，冗余只需删文件，孤儿还要**处置消费侧的悬空引用**。
- **模板拼接**必须排除（`` `aurora-btn--${size}` `` → 字面量 `aurora-btn--sm` 从不出现）。扫描器三档（A 高危/B 疑似动态/C 仅测试引用）；
  前缀抽取**只取最后一个空白分隔词**。**批 2 补厚三层（缺任一层都错，且错向不同）**：
  ③ 模板前缀**必须限定 `className` 上下文**（反引号前 120 字符含 `className|classList|clsx|cn(|class=`）—— 否则
    `stores/kbTypes.ts:94` 的 ID 生成器 `` `kb-${Date.now()}-${rand}` `` 会把整个 `kb-*`（66 类）伪装成「动态」，**掩盖 56 个真死类**。
  ④ **库命名空间必须豁免**（一律在 node_modules 实锤）：hljs 作用域后缀（`core.js:122` → `language_`/`function_`/`class_`）／TipTap（`is-editor-empty`/`selectedCell`/`column-resize-handle`/`tableWrapper`/`resize-cursor`）／
    Excalidraw（`layer-ui__wrapper`/`Tooltip__label`/`dropdown-menu`）／KaTeX（`minner`/`katex-display`）／tldraw（`.tl-*`）。
    ⚠️ **反向坑**：`katex-inline-wrapper`/`katex-display-wrapper` 是**活类**（`mathRenderer.ts` 生成）→ 豁免必须**精确匹配** `^katex$|^katex-(display|html|mathml|version|error)$`，**别写 `/^katex/`**。
  ⑤ **可达性**：文件不在入口闭包内 → 是**「孤儿文件」不是「死类」**，处置不同（整文件 vs 成员级）。
  ⑥ 超串有**第三形态**：**死类是活类的真前缀**（`.tiptap-math-inline` 死 vs `-katex` 活；`.lint-marker` 死 vs `lint-line-marker` 活；`.hover-bg` 死 vs `var(--hover-bg)` 是**变量**）。
- ⚠️ **扫描盲区的真因是「前缀」不是「目录」**：类名正则硬要求 `aurora-`/`mc-` → `.tiptap-*`/`.kb-*`/`.cv-*`/`.vh-*`/`.hover-*` 全被挡在正则外。
  **每引入一个新前缀族，就会再出现一次同样的盲区。**
- **清剿清单守卫的双锚点**：CSS 用 `\.name(?![a-zA-Z0-9])`（尾部拒字母数字、允许 `_`/`-`）；代码用 `(?<![\w-])name(?![a-zA-Z0-9])`（**无前导点**，否则漏检 `className="mc-tooltip"`）。
  尾部写 `\b` 会漏 `name__arrow`；完全不约束尾部会误伤 `.aurora-tooltips`。⚠️ **前缀族**（`aurora-token-`）尾部**不得**挂边界 → 否则 **守卫静默假绿**。
- **混合选择器组摘成员时，补 `{` 前必须先剥尾逗号** —— 否则产出 `.x, {`（非法）→ 浏览器**整条丢弃**，活类样式被**静默误杀**。
  删除后必扫 `,\s*\{`／跨行 `,\n{`／独立 `,` 行／括号配平。**判据只能靠「合并规则带声明存活」**（单看类名会漏，因兄弟规则 `::placeholder`/`:focus` 仍留着同一个类名）。

## 测试铁律
- 严禁同时 `vi.mock` TagIndexStore 与 LinkIndexStore（循环依赖静默崩溃）→ 用真实 Provider 包裹。
- **jsdom 不实现指针捕获重定向** → 一律 `pointerdown → pointerup`；jsdom 无 `PointerEvent` → 用 `MouseEvent` 承载。
- **几何断言等稳态**；jsdom `getBoundingClientRect` 全 0 → 必须打桩（`stubGeometry`）。
- **CSS「无某声明」断言先剥注释**；「全仓无残留消费者」须排除 `docs[\\/]design`、`.test.tsx?$`。静态锚点用**带引号的完整字面量**。
- **末段速度采样被 jsdom dt≈0 放大** → 「期望不切换」用例须**真实慢速**（每步 sleep 300ms）+ 位移 < 20px。
- 读文件断言用 `readFileSync(resolve(__dirname, ...))`。
- **jsdom 缺的 API 统一补 `src/setupTests.ts`**（`ResizeObserver`/`Path2D`/`scrollIntoView`/`elementFromPoint`/`matchMedia`）；缺 `matchMedia` 会让 `CssPanel` 挂载即崩（症状是**某用例"切到末格"时才炸**）。
- ⚠️ tsconfig **不含** `*.test.*` → tsc 干净 ≠ 测试文件无类型错，测试必须实跑。
- 命令：`node node_modules/vitest/vitest.mjs run [pattern]`；`node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`。

## git / 沙箱
PortableGit `/c/Users/HJN/.workbuddy/binaries/PortableGit/versions/1.2.0/{cmd,usr/bin,mingw64/bin}`；
bash 每条内联 `export PATH="<三目录>:/c/Users/HJN/.workbuddy/binaries/node/versions/22.22.2-3:/c/Windows/System32"`。
- 远端 `gitee.com/James-fake/markcraft.git`；推送 `git -c credential.helper= push "https://<user>:<token>@gitee.com/James-fake/markcraft.git" master`。
- ⚠️ push 后 `origin/master` 不更新 → `printf '%s\n' "$(git rev-parse master)" > .git/refs/remotes/origin/master` 再验 `0 0`。
- 🚨 **禁止在单条 bash 里跑 `git stash`**（SIGTERM 半写对象库 → 丢 `.pack`）。要暂存 → `git diff > x.patch`。
- 工作区可能被外部清空 → `git restore --source=HEAD --worktree -- <路径>`；判删除状态必须用 `git -c core.quotepath=false status --porcelain`
  （shell `[ -e ]` 因中文名转八进制误判）。**频繁提交是唯一防线**。
- **删除劫持**：`rm`/`Remove-Item` 转回收站 → robocopy 镜像法（`/MIR`、相对路径、**别拼 `"$PROJ\\$d"`**），镜像后自检 `find <目标> -type f | wc -l` 为 0。
  批量删优先 `git rm`（内部 unlink，不受劫持）；⚠️ **若删除已暂存**，`git rm` 会报 `pathspec did not match`（index 已无该路径）→ 改用 `node -e 'fs.unlinkSync(...)'`。
  `.workbuddy` 仅 `memory/`、`artifacts/` 入库。
- **判「删没删」用集合差，不用 diff 行数**：大段删除会让 `git diff -U0` 把**未删除**的相邻行报成 `-`（实测关键帧被报「已删」实则仍在且被活引用）→
  按 diff 记账会同时高估删除量 + **把活关键帧写进守卫清单**。正解 `git show HEAD:<f>` 与工作区各抽类名 → `comm`。
- 🚨 **回写文件必须保真换行符**：本仓混用（`blog.css`/`components.css` 是 **CRLF**，`canvas/editor.css` 是 LF，无 `.gitattributes`、`core.autocrlf=false`）。
  `split('\n')`+`join('\n')` 回写 CRLF 文件 → **整文件 diff**（`1/120` 变 `1157/1276`）。正解：探 `raw.includes('\r\n')` → 拆 `/\r?\n/` → 回写原 EOL。
  核对**不能比 CR 计数**（删行后 CR 自然变少 → 假警报）→ 按「CR==LF ⇒ CRLF」判**风格**再逐文件比 HEAD。
- ⚠️ **仓内有重名文件**：**两个 `canvas.css`** —— `aurora/styles/panels/canvas.css`（活）与 `features/canvas-v2/components/canvas.css`（09-17 已删）→ 脚本/守卫**一律用完整相对路径**。

## CDP 验证（细节在 skill `cdp-ui-interaction-verify`）
- **Edge 必须与脚本同一次「前台」bash 启动**；须新 profile。布局判定靠**几何**（CSS px）。
  ⚠️ **`rm -rf <profile> && mkdir && msedge ... &` 会静默不启动 Edge**（`rm` 转回收站 exit≠0 → `&&` 断裂）→ 只报 `CDP not ready`。**解：别删 profile，换新目录名**。
- 三陷阱：① `.aurora-audience`（fixed 全屏）吞指针 → 先 dismiss；② **窗口激活吞最早几次鼠标事件**（唤醒点击 + 重试）；③ 无焦时合成按键打不进（改走真实鼠标点侧栏）。
  就绪判据用 `.aurora-sidebar-item`；深链 `#view=` 只认**启动 URL**。
- 「做没做」必须量**视觉位移像素**；`data-swiping=true` 只证明"识别了"。
- 「看得见」别用 `elementFromPoint`（`pointer-events:none` 不参与命中测试 → **假阴性**）→ 断言 opacity/visibility/背景/面积。
- ⚠️ **拖动中的截图不可信**：窗口不前台时合成被节流，`captureScreenshot` 返回**上一帧** → 拖动只用量数值，截图只证**落位后**。
- **间距/留白断言必须测「文字实际绘制框」**：元素自带 `padding-top` 时其 `top` 不含该 padding → 「明明加了 padding 仍测得 gap=2px」的**假阴性**。正解 `Range.selectNodeContents(el)` + `getClientRects()`。
- **改前/改后取证** = 页内注入 override CSS 还原旧值（源文件零改动、状态一致可比），**别写回源码再改回**。用户截图坐标**不能直接当 CSS px**（先求偏移量）。
- 手势/交互不能靠注入 HTML 验证（需真实 React 绑定）。合成拖拽要**慢**（末段 <0.3px/ms）才走落点吸附。探针留可复用开关（`ONLY=<面板名>`）。
- 🚨 **「零命中」类断言必须先用自检证明「扫描面非空」**：探针用**固定 `sleep`** 等页面 → 读到**白屏**，而白屏下「CSSOM 零命中」「文件未出现」会**全部假绿**（实测 `sheets=0`/`sidebar×0`）。
  必设 `sheetCount>3 && cssLen>10000` 自检，并用**就绪轮询**（`sidebar-item.length>0 && styleSheets.length>8`）替代固定睡眠 —— Vite dev 首载 Aurora（700+ 模块）需数十秒。
- **新探针必须跑一次「HEAD 阳性对照」**：把目标源文件临时还原到 HEAD（**先 `cp` 备份**）再跑同一条探针，若目标检查项**全部正确报「仍在」**
  才证明正式跑的「零命中」不是探针失效导致的**假绿**。还原后复核：内容 md5（`tr -d '\r'` 归一）一致 + `git diff --numstat` 回到原值。
- 「零错误」要**逐视图归属**（每次 navigate 前后取 `errors.length` 切片），否则「某视图报错」会被全程累计掩盖。
  ⚠️ 冷/热 profile 错误集**不同**；判「是否本次引入」靠 **A/B**，不靠直觉。已知预存告警（切白板时 React「setState on a component that is not yet mounted」）应做成**精确白名单**，**别放宽成「忽略所有 React 警告」**。
- ⚠️ **同 profile 二次启动会失败**（上一实例未退净 → 新实例挂到旧会话）→ `cp -r <profile> <新名>` 用副本启动。
  另：`&` 之后 shell **会丢 PATH**（`grep/sleep: command not found`）→ 后台启动后**重新 export PATH**，或输出重定向到文件、另起一次调用读。

## 专题铁律（细节见对应 artifacts）
- **动效语言**：分层 ⚡100–160／🚶150–250／🛋320–500ms；**外壳（MenuBar/Sidebar/StatusBar）永不参与视图切换动画**；
  reduced-motion = 「更少更柔非归零」（时长减半，入场 `mc-rm-fade`、**退场必须 `mc-rm-fade-out`**）；指针门控只归零**纯位移/缩放型** hover，**复合 transform 必须豁免**。
- **浮层退场**（`DESIGNBRIEF-MOTION-EXIT-01.md`）：**必须先播退场再卸载**；单源 `@components/ui/usePresence`
  （对象门控用 `usePresenceValue` —— 退场窗口内保留**最后一份非空载荷**）；时长常量须与 CSS 逐字对齐；关键帧与入场**逐字镜像**；
  `[data-exiting='true']` 必带 `pointer-events:none`。⚠️ reduced-motion 会劫持退场（每个选择器须登记进 `mc-rm-fade-out`）。
  **有意不动**：命令面板／FileTree·Outline 展开／Tooltip hover-out／视图切换／Toast·Modal。
- **需求 N · tab 滑动切 Tab**（`DESIGNBRIEF-SWIPE-TABS-01.md`）：Apple 分段控件，**滑块跟手、内容零位移**、位移方向=目标方向、连续跨格；
  滑块位置 = 基准 + 手势位移**合成同一个 transform**；hook 必传 `dampenOffset`(恒等) + `snapDecider`；**位移保号与目标取反不能并存**。
  六条栏：`settings__nav-tabs`/`kb-subbar-tabs`/`blog__subseg`/`blog__tabs`/`csp__tabs`/`ctop__switcher`（同面板两条勿混层级）。
  ⚠️ 白板**空白板引导锁定态**会停用手势（真机前先点「跳过，直接开始」）。R1–R3 旧法**已废弃，勿回退**。
- **KB 面板**：subbar 52px。⚠️ `.aurora-kb-notes` 顶 padding 仅 2px 是为**自带 `__head` 的 Tab**设计的（2+12=14 才完整）→
  **无 head 的复用者必自带留白**（`.aurora-kb-notes__lead`）；新增 Tab 先问「我的 head 在哪」。7 Tab 首行留白基线锁 `kbTopSpacing.test.ts`(8) + `notesTabHeader.test.ts`(8)。
  ⚠️ 空库不渲染 tab 栏、建库后**不自动进详情**；提交按钮选择器须限定 `.aurora-kb-modal` 内。

## 当前状态
- vitest **1320 passed / 2 skipped / 0 failed**（112 文件全绿），tsc 干净，**无预存失败**。
- 二级栏已三面板同源（kb/blog/ctop = 52px，真机几何取证通过）。
- tooltip 平行遗留**已清剿**（`.aurora-tooltip`+`.mc-tooltip`+`Tooltip.tsx`+`.mc-lazy-*`，净 −273 行）→ 唯一悬停机制 = 原生 `title=`。
- ✅ **批 1 死 CSS 已清剿**：净 **−868 行**／4 文件；**真实删除 96 类**（集合差取证，族外误删 0）；守卫 `deadCssPurge.test.ts`（PURGED 15 族 + 1 关键帧）
  + `pointerGating.test.ts` 的 `dead` **拆 A/B 组**（A=全仓零定义，B=仍存活 + 诚实绊线）；真机四视图零回归。→ `DESIGNBRIEF-DEADCSS-01.md §6.9`
- ✅ **批 2 盲区扫描已完成**（**只扫不删**）：死类 **124 / ≈860 行**；工具 `.workbuddy/deadcss-batch2.mjs`。→ `§7`
- ✅ **批 2.5-A 孤儿文件已清剿**：净 **−304 行** —— 删 `src/index.css` + `features/canvas-v2/components/canvas.css`；
  移除 `canvasTheme.ts` 的 `.cv-pill-btn` 空转规则；`05-canvas-panel.md §11` 标注现状；守卫 +6 例（共 96 例全绿）。
  真机三重闭环：源码零 import → dev 无 tree-shaking 必留痕 → `style[data-vite-dev-id]` 指纹 0 命中。→ `§8`
- 🔴 **待决策（独立成题，性质≠死代码）**：`canvasTheme.ts` 注入选择器 `.tl-container, .canvas-v2-root` **两者皆无 DOM** ⇒
  其独有约 25 个 `--cv-*` 变量**全程未定义**，而 8 个 canvas-v2 文件以**无 fallback** 的 `var(--cv-*)` 消费它们
  （真机实测 base.css 系 5/5 有值、canvasTheme 系 **0/5**；`injectCanvasTheme()` **零调用点**）。修法 = 注入选择器改挂 `:root`，**会改变白板浮层观感**。
- 后续可做：**2.5-B** `mermaid.css` 35 类（含 7 处混合块）／**2.5-C** `kb-ui.css` 56 类（**27 处混合块** + **10 类仅测试引用**，
  须先升级 `kbDensity.test.ts` / `pointerGating.test.ts:132` 断言）／**批 3** `aurora-editor` 23 类旧自绘编辑器 DOM（**需先建 L3 真机 class 挂载采集器**）／
  **3.5** `desktop-chrome.css` 死 token + 覆盖陷阱（**token 单源治理**）。
- 其他待决：`components/ui` 的 `Input.tsx`/`EmptyState.tsx` 零消费者（样式经桶间接下发）；`--mc-dur-lazy` 处置；
  `tiptap-math-inline` 疑似命名错位（`tiptap.css:456/:470` 定样式但 DOM 只有 `editable-node` + `-katex` → 从未生效，**待与作者确认意图**）；>30 天旧日志蒸馏。
- 侧栏「小标题栏」= **不统一**（只给结论未改）：`.aurora-filetree__topbar`/`.aurora-outline__header` 是**面板级**标题行（36px，两者已自洽），
  与**视图级**二级栏 52px 不同层级。P2 可选：`height:36px` 的面板标题行在 editor(2)/graph(2)/settings(1) 重复 ~5 处 → 可抽 `--mc-panel-head-h`（属**收敛**非统一）。
- ✅ 已推送 `origin/master`：`187be15`/`1e08d65`/`988c406`/`30fc95f`/`3b3e9b2`（tooltip/lazy）/`fb219cc`（方案文档）/`65cee4b`（批 1）/`d09c5b8`（批 2）/ 本轮（2.5-A）。
  Gitee 令牌不入库、不落盘（已建议轮换）。
