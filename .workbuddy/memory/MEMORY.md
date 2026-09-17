# MarkCraft · Aurora 记忆
铁律 only。案例见 `memory/YYYY-MM-DD.md`，专题见 `artifacts/DESIGNBRIEF-*.md`。

## 定位与铁律（`src/aurora/`）
Vite5+React18+TS；CodeMirror6+TipTap3；白板 Excalidraw（tldraw 已退役）；Dexie/IndexedDB。
dev 端口 **5174**：`node node_modules/vite/bin/vite.js --port 5174 --host`。**入口只有 `src/aurora/aurora-main.tsx`（无 `src/main.tsx`）**，真实 `#view=` 路由。
**Aurora = 真实运行界面**。战略：网页 UI → **桌面端软件范式**（窗口 chrome／命令菜单／密度／键盘优先）。
① Aurora 即真实界面；② 禁增功能（边界 = 真实已有能力）；③ 视觉只用 `styles/tokens.css` 的 `--mc-*`；
④ UI 落 `src/aurora/`，`src/features/*` 是逻辑层（D4 单一数据源），`src/components/ui` 可直接 import；⑤ 依赖只向下，**0 反向依赖**。

## 关键坑（防回归）
- **Path depth**：panels→features/stores `../../../`；components/ui·app `../../`。
- 新类**必须同批交付 CSS**；**同文件多处 Edit 必须串行**（并行 = 后写覆盖先写、静默丢改动；症状是 tsc 报「声明未使用」+「找不到该名称」自相矛盾组合）。跨文件可并行。改完**逐文件 grep 核验关键行**。
- 单源：z-index = `tokens.css §14`；Modal = `@components/ui/Modal`；Button/Confirm/Switch = `@components/ui/*`。
- ⚠️ **`styles/desktop-chrome.css` 是有意的第二层 `:root`**（加载序 tokens → desktop-chrome，后者赢）→ **只改 tokens.css 的 `--mc-accent` 不生效**，须同改 desktop-chrome（含亮色）。
- **布局属性越权**：迁 features 组件入 Aurora 时 position/inset/z-index 越权生效 → 复位须三类同设 + `contain:paint`。
- **拖拽闭包陷阱**：监听闭包在拖拽开始时注册 → 落盘必须读 `xxxRef.current`（读 state = 旧值）。
- **指针捕获吞 click**：子元素交互挂 **pointerup**（`NODE_CLICK_SLOP=4px` 区分拖拽）。
- **视图上下文单源** = `useAuroraShell.nav` 的 param→params 映射表（canvas→canvasId / kb→kbId / blog→kbId）；漏登记 = 参数静默丢失。侧栏「设置」在默认收起的「更多」分组。
- **React 17+ `onWheel` passive** → `preventDefault()` 无效；拦横滚靠 CSS `touch-action`/`overscroll-behavior-x`。
- **「改 CSS 不改 JS」双向陷阱** → 契约测试两侧同断言，且断言 `getBoundingClientRect()` **落点**。
- **滚动显隐用「常驻 DOM + 类折叠」**（条件渲染 → 高度跳变 → 伪滚动 → 自激振荡闪烁）；「列表往上滑」= `scrollTop` 减小。
- **内联 `transition` 残留**：瞬时落位后必须 `void el.offsetWidth; el.style.transition=''`。
- 动效只动 **transform/opacity**；永不用 `scale(0)`（起手 0.96/0.97）；进出不对称「出更快」。
- **`AuroraSelect` 触发器(button)与浮层(dialog)共用同一 `aria-label`** → 退场窗口内两者同在 DOM，`getByLabelText` 报多元素 → 取触发器用 `getByRole('button',{name})`。
- **`AuroraSelect` 只在展开时挂载选项**（打破原生 `<option>` 常驻假设）→ 断言选项文案须先展开，并一并断言底层 value 是否仍是裸关键字。
- **外壳污染面板测试的全局查询**：`RealProviders` 一并渲染菜单栏 → 同名文案须 `within(.aurora-kb-subbar-actions)` 限定。
- **`COMMAND_CATALOG` 全量 ≠ 命令面板条数**：`visible:()=>false` 的是菜单专属（仅 MenuBar `MENUS` 渲染）→「一条不丢」按**可见子集**逐 id 对齐。
- **二级栏高 = `--mc-subbar-h`（tokens.css §12，52px）+ 内缩 `--mc-subbar-pad-x`（14px）**，三面板同源（`.aurora-kb-subbar`/`.aurora-blog__subbar`/`.aurora-ctop`），**不参与密度切换**（密度差异由栏内控件的 `--mc-inspector-tab-h` 承担）。
  ⚠️ 栏高**被复制进派生偏移**（`blog__panelzone.top`、`subbar-right.right`）→ 改栏高必须同改，一律 `var()`。
- ⚠️ **`densityStore` 默认广播 `compact`**（非 comfortable）→ 排查实际渲染值先确认密度档（只读声明值会把 42 当 46）。
- **`.aurora-kb.kb-shell` 是复合选择器（权重 0/2/0）**：布局回收落点（`contain:paint` + `position:relative`）在 panels/kb.css 复合块；其 `--kb-*` 浅色 fallback 由该块重映射到 `--mc-*` 桌面令牌 → **验证「没删错」的单点最强信号**。

## 死代码判定（判据 > 清单）
- **判死先验「有真实承载者」**：类名 → TSX 引用数、组件 → import 点。
- **「零 import」≠「不进包」**：桶（`components/ui/index.ts`）的 `export { Input }` 让 `Input.tsx`（及 `import './ui.css'`）被任何 `from '.../components/ui'` 连带挂进模块图（dev 无 tree-shaking）→ 真机 `style[data-vite-dev-id]` 实测照样下发。**判死看依赖图可达性，不看 import 计数。**
- 🚨 **「零 import」删文件，「零消费者」删成员 —— 不可互替**。「零 import」须用**可达性闭包**求：`src/index.css` 零引用但聚合的 9 文件全在入口 → **冗余**（删了不改变加载）；`canvas-v2/.../canvas.css` 零引用**且**成员零消费者 → **孤儿**（还须处置消费侧悬空引用）。
- **模板拼接必须排除**（`` `aurora-btn--${size}` `` → 字面量 `aurora-btn--sm` 从不出现）。扫描器三档（A 高危/B 疑似动态/C 仅测试引用）；前缀抽取**只取最后一个空白分隔词**。补厚三层（缺任一层都错，且错向不同）：
  ③ 模板前缀**必须限定 `className` 上下文**（反引号前 120 字符含 `className|classList|clsx|cn(|class=`）——否则 `kbTypes.ts:94` 的 ID 生成器 `` `kb-${Date.now()}-${rand}` `` 会把整个 `kb-*`（66 类）伪装成动态，**掩盖 56 个真死类**。
  ④ **库命名空间必须豁免**（node_modules 实锤）：hljs（`language_`/`function_`/`class_`）／TipTap（`is-editor-empty`/`selectedCell`/`column-resize-handle`/`tableWrapper`）／Excalidraw（`layer-ui__wrapper`/`Tooltip__label`/`dropdown-menu`）／KaTeX／tldraw（`.tl-*`）。
    ⚠️ 反向坑：`katex-inline-wrapper`/`katex-display-wrapper` 是**活类**（`mathRenderer.ts` 生成）→ 豁免须精确 `^katex$|^katex-(display|html|mathml|version|error)$`，**别写 `/^katex/`**。
  ⑤ **可达性**：文件不在入口闭包内 = **孤儿文件**不是死类（整文件 vs 成员级处置不同）。
  ⑥ 超串有**第三形态**：**死类是活类的真前缀**（`.tiptap-math-inline` vs `-katex`；`.lint-marker` vs `lint-line-marker`；`.kb-content` vs `kb-content-inner`；`.kb-pop` vs 活扩展；`.hover-bg` vs `var(--hover-bg)` 是变量）。
- ⚠️ **扫描盲区的真因是「前缀」不是「目录」**：类名正则硬要求 `aurora-`/`mc-` → `.tiptap-*`/`.kb-*`/`.cv-*`/`.vh-*`/`.hover-*` 全被挡在正则外。**每引入一个新前缀族，就会再现一次同样的盲区。**
- **清剿守卫双锚点**：CSS 用 `\.name(?![a-zA-Z0-9])`（拒字母数字、允许 `_`/`-` 即 BEM 后代）；代码用 `(?<![\w-])name(?![a-zA-Z0-9])`（**无前导点**，否则漏检 `className="mc-tooltip"`）。尾部 `\b` 会漏 `name__arrow`；完全不约束尾部会误伤 `.aurora-tooltips`。⚠️ **前缀族**（`aurora-token-`）尾部**不得**挂边界 → 守卫静默假绿。**真前缀陷阱**下惯用锚点恒真 → 须精确排除活扩展裸后缀（`(?!-inner)`/`(?!-mask)`）。
- **混合选择器组摘成员**：补 `{` 前先剥尾逗号，否则产出 `.x, {`（非法）→ 浏览器**整条丢弃、活类样式静默误杀**。删除后必扫 `,\s*\{`／跨行 `,\n{`／独立 `,` 行／括号配平。**判据只能靠「合并规则带声明存活」**（单看类名会漏，因兄弟规则 `::placeholder`/`:focus` 仍留同名）。
- **`@media` 删到空须连容器删**；**`@keyframes` 不被类名解析覆盖** → 须按 `animation:` 引用计数单独判定孤儿。

## 测试铁律
- 严禁同时 `vi.mock` TagIndexStore 与 LinkIndexStore（循环依赖静默崩溃）→ 用真实 Provider 包裹。
- **jsdom 不实现指针捕获重定向** → 一律 `pointerdown → pointerup`；无 `PointerEvent` → 用 `MouseEvent` 承载。
- **几何断言等稳态**；`getBoundingClientRect` 全 0 → 必须打桩（`stubGeometry`）。
- **CSS「无某声明」断言先剥注释**；「全仓无残留消费者」须排除 `docs[\\/]design`、`.test.tsx?$`。静态锚点用**带引号的完整字面量**。
- **末段速度采样被 jsdom dt≈0 放大** → 「期望不切换」用例须真实慢速（每步 sleep 300ms）+ 位移 < 20px。
- 读文件断言用 `readFileSync(resolve(__dirname, ...))`。
- **jsdom 缺的 API 统一补 `src/setupTests.ts`**（`ResizeObserver`/`Path2D`/`scrollIntoView`/`elementFromPoint`/`matchMedia`）；缺 `matchMedia` 让 `CssPanel` 挂载即崩（症状 = 某用例"切到末格"时才炸）。
- ⚠️ tsconfig **不含** `*.test.*` → tsc 干净 ≠ 测试文件无类型错，测试必须实跑。
- ⚠️ **`vitest -t <s>` 是正则**：用例名含 `*` 会当量词 → 整条匹配不上 → **全量 skip 假绿**。过滤串避开 `*`。
- ⚠️ **token 断言须含声明边界**：`toContain('--kb-text')` 被 `--kb-text-main:` 满足（令牌掏空仍绿）→ 用 `toContain('--kb-text:')`。
- **仅测试引用的类 = 测试制造的维护假象** → **须先升级断言再删**（B 组「仍有定义」→ A 组「零定义」是**升级**非放宽）。
- 命令：`node node_modules/vitest/vitest.mjs run [pattern]`；`node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`。

## git / 沙箱
PortableGit `/c/Users/HJN/.workbuddy/binaries/PortableGit/versions/1.2.0/{cmd,usr/bin,mingw64/bin}`；bash 每条内联 `export PATH="<三目录>:/c/Users/HJN/.workbuddy/binaries/node/versions/22.22.2-3:/c/Windows/System32"`。
- 远端 `gitee.com/James-fake/markcraft.git`；推送 `git push origin master`（helper-selector 已带凭据）。推送后 `origin/master` ref 不更新 → `printf '%s\n' "$(git rev-parse master)" > .git/refs/remotes/origin/master`，再验 `git rev-list --left-right --count master...origin/master` = `0 0`。
- 🚨 **禁止在单条 bash 里跑 `git stash`**（SIGTERM 半写对象库 → 丢 `.pack`）。要暂存 → `git diff > x.patch`。
- 工作区可能被外部清空 → `git restore --source=HEAD --worktree -- <路径>`；判删除状态用 `git -c core.quotepath=false status --porcelain`（`[ -e ]` 因中文名转八进制误判）。**频繁提交是唯一防线**。
- **删除劫持**：`rm`/`Remove-Item` 转回收站 → robocopy 镜像法（`/MIR`、相对路径、**别拼 `"$PROJ\\$d"`**），镜像后自检 `find <目标> -type f | wc -l` 为 0。批量删优先 `git rm`；⚠️ 若删除已暂存，`git rm` 报 `pathspec did not match` → 改用 `node -e 'fs.unlinkSync(...)'`。`.workbuddy` 仅 `memory/`、`artifacts/` 入库。
- **判「删没删」用集合差，不用 diff 行数**：大段删除会让 `git diff -U0` 把**未删除**的相邻行报成 `-`（实测关键帧被报已删实则仍在且被活引用）→ 按 diff 记账会高估删除量 + **把活关键帧写进守卫清单**。正解 `git show HEAD:<f>` 与工作区各抽类名 → `comm`。
- 🚨 **回写文件必须保真换行符**：本仓混用（`blog.css`/`components.css`/`kb-ui.css`/`tokens.css`/`kbDensity.test.ts`/`MEMORY.md` **CRLF**；`canvas/editor.css`/`pointerGating.test.ts`/`deadCssPurge.test.ts` LF；无 `.gitattributes`、`core.autocrlf=false`）。正解：探 `raw.includes('\r\n')` → 拆 `/\r?\n/` → 回写原 EOL；禁用 `split('\n')+join('\n')`。核对**不能比 CR 计数**（删行后 CR 自然变少 → 假警报）→ 按「CR==LF ⇒ CRLF」判**风格**再逐文件比 HEAD。
- ⚠️ **仓内有重名文件**：两个 `canvas.css`（`aurora/styles/panels/canvas.css` 活；`features/canvas-v2/components/canvas.css` 09-17 已删）→ 脚本/守卫一律用**完整相对路径**。

## CDP 验证（**完整细节 + 八坑全在 skill `cdp-ui-interaction-verify`**，此处只留必记判据）
- 前台同 bash 启动；**别删 profile、换新目录名**；同 profile 二次启动必失败 → `cp -r` 副本；`&` 之后 shell 丢 PATH。
- 三陷阱：`.aurora-audience` backdrop 吞指针（先 dismiss）／窗口激活吞最早几次鼠标事件（唤醒 + 重试）／无焦时合成按键打不进（改点侧栏真实鼠标）。就绪判据 `.aurora-sidebar-item`。
- 深链 `#view=` 只认**启动 URL**，且**只携带视图名**（kbId 不在 hash ⇒ 进详情须真实点卡片；空 IndexedDB ⇒ 空态 ⇒ 探针须先真实建库）。
- 🚨 **「零命中/零错误」必须先证「扫描面非空」+ 跑 HEAD 阳性对照** → 否则白屏或探针失效下**全假绿**（最高危）。
- 「做没做」量**视觉位移像素**；「看得见」别用 `elementFromPoint`（`pointer-events:none` 假阴性）；**拖动中截图不可信**（合成节流 → 上一帧）。
- 间距/留白断言量 `Range.selectNodeContents(el).getClientRects()`（元素 `top` 不含自带 padding → 假阴性）；受控 input 用**原生 setter + `input` 事件**。

## 专题铁律（细节见对应 artifacts）
- **动效语言**：分层 ⚡100–160／🚶150–250／🛋320–500ms；**外壳（MenuBar/Sidebar/StatusBar）永不参与视图切换动画**；reduced-motion = 「更少更柔非归零」（时长减半，入场 `mc-rm-fade`、**退场 `mc-rm-fade-out`**）；指针门控只归零**纯位移/缩放型** hover，**复合 transform 必须豁免**。
- **浮层退场**（`DESIGNBRIEF-MOTION-EXIT-01.md`）：**必须先播退场再卸载**；单源 `@components/ui/usePresence`（对象门控用 `usePresenceValue` —— 退场窗口内保留**最后一份非空载荷**）；时长常量须与 CSS 逐字对齐；关键帧与入场**逐字镜像**；`[data-exiting='true']` 必带 `pointer-events:none`。⚠️ reduced-motion 会劫持退场（每个选择器须登记进 `mc-rm-fade-out`）。**有意不动**：命令面板／FileTree·Outline 展开／Tooltip hover-out／视图切换／Toast·Modal。
- **N · tab 滑动切 Tab**（`DESIGNBRIEF-SWIPE-TABS-01.md`）：Apple 分段控件，**滑块跟手、内容零位移**、位移方向=目标方向、连续跨格；滑块位置 = 基准 + 手势位移**合成同一个 transform**；hook 必传 `dampenOffset`(恒等) + `snapDecider`；**位移保号与目标取反不能并存**。六条栏：`settings__nav-tabs`/`kb-subbar-tabs`/`blog__subseg`/`blog__tabs`/`csp__tabs`/`ctop__switcher`（同面板两条勿混层级）。⚠️ 白板**空白板引导锁定态**会停用手势（真机前先点「跳过，直接开始」）。R1–R3 旧法**已废弃，勿回退**。
- **KB 面板**：subbar 52px。⚠️ `.aurora-kb-notes` 顶 padding 仅 2px 是为**自带 `__head` 的 Tab**设计（2+12=14 才完整）→ **无 head 的复用者必自带留白**（`.aurora-kb-notes__lead`）；新增 Tab 先问「我的 head 在哪」。基线锁 `kbTopSpacing.test.ts`(8) + `notesTabHeader.test.ts`(8)。⚠️ 空库不渲染 tab 栏、建库后**不自动进详情**；提交按钮选择器须限定 `.aurora-kb-modal` 内。

## 死 CSS 清剿（`artifacts/DESIGNBRIEF-DEADCSS-01.md`）
- ✅ **批 1**（−868 行／96 类／4 文件）→ §6.9｜**批 2 盲区扫描**（只扫不删：死类 124≈860 行，工具 `deadcss-batch2.mjs`）→ §7
  ｜**批 2.5-A 孤儿文件**（−304 行：删 `src/index.css` + `features/canvas-v2/components/canvas.css`，移除 `canvasTheme.ts` 的 `.cv-pill-btn` 空转规则）→ §8
  ｜**批 2.5-C `kb-ui.css`**（632→362 行，净 −270：删 66 类 + 3 空 `@media` + 2 孤儿 `@keyframes`；保留 46 类含 `.kb-shell`/`--kb-*` 令牌源 + `.kb-searchpanel-*`；消费侧 `tokens.css` 门控块删 2 条悬空引用）→ §9。
  守卫：`deadCssPurge.test.ts`（2.5-C 后 243 例）+ `pointerGating.test.ts` 的 `dead` A/B 组；三批均**真机取证零回归**（2.5-C：五视角 66 类双向零命中 + 26 活类未误伤 + `.aurora-kb.kb-shell` 复合覆盖仍生效）。
- **当前基线**：vitest **1499 passed / 2 skipped / 0 failed**；tsc 干净；**无预存失败**。二级栏三面板同源 52px。tooltip 平行遗留已清剿（唯一悬停机制 = 原生 `title=`）。
- 🔴 **待决策（独立成题，性质≠死代码）**：`canvasTheme.ts` 注入选择器 `.tl-container, .canvas-v2-root` **两者皆无 DOM** ⇒ 其独有约 25 个 `--cv-*` **全程未定义**，而 8 个 canvas-v2 文件以**无 fallback** 的 `var(--cv-*)` 消费（真机实测 0/5 有值；`injectCanvasTheme()` **零调用点**）。修法 = 注入选择器改挂 `:root`，**会改变白板浮层观感**。
- **后续可做**：**2.5-B** `mermaid.css` 35 类（含 7 处混合块）／**批 3** `aurora-editor` 23 类旧自绘 DOM（**需先建 L3 真机 class 挂载采集器**）／**3.5** `desktop-chrome.css` 死 token + 覆盖陷阱（token 单源治理）。
- **其他待决**：`components/ui` 的 `Input.tsx`/`EmptyState.tsx` 零消费者（样式经桶间接下发）；`--mc-dur-lazy` 处置；`tiptap-math-inline` 疑似命名错位（`tiptap.css:456/:470` 定样式但 DOM 只有 `editable-node`+`-katex` → 从未生效，**待与作者确认意图**）；>30 天旧日志蒸馏。
- **侧栏「小标题栏」不统一**（只给结论未改）：`.aurora-filetree__topbar`/`.aurora-outline__header` 是**面板级**标题行（36px，已自洽），与**视图级**二级栏 52px 不同层级。P2 可选抽 `--mc-panel-head-h`（属**收敛**非统一）。
- ✅ 已推送 `origin/master`：`187be15`/`1e08d65`/`988c406`/`30fc95f`/`3b3e9b2`/`fb219cc`/`65cee4b`(批 1)/`d09c5b8`(批 2)/`2c15b51`(2.5-A)/`43ee348`(2.5-C)。Gitee 令牌不入库、不落盘（已建议轮换）。
